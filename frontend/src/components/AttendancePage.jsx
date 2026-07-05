import React, { useState } from "react";
import axios from "axios";
import Icon from "@mdi/react";
import {
  mdiMagnify,
  mdiCalendarBlankOutline,
  mdiClockOutline,
  mdiTrayRemove,
} from "@mdi/js";
import PageHeader from "./PageHeader";
import { API_URL, IS_DEMO } from "../lib/api";
import { toast } from "react-toastify";

const AttendancePage = () => {
  const [date, setDate] = useState("");
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const fetchAttendance = async () => {
    if (!date) {
      toast.error("Select a date first.");
      return;
    }
    if (IS_DEMO) {
      toast.info("Demo environment — connect a backend to load records.");
      setSearched(true);
      setRecords([]);
      return;
    }
    setLoading(true);
    try {
      const { data } = await axios.get(`${API_URL}/attendance?date=${date}`);
      setRecords(Array.isArray(data) ? data : []);
      setSearched(true);
    } catch (e) {
      console.error("Attendance error:", e);
      toast.error("Failed to load attendance.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section>
      <PageHeader
        eyebrow="Records"
        title="Attendance"
        desc="Review who was marked present on any given day."
      />

      <div className="grid lg:grid-cols-[340px_1fr] gap-5 items-start">
        <div className="card">
          <div className="card-header">
            <span className="card-title">Query</span>
          </div>
          <div className="card-pad">
            <label className="label">Date</label>
            <input
              className="input"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
            <button
              className="btn btn-primary w-full mt-4"
              onClick={fetchAttendance}
              disabled={loading}
            >
              <Icon path={mdiMagnify} size={0.72} />
              {loading ? "Loading…" : "Search"}
            </button>
          </div>
        </div>

        <div className="card" style={{ minHeight: 340 }}>
          <div className="card-header justify-between">
            <span className="card-title">Present</span>
            {searched && (
              <span className="badge">
                {records.length} record{records.length === 1 ? "" : "s"}
              </span>
            )}
          </div>
          <div className="card-pad">
            {!searched ? (
              <Empty
                icon={mdiCalendarBlankOutline}
                text="Select a date and search to view attendance."
              />
            ) : records.length === 0 ? (
              <Empty icon={mdiTrayRemove} text="No records for the selected date." />
            ) : (
              <div className="flex flex-col gap-2.5">
                {records.map((record, index) => (
                  <div key={index} className="row">
                    <div className="avatar">
                      {(record.name || "?").charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div style={{ fontWeight: 500 }}>{record.name}</div>
                      {record.timestamp && (
                        <div
                          className="flex items-center gap-1.5"
                          style={{ color: "var(--text-3)", fontSize: 12 }}
                        >
                          <Icon path={mdiClockOutline} size={0.5} />
                          {record.timestamp}
                        </div>
                      )}
                    </div>
                    <span className="badge badge-accent" style={{ marginLeft: "auto" }}>
                      Present
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

const Empty = ({ icon, text }) => (
  <div
    className="flex flex-col items-center justify-center text-center gap-2 py-12"
    style={{ color: "var(--text-3)" }}
  >
    <Icon path={icon} size={1.4} />
    <span style={{ fontSize: 13, maxWidth: 260 }}>{text}</span>
  </div>
);

export default AttendancePage;
