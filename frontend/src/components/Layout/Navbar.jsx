import { useState, useEffect, useMemo, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { GiHamburgerMenu } from "react-icons/gi";
import { useMainContext } from "../../mainContext";
import { FaUser, FaFileAlt, FaCartPlus, FaSignOutAlt, FaSuitcase } from "react-icons/fa";
import { IoNotificationsOutline, IoSettingsOutline } from "react-icons/io5";
import ChatIcon from "../ChatIcon";
import api from "../../api";
import { getImageUrl } from "../../utils/imageUtils";
import "./layout-styles.css";

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
      console.error("Error fetching unread count:", err);
      // If authentication fails, reset count and let the api interceptor handle logout
      if (err.response?.status === 401) {
        setUnreadCount(0);
      }
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

  const dropdownQuickLinks = useMemo(() => ([
    {
      to: "/user/manage-profile",
      icon: <FaUser />,
      label: "Profile",
      helper: "Profile, identity & verification"
    },
    {
      to: "/user/service-request",
      icon: <FaCartPlus />,
      label: "Request Service",
      helper: "Create or track service requests"
    },
    {
      to: "/user/records",
      icon: <FaFileAlt />,
      label: "My Records",
      helper: "Invoices, receipts & history"
    },
    {
      to: "/user/general-settings",
      icon: <IoSettingsOutline />,
      label: "General Settings",
      helper: "Preferences & notifications"
    }
  ]), []);

  return (
    <nav className="navbar" role="navigation" aria-label="Main navigation">
      <div className="navbar-container">
        <Link to="/home" className="navbar-logo">
          <img
            src="/skillconnect.png"
            alt="SkillConnect4B410 logo"
            className="navbar-logo-image"
          />
          <span className="navbar-logo-text">SkillConnect4B410</span>
        </Link>

        {show && (
          <div
            className="navbar-backdrop"
            onClick={() => {
              setShow(false);
            }}
          />
        )}

        <div className={`navbar-menu ${show ? 'mobile-menu show' : ''}`} id="navigation-menu">
          {show && (
            <div className="mobile-menu-header">
              <Link to="/home" className="navbar-logo" onClick={() => setShow(false)}>
                <img
                  src="/skillconnect.png"
                  alt="SkillConnect4B410 logo"
                  className="navbar-logo-image"
                />
                <span className="navbar-logo-text">SkillConnect4B410</span>
              </Link>
              <button
                type="button"
                className="mobile-menu-close"
                onClick={() => setShow(false)}
                aria-label="Close menu"
              >
                ×
              </button>
            </div>
          )}
          <ul className="navbar-menu-list">
            {!isAuthorized && (
              <>
                <li role="none">
                  <Link to="/home" className="navbar-link" role="menuitem" aria-label="Go to home page">
                    HOME
                  </Link>
                </li>
              </>
            )}

            {/* Auth-dependent links */}
            {!isAuthorized && (
              <>
                <li role="none">
                  <Link to="/login" className="navbar-link" role="menuitem" aria-label="Login to your account">
                    LOGIN
                  </Link>
                </li>
                <li role="none">
                  <Link to="/register" className="navbar-link" role="menuitem" aria-label="Create a new account">
                    REGISTER
                  </Link>
                </li>
              </>
            )}


            {isAuthorized && tokenType !== 'admin' && (
              <li role="none">
                <button
                  type="button"
                  onClick={toggleNotifications}
                  className="navbar-icon-btn"
                  aria-label="View notifications"
                >
                  <IoNotificationsOutline size={24} />
                  {unreadCount > 0 && (
                    <span className="notification-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
                  )}
                </button>
              </li>
            )}


            {isAuthorized && tokenType !== 'admin' && (<li role="none">
              <ChatIcon />
            </li>
            )}

            {user?.role === 'Service Provider' && tokenType !== 'admin' && (
            <li role="none">
              <Link to="/user/my-service" className="navbar-icon-btn" aria-label="My Service">
                <FaCartPlus size={24} />
              </Link>
            </li>
            )}

            {/* User Dashboard Dropdown */}
            {user && tokenType !== 'admin' && (
              <li role="none" className="dropdown">

                <button
                  type="button"
                  className="dashboard-toggle"
                  onClick={() => setDashboardDropdown(!dashboardDropdown)}
                  aria-label="User dashboard menu"
                  aria-expanded={dashboardDropdown}
                >
                  <FaUser size={24} />
                </button>
                {dashboardDropdown && (
                  <ul className="dropdown-menu" role="menu">
                    <li className="dropdown-profile">
                      <Link to="/user/manage-profile" className="dropdown-profile-link">
                        <img src={avatarUrl} alt="User avatar" />
                        <div className="dropdown-profile-info">
                          <strong>{userFullName || "SkillConnect User"}</strong>
                          <small>{user?.role || "Member"}</small>
                        </div>
                      </Link>
                    </li>

                    <li className="dropdown-grid" role="presentation">
                      {dropdownQuickLinks.map(({ to, icon, label, helper }) => (
                        <Link
                          key={label}
                          to={to}
                          className="dropdown-action"
                          onClick={() => setDashboardDropdown(false)}
                        >
                          <span className="dropdown-action-icon">{icon}</span>
                          <div>
                            <p>{label}</p>
                            <small>{helper}</small>
                          </div>
                        </Link>
                      ))}
                      
                    </li>

                    <li className="logout-item">
                      <button type="button" onClick={handleLogout}>
                        <FaSignOutAlt />
                        Log Out
                      </button>
                    </li>
                  </ul>
                )}
              </li>
            )}

          </ul>
        </div>

        {/* Hamburger Menu */}
        <button
          type="button"
          className="hamburger"
          onClick={() => setShow(!show)}
          aria-label={show ? "Close navigation menu" : "Open navigation menu"}
          aria-expanded={show}
          aria-controls="navigation-menu"
        >
          <GiHamburgerMenu />
        </button>

      </div>

      {/* Notification Popup */}
      {showNotifications && (
        <div className="notification-popup-overlay" onClick={() => setShowNotifications(false)}>
          <div className="notification-popup" onClick={(e) => e.stopPropagation()}>
            <div className="notification-popup-header">
              <h3>Notifications</h3>
              <button className="notification-popup-close" onClick={() => setShowNotifications(false)}>×</button>
            </div>
            <div className="notification-popup-content">
              {loadingNotifications ? (
                <p>Loading...</p>
              ) : notifications.length === 0 ? (
                <div className="notification-empty">
                  <p>No notifications yet</p>
                </div>
              ) : (
                <>
                  {notifications.map((notif) => (
                    <div
                      key={notif._id}
                      className={`notification-item ${!notif.read ? 'notification-item-unread' : ''}`}
                      onClick={() => handleNotificationClick(notif)}
                    >
                      <div className="notification-item-content">
                        <div className="notification-item-title">{notif.title}</div>
                        <div className="notification-item-message">{notif.message}</div>
                        <div className="notification-item-time">{formatTime(notif.createdAt)}</div>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
