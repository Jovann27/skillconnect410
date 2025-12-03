import { useState } from "react";
import { Mail, ArrowLeft, AlertCircle, CheckCircle, Loader } from "lucide-react";
import "../Css/ForgotPassword.css";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});
  const [submitted, setSubmitted] = useState(false);

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email) {
      return "Email address is required";
    }
    if (!emailRegex.test(email)) {
      return "Please enter a valid email address";
    }
    return "";
  };

  const handleEmailChange = (e) => {
    const value = e.target.value;
    setEmail(value);
    setValidationErrors({
      ...validationErrors,
      email: validateEmail(value)
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const emailError = validateEmail(email);
    if (emailError) {
      setValidationErrors({ email: emailError });
      return;
    }

    setIsSubmitting(true);

    try {
      // Simulated API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Store email for verification step
      localStorage.setItem('resetEmail', email);
      
      setSubmitted(true);
      setTimeout(() => {
        window.location.href = "/verify-email";
      }, 2000);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="forgot-password-wrapper">
        <div className="background-pattern"></div>
        
        <div className="card-container">
          <div className="success-container">
            <div className="success-icon">
              <CheckCircle size={48} />
            </div>
            <h2 className="success-title">Email Sent Successfully</h2>
            <p className="success-message">
              We've sent a password reset link to <strong>{email}</strong>
            </p>
            <p className="success-subtext">
              Check your inbox and follow the instructions to reset your password. This page will redirect shortly.
            </p>
            
            <div className="loading-bar"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="forgot-password-wrapper">
      <div className="background-pattern"></div>
      
      <div className="card-container">
        {/* Header Section */}
        <div className="card-header">
          <div className="header-content">
            <div className="header-icon">
              <Mail size={32} />
            </div>
            <h1 className="header-title">Reset Your Password</h1>
            <p className="header-subtitle">
              Enter your email address and we'll send you a link to reset your password
            </p>
          </div>
        </div>

        {/* Form Section */}
        <div onSubmit={handleSubmit} className="form-container">
          {/* Email Input */}
          <div className="input-group">
            <label htmlFor="email" className="input-label">Email Address</label>
            <div className="input-wrapper">
              <div className="input-icon">
                <Mail size={20} />
              </div>
              <input
                type="email"
                id="email"
                name="email"
                placeholder="your.email@example.com"
                value={email}
                onChange={handleEmailChange}
                className={`input-field ${
                  validationErrors.email 
                    ? 'input-error' 
                    : email && !validationErrors.email 
                    ? 'input-success' 
                    : ''
                }`}
                disabled={isSubmitting}
                autoComplete="email"
              />
              {email && !validationErrors.email && (
                <div className="input-success-icon">
                  <CheckCircle size={20} />
                </div>
              )}
            </div>
            
            {validationErrors.email ? (
              <div className="error-message">
                <AlertCircle size={16} />
                <span>{validationErrors.email}</span>
              </div>
            ) : (
              <p className="help-text">
                Enter the email address associated with your account
              </p>
            )}
          </div>

          {/* Submit Button */}
          <button
            onClick={handleSubmit}
            className="submit-btn"
            disabled={isSubmitting || !!validationErrors.email || !email}
          >
            {isSubmitting ? (
              <>
                <Loader size={20} className="spinner-icon" />
                Sending Reset Email...
              </>
            ) : (
              <>
                <Mail size={20} />
                Send Reset Email
              </>
            )}
          </button>

          {/* Info Box */}
          <div className="info-box">
            <p className="info-text">
              💡 Check your spam folder if you don't receive the email within a few minutes.
            </p>
          </div>

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

export default ForgotPassword;