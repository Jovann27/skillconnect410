import HeroSection from "./HeroSection";
import HowItWorks from "./HowItWorks";
import Mission from "./Mission";
import Announcement from "./Announcement";
import TeamSection from "./Officials";
import DevelopmentCards from "./DevelopmentCards";
import ContactForm from "./ContactForm";

const Home = () => {
  return (
    <div className="min-h-screen">
      <HeroSection />
      <Announcement />
      <Mission />
      <HowItWorks />
      <TeamSection id="#about" />
      <DevelopmentCards />
      <ContactForm />
    </div>
  );
};

export default Home;
