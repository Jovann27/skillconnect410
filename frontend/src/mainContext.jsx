import { createContext, useContext, useState, useEffect, useRef, useCallback } from "react";
import api from "./api";
import toast from "react-hot-toast";
import { updateSocketToken, clearSocket } from "./utils/socket";

const MainContext = createContext();

export const MainProvider = ({ children }) => {
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [authLoaded, setAuthLoaded] = useState(false);
  const [tokenType, setTokenType] = useState(null);
  const [user, setUser] = useState(null);
  const [admin, setAdmin] = useState(null);
  const [isUserVerified, setIsUserVerified] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [navigationLoading, setNavigationLoading] = useState(false);
  const [openChatAppointmentId, setOpenChatAppointmentId] = useState(null);

  const initialized = useRef(false);

  const fetchProfile = useCallback(async (navigate = null) => {
    if (isLoading) return;
    setIsLoading(true);

    try {
      const storedTokenType = localStorage.getItem("tokenType");
      const storedAdmin = JSON.parse(localStorage.getItem("admin") || "null");
      const storedUser = JSON.parse(localStorage.getItem("user") || "null");

      let data;
      if (storedTokenType === "admin") {
        // Only fetch admin data if we have a stored admin token
        if (storedAdmin) {
          const response = await api.get("/admin/auth/me");
          data = response.data;
        }
      } else {
        // Only fetch user data if we have a stored user token
        if (storedUser) {
          try {
            const response = await api.get("/user/me");
            data = response.data;
          } catch (error) {
            // Handle verification error
            if (error.response?.data?.code === "ACCOUNT_NOT_VERIFIED") {
              // User is authenticated but not verified
              setUser(storedUser);
              setIsAuthorized(true);
              setTokenType("user");
              setAdmin(null);
              setIsUserVerified(false);
              localStorage.setItem("user", JSON.stringify(storedUser));
              toast.error("Account not verified. Please wait for admin verification.");
              return;
            }
            throw error;
          }
        }
      }

      if (data && data.success && data.user) {
        const userData = data.user;

        if (userData.type === "admin" || userData.role === "Admin") {
          setAdmin(userData);
          setIsAuthorized(true);
          setTokenType("admin");
          setUser(null);
          localStorage.setItem("admin", JSON.stringify(userData));
        } else {
          // Check if user is banned
          if (userData.banned) {
            // Logout banned user
            localStorage.clear();
            clearSocket();
            setUser(null);
            setAdmin(null);
            setIsUserVerified(false);
            setIsAuthorized(false);
            setTokenType(null);
            toast.error("Your account has been banned");
            return;
          }
          setUser(userData);
          setIsAuthorized(true);
          setTokenType("user");
          setAdmin(null);
          setIsUserVerified(userData.verified || false);
          localStorage.setItem("user", JSON.stringify(userData));
        }

        const token = localStorage.getItem("token");
        if (token) updateSocketToken(token);

        if (navigate) {
          if (storedTokenType === "admin") {
            const adminLastPath = localStorage.getItem("adminLastPath");
            if (adminLastPath && adminLastPath.startsWith("/admin/")) {
              navigate(adminLastPath, { replace: true });
            } else {
              navigate("/admin/analytics", { replace: true });
            }
          } else {
            // Navigate based on user role (for refresh scenarios, check last path first)
            const userLastPath = localStorage.getItem("userLastPath");
            if (userLastPath && userLastPath.startsWith("/user/")) {
              navigate(userLastPath, { replace: true });
            } else if (userData.role === "Service Provider") {
              navigate("/user/my-service", { replace: true });
              localStorage.setItem("userLastPath", "/user/my-service");
            } else {
              // Community Member
              navigate("/user/service-request", { replace: true });
              localStorage.setItem("userLastPath", "/user/service-request");
            }
          }
        }
        return;
      }
      } catch (err) {
        console.warn("Authentication failed:", err.message);
        // Clear invalid tokens and socket connections
        localStorage.removeItem("token");
        clearSocket();

        // If API call fails, try to use stored data
        try {
          const storedTokenType = localStorage.getItem("tokenType");
          if (storedTokenType === "admin") {
            const storedAdmin = JSON.parse(localStorage.getItem("admin") || "null");
            if (storedAdmin) {
              setAdmin(storedAdmin);
              setIsAuthorized(true);
              setTokenType("admin");
              setUser(null);
              return;
            }
          } else {
            const storedUser = JSON.parse(localStorage.getItem("user") || "null");
            if (storedUser) {
              setUser(storedUser);
              setIsAuthorized(true);
              setTokenType("user");
              setAdmin(null);
              setIsUserVerified(storedUser.verified || false);
              return;
            }
          }
        } catch {
          // Both endpoints failed and no stored data
          localStorage.clear();
          clearSocket();
          setUser(null);
          setAdmin(null);
          setIsAuthorized(false);
          setTokenType(null);
        }
    } finally {
      setIsLoading(false);
      setAuthLoaded(true);
    }
  }, [isLoading, setIsLoading, setUser, setIsAuthorized, setTokenType, setAdmin, setIsUserVerified]);

  const logout = async () => {
    try {
      await Promise.all([
        api.get("/user/logout", { withCredentials: true }),
        api.get("/admin/auth/logout", { withCredentials: true })
      ]);
    } catch {
      console.warn("Logout request failed, clearing local data anyway.");
    }

    localStorage.clear();
    clearSocket();
    setUser(null);
    setAdmin(null);
    setIsUserVerified(false);
    setIsAuthorized(false);
    setTokenType(null);
    toast.success("Logged out successfully");
  };

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const storedUser = JSON.parse(localStorage.getItem("user") || "null");
    const storedAdmin = JSON.parse(localStorage.getItem("admin") || "null");
    const isAuth = localStorage.getItem("isAuthorized") === "true";
    const type = localStorage.getItem("tokenType");
    const token = localStorage.getItem("token");

    // For admins: restore from localStorage and fetch fresh data
    if (storedAdmin && isAuth && type === "admin" && token) {
      setAdmin(storedAdmin);
      setIsAuthorized(true);
      setTokenType("admin");
      setUser(null);
      setAuthLoaded(true);
      // Update socket token for existing session
      updateSocketToken(token);
      // Fetch fresh admin data
      fetchProfile();
      return;
    }

    // For users: restore from localStorage and fetch fresh data
    if (storedUser && isAuth && type === "user" && token) {
      setUser(storedUser);
      setIsAuthorized(true);
      setTokenType("user");
      setAdmin(null);
      setIsUserVerified(storedUser.verified || false);
      setAuthLoaded(true);
      // Update socket token for existing session
      updateSocketToken(token);
      // Fetch fresh user data
      fetchProfile();
    } else {
      // No stored data, try to fetch from API
      fetchProfile();
    }
  }, [fetchProfile]);

  const openChat = (appointmentId) => {
    setOpenChatAppointmentId(appointmentId);
  };

  return (
    <MainContext.Provider
      value={{
        isAuthorized,
        setIsAuthorized,
        authLoaded,
        tokenType,
        setTokenType,
        user,
        setUser,
        admin,
        setAdmin,
        isUserVerified,
        setIsUserVerified,
        navigationLoading,
        setNavigationLoading,
        fetchProfile,
        logout,
        openChatAppointmentId,
        setOpenChatAppointmentId,
        openChat,
      }}
    >
      {children}
    </MainContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useMainContext = () => useContext(MainContext);
