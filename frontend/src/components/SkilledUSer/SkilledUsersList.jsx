import { useEffect, useState } from "react";
import api from "../../api";
import { getImageUrl } from "../../utils/imageUtils";

const SkilledWorkers = () => {
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchWorkers = async () => {
      try {
        const response = await api.get("/settings/skilled-users");
        if (response.data.success) {
          setWorkers(response.data.workers);
        } else {
          setError("Failed to fetch service providers");
        }
      } catch (err) {
        setError("Error: " + err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchWorkers();
  }, []);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>{error}</div>;
  if (workers.length === 0) return <div>No service providers found.</div>;

  return (
    <div className="workers-list">
  {workers.map((worker) => (
    <div key={worker._id} className="worker-card">
      <img
        src={worker.profilePic ? getImageUrl(worker.profilePic) : "/default-profile.png"}
        alt={`${worker.firstName} ${worker.lastName}`}
        className="profile-pic"
      />
      <h3>{worker.firstName} {worker.lastName}</h3>
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
  );
};

export default SkilledWorkers;
