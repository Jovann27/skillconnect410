import React, { useState, useEffect } from "react";
import api from "../../api";
import { FaEdit, FaTrash, FaSearch, FaUser, FaMapMarkerAlt, FaClock, FaDollarSign, FaHandshake, FaEye } from "react-icons/fa";
import OfferToProviderModal from "./OfferToProviderModal";

const MyRequests = ({ searchTerm, filterStatus, filterServiceType, filterBudgetRange, handleRequestClick, handleChatRequest, handleEditRequest, handleCancelRequest, getStatusClass }) => {
  const [myRequests, setMyRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [selectedRequestId, setSelectedRequestId] = useState(null);

  useEffect(() => {
    fetchMyRequests();
  }, []);

  const fetchMyRequests = async () => {
    try {
      setLoading(true);
      const { data } = await api.get("/user/user-service-requests", { withCredentials: true });
      setMyRequests(data.requests || []);
    } catch (err) {
      console.error("Error fetching my requests:", err);
    } finally {
      setLoading(false);
    }
  };

  const filteredRequests = myRequests.filter(request => {
    // Search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = [
        request.title,
        request.description,
        request.location,
        request.serviceCategory,
        request.preferredSchedule
      ].some(field => field && field.toLowerCase().includes(searchLower));
      if (!matchesSearch) return false;
    }

    // Status filter
    if (filterStatus !== "All" && request.status !== filterStatus) return false;

    // Service type filter
    if (filterServiceType !== "All" && request.serviceCategory !== filterServiceType) return false;

    // Budget range filter
    if (filterBudgetRange.min && request.budgetRange?.min < parseFloat(filterBudgetRange.min)) return false;
    if (filterBudgetRange.max && request.budgetRange?.max > parseFloat(filterBudgetRange.max)) return false;

    return true;
  });

  const handleOfferToProvider = (requestId) => {
    setSelectedRequestId(requestId);
    setShowOfferModal(true);
  };

  const handleOfferSuccess = () => {
    // Refresh the requests list after successful offer
    fetchMyRequests();
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {filteredRequests.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">📋</div>
          <h4 className="text-xl font-semibold text-gray-900 mb-2">No Service Requests Found</h4>
          <p className="text-gray-600 mb-4">
            {searchTerm || filterStatus !== "All" || filterServiceType !== "All" || filterBudgetRange.min || filterBudgetRange.max
              ? "Try adjusting your filters or search terms."
              : "You haven't posted any service requests yet."}
          </p>
        </div>
      ) : (
        filteredRequests.map((request) => (
          <div
            key={request._id}
            className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow cursor-pointer"
            onClick={() => handleRequestClick(request)}
          >
            <div className="flex justify-between items-start mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-lg font-semibold text-gray-900">{request.title}</h3>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusClass(request.status)}`}>
                    {request.status}
                  </span>
                </div>
                <p className="text-gray-600 mb-3 line-clamp-2">{request.description}</p>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm text-gray-600">
                  <div className="flex items-center">
                    <FaMapMarkerAlt className="mr-2 text-gray-400" />
                    <span>{request.location}</span>
                  </div>
                  <div className="flex items-center">
                    <FaClock className="mr-2 text-gray-400" />
                    <span>{request.preferredSchedule || "Flexible"}</span>
                  </div>
                  <div className="flex items-center">
                    <FaDollarSign className="mr-2 text-gray-400" />
                    <span>
                      ₱{request.budgetRange?.min || 0} - ₱{request.budgetRange?.max || 0}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 ml-4">
                {request.status === "Open" && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOfferToProvider(request._id);
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center text-sm"
                  >
                    <FaHandshake className="mr-2" />
                    Offer to Provider
                  </button>
                )}

                {request.status === "Open" && (
                  <>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditRequest(request, e);
                      }}
                      className="p-2 text-gray-600 hover:text-blue-600 transition-colors"
                      title="Edit Request"
                    >
                      <FaEdit />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCancelRequest(request, e);
                      }}
                      className="p-2 text-gray-600 hover:text-red-600 transition-colors"
                      title="Cancel Request"
                    >
                      <FaTrash />
                    </button>
                  </>
                )}

                {request.serviceProvider && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleChatRequest(request, e);
                    }}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center text-sm"
                  >
                    <FaUser className="mr-2" />
                    Chat
                  </button>
                )}
              </div>
            </div>

            {request.serviceProvider && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center">
                    <FaUser className="mr-2 text-gray-400" />
                    <span className="text-gray-600">Assigned to: </span>
                    <span className="font-medium ml-1">
                      {request.serviceProvider.firstName} {request.serviceProvider.lastName}
                    </span>
                  </div>
                  <div className="text-gray-500">
                    Created: {new Date(request.createdAt).toLocaleDateString()}
                  </div>
                </div>
              </div>
            )}
          </div>
        ))
      )}

      {/* Offer to Provider Modal */}
      {showOfferModal && selectedRequestId && (
        <OfferToProviderModal
          serviceRequestId={selectedRequestId}
          onClose={() => {
            setShowOfferModal(false);
            setSelectedRequestId(null);
          }}
          onSuccess={handleOfferSuccess}
        />
      )}
    </div>
  );
};

export default MyRequests;
