import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  Alert,
  ActivityIndicator,
} from "react-native";
import apiClient from "../api";

export default function Notification() {
  const [eReceipts, setEReceipts] = useState(false);
  const [proofDelivery, setProofDelivery] = useState(true);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  // Fetch notification preferences on component mount
  useEffect(() => {
    fetchNotificationPreferences();
  }, []);

  const fetchNotificationPreferences = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get("/user/notification-preferences");

      if (response.data.success) {
        const preferences = response.data.preferences;
        setEReceipts(preferences.eReceipts || false);
        setProofDelivery(preferences.proofOfDelivery !== false); // Default to true
        setEmail(preferences.email || "");
      }
    } catch (error) {
      console.error("Error fetching notification preferences:", error);
      Alert.alert("Error", "Failed to load notification preferences");
    } finally {
      setLoading(false);
    }
  };

  const updateNotificationPreference = async (key, value) => {
    try {
      setUpdating(true);
      const response = await apiClient.put("/user/notification-preferences", {
        [key]: value
      });

      if (response.data.success) {
        // Update local state
        if (key === 'eReceipts') setEReceipts(value);
        if (key === 'proofOfDelivery') setProofDelivery(value);
      } else {
        Alert.alert("Error", "Failed to update preference");
        // Revert the change
        if (key === 'eReceipts') setEReceipts(!value);
        if (key === 'proofOfDelivery') setProofDelivery(!value);
      }
    } catch (error) {
      console.error("Error updating notification preference:", error);
      Alert.alert("Error", "Failed to update notification preference");
      // Revert the change
      if (key === 'eReceipts') setEReceipts(!value);
      if (key === 'proofOfDelivery') setProofDelivery(!value);
    } finally {
      setUpdating(false);
    }
  };

  const handleEReceiptsToggle = (value) => {
    setEReceipts(value);
    updateNotificationPreference('eReceipts', value);
  };

  const handleProofDeliveryToggle = (value) => {
    setProofDelivery(value);
    updateNotificationPreference('proofOfDelivery', value);
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#4caf50" />
        <Text style={{ marginTop: 10, color: '#666' }}>Loading preferences...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Section: E-Receipts */}
      <Text style={styles.sectionHeader}>E-Receipts</Text>

      <View style={styles.row}>
        <Text style={styles.label}>Receive E-receipts</Text>
        <Switch
          value={eReceipts}
          onValueChange={handleEReceiptsToggle}
          thumbColor={eReceipts ? "#4caf50" : "#f4f3f4"}
          trackColor={{ false: "#ccc", true: "#81c784" }}
          disabled={updating}
        />
      </View>

      <View style={styles.row}>
        <Text style={styles.label}>E-Receipts Email</Text>
        <Text style={styles.value}>{email || "Not set"}</Text>
      </View>

      {/* Section: Proof of Delivery */}
      <Text style={styles.sectionHeader}>Proof of Delivery</Text>

      <View style={styles.row}>
        <Text style={styles.label}>
          Receive signature or photo proof upon delivery
        </Text>
        <Switch
          value={proofDelivery}
          onValueChange={handleProofDeliveryToggle}
          thumbColor={proofDelivery ? "#4caf50" : "#f4f3f4"}
          trackColor={{ false: "#ccc", true: "#81c784" }}
          disabled={updating}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  sectionHeader: {
    paddingHorizontal: 16,
    paddingVertical: 15,
    backgroundColor: "#f4f0ef",
    fontWeight: "600",
    color: "#555",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: "#ddd",
  },
  label: {
    flex: 1,
    fontSize: 16,
    color: "#333",
    paddingRight: 10, // space before toggle
  },
  value: {
    fontSize: 16,
    color: "#555",
  },
});
