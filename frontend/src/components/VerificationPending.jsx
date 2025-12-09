import React from 'react';
import { useMainContext } from '../mainContext';

const VerificationPending = () => {
  const { user, logout } = useMainContext();

  const handleLogout = async () => {
    await logout();
  };
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-500 to-purple-600 p-4">
      <div className="bg-white rounded-3xl p-10 shadow-2xl text-center max-w-md w-full">
        <div className="text-6xl text-blue-500 mb-5 animate-pulse">
          <i className="fas fa-clock"></i>
        </div>

        <h1 className="text-gray-800 mb-5 text-3xl font-semibold">Account Verification Pending</h1>

        <div className="mb-8 text-gray-600 leading-relaxed">
          <p className="mb-2">Hello <strong className="text-gray-800">{user?.firstName} {user?.lastName}</strong>,</p>
          <p className="mb-2">Your account is currently under review by our administrators.</p>
          <p className="mb-2">You will receive access to the platform once your account has been verified.</p>
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
            className="bg-red-500 hover:bg-red-600 text-white border-none py-3 px-8 rounded-lg text-base font-medium cursor-pointer transition-all duration-300 inline-flex items-center gap-2 hover:-translate-y-1 hover:shadow-lg active:translate-y-0"
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
