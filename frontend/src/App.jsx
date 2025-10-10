import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ResponsiveProvider } from './contexts/ResponsiveContext';

import Login from './pages/Login';
import Home from './pages/Home';
import Notification from './pages/Notification';
import UserProfile from './pages/UserProfile';
import ChangePassword from './pages/ChangePassword';
import FacultyManagement from './pages/FacultyManagement';
import StudentManagement from './pages/StudentManagement';
import CalendarView from './pages/CalendarView';
import NotificationManagement from './pages/GmailNotifications';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  return (
    <ResponsiveProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/login" element={<Login />} />
          
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
      </Routes>
    </Router>
    </ResponsiveProvider>
  );
}

export default App;
