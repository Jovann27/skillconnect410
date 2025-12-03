import { useState } from "react";
import api from "../../api";
import { useNavigate } from "react-router-dom";
import './adminregister.css';

const AdminRegister = () => {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [profilePic, setProfilePic] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleFileChange = (e) => {
    setProfilePic(e.target.files[0]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!name || !email || !password) {
      setError("Name, email, and password are required.");
      return;
    }

    const formData = new FormData();
    formData.append("name", name);
    formData.append("email", email);
    formData.append("password", password);
    if (profilePic) {
      formData.append("profilePic", profilePic);
    }

    try {
      setLoading(true);
      const res = await api.post("/admin/auth/register", formData);
      console.log(res.data);
      setLoading(false);
      navigate("/admin/login"); // redirect after successful registration
    } catch (err) {
      setLoading(false);
      setError(err.response?.data?.message || "Registration failed");
    }
  };

  return (
    <div className="container">
      <div className="analytics-header">
        <div>
          <h1>Admin Registration</h1>
          <p className="header-description">Register a new admin account</p>
        </div>
      </div>
      {error && <div className="card error-message">{error}</div>}
      <div className="form-container">
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label>Profile Picture (Optional)</label>
            <input type="file" accept="image/*" onChange={handleFileChange} />
          </div>
          <div className="actions-section">
            <button type="submit" disabled={loading} className="export-btn">
              {loading ? "Registering..." : "Register"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AdminRegister;