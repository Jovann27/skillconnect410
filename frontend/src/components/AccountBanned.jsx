import React from 'react';
import { useMainContext } from '../mainContext';
import './AccountBanned.css';

const AccountBanned = () => {
  const { user, logout } = useMainContext();

  const handleLogout = async () => {
    await logout();
  };

  return (
    <div className="account-banned-container">
      <div className="account-banned-card">
        <div className="banned-icon">
          <i className="fas fa-ban"></i>
        </div>

        <h1>Account Suspended</h1>

        <div className="banned-message">
          <p>Hello <strong>{user?.firstName} {user?.lastName}</strong>,</p>
          <p>Your account has been suspended due to violation of our community guidelines.</p>
          <p>If you believe this suspension was made in error, please contact our support team for assistance.</p>
        </div>

        <div className="banned-details">
          <div className="detail-item">
            <i className="fas fa-envelope"></i>
            <span>Contact support for account reinstatement</span>
          </div>
          <div className="detail-item">
            <i className="fas fa-shield-alt"></i>
            <span>Review our community guidelines</span>
          </div>
          <div className="detail-item">
            <i className="fas fa-question-circle"></i>
            <span>Need help? Reach out to our support team</span>
          </div>
        </div>

        <div className="banned-actions">
          <button
            className="logout-btn"
            onClick={handleLogout}
          >
            <i className="fas fa-sign-out-alt"></i>
            Logout
          </button>
        </div>

        <div className="banned-footer">
          <p>We appreciate your understanding.</p>
        </div>
      </div>
    </div>
  );
};

export default AccountBanned;
