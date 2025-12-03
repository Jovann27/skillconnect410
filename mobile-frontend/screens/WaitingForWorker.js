import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Image,
  ScrollView,
  Animated,
  Linking,
  Platform,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { isRunningInExpoGo } from 'expo';
import * as Notifications from "expo-notifications";
import apiClient from "../api";
import { socket } from "../utils/socket";

const { width } = Dimensions.get("window");

// Configure notification handler only if not in Expo Go
if (!isRunningInExpoGo()) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

const AnimatedWaiting = () => {
  const pulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1.4,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  return (
    <Animated.View style={{ transform: [{ scale: pulse }] }}>
      <View style={styles.pulseCircle}>
        <Ionicons name="location-outline" size={50} color="#C20884" />
      </View>
    </Animated.View>
  );
};

const FloatingAlert = ({ visible, onClose, message = "Order Accepted! Your worker is on the way." }) => {
  const slideAnim = useRef(new Animated.Value(-100)).current;

  useEffect(() => {
    if (visible) {
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }).start();

      const timer = setTimeout(() => {
        Animated.timing(slideAnim, {
          toValue: -100,
          duration: 500,
          useNativeDriver: true,
        }).start(() => onClose());
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <Animated.View style={[styles.alertContainer, { transform: [{ translateY: slideAnim }] }]}>
      <Ionicons name="checkmark-circle" size={28} color="#4CAF50" />
      <Text style={styles.alertText}>{message}</Text>
    </Animated.View>
  );
};

const DetailsCard = ({ title, data }) => {
  return (
    <View style={styles.infoCard}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {data.map((item, index) => (
        <View key={index} style={styles.detailRow}>
          <Ionicons name="checkmark-circle-outline" size={16} color="#666" />
          <Text style={styles.infoText}>
            <Text style={{ fontWeight: "600" }}>{item.label}: </Text>
            {item.value}
          </Text>
        </View>
      ))}
    </View>
  );
};

const WorkerSection = ({ status, worker, onChat, onCall }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (status === "Available" || status === "Matched" || status === "Offered") {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();
    }
  }, [status]);

  if (status === "Matched" || status === "Offered") {
    return (
      <Animated.View style={[styles.workerCard, { opacity: fadeAnim }]}>
        <View style={styles.workerTopRow}>
          <Image
            source={worker?.image ? { uri: worker.image } : require("../assets/default-profile.png")}
            style={styles.workerImage}
          />
          <View style={styles.workerDetails}>
            <Text style={styles.workerName}>{worker?.name || "Juan Dela Cruz"}</Text>
            <Text style={styles.workerSkill}>{worker?.skill || "Plumber"}</Text>
            <Text style={styles.workerPhone}>{worker?.phone || "09123456789"}</Text>
          </View>
          <View style={styles.buttonContainer}>
            <TouchableOpacity style={[styles.iconButton, { backgroundColor: "#E8F5E9" }]} onPress={onCall}>
              <Ionicons name="call-outline" size={20} color="#2E7D32" />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.iconButton, { backgroundColor: "#FCE4EC" }]} onPress={onChat}>
              <Ionicons name="chatbox-ellipses-outline" size={20} color="#C2185B" />
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.workerFooter}>
          <Ionicons name="time-outline" size={18} color="#666" />
          <Text style={styles.workerFooterText}>
            {status === "Offered" ? "Service provider is reviewing your request..." : "Worker is reviewing your request..."}
          </Text>
        </View>
      </Animated.View>
    );
  }

  if (status !== "Found") {
    return (
      <View style={styles.waitingContainer}>
        <AnimatedWaiting />
        <Text style={styles.waitingMain}>Searching for nearby workers...</Text>
        <Text style={styles.waitingSub}>Sit tight while we find the best worker for you.</Text>
      </View>
    );
  }

  return (
    <Animated.View style={[styles.workerCard, { opacity: fadeAnim }]}>
      <View style={styles.workerTopRow}>
        <Image
          source={worker?.image ? { uri: worker.image } : require("../assets/default-profile.png")}
          style={styles.workerImage}
        />
        <View style={styles.workerDetails}>
          <Text style={styles.workerName}>{worker?.name || "Juan Dela Cruz"}</Text>
          <Text style={styles.workerSkill}>{worker?.skill || "Plumber"}</Text>
          <Text style={styles.workerPhone}>{worker?.phone || "09123456789"}</Text>
        </View>
        <View style={styles.buttonContainer}>
          <TouchableOpacity style={[styles.iconButton, { backgroundColor: "#E8F5E9" }]} onPress={onCall}>
            <Ionicons name="call-outline" size={20} color="#2E7D32" />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.iconButton, { backgroundColor: "#FCE4EC" }]} onPress={onChat}>
            <Ionicons name="chatbox-ellipses-outline" size={20} color="#C2185B" />
          </TouchableOpacity>
        </View>
      </View>
      <View style={styles.workerFooter}>
        <Ionicons name="navigate-outline" size={18} color="#666" />
        <Text style={styles.workerFooterText}>
          Worker is reviewing your request...
          {worker?.eta && (
            <Text style={{ fontWeight: "600" }}>
              {"\n"}ETA: {new Date(worker.eta).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
          )}
        </Text>
      </View>
    </Animated.View>
  );
};

