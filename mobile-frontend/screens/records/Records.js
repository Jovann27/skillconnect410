import { useState, useEffect } from "react";
import {View,Text,StyleSheet,TextInput,TouchableOpacity, Alert, Modal, ScrollView} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useMainContext } from "../../contexts/MainContext";
import apiClient from "../../api";
import MobileMyRequests from "../MobileMyRequests";
import MobileAvailableRequests from "../MobileAvailableRequests";
import MobileWorkRecords from "../MobileWorkRecords";

const RecordsScreen = () => {
  const navigation = useNavigation();
  const { user } = useMainContext();
  const [records, setRecords] = useState([]);
  const [requests, setRequests] = useState([]);
  const [myRequests, setMyRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [filterServiceType, setFilterServiceType] = useState("All");
  const [filterBudgetRange, setFilterBudgetRange] = useState({ min: "", max: "" });
  const [showFilters, setShowFilters] = useState(false);
  const [activeTab, setActiveTab] = useState("my-requests");
  const [popupOpen, setPopupOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editRequest, setEditRequest] = useState(null);

  const fetchWorkRecords = async () => {
    try {
      setLoading(true);
      const { data } = await apiClient.get("/user/bookings");
      console.log("Fetched work records:", data.bookings);
      setRecords(data.bookings || []);
    } catch (err) {
      console.error("Error fetching records:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchCurrentRequests = async () => {
    try {
      const { data } = await apiClient.get("/user/service-requests", { withCredentials: true });
      console.log("Fetched current requests:", data.requests);
      setRequests(data.requests || []);
    } catch (err) {
      console.error("Error fetching requests:", err);
      setError(err.message);
    }
  };

  const fetchMyRequests = async () => {
    try {
      const { data } = await apiClient.get("/user/user-service-requests", { withCredentials: true });
      console.log("Fetched my requests:", data.requests);
      setMyRequests(data.requests || []);
    } catch (err) {
      console.error("Error fetching my requests:", err);
      setError(err.message);
    }
  };

  useEffect(() => {
    fetchWorkRecords();
    fetchCurrentRequests();
    fetchMyRequests();
  }, []);

  // Get unique service types for filter dropdown
  const getServiceTypes = () => {
    const allRequests = [...requests, ...myRequests, ...records.map(r => r.serviceRequest).filter(Boolean)];
    const serviceTypes = [...new Set(allRequests.map(req => req?.typeOfWork).filter(Boolean))];
    return serviceTypes.sort();
  };

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
    const isServiceProvider = record.acceptedBy?._id === user._id || record.acceptedById === user._id;
    if (!isServiceProvider) {
      console.log("Skipping record where user is not service provider:", record._id, "AcceptedBy:", record.acceptedBy?._id, "Current user:", user._id);
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

  const filteredRequests = requests.filter((request) => {
    // Validate request structure
    if (!request) {
      console.warn("Invalid request structure:", request);
      return false;
    }

    // Only show requests that are available (status: "Available", "Waiting", "Open")
    const isAvailableRequest = request.status === "Available" || request.status === "Waiting" || request.status === "Open";
    if (!isAvailableRequest) return false;

    // Exclude current user's own requests
    const isNotOwnRequest = request.requester?._id !== user._id && request.requesterId !== user._id;
    if (!isNotOwnRequest) {
      console.log("Excluding own request:", request._id, "Requester:", request.requester?._id, "Current user:", user._id);
      return false;
    }

    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = request.typeOfWork?.toLowerCase().includes(searchLower) ||
                          request.requester?.firstName?.toLowerCase().includes(searchLower) ||
                          request.requester?.lastName?.toLowerCase().includes(searchLower) ||
                          request.name?.toLowerCase().includes(searchLower) ||
                          request.budget?.toString().includes(searchTerm) ||
                          request.address?.toLowerCase().includes(searchLower) ||
                          request.phone?.toLowerCase().includes(searchLower) ||
                          request.notes?.toLowerCase().includes(searchLower);
    const normalizedStatus = request.status === "Waiting" ? "Available" : request.status === "Completed" ? "Complete" : request.status;
    const matchesStatus = filterStatus === "All" || normalizedStatus === filterStatus;
    const matchesServiceType = filterServiceType === "All" || request.typeOfWork === filterServiceType;
    const matchesBudget = (!filterBudgetRange.min || request.budget >= parseFloat(filterBudgetRange.min)) &&
                         (!filterBudgetRange.max || request.budget <= parseFloat(filterBudgetRange.max));

    const result = isAvailableRequest && isNotOwnRequest && matchesSearch && matchesStatus && matchesServiceType && matchesBudget;
    if (result) {
      console.log("Request passed filter:", request._id, "Status:", request.status, "Not own request:", isNotOwnRequest);
    }
    return result;
  });

  const filteredMyRequests = myRequests.filter((request) => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = request.typeOfWork?.toLowerCase().includes(searchLower) ||
                          request.name?.toLowerCase().includes(searchLower) ||
                          request.budget?.toString().includes(searchTerm) ||
                          request.address?.toLowerCase().includes(searchLower) ||
                          request.phone?.toLowerCase().includes(searchLower) ||
                          request.notes?.toLowerCase().includes(searchLower);
    const normalizedStatus = request.status === "Waiting" ? "Available" : request.status === "Completed" ? "Complete" : request.status;
    const matchesStatus = filterStatus === "All" || normalizedStatus === filterStatus;
    const matchesServiceType = filterServiceType === "All" || request.typeOfWork === filterServiceType;
    const matchesBudget = (!filterBudgetRange.min || request.budget >= parseFloat(filterBudgetRange.min)) &&
                         (!filterBudgetRange.max || request.budget <= parseFloat(filterBudgetRange.max));
    return matchesSearch && matchesStatus && matchesServiceType && matchesBudget;
  });

  const getStatusColor = (status) => {
    switch (status) {
      case "Available":
      case "Waiting":
      case "Open":
        return "#FFC107";
      case "Working":
        return "#2196F3";
      case "Complete":
      case "Completed":
        return "#4CAF50";
      case "Cancelled":
        return "#E53935";
      case "No Longer Available":
        return "#9E9E9E"; // Gray color for expired requests
      default:
        return "#2196F3";
    }
  };

  // Popup handlers
  const handleRequestClick = (request) => {
    if (request.serviceRequest) {
      // It's a booking, navigate to ClientAccepted
      const client = {
        name: request.requester ? `${request.requester.firstName} ${request.requester.lastName}` : 'N/A',
        email: request.requester?.email || '',
        phone: request.requester?.phone || '',
        photo: request.requester?.photo || null,
        service: request.serviceRequest.typeOfWork,
        budget: request.serviceRequest.budget,
        date: request.createdAt ? new Date(request.createdAt).toLocaleDateString() : '',
        time: request.serviceRequest.time,
        location: request.serviceRequest.address,
        note: request.serviceRequest.notes || '',
        _id: request.requester?._id || ''
      };
      const orderStatus = request.status === 'Working' ? 'IN_PROGRESS' : request.status === 'Completed' ? 'COMPLETED' : 'ACCEPTED';
      navigation.navigate('ClientAccepted', { client, orderStatus });
    } else {
      // Regular request
      const isMyRequest = myRequests.find(r => r._id === request._id);
      if (isMyRequest && (request.status === 'Completed' || request.status === 'Working')) {
        // Navigate to OrderDetails for user's own completed/working requests
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
        navigation.navigate('OrderDetails', { order });
      } else if (isMyRequest && request.status !== 'Completed' && request.status !== 'Working' && request.status !== 'Cancelled') {
        // Navigate to WaitingForWorker for user's own pending requests
        navigation.navigate('WaitingForWorker', { orderData: request });
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
    if (request.acceptedBy || request.serviceProvider) {
      navigation.navigate('Chat', { requestId: request._id });
    } else {
      Alert.alert("Chat", "No service provider assigned for chat.");
    }
    handleClosePopup();
  };

  const handleEditRequest = (request) => {
    setEditRequest(request);
    setEditModalOpen(true);
  };

  const handleCancelRequest = async (request) => {
    // First confirm cancellation
    Alert.alert(
      "Cancel Request",
      "Are you sure you want to cancel this request?",
      [
        { text: "No", style: "cancel" },
        {
          text: "Yes",
          onPress: () => {
            // Prompt for cancellation reason
            Alert.prompt(
              "Cancellation Reason",
              "Please provide a reason for cancelling this request:",
              [
                { text: "Cancel", style: "cancel" },
                {
                  text: "Submit",
                  onPress: async (reason) => {
                    if (!reason || !reason.trim()) {
                      Alert.alert("Error", "Cancellation reason is required.");
                      return;
                    }

                    try {
                      console.log("Cancelling request:", request._id);
                      const response = await apiClient.delete(`/user/service-request/${request._id}/cancel`, {
                        data: { cancellationReason: reason.trim() }
                      });
                      console.log("Cancel request response:", response.data);

                      if (response.data.success) {
                        Alert.alert("Success", "Request cancelled successfully!");
                        console.log("Request cancelled, refreshing data...");
                        // Refresh all data to ensure UI reflects database changes
                        await Promise.all([
                          fetchMyRequests(),
                          fetchCurrentRequests(),
                          fetchWorkRecords()
                        ]);
                        console.log("Data refreshed after cancellation");
                      } else {
                        console.error("Cancel request failed:", response.data);
                        Alert.alert("Error", "Failed to cancel request. Please try again.");
                      }
                    } catch (err) {
                      console.error("Error cancelling request:", err);
                      Alert.alert("Error", "Failed to cancel request. Please try again.");
                    }
                  }
                }
              ],
              "plain-text",
              "",
              "default"
            );
          }
        }
      ]
    );
  };

  const handleAcceptRequest = async (request) => {
    // Check if user is a Service Provider
    if (user.role !== "Service Provider") {
      Alert.alert(
        "Application Required",
        "You must complete your service provider application and get approved by an admin before accepting service requests.",
        [{ text: "OK" }]
      );
      return;
    }

    try {
      const response = await apiClient.post(`/user/service-request/${request._id}/accept`);
      if (response.data.success) {
        Alert.alert("Success", "Request accepted successfully!");
        fetchCurrentRequests();
        handleClosePopup();
      }
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Failed to accept request. Please try again.");
    }
  };

  const handleDeclineRequest = (request) => {
    Alert.alert("Decline", "Request declined.");
    handleClosePopup();
  };

  const handleCloseEditModal = () => {
    setEditModalOpen(false);
    setEditRequest(null);
  };

  const handleSaveEdit = async () => {
    try {
      const response = await apiClient.put(`/user/service-request/${editRequest._id}/update`, editRequest);
      if (response.data.success) {
        Alert.alert("Success", "Request updated successfully!");
        fetchMyRequests();
        handleCloseEditModal();
      }
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Failed to update request. Please try again.");
    }
  };

  const handleDeleteRequest = (request) => {
    if (myRequests.find(r => r._id === request._id)) {
      handleCancelRequest(request);
    } else {
      handleDeclineRequest(request);
    }
  };

  if (loading) return (
    <View style={styles.container}>
      <Text style={styles.loadingText}>Loading records...</Text>
    </View>
  );
  if (error) return (
    <View style={styles.container}>
      <Text style={styles.errorText}>{error}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <Text style={styles.header}>Records & Requests</Text>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={18} color="#888" style={{ marginRight: 8 }} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by service, client, budget, address, phone..."
          placeholderTextColor="#999"
          value={searchTerm}
          onChangeText={setSearchTerm}
        />
        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => setShowFilters(!showFilters)}
        >
          <Ionicons name="filter" size={18} color="#888" />
        </TouchableOpacity>
      </View>

      {/* Advanced Filters */}
      {showFilters && (
        <View style={styles.filtersContainer}>
          <View style={styles.filterRow}>
            <View style={styles.filterGroup}>
              <Text style={styles.filterLabel}>Status:</Text>
              <View style={styles.pickerContainer}>
                <TextInput
                  style={styles.filterInput}
                  placeholder="All"
                  value={filterStatus}
                  onChangeText={setFilterStatus}
                />
              </View>
            </View>

            <View style={styles.filterGroup}>
              <Text style={styles.filterLabel}>Min Budget (₱):</Text>
              <TextInput
                style={styles.filterInput}
                placeholder="0"
                value={filterBudgetRange.min}
                onChangeText={(value) => setFilterBudgetRange(prev => ({ ...prev, min: value }))}
                keyboardType="numeric"
              />
            </View>

            <View style={styles.filterGroup}>
              <Text style={styles.filterLabel}>Max Budget (₱):</Text>
              <TextInput
                style={styles.filterInput}
                placeholder="No limit"
                value={filterBudgetRange.max}
                onChangeText={(value) => setFilterBudgetRange(prev => ({ ...prev, max: value }))}
                keyboardType="numeric"
              />
            </View>

            <View style={styles.filterGroup}>
              <TouchableOpacity
                style={styles.clearFiltersButton}
                onPress={() => {
                  setFilterStatus("All");
                  setFilterServiceType("All");
                  setFilterBudgetRange({ min: "", max: "" });
                  setSearchTerm("");
                }}
              >
                <Text style={styles.clearFiltersText}>Clear All</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === "my-requests" && styles.activeTab]}
          onPress={() => setActiveTab("my-requests")}
        >
          <Text style={[styles.tabText, activeTab === "my-requests" && styles.activeTabText]}>
            My Requests
          </Text>
        </TouchableOpacity>
        {user.role === "Service Provider" && (
          <>
            <TouchableOpacity
              style={[styles.tab, activeTab === "available-requests" && styles.activeTab]}
              onPress={() => setActiveTab("available-requests")}
            >
              <Text style={[styles.tabText, activeTab === "available-requests" && styles.activeTabText]}>
                Available Requests
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === "work-records" && styles.activeTab]}
              onPress={() => setActiveTab("work-records")}
            >
              <Text style={[styles.tabText, activeTab === "work-records" && styles.activeTabText]}>
                Work Records
              </Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      {/* Content */}
      {activeTab === "my-requests" && (
        <MobileMyRequests
          searchTerm={searchTerm}
          filterStatus={filterStatus}
          filterServiceType={filterServiceType}
          filterBudgetRange={filterBudgetRange}
          handleRequestClick={handleRequestClick}
          handleChatClick={handleChatClick}
          handleEditRequest={handleEditRequest}
          handleCancelRequest={handleCancelRequest}
          getStatusColor={getStatusColor}
        />
      )}
      {activeTab === "available-requests" && (
        <MobileAvailableRequests
          searchTerm={searchTerm}
          filterStatus={filterStatus}
          filterServiceType={filterServiceType}
          filterBudgetRange={filterBudgetRange}
          handleRequestClick={handleRequestClick}
          handleAcceptRequest={handleAcceptRequest}
          handleDeclineRequest={handleDeclineRequest}
          getStatusColor={getStatusColor}
        />
      )}
      {activeTab === "work-records" && (
        <MobileWorkRecords
          searchTerm={searchTerm}
          filterStatus={filterStatus}
          filterServiceType={filterServiceType}
          filterBudgetRange={filterBudgetRange}
          handleRequestClick={handleRequestClick}
          getStatusColor={getStatusColor}
        />
      )}

      <Modal visible={popupOpen} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedRequest && (
              <>
                <Text style={styles.modalTitle}>
                  {selectedRequest.serviceRequest ? "Booking Details" : "Request Details"}
                </Text>
                <ScrollView style={styles.modalScroll}>
                  <Text style={styles.modalLabel}>Name:</Text>
                  <Text style={styles.modalText}>
                    {selectedRequest.serviceRequest ? selectedRequest.serviceRequest.name : selectedRequest.name}
                  </Text>

                  <Text style={styles.modalLabel}>Address:</Text>
                  <Text style={styles.modalText}>
                    {selectedRequest.serviceRequest ? selectedRequest.serviceRequest.address : selectedRequest.address}
                  </Text>

                  <Text style={styles.modalLabel}>Phone:</Text>
                  <Text style={styles.modalText}>
                    {selectedRequest.serviceRequest ? selectedRequest.serviceRequest.phone : selectedRequest.phone}
                  </Text>

                  <Text style={styles.modalLabel}>Service Type:</Text>
                  <Text style={styles.modalText}>
                    {selectedRequest.serviceRequest ? selectedRequest.serviceRequest.typeOfWork : selectedRequest.typeOfWork}
                  </Text>

                  <Text style={styles.modalLabel}>Preferred Time:</Text>
                  <Text style={styles.modalText}>
                    {selectedRequest.serviceRequest ? selectedRequest.serviceRequest.time : selectedRequest.time}
                  </Text>

                  <Text style={styles.modalLabel}>Budget:</Text>
                  <Text style={styles.modalText}>
                    ₱{selectedRequest.serviceRequest ? selectedRequest.serviceRequest.budget : selectedRequest.budget}
                  </Text>

                  <Text style={styles.modalLabel}>Notes:</Text>
                  <Text style={styles.modalText}>
                    {selectedRequest.serviceRequest ? selectedRequest.serviceRequest.notes : selectedRequest.notes}
                  </Text>

                  {selectedRequest.serviceRequest && (
                    <>
                      <Text style={styles.modalLabel}>Status:</Text>
                      <Text style={styles.modalText}>{selectedRequest.status}</Text>

                      <Text style={styles.modalLabel}>Client:</Text>
                      <Text style={styles.modalText}>
                        {selectedRequest.requester ? `${selectedRequest.requester.firstName} ${selectedRequest.requester.lastName}` : "N/A"}
                      </Text>

                      <Text style={styles.modalLabel}>Service Provider:</Text>
                      <Text style={styles.modalText}>
                        {selectedRequest.acceptedBy ? `${selectedRequest.acceptedBy.firstName || selectedRequest.acceptedBy.username}` : "Not assigned"}
                      </Text>
                    </>
                  )}
                </ScrollView>

                <View style={styles.modalActions}>
                  {selectedRequest.serviceRequest ? (
                    // For booking records, only show chat if there's an accepted provider
                    selectedRequest.acceptedBy && (
                      <TouchableOpacity style={styles.modalButton} onPress={() => handleChatClick(selectedRequest)}>
                        <Text style={styles.modalButtonText}>Chat</Text>
                      </TouchableOpacity>
                    )
                  ) : (
                    // For regular requests
                    selectedRequest.status === "Working" || selectedRequest.status === "Complete" ? (
                      <TouchableOpacity style={styles.modalButton} onPress={() => handleChatClick(selectedRequest)}>
                        <Text style={styles.modalButtonText}>Chat</Text>
                      </TouchableOpacity>
                    ) : selectedRequest.status === "Cancelled" ? (
                      <View style={styles.modalButton}>
                        <Text style={[styles.modalButtonText, { color: "#999" }]}>Cancelled</Text>
                      </View>
                    ) : (
                      myRequests.find(r => r._id === selectedRequest._id) ? (
                        <TouchableOpacity style={styles.modalButton} onPress={() => handleEditRequest(selectedRequest)}>
                          <Text style={styles.modalButtonText}>Edit</Text>
                        </TouchableOpacity>
                      ) : (
                        <TouchableOpacity style={styles.modalButton} onPress={() => handleAcceptRequest(selectedRequest)}>
                          <Text style={styles.modalButtonText}>Accept</Text>
                        </TouchableOpacity>
                      )
                    )
                  )}

                  {!selectedRequest.serviceRequest && selectedRequest.status !== "Cancelled" && selectedRequest.status !== "Complete" && (
                    <TouchableOpacity style={styles.modalButton} onPress={() => handleDeleteRequest(selectedRequest)}>
                      <Text style={styles.modalButtonText}>
                        {myRequests.find(r => r._id === selectedRequest._id) ? "Cancel" : "Decline"}
                      </Text>
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity style={styles.modalButton} onPress={handleClosePopup}>
                    <Text style={styles.modalButtonText}>Close</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Edit Modal */}
      <Modal visible={editModalOpen} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {editRequest && (
              <>
                <Text style={styles.modalTitle}>Edit Request</Text>
                <ScrollView style={styles.modalScroll}>
                  <Text style={styles.modalLabel}>Name:</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={editRequest.name}
                    onChangeText={(value) => setEditRequest({ ...editRequest, name: value })}
                  />

                  <Text style={styles.modalLabel}>Address:</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={editRequest.address}
                    onChangeText={(value) => setEditRequest({ ...editRequest, address: value })}
                  />

                  <Text style={styles.modalLabel}>Phone:</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={editRequest.phone}
                    onChangeText={(value) => setEditRequest({ ...editRequest, phone: value })}
                  />

                  <Text style={styles.modalLabel}>Service Type:</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={editRequest.typeOfWork}
                    onChangeText={(value) => setEditRequest({ ...editRequest, typeOfWork: value })}
                  />

                  <Text style={styles.modalLabel}>Preferred Time:</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={editRequest.time}
                    onChangeText={(value) => setEditRequest({ ...editRequest, time: value })}
                  />

                  <Text style={styles.modalLabel}>Budget (₱):</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={editRequest.budget?.toString()}
                    onChangeText={(value) => setEditRequest({ ...editRequest, budget: value })}
                    keyboardType="numeric"
                  />

                  <Text style={styles.modalLabel}>Notes:</Text>
                  <TextInput
                    style={[styles.modalInput, { height: 80 }]}
                    value={editRequest.notes}
                    onChangeText={(value) => setEditRequest({ ...editRequest, notes: value })}
                    multiline
                  />
                </ScrollView>

                <View style={styles.modalActions}>
                  <TouchableOpacity style={styles.modalButton} onPress={handleSaveEdit}>
                    <Text style={styles.modalButtonText}>Save</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.modalButton} onPress={handleCloseEditModal}>
                    <Text style={styles.modalButtonText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default RecordsScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F6F5F5",
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 10,
  },
  header: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 15,
    textAlign: "center",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 50,
    elevation: 3,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 4,
    marginBottom: 15,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
  },
  filterButton: {
    padding: 5,
  },
  filtersContainer: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    elevation: 2,
  },
  filterRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  filterGroup: {
    flex: 1,
    marginHorizontal: 5,
  },
  filterLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#333",
    marginBottom: 5,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    backgroundColor: "#f9f9f9",
  },
  filterInput: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
    backgroundColor: "#f9f9f9",
    borderRadius: 8,
  },
  clearFiltersButton: {
    backgroundColor: "#ce4da3ff",
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 10,
  },
  clearFiltersText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  tabContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 8,
    marginHorizontal: 4,
    borderRadius: 20,
  },
  activeTab: {
    backgroundColor: "#ce4da3ff",
  },
  tabText: {
    fontSize: 13,
    color: "#777",
    fontWeight: "500",
  },
  activeTabText: {
    color: "#fff",
    fontWeight: "700",
  },
  orderCard: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 14,
    marginBottom: 12,
    elevation: 2,
    borderLeftWidth: 4,
  },
  date: {
    fontSize: 12,
    color: "#777",
    marginBottom: 4,
  },
  addressRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  address: {
    fontSize: 12,
    color: "#555",
    marginLeft: 5,
    flex: 1,
  },
  divider: {
    height: 1,
    backgroundColor: "#eee",
    marginVertical: 10,
  },
  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  worker: {
    fontSize: 13,
    fontWeight: "600",
  },
  type: {
    fontSize: 13,
    color: "#555",
  },
  price: {
    fontSize: 14,
    fontWeight: "700",
    color: "#222",
  },
  actionsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
  },
  actionButton: {
    backgroundColor: "#ce4da3ff",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    flex: 1,
    marginHorizontal: 2,
    alignItems: "center",
  },
  actionText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  noResultContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  noResultImage: {
    width: 100,
    height: 100,
    opacity: 0.5,
    marginBottom: 10,
  },
  noResultText: {
    color: "#888",
    fontSize: 15,
    fontWeight: "500",
  },
  loadingText: {
    textAlign: "center",
    fontSize: 16,
    color: "#666",
    marginTop: 50,
  },
  errorText: {
    textAlign: "center",
    fontSize: 16,
    color: "#E53935",
    marginTop: 50,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 20,
    width: "90%",
    maxHeight: "80%",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 15,
    textAlign: "center",
  },
  modalScroll: {
    maxHeight: 300,
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginTop: 10,
    marginBottom: 5,
  },
  modalText: {
    fontSize: 14,
    color: "#555",
    padding: 8,
    backgroundColor: "#f9f9f9",
    borderRadius: 5,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 5,
    padding: 8,
    fontSize: 14,
    backgroundColor: "#f9f9f9",
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 20,
  },
  modalButton: {
    backgroundColor: "#ce4da3ff",
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 8,
    flex: 1,
    marginHorizontal: 5,
    alignItems: "center",
  },
  modalButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
});
