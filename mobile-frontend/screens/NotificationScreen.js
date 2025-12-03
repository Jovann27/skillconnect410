 import React, { useState, useEffect } from "react";
import { View, Text, FlatList, StyleSheet, Dimensions } from "react-native";
import apiClient from "../api";

const { width } = Dimensions.get("window");

export default function NotificationScreen() {
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const response = await apiClient.get("/user/notifications");
        setNotifications(response.data.notifications || []);
      } catch (error) {
        console.log("Error fetching notifications:", error);
        // Fallback to empty array
        setNotifications([]);
      }
    };
    fetchNotifications();
  }, []);

  const renderItem = ({ item }) => {
    const formatDate = (dateString) => {
      if (!dateString) return '';
      const date = new Date(dateString);
      return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    return (
      <View style={styles.item}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{item.title}</Text>
          <Text style={styles.body}>{item.message}</Text>
          {item.title === "Request Accepted" && item.meta && item.meta.date && (
            <Text style={styles.meta}>Booking Date: {formatDate(item.meta.date)}</Text>
          )}
          {item.title === "Request Accepted" && item.meta && item.meta.service && (
            <Text style={styles.meta}>Service: {item.meta.service}</Text>
          )}
        </View>
        <Text style={styles.date}>{formatDate(item.createdAt || item.date)}</Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={notifications}
        keyExtractor={(item) => item._id}
        renderItem={renderItem}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        contentContainerStyle={{ paddingBottom: 30 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  item: {
    flexDirection: "row",
    paddingVertical: 14,
    paddingHorizontal: 4,
    alignItems: "flex-start",
  },
  title: {
    fontSize: 15,
    fontWeight: "600",
    color: "#222",
    marginBottom: 4,
  },
  body: {
    fontSize: 13,
    color: "#555",
  },
  meta: {
    fontSize: 12,
    color: "#777",
    marginTop: 4,
  },
  date: {
    fontSize: 12,
    color: "#888",
    marginLeft: 8,
    width: 60,
    textAlign: "right",
  },
  separator: {
    height: 1,
    backgroundColor: "#eee",
  },
});
