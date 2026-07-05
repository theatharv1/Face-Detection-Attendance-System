import React from "react";
import {
  RouterProvider,
  createBrowserRouter,
  Outlet,
  useLocation,
} from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import Sidebar from "./components/Sidebar";
import MobileNav from "./components/MobileNav";
import AddUserPage from "./components/AddUserPage";
import RecognitionPage from "./components/RecognitionPage";
import AttendancePage from "./components/AttendancePage";
import { NAV } from "./lib/nav";
import { IS_DEMO } from "./lib/api";

const Topbar = () => {
  const { pathname } = useLocation();
  const current = NAV.find((n) => n.to === pathname) || NAV[0];
  return (
    <header className="topbar">
      <div className="flex items-center gap-3 min-w-0">
        <span style={{ fontWeight: 600, fontSize: 15 }}>{current.title}</span>
        <span className="hidden sm:inline" style={{ color: "var(--text-3)", fontSize: 13 }}>
          / {current.eyebrow}
        </span>
      </div>
      <div className="flex items-center gap-3">
        <MobileNav />
        <span className={"badge" + (IS_DEMO ? "" : " badge-accent")}>
          <span className={"dot pulse" + (IS_DEMO ? " amber" : "")} />
          {IS_DEMO ? "Demo" : "Live"}
        </span>
      </div>
    </header>
  );
};

const Layout = () => (
  <>
    <div className="app-ambient" />
    <div className="shell">
      <Sidebar />
      <div className="content">
        <Topbar />
        <div className="page fade">
          <Outlet />
        </div>
      </div>
    </div>
    <ToastContainer position="bottom-right" theme="dark" autoClose={3200} />
  </>
);

const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { path: "/", element: <AddUserPage /> },
      { path: "/recognition", element: <RecognitionPage /> },
      { path: "/attendance", element: <AttendancePage /> },
    ],
  },
]);

const App = () => <RouterProvider router={router} />;

export default App;
