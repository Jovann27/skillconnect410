import { useState, useEffect, useMemo } from 'react';
import { FaStar, FaRegStar, FaUser } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import api from '../../api';
import { getImageUrl } from '../../utils/imageUtils';

const ManageProfile = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reviews, setReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [reviewStats, setReviewStats] = useState({ averageRating: 0, totalReviews: 0 });
  const [completedJobs, setCompletedJobs] = useState([]);
  const [completedJobsLoading, setCompletedJobsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('reviews');
  const [certificates, setCertificates] = useState([]);
  const [workProof, setWorkProof] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    fetchUserProfile();
  }, []);

  useEffect(() => {
    if (user?._id) {
      fetchUserInsights(user._id);
      // Certificates and workProof are now fetched from user profile
      if (user.certificates) {
        setCertificates(user.certificates || []);
      }
      if (user.workProof) {
        setWorkProof(user.workProof || []);
      }
      // Fetch completed jobs if user is a service provider
      if (user.role === 'Service Provider') {
        fetchCompletedJobs();
      }
    }
  }, [user?._id, user?.role, user?.certificates, user?.workProof]);

  const fetchUserProfile = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await api.get('/user/me');
      if (response.data.success) {
        // Handle both 'user' and 'profile' response formats
        const userData = response.data.user || response.data.profile || null;
        if (userData) {
          setUser(userData);
          // Set certificates and workProof from user profile
          setCertificates(userData.certificates || []);
          setWorkProof(userData.workProof || []);
        } else {
          setError('No user data received');
        }
      } else {
        setError(response.data.message || 'Failed to fetch profile data');
      }
    } catch (err) {
      setError('Failed to fetch profile data');
      console.error('Error fetching profile:', err);
      // Set empty arrays to prevent undefined errors
      setCertificates([]);
      setWorkProof([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserInsights = async (userId) => {
    try {
      setReviewsLoading(true);
      const [reviewsRes, statsRes] = await Promise.all([
        api.get(`/review/user/${userId}`),
        api.get(`/review/stats/${userId}`)
      ]);
      if (reviewsRes.data.success) {
        setReviews(reviewsRes.data.reviews || []);
      }
      if (statsRes.data.success) {
        setReviewStats(statsRes.data.stats || { averageRating: 0, totalReviews: 0 });
      }
    } catch (insightError) {
      console.error('Error fetching review insights:', insightError);
    } finally {
      setReviewsLoading(false);
    }
  };

  const fetchCompletedJobs = async () => {
    try {
      setCompletedJobsLoading(true);
      const response = await api.get('/settings/my-completed-jobs');
      if (response.data.success) {
        setCompletedJobs(response.data.jobs || []);
      }
    } catch (error) {
      console.error('Error fetching completed jobs:', error);
    } finally {
      setCompletedJobsLoading(false);
    }
  };

  // Certificates and workProof are now fetched from user profile
  // No separate API calls needed

  const handleProfilePictureUpload = async (file) => {
    if (!file) return;
    const formData = new FormData();
    formData.append('profilePic', file);
    try {
      const response = await api.post('/user/upload-profile-pic', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (response.data.success) {
        setUser(prev => ({ ...prev, profilePic: response.data.profilePic }));
      }
    } catch (error) {
      console.error('Error uploading profile picture:', error);
    }
  };

  const maskEmail = (email) => {
    if (!email) return '';
    const [userPart, domain] = email.split('@');
    if (!domain) return email;
    const visible = userPart.slice(0, 2);
    return `${visible}${'*'.repeat(Math.max(userPart.length - 2, 3))}@${domain}`;
  };

  const maskPhone = (phone) => {
    if (!phone) return '';
    return phone.replace(/.(?=.{4})/g, '*');
  };

  const formatAddress = (address = '') => {
    const [street, rest] = address.split(',');
    return rest ? `${street.trim()}, ${rest.trim()}` : address;
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return '';
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const displaySkills = useMemo(() => {
    if (!user?.skills || user.skills.length === 0) return 'No skills added yet';
    return user.skills.map(skill => skill.charAt(0).toUpperCase() + skill.slice(1)).join(' • ');
  }, [user?.skills]);

  const renderStars = (value = 0) =>
    Array.from({ length: 5 }, (_, index) => {
      const score = index + 1;
      return (
        <span key={score} className="star-icon" aria-hidden="true">
          {value >= score ? <FaStar /> : <FaRegStar />}
        </span>
      );
    });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600"></div>
      </div>
    );
  }



  const bioText = user?.serviceDescription || '“Reliable and detail-oriented worker.”';

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <aside className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="text-center mb-6">
                {user?.profilePic ? (
                  <img
                    src={getImageUrl(user.profilePic)}
                    alt="Profile"
                    className="w-24 h-24 rounded-full mx-auto object-cover border-4 border-blue-100"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-full mx-auto bg-blue-100 flex items-center justify-center text-2xl font-bold text-blue-600 border-4 border-blue-200">
                    {user?.firstName?.charAt(0) || user?.lastName?.charAt(0) || 'S'}
                  </div>
                )}
              </div>

              <div className="text-center mb-6">
                <h2 className="text-xl font-bold text-gray-900">{`${user?.firstName || ''} ${user?.lastName || ''}`.trim()}</h2>
                <p className="text-gray-600">{user?.occupation || 'Independent Specialist'}</p>
                <p className="text-sm text-gray-500">{formatAddress(user?.address)}</p>
              </div>

              <div className="flex justify-between items-center mb-6 p-4 bg-gray-50 rounded-lg">
                <div>
                  <span className="text-2xl font-bold text-yellow-500">
                    {reviewStats.averageRating ? reviewStats.averageRating.toFixed(1) : '0.0'}
                  </span>
                  <span className="text-sm text-gray-600">/ 5 rating</span>
                </div>
                <div className="text-right">
                  <span className="block text-sm text-gray-600">{reviewStats.totalReviews || 0} Reviews</span>
                  <span className="block text-sm text-gray-600">{user?.bookings?.length || completedJobs?.length || 0} Jobs</span>
                </div>
              </div>

              <div className="space-y-3 mb-6">
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-sm font-medium text-gray-700">Email</span>
                  <strong className="text-sm text-gray-900">{maskEmail(user?.email)}</strong>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-sm font-medium text-gray-700">Phone</span>
                  <strong className="text-sm text-gray-900">{maskPhone(user?.phone)}</strong>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-sm font-medium text-gray-700">Skills</span>
                  <strong className="text-sm text-gray-900">{displaySkills}</strong>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-sm font-medium text-gray-700">Services</span>
                  <strong className="text-sm text-gray-900">{user.services?.length ? `${user.services.length} Listed` : 'Not set'}</strong>
                </div>
              </div>

              <blockquote className="text-center text-gray-600 italic mb-6 p-4 bg-gray-50 rounded-lg">
                {bioText}
              </blockquote>

              <p className="text-xs text-gray-500 mb-6 leading-relaxed">
                *If the individual user views the skilled user their email and phone number will be hidden
                <br />
                ex: ju****@gmail.com, 09*****65
              </p>

              <button
                type="button"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200"
                onClick={() => navigate('/user/general-settings')}
              >
                Edit Profile
              </button>
            </div>
          </aside>

          <section className="lg:col-span-2">
            <div className="flex space-x-4 mb-6">
              <button
                onClick={() => setActiveTab('reviews')}
                className={`px-4 py-2 rounded-lg ${activeTab === 'reviews' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
              >
                Reviews
              </button>
              <button
                onClick={() => setActiveTab('credentials')}
                className={`px-4 py-2 rounded-lg ${activeTab === 'credentials' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
              >
                Credentials
              </button>
            </div>

            {activeTab === 'reviews' && (
              <div className="space-y-8">
                <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                <div>
                  <p className="text-sm text-gray-500 uppercase tracking-wide">Performance Snapshot</p>
                  <h1 className="text-2xl font-bold text-gray-900">All Reviews</h1>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-bold text-yellow-500">
                    {reviewStats.averageRating ? reviewStats.averageRating.toFixed(1) : '0.0'} ★
                  </span>
                  <span className="block text-sm text-gray-600">{reviewStats.totalReviews || 0} total reviews</span>
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
                  {error}
                </div>
              )}

              {reviewsLoading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p className="text-gray-600">Loading feedback…</p>
                </div>
              ) : reviews.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-600 text-lg mb-2">No reviews yet</p>
                  <small className="text-gray-500">Completed jobs will automatically appear here when clients leave feedback.</small>
                </div>
              ) : (
                <div className="space-y-6">
                  {reviews.map((review) => (
                    <article key={review.id} className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                      <header className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-4">
                        <div>
                          <p className="text-sm text-blue-600 font-medium">Client Review</p>
                          <h3 className="text-lg font-semibold text-gray-900">{review.clientName || 'Anonymous Client'}</h3>
                          <p className="text-sm text-gray-600">
                            Service Needed: <span className="font-medium">{review.service || 'Service Request'}</span>
                          </p>
                        </div>
                        <span className="text-sm text-gray-500">{formatDate(review.createdAt)}</span>
                      </header>

                      <div className="mb-4">
                        <span className="font-medium text-gray-700">Comment:</span>
                        <span className="text-gray-600 ml-2">{review.comment || 'No comment was provided.'}</span>
                      </div>

                      {review.images && review.images.length > 0 && (
                        <div className="mb-4">
                          <span className="font-medium text-gray-700">Proof Work:</span>
                          <div className="grid grid-cols-3 gap-2 mt-2">
                            {review.images.map((img, idx) => (
                              <img
                                key={idx}
                                src={getImageUrl(img)}
                                alt={`Proof ${idx + 1}`}
                                className="w-full h-20 object-cover rounded-lg border border-gray-200"
                              />
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="flex items-center justify-between">
                        <span className="font-medium text-gray-700">Rating:</span>
                        <div className="flex items-center space-x-2">
                          <div className="flex">
                            {renderStars(review.rating)}
                          </div>
                          <strong className="text-gray-900">{review.rating?.toFixed(1) || '0.0'}</strong>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>

            {/* Completed Jobs Section - Only for Service Providers */}
            {user?.role === 'Service Provider' && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                  <div>
                    <p className="text-sm text-gray-500 uppercase tracking-wide">Work History</p>
                    <h1 className="text-2xl font-bold text-gray-900">Completed Jobs</h1>
                  </div>
                  <div className="text-right">
                    <span className="block text-sm text-gray-600">{completedJobs.length} completed jobs</span>
                  </div>
                </div>

                {completedJobsLoading ? (
                  <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading completed jobs…</p>
                  </div>
                ) : completedJobs.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-gray-600 text-lg mb-2">No completed jobs yet</p>
                    <small className="text-gray-500">Jobs you complete will appear here.</small>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {completedJobs.map((job) => (
                      <article key={job._id} className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                        <header className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-4">
                          <div>
                            <p className="text-sm text-green-600 font-medium">Completed Job</p>
                            <h3 className="text-lg font-semibold text-gray-900">
                              {job.requester?.firstName || 'Unknown'} {job.requester?.lastName || 'Client'}
                            </h3>
                            <p className="text-sm text-gray-600">
                              Service: <span className="font-medium">{job.typeOfWork || 'Service Request'}</span>
                            </p>
                          </div>
                          <span className="text-sm text-gray-500">{formatDate(job.updatedAt)}</span>
                        </header>

                        <div className="mb-4">
                          <span className="font-medium text-gray-700">Budget:</span>
                          <span className="text-gray-600 ml-2">₱{job.budget || 0}</span>
                        </div>

                        {job.completionNotes && (
                          <div className="mb-4">
                            <span className="font-medium text-gray-700">Completion Notes:</span>
                            <span className="text-gray-600 ml-2">{job.completionNotes}</span>
                          </div>
                        )}

                        {job.proofOfWork && job.proofOfWork.length > 0 && (
                          <div className="mb-4">
                            <span className="font-medium text-gray-700">Proof of Work:</span>
                            <div className="grid grid-cols-3 gap-2 mt-2">
                              {job.proofOfWork.map((img, idx) => (
                                <img
                                  key={idx}
                                  src={getImageUrl(img)}
                                  alt={`Proof ${idx + 1}`}
                                  className="w-full h-20 object-cover rounded-lg border border-gray-200"
                                />
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="flex items-center justify-between">
                          <span className="font-medium text-gray-700">Status:</span>
                          <span className="px-3 py-1 bg-green-100 text-green-800 text-sm font-medium rounded-full">
                            Completed
                          </span>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </div>
            )}
              </div>
            )}

            {activeTab === 'credentials' && (
              <div className="space-y-8">
                {/* Profile Picture Upload */}
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <FaUser className="mr-2 text-purple-600" />
                    Update Profile Picture
                  </h3>
                  <div className="flex items-center space-x-6">
                    <div className="flex-shrink-0">
                      <img
                        src={getImageUrl(user?.profilePic) || '/default-profile.png'}
                        alt="Profile"
                        className="w-20 h-20 rounded-full object-cover border-4 border-gray-200"
                      />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-gray-600 mb-4">
                        Upload a new profile picture. This will be visible to clients and doesn't require verification.
                      </p>
                      <div className="flex items-center space-x-4">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleProfilePictureUpload(e.target.files[0])}
                          className="hidden"
                          id="profile-pic-upload"
                        />
                        <label
                          htmlFor="profile-pic-upload"
                          className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 transition-colors cursor-pointer"
                        >
                          Choose Image
                        </label>
                        <span className="text-sm text-gray-500">PNG, JPG up to 5MB</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Certificates List */}
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Your Certificates</h3>
                  {certificates.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-gray-600 mb-2">No certificates uploaded yet</p>
                      <small className="text-gray-500">Upload certificates to showcase your qualifications</small>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {certificates.map((cert) => (
                        <div key={cert._id || cert.id} className="border border-gray-200 rounded-lg p-4">
                          <h4 className="font-semibold text-gray-900 mb-2">{cert.title || 'Untitled Certificate'}</h4>
                          <p className="text-sm text-gray-600 mb-2">{cert.description || 'No description'}</p>
                          <div className="flex items-center justify-between text-sm">
                            <span className={`px-2 py-1 rounded-full ${
                              cert.verified ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {cert.verified ? 'Verified' : 'Pending Verification'}
                            </span>
                            {cert.certificateUrl && (
                              <a href={getImageUrl(cert.certificateUrl)} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800">
                                View
                              </a>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Work Proof List */}
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Your Work Proof</h3>
                  {workProof.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-gray-600 mb-2">No work proof uploaded yet</p>
                      <small className="text-gray-500">Upload proof of completed work to build your portfolio</small>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {workProof.map((proof) => (
                        <div key={proof._id || proof.id} className="border border-gray-200 rounded-lg p-4">
                          <h4 className="font-semibold text-gray-900 mb-2">{proof.title || 'Untitled Work'}</h4>
                          <p className="text-sm text-gray-600 mb-2">{proof.description || 'No description'}</p>
                          <div className="flex items-center justify-between text-sm mb-2">
                            <span className="text-gray-500">{proof.serviceType || 'General'}</span>
                            <span className={`px-2 py-1 rounded-full ${
                              proof.verified ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {proof.verified ? 'Verified' : 'Pending Verification'}
                            </span>
                          </div>
                          {proof.imageUrl && (
                            <img src={getImageUrl(proof.imageUrl)} alt={proof.title || 'Work proof'} className="w-full h-32 object-cover rounded-md" />
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
};

export default ManageProfile;
