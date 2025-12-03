import { useState, useEffect, useRef } from 'react';
import api from '../../api.js';
import { useMainContext } from '../../mainContext';
import toast from 'react-hot-toast';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import socket from '../../utils/socket';
import './MyService.css';

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

const MyService = () => {
  const { user, isAuthorized } = useMainContext();
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(true);
  const [statusLoading, setStatusLoading] = useState(false);
  const [formData, setFormData] = useState({
    service: '',
    rate: '',
    description: ''
  });
  const [showEditModal, setShowEditModal] = useState(false);
  const [editFormData, setEditFormData] = useState({});
  const [predefinedServices, setPredefinedServices] = useState([]);
  const [selectedService, setSelectedService] = useState('');
  const [serviceUpdating, setServiceUpdating] = useState(false);
  const [clientData, setClientData] = useState({
    name: '',
    phone: '',
    service: '',
    cost: 0,
    date: '',
    address: ''
  });
  const [currentRequests, setCurrentRequests] = useState([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [requestsError, setRequestsError] = useState('');
  const [acceptingRequest, setAcceptingRequest] = useState(null);
  const [decliningRequest, setDecliningRequest] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [clientLocations, setClientLocations] = useState([]);
  const [locationLoading, setLocationLoading] = useState(true);
  const mapContainer = useRef(null);
  const map = useRef(null);
  const userMarker = useRef(null);
  const clientMarkers = useRef({});

  useEffect(() => {
    const fetchServiceData = async () => {
      try {
        if (!isAuthorized || !user) {
          console.log('MyService - User not authenticated or no user data');
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
          // Set selected service if service exists
          if (data.service) {
            setSelectedService(data.service);
            console.log('MyService: Current service profile loaded:', {
              service: data.service,
              rate: data.rate,
              description: data.description
            });
          } else {
            console.log('MyService: No service name in profile');
          }
          setIsOnline(data.isOnline !== false); // Default to true
        }
      } catch (error) {
        setIsOnline(true);
      } finally {
        setLoading(false);
      }
    };
    fetchServiceData();
  }, [user, isAuthorized]);

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
    if (!isAuthorized || !user || user.role !== "Service Provider") return;

    const loadData = async () => {
      setLoadingRequests(true);
      try {
        // Send current location for proximity matching
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
    socket.on("service-request-updated", (data) => {
      console.log("Service request updated:", data);
      loadData();
    });
    return () => {
      socket.off("service-request-updated");
    };
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

          let errorMessage = "Failed to get your location. Please try again.";
          if (error.message.includes('unavailable')) {
            errorMessage = "Location services are unavailable. Please check your device settings and try again.";
          } else if (error.message.includes('timeout')) {
            errorMessage = "Location request timed out. Please try again.";
          } else if (error.message.includes('permission')) {
            errorMessage = "Location permission was denied. Please grant location access.";
          }

          toast.error(errorMessage);
          setLocationLoading(false);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
      );
    } else {
      setLocationLoading(false);
    }
  }, []);

  // Use location from service requests
  useEffect(() => {
    if (currentRequests.length > 0) {
      const locations = [];
      for (const request of currentRequests) {
        if (request.location && request.location.lat && request.location.lng) {
          locations.push({
            requestId: request._id,
            coords: { lat: request.location.lat, lng: request.location.lng }
          });
        }
      }
      setClientLocations(locations);
    } else {
      setClientLocations([]);
    }
  }, [currentRequests]);

  useEffect(() => {
    if (mapContainer.current && !map.current && !locationLoading) {
      try {
        const initialCenter = userLocation ? [userLocation.lng, userLocation.lat] : [121.0, 14.0];

        map.current = new maplibregl.Map({
          container: mapContainer.current,
          style: {
            version: 8,
            sources: {
              'osm': {
                type: 'raster',
                tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
                tileSize: 256,
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
                maxzoom: 19
              }
            },
            layers: [{
              id: 'osm',
              type: 'raster',
              source: 'osm'
            }]
          },
          center: initialCenter,
          zoom: userLocation ? 15 : 12,
          attributionControl: true,
          failIfMajorPerformanceCaveat: false
        });

        // Add marker for current location if available
        if (userLocation) {
          userMarker.current = new maplibregl.Marker({
            color: '#FF0000',
            title: 'Your Location'
          })
          .setLngLat([userLocation.lng, userLocation.lat])
          .addTo(map.current);
        }

        // Handle map resize
        const handleResize = () => {
          if (map.current) {
            map.current.resize();
          }
        };

        window.addEventListener('resize', handleResize);

        // Handle map load event
        map.current.on('load', () => {
          console.log('Map loaded successfully');
        });

        // Handle map errors
        map.current.on('error', (e) => {
          console.error('Map error:', e);
        });

        // Cleanup
        return () => {
          window.removeEventListener('resize', handleResize);
          if (map.current) {
            map.current.remove();
            map.current = null;
          }
          // Clear client markers
          Object.values(clientMarkers.current).forEach(marker => marker.remove());
          clientMarkers.current = {};
        };
      } catch (error) {
        console.error('Error initializing map:', error);
        // Set locationLoading to false to prevent infinite loading
        setLocationLoading(false);
      }
    }
  }, [userLocation, locationLoading]);

  // Update user marker if userLocation changes
  useEffect(() => {
    if (map.current && userLocation) {
      if (userMarker.current) {
        userMarker.current.setLngLat([userLocation.lng, userLocation.lat]);
      } else {
        userMarker.current = new maplibregl.Marker({ color: '#FF0000' })
          .setLngLat([userLocation.lng, userLocation.lat])
          .addTo(map.current);
      }
    }
  }, [userLocation]);

  // Update map when clientLocations changes
  useEffect(() => {
    if (map.current) {
      // Clear existing client markers
      Object.values(clientMarkers.current).forEach(marker => marker.remove());
      clientMarkers.current = {};

      // Add new client markers
      if (clientLocations.length > 0) {
        const bounds = new maplibregl.LngLatBounds();

        // Add user location to bounds if available
        if (userLocation) {
          bounds.extend([userLocation.lng, userLocation.lat]);
        }

        clientLocations.forEach((location) => {
          // Find the corresponding request to get additional info
          const request = currentRequests.find(req => req._id === location.requestId);
          if (request) {
            const marker = new maplibregl.Marker({
              color: '#007bff',
              title: `${request.requester?.firstName} ${request.requester?.lastName} - ${request.typeOfWork}`
            })
            .setLngLat([location.coords.lng, location.coords.lat])
            .addTo(map.current);

            clientMarkers.current[location.requestId] = marker;
            bounds.extend([location.coords.lng, location.coords.lat]);
          }
        });

        // Fit map to show all markers
        map.current.fitBounds(bounds, {
          padding: 50,
          maxZoom: 15
        });
      }
    }
  }, [clientLocations, userLocation, currentRequests]);

  useEffect(() => {
    const fetchUserServices = async () => {
      if (!isAuthorized || !user) {
        console.log('MyService: Not authorized or no user, skipping service fetch');
        return;
      }
      
      console.log('MyService: Fetching user services...');
      try {
        const response = await api.get('/user/services');
        console.log('MyService: User services response:', response.data);
        
        if (response.data.success && response.data.services && Array.isArray(response.data.services)) {
          // Services from user's services array in database
          // Expected structure: [{ _id, name, rate, description }, ...]
          const services = response.data.services.filter(service => service && service.name);
          console.log('MyService: Filtered services:', services);
          console.log('MyService: Services count:', services.length);
          
          if (services.length > 0) {
            setPredefinedServices(services);
            console.log('MyService: Set predefinedServices to user services');
          } else {
            console.log('MyService: User has no services in array, fetching predefined services...');
            // User has empty services array, fetch predefined services
            try {
              const fallbackResponse = await api.get('/user/predefined-services');
              if (fallbackResponse.data.success) {
                const predefined = fallbackResponse.data.services || [];
                setPredefinedServices(predefined);
                console.log('MyService: Set predefinedServices to fallback:', predefined.length);
              }
            } catch (fallbackError) {
              console.error('MyService: Error fetching fallback services:', fallbackError);
            }
          }
        } else {
          console.log('MyService: Invalid response structure, trying fallback...');
          // Fallback to predefined services if user has no services
          try {
            const fallbackResponse = await api.get('/user/predefined-services');
            if (fallbackResponse.data.success) {
              setPredefinedServices(fallbackResponse.data.services || []);
              console.log('MyService: Set predefinedServices from fallback');
            }
          } catch (fallbackError) {
            console.error('MyService: Error fetching fallback services:', fallbackError);
          }
        }
      } catch (error) {
        console.error('MyService: Error fetching user services:', error);
        console.error('MyService: Error details:', error.response?.data || error.message);
        // Fallback to predefined services on error
        try {
          const fallbackResponse = await api.get('/user/predefined-services');
          if (fallbackResponse.data.success) {
            setPredefinedServices(fallbackResponse.data.services || []);
            console.log('MyService: Set predefinedServices from error fallback');
          }
        } catch (fallbackError) {
          console.error('MyService: Error fetching fallback services:', fallbackError);
          toast.error('Failed to load services');
        }
      }
    };
    fetchUserServices();
  }, [user, isAuthorized]);

  const handleServiceSelect = async (serviceName) => {
    if (!serviceName) {
      setSelectedService('');
      return;
    }

    console.log('MyService: Service selected:', serviceName);
    console.log('MyService: Available services:', predefinedServices);
    
    // Find the selected service from the user's services array
    const selectedPredefinedService = predefinedServices.find(service => service.name === serviceName);
    console.log('MyService: Found service:', selectedPredefinedService);
    
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
          toast.success('Service profile updated successfully');
          console.log('MyService: Service profile updated successfully');
        }
      } catch (error) {
        console.error('MyService: Error updating service profile:', error);
        toast.error(error.response?.data?.message || 'Failed to update service profile');
        // Don't reset selectedService on error, keep the selection
      } finally {
        setServiceUpdating(false);
      }
    } else {
      console.warn('MyService: Selected service not found in predefined services:', serviceName);
      console.warn('MyService: Available service names:', predefinedServices.map(s => s.name));
      toast.error('Selected service not found in your services list');
    }
  };

  const handleStatusToggle = async () => {
    if (statusLoading) return; // Prevent double-clicks
    
    const newStatus = !isOnline;
    setStatusLoading(true);
    
    try {
      const response = await api.put('/user/service-status', {
        isOnline: newStatus
      });
      if (response.data.success) {
        setIsOnline(newStatus);
        toast.success(`Status updated to ${newStatus ? 'Online' : 'Offline'}`);
        
        // Refresh requests if going online
        if (newStatus && user && user.role === "Service Provider") {
          const loadData = async () => {
            setLoadingRequests(true);
            try {
              // Send current location for proximity matching
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
              setRequestsError('No matching requests found.');
            } finally {
              setLoadingRequests(false);
            }
          };
          loadData();
        } else if (!newStatus) {
          // Clear requests when going offline
          setCurrentRequests([]);
        }
      }
    } catch (error) {
      console.error('Failed to update status:', error);
      toast.error(error.response?.data?.message || 'Failed to update status');
    } finally {
      setStatusLoading(false);
    }
  };



  const confirmAccept = (requestId) => {
    const request = currentRequests.find(req => req._id === requestId);
    if (!request) return;

    const confirmed = window.confirm(`Are you sure you want to accept ${request.requester?.firstName} ${request.requester?.lastName}'s request for ${request.typeOfWork}?`);
    if (confirmed) {
      handleAccept(requestId);
    }
  };

  const handleAccept = async (requestId) => {
    if (acceptingRequest === requestId) return; // Prevent double-clicks

    setAcceptingRequest(requestId);
    try {
      const response = await api.post(`/user/service-request/${requestId}/accept`);
      if (response.data.success) {
        toast.success('Request accepted successfully!');
        setCurrentRequests(prev => prev.filter(req => req._id !== requestId));
        // Remove marker from map
        if (clientMarkers.current[requestId]) {
          clientMarkers.current[requestId].remove();
          delete clientMarkers.current[requestId];
        }
        // Update client locations
        setClientLocations(prev => prev.filter(loc => loc.requestId !== requestId));
      }
    } catch (error) {
      console.error('Failed to accept request:', error);
      toast.error(error.response?.data?.message || 'Failed to accept request');
    } finally {
      setAcceptingRequest(null);
    }
  };

  const handleDecline = async (requestId) => {
    setCurrentRequests(prev => prev.filter(req => req._id !== requestId));
    // Remove marker from map
    if (clientMarkers.current[requestId]) {
      clientMarkers.current[requestId].remove();
      delete clientMarkers.current[requestId];
    }
    // Update client locations
    setClientLocations(prev => prev.filter(loc => loc.requestId !== requestId));
    toast.success('Request declined');
  };

  const handleSaveService = async () => {
    if (!editFormData.service || !editFormData.service.trim()) {
      toast.error('Service name is required');
      return;
    }
    
    try {
      const response = await api.post('/user/service-profile', {
        service: editFormData.service.trim(),
        rate: editFormData.rate || 0,
        description: editFormData.description || ''
      });
      if (response.data.success) {
        setFormData({ ...editFormData });
        setSelectedService(editFormData.service);
        setShowEditModal(false);
        toast.success('Service profile updated successfully');
      }
    } catch (error) {
      console.error('Failed to update service profile:', error);
      toast.error(error.response?.data?.message || 'Failed to update service profile');
    }
  };

  if (!isAuthorized || !user) {
    return (
      <div className="my-service-container">
        <div className="auth-required">
          <div className="auth-icon">🔒</div>
          <h3>Authentication Required</h3>
          <p>Please log in to access your service statistics.</p>
          <button className="btn-primary" onClick={() => window.location.href = '/login'}>
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  if (user.role !== "Service Provider") {
    return (
      <div className="my-service-container">
        <div className="auth-required">
          <div className="auth-icon">🚫</div>
          <h3>Access Denied</h3>
          <p>You must be a Service Provider to access this page.</p>
          <button className="btn-primary" onClick={() => window.location.href = '/user/manage-profile'}>
            Go to Profile
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="my-service-container">
      <div className="main-layout">
        <div className="left-column">
          <div className="services-section">
            <h3>Your Services:</h3>
            <div className="service-controls">
              <select 
                value={selectedService} 
                onChange={(e) => handleServiceSelect(e.target.value)} 
                className="form-input"
                disabled={serviceUpdating}
              >
                <option value="">Select a service</option>
                {predefinedServices && predefinedServices.length > 0 ? (
                  predefinedServices.map((service) => {
                    const serviceName = service.name || '';
                    const serviceRate = service.rate || 0;
                    return (
                      <option key={service._id || serviceName || Math.random()} value={serviceName}>
                        {serviceName} {serviceRate ? `(₱${serviceRate})` : ''}
                      </option>
                    );
                  })
                ) : (
                  <option value="" disabled>
                    {loading ? 'Loading services...' : 'No services available'}
                  </option>
                )}
              </select>
              {predefinedServices && predefinedServices.length > 0 && (
                <div style={{ fontSize: '11px', color: '#666', marginTop: '4px' }}>
                  {predefinedServices.length} service{predefinedServices.length !== 1 ? 's' : ''} available
                </div>
              )}
              {serviceUpdating && <span style={{ fontSize: '12px', color: '#666' }}>Updating...</span>}
              <div className="status-toggle">
                <span className={`status-text ${isOnline ? 'online' : 'offline'}`}>
                  {isOnline ? 'Online' : 'Offline'}
                </span>
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={isOnline}
                    onChange={handleStatusToggle}
                    disabled={statusLoading}
                  />
                  <span className="toggle-slider"></span>
                </label>
                {statusLoading && <span style={{ fontSize: '12px', color: '#666', marginLeft: '8px' }}>Updating...</span>}
              </div>
            </div>
            <div className="service-info">
              <p><strong>Service:</strong> {formData.service}</p>
              <p><strong>Rate:</strong> {formData.rate}</p>
              <p><strong>Description:</strong> {formData.description}</p>
            </div>
            {/* <button className="btn-primary" onClick={() => {
              setEditFormData({ ...formData });
              setShowEditModal(true);
            }}>EDIT</button> */}
          </div>

          <div className="client-request-section">
            {loadingRequests ? (
              <div className="loading-container">
                <div className="loading-spinner"></div>
                <p>Loading matching requests...</p>
              </div>
            ) : !isOnline ? (
              <div className="offline-message">
                <p>You are currently offline and cannot receive new requests. Please go online to start receiving requests.</p>
              </div>
            ) : currentRequests.length > 0 ? (
              <div className="requests-list">
                <h4>All Available Requests ({currentRequests.length})</h4>
                {currentRequests.map((request) => (
                  <div key={request._id} className="request-card">
                    <div className="request-header">
                      <span>Client Request</span>
                      <span>
                        {request.preferredDate && request.time
                          ? `${request.preferredDate} at ${request.time}`
                          : request.preferredDate
                            ? request.preferredDate
                            : request.time
                              ? `Time: ${request.time}`
                              : 'Date/Time not specified'
                        }
                      </span>
                    </div>
                    <div className="request-details">
                      <p><strong>Name:</strong> {request.requester?.firstName} {request.requester?.lastName}</p>
                      <p><strong>Email:</strong> {maskEmail(request.requester?.email)}</p>
                      <p><strong>Phone:</strong> {maskPhone(request.requester?.phone)}</p>
                      <p><strong>Service Needed:</strong> {request.typeOfWork}</p>
                      <p><strong>Budget:</strong> ₱{request.budget}</p>
                      <p><strong>Address:</strong> {request.address}</p>
                    </div>
                    <div className="request-actions">
                      <button
                        className="btn-primary"
                        onClick={() => confirmAccept(request._id)}
                        disabled={acceptingRequest === request._id || decliningRequest === request._id}
                      >
                        {acceptingRequest === request._id ? 'Accepting...' : 'Accept'}
                      </button>
                      <button 
                        className="btn-primary" 
                        onClick={() => handleDecline(request._id)}
                        disabled={acceptingRequest === request._id || decliningRequest === request._id}
                        style={{ background: '#dc3545' }}
                      >
                        {decliningRequest === request._id ? 'Declining...' : 'Decline'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="no-requests">
                <p>{requestsError || 'No matching requests found. Requests will appear here when a client\'s budget matches your service rate and they are within your service area.'}</p>
              </div>
            )}
            <div className="orders-note">
              <p>*Every order will show below the service provider info - Scrollable so you can see if there's a lot of booking*</p>
            </div>
          </div>
        </div>

        <div className="right-column">
          <div className="map-section">
            {locationLoading ? (
              <div className="loading-container">
                <div className="loading-spinner"></div>
                <p>Getting your current location...</p>
              </div>
            ) : (
              <div ref={mapContainer} className="map-container">
                {!map.current && !locationLoading && (
                  <div className="map-loading-overlay">
                    <div className="map-loading-content">
                      <div>🗺️</div>
                      <p>Map loading...</p>
                      <p>If map doesn't load, please refresh the page.</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* {showEditModal && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Edit Service Information</h2>
              <button className="close-modal" onClick={() => setShowEditModal(false)}>&times;</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Service:</label>
                <input
                  type="text"
                  value={editFormData.service}
                  onChange={(e) => setEditFormData({ ...editFormData, service: e.target.value })}
                  className="form-input"
                />
              </div>
              <div className="form-group">
                <label>Rate:</label>
                <input
                  type="number"
                  value={editFormData.rate}
                  onChange={(e) => setEditFormData({ ...editFormData, rate: parseFloat(e.target.value) || '' })}
                  className="form-input"
                />
              </div>
              <div className="form-group">
                <label>Description:</label>
                <textarea
                  value={editFormData.description}
                  onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                  className="form-input"
                  rows="4"
                />
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setShowEditModal(false)}>Cancel</button>
              <button className="btn-primary" onClick={handleSaveService}>Save</button>
            </div>
          </div>
        </div>
      )} */}
    </div>
  );
};

export default MyService;
