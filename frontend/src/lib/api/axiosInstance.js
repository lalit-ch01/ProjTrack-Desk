import axios from 'axios';
import { appConfig } from '../config/apiConfig';

/**
 * Axios instance with default configuration
 * Includes interceptors for auth tokens and error handling
 */
const axiosInstance = axios.create({
  baseURL: appConfig.baseURL,
  timeout: appConfig.timeout,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Request interceptor
 * Adds authorization token to all requests
 */
axiosInstance.interceptors.request.use(
  (config) => {
    // Get token from localStorage or context
    const token = localStorage.getItem('authToken');
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

/**
 * Response interceptor
 * Handles common error scenarios
 */
axiosInstance.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Handle 401 Unauthorized - redirect to login
    if (error.response?.status === 401) {
      localStorage.removeItem('authToken');
      window.location.href = '/login';
    }
    
    // Handle 403 Forbidden
    if (error.response?.status === 403) {
      console.error('Access forbidden');
    }
    
    return Promise.reject(error);
  }
);

export default axiosInstance;

/**
 * Alias for backward compatibility
 */
export const apiClient = axiosInstance;
