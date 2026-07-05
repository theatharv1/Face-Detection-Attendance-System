import React, { useState, useRef, useEffect, useCallback } from "react";
import axios from "axios";
import Webcam from "react-webcam";
import Icon from "@mdi/react";
import {
  mdiPlay,
  mdiStop,
  mdiAccountCheckOutline,
  mdiHelpCircleOutline,
  mdiRadar,
} from "@mdi/js";
import PageHeader from "./PageHeader";
import { API_URL, IS_DEMO } from "../lib/api";
import { toast } from "react-toastify";

function Recognize() {
  const webcamRef = useRef(null);
  const canvasRef = useRef(null);
  const intervalRef = useRef(null);
  const [recognizing, setRecognizing] = useState(false);
  const [recognizedFaces, setRecognizedFaces] = useState([]);
  const [faceLocations, setFaceLocations] = useState([]);
  const [camReady, setCamReady] = useState(false);

  const drawFaceBoxes = useCallback(() => {
    const canvas = canvasRef.current;
    const video = webcamRef.current?.video;
    if (!canvas || !video || !video.videoWidth) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    faceLocations.forEach((location, index) => {
      const [top, right, bottom, left] = location.map((c) => c * 4);
      const known = recognizedFaces[index] !== "Unknown";
      const color = known ? "#34d399" : "#f87171";

      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.strokeRect(left, top, right - left, bottom - top);

      const label = recognizedFaces[index] || "Unknown";
      ctx.font = "600 18px Inter, sans-serif";
      const w = ctx.measureText(label).width + 16;
      ctx.fillStyle = color;
      ctx.fillRect(left, top - 26, w, 22);
      ctx.fillStyle = "#0a0b0d";
      ctx.fillText(label, left + 8, top - 10);
    });
  }, [faceLocations, recognizedFaces]);

  useEffect(() => {
    drawFaceBoxes();
  }, [drawFaceBoxes]);

  const stopRecognition = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = null;
    setRecognizing(false);
    setFaceLocations([]);
    setRecognizedFaces([]);
    const canvas = canvasRef.current;
    if (canvas) canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);
  }, []);

  const startRecognition = useCallback(() => {
    if (IS_DEMO) {
      toast.info("Demo environment — connect a backend to run recognition.");
      return;
    }
    setRecognizing(true);
    intervalRef.current = setInterval(async () => {
      const imageSrc = webcamRef.current?.getScreenshot();
      if (!imageSrc) return;
      const formData = new FormData();
      formData.append("image", imageSrc);
      try {
        const { data } = await axios.post(`${API_URL}/recognize`, formData);
        setRecognizedFaces(data.recognized_faces || []);
        setFaceLocations(data.face_locations || []);
      } catch (e) {
        console.error("Recognition error:", e);
      }
    }, 1000);
  }, []);

  useEffect(() => () => stopRecognition(), [stopRecognition]);

  const knownCount = recognizedFaces.filter((n) => n !== "Unknown").length;

  return (
    <section>
      <PageHeader
        eyebrow="Sessions"
        title="Live Recognition"
        desc="Scan a room in real time. Recognized people are boxed and marked present automatically."
        action={
          <button
            className={"btn " + (recognizing ? "btn-secondary" : "btn-primary")}
            onClick={recognizing ? stopRecognition : startRecognition}
          >
            <Icon path={recognizing ? mdiStop : mdiPlay} size={0.72} />
            {recognizing ? "Stop session" : "Start session"}
          </button>
        }
      />

      <div className="grid lg:grid-cols-[1.7fr_1fr] gap-5 items-start">
        <div className="card">
          <div className="card-header justify-between">
            <span className="card-title">Feed</span>
            <span className={"badge" + (recognizing ? " badge-accent" : "")}>
              <span className={"dot " + (recognizing ? "pulse" : "muted")} />
              {recognizing ? "Scanning" : "Idle"}
            </span>
          </div>
          <div className="card-pad">
            <div className="viewport">
              <Webcam
                audio={false}
                ref={webcamRef}
                screenshotFormat="image/jpeg"
                onUserMedia={() => setCamReady(true)}
                onUserMediaError={() => setCamReady(false)}
              />
              <canvas ref={canvasRef} style={{ zIndex: 2 }} />
              <span className="viewport-corner tl" />
              <span className="viewport-corner tr" />
              <span className="viewport-corner bl" />
              <span className="viewport-corner br" />
              {recognizing && camReady && <div className="viewport-scan" />}
            </div>
          </div>
        </div>

        <div className="card" style={{ minHeight: 340 }}>
          <div className="card-header justify-between">
            <span className="card-title">Detections</span>
            <span style={{ color: "var(--text-3)", fontSize: 12.5 }}>
              {knownCount}/{recognizedFaces.length || 0}
            </span>
          </div>
          <div className="card-pad">
            {recognizedFaces.length === 0 ? (
              <div
                className="flex flex-col items-center justify-center text-center gap-2 py-12"
                style={{ color: "var(--text-3)" }}
              >
                <Icon path={mdiRadar} size={1.4} />
                <span style={{ fontSize: 13 }}>No detections yet. Start a session to scan.</span>
              </div>
            ) : (
              <div className="flex flex-col gap-2.5">
                {recognizedFaces.map((face, i) => {
                  const known = face !== "Unknown";
                  return (
                    <div key={i} className="row">
                      <Icon
                        path={known ? mdiAccountCheckOutline : mdiHelpCircleOutline}
                        size={0.8}
                        color={known ? "var(--accent)" : "var(--danger)"}
                      />
                      <span style={{ fontWeight: 500 }}>{face}</span>
                      {known && (
                        <span className="badge badge-accent" style={{ marginLeft: "auto" }}>
                          Present
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

export default Recognize;
