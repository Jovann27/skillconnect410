import { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import api from "../../api";
import { useMainContext } from "../../mainContext";
import { usePopup } from "../../components/Layout/PopupContext";
import SuccessPopup from "../Layout/SuccessPopup";
import "./UsersRequest.css";

const ServiceRequests = () => {
  const { isAuthorized, user } = useMainContext();
  const navigate = useNavigate();
  const { showNotification } = usePopup();
  const [requests, setRequests] = useState([]);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const mapRef = useRef(null);
  const [map, setMap] = useState(null);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [showMapModal, setShowMapModal] = useState(false);
  const [pendingRequestData, setPendingRequestData] = useState(null);
  const [locationError, setLocationError] = useState(null);
  const [currentAddress, setCurrentAddress] = useState("");

  const fetchRequests = useCallback(async () => {
    if (!isAuthorized) return;
    try {
      console.log("Fetching service requests...");
      const response = await api.get("/user/service-requests", { withCredentials: true });
      const { data } = response;

      console.log("API Response:", data);
      console.log("Requests received:", data.requests?.length || 0);

      if (data.requests && data.requests.length > 0) {
        console.log("Sample request:", data.requests[0]);
        console.log("Sample requester data:", data.requests[0].requester);
        console.log("Requester firstName:", data.requests[0].requester?.firstName);
        console.log("Requester lastName:", data.requests[0].requester?.lastName);
        console.log("Requester username:", data.requests[0].requester?.username);
      }

      if (data.debug) {
        console.log("Debug info:", data.debug);
      }

      setRequests(data.requests || []);
    } catch (err) {
      console.error("API Error:", err);
      console.error("Error response:", err.response?.data);
    }
  }, [isAuthorized]);

  // Role-based access is handled by RoleGuard in App.jsx
  // Service Providers can access this page via RoleGuard configuration

  useEffect(() => {
    if (isAuthorized && user) {
      fetchRequests();
    }
  }, [isAuthorized, user, fetchRequests]);

  useEffect(() => {
    if (mapRef.current && !map) {
      const newMap = new maplibregl.Map({
        container: mapRef.current,
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
        center: [121.0, 14.0], // Default to Philippines
        zoom: 10,
      });
      newMap.on('load', () => {
        setMap(newMap);
      });
      newMap.on('click', async (e) => {
        const { lng, lat } = e.lngLat;
        setSelectedLocation({ lat, lng });

        // Add a marker (smaller and more visible)
        new maplibregl.Marker({
          color: '#ff0000',
          scale: 0.8
        }).setLngLat([lng, lat]).addTo(newMap);

        // Reverse geocode to get address
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`,
            {
              headers: {
                'User-Agent': 'SkillConnect/1.0'
              }
            }
          );
          const data = await response.json();

          if (data && data.display_name) {
            setCurrentAddress(data.display_name);
          }
        } catch (error) {
          console.error("Reverse geocoding failed:", error);
          // Don't show error to user, just use coordinates
        }
      });
    }
    return () => {
      if (map) {
        map.remove();
        setMap(null);
      }
    };
  }, [map]); // Include map dependency


  const ignoreRequest = (id) => {
    setRequests((prev) => prev.filter((r) => r._id !== id));
  };

  const getCurrentLocation = async () => {
    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported by this browser.");
      return;
    }

    setLocationError(null);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setSelectedLocation({ lat: latitude, lng: longitude });

        if (map) {
          map.flyTo({
            center: [longitude, latitude],
            zoom: 15,
          });
          // Add a marker (smaller and more visible)
          new maplibregl.Marker({
            color: '#ff0000',
            scale: 0.8
          }).setLngLat([longitude, latitude]).addTo(map);
        }

        // Reverse geocode to get address
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1`,
            {
              headers: {
                'User-Agent': 'SkillConnect/1.0'
              }
            }
          );
          const data = await response.json();

          if (data && data.display_name) {
            setCurrentAddress(data.display_name);
          }
        } catch (error) {
          console.error("Reverse geocoding failed:", error);
          // Don't show error to user, just use coordinates
        }
      },
      (error) => {
        switch (error.code) {
          case error.PERMISSION_DENIED:
            setLocationError("Location access denied by user.");
            break;
          case error.POSITION_UNAVAILABLE:
            setLocationError("Location information is unavailable.");
            break;
          case error.TIMEOUT:
            setLocationError("Location request timed out.");
            break;
          default:
            setLocationError("An unknown error occurred.");
            break;
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000,
      }
    );
  };

  const submitRequest = async () => {
    if (!selectedLocation || !pendingRequestData) {
      showNotification("Please select a location on the map.", "error", 4000, "Error");
      return;
    }
    try {
      const response = await api.post("/user/post-service-request", {
        ...pendingRequestData,
        address: currentAddress || pendingRequestData.address,
        latitude: selectedLocation.lat,
        longitude: selectedLocation.lng,
      });
      if (response.data.success) {
        setShowSuccessPopup(true);
        setShowMapModal(false);
        setPendingRequestData(null);
        setSelectedLocation(null);
        setCurrentAddress("");
      } else {
        showNotification("Failed to submit service request.", "error", 4000, "Error");
      }
    } catch (error) {
      showNotification(
        error.response?.data?.message || "Failed to submit service request.",
        "error",
        4000,
        "Error"
      );
    }
  };



  return (
    <div className="clients-container">
      <h2 className="clients-title">Clients</h2>

      {requests.length === 0 ? (
        <div className="no-requests">
          <i className="fas fa-users no-requests-icon"></i>
          <h3 className="no-requests-title">No Client Requests</h3>
          <p className="no-requests-text">No client requests available at the moment.</p>
        </div>
      ) : (
        <div>
          {requests.map((req) => (
            <div key={req._id} className="client-card">
              <div className="client-header">
                <div className="client-avatar">
                  <i className="fas fa-user"></i>
                </div>
                <div className="client-info">
                  <h3>{req.requester && req.requester.firstName && req.requester.lastName
                    ? `${req.requester.firstName} ${req.requester.lastName}`
                    : req.requester && req.requester.username
                    ? req.requester.username
                    : "Unknown Client"}</h3>
                  <p className="client-email">{req.requester?.email || 'email@example.com'}</p>
                  <p className="client-phone">{req.requester?.phone || 'No phone'}</p>
                </div>
              </div>

              <div className="service-needed">Service Needed: {req.typeOfWork}</div>

              <div className="service-details">
                <div className="detail-row">
                  <i className="fas fa-wallet detail-icon"></i>
                  <div className="detail-content">
                    <span className="detail-label">Budget:</span>
                    <span className="detail-value">₱{req.budget || '0'}</span>
                  </div>
                </div>

                <div className="detail-row">
                  <i className="fas fa-calendar detail-icon"></i>
                  <div className="detail-content">
                    <span className="detail-label">Date Required:</span>
                    <span className="detail-value">
                      {req.preferredDate ? new Date(req.preferredDate).toLocaleDateString() : "Not specified"}
                    </span>
                  </div>
                </div>

                <div className="detail-row">
                  <i className="fas fa-clock detail-icon"></i>
                  <div className="detail-content">
                    <span className="detail-label">Preferred Time:</span>
                    <span className="detail-value">{req.time || "Not specified"}</span>
                  </div>
                </div>

                <div className="detail-row">
                  <i className="fas fa-map-marker-alt detail-icon"></i>
                  <div className="detail-content">
                    <span className="detail-label">Location:</span>
                    <span className="detail-value">
                      {req.location ? `${req.location.lat}, ${req.location.lng}` : "Not specified"}
                    </span>
                  </div>
                </div>
              </div>

              {req.notes && (
                <div className="service-note">
                  <strong>Note:</strong> {req.notes}
                </div>
              )}

              <div className="client-actions">
                <button
                  className="accept-button"
                  onClick={() => navigate('/user/accepted-request', { state: { requestId: req._id } })}
                >
                  ✓ Accept
                </button>
                <button
                  className="decline-button"
                  onClick={() => ignoreRequest(req._id)}
                >
                  ✕ Decline
                </button>
              </div>
            </div>
          ))}
        </div>
      )}



      {/* Success Popup */}
      <SuccessPopup
        isOpen={showSuccessPopup}
        onClose={() => setShowSuccessPopup(false)}
        title="Request Sent!"
        message="Service request sent successfully! The provider will be notified."
        confirmText="Great!"
      />

      {/* Map Modal for Location Selection */}
      {showMapModal && (
        <div className="map-modal-overlay">
          <div className="map-modal">
            <h3>Select Location on Map</h3>
            <div className="location-controls">
              <button
                type="button"
                onClick={getCurrentLocation}
                className="location-button"
              >
                📍 Use My Location
              </button>
              {locationError && (
                <div className="location-error">
                  {locationError}
                </div>
              )}
              {currentAddress && (
                <div className="address-detected">
                  <strong>Detected Address:</strong> {currentAddress}
                  <button
                    type="button"
                    onClick={() => {
                      setPendingRequestData(prev => ({
                        ...prev,
                        address: currentAddress
                      }));
                      setCurrentAddress("");
                    }}
                    className="use-address-button"
                  >
                    Use This Address
                  </button>
                </div>
              )}
            </div>
            <div ref={mapRef} className="map-container"></div>
            <div className="map-modal-actions">
              <button
                className="cancel-modal-button"
                onClick={() => {
                  setShowMapModal(false);
                  setPendingRequestData(null);
                  setSelectedLocation(null);
                }}
              >
                Cancel
              </button>
              <button
                className="confirm-modal-button"
                onClick={() => {
                  if (selectedLocation) {
                    // Submit the request with selected location
                    submitRequest();
                  } else {
                    showNotification("Please select a location on the map.", "error", 4000, "Error");
                  }
                }}
              >
                Confirm Location
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ServiceRequests;
