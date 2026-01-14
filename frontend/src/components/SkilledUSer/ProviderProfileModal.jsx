import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api";
import toast from "react-hot-toast";
import CreateServiceRequest from "./CreateServiceRequest";
import { FaStar, FaMapMarkerAlt, FaPhone, FaEnvelope, FaCheckCircle, FaTimes, FaUser, FaBriefcase, FaTrophy, FaUsers, FaClock, FaHandshake } from "react-icons/fa";

const ProviderProfileModal = ({ providerId, onClose, onOpenChat, hideRequestService = false }) => {
  const navigate = useNavigate();
  const [provider, setProvider] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reviews, setReviews] = useState([]);
  const [showCreateRequest, setShowCreateRequest] = useState(false);

  useEffect(() => {
    if (providerId) {
      fetchProviderDetails();
    }
  }, [providerId]);

  const fetchProviderDetails = async () => {
    try {
      setLoading(true);

      // Get provider details using the dedicated endpoint
      const providerResponse = await api.get(`/user/provider-profile/${providerId}`);
      if (providerResponse.data.success) {
        setProvider(providerResponse.data.provider);
      } else {
        throw new Error("Provider not found");
      }

    } catch (error) {
      console.error("Error fetching provider details:", error);
      toast.error("Failed to load provider details");
    } finally {
      setLoading(false);
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

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[200] p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!provider) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[200] p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
          <div className="text-center">
            <p className="text-gray-500">Provider not found</p>
            <button
              onClick={onClose}
              className="mt-4 px-6 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[200] p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900 flex items-center">
              <FaUser className="mr-3 text-blue-600" />
              Provider Profile
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl"
            >
              <FaTimes />
            </button>
          </div>

          {/* Provider Header Info */}
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-6 mb-6">
            <div className="flex items-start space-x-6">
              <div className="relative">
                <img
                  src={provider.profilePic || "/default-profile.png"}
                  alt={`${provider.firstName} ${provider.lastName}`}
                  className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-lg"
                />
                {provider.isOnline && (
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 border-4 border-white rounded-full"></div>
                )}
                {provider.verified && (
                  <div className="absolute -top-1 -right-1 w-8 h-8 bg-blue-500 border-4 border-white rounded-full flex items-center justify-center">
                    <FaCheckCircle className="text-white text-sm" />
                  </div>
                )}
              </div>

              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-2xl font-bold text-gray-900">
                    {provider.firstName} {provider.lastName}
                  </h3>
                  {provider.verified && (
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full flex items-center">
                      <FaCheckCircle className="mr-1" />
                      Verified
                    </span>
                  )}
                </div>

                <p className="text-gray-600 mb-3">{provider.occupation || "Service Provider"}</p>

                <div className="flex items-center space-x-6 mb-4">
                  <div className="flex items-center">
                    <div className="flex mr-2">
                      {renderStars(provider.averageRating || 0)}
                    </div>
                    <span className="font-semibold text-lg">{provider.averageRating?.toFixed(1) || "N/A"}</span>
                    <span className="text-gray-500 ml-1">({provider.totalReviews || 0} reviews)</span>
                  </div>

                  <div className="text-2xl font-bold text-green-600">
                    ₱{provider.serviceRate?.toLocaleString() || "Rate not set"}
                  </div>
                </div>

                <div className="flex items-center text-sm text-gray-600 space-x-4">
                  {provider.address && (
                    <div className="flex items-center">
                      <FaMapMarkerAlt className="mr-1" />
                      <span>{provider.address}</span>
                    </div>
                  )}
                  <div className="flex items-center">
                    <FaClock className="mr-1" />
                    <span>{provider.isOnline ? "Available now" : "Offline"}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
              <FaBriefcase className="text-blue-600 text-2xl mx-auto mb-2" />
              <div className="text-2xl font-bold text-gray-900">{provider.totalJobsCompleted || 0}</div>
              <div className="text-sm text-gray-600">Jobs Completed</div>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
              <FaTrophy className="text-purple-600 text-2xl mx-auto mb-2" />
              <div className="text-2xl font-bold text-gray-900">{provider.averageRating?.toFixed(1) || "N/A"}</div>
              <div className="text-sm text-gray-600">Average Rating</div>
            </div>
          </div>

          {/* Skills & Services */}
          <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
            <h4 className="text-lg font-semibold text-gray-900 mb-4">Skills & Services</h4>

            {/* Skills */}
            {provider.skills && provider.skills.length > 0 && (
              <div className="mb-4">
                <h5 className="text-sm font-medium text-gray-700 mb-2">Skills:</h5>
                <div className="flex flex-wrap gap-2">
                  {provider.skills.map((skill, index) => (
                    <span
                      key={index}
                      className="px-3 py-2 bg-blue-100 text-blue-800 text-sm rounded-full"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Services */}
            {provider.services && provider.services.length > 0 && (
              <div>
                <h5 className="text-sm font-medium text-gray-700 mb-3">Services Offered:</h5>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {provider.services.map((service, index) => (
                    <div key={index} className="bg-gray-50 rounded-lg p-3 border">
                      <div className="flex justify-between items-start mb-2">
                        <span className="font-medium text-gray-900 text-sm">{service.name}</span>
                        <span className="text-green-600 font-bold text-sm">
                          ₱{service.rate?.toLocaleString() || 'N/A'}
                        </span>
                      </div>
                      {service.description && (
                        <p className="text-xs text-gray-600 leading-relaxed">{service.description}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {(!provider.skills || provider.skills.length === 0) && (!provider.services || provider.services.length === 0) && (
              <p className="text-gray-500 text-sm">No skills or services information available.</p>
            )}
          </div>

          {/* Service Description */}
          <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
            <h4 className="text-lg font-semibold text-gray-900 mb-4">About This Provider</h4>
            <p className="text-gray-700 leading-relaxed">
              {provider.serviceDescription || "No description provided."}
            </p>
          </div>

          {/* Reviews Section */}
          {reviews.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
              <h4 className="text-lg font-semibold text-gray-900 mb-4">Recent Reviews</h4>
              <div className="space-y-4">
                {reviews.slice(0, 3).map((review, index) => (
                  <div key={index} className="border-b border-gray-100 pb-4 last:border-b-0 last:pb-0">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center">
                        <div className="flex">
                          {renderStars(review.rating || 0)}
                        </div>
                        <span className="ml-2 font-semibold">{review.reviewer}</span>
                      </div>
                      <span className="text-sm text-gray-500">
                        {new Date(review.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-gray-700">{review.comment}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
            <button
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
            >
              Close
            </button>
            <button
              onClick={() => {
                // Open chat panel with current user and selected provider
                if (onOpenChat) {
                  onOpenChat(provider._id);
                }
              }}
              className="px-6 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors flex items-center"
            >
              <FaEnvelope className="mr-2" />
              Message Provider
            </button>
            {!hideRequestService && (
              <button
                onClick={() => {
                  // Open create service request modal
                  setShowCreateRequest(true);
                }}
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center"
              >
                <FaHandshake className="mr-2" />
                Request Service
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Create Service Request Modal */}
      {showCreateRequest && (
        <CreateServiceRequest
          onClose={() => setShowCreateRequest(false)}
        />
      )}
    </div>
  );
};

export default ProviderProfileModal;
