import React from 'react';
import { useMainContext } from '../mainContext';

const AccountBanned = () => {
  const { user, logout } = useMainContext();

  const handleLogout = async () => {
    await logout();
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #dc3545 0%, #c82333 100%)',
      padding: '20px'
    }}>
      <div style={{
        background: 'white',
        borderRadius: '20px',
        padding: '40px',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.15)',
        textAlign: 'center',
        maxWidth: '500px',
        width: '100%'
      }}>
        <div style={{
          fontSize: '4rem',
          color: '#dc3545',
          marginBottom: '20px'
        }}>
          <i className="fas fa-ban" style={{
            animation: 'shake 0.5s ease-in-out'
          }}></i>
        </div>

        <h1 style={{
          color: '#333',
          marginBottom: '20px',
          fontSize: '2rem',
          fontWeight: '600'
        }}>Account Suspended</h1>

        <div style={{ marginBottom: '30px' }}>
          <p style={{ marginBottom: '10px', color: '#666', lineHeight: '1.6' }}>
            Hello <strong style={{ color: '#333' }}>{user?.firstName} {user?.lastName}</strong>,
          </p>
          <p style={{ marginBottom: '10px', color: '#666', lineHeight: '1.6' }}>
            Your account has been suspended due to violation of our community guidelines.
          </p>
          <p style={{ margin: '0', color: '#666', lineHeight: '1.6' }}>
            If you believe this suspension was made in error, please contact our support team for assistance.
          </p>
        </div>

        <div style={{
          background: '#f8f9fa',
          borderRadius: '12px',
          padding: '25px',
          marginBottom: '30px'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            marginBottom: '15px',
            color: '#555'
          }}>
            <i className="fas fa-envelope" style={{
              color: '#dc3545',
              marginRight: '12px',
              fontSize: '1.1rem',
              width: '20px'
            }}></i>
            <span style={{ fontSize: '0.95rem' }}>Contact support for account reinstatement</span>
          </div>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            marginBottom: '15px',
            color: '#555'
          }}>
            <i className="fas fa-shield-alt" style={{
              color: '#dc3545',
              marginRight: '12px',
              fontSize: '1.1rem',
              width: '20px'
            }}></i>
            <span style={{ fontSize: '0.95rem' }}>Review our community guidelines</span>
          </div>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            marginBottom: '0',
            color: '#555'
          }}>
            <i className="fas fa-question-circle" style={{
              color: '#dc3545',
              marginRight: '12px',
              fontSize: '1.1rem',
              width: '20px'
            }}></i>
            <span style={{ fontSize: '0.95rem' }}>Need help? Reach out to our support team</span>
          </div>
        </div>

        <div style={{ marginBottom: '30px' }}>
          <button
            style={{
              background: '#dc3545',
              color: 'white',
              border: 'none',
              padding: '12px 30px',
              borderRadius: '8px',
              fontSize: '1rem',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px'
            }}
            onClick={handleLogout}
            onMouseOver={(e) => {
              e.target.style.background = '#c82333';
              e.target.style.transform = 'translateY(-2px)';
              e.target.style.boxShadow = '0 4px 12px rgba(220, 53, 69, 0.3)';
            }}
            onMouseOut={(e) => {
              e.target.style.background = '#dc3545';
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = 'none';
            }}
          >
            <i className="fas fa-sign-out-alt"></i>
            Logout
          </button>
        </div>

        <div style={{
          color: '#888',
          fontSize: '0.9rem',
          fontStyle: 'italic'
        }}>
          <p style={{ margin: '0' }}>We appreciate your understanding.</p>
        </div>
      </div>

      <style jsx>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }

        @media (max-width: 768px) {
          .account-banned-container {
            padding: 15px !important;
          }

          .account-banned-card {
            padding: 30px 20px !important;
          }

          .banned-icon {
            font-size: 3rem !important;
          }

          .account-banned-card h1 {
            font-size: 1.5rem !important;
          }

          .banned-details {
            padding: 20px !important;
          }

          .detail-item {
            flex-direction: column !important;
            align-items: flex-start !important;
            text-align: left !important;
          }

          .detail-item i {
            margin-bottom: 5px !important;
          }
        }
      `}</style>
    </div>
  );
};

export default AccountBanned;
