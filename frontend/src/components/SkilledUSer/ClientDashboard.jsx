import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import api from "../../api";
import socket from "../../utils/socket";
import "./dashboard-content.css";

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

  const renderStars = (rating) => {
    return "★".repeat(Math.round(rating)) + "☆".repeat(5 - Math.round(rating));
  };

  if (isLoading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <h3>Loading your request...</h3>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <h2>❌ Error</h2>
        <p>{error}</p>
        <button onClick={() => window.location.reload()}>🔄 Refresh Page</button>
      </div>
    );
  }

  return (
    <div className="client-waiting-container">
      <div className="waiting-header">
        <h2>Waiting for Worker</h2>
        <div className={`status-badge ${status.toLowerCase()}`}>
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
      <div className="filters-card">
        <h3>Filter Workers</h3>
        <div className="filters-grid">
          <div className="filter-group">
            <label>Name:</label>
            <input
              type="text"
              placeholder="Search by name..."
              value={searchFilters.name}
              onChange={(e) => setSearchFilters(prev => ({ ...prev, name: e.target.value }))}
            />
          </div>
          <div className="filter-group">
            <label>Services:</label>
            <input
              type="text"
              placeholder="Search by skills/services..."
              value={searchFilters.services}
              onChange={(e) => setSearchFilters(prev => ({ ...prev, services: e.target.value }))}
            />
          </div>
          <div className="filter-group">
            <label>Min Rating:</label>
            <select
              value={searchFilters.minRating}
              onChange={(e) => setSearchFilters(prev => ({ ...prev, minRating: parseFloat(e.target.value) }))}
            >
              <option value={0}>Any Rating</option>
              <option value={3}>3+ Stars</option>
              <option value={4}>4+ Stars</option>
              <option value={4.5}>4.5+ Stars</option>
            </select>
          </div>
          <div className="filter-group">
            <label>Budget Range:</label>
            <div className="budget-range">
              <input
                type="number"
                placeholder="Min"
                value={searchFilters.minBudget || ''}
                onChange={(e) => setSearchFilters(prev => ({ ...prev, minBudget: parseFloat(e.target.value) || 0 }))}
              />
              <span>to</span>
              <input
                type="number"
                placeholder="Max"
                value={searchFilters.maxBudget < 10000 ? searchFilters.maxBudget : ''}
                onChange={(e) => setSearchFilters(prev => ({ ...prev, maxBudget: parseFloat(e.target.value) || 10000 }))}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Available Providers */}
      <div className="providers-section">
        <h3>Available Workers ({matchedProviders.length})</h3>
        {matchedProviders.length > 0 ? (
          <div className="providers-grid">
            {matchedProviders.map((provider) => (
              <div key={provider._id} className="provider-card">
                <div className="provider-header">
                  <img
                    src={provider.profilePic || "/default-profile.png"}
                    alt={`${provider.firstName} ${provider.lastName}`}
                    className="provider-avatar"
                  />
                  <div className="provider-info">
                    <h4>{provider.firstName} {provider.lastName}</h4>
                    <div className="provider-rating">
                      <span className="stars">{renderStars(provider.averageRating || 0)}</span>
                      <span className="rating-count">({provider.totalReviews || 0})</span>
                    </div>
                    <div className="provider-rate">₱{provider.serviceRate || "N/A"}</div>
                  </div>
                  <div className={`status-indicator ${provider.isOnline ? 'online' : 'offline'}`}>
                    {provider.isOnline ? '● Online' : '● Offline'}
                  </div>
                </div>

                <div className="provider-details">
                  <div className="detail-row">
                    <span className="label">Skills:</span>
                    <span className="value">{provider.skills?.join(", ") || "No skills listed"}</span>
                  </div>
                  <div className="detail-row">
                    <span className="label">About:</span>
                    <span className="value">{provider.serviceDescription || "No description"}</span>
                  </div>
                  {provider.reviews?.length > 0 && (
                    <div className="reviews-preview">
                      <span className="label">Recent Reviews:</span>
                      {provider.reviews.slice(0, 2).map((review, index) => (
                        <div key={index} className="review-item">
                          <span className="reviewer">{review.reviewer?.firstName} {review.reviewer?.lastName}:</span>
                          <span className="review-text">"{review.comment?.substring(0, 50)}..."</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <button
                  className="offer-button"
                  onClick={() => offerRequestToProvider(provider._id)}
                >
                  Send Offer
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="no-providers">
            <p>No workers match your current filters. Try adjusting your search criteria.</p>
          </div>
        )}
      </div>

      {/* Cancel Button */}
      <div className="action-buttons">
        <button className="cancel-button" onClick={handleCancel}>
          Cancel Request
        </button>
      </div>
    </div>
  );
};

export default ClientDashboard;
