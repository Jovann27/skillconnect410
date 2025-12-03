import { useState, useEffect } from "react";
import {View,Text,StyleSheet,ScrollView,TouchableOpacity,Switch,Alert,Modal,FlatList,Image,ActivityIndicator,Platform,UIManager,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import MapView, { Marker } from "react-native-maps";
import { serviceRequestAPI, serviceProfileAPI, userServicesAPI } from "../api";
import { useMainContext } from "../contexts/MainContext";
import { socket } from "../utils/socket";
import { getImageUrl } from "../utils/imageUtils";

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const maskPhone = (phone) => {
  if (!phone) return "N/A";
  return phone.replace(/\d(?=\d{3})/g, "*");
};

const maskEmail = (email) => {
  if (!email || !email.includes("@")) return "N/A";
  const [user, domain] = email.split("@");
  const maskedUser = user[0] + "*".repeat(Math.max(user.length - 2, 1)) + user.slice(-1);
  return `${maskedUser}@${domain}`;
};


export default function MyServiceScreen({ navigation }) {
  const { user, isLoggedIn } = useMainContext();
  const [isOnline, setIsOnline] = useState(true);
  const [formData, setFormData] = useState({
    service: '',
    rate: '',
    description: ''
  });
  const [availableServices, setAvailableServices] = useState([]);
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [selectedServiceName, setSelectedServiceName] = useState('');
  const [serviceUpdating, setServiceUpdating] = useState(false);
  const [clients, setClients] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [serviceProfile, setServiceProfile] = useState(null);
  const [location, setLocation] = useState(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [requestsError, setRequestsError] = useState('');

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [services, requests] = await Promise.all([fetchAvailableServices(), fetchServiceRequests()]);
      const filteredRequests = requests.filter(request => services.some(s => s.name === request.typeOfWork));
      const clientsData = filteredRequests.map(request => ({
        id: request._id,
        name: request.requester?.firstName + ' ' + request.requester?.lastName || 'Unknown',
        email: request.requester?.email || '',
        phone: request.requester?.phone || '',
        service: request.typeOfWork,
        budget: `₱${request.budget}`,
        date: new Date(request.createdAt).toLocaleDateString(),
        time: request.time,
        location: request.address,
        coords: request.location,
        note: request.notes,
        profilePic: null,
        requestData: request
      }));
      setClients(clientsData);
    } catch (error) {
      console.error('Error loading data:', error);
      setClients([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectService = async (serviceName) => {
    if (!serviceName) {
      setSelectedServiceName('');
      return;
    }

    console.log('MyService: Service selected:', serviceName);
    console.log('MyService: Available services:', availableServices);

    // Find the selected service from the user's services array
    const selectedPredefinedService = availableServices.find(service => service.name === serviceName);
    console.log('MyService: Found service:', selectedPredefinedService);

    if (selectedPredefinedService) {
      setServiceUpdating(true);
      try {
        const response = await serviceProfileAPI.updateServiceProfile({
          service: serviceName,
          rate: selectedPredefinedService.rate || 0,
          description: selectedPredefinedService.description || ''
        });
        if (response.data.success) {
          setFormData({
            service: serviceName,
            rate: selectedPredefinedService.rate || 0,
            description: selectedPredefinedService.description || ''
          });
          setSelectedServiceName(serviceName);
          setShowServiceModal(false);
          Alert.alert("Success", "Service profile updated successfully");
          console.log('MyService: Service profile updated successfully');
        }
      } catch (error) {
        console.error('MyService: Error updating service profile:', error);
        Alert.alert("Error", error.response?.data?.message || 'Failed to update service profile');
        // Don't reset selectedServiceName on error, keep the selection
      } finally {
        setServiceUpdating(false);
      }
    } else {
      console.warn('MyService: Selected service not found in predefined services:', serviceName);
      console.warn('MyService: Available service names:', availableServices.map(s => s.name));
      Alert.alert("Error", 'Selected service not found in your services list');
    }
  };



  useEffect(() => {
    if (!isLoggedIn || !user) return;
    loadData();
    fetchServiceProfile();
    requestLocationPermission();

    // Socket listeners for real-time updates
    if (socket && typeof socket.on === 'function') {
      socket.on("service-request-updated", (data) => {
        console.log("Service request updated:", data);
        loadData();
      });
    }

    return () => {
      if (socket && typeof socket.off === 'function') {
        socket.off("service-request-updated");
      }
    };
  }, [user, isLoggedIn]);

  const requestLocationPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          "Location Permission",
          "Location permission is needed to show your location to clients and find nearby service requests."
        );
      }
    } catch (error) {
      console.error('Error requesting location permission:', error);
    }
  };

  const fetchServiceRequests = async () => {
    try {
      const response = await serviceRequestAPI.getServiceRequests();

      if (response.data.success) {
        // Filter out requests from the current user
        const filteredRequests = response.data.requests.filter(request => request.requester?._id !== user._id);
        return filteredRequests;
      } else {
        Alert.alert("Error", "Failed to load service requests");
        return [];
      }
    } catch (error) {
      console.error('Error fetching service requests:', error);
      if (error.response && error.response.status === 403) {
        setRequestsError('Access denied. You must be a Service Provider.');
      } else {
        setRequestsError('No matching requests found.');
      }
      return [];
    }
  };

  const fetchServiceProfile = async () => {
    try {
      const response = await serviceProfileAPI.getServiceProfile();

      if (response.data.success) {
        const profile = response.data.data;
        setServiceProfile(profile);
        setIsOnline(profile.isOnline !== undefined ? profile.isOnline : true);
        setFormData({
          service: profile.service || '',
          rate: profile.rate || '',
          description: profile.description || ''
        });
        setSelectedServiceName(profile.service || '');
      }
    } catch (error) {
      console.error('Error fetching service profile:', error);
      setIsOnline(true);
    }
  };

  const fetchAvailableServices = async () => {
    try {
      const response = await userServicesAPI.getUserServices();

      if (response.data.success) {
        const services = response.data.services || [];
        setAvailableServices(services);
        return services;
      }
    } catch (error) {
      console.error('Error fetching available services:', error);
    }
    return [];
  };

  const updateOnlineStatus = async (online) => {
    try {
      await serviceProfileAPI.updateServiceStatus({ isOnline: online });
      setIsOnline(online);
    } catch (error) {
      console.error('Error updating online status:', error);
      Alert.alert("Error", "Failed to update status. Please try again.");
      // Revert the switch
      setIsOnline(!online);
    }
  };

  const getCurrentLocation = async () => {
    setLocationLoading(true);
    try {
      // Check if location services are enabled
      const servicesEnabled = await Location.hasServicesEnabledAsync();
      if (!servicesEnabled) {
        Alert.alert(
          "Location Services Disabled",
          "Location services are disabled. Please enable location services in your device settings to share your location.",
          [
            { text: "Cancel", style: "cancel" },
            { text: "Open Settings", onPress: () => Location.requestForegroundPermissionsAsync() }
          ]
        );
        setLocationLoading(false);
        return;
      }

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert("Permission denied", "Location access is needed to share your location.");
        setLocationLoading(false);
        return;
      }

      const locationResult = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
        timeout: 15000, // 15 seconds timeout
      });

      const { latitude, longitude } = locationResult.coords;
      setLocation({ lat: latitude, lng: longitude });

      Alert.alert("Success", "Your location has been updated for better service matching.");
    } catch (error) {
      console.error('Error getting location:', error);

      let errorMessage = "Failed to get your location. Please try again.";
      if (error.message.includes('unavailable')) {
        errorMessage = "Location services are unavailable. Please check your device settings and try again.";
      } else if (error.message.includes('timeout')) {
        errorMessage = "Location request timed out. Please try again.";
      } else if (error.message.includes('permission')) {
        errorMessage = "Location permission was denied. Please grant location access.";
      }

      Alert.alert("Location Error", errorMessage);
    } finally {
      setLocationLoading(false);
    }
  };

    const confirmAccept = (client) => {

    Alert.alert(
      "Confirm Acceptance",
      `Are you sure you want to accept ${client.name}'s request for ${client.service}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Yes, Accept",
          style: "default",
          onPress: () => handleAccept(client),
        },
      ]
    );
  };

  const handleAccept = async (client) => {
    try {
      const response = await serviceRequestAPI.acceptServiceRequest(client.id);

      if (response.data.success) {
        Alert.alert("Request Accepted", `You accepted ${client.name}'s request.`, [
          {
            text: "OK",
            onPress: () => navigation.navigate("ClientAccepted", { client }),
          },
        ]);
        loadData();
      } else {
        Alert.alert("Error", response.data.message || "Failed to accept request");
      }
    } catch (error) {
      console.error('Error accepting service request:', error);
      Alert.alert("Error", "Failed to accept the service request. Please try again.");
    }
  };

  const handleDecline = async (client) => {
    try {
      setClients(prev => prev.filter(c => c.id !== client.id));
      Alert.alert("Request Declined", `You declined ${client.name}'s request.`);
    } catch (error) {
      console.error('Error declining service request:', error);
      Alert.alert("Error", "Failed to decline the service request. Please try again.");
    }
  };

  if (!isLoggedIn || !user) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.authRequired}>
          <Ionicons name="lock-closed" size={64} color="#c20884" />
          <Text style={styles.authTitle}>Authentication Required</Text>
          <Text style={styles.authMessage}>Please log in to access your service statistics.</Text>
          <TouchableOpacity
            style={styles.loginButton}
            onPress={() => navigation.navigate('Login')}
          >
            <Text style={styles.loginButtonText}>Go to Login</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Role-based access is handled by RoleGuard in App.js
  // Service Providers can access this screen via RoleGuard configuration

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 80 }}>
        {/* STATUS CARD */}
        <View style={styles.card}>
          <View style={styles.statusRow}>
            <Text style={[styles.statusText, { color: isOnline ? "#2E7D32" : "#777" }]}>
              {isOnline ? "Online" : "Offline"}
            </Text>
            <Switch
              trackColor={{ false: "#ccc", true: "#f1b7e2" }}
              thumbColor={isOnline ? "#c20884" : "#f4f3f4"}
              ios_backgroundColor="#ccc"
              onValueChange={(value) => updateOnlineStatus(value)}
              value={isOnline}
            />
          </View>
        </View>

        {/* LOCATION CARD */}
        <View style={styles.card}>
          <View style={styles.locationHeader}>
            <Text style={styles.sectionTitle}>My Location</Text>
            <TouchableOpacity
              style={styles.locationButton}
              onPress={getCurrentLocation}
              disabled={locationLoading}
            >
              {locationLoading ? (
                <ActivityIndicator size="small" color="#c20884" />
              ) : (
                <Ionicons name="location-outline" size={20} color="#c20884" />
              )}
            </TouchableOpacity>
          </View>

          {location ? (
            <View style={styles.locationInfo}>
              <Text style={styles.locationText}>
                <Text style={styles.bold}>Current Location:</Text> {location.lat.toFixed(6)}, {location.lng.toFixed(6)}
              </Text>
              <Text style={styles.locationHint}>
                Your location helps match you with nearby service requests
              </Text>
            </View>
          ) : (
            <Text style={styles.locationText}>
              Location not set. Tap the location icon to share your current location.
            </Text>
          )}
        </View>

        {/* MAP VIEW */}
        {location && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Service Locations</Text>
            <View style={styles.mapContainer}>
              <MapView
                style={styles.map}
                initialRegion={{
                  latitude: location.lat,
                  longitude: location.lng,
                  latitudeDelta: 0.01,
                  longitudeDelta: 0.01,
                }}
                showsUserLocation={true}
                followsUserLocation={true}
              >
                {/* User's current location */}
                <Marker
                  coordinate={{ latitude: location.lat, longitude: location.lng }}
                  title="Your Location"
                  description="Current location"
                >
                  <View style={styles.markerContainer}>
                    <View style={[styles.marker, { backgroundColor: '#007AFF' }]}>
                      <Ionicons name="person" size={16} color="white" />
                    </View>
                  </View>
                </Marker>

                {/* Client request locations */}
                {clients.slice(0, 5).map((client) => {
                  // Use actual coordinates if available, otherwise use random offset from user location
                  const clientLat = client.coords?.lat || (location.lat + (Math.random() - 0.5) * 0.01);
                  const clientLng = client.coords?.lng || (location.lng + (Math.random() - 0.5) * 0.01);
                  return (
                    <Marker
                      key={`client-${client.id}`}
                      coordinate={{
                        latitude: clientLat,
                        longitude: clientLng,
                      }}
                      title={`${client.name}'s Request`}
                      description={`${client.service} - ${client.location}`}
                    >
                      <View style={styles.markerContainer}>
                        <View style={[styles.marker, { backgroundColor: '#FF3B30' }]}>
                          <Ionicons name="briefcase" size={14} color="white" />
                        </View>
                      </View>
                    </Marker>
                  );
                })}
              </MapView>
            </View>
            <Text style={styles.mapHint}>
              Blue pin: Your location | Red pins: Service requests
            </Text>
          </View>
        )}


        {/* SERVICE INFORMATION */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Service Information</Text>
          <View style={{ marginTop: 10 }}>
            <Text style={styles.label}>Select a Service</Text>
            <TouchableOpacity style={styles.picker} onPress={() => setShowServiceModal(true)} disabled={serviceUpdating}>
              <Text style={styles.pickerText}>{selectedServiceName || 'Select a service'}</Text>
              <Ionicons name="chevron-down" size={20} color="#555" />
            </TouchableOpacity>
            {availableServices && availableServices.length > 0 && (
              <Text style={{ fontSize: 11, color: '#666', marginTop: 4 }}>
                {availableServices.length} service{availableServices.length !== 1 ? 's' : ''} available
              </Text>
            )}
            {serviceUpdating && <Text style={{ fontSize: 12, color: '#666' }}>Updating...</Text>}
            <View style={{ marginTop: 15 }}>
              <Text style={styles.detailText}>
                <Text style={styles.bold}>Service:</Text> {formData.service}
              </Text>
              <Text style={styles.detailText}>
                <Text style={styles.bold}>Rate:</Text> ₱{formData.rate}
              </Text>
              <Text style={styles.detailText}>
                <Text style={styles.bold}>Description:</Text> {formData.description}
              </Text>
            </View>
          </View>
        </View>

        {/* WAITING CLIENTS */}
        <Text style={styles.sectionTitle}>Waiting Clients</Text>

        {isLoading ? (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color="#c20884" />
            <Text style={{ color: "#555", marginTop: 10 }}>Loading clients...</Text>
          </View>
        ) : !isOnline ? (
          <View style={styles.offlineMessage}>
            <Text style={styles.offlineText}>
              You are currently offline and cannot receive new requests. Please go online to start receiving requests.
            </Text>
          </View>
        ) : clients.length === 0 ? (
          <Text style={styles.noData}>
            {requestsError || 'No matching requests found. Requests will appear here when a client\'s budget matches your service rate.'}
          </Text>
        ) : (
          clients.map((item) => {
            const maskedEmail = maskEmail(item.email);
            const maskedPhone = maskPhone(item.phone);

            return (
              <View key={item.id} style={styles.clientCard}>
                <View style={styles.profileHeader}>
                  <Image
                    source={item.profilePic ? { uri: getImageUrl(item.profilePic) } : require("../assets/default-profile.png")}
                    style={styles.avatar}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.name}>{item.name}</Text>
                    <Text style={styles.info}>{maskedEmail}</Text>
                    <Text style={styles.info}>{maskedPhone}</Text>
                  </View>
                </View>

                <View style={styles.divider} />

                <View style={styles.details}>
                  <Detail icon="briefcase-outline" label="Service Needed" value={item.service} />
                  <Detail icon="cash-outline" label="Budget" value={item.budget} />
                  <Detail icon="calendar-outline" label="Date Required" value={item.date} />
                  <Detail icon="time-outline" label="Preferred Time" value={item.time} />
                  <Detail icon="location-outline" label="Location" value={item.location} />
                  {item.note && <Detail icon="document-text-outline" label="Note" value={item.note} />}
                </View>

                <View style={styles.buttonRow}>
                  <TouchableOpacity
                    style={styles.declineButton}
                    onPress={() => handleDecline(item)}
                  >
                    <Text style={styles.declineText}>Decline</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.acceptButton}
                    onPress={() => confirmAccept(item)}
                  >
                    <Text style={styles.acceptText}>Accept Request</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}

        {/* ORDERS NOTE */}
        <View style={styles.ordersNote}>
          <Text style={styles.ordersNoteText}>
            *Every order will show below the service provider info - Scrollable so you can see if there's a lot of booking*
          </Text>
        </View>
      </ScrollView>

      {/* MODAL: Select Service */}
      <Modal visible={showServiceModal} transparent animationType="fade" onRequestClose={() => setShowServiceModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Select a Service</Text>
            <FlatList
              data={availableServices}
              keyExtractor={(item) => item.name}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.modalItem,
                    item.name === selectedServiceName && styles.modalItemSelected,
                  ]}
                  onPress={() => handleSelectService(item.name)}
                  disabled={serviceUpdating}
                >
                  <Text
                    style={[
                      styles.modalItemText,
                      item.name === selectedServiceName && { color: "#c20884" },
                    ]}
                  >
                    {item.name} {item.rate ? `(₱${item.rate})` : ''}
                  </Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

/* Reusable Detail Row */
const Detail = ({ label, value, icon }) => (
  <View style={styles.detailRow}>
    <Ionicons name={icon} size={16} color="#c20884" style={{ marginRight: 8 }} />
    <Text style={styles.detailLabel}>{label}:</Text>
    <Text style={styles.detailValue}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8F8F8", paddingHorizontal: 18, paddingTop: 20 },
  authRequired: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  authTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
    marginTop: 20,
    marginBottom: 10,
    textAlign: 'center',
  },
  authMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
  },
  loginButton: {
    backgroundColor: '#c20884',
    borderRadius: 25,
    paddingVertical: 15,
    paddingHorizontal: 40,
    alignItems: 'center',
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 18,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },

  statusRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  statusText: { fontSize: 16, fontWeight: "500" },
  sectionTitle: { fontSize: 18, fontWeight: "700", color: "#333", marginBottom: 10 },
  label: { fontSize: 14, color: "#444", fontWeight: "600", marginTop: 14, marginBottom: 5 },
  bold: { fontWeight: "700" },
  detailText: { fontSize: 15, color: "#333", marginBottom: 6 },
  picker: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#F3F3F3",
    borderRadius: 8,
    padding: 12,
  },
  pickerText: { fontSize: 15, color: "#333" },
  clientCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#eee",
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  profileHeader: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  avatar: { width: 55, height: 55, borderRadius: 28, backgroundColor: "#eee", marginRight: 12 },
  name: { fontSize: 16, fontWeight: "700", color: "#333" },
  info: { fontSize: 13, color: "#666" },
  divider: { height: 1, backgroundColor: "#eee", marginVertical: 10 },
  detailRow: { flexDirection: "row", alignItems: "center", marginBottom: 5, flexWrap: "wrap" },
  detailLabel: { fontSize: 14, fontWeight: "600", color: "#444", width: 130 },
  detailValue: { fontSize: 14, color: "#333", flexShrink: 1 },
  buttonRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 8 },
  button: { flexDirection: "row", alignItems: "center", paddingVertical: 10, borderRadius: 25, paddingHorizontal: 40 },
  acceptButton: {flexDirection: "row",alignItems: "center",justifyContent: "center",backgroundColor: "#4CAF50",borderRadius: 25,paddingVertical: 10,paddingHorizontal: 20,marginTop: 10,flex: 1, marginLeft: 5},
  declineButton: {flexDirection: "row",alignItems: "center",justifyContent: "center",backgroundColor: "#F44336",borderRadius: 25,paddingVertical: 10,paddingHorizontal: 20,marginTop: 10,flex: 1, marginRight: 5},
  acceptText: { color: "#fff", fontWeight: "600", fontSize: 15, marginLeft: 6 },
  declineText: { color: "#fff", fontWeight: "600", fontSize: 15, marginLeft: 6 },
  buttonText: { color: "#fff", fontWeight: "600", fontSize: 15, marginLeft: 6 },
  noData: { textAlign: "center", color: "#777", marginVertical: 30, fontSize: 16 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "center", alignItems: "center" },
  modalContainer: { width: "85%", backgroundColor: "#fff", borderRadius: 12, padding: 20, maxHeight: "70%" },
  modalTitle: { fontSize: 18, fontWeight: "700", marginBottom: 12, color: "#222" },
  modalItem: { paddingVertical: 15 },
  modalItemSelected: { backgroundColor: "#f9e3f2", borderRadius: 6 },
  modalItemText: { fontSize: 16, color: "#333" },
  loaderContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 50,
  },
  locationHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  locationButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: "#f0f0f0",
  },
  locationInfo: {
    marginTop: 5,
  },
  locationText: {
    fontSize: 14,
    color: "#333",
    marginBottom: 5,
  },
  locationHint: {
    fontSize: 12,
    color: "#666",
    fontStyle: "italic",
  },
  mapContainer: {
    height: 200,
    borderRadius: 10,
    overflow: "hidden",
    marginTop: 10,
  },
  map: {
    flex: 1,
  },
  mapHint: {
    fontSize: 12,
    color: "#666",
    textAlign: "center",
    marginTop: 8,
    fontStyle: "italic",
  },
  markerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  marker: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 5,
  },
  ordersNote: {
    marginTop: 20,
    padding: 15,
    backgroundColor: '#f9f9f9',
    borderRadius: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#c20884',
  },
  ordersNoteText: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
    textAlign: 'center',
  },
  offlineMessage: {
    padding: 20,
    backgroundColor: '#fff3cd',
    borderRadius: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#ffc107',
    marginVertical: 20,
  },
  offlineText: {
    fontSize: 16,
    color: '#856404',
    textAlign: 'center',
  },
});
