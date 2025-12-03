import { useState, useEffect } from "react";
import api from "../../api";
import socket from "../../utils/socket";
import { getImageUrl } from "../../utils/imageUtils";
import "../Css/WaitingForWorker.css";

const AcceptedOrderWeb = ({ request, isOpen, onClose }) => {
  const [status, setStatus] = useState("Accepted");
  const [workerData, setWorkerData] = useState(null);
  const [currentRequest, setCurrentRequest] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [completingWork, setCompletingWork] = useState(false);
  const [workProofImage, setWorkProofImage] = useState(null);

  useEffect(() => {
    if (!isOpen || !request) {
      setIsLoading(false);
      return;
    }

    const initialize = async () => {
      setIsLoading(true);
      setError(null);
      setCurrentRequest(request);

      if (request.status === "Working" || request.status === "Accepted") {
        setStatus("Accepted");
        if (request.serviceProvider || request.acceptedBy) {
          const provider = request.serviceProvider || request.acceptedBy;
          setWorkerData({
            name: `${provider.firstName} ${provider.lastName}`,
            skill: request.typeOfWork,
            phone: provider.phone,
            image: getImageUrl(provider.profilePic) || "/default-profile.png",
            eta: request.eta,
          });
        }
      }
      setIsLoading(false);
    };

    initialize();

    if (socket && request._id) {
      socket.emit("join-service-request", request._id);
      const handleUpdate = async (updateData) => {
        if (updateData?.requestId !== request._id) return;
        try {
          const response = await api.get(`/user/service-request/${request._id}`);
          const updatedRequest = response.data?.request;
          if (updatedRequest) {
            setCurrentRequest(updatedRequest);
            const provider = updatedRequest.serviceProvider || updatedRequest.acceptedBy;
            if (provider) {
              setWorkerData({
                name: `${provider.firstName || ''} ${provider.lastName || ''}`.trim(),
                skill: updatedRequest.typeOfWork,
                phone: provider.phone,
                image: getImageUrl(provider.profilePic) || "/default-profile.png",
                eta: updatedRequest.eta,
              });
            }
          }
        } catch (err) {
          console.error("Failed to update request via socket:", err);
        }
      };
      socket.on("service-request-updated", handleUpdate);
      return () => {
        socket.off("service-request-updated", handleUpdate);
        socket.emit("leave-service-request", request._id);
      };
    }
  }, [request, isOpen]);

  const handleCancel = async () => {
    if (!currentRequest?._id) return;

    if (!window.confirm("Are you sure you want to cancel this order?")) return;

    try {
      const response = await api.delete(`/user/service-request/${currentRequest._id}/cancel`);
      if (response.data.success) {
        alert("Order cancelled successfully");
        onClose();
      } else {
        alert("Failed to cancel the order. Please try again.");
      }
    } catch (err) {
      console.error("Error cancelling order:", err);
      alert("Failed to cancel the order. Please try again.");
    }
  };

  const handleChat = async () => {
    if (currentRequest.serviceProvider || currentRequest.acceptedBy) {
      try {
        // Find the booking associated with this request
        const response = await api.get("/user/bookings");
        const bookings = response.data.bookings || [];
        const booking = bookings.find(b => b.serviceRequest && b.serviceRequest._id === currentRequest._id);

        if (booking) {
          // For now, just show a message. Chat functionality would need to be implemented
          const provider = currentRequest.serviceProvider || currentRequest.acceptedBy;
          alert(`Opening chat with ${provider.firstName}`);
        } else {
          alert("No active booking found for this request.");
        }
      } catch (err) {
        console.error("Error finding booking for chat:", err);
        alert("Failed to open chat. Please try again.");
      }
    } else {
      alert("No service provider assigned for chat.");
    }
  };

  const handleCompleteWork = async () => {
    if (!workProofImage) return;

    setCompletingWork(true);

    try {
      // Find the booking associated with this request
      const response = await api.get("/user/bookings");
      const bookings = response.data.bookings || [];
      const booking = bookings.find(b => b.serviceRequest && b.serviceRequest._id === currentRequest._id);

      if (!booking) {
        alert("No active booking found.");
        return;
      }

      // For now, just complete the work without uploading image
      // TODO: Implement image upload
      const completeResponse = await api.put(`/user/booking/${booking._id}/status`, { status: "Complete" });

      if (completeResponse.data.success) {
        alert("Work completed successfully");
        onClose();
      } else {
        alert("Failed to complete work.");
      }
    } catch (err) {
      console.error("Error completing work:", err);
      alert("Failed to complete work.");
    } finally {
      setCompletingWork(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getStatusBadgeClass = () => {
    if (status === "Accepted") return "status-found";
    if (currentRequest?.status === "No Longer Available") return "status-expired";
    return "status-searching";
  };

  const getStatusText = () => {
    if (status === "Accepted") return "Provider Assigned";
    if (currentRequest?.status === "No Longer Available") return "Expired";
    return "Processing";
  };

  if (!isOpen) return null;

  if (isLoading) {
    return (
      <div className="modal-overlay">
        <div className="modal-content">
          <div className="loading-container">
            <div className="loading-content">
              <div className="spinner"></div>
              <h3>Loading your order</h3>
              <p>Please wait a moment...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="modal-overlay">
        <div className="modal-content">
          <div className="error-container">
            <h2>❌ Error</h2>
            <p>{error}</p>
            <button onClick={() => window.location.reload()}>🔄 Refresh Page</button>
            <button onClick={onClose}>Close</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Service Order Details</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        <div className="page-wrapper">
          <div className="container">
            <div className="grid-layout">

              {/* LEFT COLUMN - Order Details & Actions */}
              <div className="main-content">

                {/* Header Card */}
                <div className="card header-card">
                  <div className="header-left">
                    <h2>Service Order</h2>
                    <p>Order #{currentRequest?._id?.slice(-6) || "N/A"}</p>
                  </div>
                  <div className={`status-badge ${getStatusBadgeClass()}`}>
                    {getStatusText()}
                  </div>
                </div>

                {/* Order Information */}
                <div className="card">
                  <h3 className="card-title">Order Information</h3>
                  <div className="details-grid">
                    <div className="detail-row">
                      <svg className="detail-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                      </svg>
                      <div className="detail-content">
                        <p>Service Date</p>
                        <p>{formatDate(currentRequest?.createdAt)}</p>
                      </div>
                    </div>
                    <div className="detail-row">
                      <svg className="detail-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
                      </svg>
                      <div className="detail-content">
                        <p>Location</p>
                        <p>{currentRequest?.address || "N/A"}</p>
                      </div>
                    </div>
                    <div className="detail-row">
                      <svg className="detail-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                      </svg>
                      <div className="detail-content">
                        <p>Service Type</p>
                        <p>{currentRequest?.typeOfWork || "N/A"}</p>
                      </div>
                    </div>
                    <div className="detail-row">
                      <svg className="detail-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"></path>
                      </svg>
                      <div className="detail-content">
                        <p>Budget</p>
                        <p className="budget">₱{currentRequest?.budget || "N/A"}</p>
                      </div>
                    </div>
                  </div>
                  {currentRequest?.notes && (
                    <div className="detail-row detail-notes">
                      <svg className="detail-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                      </svg>
                      <div className="detail-content">
                        <p>Notes</p>
                        <p>{currentRequest.notes}</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="actions-card">
                  <button className="action-button action-chat" onClick={handleChat}>
                    <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path>
                    </svg>
                    Chat with Provider
                  </button>
                  <button className="action-button action-cancel" onClick={handleCancel}>
                    <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                    Cancel Order
                  </button>
                </div>

              </div>

              {/* CENTER COLUMN - Provider Details & Work Completion */}
              <div className="center-content">

                {/* Assigned Provider */}
                {workerData && (
                  <div className="card assigned-card">
                    <div className="assigned-header">
                      <div className="assigned-icon">
                        <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                        </svg>
                      </div>
                      <div className="assigned-info">
                        <h3>Provider Assigned</h3>
                        <p>Your service provider is assigned to this order</p>
                      </div>
                    </div>
                    <div className="assigned-body">
                      <img src={workerData.image} alt={workerData.name} className="assigned-image" />
                      <div className="assigned-details">
                        <h4>{workerData.name}</h4>
                        <p>{workerData.skill}</p>
                        <p className="phone">{workerData.phone}</p>
                        {workerData.eta && <p>ETA: {new Date(workerData.eta).toLocaleTimeString()}</p>}
                      </div>
                    </div>
                  </div>
                )}

                {/* Work Completion Section - Only show for service providers when status is Working */}
                {currentRequest?.status === 'Working' && (
                  <div className="card">
                    <h3 className="card-title">Complete Work</h3>
                    <div className="work-completion-form">
                      <div className="form-group">
                        <label>Upload Work Proof Image</label>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => setWorkProofImage(e.target.files[0])}
                          className="file-input"
                        />
                      </div>
                      <button
                        className="action-button action-complete"
                        onClick={handleCompleteWork}
                        disabled={completingWork || !workProofImage}
                      >
                        {completingWork ? (
                          <>
                            <div className="spinner-small"></div>
                            Completing...
                          </>
                        ) : (
                          <>
                            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                            </svg>
                            Confirm Work Done
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}

                {/* Customer Details Card */}
                <div className="card">
                  <h3 className="card-title">Customer Details</h3>
                  <div className="customer-details">
                    <div className="detail-row">
                      <svg className="detail-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                      </svg>
                      <div className="detail-content">
                        <p>Full Name</p>
                        <p>{currentRequest?.name || "N/A"}</p>
                      </div>
                    </div>
                    <div className="detail-row">
                      <svg className="detail-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path>
                      </svg>
                      <div className="detail-content">
                        <p>Phone Number</p>
                        <p>{currentRequest?.phone || "N/A"}</p>
                      </div>
                    </div>
                  </div>
                </div>

              </div>

              {/* RIGHT COLUMN - Additional Actions */}
              <div className="sidebar">

                <div className="actions-card">
                  {workerData && (
                    <button className="action-button action-call" onClick={() => window.open(`tel:${workerData.phone}`)}>
                      <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path>
                      </svg>
                      Call Provider
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AcceptedOrderWeb;
