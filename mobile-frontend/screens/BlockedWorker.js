import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import apiClient from "../api";

export default function BlockedWorker({ route, navigation }) {
  const worker = route.params?.worker;

  const handleUnblock = async () => {
    Alert.alert(
      "Unblock Worker",
      `Are you sure you want to unblock ${worker.name}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Unblock",
          style: "destructive",
          onPress: async () => {
            try {
              await apiClient.delete(`/user/unblock-user/${worker.id}`);
              Alert.alert("Worker Unblocked", `${worker.name} has been unblocked.`);
              navigation.goBack();
            } catch (error) {
              console.log("Error unblocking user:", error);
              Alert.alert("Error", "Failed to unblock worker. Please try again.");
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.profileSection}>
        <Image
          source={require("../assets/default-profile.png")}
          style={styles.profileImage}
          accessibilityLabel={`${worker.name} profile image`}
        />
        <Text style={styles.name}>{worker.name}</Text>
        <Text style={styles.service}>{worker.service}</Text>

        {/* ⭐ One star with rating beside it */}
        <View style={styles.ratingRow}>
          <Ionicons name="star" size={18} color="#FFD700" />
          <Text style={styles.ratingText}>{worker.rating ?? "0.0"}</Text>
        </View>

        {/* 🧱 Unblock button */}
        <TouchableOpacity
          style={styles.unblockButton}
          onPress={handleUnblock}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel={`Unblock ${worker.name}`}
        >
          <Ionicons name="ban" size={18} color="#6e6b6bff" style={{ marginRight: 8 }} />
          <Text style={styles.unblockText}>Unblock Worker</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.detailsBox}>
        <Text style={styles.label}>Reason for Block:</Text>
        <Text style={styles.reasonText}>
          {worker.reason}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  profileSection: {
    alignItems: "center",
    marginTop: 8,
  },
  profileImage: {
    width: 110,
    height: 110,
    borderRadius: 55,
    marginBottom: 12,
  },
  name: {
    fontSize: 20,
    fontWeight: "700",
    color: "#222",
  },
  service: {
    fontSize: 14,
    color: "#666",
    marginTop: 2,
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
  },
  ratingText: {
    fontSize: 14,
    color: "#444",
    marginLeft: 6,
    fontWeight: "600",
  },
  detailsBox: {
    marginTop: 28,
    backgroundColor: "#f7f7f8",
    borderRadius: 10,
    padding: 16,
    width: "100%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 1,
  },
  label: {
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 6,
    color: "#111",
  },
  reasonText: {
    fontSize: 14,
    color: "#444",
    lineHeight: 20,
  },
  unblockButton: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 14,
  },
  unblockText: {
    color: "#6e6b6bff",
    fontSize: 14,
    fontWeight: "700",
  },
});
