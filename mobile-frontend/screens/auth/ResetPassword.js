import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useMainContext } from "../../contexts/MainContext";
import apiClient from "../../api";

export default function ResetPassword({ route, navigation }) {
  const { email, token } = route.params || {};
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleResetPassword = async () => {
    if (!newPassword.trim()) {
      Alert.alert("Error", "Please enter a new password.");
      return;
    }

    if (newPassword.length < 8) {
      Alert.alert("Error", "Password must be at least 8 characters long.");
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert("Error", "Passwords do not match.");
      return;
    }

    if (!email || !token) {
      Alert.alert("Error", "Invalid reset link. Please try again.");
      return;
    }

    setLoading(true);
    try {
      const response = await apiClient.post("/user/reset-password", {
        email,
        token,
        newPassword,
      });

      if (response.data.success) {
        Alert.alert(
          "Success",
          "Password reset successfully! You can now log in with your new password.",
          [
            {
              text: "OK",
              onPress: () => navigation.navigate("Login"),
            },
          ]
        );
      } else {
        Alert.alert("Error", response.data.message || "Failed to reset password.");
      }
    } catch (error) {
      console.error("Reset password error:", error);
      Alert.alert("Error", "Failed to reset password. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
        <Ionicons name="arrow-back" size={24} color="#000" />
      </TouchableOpacity>

      <Text style={styles.title}>Reset Your Password</Text>
      <Text style={styles.subtitle}>
        Enter your new password below
      </Text>

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="New Password"
          secureTextEntry={!showPassword}
          value={newPassword}
          onChangeText={setNewPassword}
          autoCapitalize="none"
        />
        <TouchableOpacity
          style={styles.eyeIcon}
          onPress={() => setShowPassword(!showPassword)}
        >
          <Ionicons
            name={showPassword ? "eye-off" : "eye"}
            size={20}
            color="#666"
          />
        </TouchableOpacity>
      </View>

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Confirm New Password"
          secureTextEntry={!showConfirmPassword}
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          autoCapitalize="none"
        />
        <TouchableOpacity
          style={styles.eyeIcon}
          onPress={() => setShowConfirmPassword(!showConfirmPassword)}
        >
          <Ionicons
            name={showConfirmPassword ? "eye-off" : "eye"}
            size={20}
            color="#666"
          />
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={[styles.resetButton, loading && styles.disabledButton]}
        onPress={handleResetPassword}
        disabled={loading}
      >
        <Text style={styles.resetText}>
          {loading ? "Resetting..." : "Reset Password"}
        </Text>
      </TouchableOpacity>

      <Text style={styles.infoText}>
        Make sure your new password is strong and secure
      </Text>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    marginTop: 20,
    padding: 25,
    backgroundColor: "#fff",
  },
  backBtn: {
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#000",
    marginBottom: 10,
  },
  subtitle: {
    color: "#555",
    marginBottom: 30,
    fontSize: 16,
  },
  inputContainer: {
    position: "relative",
    marginBottom: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    padding: 15,
    paddingRight: 50,
    fontSize: 16,
    color: "#333",
  },
  eyeIcon: {
    position: "absolute",
    right: 15,
    top: 15,
  },
  resetButton: {
    backgroundColor: "#ce4da3ff",
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 20,
  },
  disabledButton: {
    backgroundColor: "#ccc",
  },
  resetText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  infoText: {
    marginTop: 20,
    color: "#777",
    fontSize: 13,
    textAlign: "center",
  },
});
