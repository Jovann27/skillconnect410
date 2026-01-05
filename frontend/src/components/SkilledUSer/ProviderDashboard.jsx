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

          <div className="p-6">
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-blue-600">Total Applications</p>
                      <p className="text-2xl font-bold text-blue-900">{applications.length}</p>
                    </div>
                    <FaFileAlt className="text-blue-600 text-3xl" />
                  </div>
                </div>
                
                <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-green-600">Pending Offers</p>
                      <p className="text-2xl font-bold text-green-900">{serviceOffers.filter(o => o.status === 'Pending').length}</p>
                    </div>
                    <FaHandshake className="text-green-600 text-3xl" />
                  </div>
                </div>
                
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-purple-600">Verified Certificates</p>
                      <p className="text-2xl font-bold text-purple-900">{certificates.filter(c => c.verified).length}</p>
                    </div>
                    <FaCheckCircle className="text-purple-600 text-3xl" />
                  </div>
                </div>
                
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-orange-600">Work Proof</p>
                      <p className="text-2xl font-bold text-orange-900">{workProof.filter(w => w.verified).length}</p>
                    </div>
                    <FaImage className="text-orange-600 text-3xl" />
                  </div>
                </div>
              </div>
            )}

            {/* Service Requests Tab */}
            {activeTab === 'requests' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-xl font-semibold text-gray-900">Available Service Requests</h3>
                  <div className="text-sm text-gray-600">
                    {serviceRequests.length} request{serviceRequests.length !== 1 ? 's' : ''} available
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {serviceRequests.map((request) => (
                    <div key={request._id} className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h4 className="text-lg font-semibold text-gray-900 mb-2">{request.title}</h4>
                          <p className="text-gray-600 text-sm mb-2">{request.description}</p>
                          <div className="flex items-center space-x-4 text-sm text-gray-500 mb-2">
                            <span className="flex items-center">
                              <FaMapMarkerAlt className="mr-1" />
                              {request.location}
                            </span>
                            <span className="flex items-center">
                              <FaTools className="mr-1" />
                              {request.serviceCategory}
                            </span>
                          </div>
                          {request.budgetRange && (
                            <div className="flex items-center text-sm text-green-600">
                              <FaDollarSign className="mr-1" />
                              ₱{request.budgetRange.min} - ₱{request.budgetRange.max}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex space-x-3">
                        <button
                          onClick={() => handleApplyToRequest(request._id)}
                          className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors flex items-center justify-center"
                        >
                          <FaFileAlt className="mr-2" />
                          Apply
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Service Offers Tab */}
            {activeTab === 'offers' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-xl font-semibold text-gray-900">Service Offers</h3>
                  <div className="text-sm text-gray-600">
                    {serviceOffers.length} offer{serviceOffers.length !== 1 ? 's' : ''} received
                  </div>
                </div>
                
                <div className="space-y-4">
                  {serviceOffers.map((offer) => (
                    <div key={offer._id} className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h4 className="text-lg font-semibold text-gray-900 mb-2">{offer.title}</h4>
                          <p className="text-gray-600 text-sm mb-2">{offer.description}</p>
                          <div className="flex items-center space-x-4 text-sm text-gray-500 mb-2">
                            <span className="flex items-center">
                              <FaMapMarkerAlt className="mr-1" />
                              {offer.location}
                            </span>
                            <span className="flex items-center">
                              <FaDollarSign className="mr-1" />
                              ₱{offer.budget}
                            </span>
                          </div>
                          <div className="text-sm text-gray-500">
                            From: {offer.requester?.firstName} {offer.requester?.lastName}
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                            offer.status === 'Pending' ? 'bg-yellow-100 text-yellow-800' :
                            offer.status === 'Accepted' ? 'bg-green-100 text-green-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {offer.status}
                          </span>
                        </div>
                      </div>
                      
                      {offer.status === 'Pending' && (
                        <div className="flex space-x-3">
                          <button
                            onClick={() => handleRespondToOffer(offer._id, 'accept')}
                            className="flex-1 bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 transition-colors flex items-center justify-center"
                          >
                            <FaThumbsUp className="mr-2" />
                            Accept
                          </button>
                          <button
                            onClick={() => handleRespondToOffer(offer._id, 'decline')}
                            className="flex-1 bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 transition-colors flex items-center justify-center"
                          >
                            <FaThumbsDown className="mr-2" />
                            Decline
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Applications Tab */}
            {activeTab === 'applications' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-xl font-semibold text-gray-900">Your Applications</h3>
                  <div className="text-sm text-gray-600">
                    {applications.length} application{applications.length !== 1 ? 's' : ''} submitted
                  </div>
                </div>
                
                <div className="space-y-4">
                  {applications.map((application) => (
                    <div key={application._id} className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h4 className="text-lg font-semibold text-gray-900 mb-2">{application.serviceRequest?.title}</h4>
                          <p className="text-gray-600 text-sm mb-2">{application.serviceRequest?.description}</p>
                          <div className="flex items-center space-x-4 text-sm text-gray-500 mb-2">
                            <span className="flex items-center">
                              <FaMapMarkerAlt className="mr-1" />
                              {application.serviceRequest?.location}
                            </span>
                            <span className="flex items-center">
                              <FaTools className="mr-1" />
                              {application.serviceRequest?.serviceCategory}
                            </span>
                          </div>
                          <div className="text-sm text-gray-500">
                            Requested by: {application.requester?.firstName} {application.requester?.lastName}
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                            application.status === 'Pending' ? 'bg-yellow-100 text-yellow-800' :
                            application.status === 'In Progress' ? 'bg-green-100 text-green-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {application.status}
                          </span>
                        </div>
                      </div>
                      
                      {application.status === 'Pending' && (
                        <div className="flex space-x-3">
                          <button
                            onClick={() => handleRespondToApplication(application._id, 'accept')}
                            className="flex-1 bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 transition-colors flex items-center justify-center"
                          >
                            <FaCheck className="mr-2" />
                            Accept
                          </button>
                          <button
                            onClick={() => handleRespondToApplication(application._id, 'decline')}
                            className="flex-1 bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 transition-colors flex items-center justify-center"
                          >
                            <FaTimes className="mr-2" />
                            Decline
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Credentials Tab */}
            {activeTab === 'credentials' && (
              <div className="space-y-8">
                {/* Profile Picture Upload */}
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <FaUser className="mr-2 text-purple-600" />
                    Update Profile Picture
                  </h3>
                  <div className="flex items-center space-x-6">
                    <div className="flex-shrink-0">
                      <img
                        src={user?.profilePic || '/default-profile.png'}
                        alt="Profile"
                        className="w-20 h-20 rounded-full object-cover border-4 border-gray-200"
                      />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-gray-600 mb-4">
                        Upload a new profile picture. This will be visible to clients and doesn't require verification.
                      </p>
                      <div className="flex items-center space-x-4">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleProfilePictureUpload(e.target.files[0])}
                          className="hidden"
                          id="profile-pic-upload"
                        />
                        <label
                          htmlFor="profile-pic-upload"
                          className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 transition-colors cursor-pointer"
                        >
                          Choose Image
                        </label>
                        <span className="text-sm text-gray-500">PNG, JPG up to 5MB</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Certificates List */}
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Your Certificates</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {certificates.map((cert) => (
                      <div key={cert._id} className="border border-gray-200 rounded-lg p-4">
                        <h4 className="font-semibold text-gray-900 mb-2">{cert.title}</h4>
                        <p className="text-sm text-gray-600 mb-2">{cert.description}</p>
                        <div className="flex items-center justify-between text-sm">
                          <span className={`px-2 py-1 rounded-full ${
                            cert.verified ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {cert.verified ? 'Verified' : 'Pending Verification'}
                          </span>
                          <a href={cert.certificateUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800">
                            View
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Work Proof List */}
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Your Work Proof</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {workProof.map((proof) => (
                      <div key={proof._id} className="border border-gray-200 rounded-lg p-4">
                        <h4 className="font-semibold text-gray-900 mb-2">{proof.title}</h4>
                        <p className="text-sm text-gray-600 mb-2">{proof.description}</p>
                        <div className="flex items-center justify-between text-sm mb-2">
                          <span className="text-gray-500">{proof.serviceType}</span>
                          <span className={`px-2 py-1 rounded-full ${
                            proof.verified ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {proof.verified ? 'Verified' : 'Pending Verification'}
                          </span>
                        </div>
                        <img src={proof.imageUrl} alt={proof.title} className="w-full h-32 object-cover rounded-md" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProviderDashboard;
