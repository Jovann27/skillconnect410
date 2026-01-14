import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api";
import { useMainContext } from "../../mainContext";
import { toast } from "react-hot-toast";
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
  const [activeTab, setActiveTab] = useState('requests');
  const [loading, setLoading] = useState(true);

  // Modal state
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [commissionFee, setCommissionFee] = useState('');
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);

  // Data state
  const [serviceRequests, setServiceRequests] = useState([]);
  const [serviceOffers, setServiceOffers] = useState([]);
  const [applications, setApplications] = useState([]);
  const [certificates, setCertificates] = useState([]);
  const [workProof, setWorkProof] = useState([]);

  // Form state - no longer needed for credentials upload

  useEffect(() => {
    if (user && user.role === 'Service Provider') {
      fetchData();
    } else if (user && user.role !== 'Service Provider') {
      toast.error('This dashboard is only available for service providers');
      navigate('/');
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
      // Fetch all available service requests matching provider's skills and services
      // useRecommendations=true enables smart filtering based on provider's skills and expertise
      const response = await api.get('/user/available-service-requests', {
        params: {
          limit: 10000,
          useRecommendations: true
        }
      });
      if (response.data.success) {
        setServiceRequests(response.data.requests || []);
        console.log(`Loaded ${response.data.requests?.length || 0} available service requests`, {
          algorithm: response.data.algorithm,
          description: response.data.description
        });
      } else {
        setServiceRequests([]);
      }
    } catch (error) {
      console.error('Error fetching service requests:', error);
      setServiceRequests([]);
      toast.error('Failed to load available service requests');
    }
  };

  const fetchServiceOffers = async () => {
    try {
      // Backend paginates offers (default limit=20). Use a high limit so the dashboard shows all received offers.
      const response = await api.get('/user/provider-offers', {
        params: {
          page: 1,
          limit: 10000
        }
      });
      if (response.data.success) {
        setServiceOffers(response.data.offers || []);
      } else {
        setServiceOffers([]);
      }
    } catch (error) {
      console.error('Error fetching service offers:', error);
      setServiceOffers([]);
      toast.error('Failed to load service offers');
    }
  };

  const fetchApplications = async () => {
    try {
      const response = await api.get('/user/provider-applications');
      if (response.data.success) {
        setApplications(response.data.applications || []);
      } else {
        setApplications([]);
      }
    } catch (error) {
      console.error('Error fetching applications:', error);
      setApplications([]);
      toast.error('Failed to load applications');
    }
  };

  const fetchCertificates = async () => {
    try {
      const response = await api.get('/user/my-certificates');
      if (response.data.success) {
        setCertificates(response.data.certificates || []);
      } else {
        setCertificates([]);
      }
    } catch (error) {
      console.error('Error fetching certificates:', error);
      setCertificates([]);
    }
  };

  const fetchWorkProof = async () => {
    try {
      const response = await api.get('/user/my-work-proof');
      if (response.data.success) {
        setWorkProof(response.data.workProof || []);
      } else {
        setWorkProof([]);
      }
    } catch (error) {
      console.error('Error fetching work proof:', error);
      setWorkProof([]);
    }
  };

  const handleApplyToRequest = async (requestId, commissionFee) => {
    // Double-check if already applied before submitting
    if (hasAlreadyApplied(requestId)) {
      setShowDuplicateModal(true);
      setShowApplyModal(false);
      setSelectedRequest(null);
      setCommissionFee('');
      return;
    }

    try {
      const response = await api.post(`/user/apply-to-request/${requestId}`, {
        commissionFee: parseFloat(commissionFee)
      });
      if (response.data.success) {
        // Show success screen with details
        setSuccessMessage(`Your application for "${selectedRequest.name}" has been submitted successfully with a commission fee of ₱${parseFloat(commissionFee).toLocaleString()}!`);
        setShowSuccessModal(true);
        toast.success('Application submitted successfully!');
        fetchServiceRequests();
        fetchApplications();
        setShowApplyModal(false);
        setSelectedRequest(null);
        setCommissionFee('');
      }
    } catch (error) {
      console.error('Error applying to request:', error);
      toast.error('Failed to apply to request');
    }
  };

  const handleRespondToOffer = async (offer, action) => {
    // Add confirmation for accepting offers
    if (action === 'accept') {
      const confirmed = window.confirm('Are you sure you want to accept this offer? This action cannot be undone.');
      if (!confirmed) return;
    }

    try {
      let response;

      if (offer.type === 'direct') {
        // Handle direct service offers
        response = await api.post(`/user/respond-to-offer/${offer._id}`, { action });
      } else if (offer.type === 'request') {
        // Handle offered service requests
        if (action === 'accept') {
          response = await api.post(`/user/offer/${offer._id}/accept`);
        } else {
          response = await api.post(`/user/offer/${offer._id}/reject`);
        }
      }

      if (response && response.data.success) {
        toast.success(`Offer ${action === 'accept' ? 'accepted' : 'declined'} successfully!`);
        fetchServiceOffers();
        fetchApplications(); // Refresh applications in case a booking was created
      }
    } catch (error) {
      console.error('Error responding to offer:', error);
      toast.error(`Failed to ${action} offer`);
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

  const hasAlreadyApplied = (requestId) => {
    return applications.some(app => app.serviceRequest && app.serviceRequest._id === requestId);
  };

  const renderRequestsTab = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Available Service Requests</h3>
      <p className="text-sm text-gray-600">
        Showing {serviceRequests.length} request{serviceRequests.length !== 1 ? 's' : ''} that match your skills and expertise
      </p>
      {serviceRequests.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <FaClipboardList className="mx-auto text-4xl mb-4 text-gray-300" />
          <p>No available service requests at the moment.</p>
        </div>
      ) : (
        serviceRequests.map((request) => {
          const alreadyApplied = hasAlreadyApplied(request._id);
          const matchStrength = request.matchStrength;
          const recommendationScore = request.recommendationScore;
          
          // Determine badge color based on match strength
          const getMatchBadgeColor = () => {
            switch(matchStrength) {
              case 'high':
                return 'bg-green-100 text-green-800';
              case 'medium':
                return 'bg-yellow-100 text-yellow-800';
              default:
                return 'bg-blue-100 text-blue-800';
            }
          };
          
          return (
            <div key={request._id} className="bg-white border rounded-lg p-4 hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-semibold">{request.name}</h4>
                    {matchStrength && (
                      <span className={`text-xs px-2 py-1 rounded font-medium ${getMatchBadgeColor()}`}>
                        {matchStrength.charAt(0).toUpperCase() + matchStrength.slice(1)} Match
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600">{request.typeOfWork}</p>
                  <p className="text-sm text-gray-500 flex items-center gap-1">
                    <FaMapMarkerAlt className="text-gray-400" />
                    {request.address || 'Location not specified'}
                  </p>
                </div>
                <div className="text-right">
                  <div className="font-bold text-green-600">
                    ₱{request.minBudget && request.maxBudget
                      ? `${request.minBudget.toLocaleString()} - ₱${request.maxBudget.toLocaleString()}`
                      : request.minBudget || request.maxBudget
                      ? `₱${(request.minBudget || request.maxBudget).toLocaleString()}`
                      : 'Budget not specified'
                    }
                  </div>
                  <div className="text-sm text-gray-500 flex items-center justify-end gap-1">
                    <FaCalendarAlt className="text-gray-400" />
                    {request.time || 'Time not specified'}
                  </div>
                  {recommendationScore && (
                    <div className="text-xs text-gray-600 mt-1">
                      Relevance: {(recommendationScore * 100).toFixed(0)}%
                    </div>
                  )}
                </div>
              </div>
              {request.notes && (
                <p className="text-sm text-gray-700 mb-3 line-clamp-2">{request.notes}</p>
              )}
              <div className="flex gap-2 items-center justify-between">
                <div className="text-xs text-gray-500">
                  {request.requester?.firstName && `Requested by ${request.requester.firstName}`}
                </div>
                {alreadyApplied ? (
                  <div className="flex items-center text-green-600 font-medium">
                    <FaCheckCircle className="mr-2" />
                    <span>Already Applied</span>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      setSelectedRequest(request);
                      setCommissionFee('');
                      setShowApplyModal(true);
                    }}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded font-medium text-sm transition-colors"
                  >
                    Apply to Request
                  </button>
                )}
              </div>
            </div>
          );
        })
      )}
    </div>
  );

  const renderOffersTab = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Service Offers</h3>
      <p className="text-sm text-gray-600">
        Showing {serviceOffers.length} offer{serviceOffers.length !== 1 ? 's' : ''} that require your response
      </p>
      {serviceOffers.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <FaHandshake className="mx-auto text-4xl mb-4 text-gray-300" />
          <p>No pending service offers.</p>
        </div>
      ) : (
        serviceOffers.map((offer) => (
          <div key={offer._id} className="bg-white border rounded-lg p-4 hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-3">
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold text-lg">{offer.title}</h4>
                  <div className="flex gap-2">
                    <span className={`text-xs px-2 py-1 rounded font-medium ${
                      offer.type === 'direct'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-purple-100 text-purple-800'
                    }`}>
                      {offer.type === 'direct' ? 'Direct Offer' : 'Service Request'}
                    </span>
                    <span className={`text-xs px-2 py-1 rounded font-medium ${
                      offer.status === 'Pending' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {offer.status}
                    </span>
                  </div>
                </div>
                <p className="text-sm text-gray-700 mb-2">{offer.description}</p>
                <div className="space-y-1">
                  <p className="text-sm text-gray-600 flex items-center gap-1">
                    <FaMapMarkerAlt className="text-gray-400" />
                    {offer.location || 'Location not specified'}
                  </p>
                  {offer.preferredDate && (
                    <p className="text-sm text-gray-600 flex items-center gap-1">
                      <FaCalendarAlt className="text-gray-400" />
                      {new Date(offer.preferredDate).toLocaleDateString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                      {offer.preferredDate && offer.preferredDate.toString().includes('T') &&
                        ` at ${new Date(offer.preferredDate).toLocaleTimeString('en-US', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}`
                      }
                    </p>
                  )}
                  <p className="text-sm text-gray-600 flex items-center gap-1">
                    <FaUser className="text-gray-400" />
                    From: {offer.requester?.firstName} {offer.requester?.lastName}
                    {offer.requester?.email && (
                      <span className="text-xs text-gray-500">({offer.requester.email})</span>
                    )}
                  </p>
                  <p className="text-xs text-gray-500">
                    Received: {new Date(offer.createdAt).toLocaleDateString()} at {new Date(offer.createdAt).toLocaleTimeString()}
                  </p>
                </div>
              </div>
              <div className="text-right ml-4 min-w-[150px]">
                <div className="font-bold text-green-600 text-lg mb-1">
                  ₱{offer.minBudget && offer.maxBudget
                    ? `${offer.minBudget.toLocaleString()} - ₱${offer.maxBudget.toLocaleString()}`
                    : offer.minBudget || offer.maxBudget
                    ? `₱${(offer.minBudget || offer.maxBudget).toLocaleString()}`
                    : 'Budget not specified'
                  }
                </div>
                {offer.requester?.phone && (
                  <p className="text-sm text-gray-500 flex items-center justify-end gap-1">
                    <FaPhone className="text-gray-400" />
                    {offer.requester.phone}
                  </p>
                )}
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => handleRespondToOffer(offer, 'accept')}
                className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-medium flex-1 transition-colors"
              >
                <FaCheck className="inline mr-2" />
                Accept Offer
              </button>
              <button
                onClick={() => handleRespondToOffer(offer, 'decline')}
                className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg font-medium flex-1 transition-colors"
              >
                <FaTimes className="inline mr-2" />
                Decline Offer
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  );

  const renderApplicationsTab = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">My Work Records</h3>
      {applications.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <FaFileAlt className="mx-auto text-4xl mb-4 text-gray-300" />
          <p>You haven't submitted any work records yet.</p>
        </div>
      ) : (
        applications.map((application) => (
          <div key={application._id} className="bg-white border rounded-lg p-4">
            <div className="flex justify-between items-start mb-3">
              <div>
                <h4 className="font-semibold">{application.serviceRequest?.title || application.serviceRequest?.name || 'Service Request'}</h4>
                <p className="text-sm text-gray-600">{application.serviceRequest?.serviceCategory || application.serviceRequest?.typeOfWork}</p>
                <p className="text-sm text-gray-500">Client: {application.requester?.firstName} {application.requester?.lastName}</p>
              </div>
              <div className="text-right">
                <div className="font-bold text-green-600">
                  ₱{application.serviceRequest?.minBudget && application.serviceRequest?.maxBudget
                    ? `${application.serviceRequest.minBudget.toLocaleString()} - ₱${application.serviceRequest.maxBudget.toLocaleString()}`
                    : application.serviceRequest?.minBudget || application.serviceRequest?.maxBudget
                    ? `₱${(application.serviceRequest?.minBudget || application.serviceRequest?.maxBudget).toLocaleString()}`
                    : application.serviceRequest?.budget
                    ? `₱${application.serviceRequest.budget.toLocaleString()}`
                    : 'Budget not specified'
                  }
                </div>
                <div className={`text-sm px-2 py-1 rounded ${
                  application.status === 'In Progress' ? 'bg-green-100 text-green-800' :
                  application.status === 'Pending' ? 'bg-yellow-100 text-yellow-800' :
                  application.status === 'Declined' ? 'bg-red-100 text-red-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {application.status}
                </div>
              </div>
            </div>
            <p className="text-sm text-gray-600">
              Applied on: {new Date(application.createdAt).toLocaleDateString()}
            </p>
          </div>
        ))
      )}
    </div>
  );


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
                Worker Dashboard
              </h2>
              <p className="text-gray-600 text-lg">
                Manage your services, received offers and applications
              </p>
            </div>
            <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg cursor-pointer" onClick={() => setActiveTab('requests')}>
                <div className="flex items-center">
                  <FaClipboardList className="text-blue-600 text-2xl mr-3" />
                  <div>
                    <div className="text-2xl font-bold text-blue-600">{serviceRequests.length}</div>
                    <div className="text-sm text-gray-600">Available Requests</div>
                  </div>
                </div>
              </div>
              <div className="bg-green-50 p-4 rounded-lg cursor-pointer" onClick={() => setActiveTab('offers')}>
                <div className="flex items-center">
                  <FaHandshake className="text-green-600 text-2xl mr-3" />
                  <div>
                    <div className="text-2xl font-bold text-green-600">{serviceOffers.length}</div>
                    <div className="text-sm text-gray-600">Pending Offers</div>
                  </div>
                </div>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg cursor-pointer" onClick={() => setActiveTab('applications')}>
                <div className="flex items-center">
                  <FaFileAlt className="text-purple-600 text-2xl mr-3" />
                  <div>
                    <div className="text-2xl font-bold text-purple-600">{applications.length}</div>
                    <div className="text-sm text-gray-600">Work Records</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
            
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white rounded-t-lg shadow-lg mb-0">
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => {
                setActiveTab('requests');
                fetchServiceRequests();
              }}
              className={`flex-1 px-4 py-3 font-medium text-center transition-colors ${
                activeTab === 'requests'
                  ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              Available Requests
            </button>
            <button
              onClick={() => {
                setActiveTab('offers');
                fetchServiceOffers();
              }}
              className={`flex-1 px-4 py-3 font-medium text-center transition-colors ${
                activeTab === 'offers'
                  ? 'bg-green-50 text-green-600 border-b-2 border-green-600'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              Service Offers
            </button>
            <button
              onClick={() => {
                setActiveTab('applications');
                fetchApplications();
              }}
              className={`flex-1 px-4 py-3 font-medium text-center transition-colors ${
                activeTab === 'applications'
                  ? 'bg-purple-50 text-purple-600 border-b-2 border-purple-600'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              My Work Records
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <div className="bg-white rounded-b-lg shadow-lg mb-6">
          <div className="p-6">
            {activeTab === 'requests' && renderRequestsTab()}
            {activeTab === 'offers' && renderOffersTab()}
            {activeTab === 'applications' && renderApplicationsTab()}
          </div>
        </div>

        {/* Apply Modal */}
        {showApplyModal && selectedRequest && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold mb-4">Confirm Application</h3>
              <div className="mb-4">
                <h4 className="font-medium">{selectedRequest.name}</h4>
                <p className="text-sm text-gray-600">{selectedRequest.typeOfWork}</p>
                <p className="text-sm text-gray-500">Budget: ₱{
                  selectedRequest.minBudget && selectedRequest.maxBudget
                    ? `${selectedRequest.minBudget.toLocaleString()} - ₱${selectedRequest.maxBudget.toLocaleString()}`
                    : selectedRequest.minBudget || selectedRequest.maxBudget
                    ? `${(selectedRequest.minBudget || selectedRequest.maxBudget).toLocaleString()}`
                    : 'Not specified'
                }</p>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Desired Commission Fee (₱)
                </label>
                <input
                  type="number"
                  value={commissionFee}
                  onChange={(e) => setCommissionFee(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter your commission fee"
                  min="0"
                  step="0.01"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Fee must be within the client's budget range
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowApplyModal(false);
                    setSelectedRequest(null);
                    setCommissionFee('');
                  }}
                  className="flex-1 bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    const fee = parseFloat(commissionFee);
                    if (isNaN(fee) || fee < 0) {
                      toast.error('Please enter a valid commission fee');
                      return;
                    }
                    if (selectedRequest.maxBudget && fee > selectedRequest.maxBudget) {
                      toast.error(`Commission fee cannot exceed ₱${selectedRequest.maxBudget.toLocaleString()}`);
                      return;
                    }
                    if (selectedRequest.minBudget && fee < selectedRequest.minBudget) {
                      toast.error(`Commission fee cannot be less than ₱${selectedRequest.minBudget.toLocaleString()}`);
                      return;
                    }
                    handleApplyToRequest(selectedRequest._id, commissionFee);
                  }}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded font-medium"
                >
                  Confirm Apply
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Success Modal */}
        {showSuccessModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4 text-center">
              <div className="mb-6">
                <FaCheckCircle className="text-green-500 text-6xl mx-auto mb-4" />
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Application Submitted!</h3>
                <p className="text-gray-600">{successMessage}</p>
              </div>
              <div className="mb-6">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="text-sm text-green-800">
                    <strong>What happens next?</strong><br />
                    The client will review your application and may contact you for further details.
                    You'll be notified once they make a decision.
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowSuccessModal(false);
                    setSuccessMessage('');
                  }}
                  className="flex-1 bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded font-medium"
                >
                  Continue Browsing
                </button>
                <button
                  onClick={() => {
                    setShowSuccessModal(false);
                    setSuccessMessage('');
                    setActiveTab('applications');
                  }}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded font-medium"
                >
                  View My Applications
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Duplicate Application Modal */}
        {showDuplicateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4 text-center">
              <div className="mb-6">
                <FaTimes className="text-red-500 text-6xl mx-auto mb-4" />
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Already Applied</h3>
                <p className="text-gray-600">
                  You have already submitted an application for this service request.
                  You cannot apply to the same request multiple times.
                </p>
              </div>
              <div className="mb-6">
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-sm text-yellow-800">
                    <strong>Check your applications:</strong><br />
                    You can view and manage your existing applications in the "My Work Records" tab.
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowDuplicateModal(false);
                  }}
                  className="flex-1 bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded font-medium"
                >
                  Continue Browsing
                </button>
                <button
                  onClick={() => {
                    setShowDuplicateModal(false);
                    setActiveTab('applications');
                  }}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded font-medium"
                >
                  View My Applications
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProviderDashboard;
