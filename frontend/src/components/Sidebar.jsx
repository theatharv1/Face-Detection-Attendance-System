import React from "react";
import { NavLink } from "react-router-dom";
import Icon from "@mdi/react";
import { mdiShieldCheckOutline } from "@mdi/js";
import { NAV } from "../lib/nav";
import { IS_DEMO } from "../lib/api";

const Sidebar = () => (
  <aside className="sidebar">
    <NavLink to="/" className="brand">
      <img src="/mark.svg" alt="" className="brand-mark" />
      <div>
        <div className="brand-name">Sentinel</div>
        <div className="brand-sub">Face Attendance</div>
      </div>
    </NavLink>

    <div className="nav-group-label">Workspace</div>
    <nav>
      {NAV.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          className={({ isActive }) => "nav-item" + (isActive ? " active" : "")}
        >
          <Icon path={item.icon} size={0.78} />
          {item.label}
        </NavLink>
      ))}
    </nav>

    <div style={{ marginTop: "auto" }}>
      <div
        className="card"
        style={{ padding: 14, display: "flex", gap: 10, alignItems: "flex-start" }}
      >
        <Icon
          path={mdiShieldCheckOutline}
          size={0.7}
          color="var(--accent)"
          style={{ marginTop: 1, flexShrink: 0 }}
        />
        <div>
          <div style={{ fontSize: 12.5, fontWeight: 600 }}>
            {IS_DEMO ? "Demo environment" : "System online"}
          </div>
          <div style={{ fontSize: 11.5, color: "var(--text-3)", marginTop: 2 }}>
            {IS_DEMO
              ? "Connect a backend to enable capture."
              : "Recognition engine connected."}
          </div>
        </div>
      </div>
    </div>
  </aside>
);

export default Sidebar;
