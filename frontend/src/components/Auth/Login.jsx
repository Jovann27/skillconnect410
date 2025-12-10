import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Link } from "react-router-dom";
import { FaEye, FaEyeSlash, FaEnvelope, FaLock, FaCheckCircle, FaExclamationCircle } from "react-icons/fa";
import { toast } from "react-toastify";
import { useMainContext } from "../../mainContext";
import api from "../../api";
import { updateSocketToken } from "../../utils/socket";
import skillconnectLogo from "../Home/images/1000205778-removebg-preview.png";

const Login = () => {
  const [formData, setFormData] = useState({
    email: "",
    password: ""
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { setIsAuthorized, setUser, setTokenType, setIsUserVerified } = useMainContext();
  const navigate = useNavigate();

  // Real-time validation
  const validateField = (name, value) => {
    let error = "";
    if (name === "email") {
      if (!value) {
        error = "Email or username is required";
      } else if (!/\S+@\S+\.\S+/.test(value) && !/^[a-zA-Z0-9_]{3,20}$/.test(value)) {
        error = "Please enter a valid email address or username (3-20 characters, letters/numbers/underscore only)";
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
    const storedUser = JSON.parse(localStorage.getItem("user") || "null");
    const storedToken = localStorage.getItem("token");
    const isAuth = localStorage.getItem("isAuthorized") === "true";
    const type = localStorage.getItem("tokenType");

    if (storedUser && isAuth && storedToken && type === "user") {
      setUser(storedUser);
      setIsAuthorized(true);
      setTokenType(type);
      setIsUserVerified(storedUser.role === "Service Provider" || false);
      updateSocketToken(storedToken);

      // Navigate based on user role (for stored session check)
      // Service Provider → /user/my-service
      // Community Member → /user/service-request
      if (storedUser.role === "Service Provider") {
        navigate("/user/my-service", { replace: true });
        localStorage.setItem("userLastPath", "/user/my-service");
      } else {
        // Community Member
        navigate("/user/service-request", { replace: true });
        localStorage.setItem("userLastPath", "/user/service-request");
      }
    }
  }, [navigate, setUser, setIsAuthorized, setTokenType, setIsUserVerified]);

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

  const handleLogin = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      const { data } = await api.post("/user/login", {
        email: formData.email,
        password: formData.password
      });

      setUser(data.user);
      setIsAuthorized(true);
      setTokenType("user");
      setIsUserVerified(data.user.isVerified || false);

      // Update localStorage with user data and token
      localStorage.setItem("user", JSON.stringify(data.user));
      localStorage.setItem("token", data.token);
      localStorage.setItem("isAuthorized", "true");
      localStorage.setItem("tokenType", "user");

      if (rememberMe) {
        localStorage.setItem("rememberedEmail", formData.email);
      }

      // Update socket token for real-time chat
      const token = localStorage.getItem("token");
      if (token) {
        updateSocketToken(token);
      }

      toast.success(data.message || "Login successful!");

      // Clear form
      setFormData({ email: "", password: "" });
      setErrors({});

      // Navigate based on user role (ignore last path on fresh login)
      // Service Provider → /user/my-service
      // Community Member → /user/service-request
      if (data.user.role === "Service Provider") {
        navigate("/user/my-service", { replace: true });
        localStorage.setItem("userLastPath", "/user/my-service");
      } else {
        // Community Member
        navigate("/user/service-request", { replace: true });
        localStorage.setItem("userLastPath", "/user/service-request");
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || "Login failed. Please try again.";
      toast.error(errorMessage);

      // Set specific error if email/password related
      if (errorMessage.toLowerCase().includes("email") || errorMessage.toLowerCase().includes("password")) {
        setErrors({ general: errorMessage });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-primary-100 flex items-center justify-center p-4">
      <div className="absolute inset-0 opacity-30 bg-gradient-to-br from-primary-100/50 to-primary-200/30"></div>

      <div className="relative w-full max-w-6xl mx-auto bg-white rounded-2xl shadow-2xl overflow-hidden flex">
        {/* LEFT SIDE */}
        <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary-600 to-primary-800 p-6 flex-col justify-center items-center text-white relative overflow-hidden">
          {/* Decorative Elements */}
          <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full -translate-y-24 translate-x-24"></div>
          <div className="absolute bottom-0 left-0 w-36 h-36 bg-white/5 rounded-full translate-y-18 -translate-x-18"></div>

          <div className="relative z-10 text-center">
            <img
              src={skillconnectLogo}
              alt="SkillConnect Logo"
              className="w-16 h-16 mx-auto mb-4 drop-shadow-lg"
            />
            <h1 className="text-2xl font-bold mb-3 leading-tight">Welcome Back to<br />SkillConnect 4b410</h1>
            <p className="text-lg opacity-90 mb-6 leading-relaxed">
              Connect with skilled workers and community members
            </p>
            <Link
              to="/home#About"
              className="inline-flex items-center px-6 py-2 bg-white/20 backdrop-blur-sm border border-white/30 rounded-full text-white font-semibold hover:bg-white/30 transition-all duration-300 hover:shadow-lg text-sm"
            >
              About Us
            </Link>
          </div>
        </div>

        {/* RIGHT SIDE */}
        <div className="w-full lg:w-1/2 p-4 lg:p-8">
          <div className="max-w-sm mx-auto">
            {/* Mobile Logo */}
            <div className="lg:hidden text-center mb-4">
              <img
                src={skillconnectLogo}
                alt="SkillConnect Logo"
                className="w-12 h-12 mx-auto mb-2"
              />
            </div>

            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-1">Sign In</h2>
              <p className="text-gray-600 text-sm">Welcome back! Please enter your details.</p>
            </div>

            {errors.general && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start space-x-2">
                <FaExclamationCircle className="text-red-500 mt-0.5 flex-shrink-0 text-sm" />
                <p className="text-red-700 text-sm">{errors.general}</p>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Email or Username
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FaEnvelope className="text-gray-400" />
                  </div>
                  <input
                    type="text"
                    id="email"
                    name="email"
                    placeholder="your.email@example.com or username"
                    value={formData.email}
                    onChange={handleInputChange}
                    onBlur={handleBlur}
                    className={`w-full pl-10 pr-10 py-3 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors ${
                      errors.email
                        ? 'border-red-300 bg-red-50'
                        : formData.email && !errors.email
                        ? 'border-green-300 bg-green-50'
                        : 'border-gray-300'
                    }`}
                    disabled={isLoading}
                    autoComplete="username"
                    aria-invalid={!!errors.email}
                    aria-describedby={errors.email ? "email-error" : "email-help"}
                  />
                  {getFieldStatus('email') === 'success' && (
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                      <FaCheckCircle className="text-green-500" />
                    </div>
                  )}
                  {getFieldStatus('email') === 'error' && (
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                      <FaExclamationCircle className="text-red-500" />
                    </div>
                  )}
                </div>
                {errors.email ? (
                  <p id="email-error" className="mt-1 text-sm text-red-600 flex items-center">
                    <FaExclamationCircle className="mr-1" />
                    {errors.email}
                  </p>
                ) : (
                  <p id="email-help" className="mt-1 text-sm text-gray-500">
                    Enter your email address or username
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FaLock className="text-gray-400" />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    id="password"
                    name="password"
                    placeholder="Enter your password"
                    value={formData.password}
                    onChange={handleInputChange}
                    onBlur={handleBlur}
                    className={`w-full pl-10 pr-12 py-3 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors ${
                      errors.password
                        ? 'border-red-300 bg-red-50'
                        : formData.password && !errors.password
                        ? 'border-green-300 bg-green-50'
                        : 'border-gray-300'
                    }`}
                    disabled={isLoading}
                    autoComplete="current-password"
                    aria-invalid={!!errors.password}
                    aria-describedby={errors.password ? "password-error" : "password-help"}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    tabIndex={-1}
                  >
                    {showPassword ? <FaEyeSlash /> : <FaEye />}
                  </button>
                </div>
                {errors.password ? (
                  <p id="password-error" className="mt-1 text-sm text-red-600 flex items-center">
                    <FaExclamationCircle className="mr-1" />
                    {errors.password}
                  </p>
                ) : (
                  <p id="password-help" className="mt-1 text-sm text-gray-500">
                    Must be at least 6 characters long
                  </p>
                )}
              </div>

              <div className="flex items-center justify-between">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                    disabled={isLoading}
                  />
                  <span className="ml-2 text-sm text-gray-700">Remember me</span>
                </label>
                <a href="/forgot-password" className="text-sm text-primary-600 hover:text-primary-500 font-medium">
                  Forgot password?
                </a>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-primary-600 to-primary-700 text-white py-3 px-4 rounded-lg font-semibold hover:from-primary-700 hover:to-primary-800 focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Signing In...
                  </>
                ) : (
                  'Sign In'
                )}
              </button>
            </form>

            <div className="mt-8 text-center space-y-2">
              <p className="text-gray-600">
                Don't have an account?{" "}
                <a href="/register" className="text-primary-600 hover:text-primary-500 font-semibold">
                  Create one here
                </a>
              </p>
              <p className="text-gray-500">
                Admin?{" "}
                <a href="/admin/login" className="text-gray-600 hover:text-gray-800 font-medium">
                  Login as Administrator
                </a>
              </p>
            </div>
          </div>

          <p className="mt-8 text-xs text-gray-500 text-center">
            By signing in, you agree to our{" "}
            <a href="/terms" className="text-primary-600 hover:text-primary-500">Terms of Service</a>{" "}
            and{" "}
            <a href="/privacy" className="text-primary-600 hover:text-primary-500">Privacy Policy</a>
          </p>
        </div>
      </div>
    </div>
  );
}
export default Login;
