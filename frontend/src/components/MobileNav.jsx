import React from "react";
import { NavLink } from "react-router-dom";
import Icon from "@mdi/react";
import { NAV } from "../lib/nav";

const MobileNav = () => (
  <nav
    className="mobile-nav"
    style={{ gap: 4, background: "var(--surface-2)", padding: 4, borderRadius: 10, border: "1px solid var(--border)" }}
  >
    {NAV.map((item) => (
      <NavLink
        key={item.to}
        to={item.to}
        end={item.end}
        className={({ isActive }) => "nav-item" + (isActive ? " active" : "")}
        style={{ padding: 8, marginBottom: 0, boxShadow: "none" }}
        title={item.label}
      >
        <Icon path={item.icon} size={0.8} />
      </NavLink>
    ))}
  </nav>
);

export default MobileNav;
