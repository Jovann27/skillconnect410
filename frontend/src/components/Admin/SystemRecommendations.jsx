import { useState, useEffect } from "react";
import { 
  FaLightbulb, 
  FaTools, 
  FaUsers, 
  FaChartLine, 
  FaSync, 
  FaGraduationCap, 
  FaBuilding,
  FaCheckCircle,
  FaExclamationTriangle,
  FaClock,
  FaStar,
  FaRocket,
  FaArrowRight
} from "react-icons/fa";
import api from "../../api";
import toast from "react-hot-toast";

const SystemRecommendations = () => {
  const [analyticsData, setAnalyticsData] = useState({
    totals: { totalUsers: 0, serviceProviders: 0 },
    demographics: { ageGroups: {}, employment: {} },
    skills: {},
    totalsOverTime: { labels: [], values: [] },
    activeUsers: 0,
    totalBookings: 0,
    popularServices: []
  });

  const [recommendations, setRecommendations] = useState({
    barangayProjects: [],
    skillsTraining: [],
    communityPrograms: [],
    priorityActions: []
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [timeRange, setTimeRange] = useState("12");

  useEffect(() => { fetchAnalyticsData(); }, [timeRange]);

  const generateRuleBasedRecommendations = (data) => {
    const totalBookings = data.totalBookings || 0;
    const unemployed = data.demographics?.employment?.nonWorker || 0;
    const employed = data.demographics?.employment?.worker || 0;
    const employmentRate = employed + unemployed > 0 ? (employed / (employed + unemployed)) * 100 : 0;
    const growthRate = data.totalsOverTime?.values?.length > 1 ? ((data.totalsOverTime.values[data.totalsOverTime.values.length - 1] - data.totalsOverTime.values[data.totalsOverTime.values.length - 2]) / Math.max(data.totalsOverTime.values[data.totalsOverTime.values.length - 2], 1)) * 100 : 0;
    const skillsCount = Object.keys(data.skills || {}).length;
    const popularService = data.popularServices?.[0]?.service || 'General Services';
    const popularServiceBookings = data.popularServices?.[0]?.count || 0;
    const totalYouth = data.demographics?.ageGroups?.['18-35']?.total || 0;

    return {
      barangayProjects: [
        { title: "Community Skills Training Space", description: "Renovate existing barangay building for skills training", priority: totalBookings > 100 ? "High" : "Medium", impact: "Low-cost training venue", rationale: `Community has ${totalBookings} requests across ${skillsCount} skill areas.`, estimatedCost: "₱50K - ₱150K", timeline: "1-2 months", confidence: 0.8 },
        { title: "Community Job Matching Program", description: "Designate staff to coordinate job placement", priority: employmentRate < 70 ? "High" : "Medium", impact: "Reduce unemployment", rationale: `${unemployed} residents unemployed (${employmentRate.toFixed(1)}% rate).`, estimatedCost: "₱5K", timeline: "1 month", confidence: 0.85 },
        { title: "Community Digital Literacy Sessions", description: "Monthly free training on online platforms", priority: growthRate > 15 ? "Medium" : "Low", impact: "Increases platform adoption", rationale: `Platform growing ${growthRate.toFixed(1)}%/month.`, estimatedCost: "₱500-1K/month", timeline: "Immediate", confidence: 0.75 }
      ],
      skillsTraining: [
        { title: `${popularService} Short Course`, description: `2-month weekend training for ${popularService}`, targetAudience: "Future service providers", duration: "2 months (8 sessions)", expectedParticipants: Math.min(20, Math.floor(popularServiceBookings / 8)), priority: popularServiceBookings > 50 ? "High" : "Medium", skills: [popularService], rationale: `MARKET DEMAND: ${popularService} = ${popularServiceBookings} bookings.`, confidence: 0.8 },
        { title: "Monthly Rotating Skills Training", description: "Different high-demand skills monthly", targetAudience: "Unemployed adults", duration: "2 months per skill", expectedParticipants: Math.max(30, Math.floor(unemployed * 0.2)), priority: skillsCount < 10 ? "High" : "Medium", skills: ["Construction", "Electrical", "Plumbing"], rationale: `Only ${skillsCount} skill areas. Expanding diversity.`, confidence: 0.85 }
      ],
      communityPrograms: [
        { title: "Youth Skills Apprenticeship", description: "Local providers mentor young people", targetGroup: "Ages 16-30", focus: "Job placement through learning", duration: "2 months", rationale: `Pair ${totalYouth} young people with providers.`, confidence: 0.75 },
        { title: "Monthly Skills Marketplace", description: "Free monthly gathering for providers", targetGroup: "All residents", focus: "Direct connections", duration: "Monthly events", rationale: `Generate ${Math.ceil(totalBookings * 0.3)} new bookings/month.`, confidence: 0.8 },
        { title: "Inclusive Skills Training", description: "Free training for women and PWD", targetGroup: "Women, PWD", focus: "Equal opportunity", duration: "2-month courses", rationale: `Help ${Math.ceil(unemployed * 0.15)} residents annually.`, confidence: 0.7 }
      ],
      priorityActions: [
        { action: "Launch Quick Job Matching", description: `Match ${Math.ceil(unemployed * 0.3)} jobless residents`, timeline: "Within 7 days", responsible: "Employment Officer", priority: employmentRate < 50 ? "Critical" : "High", rationale: `Quick-win for ${Math.round(employmentRate)}% employment crisis.`, confidence: 0.9 },
        { action: "Community Skills Survey", description: "Identify top 3 high-demand skills", timeline: "Within 21 days", responsible: "Development Team", priority: "High", rationale: "Identifies priorities before training.", confidence: 0.8 },
        { action: "Secure Training Partners", description: `Find ${popularService} providers to teach`, timeline: "Within 30 days", responsible: "Business Coordinator", priority: "Medium", rationale: "Sustainable model using local expertise.", confidence: 0.75 }
      ]
    };
  };

  const fetchAnalyticsData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [totalsRes, demographicsRes, skillsRes, mostBookedRes, totalsOverTimeRes] = await Promise.all([
        api.get("/reports/totals"), api.get("/reports/demographics"), api.get("/reports/skills"),
        api.get("/reports/most-booked-services"), api.get(`/reports/totals-over-time?months=${timeRange}`)
      ]);

      const totalsData = totalsRes.data?.data || {};
      const demographicsData = demographicsRes.data?.data || {};
      const skillsData = skillsRes.data?.data || {};
      const mostBookedData = mostBookedRes.data?.data || {};
      const totalsOverTimeData = totalsOverTimeRes.data?.data || { labels: [], values: [] };

      const totalBookings = typeof mostBookedData === 'object' ? Object.values(mostBookedData).filter(v => typeof v === 'number').reduce((a, b) => a + b, 0) : 0;
      const popularServices = typeof mostBookedData === 'object' ? Object.entries(mostBookedData).filter(([, c]) => typeof c === 'number').map(([s, c]) => ({ service: s, count: c })).sort((a, b) => b.count - a.count).slice(0, 10) : [];

      const newData = { totals: totalsData, demographics: demographicsData, skills: skillsData, totalsOverTime: totalsOverTimeData, activeUsers: Math.floor((totalsData?.totalUsers || 0) * 0.7), totalBookings, popularServices };
      setAnalyticsData(newData);
      setRecommendations(generateRuleBasedRecommendations(newData));
      toast.success("Recommendations generated!");
    } catch (err) {
      setError(err.response?.data?.message || err.message);
      toast.error("Failed to load recommendations");
    } finally { setLoading(false); }
  };

  const getEmploymentRate = () => { 
    const w = analyticsData.demographics.employment?.worker || 0; 
    const n = analyticsData.demographics.employment?.nonWorker || 0; 
    const t = w + n; 
    return t > 0 ? Math.round((w / t) * 100) : 0; 
  };
  
  const getMonthlyGrowth = () => { 
    const v = analyticsData.totalsOverTime.values; 
    return v.length > 0 ? v[v.length - 1] : 0; 
  };
  
  const getPriorityColor = (p) => {
    const colors = {
      Critical: 'from-red-50 to-red-100 border-red-300 hover:border-red-400',
      High: 'from-amber-50 to-amber-100 border-amber-300 hover:border-amber-400',
      Medium: 'from-blue-50 to-blue-100 border-blue-300 hover:border-blue-400',
      Low: 'from-slate-50 to-slate-100 border-slate-300 hover:border-slate-400'
    };
    return colors[p] || colors.Low;
  };

  const getPriorityIcon = (p) => {
    const icons = {
      Critical: <FaExclamationTriangle className="text-red-600" />,
      High: <FaRocket className="text-amber-600" />,
      Medium: <FaCheckCircle className="text-blue-600" />,
      Low: <FaClock className="text-slate-600" />
    };
    return icons[p] || icons.Low;
  };

  if (loading) return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-orange-50 flex items-center justify-center">
      <div className="text-center">
        <div className="relative inline-block">
          <div className="w-24 h-24 border-4 border-amber-200 rounded-full"></div>
          <div className="absolute top-0 left-0 w-24 h-24 border-4 border-amber-600 rounded-full border-t-transparent animate-spin"></div>
        </div>
        <div className="mt-8 space-y-2">
          <p className="text-slate-800 font-semibold text-xl">Generating Recommendations</p>
          <p className="text-slate-500 text-sm">Analyzing data and creating insights</p>
        </div>
      </div>
    </div>
  );

  if (error) return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-orange-50 flex items-center justify-center p-4">
      <div className="max-w-md bg-white rounded-3xl shadow-2xl p-8 text-center border border-red-100">
        <div className="w-20 h-20 bg-gradient-to-br from-red-100 to-red-200 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
          <FaExclamationTriangle className="text-red-600 text-3xl" />
        </div>
        <h2 className="text-2xl font-bold text-slate-800 mb-3">Error Loading Data</h2>
        <p className="text-slate-600 mb-8 leading-relaxed">{error}</p>
        <button 
          onClick={fetchAnalyticsData} 
          className="w-full bg-gradient-to-r from-amber-600 to-orange-600 text-white py-3 px-6 rounded-xl hover:from-amber-700 hover:to-orange-700 transition-all duration-300 flex items-center justify-center gap-2 font-medium shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
        >
          <FaSync />
          Retry
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-amber-50 to-orange-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Enhanced Header with Gradient */}
        <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 rounded-3xl shadow-2xl p-8 text-white relative overflow-hidden">
          <div className="absolute inset-0 bg-black opacity-10"></div>
          <div className="absolute -right-10 -top-10 w-40 h-40 bg-white opacity-10 rounded-full blur-3xl"></div>
          <div className="absolute -left-10 -bottom-10 w-40 h-40 bg-white opacity-10 rounded-full blur-3xl"></div>
          
          <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
            <div className="space-y-2">
              <h1 className="text-3xl sm:text-4xl font-bold flex items-center gap-3">
                <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-sm">
                  <FaLightbulb className="text-2xl" />
                </div>
                System Recommendations
              </h1>
              <p className="text-amber-100 text-lg">System insights for community development</p>
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
                className="px-5 py-3 bg-white text-amber-600 rounded-xl hover:bg-amber-50 transition-all duration-300 flex items-center gap-2 font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              >
                <FaSync className="text-sm" />
                Refresh
              </button>
            </div>
          </div>
        </div>

        {/* Enhanced Metrics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="group bg-white rounded-2xl shadow-lg border border-slate-200 p-6 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
            <div className="flex items-start justify-between mb-4">
              <div className="p-4 bg-gradient-to-br from-emerald-100 to-emerald-200 rounded-2xl shadow-md group-hover:scale-110 transition-transform duration-300">
                <FaChartLine className="text-emerald-600 text-2xl" />
              </div>
              <span className="text-xs font-semibold text-emerald-600 bg-emerald-100 px-3 py-1 rounded-full">
                {getEmploymentRate() >= 70 ? 'Good' : 'Needs Focus'}
              </span>
            </div>
            <p className="text-sm font-medium text-slate-500 mb-1">Employment Rate</p>
            <p className="text-3xl font-bold text-slate-800 mb-1">{getEmploymentRate()}%</p>
            <p className="text-xs text-slate-400">Current workforce status</p>
          </div>

          <div className="group bg-white rounded-2xl shadow-lg border border-slate-200 p-6 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
            <div className="flex items-start justify-between mb-4">
              <div className="p-4 bg-gradient-to-br from-amber-100 to-amber-200 rounded-2xl shadow-md group-hover:scale-110 transition-transform duration-300">
                <FaTools className="text-amber-600 text-2xl" />
              </div>
              <FaStar className="text-amber-500 text-xl" />
            </div>
            <p className="text-sm font-medium text-slate-500 mb-1">Top Service Bookings</p>
            <p className="text-3xl font-bold text-slate-800 mb-1">{analyticsData.popularServices[0]?.count || 0}</p>
            <p className="text-xs text-slate-400">{analyticsData.popularServices[0]?.service || 'N/A'}</p>
          </div>

          <div className="group bg-white rounded-2xl shadow-lg border border-slate-200 p-6 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
            <div className="flex items-start justify-between mb-4">
              <div className="p-4 bg-gradient-to-br from-indigo-100 to-indigo-200 rounded-2xl shadow-md group-hover:scale-110 transition-transform duration-300">
                <FaUsers className="text-indigo-600 text-2xl" />
              </div>
              <span className="text-xs font-semibold text-indigo-600 bg-indigo-100 px-3 py-1 rounded-full">
                +{getMonthlyGrowth()}
              </span>
            </div>
            <p className="text-sm font-medium text-slate-500 mb-1">Monthly Growth</p>
            <p className="text-3xl font-bold text-slate-800 mb-1">{getMonthlyGrowth()}</p>
            <p className="text-xs text-slate-400">New users this month</p>
          </div>

          <div className="group bg-white rounded-2xl shadow-lg border border-slate-200 p-6 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
            <div className="flex items-start justify-between mb-4">
              <div className="p-4 bg-gradient-to-br from-cyan-100 to-cyan-200 rounded-2xl shadow-md group-hover:scale-110 transition-transform duration-300">
                <FaGraduationCap className="text-cyan-600 text-2xl" />
              </div>
            </div>
            <p className="text-sm font-medium text-slate-500 mb-1">Skills Diversity</p>
            <p className="text-3xl font-bold text-slate-800 mb-1">{Object.keys(analyticsData.skills).length}</p>
            <p className="text-xs text-slate-400">Different skill types</p>
          </div>
        </div>

        {/* Priority Actions - Featured Section */}
        <div className="bg-gradient-to-br from-red-50 to-orange-50 rounded-3xl shadow-xl border-2 border-red-200 p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-red-600 rounded-2xl shadow-lg">
              <FaRocket className="text-white text-2xl" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-800">Priority Actions</h2>
              <p className="text-slate-600 text-sm">Immediate steps for maximum impact</p>
            </div>
          </div>
          
          <div className="space-y-4">
            {recommendations.priorityActions.map((p, i) => (
              <div key={i} className={`group bg-gradient-to-r ${getPriorityColor(p.priority)} rounded-2xl border-2 p-6 transition-all duration-300 hover:shadow-xl transform hover:-translate-y-1`}>
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start gap-4 flex-1">
                    <div className="p-3 bg-white rounded-xl shadow-md group-hover:scale-110 transition-transform duration-300">
                      {getPriorityIcon(p.priority)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-bold text-slate-800">{p.action}</h3>
                        <span className="text-xs font-bold bg-white px-3 py-1 rounded-full shadow-sm">
                          {p.priority}
                        </span>
                      </div>
                      <p className="text-sm text-slate-700 mb-3">{p.description}</p>
                      <div className="flex flex-wrap gap-4 text-xs text-slate-600">
                        <div className="flex items-center gap-2 bg-white px-3 py-1 rounded-lg shadow-sm">
                          <FaClock className="text-slate-500" />
                          <span><strong>Timeline:</strong> {p.timeline}</span>
                        </div>
                        <div className="flex items-center gap-2 bg-white px-3 py-1 rounded-lg shadow-sm">
                          <FaUsers className="text-slate-500" />
                          <span><strong>Owner:</strong> {p.responsible}</span>
                        </div>
                        <div className="flex items-center gap-2 bg-white px-3 py-1 rounded-lg shadow-sm">
                          <FaStar className="text-yellow-500" />
                          <span><strong>Confidence:</strong> {Math.round(p.confidence * 100)}%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <FaArrowRight className="text-slate-400 group-hover:text-slate-600 group-hover:translate-x-1 transition-all duration-300" />
                </div>
                <div className="bg-white/60 rounded-xl p-3 text-xs text-slate-600 italic">
                  <strong>Rationale:</strong> {p.rationale}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Barangay Projects */}
        <div className="bg-white rounded-3xl shadow-xl border border-slate-200 p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-indigo-600 rounded-2xl shadow-lg">
              <FaBuilding className="text-white text-2xl" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-800">Recommended Barangay Projects</h2>
              <p className="text-slate-600 text-sm">Infrastructure and program investments</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {recommendations.barangayProjects.map((p, i) => (
              <div key={i} className={`group bg-gradient-to-br ${getPriorityColor(p.priority)} rounded-2xl border-2 p-6 transition-all duration-300 hover:shadow-xl transform hover:-translate-y-1`}>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-bold bg-white px-3 py-2 rounded-full shadow-sm flex items-center gap-2">
                    {getPriorityIcon(p.priority)}
                    {p.priority}
                  </span>
                  <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-md text-slate-700 font-bold">
                    {i + 1}
                  </div>
                </div>
                
                <h3 className="text-lg font-bold text-slate-800 mb-2">{p.title}</h3>
                <p className="text-sm text-slate-700 mb-4">{p.description}</p>
                
                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2 text-xs text-slate-600 bg-white/60 px-3 py-2 rounded-lg">
                    <FaChartLine className="text-indigo-500" />
                    <span><strong>Impact:</strong> {p.impact}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-600 bg-white/60 px-3 py-2 rounded-lg">
                    <FaTools className="text-amber-500" />
                    <span><strong>Cost:</strong> {p.estimatedCost}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-600 bg-white/60 px-3 py-2 rounded-lg">
                    <FaClock className="text-emerald-500" />
                    <span><strong>Timeline:</strong> {p.timeline}</span>
                  </div>
                </div>
                
                <div className="bg-white rounded-xl p-3 text-xs text-slate-600 italic">
                  {p.rationale}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Skills Training */}
        <div className="bg-white rounded-3xl shadow-xl border border-slate-200 p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-emerald-600 rounded-2xl shadow-lg">
              <FaGraduationCap className="text-white text-2xl" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-800">Skills Training Programs</h2>
              <p className="text-slate-600 text-sm">Capacity building initiatives</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {recommendations.skillsTraining.map((p, i) => (
              <div key={i} className={`group bg-gradient-to-br ${getPriorityColor(p.priority)} rounded-2xl border-2 p-6 transition-all duration-300 hover:shadow-xl transform hover:-translate-y-1`}>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-bold bg-white px-3 py-2 rounded-full shadow-sm flex items-center gap-2">
                    {getPriorityIcon(p.priority)}
                    {p.priority}
                  </span>
                  <FaStar className="text-yellow-500 text-xl" />
                </div>
                
                <h3 className="text-lg font-bold text-slate-800 mb-2">{p.title}</h3>
                <p className="text-sm text-slate-700 mb-4">{p.description}</p>
                
                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2 text-xs text-slate-600 bg-white/60 px-3 py-2 rounded-lg">
                    <FaUsers className="text-indigo-500" />
                    <span><strong>Target:</strong> {p.targetAudience}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-600 bg-white/60 px-3 py-2 rounded-lg">
                    <FaClock className="text-amber-500" />
                    <span><strong>Duration:</strong> {p.duration}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-600 bg-white/60 px-3 py-2 rounded-lg">
                    <FaGraduationCap className="text-emerald-500" />
                    <span><strong>Participants:</strong> {p.expectedParticipants}</span>
                  </div>
                </div>
                
                <div className="bg-white rounded-xl p-3 text-xs text-slate-600 italic">
                  {p.rationale}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Community Programs */}
        <div className="bg-white rounded-3xl shadow-xl border border-slate-200 p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-amber-600 rounded-2xl shadow-lg">
              <FaUsers className="text-white text-2xl" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-800">Community Programs</h2>
              <p className="text-slate-600 text-sm">Engagement and inclusion initiatives</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {recommendations.communityPrograms.map((p, i) => (
              <div key={i} className="group bg-gradient-to-br from-emerald-50 to-green-50 rounded-2xl border-2 border-emerald-300 hover:border-emerald-400 p-6 transition-all duration-300 hover:shadow-xl transform hover:-translate-y-1">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-white rounded-xl shadow-md group-hover:scale-110 transition-transform duration-300">
                    <FaCheckCircle className="text-emerald-600 text-xl" />
                  </div>
                  <div className="w-8 h-8 bg-emerald-600 text-white rounded-lg flex items-center justify-center shadow-md font-bold">
                    {i + 1}
                  </div>
                </div>
                
                <h3 className="text-lg font-bold text-slate-800 mb-2">{p.title}</h3>
                <p className="text-sm text-slate-700 mb-4">{p.description}</p>
                
                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2 text-xs text-slate-600 bg-white px-3 py-2 rounded-lg shadow-sm">
                    <FaUsers className="text-emerald-500" />
                    <span><strong>Target:</strong> {p.targetGroup}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-600 bg-white px-3 py-2 rounded-lg shadow-sm">
                    <FaChartLine className="text-emerald-500" />
                    <span><strong>Focus:</strong> {p.focus}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-600 bg-white px-3 py-2 rounded-lg shadow-sm">
                    <FaClock className="text-emerald-500" />
                    <span><strong>Duration:</strong> {p.duration}</span>
                  </div>
                </div>
                
                <div className="bg-white rounded-xl p-3 text-xs text-slate-600 italic">
                  {p.rationale}
                </div>
              </div>
            ))}
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
              Recommendations based on {timeRange} months of data analysis
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SystemRecommendations;