import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import api from "../../api";
import { useMainContext } from "../../mainContext";
import toast from "react-hot-toast";
import CreateServiceRequest from "./CreateServiceRequest";
import ProviderProfileModal from "./ProviderProfileModal";
import SendOfferModal from "./SendOfferModal";
import {
  FaSearch, FaFilter, FaHeart, FaMapMarkerAlt, FaStar,
  FaPhone, FaEnvelope, FaEye, FaBriefcase,
  FaClock, FaUsers, FaTrophy, FaCheckCircle, FaEnvelopeOpen,
  FaPlus, FaHandshake, FaClipboardList, FaFileAlt, FaImage,
  FaThumbsUp, FaThumbsDown, FaCalendarAlt, FaDollarSign,
  FaChartLine, FaInfoCircle
} from "react-icons/fa";

// Helper function to render stars
const renderStars = (rating) => {
  const stars = [];
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 !== 0;

  for (let i = 0; i < 5; i++) {
    if (i < fullStars) {
      stars.push(<FaStar key={i} className="text-yellow-400 fill-current" />);
    } else if (i === fullStars && hasHalfStar) {
      stars.push(<FaStar key={i} className="text-yellow-400 opacity-50" />);
    } else {
      stars.push(<FaStar key={i} className="text-gray-300" />);
    }
  }
  return stars;
};

