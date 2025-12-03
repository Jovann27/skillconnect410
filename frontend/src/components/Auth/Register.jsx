import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useMainContext } from "../../mainContext";
import api from "../../api";
import { FaEye, FaEyeSlash, FaCheck, FaTimes, FaUpload, FaUser, FaArrowLeft, FaArrowRight } from "react-icons/fa";
import "./auth-styles.css";
import skillconnectLogo from "../Home/images/1000205778-removebg-preview.png";

const Register = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    role: "",
    skills: [],
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
    validId: null,
  });

  const [showPopup, setShowPopup] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { setIsAuthorized, setUser, setTokenType } = useMainContext();
  const navigate = useNavigate();

  const totalSteps = formData.role === "Service Provider" ? 4 : 3;

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
      if (formData.certificates.length === 0) {
        errors.certificates = "Certificates are required for Service Providers";
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
      case 4: // Certificates (Service Provider only)
        if (formData.role === "Service Provider" && formData.certificates.length === 0) {
          errors.certificates = "Certificates are required for Service Providers";
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
        if (formData.certificates && formData.certificates.length > 0) {
          formData.certificates.forEach((file) => submitData.append("certificates", file));
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

      // Navigate based on user role
      if (data.user.role === "Service Provider") {
        navigate("/user/my-service", { replace: true });
        localStorage.setItem("userLastPath", "/user/my-service");
      } else {
        navigate("/user/service-request", { replace: true });
        localStorage.setItem("userLastPath", "/user/service-request");
      }

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
            <h3 className="step-title">Account Information</h3>
            
            {/* Username */}
            <div className="curved-input-group">
              <input
                type="text"
                id="username"
                name="username"
                placeholder="Username"
                value={formData.username}
                onChange={handleChange}
                required
                className={`curved-input ${validationErrors.username ? 'error' : ''}`}
              />
              {validationErrors.username && (
                <span className="field-error">{validationErrors.username}</span>
              )}
            </div>

            {/* Email */}
            <div className="curved-input-group">
              <input
                type="email"
                id="email"
                name="email"
                placeholder="Email"
                value={formData.email}
                onChange={handleChange}
                required
                className={`curved-input ${validationErrors.email ? 'error' : ''}`}
              />
              {validationErrors.email && (
                <span className="field-error">{validationErrors.email}</span>
              )}
            </div>

            {/* Password */}
            <div className="curved-input-group">
              <div className="password-wrapper">
                <input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  name="password"
                  placeholder="Password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  className={`curved-input ${validationErrors.password ? 'error' : ''}`}
                />
                <button
                  type="button"
                  className="curved-password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>
              {validationErrors.password && (
                <span className="field-error">{validationErrors.password}</span>
              )}
            </div>

            {/* Confirm Password */}
            <div className="curved-input-group">
              <div className="password-wrapper">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  id="confirmPassword"
                  name="confirmPassword"
                  placeholder="Confirm Password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required
                  className={`curved-input ${validationErrors.confirmPassword ? 'error' : ''}`}
                />
                <button
                  type="button"
                  className="curved-password-toggle"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>
              {validationErrors.confirmPassword && (
                <span className="field-error">{validationErrors.confirmPassword}</span>
              )}
            </div>
          </>
        );

      case 2:
        return (
          <>
            <h3 className="step-title">Personal Information</h3>
            
            {/* First Name */}
            <div className="curved-input-group">
              <input
                type="text"
                id="firstName"
                name="firstName"
                placeholder="First Name"
                value={formData.firstName}
                onChange={handleChange}
                required
                className={`curved-input ${validationErrors.firstName ? 'error' : ''}`}
              />
              {validationErrors.firstName && (
                <span className="field-error">{validationErrors.firstName}</span>
              )}
            </div>

            {/* Last Name */}
            <div className="curved-input-group">
              <input
                type="text"
                id="lastName"
                name="lastName"
                placeholder="Last Name"
                value={formData.lastName}
                onChange={handleChange}
                required
                className={`curved-input ${validationErrors.lastName ? 'error' : ''}`}
              />
              {validationErrors.lastName && (
                <span className="field-error">{validationErrors.lastName}</span>
              )}
            </div>

            {/* Phone */}
            <div className="curved-input-group">
              <input
                type="tel"
                id="phone"
                name="phone"
                placeholder="Phone Number"
                value={formData.phone}
                onChange={handleChange}
                required
                className={`curved-input ${validationErrors.phone ? 'error' : ''}`}
              />
              {validationErrors.phone && (
                <span className="field-error">{validationErrors.phone}</span>
              )}
            </div>

            {/* Address */}
            <div className="curved-input-group">
              <input
                type="text"
                id="address"
                name="address"
                placeholder="Address"
                value={formData.address}
                onChange={handleChange}
                required
                className={`curved-input ${validationErrors.address ? 'error' : ''}`}
              />
              {validationErrors.address && (
                <span className="field-error">{validationErrors.address}</span>
              )}
            </div>

            {/* Birthdate */}
            <div className="curved-input-group">
              <input
                type="date"
                id="birthdate"
                name="birthdate"
                value={formData.birthdate}
                onChange={handleChange}
                required
                className={`curved-input ${validationErrors.birthdate ? 'error' : ''}`}
                max={new Date().toISOString().split('T')[0]}
              />
              {validationErrors.birthdate && (
                <span className="field-error">{validationErrors.birthdate}</span>
              )}
            </div>

            {/* Employment Status */}
            <div className="curved-input-group">
              <select
                id="employed"
                name="employed"
                value={formData.employed}
                onChange={handleChange}
                required
                className={`curved-input ${validationErrors.employed ? 'error' : ''}`}
              >
                <option value="">Employment Status</option>
                <option value="employed">Employed</option>
                <option value="unemployed">Unemployed</option>
              </select>
              {validationErrors.employed && (
                <span className="field-error">{validationErrors.employed}</span>
              )}
            </div>

            {/* Role */}
            <div className="curved-input-group">
              <select
                id="role"
                name="role"
                value={formData.role}
                onChange={handleChange}
                required
                className={`curved-input ${validationErrors.role ? 'error' : ''}`}
              >
                <option value="">Select your role</option>
                <option value="Community Member">Community Member</option>
                <option value="Service Provider">Service Provider</option>
              </select>
              {validationErrors.role && (
                <span className="field-error">{validationErrors.role}</span>
              )}
            </div>

            {/* Occupation (Optional) */}
            <div className="curved-input-group">
              <input
                type="text"
                id="occupation"
                name="occupation"
                placeholder="Occupation (Optional)"
                value={formData.occupation}
                onChange={handleChange}
                className="curved-input"
              />
            </div>
          </>
        );

      case 3:
        return (
          <>
            <h3 className="step-title">Documents & Skills</h3>
            
            {/* Profile Picture */}
            <div className="curved-file-group">
              <label className="curved-file-label">Profile Picture (Optional)</label>
              <input
                type="file"
                id="profilePic"
                name="profilePic"
                accept="image/*"
                onChange={handleChange}
                className="curved-file-input"
              />
              {formData.profilePic && (
                <div className="file-preview">
                  <img src={URL.createObjectURL(formData.profilePic)} alt="Profile preview" />
                </div>
              )}
            </div>

            {/* Valid ID */}
            <div className="curved-file-group">
              <label className="curved-file-label">Valid ID *</label>
              <input
                type="file"
                id="validId"
                name="validId"
                accept="image/*"
                onChange={handleChange}
                className={`curved-file-input ${validationErrors.validId ? 'error' : ''}`}
              />
              {validationErrors.validId && (
                <span className="field-error">{validationErrors.validId}</span>
              )}
              {formData.validId && (
                <div className="file-preview">
                  <img src={URL.createObjectURL(formData.validId)} alt="ID preview" />
                </div>
              )}
            </div>

            {/* Skills for Service Provider */}
            {formData.role === "Service Provider" && (
              <div className="curved-skills-group">
                <label className="curved-file-label">Select Your Skills (1-3) *</label>
                <div className="curved-skills-grid">
                  {[
                    "Pipe Installation", "Leak Repair", "Toilet Installation", "Drain Cleaning", "Water Heater Setup",
                    "Wiring Installation", "Lighting Repair", "Appliance Troubleshooting", "Outlet Installation", "Circuit Breaker Maintenance",
                    "General House Cleaning", "Deep Cleaning", "Carpet Cleaning", "Sofa Shampooing", "Post-Construction Cleaning",
                    "Furniture Repair", "Wood Polishing", "Door and Window Fixing", "Custom Woodwork", "Cabinet Installation",
                    "Interior Painting", "Exterior Painting", "Repainting", "Wallpaper Installation", "Color Consultation",
                    "Air Conditioner Repair", "Refrigerator Repair", "Washing Machine Repair", "Microwave Oven Fixing", "Electric Fan Maintenance",
                    "Tiling", "Roofing", "Masonry", "Floor Installation", "Room Remodeling",
                    "Termite Treatment", "Cockroach Control", "Rodent Control", "Disinfection", "Mosquito Control",
                    "Lawn Mowing", "Plant Care", "Landscape Design", "Tree Trimming", "Garden Cleanup",
                    "Aircon Installation", "Aircon Cleaning", "HVAC Maintenance", "Filter Replacement", "Ventilation Setup",
                    "Washing Clothes", "Drying & Ironing", "Folding & Packaging", "Delicate Fabric Care", "Stain Removal"
                  ].map((skill) => (
                    <label key={skill} className={`curved-skill-item ${formData.skills.includes(skill) ? 'selected' : ''}`}>
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
                      />
                      <span>{skill}</span>
                    </label>
                  ))}
                </div>
                <div className="skills-counter">
                  Selected: {formData.skills.length}/3 skills
                </div>
                {validationErrors.skills && (
                  <span className="field-error">{validationErrors.skills}</span>
                )}
              </div>
            )}
          </>
        );

      case 4: // Only for Service Providers
        return (
          <>
            <h3 className="step-title">Certificates</h3>
            
            <div className="curved-file-group">
              <label className="curved-file-label">Upload Certificates *</label>
              <input
                type="file"
                id="certificates"
                name="certificates"
                accept="image/*,application/pdf"
                multiple
                onChange={handleChange}
                className={`curved-file-input ${validationErrors.certificates ? 'error' : ''}`}
              />
              {validationErrors.certificates && (
                <span className="field-error">{validationErrors.certificates}</span>
              )}
              {formData.certificates.length > 0 && (
                <div className="file-preview-grid">
                  {formData.certificates.map((file, index) => (
                    <div key={index} className="file-preview-item">
                      {file.type.startsWith("image/") ? (
                        <img src={URL.createObjectURL(file)} alt={`Certificate ${index + 1}`} />
                      ) : (
                        <div className="file-name">{file.name}</div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        );

      default:
        return null;
    }
  };

  return (
    <div className="register-page">
      <div className="register-wrapper">

        {/* LEFT SIDE */}
        <div className="register-left">
          <img src={skillconnectLogo} alt="SkillConnect Logo" className="logo" />
          <h1 className="join-title">Join SkillConnect</h1>
          <p className="join-subtitle">
            Connect with skilled workers, request services, or offer your expertise
            in your local community.
          </p>
          <Link to="/home#about" className="about-btn">About Us</Link>
        </div>

        {/* RIGHT SIDE */}
        <div className="register-right">
          <h2 className="form-title">Create Your Account</h2>
          {currentStep > 1 && (
            <p className="step-info">Step {currentStep} of {totalSteps}</p>
          )}

          <div className="step-progress">
            {[...Array(totalSteps)].map((_, i) => (
              <div
                key={i}
                className={`step-bar ${i < currentStep ? "active" : ""}`}
              ></div>
            ))}
          </div>

          <form
            onSubmit={
              currentStep === totalSteps
                ? handleRegister
                : (e) => { e.preventDefault(); nextStep(); }
            }
            className="register-form"
          >
            <div className="step-content">
              {renderStep()}
            </div>

            <div className="form-navigation">
              {currentStep > 1 && (
                <button
                  type="button"
                  onClick={prevStep}
                  className="nav-btn prev-btn"
                >
                  <FaArrowLeft /> Previous
                </button>
              )}
              {currentStep < totalSteps ? (
                <button
                  type="button"
                  onClick={nextStep}
                  className="nav-btn next-btn"
                >
                  Next <FaArrowRight />
                </button>
              ) : (
                <button
                  type="submit"
                  className="submit-btn"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Creating Account..." : "Register"}
                </button>
              )}
            </div>
          </form>

          <p className="login-link">
            Already have an account? <Link to="/login">Login</Link>
          </p>
        </div>
      </div>

      {showPopup && (
        <div className="popup-overlay">
          <div className="popup-box">
            <h3>Registration Successful 🎉</h3>
            <p>Welcome to SkillConnect! Redirecting...</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Register;
