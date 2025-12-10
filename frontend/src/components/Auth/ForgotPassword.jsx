import { useState } from "react";
import { Mail, ArrowLeft, AlertCircle, CheckCircle, Loader } from "lucide-react";

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
      <div className="min-h-screen flex items-center justify-center p-4 relative bg-gradient-to-br from-pink-100 via-purple-50 to-pink-50">
        <div className="absolute inset-0 bg-radial-gradient from-pink-200/20 via-transparent to-transparent pointer-events-none"></div>

        <div className="relative z-10 w-full max-w-md bg-white rounded-3xl shadow-2xl p-8 text-center">
          <div className="text-green-500 mb-4">
            <CheckCircle size={48} className="mx-auto" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Email Sent Successfully</h2>
          <p className="text-gray-600 mb-4">
            We've sent a password reset link to <strong>{email}</strong>
          </p>
          <p className="text-sm text-gray-500">
            Check your inbox and follow the instructions to reset your password. This page will redirect shortly.
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
            <h1 className="text-2xl font-bold mb-2">Reset Your Password</h1>
            <p className="text-base opacity-90">
              Enter your email address and we'll send you a link to reset your password
            </p>
          </div>
        </div>

        {/* Form Section */}
        <div className="p-8">
          {/* Email Input */}
          <div className="mb-6">
            <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">Email Address</label>
            <div className="relative flex items-center">
              <div className="absolute left-4 text-gray-400">
                <Mail size={20} />
              </div>
              <input
                type="email"
                id="email"
                name="email"
                placeholder="your.email@example.com"
                value={email}
                onChange={handleEmailChange}
                className={`w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl text-base font-sans bg-white transition-all duration-200 text-gray-900 outline-none hover:border-gray-300 focus:border-red-500 focus:ring-4 focus:ring-red-500/10 ${
                  validationErrors.email
                    ? 'border-red-500 bg-red-50'
                    : email && !validationErrors.email
                    ? 'border-green-500 bg-green-50'
                    : ''
                }`}
                disabled={isSubmitting}
                autoComplete="email"
              />
              {email && !validationErrors.email && (
                <div className="absolute right-4 text-green-500">
                  <CheckCircle size={20} />
                </div>
              )}
            </div>

            {validationErrors.email ? (
              <div className="flex items-center gap-2 mt-2 text-sm text-red-500">
                <AlertCircle size={16} />
                <span>{validationErrors.email}</span>
              </div>
            ) : (
              <p className="mt-2 text-sm text-gray-500">
                Enter the email address associated with your account
              </p>
            )}
          </div>

          {/* Submit Button */}
          <button
            onClick={handleSubmit}
            className="w-full bg-gradient-to-r from-red-500 to-pink-600 text-white font-bold px-6 py-3 border-none rounded-xl text-base cursor-pointer transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105 focus:outline-none focus:ring-4 focus:ring-red-500/20 font-sans flex items-center justify-center gap-2 min-h-12 mb-4"
            disabled={isSubmitting || !!validationErrors.email || !email}
          >
            {isSubmitting ? (
              <>
                <div className="w-5 h-5 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
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
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
            <p className="text-sm text-blue-700">
              💡 Check your spam folder if you don't receive the email within a few minutes.
            </p>
          </div>

          {/* Back to Login Link */}
          <div className="text-center">
            <a href="/login" className="inline-flex items-center gap-2 text-red-500 font-semibold hover:underline">
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
