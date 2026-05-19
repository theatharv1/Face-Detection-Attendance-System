from flask import Flask, request, jsonify
from flask_cors import CORS
import cv2
import face_recognition
import numpy as np
import os
import pymongo
from datetime import datetime, timedelta
from concurrent.futures import ThreadPoolExecutor
from threading import Lock
import base64

# Ensure the 'images' directory exists
if not os.path.exists('images'):
    os.makedirs('images')

# Flask app and CORS setup
app = Flask(__name__)
CORS(app)

# MongoDB connection setup
MONGODB_URI = "mongodb://localhost:27017"
client = pymongo.MongoClient(MONGODB_URI)
db = client['attendance_system']

# Locks and thread pool for concurrency
attendance_lock = Lock()
face_data_lock = Lock()
executor = ThreadPoolExecutor(max_workers=3)

# Global variables for face data
known_face_encodings = []
known_face_names = []
known_face_details = {}
last_attendance_time = {}

# Function to load known faces from database and local images
def load_known_faces():
    global known_face_encodings, known_face_names, known_face_details
    print("Loading known faces...")

    with face_data_lock:
        known_face_encodings.clear()
        known_face_names.clear()
        known_face_details.clear()

        # Load images from the 'images' directory
        for filename in os.listdir('images'):
            if filename.endswith(".jpg") or filename.endswith(".png"):
                name = os.path.splitext(filename)[0]  # Extract name without extension
                img_path = os.path.join('images', filename)
                img = face_recognition.load_image_file(img_path)
                encodings = face_recognition.face_encodings(img)

                if encodings:
                    encoding = encodings[0]
                    known_face_encodings.append(encoding)
                    known_face_names.append(name)

                    # Retrieve user details from the database
                    try:
                        user_data = db['users'].find_one({"name": name})
                        if user_data:
                            known_face_details[name] = {
                                "enrollment_number": user_data['enrollment_number'],
                                "semester": user_data['semester']
                            }
                    except Exception as e:
                        print(f"Error loading user data for {name}: {e}")

    print(f"Loaded {len(known_face_names)} faces.")

# Function to mark attendance
def mark_attendance(name):
    now = datetime.now()
    date_today = now.strftime("%Y-%m-%d")
    time_only = now.strftime("%H:%M:%S")

    with attendance_lock:
        # Check for recent attendance to prevent duplicates
        if name in last_attendance_time:
            last_time, last_date = last_attendance_time[name]
            if last_date == date_today and now - last_time < timedelta(hours=2):
                print(f"Attendance already marked for {name} within the last 2 hours.")
                return

        last_attendance_time[name] = (now, date_today)

    try:
        attendance_collection = db['attendance']
        attendance_record = {
            "name": name,
            "date": date_today,
            "timestamp": time_only,
            "status": "Present"
        }
        attendance_collection.insert_one(attendance_record)
        print(f"Attendance marked for {name} at {time_only}.")
        update_attendance_html([(name, time_only)])
    except Exception as e:
        print(f"Error marking attendance for {name}: {e}")

# Function to update the attendance HTML report
def update_attendance_html(attendance_records):
    date_today = datetime.now().strftime("%Y-%m-%d")
    html_filename = f"{date_today}_attendance.html"
    
    if not os.path.exists(html_filename):
        with open(html_filename, 'w') as file:
            file.write("<html>\n<head><title>Attendance</title></head>\n<body>\n")
            file.write(f"<h2>Attendance for {date_today}</h2>\n")
            file.write("<table border='1'>\n<tr><th>Name</th><th>Enrollment Number</th><th>Semester</th><th>Status</th><th>Timestamp</th></tr>\n")
    
    with open(html_filename, 'a') as file:
        for name, timestamp in attendance_records:
            enrollment_number = known_face_details.get(name, {}).get("enrollment_number", "N/A")
            semester = known_face_details.get(name, {}).get("semester", "N/A")
            file.write(f"<tr><td>{name}</td><td>{enrollment_number}</td><td>{semester}</td><td>Present</td><td>{timestamp}</td></tr>\n")
    
    print(f"Updated HTML file: {html_filename}")

# API endpoint to add a new user
@app.route('/add-user', methods=['POST'])
def add_user():
    try:
        data = request.form
        name = data['name']
        enrollment_number = data['enrollment_number']
        semester = data['semester']
        image_data = data['image']

        # Decode and save the image with the user's name
        header, encoded = image_data.split(",", 1)
        image = base64.b64decode(encoded)
        img_path = os.path.join('images', f"{name}.jpg")  # Use name for the filename
        with open(img_path, "wb") as img_file:
            img_file.write(image)

        # Insert user details into MongoDB
        user_data = {
            "name": name,
            "enrollment_number": enrollment_number,
            "semester": semester,
            "date_added": datetime.now().strftime("%Y-%m-%d")
        }
        db['users'].insert_one(user_data)

        # Reload known faces
        executor.submit(load_known_faces)

        return jsonify({"success": f"New user added: {name}"}), 200
    except Exception as e:
        return jsonify({"error": f"Failed to add user. Error: {str(e)}"}), 500

# API endpoint to recognize faces
@app.route('/recognize', methods=['POST'])
def recognize_faces_api():
    try:
        data = request.form['image']
        
        header, encoded = data.split(",", 1)
        image_data = base64.b64decode(encoded)

        np_array = np.frombuffer(image_data, np.uint8)
        frame = cv2.imdecode(np_array, cv2.IMREAD_COLOR)

        small_frame = cv2.resize(frame, (0, 0), fx=0.25, fy=0.25)
        rgb_frame = cv2.cvtColor(small_frame, cv2.COLOR_BGR2RGB)

        face_locations = face_recognition.face_locations(rgb_frame)
        face_encodings = face_recognition.face_encodings(rgb_frame, face_locations)

        face_names = []

        with face_data_lock:
            for face_encoding in face_encodings:
                face_distances = face_recognition.face_distance(known_face_encodings, face_encoding)
                confidence_threshold = 0.45
                best_match_index = np.argmin(face_distances)

                if face_distances[best_match_index] < confidence_threshold:
                    name = known_face_names[best_match_index]
                else:
                    name = "Unknown"

                face_names.append(name)

                if name != "Unknown":
                    executor.submit(mark_attendance, name)

        response = {
            "recognized_faces": face_names,
            "face_locations": face_locations
        }

        return jsonify(response), 200
    except Exception as e:
        return jsonify({"error": f"Failed to recognize faces. Error: {str(e)}"}), 500

# API endpoint to fetch attendance by date
@app.route('/attendance', methods=['GET'])
def get_attendance():
    date = request.args.get('date')
    
    if not date:
        return jsonify({"error": "Date parameter is required"}), 400

    try:
        records = list(db['attendance'].find({'date': date}))
        for record in records:
            record['_id'] = str(record['_id'])  # Convert ObjectId to string if necessary
    except Exception as e:
        print(f"Error fetching attendance for {date}: {e}")
        return jsonify({"error": "Failed to fetch attendance records"}), 500

    return jsonify(records), 200

if __name__ == '__main__':
    load_known_faces()
    app.run(debug=True)
