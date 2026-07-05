"""
Sentinel — Face Attendance backend.

Self-contained Flask service:
  - SQLite for users + attendance (no external database required)
  - 128-d face encodings stored in the DB, so enrollments survive restarts
  - CORS locked to the configured frontend origin(s)

Endpoints:
  GET  /health                      -> service + model status
  POST /add-user                    -> enroll a person (name, enrollment_number, semester, image)
  POST /recognize                   -> recognize faces in a frame, auto-mark attendance
  GET  /attendance?date=YYYY-MM-DD  -> attendance records for a day
  GET  /users                       -> enrolled people (no encodings)
"""

import os
import sqlite3
import base64
import threading
from datetime import datetime, timedelta

import numpy as np
import cv2
import face_recognition
from flask import Flask, request, jsonify, g
from flask_cors import CORS

# --------------------------------------------------------------------------- #
# Configuration
# --------------------------------------------------------------------------- #

def _resolve_db_path() -> str:
    preferred = os.environ.get("DB_PATH", "/data/attendance.db")
    directory = os.path.dirname(preferred) or "."
    try:
        os.makedirs(directory, exist_ok=True)
        test = os.path.join(directory, ".write_test")
        with open(test, "w") as fh:
            fh.write("ok")
        os.remove(test)
        return preferred
    except OSError:
        # Fall back to the working directory when the volume isn't mounted.
        return os.path.join(os.getcwd(), "attendance.db")


DB_PATH = _resolve_db_path()
TOLERANCE = float(os.environ.get("FACE_TOLERANCE", "0.45"))
DEDUPE_HOURS = float(os.environ.get("DEDUPE_HOURS", "2"))

# Comma-separated allowed origins; "*" allows any (fine for a public demo).
_origins_env = os.environ.get("FRONTEND_ORIGIN", "*").strip()
ALLOWED_ORIGINS = "*" if _origins_env == "*" else [o.strip() for o in _origins_env.split(",") if o.strip()]

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": ALLOWED_ORIGINS}})

# In-memory encoding cache, guarded by a lock.
_cache_lock = threading.Lock()
_known_encodings: list[np.ndarray] = []
_known_names: list[str] = []
_known_details: dict[str, dict] = {}


# --------------------------------------------------------------------------- #
# Database
# --------------------------------------------------------------------------- #

def get_db() -> sqlite3.Connection:
    conn = getattr(g, "_db", None)
    if conn is None:
        conn = g._db = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
    return conn


@app.teardown_appcontext
def _close_db(_exc):
    conn = getattr(g, "_db", None)
    if conn is not None:
        conn.close()


def init_db() -> None:
    conn = sqlite3.connect(DB_PATH)
    conn.executescript(
        """
        CREATE TABLE IF NOT EXISTS users (
            name              TEXT PRIMARY KEY,
            enrollment_number TEXT,
            semester          TEXT,
            encoding          BLOB NOT NULL,
            date_added        TEXT
        );
        CREATE TABLE IF NOT EXISTS attendance (
            id        INTEGER PRIMARY KEY AUTOINCREMENT,
            name      TEXT NOT NULL,
            date      TEXT NOT NULL,
            timestamp TEXT NOT NULL,
            status    TEXT NOT NULL DEFAULT 'Present'
        );
        CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(date);
        """
    )
    conn.commit()
    conn.close()


def load_known_faces() -> None:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    rows = conn.execute("SELECT name, enrollment_number, semester, encoding FROM users").fetchall()
    conn.close()

    encodings, names, details = [], [], {}
    for row in rows:
        encodings.append(np.frombuffer(row["encoding"], dtype=np.float64))
        names.append(row["name"])
        details[row["name"]] = {
            "enrollment_number": row["enrollment_number"],
            "semester": row["semester"],
        }

    with _cache_lock:
        _known_encodings.clear()
        _known_names.clear()
        _known_details.clear()
        _known_encodings.extend(encodings)
        _known_names.extend(names)
        _known_details.update(details)
    print(f"[faces] loaded {len(names)} known face(s)")


# --------------------------------------------------------------------------- #
# Helpers
# --------------------------------------------------------------------------- #

def _decode_data_url(image_field: str) -> np.ndarray:
    """Decode a base64 data URL (or bare base64) into an OpenCV BGR image."""
    encoded = image_field.split(",", 1)[1] if "," in image_field else image_field
    raw = base64.b64decode(encoded)
    array = np.frombuffer(raw, np.uint8)
    frame = cv2.imdecode(array, cv2.IMREAD_COLOR)
    if frame is None:
        raise ValueError("Could not decode image data.")
    return frame


