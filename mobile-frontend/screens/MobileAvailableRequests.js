import { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, FlatList, Image, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useMainContext } from "../contexts/MainContext";
import apiClient from "../api";
import { socket } from "../utils/socket";

const MobileAvailableRequests = ({ searchTerm, filterStatus, filterServiceType, filterBudgetRange, handleRequestClick, handleAcceptRequest, handleDeclineRequest, getStatusColor }) => {
  const { user } = useMainContext();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchCurrentRequests = async () => {
    try {
      const { data } = await apiClient.get("/user/service-requests", { withCredentials: true });
      console.log("Fetched current requests:", data.requests);
      setRequests(data.requests || []);
    } catch (err) {
      console.error("Error fetching requests:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCurrentRequests();

    // Listen for real-time updates
    if (socket && typeof socket.on === 'function') {
      socket.on("service-request-updated", (data) => {
        console.log("Service request updated:", data);
        fetchCurrentRequests();
      });
    }

    return () => {
      if (socket && typeof socket.off === 'function') {
        socket.off("service-request-updated");
      }
    };
  }, []);

  const filteredRequests = requests.filter((request) => {
    // Validate request structure
    if (!request) {
      console.warn("Invalid request structure:", request);
      return false;
    }

    // Only show requests that are available (status: "Available", "Waiting", "Open") and not expired
    const isAvailableRequest = (request.status === "Available" || request.status === "Waiting" || request.status === "Open") &&
                              request.status !== "No Longer Available";
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
    <>
      {filteredRequests.length === 0 ? (
        <View style={styles.noResultContainer}>
          <Image source={require("../assets/records.png")} style={styles.noResultImage} />
          <Text style={styles.noResultText}>No Available Requests Found</Text>
        </View>
      ) : (
        <FlatList
          data={filteredRequests}
          keyExtractor={(item) => item._id}
          renderItem={({ item }) => (
            <TouchableOpacity style={[styles.orderCard, { borderLeftColor: getStatusColor(item.status) }]} onPress={() => handleRequestClick(item)}>
              <Text style={styles.date}>
                Needed by: {item.expiresAt ? new Date(item.expiresAt).toLocaleDateString() : "N/A"}
              </Text>
              <View style={styles.addressRow}>
                <Ionicons name="location-outline" size={14} color="#444" />
                <Text style={styles.address} numberOfLines={1}>{item.address || "Not specified"}</Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.rowBetween}>
                <View>
                  <Text style={styles.worker}>
                    {item.requester ? `${item.requester.firstName || ""} ${item.requester.lastName || ""}`.trim() || item.requester.username || "Unknown Client" : "N/A"}
                  </Text>
                  <Text style={styles.type}>{item.typeOfWork}</Text>
                </View>
                <Text style={styles.price}>₱{item.budget || "0"}</Text>
              </View>
              <View style={styles.actionsRow}>
                <TouchableOpacity style={styles.actionButton} onPress={() => handleAcceptRequest(item)}>
                  <Text style={styles.actionText}>Accept</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionButton} onPress={() => handleDeclineRequest(item)}>
                  <Text style={styles.actionText}>Decline</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          )}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 20 }}
        />
      )}
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F6F5F5",
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 10,
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
});

export default MobileAvailableRequests;