const ProviderItem = ({ provider, stats, reviews, onOffer, offeringTo }) => {
  const renderStars = (rating) => {
    return "★".repeat(Math.round(rating)) + "☆".repeat(5 - Math.round(rating));
  };

  return (
    <View style={styles.providerItem}>
      <View style={styles.providerSummary}>
        <Image
          source={provider.profilePic ? { uri: provider.profilePic } : require("../assets/default-profile.png")}
          style={styles.providerImage}
        />
        <View style={styles.providerInfo}>
          <Text style={styles.providerName}>{provider.firstName} {provider.lastName}</Text>
          <View style={styles.providerRating}>
            <Text style={styles.ratingStars}>{renderStars(stats?.averageRating || 0)}</Text>
            <Text style={styles.ratingCount}>({stats?.totalReviews || 0})</Text>
          </View>
          <View style={styles.providerStats}>
            <Text style={styles.providerPrice}>₱{provider.serviceRate || "N/A"}</Text>
            <Text style={[styles.providerStatus, provider.isOnline ? styles.online : styles.offline]}>
              ● {provider.isOnline ? "Online" : "Offline"}
            </Text>
          </View>
        </View>
        <TouchableOpacity
          onPress={() => onOffer(provider._id)}
          disabled={offeringTo === provider._id}
          style={styles.providerButton}
        >
          <Text style={styles.providerButtonText}>
            {offeringTo === provider._id ? "Offering..." : "Offer"}
          </Text>
        </TouchableOpacity>
      </View>
      <View style={styles.providerDetails}>
        <View style={styles.detailSection}>
          <Text style={styles.sectionLabel}>Skills</Text>
          <Text style={styles.sectionText}>{provider.skills?.join(", ") || "No skills listed"}</Text>
        </View>
        <View style={styles.detailSection}>
          <Text style={styles.sectionLabel}>About</Text>
          <Text style={styles.sectionText}>{provider.serviceDescription || "No description available"}</Text>
        </View>
        {reviews?.length > 0 && (
          <View style={styles.detailSection}>
            <Text style={styles.sectionLabel}>Recent Reviews</Text>
            <View style={styles.reviewsList}>
              {reviews.map((review) => (
                <View key={review._id} style={styles.reviewItem}>
                  <Text style={styles.reviewAuthor}>{review.clientName}</Text>
                  <Text style={styles.reviewText}>{review.comment}</Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </View>
    </View>
  );
};

const registerForPushNotificationsAsync = async () => {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") {
    alert("Failed to get push token for notifications!");
    return;
  }

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#FF231F7C",
      sound: "default",
    });
  }
};

export default function WaitingForWorker({ route, navigation }) {
  const { orderData } = route.params || {};
  const [status, setStatus] = useState("Searching");
  const [workerData, setWorkerData] = useState(null);
  const [currentRequest, setCurrentRequest] = useState(null);
  const [matchedProviders, setMatchedProviders] = useState([]);
  const [providerReviews, setProviderReviews] = useState({});
  const [providerStats, setProviderStats] = useState({});
  const [offeringTo, setOfferingTo] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAlert, setShowAlert] = useState(false);
  const [showAcceptedAlert, setShowAcceptedAlert] = useState(false);
  const [showMatchedAlert, setShowMatchedAlert] = useState(false);

  useEffect(() => {
    if (!isRunningInExpoGo()) {
      registerForPushNotificationsAsync();
    }
  }, []);

  // Fetch matched providers
  const fetchMatchedProviders = async (request) => {
    if (!request || !request.typeOfWork) return;
    try {
      const params = {
        typeOfWork: request.typeOfWork
      };

      // Include budget if available for better matching
      if (request.budget && request.budget > 0) {
        params.budget = request.budget;
      }

      const response = await apiClient.get('/user/service-providers', { params });
      const matchedProviders = response.data?.workers || [];
      setMatchedProviders(matchedProviders);
    } catch (error) {
      console.error("Failed to fetch matched providers:", error);
      setMatchedProviders([]);
    }
  };

  // Fetch reviews and stats for providers
  const fetchProviderData = async (providers) => {
    if (!providers?.length) return;
    const reviews = {};
    const stats = {};
    const batchSize = 5;
    for (let i = 0; i < providers.length; i += batchSize) {
      const batch = providers.slice(i, i + batchSize);
      await Promise.all(batch.map(async (provider) => {
        if (!provider?._id) return;
        try {
          const statsResponse = await apiClient.get(`/review/stats/${provider._id}`);
          stats[provider._id] = statsResponse.data?.stats || { totalReviews: 0, averageRating: 0 };
          const reviewsResponse = await apiClient.get(`/review/user/${provider._id}`);
          const reviewData = reviewsResponse.data?.reviews || [];
          reviews[provider._id] = Array.isArray(reviewData) ? reviewData.slice(0, 3) : [];
        } catch (err) {
          console.error('Error fetching provider data:', err);
          stats[provider._id] = { totalReviews: 0, averageRating: 0 };
          reviews[provider._id] = [];
        }
      }));
    }
    setProviderStats(stats);
    setProviderReviews(reviews);
  };

  // Offer request to specific provider
  const offerRequestToProvider = async (providerId) => {
    if (!currentRequest?._id || !providerId) return Alert.alert("Unable to process request.");
    const selectedProvider = matchedProviders.find(p => p._id === providerId);
    if (!selectedProvider) return Alert.alert("Provider not found.");

    setOfferingTo(providerId);
    try {
      await apiClient.post('/user/offer-to-provider', {
        providerId,
        requestId: currentRequest._id
      });
      const providerName = `${selectedProvider.firstName || ''} ${selectedProvider.lastName || ''}`.trim();
      Alert.alert("Success", `Request offered to ${providerName || 'provider'}! Waiting for response...`);
      const refreshResponse = await apiClient.get(`/user/service-request/${currentRequest._id}`);
      if (refreshResponse.data?.request) setCurrentRequest(refreshResponse.data.request);
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || "Failed to offer request";
      Alert.alert("Error", `${errorMessage}. Please try again.`);
    } finally {
      setOfferingTo(null);
    }
  };

  useEffect(() => {
    if (status === "Found") {
      setShowAcceptedAlert(true);
    }
  }, [status]);

  useEffect(() => {
    if (!orderData) {
      setError("No request data available");
      setIsLoading(false);
      return;
    }

    const initialize = async () => {
      setIsLoading(true);
      setError(null);
      setCurrentRequest(orderData);
      await fetchMatchedProviders(orderData);
      if (orderData.status === "Working") {
        setStatus("Found");
        if (orderData.serviceProvider) {
          setWorkerData({
            name: `${orderData.serviceProvider.firstName} ${orderData.serviceProvider.lastName}`,
            skill: orderData.typeOfWork,
            phone: orderData.serviceProvider.phone,
            image: orderData.serviceProvider.profilePic || "/default-profile.png",
            eta: orderData.eta,
          });
        }
      } else if (orderData.status === "Offered") {
        setStatus("Offered");
        if (orderData.targetProvider) {
          setWorkerData({
            name: `${orderData.targetProvider.firstName} ${orderData.targetProvider.lastName}`,
            skill: orderData.typeOfWork,
            phone: orderData.targetProvider.phone,
            image: orderData.targetProvider.profilePic || "/default-profile.png",
          });
        }
      }
      setIsLoading(false);
    };

    initialize();

    if (socket && orderData._id) {
      socket.emit("join-service-request", orderData._id);
      const handleUpdate = async (updateData) => {
        if (updateData?.requestId !== orderData._id) return;
        try {
          const response = await apiClient.get(`/user/service-request/${orderData._id}`);
          const updatedRequest = response.data?.request;
          if (updatedRequest) {
            setCurrentRequest(updatedRequest);
            if (["Working", "Completed"].includes(updatedRequest.status)) {
              setStatus("Found");
              if (updatedRequest.serviceProvider) {
                setWorkerData({
                  name: `${updatedRequest.serviceProvider.firstName || ''} ${updatedRequest.serviceProvider.lastName || ''}`.trim(),
                  skill: updatedRequest.typeOfWork,
                  phone: updatedRequest.serviceProvider.phone,
                  image: updatedRequest.serviceProvider.profilePic || "/default-profile.png",
                  eta: updatedRequest.eta,
                });
              }
            } else if (updatedRequest.status === "Offered") {
              setStatus("Offered");
              if (updatedRequest.targetProvider) {
                setWorkerData({
                  name: `${updatedRequest.targetProvider.firstName || ''} ${updatedRequest.targetProvider.lastName || ''}`.trim(),
                  skill: updatedRequest.typeOfWork,
                  phone: updatedRequest.targetProvider.phone,
                  image: updatedRequest.targetProvider.profilePic || "/default-profile.png",
                });
              }
            } else if (updatedRequest.status === "Waiting") {
              setStatus("Searching");
            }
          }
        } catch (err) {
          console.error("Failed to update request via socket:", err);
        }
      };
      socket.on("service-request-updated", handleUpdate);
      return () => {
        socket.off("service-request-updated", handleUpdate);
        socket.emit("leave-service-request", orderData._id);
      };
    }
  }, [orderData]);

  useEffect(() => {
    if (matchedProviders.length > 0) {
      fetchProviderData(matchedProviders);
    }
  }, [matchedProviders]);

  const handleCancel = async () => {
    Alert.alert("Cancel Order", "Are you sure you want to cancel?", [
      { text: "No", style: "cancel" },
      {
        text: "Yes",
        style: "destructive",
        onPress: async () => {
          try {
            await apiClient.delete(`/user/service-request/${orderData?.id}/cancel`);
            navigation.navigate("PlaceOrder");
          } catch (error) {
            console.log("Error cancelling request:", error);
            Alert.alert("Error", "Failed to cancel request. Please try again.");
          }
        }
      },
    ]);
  };

  const customerDetails = [
    { label: "Name", value: currentRequest?.name || "N/A" },
    { label: "Address", value: currentRequest?.address || "N/A" },
    { label: "Phone", value: currentRequest?.phone || "N/A" },
  ];

  const orderDetails = [
    { label: "Service Type", value: currentRequest?.typeOfWork || "N/A" },
    { label: "Priority", value: currentRequest?.targetProvider ? "Favorite Worker" : "Any Available" },
    { label: "Budget", value: `₱${currentRequest?.budget || "N/A"}` },
    { label: "Date", value: currentRequest?.createdAt ? new Date(currentRequest.createdAt).toLocaleDateString() : "N/A" },
    { label: "Note", value: currentRequest?.notes || "None" },
  ];

  const matchedServices = currentRequest?.matchedProviders?.map(provider => ({
    label: provider.serviceType || "Service",
    value: `₱${provider.rate || "N/A"}`,
  })) || [];

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <View style={styles.loadingContent}>
          <View style={styles.spinner}></View>
          <Text style={styles.loadingTitle}>Loading your request</Text>
          <Text style={styles.loadingText}>Please wait a moment...</Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle" size={48} color="#dc3545" />
        <Text style={styles.errorTitle}>Error</Text>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.refreshButton} onPress={() => window.location.reload()}>
          <Ionicons name="refresh" size={16} color="white" />
          <Text style={styles.refreshText}>Refresh Page</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FloatingAlert visible={showAlert} onClose={() => setShowAlert(false)} />
      <FloatingAlert visible={showAcceptedAlert} onClose={() => setShowAcceptedAlert(false)} message="Worker has been assigned! Get ready for service." />
      <FloatingAlert visible={showMatchedAlert} onClose={() => setShowMatchedAlert(false)} message="Service provider is reviewing your request." />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        <WorkerSection
          status={status}
          worker={workerData}
          onChat={() => navigation.navigate("Chat", { role: "client", other: workerData })}
          onCall={() => Linking.openURL(`tel:${workerData?.phone}`)}
        />
        <DetailsCard title="Customer Details" data={customerDetails} />
        <DetailsCard title="Order Details" data={orderDetails} />

        {/* Providers List */}
        <View style={styles.providersCard}>
          <Text style={styles.providersTitle}>
            {status === "Found" ? `${matchedProviders.length} Other Available Providers` : `${matchedProviders.length} Matched Providers`}
          </Text>
          {matchedProviders.length > 0 ? (
            <View style={styles.providersList}>
              {matchedProviders.map((provider) => (
                <ProviderItem
                  key={provider._id}
                  provider={provider}
                  stats={providerStats[provider._id]}
                  reviews={providerReviews[provider._id]}
                  onOffer={offerRequestToProvider}
                  offeringTo={offeringTo}
                />
              ))}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="location-outline" size={48} color="#999" />
              <Text style={styles.emptyTitle}>Finding providers</Text>
              <Text style={styles.emptyText}>We're matching your request with skilled professionals</Text>
            </View>
          )}
        </View>

        {/* Give Review Button */}
        {status === "Found" && (
          <View style={{ marginBottom: 20 }}>
            <TouchableOpacity
              style={styles.reviewButton}
              onPress={() => navigation.navigate("GiveReview", { order: orderData })}
            >
              <Text style={styles.reviewText}>Give Review</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>


      {/* Footer Cancel Button */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
          <Text style={styles.cancelText}>Cancel Order</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FAFAFA", paddingHorizontal: 20, paddingTop: 20 },
  pulseCircle: {
    backgroundColor: "#FCE4EC",
    borderRadius: 50,
    padding: 20,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#C20884",
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 5,
  },
  alertContainer: {
    position: "absolute",
    top: 20,
    left: width * 0.05,
    right: width * 0.05,
    backgroundColor: "#E8FDEB",
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
    zIndex: 100,
  },
  alertText: { marginLeft: 10, color: "#2E7D32", fontWeight: "600", fontSize: 14 },
  waitingContainer: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
    paddingVertical: 30,
    borderRadius: 15,
    marginBottom: 20,
    elevation: 2,
  },
  waitingMain: { fontSize: 16, fontWeight: "700", marginTop: 15, color: "#333" },
  waitingSub: { fontSize: 13, color: "#777", marginTop: 4 },
  workerCard: {
    backgroundColor: "#fff",
    borderRadius: 15,
    padding: 18,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
    marginBottom: 20,
  },
  workerTopRow: { flexDirection: "row", alignItems: "center" },
  workerImage: { width: 70, height: 70, borderRadius: 35, marginRight: 12, backgroundColor: "#EEE" },
  workerDetails: { flex: 1 },
  workerName: { fontSize: 18, fontWeight: "700", color: "#111" },
  workerSkill: { fontSize: 14, color: "#555", marginTop: 3 },
  workerPhone: { fontSize: 13, color: "#777", marginTop: 2 },
  buttonContainer: { flexDirection: "row", alignItems: "center" },
  iconButton: { borderRadius: 12, padding: 10, marginLeft: 8 },
  workerFooter: { flexDirection: "row", alignItems: "center", marginTop: 10, borderTopWidth: 1, borderTopColor: "#EEE", paddingTop: 10 },
  workerFooterText: { marginLeft: 8, color: "#555", fontSize: 13 },
  infoCard: { backgroundColor: "#fff", borderRadius: 15, padding: 18, paddingVertical: 20, marginBottom: 15, elevation: 2 },
  sectionTitle: { fontSize: 16, fontWeight: "700", marginBottom: 10, color: "#333" },
  detailRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 6 },
  infoText: { fontSize: 14, color: "#444", flexShrink: 1 },
  footer: {
    position: "absolute",
    bottom: 50,
    left: 20,
    right: 20,
  },
  reviewButton: {
  flexDirection: "row",
  justifyContent: "center",
  alignItems: "center",
  backgroundColor: "#db5191ff",
  borderRadius: 12,
  paddingVertical: 16,
  elevation: 2,
},
reviewText: {
  color: "#fff",
  fontWeight: "700",
  fontSize: 15,
  marginLeft: 8,
},
  cancelButton: { flexDirection: "row", justifyContent: "center", alignItems: "center", backgroundColor: "#db5191ff", borderRadius: 12, paddingVertical: 18 },
  cancelText: { color: "#ffffffff", fontWeight: "700", fontSize: 15, marginLeft: 6 },
  providersCard: { backgroundColor: "#fff", borderRadius: 15, padding: 18, marginBottom: 15, elevation: 2 },
  providersTitle: { fontSize: 16, fontWeight: "700", marginBottom: 15, color: "#333" },
  providersList: { gap: 10 },
  providerItem: { borderWidth: 1, borderColor: "#e0e0e0", borderRadius: 8, overflow: "hidden" },
  providerSummary: { flexDirection: "row", alignItems: "center", padding: 12, backgroundColor: "white" },
  providerImage: { width: 50, height: 50, borderRadius: 25, marginRight: 12 },
  providerInfo: { flex: 1 },
  providerName: { fontSize: 16, fontWeight: "600", color: "#1a1a1a", marginBottom: 4 },
  providerRating: { flexDirection: "row", alignItems: "center", marginBottom: 4 },
  ratingStars: { color: "#ffc107", fontSize: 14 },
  ratingCount: { fontSize: 14, color: "#666", marginLeft: 4 },
  providerStats: { flexDirection: "row", alignItems: "center", gap: 8 },
  providerPrice: { fontSize: 14, fontWeight: "600", color: "#667eea" },
  providerStatus: { fontSize: 12 },
  online: { color: "#28a745" },
  offline: { color: "#999" },
  providerButton: { paddingHorizontal: 16, paddingVertical: 8, backgroundColor: "#667eea", borderRadius: 6 },
  providerButtonText: { color: "white", fontWeight: "500", fontSize: 14 },
  providerDetails: { padding: 12, backgroundColor: "#f9f9f9", gap: 10 },
  detailSection: { gap: 4 },
  sectionLabel: { fontSize: 12, fontWeight: "600", color: "#666", textTransform: "uppercase", letterSpacing: 0.5 },
  sectionText: { fontSize: 14, color: "#1a1a1a", lineHeight: 20 },
  reviewsList: { gap: 8 },
  reviewItem: { backgroundColor: "white", padding: 8, borderRadius: 6, borderLeftWidth: 3, borderLeftColor: "#667eea" },
  reviewAuthor: { fontSize: 13, fontWeight: "600", color: "#1a1a1a", marginBottom: 2 },
  reviewText: { fontSize: 13, color: "#666", lineHeight: 18 },
  emptyState: { alignItems: "center", paddingVertical: 40 },
  emptyTitle: { fontSize: 16, fontWeight: "600", color: "#1a1a1a", marginTop: 12, marginBottom: 4 },
  emptyText: { fontSize: 14, color: "#666", textAlign: "center" },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#FAFAFA" },
  loadingContent: { alignItems: "center", backgroundColor: "white", padding: 40, borderRadius: 15, elevation: 2 },
  spinner: { width: 50, height: 50, borderWidth: 4, borderColor: "#f0f0f0", borderTopColor: "#667eea", borderRadius: 25, marginBottom: 20 },
  loadingTitle: { fontSize: 18, fontWeight: "700", color: "#1a1a1a", marginBottom: 8 },
  loadingText: { fontSize: 14, color: "#666" },
  errorContainer: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#FAFAFA", padding: 20 },
  errorTitle: { fontSize: 24, fontWeight: "700", color: "#dc3545", marginTop: 16, marginBottom: 8 },
  errorText: { fontSize: 16, color: "#666", textAlign: "center", marginBottom: 24 },
  refreshButton: { flexDirection: "row", alignItems: "center", backgroundColor: "#667eea", paddingHorizontal: 20, paddingVertical: 12, borderRadius: 8, gap: 8 },
  refreshText: { color: "white", fontWeight: "600", fontSize: 14 },
});
