import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Alert, Image, ActivityIndicator } from "react-native";
import apiClient from "../api";

export default function AcceptedScreen({ route, navigation }) {
  const { serviceRequestId } = route.params || {};
  const [serviceRequest, setServiceRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (serviceRequestId) {
      fetchServiceRequest();
    } else {
      setError("No service request ID provided");
      setLoading(false);
    }
  }, [serviceRequestId]);

  const fetchServiceRequest = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get(`/user/service-request/${serviceRequestId}`);
      if (response.data.success) {
        setServiceRequest(response.data.request);
      } else {
        setError("Failed to fetch order details");
      }
    } catch (err) {
      console.error("Error fetching service request:", err);
      setError(err.response?.data?.message || "Failed to load order details");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!serviceRequest?._id) return;

    Alert.alert(
      "Cancel Order",
      "Are you sure you want to cancel this order?",
      [
        { text: "No", style: "cancel" },
        {
          text: "Yes, Cancel",
          style: "destructive",
          onPress: async () => {
            try {
              await apiClient.delete(`/user/service-request/${serviceRequest._id}/cancel`);
              Alert.alert("Success", "Order cancelled successfully");
              navigation.navigate("PlaceOrder");
            } catch (err) {
              console.error("Error cancelling order:", err);
              Alert.alert("Error", "Failed to cancel the order. Please try again.");
            }
          },
        },
      ]
    );
  };

  const handleChat = () => {
    navigation.navigate("ChatScreen", {
      serviceRequestId: serviceRequest._id,
      worker: serviceRequest.serviceProvider
    });
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#B7B5FF" />
        <Text style={styles.loadingText}>Loading order details...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchServiceRequest}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  const worker = serviceRequest?.serviceProvider;
  const requester = serviceRequest?.requester;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerText}>Status: {serviceRequest?.status || "Accepted"}</Text>
        <Text style={styles.headerText}>Date: {formatDate(serviceRequest?.createdAt)}</Text>
        <Text style={styles.headerText}>Time: {serviceRequest?.time || "N/A"}</Text>
      </View>

      {/* Worker Info */}
      <View style={styles.workerBox}>
        <Image
          source={{
            uri: worker?.profilePic || "https://cdn-icons-png.flaticon.com/512/3135/3135715.png",
          }}
          style={styles.workerImage}
        />
        <View style={styles.workerInfo}>
          <Text style={styles.workerName}>
            {worker ? `${worker.firstName} ${worker.lastName}` : "Worker Not Assigned"}
          </Text>
          <Text style={styles.workerDetail}>Skill: {serviceRequest?.typeOfWork || "N/A"}</Text>
          <Text style={styles.workerDetail}>Phone: {worker?.phone || "N/A"}</Text>
        </View>
      </View>

      {/* Customer Details */}
      <View style={styles.detailsBox}>
        <Text style={styles.text}>
          <Text style={styles.label}>Customer Name:</Text> {serviceRequest?.name || "N/A"}
        </Text>
        <Text style={styles.text}>
          <Text style={styles.label}>Address:</Text> {serviceRequest?.address || "N/A"}
        </Text>
        <Text style={styles.text}>
          <Text style={styles.label}>Phone #:</Text> {serviceRequest?.phone || "N/A"}
        </Text>
      </View>

      {/* Order Details */}
      <View style={styles.workBox}>
        <Text style={styles.text}>
          <Text style={styles.label}>Type of Work:</Text> {serviceRequest?.typeOfWork || "N/A"}
        </Text>
        <Text style={styles.text}>
          <Text style={styles.label}>Assigned to favourite worker first:</Text> {serviceRequest?.targetProvider ? "Yes" : "No"}
        </Text>
        <Text style={styles.text}>
          <Text style={styles.label}>Budget:</Text> ₱{serviceRequest?.budget || "N/A"}
        </Text>
        <Text style={styles.text}>
          <Text style={styles.label}>Note:</Text> {serviceRequest?.notes || "None"}
        </Text>
      </View>

      {/* Buttons */}
      <TouchableOpacity style={styles.chatButton} onPress={handleChat}>
        <Text style={styles.chatText}>Chat with Worker</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
        <Text style={styles.cancelText}>Cancel Order</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    paddingTop: 40,
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#B7B5FF",
    paddingVertical: 25,
    paddingHorizontal: 25,
    marginHorizontal: -20,
    marginTop: 50,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  headerText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#333",
  },
  workerBox: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 10,
    padding: 20,
    marginTop: 20,
    marginBottom: 20,
    backgroundColor: "#fafafa",
  },
  workerImage: {
    width: 70,
    height: 70,
    borderRadius: 35,
    marginRight: 15,
  },
  workerInfo: {
    flex: 1,
  },
  workerName: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 4,
  },
  workerDetail: {
    fontSize: 14,
    color: "#444",
    marginBottom: 2,
  },
  detailsBox: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 10,
    marginBottom: 16,
  },
  workBox: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 10,
    marginBottom: 20,
  },
  label: {
    fontWeight: "600",
    color: "#333",
  },
  text: {
    fontSize: 14,
    color: "#444",
    marginBottom: 6,
  },
  chatButton: {
    backgroundColor: "#000",
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: "center",
    marginBottom: 12,
  },
  chatText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
  cancelButton: {
    borderWidth: 1,
    borderColor: "#000",
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: "center",
  },
  cancelText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000",
  },
  centerContent: {
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 15,
    fontSize: 16,
    color: "#666",
  },
  errorText: {
    fontSize: 16,
    color: "#E53935",
    textAlign: "center",
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: "#B7B5FF",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  retryText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
});
