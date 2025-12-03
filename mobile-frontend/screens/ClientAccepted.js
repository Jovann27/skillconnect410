import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  Alert,
  TextInput,
  Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { bookingAPI } from "../api";
import ReceiptModal from "../components/ReceiptModal";
import { useMainContext } from "../contexts/MainContext";

export default function ClientAccepted({ route, navigation }) {
  const { client, orderStatus = "PENDING", bookingId, request } = route.params || {}; // default status
  const { user } = useMainContext();
  const [worker, setWorker] = useState(null);
  const [comment, setComment] = useState("");
  const [media, setMedia] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);

  // Determine user role and completion status
  const isProvider = request?.serviceProvider?._id === user._id;
  const isRequester = request?.requester?._id === user._id;
  const isCompleted = request?.status === "Completed";

  useEffect(() => {
    const loadWorker = async () => {
      const storedUser = await AsyncStorage.getItem("userData");
      if (storedUser) setWorker(JSON.parse(storedUser));
    };
    loadWorker();
  }, []);

  const handleCancel = () => {
    Alert.alert(
      "Cancel Confirmation",
      "Are you sure you want to cancel this accepted client?",
      [
        { text: "No", style: "cancel" },
        { text: "Yes, Cancel", onPress: () => navigation.goBack(), style: "destructive" },
      ]
    );
  };

  const handleCall = () => {
    const phoneNumber = client?.phone || "09123456789";
    Linking.openURL(`tel:${phoneNumber}`);
  };

  const handleChat = () => {
    navigation.navigate("Chat", { role: "worker", other: client });
  };

  const pickMedia = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert("Permission required", "Camera roll permission is needed to select media.");
      return;
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.All,
      allowsMultipleSelection: true,
      quality: 0.7,
    });

    if (!result.canceled) {
      const selected = result.assets || [];
      setMedia((prev) => [...prev, ...selected]);
    }
  };

  const handleSubmitProof = async () => {
    if (media.length === 0) {
      Alert.alert("Required", "Please upload proof of work before completing the job.");
      return;
    }
    if (!bookingId) {
      Alert.alert("Error", "Booking ID is missing.");
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('comment', comment);

      media.forEach((item, index) => {
        const file = {
          uri: item.uri,
          type: item.type || 'image/jpeg',
          name: item.fileName || `proof_${index}.${item.uri.split('.').pop()}`,
        };
        formData.append('proofImages', file);
      });

      const response = await bookingAPI.completeBooking(bookingId, formData);
      if (response.data.success) {
        Alert.alert("Success", "Proof of work submitted successfully!");
        // Show receipt modal after successful completion
        setShowReceiptModal(true);
      } else {
        Alert.alert("Error", "Failed to submit proof of work.");
      }
    } catch (error) {
      console.error("Submit proof error:", error);
      Alert.alert("Error", "Failed to submit proof of work. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // If request is completed, show receipt modal directly
  if (isCompleted) {
    return (
      <ReceiptModal
        request={request}
        isOpen={true}
        onClose={() => navigation.goBack()}
      />
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#f2f2f8" }}>
      {/* Receipt Modal */}
      {showReceiptModal && (
        <ReceiptModal
          request={request}
          isOpen={showReceiptModal}
          onClose={() => {
            setShowReceiptModal(false);
            navigation.goBack();
          }}
        />
      )}

      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 140 }} // space for footer
      >
        {/* Conditional Content Based on User Role */}
        {isProvider ? (
          /* Provider View: Proof of Work Form */
          <>
            {/* Worker Info Card */}
            <View style={styles.section}>
              <View style={styles.card}>
                <View style={styles.profileRow}>
                  <Image
                    source={worker?.photo ? { uri: worker.photo } : require("../assets/default-profile.png")}
                    style={styles.avatar}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.name}>{worker?.name || "Darlene Faith"}</Text>
                    <Text style={styles.info}>
                      <Text style={{ fontWeight: "600" }}>Service: </Text>
                      {worker?.service || "Plumber"}
                    </Text>
                    <Text style={styles.info}>
                      <Text style={{ fontWeight: "600" }}>Rate: </Text>₱{worker?.rate || "300"}
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Client Info Card */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Client Details</Text>
              <View style={styles.card}>
                <View style={styles.profileRow}>
                  <Image
                    source={client?.photo ? { uri: client.photo } : require("../assets/default-profile.png")}
                    style={styles.avatar}
                  />
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <Text style={styles.name}>{client?.name || "Juan Dela Cruz"}</Text>
                    <Text style={styles.info}>{client?.email || "juan@gmail.com"}</Text>
                    <Text style={styles.info}>{client?.phone || "09123456789"}</Text>
                  </View>

                  {/* Chat & Call Buttons */}
                  <View style={styles.buttonContainer}>
                    <TouchableOpacity style={[styles.iconButton, styles.callButton]} onPress={handleCall}>
                      <Ionicons name="call-outline" size={20} color="#2E7D32" />
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.iconButton, styles.chatButton]} onPress={handleChat}>
                      <Ionicons name="chatbox-ellipses-outline" size={20} color="#C2185B" />
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.divider} />

                {/* Service Details */}
                <Detail icon="briefcase-outline" label="Service Needed" value={client?.service || "Yapperist"} />
                <Detail icon="cash-outline" label="Budget" value={`₱${client?.budget || "300"}`} />
                <Detail icon="calendar-outline" label="Date Required" value={client?.date || "10-18-2025"} />
                <Detail icon="time-outline" label="Preferred Time" value={client?.time || "9:00AM - 12:00PM"} />
                <Detail icon="location-outline" label="Location" value={client?.location || "Barangay 1, City"} />

                <View style={styles.divider} />

                <Detail icon="trending-up-outline" label="Estimated Cost" value="₱350" />
                <Detail icon="cash-outline" label="Match Rate" value={`₱${worker?.matchRate || "300"}`} />

                <View style={styles.noteBox}>
                  <Text style={styles.noteLabel}>Note</Text>
                  <Text style={styles.noteText}>
                    {client?.note || "Please arrive 10 minutes early and bring your tools."}
                  </Text>
                </View>
              </View>
            </View>

            {/* Proof of Work Upload */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Upload Proof of Work</Text>
              <View style={styles.card}>
                <Text style={styles.requiredText}>
                  Please upload proof of work before completing the job.
                </Text>

                <TouchableOpacity style={styles.uploadButton} onPress={pickMedia}>
                  <Ionicons name="cloud-upload-outline" size={24} color="#c20884" />
                  <Text style={styles.uploadText}>Attach Photos/Videos</Text>
                </TouchableOpacity>

                {media.length > 0 && (
                  <ScrollView horizontal style={{ marginTop: 10 }}>
                    {media.map((item, idx) => (
                      <Image key={idx} source={{ uri: item.uri }} style={styles.mediaPreview} />
                    ))}
                  </ScrollView>
                )}

                <TextInput
                  style={styles.commentInput}
                  placeholder="Add comment (optional)"
                  multiline
                  value={comment}
                  onChangeText={setComment}
                />
              </View>
            </View>
          </>
        ) : isRequester ? (
          /* Requester View: Service Completed */
          <>
            {/* Service Completed Section */}
            <View style={styles.section}>
              <View style={styles.card}>
                <View style={styles.completedContent}>
                  <Ionicons name="checkmark-circle" size={60} color="#28a745" />
                  <Text style={styles.completedTitle}>Service Completed</Text>
                  <Text style={styles.completedMessage}>
                    Your service request has been completed. How was your experience?
                  </Text>
                  <TouchableOpacity style={styles.reviewButton}>
                    <Ionicons name="star" size={20} color="#fff" />
                    <Text style={styles.reviewButtonText}>Give Review</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </>
        ) : (
          /* Fallback View */
          <View style={styles.section}>
            <View style={styles.card}>
              <Text style={styles.loadingText}>Loading service information...</Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        {isProvider ? (
          orderStatus === "PENDING" || orderStatus === "ACCEPTED" ? (
            <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
              <Text style={styles.cancelText}>Cancel Order</Text>
            </TouchableOpacity>
          ) : orderStatus === "IN_PROGRESS" ? (
            <TouchableOpacity
              style={[styles.submitButton, loading && styles.disabledButton]}
              onPress={handleSubmitProof}
              disabled={loading}
            >
              <Text style={styles.submitText}>
                {loading ? "Submitting..." : "Submit Proof"}
              </Text>
            </TouchableOpacity>
          ) : null
        ) : null}
      </View>
    </SafeAreaView>
  );
}

