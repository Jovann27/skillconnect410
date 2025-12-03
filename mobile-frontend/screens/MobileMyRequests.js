import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, FlatList, Image, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useMainContext } from "../contexts/MainContext";
import apiClient from "../api";
import { socket } from "../utils/socket";

const MobileMyRequests = ({ searchTerm, filterStatus, filterServiceType, filterBudgetRange, handleRequestClick, handleChatClick, handleEditRequest, handleCancelRequest, getStatusColor }) => {
  const { user } = useMainContext();
  const [myRequests, setMyRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchMyRequests = async () => {
    try {
      const { data } = await apiClient.get("/user/user-service-requests", { withCredentials: true });
      console.log("Fetched my requests:", data.requests);
      setMyRequests(data.requests || []);
    } catch (err) {
      console.error("Error fetching my requests:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyRequests();

    // Listen for real-time updates
    socket.on("service-request-updated", (data) => {
      console.log("Service request updated:", data);
      fetchMyRequests();
    });

    return () => {
      socket.off("service-request-updated");
    };
  }, []);

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
      {filteredMyRequests.length === 0 ? (
        <View style={styles.noResultContainer}>
          <Image source={require("../assets/records.png")} style={styles.noResultImage} />
          <Text style={styles.noResultText}>No My Requests Found</Text>
        </View>
      ) : (
        <FlatList
          data={filteredMyRequests}
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
                  <Text style={styles.worker}>{item.typeOfWork}</Text>
                  <Text style={styles.type}>{item.time || "Not specified"}</Text>
                </View>
                <Text style={styles.price}>₱{item.budget || "0"}</Text>
              </View>
              <View style={styles.actionsRow}>
                {item.status === "Working" || item.status === "Complete" ? (
                  <TouchableOpacity style={styles.actionButton} onPress={() => handleChatClick(item)}>
                    <Text style={styles.actionText}>Chat</Text>
                  </TouchableOpacity>
                ) : item.status === "Cancelled" ? (
                  <View style={styles.actionButton}>
                    <Text style={[styles.actionText, { color: "#999" }]}>Cancelled</Text>
                  </View>
                ) : item.status === "No Longer Available" ? (
                  <View style={styles.actionButton}>
                    <Text style={[styles.actionText, { color: "#999" }]}>Expired</Text>
                  </View>
                ) : (
                  <TouchableOpacity style={styles.actionButton} onPress={() => handleEditRequest(item)}>
                    <Text style={styles.actionText}>Edit</Text>
                  </TouchableOpacity>
                )}
                {item.status !== "Cancelled" && item.status !== "Complete" && item.status !== "No Longer Available" && (
                  <TouchableOpacity style={styles.actionButton} onPress={() => handleCancelRequest(item)}>
                    <Text style={styles.actionText}>Cancel</Text>
                  </TouchableOpacity>
                )}
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

export default MobileMyRequests;
