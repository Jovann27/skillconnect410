import React from 'react';
import { useMainContext } from '../mainContext';

const VerificationPending = () => {
  const { user, logout } = useMainContext();

  const handleLogout = async () => {
    await logout();
  };
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-500 to-purple-600 p-4">
      <div className="bg-white rounded-3xl p-8 md:p-12 shadow-2xl text-center max-w-lg w-full">
        <div className="text-6xl text-blue-500 mb-6 animate-pulse">
          <i className="fas fa-clock"></i>
        </div>

        <h1 className="text-gray-900 mb-6 text-3xl md:text-4xl font-bold">Account Verification Pending</h1>

        <div className="mb-8 text-gray-600 leading-relaxed">
          <p className="mb-3">
            Hello <strong className="text-gray-900">{user?.firstName} {user?.lastName}</strong>,
          </p>
          <p className="mb-3">
            Your account is currently under review by our administrators.
          </p>
          <p className="mb-3">
            You will receive access to the platform once your account has been verified.
          </p>
        </div>

        <div className="bg-gray-50 rounded-xl p-6 mb-8">
          <div className="flex items-center mb-4 text-gray-700">
            <i className="fas fa-envelope text-blue-500 mr-3 text-lg w-5"></i>
            <span className="text-sm">Check your email for verification updates</span>
          </div>
          <div className="flex items-center mb-4 text-gray-700">
            <i className="fas fa-user-shield text-blue-500 mr-3 text-lg w-5"></i>
            <span className="text-sm">Verification typically takes 1-3 business days</span>
          </div>
          <div className="flex items-center text-gray-700">
            <i className="fas fa-phone text-blue-500 mr-3 text-lg w-5"></i>
            <span className="text-sm">Contact support if you have questions</span>
          </div>
        </div>

        <div className="mb-8">
          <button
            className="bg-red-500 hover:bg-red-600 text-white px-8 py-3 rounded-lg font-medium transition-all duration-300 inline-flex items-center gap-2 hover:-translate-y-1 hover:shadow-lg"
            onClick={handleLogout}
          >
            <i className="fas fa-sign-out-alt"></i>
            Logout
          </button>
        </div>

        <div className="text-gray-500 text-sm italic">
          <p>Thank you for your patience!</p>
        </div>
      </div>
    </div>
  );
};

export default VerificationPending;
