import axiosInstance from '@/lib/api/axiosInstance';
import { apiConfig } from '@/lib/config/apiConfig';

/**
 * Project Service
 * Handles project CRUD operations
 */
export const projectService = {
  /**
   * Get all projects
   * @param {Object} filters - Filter parameters
   * @returns {Promise<Object>} List of projects
   */
  async getProjects(filters = {}) {
    const response = await axiosInstance.get(apiConfig.endpoints.projects.list, {
      params: filters,
    });
    return response.data;
  },

  /**
   * Get project by ID
   * @param {string} projectId - Project ID
   * @returns {Promise<Object>} Project data
   */
  async getProjectById(projectId) {
    const response = await axiosInstance.get(
      apiConfig.endpoints.projects.detail(projectId)
    );
    return response.data;
  },

  /**
   * Create new project
   * @param {Object} projectData - Project data
   * @returns {Promise<Object>} Created project
   */
  async createProject(projectData) {
    const response = await axiosInstance.post(
      apiConfig.endpoints.projects.create,
      projectData
    );
    return response.data;
  },

  /**
   * Update project
   * @param {string} projectId - Project ID
   * @param {Object} projectData - Updated project data
   * @returns {Promise<Object>} Updated project
   */
  async updateProject(projectId, projectData) {
    const response = await axiosInstance.patch(
      apiConfig.endpoints.projects.update(projectId),
      projectData
    );
    return response.data;
  },

  /**
   * Delete project
   * @param {string} projectId - Project ID
   * @returns {Promise<{message: string}>}
   */
  async deleteProject(projectId) {
    const response = await axiosInstance.delete(
      apiConfig.endpoints.projects.delete(projectId)
    );
    return response.data;
  },
};

export default projectService;