const Detail = ({ label, value, icon }) => (
  <View style={styles.detailRow}>
    <Ionicons name={icon} size={18} color="#c20884" style={{ marginRight: 10 }} />
    <Text style={styles.detailLabel}>{label}:</Text>
    <Text style={styles.detailValue}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 16, paddingTop: 12 },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 18, fontWeight: "700", color: "#222", marginBottom: 10 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: "#eee",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  profileRow: { flexDirection: "row", alignItems: "center" },
  avatar: { width: 55, height: 55, borderRadius: 27.5, backgroundColor: "#eee", marginRight: 12 },
  name: { fontSize: 16, fontWeight: "700", color: "#333" },
  info: { fontSize: 14, color: "#555", marginTop: 3 },
  buttonContainer: { flexDirection: "row", alignItems: "center", gap: 10 },
  iconButton: { width: 40, height: 40, borderRadius: 12, justifyContent: "center", alignItems: "center", shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 3, shadowOffset: { width: 0, height: 1 }, elevation: 2 },
  callButton: { backgroundColor: "#E8F5E9" },
  chatButton: { backgroundColor: "#FCE4EC" },
  divider: { height: 1, backgroundColor: "#eee", marginVertical: 12 },
  detailRow: { flexDirection: "row", alignItems: "center", marginBottom: 8, flexWrap: "wrap" },
  detailLabel: { fontSize: 14, fontWeight: "600", color: "#444", width: 150 },
  detailValue: { fontSize: 14, color: "#333", flexShrink: 1 },
  noteBox: { backgroundColor: "#fdf0f7", borderRadius: 12, padding: 12, marginTop: 12 },
  noteLabel: { fontSize: 14, fontWeight: "700", color: "#c20884", marginBottom: 4 },
  noteText: { fontSize: 14, color: "#333", lineHeight: 20 },
  requiredText: { fontSize: 14, color: "#c20884", fontWeight: "600", marginBottom: 12 },
  uploadButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#c20884", padding: 12, borderRadius: 12, gap: 8 },
  uploadText: { color: "#c20884", fontSize: 14, fontWeight: "600" },
  mediaPreview: { width: 80, height: 80, borderRadius: 12, marginRight: 8 },
  commentInput: { borderWidth: 1, borderColor: "#ccc", borderRadius: 12, padding: 10, marginTop: 12, minHeight: 60, textAlignVertical: "top" },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: "#fff",
  },
  submitButton: {
    backgroundColor: "#c20884",
    padding: 18,
    borderRadius: 25,
    alignItems: "center",
    marginBottom: 18,
  },
  submitText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  cancelButton: {
    backgroundColor: "#fa0c7bff",
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: "center",
    marginBottom: 18,
  },
  cancelText: { fontSize: 16, fontWeight: "600", color: "#fff" },
  // Completed content styles
  completedContent: {
    alignItems: "center",
    paddingVertical: 40,
  },
  completedTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#28a745",
    marginTop: 20,
    marginBottom: 10,
  },
  completedMessage: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 30,
  },
  reviewButton: {
    backgroundColor: "#ffc107",
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 25,
    gap: 8,
  },
  reviewButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  loadingText: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    paddingVertical: 40,
  },
  disabledButton: {
    opacity: 0.6,
  },
});
