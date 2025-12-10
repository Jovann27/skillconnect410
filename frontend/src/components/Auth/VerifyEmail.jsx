import { useState, useEffect } from "react";
import { Mail, ArrowLeft, Loader } from "lucide-react";

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
      <div className="min-h-screen flex items-center justify-center p-4 relative bg-gradient-to-br from-pink-100 via-purple-50 to-pink-50">
        <div className="absolute inset-0 bg-radial-gradient from-pink-200/20 via-transparent to-transparent pointer-events-none"></div>

        <div className="relative z-10 w-full max-w-md bg-white rounded-3xl shadow-2xl p-8 text-center">
          <div className="text-green-500 mb-4">
            <Mail size={48} className="mx-auto" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Email Verified</h2>
          <p className="text-gray-600 mb-4">
            Your email has been verified successfully
          </p>
          <p className="text-sm text-gray-500">
            Redirecting you to reset your password...
          </p>

          <div className="mt-6 h-1 bg-gray-200 rounded-full overflow-hidden">
            <div className="h-full bg-green-500 animate-pulse"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative bg-gradient-to-br from-pink-100 via-purple-50 to-pink-50">
      <div className="absolute inset-0 bg-radial-gradient from-pink-200/20 via-transparent to-transparent pointer-events-none"></div>

      <div className="relative z-10 w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden">
        {/* Header Section */}
        <div className="relative bg-gradient-to-b from-red-500 to-pink-600 p-8 text-white text-center overflow-hidden">
          <div className="absolute inset-0 bg-radial-gradient from-white/10 to-transparent pointer-events-none"></div>
          <div className="relative z-10">
            <div className="text-blue-200 mb-4">
              <Mail size={32} className="mx-auto" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Verify Your Email</h1>
            <p className="text-base opacity-90">
              Enter the 6-digit code we sent to your email
            </p>
          </div>
        </div>

        {/* Form Section */}
        <div className="p-8">
          {/* Email Display */}
          <div className="flex items-center justify-center gap-3 bg-gray-50 rounded-xl p-4 mb-6">
            <Mail size={18} className="text-gray-400" />
            <span className="text-gray-700 font-medium">{email}</span>
          </div>

          {/* OTP Input */}
          <div className="mb-6">
            <div className="flex justify-center gap-3 mb-4">
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
                  className={`w-12 h-12 text-center text-xl font-bold border-2 rounded-xl transition-all duration-200 outline-none focus:border-red-500 focus:ring-4 focus:ring-red-500/10 ${
                    validationErrors.otp
                      ? 'border-red-500 bg-red-50'
                      : digit
                      ? 'border-green-500 bg-green-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  disabled={isSubmitting}
                  autoComplete="one-time-code"
                />
              ))}
            </div>

            {validationErrors.otp && (
              <div className="text-center mb-4">
                <span className="text-sm text-red-500">{validationErrors.otp}</span>
              </div>
            )}

            <p className="text-center text-sm text-gray-500">
              Check your email (including spam folder) for the 6-digit code
            </p>
          </div>

          {/* Submit Button */}
          <button
            onClick={handleSubmit}
            className="w-full bg-gradient-to-r from-red-500 to-pink-600 text-white font-bold px-6 py-3 border-none rounded-xl text-base cursor-pointer transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105 focus:outline-none focus:ring-4 focus:ring-red-500/20 font-sans flex items-center justify-center gap-2 min-h-12 mb-4"
            disabled={isSubmitting || otp.join('').length !== 6}
          >
            {isSubmitting ? (
              <>
                <div className="w-5 h-5 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
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
          <div className="text-center mb-6">
            <p className="text-sm text-gray-600 mb-2">Didn't receive the code?</p>
            <button
              type="button"
              className={`px-4 py-2 rounded-lg font-medium transition-colors duration-200 ${
                resendTimer > 0 || isResending
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  : 'bg-blue-500 text-white hover:bg-blue-600'
              }`}
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
          <div className="text-center">
            <a href="/forgot-password" className="inline-flex items-center gap-2 text-red-500 font-semibold hover:underline">
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
