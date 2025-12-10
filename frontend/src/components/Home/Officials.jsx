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
const TeamMember = ({ role, imageUrl }) => (
  <div className="flex flex-col items-center w-4/5 h-80 bg-white rounded-lg p-1 shadow-md hover:shadow-2xl transition-shadow duration-300">
    <div className="w-40 h-64 mb-4">
      <div className="w-full h-full">
        <img
          src={imageUrl}
          className="w-11/12 h-11/12 mx-auto object-cover hover:scale-105 transition-transform duration-300 rounded-md"
          alt={role}
        />
      </div>
    </div>
    <p className="text-base font-semibold text-black text-shadow-sm">{role}</p>
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
    <div className="min-h-screen py-16 px-4 bg-gradient-to-br from-pink-100 via-pink-100 to-white">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-20">
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-gray-900 mb-2">About The Organization</h1>
          <h2 className="text-4xl md:text-5xl font-normal text-gray-500 mb-8">Committed. Skilled. Community-Focused.</h2>
          <p className="text-gray-700 max-w-2xl mx-auto text-lg leading-relaxed">
            We serve with care and commitment, connecting skilled workers to opportunities that uplift our community.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 lg:gap-16">
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
  );
}
