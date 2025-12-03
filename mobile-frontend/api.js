import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Constants for configuration
const API_BASE_URL = 'http://192.168.1.12:4000/api/v1';
const MAX_RETRY_ATTEMPTS = 5;
const RETRY_BASE_DELAY = 1000; // 1 second base delay
const RETRY_MULTIPLIER = 2; // Exponential backoff multiplier

/**
 * Axios instance configured for API communication
 * Includes interceptors for authentication, retry logic, and error handling
 */
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

/**
 * Request interceptor to add authentication token to headers
 * @param {Object} config - Axios request configuration
 * @returns {Object} Modified config with authorization header
 */
apiClient.interceptors.request.use(async (config) => {
  // Add token to Authorization header if available
  const token = await AsyncStorage.getItem("token");
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
apiClient.interceptors.response.use(
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
          resolve(apiClient.request(config));
        }, delay);
      });
    }

    return Promise.reject(error);
  }
);

// Service Request API
export const serviceRequestAPI = {
  getServiceRequests: () => apiClient.get('/settings/service-requests'),
  acceptServiceRequest: (id) => apiClient.put(`/settings/service-requests/${id}/accept`),
  getAcceptedRequests: () => apiClient.get('/settings/my-accepted-requests'),
};

// Booking API
export const bookingAPI = {
  completeBooking: (id, data) => apiClient.put(`/booking/${id}/complete`, data),
};

// Service Profile API
export const serviceProfileAPI = {
  getServiceProfile: () => apiClient.get('/user/service-profile'),
  updateServiceProfile: (data) => apiClient.post('/user/service-profile', data),
  updateServiceStatus: (data) => apiClient.put('/user/service-status', data),
};

// User Services API
export const userServicesAPI = {
  getUserServices: () => apiClient.get('/user/services'),
};

export default apiClient;
