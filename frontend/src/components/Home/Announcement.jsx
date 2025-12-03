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
      <div className="sectionann">
        <div className="section-main-title">
          <h1>CAREER FAIR</h1>
        </div>
        <div className="section-title">
          <div className="announcement-section">
            <div className="announcement-background"></div>

            <div className="announcement-content">
              <div className="announcement-left">
                <div className="career-fair-title">
                  {jobfair.title}
                </div>

                {jobfair.description && (
                  <div className="announcement-description">
                    <p>{jobfair.description}</p>
                  </div>
                )}

                <div className="announcement-info">
                  <div className="info-item">
                    <div className="info-icon date-icon">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                        <line x1="16" y1="2" x2="16" y2="6"/>
                        <line x1="8" y1="2" x2="8" y2="6"/>
                        <line x1="3" y1="10" x2="21" y2="10"/>
                      </svg>
                    </div>
                    <div className="info-text">
                      <div className="info-label">DATE</div>
                      <div className="info-value">
                        {jobfair.date ? new Date(jobfair.date).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        }) : 'Jun 24, 2025'}
                      </div>
                    </div>
                  </div>

                  <div className="info-item">
                    <div className="info-icon time-icon">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10"/>
                        <polyline points="12,6 12,12 16,14"/>
                      </svg>
                    </div>
                    <div className="info-text">
                      <div className="info-label">TIME</div>
                      <div className="info-value">
                        {jobfair.startTime} - {jobfair.endTime} 
                      </div>
                    </div>
                  </div>

                  <div className="info-item">
                    <div className="info-icon location-icon">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                        <circle cx="12" cy="10" r="3"/>
                      </svg>
                    </div>
                    <div className="info-text">
                      <div className="info-label">LOCATION</div>
                      <div className="info-value">
                        {jobfair.location}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="announcement-right">
                <div className="image-container top-image">
                  <img src="https://images.unsplash.com/photo-1521791136064-7986c2920216?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1469&q=80" alt="People waiting for interviews" />
                </div>
                <div className="image-container bottom-image">
                  <img src="https://images.unsplash.com/photo-1556761175-b413da4baf72?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1574&q=80" alt="People in meeting" />
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