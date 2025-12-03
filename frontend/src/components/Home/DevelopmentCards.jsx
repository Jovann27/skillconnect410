
// Removed commented out image imports - using online images instead
import "./home-styles.css";

const DevelopmentCards = () => {
  return (
    <div style={{ background: 'linear-gradient(135deg, #f8d8ea98 0%, #eca7cd83 50%, #fac0fa88 100%)', padding: '2rem 0' }}>
      <h1 className="hero-title" style={{ textAlign: 'center', fontSize: '2.5rem' }}>The People Behind the Work</h1>
      <div className="development-cards">
        <div className="dev-card">
          <img src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=300&h=200&fit=crop" alt="Encourage Skill Development" />
          <h4>Encourage Skill Development</h4>
          <p>Providing continuous training and education programs to equip individuals with necessary skills.</p>
        </div>
        <div className="dev-card">
          <img src="https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=300&h=200&fit=crop" alt="Expand Career Opportunities" />
          <h4>Expand Career Opportunities</h4>
          <p>Offering pathways for employment and advancement across various fields.</p>
        </div>
        <div className="dev-card">
          <img src="https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=300&h=200&fit=crop" alt="Promote Sustainable Livelihood" />
          <h4>Promote Sustainable Livelihood</h4>
          <p>Supporting sustainable projects that help maintain long-term economic growth for residents.</p>
        </div>
      </div>
    </div>
  );
};

export default DevelopmentCards;
