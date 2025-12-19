import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../api.js';
import { useMainContext } from '../../mainContext';
import toast from 'react-hot-toast';
import socket from '../../utils/socket';
import { 
  FaSearch, FaFilter, FaBriefcase, FaClock, FaEye, FaHeart, 
  FaMapMarkerAlt, FaStar, FaUsers, FaTrophy, FaCheckCircle,
  FaEnvelope, FaPhone, FaCalendarAlt, FaClipboardList,
  FaTools, FaChartLine, FaUser, FaBookmark, FaBell,
  FaHandshake, FaFileAlt, FaComment, FaStarHalfAlt
} from 'react-icons/fa';

const EnhancedProviderDashboard = () => {
  const { user, isAuthorized } = useMainContext();
  const navigate = useNavigate();
  
  // Core state
  const [offers, setOffers] = useState([]);
  const [recommendedJobs, setRecommendedJobs] = useState([]);
  const [allAvailableJobs, setAllAvailableJobs] = useState([]);
  const [filteredJobs, setFilteredJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  
  // Advanced filters state
  const [jobFilters, setJobFilters] = useState({
    serviceType: '',
    location: '',
    minBudget: 0,
    maxBudget: 10000,
    dateRange: 'any',
    urgency: 'any',
    sortBy: 'relevance'
  });

  // Job portal specific features
  const [savedJobs, setSavedJobs] = useState(new Set());
  const [applicationHistory, setApplicationHistory] = useState([]);
  const [profileCompletion, setProfileCompletion] = useState(75);
  const [recentActivity, setRecentActivity] = useState([]);
  const [earnings, setEarnings] = useState({ thisMonth: 15000, lastMonth: 12000, total: 85000 });
  const [performanceMetrics, setPerformanceMetrics] = useState({
    responseRate: 95,
    acceptanceRate: 87,
    completionRate: 98,
    averageRating: 4.8,
    totalJobs: 42
  });

  // UI state
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  useEffect(() => {
    const fetchProviderData = async () => {
      if (!isAuthorized || !user) {
        setLoading(false);
        return;
      }

      try {
        await Promise.all([
          fetchMyOffers(),
          fetchRecommendedJobs(),
          fetchAllAvailableJobs(),
          fetchSavedJobs(),
          fetchApplicationHistory(),
          fetchPerformanceMetrics(),
          fetchEarningsData(),
          fetchRecentActivity()
        ]);
      } catch (error) {
        console.error('Error fetching provider data:', error);
        setError('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    fetchProviderData();
    setupRealTimeUpdates();
  }, [user, isAuthorized]);

  useEffect(() => {
    const filtered = applyJobFilters(recommendedJobs);
    setFilteredJobs(filtered);
  }, [recommendedJobs, jobFilters]);

  const setupRealTimeUpdates = () => {
    if (socket && user) {
      socket.emit("join-provider-room", user._id);

      const handleOfferUpdate = (data) => {
        if (data.action === "offered" || data.action === "accepted" || data.action === "rejected") {
          fetchMyOffers();
        }
      };

      socket.on("service-request-updated", handleOfferUpdate);
      socket.on("new-job-available", (data) => {
        toast.info(`New ${data.jobType} job available in your area!`);
        fetchRecommendedJobs();
        fetchAllAvailableJobs();
      });

      return () => {
        socket.off("service-request-updated", handleOfferUpdate);
        socket.off("new-job-available");
        socket.emit("leave-provider-room", user._id);
      };
    }
  };

  const fetchMyOffers = async () => {
    try {
      const response = await api.get('/user/service-requests');
      if (response.data.success) {
        const offeredRequests = response.data.requests.filter(request =>
          request.status === 'Offered' && request.targetProvider === user._id
        );
        setOffers(offeredRequests);
      }
    } catch (error) {
      console.error('Error fetching offers:', error);
      // Mock data for demo
      setOffers([
        {
          _id: '1',
          typeOfWork: 'Home Cleaning',
          budget: 2000,
          location: 'Makati City',
          preferredDate: new Date(),
          status: 'Offered',
          clientName: 'John Doe'
        }
      ]);
    }
  };

  const fetchRecommendedJobs = async () => {
    try {
      const response = await api.get('/user/recommended-jobs');
      if (response.data.success) {
        setRecommendedJobs(response.data.jobs);
      }
    } catch (error) {
      console.error('Error fetching recommended jobs:', error);
      // Mock data for demo
      setRecommendedJobs([
        {
          _id: '1',
          typeOfWork: 'Plumbing Repair',
          notes: 'Fix kitchen sink leak',
          budget: 1500,
          location: 'Quezon City',
          preferredDate: new Date(),
          createdAt: new Date(),
          urgency: 'Normal'
        },
        {
          _id: '2',
          typeOfWork: 'Electrical Work',
          notes: 'Install ceiling fan',
          budget: 2500,
          location: 'Manila',
          preferredDate: new Date(),
          createdAt: new Date(),
          urgency: 'Urgent'
        }
      ]);
    }
  };

  const fetchAllAvailableJobs = async () => {
    try {
      const response = await api.get('/user/available-service-requests');
      if (response.data.success) {
        setAllAvailableJobs(response.data.requests);
      }
    } catch (error) {
      console.error('Error fetching all available jobs:', error);
    }
  };

  const fetchSavedJobs = async () => {
    try {
      const response = await api.get('/user/saved-jobs');
      if (response.data.success) {
        const savedJobIds = response.data.jobs.map(job => job._id);
        setSavedJobs(new Set(savedJobIds));
      }
    } catch (error) {
      console.log('No saved jobs available');
    }
  };

  const fetchApplicationHistory = async () => {
    try {
      const response = await api.get('/user/application-history');
      if (response.data.success) {
        setApplicationHistory(response.data.applications);
      }
    } catch (error) {
      console.log('No application history available');
    }
  };

  const fetchPerformanceMetrics = async () => {
    try {
      const response = await api.get('/user/performance-metrics');
      if (response.data.success) {
        setPerformanceMetrics(response.data.metrics);
      }
    } catch (error) {
      console.log('No performance metrics available');
    }
  };

  const fetchEarningsData = async () => {
    try {
      const response = await api.get('/user/earnings');
      if (response.data.success) {
        setEarnings(response.data.earnings);
      }
    } catch (error) {
      console.log('No earnings data available');
    }
  };

  const fetchRecentActivity = async () => {
    try {
      const response = await api.get('/user/recent-activity');
      if (response.data.success) {
        setRecentActivity(response.data.activities);
      }
    } catch (error) {
      console.log('No recent activity available');
    }
  };

  const applyJobFilters = (jobs) => {
    if (!jobs?.length) return [];

    let filtered = [...jobs];

    // Service type filter
    if (jobFilters.serviceType) {
      const serviceFilter = jobFilters.serviceType.toLowerCase();
      filtered = filtered.filter(job =>
        job.typeOfWork?.toLowerCase().includes(serviceFilter) ||
        job.notes?.toLowerCase().includes(serviceFilter)
      );
    }

    // Budget filtering
    if (jobFilters.minBudget > 0 || jobFilters.maxBudget < 10000) {
      filtered = filtered.filter(job => {
        const budget = job.budget || 0;
        return budget >= jobFilters.minBudget && budget <= jobFilters.maxBudget;
      });
    }

    // Date range filtering
    if (jobFilters.dateRange !== 'any') {
      const now = new Date();
      filtered = filtered.filter(job => {
        const jobDate = new Date(job.preferredDate || job.createdAt);
        const daysDiff = (jobDate - now) / (1000 * 60 * 60 * 24);
        
        switch (jobFilters.dateRange) {
          case 'today':
            return daysDiff >= 0 && daysDiff <= 1;
          case 'week':
            return daysDiff >= 0 && daysDiff <= 7;
          case 'month':
            return daysDiff >= 0 && daysDiff <= 30;
          default:
            return true;
        }
      });
    }

    // Urgency filtering
    if (jobFilters.urgency === 'urgent') {
      filtered = filtered.filter(job => {
        if (!job.preferredDate) return false;
        const jobDate = new Date(job.preferredDate);
        const now = new Date();
        const hoursDiff = (jobDate - now) / (1000 * 60 * 60);
        return hoursDiff <= 24 && hoursDiff >= 0;
      });
    }

    // Smart sorting with enhanced scoring
    filtered = filtered.map(job => {
      let score = job.recommendationScore || 0;

      // Boost jobs with higher budgets (within reasonable range)
      const budget = job.budget || 0;
      if (budget >= 1000 && budget <= 5000) score += 2;
      else if (budget > 5000) score += 1;

      // Boost recent jobs
      const jobDate = new Date(job.createdAt || job.preferredDate);
      const daysSincePosted = (new Date() - jobDate) / (1000 * 60 * 60 * 24);
      if (daysSincePosted < 1) score += 3;
      else if (daysSincePosted < 3) score += 2;
      else if (daysSincePosted < 7) score += 1;

      // Boost jobs matching provider's skills
      if (user?.skills?.some(skill => 
        job.typeOfWork?.toLowerCase().includes(skill.toLowerCase())
      )) {
        score += 2;
      }

      return { ...job, finalScore: score };
    });

    // Apply sorting
    switch (jobFilters.sortBy) {
      case 'budget-low':
        filtered.sort((a, b) => (a.budget || 0) - (b.budget || 0));
        break;
      case 'budget-high':
        filtered.sort((a, b) => (b.budget || 0) - (a.budget || 0));
        break;
      case 'date':
        filtered.sort((a, b) => new Date(b.createdAt || b.preferredDate) - new Date(a.createdAt || a.preferredDate));
        break;
      case 'relevance':
      default:
        filtered.sort((a, b) => (b.finalScore || 0) - (a.finalScore || 0));
        break;
    }

    return filtered;
  };

  const handleAcceptOffer = async (requestId) => {
    try {
      const response = await api.post(`/user/offer/${requestId}/accept`);
      if (response.data.success) {
        toast.success('Offer accepted successfully!');
        setOffers(offers.filter(offer => offer._id !== requestId));
        fetchMyOffers();
      }
    } catch (error) {
      console.error('Error accepting offer:', error);
      toast.error('Failed to accept offer');
    }
  };

  const handleDeclineOffer = async (requestId) => {
    if (!window.confirm('Are you sure you want to decline this offer?')) return;

    try {
      const response = await api.post(`/user/offer/${requestId}/reject`);
      if (response.data.success) {
        toast.success('Offer declined successfully!');
        setOffers(offers.filter(offer => offer._id !== requestId));
        fetchMyOffers();
      }
    } catch (error) {
      console.error('Error declining offer:', error);
      toast.error('Failed to decline offer');
    }
  };

  const handleApplyToJob = async (jobId) => {
    if (!window.confirm('Are you sure you want to apply for this job? The client will be notified of your interest.')) return;

    try {
      await api.post('/user/offer-to-provider', {
        providerId: user._id,
        requestId: jobId
      });

      toast.success('Successfully applied for the job! The client has been notified.');
      fetchRecommendedJobs();
      fetchAllAvailableJobs();
    } catch (error) {
      console.error('Error applying to job:', error);
      toast.error('Failed to apply for job. Please try again.');
    }
  };

  const toggleSaveJob = (jobId) => {
    const updated = new Set(savedJobs);
    if (updated.has(jobId)) {
      updated.delete(jobId);
      toast.success('Job removed from saved jobs');
    } else {
      updated.add(jobId);
      toast.success('Job saved for later');
    }
    setSavedJobs(updated);
  };

  const renderStars = (rating) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;

    for (let i = 0; i < 5; i++) {
      if (i < fullStars) {
        stars.push(<FaStar key={i} className="text-yellow-400 fill-current" />);
      } else if (i === fullStars && hasHalfStar) {
        stars.push(<FaStarHalfAlt key={i} className="text-yellow-400" />);
      } else {
        stars.push(<FaStar key={i} className="text-gray-300" />);
      }
    }
    return stars;
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP'
    }).format(amount);
  };

  const calculateGrowthRate = (current, previous) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  };

  // Pagination helpers
  const totalPages = Math.ceil(filteredJobs.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentJobs = filteredJobs.slice(startIndex, startIndex + itemsPerPage);

  if (!isAuthorized || !user) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="text-center py-20 px-6">
          <div className="text-6xl mb-6">🔒</div>
          <h3 className="text-3xl font-bold text-gray-900 mb-4">Authentication Required</h3>
          <p className="text-gray-600 mb-6 text-lg">Please log in to access your provider dashboard.</p>
          <button
            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-medium transition-colors duration-200"
            onClick={() => window.location.href = '/login'}
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
          <h3 className="text-xl font-semibold text-gray-700">Loading your dashboard...</h3>
        </div>
      </div>
    );
  }

  const renderJobCard = (job) => (
    <div key={job._id} className="bg-white rounded-lg shadow-md border border-gray-200 p-6 hover:shadow-lg transition-shadow duration-200">
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">{job.typeOfWork}</h3>
          <p className="text-gray-600 text-sm mb-2">{job.notes}</p>
          <div className="flex items-center text-sm text-gray-500 mb-2">
            <FaMapMarkerAlt className="mr-1" />
            {job.location}
          </div>
          <div className="flex items-center text-sm text-gray-500 mb-2">
            <FaCalendarAlt className="mr-1" />
            {new Date(job.preferredDate).toLocaleDateString()}
          </div>
        </div>
        <div className="text-right ml-4">
          <p className="text-2xl font-bold text-green-600 mb-1">
            {formatCurrency(job.budget)}
          </p>
          <div className="flex items-center text-sm text-gray-500">
            <FaClock className="mr-1" />
            {job.urgency || 'Normal'}
          </div>
        </div>
      </div>
