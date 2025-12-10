import { useEffect, useState } from "react";
import api from "../../api";

const Announcement = () => {
  const [jobfair, setJobfair] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchJobfair = async () => {
      try {
        const { data } = await api.get("/settings/jobfair");
        if (data.success) {
          setJobfair(data.jobfair);
        }
      } catch (err) {
        setError("Error: " + (err.response?.data?.message || err.message));
      } finally {
        setLoading(false);
      }
    };
    fetchJobfair();
  }, []);

  if (loading) return <div>Loading...</div>;
  if (error) return <div></div>;
  if (!jobfair || new Date(jobfair.date) < new Date()) return <div></div>;

  return (
    <>
      <div className="py-16 px-4 bg-gradient-to-br from-pink-50 via-white to-pink-50">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 bg-gradient-to-r from-pink-600 to-pink-600 bg-clip-text text-transparent">
            CAREER FAIR
          </h1>
        </div>
        <div className="max-w-7xl mx-auto">
          <div className="relative bg-white rounded-2xl shadow-2xl overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-pink-600/10 to-pink-600/10"></div>

            <div className="relative flex flex-col lg:flex-row">
              <div className="flex-1 p-8 lg:p-12">
                <div className="mb-6">
                  <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                    {jobfair.title}
                  </h2>

                  {jobfair.description && (
                    <div className="mb-8">
                      <p className="text-lg text-gray-700 leading-relaxed">{jobfair.description}</p>
                    </div>
                  )}
                </div>

                <div className="space-y-6">
                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0 w-12 h-12 bg-pink-100 rounded-full flex items-center justify-center">
                      <svg className="w-6 h-6 text-pink-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                        <line x1="16" y1="2" x2="16" y2="6"/>
                        <line x1="8" y1="2" x2="8" y2="6"/>
                        <line x1="3" y1="10" x2="21" y2="10"/>
                      </svg>
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-gray-500 uppercase tracking-wide">DATE</div>
                      <div className="text-lg font-medium text-gray-900">
                        {jobfair.date ? new Date(jobfair.date).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        }) : 'Jun 24, 2025'}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0 w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                      <svg className="w-6 h-6 text-green-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10"/>
                        <polyline points="12,6 12,12 16,14"/>
                      </svg>
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-gray-500 uppercase tracking-wide">TIME</div>
                      <div className="text-lg font-medium text-gray-900">
                        {jobfair.startTime} - {jobfair.endTime}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0 w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                      <svg className="w-6 h-6 text-red-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                        <circle cx="12" cy="10" r="3"/>
                      </svg>
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-gray-500 uppercase tracking-wide">LOCATION</div>
                      <div className="text-lg font-medium text-gray-900">
                        {jobfair.location}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex-1 lg:w-1/2">
                <div className="grid grid-cols-1 gap-4 p-8 lg:p-12">
                  <div className="relative overflow-hidden rounded-xl shadow-lg">
                    <img
                      src="https://images.unsplash.com/photo-1521791136064-7986c2920216?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1469&q=80"
                      alt="People waiting for interviews"
                      className="w-full h-48 lg:h-64 object-cover"
                    />
                  </div>
                  <div className="relative overflow-hidden rounded-xl shadow-lg">
                    <img
                      src="https://images.unsplash.com/photo-1556761175-b413da4baf72?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1574&q=80"
                      alt="People in meeting"
                      className="w-full h-48 lg:h-64 object-cover"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Announcement;
