import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
  Image,
  Modal,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { subscribeToUserDataChange } from "../utils/storageEvents";
import { useMainContext } from "../contexts/MainContext";
import { getImageUrl } from "../utils/imageUtils";
import api from "../api";

const { width } = Dimensions.get("window");

export default function CustomDrawer({ children }) {
  const [isOpen, setIsOpen] = useState(false);
  const [userData, setUserData] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const translateX = useRef(new Animated.Value(-width * 0.75)).current;
  const navigation = useNavigation();
  const { isLoggedIn, user, logout } = useMainContext();

  const userFullName = useMemo(() => {
    if (!userData) return "";
    return `${userData.firstName || ""} ${userData.lastName || ""}`.trim();
  }, [userData]);

  const avatarUrl = useMemo(() => {
    if (userData?.profilePic) return getImageUrl(userData.profilePic);
    if (!userFullName) return require("../assets/default-profile.png");
    // For React Native, we'll use the default profile image since we can't generate dynamic avatars easily
    return require("../assets/default-profile.png");
  }, [userData?.profilePic, userFullName]);

  const fetchUserData = async () => {
    try {
      const savedUser = await AsyncStorage.getItem("user");
      if (savedUser) {
        const user = JSON.parse(savedUser);
        setUserData(user);
        setUserRole(user.role);
      }
    } catch (err) {
      console.log("Error loading user data:", err);
    }
  };

  const fetchUnreadCount = useCallback(async () => {
    if (!isLoggedIn) {
      setUnreadCount(0);
      return;
    }

    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) {
        setUnreadCount(0);
        return;
      }

      const { data } = await api.get("/user/notifications/unread-count");
      setUnreadCount(data.unreadCount || 0);
    } catch (err) {
      console.error("Error fetching unread count:", err);
      setUnreadCount(0);
    }
  }, [isLoggedIn]);

  useEffect(() => {
    fetchUserData();
    const unsubscribe = subscribeToUserDataChange(fetchUserData);
    return () => unsubscribe();
  }, [isLoggedIn]);

  useEffect(() => {
    if (isLoggedIn) {
      fetchUnreadCount();
    } else {
      setUnreadCount(0);
    }
  }, [isLoggedIn, fetchUnreadCount]);

  const toggleDrawer = () => {
    const toValue = isOpen ? -width * 0.75 : 0;
    setIsOpen(!isOpen);
    Animated.timing(translateX, {
      toValue,
      duration: 250,
      useNativeDriver: true,
    }).start();
  };

  const navAndClose = async (screen, requiresAuth = false) => {
    toggleDrawer();
    if (requiresAuth && !isLoggedIn) {
      await AsyncStorage.setItem("pendingScreen", screen);
      navigation.navigate("Login");
    } else {
      // Navigate to UserTabs first, then to the specific screen
      navigation.navigate("UserTabs", { screen });
    }
  };

  const getMenuItems = () => {
    if (!userRole) return [];
    if (userRole === "Community Member") {
      return [
        { name: "Browse Providers", icon: "people-outline", screen: "ServiceProviders" },
        { name: "Notifications", icon: "notifications-outline", screen: "Notifications", hasBadge: unreadCount > 0, badgeCount: unreadCount },
        { name: "Chat", icon: "chatbubble-outline", screen: "Chat" },
        { name: "Profile", icon: "person-outline", screen: "Profile" },
        { name: "Settings", icon: "settings-outline", screen: "Settings" },
      ];
    } else if (userRole === "Service Provider") {
      return [
        { name: "My Services", icon: "briefcase-outline", screen: "Service" },
        { name: "Notifications", icon: "notifications-outline", screen: "Notifications", hasBadge: unreadCount > 0, badgeCount: unreadCount },
        { name: "Chat", icon: "chatbubble-outline", screen: "Chat" },
        { name: "Profile", icon: "person-outline", screen: "Profile" },
        { name: "Settings", icon: "settings-outline", screen: "Settings" },
      ];
    }
    return [];
  };

  const handleLogout = async () => {
    if (isLoggingOut) return;

    setIsLoggingOut(true);
    try {
      await logout();
      await AsyncStorage.multiRemove([
        "user",
        "token",
        "isLoggedIn",
        "userRole"
      ]);
      navigation.navigate("Login");
    } catch (err) {
      console.error("Logout failed:", err.message);
      Alert.alert("Error", "Logout failed. Please try again.");
    } finally {
      setIsLoggingOut(false);
    }
  };

  const fetchNotifications = async () => {
    if (!isLoggedIn) {
      setNotifications([]);
      setLoadingNotifications(false);
      return;
    }

    setLoadingNotifications(true);
    try {
      const { data } = await api.get("/user/notifications");
      setNotifications(data.notifications || []);
    } catch (err) {
      console.error("Error fetching notifications:", err);
      setNotifications([]);
    } finally {
      setLoadingNotifications(false);
    }
  };

  const toggleNotifications = async () => {
    setShowNotifications(!showNotifications);
    if (!showNotifications) {
      await fetchNotifications();
    }
    // Reset unread count when clicking the notification icon
    await markAllAsRead();
  };

  const handleNotificationClick = async (notification) => {
    try {
      // Mark as read
      await api.put(`/user/notifications/${notification._id}/read`);
      setNotifications(prev =>
        prev.map(notif =>
          notif._id === notification._id ? { ...notif, read: true } : notif
        )
      );

      setUnreadCount(prev => Math.max(0, prev - 1));

      // Navigate based on notification type
      const { meta } = notification;

      if (meta) {
        if (meta.type === "apply-provider") {
          navigation.navigate("UserTabs", { screen: "Profile" });
        } else if ((meta.type === "service-request" || meta.type === "service-request-posted") && meta.requestId) {
          navigation.navigate("UserTabs", { screen: "Service" });
        } else if (meta.bookingId) {
          navigation.navigate("UserTabs", { screen: "Chat" });
        }
      }

      // Close notification popup
      setShowNotifications(false);
    } catch (err) {
      console.error("Error handling notification click:", err);
    }
  };

  const markAllAsRead = async () => {
    try {
      await api.put("/user/notifications/mark-all-read");
      setNotifications(prev =>
        prev.map(notif => ({ ...notif, read: true }))
      );
      setUnreadCount(0);
    } catch (err) {
      console.error("Error marking all notifications as read:", err);
    }
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return isNaN(date.getTime()) ? '' : date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <View style={{ flex: 1 }}>
      {children(toggleDrawer)}

      {isOpen && (
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={toggleDrawer}
        />
      )}

      <Animated.View style={[styles.drawer, { transform: [{ translateX }] }]}>
        {/* Gradient Header */}
        <LinearGradient
          colors={["#c20884", "#ff7eb9"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.headerRow}
        >
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => {
              toggleDrawer();
              if (isLoggedIn) navigation.navigate("UserTabs", { screen: "Profile" });
              else navigation.navigate("Login");
            }}
            style={styles.headerContent}
          >
            <View style={styles.profileSection}>
              <Image
                source={
                  userData?.profilePic
                    ? { uri: getImageUrl(userData.profilePic) }
                    : require("../assets/default-profile.png")
                }
                style={styles.profileImage}
              />

              {!isLoggedIn ? (
                <Text style={styles.authButton}>Login / Register</Text>
              ) : (
                <View>
                  <Text style={styles.emailText}>
                    {userData?.firstName || "First Name"}
                  </Text>
                  <Text style={styles.roleText}>{userRole}</Text>
                </View>
              )}
            </View>

            {/* Chevron icon on the right */}
            <Ionicons
              name="chevron-forward-outline"
              size={22}
              color="#fff"
              style={styles.chevron}
            />
          </TouchableOpacity>
        </LinearGradient>

        {/* Menu */}
        <View style={styles.menuContainer}>
          {/* Home */}
          <TouchableOpacity
            style={styles.item}
            onPress={() => navAndClose("Dashboard", false)}
          >
            <Ionicons name="home-outline" size={22} style={styles.icon} />
            <Text style={styles.text}>Home</Text>
          </TouchableOpacity>

          {/* Dynamic Menu */}
          {getMenuItems().map((item) => (
            <TouchableOpacity
              key={item.name}
              style={styles.item}
              onPress={item.name === "Notifications" ? toggleNotifications : () => navAndClose(item.screen, true)}
            >
              <View style={styles.itemContent}>
                <Ionicons name={item.icon} size={22} style={styles.icon} />
                <Text style={styles.text}>{item.name}</Text>
                {item.hasBadge && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>
                      {item.badgeCount > 99 ? '99+' : item.badgeCount}
                    </Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Footer with Logout */}
        {isLoggedIn && (
          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.logoutButton}
              onPress={handleLogout}
              disabled={isLoggingOut}
            >
              <Ionicons name="log-out-outline" size={22} color="#dc3545" />
              <Text style={styles.logoutText}>
                {isLoggingOut ? "Logging out..." : "Log Out"}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </Animated.View>

      {/* Notification Modal */}
      <Modal
        visible={showNotifications}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowNotifications(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.notificationModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Notifications</Text>
              <TouchableOpacity
                onPress={() => setShowNotifications(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent}>
              {loadingNotifications ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color="#c20884" />
                  <Text style={styles.loadingText}>Loading...</Text>
                </View>
              ) : notifications.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>No notifications yet</Text>
                </View>
              ) : (
                notifications.map((notif) => (
                  <TouchableOpacity
                    key={notif._id}
                    style={[
                      styles.notificationItem,
                      !notif.read && styles.unreadNotification
                    ]}
                    onPress={() => handleNotificationClick(notif)}
                  >
                    <View style={styles.notificationContent}>
                      <Text style={styles.notificationTitle}>{notif.title}</Text>
                      <Text style={styles.notificationMessage}>{notif.message}</Text>
                      <Text style={styles.notificationTime}>{formatTime(notif.createdAt)}</Text>
                    </View>
                    {!notif.read && <View style={styles.unreadDot} />}
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  drawer: {
  position: "absolute",
  top: 30,
  left: 0,
  bottom: 0,
  width: width * 0.75,
  backgroundColor: "#fff",
  borderBottomRightRadius: 25, // Keep only bottom radius
  shadowColor: "#000",
  shadowOpacity: 0.2,
  shadowRadius: 6,
  elevation: 8,
  zIndex: 1000,
  },

  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.4)",
    zIndex: 999,
  },
  headerRow: {
    backgroundColor: '#e91e63',
    paddingVertical: 20,
    paddingHorizontal: 16,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  profileSection: {
    flexDirection: "row",
    alignItems: "center",
  },
  profileImage: {
    width: 55,
    height: 55,
    borderRadius: 35,
    borderWidth: 2,
    borderColor: "#fff",
    marginRight: 12,
  },
  authButton: {
    fontSize: 18,
    color: "#fff",
    fontWeight: "700",
  },
  emailText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  roleText: {
    color: "#f3f3f3",
    fontSize: 14,
    marginTop: 2,
  },
  chevron: {
    marginLeft: 8,
  },
  menuContainer: {
    paddingHorizontal: 20,
    marginTop: 10,
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 0.5,
    borderBottomColor: "#eee",
  },
  itemContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  badge: {
    backgroundColor: "#ff4444",
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: "auto",
  },
  badgeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "bold",
  },
  icon: { marginRight: 12, color: "#c20884" },
  text: { fontSize: 16, color: "#333", fontWeight: "500" },
  footer: {
    marginTop: "auto",
    borderTopWidth: 1,
    borderTopColor: "#eee",
    paddingVertical: 15,
    paddingHorizontal: 20,
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
  },
  logoutText: {
    marginLeft: 12,
    fontSize: 16,
    color: "#dc3545",
    fontWeight: "500",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  notificationModal: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "80%",
    minHeight: "50%",
  },
  modalHeader: {
    backgroundColor: "#c20884",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  modalTitle: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "bold",
  },
  closeButton: {
    padding: 5,
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 50,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: "#666",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 50,
  },
  emptyText: {
    fontSize: 16,
    color: "#666",
  },
  notificationItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 15,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  unreadNotification: {
    backgroundColor: "#fce4ec",
    borderLeftWidth: 4,
    borderLeftColor: "#c20884",
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 5,
  },
  notificationMessage: {
    fontSize: 14,
    color: "#666",
    marginBottom: 5,
    lineHeight: 20,
  },
  notificationTime: {
    fontSize: 12,
    color: "#999",
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#c20884",
    marginLeft: 10,
  },
});
