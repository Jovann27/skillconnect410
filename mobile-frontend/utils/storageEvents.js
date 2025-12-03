// Create a simple custom event manager compatible with React Native
const listeners = new Set();

export const notifyUserDataChange = () => {
  // Notify all subscribed listeners
  for (const callback of listeners) {
    callback();
  }
};

export const subscribeToUserDataChange = (callback) => {
  listeners.add(callback);
  // Return unsubscribe function
  return () => listeners.delete(callback);
};
