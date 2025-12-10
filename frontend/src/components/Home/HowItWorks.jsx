import { FaUserPlus } from "react-icons/fa";
import { MdFindInPage } from "react-icons/md";
import { IoMdSend } from "react-icons/io";

const HowItWorks = () => {
  const steps = [
    {
      icon: FaUserPlus,
      title: "Create Account",
      description: "Sign up in seconds and set up your profile. Choose your role as a Service Provider or Community Member and start connecting with others.",
      color: "#e11d48",
      bgGradient: "from-rose-50 to-pink-50"
    },
    {
      icon: MdFindInPage,
      title: "Find or Post Services",
      description: "Browse available services in your area or post your own offerings. Filter by category, location, and ratings to find the perfect match.",
      color: "#6366f1",
      bgGradient: "from-indigo-50 to-blue-50"
    },
    {
      icon: IoMdSend,
      title: "Connect & Collaborate",
      description: "Apply for services, send messages, and finalize arrangements. Work together seamlessly with built-in communication tools.",
      color: "#10b981",
      bgGradient: "from-emerald-50 to-teal-50"
    }
  ];

  return (
    <section className="relative py-20 px-6 md:px-12 bg-gradient-to-b from-white to-gray-50 overflow-hidden">
      {/* Background Blur Elements */}
      <div className="absolute -top-32 -right-32 w-96 h-96 bg-pink-100 rounded-full blur-3xl opacity-30"></div>
      <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-pink-100 rounded-full blur-3xl opacity-30"></div>

      <div className="relative z-10 max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4 bg-gradient-to-r from-pink-500 via-pink-500 to-pink-500 bg-clip-text text-transparent">
            How SkillConnect Works
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed">
            Three simple steps to connect with skilled professionals or find your next opportunity in your local community
          </p>
        </div>

        {/* Steps Container */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-16">
          {steps.map((step, index) => {
            const IconComponent = step.icon;
            return (
              <div key={index} className="relative flex flex-col items-center">
                {/* Connector Line */}
                {index < steps.length - 1 && (
                  <div className="hidden lg:block absolute top-24 left-full w-full h-1 z-0">
                    <svg viewBox="0 0 100 100" className="w-full h-full">
                      <defs>
                        <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="#e11d48" />
                          <stop offset="50%" stopColor="#6366f1" />
                          <stop offset="100%" stopColor="#10b981" />
                        </linearGradient>
                      </defs>
                      <line x1="0" y1="50" x2="100" y2="50" stroke="url(#gradient)" strokeWidth="3" />
                      <circle cx="100" cy="50" r="5" fill="url(#gradient)" />
                    </svg>
                  </div>
                )}

                {/* Card */}
                <div className="relative bg-white rounded-3xl p-8 shadow-lg hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-3 border border-gray-100 flex flex-col h-full group overflow-hidden">
                  {/* Gradient Border */}
                  <div className="absolute inset-0 bg-gradient-to-r from-pink-500 via-blue-500 to-green-500 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  <div className="absolute inset-[2px] bg-white rounded-3xl"></div>

                  <div className="relative z-10 flex flex-col h-full">
                    {/* Step Number */}
                    <div className={`absolute -top-4 -right-4 w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold text-white shadow-lg ${
                      index === 0 ? 'bg-gradient-to-r from-pink-500 to-rose-500' :
                      index === 1 ? 'bg-gradient-to-r from-blue-500 to-indigo-500' :
                      'bg-gradient-to-r from-green-500 to-teal-500'
                    }`}>
                      {index + 1}
                    </div>

                    {/* Icon */}
                    <div className={`w-20 h-20 rounded-2xl flex items-center justify-center mb-6 shadow-lg transition-all duration-300 group-hover:scale-110 group-hover:rotate-6 ${
                      index === 0 ? 'bg-gradient-to-r from-pink-500 to-rose-500' :
                      index === 1 ? 'bg-gradient-to-r from-blue-500 to-indigo-500' :
                      'bg-gradient-to-r from-green-500 to-teal-500'
                    }`}>
                      <IconComponent className="text-3xl text-white" />
                    </div>

                    {/* Content */}
                    <h3 className="text-xl font-bold text-gray-900 mb-4 text-center">{step.title}</h3>
                    <p className="text-gray-600 text-center leading-relaxed flex-grow">{step.description}</p>

                    {/* Bottom Accent */}
                    <div className={`h-1 w-12 mx-auto mt-6 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${
                      index === 0 ? 'bg-pink-500' :
                      index === 1 ? 'bg-blue-500' :
                      'bg-green-500'
                    }`}></div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* CTA Section */}
        <div className="relative bg-gradient-to-r from-pink-600 via-pink-600 to-pink-800 rounded-3xl p-8 md:p-12 text-center text-white overflow-hidden">
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-white/10 rounded-full"></div>
          <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-white/5 rounded-full"></div>

          <div className="relative z-10">
            <h3 className="text-3xl md:text-4xl font-bold mb-4">Ready to Get Started?</h3>
            <p className="text-lg opacity-90 mb-8 max-w-md mx-auto">
              Join thousands of community members and skilled professionals already connected on SkillConnect
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href="/register"
                className="bg-white text-pink-600 px-8 py-3 rounded-xl font-semibold hover:bg-gray-50 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
              >
                Create an Account
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
