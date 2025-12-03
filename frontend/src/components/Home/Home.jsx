import HeroSection from "./HeroSection";
import HowItWorks from "./HowItWorks";
import Mission from "./Mission";
import Announcement from "./Announcement";
import TeamSection from "./Officials";
import DevelopmentCards from "./DevelopmentCards";
import ContactForm from "./ContactForm";
import "./home-styles.css";
import "./about.css";

const Home = () => {
  
  return (
    <>
      <section className="homePage page">
        <HeroSection />
        <Announcement />
        <Mission />
        <HowItWorks />
       <TeamSection id="#about" />
        <DevelopmentCards />
        <ContactForm />
      </section>
    </>
  );
};

export default Home;
