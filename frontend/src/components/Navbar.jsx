import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useResponsive } from '../contexts/ResponsiveContext';

const Navbar = () => {
  const navigate = useNavigate();
  const { isMobile, toggleSidebar } = useResponsive();

  const handleLogout = () => {
    localStorage.clear();
    navigate('/login');
  };

  return (
    <nav className="navbar navbar-expand-lg navbar-dark bg-primary fixed-top shadow-sm">
      <div className="container-fluid">
        {/* Mobile Hamburger Menu */}
        {isMobile && (
          <button
            id="hamburger-menu"
            className="btn btn-outline-light me-2"
            type="button"
            onClick={toggleSidebar}
            aria-label="Toggle sidebar"
          >
            <i className="bi bi-list"></i>
          </button>
        )}

        {/* Brand */}
        <Link className="navbar-brand fw-bold" to="/home">
          ProjTrack Desk
        </Link>

        {/* Responsive Toggler (optional) */}
        <button
          className="navbar-toggler"
          type="button"
          data-bs-toggle="collapse"
          data-bs-target="#navbarNavRight"
          aria-controls="navbarNavRight"
          aria-expanded="false"
          aria-label="Toggle navigation"
        >
          <span className="navbar-toggler-icon"></span>
        </button>

        {/* Right-side content */}
        <div className="collapse navbar-collapse justify-content-end" id="navbarNavRight">
          <div className="d-flex align-items-center gap-3">

            {/* Notification Button */}
            <Link to="/manage-notifications" className="btn btn-outline-light btn-sm" title="Notifications">
              <i className="bi bi-bell-fill"></i>
            </Link>

            {/* Profile Dropdown */}
            <div className="dropdown">
              <button
                className="btn btn-outline-light btn-sm dropdown-toggle"
                type="button"
                data-bs-toggle="dropdown"
                aria-expanded="false"
              >
                <i className="bi bi-person-circle me-1"></i> Profile
              </button>
              <ul className="dropdown-menu dropdown-menu-end">
                <li>
                  <Link className="dropdown-item" to="/profile">User Profile</Link>
                </li>
                <li>
                  <Link className="dropdown-item" to="/change-password">Change Password</Link>
                </li>
                <li><hr className="dropdown-divider" /></li>
                <li>
                  <button className="dropdown-item text-danger" onClick={handleLogout}>
                    Log Out
                  </button>
                </li>
              </ul>
            </div>

          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
