import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api";
import { useMainContext } from "../../mainContext";
import toast from "react-hot-toast";
import { 
  FaSearch, FaFilter, FaHeart, FaMapMarkerAlt, FaStar, 
  FaPhone, FaEnvelope, FaEye, FaMessage, FaBriefcase,
  FaClock, FaUsers, FaTrophy, FaCheckCircle, FaEnvelopeOpen
} from "react-icons/fa";

const EnhancedClientDashboard = () => {
  const { user } = useMainContext();
  const navigate = useNavigate();
  
  // Core state
  const [providers, setProviders] = useState([]);
  const [filteredProviders, setFilteredProviders] = useState([]);
  const [loading, setLoading] = useState(true);
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
  const [viewMode, setViewMode] = useState('grid'); // grid, list
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(12);

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
      const response = await api.get('/user/service-providers');
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

  const applyFilters = () => {
    let filtered = [...providers];

    // Search filter with fuzzy matching
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      const searchWords = searchTerm.split(' ').filter(word => word.length > 2);
      
      filtered = filtered.filter(provider => {
        const searchableText = [
          provider.firstName,
          provider.lastName,
          provider.skills?.join(' '),
          provider.serviceDescription,
          provider.occupation,
          ...(provider.skills || [])
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

  const handleSendOffer = async (providerId) => {
    navigate('/user/dashboard', {
      state: {
        selectedProvider: providerId
      }
    });
  };

  const handleBulkOffer = async () => {
    if (selectedProviders.length === 0) {
      toast.error('Please select providers to send offers to');
      return;
    }

    navigate('/user/dashboard', {
      state: {
        selectedProviders,
        bulkOffer: true
      }
    });
  };

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
      <div className="max-w-7xl mx-auto p-6">
        {/* Enhanced Header */}
        <div className="mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div>
              <h2 className="text-4xl font-bold text-gray-900 mb-2">
                Find Top Service Providers
              </h2>
              <p className="text-gray-600 text-lg">
                Connect with verified professionals in your area
              </p>
            </div>
            
            {/* Quick Stats */}
            <div className="flex gap-4">
              <div className="bg-white rounded-lg px-4 py-2 shadow-sm border">
                <div className="text-2xl font-bold text-blue-600">{providers.length}</div>
                <div className="text-sm text-gray-600">Total Providers</div>
              </div>
              <div className="bg-white rounded-lg px-4 py-2 shadow-sm border">
                <div className="text-2xl font-bold text-green-600">{favorites.length}</div>
                <div className="text-sm text-gray-600">Favorites</div>
              </div>
            </div>
          </div>
        </div>

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
              
              <button
                onClick={saveSearch}
                className="px-6 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors"
              >
                Save Search
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
                      <div className="text-lg font-bold text-green-600">
                        ₱{provider.serviceRate?.toLocaleString() || "Rate not set"}
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

                  {/* Description */}
                  <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                    {provider.serviceDescription || "No description available"}
                  </p>

                  {/* Action Buttons */}
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        className="bg-gray-600 hover:bg-gray-700 text-white text-sm py-2 px-3 rounded-lg transition-colors duration-200 flex items-center justify-center"
                        onClick={() => {/* Handle view profile */}}
                      >
                        <FaEye className="mr-1" />
                        Profile
                      </button>
                      <button
                        className="bg-purple-600 hover:bg-purple-700 text-white text-sm py-2 px-3 rounded-lg transition-colors duration-200 flex items-center justify-center"
                        onClick={() => {/* Handle message */}}
                      >
                        <FaMessage className="mr-1" />
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

                    <p className="text-gray-600 mb-4">
                      {provider.serviceDescription || "No description available"}
                    </p>

                    <div className="flex flex-wrap gap-2 mb-4">
                      {provider.skills?.map((skill, index) => (
                        <span key={index} className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full">
                          {skill}
                        </span>
                      ))}
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        {provider.yearsExperience && (
                          <span className="text-sm text-gray-600">
                            <FaUsers className="inline mr-1" />
                            {provider.yearsExperience} years experience
                          </span>
                        )}
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
                          onClick={() => {/* Handle view profile */}}
                        >
                          <FaEye className="mr-2" />
                          View Profile
                        </button>
                        <button
                          className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors duration-200 flex items-center"
                          onClick={() => {/* Handle message */}}
                        >
                          <FaMessage className="mr-2" />
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
      </div>
    </div>
  );
};

export default EnhancedClientDashboard;