const ClientDashboard = () => {
  const { user, setOpenChatWithProvider } = useMainContext();
  const navigate = useNavigate();
  const location = useLocation();

  // Core state
  const [providers, setProviders] = useState([]);
  const [filteredProviders, setFilteredProviders] = useState([]);
  const [loading, setLoading] = useState(true);

  // Applications state for reviewing applications
  const [applications, setApplications] = useState([]);
  const [applicationsLoading, setApplicationsLoading] = useState(false);
  const [selectedProviders, setSelectedProviders] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [savedSearches, setSavedSearches] = useState([]);

  // Advanced filters state
  const [filters, setFilters] = useState({
    search: '',
    service: '',
    minRating: 0,
    maxRate: 10000,
    location: '',
    availability: 'any',
    experience: 'any',
    sortBy: 'rating',
    verified: false,
    topRated: false,
    availableNow: false
  });

  // UI state
  const [activeTab, setActiveTab] = useState('browse'); // browse, requests, applications
  const [viewMode, setViewMode] = useState('grid'); // grid, list
  const [showFilters, setShowFilters] = useState(false);
  const [showCreateRequest, setShowCreateRequest] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showSendOfferModal, setShowSendOfferModal] = useState(false);
  const [selectedProviderId, setSelectedProviderId] = useState(null);
  const [offerProvider, setOfferProvider] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(12);

  // All user requests (comprehensive view)
  const [allRequests, setAllRequests] = useState([]);
  const [requestsLoading, setRequestsLoading] = useState(false);

  // Job portal specific features
  const [recentSearches, setRecentSearches] = useState([]);
  const [recommendedProviders, setRecommendedProviders] = useState([]);
  const [trendingSkills, setTrendingSkills] = useState([]);
  const [applicationTracking, setApplicationTracking] = useState([]);

  useEffect(() => {
    fetchProviders();
    fetchRecommendedProviders();
    loadUserPreferences();
  }, []);

  useEffect(() => {
    // Fetch data based on active tab
    if (activeTab === 'applications') {
      fetchApplications();
    } else if (activeTab === 'requests') {
      fetchAllUserRequests();
      // Fetch applications after a short delay to ensure requests are loaded
      setTimeout(() => fetchApplications(), 100);
    }
  }, [activeTab]);

  // Also refresh applications when switching to requests tab
  useEffect(() => {
    if (activeTab === 'requests' && allRequests.length > 0) {
      fetchApplications();
    }
  }, [allRequests.length]);

  useEffect(() => {
    applyFilters();
  }, [providers, filters]);

  const loadUserPreferences = () => {
    const savedFavs = localStorage.getItem('favoriteProviders');
    const savedSearches = localStorage.getItem('savedSearches');
    const recentSearches = localStorage.getItem('recentSearches');
    
    if (savedFavs) setFavorites(JSON.parse(savedFavs));
    if (savedSearches) setSavedSearches(JSON.parse(savedSearches));
    if (recentSearches) setRecentSearches(JSON.parse(recentSearches));
  };

  const saveToStorage = (key, data) => {
    localStorage.setItem(key, JSON.stringify(data));
  };

  const fetchProviders = async () => {
    try {
      setLoading(true);
      // Fetch all verified providers by setting a very high limit
      const response = await api.get('/user/service-providers?limit=10000');
      if (response.data.success) {
        setProviders(response.data.workers);
      }
    } catch (error) {
      console.error('Error fetching providers:', error);
      toast.error('Failed to load providers');
    } finally {
      setLoading(false);
    }
  };

  const fetchRecommendedProviders = async () => {
    try {
      const response = await api.get('/user/recommended-providers');
      if (response.data.success) {
        setRecommendedProviders(response.data.providers);
      }
    } catch (error) {
      console.log('No recommendations available');
    }
  };

  const fetchApplications = async () => {
    try {
      setApplicationsLoading(true);
      console.log('Fetching applications...');
      const response = await api.get('/user/client-applications');
      console.log('Applications response:', response.data);
      if (response.data.success) {
        setApplications(response.data.applications || []);
        console.log('Applications set:', response.data.applications?.length || 0);
      } else {
        console.error('Failed to fetch applications:', response.data);
        setApplications([]);
      }
    } catch (error) {
      console.error('Error fetching applications:', error);
      toast.error('Failed to load applications');
      setApplications([]);
    } finally {
      setApplicationsLoading(false);
    }
  };



  const fetchAllUserRequests = async () => {
    try {
      setRequestsLoading(true);
      const response = await api.get('/user/all-user-requests');
      if (response.data.success) {
        setAllRequests(response.data.requests);
      }
    } catch (error) {
      console.error('Error fetching user requests:', error);
      toast.error('Failed to load requests');
    } finally {
      setRequestsLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...providers];

    // Search filter with fuzzy matching
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      const searchWords = searchTerm.split(' ').filter(word => word.length > 2);

      filtered = filtered.filter(provider => {
        const servicesText = provider.services?.map(service => `${service.name} ${service.description || ''}`).join(' ') || '';
        const searchableText = [
          provider.firstName,
          provider.lastName,
          provider.skills?.join(' '),
          provider.serviceDescription,
          provider.occupation,
          servicesText
        ].join(' ').toLowerCase();

        return searchWords.some(word => searchableText.includes(word));
      });
    }

    // Advanced filtering
    if (filters.service) {
      filtered = filtered.filter(provider =>
        provider.skills?.some(skill => 
          skill.toLowerCase().includes(filters.service.toLowerCase())
        ) ||
        provider.serviceDescription?.toLowerCase().includes(filters.service.toLowerCase())
      );
    }

    if (filters.minRating > 0) {
      filtered = filtered.filter(provider => (provider.averageRating || 0) >= filters.minRating);
    }

    if (filters.maxRate < 10000) {
      filtered = filtered.filter(provider => (provider.serviceRate || 0) <= filters.maxRate);
    }

    if (filters.location) {
      filtered = filtered.filter(provider =>
        provider.address?.toLowerCase().includes(filters.location.toLowerCase())
      );
    }

    if (filters.verified) {
      filtered = filtered.filter(provider => provider.verified);
    }

    if (filters.topRated) {
      filtered = filtered.filter(provider => (provider.averageRating || 0) >= 4.5);
    }

    if (filters.availableNow) {
      filtered = filtered.filter(provider => provider.isOnline);
    }

    // Smart sorting
    switch (filters.sortBy) {
      case 'rating':
        filtered.sort((a, b) => (b.averageRating || 0) - (a.averageRating || 0));
        break;
      case 'rate-low':
        filtered.sort((a, b) => (a.serviceRate || 0) - (b.serviceRate || 0));
        break;
      case 'rate-high':
        filtered.sort((a, b) => (b.serviceRate || 0) - (a.serviceRate || 0));
        break;
      case 'reviews':
        filtered.sort((a, b) => (b.totalReviews || 0) - (a.totalReviews || 0));
        break;
      case 'experience':
        filtered.sort((a, b) => (b.yearsExperience || 0) - (a.yearsExperience || 0));
        break;
      case 'recent':
        filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        break;
      default:
        break;
    }

    setFilteredProviders(filtered);
    setCurrentPage(1);
  };

  const handleSearch = (searchTerm) => {
    setFilters(prev => ({ ...prev, search: searchTerm }));
    
    // Save to recent searches
    if (searchTerm.trim()) {
      const updated = [searchTerm, ...recentSearches.filter(s => s !== searchTerm)].slice(0, 5);
      setRecentSearches(updated);
      saveToStorage('recentSearches', updated);
    }
  };

  const handleProviderSelect = (providerId) => {
    setSelectedProviders(prev =>
      prev.includes(providerId)
        ? prev.filter(id => id !== providerId)
        : [...prev, providerId]
    );
  };

  const toggleFavorite = (providerId) => {
    const updated = favorites.includes(providerId)
      ? favorites.filter(id => id !== providerId)
      : [...favorites, providerId];
    
    setFavorites(updated);
    saveToStorage('favoriteProviders', updated);
  };

  const saveSearch = () => {
    const searchName = prompt('Enter a name for this search:');
    if (searchName && filters.search) {
      const newSavedSearch = {
        id: Date.now(),
        name: searchName,
        filters: { ...filters },
        createdAt: new Date()
      };
      const updated = [...savedSearches, newSavedSearch];
      setSavedSearches(updated);
      saveToStorage('savedSearches', updated);
      toast.success('Search saved successfully!');
    }
  };

  const loadSavedSearch = (savedSearch) => {
    setFilters(savedSearch.filters);
    toast.success(`Loaded saved search: ${savedSearch.name}`);
  };

  const handleSendMessage = async (providerId) => {
    try {
      // Open chat panel with this provider
      setOpenChatWithProvider(providerId);
    } catch (error) {
      console.error('Error opening chat:', error);
      toast.error('Failed to open chat');
    }
  };

  const handleSendOffer = (providerId) => {
    // Get provider details first - find the provider from the current list
    const provider = providers.find(p => p._id === providerId);
    if (!provider) {
      toast.error('Provider not found');
      return;
    }

    // Show the send offer modal
    setOfferProvider(provider);
    setShowSendOfferModal(true);
  };

  const handleOfferSuccess = () => {
    // Refresh providers list or show success message
    toast.success('Offer sent successfully!');
  };

  const handleBulkOffer = async () => {
    if (selectedProviders.length === 0) {
      toast.error('Please select providers to send offers to');
      return;
    }

    // For now, show a message that they need to create a service request first
    toast.info('Please create a service request first, then offer it to providers from your requests page.');
  };

  const handleViewProfile = (providerId) => {
    setSelectedProviderId(providerId);
    setShowProfileModal(true);
  };

  const handleAcceptApplication = async (bookingId) => {
    try {
      await api.post(`/user/respond-to-application/${bookingId}`, { action: 'accept' });
      toast.success('Application accepted successfully!');
      // Refresh applications list
      fetchApplications();
    } catch (error) {
      console.error('Error accepting application:', error);
      toast.error('Failed to accept application');
    }
  };

  const handleDeclineApplication = async (bookingId) => {
    try {
      await api.post(`/user/respond-to-application/${bookingId}`, { action: 'decline' });
      toast.success('Application declined');
      // Refresh applications list
      fetchApplications();
    } catch (error) {
      console.error('Error declining application:', error);
      toast.error('Failed to decline application');
    }
  };



  // Pagination
  const totalPages = Math.ceil(filteredProviders.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentProviders = filteredProviders.slice(startIndex, startIndex + itemsPerPage);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
          <h3 className="text-xl font-semibold text-gray-700">Finding the best providers...</h3>
        </div>
      </div>
    );
  }

  // Show applications review section if on waiting-for-worker route
  if (location.pathname === '/user/waiting-for-worker') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
        <div className="max-w-7xl mx-auto p-6">
          {/* Applications Review Header */}
          <div className="mb-8">
            <h2 className="text-4xl font-bold text-gray-900 mb-2">
              Review Applications
            </h2>
            <p className="text-gray-600 text-lg">
              Review and respond to applications from service providers
            </p>
          </div>

          {applicationsLoading ? (
            <div className="text-center py-20">
              <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
              <h3 className="text-xl font-semibold text-gray-700">Loading applications...</h3>
            </div>
          ) : applications.length === 0 ? (
            <div className="text-center py-20 px-6 bg-white rounded-lg shadow-md">
              <div className="text-6xl mb-4">📋</div>
              <h4 className="text-xl font-semibold text-gray-900 mb-2">No Applications Yet</h4>
              <p className="text-gray-600 mb-4">When service providers apply to your requests, they will appear here for review.</p>
              <button
                onClick={() => navigate('/user/browse-providers')}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
              >
                Browse Providers
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {applications.map((application) => (
                <ApplicationCard
                  key={application._id}
                  application={application}
                  onAccept={() => handleAcceptApplication(application._id)}
                  onDecline={() => handleDeclineApplication(application._id)}
                  onViewProfile={(providerId) => handleViewProfile(providerId)}
                  onMessage={(providerId) => handleSendMessage(providerId)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
      <div className="max-w-7xl mx-auto p-6">
        {/* Enhanced Header */}
        <div className="mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div>
              <h2 className="text-4xl font-bold text-gray-900 mb-2">
                {activeTab === 'browse' && 'Find Top Service Providers'}
                {activeTab === 'requests' && 'My Service Requests'}
              </h2>
              <p className="text-gray-600 text-lg">
                {activeTab === 'browse' && 'Connect with verified professionals in your area'}
                {activeTab === 'requests' && 'Manage your posted service requests'}
              </p>
            </div>

            <div className="flex items-center gap-4">
              {/* Create Service Request Button - Only show on browse tab */}
              {activeTab === 'browse' && (
                <button
                  onClick={() => setShowCreateRequest(true)}
                  className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-medium transition-colors duration-200 flex items-center"
                >
                  <FaPlus className="mr-2" />
                  Create Service Request
                </button>
              )}

              {/* Quick Stats - Only show on browse tab */}
              {activeTab === 'browse' && (
                <div className="flex gap-4">
                  <div className="bg-white rounded-lg px-4 py-2 shadow-sm border">
                    <div className="text-2xl font-bold text-green-600">{favorites.length}</div>
                    <div className="text-sm text-gray-600">Favorites</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="mb-8">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('browse')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'browse'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <FaSearch className="inline mr-2" />
                Browse Providers
              </button>
              <button
                onClick={() => setActiveTab('requests')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'requests'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <FaClipboardList className="inline mr-2" />
                My Requests ({allRequests.length})
              </button>
              <button
                onClick={() => setActiveTab('applications')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'applications'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <FaHandshake className="inline mr-2" />
                Applications ({applications.length})
              </button>
              {activeTab === 'requests' && (
                <button
                  onClick={() => fetchApplications()}
                  className="ml-auto px-3 py-2 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors flex items-center"
                  disabled={applicationsLoading}
                >
                  <FaInfoCircle className="mr-2" />
                  {applicationsLoading ? 'Refreshing...' : 'Refresh Applications'}
                </button>
              )}
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'browse' && (
          <>
            {/* Enhanced Search Bar */}
            <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
              <div className="flex flex-col lg:flex-row gap-4">
                <div className="flex-1 relative">
                  <FaSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search by name, skills, or service type..."
                    value={filters.search}
                    onChange={(e) => handleSearch(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setShowFilters(!showFilters)}
                    className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                      showFilters
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <FaFilter className="inline mr-2" />
                    Filters
                  </button>

                </div>
              </div>

              {/* Recent Searches */}
              {recentSearches.length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <p className="text-sm text-gray-600 mb-2">Recent searches:</p>
                  <div className="flex flex-wrap gap-2">
                    {recentSearches.map((search, index) => (
                      <button
                        key={index}
                        onClick={() => handleSearch(search)}
                        className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm hover:bg-gray-200 transition-colors"
                      >
                        {search}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Advanced Filters */}
            {showFilters && (
              <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
                <h3 className="text-lg font-semibold mb-4">Advanced Filters</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Service Type</label>
                    <input
                      type="text"
                      placeholder="e.g., Plumbing, Electrical"
                      value={filters.service}
                      onChange={(e) => setFilters(prev => ({ ...prev, service: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
                    <input
                      type="text"
                      placeholder="City or area"
                      value={filters.location}
                      onChange={(e) => setFilters(prev => ({ ...prev, location: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Min Rating</label>
                    <select
                      value={filters.minRating}
                      onChange={(e) => setFilters(prev => ({ ...prev, minRating: parseFloat(e.target.value) }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value={0}>Any Rating</option>
                      <option value={3}>3+ Stars</option>
                      <option value={4}>4+ Stars</option>
                      <option value={4.5}>4.5+ Stars</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Max Rate (₱)</label>
                    <input
                      type="number"
                      placeholder="Maximum rate"
                      value={filters.maxRate < 10000 ? filters.maxRate : ''}
                      onChange={(e) => setFilters(prev => ({ ...prev, maxRate: parseFloat(e.target.value) || 10000 }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap gap-4 mt-4">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={filters.verified}
                      onChange={(e) => setFilters(prev => ({ ...prev, verified: e.target.checked }))}
                      className="mr-2 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm">Verified Only</span>
                  </label>

                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={filters.topRated}
                      onChange={(e) => setFilters(prev => ({ ...prev, topRated: e.target.checked }))}
                      className="mr-2 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm">Top Rated (4.5+ stars)</span>
                  </label>

                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={filters.availableNow}
                      onChange={(e) => setFilters(prev => ({ ...prev, availableNow: e.target.checked }))}
                      className="mr-2 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm">Available Now</span>
                  </label>
                </div>

                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Sort By</label>
                  <select
                    value={filters.sortBy}
                    onChange={(e) => setFilters(prev => ({ ...prev, sortBy: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="rating">Highest Rated</option>
                    <option value="rate-low">Rate: Low to High</option>
                    <option value="rate-high">Rate: High to Low</option>
                    <option value="reviews">Most Reviews</option>
                    <option value="experience">Most Experience</option>
                    <option value="recent">Recently Joined</option>
                  </select>
                </div>
              </div>
            )}

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

            {/* Recommended Providers Section - Only show when not sending offer to specific provider */}
            {recommendedProviders.length > 0 && !showCreateRequest && (
              <div className="mb-8 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-6 border-2 border-blue-200">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center">
                    <FaChartLine className="text-blue-600 text-2xl mr-3" />
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">
                        Recommended for You
                      </h3>
                      <p className="text-sm text-gray-600 flex items-center mt-1">
                        <FaInfoCircle className="mr-1" />
                        Powered by Hybrid Recommendation Algorithm (Content-based + Collaborative Filtering)
                      </p>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {recommendedProviders.slice(0, 3).map((provider) => (
                    <div key={provider._id} className="bg-white rounded-lg shadow-md p-4 border-2 border-blue-300">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center">
                          <img
                            src={provider.profilePic || "/default-profile.png"}
                            alt={`${provider.firstName} ${provider.lastName}`}
                            className="w-12 h-12 rounded-full object-cover mr-3"
                          />
                          <div>
                            <h4 className="font-semibold">
                              {provider.firstName} {provider.lastName}
                              {provider.verified && <FaCheckCircle className="inline ml-1 text-green-500" />}
                            </h4>
                            {provider.recommendationScore !== undefined && (
                              <div className="flex items-center text-blue-600 text-sm">
                                <FaChartLine className="mr-1" />
                                <span className="font-semibold">
                                  {Math.round(provider.recommendationScore * 100)}% Match
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <FaStar className="text-yellow-400 mr-1" />
                          <span className="font-semibold">{provider.averageRating?.toFixed(1) || "N/A"}</span>
                        </div>
                        <button
                          onClick={() => handleSendOffer(provider._id)}
                          className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                        >
                          Contact
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Results Header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-xl font-semibold text-gray-900">
                  {filteredProviders.length} provider{filteredProviders.length !== 1 ? 's' : ''} found
                </h3>
                {filters.search && (
                  <p className="text-gray-600">
                    Results for "{filters.search}"
                  </p>
                )}
              </div>

              <div className="flex items-center gap-4">
                {/* View Mode Toggle */}
                <div className="flex bg-gray-100 rounded-lg p-1">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      viewMode === 'grid'
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Grid
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      viewMode === 'list'
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    List
                  </button>
                </div>
              </div>
            </div>

            {/* Providers Grid/List */}
            {filteredProviders.length === 0 ? (
              <div className="text-center py-20 px-6 bg-white rounded-lg shadow-md">
                <div className="text-6xl mb-4">🔍</div>
                <h4 className="text-xl font-semibold text-gray-900 mb-2">No Providers Found</h4>
                <p className="text-gray-600 mb-4">Try adjusting your filters or search terms.</p>
                <button
                  onClick={() => setFilters({
                    search: '',
                    service: '',
                    minRating: 0,
                    maxRate: 10000,
                    location: '',
                    availability: 'any',
                    experience: 'any',
                    sortBy: 'rating',
                    verified: false,
                    topRated: false,
                    availableNow: false
                  })}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
                >
                  Clear All Filters
                </button>
              </div>
            ) : viewMode === 'grid' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {currentProviders.map((provider) => (
                  <div key={provider._id} className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-all duration-200 relative group">
                    {/* Selection Checkbox */}
                    <div className="absolute top-4 left-4 z-10">
                      <input
                        type="checkbox"
                        checked={selectedProviders.includes(provider._id)}
                        onChange={() => handleProviderSelect(provider._id)}
                        className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                      />
                    </div>

                    {/* Favorite Button */}
                    <button
                      className="absolute top-4 right-4 text-2xl z-10"
                      onClick={() => toggleFavorite(provider._id)}
                    >
                      {favorites.includes(provider._id) ? '❤️' : '🤍'}
                    </button>

                    {/* Provider Card Content */}
                    <div className="pt-8">
                      <div className="flex items-start space-x-4 mb-4">
                        <div className="relative">
                          <img
                            src={provider.profilePic || "/default-profile.png"}
                            alt={`${provider.firstName} ${provider.lastName}`}
                            className="w-16 h-16 rounded-full object-cover border-2 border-gray-200"
                          />
                          {provider.isOnline && (
                            <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 border-2 border-white rounded-full"></div>
                          )}
                          {provider.verified && (
                            <div className="absolute -top-1 -right-1 w-6 h-6 bg-blue-500 border-2 border-white rounded-full flex items-center justify-center">
                              <FaCheckCircle className="text-white text-xs" />
                            </div>
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <h4 className="text-lg font-semibold text-gray-900 truncate">
                            {provider.firstName} {provider.lastName}
                          </h4>
                          <div className="flex items-center space-x-2 mb-2">
                            <div className="flex">
                              {renderStars(provider.averageRating || 0)}
                            </div>
                            <span className="text-sm text-gray-600">
                              ({provider.totalReviews || 0})
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Skills */}
                      <div className="mb-4">
                        <div className="flex flex-wrap gap-1">
                          {provider.skills?.slice(0, 3).map((skill, index) => (
                            <span key={index} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                              {skill}
                            </span>
                          ))}
                          {provider.skills?.length > 3 && (
                            <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                              +{provider.skills.length - 3} more
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Services */}
                      {provider.services && provider.services.length > 0 && (
                        <div className="mb-4">
                          <h5 className="text-sm font-semibold text-gray-900 mb-2">Services Offered:</h5>
                          <div className="space-y-2">
                            {provider.services.slice(0, 2).map((service, index) => (
                              <div key={index} className="bg-gray-50 rounded-lg p-2">
                                <div className="flex justify-between items-start">
                                  <div className="flex-1">
                                    <span className="text-sm font-medium text-gray-900">{service.name}</span>
                                    {service.description && (
                                      <p className="text-xs text-gray-600 mt-1 line-clamp-1">{service.description}</p>
                                    )}
                                  </div>
                                  <span className="text-sm font-bold text-green-600 ml-2">
                                    ₱{service.rate?.toLocaleString() || 'N/A'}
                                  </span>
                                </div>
                              </div>
                            ))}
                            {provider.services.length > 2 && (
                              <span className="text-xs text-gray-500">
                                +{provider.services.length - 2} more services
                              </span>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Location and Status */}
                      <div className="flex items-center justify-between text-sm text-gray-600 mb-4">
                        <div className="flex items-center">
                          <FaMapMarkerAlt className="mr-1" />
                          <span className="truncate">{provider.address || "Location not specified"}</span>
                        </div>
                        <div className="flex items-center">
                          <FaClock className="mr-1" />
                          <span>{provider.isOnline ? "Available" : "Offline"}</span>
                        </div>
                      </div>


                      {/* Action Buttons */}
                      <div className="space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                            <button
                              className="bg-gray-600 hover:bg-gray-700 text-white text-sm py-2 px-3 rounded-lg transition-colors duration-200 flex items-center justify-center"
                              onClick={() => handleViewProfile(provider._id)}
                            >
                              <FaEye className="mr-1" />
                              Profile
                            </button>
                          <button
                            className="bg-purple-600 hover:bg-purple-700 text-white text-sm py-2 px-3 rounded-lg transition-colors duration-200 flex items-center justify-center"
                            onClick={() => handleSendMessage(provider._id)}
                          >
                            <FaEnvelope className="mr-1" />
                            Message
                          </button>
                        </div>
                        <button
                          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center"
                          onClick={() => handleSendOffer(provider._id)}
                        >
                          <FaBriefcase className="mr-2" />
                          Send Offer
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              /* List View */
              <div className="space-y-4">
                {currentProviders.map((provider) => (
                  <div key={provider._id} className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow duration-200 relative">
                    {/* Selection Checkbox */}
                    <div className="absolute top-4 left-4">
                      <input
                        type="checkbox"
                        checked={selectedProviders.includes(provider._id)}
                        onChange={() => handleProviderSelect(provider._id)}
                        className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                      />
                    </div>

                    <div className="flex items-start space-x-6 pl-12">
                      <div className="relative">
                        <img
                          src={provider.profilePic || "/default-profile.png"}
                          alt={`${provider.firstName} ${provider.lastName}`}
                          className="w-20 h-20 rounded-full object-cover border-2 border-gray-200"
                        />
                        {provider.isOnline && (
                          <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 border-2 border-white rounded-full"></div>
                        )}
                        {provider.verified && (
                          <div className="absolute -top-1 -right-1 w-6 h-6 bg-blue-500 border-2 border-white rounded-full flex items-center justify-center">
                            <FaCheckCircle className="text-white text-xs" />
                          </div>
                        )}
                      </div>

                      <div className="flex-1">
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="text-xl font-semibold text-gray-900 mb-1">
                              {provider.firstName} {provider.lastName}
                            </h4>
                            <div className="flex items-center space-x-4 mb-2">
                              <div className="flex items-center">
                                {renderStars(provider.averageRating || 0)}
                                <span className="ml-2 text-sm text-gray-600">
                                  ({provider.totalReviews || 0} reviews)
                                </span>
                              </div>
                              <div className="text-lg font-bold text-green-600">
                                ₱{provider.serviceRate?.toLocaleString() || "Rate not set"}
                              </div>
                            </div>
                            <div className="flex items-center text-sm text-gray-600 mb-3">
                              <FaMapMarkerAlt className="mr-1" />
                              <span>{provider.address || "Location not specified"}</span>
                              <span className="mx-2">•</span>
                              <FaClock className="mr-1" />
                              <span>{provider.isOnline ? "Available now" : "Offline"}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => toggleFavorite(provider._id)}
                              className="text-2xl hover:scale-110 transition-transform"
                            >
                              {favorites.includes(provider._id) ? '❤️' : '🤍'}
                            </button>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2 mb-4">
                          {provider.skills?.map((skill, index) => (
                            <span key={index} className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full">
                              {skill}
                            </span>
                          ))}
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            {provider.totalJobsCompleted && (
                              <span className="text-sm text-gray-600">
                                <FaTrophy className="inline mr-1" />
                                {provider.totalJobsCompleted} jobs completed
                              </span>
                            )}
                          </div>

                          <div className="flex items-center space-x-3">
                            <button
                              className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors duration-200 flex items-center"
                              onClick={() => handleViewProfile(provider._id)}
                            >
                              <FaEye className="mr-2" />
                              View Profile
                            </button>
                            <button
                              className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors duration-200 flex items-center"
                              onClick={() => handleSendMessage(provider._id)}
                            >
                              <FaEnvelope className="mr-2" />
                              Message
                            </button>
                            <button
                              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors duration-200 flex items-center"
                              onClick={() => handleSendOffer(provider._id)}
                            >
                              <FaBriefcase className="mr-2" />
                              Send Offer
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-8">
                <div className="text-sm text-gray-700">
                  Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, filteredProviders.length)} of {filteredProviders.length} providers
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-500 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>

                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }

                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`px-3 py-2 border rounded-md text-sm font-medium ${
                          currentPage === pageNum
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}

                  <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-500 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {activeTab === 'requests' && (
          <div>
            {requestsLoading ? (
              <div className="text-center py-20">
                <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
                <h3 className="text-xl font-semibold text-gray-700">Loading your requests...</h3>
              </div>
            ) : allRequests.length === 0 ? (
              <div className="text-center py-20 px-6 bg-white rounded-lg shadow-md">
                <div className="text-6xl mb-4">📋</div>
                <h4 className="text-xl font-semibold text-gray-900 mb-2">No Service Requests or Offers Yet</h4>
                <p className="text-gray-600 mb-4">You haven't posted any service requests or sent any offers yet.</p>
                <button
                  onClick={() => setActiveTab('browse')}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
                >
                  Browse Providers
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                {allRequests.map((request) => {
                  // Different display logic based on request type
                  if (request.type === 'service-request') {
                    // Service Request display
                    const serviceRequest = request.data;
                    // Find applications for this request
                    const requestApplications = applications.filter(app => {
                      if (!app.serviceRequest) return false;
                      const serviceRequestId = typeof app.serviceRequest === 'object'
                        ? app.serviceRequest._id
                        : app.serviceRequest;
                      return serviceRequestId === request._id ||
                             serviceRequestId?.toString() === request._id?.toString();
                    });

                    return (
                      <div key={request._id} className="bg-white rounded-lg shadow-md p-6 border-l-4 border-blue-500">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-2">
                              <FaClipboardList className="text-blue-600" />
                              <h4 className="text-lg font-semibold text-gray-900">{request.title}</h4>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm mb-4">
                              <div><span className="font-medium text-gray-700">Type:</span> {request.data?.typeOfWork}</div>
                              <div><span className="font-medium text-gray-700">Location:</span> {request.location}</div>
                              <div><span className="font-medium text-gray-700">Budget:</span> ₱{request.minBudget} - ₱{request.maxBudget}</div>
                              <div><span className="font-medium text-gray-700">Status:</span>
                                <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${
                                  request.status === 'Waiting' ? 'bg-yellow-100 text-yellow-800' :
                                  request.status === 'Offered' ? 'bg-blue-100 text-blue-800' :
                                  request.status === 'Working' ? 'bg-green-100 text-green-800' :
                                  request.status === 'Complete' ? 'bg-gray-100 text-gray-800' :
                                  'bg-red-100 text-red-800'
                                }`}>
                                  {request.status}
                                </span>
                              </div>
                            </div>
                            {request.data?.notes && (
                              <div className="mb-4">
                                <span className="font-medium text-gray-700">Notes:</span>
                                <p className="text-sm text-gray-600 mt-1">{request.data.notes}</p>
                              </div>
                            )}
                            <div className="text-sm text-gray-500">
                              Posted on {new Date(request.createdAt).toLocaleDateString()}
                            </div>
                          </div>
                        </div>

                        {/* Show providers who applied */}
                        {requestApplications.length > 0 && (
                          <div className="border-t border-gray-200 pt-4">
                            <h5 className="text-md font-semibold text-gray-900 mb-3 flex items-center">
                              <FaUsers className="mr-2 text-blue-600" />
                              Providers Who Applied ({requestApplications.length})
                            </h5>
                            <div className="space-y-3">
                              {requestApplications.map((application) => (
                                <div key={application._id} className="bg-gray-50 rounded-lg p-3 border-l-4 border-blue-400">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-3">
                                      <img
                                        src={application.provider?.profilePic || "/default-profile.png"}
                                        alt={`${application.provider?.firstName} ${application.provider?.lastName}`}
                                        className="w-10 h-10 rounded-full object-cover border border-gray-300"
                                      />
                                      <div>
                                        <div className="flex items-center space-x-2">
                                          <span className="font-medium text-gray-900">
                                            {application.provider?.firstName} {application.provider?.lastName}
                                          </span>
                                          {application.provider?.verified && (
                                            <FaCheckCircle className="text-green-500 text-sm" />
                                          )}
                                        </div>
                                        <div className="flex items-center space-x-2 text-sm text-gray-600">
                                          <div className="flex">
                                            {renderStars(application.provider?.averageRating || 0)}
                                          </div>
                                          <span>({application.provider?.totalReviews || 0})</span>
                                        </div>
                                      </div>
                                    </div>
                                    <div className="text-right">
                                      <div className="text-sm font-semibold text-green-600">
                                        ₱{application.commissionFee?.toLocaleString() || 'N/A'}
                                      </div>
                                      <div className="text-xs text-gray-500">Commission Fee</div>
                                    </div>
                                  </div>
                                  <div className="mt-2 flex items-center justify-between">
                                    <div className="flex flex-wrap gap-1">
                                      {application.provider?.skills?.slice(0, 3).map((skill, index) => (
                                        <span key={index} className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                                          {skill}
                                        </span>
                                      ))}
                                      {application.provider?.skills?.length > 3 && (
                                        <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                                          +{application.provider.skills.length - 3} more
                                        </span>
                                      )}
                                    </div>
                                    <div className="text-xs text-gray-500">
                                      Applied {new Date(application.createdAt).toLocaleDateString()}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  } else if (request.type === 'offer') {
                    // Offer display
                    return (
                      <div key={request._id} className="bg-white rounded-lg shadow-md p-6 border-l-4 border-purple-500">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-start space-x-4">
                            <img
                              src={request.provider?.profilePic || "/default-profile.png"}
                              alt={`${request.provider?.firstName} ${request.provider?.lastName}`}
                              className="w-16 h-16 rounded-full object-cover border-2 border-gray-200"
                            />
                            <div className="flex-1">
                              <div className="flex items-center space-x-2 mb-1">
                                <FaBriefcase className="text-purple-600" />
                                <h4 className="text-lg font-semibold text-gray-900">
                                  {request.provider?.firstName} {request.provider?.lastName}
                                </h4>
                                {request.provider?.verified && (
                                  <FaCheckCircle className="text-green-500" />
                                )}
                              </div>
                              <div className="flex items-center space-x-4 mb-2">
                                <div className="flex items-center">
                                  {renderStars(request.provider?.averageRating || 0)}
                                  <span className="ml-2 text-sm text-gray-600">
                                    ({request.provider?.totalReviews || 0} reviews)
                                  </span>
                                </div>
                              </div>
                              <div className="flex flex-wrap gap-1 mb-2">
                                {request.provider?.skills?.slice(0, 4).map((skill, index) => (
                                  <span key={index} className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full">
                                    {skill}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-bold text-purple-600 mb-1">
                              ₱{request.minBudget?.toLocaleString()} - ₱{request.maxBudget?.toLocaleString()}
                            </div>
                            <div className="text-sm text-gray-500">Budget Range</div>
                            <div className={`text-xs mt-1 px-2 py-1 rounded-full font-medium ${
                              request.status === 'Open' ? 'bg-yellow-100 text-yellow-800' :
                              request.status === 'Accepted' ? 'bg-green-100 text-green-800' :
                              request.status === 'Declined' ? 'bg-red-100 text-red-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {request.status}
                            </div>
                          </div>
                        </div>

                        {/* Offer Details */}
                        <div className="bg-purple-50 rounded-lg p-4 mb-4">
                          <h5 className="font-semibold text-gray-900 mb-2">{request.title}</h5>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm mb-3">
                            <div>
                              <span className="font-medium text-gray-700">Location:</span> {request.location}
                            </div>
                            <div>
                              <span className="font-medium text-gray-700">Preferred Date:</span> {request.preferredDate ? new Date(request.preferredDate).toLocaleDateString() : 'Flexible'}
                            </div>
                          </div>
                          {request.data?.description && (
                            <div>
                              <span className="font-medium text-gray-700">Description:</span>
                              <p className="text-sm text-gray-600 mt-1">{request.data.description}</p>
                            </div>
                          )}
                          <div className="text-xs text-gray-500 mt-2">
                            Sent on {new Date(request.createdAt).toLocaleDateString()}
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center justify-start">
                          <div className="flex items-center space-x-3">
                            <button
                              onClick={() => handleViewProfile(request.provider?._id)}
                              className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors duration-200 flex items-center text-sm"
                            >
                              <FaEye className="mr-2" />
                              View Profile
                            </button>
                            <button
                              onClick={() => handleSendMessage(request.provider?._id)}
                              className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors duration-200 flex items-center text-sm"
                            >
                              <FaEnvelope className="mr-2" />
                              Message
                            </button>
                            {request.status === 'Open' && (
                              <div className="ml-auto text-sm text-yellow-700 font-medium flex items-center">
                                <FaClock className="mr-1" />
                                Waiting for response
                              </div>
                            )}
                            {request.status === 'Accepted' && (
                              <div className="ml-auto text-sm text-green-700 font-medium flex items-center">
                                <FaCheckCircle className="mr-1" />
                                Offer accepted
                              </div>
                            )}
                            {request.status === 'Declined' && (
                              <div className="ml-auto text-sm text-red-700 font-medium flex items-center">
                                <FaThumbsDown className="mr-1" />
                                Offer declined
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  } else if (request.type === 'booking') {
                    // Booking display
                    return (
                      <div key={request._id} className="bg-white rounded-lg shadow-md p-6 border-l-4 border-green-500">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-start space-x-4">
                            <img
                              src={request.otherParty?.profilePic || "/default-profile.png"}
                              alt={`${request.otherParty?.firstName} ${request.otherParty?.lastName}`}
                              className="w-16 h-16 rounded-full object-cover border-2 border-gray-200"
                            />
                            <div className="flex-1">
                              <div className="flex items-center space-x-2 mb-1">
                                <FaHandshake className="text-green-600" />
                                <h4 className="text-lg font-semibold text-gray-900">
                                  {request.title}
                                </h4>
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  request.status === 'In Progress' ? 'bg-green-100 text-green-800' :
                                  request.status === 'Completed' ? 'bg-gray-100 text-gray-800' :
                                  'bg-red-100 text-red-800'
                                }`}>
                                  {request.status}
                                </span>
                              </div>
                              <div className="text-sm text-gray-600">
                                {request.otherParty?.firstName} {request.otherParty?.lastName}
                              </div>
                              {request.description && (
                                <p className="text-sm text-gray-600 mt-2">{request.description}</p>
                              )}
                            </div>
                          </div>
                          <div className="text-sm text-gray-500">
                            Created {new Date(request.createdAt).toLocaleDateString()}
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center justify-start">
                          <div className="flex items-center space-x-3">
                            <button
                              onClick={() => handleViewProfile(request.otherParty?._id)}
                              className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors duration-200 flex items-center text-sm"
                            >
                              <FaEye className="mr-2" />
                              View Profile
                            </button>
                            <button
                              onClick={() => handleSendMessage(request.otherParty?._id)}
                              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors duration-200 flex items-center text-sm"
                            >
                              <FaEnvelope className="mr-2" />
                              Message
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  }

                  return null;
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === 'applications' && (
          <div>
            {applicationsLoading ? (
              <div className="text-center py-20">
                <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
                <h3 className="text-xl font-semibold text-gray-700">Loading applications...</h3>
              </div>
            ) : applications.length === 0 ? (
              <div className="text-center py-20 px-6 bg-white rounded-lg shadow-md">
                <div className="text-6xl mb-4">📋</div>
                <h4 className="text-xl font-semibold text-gray-900 mb-2">No Applications Yet</h4>
                <p className="text-gray-600 mb-4">When service providers apply to your requests, they will appear here for review.</p>
                <button
                  onClick={() => setActiveTab('browse')}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
                >
                  Browse Providers
                </button>
              </div>
            ) : (
              <div className="space-y-8">
                {/* Pending Applications */}
                {applications.filter(app => app.status === 'Applied').length > 0 && (
                  <div>
                    <div className="flex items-center mb-4">
                      <FaClock className="text-yellow-500 mr-2" />
                      <h3 className="text-lg font-semibold text-gray-900">Pending Applications ({applications.filter(app => app.status === 'Applied').length})</h3>
                    </div>
                    <div className="space-y-4">
                      {applications.filter(app => app.status === 'Applied').map((application) => (
                        <ApplicationCard
                          key={application._id}
                          application={application}
                          onAccept={() => handleAcceptApplication(application._id)}
                          onDecline={() => handleDeclineApplication(application._id)}
                          onViewProfile={(providerId) => handleViewProfile(providerId)}
                          onMessage={(providerId) => handleSendMessage(providerId)}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Accepted Applications */}
                {applications.filter(app => app.status === 'In Progress').length > 0 && (
                  <div>
                    <div className="flex items-center mb-4">
                      <FaCheckCircle className="text-green-500 mr-2" />
                      <h3 className="text-lg font-semibold text-gray-900">Accepted Applications ({applications.filter(app => app.status === 'In Progress').length})</h3>
                    </div>
                    <div className="space-y-4">
                      {applications.filter(app => app.status === 'In Progress').map((application) => (
                        <AcceptedApplicationCard
                          key={application._id}
                          application={application}
                          onViewProfile={(providerId) => handleViewProfile(providerId)}
                          onMessage={(providerId) => handleSendMessage(providerId)}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Create Service Request Modal */}
        {showCreateRequest && (
          <CreateServiceRequest
            onClose={() => setShowCreateRequest(false)}
          />
        )}

        {/* Provider Profile Modal */}
        {showProfileModal && selectedProviderId && (
          <ProviderProfileModal
            providerId={selectedProviderId}
            onClose={() => {
              setShowProfileModal(false);
              setSelectedProviderId(null);
            }}
            onOpenChat={(providerId) => {
              setShowProfileModal(false);
              setSelectedProviderId(null);
              // Open chat panel with this provider
              // For now, navigate to chat page since we need an appointment to open chat panel
              // In future, we could create a temporary chat or modify chat system
              handleSendMessage(providerId);
            }}
            hideRequestService={activeTab === 'requests'}
          />
        )}

        {/* Send Offer Modal */}
        {showSendOfferModal && offerProvider && (
          <SendOfferModal
            provider={offerProvider}
            onClose={() => {
              setShowSendOfferModal(false);
              setOfferProvider(null);
            }}
            onSuccess={handleOfferSuccess}
          />
        )}
      </div>
    </div>
  );
};

// Application Card Component
const ApplicationCard = ({ application, onAccept, onDecline, onViewProfile, onMessage }) => {
  const provider = application?.provider;
  const serviceRequest = application?.serviceRequest;
  const commissionFee = application?.commissionFee;
  const createdAt = application?.createdAt;

  if (!provider) {
    return <div className="bg-white rounded-lg shadow-md p-6 text-center text-gray-500">Provider information not available</div>;
  }

  const handleViewProfile = () => {
    if (provider?._id) {
      onViewProfile(provider._id);
    }
  };

  const handleMessage = () => {
    if (provider?._id) {
      onMessage(provider._id);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-blue-500">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-start space-x-4">
          <img
            src={provider.profilePic || "/default-profile.png"}
            alt={`${provider.firstName} ${provider.lastName}`}
            className="w-16 h-16 rounded-full object-cover border-2 border-gray-200"
          />
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-1">
              <h4 className="text-lg font-semibold text-gray-900">
                {provider.firstName} {provider.lastName}
              </h4>
              {provider.verified && (
                <FaCheckCircle className="text-green-500" />
              )}
            </div>
            <div className="flex items-center space-x-4 mb-2">
              <div className="flex items-center">
                {renderStars(provider.averageRating || 0)}
                <span className="ml-2 text-sm text-gray-600">
                  ({provider.totalReviews || 0} reviews)
                </span>
              </div>
            </div>
            <div className="flex flex-wrap gap-1 mb-2">
              {provider.skills?.slice(0, 4).map((skill, index) => (
                <span key={index} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                  {skill}
                </span>
              ))}
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-green-600 mb-1">
            ₱{commissionFee?.toLocaleString() || 'N/A'}
          </div>
          <div className="text-sm text-gray-500">Commission Fee</div>
          <div className="text-xs text-gray-400 mt-1">
            Applied {new Date(createdAt).toLocaleDateString()}
          </div>
        </div>
      </div>

      {/* Service Request Details */}
      <div className="bg-gray-50 rounded-lg p-4 mb-4">
        <h5 className="font-semibold text-gray-900 mb-2">
          Service Request: {serviceRequest?.name || 'N/A'}
        </h5>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-medium text-gray-700">Type:</span> {serviceRequest?.typeOfWork || 'N/A'}
          </div>
          <div>
            <span className="font-medium text-gray-700">Location:</span> {serviceRequest?.address || 'N/A'}
          </div>
          <div>
            <span className="font-medium text-gray-700">Budget:</span> ₱{serviceRequest?.minBudget || 0} - ₱{serviceRequest?.maxBudget || 0}
          </div>
          <div>
            <span className="font-medium text-gray-700">Date:</span> {serviceRequest?.preferredDate ? new Date(serviceRequest.preferredDate).toLocaleDateString() : 'Flexible'}
          </div>
        </div>
        {serviceRequest?.notes && (
          <div className="mt-3">
            <span className="font-medium text-gray-700">Notes:</span>
            <p className="text-sm text-gray-600 mt-1">{serviceRequest.notes}</p>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <button
            onClick={handleViewProfile}
            className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors duration-200 flex items-center text-sm"
          >
            <FaEye className="mr-2" />
            View Profile
          </button>
          <button
            onClick={handleMessage}
            className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors duration-200 flex items-center text-sm"
          >
            <FaEnvelope className="mr-2" />
            Message
          </button>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={onDecline}
            className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg transition-colors duration-200 flex items-center text-sm font-medium"
          >
            <FaThumbsDown className="mr-2" />
            Decline
          </button>
          <button
            onClick={onAccept}
            className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg transition-colors duration-200 flex items-center text-sm font-medium"
          >
            <FaThumbsUp className="mr-2" />
            Accept
          </button>
        </div>
      </div>
    </div>
  );
};

// Accepted Application Card Component
const AcceptedApplicationCard = ({ application, onViewProfile, onMessage }) => {
  const provider = application?.provider;
  const serviceRequest = application?.serviceRequest;
  const commissionFee = application?.commissionFee;
  const createdAt = application?.createdAt;

  if (!provider) {
    return <div className="bg-white rounded-lg shadow-md p-6 text-center text-gray-500">Provider information not available</div>;
  }

  const handleViewProfile = () => {
    if (provider?._id) {
      onViewProfile(provider._id);
    }
  };

  const handleMessage = () => {
    if (provider?._id) {
      onMessage(provider._id);
    }
  };

  return (
    <div className="bg-green-50 rounded-lg shadow-md p-6 border-l-4 border-green-500">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-start space-x-4">
          <img
            src={provider.profilePic || "/default-profile.png"}
            alt={`${provider.firstName} ${provider.lastName}`}
            className="w-16 h-16 rounded-full object-cover border-2 border-gray-200"
          />
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-1">
              <h4 className="text-lg font-semibold text-gray-900">
                {provider.firstName} {provider.lastName}
              </h4>
              {provider.verified && (
                <FaCheckCircle className="text-green-500" />
              )}
              <span className="ml-2 px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full font-medium">
                Accepted
              </span>
            </div>
            <div className="flex items-center space-x-4 mb-2">
              <div className="flex items-center">
                {renderStars(provider.averageRating || 0)}
                <span className="ml-2 text-sm text-gray-600">
                  ({provider.totalReviews || 0} reviews)
                </span>
              </div>
            </div>
            <div className="flex flex-wrap gap-1 mb-2">
              {provider.skills?.slice(0, 4).map((skill, index) => (
                <span key={index} className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                  {skill}
                </span>
              ))}
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-green-600 mb-1">
            ₱{commissionFee?.toLocaleString() || 'N/A'}
          </div>
          <div className="text-sm text-gray-500">Commission Fee</div>
          <div className="text-xs text-gray-400 mt-1">
            Accepted {new Date(createdAt).toLocaleDateString()}
          </div>
        </div>
      </div>

      {/* Service Request Details */}
      <div className="bg-white rounded-lg p-4 mb-4 border border-green-200">
        <h5 className="font-semibold text-gray-900 mb-2">
          Service Request: {serviceRequest?.name || 'N/A'}
        </h5>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-medium text-gray-700">Type:</span> {serviceRequest?.typeOfWork || 'N/A'}
          </div>
          <div>
            <span className="font-medium text-gray-700">Location:</span> {serviceRequest?.address || 'N/A'}
          </div>
          <div>
            <span className="font-medium text-gray-700">Budget:</span> ₱{serviceRequest?.minBudget || 0} - ₱{serviceRequest?.maxBudget || 0}
          </div>
          <div>
            <span className="font-medium text-gray-700">Date:</span> {serviceRequest?.preferredDate ? new Date(serviceRequest.preferredDate).toLocaleDateString() : 'Flexible'}
          </div>
        </div>
        {serviceRequest?.notes && (
          <div className="mt-3">
            <span className="font-medium text-gray-700">Notes:</span>
            <p className="text-sm text-gray-600 mt-1">{serviceRequest.notes}</p>
          </div>
        )}
      </div>

      {/* Action Buttons - Only view profile and message for accepted applications */}
      <div className="flex items-center justify-start">
        <div className="flex items-center space-x-3">
          <button
            onClick={handleViewProfile}
            className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors duration-200 flex items-center text-sm"
          >
            <FaEye className="mr-2" />
            View Profile
          </button>
          <button
            onClick={handleMessage}
            className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors duration-200 flex items-center text-sm"
          >
            <FaEnvelope className="mr-2" />
            Message
          </button>
          <div className="ml-auto text-sm text-green-700 font-medium flex items-center">
            <FaCheckCircle className="mr-1" />
            Work in progress
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClientDashboard;
