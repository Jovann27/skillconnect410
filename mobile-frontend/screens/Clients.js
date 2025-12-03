import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useMainContext } from "../contexts/MainContext";

export default function Clients({ navigation }) {
  const { api, user } = useMainContext();
  const [serviceRequests, setServiceRequests] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null); // Track which request is being processed

  // Fetch service requests on component mount
  useEffect(() => {
    fetchServiceRequests();
  }, []);

  const fetchServiceRequests = async () => {
    try {
      setIsLoading(true);
      const response = await api.getServiceRequests();
      if (response.data.success) {
        setServiceRequests(response.data.requests);
      }
    } catch (error) {
      console.error('Error fetching service requests:', error);
      Alert.alert('Error', 'Failed to load service requests');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAccept = async (request) => {
    try {
      setActionLoading(request._id);
      const response = await api.acceptServiceRequest(request._id);

      if (response.data.success) {
        Alert.alert("Request Accepted", `You accepted ${request.fullName}'s request.`, [
          {
            text: "OK",
            onPress: () => navigation.navigate("ClientAccepted", { requestId: request._id }),
          },
        ]);
        // Refresh the list to remove the accepted request
        fetchServiceRequests();
      } else {
        Alert.alert("Error", "Failed to accept the request. Please try again.");
      }
    } catch (error) {
      console.error("Error accepting service request:", error);
      Alert.alert("Error", "Failed to accept the request. Please try again.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleDecline = async (request) => {
    try {
      setActionLoading(request._id);
      const response = await api.ignoreServiceRequest(request._id);

      if (response.data.success) {
        Alert.alert("Request Declined", `You declined ${request.fullName}'s request.`);
        // Refresh the list to remove the declined request
        fetchServiceRequests();
      } else {
        Alert.alert("Error", "Failed to decline the request. Please try again.");
      }
    } catch (error) {
      console.error("Error declining service request:", error);
      Alert.alert("Error", "Failed to decline the request. Please try again.");
    } finally {
      setActionLoading(null);
    }
  };

  const renderServiceRequest = ({ item }) => (
    <View style={styles.card}>
      {/* Client Header */}
      <View style={styles.profileHeader}>
        <Image
          source={
            item.requester?.profilePic
              ? { uri: item.requester.profilePic }
              : require("../assets/default-profile.png")
          }
          style={styles.avatar}
        />
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{item.fullName || `${item.requester?.firstName} ${item.requester?.lastName}`}</Text>
          <Text style={styles.info}>{item.requester?.email}</Text>
          <Text style={styles.info}>{item.requester?.phone || 'Phone not provided'}</Text>
        </View>
      </View>

      <View style={styles.divider} />

      {/* Service Info */}
      <View style={styles.details}>
        <Detail icon="briefcase-outline" label="Service Needed" value={item.typeOfWork || 'Not specified'} />
        <Detail icon="cash-outline" label="Budget" value={`₱${item.budget || 0}`} />
        <Detail icon="calendar-outline" label="Date Created" value={item.createdAt ? new Date(item.createdAt).toLocaleDateString() : 'Not specified'} />
        <Detail icon="time-outline" label="Preferred Time" value={item.time || 'Not specified'} />
        {item.notes && <Detail icon="document-text-outline" label="Notes" value={item.notes} />}
      </View>

      {/* Action Buttons */}
      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={[styles.button, styles.accept, actionLoading === item._id && { opacity: 0.6 }]}
          onPress={() => handleAccept(item)}
          disabled={actionLoading === item._id}
        >
          {actionLoading === item._id ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Ionicons name="checkmark-circle" size={18} color="#fff" />
          )}
          <Text style={styles.buttonText}>
            {actionLoading === item._id ? 'Accepting...' : 'Accept'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.decline, actionLoading === item._id && { opacity: 0.6 }]}
          onPress={() => handleDecline(item)}
          disabled={actionLoading === item._id}
        >
          {actionLoading === item._id ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Ionicons name="close-circle" size={18} color="#fff" />
          )}
          <Text style={styles.buttonText}>
            {actionLoading === item._id ? 'Declining...' : 'Decline'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (isLoading)
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#c20884" />
        <Text style={{ color: "#555", marginTop: 10 }}>Loading service requests...</Text>
      </View>
    );

  return (
    <View style={styles.container}>
      {serviceRequests.length === 0 ? (
        <Text style={styles.noData}>No service requests found.</Text>
      ) : (
        <FlatList
          data={serviceRequests}
          keyExtractor={(item) => item._id}
          renderItem={renderServiceRequest}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

/* Reusable detail line with icon */
const Detail = ({ label, value, icon }) => (
  <View style={styles.detailRow}>
    <Ionicons name={icon} size={16} color="#c20884" style={{ marginRight: 8 }} />
    <Text style={styles.detailLabel}>{label}:</Text>
    <Text style={styles.detailValue}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fb",
    padding: 15,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#eee",
    padding: 18,
    marginBottom: 18,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  profileHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#eee",
    marginRight: 14,
  },
  name: {
    fontSize: 17,
    fontWeight: "700",
    color: "#333",
  },
  info: {
    fontSize: 13,
    color: "#666",
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: "#eee",
    marginVertical: 10,
  },
  details: {
    marginBottom: 15,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
    flexWrap: "wrap",
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#444",
    width: 130,
  },
  detailValue: {
    fontSize: 14,
    color: "#333",
    flexShrink: 1,
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
  },
  button: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 10,
    borderRadius: 25,
    marginHorizontal: 5,
  },
  accept: {
    backgroundColor: "#4CAF50",
  },
  decline: {
    backgroundColor: "#E57373",
  },
  buttonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 15,
    marginLeft: 6,
  },
  noData: {
    textAlign: "center",
    color: "#777",
    marginTop: 50,
    fontSize: 16,
  },
});
