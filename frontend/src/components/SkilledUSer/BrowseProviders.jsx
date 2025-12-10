import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api";
import { useMainContext } from "../../mainContext";
import toast from "react-hot-toast";

const BrowseProviders = () => {
  const { user } = useMainContext();
  const navigate = useNavigate();
  const [providers, setProviders] = useState([]);
  const [filteredProviders, setFilteredProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedProviders, setSelectedProviders] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [filters, setFilters] = useState({
    search: '',
    service: '',
    minRating: 0,
    maxRate: 10000,
    location: '',
    sortBy: 'rating'
  });

  useEffect(() => {
    fetchProviders();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [providers, filters]);

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

  const applyFilters = () => {
    let filtered = [...providers];

    // Search filter
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      filtered = filtered.filter(provider =>
        `${provider.firstName} ${provider.lastName}`.toLowerCase().includes(searchTerm) ||
        provider.skills?.some(skill => skill.toLowerCase().includes(searchTerm)) ||
        provider.serviceDescription?.toLowerCase().includes(searchTerm)
      );
    }

    // Service filter
    if (filters.service) {
      filtered = filtered.filter(provider =>
        provider.skills?.some(skill => skill.toLowerCase().includes(filters.service.toLowerCase())) ||
        provider.serviceDescription?.toLowerCase().includes(filters.service.toLowerCase())
      );
    }

    // Rating filter
    if (filters.minRating > 0) {
      filtered = filtered.filter(provider => (provider.averageRating || 0) >= filters.minRating);
    }

    // Rate filter
    if (filters.maxRate < 10000) {
      filtered = filtered.filter(provider => (provider.serviceRate || 0) <= filters.maxRate);
    }

    // Location filter
    if (filters.location) {
      filtered = filtered.filter(provider =>
        provider.address?.toLowerCase().includes(filters.location.toLowerCase())
      );
    }

    // Sorting
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
      default:
        break;
    }

    setFilteredProviders(filtered);
  };

  const handleProviderSelect = (providerId) => {
    setSelectedProviders(prev =>
      prev.includes(providerId)
        ? prev.filter(id => id !== providerId)
        : [...prev, providerId]
    );
  };

  const handleBulkOffer = async () => {
    if (selectedProviders.length === 0) {
      toast.error('Please select providers to send offers to');
      return;
    }

    // Navigate to service request page with selected providers
    navigate('/user/service-request', {
      state: {
        selectedProviders,
        bulkOffer: true
      }
    });
  };

  const handleSendOffer = async (providerId) => {
    navigate('/user/service-request', {
      state: {
        selectedProvider: providerId
      }
    });
  };

  const handleViewProfile = (provider) => {
    // For now, show detailed info in an alert
    const profileInfo = `
Name: ${provider.firstName} ${provider.lastName}
Skills: ${provider.skills?.join(', ') || 'None listed'}
Rating: ${provider.averageRating || 0}/5 (${provider.totalReviews || 0} reviews)
Rate: ₱${provider.serviceRate || 'Not specified'}
About: ${provider.serviceDescription || 'No description'}
Location: ${provider.address || 'Not specified'}
    `;
    alert(profileInfo);
  };

  const toggleFavorite = (providerId) => {
    setFavorites(prev =>
      prev.includes(providerId)
        ? prev.filter(id => id !== providerId)
        : [...prev, providerId]
    );
  };

  const renderStars = (rating) => {
    return "★".repeat(Math.round(rating)) + "☆".repeat(5 - Math.round(rating));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h3 className="text-xl font-semibold text-gray-700">Loading providers...</h3>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Browse Service Providers</h2>
        <p className="text-gray-600">Find skilled professionals for your service needs</p>
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

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <h3 className="text-xl font-semibold text-gray-900 mb-4">Filter Providers</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
            <input
              type="text"
              placeholder="Name, skills, or services..."
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Service Type</label>
            <input
              type="text"
              placeholder="e.g., Plumbing, Electrical..."
              value={filters.service}
              onChange={(e) => setFilters(prev => ({ ...prev, service: e.target.value }))}
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
            </select>
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="mb-4">
        <p className="text-gray-600">{filteredProviders.length} providers found</p>
      </div>

      {filteredProviders.length === 0 ? (
        <div className="text-center py-20 px-6 bg-white rounded-lg shadow-md">
          <div className="text-6xl mb-4">🔍</div>
          <h4 className="text-xl font-semibold text-gray-900 mb-2">No Providers Found</h4>
          <p className="text-gray-600">Try adjusting your filters or search terms.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProviders.map((provider) => (
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

              {/* Favorite Button */}
              <button
                className="absolute top-4 right-4 text-2xl"
                onClick={() => toggleFavorite(provider._id)}
              >
                {favorites.includes(provider._id) ? '❤️' : '🤍'}
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
                  <div className={`text-xs px-2 py-1 rounded-full inline-block mt-1 ${
                    provider.isOnline ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {provider.isOnline ? '● Online' : '● Offline'}
                  </div>
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
                    onClick={() => {/* Handle message */}}
                  >
                    Message
                  </button>
                </div>
                <button
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200"
                  onClick={() => handleSendOffer(provider._id)}
                >
                  Send Offer
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default BrowseProviders;
