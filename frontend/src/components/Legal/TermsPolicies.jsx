import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import TermsScreen from './TermsScreen';
import PrivacyScreen from './PrivacyScreen';
import './Legal.css';

const TermsPolicies = () => {
  const navigate = useNavigate();
  const [activeScreen, setActiveScreen] = useState(null);

  const handleBack = () => {
    if (activeScreen) {
      setActiveScreen(null);
    } else {
      navigate(-1); // Go back to previous page
    }
  };

  const handleTermsClick = () => {
    setActiveScreen('terms');
  };

  const handlePrivacyClick = () => {
    setActiveScreen('privacy');
  };

  // If a specific screen is active, render it
  if (activeScreen === 'terms') {
    return (
      <div>
        <button className="back-button" onClick={handleBack}>
          <i className="fas fa-arrow-left"></i>
          Back to Policies
        </button>
        <TermsScreen />
      </div>
    );
  }

  if (activeScreen === 'privacy') {
    return (
      <div>
        <button className="back-button" onClick={handleBack}>
          <i className="fas fa-arrow-left"></i>
          Back to Policies
        </button>
        <PrivacyScreen />
      </div>
    );
  }

  // Default view - policy selection
  return (
    <div className="terms-policies-container">
      <div className="terms-policies-header">
        <h1>Terms & Policies</h1>
        <p>Please review our terms and policies</p>
      </div>

      <div className="policies-grid">
        <div className="policy-card" onClick={handleTermsClick}>
          <i className="fas fa-file-contract policy-icon"></i>
          <h3>Terms and Conditions</h3>
          <p>
            Read our terms of service, user responsibilities, and platform guidelines
            that govern your use of SkillConnect.
          </p>
        </div>

        <div className="policy-card" onClick={handlePrivacyClick}>
          <i className="fas fa-shield-alt policy-icon"></i>
          <h3>Privacy Policy</h3>
          <p>
            Learn how we collect, use, and protect your personal information and
            maintain your privacy on our platform.
          </p>
        </div>
      </div>

      <div className="policy-footer">
        <p style={{ textAlign: 'center', color: '#666', fontSize: '0.9rem', marginTop: '20px' }}>
          By using SkillConnect, you agree to our Terms and Conditions and Privacy Policy.
        </p>
      </div>
    </div>
  );
};

export default TermsPolicies;
