import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api";
import toast from "react-hot-toast";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import {
  FaPlus, FaClipboardList, FaMapMarkerAlt, FaDollarSign,
  FaCalendarAlt, FaTools, FaFileAlt, FaImage, FaSave, FaChartLine
} from "react-icons/fa";
import RecommendedWorkersModal from "./RecommendedWorkersModal";

const CreateServiceRequest = ({ onClose }) => {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    location: "",
    budgetRange: { min: 0, max: 0 },
    preferredDate: null,
    preferredTime: "",
    serviceCategory: ""
  });
  const [loading, setLoading] = useState(false);
  const [showRecommendations, setShowRecommendations] = useState(false);
  const [createdRequestId, setCreatedRequestId] = useState(null);

  const serviceCategories = [
    "Plumbing",
    "Electrical",
    "Cleaning",
    "Carpentry",
    "Painting",
    "Appliance Repair",
    "Home Renovation",
    "Pest Control",
    "Gardening & Landscaping",
    "Air Conditioning & Ventilation",
    "Laundry / Labandera"
  ];

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name === "budgetRange") {
      setFormData(prev => ({
        ...prev,
        budgetRange: { ...prev.budgetRange, [e.target.dataset.field]: value }
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleDateChange = (date) => {
    setFormData(prev => ({ ...prev, preferredDate: date }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.title || !formData.description || !formData.location || !formData.serviceCategory) {
      toast.error("Please fill in all required fields");
      return;
    }

    setLoading(true);
    try {
      // Prepare data for submission - convert date object to string
      const submitData = {
        ...formData,
        preferredDate: formData.preferredDate ? formData.preferredDate.toISOString().split('T')[0] : null
      };

      const response = await api.post("/user/create-service-request", submitData);
      if (response.data.success) {
        toast.success("Service request created successfully! View recommended workers below.");
        setCreatedRequestId(response.data.serviceRequest._id);
        setShowRecommendations(true);
        // Don't close immediately - let user see recommendations
      }
    } catch (error) {
      console.error("Error creating service request:", error);
      toast.error("Failed to create service request");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900 flex items-center">
              <FaPlus className="mr-3 text-blue-600" />
              Create Service Request
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl"
            >
              ×
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <FaClipboardList className="inline mr-2" />
                  Request Title *
                </label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  placeholder="e.g., Fix leaking kitchen sink"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <FaTools className="inline mr-2" />
                  Service Category *
                </label>
                <select
                  name="serviceCategory"
                  value={formData.serviceCategory}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select a category</option>
                  {serviceCategories.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <FaFileAlt className="inline mr-2" />
                Description *
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows={4}
                placeholder="Please describe the service you need in detail..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Location */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <FaMapMarkerAlt className="inline mr-2" />
                Location *
              </label>
              <input
                type="text"
                name="location"
                value={formData.location}
                onChange={handleInputChange}
                placeholder="Enter your address or area"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Budget Range */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <FaDollarSign className="inline mr-2" />
                  Minimum Budget (₱)
                </label>
                <input
                  type="number"
                  name="budgetRange"
                  data-field="min"
                  value={formData.budgetRange.min}
                  onChange={handleInputChange}
                  placeholder="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <FaDollarSign className="inline mr-2" />
                  Maximum Budget (₱)
                </label>
                <input
                  type="number"
                  name="budgetRange"
                  data-field="max"
                  value={formData.budgetRange.max}
                  onChange={handleInputChange}
                  placeholder="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Preferred Schedule */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <FaCalendarAlt className="inline mr-2" />
                  Preferred Date
                </label>
                <DatePicker
                  selected={formData.preferredDate}
                  onChange={handleDateChange}
                  minDate={new Date()}
                  dateFormat="MMMM d, yyyy"
                  placeholderText="Select a date"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  wrapperClassName="w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <FaCalendarAlt className="inline mr-2" />
                  Preferred Time
                </label>
                <input
                  type="time"
                  name="preferredTime"
                  value={formData.preferredTime || ""}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex justify-end space-x-3 pt-4 border-t">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                <FaSave className="mr-2" />
                {loading ? "Creating..." : "Create Request"}
              </button>
            </div>
          </form>

          {/* Show Recommendations after creation */}
          {showRecommendations && createdRequestId && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <RecommendedWorkersModal
                serviceRequestId={createdRequestId}
                onClose={() => {
                  setShowRecommendations(false);
                  if (onClose) onClose();
                }}
                onSelectWorker={(worker) => {
                  toast.success(`Selected ${worker.firstName} ${worker.lastName}`);
                  // Navigate to send offer or booking
                  if (onClose) onClose();
                }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CreateServiceRequest;
