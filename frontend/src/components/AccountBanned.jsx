import React from 'react';
import { useMainContext } from '../mainContext';

const AccountBanned = () => {
  const { user, logout } = useMainContext();

  const handleLogout = async () => {
    await logout();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-500 to-red-700 p-4">
      <div className="bg-white rounded-3xl p-8 md:p-12 shadow-2xl text-center max-w-lg w-full">
        <div className="text-6xl text-red-500 mb-6 animate-bounce">
          <i className="fas fa-ban"></i>
        </div>

        <h1 className="text-gray-900 mb-6 text-3xl font-bold">Account Suspended</h1>

        <div className="mb-8 text-gray-600 leading-relaxed">
          <p className="mb-3">
            Hello <strong className="text-gray-900">{user?.firstName} {user?.lastName}</strong>,
          </p>
          <p className="mb-3">
            Your account has been suspended due to violation of our community guidelines.
          </p>
          <p className="mb-0">
            If you believe this suspension was made in error, please contact our support team for assistance.
          </p>
        </div>

        <div className="bg-gray-50 rounded-xl p-6 mb-8">
          <div className="flex items-center mb-4 text-gray-700">
            <i className="fas fa-envelope text-red-500 mr-3 text-lg w-5"></i>
            <span className="text-sm">Contact support for account reinstatement</span>
          </div>
          <div className="flex items-center mb-4 text-gray-700">
            <i className="fas fa-shield-alt text-red-500 mr-3 text-lg w-5"></i>
            <span className="text-sm">Review our community guidelines</span>
          </div>
          <div className="flex items-center text-gray-700">
            <i className="fas fa-question-circle text-red-500 mr-3 text-lg w-5"></i>
            <span className="text-sm">Need help? Reach out to our support team</span>
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
          <p>We appreciate your understanding.</p>
        </div>
      </div>
    </div>
  );
};

export default AccountBanned;
