import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import api from "../api";
import socket from "../utils/socket";
import "./Css/WaitingForWorker.css";

const WaitingForWorkerPage = ({ requestData }) => {
  const location = useLocation();
  const data = requestData || location.state?.requestData;
  const [status, setStatus] = useState("Searching");
  const [workerData, setWorkerData] = useState(null);
  const [currentRequest, setCurrentRequest] = useState(null);
  const [availableRequests, setAvailableRequests] = useState([]);
  const [requestClients, setRequestClients] = useState({});
  const [requestStats, setRequestStats] = useState({});
  const [applyingTo, setApplyingTo] = useState(null);
  const [currentProvider, setCurrentProvider] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch current provider's profile
  const fetchCurrentProvider = async () => {
    try {
      console.log('WaitingForWorkerPage - Fetching current provider profile');
      const response = await api.get('/user/profile');
      if (response.data?.user) {
        const provider = response.data.user;
        console.log('WaitingForWorkerPage - Current provider:', provider);
        setCurrentProvider(provider);
        return provider;
      }
    } catch (error) {
      console.error('WaitingForWorkerPage - Failed to fetch provider profile:', error);
    }
    return null;
  };

  // Fetch all available requests that match provider's skills/services
  const fetchAvailableRequests = async (provider) => {
    if (!provider) return;

    try {
      console.log('WaitingForWorkerPage - Fetching all available requests');

      // Try different endpoints to get all requests
      let allRequests = [];

      // Primary: Get all service requests
      try {
        const response = await api.get('/user/all-service-requests');
        if (response.data?.success && response.data.requests) {
          allRequests = response.data.requests;
          console.log('WaitingForWorkerPage - Got requests from all-service-requests:', allRequests.length);
        }
      } catch (primaryError) {
        console.log('WaitingForWorkerPage - Primary endpoint failed, trying alternatives');
      }

      // Fallback: Try available requests endpoint
      if (allRequests.length === 0) {
        try {
          const response = await api.get('/settings/available-requests');
          if (response.data?.success && response.data.requests) {
            allRequests = response.data.requests;
            console.log('WaitingForWorkerPage - Got requests from available-requests:', allRequests.length);
          }
        } catch (fallbackError) {
          console.log('WaitingForWorkerPage - Fallback endpoint also failed');
        }
      }

      // Filter requests that match provider's skills or budget
      const matchedRequests = allRequests.filter(request => {
        // Must be available (Waiting or Open status)
        const isAvailable = request.status === "Waiting" || request.status === "Open";
        if (!isAvailable) return false;

        // Must not be the provider's own request
        const isNotOwnRequest = request.requester?._id !== provider._id;
        if (!isNotOwnRequest) return false;

        // Must not already be assigned to someone else
        const isNotAssigned = !request.serviceProvider || request.serviceProvider._id === provider._id;
        if (!isNotAssigned) return false;

        // Check if request matches provider's skills
        const skillsMatch = provider.skills?.some(skill =>
          skill.toLowerCase().includes(request.typeOfWork?.toLowerCase()) ||
          request.typeOfWork?.toLowerCase().includes(skill.toLowerCase())
        );

        // Check if budget matches provider's service rate (within reasonable range)
        const budgetMatches = request.budget && provider.serviceRate &&
          Math.abs(request.budget - provider.serviceRate) / provider.serviceRate <= 0.5; // Within 50% range

        const matches = skillsMatch || budgetMatches;

        if (matches) {
          console.log('WaitingForWorkerPage - Request matches provider:', {
            requestId: request._id,
            typeOfWork: request.typeOfWork,
            budget: request.budget,
            skillsMatch,
            budgetMatches,
            providerSkills: provider.skills,
            providerRate: provider.serviceRate
          });
        }

        return matches;
      });

      console.log('WaitingForWorkerPage - Found', matchedRequests.length, 'matched requests for provider');
      setAvailableRequests(matchedRequests);
    } catch (error) {
      console.error("WaitingForWorkerPage - Failed to fetch available requests:", error);
      setAvailableRequests([]);
    }
  };

  // Fetch reviews and stats for providers
  const fetchProviderData = async (providers) => {
    if (!providers?.length) return;
    const reviews = {};
    const stats = {};
    const batchSize = 5;

    console.log('WaitingForWorkerPage - Fetching provider data for', providers.length, 'providers');

    for (let i = 0; i < providers.length; i += batchSize) {
      const batch = providers.slice(i, i + batchSize);
      await Promise.all(batch.map(async (provider) => {
        if (!provider?._id) return;

        try {
          // Try to get provider profile data first
          console.log('WaitingForWorkerPage - Fetching profile for provider:', provider._id);
          const profileResponse = await api.get(`/user/profile/${provider._id}`);
          if (profileResponse.data?.user) {
            const profileData = profileResponse.data.user;
            // Update the provider data with complete profile info
            provider.profilePic = profileData.profilePic || provider.profilePic;
            provider.skills = profileData.skills || provider.skills;
            provider.serviceDescription = profileData.serviceDescription || provider.serviceDescription;
            provider.serviceRate = profileData.serviceRate || provider.serviceRate;
            provider.isOnline = profileData.isOnline || provider.isOnline;
            console.log('WaitingForWorkerPage - Updated provider profile:', provider._id, profileData);
          }
        } catch (profileError) {
          console.log('WaitingForWorkerPage - Profile endpoint not available, using existing data for provider:', provider._id);
        }

        try {
          // Try to get review stats
          const statsResponse = await api.get(`/review/stats/${provider._id}`);
          stats[provider._id] = statsResponse.data?.stats || { totalReviews: 0, averageRating: 0 };
        } catch (statsError) {
          console.log('WaitingForWorkerPage - Review stats not available for provider:', provider._id);
          stats[provider._id] = { totalReviews: 0, averageRating: 0 };
        }

        try {
          // Try to get recent reviews
          const reviewsResponse = await api.get(`/review/user/${provider._id}`);
          const reviewData = reviewsResponse.data?.reviews || [];
          reviews[provider._id] = Array.isArray(reviewData) ? reviewData.slice(0, 3) : [];
        } catch (reviewsError) {
          console.log('WaitingForWorkerPage - Reviews not available for provider:', provider._id);
          reviews[provider._id] = [];
        }
      }));
    }

    console.log('WaitingForWorkerPage - Completed fetching provider data');
    setProviderStats(stats);
    setProviderReviews(reviews);
  };

  // Offer request to specific provider
  const offerRequestToProvider = async (providerId) => {
    if (!currentRequest?._id || !providerId) return alert("Unable to process request.");
    const selectedProvider = matchedProviders.find(p => p._id === providerId);
    if (!selectedProvider) return alert("Provider not found.");

    setOfferingTo(providerId);
    try {
      await api.post('/user/offer-to-provider', {
        providerId,
        requestId: currentRequest._id
      });
      const providerName = `${selectedProvider.firstName || ''} ${selectedProvider.lastName || ''}`.trim();
      alert(`Request offered to ${providerName || 'provider'}! Waiting for response...`);
      const refreshResponse = await api.get(`/user/service-request/${currentRequest._id}`);
      if (refreshResponse.data?.request) setCurrentRequest(refreshResponse.data.request);
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || "Failed to offer request";
      alert(`${errorMessage}. Please try again.`);
    } finally {
      setOfferingTo(null);
    }
  };

  // Apply to a request
  const applyToRequest = async (requestId) => {
    if (!requestId || !currentProvider) return alert("Unable to process application.");

    setApplyingTo(requestId);
    try {
      const response = await api.post('/user/apply-to-request', {
        requestId,
        providerId: currentProvider._id
      });

      if (response.data.success) {
        alert("Application submitted successfully! The client will be notified.");
        // Refresh the available requests
        await fetchAvailableRequests(currentProvider);
      } else {
        alert("Failed to submit application.");
      }
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || "Failed to apply";
      alert(`${errorMessage}. Please try again.`);
    } finally {
      setApplyingTo(null);
    }
  };

  useEffect(() => {
    const initialize = async () => {
      setIsLoading(true);
      setError(null);

      // Fetch current provider's profile
      const provider = await fetchCurrentProvider();
      if (provider) {
        // Fetch available requests that match provider's skills/services
        await fetchAvailableRequests(provider);
      } else {
        setError("Unable to load provider profile");
      }

      setIsLoading(false);
    };

    initialize();

    // Listen for real-time updates
    if (socket) {
      const handleRequestUpdate = (updateData) => {
        console.log('WaitingForWorkerPage - Real-time request update:', updateData);
        if (currentProvider) {
          fetchAvailableRequests(currentProvider);
        }
      };

      socket.on("service-request-updated", handleRequestUpdate);
      socket.on("new-service-request", handleRequestUpdate);

      return () => {
        socket.off("service-request-updated", handleRequestUpdate);
        socket.off("new-service-request", handleRequestUpdate);
      };
    }
  }, []);

  const renderStars = (rating) => {
    return "★".repeat(Math.round(rating)) + "☆".repeat(5 - Math.round(rating));
  };

  const getStatusBadgeClass = () => {
    if (status === "Found") return "status-found";
    if (currentRequest?.status === "No Longer Available") return "status-expired";
    return "status-searching";
  };

  const getStatusText = () => {
    if (status === "Found") return "Provider Found";
    if (currentRequest?.status === "No Longer Available") return "Expired";
    return "Searching";
  };

  if (isLoading) {
    return (
      <div className="loading-container">
        <div className="loading-content">
          <div className="spinner"></div>
          <h3>Loading your request</h3>
          <p>Please wait a moment...</p>
        </div>
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
    <div className="page-wrapper">
      <div className="container">
        <div className="grid-layout">

          {/* LEFT COLUMN - Provider Profile */}
          <div className="main-content">

            {/* Header Card */}
            <div className="card header-card">
              <div className="header-left">
                <h2>Available Jobs</h2>
                <p>Matching your skills</p>
              </div>
              <div className="status-badge status-found">
                {availableRequests.length} Jobs Found
              </div>
            </div>

            {/* Provider Profile */}
            {currentProvider && (
              <div className="card">
                <h3 className="card-title">Your Profile</h3>
                <div className="details-grid">
                  <div className="detail-row">
                    <svg className="detail-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                    </svg>
                    <div className="detail-content">
                      <p>Name</p>
                      <p>{currentProvider.firstName} {currentProvider.lastName}</p>
                    </div>
                  </div>
                  <div className="detail-row">
                    <svg className="detail-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path>
                    </svg>
                    <div className="detail-content">
                      <p>Service Rate</p>
                      <p>₱{currentProvider.serviceRate || "Not set"}</p>
                    </div>
                  </div>
                </div>
                <div className="detail-row detail-notes">
                  <svg className="detail-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                  <div className="detail-content">
                    <p>Your Skills</p>
                    <p>{currentProvider.skills?.join(", ") || "No skills listed"}</p>
                  </div>
                </div>
              </div>
            )}

          </div>

          {/* CENTER COLUMN - Available Requests List */}
          <div className="center-content">

            {/* Available Requests */}
            <div className="card">
              <h3 className="card-title">
                Jobs Matching Your Skills & Rate
              </h3>

              {availableRequests.length > 0 ? (
                <div className="providers-list">
                  {availableRequests.map((request) => {
                    const clientName = request.requester ?
                      `${request.requester.firstName || ""} ${request.requester.lastName || ""}`.trim() ||
                      request.requester.username ||
                      "Unknown Client" :
                      "N/A";

                    return (
                      <div key={request._id} className="provider-item">
                        <div className="provider-summary">
                          <img
                            src={request.requester?.profilePic || "/default-profile.png"}
                            alt={clientName}
                            className="provider-image"
                          />
                          <div className="provider-info">
                            <h4>{clientName}</h4>
                            <div className="provider-rating">
                              <span>{request.typeOfWork || "General Service"}</span>
                            </div>
                            <div className="provider-stats">
                              <span className="provider-price">₱{request.budget || "0"}</span>
                              <span className="provider-status online">
                                ● Available
                              </span>
                            </div>
                          </div>
                          <button
                            onClick={() => applyToRequest(request._id)}
                            disabled={applyingTo === request._id}
                            className="provider-button"
                          >
                            {applyingTo === request._id ? "Applying..." : "Apply"}
                          </button>
                        </div>
                        <div className="provider-details">
                          <div className="detail-section">
                            <div className="section-label">Service Needed</div>
                            <div className="section-text">{request.typeOfWork || "General Service"}</div>
                          </div>
                          <div className="detail-section">
                            <div className="section-label">Location</div>
                            <div className="section-text">{request.address || "Not specified"}</div>
                          </div>
                          <div className="detail-section">
                            <div className="section-label">Preferred Time</div>
                            <div className="section-text">{request.time || "Flexible"}</div>
                          </div>
                          <div className="detail-section">
                            <div className="section-label">Budget</div>
                            <div className="section-text">₱{request.budget || "0"}</div>
                          </div>
                          {request.notes && (
                            <div className="detail-section">
                              <div className="section-label">Notes</div>
                              <div className="section-text">{request.notes}</div>
                            </div>
                          )}
                          <div className="detail-section">
                            <div className="section-label">Posted</div>
                            <div className="section-text">
                              {request.createdAt ? new Date(request.createdAt).toLocaleDateString() : "Unknown"}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="empty-state">
                  <div className="empty-icon">
                    <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                    </svg>
                  </div>
                  <h4 className="empty-title">No matching jobs found</h4>
                  <p className="empty-text">Jobs matching your skills and rate will appear here</p>
                </div>
              )}
            </div>

          </div>

          {/* RIGHT COLUMN - Stats & Info */}
          <div className="sidebar">

              <div className="actions-card">
                <div className="info-card">
                  <h4>How Matching Works</h4>
                  <p>You see jobs that match:</p>
                  <ul style={{paddingLeft: 20, margin: 0}}>
                    <li>Your listed skills</li>
                    <li>Jobs within 50% of your rate</li>
                    <li>Available requests only</li>
                  </ul>
                </div>

                {currentProvider && (
                  <div className="info-card" style={{marginTop: 20}}>
                    <h4>Your Stats</h4>
                    <p>Skills: {currentProvider.skills?.length || 0}</p>
                    <p>Rate: ₱{currentProvider.serviceRate || "Not set"}</p>
                  </div>
                )}
              </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WaitingForWorkerPage;
