import { format, formatDistanceToNow, parseISO } from 'date-fns';

/**
 * Format date
 * @param {Date|string} date - Date to format
 * @param {string} formatStr - Format string (e.g., 'PPpp', 'MMM dd, yyyy')
 * @returns {string} Formatted date string
 */
export const formatDate = (date, formatStr = 'PP') => {
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    return format(dateObj, formatStr);
  } catch (error) {
    console.error('Error formatting date:', error);
    return date.toString();
  }
};

/**
 * Get relative time (e.g., "2 hours ago")
 * @param {Date|string} date - Date to compare
 * @returns {string} Relative time string
 */
export const getRelativeTime = (date) => {
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    return formatDistanceToNow(dateObj, {
      addSuffix: true
    });
  } catch (error) {
    console.error('Error getting relative time:', error);
    return date.toString();
  }
};

/**
 * Format date and time together
 * @param {Date|string} date - Date to format
 * @returns {string} Formatted date and time
 */
export const formatDateTime = (date) => {
  return formatDate(date, 'PPpp');
};

/**
 * Format time only
 * @param {Date|string} date - Date to format
 * @returns {string} Formatted time
 */
export const formatTime = (date) => {
  return formatDate(date, 'pp');
};

/**
 * Get weekday name
 * @param {Date|string} date - Date to get weekday from
 * @returns {string} Weekday name
 */
export const getWeekdayName = (date) => {
  return formatDate(date, 'EEEE');
};

/**
 * Get month name
 * @param {Date|string} date - Date to get month from
 * @returns {string} Month name
 */
export const getMonthName = (date) => {
  return formatDate(date, 'MMMM');
};
