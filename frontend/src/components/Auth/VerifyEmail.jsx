import { useState, useEffect } from "react";
import { Mail, ArrowLeft, Loader } from "lucide-react";
import "../Css/VerifyEmail.css";

const VerifyEmail = () => {
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendTimer, setResendTimer] = useState(60);
  const [validationErrors, setValidationErrors] = useState({});
  const [verified, setVerified] = useState(false);

  useEffect(() => {
    const storedEmail = localStorage.getItem('resetEmail');
    if (storedEmail) {
      setEmail(storedEmail);
    } else {
      window.location.href = "/forgot-password";
    }
  }, []);

  useEffect(() => {
    let timer;
    if (resendTimer > 0) {
      timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [resendTimer]);

  const handleOtpChange = (value, index) => {
    if (!/^\d*$/.test(value)) return;
    if (value.length > 1) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    setValidationErrors({});

    if (value && index < otp.length - 1) {
      const nextInput = document.getElementById(`otp-${index + 1}`);
      if (nextInput) nextInput.focus();
    }
  };

  const handleKeyDown = (e, index) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      const prevInput = document.getElementById(`otp-${index - 1}`);
      if (prevInput) prevInput.focus();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const otpValue = otp.join('');
    if (otpValue.length !== 6) {
      setValidationErrors({ otp: "Please enter the complete 6-digit code" });
      return;
    }

    setIsSubmitting(true);

    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      localStorage.setItem('resetToken', 'mock-token-' + otpValue);
      setVerified(true);
      
      setTimeout(() => {
        window.location.href = `/reset-password?email=${encodeURIComponent(email)}&token=mock-token-${otpValue}`;
      }, 2000);
    } catch {
      setValidationErrors({
        otp: "Failed to verify code. Please try again."
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResend = async () => {
    if (resendTimer > 0) return;

    setIsResending(true);

    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      setResendTimer(60);
      setOtp(["", "", "", "", "", ""]);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setIsResending(false);
    }
  };

  if (verified) {
    return (
      <div className="verify-email-wrapper">
        
        <div className="card-container">
          <div className="success-container">
            <div className="success-icon">
              <Mail size={48} />
            </div>
            <h2 className="success-title">Email Verified</h2>
            <p className="success-message">
              Your email has been verified successfully
            </p>
            <p className="success-subtext">
              Redirecting you to reset your password...
            </p>
            
            <div className="loading-bar"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="verify-email-wrapper">
      <div className="background-pattern"></div>
      
      <div className="card-container">
        {/* Header Section */}
        <div className="card-header">
          <div className="header-content">
            <div className="header-icon">
              <Mail size={32} />
            </div>
            <h1 className="header-title">Verify Your Email</h1>
            <p className="header-subtitle">
              Enter the 6-digit code we sent to your email
            </p>
          </div>
        </div>

        {/* Form Section */}
        <div className="form-container">
          {/* Email Display */}
          <div className="email-display">
            <Mail size={18} />
            <span className="email-text">{email}</span>
          </div>

          {/* OTP Input */}
          <div className="otp-section">
            <div className="otp-container">
              {otp.map((digit, index) => (
                <input
                  key={index}
                  id={`otp-${index}`}
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength="1"
                  value={digit}
                  onChange={(e) => handleOtpChange(e.target.value, index)}
                  onKeyDown={(e) => handleKeyDown(e, index)}
                  className={`otp-input ${validationErrors.otp ? 'input-error' : digit ? 'filled' : ''}`}
                  disabled={isSubmitting}
                  autoComplete="one-time-code"
                />
              ))}
            </div>

            {validationErrors.otp && (
              <div className="error-message">
                <span>{validationErrors.otp}</span>
              </div>
            )}

            <p className="help-text">
              Check your email (including spam folder) for the 6-digit code
            </p>
          </div>

          {/* Submit Button */}
          <button
            onClick={handleSubmit}
            className="submit-btn"
            disabled={isSubmitting || otp.join('').length !== 6}
          >
            {isSubmitting ? (
              <>
                <Loader size={20} className="spinner-icon" />
                Verifying...
              </>
            ) : (
              <>
                <Mail size={20} />
                Verify Email
              </>
            )}
          </button>

          {/* Resend Code */}
          <div className="resend-section">
            <p className="resend-label">Didn't receive the code?</p>
            <button
              type="button"
              className="resend-btn"
              onClick={handleResend}
              disabled={resendTimer > 0 || isResending}
            >
              {isResending ? (
                "Sending..."
              ) : resendTimer > 0 ? (
                `Resend in ${resendTimer}s`
              ) : (
                "Resend Code"
              )}
            </button>
          </div>

          {/* Back Link */}
          <div className="back-link-container">
            <a href="/forgot-password" className="back-link">
              <ArrowLeft size={18} />
              <span>Back to Forgot Password</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VerifyEmail;
