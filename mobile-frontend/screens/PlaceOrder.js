import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Keyboard,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Picker } from "@react-native-picker/picker";
import { useNavigation, useRoute } from "@react-navigation/native";
import MapView, { Marker } from "react-native-maps";
import * as Location from "expo-location";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useMainContext } from "../contexts/MainContext";
import apiClient from "../api";

export default function PlaceOrder() {
  const navigation = useNavigation();
  const route = useRoute();
  const { user } = useMainContext();

  const previousOrder = route?.params?.previousOrder || null;

  const [name, setName] = useState(user ? `${user.firstName} ${user.lastName}` : "");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState(user?.phone || "");
  const [typeOfWork, setTypeOfWork] = useState("");
  const [preferredDate, setPreferredDate] = useState(new Date());
  const [time, setTime] = useState(new Date());
  const [budget, setBudget] = useState("");
  const [notes, setNotes] = useState("");

  const [loading, setLoading] = useState(false);

  // Map states
  const [markerPosition, setMarkerPosition] = useState({ lat: 14.5995, lng: 120.9842 }); // Default to Manila
  const mapRef = useRef(null);
  const [locationError, setLocationError] = useState(null);
  const [currentAddress, setCurrentAddress] = useState("");
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  useEffect(() => {
    if (previousOrder) {
      if (previousOrder.worker) setName(previousOrder.worker);
      if (previousOrder.address) setAddress(previousOrder.address);
      if (previousOrder.type) setTypeOfWork(previousOrder.type);
      if (previousOrder.price) setBudget(previousOrder.price.toString());
      if (previousOrder.date)
        setNotes(
          `Reorder request based on previous service on ${previousOrder.date}`
        );
    }
  }, [previousOrder]);

  const getCurrentLocation = async () => {
    if (!Location) {
      setLocationError("Location services are not available.");
      return;
    }

    let { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      setLocationError("Permission to access location was denied.");
      return;
    }

    setLocationError(null);
    try {
      let location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      const { latitude, longitude } = location.coords;
      setMarkerPosition({ lat: latitude, lng: longitude });

      if (mapRef.current) {
        mapRef.current.animateToRegion({
          latitude,
          longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        });
      }

      // Reverse geocode
      try {
        const response = await apiClient.get(`/user/reverse-geocode?lat=${latitude}&lon=${longitude}`);
        if (response.data.success && response.data.address) {
          setCurrentAddress(response.data.address);
          setAddress(response.data.address);
        } else {
          throw new Error("No address found");
        }
      } catch (error) {
        console.error("Reverse geocoding failed:", error);
        const fallbackAddress = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
        setCurrentAddress(fallbackAddress);
        setAddress(fallbackAddress);
      }
    } catch (error) {
      setLocationError("Unable to retrieve your location.");
    }
  };

  const validateInputs = () => {
    if (!name.trim()) return "Full name is required.";
    if (!address.trim()) return "Address is required.";
    if (!phone.trim()) return "Phone number is required.";
    if (!/^(09\d{9})$/.test(phone))
      return "Enter a valid 11-digit phone number (starts with 09).";
    if (!typeOfWork) return "Please select a type of work.";
    if (!notes.trim()) return "Notes are required.";
    if (!budget.trim()) return "Budget is required.";
    if (isNaN(budget) || Number(budget) <= 0)
      return "Budget must be a valid positive number.";

    return null;
  };

  const handleSubmit = async () => {
    const error = validateInputs();
    if (error) {
      Alert.alert("Validation Error", error);
      return;
    }

    setLoading(true);
    try {
      const orderPayload = {
        name,
        address,
        phone,
        typeOfWork,
        preferredDate: preferredDate.toISOString().split('T')[0],
        time: time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        budget: Number(budget),
        notes,
        location: markerPosition,
      };

      const response = await apiClient.post("/user/post-service-request", orderPayload);
      navigation.navigate("WaitingForWorker", { orderData: { ...orderPayload, id: response.data.request._id } });

      // Reset fields
      setName(user ? `${user.firstName} ${user.lastName}` : "");
      setAddress("");
      setPhone(user?.phone || "");
      setTypeOfWork("");
      setPreferredDate(new Date());
      setTime(new Date());
      setBudget("");
      setNotes("");
      setMarkerPosition({ lat: 14.5995, lng: 120.9842 });
    } catch (error) {
      console.log("Error placing order:", error);
      Alert.alert("Error", "Failed to place order. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 60 : 0}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.container}>
          <ScrollView
            contentContainerStyle={styles.scrollContainer}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Name */}
            <Text style={styles.label}>Full Name *</Text>
            <TextInput
              style={styles.input}
              value={name}
              placeholder="Enter your full name"
              onChangeText={setName}
            />

            {/* Address */}
            <Text style={styles.label}>Address *</Text>
            <TextInput
              style={styles.input}
              value={address}
              placeholder="Enter your address"
              onChangeText={setAddress}
            />

            {/* Phone */}
            <Text style={styles.label}>Phone Number *</Text>
            <TextInput
              style={styles.input}
              keyboardType="phone-pad"
              value={phone}
              placeholder="09xxxxxxxxx"
              onChangeText={setPhone}
              maxLength={11}
            />

            {/* Type of Work */}
            <Text style={styles.label}>Type of Work *</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={typeOfWork}
                onValueChange={setTypeOfWork}
                style={styles.picker}
              >
                <Picker.Item label="Select work type" value="" />
                <Picker.Item label="Plumbing" value="Plumbing" />
                <Picker.Item label="Electrical" value="Electrical" />
                <Picker.Item label="Cleaning" value="Cleaning" />
                <Picker.Item label="Carpentry" value="Carpentry" />
                <Picker.Item label="Painting" value="Painting" />
                <Picker.Item label="Appliance Repair" value="Appliance Repair" />
                <Picker.Item label="Home Renovation" value="Home Renovation" />
                <Picker.Item label="Pest Control" value="Pest Control" />
                <Picker.Item label="Gardening & Landscaping" value="Gardening & Landscaping" />
                <Picker.Item label="Air Conditioning & Ventilation" value="Air Conditioning & Ventilation" />
                <Picker.Item label="Laundry / Labandera" value="Laundry / Labandera" />
              </Picker>
            </View>

            {/* Preferred Date */}
            <Text style={styles.label}>Preferred Date *</Text>
            <TouchableOpacity
              style={styles.input}
              onPress={() => setShowDatePicker(true)}
            >
              <Text style={{ fontSize: 14, color: preferredDate ? "#333" : "#999" }}>
                {preferredDate ? preferredDate.toLocaleDateString() : "Select date"}
              </Text>
            </TouchableOpacity>
            {showDatePicker && (
              <DateTimePicker
                value={preferredDate}
                mode="date"
                display="default"
                onChange={(event, selectedDate) => {
                  setShowDatePicker(false);
                  if (selectedDate) {
                    setPreferredDate(selectedDate);
                  }
                }}
              />
            )}

            {/* Preferred Time */}
            <Text style={styles.label}>Preferred Time *</Text>
            <TouchableOpacity
              style={styles.input}
              onPress={() => setShowTimePicker(true)}
            >
              <Text style={{ fontSize: 14, color: time ? "#333" : "#999" }}>
                {time ? time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "Select time"}
              </Text>
            </TouchableOpacity>
            {showTimePicker && (
              <DateTimePicker
                value={time}
                mode="time"
                display="default"
                onChange={(event, selectedDate) => {
                  setShowTimePicker(false);
                  if (selectedDate) {
                    setTime(selectedDate);
                  }
                }}
              />
            )}

            {/* Map Section */}
            <Text style={styles.label}>Select Location on Map *</Text>
            <View style={styles.mapContainer}>
              <MapView
                ref={mapRef}
                style={styles.map}
                initialRegion={{
                  latitude: markerPosition.lat,
                  longitude: markerPosition.lng,
                  latitudeDelta: 0.01,
                  longitudeDelta: 0.01,
                }}
                onPress={(e) => {
                  const { latitude, longitude } = e.nativeEvent.coordinate;
                  setMarkerPosition({ lat: latitude, lng: longitude });

                  // Reverse geocode
                  apiClient.get(`/user/reverse-geocode?lat=${latitude}&lon=${longitude}`)
                    .then(response => {
                      if (response.data.success && response.data.address) {
                        setCurrentAddress(response.data.address);
                        setAddress(response.data.address);
                      } else {
                        throw new Error("No address found");
                      }
                    })
                    .catch(error => {
                      console.error("Reverse geocoding failed:", error);
                      const fallbackAddress = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
                      setCurrentAddress(fallbackAddress);
                      setAddress(fallbackAddress);
                    });
                }}
              >
                <Marker
                  coordinate={{
                    latitude: markerPosition.lat,
                    longitude: markerPosition.lng,
                  }}
                />
              </MapView>
              <TouchableOpacity
                style={styles.locationButton}
                onPress={getCurrentLocation}
              >
                <Text style={styles.locationButtonText}>📍 Use My Location</Text>
              </TouchableOpacity>
              {locationError && (
                <Text style={styles.errorText}>{locationError}</Text>
              )}
              {currentAddress && (
                <View style={styles.addressDisplay}>
                  <Text style={styles.addressLabel}>Detected Address:</Text>
                  <Text style={styles.addressText}>{currentAddress}</Text>
                  <TouchableOpacity
                    style={styles.useAddressButton}
                    onPress={() => {
                      setAddress(currentAddress);
                      setCurrentAddress("");
                    }}
                  >
                    <Text style={styles.useAddressText}>Use This Address</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* Budget */}
            <Text style={styles.label}>Budget (₱) *</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              value={budget}
              placeholder="Enter budget amount"
              onChangeText={setBudget}
            />

            {/* Notes */}
            <Text style={styles.label}>Notes to Worker *</Text>
            <TextInput
              style={[styles.input, styles.noteInput]}
              multiline
              placeholder="Notes to worker..."
              value={notes}
              onChangeText={setNotes}
            />

          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.button, { backgroundColor: "#ce4da3ff", marginBottom: 0 }]}
              onPress={handleSubmit}
              disabled={loading}
            >
              <Text style={styles.buttonText}>Place Order</Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    paddingHorizontal: 26,
  },
  scrollContainer: {
    paddingBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 6,
    color: "#333",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 16,
    marginBottom: 16,
    fontSize: 14,
    backgroundColor: "#f9f9f9",
  },
  noteInput: {
    height: 90,
    textAlignVertical: "top",
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    marginBottom: 16,
    backgroundColor: "#f9f9f9",
  },
  picker: {
    height: 55,
  },
  button: {
    paddingVertical: 20,
    paddingHorizontal: 25,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 10,
    marginBottom: 20,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  footer: {
    padding: 16,
    marginBottom: 20,
  },
  mapContainer: {
    height: 300,
    marginBottom: 16,
    borderRadius: 10,
    overflow: "hidden",
  },
  map: {
    flex: 1,
  },
  locationButton: {
    position: "absolute",
    top: 10,
    right: 10,
    backgroundColor: "#fff",
    padding: 10,
    borderRadius: 5,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  locationButtonText: {
    fontSize: 12,
    fontWeight: "600",
  },
  errorText: {
    color: "red",
    fontSize: 12,
    marginTop: 5,
  },
  addressDisplay: {
    position: "absolute",
    bottom: 10,
    left: 10,
    right: 10,
    backgroundColor: "#fff",
    padding: 10,
    borderRadius: 5,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  addressLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#333",
  },
  addressText: {
    fontSize: 14,
    color: "#555",
    marginTop: 2,
  },
  useAddressButton: {
    marginTop: 5,
    alignSelf: "flex-end",
  },
  useAddressText: {
    fontSize: 12,
    color: "#ce4da3ff",
    fontWeight: "600",
  },
});
