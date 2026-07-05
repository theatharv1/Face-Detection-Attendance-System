# Sentinel — Face Attendance System

A face-recognition attendance platform: enroll a person once, then recognize them
live from a webcam and mark attendance automatically.

- **`frontend/`** — Vite + React dashboard (deployed on Vercel)
- **`backend/`** — Flask + `face_recognition` (dlib) API with SQLite (deployed on Railway)

The frontend is live and static; the backend runs the face-recognition engine and
cannot run on Vercel (dlib/OpenCV are native and long-running), so it is hosted
separately. The two are connected by a single environment variable.

---

## Architecture

```
Browser ──webcam frame (base64)──▶  Frontend (Vercel)  ──HTTPS──▶  Backend (Railway)
                                                                     │
                                                       face_recognition (dlib) + SQLite
```

| Endpoint | Method | Purpose |
| --- | --- | --- |
| `/health` | GET | Service + model status |
| `/add-user` | POST | Enroll a person (name, enrollment_number, semester, image) |
| `/recognize` | POST | Recognize faces in a frame, auto-mark attendance |
| `/attendance?date=YYYY-MM-DD` | GET | Attendance records for a day |
| `/users` | GET | Enrolled people |

Face encodings (128-d vectors) are stored in SQLite, so enrollments survive restarts
when a persistent volume is mounted.

---

## Deploy the backend (Railway)

Railway builds the Docker image in the cloud — no local Docker needed.

```bash
cd backend
railway login
railway init
railway up
```

Then, in the Railway dashboard:

1. **Volume** → add a volume mounted at `/data` (keeps the SQLite database).
2. **Variables** → optionally set `FRONTEND_ORIGIN` to your Vercel URL to lock CORS.
3. **Settings → Networking** → generate a public domain. Copy it.

Environment variables the backend understands:

| Variable | Default | Meaning |
| --- | --- | --- |
| `DB_PATH` | `/data/attendance.db` | SQLite location |
| `FRONTEND_ORIGIN` | `*` | Allowed CORS origin(s), comma-separated |
| `FACE_TOLERANCE` | `0.45` | Lower = stricter matching |
| `DEDUPE_HOURS` | `2` | Suppress duplicate marks within N hours |

---

## Deploy the frontend (Vercel)

```bash
cd frontend
vercel --prod
```

Set the backend URL so the UI leaves demo mode:

```bash
vercel env add VITE_API_URL production   # paste the Railway public URL
vercel --prod                            # redeploy so it takes effect
```

Without `VITE_API_URL` the UI runs in **demo mode**: everything renders, network
calls are skipped with a clear notice.

---

## Run locally

Backend:

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python app.py            # http://localhost:5000
```

Frontend:

```bash
cd frontend
npm install --legacy-peer-deps
echo "VITE_API_URL=http://localhost:5000" > .env.local
npm run dev              # http://localhost:3000
```
