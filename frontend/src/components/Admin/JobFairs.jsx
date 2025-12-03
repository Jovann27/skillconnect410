import { useState } from "react";
import toast from "react-hot-toast";
import api from "../../api";

const JobFairCreate = () => {
  const [form, setForm] = useState({
    title: "",
    description: "",
    date: "",
    startTime: "",
    endTime: "",
    location: "",
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("title", form.title);
      formData.append("description", form.description);
      formData.append("date", form.date);
      formData.append("startTime", form.startTime);
      formData.append("endTime", form.endTime);
      formData.append("location", form.location);

      const data = await api.post("/admin/jobfairs", formData);
      if (data.data.success) {
        toast.success("Job fair created successfully!");
        setForm({ title: "", description: "", date: "", startTime: "", endTime: "", location: "" });
      } else {
        toast.error(data.data.message || "Failed to create job fair");
      }
    } catch (err) {
      toast.error("Error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <div className="analytics-header">
        <div>
          <h1>Create Job Fair</h1>
          <p className="header-description">Set up a new job fair event</p>
        </div>
      </div>
      <div className="form-container">
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Title</label>
            <input
              type="text"
              name="title"
              value={form.title}
              onChange={handleChange}
              autoComplete="off"
              required
            />
          </div>
          <div className="form-group">
            <label>Description</label>
            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              rows="3"
              autoComplete="off"
              required
            />
          </div>
          <div className="form-group">
            <label>Date</label>
            <input
              type="date"
              name="date"
              value={form.date}
              onChange={handleChange}
              autoComplete="off"
              required
            />
          </div>
          <div className="form-group">
            <label>Start Time</label>
            <input
              type="time"
              name="startTime"
              value={form.startTime}
              onChange={handleChange}
              autoComplete="off"
              required
            />
          </div>
          <div className="form-group">
            <label>End Time</label>
            <input
              type="time"
              name="endTime"
              value={form.endTime}
              onChange={handleChange}
              autoComplete="off"
              required
            />
          </div>
          <div className="form-group">
            <label>Location</label>
            <input
              type="text"
              name="location"
              value={form.location}
              onChange={handleChange}
              autoComplete="address-level2"
              required
            />
          </div>

          <div className="actions-section">
            <button
              type="submit"
              disabled={loading}
              className="export-btn"
            >
              {loading ? "Creating..." : "Create Job Fair"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default JobFairCreate;