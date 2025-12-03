import { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
  Image,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { subscribeToUserDataChange } from "../utils/storageEvents";
import { useMainContext } from "../contexts/MainContext";
import { getImageUrl } from "../utils/imageUtils";
import Loader from "./Loader";
import useNavigationWithLoader from "../utils/useNavigationWithLoader";

const { width } = Dimensions.get("window");

export default function CustomDrawer({ children }) {
  const [isOpen, setIsOpen] = useState(false);
  const [userData, setUserData] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const translateX = useRef(new Animated.Value(-width * 0.75)).current;
  const navigation = useNavigation();
  const navigationWithLoader = useNavigationWithLoader();
  const { isLoggedIn, navigationLoading } = useMainContext();

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

  useEffect(() => {
    fetchUserData();
    const unsubscribe = subscribeToUserDataChange(fetchUserData);
    return () => unsubscribe();
  }, [isLoggedIn]);

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
      navigationWithLoader.navigate("Login");
    } else {
      navigationWithLoader.navigate(screen);
    }
  };

  const getMenuItems = () => {
    if (!userRole) return [];
    if (userRole === "Community Member") {
      return [
        { name: "Request Service", icon: "cart-outline", screen: "PlaceOrder" },
        { name: "My Records", icon: "document-outline", screen: "Records" },
        { name: "Chat", icon: "chatbubble-outline", screen: "Chat" },
        { name: "Workers", icon: "people-outline", screen: "Workers" },
        { name: "Reviews", icon: "star-outline", screen: "ProfileReviews" },
        { name: "Settings", icon: "settings-outline", screen: "Settings" },
      ];
    } else if (userRole === "Service Provider") {
      return [
        { name: "My Service", icon: "briefcase-outline", screen: "Service" },
        { name: "Request Service", icon: "cart-outline", screen: "PlaceOrder" },
        { name: "My Records", icon: "document-outline", screen: "Records" },
        { name: "Chat", icon: "chatbubble-outline", screen: "Chat" },
        { name: "Reviews", icon: "settings-outline", screen: "ProfileReviews" },
        { name: "Settings", icon: "settings-outline", screen: "Settings" },
      ];
    }
    return [];
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

      {navigationLoading && (
        <View style={styles.loaderOverlay}>
          <Loader />
        </View>
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
              if (isLoggedIn) navigationWithLoader.navigate("Profile");
              else navigationWithLoader.navigate("Login");
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
            onPress={() => navAndClose("Home", false)}
          >
            <Ionicons name="home-outline" size={22} style={styles.icon} />
            <Text style={styles.text}>Home</Text>
          </TouchableOpacity>

          {/* Dynamic Menu */}
          {getMenuItems().map((item) => (
            <TouchableOpacity
              key={item.name}
              style={styles.item}
              onPress={() => navAndClose(item.screen, true)}
            >
              <Ionicons name={item.icon} size={22} style={styles.icon} />
              <Text style={styles.text}>{item.name}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </Animated.View>
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
  loaderOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255,255,255,0.8)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1001,
  },
 headerRow: {
  paddingVertical: 25,
  paddingHorizontal: 20,
  

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
  icon: { marginRight: 12, color: "#c20884" },
  text: { fontSize: 16, color: "#333", fontWeight: "500" },
  footer: {
    marginTop: "auto",
    borderTopWidth: 1,
    borderTopColor: "#eee",
    paddingVertical: 15,
    paddingHorizontal: 20,
  },
});
