import axiosInstance from '@/lib/api/axiosInstance';
import { apiConfig } from '@/lib/config/apiConfig';

/**
 * Authentication Service
 * Handles user login, registration, password reset, and token management
 */
export const authService = {
  /**
   * User login
   * @param {string} email - User email
   * @param {string} password - User password
   * @returns {Promise<{token: string, user: Object}>} Auth token and user data
   */
  async login(email, password) {
    const response = await axiosInstance.post(apiConfig.endpoints.auth.login, {
      email,
      password,
    });
    
    // Store token
    if (response.data.token) {
      localStorage.setItem('authToken', response.data.token);
    }
    
    return response.data;
  },

  /**
   * User registration
   * @param {Object} userData - User registration data
   * @returns {Promise<{token: string, user: Object}>}
   */
  async register(userData) {
    const response = await axiosInstance.post(
      apiConfig.endpoints.auth.register,
      userData
    );
    
    // Store token
    if (response.data.token) {
      localStorage.setItem('authToken', response.data.token);
    }
    
    return response.data;
  },

  /**
   * User logout
   */
  async logout() {
    try {
      await axiosInstance.post(apiConfig.endpoints.auth.logout);
    } finally {
      localStorage.removeItem('authToken');
    }
  },

  /**
   * Verify current auth token
   * @returns {Promise<{user: Object}>}
   */
  async verify() {
    const response = await axiosInstance.post(apiConfig.endpoints.auth.verify);
    return response.data;
  },

  /**
   * Refresh auth token
   * @returns {Promise<{token: string}>}
   */
  async refreshToken() {
    const response = await axiosInstance.post(
      apiConfig.endpoints.auth.refreshToken
    );
    
    if (response.data.token) {
      localStorage.setItem('authToken', response.data.token);
    }
    
    return response.data;
  },

  /**
   * Request password reset
   * @param {string} email - User email
   * @returns {Promise<{message: string}>}
   */
  async requestPasswordReset(email) {
    const response = await axiosInstance.post(
      apiConfig.endpoints.auth.passwordReset,
      { email }
    );
    return response.data;
  },

  /**
   * Change password
   * @param {Object} data - Old and new password
   * @returns {Promise<{message: string}>}
   */
  async changePassword(data) {
    const response = await axiosInstance.post(
      apiConfig.endpoints.auth.changePassword,
      data
    );
    return response.data;
  },

  /**
   * Get stored auth token
   * @returns {string|null}
   */
  getToken() {
    return localStorage.getItem('authToken');
  },

  /**
   * Check if user is authenticated
   * @returns {boolean}
   */
  isAuthenticated() {
    return !!this.getToken();
  },

  /**
   * Clear all auth data
   */
  clearAuth() {
    localStorage.removeItem('authToken');
  },
};

export default authService;
