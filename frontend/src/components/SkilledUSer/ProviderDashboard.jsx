import { useState, useEffect } from 'react';
import api from '../../api.js';
import { useMainContext } from '../../mainContext';
import toast from 'react-hot-toast';

const ProviderDashboard = () => {
  const { user, isAuthorized } = useMainContext();
  const [offers, setOffers] = useState([]);
  const [recommendedJobs, setRecommendedJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchMyOffers = async () => {
      if (!isAuthorized || !user) {
        setLoading(false);
        return;
      }

      try {
        const response = await api.get('/user/service-requests');
        if (response.data.success) {
          // Filter requests that have been offered to providers (status: "Offered")
          const offeredRequests = response.data.requests.filter(request =>
            request.status === 'Offered' && request.targetProvider
          );
          setOffers(offeredRequests);
        }
      } catch (error) {
        console.error('Error fetching offers:', error);
        setError('Failed to load offers');
        toast.error('Failed to load offers');
      } finally {
        setLoading(false);
      }
    };

    fetchMyOffers();
    fetchRecommendedJobs();
  }, [user, isAuthorized]);

  const maskPhone = (phone) => {
    if (!phone) return "N/A";
    return phone.replace(/\d(?=\d{3})/g, "*");
  };

  const maskEmail = (email) => {
    if (!email || !email.includes("@")) return "N/A";
    const [user, domain] = email.split("@");
    const maskedUser = user[0] + "*".repeat(Math.max(user.length - 2, 1)) + user.slice(-1);
    return `${maskedUser}@${domain}`;
  };

  const rankJobsForProvider = (jobs, provider) => {
    return jobs.map(job => {
      let score = 0;

      // Content-Based Filtering (CBF): Recommends jobs based on what the provider is like.
      // Uses: Skills added, service description.
      // Techniques used: Keyword matching (similar to TF-IDF similarity)
      const jobService = job.typeOfWork.toLowerCase();
      const providerSkills = (provider.skills || []).map(s => s.toLowerCase());
      const providerDesc = (provider.serviceDescription || '').toLowerCase();

      // Exact skill match
      if (providerSkills.some(skill => skill.includes(jobService))) {
        score += 10;
      }

      // Partial match
      if (providerSkills.some(skill => jobService.includes(skill))) {
        score += 5;
      }

      // Service description match
      if (providerDesc.includes(jobService)) {
        score += 3;
      }

      // Collaborative Filtering (CF): Recommends jobs based on what similar providers do.
      // Types: Item-based CF - jobs with budgets matching provider's rate are boosted.
      // Uses: Service rate, job budget.
      const providerRate = provider.serviceRate || 0;
      const jobBudget = job.budget || 0;
      if (Math.abs(providerRate - jobBudget) < 1000) {
        score += 2;
      }

      return { ...job, recommendationScore: score };
    }).filter(job => job.recommendationScore > 0)
      .sort((a, b) => b.recommendationScore - a.recommendationScore);
  };

  const fetchRecommendedJobs = async () => {
    try {
      const response = await api.get('/user/available-service-requests');
      if (response.data.success) {
        const availableJobs = response.data.requests;
        const ranked = rankJobsForProvider(availableJobs, user);
        setRecommendedJobs(ranked.slice(0, 5)); // top 5 recommendations
      }
    } catch (error) {
      console.error('Error fetching recommended jobs:', error);
    }
  };

  if (!isAuthorized || !user) {
    return (
      <div className="max-w-screen-xl mx-auto p-5">
        <div className="text-center py-20 px-5">
          <div className="text-6xl mb-5">🔒</div>
          <h3 className="text-2xl font-bold mb-3">Authentication Required</h3>
          <p className="text-gray-600 mb-5">Please log in to access your dashboard.</p>
          <button className="bg-blue-500 hover:bg-blue-700 text-white border-none px-5 py-3 rounded-lg cursor-pointer transition-colors duration-200" onClick={() => window.location.href = '/login'}>
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-screen-xl mx-auto p-5">
      <h2 className="text-3xl font-bold mb-3">Provider Dashboard</h2>
      <p className="text-gray-600 mb-8">Here are the offers you've received for your services.</p>

      {loading ? (
        <div className="text-center py-20 px-5">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500 mx-auto mb-5"></div>
          <p className="text-gray-600">Loading your dashboard...</p>
        </div>
      ) : error ? (
        <div className="text-center py-20 px-5">
          <p className="text-red-600">{error}</p>
        </div>
      ) : offers.length === 0 ? (
        <div className="text-center py-20 px-5">
          <p className="text-gray-600">You haven't received any offers yet. Your profile will be visible to clients looking for your skills.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          {offers.map((offer) => (
            <div key={offer._id} className="border border-gray-300 rounded-lg p-5 bg-white shadow-sm">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-semibold m-0">Offer for: {offer.typeOfWork}</h3>
                <span className="bg-orange-500 text-white px-3 py-1 rounded text-sm">Pending Response</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-semibold mb-3 text-gray-700">Offered to Provider:</h4>
                  <p className="mb-2 text-sm"><strong className="font-medium">Name:</strong> {offer.serviceProvider?.firstName} {offer.serviceProvider?.lastName}</p>
                  <p className="mb-2 text-sm"><strong className="font-medium">Email:</strong> {maskEmail(offer.serviceProvider?.email)}</p>
                  <p className="mb-2 text-sm"><strong className="font-medium">Phone:</strong> {maskPhone(offer.serviceProvider?.phone)}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-semibold mb-3 text-gray-700">Request Details:</h4>
                  <p className="mb-2 text-sm"><strong className="font-medium">Service Needed:</strong> {offer.typeOfWork}</p>
                  <p className="mb-2 text-sm"><strong className="font-medium">Budget:</strong> ₱{offer.budget}</p>
                  <p className="mb-2 text-sm"><strong className="font-medium">Preferred Date:</strong> {offer.preferredDate || 'Not specified'}</p>
                  <p className="mb-2 text-sm"><strong className="font-medium">Time:</strong> {offer.time || 'Not specified'}</p>
                  <p className="mb-2 text-sm"><strong className="font-medium">Address:</strong> {offer.address}</p>
                  {offer.notes && <p className="mb-2 text-sm"><strong className="font-medium">Notes:</strong> {offer.notes}</p>}
                </div>
              </div>
              <div className="border-t border-gray-200 pt-4">
                <p className="text-gray-500 italic m-0">Waiting for provider to accept or decline your offer.</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {recommendedJobs.length > 0 && (
        <div className="recommended-jobs-section mt-10">
          <h3 className="text-2xl font-bold mb-3">Recommended Jobs for You</h3>
          <p className="text-gray-600 mb-8">Based on your skills and experience, here are some job opportunities that might interest you.</p>
          <div className="recommended-jobs-list flex flex-col gap-5">
            {recommendedJobs.map((job) => (
              <div key={job._id} className="job-card border border-gray-300 rounded-lg p-5 bg-white shadow-sm">
                <h4 className="text-xl font-semibold mb-3">{job.typeOfWork}</h4>
                <p className="mb-2"><strong>Budget:</strong> ₱{job.budget}</p>
                <p className="mb-2"><strong>Date:</strong> {job.preferredDate || 'Not specified'}</p>
                <p className="mb-2"><strong>Time:</strong> {job.time || 'Not specified'}</p>
                <p className="mb-2"><strong>Notes:</strong> {job.notes || 'None'}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProviderDashboard;
