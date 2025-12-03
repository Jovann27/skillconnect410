import axios from "axios";
import { clearSocket } from "./utils/socket";

// Constants for configuration
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
const MAX_RETRY_ATTEMPTS = 5;
const RETRY_BASE_DELAY = 1000; // 1 second base delay
const RETRY_MULTIPLIER = 2; // Exponential backoff multiplier

/**
 * Axios instance configured for API communication
 * Includes interceptors for authentication, retry logic, and error handling
 */
const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

/**
 * Request interceptor to add authentication token to headers
 * @param {Object} config - Axios request configuration
 * @returns {Object} Modified config with authorization header
 */
api.interceptors.request.use((config) => {
  // Add token to Authorization header if available
  const token = localStorage.getItem("token");
  const tokenType = localStorage.getItem("tokenType");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

/**
 * Response interceptor to handle errors and implement retry logic
 * @param {Object} response - Axios response object
 * @returns {Object} Response object
 */
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    const config = error.config;

    // Initialize retry count if not present
    if (!config._retryCount) {
      config._retryCount = 0;
    }

    // Skip retry for registration endpoint on rate limiting
    const isRegistrationEndpoint = config.url?.includes('/user/register');

    // Handle rate limiting (429 errors) with exponential backoff, but skip for registration
    if (error.response?.status === 429 && config._retryCount < MAX_RETRY_ATTEMPTS && !isRegistrationEndpoint) {
      config._retryCount += 1;
      const delay = RETRY_BASE_DELAY * Math.pow(RETRY_MULTIPLIER, config._retryCount - 1);


      return new Promise((resolve) => {
        setTimeout(() => {
          resolve(api.request(config));
        }, delay);
      });
    }

    // // Handle authentication errors (401)
    // if (error.response?.status === 401) {
    //   // Clear authentication data
    //   localStorage.removeItem("token");
    //   localStorage.removeItem("user");
    //   localStorage.removeItem("admin");
    //   localStorage.removeItem("isAuthorized");
    //   localStorage.removeItem("tokenType");

    //   // Clear socket connection
    //   clearSocket();

    //   // Redirect to appropriate login page based on current path or stored type
    //   if (typeof window !== 'undefined') {
    //     const currentPath = window.location.pathname;
    //     const storedType = localStorage.getItem("tokenType");

    //     if (currentPath.startsWith('/admin') || storedType === 'admin') {
    //       if (currentPath !== '/admin/login') {
    //         window.location.href = '/admin/login';
    //       }
    //     } else {
    //       if (currentPath !== '/login') {
    //         window.location.href = '/login';
    //       }
    //     }
    //   }
    // }


    return Promise.reject(error);
  }
);

export default api;
