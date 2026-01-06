import React, { useState, useEffect } from "react";
import api from "../../api";
import { toast } from "react-hot-toast";
import { useMainContext } from "../../mainContext";
import {
  FaStar, FaMapMarkerAlt, FaPhone, FaEnvelope, FaCheckCircle,
  FaTimes, FaUser, FaChartLine, FaHandshake, FaInfoCircle
} from "react-icons/fa";

const RecommendedWorkersModal = ({ serviceRequestId, onClose, onSelectWorker }) => {
  const { user } = useMainContext();
  const [recommendedWorkers, setRecommendedWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [algorithm, setAlgorithm] = useState("basic");

  // Only show this modal for Community Members (clients) who have posted service requests
  // Service Providers send offers, they don't receive recommended workers
  if (user?.role !== "Community Member") {
    return null;
  }

  useEffect(() => {
    if (serviceRequestId) {
      fetchRecommendedWorkers();
    }
  }, [serviceRequestId]);

  const fetchRecommendedWorkers = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/user/recommended-providers?serviceRequestId=${serviceRequestId}`);
      if (response.data.success) {
        setRecommendedWorkers(response.data.providers || []);
        setAlgorithm(response.data.algorithm || "basic");
      }
    } catch (error) {
      console.error("Error fetching recommended workers:", error);
      toast.error("Failed to load recommendations");
    } finally {
      setLoading(false);
    }
  };

  const handleSendOffer = async (worker) => {
    try {
      // Send offer to the selected provider
      const response = await api.post('/user/offer-to-provider', {
        providerId: worker._id,
        requestId: serviceRequestId
      });

      if (response.data.success) {
        toast.success(`Offer sent to ${worker.firstName} ${worker.lastName}!`);
        if (onSelectWorker) {
          onSelectWorker(worker);
        }
        if (onClose) {
          onClose();
        }
      } else {
        toast.error("Failed to send offer");
      }
    } catch (error) {
      console.error("Error sending offer:", error);
      toast.error("Failed to send offer. Please try again.");
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[200] p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 flex items-center">
                <FaChartLine className="mr-3 text-blue-600" />
                Recommended Workers
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                {algorithm === "hybrid" ? (
                  <span className="flex items-center mt-2">
                    <FaInfoCircle className="mr-2 text-blue-500" />
                    Using Hybrid Recommendation Algorithm (Content-based + Collaborative Filtering)
                  </span>
                ) : (
                  "Top-rated workers for your service request"
                )}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl"
            >
              <FaTimes />
            </button>
          </div>

          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>
          ) : recommendedWorkers.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">No recommended workers found at this time.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {recommendedWorkers.map((worker, index) => (
                <div
                  key={worker._id}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center">
                          <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center mr-3">
                            {worker.profilePic ? (
                              <img
                                src={worker.profilePic}
                                alt={`${worker.firstName} ${worker.lastName}`}
                                className="w-12 h-12 rounded-full object-cover"
                              />
                            ) : (
                              <FaUser className="text-blue-600" />
                            )}
                          </div>
                          <div>
                            <h3 className="font-semibold text-lg text-gray-900">
                              {worker.firstName} {worker.lastName}
                              {worker.verified && (
                                <FaCheckCircle className="inline ml-2 text-green-500" title="Verified" />
                              )}
                            </h3>
                            <p className="text-sm text-gray-600">{worker.occupation || "Service Provider"}</p>
                          </div>
                        </div>
                        {worker.recommendationScore !== undefined && (
                          <div className="text-right">
                            <div className="flex items-center text-blue-600">
                              <FaChartLine className="mr-1" />
                              <span className="font-semibold">
                                {Math.round(worker.recommendationScore * 100)}% Match
                              </span>
                            </div>
                            {worker.recommendationReason && (
                              <p className="text-xs text-gray-500 mt-1">{worker.recommendationReason}</p>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                        <div>
                          <p className="text-sm font-medium text-gray-700 mb-1">Skills</p>
                          <div className="flex flex-wrap gap-2">
                            {worker.skills?.slice(0, 3).map((skill, idx) => (
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
                              <span className="font-semibold">{worker.averageRating?.toFixed(1) || "N/A"}</span>
                              <span className="text-gray-500 text-sm ml-1">
                                ({worker.totalReviews || 0} reviews)
                              </span>
                            </div>
                            {worker.yearsExperience > 0 && (
                              <span className="text-sm text-gray-600">
                                {worker.yearsExperience} years exp.
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {worker.serviceDescription && (
                        <p className="text-sm text-gray-600 mt-3 line-clamp-2">
                          {worker.serviceDescription}
                        </p>
                      )}

                      <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
                        <div className="flex items-center space-x-4 text-sm text-gray-600">
                          {worker.address && (
                            <div className="flex items-center">
                              <FaMapMarkerAlt className="mr-1" />
                              <span>{worker.address}</span>
                            </div>
                          )}
                          {worker.serviceRate > 0 && (
                            <div className="font-semibold text-green-600">
                              ₱{worker.serviceRate.toLocaleString()}/service
                            </div>
                          )}
                        </div>

                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleSendOffer(worker)}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center"
                          >
                            <FaBriefcase className="mr-2" />
                            Send Offer
                          </button>
                        </div>
                      </div>

                      {algorithm === "hybrid" && worker.contentBasedScore !== undefined && (
                        <div className="mt-3 pt-3 border-t border-gray-100">
                          <p className="text-xs text-gray-500 mb-2">Recommendation Breakdown:</p>
                          <div className="flex items-center space-x-4 text-xs">
                            <div>
                              <span className="text-gray-600">Content-based: </span>
                              <span className="font-semibold">
                                {Math.round(worker.contentBasedScore * 100)}%
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-600">Collaborative: </span>
                              <span className="font-semibold">
                                {Math.round(worker.collaborativeScore * 100)}%
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RecommendedWorkersModal;
