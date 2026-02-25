import { useState, useEffect } from 'react';

/**
 * Custom hook for data fetching
 * Handles loading, error, and success states
 * 
 * @param {Function} fetchFunction - Async function that fetches data
 * @param {Array} dependencies - Dependencies array for useEffect
 * @returns {Object} Fetch state
 *   - data: Fetched data
 *   - loading: Loading state
 *   - error: Error object or null
 *   - refetch: Function to retry fetch
 */
export function useFetch(fetchFunction, dependencies = []) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const execute = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await fetchFunction();
      setData(result);
    } catch (err) {
      setError(err);
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    execute();
  }, dependencies);

  return {
    data,
    loading,
    error,
    refetch: execute,
  };
}

export default useFetch;
