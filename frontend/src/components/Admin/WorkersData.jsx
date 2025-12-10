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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Error</h1>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6">
          <p className="text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  if (workers.length === 0) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">No Service Providers</h1>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6">
          <p className="text-gray-600">No service providers found.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Service Providers</h1>
        <p className="text-gray-600 text-lg">List of all service providers</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {workers.map((worker) => (
          <div key={worker._id} className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow duration-200">
            <div className="text-center mb-4">
              <img
                src={worker.profilePic || "/default-avatar.png"}
                alt={`${worker.firstName} ${worker.lastName}`}
                className="w-24 h-24 rounded-full mx-auto object-cover border-4 border-gray-100"
              />
            </div>

            <h2 className="text-xl font-semibold text-gray-900 text-center mb-4">
              {worker.firstName} {worker.lastName}
            </h2>

            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="font-medium text-gray-700">Skills:</span>
                <span className="text-sm text-gray-600">
                  {Array.isArray(worker.skills) && worker.skills.length > 0
                    ? worker.skills.join(", ")
                    : "N/A"}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="font-medium text-gray-700">Availability:</span>
                <span className="text-sm text-gray-600">
                  {worker.availability || "Not set"}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ServiceProviders;
