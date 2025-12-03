import { Link } from "react-router-dom";
import { FaArrowRight, FaTools, FaSearch, FaUsers, FaStar } from "react-icons/fa";

const HeroSection = () => {


  return (
    <div className="hero">
      <div className="hero-background">
        <div className="hero-pattern"></div>
        <div className="hero-gradient"></div>
      </div>

      <div className="hero-content">
        <div className="hero-text">
          <h6 className="hero-welcome">Welcome to</h6>
          <div className="hero-title-container">
            <h1 className="hero-title">
              SkillConnect 4B410
            </h1>
            <div className="hero-title-underline"></div>
          </div>
          <div className="hero-subtitle">
            <h4>BARANGAY 410 ZONE 42</h4>
          </div>
          <p className="hero-description">
            Connecting skilled workers with opportunities in Barangay 410 Zone 42.
            Find local services, post your skills, and build a stronger community together.
            Join our network of local professionals and discover new possibilities.
          </p>
        </div>
        
        <div className="hero-buttons">
          <Link to="/register" className="cta-button primary hero-cta">
            <FaTools className="btn-icon" />
            Find Services
            <FaArrowRight className="btn-arrow" />
          </Link>
          <Link to="/register" className="cta-button secondary hero-cta">
            <FaUsers className="btn-icon" />
            Provide a Service
            <FaArrowRight className="btn-arrow" />
          </Link>
        </div>

        {/* Trust Indicators */}
        <div className="hero-trust">
          <div className="trust-item">
            <FaStar className="trust-icon" />
            <span>Verified Professionals</span>
          </div>
          <div className="trust-item">
            <FaUsers className="trust-icon" />
            <span>Local Community</span>
          </div>
          <div className="trust-item">
            <FaSearch className="trust-icon" />
            <span>Easy to Find Services</span>
          </div>
        </div>
      </div>

      {/* Floating Elements */}
      <div className="hero-floating-elements">
        <div className="floating-element element-1">
          <FaTools />
        </div>
        <div className="floating-element element-2">
          <FaUsers />
        </div>
        <div className="floating-element element-3">
          <FaStar />
        </div>
      </div>
    </div>
  );
};

export default HeroSection;