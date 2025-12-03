import { FaFacebookF, FaYoutube, FaLinkedin, FaTwitter } from "react-icons/fa";
import { RiInstagramFill } from "react-icons/ri";
import { Link } from "react-router-dom";
import "./layout-styles.css";

const Footer = () => {

  return (
    <footer className="footer">
      <div className="footer-content">

        <div className="footer-section">
          <h2 className="footer-brand">SkillConnect4b410</h2>
          <p className="footer-desc">
            Building modern solutions with simplicity and elegance.
          </p>
        </div>

        <div className="footer-section">
          <h3>Quick Links</h3>
          <ul className="footer-links">
            <li><Link to="/">Home</Link></li>
            <li><a href="/services">Services</a></li>
            <li><a href="/contact">Contact</a></li>
          </ul>
        </div>



        <div className="footer-section">
          <h3>Follow Us</h3>
          <div className="footer-socials">
            <a href="#" className="footer-social-link">
              <FaFacebookF />
            </a>
            <a href="#" className="footer-social-link">
              <RiInstagramFill />
            </a>
            <a href="#" className="footer-social-link">
              <FaTwitter />
            </a>
            <a href="#" className="footer-social-link">
              <FaLinkedin />
            </a>
            <a href="#" className="footer-social-link">
              <FaYoutube />
            </a>
          </div>
        </div>
      </div>

      <div className="footer-bottom">
        <p>Â© {new Date().getFullYear()} SkillConnect4b410. All rights reserved.</p>
        <div className="footer-legal">
          <a href="/terms">Terms & Conditions</a>
          <span className="footer-separator"> | </span>
          <a href="/privacy">Privacy Policy</a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
