import React from 'react';
import { useMainContext } from '../mainContext';
import './VerificationPending.css';

const VerificationPending = () => {
  const { user, logout } = useMainContext();

  const handleLogout = async () => {
    await logout();
  };

  return (
    <div className="verification-pending-container">
      <div className="verification-pending-card">
        <div className="verification-icon">
          <i className="fas fa-clock"></i>
        </div>

        <h1>Account Verification Pending</h1>

        <div className="verification-message">
          <p>Hello <strong>{user?.firstName} {user?.lastName}</strong>,</p>
          <p>Your account is currently under review by our administrators.</p>
          <p>You will receive access to the platform once your account has been verified.</p>
        </div>

        <div className="verification-details">
          <div className="detail-item">
            <i className="fas fa-envelope"></i>
            <span>Check your email for verification updates</span>
          </div>
          <div className="detail-item">
            <i className="fas fa-user-shield"></i>
            <span>Verification typically takes 1-3 business days</span>
          </div>
          <div className="detail-item">
            <i className="fas fa-phone"></i>
            <span>Contact support if you have questions</span>
          </div>
        </div>

        <div className="verification-actions">
          <button
            className="logout-btn"
            onClick={handleLogout}
          >
            <i className="fas fa-sign-out-alt"></i>
            Logout
          </button>
        </div>

        <div className="verification-footer">
          <p>Thank you for your patience!</p>
        </div>
      </div>
    </div>
  );
};

export default VerificationPending;
