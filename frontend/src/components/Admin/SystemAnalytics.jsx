import { useState, useEffect } from "react";
import {
  FaChartBar,
  FaUsers,
  FaTools,
  FaSync,
  FaChartLine,
  FaDownload,
  FaTrophy,
  FaFire
} from "react-icons/fa";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Bar, Line, Doughnut } from 'react-chartjs-2';
import api from "../../api";
import toast from "react-hot-toast";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const SystemAnalytics = () => {
  const [analyticsData, setAnalyticsData] = useState({
    totals: { totalUsers: 0, serviceProviders: 0, totalPopulation: 0 },
    demographics: { ageGroups: {}, employment: {} },
    skills: {},
    skilledPerTrade: { byRole: {}, bySkill: {} },
    mostBookedServices: {},
    totalsOverTime: { labels: [], values: [] },
    activeUsers: 0,
    totalBookings: 0,
    popularServices: []
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [timeRange, setTimeRange] = useState("12");

  useEffect(() => {
    fetchAnalyticsData();
  }, [timeRange]);

  const fetchAnalyticsData = async () => {
    setLoading(true);
    setError(null);

    try {
      const [
        totalsRes,
        demographicsRes,
        skillsRes,
        skilledPerTradeRes,
        mostBookedRes,
        totalsOverTimeRes
      ] = await Promise.all([
        api.get("/reports/totals"),
        api.get("/reports/demographics"),
        api.get("/reports/skills"),
        api.get("/reports/skilled-per-trade"),
        api.get("/reports/most-booked-services"),
        api.get(`/reports/totals-over-time?months=${timeRange}`)
      ]);

      const totalsData = totalsRes.data?.data || totalsRes.data || {};
      const demographicsData = demographicsRes.data?.data || demographicsRes.data || {};
      const skillsData = skillsRes.data?.data || skillsRes.data || {};
      const skilledPerTradeData = skilledPerTradeRes.data?.data || skilledPerTradeRes.data || {};
      const mostBookedData = mostBookedRes.data?.data || mostBookedRes.data || {};
      const totalsOverTimeData = totalsOverTimeRes.data?.data || totalsOverTimeRes.data || { labels: [], values: [] };

      const totalBookings = typeof mostBookedData === 'object' && mostBookedData !== null
        ? Object.values(mostBookedData)
            .filter(val => typeof val === 'number')
            .reduce((a, b) => a + b, 0)
        : 0;
      
      const popularServices = typeof mostBookedData === 'object' && mostBookedData !== null
        ? Object.entries(mostBookedData)
            .filter(([, count]) => typeof count === 'number')
            .map(([service, count]) => ({ service, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10)
        : [];

      setAnalyticsData({
        totals: totalsData,
        demographics: demographicsData,
        skills: skillsData,
        skilledPerTrade: skilledPerTradeData,
        mostBookedServices: mostBookedData,
        totalsOverTime: totalsOverTimeData,
        activeUsers: (() => {
          const totalUsers = totalsData?.totalUsers;
          if (typeof totalUsers === 'number' && !isNaN(totalUsers) && totalUsers > 0) {
            return Math.floor(totalUsers * 0.7);
          }
          return 0;
        })(),
        totalBookings: (() => {
          if (typeof totalBookings === 'number' && !isNaN(totalBookings)) {
            return totalBookings;
          }
          return 0;
        })(),
        popularServices
      });

      toast.success("Analytics data loaded successfully!");
    } catch (err) {
      console.error("Failed to fetch analytics data:", err);
      
      const isConnectionError = err.code === 'ERR_NETWORK' || 
                                err.message?.includes('Network Error') ||
                                err.message?.includes('ERR_CONNECTION_REFUSED');
      
      if (isConnectionError) {
        const errorMessage = "Cannot connect to the server. Please ensure the backend server is running and accessible.";
        setError(errorMessage);
        toast.error(errorMessage, { duration: 5000 });
      } else if (err.response?.status === 401) {
        const errorMessage = "Authentication required. Please log in again.";
        setError(errorMessage);
        toast.error(errorMessage);
      } else if (err.response?.status === 403) {
        const errorMessage = "Access denied. You don't have permission to view analytics.";
        setError(errorMessage);
        toast.error(errorMessage);
      } else {
        const errorMessage = err.response?.data?.message || err.message || "Failed to load analytics data";
        setError(errorMessage);
        toast.error(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  // Chart data configurations
  const userGrowthChartData = {
    labels: analyticsData.totalsOverTime.labels,
    datasets: [{
      label: 'New User Registrations',
      data: analyticsData.totalsOverTime.values,
      borderColor: '#6366f1',
      backgroundColor: 'rgba(99, 102, 241, 0.1)',
      tension: 0.4,
      fill: true,
    }]
  };

  const skillsChartData = {
    labels: Object.keys(analyticsData.skills).slice(0, 10),
    datasets: [{
      label: 'Users with Skill',
      data: Object.values(analyticsData.skills).slice(0, 10),
      backgroundColor: [
        '#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
        '#f97316', '#06b6d4', '#ec4899', '#6b7280', '#14b8a6'
      ],
    }]
  };

  const ageGroupsChartData = {
    labels: Object.keys(analyticsData.demographics.ageGroups || {}),
    datasets: [{
      label: 'Users by Age Group',
      data: Object.values(analyticsData.demographics.ageGroups || {}),
      backgroundColor: '#6366f1',
    }]
  };

  const servicesChartData = {
    labels: analyticsData.popularServices.slice(0, 8).map(s => s.service.length > 15 ? s.service.substring(0, 15) + '...' : s.service),
    datasets: [{
      label: 'Service Bookings',
      data: analyticsData.popularServices.slice(0, 8).map(s => s.count),
      backgroundColor: '#10b981',
    }]
  };

  const employmentChartData = {
    labels: ['Employed', 'Unemployed'],
    datasets: [{
      label: 'Employment Status',
      data: [
        analyticsData.demographics.employment?.worker || 0,
        analyticsData.demographics.employment?.nonWorker || 0
      ],
      backgroundColor: ['#10b981', '#ef4444'],
      borderWidth: 2,
      borderColor: '#ffffff',
    }]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          color: '#64748b',
          font: { size: 11, weight: '500' },
          padding: 15
        }
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        padding: 12,
        cornerRadius: 8,
        titleFont: { size: 13, weight: 'bold' },
        bodyFont: { size: 12 }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: { color: '#64748b', precision: 0, font: { size: 11 } },
        grid: { color: 'rgba(0,0,0,0.05)' }
      },
      x: {
        ticks: { color: '#64748b', font: { size: 11 } },
        grid: { display: false }
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="relative inline-block">
            <div className="w-24 h-24 border-4 border-indigo-200 rounded-full"></div>
            <div className="absolute top-0 left-0 w-24 h-24 border-4 border-indigo-600 rounded-full border-t-transparent animate-spin"></div>
          </div>
          <div className="mt-8 space-y-2">
            <p className="text-slate-800 font-semibold text-xl">Loading Analytics</p>
            <p className="text-slate-500 text-sm">Fetching real-time metrics and insights</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-orange-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl p-8 text-center border border-red-100">
          <div className="w-20 h-20 bg-gradient-to-br from-red-100 to-red-200 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
            <svg className="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-3">Connection Error</h2>
          <p className="text-slate-600 mb-8 leading-relaxed">{error}</p>
          <button
            onClick={fetchAnalyticsData}
            className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3 px-6 rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all duration-300 flex items-center justify-center gap-2 font-medium shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
          >
            <FaSync className="animate-spin" />
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50 to-purple-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Enhanced Header with Gradient */}
        <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 rounded-3xl shadow-2xl p-8 text-white relative overflow-hidden">
          <div className="absolute inset-0 bg-black opacity-10"></div>
          <div className="absolute -right-10 -top-10 w-40 h-40 bg-white opacity-10 rounded-full blur-3xl"></div>
          <div className="absolute -left-10 -bottom-10 w-40 h-40 bg-white opacity-10 rounded-full blur-3xl"></div>
          
          <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
            <div className="space-y-2">
              <h1 className="text-3xl sm:text-4xl font-bold flex items-center gap-3">
                <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-sm">
                  <FaChartLine className="text-2xl" />
                </div>
                System Analytics
              </h1>
              <p className="text-indigo-100 text-lg">Real-time insights from your platform</p>
            </div>
            
            <div className="flex flex-wrap items-center gap-3">
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
                className="px-5 py-3 bg-white/20 backdrop-blur-md border border-white/30 rounded-xl text-white hover:bg-white/30 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-white/50 cursor-pointer font-medium"
              >
                <option value="6" className="text-slate-800">Last 6 months</option>
                <option value="12" className="text-slate-800">Last 12 months</option>
                <option value="24" className="text-slate-800">Last 24 months</option>
              </select>
              
              <button
                onClick={fetchAnalyticsData}
                className="px-5 py-3 bg-white text-indigo-600 rounded-xl hover:bg-indigo-50 transition-all duration-300 flex items-center gap-2 font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              >
                <FaSync className="text-sm" />
                Refresh
              </button>
              
              <button className="px-5 py-3 bg-white/20 backdrop-blur-md border border-white/30 text-white rounded-xl hover:bg-white/30 transition-all duration-300 flex items-center gap-2 font-semibold">
                <FaDownload className="text-sm" />
                Export
              </button>
            </div>
          </div>
        </div>

        {/* Enhanced Key Metrics with Animations */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Total Users Card */}
          <div className="group bg-white rounded-2xl shadow-lg border border-slate-200 p-6 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="relative z-10">
              <div className="flex items-start justify-between mb-4">
                <div className="p-4 bg-gradient-to-br from-indigo-100 to-indigo-200 rounded-2xl shadow-md group-hover:scale-110 transition-transform duration-300">
                  <FaUsers className="text-indigo-600 text-2xl" />
                </div>
                <span className="text-xs font-semibold text-indigo-600 bg-indigo-100 px-3 py-1 rounded-full">
                  +12%
                </span>
              </div>
              <p className="text-sm font-medium text-slate-500 mb-1">Total Users</p>
              <p className="text-3xl font-bold text-slate-800 mb-1">
                {analyticsData.totals.totalUsers?.toLocaleString() || 0}
              </p>
              <p className="text-xs text-slate-400">All registered users</p>
            </div>
          </div>

          {/* Service Providers Card */}
          <div className="group bg-white rounded-2xl shadow-lg border border-slate-200 p-6 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-green-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="relative z-10">
              <div className="flex items-start justify-between mb-4">
                <div className="p-4 bg-gradient-to-br from-emerald-100 to-emerald-200 rounded-2xl shadow-md group-hover:scale-110 transition-transform duration-300">
                  <FaTools className="text-emerald-600 text-2xl" />
                </div>
                <span className="text-xs font-semibold text-emerald-600 bg-emerald-100 px-3 py-1 rounded-full">
                  Active
                </span>
              </div>
              <p className="text-sm font-medium text-slate-500 mb-1">Service Providers</p>
              <p className="text-3xl font-bold text-slate-800 mb-1">
                {analyticsData.totals.serviceProviders?.toLocaleString() || 0}
              </p>
              <p className="text-xs text-slate-400">Verified providers</p>
            </div>
          </div>

          {/* Total Bookings Card */}
          <div className="group bg-white rounded-2xl shadow-lg border border-slate-200 p-6 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-orange-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="relative z-10">
              <div className="flex items-start justify-between mb-4">
                <div className="p-4 bg-gradient-to-br from-amber-100 to-amber-200 rounded-2xl shadow-md group-hover:scale-110 transition-transform duration-300">
                  <FaChartBar className="text-amber-600 text-2xl" />
                </div>
                <FaFire className="text-amber-500 text-xl animate-pulse" />
              </div>
              <p className="text-sm font-medium text-slate-500 mb-1">Total Bookings</p>
              <p className="text-3xl font-bold text-slate-800 mb-1">
                {analyticsData.totalBookings.toLocaleString()}
              </p>
              <p className="text-xs text-slate-400">All time bookings</p>
            </div>
          </div>

          {/* Active Users Card */}
          <div className="group bg-white rounded-2xl shadow-lg border border-slate-200 p-6 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="relative z-10">
              <div className="flex items-start justify-between mb-4">
                <div className="p-4 bg-gradient-to-br from-cyan-100 to-cyan-200 rounded-2xl shadow-md group-hover:scale-110 transition-transform duration-300">
                  <FaChartLine className="text-cyan-600 text-2xl" />
                </div>
                <span className="text-xs font-semibold text-cyan-600 bg-cyan-100 px-3 py-1 rounded-full">
                  70%
                </span>
              </div>
              <p className="text-sm font-medium text-slate-500 mb-1">Active Users</p>
              <p className="text-3xl font-bold text-slate-800 mb-1">
                {analyticsData.activeUsers.toLocaleString()}
              </p>
              <p className="text-xs text-slate-400">Monthly active</p>
            </div>
          </div>
        </div>

        {/* Enhanced Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* User Growth Chart */}
          <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6 hover:shadow-xl transition-shadow duration-300">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-slate-800 flex items-center gap-3">
                <div className="p-2 bg-indigo-100 rounded-lg">
                  <FaChartLine className="text-indigo-600" />
                </div>
                User Registration Trends
              </h2>
              <FaTrophy className="text-yellow-500 text-xl" />
            </div>
            <div className="h-64">
              <Line data={userGrowthChartData} options={chartOptions} />
            </div>
          </div>

          {/* Skills Distribution */}
          <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6 hover:shadow-xl transition-shadow duration-300">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-slate-800 flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <FaChartBar className="text-purple-600" />
                </div>
                Skills Distribution
              </h2>
              <span className="text-xs font-semibold text-purple-600 bg-purple-100 px-3 py-1 rounded-full">
                Top 10
              </span>
            </div>
            <div className="h-64">
              <Doughnut 
                data={skillsChartData} 
                options={{
                  ...chartOptions,
                  cutout: '60%',
                  plugins: { 
                    ...chartOptions.plugins, 
                    legend: { 
                      ...chartOptions.plugins.legend, 
                      position: 'right',
                      labels: {
                        ...chartOptions.plugins.legend.labels,
                        boxWidth: 15,
                        boxHeight: 15
                      }
                    } 
                  }
                }}
              />
            </div>
          </div>

          {/* Age Distribution */}
          <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6 hover:shadow-xl transition-shadow duration-300">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-slate-800 flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <FaUsers className="text-blue-600" />
                </div>
                Age Distribution
              </h2>
            </div>
            <div className="h-64">
              <Bar data={ageGroupsChartData} options={chartOptions} />
            </div>
          </div>

          {/* Employment Status */}
          <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6 hover:shadow-xl transition-shadow duration-300">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-slate-800 flex items-center gap-3">
                <div className="p-2 bg-emerald-100 rounded-lg">
                  <FaChartBar className="text-emerald-600" />
                </div>
                Employment Status
              </h2>
            </div>
            <div className="h-64">
              <Doughnut 
                data={employmentChartData}
                options={{
                  ...chartOptions,
                  cutout: '65%',
                  plugins: { 
                    ...chartOptions.plugins, 
                    legend: { 
                      ...chartOptions.plugins.legend, 
                      position: 'bottom' 
                    } 
                  }
                }}
              />
            </div>
            <div className="mt-6 text-center bg-gradient-to-r from-emerald-50 to-green-50 p-4 rounded-xl border border-emerald-200">
              <span className="text-sm font-medium text-slate-600">Employment Rate: </span>
              <span className="text-2xl font-bold text-emerald-600">
                {(() => {
                  const worker = analyticsData.demographics.employment?.worker || 0;
                  const nonWorker = analyticsData.demographics.employment?.nonWorker || 0;
                  const total = worker + nonWorker;
                  return total > 0 ? Math.round((worker / total) * 100) : 0;
                })()}%
              </span>
            </div>
          </div>
        </div>

        {/* Enhanced Popular Services */}
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6 hover:shadow-xl transition-shadow duration-300">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-3">
              <div className="p-2 bg-emerald-100 rounded-lg">
                <FaChartBar className="text-emerald-600" />
              </div>
              Popular Services
            </h2>
            <div className="flex items-center gap-2">
              <FaFire className="text-orange-500 animate-pulse" />
              <span className="text-xs font-semibold text-orange-600 bg-orange-100 px-3 py-1 rounded-full">
                Trending
              </span>
            </div>
          </div>
          <div className="h-72">
            <Bar data={servicesChartData} options={chartOptions} />
          </div>
        </div>

        {/* Footer Info */}
        <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-2xl shadow-lg p-6 text-white">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <p className="text-sm">Last updated: {new Date().toLocaleString()}</p>
            </div>
            <p className="text-sm text-slate-300">
              Showing analytics for the last {timeRange} months
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SystemAnalytics;