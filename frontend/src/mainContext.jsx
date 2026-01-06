import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import api from './api';
import toast from 'react-hot-toast';
import { updateSocketToken, setNotificationHandler } from './utils/socket';

const MainContext = createContext();

export const useMainContext = () => {
  const context = useContext(MainContext);
  if (!context) {
    throw new Error('useMainContext must be used within a MainProvider');
  }
  return context;
};

export const MainProvider = ({ children }) => {
  // State management
  const [user, setUser] = useState(null);
  const [admin, setAdmin] = useState(null);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isUserVerified, setIsUserVerified] = useState(false);
  const [tokenType, setTokenType] = useState(null);
  const [authLoaded, setAuthLoaded] = useState(false);
  const [navigationLoading, setNavigationLoading] = useState(false);
  const [openChatWithProvider, setOpenChatWithProvider] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  // Authentication helpers
  const setAuthToken = (token) => {
    if (token) {
      localStorage.setItem('token', token);
      updateSocketToken(token);
    }
  };

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('admin');
    localStorage.removeItem('isAuthorized');
    localStorage.removeItem('tokenType');
    localStorage.removeItem('userLastPath');
    localStorage.removeItem('adminLastPath');
    
    setUser(null);
    setAdmin(null);
    setIsAuthorized(false);
    setIsUserVerified(false);
    setTokenType(null);
    
    updateSocketToken(null);
  }, []);

  const fetchProfile = useCallback(async (redirect = true, navigate = null) => {
    if (navigationLoading) return;
    setNavigationLoading(true);
    try {
      const tokenType = localStorage.getItem("tokenType");
      const admin = JSON.parse(localStorage.getItem("admin") || "null");
      const user = JSON.parse(localStorage.getItem("user") || "null");

      let profile;
      if (tokenType === "admin") {
        if (admin) {
          profile = (await api.get("/admin/auth/me")).data;
        }
      } else if (user) {
        try {
          profile = (await api.get("/user/me")).data;
        } catch (err) {
          if (err.response?.data?.code === "ACCOUNT_NOT_VERIFIED") {
            setUser(user);
            setIsAuthorized(false);
            setTokenType("user");
            setAdmin(null);
            setIsUserVerified(false);
            localStorage.setItem("user", JSON.stringify(user));
            toast.error("Account not verified. Please wait for admin verification.");
            return;
          }
          throw err;
        }
      }

      if (profile && profile.success && profile.user) {
        const user = profile.user;
        if (user.type === "admin" || user.role === "Admin") {
          setAdmin(user);
          setIsAuthorized(true);
          setTokenType("admin");
          setUser(null);
          localStorage.setItem("admin", JSON.stringify(user));
        } else {
          if (user.banned) {
            localStorage.clear();
            logout();
            setUser(null);
            setAdmin(null);
            setIsAuthorized(false);
            setIsUserVerified(false);
            setIsAuthorized(false);
            setTokenType(null);
            toast.error("Your account has been banned");
            return;
          }
          setUser(user);
          setIsAuthorized(true);
          setTokenType("user");
          setAdmin(null);
          setIsUserVerified(user.verified || false);
          localStorage.setItem("user", JSON.stringify(user));
        }

        const token = localStorage.getItem("token");
        if (token) {
          setAuthToken(token);
        }

        if (redirect && navigate) {
          if (tokenType === "admin") {
            const lastPath = localStorage.getItem("adminLastPath");
            if (lastPath && lastPath.startsWith("/admin/")) {
              navigate(lastPath, { replace: true });
            } else {
              navigate("/admin/analytics", { replace: true });
            }
          } else {
            const lastPath = localStorage.getItem("userLastPath");
            if (lastPath && lastPath.startsWith("/user/")) {
              navigate(lastPath, { replace: true });
            } else {
              // Navigate to dashboard - UserDashboard component will show appropriate dashboard based on role
              navigate("/user/dashboard", { replace: true });
              localStorage.setItem("userLastPath", "/user/dashboard");
            }
          }
        }
        return;
      }
    } catch (error) {
      console.warn("Authentication failed:", error.message);
      localStorage.removeItem("token");
      logout();

      try {
        if (localStorage.getItem("tokenType") === "admin") {
          const admin = JSON.parse(localStorage.getItem("admin") || "null");
          if (admin) {
            setAdmin(admin);
            setIsAuthorized(true);
            setTokenType("admin");
            setUser(null);
            return;
          }
        } else {
          const user = JSON.parse(localStorage.getItem("user") || "null");
          if (user) {
            setUser(user);
            setIsAuthorized(true);
            setTokenType("user");
            setAdmin(null);
            setIsUserVerified(user.verified || false);
            return;
          }
        }
      } catch {
        localStorage.clear();
        logout();
        setUser(null);
        setAdmin(null);
        setIsAuthorized(false);
        setTokenType(null);
      }
    } finally {
      setNavigationLoading(false);
      setAuthLoaded(true);
    }
  }, [logout, navigationLoading, setNavigationLoading]);

  // Notification helpers
  const fetchNotifications = useCallback(async () => {
    if (!isAuthorized || tokenType !== 'user') return;

    try {
      const response = await api.get('/user/notifications');
      if (response.data.success) {
        setNotifications(response.data.notifications);
        setUnreadNotifications(response.data.notifications.filter(n => !n.read).length);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  }, [isAuthorized, tokenType]);

  const markNotificationAsRead = useCallback(async (notificationId) => {
    try {
      await api.put(`/user/notifications/${notificationId}/read`);
      setNotifications(prev =>
        prev.map(n => n._id === notificationId ? { ...n, read: true } : n)
      );
      setUnreadNotifications(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }, []);

  const markAllNotificationsAsRead = useCallback(async () => {
    try {
      await api.put('/user/notifications/mark-all-read');
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadNotifications(0);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  }, []);

  // Set up notification handler and fetch initial notifications
  useEffect(() => {
    if (isAuthorized && tokenType === 'user') {
      // Set up socket notification handler
      setNotificationHandler((notification) => {
        // Add new notification to the list
        setNotifications(prev => [notification, ...prev]);
        setUnreadNotifications(prev => prev + 1);

        // Show toast notification
        toast.success(notification.title, {
          description: notification.message,
          duration: 5000,
        });
      });

      // Fetch initial notifications
      fetchNotifications();
    }
  }, [isAuthorized, tokenType, fetchNotifications]);

  const value = {
    // State
    user,
    admin,
    isAuthorized,
    isUserVerified,
    tokenType,
    authLoaded,
    navigationLoading,
    openChatWithProvider,
    notifications,
    unreadNotifications,

    // State setters
    setUser,
    setAdmin,
    setIsAuthorized,
    setIsUserVerified,
    setTokenType,
    setAuthLoaded,
    setNavigationLoading,
    setOpenChatWithProvider,
    setNotifications,
    setUnreadNotifications,

    // Helpers
    setAuthToken,
    logout,
    fetchProfile,
    fetchNotifications,
    markNotificationAsRead,
    markAllNotificationsAsRead,
  };

  return (
    <MainContext.Provider value={value}>
      {children}
    </MainContext.Provider>
  );
};
