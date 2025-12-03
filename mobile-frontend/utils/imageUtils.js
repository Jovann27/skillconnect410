/**
 * Utility functions for handling image URLs in React Native
 */

// Get the API base URL from environment or fallback to localhost
const getApiBaseUrl = () => {
  return 'http://192.168.1.12:4000/api/v1';
};

/**
 * Get the base URL for static files (without API prefix)
 * @returns {string} Base URL for static files
 */
const getStaticBaseUrl = () => {
  const apiBaseUrl = getApiBaseUrl();
  // Remove /api/v1 from the end if present
  return apiBaseUrl.replace(/\/api\/v1$/, '');
};

/**
 * Convert a relative image path to a full URL
 * @param {string} imagePath - The relative path (e.g., "/uploads/filename.jpg")
 * @returns {string} Full URL or empty string if no path provided
 */
export const getImageUrl = (imagePath) => {
  if (!imagePath) return '';
  if (imagePath.startsWith('http')) return imagePath; // Already a full URL
  const baseUrl = getStaticBaseUrl();
  // Remove leading slash from imagePath if present, since baseUrl might not have trailing slash
  const cleanPath = imagePath.startsWith('/') ? imagePath.substring(1) : imagePath;
  return `${baseUrl}/${cleanPath}`;
};

/**
 * Get profile picture URL with fallback
 * @param {string} profilePic - The profile picture path from user data
 * @param {string} fallback - Fallback text or initials
 * @returns {string|object} URL string or fallback object
 */
export const getProfileImageUrl = (profilePic, fallback = '') => {
  if (profilePic) {
    return getImageUrl(profilePic);
  }
  return fallback;
};
