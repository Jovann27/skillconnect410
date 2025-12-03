import { Text, TouchableOpacity, StyleSheet, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Updates from "expo-updates";
import { useMainContext } from "../contexts/MainContext";
import { commonStyles } from "../utils/commonStyles";

export default function Settings({ navigation }) {
  const { logout, setIsAuthorized, setUser, setTokenType, setIsUserVerified } = useMainContext();

  const handleLogout = async () => {
    try {
      await logout();
      alert("Logged out successfully.");
    } catch (error) {
      console.error("Logout error:", error);
    }

    setIsAuthorized(false);
    setUser(null);
    setTokenType(null);
    setIsUserVerified(false);

    await AsyncStorage.multiRemove([
      'authToken',
      'userData',
      'isAuthorized',
      'tokenType',
      'userRole'
    ]);

    // Restart the app to refresh and navigate to login/home
    await Updates.reloadAsync();
  };

  return (
    <ScrollView style={commonStyles.screenContainer} contentContainerStyle={commonStyles.scrollContainer}>
      {/* Account Section */}
      <Text style={styles.sectionHeader}>Account</Text>

      <TouchableOpacity style={styles.row} onPress={() => navigation.navigate("VerifyPhoneForPassword")}>
        <Ionicons name="lock-closed-outline" size={20} color="#333" style={styles.icon}/>
        <Text style={styles.label}>Change Password</Text>
        <Ionicons name="chevron-forward" size={18} color="#999" style={styles.chevron}/>
      </TouchableOpacity>

      <TouchableOpacity style={styles.row} onPress={() => navigation.navigate("Notification")}>
        <Ionicons name="notifications-outline" size={20} color="#333" style={styles.icon}/>
        <Text style={styles.label}>Notification</Text>
        <Ionicons name="chevron-forward" size={18} color="#999" style={styles.chevron}/>
      </TouchableOpacity>

      {/* About Section */}
      <Text style={styles.sectionHeader}>About</Text>

      <TouchableOpacity style={styles.row} onPress={() => navigation.navigate("TermsPolicies")}>
        <Ionicons name="document-text-outline" size={20} color="#333" style={styles.icon}/>
        <Text style={styles.label}>Terms & Policies</Text>
        <Ionicons name="chevron-forward" size={18} color="#999" style={styles.chevron}/>
      </TouchableOpacity>

      <TouchableOpacity style={styles.row} onPress={() => navigation.navigate("AboutUs")}>
        <Ionicons name="information-circle-outline" size={20} color="#333" style={styles.icon}/>
        <Text style={styles.label}>About Us</Text>
        <Ionicons name="chevron-forward" size={18} color="#999" style={styles.chevron}/>
      </TouchableOpacity>

      {/* Log out */}
      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Text style={styles.logoutText}>Log out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  sectionHeader: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: "#f1eceaff",
    fontWeight: "600",
    color: "#555"
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: "#ddd",
  },
  icon: { marginRight: 12 },
  label: { flex: 1, fontSize: 16, paddingVertical: 12, color: "#333" },
  chevron: {},
  logoutBtn: {
    marginTop: 30,
    alignItems: "center",
  },
  logoutText: {
    color: "red",
    fontSize: 16,
    fontWeight: "600",
  },
});
