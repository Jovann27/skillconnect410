import React, { useState, useEffect } from "react";
import api from "../../api";
import { toast } from "react-hot-toast";
import { FaStar, FaMapMarkerAlt, FaPhone, FaEnvelope, FaCheckCircle, FaTimes, FaUser, FaHandshake, FaSearch } from "react-icons/fa";

const OfferToProviderModal = ({ serviceRequestId, onClose, onSuccess }) => {
  const [providers, setProviders] = useState([]);
  const [filteredProviders, setFilteredProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [offering, setOffering] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [serviceRequest, setServiceRequest] = useState(null);
  const [offerSent, setOfferSent] = useState(false);

  useEffect(() => {
    if (serviceRequestId) {
      fetchServiceRequest();
      fetchProviders();
    }
  }, [serviceRequestId]);

  useEffect(() => {
    // Filter providers based on search term
    if (searchTerm) {
      const filtered = providers.filter(provider =>
        provider.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        provider.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        provider.skills?.some(skill => skill.toLowerCase().includes(searchTerm.toLowerCase())) ||
        provider.serviceDescription?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredProviders(filtered);
    } else {
      setFilteredProviders(providers);
    }
  }, [providers, searchTerm]);

  const fetchServiceRequest = async () => {
    try {
      const response = await api.get(`/user/service-request/${serviceRequestId}`);
      if (response.data.success) {
        setServiceRequest(response.data.request);
      }
    } catch (error) {
      console.error("Error fetching service request:", error);
      toast.error("Failed to load service request details");
    }
  };

  const fetchProviders = async () => {
    try {
      setLoading(true);
      // Get recommended providers for this service request
      const response = await api.get(`/user/recommended-providers?serviceRequestId=${serviceRequestId}`);
      if (response.data.success) {
        setProviders(response.data.providers || []);
      } else {
        // Fallback: get general service providers
        const fallbackResponse = await api.get('/user/service-providers');
        if (fallbackResponse.data.success) {
          setProviders(fallbackResponse.data.workers || []);
        }
      }
    } catch (error) {
      console.error("Error fetching providers:", error);
      toast.error("Failed to load providers");
    } finally {
      setLoading(false);
    }
  };

  const handleOfferToProvider = async () => {
    if (!selectedProvider) {
      toast.error("Please select a provider to offer the request to");
      return;
    }

    if (!serviceRequest) {
      toast.error("Service request details not available");
      return;
    }

    setOffering(true);
    try {
      const response = await api.post('/user/offer-to-provider', {
        providerId: selectedProvider._id,
        requestId: serviceRequestId
      });

      if (response.data.success) {
        setOfferSent(true);
        toast.success(`Offer sent to ${selectedProvider.firstName} ${selectedProvider.lastName}!`);

        // Auto close after 3 seconds
        setTimeout(() => {
          if (onSuccess) onSuccess();
          onClose();
        }, 3000);
      } else {
        toast.error("Failed to send offer");
      }
    } catch (error) {
      console.error("Error sending offer:", error);
      toast.error("Failed to send offer. Please try again.");
    } finally {
      setOffering(false);
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
        stars.push(<FaStar key={i} className="text-yellow-400 opacity-50" />);
      } else {
        stars.push(<FaStar key={i} className="text-gray-300" />);
      }
    }
    return stars;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[200] p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 flex items-center">
                <FaHandshake className="mr-3 text-blue-600" />
                Offer Service Request to Provider
              </h2>
              {serviceRequest && (
                <p className="text-sm text-gray-600 mt-1">
                  Offering: <span className="font-semibold">{serviceRequest.title}</span>
                </p>
              )}
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl"
            >
              <FaTimes />
            </button>
          </div>

          {/* Success Screen */}
          {offerSent ? (
            <div className="text-center py-12">
              <div className="mb-6">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FaCheckCircle className="text-green-600 text-4xl" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Offer Sent Successfully!</h3>
                <p className="text-lg text-gray-600 mb-4">
                  Your service request has been sent to <span className="font-semibold text-blue-600">{selectedProvider?.firstName} {selectedProvider?.lastName}</span>
                </p>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-md mx-auto">
                  <p className="text-sm text-blue-800">
                    The provider will be notified and can choose to accept or decline your offer.
                    You'll receive a notification once they respond.
                  </p>
                </div>
              </div>
              <div className="text-sm text-gray-500">
                This window will close automatically in a few seconds...
              </div>
            </div>
          ) : (
            <>
              {/* Search Bar */}
              <div className="mb-6">
                <div className="relative">
                  <FaSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search providers by name, skills, or services..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
                  />
                </div>
              </div>

              {loading ? (
                <div className="flex justify-center items-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
                </div>
              ) : filteredProviders.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-500">
                    {searchTerm ? "No providers found matching your search." : "No providers available at this time."}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredProviders.map((provider) => (
                    <div
                      key={provider._id}
                      className={`border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer ${
                        selectedProvider?._id === provider._id ? 'ring-2 ring-blue-500 bg-blue-50' : ''
                      }`}
                      onClick={() => setSelectedProvider(provider)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center">
                              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center mr-3">
                                {provider.profilePic ? (
                                  <img
                                    src={provider.profilePic}
                                    alt={`${provider.firstName} ${provider.lastName}`}
                                    className="w-12 h-12 rounded-full object-cover"
                                  />
                                ) : (
                                  <FaUser className="text-blue-600" />
                                )}
                              </div>
                              <div>
                                <h3 className="font-semibold text-lg text-gray-900">
                                  {provider.firstName} {provider.lastName}
                                  {provider.verified && (
                                    <FaCheckCircle className="inline ml-2 text-green-500" title="Verified" />
                                  )}
                                </h3>
                                <p className="text-sm text-gray-600">{provider.occupation || "Service Provider"}</p>
                              </div>
                            </div>
                            {provider.recommendationScore !== undefined && (
                              <div className="text-right">
                                <div className="flex items-center text-blue-600">
                                  <FaStar className="mr-1" />
                                  <span className="font-semibold">
                                    {Math.round(provider.recommendationScore * 100)}% Match
                                  </span>
                                </div>
                              </div>
                            )}
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                            <div>
                              <p className="text-sm font-medium text-gray-700 mb-1">Skills</p>
                              <div className="flex flex-wrap gap-2">
                                {provider.skills?.slice(0, 3).map((skill, idx) => (
                                  <span
                                    key={idx}
                                    className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded"
                                  >
                                    {skill}
                                  </span>
                                ))}
                              </div>
                            </div>

                            <div>
                              <p className="text-sm font-medium text-gray-700 mb-1">Rating & Experience</p>
                              <div className="flex items-center space-x-4">
                                <div className="flex items-center">
                                  <FaStar className="text-yellow-400 mr-1" />
                                  <span className="font-semibold">{provider.averageRating?.toFixed(1) || "N/A"}</span>
                                  <span className="text-gray-500 text-sm ml-1">
                                    ({provider.totalReviews || 0} reviews)
                                  </span>
                                </div>
                                {provider.yearsExperience > 0 && (
                                  <span className="text-sm text-gray-600">
                                    {provider.yearsExperience} years exp.
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {provider.serviceDescription && (
                            <p className="text-sm text-gray-600 mt-3 line-clamp-2">
                              {provider.serviceDescription}
                            </p>
                          )}

                          <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
                            <div className="flex items-center space-x-4 text-sm text-gray-600">
                              {provider.address && (
                                <div className="flex items-center">
                                  <FaMapMarkerAlt className="mr-1" />
                                  <span>{provider.address}</span>
                                </div>
                              )}
                              {provider.serviceRate > 0 && (
                                <div className="font-semibold text-green-600">
                                  ₱{provider.serviceRate.toLocaleString()}/service
                                </div>
                              )}
                            </div>

                            <div className="flex items-center">
                              <input
                                type="radio"
                                name="selectedProvider"
                                checked={selectedProvider?._id === provider._id}
                                onChange={() => setSelectedProvider(provider)}
                                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500"
                              />
                              <label className="ml-2 text-sm font-medium text-gray-900">
                                Select Provider
                              </label>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* Action Buttons - Only show when not on success screen */}
          {!offerSent && (
            <div className="flex justify-end space-x-3 pt-6 border-t mt-6">
              <button
                onClick={onClose}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleOfferToProvider}
                disabled={!selectedProvider || offering}
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                <FaHandshake className="mr-2" />
                {offering ? "Sending Offer..." : "Send Offer"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OfferToProviderModal;