def _mark_attendance(name: str) -> None:
    now = datetime.now()
    date_today = now.strftime("%Y-%m-%d")
    time_only = now.strftime("%H:%M:%S")

    conn = get_db()
    recent = conn.execute(
        "SELECT timestamp FROM attendance WHERE name = ? AND date = ? ORDER BY id DESC LIMIT 1",
        (name, date_today),
    ).fetchone()
    if recent is not None:
        try:
            last = datetime.strptime(f"{date_today} {recent['timestamp']}", "%Y-%m-%d %H:%M:%S")
            if now - last < timedelta(hours=DEDUPE_HOURS):
                return  # already counted recently
        except ValueError:
            pass

    conn.execute(
        "INSERT INTO attendance (name, date, timestamp, status) VALUES (?, ?, ?, 'Present')",
        (name, date_today, time_only),
    )
    conn.commit()


# --------------------------------------------------------------------------- #
# Routes
# --------------------------------------------------------------------------- #

@app.get("/health")
def health():
    with _cache_lock:
        enrolled = len(_known_names)
    return jsonify({
        "status": "ok",
        "service": "sentinel-face-attendance",
        "enrolled": enrolled,
        "tolerance": TOLERANCE,
    })


@app.post("/add-user")
def add_user():
    data = request.form
    name = (data.get("name") or "").strip()
    enrollment_number = (data.get("enrollment_number") or "").strip()
    semester = (data.get("semester") or "").strip()
    image_field = data.get("image")

    if not (name and enrollment_number and semester and image_field):
        return jsonify({"error": "name, enrollment_number, semester and image are required."}), 400

    try:
        frame = _decode_data_url(image_field)
        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        encodings = face_recognition.face_encodings(rgb)
    except Exception as exc:  # noqa: BLE001
        return jsonify({"error": f"Failed to process image: {exc}"}), 400

    if not encodings:
        return jsonify({"error": "No face detected. Face the camera in even lighting and retry."}), 422
    if len(encodings) > 1:
        return jsonify({"error": "Multiple faces detected. Enroll one person at a time."}), 422

    encoding_blob = encodings[0].astype(np.float64).tobytes()
    try:
        conn = get_db()
        conn.execute(
            """
            INSERT INTO users (name, enrollment_number, semester, encoding, date_added)
            VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(name) DO UPDATE SET
                enrollment_number = excluded.enrollment_number,
                semester          = excluded.semester,
                encoding          = excluded.encoding
            """,
            (name, enrollment_number, semester, encoding_blob, datetime.now().strftime("%Y-%m-%d")),
        )
        conn.commit()
    except sqlite3.Error as exc:
        return jsonify({"error": f"Database error: {exc}"}), 500

    load_known_faces()
    return jsonify({"success": f"Enrolled {name}."}), 200


@app.post("/recognize")
def recognize():
    image_field = request.form.get("image")
    if not image_field:
        return jsonify({"error": "image is required."}), 400

    try:
        frame = _decode_data_url(image_field)
    except Exception as exc:  # noqa: BLE001
        return jsonify({"error": f"Failed to decode image: {exc}"}), 400

    small = cv2.resize(frame, (0, 0), fx=0.25, fy=0.25)
    rgb = cv2.cvtColor(small, cv2.COLOR_BGR2RGB)

    face_locations = face_recognition.face_locations(rgb)
    face_encodings = face_recognition.face_encodings(rgb, face_locations)

    with _cache_lock:
        known_encodings = list(_known_encodings)
        known_names = list(_known_names)

    names: list[str] = []
    for encoding in face_encodings:
        name = "Unknown"
        if known_encodings:
            distances = face_recognition.face_distance(known_encodings, encoding)
            best = int(np.argmin(distances))
            if distances[best] < TOLERANCE:
                name = known_names[best]
        names.append(name)
        if name != "Unknown":
            _mark_attendance(name)

    return jsonify({"recognized_faces": names, "face_locations": face_locations}), 200


@app.get("/attendance")
def attendance():
    date = request.args.get("date")
    if not date:
        return jsonify({"error": "date query parameter is required."}), 400

    rows = get_db().execute(
        "SELECT name, date, timestamp, status FROM attendance WHERE date = ? ORDER BY timestamp",
        (date,),
    ).fetchall()
    return jsonify([dict(row) for row in rows]), 200


@app.get("/users")
def users():
    rows = get_db().execute(
        "SELECT name, enrollment_number, semester, date_added FROM users ORDER BY name"
    ).fetchall()
    return jsonify([dict(row) for row in rows]), 200


# --------------------------------------------------------------------------- #
# Startup
# --------------------------------------------------------------------------- #

init_db()
load_known_faces()

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", "5000")), debug=True)
