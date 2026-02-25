/**
 * Application Configuration
 * Global app settings and constants
 */

export const appConfig = {
  // App identity
  appName: import.meta.env.VITE_APP_NAME || 'ProjTrack',
  appVersion: '1.0.0',
  
  // Environment
  environment: import.meta.env.VITE_ENV || 'development',
  isDevelopment: import.meta.env.DEV,
  isProduction: import.meta.env.PROD,
  isStaging: import.meta.env.VITE_ENV === 'staging',
  
  // Feature flags
  features: {
    analytics: import.meta.env.VITE_ANALYTICS_ENABLED === 'true',
    errorReporting: import.meta.env.VITE_ERROR_REPORTING === 'true',
    debugging: import.meta.env.DEV,
  },
  
  // Pagination
  pagination: {
    defaultPageSize: 10,
    pageSizeOptions: [10, 25, 50, 100],
  },
  
  // Timeouts and intervals
  timeouts: {
    sessionWarning: 15 * 60 * 1000, // 15 minutes
    sessionTimeout: 30 * 60 * 1000, // 30 minutes
  },
  
  // UI defaults
  ui: {
    defaultTheme: 'light', // 'light' or 'dark'
    locale: 'en-US',
  },
};

export default appConfig;
