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
    <section className="how-it-works-section">
      {/* Background Elements */}
      <div className="how-it-works-bg-blur-1"></div>
      <div className="how-it-works-bg-blur-2"></div>

      <div className="how-it-works-container">
        {/* Header */}
        <div className="how-it-works-header">
          <h2 className="how-it-works-title">How SkillConnect Works</h2>
          <p className="how-it-works-subtitle">
            Three simple steps to connect with skilled professionals or find your next opportunity in your local community
          </p>
        </div>

        {/* Steps Container */}
        <div className="how-it-works-grid">
          {steps.map((step, index) => {
            const IconComponent = step.icon;
            return (
              <div key={index} className="how-it-works-card-wrapper">
                {/* Connector Line */}
                {index < steps.length - 1 && (
                  <div className="how-it-works-connector">
                    <svg viewBox="0 0 100 100" preserveAspectRatio="none">
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
                <div className={`how-it-works-card bg-gradient-to-br ${step.bgGradient}`}>
                  {/* Step Number */}
                  <div className="how-it-works-step-number">{index + 1}</div>

                  {/* Icon */}
                  <div
                    className="how-it-works-icon-wrapper"
                    style={{
                      background: `linear-gradient(135deg, ${step.color} 0%, ${step.color}dd 100%)`,
                    }}
                  >
                    <IconComponent className="how-it-works-icon" />
                  </div>

                  {/* Content */}
                  <h3 className="how-it-works-card-title">{step.title}</h3>
                  <p className="how-it-works-card-description">{step.description}</p>

                  {/* Bottom Accent */}
                  <div className="how-it-works-card-accent" style={{ backgroundColor: step.color }}></div>
                </div>
              </div>
            );
          })}
        </div>

        {/* CTA Section */}
        <div className="how-it-works-cta">
          <h3>Ready to Get Started?</h3>
          <p>Join thousands of community members and skilled professionals already connected on SkillConnect</p>
          <div className="how-it-works-cta-buttons">
            <button className="how-it-works-btn how-it-works-btn-primary">
              <a href="/register">Create an Account</a>
            </button>
          </div>
        </div>
      </div>

      <style>{`
        .how-it-works-section {
          position: relative;
          padding: 5rem 1.5rem;
          background: linear-gradient(to bottom, #ffffff 0%, #f9fafb 100%);
          overflow: hidden;
        }

        @media (max-width: 768px) {
          .how-it-works-section {
            padding: 3rem 1rem;
          }
        }

        /* Background Blur Elements */
        .how-it-works-bg-blur-1 {
          position: absolute;
          top: -200px;
          right: -200px;
          width: 600px;
          height: 600px;
          background: radial-gradient(circle, rgba(225, 29, 72, 0.08) 0%, transparent 70%);
          border-radius: 50%;
          pointer-events: none;
        }

        .how-it-works-bg-blur-2 {
          position: absolute;
          bottom: -200px;
          left: -200px;
          width: 600px;
          height: 600px;
          background: radial-gradient(circle, rgba(99, 102, 241, 0.08) 0%, transparent 70%);
          border-radius: 50%;
          pointer-events: none;
        }

        /* Container */
        .how-it-works-container {
          position: relative;
          z-index: 2;
          max-width: 1200px;
          margin: 0 auto;
        }

        /* ========================================
           HEADER
           ======================================== */

        .how-it-works-header {
          text-align: center;
          margin-bottom: 4rem;
        }

        .how-it-works-badge {
          display: inline-block;
          padding: 0.75rem 1.5rem;
          background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%);
          border-radius: 50px;
          font-size: 0.85rem;
          font-weight: 600;
          color: #be123c;
          margin-bottom: 1rem;
          text-transform: uppercase;
          letter-spacing: 1px;
        }

        .how-it-works-title {
          font-size: 2.75rem;
          font-weight: 800;
          color: #111827;
          margin: 0 0 1rem 0;
          background: linear-gradient(135deg, #e11d48 0%, #6366f1 50%, #10b981 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          line-height: 1.2;
        }

        @media (max-width: 768px) {
          .how-it-works-title {
            font-size: 2rem;
          }
        }

        .how-it-works-subtitle {
          font-size: 1.1rem;
          color: #6b7280;
          max-width: 600px;
          margin: 0 auto;
          line-height: 1.6;
        }

        @media (max-width: 768px) {
          .how-it-works-subtitle {
            font-size: 1rem;
          }
        }

        /* ========================================
           GRID & CARDS
           ======================================== */

        .how-it-works-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 2.5rem;
          margin-bottom: 4rem;
        }

        @media (max-width: 768px) {
          .how-it-works-grid {
            gap: 2rem;
          }
        }

        .how-it-works-card-wrapper {
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        /* Connector Lines */
        .how-it-works-connector {
          position: absolute;
          top: 120px;
          left: 100%;
          width: 100%;
          height: 4px;
          display: none;
        }

        @media (min-width: 769px) {
          .how-it-works-connector {
            display: block;
          }
        }

        .how-it-works-connector svg {
          width: 100%;
          height: 100%;
        }

        /* Card */
        .how-it-works-card {
          position: relative;
          background: white;
          border-radius: 1.5rem;
          padding: 2.5rem 2rem;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
          transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
          border: 1px solid rgba(255, 255, 255, 0.8);
          overflow: hidden;
          height: 100%;
          display: flex;
          flex-direction: column;
        }

        .how-it-works-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 4px;
          background: linear-gradient(90deg, #e11d48, #6366f1, #10b981);
          opacity: 0;
          transition: opacity 0.3s ease;
        }

        .how-it-works-card:hover {
          transform: translateY(-12px);
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.12);
          border-color: rgba(225, 29, 72, 0.1);
        }

        .how-it-works-card:hover::before {
          opacity: 1;
        }

        /* Step Number */
        .how-it-works-step-number {
          position: absolute;
          top: -15px;
          right: 20px;
          width: 60px;
          height: 60px;
          background: linear-gradient(135deg, #e11d48 0%, #ec4899 100%);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.75rem;
          font-weight: 800;
          color: white;
          box-shadow: 0 8px 20px rgba(225, 29, 72, 0.3);
        }

        .how-it-works-card:nth-child(2) .how-it-works-step-number {
          background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
          box-shadow: 0 8px 20px rgba(99, 102, 241, 0.3);
        }

        .how-it-works-card:nth-child(3) .how-it-works-step-number {
          background: linear-gradient(135deg, #10b981 0%, #14b8a6 100%);
          box-shadow: 0 8px 20px rgba(16, 185, 129, 0.3);
        }

        /* Icon Wrapper */
        .how-it-works-icon-wrapper {
          width: 80px;
          height: 80px;
          border-radius: 1.25rem;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 1.5rem;
          box-shadow: 0 8px 20px rgba(225, 29, 72, 0.2);
          transition: transform 0.3s ease;
        }

        .how-it-works-card:hover .how-it-works-icon-wrapper {
          transform: scale(1.1) rotateZ(5deg);
        }

        .how-it-works-icon {
          font-size: 2.5rem;
          color: white;
        }

        /* Card Title */
        .how-it-works-card-title {
          font-size: 1.3rem;
          font-weight: 700;
          color: #111827;
          margin: 0 0 1rem 0;
          text-align: center;
        }

        /* Card Description */
        .how-it-works-card-description {
          font-size: 0.95rem;
          color: #6b7280;
          line-height: 1.6;
          margin: 0;
          text-align: center;
          flex: 1;
        }

        /* Card Accent */
        .how-it-works-card-accent {
          height: 3px;
          width: 40px;
          margin: 1.5rem auto 0;
          border-radius: 2px;
          opacity: 0;
          transition: opacity 0.3s ease;
        }

        .how-it-works-card:hover .how-it-works-card-accent {
          opacity: 1;
        }

        /* ========================================
           CTA SECTION
           ======================================== */

        .how-it-works-cta {
          background: linear-gradient(135deg, #4f46e5 0%, #6366f1 50%, #a78bfa 100%);
          border-radius: 2rem;
          padding: 3rem 2rem;
          text-align: center;
          color: white;
          position: relative;
          overflow: hidden;
        }

        .how-it-works-cta::before {
          content: '';
          position: absolute;
          top: -50%;
          right: -50%;
          width: 500px;
          height: 500px;
          background: radial-gradient(circle, rgba(255, 255, 255, 0.1) 0%, transparent 70%);
          border-radius: 50%;
          pointer-events: none;
        }

        .how-it-works-cta::after {
          content: '';
          position: absolute;
          bottom: -50%;
          left: -50%;
          width: 500px;
          height: 500px;
          background: radial-gradient(circle, rgba(255, 255, 255, 0.05) 0%, transparent 70%);
          border-radius: 50%;
          pointer-events: none;
        }

        .how-it-works-cta h3 {
          position: relative;
          z-index: 2;
          font-size: 2rem;
          font-weight: 800;
          margin: 0 0 0.5rem 0;
        }

        @media (max-width: 768px) {
          .how-it-works-cta h3 {
            font-size: 1.5rem;
          }
        }

        .how-it-works-cta p {
          position: relative;
          z-index: 2;
          font-size: 1.1rem;
          opacity: 0.95;
          margin: 0 0 2rem 0;
          max-width: 500px;
          margin-left: auto;
          margin-right: auto;
        }

        @media (max-width: 768px) {
          .how-it-works-cta p {
            font-size: 1rem;
          }
        }

        /* CTA Buttons */
        .how-it-works-cta-buttons {
          position: relative;
          z-index: 2;
          display: flex;
          gap: 1rem;
          justify-content: center;
          flex-wrap: wrap;
        }

        .how-it-works-btn {
          padding: 1rem 2rem;
          border-radius: 0.75rem;
          font-size: 1rem;
          font-weight: 600;
          border: none;
          cursor: pointer;
          transition: all 0.3s ease;
          text-decoration: none;
        }

        .how-it-works-btn-primary {
          background: white;
          color: #6366f1;
          box-shadow: 0 8px 20px rgba(0, 0, 0, 0.15);
        }

        .how-it-works-btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 12px 30px rgba(0, 0, 0, 0.2);
        }

        .how-it-works-btn-secondary {
          background: transparent;
          color: white;
          border: 2px solid white;
        }

        .how-it-works-btn-secondary:hover {
          background: white;
          color: #6366f1;
          transform: translateY(-2px);
        }

        @media (max-width: 480px) {
          .how-it-works-cta {
            padding: 2rem 1rem;
          }

          .how-it-works-btn {
            padding: 0.875rem 1.5rem;
            font-size: 0.9rem;
            flex: 1;
            min-width: 150px;
          }

          .how-it-works-cta-buttons {
            flex-direction: column;
          }
        }
      `}</style>
    </section>
  );
};

export default HowItWorks;
