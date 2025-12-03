import { Link, Outlet, useNavigate, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { useMainContext } from "../../mainContext";
import {
  FaHome,
  FaCalendarAlt,
  FaClipboardList,
  FaUsers,
  FaTools,
  FaSignOutAlt,
  FaUserFriends,
  FaLightbulb
} from "react-icons/fa";
import "./admin-theme.css";

const AdminDashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isDashboardHome = location.pathname === "/admin/analytics";
  const isRecommendations = location.pathname === "/admin/recommendations";
  const isJobFairs = location.pathname === "/admin/jobfairs";
  const isServiceRequests = location.pathname === "/admin/service-requests";
  const isUsers = location.pathname === "/admin/users";
  const isResidents = location.pathname === "/admin/residents";
  const isAdminSettings = location.pathname === "/admin/admin-settings";
  const isAdminRegister = location.pathname === "/admin/admin-register";

  const {
    logout,
    admin
  } = useMainContext();




  // Store current path in localStorage
  useEffect(() => {
    if (location.pathname.startsWith("/admin/")) {
      localStorage.setItem("adminLastPath", location.pathname);
    }
  }, [location.pathname]);


  const handleLogout = async () => {
    try {
      await logout();
      navigate("/admin/login");
    } catch (error) {
      console.error("Logout failed:", error);
      navigate("/admin/analytics");
    }
  };


  const displayName = admin?.name || "Admin";
  const avatarSrc =
    admin?.profilePic && admin.profilePic.startsWith("http")
      ? admin.profilePic
      : "https://cdn-icons-png.flaticon.com/512/3135/3135715.png";

  const navItems = [
    { to: "/admin/analytics", label: "Dashboard", icon: FaHome, active: isDashboardHome },
    { to: "/admin/recommendations", label: "Recommendations", icon: FaLightbulb, active: isRecommendations },
    { to: "/admin/jobfairs", label: "Job Fairs", icon: FaCalendarAlt, active: isJobFairs },
    { to: "/admin/service-requests", label: "Requests", icon: FaClipboardList, active: isServiceRequests },
    { to: "/admin/users", label: "Users", icon: FaUsers, active: isUsers },
    { to: "/admin/residents", label: "Barangay Residents List", icon: FaUserFriends, active: isResidents },
    // { to: "/admin/admin-settings", label: "Settings", icon: FaTools, active: isAdminSettings },
    { to: "/admin/admin-register", label: "Admin Register", icon: FaTools, active: isAdminRegister }
  ];

  return (
    <div className={`admin-shell ${isAdminSettings ? 'admin-shell--no-sidebar' : ''}`}>
      {!isAdminSettings && (
        <aside className="admin-shell__sidebar">
          <div className="admin-shell__sidebar-brand">
            <img src={avatarSrc} alt="Admin avatar" className="admin-shell__avatar" />
            <h2 className="admin-shell__name">{displayName}</h2>
            <p className="admin-shell__role">System Administrator</p>
          </div>

          <nav className="admin-shell__nav" aria-label="Admin navigation">
            <ul>
              {navItems.map((navItem) => (
                <li key={navItem.to}>
                  <Link to={navItem.to} className={`admin-link ${navItem.active ? "active" : ""}`}>
                    <navItem.icon />
                    {navItem.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className="admin-shell__footer">
            <button className="admin-shell__logout" onClick={handleLogout}>
              <FaSignOutAlt /> Logout
            </button>
          </div>
        </aside>
      )}

      <main className={`admin-shell__content ${isAdminSettings ? 'admin-shell__content--full-width' : ''}`}>
          <Outlet />
      </main>
    </div>
  );
};

export default AdminDashboard;
