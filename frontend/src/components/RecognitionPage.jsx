import React, { useState, useRef, useEffect } from "react";
import axios from "axios";
import Webcam from "react-webcam";
import Header from "./Header";
import { Button, Card } from "ui-neumorphism";
import { useNavigate } from "react-router-dom";

function Recognize() {
  const webcamRef = useRef(null);
  const canvasRef = useRef(null);
  const [recognizing, setRecognizing] = useState(false);
  const [recognizedFaces, setRecognizedFaces] = useState([]);
  const [faceLocations, setFaceLocations] = useState([]);
  let intervalId;
  const navigate=useNavigate()

  const startRecognition = async () => {
    setRecognizing(true);
    intervalId = setInterval(async () => {
      const imageSrc = webcamRef.current.getScreenshot();
      const formData = new FormData();
      formData.append("image", imageSrc);

      try {
        const response = await axios.post(
          "http://localhost:5000/recognize",
          formData
        );
        setRecognizedFaces(response.data.recognized_faces);
        setFaceLocations(response.data.face_locations);
      } catch (error) {
        console.error("Error recognizing faces:", error);
      }
    }, 1000);

    return () => clearInterval(intervalId); // clear interval when stopping recognition
  };

  useEffect(() => {
    if (faceLocations.length > 0) {
      drawFaceBoxes();
    }
  }, [recognizedFaces, faceLocations]);

  const drawFaceBoxes = () => {
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");
    const video = webcamRef.current.video;

    // Set canvas size to match webcam video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    context.clearRect(0, 0, canvas.width, canvas.height); // Clear previous drawings

    // Draw rectangles for each recognized face
    faceLocations.forEach((location, index) => {
      const [top, right, bottom, left] = location.map((coord) => coord * 4); // Scale up for original video size
      const color = recognizedFaces[index] !== "Unknown" ? "green" : "red";

      context.strokeStyle = color;
      context.lineWidth = 2;
      context.strokeRect(left, top, right - left, bottom - top);
      context.fillStyle = color;
      context.fillText(recognizedFaces[index], left + 6, top - 10); // Add name above the rectangle
    });
  };

  return (
    <div>
      <div className="flex justify-between gap-5">
        <div>
          <Card>
            <Webcam
              audio={false}
              ref={webcamRef}
              screenshotFormat="image/jpeg"
              width="900px"
            />
            <canvas
              ref={canvasRef}
              style={{ position: "absolute", top: 0, left: 0 }}
            />
          </Card>
        </div>
        <div className="flex flex-col justify-around align-middle mr-32">
          <div className="flex flex-col gap-10">
            <Button onClick={() => navigate("/")}>ADD</Button>
            
            <Button onClick={() => navigate("/attendance")}>ATTENDANCE</Button>
          </div>
          <div>
            <Button onClick={startRecognition}>
              {recognizing ? "Stop Recognition" : "Start Recognition"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Recognize;
