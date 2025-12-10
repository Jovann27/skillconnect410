import { useState, useEffect, useMemo, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { GiHamburgerMenu } from "react-icons/gi";
import { useMainContext } from "../../mainContext";
import { FaUser, FaFileAlt, FaCartPlus, FaSignOutAlt, FaSuitcase } from "react-icons/fa";
import { IoNotificationsOutline, IoSettingsOutline } from "react-icons/io5";
import ChatIcon from "../ChatIcon";
import api from "../../api";
import { getImageUrl } from "../../utils/imageUtils";

const Navbar = () => {
  const { user, admin, isAuthorized, tokenType, logout } = useMainContext();
  const [show, setShow] = useState(false);
  const [dashboardDropdown, setDashboardDropdown] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const navigate = useNavigate();

  const handleKeyDown = useCallback((event) => {
    if (event.key === 'Escape') {
      setShow(false);
      setDashboardDropdown(false);
    }
  }, []);

  const handleClickOutside = useCallback((event) => {
    if (!event.target.closest('.dropdown')) {
      setDashboardDropdown(false);
    }
  }, []);

  const fetchUnreadCount = useCallback(async () => {
    // Only fetch if user is authorized and has a valid token
    if (!isAuthorized || !localStorage.getItem("token")) {
      setUnreadCount(0);
      return;
    }

    try {
      const { data } = await api.get("/user/notifications/unread-count");
      setUnreadCount(data.unreadCount || 0);
    } catch (err) {
      // Handle authentication errors silently (expected when not logged in)
      if (err.response?.status === 401) {
        setUnreadCount(0);
        // Don't log 401 errors as they're expected during auth transitions
        return;
      }
      // Only log unexpected errors
      console.error("Error fetching unread count:", err);
    }
  }, [isAuthorized]);

  useEffect(() => {
    if (show || dashboardDropdown) {
      document.addEventListener('keydown', handleKeyDown);
      document.addEventListener('click', handleClickOutside);
    } else {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('click', handleClickOutside);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('click', handleClickOutside);
    };
  }, [show, dashboardDropdown, handleKeyDown, handleClickOutside]);

  useEffect(() => {
    if (isAuthorized) {
      fetchUnreadCount();
    } else {
      setUnreadCount(0);
    }
  }, [isAuthorized, fetchUnreadCount]);

  const handleLogout = async () => {
    if (isLoggingOut) return;

    setIsLoggingOut(true);
    try {
      await logout();
      localStorage.removeItem("user");
      localStorage.removeItem("admin");
      localStorage.removeItem("isAuthorized");
      localStorage.removeItem("tokenType");
      localStorage.removeItem("rememberedEmail");
      navigate(tokenType === 'admin' ? "/admin/login" : "/login");
    } catch (err) {
      console.error("Logout failed:", err.message);
      localStorage.removeItem("user");
      localStorage.removeItem("admin");
      localStorage.removeItem("isAuthorized");
      localStorage.removeItem("tokenType");
      localStorage.removeItem("rememberedEmail");
      navigate(tokenType === 'admin' ? "/admin/login" : "/user/my-service");
    } finally {
      setIsLoggingOut(false);
    }
  };

  const fetchNotifications = async () => {
    // Only fetch if user is authorized and has a valid token
    if (!isAuthorized || !localStorage.getItem("token")) {
      setNotifications([]);
      setLoadingNotifications(false);
      return;
    }

    setLoadingNotifications(true);
    try {
      const { data } = await api.get("/user/notifications");
      setNotifications(data.notifications || []);
    } catch (err) {
      console.error("Error fetching notifications:", err);
      // If authentication fails, clear notifications
      if (err.response?.status === 401) {
        setNotifications([]);
      }
    } finally {
      setLoadingNotifications(false);
    }
  };

  const toggleNotifications = async () => {
    setShowNotifications(!showNotifications);
    if (!showNotifications) {
      fetchNotifications();
    }
    // Reset unread count when clicking the notification icon
    await markAllAsRead();
  };

  const handleNotificationClick = async (notification) => {
    try {
      // Mark as read
      await api.put(`/user/notifications/${notification._id}/read`);
      setNotifications(prev =>
        prev.map(notif =>
          notif._id === notification._id ? { ...notif, read: true } : notif
        )
      );

      setUnreadCount(prev => Math.max(0, prev - 1));

      // Navigate based on notification type
      const { meta } = notification;

      if (meta) {
        if (meta.type === "apply-provider") {
          navigate("/user/manage-profile");
        } else if ((meta.type === "service-request" || meta.type === "service-request-posted") && meta.requestId) {
          navigate("/user/my-service");
        } else if (meta.bookingId) {
          navigate("/user/chat");
        } else if (meta.apptId) {
          if (admin) {
            navigate("/admin/verification");
          }
        } else if (meta.type === "verification_appointment") {
          navigate("/user/manage-profile");
        }
      }

      // Close notification popup
      setShowNotifications(false);
    } catch (err) {
      console.error("Error handling notification click:", err);
    }
  };

  const markAllAsRead = async () => {
    try {
      await api.put("/user/notifications/mark-all-read");
      setNotifications(prev =>
        prev.map(notif => ({ ...notif, read: true }))
      );
      setUnreadCount(0);
    } catch (err) {
      console.error("Error marking all notifications as read:", err);
    }
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return isNaN(date.getTime()) ? '' : date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const handleResize = () => {
      if (window.innerWidth > 1024) {
        setShow(false);
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return undefined;
    const originalOverflow = document.body.style.overflow;

    if (show) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = originalOverflow;
    }

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [show]);

  const userFullName = useMemo(() => {
    if (!user) return "";
    return `${user.firstName || ""} ${user.lastName || ""}`.trim();
  }, [user]);

  const avatarUrl = useMemo(() => {
    if (user?.profilePic) return getImageUrl(user.profilePic);
    if (!userFullName) return "https://ui-avatars.com/api/?background=FC60AE&color=fff&name=User";
    const encoded = encodeURIComponent(userFullName);
    return `https://ui-avatars.com/api/?background=FC60AE&color=fff&name=${encoded}`;
  }, [user?.profilePic, userFullName]);

  const dropdownQuickLinks = useMemo(() => {
    const links = [
      {
        to: "/user/manage-profile",
        icon: <FaUser />,
        label: "Profile",
        helper: "Profile, identity & verification"
      }
    ];

    // Add role-specific links
    if (user?.role === 'Community Member') {
      links.push({
        to: "/user/browse-providers",
        icon: <FaSuitcase />,
        label: "Browse Providers",
        helper: "Find skilled service providers"
      });
      links.push({
        to: "/user/service-request",
        icon: <FaCartPlus />,
        label: "Request Service",
        helper: "Create or track service requests"
      });
    } else if (user?.role === 'Service Provider') {
      links.push({
        to: "/user/my-service",
        icon: <FaCartPlus />,
        label: "My Services",
        helper: "Manage your service offerings"
      });
    }

    links.push({
      to: "/user/general-settings",
      icon: <IoSettingsOutline />,
      label: "Settings",
      helper: "Preferences & notifications"
    });

    return links;
  }, [user?.role]);

  return (
    <nav className="bg-gradient-to-br from-pink-600 to-pink-400 px-5 py-[10px] pr-[30px] pl-[30px]  sticky top-0 z-[100]" role="navigation" aria-label="Main navigation">
      <div className="w-full flex items-center justify-between">
        <Link to="/home" className="flex items-center gap-2 hover:opacity-80 transition-opacity duration-200">
          <img
            src="/skillconnect.png"
            alt="SkillConnect4B410 logo"
            className="w-12 h-12 object-contain rounded-full"
          />
          <span className="text-xl font-bold text-white">
            SkillConnect4B410
          </span>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-[30px]">
          {!isAuthorized && (
            <>
              <Link to="/home" className="text-white font-medium px-4 py-2 rounded-lg hover:bg-white/20 transition-colors duration-200">
                HOME
              </Link>
              <Link to="/login" className="text-white font-medium px-4 py-2 rounded-lg hover:bg-white/20 transition-colors duration-200">
                LOGIN
              </Link>
              <Link to="/register" className="bg-white/20 text-white px-4 py-2 rounded-lg font-medium hover:bg-white/30 transition-all duration-200">
                REGISTER
              </Link>
            </>
          )}

          {isAuthorized && tokenType !== 'admin' && (
            <>
              {/* Browse Providers - Only for Community Members */}
              {user?.role === 'Community Member' && (
                <Link to="/user/browse-providers" className="bg-white/15 p-3 rounded-lg text-white hover:bg-pink-500 transition-colors duration-200" aria-label="Browse Providers" title="Find Service Providers">
                  <FaSuitcase size={24} />
                </Link>
              )}

              <button
                onClick={toggleNotifications}
                className="relative bg-white/15 p-3 rounded-lg hover:bg-pink-500 transition-colors duration-200 text-white"
                aria-label="View notifications"
              >
                <IoNotificationsOutline size={24} />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-yellow-400 text-gray-900 text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </button>
              <ChatIcon />
              {user?.role === 'Service Provider' && (
                <Link to="/user/my-service" className="bg-white/15 p-3 rounded-lg text-white hover:bg-pink-500 transition-colors duration-200" aria-label="My Service">
                  <FaCartPlus size={24} />
                </Link>
              )}

              {/* User Dropdown */}
              <div className="relative dropdown">
                <button
                  onClick={() => setDashboardDropdown(!dashboardDropdown)}
                  className="bg-white/15 p-2 rounded-full hover:bg-pink-500 transition-colors duration-200"
                  aria-label="User dashboard menu"
                >
                  <FaUser className="w-8 h-8 text-white" />
                </button>

                {dashboardDropdown && (
                  <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-2xl border border-gray-200 py-2 z-50 animate-[dropdownSlideIn_0.2s_ease-out]">
                    <div className="px-4 py-3 border-b border-gray-200">
                      <div className="flex items-center gap-3">
                        <img src={avatarUrl} alt="User avatar" className="w-10 h-10 rounded-full border border-gray-200" />
                        <div>
                          <p className="font-semibold text-gray-900">{userFullName || "SkillConnect User"}</p>
                          <p className="text-sm text-gray-500">{user?.role || "Member"}</p>
                        </div>
                      </div>
                    </div>

                    <div className="py-2">
                      {dropdownQuickLinks.map(({ to, icon, label, helper }) => (
                        <Link
                          key={label}
                          to={to}
                          className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-pink-50 transition-colors duration-200"
                          onClick={() => setDashboardDropdown(false)}
                        >
                          <span className="text-gray-500 text-xl">{icon}</span>
                          <div>
                            <p className="font-medium">{label}</p>
                            <p className="text-sm text-gray-500">{helper}</p>
                          </div>
                        </Link>
                      ))}
                    </div>

                    <div className="border-t border-gray-200 pt-2">
                      <button
                        onClick={handleLogout}
                        className="flex items-center gap-3 w-full px-4 py-3 text-red-600 hover:bg-red-50 transition-colors duration-200"
                      >
                        <FaSignOutAlt />
                        <span>Log Out</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Mobile menu button */}
        <button
          onClick={() => setShow(!show)}
          className="md:hidden bg-white/15 p-2 rounded-lg text-white hover:bg-pink-500 transition-colors duration-200"
          aria-label="Toggle menu"
        >
          <GiHamburgerMenu size={24} />
        </button>
      </div>

      {/* Mobile Navigation */}
      {show && (
        <>
          <div className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden" onClick={() => setShow(false)}></div>
          <div className="absolute top-full left-0 right-0 bg-gradient-to-br from-pink-600 to-pink-400 shadow-2xl md:hidden z-50 transform opacity-0 animate-[slideIn_0.3s_ease-out_forwards]">
            <div className="px-4 py-6 space-y-4">
              {!isAuthorized && (
                <>
                  <Link to="/home" className="block text-white font-medium py-3 px-4 rounded-lg bg-white/10 hover:bg-white/20 transition-colors duration-200" onClick={() => setShow(false)}>
                    HOME
                  </Link>
                  <Link to="/login" className="block text-white font-medium py-3 px-4 rounded-lg bg-white/10 hover:bg-white/20 transition-colors duration-200" onClick={() => setShow(false)}>
                    LOGIN
                  </Link>
                  <Link to="/register" className="block bg-white/20 text-white px-4 py-3 rounded-lg font-medium text-center hover:bg-white/30 transition-all duration-200" onClick={() => setShow(false)}>
                    REGISTER
                  </Link>
                </>
              )}

              {isAuthorized && tokenType !== 'admin' && (
                <>
                  <div className="flex items-center justify-between py-2">
                    <span className="text-white font-medium">Notifications</span>
                    <button onClick={toggleNotifications} className="relative bg-white/15 p-2 rounded-lg hover:bg-pink-500 transition-colors duration-200 text-white">
                      <IoNotificationsOutline size={24} />
                      {unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 bg-yellow-400 text-gray-900 text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold">
                          {unreadCount > 99 ? '99+' : unreadCount}
                        </span>
                      )}
                    </button>
                  </div>
                  <div className="py-2">
                    <ChatIcon />
                  </div>
                  {user?.role === 'Service Provider' && (
                    <Link to="/user/my-service" className="flex items-center gap-3 text-white py-3 px-4 rounded-lg bg-white/10 hover:bg-white/20 transition-colors duration-200" onClick={() => setShow(false)}>
                      <FaCartPlus size={20} />
                      <span>My Service</span>
                    </Link>
                  )}
                </>
              )}
            </div>
          </div>
        </>
      )}

      {/* Notification Popup */}
      {showNotifications && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setShowNotifications(false)}>
          <div className="bg-pink-50 rounded-2xl shadow-2xl max-w-md w-full max-h-[80vh] overflow-hidden border border-pink-200 animate-[popupSlideIn_0.3s_ease-out]" onClick={(e) => e.stopPropagation()}>
            <div className="bg-pink-600 text-white px-6 py-4 rounded-t-2xl flex items-center justify-between">
              <h3 className="text-xl font-bold">Notifications</h3>
              <button
                className="text-white hover:text-pink-200 text-2xl leading-none"
                onClick={() => setShowNotifications(false)}
              >
                ×
              </button>
            </div>
            <div className="overflow-y-auto max-h-96">
              {loadingNotifications ? (
                <div className="p-6 text-center text-gray-500">
                  Loading...
                </div>
              ) : notifications.length === 0 ? (
                <div className="p-6 text-center text-gray-500">
                  <p>No notifications yet</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {notifications.map((notif) => (
                    <div
                      key={notif._id}
                      className={`p-4 hover:bg-pink-50 cursor-pointer transition-colors duration-200 ${
                        !notif.read ? 'bg-pink-100 border-l-4 border-pink-500' : ''
                      }`}
                      onClick={() => handleNotificationClick(notif)}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900 mb-1">{notif.title}</h4>
                          <p className="text-gray-600 text-sm mb-2">{notif.message}</p>
                          <p className="text-xs text-gray-400">{formatTime(notif.createdAt)}</p>
                        </div>
                        {!notif.read && (
                          <div className="w-2 h-2 bg-pink-500 rounded-full ml-2"></div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
