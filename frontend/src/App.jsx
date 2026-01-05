import React, { useEffect, useRef } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useLocation,
  useNavigate,
  Outlet,
} from "react-router-dom";
import { useMainContext } from "./mainContext";
import useNavigateWithLoader from "./hooks/useNavigateWithLoader";
import NotificationListener from "./components/NotificationListener";
import Loader from "./components/Layout/Loader";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

// Layout
import Navbar from "./components/Layout/Navbar";
import Footer from "./components/Layout/Footer";
import Home from "./components/Home/Home";

// Auth pages
import Login from "./components/Auth/Login";
import Register from "./components/Auth/Register";
import ForgotPassword from "./components/Auth/ForgotPassword";
import VerifyEmail from "./components/Auth/VerifyEmail";
import ResetPassword from "./components/Auth/ResetPassword";
import AdminLogin from "./components/Auth/AdminLogin";

// Admin pages
import AdminDashboard from "./components/Admin/AdminDashboard";
import ServiceProviders from "./components/Admin/WorkersData";
import JobFairs from "./components/Admin/JobFairs";
import ReviewServiceRequest from "./components/Admin/ReviewServiceRequest";
import UserManagement from "./components/Admin/UserManagement";
import SystemAnalytics from "./components/Admin/SystemAnalytics";
import SystemRecommendations from "./components/Admin/SystemRecommendations";
import SkillCategories from "./components/Admin/SkillCategories"
import AdminSettings from "./components/Admin/AdminSettings";
import AdminRegister from "./components/Admin/AdminRegister";
import Residents from "./components/Admin/Residents";


// User pages
import ProviderDashboard from "./components/SkilledUSer/ProviderDashboard";
import ClientDashboard from "./components/SkilledUSer/ClientDashboard";
import ManageProfile from "./components/SkilledUSer/ManageProfile";
import Settings from "./components/SkilledUSer/Settings";
import VerificationPending from "./components/VerificationPending";
import AccountBanned from "./components/AccountBanned";

import ErrorBoundary from "./components/Layout/ErrorBoundary";
import PopupProvider from "./components/Layout/PopupContext";
import ImageTest from "./components/ImageTest";

// Role-based access guard component
const RoleGuard = ({ allowedRoles, children, fallback = null }) => {
  const { user } = useMainContext();
  const userRole = user?.role;

  // If no specific roles are required, allow access
  if (!allowedRoles || allowedRoles.length === 0) {
    return children;
  }

  // Check if user is authenticated
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Check if user's role matches allowed roles
  const isRoleAllowed = allowedRoles.includes(userRole);

  if (!isRoleAllowed) {
    console.warn(`Access denied: User role "${userRole}" not allowed for this route. Allowed roles: ${allowedRoles.join(', ')}`);
    
    // Default fallback: redirect to appropriate dashboard based on role
    if (userRole === "Service Provider") {
      return fallback || <Navigate to="/user/my-service" replace />;
    } else {
      return fallback || <Navigate to="/user/browse-providers" replace />;
    }
  }

  return children;
};

// Admin-only guard component
const AdminGuard = ({ children, fallback = null }) => {
  const { user, tokenType } = useMainContext();
  
  if (!user || tokenType !== "admin") {
    return fallback || <Navigate to="/admin/login" replace />;
  }
  
  return children;
};

// Account status guard component (checks banned status first, then verification)
const AccountStatusGuard = ({ children }) => {
  const { user } = useMainContext();

  // Check if user is banned first
  if (user?.banned) {
    return <AccountBanned />;
  }

  // Check if user is verified
  if (!user?.verified) {
    return <VerificationPending />;
  }

  return children;
};

// User Dashboard component that renders appropriate dashboard based on role
const UserDashboard = () => {
  const { user } = useMainContext();
  const navigate = useNavigate();
  const userRole = user?.role;

  // Service Providers get ProviderDashboard, Community Members redirect to browse-providers
  if (userRole === "Service Provider") {
    return <ProviderDashboard />;
  } else {
    // Community Member or any other role redirects to browse-providers
    React.useEffect(() => {
      navigate("/user/browse-providers", { replace: true });
    }, [navigate]);
    
    return <div>Redirecting to browse providers...</div>;
  }
};

