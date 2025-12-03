import { useEffect, useState } from "react";
import api from "../../api";
import { useMainContext } from "../../mainContext";
import socket from "../../utils/socket";
import ReceiptModal from "./ReceiptModal";

const WorkRecords = ({ searchTerm, filterStatus, filterServiceType, filterBudgetRange, handleRequestClick, getStatusClass }) => {
  const { user } = useMainContext();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);

  const fetchWorkRecords = async () => {
    try {
      setLoading(true);
      const { data } = await api.get("/user/bookings");
      setRecords(data.bookings || []);
    } catch (err) {
      console.error("Error fetching records:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkRecords();

    // Listen for real-time updates
    socket.on("service-request-updated", (data) => {
      console.log("Service request updated:", data);
      fetchWorkRecords();
    });

    return () => {
      socket.off("service-request-updated");
    };
  }, []);

  const filteredRecords = records.filter((record) => {
    // Validate record structure - skip records without serviceRequest as they can't display properly
    if (!record) {
      console.warn("Null record found");
      return false;
    }

    if (!record.serviceRequest) {
      console.log("Skipping record without serviceRequest:", record._id, "Status:", record.status);
      return false;
    }

    // Only show records where current user is the service provider, not the requester
    const isServiceProvider = record.provider?._id === user._id;
    if (!isServiceProvider) {
      console.log("Skipping record where user is not service provider:", record._id, "Provider:", record.provider?._id, "Current user:", user._id);
      return false;
    }

    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = record.serviceRequest?.typeOfWork?.toLowerCase().includes(searchLower) ||
                          record.requester?.firstName?.toLowerCase().includes(searchLower) ||
                          record.requester?.lastName?.toLowerCase().includes(searchLower) ||
                          record.serviceRequest?.budget?.toString().includes(searchTerm) ||
                          record.serviceRequest?.address?.toLowerCase().includes(searchLower) ||
                          record.serviceRequest?.time?.toLowerCase().includes(searchLower);
    const normalizedStatus = record.status === "Waiting" ? "Available" : record.status === "Completed" ? "Complete" : record.status;
    const matchesStatus = filterStatus === "All" || normalizedStatus === filterStatus;
    const matchesServiceType = filterServiceType === "All" || record.serviceRequest?.typeOfWork === filterServiceType;
    const matchesBudget = (!filterBudgetRange.min || record.serviceRequest?.budget >= parseFloat(filterBudgetRange.min)) &&
                         (!filterBudgetRange.max || record.serviceRequest?.budget <= parseFloat(filterBudgetRange.max));

    const result = matchesSearch && matchesStatus && matchesServiceType && matchesBudget;
    if (result) {
      console.log("Work record passed all filters:", record._id, "Status:", record.status, "Service:", record.serviceRequest?.typeOfWork);
    }
    return result;
  });

  if (loading) return <div className="records-loading">Loading records...</div>;
  if (error) return <div className="records-error">{error}</div>;
  return (
    <>
      {filteredRecords.length === 0 ? (
        <div className="no-results">
          <img src="/records.png" alt="No results" style={{width: 100, height: 100, opacity: 0.5, marginBottom: 10}} />
          <p>No Work Records Found</p>
        </div>
      ) : (
        <table className="records-table">
          <thead>
            <tr>
              <th>Status</th>
              <th>Work Time</th>
              <th>Order Address</th>
              <th>Client</th>
              <th>Service Needed</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            {filteredRecords.map((record) => (
              <tr
                key={record._id}
                onClick={() => {
                  console.log('WorkRecords handleRowClick - Raw status:', record.status);
                  const normalizedStatus = record.status === "Waiting" ? "Available" : record.status === "Completed" ? "Complete" : record.status;
                  console.log('WorkRecords handleRowClick - Normalized status:', normalizedStatus);

                  if (normalizedStatus === "Complete") {
                    console.log('WorkRecords - Showing receipt modal for completed record');
                    setSelectedRecord(record);
                    setShowReceiptModal(true);
                  } else {
                    console.log('WorkRecords - Calling handleRequestClick (fallback)');
                    handleRequestClick(record);
                  }
                }}
                style={{ cursor: 'pointer' }}
                className="clickable-row"
              >
                <td>
                      <span className={`status-tag ${getStatusClass(record.status)}`}>
                        {record.status === "Waiting" ? "Available" : record.status === "Completed" ? "Complete" : record.status === "Open" ? "Available" : record.status}
                      </span>
                </td>
                <td>
                  <div>{record.serviceRequest?.time || "-"}</div>
                  <div className="date">{record.createdAt ? new Date(record.createdAt).toLocaleDateString() : "-"}</div>
                </td>
                <td>{record.serviceRequest?.address || "N/A"}</td>
                <td>{record.requester ? `${record.requester.firstName} ${record.requester.lastName}` : "N/A"}</td>
                <td>{record.serviceRequest?.typeOfWork || "N/A"}</td>
                <td>₱{(record.serviceRequest?.budget ?? 0).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Receipt Modal */}
      {showReceiptModal && selectedRecord && (
        <ReceiptModal
          request={selectedRecord.serviceRequest}
          booking={selectedRecord}
          isOpen={showReceiptModal}
          onClose={() => {
            setShowReceiptModal(false);
            setSelectedRecord(null);
          }}
        />
      )}
    </>
  );
};

export default WorkRecords;
