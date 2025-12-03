import { useEffect, useState } from "react";
import api from "../../api.js";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
// Extract base URL without /api/v1 for static file serving
const BASE_URL = API_BASE_URL.replace('/api/v1', '');

const SERVICE_OPTIONS = [
  { name: "Plumbing", description: "Pipe installation, leak repair, and bathroom plumbing maintenance.", icon: "💧" },
  { name: "Electrical", description: "Wiring, lighting, and electrical appliance repair.", icon: "⚡" },
  { name: "Cleaning", description: "House cleaning, deep cleaning, and carpet or sofa cleaning.", icon: "🧹" },
  { name: "Carpentry", description: "Furniture repair, assembly, and custom woodwork.", icon: "🔨" },
  { name: "Painting", description: "Interior and exterior wall painting, color consultation.", icon: "🎨" },
  { name: "Appliance Repair", description: "Aircon, refrigerator, and washing machine maintenance.", icon: "🔧" },
  { name: "Home Renovation", description: "Tile, flooring, roofing, and home improvement.", icon: "🏗️" },
  { name: "Pest Control", description: "Termite, rodent, and insect control for safer homes.", icon: "🐛" },
  { name: "Gardening & Landscaping", description: "Lawn care, plant maintenance, and landscape design.", icon: "🌿" },
  { name: "Air Conditioning & Ventilation", description: "Aircon installation, cleaning, and HVAC servicing.", icon: "❄️" }
];

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("users");
  const [actionLoading, setActionLoading] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [modalSource, setModalSource] = useState("");
  const [newRegisteredUsers, setNewRegisteredUsers] = useState([]);
  const [roleFilter, setRoleFilter] = useState('all');
  const [currentPageUsers, setCurrentPageUsers] = useState(1);
  const [currentPageNewUsers, setCurrentPageNewUsers] = useState(1);
  const [isEditingServices, setIsEditingServices] = useState(false);
  const [newService, setNewService] = useState({ name: '', rate: '', description: '' });
  const [editingServices, setEditingServices] = useState([]);
  const itemsPerPage = 10;

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError("");

      const usersRes = await api.get("/admin/users");
      const usersData = Array.isArray(usersRes.data.users) ? usersRes.data.users : [];

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const newUsersData = usersData.filter(user => new Date(user.createdAt) >= thirtyDaysAgo && !user.verified);

      setUsers(usersData);
      setNewRegisteredUsers(newUsersData);
    } catch (err) {
      console.error("Failed to fetch data:", err);
      setError(`Failed to fetch data: ${err.response?.data?.message || err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const verifyUser = async (userId) => {
    try {
      const result = await api.put(`/admin/user/verify/${userId}`);
      if (result.data.success) {
        alert("User verified successfully");
        fetchData();
        return true;
      }
    } catch (err) {
      console.error("Error verifying user:", err);
      alert(`Error verifying user: ${err.response?.data?.message || err.message}`);
    }
    return false;
  };

  const banUser = async (userId) => {
    if (!window.confirm("Are you sure you want to ban this user?")) return;

    try {
      const result = await api.delete(`/admin/user/${userId}`);
      if (result.data.success) {
        alert("User banned successfully");
        fetchData();
        return true;
      }
    } catch (err) {
      console.error("Error banning user:", err);
      alert(`Error banning user: ${err.response?.data?.message || err.message}`);
    }
    return false;
  };

  const updateUserServices = async (userId, services) => {
    try {
      const result = await api.put(`/admin/user/service-profile/${userId}`, { services });
      if (result.data.success) {
        alert("Services updated successfully");
        fetchData();
        return true;
      }
    } catch (err) {
      console.error("Error updating services:", err);
      alert(`Error updating services: ${err.response?.data?.message || err.message}`);
    }
    return false;
  };

  const startEditingServices = (user) => {
    setIsEditingServices(true);
    setEditingServices(user.services || []);
    setNewService({ name: '', rate: '', description: '' });
  };

  const cancelEditingServices = () => {
    setIsEditingServices(false);
    setEditingServices([]);
    setNewService({ name: '', rate: '', description: '' });
  };

  const addService = () => {
    if (!newService.name.trim()) {
      alert("Service name is required");
      return;
    }
    if (!newService.rate || isNaN(newService.rate) || newService.rate < 0) {
      alert("Valid rate is required");
      return;
    }

    const serviceToAdd = {
      name: newService.name.trim(),
      rate: parseFloat(newService.rate),
      description: newService.description.trim() || ''
    };

    setEditingServices([...editingServices, serviceToAdd]);
    setNewService({ name: '', rate: '', description: '' });
  };

  const removeService = (index) => {
    const updatedServices = editingServices.filter((_, i) => i !== index);
    setEditingServices(updatedServices);
  };

  const saveServices = async () => {
    if (!selectedUser) return;

    setActionLoading('save-services');
    const success = await updateUserServices(selectedUser._id, editingServices);
    setActionLoading(null);

    if (success) {
      setIsEditingServices(false);
      setEditingServices([]);
    }
  };

  const getProfileImageUrl = (profilePic) => {
    if (profilePic) {
      return profilePic.startsWith('http') ? profilePic : `${BASE_URL}${profilePic}`;
    }
    return '/default-avatar.png';
  };



  if (loading) {
    return (
      <div className="user-management-loading">
        <div className="loading-spinner-container">
          <div className="loading-spinner"></div>
          <p className="loading-text">Loading user data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="user-management-error">
        <div className="error-container">
          <div className="error-icon">⚠️</div>
          <h2>Error</h2>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  const filteredUsers = users.filter(user => user.verified && (roleFilter === 'all' || user.role === roleFilter));
  const totalPagesUsers = Math.ceil(filteredUsers.length / itemsPerPage);
  const startIndexUsers = (currentPageUsers - 1) * itemsPerPage;
  const currentUsers = filteredUsers.slice(startIndexUsers, startIndexUsers + itemsPerPage);

  const totalPagesNewUsers = Math.ceil(newRegisteredUsers.length / itemsPerPage);
  const startIndexNewUsers = (currentPageNewUsers - 1) * itemsPerPage;
  const currentNewUsers = newRegisteredUsers.slice(startIndexNewUsers, startIndexNewUsers + itemsPerPage);

  return (
    <div className="user-management-wrapper">
      <style>{`
        .user-management-wrapper {
          min-height: 100vh;
          background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
        }

        .user-management-loading,
        .user-management-error {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
        }

        .loading-spinner-container {
          text-align: center;
        }

        .loading-spinner {
          width: 64px;
          height: 64px;
          border: 4px solid #e2e8f0;
          border-top-color: #2563eb;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin: 0 auto 1rem;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .loading-text {
          color: #64748b;
          font-weight: 500;
        }

        .error-container {
          text-align: center;
          background: white;
          padding: 3rem;
          border-radius: 1rem;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
        }

        .error-icon {
          font-size: 4rem;
          margin-bottom: 1rem;
        }

        .error-container h2 {
          color: #1e293b;
          font-size: 1.5rem;
          margin-bottom: 0.5rem;
        }

        .error-container p {
          color: #64748b;
        }

        .um-header {
          background: white;
          border-bottom: 1px solid #e2e8f0;
          position: sticky;
          top: 0;
          z-index: 10;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
        }

        .um-header-content {
          max-width: 1280px;
          margin: 0 auto;
          padding: 1.5rem 2rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .um-header-title h1 {
          font-size: 1.875rem;
          font-weight: 700;
          color: #1e293b;
          margin: 0 0 0.25rem 0;
        }

        .um-header-subtitle {
          color: #64748b;
          margin: 0;
        }

        .um-stats-card {
          background: #eff6ff;
          padding: 1rem 1.5rem;
          border-radius: 0.75rem;
        }

        .um-stats-label {
          font-size: 0.875rem;
          color: #64748b;
          display: block;
          margin-bottom: 0.25rem;
        }

        .um-stats-value {
          font-size: 2rem;
          font-weight: 700;
          color: #2563eb;
          display: block;
        }

        .um-container {
          max-width: 1280px;
          margin: 0 auto;
          padding: 2rem;
        }

        .um-tabs {
          display: flex;
          gap: 0.5rem;
          margin-bottom: 1.5rem;
          background: white;
          padding: 0.5rem;
          border-radius: 1rem;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
          border: 1px solid #e2e8f0;
        }

        .um-tab-btn {
          flex: 1;
          padding: 0.875rem 1.5rem;
          border-radius: 0.75rem;
          font-weight: 500;
          border: none;
          background: transparent;
          color: #64748b;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
        }

        .um-tab-btn:hover {
          background: #f8fafc;
        }

        .um-tab-btn.active {
          background: #2563eb;
          color: white;
          box-shadow: 0 4px 6px rgba(37, 99, 235, 0.2);
        }

        .um-tab-badge {
          padding: 0.25rem 0.5rem;
          border-radius: 9999px;
          font-size: 0.75rem;
        }

        .um-tab-btn.active .um-tab-badge {
          background: #1e40af;
        }

        .um-tab-btn:not(.active) .um-tab-badge {
          background: #e2e8f0;
          color: #475569;
        }

        .um-card {
          background: white;
          border-radius: 1rem;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
          border: 1px solid #e2e8f0;
          overflow: hidden;
        }

        .um-card-header {
          padding: 1.5rem;
          border-bottom: 1px solid #e2e8f0;
          background: #f8fafc;
        }

        .um-card-header-content {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .um-card-title {
          font-size: 1.25rem;
          font-weight: 600;
          color: #1e293b;
          margin: 0;
        }

        .um-filter-section {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .um-filter-label {
          font-size: 0.875rem;
          color: #64748b;
          font-weight: 500;
        }

        .um-filter-select {
          padding: 0.5rem 1rem;
          background: white;
          border: 1px solid #cbd5e1;
          border-radius: 0.5rem;
          font-size: 0.875rem;
          color: #1e293b;
          cursor: pointer;
        }

        .um-filter-select:focus {
          outline: none;
          border-color: #2563eb;
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
        }

        .um-card-body {
          padding: 1.5rem;
        }

        .um-users-grid {
          display: grid;
          gap: 1rem;
        }

        .um-user-card {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1.25rem;
          background: #f8fafc;
          border-radius: 1rem;
          border: 1px solid #e2e8f0;
          transition: all 0.2s;
        }

        .um-user-card:hover {
          background: #f1f5f9;
          transform: translateY(-2px);
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
        }

        .um-user-card.pending {
          background: #fffbeb;
          border-color: #fcd34d;
        }

        .um-user-card.pending:hover {
          background: #fef3c7;
        }

        .um-user-info {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .um-avatar-wrapper {
          position: relative;
        }

        .um-avatar {
          width: 64px;
          height: 64px;
          border-radius: 50%;
          object-fit: cover;
          border: 2px solid white;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        .um-online-indicator {
          position: absolute;
          bottom: 0;
          right: 0;
          width: 16px;
          height: 16px;
          background: #22c55e;
          border: 2px solid white;
          border-radius: 50%;
        }

        .um-user-details h3 {
          font-size: 1.125rem;
          font-weight: 600;
          color: #1e293b;
          margin: 0 0 0.25rem 0;
        }

        .um-user-email {
          color: #64748b;
          font-size: 0.875rem;
          margin: 0 0 0.5rem 0;
        }

        .um-user-badges {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          flex-wrap: wrap;
        }

        .um-badge {
          padding: 0.25rem 0.75rem;
          border-radius: 9999px;
          font-size: 0.75rem;
          font-weight: 500;
        }

        .um-badge.provider {
          background: #f3e8ff;
          color: #7c3aed;
        }

        .um-badge.resident {
          background: #dbeafe;
          color: #2563eb;
        }

        .um-badge.verified {
          background: #dcfce7;
          color: #16a34a;
        }

        .um-badge.pending {
          background: #fef3c7;
          color: #d97706;
        }

        .um-view-btn {
          padding: 0.625rem 1.5rem;
          background: #2563eb;
          color: white;
          border: none;
          border-radius: 0.5rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          box-shadow: 0 2px 4px rgba(37, 99, 235, 0.2);
        }

        .um-view-btn:hover {
          background: #1d4ed8;
          transform: translateY(-1px);
          box-shadow: 0 4px 6px rgba(37, 99, 235, 0.3);
        }

        .um-view-btn.review {
          background: #d97706;
        }

        .um-view-btn.review:hover {
          background: #b45309;
        }

        .um-empty-state {
          text-align: center;
          padding: 4rem 2rem;
        }

        .um-empty-icon {
          font-size: 4rem;
          margin-bottom: 1rem;
        }

        .um-empty-text {
          color: #64748b;
          font-size: 1.125rem;
        }

        .um-pagination {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-top: 1.5rem;
          padding-top: 1.5rem;
          border-top: 1px solid #e2e8f0;
        }

        .um-pagination-btn {
          padding: 0.5rem 1rem;
          background: white;
          border: 1px solid #cbd5e1;
          border-radius: 0.5rem;
          font-weight: 500;
          color: #475569;
          cursor: pointer;
          transition: all 0.2s;
        }

        .um-pagination-btn:hover:not(:disabled) {
          background: #f8fafc;
        }

        .um-pagination-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .um-pagination-info {
          color: #64748b;
        }

        .um-modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.5);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 50;
          padding: 1rem;
        }

        .um-modal {
          background: white;
          border-radius: 1.5rem;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
          max-width: 64rem;
          width: 100%;
          max-height: 90vh;
          overflow-y: auto;
        }

        .um-modal-header {
          position: sticky;
          top: 0;
          background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
          color: white;
          padding: 1.5rem;
          border-radius: 1.5rem 1.5rem 0 0;
          z-index: 10;
        }

        .um-modal-header-content {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
        }

        .um-modal-profile {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .um-modal-avatar {
          width: 80px;
          height: 80px;
          border-radius: 50%;
          object-fit: cover;
          border: 4px solid white;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }

        .um-modal-name {
          font-size: 1.5rem;
          font-weight: 700;
          margin: 0 0 0.25rem 0;
        }

        .um-modal-email {
          color: #bfdbfe;
          margin: 0 0 0.5rem 0;
        }

        .um-modal-close {
          background: rgba(255, 255, 255, 0.2);
          border: none;
          color: white;
          width: 40px;
          height: 40px;
          border-radius: 0.5rem;
          font-size: 1.5rem;
          cursor: pointer;
          transition: all 0.2s;
        }

        .um-modal-close:hover {
          background: rgba(255, 255, 255, 0.3);
        }

        .um-modal-body {
          padding: 1.5rem;
        }

        .um-detail-section {
          background: #f8fafc;
          border-radius: 1rem;
          padding: 1.25rem;
          border: 1px solid #e2e8f0;
          margin-bottom: 1.5rem;
        }

        .um-detail-section:last-child {
          margin-bottom: 0;
        }

        .um-detail-section h3 {
          font-size: 1.125rem;
          font-weight: 600;
          color: #1e293b;
          margin: 0 0 1rem 0;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .um-detail-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 1rem;
        }

        .um-detail-item label {
          display: block;
          font-size: 0.875rem;
          color: #64748b;
          font-weight: 500;
          margin-bottom: 0.25rem;
        }

        .um-detail-item p {
          color: #1e293b;
          margin: 0;
          word-break: break-word;
        }

        .um-detail-item.full-width {
          grid-column: 1 / -1;
        }

        .um-skills-grid {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
        }

        .um-skill-tag {
          padding: 0.5rem 1rem;
          background: #dbeafe;
          color: #1e40af;
          border-radius: 9999px;
          font-size: 0.875rem;
          font-weight: 500;
        }

        .um-services-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
          gap: 1rem;
        }

        .um-service-item {
          background: white;
          padding: 1rem;
          border-radius: 0.75rem;
          border: 1px solid #e2e8f0;
        }

        .um-service-item h4 {
          color: #1e293b;
          font-size: 1rem;
          font-weight: 600;
          margin: 0 0 0.5rem 0;
        }

        .um-service-rate {
          color: #2563eb;
          font-size: 1.25rem;
          font-weight: 700;
          margin-bottom: 0.5rem;
        }

        .um-service-description {
          color: #64748b;
          font-size: 0.875rem;
          margin: 0;
        }

        .um-documents-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 1rem;
        }

        .um-document-item {
          background: white;
          padding: 1rem;
          border-radius: 0.75rem;
          border: 1px solid #e2e8f0;
        }

        .um-document-info {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 0.75rem;
          color: #64748b;
          font-size: 0.875rem;
        }

        .um-document-preview img {
          width: 100%;
          height: 150px;
          object-fit: cover;
          border-radius: 0.5rem;
          cursor: pointer;
          transition: all 0.2s;
        }

        .um-document-preview img:hover {
          transform: scale(1.05);
        }

        .um-modal-actions {
          padding: 1.5rem;
          border-top: 1px solid #e2e8f0;
          background: #f8fafc;
        }

        .um-actions-section {
          margin-bottom: 1.5rem;
        }

        .um-actions-section:last-child {
          margin-bottom: 0;
        }

        .um-actions-header h4 {
          font-size: 1rem;
          font-weight: 600;
          color: #1e293b;
          margin: 0 0 0.25rem 0;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .um-actions-subtitle {
          color: #64748b;
          font-size: 0.875rem;
          margin: 0 0 1rem 0;
        }

        .um-action-buttons {
          display: flex;
          gap: 0.75rem;
          flex-wrap: wrap;
        }

        .um-action-btn {
          padding: 0.75rem 1.5rem;
          border: none;
          border-radius: 0.5rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .um-action-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .um-action-btn.verify {
          background: #22c55e;
          color: white;
        }

        .um-action-btn.verify:hover:not(:disabled) {
          background: #16a34a;
        }

        .um-action-btn.edit {
          background: #3b82f6;
          color: white;
        }

        .um-action-btn.edit:hover:not(:disabled) {
          background: #2563eb;
        }

        .um-action-btn.ban {
          background: #ef4444;
          color: white;
        }

        .um-action-btn.ban:hover:not(:disabled) {
          background: #dc2626;
        }

        .um-action-btn.close {
          background: #64748b;
          color: white;
        }

        .um-action-btn.close:hover:not(:disabled) {
          background: #475569;
        }

        @media (max-width: 768px) {
          .um-header-content {
            flex-direction: column;
            gap: 1rem;
          }

          .um-detail-grid {
            grid-template-columns: 1fr;
          }

          .um-action-buttons {
            flex-direction: column;
          }

          .um-action-btn {
            width: 100%;
            justify-content: center;
          }
        }
      `}</style>

      {/* Header */}
      <div className="um-header">
        <div className="um-header-content">
          <div className="um-header-title">
            <h1>User Management</h1>
            <p className="um-header-subtitle">Manage and oversee all platform users</p>
          </div>
          <div className="um-stats-card">
            <span className="um-stats-label">Total Users</span>
            <span className="um-stats-value">{users.length}</span>
          </div>
        </div>
      </div>

      <div className="um-container">
        {/* Tab Navigation */}
        <div className="um-tabs">
          <button
            onClick={() => setTab("users")}
            className={`um-tab-btn ${tab === "users" ? "active" : ""}`}
          >
            ✓ Verified Users
            <span className="um-tab-badge">
              {users.filter(u => u.verified).length}
            </span>
          </button>
          <button
            onClick={() => setTab("new-users")}
            className={`um-tab-btn ${tab === "new-users" ? "active" : ""}`}
          >
            ⏰ New Registrations
            <span className="um-tab-badge">
              {newRegisteredUsers.length}
            </span>
          </button>
        </div>

        {/* Verified Users Tab */}
        {tab === "users" && (
          <div className="um-card">
            <div className="um-card-header">
              <div className="um-card-header-content">
                <h2 className="um-card-title">All Verified Users</h2>
                <div className="um-filter-section">
                  <label className="um-filter-label">Filter by Role:</label>
                  <select
                    value={roleFilter}
                    onChange={(e) => {
                      setRoleFilter(e.target.value);
                      setCurrentPageUsers(1);
                    }}
                    className="um-filter-select"
                  >
                    <option value="all">All Roles</option>
                    <option value="Service Provider">Service Provider</option>
                    <option value="Community Member">Community Member</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="um-card-body">
              {currentUsers.length === 0 ? (
                <div className="um-empty-state">
                  <div className="um-empty-icon">👥</div>
                  <p className="um-empty-text">No verified users found</p>
                </div>
              ) : (
                <div className="um-users-grid">
                  {currentUsers.map((user) => (
                    <div key={user._id} className="um-user-card">
                      <div className="um-user-info">
                        <div className="um-avatar-wrapper">
                          <img
                            src={getProfileImageUrl(user.profilePic)}
                            alt={user.firstName}
                            className="um-avatar"
                          />
                          {user.isOnline && <div className="um-online-indicator"></div>}
                        </div>
                        <div className="um-user-details">
                          <h3>{user.firstName} {user.lastName}</h3>
                          <p className="um-user-email">{user.email}</p>
                          <div className="um-user-badges">
                            <span className={`um-badge ${user.role === 'Service Provider' ? 'provider' : 'resident'}`}>
                              {user.role === 'Community Member' ? 'Resident' : user.role}
                            </span>
                            <span className="um-badge verified">✓ Verified</span>
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          setSelectedUser(user);
                          setModalSource("users");
                          setShowUserModal(true);
                        }}
                        className="um-view-btn"
                      >
                        View Details
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {totalPagesUsers > 1 && (
                <div className="um-pagination">
                  <button
                    disabled={currentPageUsers === 1}
                    onClick={() => setCurrentPageUsers(prev => prev - 1)}
                    className="um-pagination-btn"
                  >
                    ← Previous
                  </button>
                  <span className="um-pagination-info">
                    Page {currentPageUsers} of {totalPagesUsers}
                  </span>
                  <button
                    disabled={currentPageUsers === totalPagesUsers}
                    onClick={() => setCurrentPageUsers(prev => prev + 1)}
                    className="um-pagination-btn"
                  >
                    Next →
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* New Users Tab */}
        {tab === "new-users" && (
          <div className="um-card">
            <div className="um-card-header">
              <h2 className="um-card-title">Pending Verifications</h2>
            </div>

            <div className="um-card-body">
              {currentNewUsers.length === 0 ? (
                <div className="um-empty-state">
                  <div className="um-empty-icon">✨</div>
                  <p className="um-empty-text">No pending registrations</p>
                </div>
              ) : (
                <div className="um-users-grid">
                  {currentNewUsers.map((user) => (
                    <div key={user._id} className="um-user-card pending">
                      <div className="um-user-info">
                        <div className="um-avatar-wrapper">
                          <img
                            src={getProfileImageUrl(user.profilePic)}
                            alt={user.firstName}
                            className="um-avatar"
                          />
                        </div>
                        <div className="um-user-details">
                          <h3>{user.firstName} {user.lastName}</h3>
                          <p className="um-user-email">{user.email}</p>
                          <div className="um-user-badges">
                            <span className={`um-badge ${user.role === 'Service Provider' ? 'provider' : 'resident'}`}>
                              {user.role}
                            </span>
                            <span className="um-badge pending">
                              ⏰ {Math.floor((new Date() - new Date(user.createdAt)) / (1000 * 60 * 60 * 24))} days ago
                            </span>
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          setSelectedUser(user);
                          setModalSource("new-users");
                          setShowUserModal(true);
                        }}
                        className="um-view-btn review"
                      >
                        Review
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {totalPagesNewUsers > 1 && (
                <div className="um-pagination">
                  <button
                    disabled={currentPageNewUsers === 1}
                    onClick={() => setCurrentPageNewUsers(prev => prev - 1)}
                    className="um-pagination-btn"
                  >
                    ← Previous
                  </button>
                  <span className="um-pagination-info">
                    Page {currentPageNewUsers} of {totalPagesNewUsers}
                  </span>
                  <button
                    disabled={currentPageNewUsers === totalPagesNewUsers}
                    onClick={() => setCurrentPageNewUsers(prev => prev + 1)}
                    className="um-pagination-btn"
                  >
                    Next →
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* User Details Modal */}
      {showUserModal && selectedUser && (
        <div className="um-modal-overlay" onClick={() => setShowUserModal(false)}>
          <div className="um-modal" onClick={(e) => e.stopPropagation()}>
            <div className="um-modal-header">
              <div className="um-modal-header-content">
                <div className="um-modal-profile">
                  <img
                    src={getProfileImageUrl(selectedUser.profilePic)}
                    alt={selectedUser.firstName}
                    className="um-modal-avatar"
                  />
                  <div>
                    <h2 className="um-modal-name">{selectedUser.firstName} {selectedUser.lastName}</h2>
                    <p className="um-modal-email">{selectedUser.email}</p>
                    <div className="um-user-badges">
                      <span className="um-badge verified">{selectedUser.verified ? '✓ Verified' : '⏰ Pending'}</span>
                      {selectedUser.isOnline && <span className="um-badge verified">🟢 Online</span>}
                    </div>
                  </div>
                </div>
                <button onClick={() => setShowUserModal(false)} className="um-modal-close">×</button>
              </div>
            </div>

            <div className="um-modal-body">
              <div className="um-detail-section">
                <h3>👤 Account Information</h3>
                <div className="um-detail-grid">
                  <div className="um-detail-item">
                    <label>Username</label>
                    <p>{selectedUser.username}</p>
                  </div>
                  <div className="um-detail-item">
                    <label>Phone</label>
                    <p>{selectedUser.phone || 'Not provided'}</p>
                  </div>
                  <div className="um-detail-item">
                    <label>Role</label>
                    <p>{selectedUser.role === 'Community Member' ? 'Community Resident' : selectedUser.role}</p>
                  </div>
                  <div className="um-detail-item">
                    <label>Member Since</label>
                    <p>{new Date(selectedUser.createdAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}</p>
                  </div>
                  {selectedUser.address && (
                    <div className="um-detail-item full-width">
                      <label>Address</label>
                      <p>{selectedUser.address}</p>
                    </div>
                  )}
                </div>
              </div>

              {selectedUser.skills && selectedUser.skills.length > 0 && (
                <div className="um-detail-section">
                  <h3>🔧 Skills & Expertise ({selectedUser.skills.length})</h3>
                  <div className="um-skills-grid">
                    {selectedUser.skills.map((skill, index) => (
                      <span key={index} className="um-skill-tag">{skill}</span>
                    ))}
                  </div>
                </div>
              )}

              {selectedUser.role === 'Service Provider' && (
                <div className="um-detail-section">
                  <h3>🛠️ Services Offered {selectedUser.services && selectedUser.services.length > 0 && `(${selectedUser.services.length})`}</h3>

                  {!isEditingServices ? (
                    <>
                      {selectedUser.services && selectedUser.services.length > 0 ? (
                        <div className="um-services-grid">
                          {selectedUser.services.map((service, index) => (
                            <div key={index} className="um-service-item">
                              <h4>{service.name}</h4>
                              <div className="um-service-rate">₱{service.rate.toLocaleString()}</div>
                              <p className="um-service-description">{service.description || 'No description available'}</p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="um-service-description" style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
                          No services configured yet
                        </p>
                      )}
                    </>
                  ) : (
                    <div style={{ background: 'white', padding: '1.5rem', borderRadius: '0.75rem', border: '1px solid #e2e8f0' }}>
                      <h4 style={{ margin: '0 0 1rem 0', color: '#1e293b', fontSize: '1rem', fontWeight: '600' }}>
                        Edit Services
                      </h4>

                      {/* Add New Service Form */}
                      <div style={{ marginBottom: '1.5rem', padding: '1rem', background: '#f8fafc', borderRadius: '0.5rem', border: '1px solid #e2e8f0' }}>
                        <h5 style={{ margin: '0 0 1rem 0', color: '#374151', fontSize: '0.875rem', fontWeight: '600' }}>
                          Add New Service
                        </h5>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '0.75rem', alignItems: 'end' }}>
                          <div>
                            <label style={{ display: 'block', fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>
                              Service Name *
                            </label>
                            <select
                              value={newService.name}
                              onChange={(e) => setNewService({ ...newService, name: e.target.value })}
                              style={{
                                width: '100%',
                                padding: '0.5rem',
                                border: '1px solid #d1d5db',
                                borderRadius: '0.375rem',
                                fontSize: '0.875rem'
                              }}
                            >
                              <option value="">Select a service</option>
                              <option value="Plumbing">Plumbing</option>
                              <option value="Electrical">Electrical</option>
                              <option value="Cleaning">Cleaning</option>
                              <option value="Carpentry">Carpentry</option>
                              <option value="Painting">Painting</option>
                              <option value="Appliance Repair">Appliance Repair</option>
                              <option value="Home Renovation">Home Renovation</option>
                              <option value="Pest Control">Pest Control</option>
                              <option value="Gardening & Landscaping">Gardening & Landscaping</option>
                              <option value="Air Conditioning & Ventilation">Air Conditioning & Ventilation</option>
                              <option value="Laundry / Labandera">Laundry / Labandera</option>
                            </select>
                          </div>
                          <div>
                            <label style={{ display: 'block', fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>
                              Rate (₱) *
                            </label>
                            <input
                              type="number"
                              value={newService.rate}
                              onChange={(e) => setNewService({ ...newService, rate: e.target.value })}
                              placeholder="0"
                              min="0"
                              step="0.01"
                              style={{
                                width: '100%',
                                padding: '0.5rem',
                                border: '1px solid #d1d5db',
                                borderRadius: '0.375rem',
                                fontSize: '0.875rem'
                              }}
                            />
                          </div>
                          <button
                            onClick={addService}
                            style={{
                              padding: '0.5rem 1rem',
                              background: '#22c55e',
                              color: 'white',
                              border: 'none',
                              borderRadius: '0.375rem',
                              fontSize: '0.875rem',
                              fontWeight: '500',
                              cursor: 'pointer'
                            }}
                          >
                            + Add
                          </button>
                        </div>
                        <div style={{ marginTop: '0.75rem' }}>
                          <label style={{ display: 'block', fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>
                            Description
                          </label>
                          <textarea
                            value={newService.description}
                            onChange={(e) => setNewService({ ...newService, description: e.target.value })}
                            placeholder="Brief description of the service"
                            rows="2"
                            style={{
                              width: '100%',
                              padding: '0.5rem',
                              border: '1px solid #d1d5db',
                              borderRadius: '0.375rem',
                              fontSize: '0.875rem',
                              resize: 'vertical'
                            }}
                          />
                        </div>
                      </div>

                      {/* Current Services */}
                      {editingServices.length > 0 && (
                        <div style={{ marginBottom: '1.5rem' }}>
                          <h5 style={{ margin: '0 0 1rem 0', color: '#374151', fontSize: '0.875rem', fontWeight: '600' }}>
                            Current Services ({editingServices.length})
                          </h5>
                          <div className="um-services-grid">
                            {editingServices.map((service, index) => (
                              <div key={index} className="um-service-item" style={{ position: 'relative' }}>
                                <button
                                  onClick={() => removeService(index)}
                                  style={{
                                    position: 'absolute',
                                    top: '0.5rem',
                                    right: '0.5rem',
                                    background: '#ef4444',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '50%',
                                    width: '24px',
                                    height: '24px',
                                    fontSize: '0.75rem',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                  }}
                                  title="Remove service"
                                >
                                  ×
                                </button>
                                <h4>{service.name}</h4>
                                <div className="um-service-rate">₱{service.rate.toLocaleString()}</div>
                                <p className="um-service-description">{service.description || 'No description available'}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Edit Action Buttons */}
                      <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                        <button
                          onClick={cancelEditingServices}
                          style={{
                            padding: '0.5rem 1rem',
                            background: '#6b7280',
                            color: 'white',
                            border: 'none',
                            borderRadius: '0.375rem',
                            fontSize: '0.875rem',
                            fontWeight: '500',
                            cursor: 'pointer'
                          }}
                        >
                          Cancel
                        </button>
                        <button
                          onClick={saveServices}
                          disabled={actionLoading === 'save-services'}
                          style={{
                            padding: '0.5rem 1rem',
                            background: '#2563eb',
                            color: 'white',
                            border: 'none',
                            borderRadius: '0.375rem',
                            fontSize: '0.875rem',
                            fontWeight: '500',
                            cursor: actionLoading === 'save-services' ? 'not-allowed' : 'pointer',
                            opacity: actionLoading === 'save-services' ? 0.5 : 1
                          }}
                        >
                          {actionLoading === 'save-services' ? 'Saving...' : 'Save Services'}
                        </button>
                      </div>
                    </div>
                  )}

                  {!isEditingServices && (
                    <div style={{ marginTop: '1rem', textAlign: 'center' }}>
                      <button
                        onClick={() => startEditingServices(selectedUser)}
                        className="um-action-btn edit"
                        style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}
                      >
                        ✏️ Edit Services
                      </button>
                    </div>
                  )}
                </div>
              )}

              {selectedUser.certificates && selectedUser.certificates.length > 0 && (
                <div className="um-detail-section">
                  <h3>📜 Certificates ({selectedUser.certificates.length})</h3>
                  <div className="um-documents-grid">
                    {selectedUser.certificates.map((cert, index) => (
                      <div key={index} className="um-document-item">
                        <div className="um-document-info">
                          📄 Certificate {index + 1}
                        </div>
                        <div className="um-document-preview">
                          {cert.match(/\.(jpg|jpeg|png|gif)$/i) && (
                            <img
                              src={cert}
                              alt={`Certificate ${index + 1}`}
                            />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedUser.validId && (
                <div className="um-detail-section">
                  <h3>🪪 Government ID</h3>
                  <div className="um-documents-grid">
                    <div className="um-document-item">
                      <div className="um-document-info">
                        🆔 Valid ID Document
                      </div>
                      <div className="um-document-preview">
                        {selectedUser.validId.match(/\.(jpg|jpeg|png|gif)$/i) && (
                          <img
                            src={selectedUser.validId}
                            alt="Valid ID"
                          />
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="um-modal-actions">
              {modalSource === "new-users" && !selectedUser.verified && (
                <div className="um-actions-section">
                  <div className="um-actions-header">
                    <h4>✅ User Verification</h4>
                    <p className="um-actions-subtitle">Verify this new user's account to grant full access</p>
                  </div>
                  <div className="um-action-buttons">
                    <button
                      className="um-action-btn verify"
                      onClick={async () => {
                        setActionLoading('verify');
                        await verifyUser(selectedUser._id);
                        setActionLoading(null);
                        setShowUserModal(false);
                      }}
                      disabled={actionLoading === 'verify'}
                    >
                      {actionLoading === 'verify' ? '⏳ Verifying...' : '✓ Verify User'}
                    </button>
                  </div>
                </div>
              )}

              <div className="um-actions-section">
                <div className="um-actions-header">
                  <h4>⚙️ Account Management</h4>
                  <p className="um-actions-subtitle">Manage this user's account status and permissions</p>
                </div>
                <div className="um-action-buttons">
                  {!selectedUser.banned && (
                    <button
                      className="um-action-btn ban"
                      onClick={async () => {
                        setActionLoading('ban');
                        await banUser(selectedUser._id);
                        setActionLoading(null);
                        setShowUserModal(false);
                      }}
                      disabled={actionLoading === 'ban'}
                    >
                      {actionLoading === 'ban' ? '⏳ Banning...' : '🚫 Ban Account'}
                    </button>
                  )}
                  <button
                    className="um-action-btn close"
                    onClick={() => setShowUserModal(false)}
                    disabled={actionLoading !== null}
                  >
                    ✕ Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement
