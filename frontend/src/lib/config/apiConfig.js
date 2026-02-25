/**
 * API Configuration
 * Environment-specific settings for API communication
 */

export const apiConfig = {
  // Base URL for API requests
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000',
  
  // Request timeout in milliseconds
  timeout: 30000,
  
  // Default headers
  headers: {
    'Content-Type': 'application/json',
  },
  
  // API endpoints
  endpoints: {
    // Auth
    auth: {
      login: '/api/auth/login',
      logout: '/api/auth/logout',
      register: '/api/auth/register',
      refreshToken: '/api/auth/refresh',
      verify: '/api/auth/verify',
      passwordReset: '/api/auth/password-reset',
      changePassword: '/api/auth/change-password',
    },
    
    // Users
    users: {
      profile: '/api/users/profile',
      list: '/api/users',
      detail: (id) => `/api/users/${id}`,
      update: (id) => `/api/users/${id}`,
      delete: (id) => `/api/users/${id}`,
    },
    
    // Projects
    projects: {
      list: '/api/projects',
      create: '/api/projects',
      detail: (id) => `/api/projects/${id}`,
      update: (id) => `/api/projects/${id}`,
      delete: (id) => `/api/projects/${id}`,
    },
    
    // Calendar Events
    calendar: {
      events: '/api/calendar/events',
      createEvent: '/api/calendar/events',
      updateEvent: (id) => `/api/calendar/events/${id}`,
      deleteEvent: (id) => `/api/calendar/events/${id}`,
    },
    
    // Notifications
    notifications: {
      list: '/api/notifications',
      markAsRead: (id) => `/api/notifications/${id}/mark-as-read`,
      delete: (id) => `/api/notifications/${id}`,
    },
  },
};

export default apiConfig;
