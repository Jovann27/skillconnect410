import React, { useState, useEffect } from 'react';
import api from '../../api';
import './Clients.css';

const Clients = () => {
  const [serviceRequests, setServiceRequests] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);

  // Fetch service requests on component mount
  useEffect(() => {
    fetchServiceRequests();
  }, []);

  const fetchServiceRequests = async () => {
    try {
      setIsLoading(true);
      const response = await api.get('/settings/service-requests');
      if (response.data.success) {
        setServiceRequests(response.data.requests);
      }
    } catch (error) {
      console.error('Error fetching service requests:', error);
      alert('Failed to load service requests');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAccept = async (request) => {
    try {
      setActionLoading(request._id);
      const response = await api.put(`/settings/service-requests/${request._id}/accept`);

      if (response.data.success) {
        alert(`You accepted ${request.fullName}'s request.`);
        // Refresh the list to remove the accepted request
        fetchServiceRequests();
      } else {
        alert('Failed to accept the request. Please try again.');
      }
    } catch (error) {
      console.error('Error accepting service request:', error);
      alert('Failed to accept the request. Please try again.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDecline = async (request) => {
    try {
      setActionLoading(request._id);
      const response = await api.put(`/settings/service-requests/${request._id}/ignore`);

      if (response.data.success) {
        alert(`You declined ${request.fullName}'s request.`);
        // Refresh the list to remove the declined request
        fetchServiceRequests();
      } else {
        alert('Failed to decline the request. Please try again.');
      }
    } catch (error) {
      console.error('Error declining service request:', error);
      alert('Failed to decline the request. Please try again.');
    } finally {
      setActionLoading(null);
    }
  };

  const renderServiceRequest = (request) => (
    <div key={request._id} className="client-card">
      {/* Client Header */}
      <div className="client-header">
        <img
          src={request.requester?.profilePic || '/default-profile.png'}
          alt="Client profile"
          className="client-avatar"
        />
        <div className="client-info">
          <h3 className="client-name">
            {request.fullName || `${request.requester?.firstName} ${request.requester?.lastName}`}
          </h3>
          <p className="client-email">{request.requester?.email}</p>
          <p className="client-phone">{request.requester?.phone || 'Phone not provided'}</p>
        </div>
      </div>

      <div className="divider"></div>

      {/* Service Info */}
      <div className="service-details">
        <div className="detail-row">
          <i className="fas fa-briefcase detail-icon"></i>
          <span className="detail-label">Service Needed:</span>
          <span className="detail-value">{request.typeOfWork || 'Not specified'}</span>
        </div>
        <div className="detail-row">
          <i className="fas fa-money-bill-wave detail-icon"></i>
          <span className="detail-label">Budget:</span>
          <span className="detail-value">₱{request.budget || 0}</span>
        </div>
        <div className="detail-row">
          <i className="fas fa-calendar-alt detail-icon"></i>
          <span className="detail-label">Date Created:</span>
          <span className="detail-value">
            {request.createdAt ? new Date(request.createdAt).toLocaleDateString() : 'Not specified'}
          </span>
        </div>
        <div className="detail-row">
          <i className="fas fa-clock detail-icon"></i>
          <span className="detail-label">Preferred Time:</span>
          <span className="detail-value">{request.time || 'Not specified'}</span>
        </div>
        {request.notes && (
          <div className="detail-row">
            <i className="fas fa-sticky-note detail-icon"></i>
            <span className="detail-label">Notes:</span>
            <span className="detail-value">{request.notes}</span>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="action-buttons">
        <button
          className={`btn-accept ${actionLoading === request._id ? 'loading' : ''}`}
          onClick={() => handleAccept(request)}
          disabled={actionLoading === request._id}
        >
          {actionLoading === request._id ? (
            <>
              <i className="fas fa-spinner fa-spin"></i>
              Accepting...
            </>
          ) : (
            <>
              <i className="fas fa-check-circle"></i>
              Accept
            </>
          )}
        </button>

        <button
          className={`btn-decline ${actionLoading === request._id ? 'loading' : ''}`}
          onClick={() => handleDecline(request)}
          disabled={actionLoading === request._id}
        >
          {actionLoading === request._id ? (
            <>
              <i className="fas fa-spinner fa-spin"></i>
              Declining...
            </>
          ) : (
            <>
              <i className="fas fa-times-circle"></i>
              Decline
            </>
          )}
        </button>
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <div className="clients-loading">
        <div className="loading-spinner"></div>
        <p>Loading service requests...</p>
      </div>
    );
  }

  return (
    <div className="clients-container">
      <div className="clients-header">
        <h2>Service Requests</h2>
        <p>View and respond to incoming service requests</p>
      </div>

      {serviceRequests.length === 0 ? (
        <div className="no-requests">
          <i className="fas fa-inbox fa-3x"></i>
          <h3>No Service Requests</h3>
          <p>You don't have any pending service requests at the moment.</p>
        </div>
      ) : (
        <div className="clients-grid">
          {serviceRequests.map(renderServiceRequest)}
        </div>
      )}
    </div>
  );
};

export default Clients;
