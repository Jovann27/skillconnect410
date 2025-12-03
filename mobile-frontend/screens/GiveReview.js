import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Image,
  ScrollView,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useMainContext } from "../contexts/MainContext";
import apiClient from "../api";

export default function GiveReview({ route, navigation }) {
  const { api } = useMainContext();
  const { order } = route.params || {};

  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [photos, setPhotos] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [serviceRequest, setServiceRequest] = useState(null);
  const [bookingId, setBookingId] = useState(null);
  const [workerData, setWorkerData] = useState({
    name: "Worker",
    skill: "Service",
    image: "",
  });

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
    });

    if (!result.canceled) {
      setPhotos([...photos, result.assets[0].uri]); // Add new photo
    }
  };

  // Fetch service request and booking data on mount
  useEffect(() => {
    const fetchData = async () => {
      if (!order?.id) {
        Alert.alert("Error", "Order information is missing.");
        navigation.goBack();
        return;
      }

      try {
        setLoading(true);

        // Fetch the full service request details
        const requestResponse = await apiClient.get(`/user/service-request/${order.id}`);
        if (requestResponse.data.success) {
          const request = requestResponse.data.request;
          setServiceRequest(request);

          // Extract worker information from service request
          if (request.serviceProvider) {
            const provider = request.serviceProvider;
            setWorkerData({
              name: `${provider.firstName || ""} ${provider.lastName || ""}`.trim() || "Worker",
              skill: request.typeOfWork || "Service",
              image: provider.profilePic || "",
            });
          } else {
            // Fallback to order data if serviceProvider not populated
            setWorkerData({
              name: order.workerName || "Worker",
              skill: request.typeOfWork || order.typeOfWork || "Service",
              image: order.workerImage || "",
            });
          }

          // Fetch bookings to find the one associated with this service request
          // Try multiple approaches since bookings endpoint only returns provider bookings
          let foundBookingId = null;

          // Approach 1: Try to get booking from order data if available
          if (order.bookingId) {
            foundBookingId = order.bookingId;
          }

          // Approach 2: Try provider bookings endpoint
          if (!foundBookingId) {
            try {
              const bookingsResponse = await apiClient.get("/user/bookings");
              if (bookingsResponse.data.success) {
                const bookings = bookingsResponse.data.bookings;
                // Find booking that matches this service request
                const matchingBooking = bookings.find(
                  (booking) => 
                    booking.serviceRequest?._id === request._id || 
                    booking.serviceRequest === request._id ||
                    String(booking.serviceRequest) === String(request._id)
                );

                if (matchingBooking) {
                  foundBookingId = matchingBooking._id;
                }
              }
            } catch (bookingError) {
              console.log("Provider bookings not available or error:", bookingError.message);
            }
          }

          // Approach 3: Try chat list endpoint which includes bookings for both requester and provider
          if (!foundBookingId) {
            try {
              const chatListResponse = await apiClient.get("/user/chat-list");
              if (chatListResponse.data.success) {
                const chatList = chatListResponse.data.chatList;
                // Find chat/booking that matches this service request
                const matchingChat = chatList.find(
                  (chat) => 
                    chat.serviceRequest?._id === request._id || 
                    chat.serviceRequest === request._id ||
                    String(chat.serviceRequest) === String(request._id)
                );

                if (matchingChat && matchingChat.appointmentId) {
                  foundBookingId = matchingChat.appointmentId;
                }
              }
            } catch (chatError) {
              console.log("Chat list not available or error:", chatError.message);
            }
          }

          if (foundBookingId) {
            setBookingId(foundBookingId);
          } else {
            // Check if service request has been accepted
            if (!request.serviceProvider) {
              Alert.alert(
                "Service Not Accepted",
                "This service request has not been accepted yet. You can only review after a service provider accepts your request.",
                [{ text: "OK", onPress: () => navigation.goBack() }]
              );
            } else {
              // Service request has been accepted but booking not found
              // This might be a backend issue
              console.warn("Booking not found for service request:", request._id);
              Alert.alert(
                "Warning",
                "Unable to find booking information. The service request may not be ready for review yet.",
                [{ text: "OK" }]
              );
            }
          }
        } else {
          Alert.alert("Error", "Failed to load service request details.");
          navigation.goBack();
        }
      } catch (error) {
        console.error("Error fetching data:", error);
        Alert.alert("Error", "Failed to load order information.");
        navigation.goBack();
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [order?.id]);

  const removePhoto = (index) => {
    const updated = [...photos];
    updated.splice(index, 1);
    setPhotos(updated);
  };

  const handleSubmit = async () => {
    if (rating === 0) {
      Alert.alert("Error", "Please select a star rating.");
      return;
    }

    if (!bookingId) {
      Alert.alert(
        "Error", 
        "Booking information is missing. Please ensure the service request has been accepted by a service provider.",
        [{ text: "OK" }]
      );
      return;
    }

    // Comments are optional in the backend, but we'll allow empty comments
    // Users can submit just a rating if they prefer

    setIsSubmitting(true);

    try {
      const reviewData = {
        bookingId: bookingId,
        rating,
        comments: comment.trim(),
        // Note: Images are not currently supported in the backend review system
      };

      const response = await api.createReview(reviewData);

      if (response.data.success) {
        Alert.alert("Success", "Thank you for your review!", [
          { text: "OK", onPress: () => navigation.goBack() }
        ]);
      } else {
        Alert.alert("Error", response.data.message || "Failed to submit review. Please try again.");
      }
    } catch (error) {
      console.error("Error submitting review:", error);
      const errorMessage = error.response?.data?.message || error.message || "Failed to submit review. Please try again.";
      Alert.alert("Error", errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator size="large" color="#db5191ff" />
        <Text style={{ marginTop: 10, color: "#666" }}>Loading order details...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#FAFAFA" }}>
      <ScrollView contentContainerStyle={styles.container}>
        {/* Close */}
        <TouchableOpacity style={styles.closeBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="close" size={28} color="#333" />
        </TouchableOpacity>

        <Text style={styles.header}>Rate Your Worker</Text>

        {/* Worker Card */}
        <View style={styles.workerCard}>
          <Image
            source={
              workerData.image
                ? { uri: workerData.image }
                : require("../assets/default-profile.png")
            }
            style={styles.workerImage}
          />

          <View>
            <Text style={styles.workerName}>{workerData.name}</Text>
            <Text style={styles.workerSkill}>{workerData.skill}</Text>
          </View>
        </View>

     {/* Star Rating */}
    <Text style={styles.label}>How was your experience?</Text>
    <View style={styles.starsRow}>
    {[1, 2, 3, 4, 5].map((star) => (
        <TouchableOpacity key={star} onPress={() => setRating(star)}>
        <Ionicons
            name="star"
            size={45}
            color={star <= rating ? "#f6fa08ff" : "#ccc"} // yellow if selected, light gray if not
        />
        </TouchableOpacity>
    ))}
    </View>






      {/* Comment */}
      <Text style={styles.label}>Write a Review</Text>
      <TextInput
        style={styles.textBox}
        placeholder="Share your experience..."
        value={comment}
        onChangeText={setComment}
        multiline
      />

      {/* Photos */}
      <Text style={styles.label}>Add Photos (Optional)</Text>

      <TouchableOpacity style={styles.addPhotoBtn} onPress={pickImage}>
        <Ionicons name="camera-outline" size={26} color="#db5191ff" />
        <Text style={styles.addPhotoText}>Upload Photo</Text>
      </TouchableOpacity>

      {photos.map((uri, index) => (
        <View key={index} style={styles.photoContainer}>
          <Image source={{ uri }} style={styles.previewImage} />
          <TouchableOpacity
            style={styles.removeBtn}
            onPress={() => removePhoto(index)}
          >
            <Ionicons name="trash-outline" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      ))}

      {/* Add padding at bottom so scroll does not hide content */}
      <View style={{ height: 120 }} />
    </ScrollView>

    {/* FIXED FOOTER BUTTON */}
    <View style={styles.footer}>
      <TouchableOpacity
        style={[styles.submitBtn, isSubmitting && styles.submitBtnDisabled]}
        onPress={handleSubmit}
        disabled={isSubmitting}
      >
        <Text style={styles.submitText}>
          {isSubmitting ? "Submitting..." : "Submit Review"}
        </Text>
      </TouchableOpacity>
    </View>
  </View>
);
}

const styles = StyleSheet.create({
  container: {
   
    backgroundColor: "#FAFAFA",
    padding: 20,
    paddingTop: 60,
  },
  closeBtn: {
    position: "absolute",
    top: 25,
    right: 20,
    zIndex: 10,
  },

  header: {
    fontSize: 22,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 20,
    color: "#222",
  },

  workerCard: {
    flexDirection: "row",
    backgroundColor: "#FFF",
    padding: 16,
    borderRadius: 16,
    elevation: 2,
    marginBottom: 30,
    alignItems: "center",
  },

  workerImage: {
    width: 65,
    height: 65,
    borderRadius: 40,
    marginRight: 15,
    backgroundColor: "#EEE",
  },

  workerName: {
    fontSize: 18,
    fontWeight: "700",
  },

  workerSkill: {
    color: "#555",
    marginTop: 3,
  },

  label: {
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 8,
    marginTop: 10,
    color: "#444",
  },

  starsRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 25,

},


  textBox: {
    height: 130,
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 14,
    textAlignVertical: "top",
    elevation: 2,
  },

  addPhotoBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#db5191ff",
    borderRadius: 12,
    borderStyle: "dashed",
    marginBottom: 10,
  },

  addPhotoText: {
    marginLeft: 10,
    color: "#db5191ff",
    fontWeight: "600",
  },

  photoContainer: {
    marginBottom: 10,
  },

  previewImage: {
    width: "100%",
    height: 180,
    borderRadius: 12,
  },

  removeBtn: {
    backgroundColor: "#db5191ff",
    position: "absolute",
    bottom: 12,
    right: 12,
    padding: 8,
    borderRadius: 20,
  },

  footer: {
  position: "absolute",
  bottom: 0,
  left: 0,
  right: 0,
  backgroundColor: "#fff",
  padding: 16,
  borderTopWidth: 1,
  borderTopColor: "#ddd",
  elevation: 10,
},

submitBtn: {
  backgroundColor: "#db5191ff",
  paddingVertical: 16,
  borderRadius: 12,
  alignItems: "center",
  marginBottom: 18,
},

submitBtnDisabled: {
  backgroundColor: "#ccc",
},

submitText: {
  color: "#FFF",
  fontWeight: "700",
  fontSize: 16,
},

});
