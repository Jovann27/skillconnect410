import { Link } from "react-router-dom";
import { FaArrowRight, FaTools, FaSearch, FaUsers, FaStar } from "react-icons/fa";

const HeroSection = () => {
  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-pink-100 via-pink-200 to-pink-300">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,_white_1px,_transparent_0)] bg-[length:20px_20px]"></div>
      </div>

      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent"></div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div className="text-gray-800">
          <h6 className="text-lg md:text-xl font-medium mb-4 opacity-90">Welcome to</h6>
          <div className="mb-6">
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-black mb-4 bg-gradient-to-r from-gray-800 via-pink-800 to-gray-900 bg-clip-text text-transparent">
              SkillConnect 4B410
            </h1>
            <div className="w-32 h-1 bg-gradient-to-r from-pink-400 to-pink-400 mx-auto rounded-full"></div>
          </div>
          <div className="mb-8">
            <h4 className="text-xl md:text-2xl font-semibold text-gray-800">BARANGAY 410 ZONE 42</h4>
          </div>
          <p className="text-lg md:text-xl text-gray-700 max-w-3xl mx-auto leading-relaxed mb-12">
            Connecting skilled workers with opportunities in Barangay 410 Zone 42.
            Find local services, post your skills, and build a stronger community together.
            Join our network of local professionals and discover new possibilities.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-6 justify-center mb-12">
          <Link
            to="/register"
            className="group bg-white text-pink-600 px-8 py-4 rounded-full font-bold text-lg hover:bg-pink-50 transition-all duration-300 shadow-xl hover:shadow-2xl transform hover:-translate-y-1 flex items-center justify-center space-x-3"
          >
            <FaTools className="text-xl group-hover:rotate-12 transition-transform duration-300" />
            <span>Find Services</span>
            <FaArrowRight className="text-xl group-hover:translate-x-1 transition-transform duration-300" />
          </Link>
          <Link
            to="/register"
            className="group bg-pink-700 border-2 border-pink-700 text-white px-8 py-4 rounded-full font-bold text-lg hover:bg-white hover:text-pink-700 hover:border-white transition-all duration-300 shadow-xl hover:shadow-2xl transform hover:-translate-y-1 flex items-center justify-center space-x-3"
          >
            <FaUsers className="text-xl group-hover:rotate-12 transition-transform duration-300" />
            <span>Provide a Service</span>
            <FaArrowRight className="text-xl group-hover:translate-x-1 transition-transform duration-300" />
          </Link>
        </div>

        {/* Trust Indicators */}
        <div className="flex flex-col sm:flex-row gap-8 justify-center">
          <div className="flex items-center space-x-3 text-gray-800">
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
              <FaStar className="text-yellow-400 text-xl" />
            </div>
            <span className="font-medium">Verified Professionals</span>
          </div>
          <div className="flex items-center space-x-3 text-gray-800">
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
              <FaUsers className="text-green-400 text-xl" />
            </div>
            <span className="font-medium">Local Community</span>
          </div>
          <div className="flex items-center space-x-3 text-gray-800">
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
              <FaSearch className="text-pink-400 text-xl" />
            </div>
            <span className="font-medium">Easy to Find Services</span>
          </div>
        </div>
      </div>

      {/* Floating Elements */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-16 h-16 bg-white/10 rounded-full flex items-center justify-center animate-bounce">
          <FaTools className="text-white text-2xl" />
        </div>
        <div className="absolute top-3/4 right-1/4 w-16 h-16 bg-white/10 rounded-full flex items-center justify-center animate-bounce delay-1000">
          <FaUsers className="text-white text-2xl" />
        </div>
        <div className="absolute bottom-1/4 left-1/3 w-16 h-16 bg-white/10 rounded-full flex items-center justify-center animate-bounce delay-500">
          <FaStar className="text-white text-2xl" />
        </div>
      </div>
    </div>
  );
};

export default HeroSection;
