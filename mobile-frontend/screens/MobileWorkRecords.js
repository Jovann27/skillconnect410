import { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, FlatList, Image, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useMainContext } from "../contexts/MainContext";
import apiClient from "../api";
import socket from "../utils/socket";

const MobileWorkRecords = ({ searchTerm, filterStatus, filterServiceType, filterBudgetRange, handleRequestClick, getStatusColor }) => {
  const { user } = useMainContext();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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

  useEffect(() => {
    fetchWorkRecords();

    // Listen for real-time updates
    if (socket) {
      socket.on("booking-updated", (data) => {
        console.log("Booking updated:", data);
        fetchWorkRecords();
      });
    }

    return () => {
      if (socket) {
        socket.off("booking-updated");
      }
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
      {filteredRecords.length === 0 ? (
        <View style={styles.noResultContainer}>
          <Image source={require("../assets/records.png")} style={styles.noResultImage} />
          <Text style={styles.noResultText}>No Work Records Found</Text>
        </View>
      ) : (
        <FlatList
          data={filteredRecords}
          keyExtractor={(item) => item._id}
          renderItem={({ item }) => (
            <TouchableOpacity style={[styles.orderCard, { borderLeftColor: getStatusColor(item.status) }]} onPress={() => handleRequestClick(item)}>
              <Text style={styles.date}>
                {item.serviceRequest?.time || "-"} • {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : "-"}
              </Text>
              <View style={styles.addressRow}>
                <Ionicons name="location-outline" size={14} color="#444" />
                <Text style={styles.address} numberOfLines={1}>{item.serviceRequest?.address || "N/A"}</Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.rowBetween}>
                <View>
                  <Text style={styles.worker}>
                    {item.requester ? `${item.requester.firstName} ${item.requester.lastName}` : "N/A"}
                  </Text>
                  <Text style={styles.type}>{item.serviceRequest?.typeOfWork || "N/A"}</Text>
                </View>
                <Text style={styles.price}>₱{item.serviceRequest?.budget || "0.00"}</Text>
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

export default MobileWorkRecords;
