import React, { createContext, useContext, useState } from 'react';

const PopupContext = createContext();

// eslint-disable-next-line react-refresh/only-export-components
export const usePopup = () => {
  const context = useContext(PopupContext);
  if (!context) {
    throw new Error('usePopup must be used within a PopupProvider');
  }
  return context;
};

const PopupProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);

  const showNotification = (message, type = 'info', duration = 3000, title = '') => {
    const id = Date.now() + Math.random();
    const notification = {
      id,
      message,
      type,
      title,
      duration
    };

    setNotifications(prev => [...prev, notification]);

    if (duration > 0) {
      setTimeout(() => {
        setNotifications(prev => prev.filter(n => n.id !== id));
      }, duration);
    }

    return id;
  };

  const showInput = (title, placeholder = '', onSubmit, onCancel) => {
    // Simple input popup implementation
    const value = prompt(title + (placeholder ? `\n${placeholder}` : ''));
    if (value !== null) {
      onSubmit && onSubmit(value);
    } else {
      onCancel && onCancel();
    }
  };

  const removeNotification = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  return (
    <PopupContext.Provider value={{
      showNotification,
      showInput,
      removeNotification,
      notifications
    }}>
      {children}
    </PopupContext.Provider>
  );
};

export default PopupProvider;
