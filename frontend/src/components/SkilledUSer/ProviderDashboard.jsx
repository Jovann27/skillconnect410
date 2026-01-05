import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api";
import { useMainContext } from "../../mainContext";
import toast from "react-hot-toast";
import { 
  FaSearch, FaFilter, FaBriefcase, FaClock, FaEye, FaHeart, 
  FaMapMarkerAlt, FaStar, FaUsers, FaTrophy, FaCheckCircle,
  FaEnvelope, FaPhone, FaCalendarAlt, FaClipboardList,
  FaTools, FaChartLine, FaUser, FaBookmark, FaBell,
  FaHandshake, FaFileAlt, FaComment, FaStarHalfAlt,
  FaPlus, FaThumbsUp, FaThumbsDown, FaCheck, FaTimes,
  FaImage
} from "react-icons/fa";

const ProviderDashboard = () => {
  const { user } = useMainContext();
  const navigate = useNavigate();
  
  // Core state
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  
  // Data state
  const [serviceRequests, setServiceRequests] = useState([]);
  const [serviceOffers, setServiceOffers] = useState([]);
  const [applications, setApplications] = useState([]);
  const [certificates, setCertificates] = useState([]);
  const [workProof, setWorkProof] = useState([]);
  
  // Form state - no longer needed for credentials upload

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchServiceRequests(),
        fetchServiceOffers(),
        fetchApplications(),
        fetchCertificates(),
        fetchWorkProof()
      ]);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const fetchServiceRequests = async () => {
    try {
      const response = await api.get('/user/available-service-requests');
      if (response.data.success) {
        setServiceRequests(response.data.requests);
      }
    } catch (error) {
      console.error('Error fetching service requests:', error);
    }
  };

  const fetchServiceOffers = async () => {
    try {
      const response = await api.get('/user/provider-offers');
      if (response.data.success) {
        setServiceOffers(response.data.offers);
      }
    } catch (error) {
      console.error('Error fetching service offers:', error);
    }
  };

  const fetchApplications = async () => {
    try {
      const response = await api.get('/user/provider-applications');
      if (response.data.success) {
        setApplications(response.data.applications);
      }
    } catch (error) {
      console.error('Error fetching applications:', error);
    }
  };

  const fetchCertificates = async () => {
    try {
      const response = await api.get('/user/my-certificates');
      if (response.data.success) {
        setCertificates(response.data.certificates);
      }
    } catch (error) {
      console.error('Error fetching certificates:', error);
    }
  };

  const fetchWorkProof = async () => {
    try {
      const response = await api.get('/user/my-work-proof');
      if (response.data.success) {
        setWorkProof(response.data.workProof);
      }
    } catch (error) {
      console.error('Error fetching work proof:', error);
    }
  };

  const handleApplyToRequest = async (requestId) => {
    try {
      const response = await api.post(`/user/apply-to-request/${requestId}`);
      if (response.data.success) {
        toast.success('Application submitted successfully!');
        fetchServiceRequests();
      }
    } catch (error) {
      console.error('Error applying to request:', error);
      toast.error('Failed to apply to request');
    }
  };

  const handleRespondToOffer = async (offerId, action) => {
    try {
      const response = await api.post(`/user/respond-to-offer/${offerId}`, { action });
      if (response.data.success) {
        toast.success(`Offer ${action === 'accept' ? 'accepted' : 'declined'} successfully!`);
        fetchServiceOffers();
      }
    } catch (error) {
      console.error('Error responding to offer:', error);
      toast.error(`Failed to ${action} offer`);
    }
  };

  const handleRespondToApplication = async (applicationId, action) => {
    try {
      const response = await api.post(`/user/respond-to-application/${applicationId}`, { action });
      if (response.data.success) {
        toast.success(`Application ${action === 'accept' ? 'accepted' : 'declined'} successfully!`);
        fetchApplications();
      }
    } catch (error) {
      console.error('Error responding to application:', error);
      toast.error(`Failed to ${action} application`);
    }
  };

  const handleProfilePictureUpload = async (file) => {
    if (!file) return;

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be less than 5MB');
      return;
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select a valid image file');
      return;
    }

    const formData = new FormData();
    formData.append('profilePic', file);

    try {
      const response = await api.post('/user/update-profile-picture', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (response.data.success) {
        toast.success('Profile picture updated successfully!');
        // Update user context or refetch user data
        window.location.reload(); // Simple refresh to update profile pic
      }
    } catch (error) {
      console.error('Error uploading profile picture:', error);
      toast.error('Failed to upload profile picture');
    }
  };

  const renderStars = (rating) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;

    for (let i = 0; i < 5; i++) {
      if (i < fullStars) {
        stars.push(<FaStar key={i} className="text-yellow-400 fill-current" />);
      } else if (i === fullStars && hasHalfStar) {
        stars.push(<FaStarHalfAlt key={i} className="text-yellow-400" />);
      } else {
        stars.push(<FaStar key={i} className="text-gray-300" />);
      }
    }
    return stars;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
          <h3 className="text-xl font-semibold text-gray-700">Loading your dashboard...</h3>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div>
              <h2 className="text-4xl font-bold text-gray-900 mb-2">
                Service Provider Dashboard
              </h2>
              <p className="text-gray-600 text-lg">
                Manage your services, applications, and credentials
              </p>
            </div>
            <div className="flex gap-4">
              <div className="bg-white rounded-lg px-4 py-2 shadow-sm border">
                <div className="text-2xl font-bold text-blue-600">{serviceRequests.length}</div>
                <div className="text-sm text-gray-600">Available Requests</div>
              </div>
              <div className="bg-white rounded-lg px-4 py-2 shadow-sm border">
                <div className="text-2xl font-bold text-green-600">{serviceOffers.length}</div>
                <div className="text-sm text-gray-600">Pending Offers</div>
              </div>
            </div>
            
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="bg-white rounded-lg shadow-lg mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8 px-6">
              {[
                { id: 'overview', label: 'Overview', icon: FaChartLine },
                { id: 'requests', label: 'Service Requests', icon: FaClipboardList },
                { id: 'offers', label: 'Service Offers', icon: FaHandshake },
                { id: 'applications', label: 'Applications', icon: FaFileAlt },
                { id: 'credentials', label: 'Credentials', icon: FaCheckCircle }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <tab.icon />
                  <span>{tab.label}</span>
                </button>
              ))}
            </nav>
          </div>


        </div>
      </div>
    </div>
  );
};

export default ProviderDashboard;
