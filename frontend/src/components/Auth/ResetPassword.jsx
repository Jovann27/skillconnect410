import { useState, useEffect } from "react";
import { Lock, ArrowLeft, Eye, EyeOff, AlertCircle, CheckCircle } from "lucide-react";
import "../Css/ResetPassword.css";

const ResetPassword = () => {
  const [formData, setFormData] = useState({
    email: "",
    token: "",
    newPassword: "",
    confirmPassword: ""
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    // Get parameters from URL (simulated)
    const urlParams = new URLSearchParams(window.location.search);
    const email = urlParams.get('email') || "user@example.com";
    const token = urlParams.get('token') || "valid-token";

    if (email && token) {
      setFormData(prev => ({
        ...prev,
        email,
        token
      }));
    } else {
      window.location.href = "/forgot-password";
    }
  }, []);

  const calculatePasswordStrength = (password) => {
    let strength = 0;
    if (password.length >= 8) strength++;
    if (password.length >= 12) strength++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^a-zA-Z0-9]/.test(password)) strength++;
    return strength;
  };

  const getPasswordStrengthLabel = (strength) => {
    const labels = ["", "Weak", "Fair", "Good", "Strong", "Very Strong"];
    return labels[strength];
  };

  const getPasswordStrengthColor = (strength) => {
    const colors = ["", "bg-red-500", "bg-orange-500", "bg-yellow-500", "bg-blue-500", "bg-green-500"];
    return colors[strength];
  };

  const validatePassword = (password) => {
    if (!password) {
      return "Password is required";
    }
    if (password.length < 8) {
      return "Password must be at least 8 characters long";
    }
    return "";
  };

  const validateConfirmPassword = (confirmPassword, password) => {
    if (!confirmPassword) {
      return "Please confirm your password";
    }
    if (confirmPassword !== password) {
      return "Passwords do not match";
    }
    return "";
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    if (field === 'newPassword') {
      setPasswordStrength(calculatePasswordStrength(value));
      setValidationErrors(prev => ({
        ...prev,
        newPassword: validatePassword(value),
        confirmPassword: formData.confirmPassword ? validateConfirmPassword(formData.confirmPassword, value) : prev.confirmPassword
      }));
    } else if (field === 'confirmPassword') {
      setValidationErrors(prev => ({
        ...prev,
        confirmPassword: validateConfirmPassword(value, formData.newPassword)
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const passwordError = validatePassword(formData.newPassword);
    const confirmPasswordError = validateConfirmPassword(formData.confirmPassword, formData.newPassword);

    if (passwordError || confirmPasswordError) {
      setValidationErrors({
        newPassword: passwordError,
        confirmPassword: confirmPasswordError
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Simulated API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setSubmitted(true);
      setTimeout(() => {
        window.location.href = "/login";
      }, 2500);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="reset-password-wrapper">
        <div className="background-pattern"></div>
        
        <div className="card-container">
          <div className="success-container">
            <div className="success-icon">
              <CheckCircle size={48} />
            </div>
            <h2 className="success-title">Password Reset Successfully</h2>
            <p className="success-message">
              Your password has been updated successfully
            </p>
            <p className="success-subtext">
              Redirecting to login page... You can now log in with your new password.
            </p>
            
            <div className="loading-bar"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="reset-password-wrapper">
      <div className="background-pattern"></div>
      
      <div className="card-container">
        {/* Header Section */}
        <div className="card-header">
          <div className="header-content">
            <div className="header-icon">
              <Lock size={32} />
            </div>
            <h1 className="header-title">Reset Your Password</h1>
            <p className="header-subtitle">
              Create a new, secure password for your account
            </p>
          </div>
        </div>

        {/* Form Section */}
        <div onSubmit={handleSubmit} className="form-container">
          {/* New Password Input */}
          <div className="input-group">
            <label htmlFor="newPassword" className="input-label">New Password</label>
            <div className="input-wrapper">
              <div className="input-icon">
                <Lock size={20} />
              </div>
              <input
                type={showPassword ? "text" : "password"}
                id="newPassword"
                name="newPassword"
                placeholder="Enter your new password"
                value={formData.newPassword}
                onChange={(e) => handleInputChange('newPassword', e.target.value)}
                className={`input-field ${
                  validationErrors.newPassword 
                    ? 'input-error' 
                    : formData.newPassword && !validationErrors.newPassword 
                    ? 'input-success' 
                    : ''
                }`}
                disabled={isSubmitting}
                autoComplete="new-password"
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                disabled={isSubmitting}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
              {formData.newPassword && !validationErrors.newPassword && (
                <div className="input-success-icon">
                  <CheckCircle size={20} />
                </div>
              )}
            </div>

            {/* Password Strength Indicator */}
            {formData.newPassword && (
              <div className="password-strength">
                <div className="strength-bars">
                  {[...Array(5)].map((_, i) => (
                    <div
                      key={i}
                      className={`strength-bar ${i < passwordStrength ? getPasswordStrengthColor(passwordStrength) : 'bg-gray-200'}`}
                    ></div>
                  ))}
                </div>
                <span className={`strength-label ${getPasswordStrengthColor(passwordStrength).replace('bg-', 'text-')}`}>
                  {getPasswordStrengthLabel(passwordStrength)}
                </span>
              </div>
            )}

            {validationErrors.newPassword ? (
              <div className="error-message">
                <AlertCircle size={16} />
                <span>{validationErrors.newPassword}</span>
              </div>
            ) : (
              <p className="help-text">
                At least 8 characters with a mix of uppercase, lowercase, numbers, and symbols
              </p>
            )}
          </div>

          {/* Confirm Password Input */}
          <div className="input-group">
            <label htmlFor="confirmPassword" className="input-label">Confirm Password</label>
            <div className="input-wrapper">
              <div className="input-icon">
                <Lock size={20} />
              </div>
              <input
                type={showConfirmPassword ? "text" : "password"}
                id="confirmPassword"
                name="confirmPassword"
                placeholder="Confirm your new password"
                value={formData.confirmPassword}
                onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                className={`input-field ${
                  validationErrors.confirmPassword 
                    ? 'input-error' 
                    : formData.confirmPassword && !validationErrors.confirmPassword 
                    ? 'input-success' 
                    : ''
                }`}
                disabled={isSubmitting}
                autoComplete="new-password"
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                disabled={isSubmitting}
              >
                {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
              {formData.confirmPassword && !validationErrors.confirmPassword && (
                <div className="input-success-icon">
                  <CheckCircle size={20} />
                </div>
              )}
            </div>

            {validationErrors.confirmPassword ? (
              <div className="error-message">
                <AlertCircle size={16} />
                <span>{validationErrors.confirmPassword}</span>
              </div>
            ) : (
              <p className="help-text">
                Passwords must match exactly
              </p>
            )}
          </div>

          {/* Password Requirements */}
          <div className="requirements-box">
            <h4 className="requirements-title">Password Requirements:</h4>
            <ul className="requirements-list">
              <li className={formData.newPassword?.length >= 8 ? 'met' : ''}>
                <CheckCircle size={16} />
                At least 8 characters
              </li>
              <li className={/[a-z]/.test(formData.newPassword) ? 'met' : ''}>
                <CheckCircle size={16} />
                One lowercase letter
              </li>
              <li className={/[A-Z]/.test(formData.newPassword) ? 'met' : ''}>
                <CheckCircle size={16} />
                One uppercase letter
              </li>
              <li className={/[0-9]/.test(formData.newPassword) ? 'met' : ''}>
                <CheckCircle size={16} />
                One number
              </li>
              <li className={/[^a-zA-Z0-9]/.test(formData.newPassword) ? 'met' : ''}>
                <CheckCircle size={16} />
                One special character (!@#$%^&*)
              </li>
            </ul>
          </div>

          {/* Submit Button */}
          <button
            onClick={handleSubmit}
            className="submit-btn"
            disabled={isSubmitting || !!validationErrors.newPassword || !!validationErrors.confirmPassword || !formData.newPassword || !formData.confirmPassword}
          >
            {isSubmitting ? (
              <>
                <span className="spinner-icon"></span>
                Resetting Password...
              </>
            ) : (
              <>
                <Lock size={20} />
                Reset Password
              </>
            )}
          </button>

          {/* Back to Login Link */}
          <div className="back-link-container">
            <a href="/login" className="back-link">
              <ArrowLeft size={18} />
              <span>Back to Login</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
