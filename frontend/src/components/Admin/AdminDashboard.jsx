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
    { to: "/admin/service-requests", label: "Request Logs", icon: FaClipboardList, active: isServiceRequests },
    { to: "/admin/users", label: "Users", icon: FaUsers, active: isUsers },
    { to: "/admin/residents", label: "Barangay Residents List", icon: FaUserFriends, active: isResidents },
    // { to: "/admin/admin-settings", label: "Settings", icon: FaTools, active: isAdminSettings },
    { to: "/admin/admin-register", label: "Admin Register", icon: FaTools, active: isAdminRegister }
  ];

  return (
    <div className={`flex min-h-screen bg-gray-50 ${isAdminSettings ? '' : 'gap-0'}`}>
      {!isAdminSettings && (
        <aside className="w-64 bg-white shadow-lg flex flex-col">
          <div className="p-6 border-b border-gray-200">
            <div className="flex flex-col items-center text-center">
              <img
                src={avatarSrc}
                alt="Admin avatar"
                className="w-20 h-20 rounded-full object-cover border-4 border-blue-100 mb-4"
              />
              <h2 className="text-lg font-semibold text-gray-900 mb-1">{displayName}</h2>
              <p className="text-sm text-gray-600">System Administrator</p>
            </div>
          </div>

          <nav className="flex-1 p-4" aria-label="Admin navigation">
            <ul className="space-y-2">
              {navItems.map((navItem) => (
                <li key={navItem.to}>
                  <Link
                    to={navItem.to}
                    className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors duration-200 ${
                      navItem.active
                        ? 'bg-blue-100 text-blue-700 border-r-4 border-blue-500'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <navItem.icon className="text-lg" />
                    <span className="font-medium">{navItem.label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className="p-4 border-t border-gray-200">
            <button
              className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors duration-200"
              onClick={handleLogout}
            >
              <FaSignOutAlt />
              <span>Logout</span>
            </button>
          </div>
        </aside>
      )}

      <main className={`${isAdminSettings ? 'flex-1' : 'flex-1 ml-0'} bg-gray-50`}>
          <Outlet />
      </main>
    </div>
  );
};

export default AdminDashboard;
