import React, { useState, useEffect } from "react";
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

export default function VerifyPhoneForPassword({ route, navigation }) {
  const { user } = useMainContext();
  const { email: paramEmail } = route.params || {};
  const [email, setEmail] = useState(paramEmail || user?.email || "");
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [resendTimer, setResendTimer] = useState(60);
  const [loading, setLoading] = useState(false);

  // Timer countdown effect
  useEffect(() => {
    let timer;
    if (otpSent && resendTimer > 0) {
      timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [resendTimer, otpSent]);

  const handleContinue = async () => {
    if (!email.trim()) {
      Alert.alert("Invalid email", "Please enter a valid email address.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      Alert.alert("Invalid email", "Please enter a valid email address.");
      return;
    }

    setLoading(true);
    try {
      const response = await apiClient.post("/user/send-verification-otp", {
        email: email.trim(),
        purpose: "password_reset"
      });

      if (response.data.success) {
        setOtpSent(true);
        setResendTimer(60);
        Alert.alert("Verification code sent!", `Sent to ${email}`);
      } else {
        Alert.alert("Error", response.data.message || "Failed to send verification code.");
      }
    } catch (error) {
      console.error("Send OTP error:", error);
      Alert.alert("Error", "Failed to send verification code. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    if (otp.join("").length < 6) {
      Alert.alert("Incomplete code", "Please enter the 6-digit code.");
      return;
    }

    setLoading(true);
    try {
      const response = await apiClient.post("/user/verify-otp", {
        email: email.trim(),
        otp: otp.join(""),
        purpose: "password_reset"
      });

      if (response.data.success) {
        Alert.alert("Verified", "Email successfully verified!");
        navigation.navigate("ResetPassword", { email: email.trim(), token: response.data.token });
      } else {
        Alert.alert("Error", response.data.message || "Invalid verification code.");
      }
    } catch (error) {
      console.error("Verify OTP error:", error);
      Alert.alert("Error", "Failed to verify code. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (text, index) => {
    const newOtp = [...otp];
    newOtp[index] = text;
    setOtp(newOtp);

    // Auto-focus next input
    if (text && index < otp.length - 1) {
      // This would need refs to implement auto-focus
    }
  };

  const handleResend = async () => {
    if (resendTimer === 0) {
      setLoading(true);
      try {
        const response = await apiClient.post("/user/send-verification-otp", {
          email: email.trim(),
          purpose: "password_reset"
        });

        if (response.data.success) {
          setResendTimer(60);
          Alert.alert("Code resent", `New verification code sent to ${email}`);
        } else {
          Alert.alert("Error", response.data.message || "Failed to resend code.");
        }
      } catch (error) {
        console.error("Resend OTP error:", error);
        Alert.alert("Error", "Failed to resend code. Please try again.");
      } finally {
        setLoading(false);
      }
    }
  };

  if (otpSent) {
    return (
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <TouchableOpacity onPress={() => setOtpSent(false)} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>

        <Text style={styles.title}>Verify your email address</Text>
        <Text style={styles.subtitle}>
          Enter the 6-digit code sent to{" "}
          <Text style={{ fontWeight: "600" }}>{email}</Text>
        </Text>

        <View style={styles.otpContainer}>
          {otp.map((digit, index) => (
            <TextInput
              key={index}
              style={styles.otpInput}
              keyboardType="numeric"
              maxLength={1}
              value={digit}
              onChangeText={(text) => handleOtpChange(text, index)}
            />
          ))}
        </View>

        <TouchableOpacity
          style={styles.resendContainer}
          onPress={handleResend}
          disabled={resendTimer > 0 || loading}
        >
          <Text
            style={[
              styles.resendText,
              { color: resendTimer > 0 || loading ? "#999" : "#d6215dff" },
            ]}
          >
            {loading ? "Sending..." : resendTimer > 0
              ? `Resend via Email in ${resendTimer}s`
              : "Resend via Email"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.continueButton, loading && styles.disabledButton]}
          onPress={handleVerify}
          disabled={loading}
        >
          <Text style={styles.continueText}>
            {loading ? "Verifying..." : "Continue"}
          </Text>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
        <Ionicons name="arrow-back" size={24} color="#000" />
      </TouchableOpacity>

      <Text style={styles.title}>To change your password, verify your email address</Text>

      <TextInput
        style={styles.input}
        placeholder="Enter your email address"
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        value={email}
        onChangeText={setEmail}
      />

      <TouchableOpacity
        style={[styles.continueButton, loading && styles.disabledButton]}
        onPress={handleContinue}
        disabled={loading}
      >
        <Text style={styles.continueText}>
          {loading ? "Sending..." : "Continue"}
        </Text>
      </TouchableOpacity>

      <Text style={styles.infoText}>
        You will receive an email with a verification code
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
    fontSize: 18,
    fontWeight: "600",
    color: "#000",
    marginBottom: 15,
  },
  subtitle: {
    color: "#555",
    marginBottom: 25,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    padding: 15,
    fontSize: 16,
    marginBottom: 20,
    color: "#333",
  },
  continueButton: {
    backgroundColor: "#ce4da3ff",
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 10,
  },
  disabledButton: {
    backgroundColor: "#ccc",
  },
  continueText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  infoText: {
    marginTop: 10,
    color: "#777",
    fontSize: 13,
    textAlign: "center",
  },
  otpContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 25,
    marginTop: 20,
  },
  otpInput: {
    width: 55,
    height: 55,
    borderWidth: 1.5,
    borderColor: "#d6215dff",
    borderRadius: 10,
    textAlign: "center",
    fontSize: 20,
    color: "#000",
  },
  resendContainer: {
    alignItems: "center",
    marginBottom: 30,
  },
  resendText: {
    fontSize: 14,
    fontWeight: "500",
  },
});
