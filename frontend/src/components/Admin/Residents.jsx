import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import api from "../../api";
import { useMainContext } from "../../mainContext";
import * as XLSX from 'xlsx';

const Residents = () => {
  const { admin, isAuthorized, tokenType } = useMainContext();
  const [residents, setResidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredResidents, setFilteredResidents] = useState([]);
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    // Wait for authentication to be fully loaded
    if (isAuthorized === null || isAuthorized === undefined) {
      return;
    }

    // Only make API calls when authentication is fully loaded and user is admin
    if (isAuthorized === false) {
      setLoading(false);
      setError("Please login to access this page.");
    } else if (isAuthorized && tokenType === "admin" && admin) {
      fetchResidents();
    } else if (isAuthorized && tokenType !== "admin") {
      setLoading(false);
      setError("Access denied. Admin authentication required.");
    } else {
      setLoading(false);
      setError("Loading admin data...");
    }
  }, [isAuthorized, tokenType, admin]);

  useEffect(() => {
    // Filter residents based on search term
    const filtered = residents.filter(resident =>
      resident.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      resident.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
      resident.phoneNumber.includes(searchTerm) ||
      (resident.email && resident.email.toLowerCase().includes(searchTerm.toLowerCase()))
    );
    setFilteredResidents(filtered);
  }, [residents, searchTerm]);

  const fetchResidents = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await api.get("/admin/residents");
      setResidents(response.data.residents);
    } catch (err) {
      console.error("Failed to fetch residents:", err);
      setError(`Failed to fetch residents: ${err.response?.data?.message || err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Check file type
    const allowedTypes = [
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];

    if (!allowedTypes.includes(file.type)) {
      toast.error('Please select a valid Excel file (.xls or .xlsx)');
      return;
    }

    setImporting(true);
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

          // Skip header row and map data
          const residentsData = jsonData.slice(1).map(row => ({
            name: row[0] || '',
            address: row[1] || '',
            phoneNumber: row[2] || '',
            email: row[3] || ''
          })).filter(resident => resident.name && resident.address && resident.phoneNumber);

          if (residentsData.length === 0) {
            toast.error('No valid resident data found in the Excel file');
            return;
          }

          // Import to backend
          const response = await api.post('/admin/residents/import', { residents: residentsData });
          toast.success(response.data.message);
          fetchResidents(); // Refresh the list
        } catch (error) {
          console.error('Error processing Excel file:', error);
          toast.error('Error processing Excel file');
        } finally {
          setImporting(false);
        }
      };
      reader.readAsArrayBuffer(file);
    } catch (error) {
      console.error('Error reading file:', error);
      toast.error('Error reading file');
      setImporting(false);
    }
  };

  if (loading) return (
    <div className="user-management-container">
      <div className="loading-spinner"></div>
    </div>
  );

  if (error) return (
    <div className="user-management-container">
      <div className="analytics-header">
        <div>
          <h1>Error</h1>
        </div>
      </div>
      <div className="content-card">
        <p className="empty-state">{error}</p>
      </div>
    </div>
  );

  return (
    <div className="user-management-container">
      <div className="analytics-header">
        <div>
          <h1>Residents List</h1>
          <p className="header-description">View Records of the Barangay Residents</p>
        </div>
      </div>

      <div className="content-card">
        <div className="card-header">
          <div className="header-actions">
            <div className="search-container">
              <input
                type="text"
                placeholder="Search residents by name, address, phone, or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
              />
              <i className="fas fa-search search-icon"></i>
            </div>
            <div className="action-buttons">
              <label className="admin-btn secondary import-btn">
                <i className="fas fa-file-excel"></i>
                {importing ? 'Importing...' : 'Import Residents Data from Excel'}
                <input
                  type="file"
                  accept=".xls,.xlsx"
                  onChange={handleFileUpload}
                  style={{ display: 'none' }}
                  disabled={importing}
                />
              </label>
            </div>
          </div>
        </div>

        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Address</th>
                <th>Phone Number</th>
                <th>Email</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {filteredResidents.length === 0 ? (
                <tr>
                  <td colSpan="5" className="no-data">
                    {searchTerm ? 'No residents found matching your search' : 'No residents found'}
                  </td>
                </tr>
              ) : (
                filteredResidents.map((resident) => (
                  <tr key={resident._id}>
                    <td>{resident.name}</td>
                    <td>{resident.address}</td>
                    <td>{resident.phoneNumber}</td>
                    <td>{resident.email || 'N/A'}</td>
                    <td>{new Date(resident.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="table-footer">
          <div className="results-info">
            Showing {filteredResidents.length} of {residents.length} residents
          </div>
        </div>
      </div>
    </div>
  );
};

export default Residents;
