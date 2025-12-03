import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api";
import { useMainContext } from "../../mainContext";
import { usePopup } from "../../components/Layout/PopupContext";
import RequestDetailPopup from "./RequestDetailPopup";
import AcceptedOrderWeb from "./AcceptedOrderWeb";
import MyRequests from './MyRequests';
import AvailableRequests from './AvailableRequests';
import WorkRecords from './WorkRecords';
import "./UserRecords.css";

const UserWorkRecord = () => {
  const navigate = useNavigate();
  const { user, openChat } = useMainContext();
  const { showNotification } = usePopup();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [filterServiceType, setFilterServiceType] = useState("All");
  const [filterBudgetRange, setFilterBudgetRange] = useState({ min: "", max: "" });
  const [showFilters, setShowFilters] = useState(false);
  const [activeTab, setActiveTab] = useState("my-requests");
  const [popupOpen, setPopupOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [acceptedOrderPopupOpen, setAcceptedOrderPopupOpen] = useState(false);
  const [selectedAcceptedOrder, setSelectedAcceptedOrder] = useState(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editRequest, setEditRequest] = useState(null);
  const [myRequests, setMyRequests] = useState([]);

  const fetchMyRequests = async () => {
    try {
      const { data } = await api.get("/user/user-service-requests", { withCredentials: true });
      setMyRequests(data.requests || []);
    } catch (err) {
      console.error("Error fetching my requests:", err);
    }
  };

  useEffect(() => {
    fetchMyRequests();
  }, []);

  const getStatusClass = (status) => {
    switch (status) {
      case "Available":
      case "Waiting":
      case "Open":
        return "status-open";
      case "Working":
        return "status-working";
      case "Complete":
      case "Completed":
        return "status-completed";
      case "Cancelled":
        return "status-cancelled";
      default:
        return "status-default";
    }
  };

  // Popup handlers
  const handleRequestClick = (request) => {
    if (request.serviceRequest) {
      // It's a service request from work-records, navigate to ClientAccepted
      navigate('/user/client-accepted', { state: { requestId: request.serviceRequest._id } });
    } else {
      // Regular request
      const isMyRequest = myRequests.find(r => r._id === request._id);
      if (isMyRequest && request.status === 'Working') {
        // Open AcceptedOrderWeb popup for user's own working requests
        setSelectedAcceptedOrder(request);
        setAcceptedOrderPopupOpen(true);
      } else if (isMyRequest && request.status === 'Completed') {
        // Navigate to OrderDetails for user's own completed requests
        const order = {
          worker: request.acceptedBy ? `${request.acceptedBy.firstName} ${request.acceptedBy.lastName}` : 'Not assigned',
          type: request.typeOfWork,
          status: request.status,
          date: request.createdAt ? new Date(request.createdAt).toLocaleDateString() : '',
          address: request.address,
          id: request._id,
          price: `${request.budget}`,
          isOwnOrder: true
        };
        navigate('/order-details', { state: { order } });
      } else if (isMyRequest && request.status !== 'Completed' && request.status !== 'Working' && request.status !== 'Cancelled') {
        // Navigate to WaitingForWorker for user's own pending requests
        navigate('/waiting-for-worker', { state: { orderData: request } });
      } else {
        // Open modal for other requests
        setSelectedRequest(request);
        setPopupOpen(true);
      }
    }
  };

  const handleClosePopup = () => {
    setPopupOpen(false);
    setSelectedRequest(null);
  };

  const handleChatClick = (request) => {
    if (request.acceptedBy) {
      // Open chat with the appointment
      openChat(request._id);
      showNotification(`Opening chat with ${request.acceptedBy.firstName || request.acceptedBy.username}`, "success", 2000, "Success");
    } else {
      showNotification("No service provider assigned for chat.", "info", 3000, "Info");
    }
    handleClosePopup();
  };

  const handleChatRequest = async (request, e) => {
    e.stopPropagation();
    console.log("Chat button clicked for request:", request._id, "Provider:", request.serviceProvider);
    if (request.serviceProvider) {
      try {
        // Find the service request associated with this request
        const response = await api.get("/user/service-requests");
        const serviceRequests = response.data.serviceRequests || [];
        const serviceRequest = serviceRequests.find(b => b.serviceRequest && b.serviceRequest._id === request._id);

        if (serviceRequest) {
          openChat(serviceRequest._id);
          showNotification(`Opening chat with ${request.serviceProvider.firstName || request.serviceProvider.username}`, "success", 2000, "Success");
        } else {
          showNotification("No active service request found for this request.", "error", 3000, "Error");
        }
      } catch (err) {
        console.error("Error finding service request for chat:", err);
        showNotification("Failed to open chat. Please try again.", "error", 4000, "Error");
      }
    } else {
      showNotification("No service provider assigned for chat.", "info", 3000, "Info");
    }
  };

  const handleEditRequest = async (request, e) => {
    e.stopPropagation();
    setEditRequest(request);
    setEditModalOpen(true);
  };

  const handleCancelRequest = async (request, e) => {
    e.stopPropagation();

    // Prompt for cancellation reason
    const cancellationReason = window.prompt("Please provide a reason for cancelling this request:");
    if (cancellationReason === null) return; // User cancelled the prompt

    if (!cancellationReason.trim()) {
      showNotification("Cancellation reason is required.", "error", 3000, "Error");
      return;
    }

    try {
      console.log("Cancelling request:", request._id);
      const response = await api.delete(`/user/service-request/${request._id}/cancel`, {
        data: { cancellationReason: cancellationReason.trim() }
      });
      console.log("Cancel request response:", response.data);

      if (response.data.success) {
        showNotification("Request cancelled successfully!", "success", 3000, "Success");
        fetchMyRequests();
      } else {
        showNotification("Failed to cancel request. Please try again.", "error", 4000, "Error");
      }
    } catch (err) {
      console.error("Error cancelling request:", err);
      showNotification("Failed to cancel request. Please try again.", "error", 4000, "Error");
    }
  };

  const handleAcceptRequest = async (request, e) => {
    e.stopPropagation();

    if (user.role !== "Service Provider") {
      showNotification("You must complete your service provider application and get approved by an admin before accepting service requests.", "error", 5000, "Application Required");
      return;
    }

    try {
      const response = await api.post(`/user/service-request/${request._id}/accept`);
      if (response.data.success) {
        showNotification("Request accepted successfully!", "success", 3000, "Success");
        handleClosePopup();
      }
    } catch (err) {
      console.error(err);
      showNotification("Failed to accept request. Please try again.", "error", 4000, "Error");
    }
  };

  const handleDeclineRequest = async (e) => {
    e.stopPropagation();
    // For decline, just close the popup or remove from view
    showNotification("Request declined.", "info", 3000, "Info");
    handleClosePopup();
  };

  const handleCloseEditModal = () => {
    setEditModalOpen(false);
    setEditRequest(null);
  };

  const handleSaveEdit = async () => {
    try {
      const updateData = {
        name: editRequest.name?.trim(),
        address: editRequest.address?.trim(),
        phone: editRequest.phone?.trim(),
        typeOfWork: editRequest.typeOfWork?.trim(),
        time: editRequest.time?.trim(),
        budget: editRequest.budget ? parseFloat(editRequest.budget) : 0,
        notes: editRequest.notes?.trim() || "",
        location: editRequest.location || null
      };

      // Validate required fields
      if (!updateData.name || !updateData.address || !updateData.phone || !updateData.typeOfWork || !updateData.time) {
        showNotification("Please fill in all required fields.", "error", 4000, "Validation Error");
        return;
      }

      const response = await api.put(`/user/service-request/${editRequest._id}/update`, updateData);
      if (response.data.success) {
        showNotification("Request updated successfully!", "success", 3000, "Success");
        fetchMyRequests();
        handleCloseEditModal();
      }
    } catch (err) {
      console.error(err);
      let errorMessage = "Failed to update request. Please try again.";

      if (err.response?.status === 400) {
        if (err.response.data?.message?.includes("Cannot edit request that is in progress")) {
          errorMessage = "This request has been accepted by a service provider and can no longer be edited.";
          // Refresh the requests to show updated status
          fetchMyRequests();
          handleCloseEditModal();
        } else {
          errorMessage = err.response.data?.message || errorMessage;
        }
      } else if (err.response?.status === 403) {
        errorMessage = "You don't have permission to edit this request.";
      } else if (err.response?.status === 404) {
        errorMessage = "Request not found. It may have been deleted.";
        fetchMyRequests();
        handleCloseEditModal();
      } else {
        errorMessage = err.response?.data?.message || errorMessage;
      }

      showNotification(errorMessage, "error", 4000, "Error");
    }
  };

  const handleDeleteRequest = async () => {
    showNotification("Request declined.", "info", 3000, "Info");
    handleClosePopup();
  };

  return (
    <div className="records-page">
      <div className="records-header">
        <h2>Records & Requests</h2>

        <div className="records-controls">
          <input
            type="text"
            placeholder="Search by service, client, budget, address, phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="records-search"
          />
          <button
            className={`records-filter-btn ${showFilters ? 'active' : ''}`}
            onClick={() => setShowFilters(!showFilters)}
          >
            {showFilters ? 'Hide Filters' : 'Show Filters'}
          </button>
        </div>

        {/* Advanced Filters */}
        {showFilters && (
          <div className="records-filters">
            <div className="filter-row">
              <div className="filter-group">
                <label>Status:</label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="filter-select"
                >
                  <option value="All">All Status</option>
                  <option value="Available">Available</option>
                  <option value="Working">Working</option>
                  <option value="Complete">Complete</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>

              <div className="filter-group">
                <label>Min Budget (₱):</label>
                <input
                  type="number"
                  placeholder="0"
                  value={filterBudgetRange.min}
                  onChange={(e) => setFilterBudgetRange(prev => ({ ...prev, min: e.target.value }))}
                  className="filter-input"
                  min="0"
                />
              </div>

              <div className="filter-group">
                <label>Max Budget (₱):</label>
                <input
                  type="number"
                  placeholder="No limit"
                  value={filterBudgetRange.max}
                  onChange={(e) => setFilterBudgetRange(prev => ({ ...prev, max: e.target.value }))}
                  className="filter-input"
                  min="0"
                />
              </div>

              <div className="filter-group">
                <button
                  className="clear-filters-btn"
                  onClick={() => {
                    setFilterStatus("All");
                    setFilterServiceType("All");
                    setFilterBudgetRange({ min: "", max: "" });
                    setSearchTerm("");
                  }}
                >
                  Clear All
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="records-tabs">
        <button
          className={`tab-button ${activeTab === "my-requests" ? "active" : ""}`}
          onClick={() => setActiveTab("my-requests")}
        >
          My Requests
        </button>
        <button
          className={`tab-button ${activeTab === "available-requests" ? "active" : ""} ${user.role !== "Service Provider" ? "disabled" : ""}`}
          onClick={user.role === "Service Provider" ? () => setActiveTab("available-requests") : undefined}
          disabled={user.role !== "Service Provider"}
        >
          Available Requests
        </button>
        <button
          className={`tab-button ${activeTab === "work-records" ? "active" : ""} ${user.role !== "Service Provider" ? "disabled" : ""}`}
          onClick={user.role === "Service Provider" ? () => setActiveTab("work-records") : undefined}
          disabled={user.role !== "Service Provider"}
        >
          Work Records
        </button>
      </div>

      <div className="records-content">
        {activeTab === "my-requests" && <MyRequests searchTerm={searchTerm} filterStatus={filterStatus} filterServiceType={filterServiceType} filterBudgetRange={filterBudgetRange} handleRequestClick={handleRequestClick} handleChatRequest={handleChatRequest} handleEditRequest={handleEditRequest} handleCancelRequest={handleCancelRequest} getStatusClass={getStatusClass} />}
        {activeTab === "available-requests" && <AvailableRequests searchTerm={searchTerm} filterStatus={filterStatus} filterServiceType={filterServiceType} filterBudgetRange={filterBudgetRange} handleRequestClick={handleRequestClick} handleAcceptRequest={handleAcceptRequest} handleDeclineRequest={handleDeclineRequest} getStatusClass={getStatusClass} />}
        {activeTab === "work-records" && <WorkRecords searchTerm={searchTerm} filterStatus={filterStatus} filterServiceType={filterServiceType} filterBudgetRange={filterBudgetRange} handleRequestClick={handleRequestClick} getStatusClass={getStatusClass} />}
      </div>

      {/* Request Detail Popup */}
      <RequestDetailPopup
        request={selectedRequest}
        isOpen={popupOpen}
        onClose={handleClosePopup}
        onChat={handleChatClick}
        onDelete={handleDeleteRequest}
        onAccept={handleAcceptRequest}
        onDecline={handleDeclineRequest}
      />

      {/* Accepted Order Popup */}
      <AcceptedOrderWeb
        request={selectedAcceptedOrder}
        isOpen={acceptedOrderPopupOpen}
        onClose={() => {
          setAcceptedOrderPopupOpen(false);
          setSelectedAcceptedOrder(null);
        }}
      />

      {/* Edit Modal */}
      {editModalOpen && (
        <div className="edit-modal">
          <div className="edit-modal-content">
            <h3>Edit Request</h3>
            <form onSubmit={(e) => { e.preventDefault(); handleSaveEdit(); }}>
              <div className="form-group">
                <label>Name:</label>
                <input
                  type="text"
                  value={editRequest.name}
                  onChange={(e) => setEditRequest({ ...editRequest, name: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Address:</label>
                <input
                  type="text"
                  value={editRequest.address}
                  onChange={(e) => setEditRequest({ ...editRequest, address: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Phone:</label>
                <input
                  type="text"
                  value={editRequest.phone}
                  onChange={(e) => setEditRequest({ ...editRequest, phone: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Service Type:</label>
                <input
                  type="text"
                  value={editRequest.typeOfWork}
                  onChange={(e) => setEditRequest({ ...editRequest, typeOfWork: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Preferred Time:</label>
                <input
                  type="text"
                  value={editRequest.time}
                  onChange={(e) => setEditRequest({ ...editRequest, time: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Budget (₱):</label>
                <input
                  type="number"
                  value={editRequest.budget}
                  onChange={(e) => setEditRequest({ ...editRequest, budget: e.target.value })}
                  min="0"
                />
              </div>
              <div className="form-group">
                <label>Notes:</label>
                <textarea
                  value={editRequest.notes}
                  onChange={(e) => setEditRequest({ ...editRequest, notes: e.target.value })}
                />
              </div>
              <div className="modal-actions">
                <button type="submit" className="save-btn">Save</button>
                <button type="button" className="cancel-btn" onClick={handleCloseEditModal}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserWorkRecord;
