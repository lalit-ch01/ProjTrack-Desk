import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

const Sidebar = () => {
  const [role, setRole] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAndSetRole = () => {
      const savedRole = localStorage.getItem('role');
      const isAdmin = localStorage.getItem('is_superuser') === 'true';
      console.log('Raw saved role:', savedRole);
      console.log('Is Superuser:', isAdmin);
      
      if (isAdmin) {
        setRole('admin');
        if (savedRole !== 'admin') {
          localStorage.setItem('role', 'admin');
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

  return (
    <div className="bg-light border-end vh-100 position-fixed" style={{ width: '250px', top: '56px', left: '0' }}>
      <div className="d-flex flex-column p-3">
        <ul className="nav nav-pills flex-column mb-auto">
          {/* Common for all roles */}
          <li className="nav-item mb-2">
            <Link to="/home" className="nav-link text-dark d-flex align-items-center">
              <i className="bi bi-speedometer2 me-2"></i>
              Dashboard
            </Link>
          </li>

          <li className="nav-item mb-2">
            <Link to="/calendar" className="nav-link text-dark d-flex align-items-center">
              <i className="bi bi-calendar-event me-2"></i>
              Calendar
            </Link>
          </li>
          
          <li className="nav-item mb-2">
            <Link to="/manage-notifications" className="nav-link text-dark d-flex align-items-center">
              <i className="bi bi-bell me-2"></i>
              Notifications
            </Link>
          </li>

          {/* Student Management - for admin, coordinator, and guide */}
          {(role === 'admin' || role === 'coordinator' || role === 'guide') && (
            <li className="nav-item mb-2">
              <Link to="/students" className="nav-link text-dark d-flex align-items-center">
                <i className="bi bi-mortarboard me-2"></i>
                Student Management
              </Link>
            </li>
          )}

          {/* Admin-specific menu items */}
          {role === 'admin' && (
            <>
              <li className="nav-item mb-2">
                <Link to="/faculties" className="nav-link text-dark d-flex align-items-center">
                  <i className="bi bi-person-badge me-2"></i>
                  Faculties
                </Link>
              </li>
              <li className="nav-item mb-2">
                <Link to="/students" className="nav-link text-dark d-flex align-items-center">
                  <i className="bi bi-people-fill me-2"></i>
                  Students
                </Link>
              </li>
              <li className="nav-item mb-2">
                <Link to="/manage-projects" className="nav-link text-dark d-flex align-items-center">
                  <i className="bi bi-folder me-2"></i>
                  Manage Projects
                </Link>
              </li>
            </>
          )}

          {/* Coordinator-specific menu items */}
          {role === 'coordinator' && (
            <>
              <li className="nav-item mb-2">
                <Link to="/projects" className="nav-link text-dark d-flex align-items-center">
                  <i className="bi bi-kanban me-2"></i>
                  Projects
                </Link>
              </li>
              <li className="nav-item mb-2">
                <Link to="/assign-guides" className="nav-link text-dark d-flex align-items-center">
                  <i className="bi bi-person-check me-2"></i>
                  Assign Guides
                </Link>
              </li>
              <li className="nav-item mb-2">
                <Link to="/review-submissions" className="nav-link text-dark d-flex align-items-center">
                  <i className="bi bi-file-earmark-text me-2"></i>
                  Review Submissions
                </Link>
              </li>
            </>
          )}

          {/* Guide-specific menu items */}
          {role === 'guide' && (
            <>
              <li className="nav-item mb-2">
                <Link to="/my-projects" className="nav-link text-dark d-flex align-items-center">
                  <i className="bi bi-folder-check me-2"></i>
                  My Projects
                </Link>
              </li>
              <li className="nav-item mb-2">
                <Link to="/evaluations" className="nav-link text-dark d-flex align-items-center">
                  <i className="bi bi-clipboard-check me-2"></i>
                  Evaluations
                </Link>
              </li>
              <li className="nav-item mb-2">
                <Link to="/student-progress" className="nav-link text-dark d-flex align-items-center">
                  <i className="bi bi-graph-up me-2"></i>
                  Student Progress
                </Link>
              </li>
            </>
          )}

          {/* Common menu items for all roles */}
          <li className="nav-item mb-2">
            <Link to="/profile" className="nav-link text-dark d-flex align-items-center">
              <i className="bi bi-person me-2"></i>
              Profile
            </Link>
          </li>
        </ul>
      </div>
    </div>
  );
};

export default Sidebar;
