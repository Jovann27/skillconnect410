import { useEffect, useState } from 'react';
import api from '../../api';
import './ReviewServiceRequest.css';

const ReviewServiceRequest = () => {
  const [requests, setRequests] = useState([]);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [skillFilter, setSkillFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortField] = useState('createdAt');
  const [sortOrder] = useState('desc');

  const fetchPage = async (p = 1, l = limit) => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      params.set('page', p);
      params.set('limit', l);
      if (skillFilter) params.set('skill', skillFilter);
      if (statusFilter) params.set('status', statusFilter);
      params.set('sort', `${sortField}:${sortOrder}`);

      const res = await api.get(`/admin/service-requests?${params.toString()}`);

      // Validate response structure
      if (!res.data) {
        throw new Error('Invalid response format');
      }

      // Backend returns: { count, totalPages, requests }
      // Frontend expects: { total, page, totalPages, requests }
      const responseData = res.data;
      setRequests(Array.isArray(responseData.requests) ? responseData.requests : []);
      setPage(p); // Use the requested page since backend doesn't return it
      setTotalPages(responseData.totalPages || 1);
      setTotal(responseData.count || 0); // Backend returns 'count', frontend expects 'total'
    } catch (err) {
      console.error('Failed to fetch requests', err);
      setError(err.response?.data?.message || err.message || 'Failed to fetch service requests');
      // Set empty state on error
      setRequests([]);
      setTotal(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { 
    // fetch initial page
    fetchPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="user-management-container">
      <div className="analytics-header">
        <div>
          <h1>Service Requests Review</h1>
          <p className="header-description">Review and manage all service requests from the platform</p>
        </div>
        
      </div>

      <div className="filters-section">
        <div className="filters-grid">
          <div className="filter-group">
            <label className="filter-label">
              <i className="fas fa-tools"></i>
              Filter by Skill
            </label>
            <input
              type="text"
              placeholder="Enter skill name..."
              value={skillFilter}
              onChange={e => setSkillFilter(e.target.value)}
              className="filter-input"
            />
          </div>

          <div className="filter-group">
            <label className="filter-label">
              <i className="fas fa-filter"></i>
              Status Filter
            </label>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="filter-select"
            >
              <option value="">All Status</option>
              <option value="pending">Pending</option>
              <option value="accepted">Accepted</option>
              <option value="complete">Complete</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          <div className="filter-group">
            <label className="filter-label">
              <i className="fas fa-list"></i>
              Items per Page
            </label>
            <select
              value={limit}
              onChange={e => {
                setLimit(parseInt(e.target.value));
                fetchPage(1, parseInt(e.target.value));
              }}
              className="filter-select"
            >
              <option value={5}>5 per page</option>
              <option value={10}>10 per page</option>
              <option value={25}>25 per page</option>
              <option value={50}>50 per page</option>
            </select>
          </div>

          <div className="filter-actions">
            <button
              onClick={() => fetchPage(1)}
              className="apply-filters-btn"
              disabled={loading}
            >
              <i className="fas fa-search"></i>
              Apply Filters
            </button>
          </div>
        </div>
      </div>

      {error ? (
        <div className="error-container">
          <div className="error-content">
            <i className="fas fa-exclamation-triangle error-icon"></i>
            <h3>Failed to Load Service Requests</h3>
            <p>{error}</p>
            <button
              onClick={() => fetchPage(1)}
              className="retry-btn"
              disabled={loading}
            >
              <i className="fas fa-redo"></i>
              Try Again
            </button>
          </div>
        </div>
      ) : loading ? (
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading service requests...</p>
        </div>
      ) : (
        <>
          <div className="content-card">
            <div className="card-header">
              <h2>
                <i className="fas fa-clipboard-list"></i>
                Service Requests ({total})
              </h2>
              <div className="card-stats">
                <span className="stat-item">
                  <i className="fas fa-clock"></i>
                  {requests.filter(r => r.status?.toLowerCase() === 'pending' || r.status?.toLowerCase() === 'available').length} Pending
                </span>
                <span className="stat-item">
                  <i className="fas fa-check-circle"></i>
                  {requests.filter(r => r.status?.toLowerCase() === 'accepted' || r.status?.toLowerCase() === 'working').length} Accepted
                </span>
                <span className="stat-item">
                  <i className="fas fa-check-double"></i>
                  {requests.filter(r => r.status?.toLowerCase() === 'complete').length} Complete
                </span>
              </div>
            </div>

            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>
                      <i className="fas fa-user"></i>
                      Customer
                    </th>
                    <th>
                      <i className="fas fa-wrench"></i>
                      Service Type
                    </th>
                    <th>
                      <i className="fas fa-file-alt"></i>
                      Description
                    </th>
                    <th>
                      <i className="fas fa-info-circle"></i>
                      Status
                    </th>
                    <th>
                      <i className="fas fa-calendar"></i>
                      Created
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {requests.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="no-data">
                        <div className="empty-state">
                          <i className="fas fa-inbox"></i>
                          <h3>No service requests found</h3>
                          <p>Try adjusting your filters or check back later for new requests.</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    requests.map(r => (
                      <tr key={r._id} className="request-row">
                        <td>
                          <div className="user-info">
                            <div className="user-name">
                              {r.requester?.firstName && r.requester?.lastName
                                ? `${r.requester.firstName} ${r.requester.lastName}`
                                : r.requester?.username || r.requester?.email || 'Anonymous User'
                              }
                            </div>
                            <div className="user-id">ID: {r._id.slice(-6)}</div>
                          </div>
                        </td>
                        <td>
                          <div className="service-type">
                            <span className="service-badge">{r.typeOfWork || r.name || 'Service'}</span>
                          </div>
                        </td>
                        <td>
                          <div className="description-cell">
                            <p className="description-text">
                              {r.notes && r.notes.length > 100
                                ? `${r.notes.substring(0, 100)}...`
                                : r.notes || 'No description provided'
                              }
                            </p>
                            {r.status?.toLowerCase() === 'cancelled' && r.cancellationReason && (
                              <p className="cancellation-reason">
                                <strong>Cancellation Reason:</strong> {r.cancellationReason}
                              </p>
                            )}
                          </div>
                        </td>
                        <td>
                          <span className={`status-badge ${(r.status || '').toLowerCase()}`}>
                            <i className={`fas ${
                              r.status?.toLowerCase() === 'available' || r.status?.toLowerCase() === 'pending' ? 'fa-clock' :
                              r.status?.toLowerCase() === 'working' || r.status?.toLowerCase() === 'accepted' ? 'fa-play-circle' :
                              r.status?.toLowerCase() === 'complete' ? 'fa-check-double' :
                              r.status?.toLowerCase() === 'cancelled' ? 'fa-times-circle' : 'fa-question-circle'
                            }`}></i>
                            {r.status || 'Unknown'}
                          </span>
                        </td>
                        <td>
                          <div className="date-info">
                            <div className="date-main">{new Date(r.createdAt).toLocaleDateString()}</div>
                            <div className="date-time">{new Date(r.createdAt).toLocaleTimeString()}</div>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="pagination-section">
            <div className="pagination-info">
              <div className="total-info">
                <i className="fas fa-database"></i>
                <span>Showing {requests.length} of {total} service requests</span>
              </div>
              <div className="page-info">
                <span>Page {page} of {totalPages}</span>
              </div>
            </div>

            <div className="pagination-controls">
              <button
                className="pagination-btn prev-btn"
                disabled={page <= 1 || loading}
                onClick={() => fetchPage(page - 1)}
              >
                <i className="fas fa-chevron-left"></i>
                Previous
              </button>

              <div className="page-jumper">
                <label className="jump-label">Go to page:</label>
                <input
                  type="number"
                  min={1}
                  max={totalPages}
                  placeholder={page}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      const v = parseInt(e.target.value);
                      if (v >= 1 && v <= totalPages) fetchPage(v);
                      e.target.value = '';
                    }
                  }}
                  className="page-input"
                  disabled={loading}
                />
                <span className="page-total">of {totalPages}</span>
              </div>

              <button
                className="pagination-btn next-btn"
                disabled={page >= totalPages || loading}
                onClick={() => fetchPage(page + 1)}
              >
                Next
                <i className="fas fa-chevron-right"></i>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default ReviewServiceRequest;
