import { useState, useRef, useEffect } from "react";
import toast from "react-hot-toast";
import { useMainContext } from "../../mainContext";
import { useNavigate } from "react-router-dom";
import api from "../../api";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import "./dashboard-content.css";

const ServiceRequestForm = () => {
  const { isAuthorized, user } = useMainContext();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: user.firstName + ' ' + user.lastName,
    address: "",
    phone: user?.phone || "",
    typeOfWork: "",
    time: "",
    budget: "",
    notes: "",
    preferredDate: "",
  });


  const [markerPosition, setMarkerPosition] = useState({ lat: 14.5995, lng: 120.9842 }); // Default to Manila
  const mapRef = useRef(null);
  const [map, setMap] = useState(null);
  const markerRef = useRef(null);
  const [locationError, setLocationError] = useState(null);
  const [currentAddress, setCurrentAddress] = useState("");

  const handleChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });


  const getCurrentLocation = async () => {
    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported by this browser.");
      return;
    }

    setLocationError(null);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setMarkerPosition({ lat: latitude, lng: longitude });

        if (map) {
          map.flyTo({
            center: [longitude, latitude],
            zoom: 15,
          });
        }

        // Reverse geocode to get address using backend API
        try {
          const response = await api.get(`/user/reverse-geocode?lat=${latitude}&lon=${longitude}`, { withCredentials: true });

          if (response.data.success && response.data.address) {
            setCurrentAddress(response.data.address);
            setFormData(prev => ({
              ...prev,
              address: response.data.address
            }));
          } else {
            throw new Error("No address found");
          }
        } catch (error) {
          console.error("Reverse geocoding failed:", error);
          // Set a fallback address using coordinates
          const fallbackAddress = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
          setCurrentAddress(fallbackAddress);
          setFormData(prev => ({
            ...prev,
            address: fallbackAddress
          }));
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
        center: [markerPosition.lng, markerPosition.lat],
        zoom: 15,
      });
      newMap.on('load', () => {
        setMap(newMap);
        // Add initial marker - ensure it's always visible
        if (!markerRef.current) {
          markerRef.current = new maplibregl.Marker({ color: '#ff0000' })
            .setLngLat([markerPosition.lng, markerPosition.lat])
            .addTo(newMap);
        }
      });
      newMap.on('click', async (e) => {
        const { lng, lat } = e.lngLat;
        setMarkerPosition({ lat, lng });

        // Ensure marker exists and update position
        if (markerRef.current) {
          markerRef.current.setLngLat([lng, lat]);
        } else if (newMap) {
          // Recreate marker if it was somehow removed
          markerRef.current = new maplibregl.Marker({ color: '#ff0000' })
            .setLngLat([lng, lat])
            .addTo(newMap);
        }

        // Reverse geocode to get address using backend API
        try {
          const response = await api.get(`/user/reverse-geocode?lat=${lat}&lon=${lng}`, { withCredentials: true });

          if (response.data.success && response.data.address) {
            setCurrentAddress(response.data.address);
            setFormData(prev => ({
              ...prev,
              address: response.data.address
            }));
          } else {
            throw new Error("No address found");
          }
        } catch (error) {
          console.error("Reverse geocoding failed:", error);
          // Set a fallback address using coordinates
          const fallbackAddress = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
          setCurrentAddress(fallbackAddress);
          setFormData(prev => ({
            ...prev,
            address: fallbackAddress
          }));
        }
      });
    }
    return () => {
      if (map && typeof map.remove === 'function') {
        try {
          map.remove();
        } catch (error) {
          console.error('Error removing map:', error);
        }
        setMap(null);
      }
      if (markerRef.current && typeof markerRef.current.remove === 'function') {
        try {
          markerRef.current.remove();
        } catch (error) {
          console.error('Error removing marker:', error);
        }
        markerRef.current = null;
      }
    };
  }, []); // Remove markerPosition and map dependencies to prevent marker recreation

  // Separate effect to update marker when markerPosition changes
  useEffect(() => {
    if (markerRef.current && map) {
      markerRef.current.setLngLat([markerPosition.lng, markerPosition.lat]);
    } else if (map && !markerRef.current) {
      // Recreate marker if it was removed but map exists
      markerRef.current = new maplibregl.Marker({ color: '#ff0000' })
        .setLngLat([markerPosition.lng, markerPosition.lat])
        .addTo(map);
    }
  }, [markerPosition, map]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isAuthorized)
      return toast.error("You must log in to submit a service request");

    try {
      const payload = {
        name: formData.name,
        address: formData.address,
        phone: formData.phone,
        typeOfWork: formData.typeOfWork,
        preferredDate: formData.preferredDate,
        time: formData.time,
        budget: formData.budget,
        notes: formData.notes,
        location: markerPosition,
      };

      const response = await api.post("/user/post-service-request", payload, { withCredentials: true });

      // Create request data from the response and form data
      const requestData = {
        _id: response.data.request._id,
        name: formData.name,
        address: formData.address,
        phone: formData.phone,
        typeOfWork: formData.typeOfWork,
        preferredDate: formData.preferredDate,
        time: formData.time,
        budget: formData.budget,
        notes: formData.notes,
        location: markerPosition,
        status: 'Available'
      };

      navigate('/user/waiting-for-worker', { state: { requestData } });

      // Reset form data
      setFormData({
        name: user.firstName + ' ' + user.lastName,
        address: "",
        phone: user?.phone ,
        typeOfWork: "",
        preferredDate: "",
        time: "",
        budget: "",
        notes: "",
      });
      setMarkerPosition({ lat: 14.5995, lng: 120.9842 });
      // Update map marker
      if (markerRef.current) {
        markerRef.current.setLngLat([120.9842, 14.5995]);
      }
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Failed to submit service request."
      );
    }
  };

  return (
    <section className="requestForm-container">
      <h2 className="requestForm-title">Submit a Service Request</h2>

      <div className="request-form-layout">
        <div>
          <form onSubmit={handleSubmit} className="requestForm-form">
        <div className="requestForm-group">
          <label>Name</label>
          <input
            type="text"
            name="name"
            value={formData.name}
            disabled
            placeholder="Your name"
            required
          />
        </div>

        <div className="requestForm-group">
          <label>Type of work</label>
          <select
            name="typeOfWork"
            value={formData.typeOfWork}
            onChange={handleChange}
            required
          >
            <option value="">-- Select Type of Work --</option>
            <option value="Plumbing">Plumbing</option>
            <option value="Electrical">Electrical</option>
            <option value="Cleaning">Cleaning</option>
            <option value="Carpentry">Carpentry</option>
            <option value="Painting">Painting</option>
            <option value="Appliance Repair">Appliance Repair</option>
            <option value="Home Renovation">Home Renovation</option>
            <option value="Pest Control">Pest Control</option>
            <option value="Gardening & Landscaping">Gardening & Landscaping</option>
            <option value="Air Conditioning & Ventilation">Air Conditioning & Ventilation</option>
            <option value="Laundry / Labandera">Laundry / Labandera</option>
          </select>
        </div>

        <div className="requestForm-group">
          <label>Notes to worker</label>
          <textarea
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            rows="3"
            placeholder="Notes to worker..."
            required
          ></textarea>
        </div>

        <div className="requestForm-group">
          <label>Budget (₱)</label>
          <input
            type="number"
            name="budget"
            value={formData.budget}
            onChange={handleChange}
            min="0"
          />
        </div>

        <div className="requestForm-group">
          <label>Address</label>
          <input
            type="text"
            name="address"
            value={formData.address}
            onChange={handleChange}
            placeholder="Your address"
            required
          />
        </div>

        <div className="requestForm-group">
          <label>Phone No.</label>
          <input
            type="tel"
            name="phone"
            value={formData.phone}
            disabled
            placeholder={user?.phone ? user.phone : "+63"}
            required
          />
        </div>

        <div className="requestForm-group">
          <label>Preferred Date</label>
          <input
            type="date"
            name="preferredDate"
            value={formData.preferredDate}
            onChange={handleChange}
            required
          />
        </div>

        <div className="requestForm-group">
          <label>Time</label>
          <input
            type="time"
            name="time"
            value={formData.time}
            onChange={handleChange}
            required
          />
        </div>

        <button type="submit" className="requestForm-submitBtn">
          Post Request
        </button>
      </form>


          </div>

          <div className="map-section">
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
                      setFormData(prev => ({
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
          </div>
        </div>
      </section>
  );
};

export default ServiceRequestForm;
