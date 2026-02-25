import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ResponsiveProvider } from './contexts/ResponsiveContext';

// Auth Pages
import Login from './app/(auth)/login';
import ForgotPassword from './app/(auth)/forgot-password';
import ChangePassword from './app/(auth)/change-password';

// Dashboard Pages
import Home from './app/(dashboard)/home';
import Notification from './pages/Notification';
import UserProfile from './pages/UserProfile';
import CalendarView from './pages/CalendarView';
import ProjectManagement from './pages/ProjectManagement';
import StudentActivities from './pages/StudentActivities';

// Admin Pages
import FacultyManagement from './pages/FacultyManagement';
import StudentManagement from './pages/StudentManagement';
import NotificationManagement from './pages/GmailNotifications';
import GuideDashboard from './pages/GuideDashboard';

import ProtectedRoute from './components/common/ProtectedRoute';

function App() {
  return (
    <ResponsiveProvider>
      <Router>
        <Routes>
          {/* Auth Routes */}
          <Route path="/" element={<Login />} />
          <Route path="/login" element={<Login />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          
          {/* Dashboard Routes */}
          <Route 
            path="/home" 
            element={
              <ProtectedRoute>
                <Home />
              </ProtectedRoute>
            } 
          />
        
          <Route 
            path="/notifications" 
            element={
              <ProtectedRoute>
                <Notification />
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/profile" 
            element={
              <ProtectedRoute>
                <UserProfile />
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/change-password" 
            element={
              <ProtectedRoute>
                <ChangePassword />
              </ProtectedRoute>
            } 
          />
          
          {/* Admin Routes */}
          <Route 
            path="/faculties" 
            element={
              <ProtectedRoute allowedRoles={['admin', 'coordinator']}>
                <FacultyManagement />
              </ProtectedRoute>
            } 
          />

          <Route 
            path="/students" 
            element={
              <ProtectedRoute allowedRoles={['admin', 'coordinator', 'guide']}>
                <StudentManagement />
              </ProtectedRoute>
            } 
          />

          <Route 
            path="/calendar" 
            element={
              <ProtectedRoute>
                <CalendarView />
              </ProtectedRoute>
            } 
          />

          <Route 
            path="/manage-notifications" 
            element={
              <ProtectedRoute>
                <NotificationManagement />
              </ProtectedRoute>
            } 
          />

          <Route 
            path="/projects" 
            element={
              <ProtectedRoute allowedRoles={['coordinator']}>
                <ProjectManagement />
              </ProtectedRoute>
            } 
          />

          <Route 
            path="/guide-dashboard" 
            element={
              <ProtectedRoute allowedRoles={['guide', 'faculty', 'coordinator']}>
                <GuideDashboard />
              </ProtectedRoute>
            } 
          />

          <Route 
            path="/my-activities" 
            element={
              <ProtectedRoute allowedRoles={['student']}>
                <StudentActivities />
              </ProtectedRoute>
            } 
          />
        </Routes>
      </Router>
    </ResponsiveProvider>
  );
}

export default App;
