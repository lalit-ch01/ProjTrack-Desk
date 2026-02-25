import { useState, useEffect } from 'react';

/**
 * Custom hook for authentication
 * Provides user state and authentication methods
 * 
 * @returns {Object} Auth state and methods
 *   - user: Current authenticated user
 *   - isLoading: Loading state during auth check
 *   - isAuthenticated: Boolean indicating if user is logged in
 *   - login: Function to login user
 *   - logout: Function to logout user
 *   - register: Function to register new user
 */
export function useAuth() {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Check authentication on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = localStorage.getItem('authToken');
        
        if (token) {
          // TODO: Verify token with backend
          setIsAuthenticated(true);
          // TODO: Load user data from localStorage or API
        } else {
          setIsAuthenticated(false);
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = async (email, password) => {
    // TODO: Implement login logic
  };

  const logout = async () => {
    localStorage.removeItem('authToken');
    setUser(null);
    setIsAuthenticated(false);
  };

  const register = async (userData) => {
    // TODO: Implement register logic
  };

  return {
    user,
    isLoading,
    isAuthenticated,
    login,
    logout,
    register,
  };
}

export default useAuth;
