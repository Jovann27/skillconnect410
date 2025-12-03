import React from 'react';
import './ReceiptModal.css';

const ReceiptModal = ({ request, booking, isOpen, onClose }) => {
  if (!isOpen || !request) return null;

  // Debug logging to verify data is available
  console.log('ReceiptModal - Request data:', request);
  console.log('ReceiptModal - Booking data:', booking);
  console.log('ReceiptModal - Requester info:', request?.requester);
  console.log('ReceiptModal - ServiceProvider info:', request?.serviceProvider);
  console.log('ReceiptModal - Booking provider info:', booking?.provider);

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="receipt-modal-overlay" onClick={onClose}>
      <div className="receipt-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="receipt-modal-header">
          <h2>Service Receipt</h2>
          <button className="receipt-close-button" onClick={onClose}>×</button>
        </div>

        <div className="receipt-body">
          {/* Receipt Header */}
          <div className="receipt-header-section">
            <div className="receipt-logo">
              <img src="/skillconnect.png" alt="SkillConnect" className="receipt-logo-img" />
            </div>
            <div className="receipt-title">
              <h3>Service Completion Receipt</h3>
              <p>Order #{request._id?.slice(-8).toUpperCase() || "N/A"}</p>
            </div>
          </div>

          {/* Service Details */}
          <div className="receipt-section">
            <h4>Service Details</h4>
            <div className="receipt-details-grid">
              <div className="detail-item">
                <span className="detail-label">Service Type:</span>
                <span className="detail-value">{request.typeOfWork || "N/A"}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Date Requested:</span>
                <span className="detail-value">{formatDate(request.createdAt)}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Preferred Time:</span>
                <span className="detail-value">{request.time || "N/A"}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Service Address:</span>
                <span className="detail-value">{request.address || "N/A"}</span>
              </div>
            </div>
          </div>

          {/* Client Information */}
          <div className="receipt-section">
            <h4>Client Information</h4>
            <div className="receipt-details-grid">
              <div className="detail-item">
                <span className="detail-label">Name:</span>
                <span className="detail-value">
                  {(request?.requester?.firstName || request?.name) || "N/A"} {(request?.requester?.lastName) || ""}
                </span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Phone:</span>
                <span className="detail-value">{(request?.requester?.phone || request?.phone) || "N/A"}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Email:</span>
                <span className="detail-value">{(request?.requester?.email || request?.email) || "N/A"}</span>
              </div>
            </div>
          </div>

          {/* Provider Information */}
          {(booking?.provider || request?.serviceProvider) && (
            <div className="receipt-section">
              <h4>Service Provider</h4>
              <div className="receipt-details-grid">
                <div className="detail-item">
                  <span className="detail-label">Name:</span>
                  <span className="detail-value">
                    {(booking?.provider?.firstName || request?.serviceProvider?.firstName)} {(booking?.provider?.lastName || request?.serviceProvider?.lastName)}
                  </span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Phone:</span>
                  <span className="detail-value">{(booking?.provider?.phone || request?.serviceProvider?.phone) || "N/A"}</span>
                </div>
                {booking?.completedAt && (
                  <div className="detail-item">
                    <span className="detail-label">Service Completed:</span>
                    <span className="detail-value">{formatDate(booking.completedAt)}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Service Notes */}
          {request.notes && (
            <div className="receipt-section">
              <h4>Service Notes</h4>
              <p className="service-notes">{request.notes}</p>
            </div>
          )}

          {/* Payment Summary */}
          <div className="receipt-section payment-summary">
            <h4>Payment Summary</h4>
            <div className="payment-details">
              <div className="payment-row">
                <span>Service Fee</span>
                <span>₱{request.budget?.toLocaleString() || "0"}</span>
              </div>
              <div className="payment-row total">
                <span><strong>Total Amount</strong></span>
                <span><strong>₱{request.budget?.toLocaleString() || "0"}</strong></span>
              </div>
            </div>
          </div>

          {/* Completion Details */}
          {booking && (
            <div className="receipt-section">
              <h4>Completion Details</h4>
              <div className="completion-details">
                <div className="completion-item">
                  <i className="fas fa-calendar-check"></i>
                  <span>Service completed on {formatDate(booking.completedAt)} at {formatTime(booking.completedAt)}</span>
                </div>
                {booking.completionNotes && (
                  <div className="completion-item">
                    <i className="fas fa-sticky-note"></i>
                    <span>Provider notes: {booking.completionNotes}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="receipt-footer">
            <p>Thank you for using SkillConnect!</p>
            <p className="receipt-date">Receipt generated on {formatDate(new Date())}</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="receipt-modal-actions">
          <button className="btn-secondary" onClick={onClose}>
            Close
          </button>
          <button
            className="btn-primary"
            onClick={() => {
              window.print();
            }}
          >
            <i className="fas fa-print"></i>
            Print Receipt
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReceiptModal;
