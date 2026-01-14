import { useEffect, useState } from 'react';
import api from '../../api';

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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-200">
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Service Requests Logs</h1>
            <p className="text-slate-600 mt-1">Review and manage all service requests from the platform</p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                <i className="fas fa-tools"></i>
                Filter by Skill
              </label>
              <input
                type="text"
                placeholder="Enter skill name..."
                value={skillFilter}
                onChange={e => setSkillFilter(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                <i className="fas fa-filter"></i>
                Status Filter
              </label>
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Status</option>
                <option value="pending">Pending</option>
                <option value="accepted">Accepted</option>
                <option value="complete">Complete</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                <i className="fas fa-list"></i>
                Items per Page
              </label>
              <select
                value={limit}
                onChange={e => {
                  setLimit(parseInt(e.target.value));
                  fetchPage(1, parseInt(e.target.value));
                }}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value={5}>5 per page</option>
                <option value={10}>10 per page</option>
                <option value={25}>25 per page</option>
                <option value={50}>50 per page</option>
              </select>
            </div>

            <div className="space-y-2 flex items-end">
              <button
                onClick={() => fetchPage(1)}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                disabled={loading}
              >
                <i className="fas fa-search"></i>
                Apply Filters
              </button>
            </div>
          </div>
        </div>

        {error ? (
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-8 text-center">
            <div className="max-w-md mx-auto">
              <i className="fas fa-exclamation-triangle text-6xl text-amber-500 mb-4"></i>
              <h3 className="text-xl font-semibold text-slate-900 mb-2">Failed to Load Service Requests</h3>
              <p className="text-slate-600 mb-6">{error}</p>
              <button
                onClick={() => fetchPage(1)}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2 mx-auto"
                disabled={loading}
              >
                <i className="fas fa-redo"></i>
                Try Again
              </button>
            </div>
          </div>
        ) : loading ? (
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-8 text-center">
            <div className="w-16 h-16 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-slate-600">Loading service requests...</p>
          </div>
        ) : (
        <>
          <div className="bg-white rounded-lg shadow-sm border border-slate-200">
            <div className="p-6 border-b border-slate-200">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <h2 className="text-xl font-semibold text-slate-900 flex items-center gap-2">
                  <i className="fas fa-clipboard-list"></i>
                  Service Requests ({total})
                </h2>
                <div className="flex gap-4">
                  <span className="flex items-center gap-2 px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-sm">
                    <i className="fas fa-clock"></i>
                    {requests.filter(r => r.status?.toLowerCase() === 'pending' || r.status?.toLowerCase() === 'available').length} Pending
                  </span>
                  <span className="flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                    <i className="fas fa-check-circle"></i>
                    {requests.filter(r => r.status?.toLowerCase() === 'accepted' || r.status?.toLowerCase() === 'working').length} Accepted
                  </span>
                  <span className="flex items-center gap-2 px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">
                    <i className="fas fa-check-double"></i>
                    {requests.filter(r => r.status?.toLowerCase() === 'complete').length} Complete
                  </span>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      <i className="fas fa-user mr-2"></i>
                      Customer
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      <i className="fas fa-wrench mr-2"></i>
                      Service Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      <i className="fas fa-file-alt mr-2"></i>
                      Description
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      <i className="fas fa-info-circle mr-2"></i>
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      <i className="fas fa-calendar mr-2"></i>
                      Created
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-200">
                  {requests.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="px-6 py-12 text-center text-slate-500">
                        <div className="flex flex-col items-center">
                          <i className="fas fa-inbox text-4xl text-slate-300 mb-4"></i>
                          <h3 className="text-lg font-medium text-slate-900 mb-2">No service requests found</h3>
                          <p className="text-slate-600">Try adjusting your filters or check back later for new requests.</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    requests.map(r => (
                      <tr key={r._id} className="hover:bg-slate-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex flex-col">
                            <div className="text-sm font-medium text-slate-900">
                              {r.requester?.firstName && r.requester?.lastName
                                ? `${r.requester.firstName} ${r.requester.lastName}`
                                : r.requester?.username || r.requester?.email || 'Anonymous User'
                              }
                            </div>
                            <div className="text-xs text-slate-500">ID: {r._id.slice(-6)}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800">
                            {r.typeOfWork || r.name || 'Service'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-slate-900 max-w-xs">
                            <p className="truncate">
                              {r.notes && r.notes.length > 100
                                ? `${r.notes.substring(0, 100)}...`
                                : r.notes || 'No description provided'
                              }
                            </p>
                            {r.status?.toLowerCase() === 'cancelled' && r.cancellationReason && (
                              <p className="text-xs text-red-600 mt-1">
                                <strong>Cancellation Reason:</strong> {r.cancellationReason}
                              </p>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            r.status?.toLowerCase() === 'available' || r.status?.toLowerCase() === 'pending' ? 'bg-amber-100 text-amber-800' :
                            r.status?.toLowerCase() === 'working' || r.status?.toLowerCase() === 'accepted' ? 'bg-blue-100 text-blue-800' :
                            r.status?.toLowerCase() === 'complete' ? 'bg-green-100 text-green-800' :
                            r.status?.toLowerCase() === 'cancelled' ? 'bg-red-100 text-red-800' : 'bg-slate-100 text-slate-800'
                          }`}>
                            <i className={`fas ${
                              r.status?.toLowerCase() === 'available' || r.status?.toLowerCase() === 'pending' ? 'fa-clock' :
                              r.status?.toLowerCase() === 'working' || r.status?.toLowerCase() === 'accepted' ? 'fa-play-circle' :
                              r.status?.toLowerCase() === 'complete' ? 'fa-check-double' :
                              r.status?.toLowerCase() === 'cancelled' ? 'fa-times-circle' : 'fa-question-circle'
                            }`}></i>
                            {r.status || 'Unknown'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                          <div className="flex flex-col">
                            <div>{new Date(r.createdAt).toLocaleDateString()}</div>
                            <div className="text-xs text-slate-500">{new Date(r.createdAt).toLocaleTimeString()}</div>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-slate-200 mt-6">
            <div className="px-6 py-4 border-b border-slate-200">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <i className="fas fa-database"></i>
                    <span>Showing {requests.length} of {total} service requests</span>
                  </div>
                  <div className="text-sm text-slate-600">
                    Page {page} of {totalPages}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                    disabled={page <= 1 || loading}
                    onClick={() => fetchPage(page - 1)}
                  >
                    <i className="fas fa-chevron-left"></i>
                    Previous
                  </button>

                  <div className="flex items-center gap-2">
                    <label className="text-sm text-slate-600">Go to page:</label>
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
                      className="w-16 px-2 py-1 text-sm border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      disabled={loading}
                    />
                    <span className="text-sm text-slate-600">of {totalPages}</span>
                  </div>

                  <button
                    className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                    disabled={page >= totalPages || loading}
                    onClick={() => fetchPage(page + 1)}
                  >
                    Next
                    <i className="fas fa-chevron-right"></i>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
        )}
      </div>
    </div>
  )
}

export default ReviewServiceRequest;
