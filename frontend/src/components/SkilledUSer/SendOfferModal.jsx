import React, { useState, useEffect } from "react";
import api from "../../api";
import { toast } from "react-hot-toast";
import {
  FaBriefcase, FaTimes, FaMapMarkerAlt, FaDollarSign,
  FaCalendarAlt, FaClock, FaUser, FaStar, FaCheckCircle
} from "react-icons/fa";

const SendOfferModal = ({ provider, onClose, onSuccess }) => {
  const getDefaultTitle = (provider) => {
    if (!provider) return 'Service Request';

    // Get the main service type - prioritize skills, then occupation
    const serviceType = provider.skills && provider.skills.length > 0
      ? provider.skills[0]
      : provider.occupation || 'Service';

    return `${serviceType} needed from ${provider.firstName}`;
  };

  const [formData, setFormData] = useState({
    title: getDefaultTitle(provider),
    description: '',
    location: provider?.address || '',
    minBudget: '500',
    maxBudget: '1000',
    preferredDate: '',
    preferredTime: ''
  });

  const [isSending, setIsSending] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    if (provider) {
      setFormData(prev => ({
        ...prev,
        title: getDefaultTitle(provider),
        location: provider.address || ''
      }));
    }
  }, [provider]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      toast.error('Please enter a title for your service request');
      return;
    }

    if (!formData.description.trim()) {
      toast.error('Please describe the service you need');
      return;
    }

    if (!formData.location.trim()) {
      toast.error('Please enter your location');
      return;
    }

    if (!formData.minBudget || isNaN(parseFloat(formData.minBudget)) || parseFloat(formData.minBudget) <= 0) {
      toast.error('Please enter a valid minimum budget');
      return;
    }

    if (!formData.maxBudget || isNaN(parseFloat(formData.maxBudget)) || parseFloat(formData.maxBudget) <= 0) {
      toast.error('Please enter a valid maximum budget');
      return;
    }

    if (parseFloat(formData.minBudget) > parseFloat(formData.maxBudget)) {
      toast.error('Minimum budget cannot be greater than maximum budget');
      return;
    }

    if (!formData.preferredDate) {
      toast.error('Please select a preferred date');
      return;
    }

    if (!formData.preferredTime) {
      toast.error('Please select a preferred time');
      return;
    }

    setIsSending(true);

    try {
      const response = await api.post('/user/send-direct-service-offer', {
        providerId: provider._id,
        title: formData.title,
        description: formData.description,
        location: formData.location,
        minBudget: parseFloat(formData.minBudget),
        maxBudget: parseFloat(formData.maxBudget),
        preferredDate: formData.preferredDate || null,
        preferredTime: formData.preferredTime || null
      });

      if (response.data.success) {
        // Show success screen with details
        setSuccessMessage(`Your service request "${formData.title}" has been sent successfully to ${provider.firstName} ${provider.lastName}! They will be notified and can respond to your offer.`);
        setShowSuccessModal(true);
        toast.success('Service request sent successfully!');
        if (onSuccess) onSuccess();
      } else {
        toast.error('Failed to send offer');
      }
    } catch (error) {
      console.error('Error sending offer:', error);
      toast.error('Failed to send offer. Please try again.');
    } finally {
      setIsSending(false);
    }
  };

  if (!provider) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[200] p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 flex items-center">
                <FaBriefcase className="mr-3 text-blue-600" />
                Offer Service Request
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Send a direct request to {provider.firstName} {provider.lastName}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl"
            >
              <FaTimes />
            </button>
          </div>

          {/* Provider Info */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center mr-3">
                  {provider.profilePic ? (
                    <img
                      src={provider.profilePic}
                      alt={`${provider.firstName} ${provider.lastName}`}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                  ) : (
                    <FaUser className="text-blue-600" />
                  )}
                </div>
                <div>
                  <h3 className="font-semibold text-lg text-gray-900">
                    {provider.firstName} {provider.lastName}
                    {provider.verified && (
                      <FaCheckCircle className="inline ml-2 text-green-500" title="Verified" />
                    )}
                  </h3>
                  <p className="text-sm text-gray-600">{provider.occupation || "Service Provider"}</p>
                </div>
              </div>

              <div className="flex items-center">
                <FaStar className="text-yellow-400 mr-1" />
                <span className="font-semibold">{provider.averageRating?.toFixed(1) || "N/A"}</span>
                <span className="text-gray-500 text-sm ml-1">
                  ({provider.totalReviews || 0} reviews)
                </span>
              </div>
            </div>

            {provider.skills && provider.skills.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {provider.skills.slice(0, 3).map((skill, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Offer Form */}
          <form onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div>
                <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                  Service Title
                </label>
                <input
                  type="text"
                  id="title"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  placeholder="Brief description of the service needed"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                  Service Description
                </label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  rows={4}
                  placeholder="Describe the service you need in detail"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-1">
                    Location
                  </label>
                  <div className="relative">
                    <FaMapMarkerAlt className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      id="location"
                      name="location"
                      value={formData.location}
                      onChange={handleChange}
                      placeholder="Where the service is needed"
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Budget Range */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Budget Range (₱)
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="relative">
                    <input
                      type="number"
                      id="minBudget"
                      name="minBudget"
                      value={formData.minBudget}
                      onChange={handleChange}
                      placeholder="₱ Minimum budget"
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      min="1"
                      required
                    />
                  </div>
                  <div className="relative">
                    <input
                      type="number"
                      id="maxBudget"
                      name="maxBudget"
                      value={formData.maxBudget}
                      onChange={handleChange}
                      placeholder="₱ Maximum budget"
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      min="1"
                      required
                    />
                  </div>
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  Enter your budget range for this service
                </p>
              </div>

              {/* Preferred Date and Time */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="preferredDate" className="block text-sm font-medium text-gray-700 mb-1">
                    Preferred Date
                  </label>
                  <div className="relative">
                    <FaCalendarAlt className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                      type="date"
                      id="preferredDate"
                      name="preferredDate"
                      value={formData.preferredDate}
                      onChange={handleChange}
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="preferredTime" className="block text-sm font-medium text-gray-700 mb-1">
                    Preferred Time
                  </label>
                  <div className="relative">
                    <FaClock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                      type="time"
                      id="preferredTime"
                      name="preferredTime"
                      value={formData.preferredTime}
                      onChange={handleChange}
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-3 pt-6 border-t mt-6">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
                disabled={isSending}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSending}
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                <FaBriefcase className="mr-2" />
                {isSending ? "Sending Request..." : "Send Request"}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[300] p-4">
          <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4 text-center">
            <div className="mb-6">
              <FaCheckCircle className="text-green-500 text-6xl mx-auto mb-4" />
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Request Sent Successfully!</h3>
              <p className="text-gray-600">{successMessage}</p>
            </div>
            <div className="mb-6">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-sm text-green-800">
                  <strong>What happens next?</strong><br />
                  The provider will review your request and can accept or decline it.
                  You'll be notified once they respond.
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowSuccessModal(false);
                  setSuccessMessage('');
                  onClose();
                }}
                className="flex-1 bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded font-medium"
              >
                Continue Browsing
              </button>
              <button
                onClick={() => {
                  setShowSuccessModal(false);
                  setSuccessMessage('');
                  onClose();
                  // Could navigate to a different page if needed
                }}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded font-medium"
              >
                View Other Providers
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SendOfferModal;
