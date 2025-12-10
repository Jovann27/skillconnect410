import { FaFacebookF, FaYoutube, FaLinkedin, FaTwitter } from "react-icons/fa";
import { RiInstagramFill } from "react-icons/ri";
import { Link } from "react-router-dom";

const Footer = () => {
  return (
    <footer className="bg-gradient-to-br from-pink-600 to-pink-400 text-white py-10 px-5 mt-auto relative overflow-hidden">
      <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-white">
            SkillConnect4b410
          </h2>
          <p className="text-white/90 leading-relaxed font-medium drop-shadow-lg">
            Building modern solutions with simplicity and elegance.
          </p>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Quick Links</h3>
          <ul className="space-y-2">
            <li>
              <Link to="/" className="text-white/90 hover:text-yellow-300 transition-colors duration-200 font-medium drop-shadow-lg">
                Home
              </Link>
            </li>
            <li>
              <a href="/services" className="text-white/90 hover:text-yellow-300 transition-colors duration-200 font-medium drop-shadow-lg">
                Services
              </a>
            </li>
            <li>
              <a href="/contact" className="text-white/90 hover:text-yellow-300 transition-colors duration-200 font-medium drop-shadow-lg">
                Contact
              </a>
            </li>
          </ul>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Follow Us</h3>
          <div className="flex gap-4">
            <a
              href="#"
              className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center hover:bg-white/30 transition-colors duration-200 transform hover:scale-110"
            >
              <FaFacebookF />
            </a>
            <a
              href="#"
              className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center hover:bg-white/30 transition-colors duration-200 transform hover:scale-110"
            >
              <RiInstagramFill />
            </a>
            <a
              href="#"
              className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center hover:bg-white/30 transition-colors duration-200 transform hover:scale-110"
            >
              <FaTwitter />
            </a>
            <a
              href="#"
              className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center hover:bg-white/30 transition-colors duration-200 transform hover:scale-110"
            >
              <FaLinkedin />
            </a>
            <a
              href="#"
              className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center hover:bg-white/30 transition-colors duration-200 transform hover:scale-110"
            >
              <FaYoutube />
            </a>
          </div>
        </div>
      </div>

      <div className="border-t border-white/20 mt-8 pt-8 flex flex-col md:flex-row justify-between items-center">
        <p className="text-white/80 font-medium">
          © {new Date().getFullYear()} SkillConnect4b410. All rights reserved.
        </p>
        <div className="flex items-center gap-4 mt-4 md:mt-0">
          <a href="/terms" className="text-white/80 hover:text-yellow-300 transition-colors duration-200 font-medium drop-shadow-lg">
            Terms & Conditions
          </a>
          <span className="text-white/60">|</span>
          <a href="/privacy" className="text-white/80 hover:text-yellow-300 transition-colors duration-200 font-medium drop-shadow-lg">
            Privacy Policy
          </a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
