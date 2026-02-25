import axiosInstance from '@/lib/api/axiosInstance';
import { apiConfig } from '@/lib/config/apiConfig';

/**
 * User Service
 * Handles user-related operations: profile, list, update, delete
 */
export const userService = {
  /**
   * Get current user profile
   * @returns {Promise<Object>} User profile data
   */
  async getProfile() {
    const response = await axiosInstance.get(apiConfig.endpoints.users.profile);
    return response.data;
  },

  /**
   * Get all users (admin only)
   * @param {Object} params - Query parameters (filters, pagination)
   * @returns {Promise<Object>} Paginated user list
   */
  async getUsers(params = {}) {
    const response = await axiosInstance.get(apiConfig.endpoints.users.list, {
      params,
    });
    return response.data;
  },

  /**
   * Get user by ID
   * @param {string} userId - User ID
   * @returns {Promise<Object>} User data
   */
  async getUserById(userId) {
    const response = await axiosInstance.get(
      apiConfig.endpoints.users.detail(userId)
    );
    return response.data;
  },

  /**
   * Update user profile
   * @param {string} userId - User ID
   * @param {Object} userData - User data to update
   * @returns {Promise<Object>} Updated user data
   */
  async updateUser(userId, userData) {
    const response = await axiosInstance.patch(
      apiConfig.endpoints.users.update(userId),
      userData
    );
    return response.data;
  },

  /**
   * Delete user (admin only)
   * @param {string} userId - User ID
   * @returns {Promise<{message: string}>}
   */
  async deleteUser(userId) {
    const response = await axiosInstance.delete(
      apiConfig.endpoints.users.delete(userId)
    );
    return response.data;
  },

  /**
   * Update current user's profile
   * @param {Object} userData - Profile data to update
   * @returns {Promise<Object>} Updated profile
   */
  async updateProfile(userData) {
    const response = await axiosInstance.patch(
      apiConfig.endpoints.users.profile,
      userData
    );
    return response.data;
  },
};

export default userService;