const AppContent = () => {
  const { isAuthorized, tokenType, authLoaded, user, admin, navigationLoading, setNavigationLoading } = useMainContext();
  const location = useLocation();
  const navigate = useNavigate();
  const navigateWithLoader = useNavigateWithLoader();
  const isAdmin = isAuthorized && tokenType === "admin";
  const isUser = isAuthorized && tokenType === "user";
  const locationRef = useRef(location.pathname);

  // Role-based access helpers
  const userRole = user?.role;



  // Listen for location changes to show loader on navigation
  useEffect(() => {
    if (locationRef.current !== location.pathname) {
      setNavigationLoading(true);
      setTimeout(() => {
        setNavigationLoading(false);
      }, 100);
      locationRef.current = location.pathname;
    }
  }, [location.pathname, setNavigationLoading]);

  // Save last path whenever user navigates to a user route
  useEffect(() => {
    if (isUser && location.pathname.startsWith("/user/") && location.pathname !== "/user/login") {
      localStorage.setItem("userLastPath", location.pathname);
    }
  }, [location.pathname, isUser]);

  useEffect(() => {
    if (!authLoaded) return;

    // Don't redirect if user is on login/register pages
    const isOnAuthPage = location.pathname === "/login" ||
                        location.pathname === "/register" ||
                        location.pathname === "/admin/login" ||
                        location.pathname === "/forgot-password" ||
                        location.pathname === "/verify-email" ||
                        location.pathname === "/reset-password";

    if (isAuthorized && !isOnAuthPage) {
      if (isAdmin && !location.pathname.startsWith("/admin")) {
        const lastPath = localStorage.getItem("adminLastPath");
        if (lastPath && lastPath.startsWith("/admin/")) {
          navigateWithLoader(lastPath, { replace: true });
        } else {
          navigateWithLoader("/admin/analytics", { replace: true });
        }
      } else if (isUser) {
        // Redirect if on home page or invalid route
        if (location.pathname === "/" || location.pathname === "/home") {
          const lastPath = localStorage.getItem("userLastPath");
          if (lastPath && lastPath.startsWith("/user/")) {
            navigateWithLoader(lastPath, { replace: true });
          } else {
            // Navigate to dashboard - UserDashboard component will show appropriate dashboard based on role
            navigateWithLoader("/user/dashboard", { replace: true });
            localStorage.setItem("userLastPath", "/user/dashboard");
          }
        }
      }
    } else if (!isAuthorized && !isOnAuthPage && location.pathname.startsWith("/user/")) {
      // Redirect to login if trying to access user routes without auth
      navigateWithLoader("/login", { replace: true });
    } else if (!isAuthorized && !isOnAuthPage && location.pathname.startsWith("/admin/")) {
      // Redirect to admin login if trying to access admin routes without auth
      navigateWithLoader("/admin/login", { replace: true });
    }
  }, [isAuthorized, location.pathname, navigateWithLoader, isAdmin, isUser, authLoaded, userRole]);

  if (navigationLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Loader />
      </div>
    );
  }

  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/home" element={<Home />} />

        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/image-test" element={<ImageTest />} />


        {/* User Routes */}
        <Route
          path="/user/*"
          element={
            isUser ? (
              <AccountStatusGuard>
                <Outlet />
              </AccountStatusGuard>
            ) : (
              <Navigate to="/login" />
            )
          }
        >
          {/* Default route - shows appropriate dashboard based on user role */}
          <Route index element={<UserDashboard />} />
          <Route path="dashboard" element={<UserDashboard />} />

          {/* Routes available to all authenticated users */}
          <Route path="manage-profile" element={<ManageProfile />} />
          <Route path="general-settings" element={<Settings />} />

          {/* Routes for Community Members and Service Providers */}
          <Route
            path="waiting-for-worker"
            element={
              <RoleGuard allowedRoles={["Community Member", "Service Provider"]}>
                <ClientDashboard />
              </RoleGuard>
            }
          />
          <Route
            path="accepted-order"
            element={
              <RoleGuard allowedRoles={["Community Member", "Service Provider"]}>
                <ClientDashboard />
              </RoleGuard>
            }
          />

          {/* Browse Providers Page for Clients */}
          <Route
            path="browse-providers"
            element={
              <RoleGuard allowedRoles={["Community Member", "Service Provider"]}>
                <ClientDashboard />
              </RoleGuard>
            }
          />


          {/* Routes for Service Providers only */}
          <Route
            path="my-service"
            element={
              <RoleGuard allowedRoles={["Service Provider"]}>
                <ProviderDashboard />
              </RoleGuard>
            }
          />


          {/* Additional Service Provider routes */}
          <Route
            path="users-request"
            element={(
              <RoleGuard allowedRoles={["Service Provider"]}>
                <ProviderDashboard />
              </RoleGuard>
            )}
          />
          <Route
            path="accepted-request"
            element={(
              <RoleGuard allowedRoles={["Service Provider"]}>
                <ProviderDashboard />
              </RoleGuard>
            )}
          />
          <Route
            path="client-accepted"
            element={(
              <RoleGuard allowedRoles={["Service Provider"]}>
                <ProviderDashboard />
              </RoleGuard>
            )}
          />
          <Route
            path="clients"
            element={(
              <RoleGuard allowedRoles={["Service Provider"]}>
                <ProviderDashboard />
              </RoleGuard>
            )}
          />

          {/* Fallback route for unmatched user routes - use ProviderDashboard as fallback */}
          <Route
            path="*"
            element={
              <RoleGuard allowedRoles={["Service Provider"]}>
                <ProviderDashboard />
              </RoleGuard>
            }
          />
        </Route>

        {/* Admin Routes */}
        <Route
          path="/admin/*"
          element={isAdmin ? <AdminDashboard /> : <Navigate to="/admin/login" />}
        >
          <Route index element={<Navigate to="/admin/analytics" />} />
          <Route path="analytics" element={<SystemAnalytics />} />
          <Route path="recommendations" element={<SystemRecommendations />} />
          <Route path="service-providers" element={<ServiceProviders />} />
          <Route path="jobfairs" element={<JobFairs />} />
          <Route path="service-requests" element={<ReviewServiceRequest />} />
          <Route path="users" element={<UserManagement />} />
          <Route path="admin-register" element={<AdminRegister />} />
          <Route path="admin-settings" element={<AdminSettings />} />
          <Route path="skill-category" element={<SkillCategories />} />
          <Route path="residents" element={<Residents />} />
        </Route>

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
      {/* Hide main footer for user dashboard */}
      {!isAdmin && !isUser && <Footer />}

      {/* Real-time notification listener */}
      <NotificationListener user={isUser ? user : admin} />
    </>
  );
};

const App = () => (
  <ErrorBoundary>
    <PopupProvider>
      <Router>
        <AppContent />
        <ToastContainer />
      </Router>
    </PopupProvider>
  </ErrorBoundary>
);

export default App;
