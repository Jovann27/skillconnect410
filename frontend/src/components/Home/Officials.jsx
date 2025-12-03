import chairwomanImage from './images/Chairwoman.png';
import skChairwomanImage from './images/skChiarwoman.png';
import kagwadomarImage from './images/Kagwadomar.png';
import treasurerImage from './images/treasurer.png';
import firedImage from './images/Fired.png';
import img0028 from './images/DSC_0028-removebg-preview.png';
import img9666 from './images/DSC_9666-removebg-preview.png';
import img9677 from './images/DSC_9677-removebg-preview.png';
import img9822 from './images/DSC_9822-removebg-preview.png';
import img9860 from './images/DSC_9860-removebg-preview (1).png';
import img9875 from './images/DSC_9875-removebg-preview.png';
const styles = `
  .team-section {
    min-height: 100vh;
    background: linear-gradient(135deg,hsl(308, 100.00%, 91.40%) 0%,rgb(252, 206, 232) 30%,rgba(250, 225, 234, 0.88) 70%,rgb(255, 255, 255) 100%);
    padding: 4rem 1rem;
  }

  .team-container {
    max-width: 1152px;
    margin: 0 auto;
  }

  .team-header {
    text-align: center;
    margin-bottom: 5rem;
  }

  .team-label {
    color: #3b82f6;
    font-size: 0.875rem;
    font-weight: 500;
    margin-bottom: 1rem;
  }

  .team-title {
    font-size: 3.75rem;
    font-weight: 700;
    color: #111827;
    margin-bottom: 0.5rem;
  }

  .team-subtitle {
    font-size: 3rem;
    font-weight: 400;
    color: #9ca3af;
    margin-bottom: 2rem;
  }

  .team-description {
    color: #374151;
    max-width: 36rem;
    margin: 0 auto;
    font-size: 1rem;
    line-height: 1.75;
  }

  .team-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 4rem 2rem;
  }

  .team-member {
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 80%;
    height: 310px;
    background-color: #ffffff;
    border-radius: 0.5rem;
    padding: 5px;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 
      0 2px 4px -2px rgba(0, 0, 0, 0.06);
  }


  .team-member-container {
    width: 10rem;
    height: 16rem;
    margin-bottom: 1rem;
  }

  .team-member-image-container {
   width: 100%;
   height: 100%;

  }
  .team-member-image-container img {
    width: 90%;
    height: 90%;
    margin: 0 auto;
    object-fit: cover;
  }

  .team-member:hover {
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  }

  .team-member-image {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform 0.3s ease;
  }

  .team-member:hover .team-member-image {
    transform: scale(1.05);
  }

  .team-member-role {
    font-size: 1rem;
    color: #000000ff;
    transition: color 0.3s ease;
    font-weight: 600;
    text-shadow: 1px 2px 3px #00000066;
  }



  @media (max-width: 1024px) {
    .team-grid {
      grid-template-columns: repeat(2, 1fr);
      gap: 3rem 2rem;
    }

    .team-title {
      font-size: 3rem;
    }

    .team-subtitle {
      font-size: 2.5rem;
    }
  }

  @media (max-width: 640px) {
    .team-section {
      padding: 2rem 1rem;
    }

    .team-grid {
      grid-template-columns: 1fr;
      gap: 3rem;
    }

    .team-title {
      font-size: 2.5rem;
    }

    .team-subtitle {
      font-size: 2rem;
    }

    .team-header {
      margin-bottom: 3rem;
    }
  }
`;

const TeamMember = ({ role, imageUrl }) => (
  <div className="team-member">
    <div className="team-member-container">
      <div className="team-member-image-container">
        <img 
          src={imageUrl} 
          className="team-member-image"
        />
      </div>
    </div>
    <p className="team-member-role">{role}</p>
  </div>
);

export default function TeamSection() {
  const teamMembers = [
    {
      role: "Barangay Chairman",
      imageUrl: chairwomanImage
    },
    {
      role: "Sk Chairman",
      imageUrl: skChairwomanImage
    },
    {
      role: "Kagawad",
      imageUrl: kagwadomarImage
    },
    {
      role: "Treasurer",
      imageUrl: treasurerImage
    },
    {
      role: "Barangay Official",
      imageUrl: firedImage
    },
    {
      role: "Barangay Official",
      imageUrl: img0028
    },
    {
      role: "Barangay Official",
      imageUrl: img9666
    },
    {
      role: "Barangay Official",
      imageUrl: img9677
    },
    {
      role: "Barangay Official",
      imageUrl: img9822
    },
    {
      role: "Barangay Official",
      imageUrl: img9860
    },
    {
      role: "Barangay Official",
      imageUrl: img9875
    }
  ];

  return (
    <>
      <style>{styles}</style>
      <div className="team-section">
        <div className="team-container">
          <div className="team-header">
            <p className="team-label"></p>
            <h1 className="team-title">About The Organization</h1>
            <h2 className="team-subtitle">Committed. Skilled. Community-Focused.</h2>
            <p className="team-description">
              We serve with care and commitment, connecting skilled workers to opportunities that uplift our community.
            </p>
          </div>

          <div className="team-grid">
            {teamMembers.map((member, index) => (
              <TeamMember
                key={index}
                role={member.role}
                imageUrl={member.imageUrl}
              />
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
