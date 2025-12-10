import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api.js';
import { useMainContext } from '../../mainContext';
import toast from 'react-hot-toast';
import socket from '../../utils/socket';

const ProviderDashboard = () => {
  const { user, isAuthorized } = useMainContext();
  const [offers, setOffers] = useState([]);
  const [recommendedJobs, setRecommendedJobs] = useState([]);
  const [allAvailableJobs, setAllAvailableJobs] = useState([]);
  const [filteredJobs, setFilteredJobs] = useState([]);
  const [filteredAllJobs, setFilteredAllJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('offers'); // offers, recommended, all-jobs
  const [jobFilters, setJobFilters] = useState({
    serviceType: '',
    location: '',
    minBudget: 0,
    maxBudget: 10000,
    sortBy: 'relevance' // relevance, budget-low, budget-high, date
  });
  const [savedJobs, setSavedJobs] = useState(new Set());
  const [jobAlerts, setJobAlerts] = useState([]);
  const [applicationHistory, setApplicationHistory] = useState([]);
  const [profileCompletion, setProfileCompletion] = useState(0);

  useEffect(() => {
    const fetchMyOffers = async () => {
      if (!isAuthorized || !user) {
        setLoading(false);
        return;
      }

      try {
        const response = await api.get('/user/service-requests');
        if (response.data.success) {
          // Filter requests that have been offered to providers (status: "Offered")
          const offeredRequests = response.data.requests.filter(request =>
            request.status === 'Offered' && request.targetProvider
          );
          setOffers(offeredRequests);
        }
      } catch (error) {
        console.error('Error fetching offers:', error);
        setError('Failed to load offers');
        toast.error('Failed to load offers');
      } finally {
        setLoading(false);
      }
    };

    fetchMyOffers();
    fetchRecommendedJobs();
    fetchAllAvailableJobs();

    // Socket integration for real-time updates
    if (socket && user) {
      socket.emit("join-user-room", user._id);

      const handleOfferUpdate = (data) => {
        if (data.action === "offered" || data.action === "accepted" || data.action === "rejected") {
          fetchMyOffers(); // Refresh offers
        }
      };

      socket.on("service-request-updated", handleOfferUpdate);

      return () => {
        socket.off("service-request-updated", handleOfferUpdate);
        socket.emit("leave-user-room", user._id);
      };
    }
  }, [user, isAuthorized]);

  // Apply filters when jobs or filters change
  useEffect(() => {
    const filtered = applyJobFilters(recommendedJobs);
    setFilteredJobs(filtered);
  }, [recommendedJobs, jobFilters]);

  const maskPhone = (phone) => {
    if (!phone) return "N/A";
    return phone.replace(/\d(?=\d{3})/g, "*");
  };

  const maskEmail = (email) => {
    if (!email || !email.includes("@")) return "N/A";
    const [user, domain] = email.split("@");
    const maskedUser = user[0] + "*".repeat(Math.max(user.length - 2, 1)) + user.slice(-1);
    return `${maskedUser}@${domain}`;
  };

  const fetchRecommendedJobs = async () => {
    try {
      const response = await api.get('/user/recommended-jobs');
      if (response.data.success) {
        setRecommendedJobs(response.data.jobs);
      }
    } catch (error) {
      console.error('Error fetching recommended jobs:', error);
    }
  };

  const fetchAllAvailableJobs = async () => {
    try {
      const response = await api.get('/user/available-service-requests');
      if (response.data.success) {
        setAllAvailableJobs(response.data.requests);
      }
    } catch (error) {
      console.error('Error fetching all available jobs:', error);
    }
  };

  const handleAcceptOffer = async (requestId) => {
    try {
      const response = await api.post(`/user/offer/${requestId}/accept`);
      if (response.data.success) {
        toast.success('Offer accepted successfully!');
        // Remove the offer from the list
        setOffers(offers.filter(offer => offer._id !== requestId));
        // Refresh data
        fetchMyOffers();
      }
    } catch (error) {
      console.error('Error accepting offer:', error);
      toast.error('Failed to accept offer');
    }
  };

  const handleDeclineOffer = async (requestId) => {
    if (!window.confirm('Are you sure you want to decline this offer?')) return;

    try {
      const response = await api.post(`/user/offer/${requestId}/reject`);
      if (response.data.success) {
        toast.success('Offer declined successfully!');
        // Remove the offer from the list
        setOffers(offers.filter(offer => offer._id !== requestId));
        // Refresh data
        fetchMyOffers();
      }
    } catch (error) {
      console.error('Error declining offer:', error);
      toast.error('Failed to decline offer');
    }
  };

  // Apply collaborative and content-based filtering for recommended jobs
  const applyJobFilters = (jobs) => {
    if (!jobs?.length) return [];

    let filtered = [...jobs];

    // Content-Based Filtering (CBF) - already done on backend, but enhance client-side
    // This ensures jobs match provider's skills and preferences

    // Apply search filters
    if (jobFilters.serviceType) {
      const serviceFilter = jobFilters.serviceType.toLowerCase();
      filtered = filtered.filter(job =>
        job.typeOfWork?.toLowerCase().includes(serviceFilter)
      );
    }

    // Budget filtering
    if (jobFilters.minBudget > 0 || jobFilters.maxBudget < 10000) {
      filtered = filtered.filter(job => {
        const budget = job.budget || 0;
        return budget >= jobFilters.minBudget && budget <= jobFilters.maxBudget;
      });
    }

    // Collaborative Filtering (CF) - enhance with additional scoring
    // Jobs with higher budgets and more recent dates get boosted
    filtered = filtered.map(job => {
      let cfScore = job.recommendationScore || 0;

      // Boost recent jobs
      const jobDate = new Date(job.createdAt || job.preferredDate);
      const daysSincePosted = (new Date() - jobDate) / (1000 * 60 * 60 * 24);
      if (daysSincePosted < 7) cfScore += 2; // Boost recent jobs
      else if (daysSincePosted < 30) cfScore += 1;

      // Boost jobs with reasonable budgets (not too low or too high)
      const budget = job.budget || 0;
      if (budget > 500 && budget < 5000) cfScore += 1;

      return { ...job, finalScore: cfScore };
    });

    // Sorting
    switch (jobFilters.sortBy) {
      case 'budget-low':
        filtered.sort((a, b) => (a.budget || 0) - (b.budget || 0));
        break;
      case 'budget-high':
        filtered.sort((a, b) => (b.budget || 0) - (a.budget || 0));
        break;
      case 'date':
        filtered.sort((a, b) => new Date(b.createdAt || b.preferredDate) - new Date(a.createdAt || a.preferredDate));
        break;
      case 'relevance':
      default:
        filtered.sort((a, b) => (b.finalScore || 0) - (a.finalScore || 0));
        break;
    }

    return filtered;
  };

  const handleApplyToJob = async (jobId) => {
    if (!window.confirm('Are you sure you want to apply for this job? The client will be notified of your interest.')) return;

    try {
      // Apply to the job by sending an offer to the client
      await api.post('/user/offer-to-provider', {
        providerId: user._id, // Current provider
        requestId: jobId
      });

      toast.success('Successfully applied for the job! The client has been notified.');
      // Refresh the data to remove the applied job from the list
      fetchRecommendedJobs();
      fetchAllAvailableJobs();
    } catch (error) {
      console.error('Error applying to job:', error);
      toast.error('Failed to apply for job. Please try again.');
    }
  };

  if (!isAuthorized || !user) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="text-center py-20 px-6">
          <div className="text-6xl mb-6">🔒</div>
          <h3 className="text-3xl font-bold text-gray-900 mb-4">Authentication Required</h3>
          <p className="text-gray-600 mb-6 text-lg">Please log in to access your dashboard.</p>
          <button
            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-medium transition-colors duration-200"
            onClick={() => window.location.href = '/login'}
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* LinkedIn-style Layout with Left Sidebar */}
      <div className="flex flex-col lg:flex-row gap-8">
        {/* Main Content Area */}
        <div className="flex-1">
          {/* Header and Filters Row */}
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-8 mb-8">
            {/* Header */}
            <div className="flex-1">
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Provider Dashboard</h2>
              <p className="text-gray-600 text-lg">Manage your offers and discover new job opportunities.</p>
            </div>

            {/* Filter Jobs Section */}
            <div className="lg:w-96">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
                    <input
                      type="text"
                      placeholder="Job title, client, or keywords..."
                      value={jobFilters.serviceType}
                      onChange={(e) => setJobFilters(prev => ({ ...prev, serviceType: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                 
                </div>
            </div>
          </div>

      {/* Tab Navigation */}
      <div className="mb-8">
        <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg w-fit">
          <button
            onClick={() => setActiveTab('offers')}
            className={`px-6 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${
              activeTab === 'offers'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Offers Received ({offers.length})
          </button>
          <button
            onClick={() => setActiveTab('recommended')}
            className={`px-6 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${
              activeTab === 'recommended'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Recommended ({filteredJobs.length})
          </button>
          <button
            onClick={() => setActiveTab('browse-all')}
            className={`px-6 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${
              activeTab === 'browse-all'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900 bg-gray-50 hover:bg-white'
            }`}
          >
            Browse All Jobs ({allAvailableJobs.length})
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-20 px-6">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your dashboard...</p>
        </div>
      ) : error ? (
        <div className="text-center py-20 px-6">
          <p className="text-red-600 text-lg">{error}</p>
        </div>
      ) : (
        <>
          {/* Offers Tab */}
          {activeTab === 'offers' && (
            <div>
              <div className="mb-6">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Offers Received</h3>
                <p className="text-gray-600">Manage offers that clients have made to you.</p>
              </div>

              {offers.length === 0 ? (
                <div className="text-center py-20 px-6 bg-white rounded-lg shadow-md">
                  <div className="text-6xl mb-4">📋</div>
                  <h4 className="text-xl font-semibold text-gray-900 mb-2">No Offers Yet</h4>
                  <p className="text-gray-600">You haven't received any offers yet. Your profile will be visible to clients looking for your skills.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {offers.map((offer) => (
                    <div key={offer._id} className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                        <h4 className="text-xl font-semibold text-gray-900">Offer for: {offer.typeOfWork}</h4>
                        <span className="bg-orange-100 text-orange-800 px-3 py-1 rounded-full text-sm font-medium w-fit">
                          Pending Response
                        </span>
                      </div>
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                        <div className="bg-gray-50 rounded-lg p-6">
                          <h5 className="font-semibold mb-4 text-gray-900">Client Details:</h5>
                          <div className="space-y-2">
                            <p className="text-sm"><strong className="font-medium text-gray-700">Name:</strong> <span className="text-gray-600">{offer.requester?.firstName} {offer.requester?.lastName}</span></p>
                            <p className="text-sm"><strong className="font-medium text-gray-700">Email:</strong> <span className="text-gray-600">{maskEmail(offer.requester?.email)}</span></p>
                            <p className="text-sm"><strong className="font-medium text-gray-700">Phone:</strong> <span className="text-gray-600">{maskPhone(offer.requester?.phone)}</span></p>
                          </div>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-6">
                          <h5 className="font-semibold mb-4 text-gray-900">Request Details:</h5>
                          <div className="space-y-2">
                            <p className="text-sm"><strong className="font-medium text-gray-700">Service Needed:</strong> <span className="text-gray-600">{offer.typeOfWork}</span></p>
                            <p className="text-sm"><strong className="font-medium text-gray-700">Budget:</strong> <span className="text-gray-600">₱{offer.budget}</span></p>
                            <p className="text-sm"><strong className="font-medium text-gray-700">Preferred Date:</strong> <span className="text-gray-600">{offer.preferredDate || 'Not specified'}</span></p>
                            <p className="text-sm"><strong className="font-medium text-gray-700">Time:</strong> <span className="text-gray-600">{offer.time || 'Not specified'}</span></p>
                            <p className="text-sm"><strong className="font-medium text-gray-700">Address:</strong> <span className="text-gray-600">{offer.address}</span></p>
                            {offer.notes && <p className="text-sm"><strong className="font-medium text-gray-700">Notes:</strong> <span className="text-gray-600">{offer.notes}</span></p>}
                          </div>
                        </div>
                      </div>
                      <div className="border-t border-gray-200 pt-4">
                        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                          <p className="text-gray-500 italic">Waiting for you to accept or decline the offer.</p>
                          <div className="flex gap-3">
                            <button
                              className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-medium transition-colors duration-200"
                              onClick={() => handleAcceptOffer(offer._id)}
                            >
                              Accept Offer
                            </button>
                            <button
                              className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg font-medium transition-colors duration-200"
                              onClick={() => handleDeclineOffer(offer._id)}
                            >
                              Decline Offer
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Recommended Jobs Tab */}
          {activeTab === 'recommended' && (
            <div>
              <div className="mb-6">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Recommended Jobs ({filteredJobs.length})</h3>
                <p className="text-gray-600">Jobs personalized for your skills and experience.</p>
              </div>

              {recommendedJobs.length === 0 ? (
                <div className="text-center py-20 px-6 bg-white rounded-lg shadow-md">
                  <div className="text-6xl mb-4">🎯</div>
                  <h4 className="text-xl font-semibold text-gray-900 mb-2">No Recommendations Yet</h4>
                  <p className="text-gray-600">Complete your profile to get personalized job recommendations.</p>
                </div>
              ) : (
                <>
                  {/* Job Filters */}
                  <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                    <h4 className="text-lg font-semibold text-gray-900 mb-4">Filter & Sort Jobs</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Service Type:</label>
                        <input
                          type="text"
                          placeholder="Filter by service..."
                          value={jobFilters.serviceType}
                          onChange={(e) => setJobFilters(prev => ({ ...prev, serviceType: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Min Budget:</label>
                        <input
                          type="number"
                          placeholder="Min budget"
                          value={jobFilters.minBudget || ''}
                          onChange={(e) => setJobFilters(prev => ({ ...prev, minBudget: parseFloat(e.target.value) || 0 }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Max Budget:</label>
                        <input
                          type="number"
                          placeholder="Max budget"
                          value={jobFilters.maxBudget < 10000 ? jobFilters.maxBudget : ''}
                          onChange={(e) => setJobFilters(prev => ({ ...prev, maxBudget: parseFloat(e.target.value) || 10000 }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Sort By:</label>
                        <select
                          value={jobFilters.sortBy}
                          onChange={(e) => setJobFilters(prev => ({ ...prev, sortBy: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="relevance">Relevance (Recommended)</option>
                          <option value="budget-high">Budget: High to Low</option>
                          <option value="budget-low">Budget: Low to High</option>
                          <option value="date">Most Recent</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    {filteredJobs.map((job) => (
                      <div key={job._id} className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
                        <h4 className="text-xl font-semibold text-gray-900 mb-4">{job.typeOfWork}</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                          <div>
                            <p className="text-sm mb-2"><strong className="font-medium text-gray-700">Budget:</strong> <span className="text-gray-600">₱{job.budget}</span></p>
                            <p className="text-sm mb-2"><strong className="font-medium text-gray-700">Date:</strong> <span className="text-gray-600">{job.preferredDate || 'Not specified'}</span></p>
                          </div>
                          <div>
                            <p className="text-sm mb-2"><strong className="font-medium text-gray-700">Time:</strong> <span className="text-gray-600">{job.time || 'Not specified'}</span></p>
                            <p className="text-sm mb-2"><strong className="font-medium text-gray-700">Notes:</strong> <span className="text-gray-600">{job.notes || 'None'}</span></p>
                          </div>
                        </div>
                        <div className="flex justify-end">
                          <button
                            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors duration-200"
                            onClick={() => handleApplyToJob(job._id)}
                          >
                            Apply for Job
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Browse All Jobs Tab - Full BrowseJobs functionality */}
          {activeTab === 'browse-all' && (
            <div>
              <div className="mb-6">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Browse All Available Jobs</h3>
                <p className="text-gray-600">Find service opportunities that match your skills from all posted requests.</p>
              </div>

              {/* Saved Jobs Counter */}
              {savedJobs.size > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                  <div className="flex items-center justify-between">
                    <span className="text-yellow-800 font-medium">
                      {savedJobs.size} job{savedJobs.size > 1 ? 's' : ''} saved for later
                    </span>
                    <button
                      className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200 text-sm"
                      onClick={() => {/* Navigate to saved jobs */}}
                    >
                      View Saved Jobs
                    </button>
                  </div>
                </div>
              )}



              {/* Results */}
              <div className="mb-4">
                <p className="text-gray-600">{allAvailableJobs.length} jobs available</p>
              </div>

              {allAvailableJobs.length === 0 ? (
                <div className="text-center py-20 px-6 bg-white rounded-lg shadow-md">
                  <div className="text-6xl mb-4">💼</div>
                  <h4 className="text-xl font-semibold text-gray-900 mb-2">No Jobs Found</h4>
                  <p className="text-gray-600">Try adjusting your filters or check back later for new opportunities.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {allAvailableJobs.map((job) => (
                    <div key={job._id} className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow duration-200 relative">
                      {/* Save Job Button */}
                      <button
                        className="absolute top-4 right-4 text-2xl"
                        onClick={() => {/* toggleSaveJob(job._id) */}}
                      >
                        {savedJobs.has(job._id) ? '⭐' : '☆'}
                      </button>

                      {/* Urgent Badge */}
                      {(() => {
                        if (!job.preferredDate) return false;
                        const preferredDate = new Date(job.preferredDate);
                        const now = new Date();
                        const timeDiff = preferredDate - now;
                        return timeDiff > 0 && timeDiff < 24 * 60 * 60 * 1000;
                      })() && (
                        <div className="absolute top-4 left-4">
                          <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full font-medium">
                            URGENT
                          </span>
                        </div>
                      )}

                      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
                        {/* Job Details */}
                        <div className="flex-1">
                          <div className="flex items-start gap-4 mb-4">
                            <div className="flex-1">
                              <h4 className="text-2xl font-bold text-gray-900 mb-2">{job.typeOfWork}</h4>
                              <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
                                <span>📍 {job.address || 'Location not specified'}</span>
                                <span>📅 {job.preferredDate || 'Date flexible'}</span>
                                <span>⏰ {job.time || 'Time flexible'}</span>
                              </div>
                              <div className="flex items-center gap-2 mb-3">
                                <span className="text-2xl font-bold text-green-600">₱{job.budget?.toLocaleString() || 'Budget not specified'}</span>
                                <span className="text-sm text-gray-500">• Posted {new Date(job.createdAt).toLocaleDateString()}</span>
                              </div>
                            </div>
                          </div>

                          {/* Client Info */}
                          <div className="bg-gray-50 rounded-lg p-4 mb-4">
                            <h5 className="font-semibold text-gray-900 mb-2">Client Information</h5>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                              <p><strong>Name:</strong> {job.requester?.firstName} {job.requester?.lastName}</p>
                              <p><strong>Contact:</strong> {job.name}</p>
                              <p><strong>Phone:</strong> {job.phone}</p>
                              <p><strong>Posted:</strong> {new Date(job.createdAt).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric'
                              })}</p>
                            </div>
                          </div>

                          {/* Job Description */}
                          {job.notes && (
                            <div className="mb-4">
                              <h5 className="font-semibold text-gray-900 mb-2">Job Description</h5>
                              <p className="text-gray-700 bg-gray-50 p-3 rounded-lg">{job.notes}</p>
                            </div>
                          )}
                        </div>

                        {/* Action Buttons */}
                        <div className="lg:w-64 flex flex-col gap-3">
                          <button
                            className="w-full bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded-lg transition-colors duration-200 text-sm"
                            onClick={() => {
                              alert(`Job: ${job.typeOfWork}\nClient: ${job.requester?.firstName} ${job.requester?.lastName}\nBudget: ₱${job.budget?.toLocaleString() || 'Not specified'}\nDate: ${job.preferredDate || 'Flexible'}\nTime: ${job.time || 'Flexible'}\nLocation: ${job.address || 'Not specified'}\n\nNotes: ${job.notes || 'No additional notes'}\n\nPosted: ${new Date(job.createdAt).toLocaleString()}`);
                            }}
                          >
                            📋 View Details
                          </button>

                          <button
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg transition-colors duration-200 text-sm font-medium"
                            onClick={() => handleApplyToJob(job._id)}
                          >
                            🚀 Apply Now
                          </button>

                          <button
                            className="w-full bg-purple-600 hover:bg-purple-700 text-white py-2 px-4 rounded-lg transition-colors duration-200 text-sm"
                            onClick={() => {/* Handle message to client */}}
                          >
                            💬 Message Client
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* All Jobs Tab */}
          {activeTab === 'all-jobs' && (
            <div>
              <div className="mb-6">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">All Available Posted Requests ({allAvailableJobs.length})</h3>
                <p className="text-gray-600">Browse and apply to every single posted service request that needs completion.</p>
              </div>

              {allAvailableJobs.length === 0 ? (
                <div className="text-center py-20 px-6 bg-white rounded-lg shadow-md">
                  <div className="text-6xl mb-4">📋</div>
                  <h4 className="text-xl font-semibold text-gray-900 mb-2">No Posted Requests Available</h4>
                  <p className="text-gray-600">There are currently no active service requests waiting for providers. New requests will appear here as they are posted.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {allAvailableJobs.map((job) => (
                    <div key={job._id} className="bg-white rounded-lg shadow-md p-6 border border-gray-200 hover:shadow-lg transition-shadow duration-200">
                      {/* Header with Service Type and Status */}
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                        <h4 className="text-2xl font-bold text-gray-900">{job.typeOfWork}</h4>
                        <div className="flex items-center gap-3">
                          <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
                            Available for Application
                          </span>
                          <span className="text-sm text-gray-500">
                            Posted {new Date(job.createdAt).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric'
                            })}
                          </span>
                        </div>
                      </div>

                      {/* Main Details Grid */}
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                        {/* Client Information */}
                        <div className="bg-blue-50 rounded-lg p-4">
                          <h5 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                            👤 Client Information
                          </h5>
                          <div className="space-y-2">
                            <p className="text-sm"><strong className="font-medium text-gray-700">Name:</strong> <span className="text-gray-600">{job.requester?.firstName} {job.requester?.lastName}</span></p>
                            <p className="text-sm"><strong className="font-medium text-gray-700">Contact:</strong> <span className="text-gray-600">{job.name}</span></p>
                            <p className="text-sm"><strong className="font-medium text-gray-700">Phone:</strong> <span className="text-gray-600">{job.phone}</span></p>
                          </div>
                        </div>

                        {/* Job Details */}
                        <div className="bg-green-50 rounded-lg p-4">
                          <h5 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                            📋 Job Details
                          </h5>
                          <div className="space-y-2">
                            <p className="text-sm"><strong className="font-medium text-gray-700">Budget:</strong> <span className="text-green-600 font-bold text-lg">₱{job.budget?.toLocaleString() || 'Not specified'}</span></p>
                            <p className="text-sm"><strong className="font-medium text-gray-700">Preferred Date:</strong> <span className="text-gray-600">{job.preferredDate || 'Flexible'}</span></p>
                            <p className="text-sm"><strong className="font-medium text-gray-700">Time:</strong> <span className="text-gray-600">{job.time || 'Flexible'}</span></p>
                          </div>
                        </div>

                        {/* Location & Additional Info */}
                        <div className="bg-purple-50 rounded-lg p-4">
                          <h5 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                            📍 Location & Status
                          </h5>
                          <div className="space-y-2">
                            <p className="text-sm"><strong className="font-medium text-gray-700">Address:</strong> <span className="text-gray-600">{job.address || 'Not specified'}</span></p>
                            <p className="text-sm"><strong className="font-medium text-gray-700">Status:</strong> <span className="text-green-600 font-medium">Waiting for Provider</span></p>
                            <p className="text-sm"><strong className="font-medium text-gray-700">Posted:</strong> <span className="text-gray-600">{new Date(job.createdAt).toLocaleString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              hour: 'numeric',
                              minute: '2-digit'
                            })}</span></p>
                          </div>
                        </div>
                      </div>

                      {/* Detailed Notes/Description */}
                      {job.notes && (
                        <div className="mb-6 p-4 bg-gray-50 rounded-lg border-l-4 border-blue-500">
                          <h5 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                            📝 Additional Notes
                          </h5>
                          <p className="text-gray-700 leading-relaxed">{job.notes}</p>
                        </div>
                      )}

                      {/* Application Section */}
                      <div className="border-t border-gray-200 pt-4">
                        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                          <div className="text-sm text-gray-600">
                            <p>By applying to this job, the client will be notified of your interest and can review your application.</p>
                          </div>
                          <button
                            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-medium transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl"
                            onClick={() => handleApplyToJob(job._id)}
                          >
                            🚀 Apply for This Job
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
        </div>
      </div>
    </div>
  );
};

export default ProviderDashboard;
