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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-200 flex items-center justify-center">
      <div className="w-16 h-16 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin"></div>
    </div>
  );

  if (error) return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-200">
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Error</h1>
          </div>
        </div>
      </div>
      <div className="max-w-7xl mx-auto p-6">
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
          <p className="text-slate-500 text-center">{error}</p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-200">
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Residents List</h1>
            <p className="text-slate-600 mt-1">View Records of the Barangay Residents</p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        <div className="bg-white rounded-lg shadow-sm border border-slate-200">
          <div className="p-6 border-b border-slate-200">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div className="relative flex-1 max-w-md">
                <input
                  type="text"
                  placeholder="Search residents by name, address, phone, or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <i className="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400"></i>
              </div>
              <div className="flex gap-2">
                <label className="inline-flex items-center px-4 py-2 bg-slate-100 text-slate-700 border border-slate-300 rounded-lg cursor-pointer hover:bg-slate-200 transition-colors">
                  <i className="fas fa-file-excel mr-2"></i>
                  {importing ? 'Importing...' : 'Import Residents Data from Excel'}
                  <input
                    type="file"
                    accept=".xls,.xlsx"
                    onChange={handleFileUpload}
                    className="hidden"
                    disabled={importing}
                  />
                </label>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Address</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Phone Number</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Created</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {filteredResidents.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-12 text-center text-slate-500">
                      {searchTerm ? 'No residents found matching your search' : 'No residents found'}
                    </td>
                  </tr>
                ) : (
                  filteredResidents.map((resident) => (
                    <tr key={resident._id} className="hover:bg-slate-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">{resident.name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">{resident.address}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">{resident.phoneNumber}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">{resident.email || 'N/A'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">{new Date(resident.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="px-6 py-3 bg-slate-50 border-t border-slate-200">
            <div className="text-sm text-slate-700">
              Showing {filteredResidents.length} of {residents.length} residents
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Residents;
