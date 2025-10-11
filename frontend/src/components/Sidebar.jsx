import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useResponsive } from "../contexts/ResponsiveContext";

const Sidebar = () => {
  const [role, setRole] = useState("");
  const [loading, setLoading] = useState(true);
  const { isMobile, sidebarOpen, closeSidebar } = useResponsive();

  useEffect(() => {
    const checkAndSetRole = () => {
      const savedRole = localStorage.getItem("role");
      const isAdmin = localStorage.getItem("is_superuser") === "true";
      // console.log("Raw saved role:", savedRole);
      // console.log("Is Superuser:", isAdmin);

      if (isAdmin) {
        setRole("admin");
        if (savedRole !== "admin") {
          localStorage.setItem("role", "admin");
        }
      } else if (savedRole) {
        setRole(savedRole.toLowerCase().trim());
      }

      setLoading(false);
    };

    checkAndSetRole();
    // Check role every 5 seconds in case it changes
    const interval = setInterval(checkAndSetRole, 5000);
    return () => clearInterval(interval);
  }, []);

  // Handle menu item click on mobile
  const handleMenuClick = () => {
    if (isMobile) {
      closeSidebar();
    }
  };

  // Don't render sidebar on mobile when closed
  if (isMobile && !sidebarOpen) {
    return null;
  }

  const sidebarClasses = isMobile
    ? `bg-light border-end vh-100 position-fixed shadow-lg ${
        sidebarOpen ? "show" : ""
      }`
    : "bg-light border-end vh-100 position-fixed";

  const sidebarStyle = isMobile
    ? {
        width: "280px",
        top: "56px",
        left: "0",
        zIndex: 1040,
        transition: "transform 0.3s ease-in-out",
        transform: sidebarOpen ? "translateX(0)" : "translateX(-100%)",
      }
    : {
        width: "250px",
        top: "56px",
        left: "0",
      };

  return (
    <>
      {/* Mobile Overlay */}
      {isMobile && sidebarOpen && (
        <div
          className="position-fixed w-100 h-100"
          style={{
            top: 0,
            left: 0,
            backgroundColor: "rgba(0,0,0,0.5)",
            zIndex: 1035,
          }}
          onClick={closeSidebar}
        />
      )}

      {/* Sidebar */}
      <div id="mobile-sidebar" className={sidebarClasses} style={sidebarStyle}>
        {/* Mobile Close Button */}
        {isMobile && (
          <div className="d-flex justify-content-between align-items-center p-3 border-bottom">
            <span className="fw-bold text-primary">Menu</span>
            <button
              className="btn btn-outline-secondary btn-sm"
              onClick={closeSidebar}
              aria-label="Close menu"
            >
              <i className="bi bi-x-lg"></i>
            </button>
          </div>
        )}

        <div className="d-flex flex-column p-3">
          <ul className="nav nav-pills flex-column mb-auto">
            {/* Common for all roles */}
            <li className="nav-item mb-2">
              <Link
                to="/home"
                className="nav-link text-dark d-flex align-items-center"
                onClick={handleMenuClick}
              >
                <i className="bi bi-speedometer2 me-2"></i>
                Dashboard
              </Link>
            </li>

            <li className="nav-item mb-2">
              <Link
                to="/calendar"
                className="nav-link text-dark d-flex align-items-center"
                onClick={handleMenuClick}
              >
                <i className="bi bi-calendar-event me-2"></i>
                Calendar
              </Link>
            </li>

            <li className="nav-item mb-2">
              <Link
                to="/manage-notifications"
                className="nav-link text-dark d-flex align-items-center"
                onClick={handleMenuClick}
              >
                <i className="bi bi-bell me-2"></i>
                Notifications
              </Link>
            </li>

            {/* Student Management - for admin, coordinator, and guide */}
            {(role === "admin" ||
              role === "coordinator" ||
              role === "guide") && (
              <li className="nav-item mb-2">
                <Link
                  to="/students"
                  className="nav-link text-dark d-flex align-items-center"
                  onClick={handleMenuClick}
                >
                  <i className="bi bi-mortarboard me-2"></i>
                  Students
                </Link>
              </li>
            )}

            {/* Admin-specific menu items */}
            {role === "admin" && (
              <>
                <li className="nav-item mb-2">
                  <Link
                    to="/faculties"
                    className="nav-link text-dark d-flex align-items-center"
                    onClick={handleMenuClick}
                  >
                    <i className="bi bi-person-badge me-2"></i>
                    Faculties
                  </Link>
                </li>
              </>
            )}

            {/* Coordinator-specific menu items */}
            {role === "coordinator" && (
              <>
                              <li className="nav-item mb-2">
                  <Link
                    to="/faculties"
                    className="nav-link text-dark d-flex align-items-center"
                    onClick={handleMenuClick}
                  >
                    <i className="bi bi-person-badge me-2"></i>
                    Faculties
                  </Link>
                </li>
              </>
            )}

            {/* Guide-specific menu items */}
            {role === "guide" && (
              <>
                <li className="nav-item mb-2">
                  <Link
                    to="/evaluations"
                    className="nav-link text-dark d-flex align-items-center"
                    onClick={handleMenuClick}
                  >
                    <i className="bi bi-clipboard-check me-2"></i>
                    Evaluations
                  </Link>
                </li>
                <li className="nav-item mb-2">
                  <Link
                    to="/student-progress"
                    className="nav-link text-dark d-flex align-items-center"
                    onClick={handleMenuClick}
                  >
                    <i className="bi bi-graph-up me-2"></i>
                    Student Progress
                  </Link>
                </li>
              </>
            )}

            {/* Common menu items for all roles */}
            <li className="nav-item mb-2">
              <Link
                to="/profile"
                className="nav-link text-dark d-flex align-items-center"
                onClick={handleMenuClick}
              >
                <i className="bi bi-person me-2"></i>
                Profile
              </Link>
            </li>
          </ul>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
