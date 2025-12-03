import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import apiClient from "../../api";

export default function OrderDetails({ route, navigation }) {
  const { order } = route.params;
  const [serviceRequest, setServiceRequest] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (order?.id) {
      fetchServiceRequest();
    }
  }, [order?.id]);

  const fetchServiceRequest = async () => {
    try {
      setLoading(true);
      const { data } = await apiClient.get(`/user/service-request/${order.id}`);
      if (data.success) {
        setServiceRequest(data.request);
      }
    } catch (err) {
      console.error("Error fetching service request:", err);
    } finally {
      setLoading(false);
    }
  };

  const handlePlaceAgain = () => {
    navigation.navigate("PlaceOrder", { previousOrder: order });
  };

  const handleTrackWorker = () => {
    const requestData = serviceRequest || order;
    // Ensure we have the correct service request ID
    const orderData = {
      ...requestData,
      id: serviceRequest?._id || serviceRequest?.id || order?.id
    };
    navigation.navigate("WaitingForWorker", { orderData });
  };

  const getStatusColor = (status) => {
    // Normalize status for display
    const normalizedStatus = status === "Waiting" ? "Available" : status === "Completed" ? "Complete" : status;

    switch (normalizedStatus) {
      case "Complete":
        return "#4CAF50";
      case "Cancelled":
        return "#E53935";
      case "Working":
        return "#FFC107";
      case "Available":
        return "#FF9800"; // Orange for waiting/available
      default:
        return "#2196F3";
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case "Waiting":
        return "Waiting for Worker";
      case "Working":
        return "In Progress";
      case "Completed":
        return "Completed";
      case "Cancelled":
        return "Cancelled";
      default:
        return status;
    }
  };

  return (
    <ScrollView style={styles.container}>
      {/* Worker Info */}
      <View style={styles.workerBox}>
        <View style={styles.workerRow}>
          <Ionicons name="person-circle-outline" size={70} color="#999" />
          <View style={{ marginLeft: 12 }}>
            <Text style={styles.workerName}>{order.worker}</Text>
            <Text style={styles.workerType}>{order.type}</Text>
            <Text
              style={[
                styles.status,
                { color: getStatusColor(order.status) },
              ]}
            >
              Status: {getStatusText(order.status)}
            </Text>
          </View>
        </View>
      </View>

      {/* Order Details */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Order Details</Text>
        <Text style={styles.info}>{order.date}</Text>
        <Text style={styles.info}>{order.address}</Text>
      </View>

      {/* Conditional Sections */}
      {order.status === "Working" && (
        <>
          <View style={styles.section}>
            <Text style={styles.subTitle}>Worker Progress</Text>
            {order.isOwnOrder && (
              <TouchableOpacity style={styles.trackBtn} onPress={handleTrackWorker}>
                <Ionicons name="navigate-outline" size={18} color="#fff" />
                <Text style={styles.trackText}>Track Worker</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Additional Info for Working Orders */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Additional Info</Text>
            <Text style={styles.info}>Order ID: {order.id}</Text>
            <Text style={styles.info}>Contact: {serviceRequest?.serviceProvider?.phone || order.worker || "Not available"}</Text>
          </View>
        </>
      )}

      {order.status === "Cancelled" && (
        <View style={styles.section}>
          <Text style={styles.subTitle}>Cancellation Info</Text>
          <Text style={styles.info}>Reason: Worker unavailable</Text>
          <Text style={styles.info}>Refund: Processed</Text>
        </View>
      )}

      {order.status === "Completed" && (
        <>
          {/* Proof of Work */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Proof of Work</Text>
            <TouchableOpacity style={styles.proofBox}>
              <Ionicons name="image-outline" size={22} color="#555" />
              <Text style={styles.proofText}>View Proof</Text>
            </TouchableOpacity>
          </View>

          {/* Additional Info */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Additional Info</Text>
            <Text style={styles.info}>Order ID: {order.id}</Text>
            <Text style={styles.info}>Contact: {serviceRequest?.serviceProvider?.phone || order.worker || "Not available"}</Text>
          </View>

          {/* Payment Info */}
          <View style={styles.priceRow}>
            <Text style={styles.paidText}>Paid in Cash</Text>
            <Text style={styles.amount}>₱{order.price}</Text>
          </View>

          {/* Place Order Again Button */}
          {order.isOwnOrder && (
            <TouchableOpacity style={styles.reorderBtn} onPress={handlePlaceAgain}>
              <Text style={styles.reorderText}>Place Order Again</Text>
            </TouchableOpacity>
          )}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F6F5F5", padding: 16 },
  workerBox: { backgroundColor: "#fff", borderRadius: 12, padding: 16, marginBottom: 12, elevation: 2 },
  workerRow: { flexDirection: "row", alignItems: "center" },
  workerName: { fontSize: 16, fontWeight: "600", color: "#222" },
  workerType: { fontSize: 13, color: "#777", marginTop: 3 },
  status: { fontSize: 13, marginTop: 4, fontWeight: "600" },
  section: { backgroundColor: "#fff", borderRadius: 12, padding: 14, marginBottom: 12, elevation: 1.5 },
  sectionTitle: { fontWeight: "700", fontSize: 15, marginBottom: 8, color: "#222" },
  subTitle: { fontWeight: "600", fontSize: 14, marginBottom: 6, color: "#222" },
  info: { fontSize: 13, color: "#555", marginBottom: 3 },
  trackBtn: { flexDirection: "row", alignItems: "center", backgroundColor: "#ce4da3ff", padding: 10, borderRadius: 8, marginTop: 6 },
  trackText: { fontSize: 13, color: "#fff", marginLeft: 6 },
  priceRow: { backgroundColor: "#fff", flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 14, borderRadius: 12, marginTop: 10, elevation: 1.5 },
  paidText: { fontSize: 14, fontWeight: "600", color: "#333" },
  amount: { fontSize: 15, fontWeight: "700", color: "#222" },
  proofBox: { flexDirection: "row", alignItems: "center", backgroundColor: "#f3f3f3", padding: 10, borderRadius: 8 },
  proofText: { fontSize: 13, marginLeft: 8, color: "#555" },
  reorderBtn: { backgroundColor: "#ce4da3ff", paddingVertical: 14, borderRadius: 10, alignItems: "center", shadowColor: "#000", shadowOpacity: 0.15, shadowRadius: 4, elevation: 3, marginBottom: 12, marginTop: 12, },
  reorderText: { color: "#fff", fontWeight: "700", fontSize: 15 },
});
