/**
 * API Configuration
 * Centralized API endpoint management
 * Uses environment variables for easy configuration across environments
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export const API_ENDPOINTS = {
  // Auth endpoints
  AUTH: {
    LOGIN: `${API_BASE_URL}/api/auth/login/`,
    LOGOUT: `${API_BASE_URL}/api/auth/logout/`,
    REFRESH: `${API_BASE_URL}/api/auth/refresh/`,
    CHANGE_PASSWORD: `${API_BASE_URL}/api/auth/change-password/`,
    FORGOT_PASSWORD: `${API_BASE_URL}/api/auth/forgot-password/`,
    RESET_PASSWORD: `${API_BASE_URL}/api/auth/reset-password/`,
    USER: `${API_BASE_URL}/api/auth/user/`,
  },
  
  // Project endpoints
  PROJECTS: {
    LIST: `${API_BASE_URL}/api/projects/`,
    ACTIVITIES: `${API_BASE_URL}/api/project-activities/`,
  },
  
  // Student endpoints
  STUDENTS: `${API_BASE_URL}/api/students/`,
  
  // Faculty endpoints
  FACULTY: `${API_BASE_URL}/api/faculty/`,
  
  // Calendar endpoints
  CALENDAR: `${API_BASE_URL}/api/calendar/`,
};

export default API_BASE_URL;
