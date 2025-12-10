import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import api from "../../api";
import socket from "../../utils/socket";
import BrowseProviders from "./BrowseProviders";

const ClientDashboard = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { requestData } = location.state || {};

  const [status, setStatus] = useState("Searching");
  const [currentRequest, setCurrentRequest] = useState(requestData);
  const [allProviders, setAllProviders] = useState([]);
  const [matchedProviders, setMatchedProviders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchFilters, setSearchFilters] = useState({
    name: '',
    services: '',
    minRating: 0,
    minBudget: 0,
    maxBudget: 10000,
    qualifications: ''
  });
  const [selectedProviders, setSelectedProviders] = useState([]);
  const [favoriteProviders, setFavoriteProviders] = useState([]);
  const [postedJobs, setPostedJobs] = useState([]);
  const [jobAnalytics, setJobAnalytics] = useState({
    totalPosted: 0,
    activeJobs: 0,
    completedJobs: 0,
    totalSpent: 0
  });
  const [contracts, setContracts] = useState([]);
  const [reviews, setReviews] = useState([]);

  // Fetch all providers for client-side filtering
  const fetchAllProviders = async () => {
    try {
      const response = await api.get('/user/service-providers');
      const providers = response.data?.workers || [];
      setAllProviders(providers);
      setMatchedProviders(providers); // Initially show all
    } catch (error) {
      console.error("Failed to fetch providers:", error);
      setAllProviders([]);
      setMatchedProviders([]);
    }
  };

  // Apply client-side filtering
  const applyFilters = (providers) => {
    if (!providers?.length) return [];

    let filtered = [...providers];

    // Content-Based Filtering (CBF)
    // This recommends providers based on what the provider is like.
    // Uses: Skills you added, service description, certificates.
    // Techniques used: Keyword matching (similar to TF-IDF similarity)
    if (currentRequest?.typeOfWork) {
      const requestedService = currentRequest.typeOfWork.toLowerCase();
      filtered = filtered.map(provider => {
        let score = 0;
        const skills = provider.skills || [];
        const serviceDesc = provider.serviceDescription?.toLowerCase() || '';

        // Exact skill match gets highest score
        if (skills.some(skill => skill.toLowerCase().includes(requestedService))) {
          score += 10;
        }

        // Partial skill match
        if (skills.some(skill => requestedService.includes(skill.toLowerCase()) || skill.toLowerCase().includes(requestedService))) {
          score += 5;
        }

        // Service description match
        if (serviceDesc.includes(requestedService)) {
          score += 3;
        }

        return { ...provider, contentScore: score };
      }).filter(provider => provider.contentScore > 0)
        .sort((a, b) => b.contentScore - a.contentScore);
    }

    // Collaborative Filtering (CF)
    // This recommends providers based on what similar users do.
    // Types: Item-based CF - providers with high engagement are boosted.
    // Uses: Average rating, total reviews, online status.
    filtered = filtered.map(provider => {
      let collabScore = 0;
      const rating = provider.averageRating || 0;
      const reviewCount = provider.totalReviews || 0;

      // Higher ratings get higher scores
      collabScore += rating * 2;

      // More reviews get higher scores (indicates trustworthiness)
      collabScore += Math.min(reviewCount, 10); // Cap at 10

      // Online providers get slight boost
      if (provider.isOnline) {
        collabScore += 1;
      }

      return { ...provider, collabScore };
    }).sort((a, b) => (b.contentScore + b.collabScore) - (a.contentScore + a.collabScore));

    // Apply search filters
    if (searchFilters.name) {
      const nameFilter = searchFilters.name.toLowerCase();
      filtered = filtered.filter(provider =>
        `${provider.firstName} ${provider.lastName}`.toLowerCase().includes(nameFilter)
      );
    }

    if (searchFilters.services) {
      const serviceFilter = searchFilters.services.toLowerCase();
      filtered = filtered.filter(provider =>
        provider.skills?.some(skill => skill.toLowerCase().includes(serviceFilter)) ||
        provider.serviceDescription?.toLowerCase().includes(serviceFilter)
      );
    }

    if (searchFilters.minRating > 0) {
      filtered = filtered.filter(provider => (provider.averageRating || 0) >= searchFilters.minRating);
    }

    if (searchFilters.minBudget > 0 || searchFilters.maxBudget < 10000) {
      filtered = filtered.filter(provider => {
        const rate = provider.serviceRate || 0;
        return rate >= searchFilters.minBudget && rate <= searchFilters.maxBudget;
      });
    }

    if (searchFilters.qualifications) {
      const qualFilter = searchFilters.qualifications.toLowerCase();
      filtered = filtered.filter(provider =>
        provider.certificates?.some(cert => cert.toLowerCase().includes(qualFilter)) ||
        provider.serviceDescription?.toLowerCase().includes(qualFilter)
      );
    }

    return filtered;
  };

  useEffect(() => {
    if (allProviders.length > 0) {
      const filtered = applyFilters(allProviders);
      setMatchedProviders(filtered);
    }
  }, [allProviders, currentRequest, searchFilters]);

  useEffect(() => {
    if (!requestData) {
      setError("No request data available");
      setIsLoading(false);
      return;
    }

    const initialize = async () => {
      setIsLoading(true);
      setError(null);
      await fetchAllProviders();

      // Listen for real-time updates
      if (socket && requestData._id) {
        socket.emit("join-service-request", requestData._id);
        const handleUpdate = async (updateData) => {
          if (updateData?.requestId !== requestData._id) return;
          try {
            const response = await api.get(`/user/service-request/${requestData._id}`);
            const updatedRequest = response.data?.request;
            if (updatedRequest) {
              setCurrentRequest(updatedRequest);
              if (["Working", "Completed"].includes(updatedRequest.status)) {
                setStatus("Found");
                // Navigate to accepted order page
                navigate('/user/client-accepted', { state: { orderData: updatedRequest } });
              } else if (updatedRequest.status === "Offered") {
                setStatus("Offered");
              } else if (updatedRequest.status === "Waiting") {
                setStatus("Searching");
              }
            }
          } catch (err) {
            console.error("Failed to update request via socket:", err);
          }
        };
        socket.on("service-request-updated", handleUpdate);
        return () => {
          socket.off("service-request-updated", handleUpdate);
          socket.emit("leave-service-request", requestData._id);
        };
      }
      setIsLoading(false);
    };

    initialize();
  }, [requestData, navigate]);

  const offerRequestToProvider = async (providerId) => {
    if (!currentRequest?._id || !providerId) return alert("Unable to process request.");
    const selectedProvider = matchedProviders.find(p => p._id === providerId);
    if (!selectedProvider) return alert("Provider not found.");

    try {
      await api.post('/user/offer-to-provider', {
        providerId,
        requestId: currentRequest._id
      });
      alert(`Request offered to ${selectedProvider.firstName} ${selectedProvider.lastName}! Waiting for response...`);
      const refreshResponse = await api.get(`/user/service-request/${currentRequest._id}`);
      if (refreshResponse.data?.request) setCurrentRequest(refreshResponse.data.request);
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || "Failed to offer request";
      alert(`${errorMessage}. Please try again.`);
    }
  };

  const handleCancel = async () => {
    if (window.confirm("Are you sure you want to cancel this request?")) {
      try {
        await api.delete(`/user/service-request/${currentRequest?._id}/cancel`);
        navigate('/user/service-request');
      } catch (error) {
        console.log("Error cancelling request:", error);
        alert("Failed to cancel request. Please try again.");
      }
    }
  };

  const handleProviderSelect = (providerId) => {
    setSelectedProviders(prev =>
      prev.includes(providerId)
        ? prev.filter(id => id !== providerId)
        : [...prev, providerId]
    );
  };

  const handleBulkOffer = async () => {
    if (selectedProviders.length === 0) return alert("Please select providers to send offers to.");

    try {
      for (const providerId of selectedProviders) {
        await api.post('/user/offer-to-provider', {
          providerId,
          requestId: currentRequest._id
        });
      }
      alert(`Offers sent to ${selectedProviders.length} provider(s)!`);
      setSelectedProviders([]);
      const refreshResponse = await api.get(`/user/service-request/${currentRequest._id}`);
      if (refreshResponse.data?.request) setCurrentRequest(refreshResponse.data.request);
    } catch (err) {
      console.error("Error sending bulk offers:", err);
      alert("Failed to send some offers. Please try again.");
    }
  };

  const handleToggleFavorite = (providerId) => {
    setFavoriteProviders(prev =>
      prev.includes(providerId)
        ? prev.filter(id => id !== providerId)
        : [...prev, providerId]
    );
  };

  const handleViewProfile = (provider) => {
    // For now, show a simple alert with provider details
    // In a real app, this would navigate to a detailed profile page
    alert(`Profile: ${provider.firstName} ${provider.lastName}\n\nSkills: ${provider.skills?.join(', ') || 'None'}\n\nRating: ${provider.averageRating || 0}/5\n\nAbout: ${provider.serviceDescription || 'No description'}`);
  };

  const handleMessageProvider = (provider) => {
    // Navigate to chat or open chat modal
    // For now, show placeholder - in real implementation, this would navigate to chat
    alert(`Opening chat with ${provider.firstName} ${provider.lastName}...`);
    // navigate('/chat', { state: { recipient: provider } });
  };

  const renderStars = (rating) => {
    return "★".repeat(Math.round(rating)) + "☆".repeat(5 - Math.round(rating));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h3 className="text-xl font-semibold text-gray-700">Loading your request...</h3>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center max-w-md w-full">
          <h2 className="text-4xl text-red-500 mb-4">❌ Error</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors duration-200"
          >
            🔄 Refresh Page
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8">
      {/* JobStreet-style Analytics Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-md p-6 text-center">
          <div className="text-3xl font-bold text-blue-600 mb-2">{jobAnalytics.totalPosted}</div>
          <div className="text-gray-600">Jobs Posted</div>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6 text-center">
          <div className="text-3xl font-bold text-green-600 mb-2">{jobAnalytics.activeJobs}</div>
          <div className="text-gray-600">Active Jobs</div>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6 text-center">
          <div className="text-3xl font-bold text-purple-600 mb-2">{jobAnalytics.completedJobs}</div>
          <div className="text-gray-600">Completed Jobs</div>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6 text-center">
          <div className="text-3xl font-bold text-orange-600 mb-2">₱{jobAnalytics.totalSpent.toLocaleString()}</div>
          <div className="text-gray-600">Total Spent</div>
        </div>
      </div>

      {/* Quick Actions - Like LinkedIn */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <h3 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            className="bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2"
            onClick={() => navigate('/user/service-request')}
          >
            📝 Post New Job
          </button>
          <button
            className="bg-green-600 hover:bg-green-700 text-white py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2"
            onClick={() => navigate('/user/browse-providers')}
          >
            🔍 Browse Providers
          </button>
          <button
            className="bg-purple-600 hover:bg-purple-700 text-white py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2"
            onClick={() => {/* View contracts */}}
          >
            📋 View Contracts
          </button>
        </div>
      </div>

      {/* Browse Providers Section */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <h3 className="text-xl font-semibold text-gray-900 mb-4">Browse All Providers</h3>
        <BrowseProviders />
      </div>

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <h2 className="text-3xl font-bold text-gray-900">Waiting for Worker</h2>
        <div className={`px-4 py-2 rounded-full text-sm font-semibold ${
          status === "Found" ? "bg-green-100 text-green-800" :
          status === "Offered" ? "bg-blue-100 text-blue-800" :
          "bg-yellow-100 text-yellow-800"
        }`}>
          {status === "Found" ? "Worker Assigned" : status === "Offered" ? "Offer Sent" : "Searching"}
        </div>
      </div>

      {/* Request Details */}
      <div className="request-details-card">
        <h3>Request Details</h3>
        <div className="details-grid">
          <div className="detail-item">
            <span className="label">Service:</span>
            <span className="value">{currentRequest?.typeOfWork || "N/A"}</span>
          </div>
          <div className="detail-item">
            <span className="label">Budget:</span>
            <span className="value">₱{currentRequest?.budget || "N/A"}</span>
          </div>
          <div className="detail-item">
            <span className="label">Date:</span>
            <span className="value">{currentRequest?.preferredDate || "N/A"}</span>
          </div>
          <div className="detail-item">
            <span className="label">Time:</span>
            <span className="value">{currentRequest?.time || "N/A"}</span>
          </div>
          <div className="detail-item full-width">
            <span className="label">Notes:</span>
            <span className="value">{currentRequest?.notes || "None"}</span>
          </div>
        </div>
      </div>

      {/* Search Filters */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-4">Filter Workers</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Name:</label>
            <input
              type="text"
              placeholder="Search by name..."
              value={searchFilters.name}
              onChange={(e) => setSearchFilters(prev => ({ ...prev, name: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Services:</label>
            <input
              type="text"
              placeholder="Search by skills/services..."
              value={searchFilters.services}
              onChange={(e) => setSearchFilters(prev => ({ ...prev, services: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Min Rating:</label>
            <select
              value={searchFilters.minRating}
              onChange={(e) => setSearchFilters(prev => ({ ...prev, minRating: parseFloat(e.target.value) }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value={0}>Any Rating</option>
              <option value={3}>3+ Stars</option>
              <option value={4}>4+ Stars</option>
              <option value={4.5}>4.5+ Stars</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Budget Range:</label>
            <div className="flex gap-2">
              <input
                type="number"
                placeholder="Min"
                value={searchFilters.minBudget || ''}
                onChange={(e) => setSearchFilters(prev => ({ ...prev, minBudget: parseFloat(e.target.value) || 0 }))}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <span className="flex items-center text-gray-500">to</span>
              <input
                type="number"
                placeholder="Max"
                value={searchFilters.maxBudget < 10000 ? searchFilters.maxBudget : ''}
                onChange={(e) => setSearchFilters(prev => ({ ...prev, maxBudget: parseFloat(e.target.value) || 10000 }))}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedProviders.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between">
            <span className="text-blue-800 font-medium">
              {selectedProviders.length} provider{selectedProviders.length > 1 ? 's' : ''} selected
            </span>
            <button
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors duration-200"
              onClick={handleBulkOffer}
            >
              Send Offers to Selected
            </button>
          </div>
        </div>
      )}

      {/* Available Providers */}
      <div>
        <h3 className="text-2xl font-bold text-gray-900 mb-6">Available Workers ({matchedProviders.length})</h3>
        {matchedProviders.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {matchedProviders.map((provider) => (
              <div key={provider._id} className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow duration-200 relative">
                {/* Checkbox for bulk selection */}
                <div className="absolute top-4 left-4">
                  <input
                    type="checkbox"
                    checked={selectedProviders.includes(provider._id)}
                    onChange={() => handleProviderSelect(provider._id)}
                    className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                  />
                </div>

                {/* Favorite button */}
                <button
                  className="absolute top-4 right-4 text-2xl"
                  onClick={() => handleToggleFavorite(provider._id)}
                >
                  {favoriteProviders.includes(provider._id) ? '❤️' : '🤍'}
                </button>

                <div className="flex items-start space-x-4 mb-4 pt-8">
                  <img
                    src={provider.profilePic || "/default-profile.png"}
                    alt={`${provider.firstName} ${provider.lastName}`}
                    className="w-16 h-16 rounded-full object-cover border-2 border-gray-200"
                  />
                  <div className="flex-1">
                    <h4 className="text-lg font-semibold text-gray-900">{provider.firstName} {provider.lastName}</h4>
                    <div className="flex items-center space-x-2 mb-2">
                      <span className="text-yellow-500">{renderStars(provider.averageRating || 0)}</span>
                      <span className="text-sm text-gray-600">({provider.totalReviews || 0})</span>
                    </div>
                    <div className="text-lg font-bold text-green-600">₱{provider.serviceRate || "N/A"}</div>
                  </div>
                  <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                    provider.isOnline ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {provider.isOnline ? '● Online' : '● Offline'}
                  </div>
                </div>

                <div className="space-y-3 mb-4">
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-gray-700">Skills:</span>
                    <span className="text-sm text-gray-600 text-right">{provider.skills?.join(", ") || "No skills listed"}</span>
                  </div>
                  <div className="flex justify-between items-start">
                    <span className="font-medium text-gray-700">About:</span>
                    <span className="text-sm text-gray-600 text-right flex-1 ml-2">{provider.serviceDescription || "No description"}</span>
                  </div>
                  {provider.reviews?.length > 0 && (
                    <div>
                      <span className="font-medium text-gray-700 block mb-2">Recent Reviews:</span>
                      <div className="space-y-1">
                        {provider.reviews.slice(0, 2).map((review, index) => (
                          <div key={index} className="text-xs text-gray-600 bg-gray-50 p-2 rounded">
                            <span className="font-medium">{review.reviewer?.firstName} {review.reviewer?.lastName}:</span>
                            <span> "{review.comment?.substring(0, 50)}..."</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Action buttons */}
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      className="bg-gray-600 hover:bg-gray-700 text-white text-sm py-2 px-3 rounded-lg transition-colors duration-200"
                      onClick={() => handleViewProfile(provider)}
                    >
                      View Profile
                    </button>
                    <button
                      className="bg-purple-600 hover:bg-purple-700 text-white text-sm py-2 px-3 rounded-lg transition-colors duration-200"
                      onClick={() => handleMessageProvider(provider)}
                    >
                      Message
                    </button>
                  </div>
                  <button
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200"
                    onClick={() => offerRequestToProvider(provider._id)}
                  >
                    Send Offer
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-600 text-lg">No workers match your current filters. Try adjusting your search criteria.</p>
          </div>
        )}
      </div>

      {/* Cancel Button */}
      <div className="flex justify-center">
        <button
          className="bg-red-600 hover:bg-red-700 text-white font-medium py-3 px-8 rounded-lg transition-colors duration-200"
          onClick={handleCancel}
        >
          Cancel Request
        </button>
      </div>
    </div>
  );
};

export default ClientDashboard;
