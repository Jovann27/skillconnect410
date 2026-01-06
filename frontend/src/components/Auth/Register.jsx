import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import { useMainContext } from "../../mainContext";
import api from "../../api";
import { FaEye, FaEyeSlash, FaCheck, FaTimes, FaUpload, FaUser, FaArrowLeft, FaArrowRight } from "react-icons/fa";

import skillconnectLogo from "../Home/images/1000205778-removebg-preview.png";

const Register = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    role: "",
    skills: [],
    serviceTypes: [],
    profilePic: null,
    username: "",
    password: "",
    confirmPassword: "",
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    address: "",
    occupation: "",
    birthdate: "",
    employed: "",
    isApplyingProvider: false,
    certificates: [],
    workProofs: [],
    validId: null,
  });

  const [predefinedServices, setPredefinedServices] = useState([]);
  const [showPopup, setShowPopup] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { setIsAuthorized, setUser, setTokenType } = useMainContext();
  const navigate = useNavigate();

  const totalSteps = formData.role === "Service Provider" ? 4 : 3;

  // Fetch predefined services on component mount
  useEffect(() => {
    const fetchServices = async () => {
      try {
        const { data } = await api.get('/user/predefined-services');
        setPredefinedServices(data.services || []);
      } catch (error) {
        console.error('Error fetching services:', error);
        // Don't show error to user, just use empty list
      }
    };

    fetchServices();
  }, []);

  const validateForm = () => {
    const errors = {};

    if (!formData.username || formData.username.length < 3) {
      errors.username = "Username must be at least 3 characters long";
    }

    // Password validation (must match backend requirement of 8 characters)
    if (!formData.password || formData.password.length < 8) {
      errors.password = "Password must be at least 8 characters long";
    }

    // Confirm password validation
    if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = "Passwords do not match";
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email || !emailRegex.test(formData.email)) {
      errors.email = "Please enter a valid email address";
    }

    // Phone validation (must match backend format: +63XXXXXXXXXX or 0XXXXXXXXXX)
    const phoneRegex = /^(\+63|0)[0-9]{10}$/;
    if (!formData.phone || !phoneRegex.test(formData.phone)) {
      errors.phone = "Invalid phone number format. Use +63XXXXXXXXXX or 0XXXXXXXXXX";
    }

    // Required fields validation
    if (!formData.firstName.trim()) errors.firstName = "First name is required";
    if (!formData.lastName.trim()) errors.lastName = "Last name is required";
    if (!formData.address.trim()) errors.address = "Address is required";
    if (!formData.birthdate) errors.birthdate = "Birthdate is required";
    if (!formData.employed || !["employed", "unemployed"].includes(formData.employed)) {
      errors.employed = "Employment status must be Employed or Unemployed";
    }
    if (!formData.role || !["Community Member", "Service Provider"].includes(formData.role)) {
      errors.role = "Please select a valid role";
    }
      if (!formData.validId) {
        errors.validId = "Valid ID is required";
      } else if (formData.validId && !formData.validId.type.startsWith("image/")) {
        errors.validId = "Valid ID must be an image file (JPG, PNG, etc.)";
      }

    // Service Provider specific validation
    if (formData.role === "Service Provider") {
      if (!formData.skills || formData.skills.length === 0) {
        errors.skills = "At least one skill is required for Service Providers";
      } else if (formData.skills.length > 3) {
        errors.skills = "You can select a maximum of 3 skills";
      }
      if (!formData.serviceTypes || formData.serviceTypes.length === 0) {
        errors.serviceTypes = "At least one service type is required for Service Providers";
      }
      // Allow either certificates OR work proofs (or both)
      if (formData.certificates.length === 0 && formData.workProofs.length === 0) {
        errors.certificates = "At least one certificate or work proof is required for Service Providers";
      }
      // Limit to 3 images per type
      if (formData.certificates.length > 3) {
        errors.certificates = "Maximum 3 certificate images allowed";
      }
      if (formData.workProofs.length > 3) {
        errors.workProofs = "Maximum 3 work proof images allowed";
      }
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateStep = (step) => {
    const errors = {};

    switch(step) {
      case 1: { // Basic Info
        if (!formData.username || formData.username.length < 3) {
          errors.username = "Username must be at least 3 characters long";
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!formData.email || !emailRegex.test(formData.email)) {
          errors.email = "Please enter a valid email address";
        }
        if (!formData.password || formData.password.length < 8) {
          errors.password = "Password must be at least 8 characters long";
        }
        if (formData.password !== formData.confirmPassword) {
          errors.confirmPassword = "Passwords do not match";
        }
        break;
      }
      case 2: { // Personal Info
        if (!formData.firstName.trim()) errors.firstName = "First name is required";
        if (!formData.lastName.trim()) errors.lastName = "Last name is required";
        const phoneRegex = /^(\+63|0)[0-9]{10}$/;
        if (!formData.phone || !phoneRegex.test(formData.phone)) {
          errors.phone = "Invalid phone number format";
        }
        if (!formData.address.trim()) errors.address = "Address is required";
        if (!formData.birthdate) errors.birthdate = "Birthdate is required";
        if (!formData.employed || !["employed", "unemployed"].includes(formData.employed)) {
          errors.employed = "Employment status is required";
        }
        if (!formData.role || !["Community Member", "Service Provider"].includes(formData.role)) {
          errors.role = "Please select a valid role";
        }
        break;
      }
      case 3: // Documents & Skills
        if (!formData.validId) {
          errors.validId = "Valid ID is required";
        }
        if (formData.role === "Service Provider" && (!formData.skills || formData.skills.length === 0)) {
          errors.skills = "At least one skill is required";
        }
        break;
      case 4: // Certificates & Work Proofs (Service Provider only)
        if (formData.role === "Service Provider") {
          // Allow either certificates OR work proofs (or both)
          if (formData.certificates.length === 0 && formData.workProofs.length === 0) {
            errors.certificates = "At least one certificate or work proof is required for Service Providers";
          }
          // Limit to 3 images per type
          if (formData.certificates.length > 3) {
            errors.certificates = "Maximum 3 certificate images allowed";
          }
          if (formData.workProofs.length > 3) {
            errors.workProofs = "Maximum 3 work proof images allowed";
          }
        }
        break;
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value, type, files } = e.target;
    if (type === "file") {
      if (name === "certificates") {
        setFormData({ ...formData, certificates: Array.from(files) });
      } else if (name === "workProofs") {
        setFormData({ ...formData, workProofs: Array.from(files) });
      } else {
        setFormData({ ...formData, [name]: files[0] });
      }
    } else {
      const updatedData = { ...formData, [name]: value };
      if (name === "role") {
        updatedData.isApplyingProvider = value === "Service Provider";
      }
      setFormData(updatedData);
    }
  };

  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, totalSteps));
    } else {
      toast.error("Please fix the errors before continuing");
    }
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleRegister = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error("Please fix the errors in the form before submitting");
      return;
    }

    setIsSubmitting(true);

    try {
      const submitData = new FormData();

      // Always include required fields
      submitData.append("username", formData.username);
      submitData.append("password", formData.password);
      submitData.append("confirmPassword", formData.confirmPassword);
      submitData.append("firstName", formData.firstName);
      submitData.append("lastName", formData.lastName);
      submitData.append("email", formData.email);
      submitData.append("phone", formData.phone);
      submitData.append("address", formData.address);
      submitData.append("birthdate", formData.birthdate);
      submitData.append("employed", formData.employed);
      submitData.append("role", formData.role);

      // Optional fields
      if (formData.occupation) {
        submitData.append("occupation", formData.occupation);
      }

      // Profile picture (optional)
      if (formData.profilePic) {
        submitData.append("profilePic", formData.profilePic);
      }

      // Send validId for all users
      if (formData.validId) {
        submitData.append("validId", formData.validId);
      }

      // Service Provider specific fields
      if (formData.role === "Service Provider") {
        if (formData.skills && formData.skills.length > 0) {
          formData.skills.forEach((skill) => submitData.append("skills", skill));
        }
        if (formData.serviceTypes && formData.serviceTypes.length > 0) {
          formData.serviceTypes.forEach((serviceType) => submitData.append("serviceTypes", serviceType));
        }
        if (formData.certificates && formData.certificates.length > 0) {
          formData.certificates.forEach((file) => submitData.append("certificates", file));
        }
        if (formData.workProofs && formData.workProofs.length > 0) {
          formData.workProofs.forEach((file) => submitData.append("workProofs", file));
        }
      }

      const { data } = await api.post(
        "/user/register",
        submitData,
        {
          headers: { "Content-Type": "multipart/form-data" }
        }
      );

      toast.success(data.message);
      setShowPopup(true);
      setUser(data.user);
      setIsAuthorized(true);
      setTokenType("user");

      // Navigate to dashboard - UserDashboard component will show appropriate dashboard based on role
      navigate("/user/dashboard", { replace: true });
      localStorage.setItem("userLastPath", "/user/dashboard");

      localStorage.setItem("user", JSON.stringify(data.user));
      localStorage.setItem("isAuthorized", "true");
      localStorage.setItem("tokenType", "user");

      setTimeout(() => setShowPopup(false), 5000);
    } catch (error) {
      console.error('Registration error:', error);
      const errorMessage = error.response?.data?.message || error.message || "Registration failed";
      toast.error(errorMessage);

      if (error.response?.data?.errors) {
        console.error('Validation errors:', error.response.data.errors);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStep = () => {
    switch(currentStep) {
      case 1:
        return (
          <>
            <h3 className="text-2xl font-bold text-gray-900 mb-6">Account Information</h3>

            {/* Username */}
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
                Username
              </label>
              <input
                type="text"
                id="username"
                name="username"
                placeholder="Enter your username"
                value={formData.username}
                onChange={handleChange}
                required
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors ${
                  validationErrors.username
                    ? 'border-red-300 bg-red-50'
                    : 'border-gray-300'
                }`}
              />
              {validationErrors.username && (
                <p className="mt-1 text-sm text-red-600">{validationErrors.username}</p>
              )}
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <input
                type="email"
                id="email"
                name="email"
                placeholder="your.email@example.com"
                value={formData.email}
                onChange={handleChange}
                required
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors ${
                  validationErrors.email
                    ? 'border-red-300 bg-red-50'
                    : 'border-gray-300'
                }`}
              />
              {validationErrors.email && (
                <p className="mt-1 text-sm text-red-600">{validationErrors.email}</p>
              )}
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  name="password"
                  placeholder="Create a strong password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  className={`w-full px-4 py-3 pr-12 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors ${
                    validationErrors.password
                      ? 'border-red-300 bg-red-50'
                      : 'border-gray-300'
                  }`}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>
              {validationErrors.password && (
                <p className="mt-1 text-sm text-red-600">{validationErrors.password}</p>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                Confirm Password
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  id="confirmPassword"
                  name="confirmPassword"
                  placeholder="Confirm your password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required
                  className={`w-full px-4 py-3 pr-12 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors ${
                    validationErrors.confirmPassword
                      ? 'border-red-300 bg-red-50'
                      : 'border-gray-300'
                  }`}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>
              {validationErrors.confirmPassword && (
                <p className="mt-1 text-sm text-red-600">{validationErrors.confirmPassword}</p>
              )}
            </div>
          </>
        );

      case 2:
        return (
          <>
            <h3 className="text-2xl font-bold text-gray-900 mb-6">Personal Information</h3>

            {/* First Name */}
            <div>
              <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-2">
                First Name
              </label>
              <input
                type="text"
                id="firstName"
                name="firstName"
                placeholder="Enter your first name"
                value={formData.firstName}
                onChange={handleChange}
                required
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors ${
                  validationErrors.firstName
                    ? 'border-red-300 bg-red-50'
                    : 'border-gray-300'
                }`}
              />
              {validationErrors.firstName && (
                <p className="mt-1 text-sm text-red-600">{validationErrors.firstName}</p>
              )}
            </div>

            {/* Last Name */}
            <div>
              <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-2">
                Last Name
              </label>
              <input
                type="text"
                id="lastName"
                name="lastName"
                placeholder="Enter your last name"
                value={formData.lastName}
                onChange={handleChange}
                required
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors ${
                  validationErrors.lastName
                    ? 'border-red-300 bg-red-50'
                    : 'border-gray-300'
                }`}
              />
              {validationErrors.lastName && (
                <p className="mt-1 text-sm text-red-600">{validationErrors.lastName}</p>
              )}
            </div>

            {/* Phone */}
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                Phone Number
              </label>
              <input
                type="tel"
                id="phone"
                name="phone"
                placeholder="+63XXXXXXXXXX or 0XXXXXXXXXX"
                value={formData.phone}
                onChange={handleChange}
                required
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors ${
                  validationErrors.phone
                    ? 'border-red-300 bg-red-50'
                    : 'border-gray-300'
                }`}
              />
              {validationErrors.phone && (
                <p className="mt-1 text-sm text-red-600">{validationErrors.phone}</p>
              )}
            </div>

            {/* Address */}
            <div>
              <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-2">
                Address
              </label>
              <input
                type="text"
                id="address"
                name="address"
                placeholder="Enter your complete address"
                value={formData.address}
                onChange={handleChange}
                required
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors ${
                  validationErrors.address
                    ? 'border-red-300 bg-red-50'
                    : 'border-gray-300'
                }`}
              />
              {validationErrors.address && (
                <p className="mt-1 text-sm text-red-600">{validationErrors.address}</p>
              )}
            </div>

            {/* Birthdate */}
            <div>
              <label htmlFor="birthdate" className="block text-sm font-medium text-gray-700 mb-2">
                Date of Birth
              </label>
              <input
                type="date"
                id="birthdate"
                name="birthdate"
                value={formData.birthdate}
                onChange={handleChange}
                required
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors ${
                  validationErrors.birthdate
                    ? 'border-red-300 bg-red-50'
                    : 'border-gray-300'
                }`}
                max={new Date().toISOString().split('T')[0]}
              />
              {validationErrors.birthdate && (
                <p className="mt-1 text-sm text-red-600">{validationErrors.birthdate}</p>
              )}
            </div>

            {/* Employment Status */}
            <div>
              <label htmlFor="employed" className="block text-sm font-medium text-gray-700 mb-2">
                Employment Status
              </label>
              <select
                id="employed"
                name="employed"
                value={formData.employed}
                onChange={handleChange}
                required
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors ${
                  validationErrors.employed
                    ? 'border-red-300 bg-red-50'
                    : 'border-gray-300'
                }`}
              >
                <option value="">Select employment status</option>
                <option value="employed">Employed</option>
                <option value="unemployed">Unemployed</option>
              </select>
              {validationErrors.employed && (
                <p className="mt-1 text-sm text-red-600">{validationErrors.employed}</p>
              )}
            </div>

            {/* Role */}
            <div>
              <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-2">
                Account Type
              </label>
              <select
                id="role"
                name="role"
                value={formData.role}
                onChange={handleChange}
                required
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors ${
                  validationErrors.role
                    ? 'border-red-300 bg-red-50'
                    : 'border-gray-300'
                }`}
              >
                <option value="">Choose your account type</option>
                <option value="Community Member">Community Member</option>
                <option value="Service Provider">Service Provider</option>
              </select>
              {validationErrors.role && (
                <p className="mt-1 text-sm text-red-600">{validationErrors.role}</p>
              )}
            </div>

            {/* Occupation (Optional) */}
            <div>
              <label htmlFor="occupation" className="block text-sm font-medium text-gray-700 mb-2">
                Occupation <span className="text-gray-500 text-xs">(Optional)</span>
              </label>
              <input
                type="text"
                id="occupation"
                name="occupation"
                placeholder="Enter your current occupation"
                value={formData.occupation}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
              />
            </div>
          </>
        );

      case 3:
        return (
          <>
            <h3 className="text-2xl font-bold text-gray-900 mb-6">Documents & Skills</h3>

            {/* Profile Picture */}
            <div>
              <label htmlFor="profilePic" className="block text-sm font-medium text-gray-700 mb-2">
                Profile Picture <span className="text-gray-500 text-xs">(Optional)</span>
              </label>
              <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg hover:border-primary-400 transition-colors">
                <div className="space-y-1 text-center">
                  <FaUpload className="mx-auto h-12 w-12 text-gray-400" />
                  <div className="flex text-sm text-gray-600">
                    <label
                      htmlFor="profilePic"
                      className="relative cursor-pointer bg-white rounded-md font-medium text-primary-600 hover:text-primary-500 focus-within:outline-none"
                    >
                      <span>Upload a file</span>
                      <input
                        id="profilePic"
                        name="profilePic"
                        type="file"
                        accept="image/*"
                        onChange={handleChange}
                        className="sr-only"
                      />
                    </label>
                    <p className="pl-1">or drag and drop</p>
                  </div>
                  <p className="text-xs text-gray-500">PNG, JPG up to 10MB</p>
                </div>
              </div>
              {formData.profilePic && (
                <div className="mt-4">
                  <img
                    src={URL.createObjectURL(formData.profilePic)}
                    alt="Profile preview"
                    className="w-24 h-24 rounded-full object-cover mx-auto border-4 border-primary-200"
                  />
                </div>
              )}
            </div>

            {/* Valid ID */}
            <div>
              <label htmlFor="validId" className="block text-sm font-medium text-gray-700 mb-2">
                Valid ID <span className="text-red-500">*</span>
              </label>
              <div className={`mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-dashed rounded-lg transition-colors ${
                validationErrors.validId ? 'border-red-300' : 'border-gray-300 hover:border-primary-400'
              }`}>
                <div className="space-y-1 text-center">
                  <FaUser className="mx-auto h-12 w-12 text-gray-400" />
                  <div className="flex text-sm text-gray-600">
                    <label
                      htmlFor="validId"
                      className="relative cursor-pointer bg-white rounded-md font-medium text-primary-600 hover:text-primary-500 focus-within:outline-none"
                    >
                      <span>Upload ID</span>
                      <input
                        id="validId"
                        name="validId"
                        type="file"
                        accept="image/*"
                        onChange={handleChange}
                        className="sr-only"
                      />
                    </label>
                    <p className="pl-1">or drag and drop</p>
                  </div>
                  <p className="text-xs text-gray-500">PNG, JPG up to 10MB</p>
                </div>
              </div>
              {validationErrors.validId && (
                <p className="mt-1 text-sm text-red-600">{validationErrors.validId}</p>
              )}
              {formData.validId && (
                <div className="mt-4">
                  <img
                    src={URL.createObjectURL(formData.validId)}
                    alt="ID preview"
                    className="w-full max-w-xs mx-auto rounded-lg border border-gray-300"
                  />
                </div>
              )}
            </div>

            {/* Skills for Service Provider */}
            {formData.role === "Service Provider" && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-4">
                    Select Your Skills <span className="text-red-500">*</span>
                    <span className="text-gray-500 text-xs ml-2">(Select 1-3 skills)</span>
                  </label>

                  {/* Search Input */}
                  <div className="mb-4">
                    <input
                      type="text"
                      placeholder="Search skills..."
                      value={formData.skillSearch || ''}
                      onChange={(e) => setFormData({ ...formData, skillSearch: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>

                  {/* Skills Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-60 overflow-y-auto">
                    {[
                      // Plumbing Services
                      "Pipe Installation", "Leak Repair", "Toilet Installation", "Drain Cleaning", "Water Heater Setup",
                      "Sink Installation", "Shower Installation", "Bathroom Plumbing", "Kitchen Plumbing", "Sewage System Repair",

                      // Electrical Services
                      "Wiring Installation", "Lighting Repair", "Appliance Troubleshooting", "Outlet Installation",
                      "Circuit Breaker Maintenance", "Electrical Panel Upgrade", "Generator Installation", "Solar Panel Setup",
                      "Security System Installation", "Smart Home Installation",

                      // Cleaning Services
                      "General House Cleaning", "Deep Cleaning", "Carpet Cleaning", "Sofa Shampooing", "Post-Construction Cleaning",
                      "Office Cleaning", "Window Cleaning", "Chimney Cleaning", "Gutter Cleaning", "Driveway Cleaning",

                      // Carpentry & Woodwork
                      "Furniture Repair", "Wood Polishing", "Door and Window Fixing", "Custom Woodwork", "Cabinet Installation",
                      "Flooring Installation", "Deck Building", "Fence Installation", "Shelving Installation", "Wood Restoration",

                      // Painting Services
                      "Interior Painting", "Exterior Painting", "Repainting", "Wallpaper Installation", "Color Consultation",
                      "Texture Painting", "Spray Painting", "Fence Painting", "Roof Painting", "Decorative Painting",

                      // Appliance Repair
                      "Air Conditioner Repair", "Refrigerator Repair", "Washing Machine Repair", "Microwave Oven Fixing",
                      "Electric Fan Maintenance", "Dishwasher Repair", "Oven Repair", "Dryer Repair", "TV Repair", "Computer Repair",

                      // Home Maintenance & Construction
                      "Tiling", "Roofing", "Masonry", "Floor Installation", "Room Remodeling",
                      "Drywall Installation", "Insulation Installation", "Concrete Work", "Bricklaying", "Foundation Repair",

                      // Pest Control
                      "Termite Treatment", "Cockroach Control", "Rodent Control", "Disinfection", "Mosquito Control",
                      "Ant Control", "Bed Bug Treatment", "Bee Removal", "Wasp Nest Removal", "Flea Treatment",

                      // Gardening & Landscaping
                      "Lawn Mowing", "Plant Care", "Landscape Design", "Tree Trimming", "Garden Cleanup",
                      "Irrigation System Installation", "Pest Control", "Flower Arrangement", "Vegetable Gardening", "Composting Setup",

                      // HVAC & Ventilation
                      "Aircon Installation", "Aircon Cleaning", "HVAC Maintenance", "Filter Replacement", "Ventilation Setup",
                      "Duct Cleaning", "Thermostat Installation", "Heat Pump Repair", "Furnace Maintenance", "Chiller Repair",

                      // Laundry Services
                      "Washing Clothes", "Drying & Ironing", "Folding & Packaging", "Delicate Fabric Care", "Stain Removal",
                      "Dry Cleaning", "Leather Cleaning", "Curtain Cleaning", "Upholstery Cleaning", "Wedding Dress Cleaning",

                      // Automotive Services
                      "Car Wash", "Car Detailing", "Tire Repair", "Battery Replacement", "Oil Change",
                      "Brake Repair", "Engine Tune-up", "Transmission Service", "AC Repair", "Car Painting",

                      // Home Security
                      "CCTV Installation", "Alarm System Setup", "Lock Installation", "Safe Installation",
                      "Gate Automation", "Intercom System", "Motion Sensor Setup", "Smart Lock Installation",

                      // IT & Technology
                      "Computer Setup", "Network Installation", "WiFi Setup", "Printer Repair",
                      "Phone Repair", "Tablet Repair", "Software Installation", "Data Recovery",

                      // Specialty Services
                      "Pool Cleaning", "Jacuzzi Maintenance", "Elevator Repair", "Generator Maintenance",
                      "Water Tank Cleaning", "Septic Tank Cleaning", "Well Drilling", "Water Purification Setup",

                      // Event Services
                      "Event Setup", "Catering Assistance", "Sound System Setup", "Lighting Setup",
                      "Tent Installation", "Stage Setup", "Decoration Services", "Photography Assistance",

                      // Health & Wellness
                      "Massage Therapy", "First Aid", "Health Monitoring", "Exercise Instruction",
                      "Nutrition Consultation", "Mental Health Support", "Elder Care", "Child Care",

                      // Educational Services
                      "Tutoring", "Language Lessons", "Music Lessons", "Art Lessons",
                      "Computer Training", "Cooking Classes", "Dance Lessons", "Sports Coaching",

                      // Pet Services
                      "Pet Grooming", "Pet Sitting", "Dog Walking", "Pet Training",
                      "Veterinary Assistance", "Pet Transportation", "Aquarium Setup", "Pet Photography",

                      // Business Services
                      "Bookkeeping", "Tax Preparation", "Legal Assistance", "Accounting Help",
                      "Marketing Consultation", "Business Planning", "Grant Writing", "Translation Services"
                    ].filter((skill) =>
                      !formData.skillSearch ||
                      skill.toLowerCase().includes(formData.skillSearch.toLowerCase())
                    ).map((skill) => (
                      <label
                        key={skill}
                        className={`flex items-center p-3 border rounded-lg cursor-pointer transition-all ${
                          formData.skills.includes(skill)
                            ? 'border-primary-500 bg-primary-50 text-primary-700'
                            : 'border-gray-200 hover:border-primary-300'
                        } ${
                          !formData.skills.includes(skill) && formData.skills.length >= 3
                            ? 'opacity-50 cursor-not-allowed'
                            : ''
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={formData.skills.includes(skill)}
                          onChange={(e) => {
                            const currentSkills = [...formData.skills];
                            if (e.target.checked) {
                              if (currentSkills.length < 3) {
                                currentSkills.push(skill);
                              }
                            } else {
                              const index = currentSkills.indexOf(skill);
                              if (index > -1) {
                                currentSkills.splice(index, 1);
                              }
                            }
                            setFormData({ ...formData, skills: currentSkills });
                          }}
                          disabled={!formData.skills.includes(skill) && formData.skills.length >= 3}
                          className="sr-only"
                        />
                        <span className="text-sm">{skill}</span>
                      </label>
                    ))}
                  </div>

                  {/* Selected Skills Display */}
                  {formData.skills.length > 0 && (
                    <div className="mt-4">
                      <p className="text-sm font-medium text-gray-700 mb-2">Selected Skills:</p>
                      <div className="flex flex-wrap gap-2">
                        {formData.skills.map((skill) => (
                          <span
                            key={skill}
                            className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-primary-100 text-primary-800"
                          >
                            {skill}
                            <button
                              type="button"
                              onClick={() => {
                                const currentSkills = formData.skills.filter(s => s !== skill);
                                setFormData({ ...formData, skills: currentSkills });
                              }}
                              className="ml-2 text-primary-600 hover:text-primary-800"
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="mt-4 text-sm text-gray-600">
                    Selected: {formData.skills.length}/3 skills
                  </div>
                  {validationErrors.skills && (
                    <p className="mt-1 text-sm text-red-600">{validationErrors.skills}</p>
                  )}
                </div>

                {/* Service Types for Service Provider */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-4">
                    Select Service Types <span className="text-red-500">*</span>
                    <span className="text-gray-500 text-xs ml-2">(Select at least 1 service type)</span>
                  </label>

                  {/* Search Input for Service Types */}
                  <div className="mb-4">
                    <input
                      type="text"
                      placeholder="Search service types..."
                      value={formData.serviceTypeSearch || ''}
                      onChange={(e) => setFormData({ ...formData, serviceTypeSearch: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>

                  {/* Service Types Grid */}
                  {predefinedServices.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-60 overflow-y-auto">
                      {predefinedServices
                        .filter((service) =>
                          !formData.serviceTypeSearch ||
                          service.name.toLowerCase().includes(formData.serviceTypeSearch.toLowerCase()) ||
                          service.description.toLowerCase().includes(formData.serviceTypeSearch.toLowerCase())
                        )
                        .map((service) => (
                          <label
                            key={service._id}
                            className={`flex items-start p-3 border rounded-lg cursor-pointer transition-all ${
                              formData.serviceTypes.includes(service._id)
                                ? 'border-primary-500 bg-primary-50 text-primary-700'
                                : 'border-gray-200 hover:border-primary-300'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={formData.serviceTypes.includes(service._id)}
                              onChange={(e) => {
                                const currentServiceTypes = [...formData.serviceTypes];
                                if (e.target.checked) {
                                  currentServiceTypes.push(service._id);
                                } else {
                                  const index = currentServiceTypes.indexOf(service._id);
                                  if (index > -1) {
                                    currentServiceTypes.splice(index, 1);
                                  }
                                }
                                setFormData({ ...formData, serviceTypes: currentServiceTypes });
                              }}
                              className="mt-0.5 mr-3"
                            />
                            <div className="flex-1">
                              <span className="text-sm font-medium block">{service.name}</span>
                              {service.description && (
                                <p className="text-xs text-gray-500 mt-1">{service.description}</p>
                              )}
                              <p className="text-xs text-gray-400 mt-1">₱{service.rate}</p>
                            </div>
                          </label>
                        ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <p>Loading service types...</p>
                    </div>
                  )}

                  {/* Selected Service Types Display */}
                  {formData.serviceTypes.length > 0 && (
                    <div className="mt-4">
                      <p className="text-sm font-medium text-gray-700 mb-2">Selected Service Types:</p>
                      <div className="flex flex-wrap gap-2">
                        {formData.serviceTypes.map((serviceId) => {
                          const service = predefinedServices.find(s => s._id === serviceId);
                          return service ? (
                            <span
                              key={serviceId}
                              className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-primary-100 text-primary-800"
                            >
                              {service.name}
                              <button
                                type="button"
                                onClick={() => {
                                  const currentServiceTypes = formData.serviceTypes.filter(id => id !== serviceId);
                                  setFormData({ ...formData, serviceTypes: currentServiceTypes });
                                }}
                                className="ml-2 text-primary-600 hover:text-primary-800"
                              >
                                ×
                              </button>
                            </span>
                          ) : null;
                        })}
                      </div>
                    </div>
                  )}

                  <div className="mt-4 text-sm text-gray-600">
                    Selected: {formData.serviceTypes.length} service types
                  </div>
                  {validationErrors.serviceTypes && (
                    <p className="mt-1 text-sm text-red-600">{validationErrors.serviceTypes}</p>
                  )}
                </div>
              </>
            )}
          </>
        );

      case 4: // Only for Service Providers
        return (
          <>
            <h3 className="text-2xl font-bold text-gray-900 mb-6">Documentation</h3>
            <p className="text-gray-600 mb-6">Upload certificates, licenses, or work proof images to verify your expertise (at least one required)</p>

            {/* Certificates Upload */}
            <div className="mb-8">
              <label htmlFor="certificates" className="block text-sm font-medium text-gray-700 mb-2">
                Certificates & Licenses <span className="text-gray-500 text-xs">(Optional - Max 3 images)</span>
              </label>
              <div className={`mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-dashed rounded-lg transition-colors ${
                validationErrors.certificates ? 'border-red-300' : 'border-gray-300 hover:border-primary-400'
              }`}>
                <div className="space-y-1 text-center">
                  <FaUpload className="mx-auto h-12 w-12 text-gray-400" />
                  <div className="flex text-sm text-gray-600">
                    <label
                      htmlFor="certificates"
                      className="relative cursor-pointer bg-white rounded-md font-medium text-primary-600 hover:text-primary-500 focus-within:outline-none"
                    >
                      <span>Upload certificates</span>
                      <input
                        id="certificates"
                        name="certificates"
                        type="file"
                        accept="image/*,application/pdf"
                        multiple
                        onChange={handleChange}
                        className="sr-only"
                      />
                    </label>
                    <p className="pl-1">or drag and drop</p>
                  </div>
                  <p className="text-xs text-gray-500">PNG, JPG, PDF up to 10MB each (Max 3 files)</p>
                </div>
              </div>
              {validationErrors.certificates && validationErrors.certificates !== "At least one certificate or work proof is required for Service Providers" && (
                <p className="mt-1 text-sm text-red-600">{validationErrors.certificates}</p>
              )}
              {formData.certificates.length > 0 && (
                <div className="mt-4">
                  <p className="text-sm font-medium text-gray-700 mb-2">Uploaded Certificates ({formData.certificates.length}/3):</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {formData.certificates.map((file, index) => (
                      <div key={index} className="border border-gray-200 rounded-lg p-3 relative">
                        {file.type.startsWith("image/") ? (
                          <img
                            src={URL.createObjectURL(file)}
                            alt={`Certificate ${index + 1}`}
                            className="w-full h-24 object-cover rounded"
                          />
                        ) : (
                          <div className="w-full h-24 bg-gray-100 rounded flex items-center justify-center">
                            <span className="text-xs text-gray-500 truncate px-2">{file.name}</span>
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            const newCertificates = formData.certificates.filter((_, i) => i !== index);
                            setFormData({ ...formData, certificates: newCertificates });
                          }}
                          className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Work Proofs Upload */}
            <div className="mb-8">
              <label htmlFor="workProofs" className="block text-sm font-medium text-gray-700 mb-2">
                Work Proof & Portfolio <span className="text-gray-500 text-xs">(Optional - Max 3 images)</span>
              </label>
              <div className={`mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-dashed rounded-lg transition-colors ${
                validationErrors.workProofs ? 'border-red-300' : 'border-gray-300 hover:border-primary-400'
              }`}>
                <div className="space-y-1 text-center">
                  <FaUpload className="mx-auto h-12 w-12 text-gray-400" />
                  <div className="flex text-sm text-gray-600">
                    <label
                      htmlFor="workProofs"
                      className="relative cursor-pointer bg-white rounded-md font-medium text-primary-600 hover:text-primary-500 focus-within:outline-none"
                    >
                      <span>Upload work proofs</span>
                      <input
                        id="workProofs"
                        name="workProofs"
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleChange}
                        className="sr-only"
                      />
                    </label>
                    <p className="pl-1">or drag and drop</p>
                  </div>
                  <p className="text-xs text-gray-500">PNG, JPG up to 10MB each (Max 3 files)</p>
                </div>
              </div>
              {validationErrors.workProofs && (
                <p className="mt-1 text-sm text-red-600">{validationErrors.workProofs}</p>
              )}
              {formData.workProofs.length > 0 && (
                <div className="mt-4">
                  <p className="text-sm font-medium text-gray-700 mb-2">Uploaded Work Proofs ({formData.workProofs.length}/3):</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {formData.workProofs.map((file, index) => (
                      <div key={index} className="border border-gray-200 rounded-lg p-3 relative">
                        <img
                          src={URL.createObjectURL(file)}
                          alt={`Work proof ${index + 1}`}
                          className="w-full h-24 object-cover rounded"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const newWorkProofs = formData.workProofs.filter((_, i) => i !== index);
                            setFormData({ ...formData, workProofs: newWorkProofs });
                          }}
                          className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Overall validation message */}
            {(formData.certificates.length === 0 && formData.workProofs.length === 0) && validationErrors.certificates && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-yellow-800">
                      Documentation Required
                    </h3>
                    <div className="mt-2 text-sm text-yellow-700">
                      <p>Please upload at least one certificate/license or work proof image to verify your expertise.</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Summary */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="text-sm font-medium text-gray-900 mb-2">Documentation Summary:</h4>
              <div className="text-sm text-gray-600 space-y-1">
                <p>• Certificates: {formData.certificates.length}/3 uploaded</p>
                <p>• Work Proofs: {formData.workProofs.length}/3 uploaded</p>
                <p>• Total documentation: {formData.certificates.length + formData.workProofs.length} files</p>
              </div>
            </div>
          </>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-primary-100 flex items-center justify-center p-4">
      <div className="absolute inset-0 opacity-30 bg-gradient-to-br from-primary-100/50 to-primary-200/30"></div>

      <div className="relative w-full max-w-6xl mx-auto bg-white rounded-2xl shadow-2xl overflow-hidden flex">
        {/* LEFT SIDE */}
        <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary-600 to-primary-800 p-12 flex-col justify-center items-center text-white relative overflow-hidden">
          {/* Decorative Elements */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-32 translate-x-32"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-24 -translate-x-24"></div>

          <div className="relative z-10 text-center">
            <img
              src={skillconnectLogo}
              alt="SkillConnect Logo"
              className="w-24 h-24 mx-auto mb-8 drop-shadow-lg"
            />
            <h1 className="text-4xl font-bold mb-4 leading-tight">Join<br />SkillConnect</h1>
            <p className="text-xl opacity-90 mb-8 leading-relaxed">
              Connect with skilled workers, request services, or offer your expertise in your local community.
            </p>
            <Link
              to="/home#about"
              className="inline-flex items-center px-8 py-3 bg-white/20 backdrop-blur-sm border border-white/30 rounded-full text-white font-semibold hover:bg-white/30 transition-all duration-300 hover:shadow-lg"
            >
              About Us
            </Link>
          </div>
        </div>

        {/* RIGHT SIDE */}
        <div className="w-full lg:w-1/2 p-8 lg:p-12">
          <div className="max-w-md mx-auto">
            {/* Mobile Logo */}
            <div className="lg:hidden text-center mb-8">
              <img
                src={skillconnectLogo}
                alt="SkillConnect Logo"
                className="w-16 h-16 mx-auto mb-4"
              />
            </div>

            <div className="mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Create Your Account</h2>
              {currentStep > 1 && (
                <p className="text-gray-600">Step {currentStep} of {totalSteps}</p>
              )}
            </div>

            {/* Progress Bar */}
            <div className="mb-8">
              <div className="flex space-x-2">
                {[...Array(totalSteps)].map((_, i) => (
                  <div
                    key={i}
                    className={`h-2 flex-1 rounded-full transition-colors duration-300 ${
                      i < currentStep ? 'bg-primary-600' : 'bg-gray-200'
                    }`}
                  ></div>
                ))}
              </div>
            </div>

            <form
              onSubmit={
                currentStep === totalSteps
                  ? handleRegister
                  : (e) => { e.preventDefault(); nextStep(); }
              }
              className="space-y-6"
            >
              <div className="min-h-[400px]">
                {renderStep()}
              </div>

              {/* Navigation */}
              <div className="flex justify-between pt-6">
                {currentStep > 1 && (
                  <button
                    type="button"
                    onClick={prevStep}
                    className="flex items-center px-6 py-3 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-all duration-300"
                  >
                    <FaArrowLeft className="mr-2" /> Previous
                  </button>
                )}
                {currentStep < totalSteps ? (
                  <button
                    type="submit"
                    className="flex items-center px-6 py-3 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-all duration-300 ml-auto"
                  >
                    Next <FaArrowRight className="ml-2" />
                  </button>
                ) : (
                  <button
                    type="submit"
                    className="flex items-center px-6 py-3 bg-gradient-to-r from-primary-600 to-primary-700 text-white rounded-lg font-semibold hover:from-primary-700 hover:to-primary-800 focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed ml-auto"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Creating Account...
                      </>
                    ) : (
                      'Register'
                    )}
                  </button>
                )}
              </div>
            </form>

            <div className="mt-8 text-center">
              <p className="text-gray-600">
                Already have an account?{" "}
                <Link to="/login" className="text-primary-600 hover:text-primary-500 font-semibold">
                  Login
                </Link>
              </p>
            </div>
          </div>

          <p className="mt-8 text-xs text-gray-500 text-center">
            By registering, you agree to our{" "}
            <a href="/terms" className="text-primary-600 hover:text-primary-500">Terms of Service</a>{" "}
            and{" "}
            <a href="/privacy" className="text-primary-600 hover:text-primary-500">Privacy Policy</a>
          </p>
        </div>
      </div>

      {/* Success Popup */}
      {showPopup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 max-w-md mx-4 text-center shadow-2xl">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">Registration Successful! 🎉</h3>
            <p className="text-gray-600">Welcome to SkillConnect! Redirecting...</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Register;
