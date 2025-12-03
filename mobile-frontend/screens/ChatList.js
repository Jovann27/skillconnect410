import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { serviceRequestAPI } from "../api";
import { useMainContext } from "../contexts/MainContext";

const maskPhone = (phone) => {
  if (!phone) return "N/A";
  return phone.replace(/\d(?=\d{3})/g, "*");
};

const maskEmail = (email) => {
  if (!email || !email.includes("@")) return "N/A";
  const [user, domain] = email.split("@");
  const maskedUser = user[0] + "*".repeat(Math.max(user.length - 2, 1)) + user.slice(-1);
  return `${maskedUser}@${domain}`;
};

export default function ChatList({ navigation }) {
  const { user, isLoggedIn } = useMainContext();
  const [acceptedRequests, setAcceptedRequests] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isLoggedIn || !user) return;
    fetchAcceptedRequests();
  }, [user, isLoggedIn]);

  const fetchAcceptedRequests = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await serviceRequestAPI.getAcceptedRequests();

      if (response.data.success) {
        const requests = response.data.requests || [];
        // Filter requests that are accepted and can be chatted with
        const chatableRequests = requests.filter(request =>
          request.status === 'Working' || request.status === 'Accepted'
        );
        setAcceptedRequests(chatableRequests);
      } else {
        setError('Failed to load accepted requests');
      }
    } catch (error) {
      console.error('Error fetching accepted requests:', error);
      setError('Failed to load accepted requests. Please try again.');
      setAcceptedRequests([]);
    } finally {
      setIsLoading(false);
    }
  };

  const openChat = (request) => {
    // Navigate to Chat screen with the specific request
    navigation.navigate("Chat", {
      appointmentId: request._id,
      otherUser: request.requester,
      serviceRequest: request
    });
  };

  const renderRequestItem = ({ item }) => {
    const maskedEmail = maskEmail(item.requester?.email);
    const maskedPhone = maskPhone(item.requester?.phone);

    return (
      <TouchableOpacity
        style={styles.requestCard}
        onPress={() => openChat(item)}
      >
        <View style={styles.profileHeader}>
          <Image
            source={item.requester?.profilePic ? { uri: item.requester.profilePic } : require("../assets/default-profile.png")}
            style={styles.avatar}
          />
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>
              {item.requester?.firstName} {item.requester?.lastName || 'Unknown'}
            </Text>
            <Text style={styles.info}>{maskedEmail}</Text>
            <Text style={styles.info}>{maskedPhone}</Text>
          </View>
          <View style={styles.statusContainer}>
            <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
              {item.status}
            </Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.details}>
          <Detail icon="briefcase-outline" label="Service" value={item.typeOfWork} />
          <Detail icon="cash-outline" label="Budget" value={`₱${item.budget}`} />
          <Detail icon="calendar-outline" label="Date" value={new Date(item.createdAt).toLocaleDateString()} />
          <Detail icon="location-outline" label="Location" value={item.address} />
          {item.notes && <Detail icon="document-text-outline" label="Notes" value={item.notes} />}
        </View>

        <View style={styles.chatButtonContainer}>
          <TouchableOpacity
            style={styles.chatButton}
            onPress={() => openChat(item)}
          >
            <Ionicons name="chatbox-ellipses-outline" size={20} color="#fff" />
            <Text style={styles.chatButtonText}>Open Chat</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Working': return '#4CAF50';
      case 'Accepted': return '#FF9800';
      default: return '#666';
    }
  };

  if (!isLoggedIn || !user) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.authRequired}>
          <Ionicons name="lock-closed" size={64} color="#c20884" />
          <Text style={styles.authTitle}>Authentication Required</Text>
          <Text style={styles.authMessage}>Please log in to access your chat list.</Text>
          <TouchableOpacity
            style={styles.loginButton}
            onPress={() => navigation.navigate('Login')}
          >
            <Text style={styles.loginButtonText}>Go to Login</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Accepted Requests</Text>
        <TouchableOpacity
          onPress={fetchAcceptedRequests}
          disabled={isLoading}
        >
          <Ionicons name="refresh" size={24} color="#c20884" />
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#c20884" />
          <Text style={{ color: "#555", marginTop: 10 }}>Loading accepted requests...</Text>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color="#E53935" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={fetchAcceptedRequests}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : acceptedRequests.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="chatbubble-outline" size={64} color="#ccc" />
          <Text style={styles.emptyText}>No accepted requests yet</Text>
          <Text style={styles.emptySubtext}>
            Accepted requests will appear here when you accept client requests and can start chatting.
          </Text>
        </View>
      ) : (
        <FlatList
          data={acceptedRequests}
          keyExtractor={(item) => item._id}
          renderItem={renderRequestItem}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const Detail = ({ label, value, icon }) => (
  <View style={styles.detailRow}>
    <Ionicons name={icon} size={16} color="#c20884" style={{ marginRight: 8 }} />
    <Text style={styles.detailLabel}>{label}:</Text>
    <Text style={styles.detailValue}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8F8F8" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  headerTitle: { fontSize: 18, fontWeight: "700", color: "#333" },
  listContainer: { padding: 16 },
  requestCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#eee",
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  profileHeader: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  avatar: { width: 55, height: 55, borderRadius: 28, backgroundColor: "#eee", marginRight: 12 },
  name: { fontSize: 16, fontWeight: "700", color: "#333" },
  info: { fontSize: 13, color: "#666" },
  statusContainer: { alignItems: "flex-end" },
  statusText: { fontSize: 12, fontWeight: "600", textTransform: "uppercase" },
  divider: { height: 1, backgroundColor: "#eee", marginVertical: 10 },
  details: { marginBottom: 15 },
  detailRow: { flexDirection: "row", alignItems: "center", marginBottom: 5, flexWrap: "wrap" },
  detailLabel: { fontSize: 14, fontWeight: "600", color: "#444", width: 80 },
  detailValue: { fontSize: 14, color: "#333", flexShrink: 1 },
  chatButtonContainer: { alignItems: "center" },
  chatButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#c20884",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 25,
    gap: 8,
  },
  chatButtonText: { color: "#fff", fontWeight: "600", fontSize: 14 },
  loaderContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  errorContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
  },
  errorText: { fontSize: 16, color: "#E53935", textAlign: "center", marginTop: 16, marginBottom: 20 },
  retryButton: {
    backgroundColor: "#c20884",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  retryButtonText: { color: "#fff", fontSize: 14, fontWeight: "600" },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  emptyText: { fontSize: 18, fontWeight: "600", color: "#666", marginTop: 16 },
  emptySubtext: { fontSize: 14, color: "#999", textAlign: "center", marginTop: 8, lineHeight: 20 },
  authRequired: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  authTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
    marginTop: 20,
    marginBottom: 10,
    textAlign: 'center',
  },
  authMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
  },
  loginButton: {
    backgroundColor: '#c20884',
    borderRadius: 25,
    paddingVertical: 15,
    paddingHorizontal: 40,
    alignItems: 'center',
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
