import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  FlatList,
  Alert,
  Switch,
  Dimensions,
  Platform,
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import Icon from 'react-native-vector-icons/FontAwesome';
import { useMainContext } from '../contexts/MainContext';
import Loader from '../components/Loader';

const { width, height } = Dimensions.get('window');

const MyServiceScreen = () => {
  const { user, api, isAuthorized } = useMainContext();
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(true);
  const [statusLoading, setStatusLoading] = useState(false);
  const [formData, setFormData] = useState({
    service: '',
    rate: '',
    description: ''
  });
  const [predefinedServices, setPredefinedServices] = useState([]);
  const [selectedService, setSelectedService] = useState('');
  const [serviceUpdating, setServiceUpdating] = useState(false);
  const [currentRequests, setCurrentRequests] = useState([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [requestsError, setRequestsError] = useState('');
  const [acceptingRequest, setAcceptingRequest] = useState(null);
  const [decliningRequest, setDecliningRequest] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [clientLocations, setClientLocations] = useState([]);
  const [locationLoading, setLocationLoading] = useState(true);

  const mapRef = useRef(null);

  // Helper function to calculate distance between two coordinates in kilometers
  const calculateDistance = (lat1, lng1, lat2, lng2) => {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a =
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  useEffect(() => {
    const fetchServiceData = async () => {
      try {
        if (!isAuthorized || !user) {
          setLoading(false);
          return;
        }
        const response = await api.get('/user/service-profile');
        if (response.data.success) {
          const data = response.data.data;
          setFormData({
            service: data.service || '',
            rate: data.rate || '',
            description: data.description || ''
          });
          if (data.service) {
            setSelectedService(data.service);
          }
          setIsOnline(data.isOnline !== false);
        }
      } catch (error) {
        setIsOnline(true);
      } finally {
        setLoading(false);
      }
    };
    fetchServiceData();
  }, [user, isAuthorized]);

  useEffect(() => {
    if (!isAuthorized || !user || user.role !== "Service Provider") return;

    const loadData = async () => {
      setLoadingRequests(true);
      try {
        const params = { showAll: true };
        if (userLocation) {
          params.lat = userLocation.lat;
          params.lng = userLocation.lng;
        }

        const requestsResponse = await api.get('/user/service-requests', { params });

        let requests = [];
        if (requestsResponse.data.success) {
          requests = requestsResponse.data.requests.filter(request => request.requester?._id !== user._id);
        }

        // Apply client-side filtering based on matching criteria
        const filteredRequests = requests.filter(request => {
          // Budget and rate match (within ±200 peso tolerance)
          const budgetMatch = (() => {
            if (!request.budget || !formData.rate) return false;
            const tolerance = 200;
            const rateDiff = Math.abs(request.budget - parseFloat(formData.rate));
            return rateDiff <= tolerance;
          })();

          // Services match (provider's skills include the requested service)
          const serviceMatch = (() => {
            if (!user.skills || user.skills.length === 0 || !request.typeOfWork) return false;
            return user.skills.some(skill =>
              request.typeOfWork?.toLowerCase().includes(skill.toLowerCase()) ||
              skill.toLowerCase().includes(request.typeOfWork?.toLowerCase())
            );
          })();

          // Location match (within 5km radius)
          const locationMatch = (() => {
            if (!userLocation || !request.location || !request.location.lat || !request.location.lng) return false;
            const distance = calculateDistance(
              userLocation.lat,
              userLocation.lng,
              request.location.lat,
              request.location.lng
            );
            return distance <= 5; // 5km radius
          })();

          // Show request if it matches ANY of the criteria
          return budgetMatch || serviceMatch || locationMatch;
        });

        setCurrentRequests(filteredRequests);
        setRequestsError(filteredRequests.length === 0 ? 'No matching requests found.' : '');
      } catch (error) {
        console.error('Error loading data:', error);
        setCurrentRequests([]);
        if (error.response && error.response.status === 403) {
          setRequestsError('Access denied. You must be a Service Provider.');
        } else {
          setRequestsError('No matching requests found.');
        }
      } finally {
        setLoadingRequests(false);
      }
    };

    loadData();
  }, [user, isAuthorized, userLocation]);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setUserLocation({ lat: latitude, lng: longitude });
          setLocationLoading(false);
        },
        (error) => {
          console.error('Error getting location:', error);
          Alert.alert('Location Error', 'Failed to get your location. Please check location permissions.');
          setLocationLoading(false);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
      );
    } else {
      setLocationLoading(false);
    }
  }, []);

  useEffect(() => {
    if (currentRequests.length > 0) {
      const locations = [];
      for (const request of currentRequests) {
        if (request.location && request.location.lat && request.location.lng) {
          locations.push({
            requestId: request._id,
            coords: { lat: request.location.lat, lng: request.location.lng },
            request: request
          });
        }
      }
      setClientLocations(locations);
    } else {
      setClientLocations([]);
    }
  }, [currentRequests]);

  useEffect(() => {
    const fetchUserServices = async () => {
      if (!isAuthorized || !user) {
        return;
      }

      try {
        const response = await api.get('/user/services');
        if (response.data.success && response.data.services && Array.isArray(response.data.services)) {
          const services = response.data.services.filter(service => service && service.name);
          if (services.length > 0) {
            setPredefinedServices(services);
          } else {
            try {
              const fallbackResponse = await api.get('/user/predefined-services');
              if (fallbackResponse.data.success) {
                const predefined = fallbackResponse.data.services || [];
                setPredefinedServices(predefined);
              }
            } catch (fallbackError) {
              console.error('Error fetching fallback services:', fallbackError);
            }
          }
        } else {
          try {
            const fallbackResponse = await api.get('/user/predefined-services');
            if (fallbackResponse.data.success) {
              setPredefinedServices(fallbackResponse.data.services || []);
            }
          } catch (fallbackError) {
            console.error('Error fetching fallback services:', fallbackError);
          }
        }
      } catch (error) {
        console.error('Error fetching user services:', error);
        try {
          const fallbackResponse = await api.get('/user/predefined-services');
          if (fallbackResponse.data.success) {
            setPredefinedServices(fallbackResponse.data.services || []);
          }
        } catch (fallbackError) {
          console.error('Error fetching fallback services:', fallbackError);
        }
      }
    };
    fetchUserServices();
  }, [user, isAuthorized]);

  useEffect(() => {
    if (formData.service && predefinedServices.length > 0) {
      const hasCurrentService = predefinedServices.some(s => s.name === formData.service);
      if (!hasCurrentService) {
        const updatedServices = [
          {
            name: formData.service,
            rate: formData.rate || 0,
            description: formData.description || '',
            _id: 'current-service'
          },
          ...predefinedServices
        ];
        setPredefinedServices(updatedServices);
      }
    }
  }, [formData.service, formData.rate, formData.description, predefinedServices]);

  const handleServiceSelect = async (serviceName) => {
    if (!serviceName) {
      setSelectedService('');
      return;
    }

    const selectedPredefinedService = predefinedServices.find(service => service.name === serviceName);

    if (selectedPredefinedService) {
      setServiceUpdating(true);
      try {
        const response = await api.post('/user/service-profile', {
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
          setSelectedService(serviceName);
          Alert.alert('Success', 'Service profile updated successfully');
        }
      } catch (error) {
        console.error('Error updating service profile:', error);
        Alert.alert('Error', error.response?.data?.message || 'Failed to update service profile');
      } finally {
        setServiceUpdating(false);
      }
    } else {
      Alert.alert('Error', 'Selected service not found in your services list');
    }
  };

  const handleStatusToggle = async () => {
    if (statusLoading) return;

    const newStatus = !isOnline;
    setStatusLoading(true);

    try {
      const response = await api.put('/user/service-status', {
        isOnline: newStatus
      });
      if (response.data.success) {
        setIsOnline(newStatus);
        Alert.alert('Success', `Status updated to ${newStatus ? 'Online' : 'Offline'}`);

        if (newStatus && user && user.role === "Service Provider") {
          // Refresh requests when going online
          const loadData = async () => {
            setLoadingRequests(true);
            try {
              const params = { showAll: true };
              if (userLocation) {
                params.lat = userLocation.lat;
                params.lng = userLocation.lng;
              }

              const requestsResponse = await api.get('/user/service-requests', { params });
              let requests = [];
              if (requestsResponse.data.success) {
                requests = requestsResponse.data.requests.filter(request => request.requester?._id !== user._id);
              }

              const filteredRequests = requests.filter(request => {
                const budgetMatch = (() => {
                  if (!request.budget || !formData.rate) return false;
                  const tolerance = 200;
                  const rateDiff = Math.abs(request.budget - parseFloat(formData.rate));
                  return rateDiff <= tolerance;
                })();

                const serviceMatch = (() => {
                  if (!user.skills || user.skills.length === 0 || !request.typeOfWork) return false;
                  return user.skills.some(skill =>
                    request.typeOfWork?.toLowerCase().includes(skill.toLowerCase()) ||
                    skill.toLowerCase().includes(request.typeOfWork?.toLowerCase())
                  );
                })();

                const locationMatch = (() => {
                  if (!userLocation || !request.location || !request.location.lat || !request.location.lng) return false;
                  const distance = calculateDistance(
                    userLocation.lat,
                    userLocation.lng,
                    request.location.lat,
                    request.location.lng
                  );
                  return distance <= 5;
                })();

                return budgetMatch || serviceMatch || locationMatch;
              });

              setCurrentRequests(filteredRequests);
              setRequestsError(filteredRequests.length === 0 ? 'No matching requests found.' : '');
            } catch (error) {
              console.error('Error loading data:', error);
              setCurrentRequests([]);
              setRequestsError('No matching requests found.');
            } finally {
              setLoadingRequests(false);
            }
          };
          loadData();
        } else if (!newStatus) {
          setCurrentRequests([]);
        }
      }
    } catch (error) {
      console.error('Failed to update status:', error);
      Alert.alert('Error', error.response?.data?.message || 'Failed to update status');
    } finally {
      setStatusLoading(false);
    }
  };

  const confirmAccept = (requestId) => {
    const request = currentRequests.find(req => req._id === requestId);
    if (!request) return;

    Alert.alert(
      'Accept Request',
      `Are you sure you want to accept ${request.requester?.firstName} ${request.requester?.lastName}'s request for ${request.typeOfWork}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Accept', onPress: () => handleAccept(requestId) }
      ]
    );
  };

  const handleAccept = async (requestId) => {
    if (acceptingRequest === requestId) return;

    setAcceptingRequest(requestId);
    try {
      const response = await api.post(`/user/service-request/${requestId}/accept`);
      if (response.data.success) {
        Alert.alert('Success', 'Request accepted successfully!');
        setCurrentRequests(prev => prev.filter(req => req._id !== requestId));
        setClientLocations(prev => prev.filter(loc => loc.requestId !== requestId));
      }
    } catch (error) {
      console.error('Failed to accept request:', error);
      Alert.alert('Error', error.response?.data?.message || 'Failed to accept request');
    } finally {
      setAcceptingRequest(null);
    }
  };

  const handleDecline = async (requestId) => {
    setCurrentRequests(prev => prev.filter(req => req._id !== requestId));
    setClientLocations(prev => prev.filter(loc => loc.requestId !== requestId));
    Alert.alert('Success', 'Request declined');
  };

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

  if (!isAuthorized || !user) {
    return (
      <View style={styles.authRequired}>
        <Icon name="lock" size={64} color="#ccc" />
        <Text style={styles.authTitle}>Authentication Required</Text>
        <Text style={styles.authText}>Please log in to access your service statistics.</Text>
      </View>
    );
  }

  if (user.role !== "Service Provider") {
    return (
      <View style={styles.authRequired}>
        <Icon name="ban" size={64} color="#ccc" />
        <Text style={styles.authTitle}>Access Denied</Text>
        <Text style={styles.authText}>You must be a Service Provider to access this page.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Services Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Your Services</Text>

        <View style={styles.serviceControls}>
          <View style={styles.pickerContainer}>
            <Text style={styles.pickerLabel}>Select Service:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.servicesScroll}>
              {predefinedServices && predefinedServices.length > 0 ? (
                predefinedServices.map((service) => {
                  const serviceName = service.name || '';
                  const serviceRate = service.rate || 0;
                  return (
                    <TouchableOpacity
                      key={service._id || serviceName || Math.random()}
                      style={[
                        styles.serviceOption,
                        selectedService === serviceName && styles.serviceOptionSelected
                      ]}
                      onPress={() => handleServiceSelect(serviceName)}
                      disabled={serviceUpdating}
                    >
                      <Text style={[
                        styles.serviceOptionText,
                        selectedService === serviceName && styles.serviceOptionTextSelected
                      ]}>
                        {serviceName} {serviceRate ? `(₱${serviceRate})` : ''}
                      </Text>
                    </TouchableOpacity>
                  );
                })
              ) : (
                <Text style={styles.noServicesText}>
                  {loading ? 'Loading services...' : 'No services available'}
                </Text>
              )}
            </ScrollView>
          </View>

          <View style={styles.statusToggle}>
            <Text style={styles.statusText}>
              Status: {isOnline ? 'Online' : 'Offline'}
            </Text>
            <Switch
              value={isOnline}
              onValueChange={handleStatusToggle}
              disabled={statusLoading}
              trackColor={{ false: '#ccc', true: '#007bff' }}
              thumbColor={Platform.OS === 'android' ? '#fff' : undefined}
            />
            {statusLoading && <Text style={styles.loadingText}>Updating...</Text>}
          </View>
        </View>

        <View style={styles.serviceInfo}>
          <Text style={styles.infoText}><Text style={styles.infoLabel}>Service:</Text> {formData.service}</Text>
          <Text style={styles.infoText}><Text style={styles.infoLabel}>Rate:</Text> {formData.rate}</Text>
          <Text style={styles.infoText}><Text style={styles.infoLabel}>Description:</Text> {formData.description}</Text>
        </View>
      </View>

      {/* Map Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Service Area Map</Text>
        {locationLoading ? (
          <View style={styles.mapLoading}>
            <Loader />
            <Text>Getting your current location...</Text>
          </View>
        ) : (
          <View style={styles.mapContainer}>
            <MapView
              ref={mapRef}
              style={styles.map}
              initialRegion={{
                latitude: userLocation?.lat || 14.0,
                longitude: userLocation?.lng || 121.0,
                latitudeDelta: 0.0922,
                longitudeDelta: 0.0421,
              }}
              showsUserLocation={true}
              showsMyLocationButton={true}
            >
              {clientLocations.map((location) => (
                <Marker
                  key={location.requestId}
                  coordinate={{
                    latitude: location.coords.lat,
                    longitude: location.coords.lng,
                  }}
                  title={`${location.request.requester?.firstName} ${location.request.requester?.lastName}`}
                  description={`${location.request.typeOfWork} - ₱${location.request.budget}`}
                  pinColor="#007bff"
                />
              ))}
            </MapView>
          </View>
        )}
      </View>

      {/* Client Requests Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Available Requests ({currentRequests.length})</Text>

        {loadingRequests ? (
          <Loader />
        ) : !isOnline ? (
          <View style={styles.offlineMessage}>
            <Text style={styles.offlineText}>
              You are currently offline and cannot receive new requests. Please go online to start receiving requests.
            </Text>
          </View>
        ) : currentRequests.length > 0 ? (
          <FlatList
            data={currentRequests}
            renderItem={({ item: request }) => (
              <View key={request._id} style={styles.requestCard}>
                <View style={styles.requestHeader}>
                  <Text style={styles.requestTitle}>Client Request</Text>
                  <Text style={styles.requestDate}>
                    {request.preferredDate && request.time
                      ? `${request.preferredDate} at ${request.time}`
                      : request.preferredDate
                        ? request.preferredDate
                        : request.time
                          ? `Time: ${request.time}`
                          : 'Date/Time not specified'
                    }
                  </Text>
                </View>
                <View style={styles.requestDetails}>
                  <Text style={styles.detailText}><Text style={styles.detailLabel}>Name:</Text> {request.requester?.firstName} {request.requester?.lastName}</Text>
                  <Text style={styles.detailText}><Text style={styles.detailLabel}>Email:</Text> {maskEmail(request.requester?.email)}</Text>
                  <Text style={styles.detailText}><Text style={styles.detailLabel}>Phone:</Text> {maskPhone(request.requester?.phone)}</Text>
                  <Text style={styles.detailText}><Text style={styles.detailLabel}>Service Needed:</Text> {request.typeOfWork}</Text>
                  <Text style={styles.detailText}><Text style={styles.detailLabel}>Budget:</Text> ₱{request.budget}</Text>
                  <Text style={styles.detailText}><Text style={styles.detailLabel}>Address:</Text> {request.address}</Text>
                </View>
                <View style={styles.requestActions}>
                  <TouchableOpacity
                    style={styles.acceptButton}
                    onPress={() => confirmAccept(request._id)}
                    disabled={acceptingRequest === request._id || decliningRequest === request._id}
                  >
                    <Text style={styles.acceptButtonText}>
                      {acceptingRequest === request._id ? 'Accepting...' : 'Accept'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.declineButton}
                    onPress={() => handleDecline(request._id)}
                    disabled={acceptingRequest === request._id || decliningRequest === request._id}
                  >
                    <Text style={styles.declineButtonText}>
                      {decliningRequest === request._id ? 'Declining...' : 'Decline'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
            keyExtractor={(item) => item._id}
            scrollEnabled={false}
          />
        ) : (
          <View style={styles.noRequests}>
            <Text style={styles.noRequestsText}>
              {requestsError || 'No matching requests found. Requests will appear here when a client\'s budget matches your service rate and they are within your service area.'}
            </Text>
          </View>
        )}

        <Text style={styles.note}>
          *Every order will show below the service provider info - Scrollable so you can see if there's a lot of booking*
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  authRequired: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  authTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  authText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  section: {
    backgroundColor: '#fff',
    margin: 16,
    marginBottom: 0,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  serviceControls: {
    marginBottom: 16,
  },
  pickerContainer: {
    marginBottom: 16,
  },
  pickerLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  servicesScroll: {
    flexDirection: 'row',
  },
  serviceOption: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  serviceOptionSelected: {
    backgroundColor: '#007bff',
    borderColor: '#007bff',
  },
  serviceOptionText: {
    fontSize: 12,
    color: '#666',
  },
  serviceOptionTextSelected: {
    color: '#fff',
    fontWeight: 'bold',
  },
  noServicesText: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
  statusToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  loadingText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 8,
  },
  serviceInfo: {
    backgroundColor: '#f9f9f9',
    padding: 12,
    borderRadius: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#333',
    marginBottom: 4,
  },
  infoLabel: {
    fontWeight: 'bold',
  },
  mapContainer: {
    height: 200,
    borderRadius: 8,
    overflow: 'hidden',
  },
  map: {
    flex: 1,
  },
  mapLoading: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
  },
  offlineMessage: {
    padding: 16,
    backgroundColor: '#fff3cd',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ffeaa7',
  },
  offlineText: {
    fontSize: 14,
    color: '#856404',
    textAlign: 'center',
  },
  requestCard: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  requestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  requestTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  requestDate: {
    fontSize: 12,
    color: '#666',
  },
  requestDetails: {
    marginBottom: 12,
  },
  detailText: {
    fontSize: 12,
    color: '#333',
    marginBottom: 4,
  },
  detailLabel: {
    fontWeight: 'bold',
  },
  requestActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  acceptButton: {
    backgroundColor: '#28a745',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    flex: 1,
    marginRight: 8,
    alignItems: 'center',
  },
  acceptButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  declineButton: {
    backgroundColor: '#dc3545',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    flex: 1,
    marginLeft: 8,
    alignItems: 'center',
  },
  declineButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  noRequests: {
    padding: 16,
    alignItems: 'center',
  },
  noRequestsText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
  note: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 16,
  },
});

export default MyServiceScreen;
