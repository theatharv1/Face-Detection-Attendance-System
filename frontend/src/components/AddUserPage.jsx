import React, { useState, useRef, useCallback } from "react";
import axios from "axios";
import Webcam from "react-webcam";
import { toast } from "react-toastify";
import Icon from "@mdi/react";
import { mdiCameraOutline, mdiVideoOutline, mdiCheckCircleOutline } from "@mdi/js";
import PageHeader from "./PageHeader";
import { API_URL, IS_DEMO } from "../lib/api";

function AddUser() {
  const [name, setName] = useState("");
  const [enrollmentNumber, setEnrollmentNumber] = useState("");
  const [semester, setSemester] = useState("");
  const [loading, setLoading] = useState(false);
  const [camReady, setCamReady] = useState(false);
  const webcamRef = useRef(null);

  const capture = useCallback(async () => {
    if (!name || !enrollmentNumber || !semester) {
      toast.error("Complete every field before enrolling.");
      return;
    }
    if (IS_DEMO) {
      toast.info("Demo environment — connect a backend to save enrollments.");
      return;
    }
    setLoading(true);
    try {
      const imageSrc = webcamRef.current?.getScreenshot();
      if (!imageSrc) {
        toast.error("Camera not ready. Grant access and retry.");
        return;
      }
      const formData = new FormData();
      formData.append("image", imageSrc);
      formData.append("name", name);
      formData.append("enrollment_number", enrollmentNumber);
      formData.append("semester", semester);

      const { data } = await axios.post(`${API_URL}/add-user`, formData);
      if (data.success) {
        toast.success(`${name} enrolled.`);
        setName("");
        setEnrollmentNumber("");
        setSemester("");
      } else {
        toast.error(data.error || "Could not add user.");
      }
    } catch (err) {
      toast.error(err?.response?.data?.error || "Request failed. Is the backend reachable?");
    } finally {
      setLoading(false);
    }
  }, [name, enrollmentNumber, semester]);

  return (
    <section>
      <PageHeader
        eyebrow="People"
        title="Enrollment"
        desc="Register a person once — the system encodes their face and recognizes them automatically from then on."
      />

      <div className="grid lg:grid-cols-2 gap-5 items-start">
        <div className="card">
          <div className="card-header">
            <span className="card-title">Person details</span>
          </div>
          <div className="card-pad flex flex-col gap-4">
            <div>
              <label className="label">Full name</label>
              <input
                className="input"
                type="text"
                placeholder="Prakhar Sharma"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="label">Enrollment number</label>
                <input
                  className="input"
                  type="text"
                  placeholder="0827CS221XXX"
                  value={enrollmentNumber}
                  onChange={(e) => setEnrollmentNumber(e.target.value)}
                />
              </div>
              <div>
                <label className="label">Semester</label>
                <input
                  className="input"
                  type="text"
                  placeholder="6"
                  value={semester}
                  onChange={(e) => setSemester(e.target.value)}
                />
              </div>
            </div>

            <div className="flex items-center gap-3 pt-1">
              <button onClick={capture} className="btn btn-primary" disabled={loading}>
                <Icon path={mdiCameraOutline} size={0.72} />
                {loading ? "Enrolling…" : "Capture & enroll"}
              </button>
              <span style={{ color: "var(--text-3)", fontSize: 12.5 }}>
                One face · front-facing · even lighting
              </span>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header justify-between">
            <span className="card-title">Camera</span>
            <span className="badge">
              <span className={"dot " + (camReady ? "pulse" : "muted")} />
              {camReady ? "Ready" : "Waiting"}
            </span>
          </div>
          <div className="card-pad">
            <div className="viewport">
              <Webcam
                audio={false}
                ref={webcamRef}
                screenshotFormat="image/jpeg"
                mirrored
                onUserMedia={() => setCamReady(true)}
                onUserMediaError={() => setCamReady(false)}
              />
              <span className="viewport-corner tl" />
              <span className="viewport-corner tr" />
              <span className="viewport-corner bl" />
              <span className="viewport-corner br" />
              {camReady && <div className="viewport-scan" />}
              {!camReady && (
                <div
                  className="absolute inset-0 flex flex-col items-center justify-center gap-2"
                  style={{ color: "var(--text-3)" }}
                >
                  <Icon path={mdiVideoOutline} size={1.3} />
                  <span style={{ fontSize: 13 }}>Awaiting camera permission</span>
                </div>
              )}
            </div>
            <div
              className="flex items-center gap-2 mt-3"
              style={{ color: "var(--text-3)", fontSize: 12.5 }}
            >
              <Icon path={mdiCheckCircleOutline} size={0.62} color="var(--accent)" />
              The captured frame is encoded, not stored as a photo.
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default AddUser;
