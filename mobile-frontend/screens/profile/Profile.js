import React, { useState, useEffect } from "react";
import {View,Text,TouchableOpacity,StyleSheet,ScrollView,Image,ActivityIndicator,Alert,} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { notifyUserDataChange } from "../../utils/storageEvents";
import apiClient from "../../api";
import { getImageUrl } from "../../utils/imageUtils";


export default function Profile({ navigation }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    fetchUserProfile();
  }, []);

  const fetchUserProfile = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/user/me');
      if (response.data.success) {
        setUser(response.data.user);
      } else {
        Alert.alert('Error', 'Failed to load profile');
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      Alert.alert('Error', 'Failed to load profile data');
    } finally {
      setLoading(false);
    }
  };

  const pickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert("Permission Denied", "Permission to access photos is required!");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      setUpdating(true);
      try {
        const imageUri = result.assets[0].uri;

        // Create FormData for file upload
        const formData = new FormData();
        formData.append('profilePic', {
          uri: imageUri,
          type: 'image/jpeg',
          name: 'profile.jpg',
        });

        const response = await apiClient.put('/user/update-profile', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });

        if (response.data.success) {
          setUser(response.data.user);
          // Update AsyncStorage for drawer
          const updatedUser = {
            ...user,
            profilePic: response.data.user.profilePic,
          };
          await AsyncStorage.setItem("userData", JSON.stringify(updatedUser));
          notifyUserDataChange();
          Alert.alert('Success', 'Profile picture updated successfully!');
        } else {
          Alert.alert('Error', 'Failed to update profile picture');
        }
      } catch (error) {
        console.error('Error uploading profile picture:', error);
        Alert.alert('Error', 'Failed to upload profile picture');
      } finally {
        setUpdating(false);
      }
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#ce4da3ff" />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  if (!user) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Failed to load profile</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchUserProfile}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>

      {/* Profile Picture Row */}
      <TouchableOpacity
        style={styles.profileRow}
        activeOpacity={0.8}
        onPress={pickImage}
        disabled={updating}
      >
        <View style={styles.profileImageContainer}>
          <Image
            source={
              user.profilePic
                ? { uri: getImageUrl(user.profilePic) }
                : require("../../assets/default-profile.png")
            }
            style={styles.profileImage}
          />
          <View style={styles.cameraIconContainer}>
            {updating ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons name="camera" size={16} color="#fff" />
            )}
          </View>
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.row}
        onPress={() => navigation.navigate("EditFirstName", { currentValue: user.firstName })}
      >
        <Text style={styles.label}>First name</Text>
        <View style={styles.right}>
          <Text style={styles.value}>{user.firstName}</Text>
          <Ionicons name="chevron-forward" size={20} color="#999" />
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.row}
        onPress={() => navigation.navigate("EditLastName", { currentValue: user.lastName })}
      >
        <Text style={styles.label}>Last name</Text>
        <View style={styles.right}>
          <Text style={styles.value}>{user.lastName}</Text>
          <Ionicons name="chevron-forward" size={20} color="#999" />
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.row}
        onPress={() => navigation.navigate("PhoneVerification")}
      >
        <Text style={styles.label}>Phone</Text>
        <View style={styles.right}>
          <Text style={styles.value}>{user.phone}</Text>
          <Ionicons name="chevron-forward" size={20} color="#999" />
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.row}
        onPress={() => navigation.navigate("EditEmail", { currentValue: user.email })}
      >
        <Text style={styles.label}>Email</Text>
        <View style={styles.right}>
          <Text style={styles.value}>{user.email}</Text>
          <Ionicons name="chevron-forward" size={20} color="#999" />
        </View>
      </TouchableOpacity>


      <TouchableOpacity
        style={styles.deleteBtn}
        onPress={() => alert("Delete account feature coming soon!")}
      >
        <Text style={styles.deleteText}>Delete Account</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },

  // Profile Row
  profileRow: {
    flexDirection: "row",
    justifyContent: "center", 
    paddingHorizontal: 16,
    paddingVertical: 20,
    backgroundColor: "#ffffffff",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: "#ddd",
  },
  profileImageContainer: {
    position: "relative",
  },
  profileImage: {
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 2,
    borderColor: "#ddd",
  },
  cameraIconContainer: {
    position: "absolute",
    bottom: 2,
    right: 2,
    backgroundColor: "#333",
    borderRadius: 10,
    padding: 3,
  },
  userName: {
    fontSize: 17,
    fontWeight: "600",
    color: "#333",
  },
  changeText: {
    fontSize: 13,
    color: "#888",
    marginTop: 2,
  },

  // Info Section
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
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: "#ddd",
  },
  label: { fontSize: 14, paddingVertical: 16, color: "#333" },
  right: {
    flexDirection: "row",
    alignItems: "center",
  },
  value: {
    fontSize: 14,
    color: "#555",
    marginRight: 7,
  },
  deleteBtn: { marginTop: 30, alignItems: "center" },
  deleteText: { color: "red", fontSize: 16, fontWeight: "600" },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  loadingText: {
    marginTop: 15,
    fontSize: 16,
    color: "#666",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: "#E53935",
    textAlign: "center",
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: "#ce4da3ff",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  retryText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
});
