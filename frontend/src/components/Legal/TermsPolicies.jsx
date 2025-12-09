import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import TermsScreen from './TermsScreen';
import PrivacyScreen from './PrivacyScreen';

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
      <div className="min-h-screen bg-gray-50">
        <button
          className="inline-flex items-center gap-2 px-5 py-3 mb-5 bg-gray-600 hover:bg-gray-700 text-white border-none rounded-full font-semibold cursor-pointer transition-colors duration-200"
          onClick={handleBack}
        >
          <i className="fas fa-arrow-left"></i>
          Back to Policies
        </button>
        <TermsScreen />
      </div>
    );
  }

  if (activeScreen === 'privacy') {
    return (
      <div className="min-h-screen bg-gray-50">
        <button
          className="inline-flex items-center gap-2 px-5 py-3 mb-5 bg-gray-600 hover:bg-gray-700 text-white border-none rounded-full font-semibold cursor-pointer transition-colors duration-200"
          onClick={handleBack}
        >
          <i className="fas fa-arrow-left"></i>
          Back to Policies
        </button>
        <PrivacyScreen />
      </div>
    );
  }

  // Default view - policy selection
  return (
    <div className="max-w-2xl mx-auto p-5 bg-gray-50 min-h-screen">
      <div className="text-center mb-8">
        <h1 className="text-gray-800 text-4xl mb-3 font-bold">Terms & Policies</h1>
        <p className="text-gray-600 text-base m-0">Please review our terms and policies</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
        <div
          className="bg-white rounded-xl p-6 shadow-lg border border-gray-200 transition-all duration-200 cursor-pointer text-center hover:-translate-y-1 hover:shadow-xl"
          onClick={handleTermsClick}
        >
          <i className="fas fa-file-contract text-6xl text-pink-600 mb-4"></i>
          <h3 className="text-gray-800 text-xl mb-3 font-semibold">Terms and Conditions</h3>
          <p className="text-gray-600 text-sm leading-relaxed m-0">
            Read our terms of service, user responsibilities, and platform guidelines
            that govern your use of SkillConnect.
          </p>
        </div>

        <div
          className="bg-white rounded-xl p-6 shadow-lg border border-gray-200 transition-all duration-200 cursor-pointer text-center hover:-translate-y-1 hover:shadow-xl"
          onClick={handlePrivacyClick}
        >
          <i className="fas fa-shield-alt text-6xl text-pink-600 mb-4"></i>
          <h3 className="text-gray-800 text-xl mb-3 font-semibold">Privacy Policy</h3>
          <p className="text-gray-600 text-sm leading-relaxed m-0">
            Learn how we collect, use, and protect your personal information and
            maintain your privacy on our platform.
          </p>
        </div>
      </div>

      <div className="text-center text-gray-600 text-sm mt-8">
        <p>
          By using SkillConnect, you agree to our Terms and Conditions and Privacy Policy.
        </p>
      </div>
    </div>
  );
};

export default TermsPolicies;
