import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import apiClient from "../api";
import { useMainContext } from "../contexts/MainContext";

const { width } = Dimensions.get("window");

export default function ProfileReviews({ route, navigation }) {
  const { api } = useMainContext();
  const [reviews, setReviews] = useState([]);
  const userId = route.params?.userId || "123";
  const fromFavorites = route.params?.fromFavorites || false;

  const fetchReviews = async () => {
    try {
      const response = await apiClient.get(`/review/user/${userId}`);
      setReviews(response.data.reviews);
    } catch (error) {
      console.log("Error fetching reviews:", error);
      setReviews([]);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, []);

  const renderStars = (rating) => (
    <View style={styles.starsRow}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Ionicons
          key={i}
          name={i <= rating ? "star" : "star-outline"}
          size={16}
          color="#facc15"
        />
      ))}
    </View>
  );

  const renderReview = ({ item }) => (
    <View style={styles.reviewCard}>
      {/* Header */}
      <View style={styles.reviewHeader}>
        <Image
          source={require("../assets/default-profile.png")}
          style={styles.clientProfileImage}
        />
        <View style={{ marginLeft: 10, flex: 1 }}>
          <Text style={styles.clientName}>{item.clientName}</Text>
          <Text style={styles.clientService}>{item.service}</Text>
        </View>
      </View>

      {/* ⭐ Rating Above Comment */}
      <View style={{ marginTop: 6 }}>{renderStars(item.rating)}</View>

      {/* Comment */}
      <Text style={styles.commentText}>{item.comment}</Text>

      {/* Photos (if any) */}
      {item.images?.length > 0 && (
        <View style={styles.imagesRow}>
          {item.images.map((uri, idx) => (
            <Image key={idx} source={{ uri }} style={styles.reviewImage} />
          ))}
        </View>
      )}
    </View>
  );

  const handleButtonPress = async () => {
    if (fromFavorites) {
      try {
        const response = await api.removeFromFavourites(userId);
        if (response.data.success) {
          Alert.alert("Removed", "Worker has been removed from your favorites.", [
            {
              text: "OK",
              onPress: () => navigation.goBack(),
            },
          ]);
        } else {
          Alert.alert("Error", "Failed to remove worker from favorites.");
        }
      } catch (error) {
        console.error("Error removing from favourites:", error);
        Alert.alert("Error", "Failed to remove worker from favorites.");
      }
    } else {
      navigation.navigate("Profile");
    }
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Worker Header */}
      <View style={styles.profileHeader}>
        <Image
          source={require("../assets/default-profile.png")}
          style={styles.workerProfileImage}
        />
        <Text style={styles.workerName}>{userId ? "Worker Profile" : "Worker"}</Text>
        <Text style={styles.workerSkills}>Plumbing • Electrical</Text>

        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Ionicons name="star" size={16} color="#facc15" />
            <Text style={styles.statText}>4.8 Rating</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statText}>3 Job Orders</Text>
          </View>
        </View>

        {/* Action Button with Icon */}
        <TouchableOpacity
          style={[
            styles.actionButton,
            fromFavorites && styles.unfavoriteButton,
          ]}
          onPress={handleButtonPress}
          activeOpacity={0.8}
        >
          {fromFavorites ? (
            <>
              <Ionicons
                name="heart-outline"
                size={18}
                color="#777373ff"
                style={{ marginRight: 6 }}
              />
              <Text style={[styles.actionButtonText, styles.unfavoriteButtonText]}>
                Unfavorite Worker
              </Text>
            </>
          ) : (
            <>
              <Ionicons
                name="create-outline"
                size={18}
                color="#333"
                style={{ marginRight: 6 }}
              />
              <Text style={styles.actionButtonText}>Edit Profile</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Reviews Section */}
      <View style={styles.reviewsSection}>
        <Text style={styles.reviewsTitle}>Reviews</Text>

        {reviews.length === 0 ? (
          <Text style={styles.emptyText}>No reviews yet.</Text>
        ) : (
          <FlatList
            data={reviews}
            keyExtractor={(item) => item.id}
            renderItem={renderReview}
            scrollEnabled={false}
          />
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },

  /* Header */
  profileHeader: {
    alignItems: "center",
    paddingVertical: 24,
    borderBottomWidth: 1,
    borderColor: "#eee",
  },
  workerProfileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  workerName: {
    fontSize: 20,
    fontWeight: "700",
    marginTop: 10,
    color: "#222",
  },
  workerSkills: {
    fontSize: 14,
    color: "#666",
    marginTop: 2,
  },
  statsRow: {
    flexDirection: "row",
    marginTop: 12,
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 10,
  },
  statText: {
    marginLeft: 5,
    color: "#444",
    fontSize: 13,
  },

  actionButton: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 8,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#807d7dff",
    
  },
  unfavoriteButtonText: {
    color: "#807d7dff",
  },

  /* Reviews */
  reviewsSection: {
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  reviewsTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 12,
    color: "#222",
  },
  reviewCard: {
    backgroundColor: "#fafafa",
    borderRadius: 10,
    padding: 14,
    marginBottom: 14,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  reviewHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  clientProfileImage: {
    width: 42,
    height: 42,
    borderRadius: 21,
  },
  clientName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111",
  },
  clientService: {
    fontSize: 12,
    color: "#777",
  },
  starsRow: {
    flexDirection: "row",
  },
  commentText: {
    fontSize: 13,
    color: "#444",
    marginTop: 6,
    lineHeight: 18,
  },
  imagesRow: {
    flexDirection: "row",
    marginTop: 8,
  },
  reviewImage: {
    width: width * 0.25,
    height: width * 0.25,
    borderRadius: 10,
    marginRight: 8,
  },
  emptyText: {
    textAlign: "center",
    color: "#888",
    fontSize: 13,
    marginTop: 20,
  },
});
