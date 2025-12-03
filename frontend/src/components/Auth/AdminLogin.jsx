import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { FaEye, FaEyeSlash, FaEnvelope, FaLock, FaCheckCircle, FaExclamationCircle } from "react-icons/fa";
import { toast } from "react-toastify";
import "./auth-styles.css";
import { useMainContext } from "../../mainContext";
import api from "../../api";
import { updateSocketToken } from "../../utils/socket";
import skillconnectLogo from "../Home/images/1000205778-removebg-preview.png";

const AdminLogin = () => {
  const [formData, setFormData] = useState({
    email: "",
    password: ""
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [rememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { setIsAuthorized, setAdmin, setTokenType, setIsUserVerified } = useMainContext();
  const navigate = useNavigate();

  // Real-time validation
  const validateField = (name, value) => {
    let error = "";
    if (name === "email") {
      if (!value) {
        error = "Email is required";
      } else if (!/\S+@\S+\.\S+/.test(value)) {
        error = "Please enter a valid email address";
      }
    } else if (name === "password") {
      if (!value) {
        error = "Password is required";
      } else if (value.length < 6) {
        error = "Password must be at least 6 characters";
      }
    }
    return error;
  };

  // Form validation
  const validateForm = () => {
    const newErrors = {};

    const emailError = validateField("email", formData.email);
    if (emailError) newErrors.email = emailError;

    const passwordError = validateField("password", formData.password);
    if (passwordError) newErrors.password = passwordError;

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Get field status for styling
  const getFieldStatus = (fieldName) => {
    if (errors[fieldName]) return "error";
    if (formData[fieldName] && !errors[fieldName]) return "success";
    return "";
  };

  // Handle blur events
  const handleBlur = (e) => {
    const { name, value } = e.target;
    const error = validateField(name, value);
    setErrors(prev => ({
      ...prev,
      [name]: error
    }));
  };

  useEffect(() => {
    const storedAdmin = JSON.parse(localStorage.getItem("admin") || "null");
    const storedToken = localStorage.getItem("token");
    const isAuth = localStorage.getItem("isAuthorized") === "true";
    const type = localStorage.getItem("tokenType");

    if (storedAdmin && isAuth && storedToken && type === "admin") {
      setAdmin(storedAdmin);
      setIsAuthorized(true);
      setTokenType(type);
      setIsUserVerified(false);
      updateSocketToken(storedToken);

      navigate("/admin/analytics", { replace: true });
    }
  }, [navigate, setAdmin, setIsAuthorized, setTokenType, setIsUserVerified]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Real-time validation
    const error = validateField(name, value);
    setErrors(prev => ({
      ...prev,
      [name]: error
    }));
  };

  const handleAdminLogin = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      const { data } = await api.post("/admin/auth/login", {
        email: formData.email,
        password: formData.password
      });

      setAdmin(data.user);
      setIsAuthorized(true);
      setTokenType("admin");
      setIsUserVerified(data.user.isVerified || false);

      localStorage.setItem("admin", JSON.stringify(data.user));
      localStorage.setItem("token", data.token);
      localStorage.setItem("isAuthorized", "true");
      localStorage.setItem("tokenType", "admin");

      if (rememberMe) {
        localStorage.setItem("rememberedEmail", formData.email);
      }

      updateSocketToken(data.token);

      toast.success(data.message || "Login successful!");

      setFormData({ email: "", password: "" });
      setErrors({});

      navigate("/admin/analytics");
    } catch (error) {
      const errorMessage = error.response?.data?.message || "Login failed. Please try again.";

      setErrors({
        general: errorMessage
      });

      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-background-pattern"></div>

      <div className="login-wrapper">
        {/* LEFT SIDE */}
        <div className="login-left-side">
          <img
            src={skillconnectLogo}
            alt="SkillConnect Logo"
            className="login-left-logo"
          />
          <h1 className="login-left-title">Administrator Portal</h1>
          <p className="login-left-subtitle">
            Secure access for authorized administrators
          </p>
        </div>

        {/* RIGHT SIDE */}
        <div className="login-right-side">
          <div className="login-card">

            <div className="login-form-container">
              {errors.general && (
                <div className="general-error">
                  <FaExclamationCircle className="general-error-icon" />
                  <p className="general-error-text">{errors.general}</p>
                </div>
              )}

              <form className="login-form" onSubmit={handleAdminLogin}>
                <div className="form-group">
                  <label htmlFor="email" className="form-label">
                    Email Address
                  </label>
                  <div className="input-wrapper">
                    <input
                      type="email"
                      id="email"
                      name="email"
                      placeholder="admin@skillconnect.com"
                      value={formData.email}
                      onChange={handleInputChange}
                      onBlur={handleBlur}
                      className={`form-input ${getFieldStatus('email')}`}
                      disabled={isLoading}
                      autoComplete="email"
                      aria-invalid={!!errors.email}
                      aria-describedby={errors.email ? "email-error" : "email-help"}
                    />
                    {getFieldStatus('email') === 'success' && (
                      <div className="input-icon-right">
                        <FaCheckCircle className="icon-success" />
                      </div>
                    )}
                    {getFieldStatus('email') === 'error' && (
                      <div className="input-icon-right">
                        <FaExclamationCircle className="icon-error" />
                      </div>
                    )}
                  </div>
                  {errors.email ? (
                    <p id="email-error" className="field-error-message">
                      <FaExclamationCircle className="error-icon-inline" />
                      {errors.email}
                    </p>
                  ) : (
                    <p id="email-help" className="field-help-text">
                      Enter the email address you used to register as admin
                    </p>
                  )}
                </div>

                <div className="form-group">
                  <label htmlFor="password" className="form-label">
                    Password
                  </label>
                  <div className="input-wrapper">
                    <input
                      type={showPassword ? "text" : "password"}
                      id="password"
                      name="password"
                      placeholder="Enter your password"
                      value={formData.password}
                      onChange={handleInputChange}
                      onBlur={handleBlur}
                      className={`form-input ${getFieldStatus('password')}`}
                      disabled={isLoading}
                      autoComplete="current-password"
                      aria-invalid={!!errors.password}
                      aria-describedby={errors.password ? "password-error" : "password-help"}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="password-toggle-btn"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      tabIndex={-1}
                    >
                      {showPassword ? <FaEyeSlash className="toggle-icon" /> : <FaEye className="toggle-icon" />}
                    </button>
                  </div>
                  {errors.password ? (
                    <p id="password-error" className="field-error-message">
                      <FaExclamationCircle className="error-icon-inline" />
                      {errors.password}
                    </p>
                  ) : (
                    <p id="password-help" className="field-help-text">
                      Must be at least 8 characters long
                    </p>
                  )}
                </div>


                <button
                  type="submit"
                  disabled={isLoading}
                  className="submit-btn"
                >
                  {isLoading ? (
                    <span className="btn-loading">
                      <svg className="spinner" viewBox="0 0 24 24">
                        <circle className="spinner-circle" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="spinner-path" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Signing In...
                    </span>
                  ) : (
                    'Sign In as Admin'
                  )}
                </button>
              </form>

              <div className="login-footer">
                <p className="footer-subtext">
                  Not an admin? <a href="/login" className="footer-sublink">Login as User</a>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
};

export default AdminLogin;
