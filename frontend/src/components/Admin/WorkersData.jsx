import { useEffect, useState } from "react";
import api from "../../api";

const ServiceProviders = () => {
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchWorkers = async () => {
      try {
        const res = await api.get("/admin/service-providers");
        setWorkers(res.data.workers || res.data || []);
      } catch {
        setError("Failed to fetch service providers");
      } finally {
        setLoading(false);
      }
    };
    fetchWorkers();
  }, []);

  if (loading) return <div className="loading-skeleton"></div>;
  if (error) return <div className="analytics-container"><div className="analytics-header"><h1>Error</h1></div><div className="analytics-card"><p className="metric-change negative">{error}</p></div></div>;
  if (workers.length === 0) return <div className="analytics-container"><div className="analytics-header"><h1>No Service Providers</h1></div><div className="analytics-card"><p>No service providers found.</p></div></div>;

  return (
    <div className="analytics-container">
      <div className="analytics-header">
        <h1>Service Providers</h1>
        <p>List of all service providers</p>
      </div>
      <div className="analytics-card">
        {workers.map((worker) => (
          <div key={worker._id} className="analytics-card">
            <img
              src={worker.profilePic || "/default-avatar.png"}
              alt={`${worker.firstName} ${worker.lastName}`}
              className="profile-pic"
            />
            <h2>{worker.firstName} {worker.lastName}</h2>
            <p>
              <strong>Skills:</strong>{" "}
              {Array.isArray(worker.skills) && worker.skills.length > 0
                ? worker.skills.join(", ")
                : "N/A"}
            </p>
            <p>
              <strong>Availability:</strong>{" "}
              {worker.availability || "Not set"}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ServiceProviders;
