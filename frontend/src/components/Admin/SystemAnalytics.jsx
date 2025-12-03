import { useState, useEffect, useRef } from "react";
import {
  FaChartBar,
  FaUsers,
  FaTools,
  FaCalendarAlt,
  FaDownload,
  FaSync,
} from "react-icons/fa";
import './SystemAnalytics.css';
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
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';
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
    // Core metrics from database
    totals: { totalUsers: 0, serviceProviders: 0, totalPopulation: 0 },
    demographics: { ageGroups: {}, employment: {} },
    skills: {},
    skilledPerTrade: { byRole: {}, bySkill: {} },
    mostBookedServices: {},
    totalsOverTime: { labels: [], values: [] },

    // Calculated insights
    activeUsers: 0,
    totalBookings: 0,
    popularServices: []
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [timeRange, setTimeRange] = useState("12"); // months for time series

  // Refs for chart capture
  const userGrowthChartRef = useRef(null);
  const ageGroupsChartRef = useRef(null);
  const employmentChartRef = useRef(null);
  const skillsChartRef = useRef(null);
  const servicesChartRef = useRef(null);
  const providerChartRef = useRef(null);

  const generateUserGrowthInsights = (analyticsData, timeRange) => {
    const values = analyticsData.totalsOverTime.values;
    if (values.length < 2) return "Insufficient data for trend analysis.";

    const latest = values[values.length - 1];
    const previous = values[values.length - 2];
    const growth = previous > 0 ? ((latest - previous) / previous * 100).toFixed(1) : 0;
    const totalGrowth = values.length > 1 ? ((latest - values[0]) / (values[0] || 1) * 100).toFixed(1) : 0;
    const avgMonthly = values.reduce((a, b) => a + b, 0) / values.length;

    return `User registration shows ${growth >= 0 ? 'positive' : 'negative'} momentum with ${Math.abs(growth)}% ${growth >= 0 ? 'growth' : 'decline'} from last month. Overall ${totalGrowth}% increase over ${timeRange} months. Average monthly registrations: ${Math.round(avgMonthly)}.`; // timeRange is used in template
  };

  const generateAgeInsights = (analyticsData) => {
    const ageGroups = analyticsData.demographics.ageGroups || {};
    if (Object.keys(ageGroups).length === 0) return "No age distribution data available.";

    const entries = Object.entries(ageGroups).sort((a, b) => b[1] - a[1]);
    const dominant = entries[0];
    const total = Object.values(ageGroups).reduce((a, b) => a + b, 0);
    const dominantPercent = ((dominant[1] / total) * 100).toFixed(1);

    return `The ${dominant[0]} age group dominates with ${dominantPercent}% of users (${dominant[1]} users). This suggests the platform primarily serves ${dominant[0].includes('18-25') || dominant[0].includes('26-35') ? 'young adults' : dominant[0].includes('36-45') ? 'middle-aged adults' : 'mature adults'}.`;
  };

  const generateEmploymentInsights = (analyticsData) => {
    const employment = analyticsData.demographics.employment;
    if (!employment) return "Employment data not available.";

    const total = (employment.worker || 0) + (employment.nonWorker || 0);
    if (total === 0) return "No employment data available.";

    const employedPercent = ((employment.worker / total) * 100).toFixed(1);
    const unemployedPercent = ((employment.nonWorker / total) * 100).toFixed(1);

    return `Employment rate stands at ${employedPercent}% (${employment.worker} employed users) vs ${unemployedPercent}% unemployed (${employment.nonWorker} users). ${employedPercent > 50 ? 'Majority of users are employed, indicating strong workforce participation.' : 'Significant portion of users are unemployed, suggesting potential for skill development programs.'}`;
  };

  const generateSkillsInsights = (analyticsData) => {
    const skills = analyticsData.skills;
    if (Object.keys(skills).length === 0) return "No skills data available.";

    const entries = Object.entries(skills).sort((a, b) => b[1] - a[1]);
    const topSkill = entries[0];
    const total = Object.values(skills).reduce((a, b) => a + b, 0);
    const topPercent = ((topSkill[1] / total) * 100).toFixed(1);
    const diversity = entries.length;

    return `"${topSkill[0]}" is the most common skill with ${topPercent}% adoption (${topSkill[1]} users). Platform offers ${diversity} different skills, indicating ${diversity > 10 ? 'good' : 'moderate'} skill diversity. ${topPercent > 30 ? 'High concentration in top skill suggests specialization opportunity.' : 'Well-distributed skills show broad service coverage.'}`;
  };

  const generateServicesInsights = (analyticsData) => {
    if (analyticsData.popularServices.length === 0) return "No service booking data available.";

    const topService = analyticsData.popularServices[0];
    const totalBookings = analyticsData.totalBookings;
    const topPercent = ((topService.count / totalBookings) * 100).toFixed(1);

    return `"${topService.service}" leads service bookings with ${topPercent}% market share (${topService.count} bookings). Total platform bookings: ${totalBookings}. ${topPercent > 40 ? 'High demand concentration suggests specialization in popular services.' : 'Well-distributed demand indicates diverse service needs.'}`;
  };

  const generateProviderInsights = (analyticsData) => {
    const roles = analyticsData.skilledPerTrade.byRole || {};
    if (Object.keys(roles).length === 0) return "No provider role data available.";

    const entries = Object.entries(roles).sort((a, b) => b[1] - a[1]);
    const topRole = entries[0];
    const total = Object.values(roles).reduce((a, b) => a + b, 0);
    const topPercent = ((topRole[1] / total) * 100).toFixed(1);

    return `"${topRole[0]}" is the most represented role with ${topPercent}% of providers (${topRole[1]} providers). Network includes ${entries.length} different roles. ${topPercent > 30 ? 'Specialized provider network with strong focus on key trades.' : 'Diverse provider network covering multiple service categories.'}`;
  };

  const generateOverallSummary = (analyticsData, timeRange) => {
    const ageInsights = generateAgeInsights(analyticsData);
    const providerInsights = generateProviderInsights(analyticsData);

    // Extract key metrics for summary
    const totalUsers = analyticsData.totals.totalUsers || 0;
    const totalProviders = analyticsData.totals.serviceProviders || 0;
    const totalBookings = analyticsData.totalBookings;
    const activeUsers = analyticsData.activeUsers;

    // Calculate growth rate
    const values = analyticsData.totalsOverTime.values;
    const growthRate = values.length > 1 ? Math.round(((values[values.length - 1] - values[values.length - 2]) / (values[values.length - 2] || 1)) * 100) : 0;

    // Employment rate
    const employment = analyticsData.demographics.employment;
    const employmentRate = employment?.worker && employment?.nonWorker ?
      Math.round((employment.worker / (employment.worker + employment.nonWorker)) * 100) : 0;

    // Top skill and service
    const topSkill = Object.entries(analyticsData.skills).sort((a, b) => b[1] - a[1])[0];
    const topService = analyticsData.popularServices[0];

    return `SkillConnect platform demonstrates robust performance with ${totalUsers.toLocaleString()} total users and ${totalProviders.toLocaleString()} service providers, achieving ${totalBookings.toLocaleString()} service bookings. The platform shows ${growthRate >= 0 ? 'positive' : 'challenging'} growth momentum with a ${Math.abs(growthRate)}% ${growthRate >= 0 ? 'increase' : 'decrease'} in user registrations, maintaining ${activeUsers.toLocaleString()} active users. User demographics reveal a ${employmentRate}% employment rate, with the platform primarily serving ${ageInsights.includes('young adults') ? 'young professionals' : ageInsights.includes('middle-aged') ? 'established adults' : 'diverse age groups'}. The skills ecosystem features "${topSkill?.[0] || 'various skills'}" as the most demanded skill, complemented by "${topService?.service || 'popular services'}" leading service bookings. The provider network shows ${providerInsights.includes('Specialized') ? 'strong specialization' : 'good diversity'} across ${Object.keys(analyticsData.skilledPerTrade.byRole || {}).length} different roles, indicating a ${totalBookings > totalUsers * 0.5 ? 'highly engaged' : 'moderately active'} marketplace. Overall, the platform exhibits healthy growth patterns with opportunities for ${employmentRate < 50 ? 'employment-focused initiatives' : 'continued expansion'} and ${Object.keys(analyticsData.skills).length > 15 ? 'diverse skill development' : 'targeted skill enhancement'}.`;
  };


  useEffect(() => {
    fetchAnalyticsData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
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

      // Extract data from response (backend returns { success: true, data: {...} })
      const totalsData = totalsRes.data?.data || totalsRes.data || {};
      const demographicsData = demographicsRes.data?.data || demographicsRes.data || {};
      const skillsData = skillsRes.data?.data || skillsRes.data || {};
      const skilledPerTradeData = skilledPerTradeRes.data?.data || skilledPerTradeRes.data || {};
      const mostBookedData = mostBookedRes.data?.data || mostBookedRes.data || {};
      const totalsOverTimeData = totalsOverTimeRes.data?.data || totalsOverTimeRes.data || { labels: [], values: [] };

      // Ensure totalBookings is always a number
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

        // Calculated fields
        activeUsers: (() => {
          const totalUsers = totalsData?.totalUsers;
          if (typeof totalUsers === 'number' && !isNaN(totalUsers) && totalUsers > 0) {
            return Math.floor(totalUsers * 0.7);
          }
          return 0;
        })(), // Assume 70% active
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
      
      // Check for connection errors
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



  const handleExportReport = async () => {
    try {
      toast.loading("Generating PDF report...");

      // Register required chart components
      ChartJS.register(
        CategoryScale,
        LinearScale,
        BarElement,
        LineElement,
        PointElement,
        ArcElement,
        Title,
        Tooltip,
        Legend
      );

      // Create PDF document
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 20;
      let yPosition = margin;

      // Helper function to add text with word wrapping
      const addWrappedText = (text, x, y, maxWidth, fontSize = 11) => {
        pdf.setFontSize(fontSize);
        const lines = pdf.splitTextToSize(text, maxWidth);
        pdf.text(lines, x, y);
        return y + (lines.length * fontSize * 0.4);
      };

      // Helper function to check if we need a new page
      const checkNewPage = (requiredHeight) => {
        if (yPosition + requiredHeight > pageHeight - margin) {
          pdf.addPage();
          yPosition = margin;
          return true;
        }
        return false;
      };

      // Title Page
      pdf.setFontSize(24);
      pdf.setFont('helvetica', 'bold');
      pdf.text('System Analytics Report', pageWidth / 2, yPosition, { align: 'center' });

      yPosition += 15;
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Generated on ${new Date().toLocaleDateString()}`, pageWidth / 2, yPosition, { align: 'center' });

      yPosition += 10;
      pdf.text(`Report Period: Last ${timeRange} months`, pageWidth / 2, yPosition, { align: 'center' });

      // Introduction Section
      pdf.addPage();
      yPosition = margin;

      pdf.setFontSize(18);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Executive Summary', margin, yPosition);
      yPosition += 15;

      const introduction = `This comprehensive analytics report provides detailed insights into the SkillConnect platform's performance and user engagement metrics. The report covers key performance indicators, user demographics, skill distribution, and service utilization patterns over the past ${timeRange} months.

Key highlights include:
• Total registered users: ${analyticsData.totals.totalUsers?.toLocaleString() || 0}
• Active service providers: ${analyticsData.totals.serviceProviders?.toLocaleString() || 0}
• Total service bookings: ${analyticsData.totalBookings.toLocaleString()}
• Platform growth rate: ${analyticsData.totalsOverTime.values.length > 1 ? Math.round(((analyticsData.totalsOverTime.values[analyticsData.totalsOverTime.values.length - 1] - analyticsData.totalsOverTime.values[analyticsData.totalsOverTime.values.length - 2]) / (analyticsData.totalsOverTime.values[analyticsData.totalsOverTime.values.length - 2] || 1)) * 100) : 0}%

The following sections provide detailed analysis and visualizations of these metrics.`;

      yPosition = addWrappedText(introduction, margin, yPosition, pageWidth - 2 * margin);

      // Platform Overview Table
      checkNewPage(80);
      yPosition += 10;

      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Platform Overview', margin, yPosition);
      yPosition += 10;

      const overviewData = [
        ['Metric', 'Value', 'Description'],
        ['Total Users', analyticsData.totals.totalUsers?.toLocaleString() || '0', 'Registered platform users'],
        ['Service Providers', analyticsData.totals.serviceProviders?.toLocaleString() || '0', 'Active service providers'],
        ['Total Population', analyticsData.totals.totalPopulation?.toLocaleString() || '0', 'Total population in coverage area'],
        ['Active Users', analyticsData.activeUsers.toLocaleString(), 'Estimated active users (70%)'],
        ['Total Requests', analyticsData.totalBookings.toLocaleString(), 'Completed service requests']
      ];

      autoTable(pdf, {
        startY: yPosition,
        head: [overviewData[0]],
        body: overviewData.slice(1),
        theme: 'grid',
        styles: { fontSize: 10 },
        headStyles: { fillColor: [37, 99, 235] },
        margin: { left: margin, right: margin }
      });

      yPosition = pdf.lastAutoTable.finalY + 15;

      // Demographics Section
      checkNewPage(100);
      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'bold');
      pdf.text('User Demographics Analysis', margin, yPosition);
      yPosition += 10;

      // Age Groups Table
      if (analyticsData.demographics.ageGroups && Object.keys(analyticsData.demographics.ageGroups).length > 0) {
        pdf.setFontSize(14);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Age Distribution', margin, yPosition);
        yPosition += 8;

        const ageData = [['Age Group', 'Count', 'Percentage']];
        const totalAgeUsers = Object.values(analyticsData.demographics.ageGroups).reduce((a, b) => a + b, 0);

        Object.entries(analyticsData.demographics.ageGroups).forEach(([age, count]) => {
          const percentage = totalAgeUsers > 0 ? ((count / totalAgeUsers) * 100).toFixed(1) : '0.0';
          ageData.push([age, count.toString(), `${percentage}%`]);
        });

        autoTable(pdf, {
          startY: yPosition,
          head: [ageData[0]],
          body: ageData.slice(1),
          theme: 'grid',
          styles: { fontSize: 9 },
          headStyles: { fillColor: [37, 99, 235] },
          margin: { left: margin, right: margin }
        });

        yPosition = pdf.lastAutoTable.finalY + 10;
      }

      // Employment Status
      if (analyticsData.demographics.employment) {
        checkNewPage(40);
        pdf.setFontSize(14);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Employment Status', margin, yPosition);
        yPosition += 8;

        const employmentData = [['Status', 'Count', 'Percentage']];
        const totalEmployment = (analyticsData.demographics.employment.worker || 0) + (analyticsData.demographics.employment.nonWorker || 0);

        if (analyticsData.demographics.employment.worker) {
          const percentage = totalEmployment > 0 ? ((analyticsData.demographics.employment.worker / totalEmployment) * 100).toFixed(1) : '0.0';
          employmentData.push(['Employed', analyticsData.demographics.employment.worker.toString(), `${percentage}%`]);
        }
        if (analyticsData.demographics.employment.nonWorker) {
          const percentage = totalEmployment > 0 ? ((analyticsData.demographics.employment.nonWorker / totalEmployment) * 100).toFixed(1) : '0.0';
          employmentData.push(['Unemployed', analyticsData.demographics.employment.nonWorker.toString(), `${percentage}%`]);
        }

        autoTable(pdf, {
          startY: yPosition,
          head: [employmentData[0]],
          body: employmentData.slice(1),
          theme: 'grid',
          styles: { fontSize: 9 },
          headStyles: { fillColor: [37, 99, 235] },
          margin: { left: margin, right: margin }
        });

        yPosition = pdf.lastAutoTable.finalY + 10;
      }

      // Skills Analysis
      checkNewPage(80);
      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Skills & Services Analysis', margin, yPosition);
      yPosition += 10;

      // Top Skills Table
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Top Skills Distribution', margin, yPosition);
      yPosition += 8;

      const skillsData = [['Skill', 'Users', 'Percentage']];
      const totalSkillUsers = Object.values(analyticsData.skills).reduce((a, b) => a + b, 0);

      Object.entries(analyticsData.skills).slice(0, 10).forEach(([skill, count]) => {
        const percentage = totalSkillUsers > 0 ? ((count / totalSkillUsers) * 100).toFixed(1) : '0.0';
        skillsData.push([skill, count.toString(), `${percentage}%`]);
      });

      autoTable(pdf, {
        startY: yPosition,
        head: [skillsData[0]],
        body: skillsData.slice(1),
        theme: 'grid',
        styles: { fontSize: 9 },
        headStyles: { fillColor: [37, 99, 235] },
        margin: { left: margin, right: margin }
      });

      yPosition = pdf.lastAutoTable.finalY + 10;

      // Popular Services
      checkNewPage(60);
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Popular Services', margin, yPosition);
      yPosition += 8;

      const servicesData = [['Service', 'Bookings', 'Percentage']];
      const totalBookings = analyticsData.popularServices.reduce((sum, service) => sum + service.count, 0);

      analyticsData.popularServices.slice(0, 10).forEach(({ service, count }) => {
        const percentage = totalBookings > 0 ? ((count / totalBookings) * 100).toFixed(1) : '0.0';
        servicesData.push([service, count.toString(), `${percentage}%`]);
      });

      autoTable(pdf, {
        startY: yPosition,
        head: [servicesData[0]],
        body: servicesData.slice(1),
        theme: 'grid',
        styles: { fontSize: 9 },
        headStyles: { fillColor: [37, 99, 235] },
        margin: { left: margin, right: margin }
      });

      yPosition = pdf.lastAutoTable.finalY + 15;

      // Charts Section
      pdf.addPage();
      yPosition = margin;

      pdf.setFontSize(18);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Visual Analytics', margin, yPosition);
      yPosition += 15;

      // Capture and add charts with auto-insights
      const chartRefs = [
        { ref: userGrowthChartRef, title: 'User Registration Trends', height: 80, getInsights: () => generateUserGrowthInsights(analyticsData, timeRange) },
        { ref: ageGroupsChartRef, title: 'Age Distribution', height: 60, getInsights: () => generateAgeInsights(analyticsData) },
        { ref: employmentChartRef, title: 'Employment Status', height: 60, getInsights: () => generateEmploymentInsights(analyticsData) },
        { ref: skillsChartRef, title: 'Skills Distribution', height: 80, getInsights: () => generateSkillsInsights(analyticsData) },
        { ref: servicesChartRef, title: 'Popular Services', height: 70, getInsights: () => generateServicesInsights(analyticsData) },
        { ref: providerChartRef, title: 'Service Provider Network', height: 70, getInsights: () => generateProviderInsights(analyticsData) }
      ];

      for (const chart of chartRefs) {
        if (chart.ref?.current) {
          try {
            checkNewPage(chart.height + 40); // Extra space for insights
            pdf.setFontSize(14);
            pdf.setFont('helvetica', 'bold');
            pdf.text(chart.title || 'Untitled Chart', margin, yPosition);
            yPosition += 10;

            const canvas = await html2canvas(chart.ref.current, {
              scale: 2,
              useCORS: true,
              allowTaint: true,
              backgroundColor: '#ffffff',
              ignoreElements: (el) => {
                const style = window.getComputedStyle(el);
                return style.display === 'none' || style.visibility === 'hidden';
              }
            });

            const imgData = canvas.toDataURL('image/png');
            const imgWidth = pageWidth - 2 * margin;
            const imgHeight = (canvas.height * imgWidth) / canvas.width;

            pdf.addImage(imgData, 'PNG', margin, yPosition, imgWidth, imgHeight);
            yPosition += imgHeight + 8;

            // Add auto-insights
            pdf.setFontSize(10);
            pdf.setFont('helvetica', 'italic');
            pdf.setTextColor(100, 100, 100); // Gray color for insights

            const insights = chart.getInsights ? chart.getInsights() : 'No insights available.';
            const insightsLines = pdf.splitTextToSize(`${insights}`, pageWidth - 2 * margin);

            pdf.text(insightsLines, margin, yPosition);
            yPosition += (insightsLines.length * 10 * 0.4) + 12;

            // Reset text color for next chart
            pdf.setTextColor(0, 0, 0);
          } catch (error) {
            console.error(`Chart capture failed (${chart.title}):`, error);
            yPosition += 10;
          }
        }
      }

      // Overall Summary Section
      checkNewPage(60);
      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Comprehensive Summary', margin, yPosition);
      yPosition += 12;

      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'normal');
      const overallSummary = generateOverallSummary(analyticsData, timeRange);
      const summaryLines = pdf.splitTextToSize(overallSummary, pageWidth - 2 * margin);

      pdf.text(summaryLines, margin, yPosition);
      yPosition += (summaryLines.length * 11 * 0.4) + 15;

      // Footer
      const totalPages = pdf.internal.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        pdf.setPage(i);
        pdf.setFontSize(8);
        pdf.setFont('helvetica', 'normal');
        pdf.text(`Page ${i} of ${totalPages}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
        pdf.text(`SkillConnect Analytics Report - ${new Date().toLocaleDateString()}`, margin, pageHeight - 10);
      }

      // Save the PDF
      const fileName = `skillconnect-analytics-report-${new Date().toISOString().split('T')[0]}.pdf`;
      pdf.save(fileName);

      toast.dismiss();
      toast.success("PDF report generated successfully!");

    } catch (error) {
      console.error('PDF generation failed:', error);
      toast.dismiss();
      toast.error("Failed to generate PDF report");
    }
  };

  if (loading) {
    return (
      <div className="analytics-container">
        <div className="analytics-header">
          <div>
            <h1>System Analytics</h1>
            <p className="header-description">Loading analytics data...</p>
          </div>
        </div>
        <div className="analytics-card loading-card">
          <div className="loading-wrapper">
            <div className="loader"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="analytics-container">
        <div className="analytics-header">
          <div>
            <h1>System Analytics</h1>
            <p className="header-description">Error loading analytics data</p>
          </div>
        </div>
        <div className="analytics-card error-card">
          <div className="error-message">
            <h3>⚠️ Error Loading Data</h3>
            <p>{error}</p>
            {error.includes("Cannot connect to the server") && (
              <div className="connection-help">
                <p><strong>Troubleshooting steps:</strong></p>
                <ul>
                  <li>Ensure the backend server is running on port 4000</li>
                  <li>Check if the server address (192.168.1.3:4000) is correct</li>
                  <li>Verify your network connection</li>
                  <li>Check if the API base URL in your environment variables is correct</li>
                </ul>
              </div>
            )}
            <button onClick={fetchAnalyticsData} className="retry-btn">
              <FaSync /> Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Prepare chart data
  const userGrowthChartData = {
    labels: analyticsData.totalsOverTime.labels,
    datasets: [{
      label: 'New User Registrations',
      data: analyticsData.totalsOverTime.values,
      borderColor: '#2563eb',
      backgroundColor: 'rgba(37, 99, 235, 0.1)',
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
        '#2563eb', '#16a34a', '#ca8a04', '#dc2626', '#7c3aed',
        '#ea580c', '#0891b2', '#be185d', '#4b5563', '#0f766e'
      ],
    }]
  };

  const ageGroupsChartData = {
    labels: Object.keys(analyticsData.demographics.ageGroups || {}),
    datasets: [{
      label: 'Users by Age Group',
      data: Object.values(analyticsData.demographics.ageGroups || {}),
      backgroundColor: '#2563eb',
    }]
  };

  const servicesChartData = {
    labels: analyticsData.popularServices.slice(0, 8).map(s => s.service.length > 15 ? s.service.substring(0, 15) + '...' : s.service),
    datasets: [{
      label: 'Service Bookings',
      data: analyticsData.popularServices.slice(0, 8).map(s => s.count),
      backgroundColor: '#16a34a',
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
      backgroundColor: ['#16a34a', '#dc2626'],
      borderWidth: 2,
      borderColor: '#ffffff',
    }]
  };

  return (
    <div className="analytics-container">
      <div className="analytics-header">
        <div>
          <h1>System Analytics Dashboard</h1>
          <p className="header-description">Real-time insights from database analytics</p>
        </div>
        <div className="header-actions">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="time-select"
          >
            <option value="6">📅 Last 6 months</option>
            <option value="12">📅 Last 12 months</option>
            <option value="24">📅 Last 24 months</option>
          </select>
          <button onClick={fetchAnalyticsData} className="refresh-btn" title="Refresh data">
            <FaSync /> Refresh
          </button>
        </div>
      </div>

      {/* Key Metrics Overview */}
      <div className="analytics-card">
        <div className="card-header">
          <h2>📊 Platform Overview</h2>
          <div className="card-subinfo">Real-time metrics from database</div>
        </div>
        <div className="metrics-grid">
          <div className="metric-card">
            <div className="metric-icon users">
              <FaUsers />
            </div>
            <h3 className="metric-title">Total Users</h3>
            <p className="metric-value">{typeof analyticsData.totals?.totalUsers === 'number' ? analyticsData.totals.totalUsers.toLocaleString() : 0}</p>
            <div className="metric-description">Registered platform users</div>
          </div>

          <div className="metric-card">
            <div className="metric-icon providers">
              <FaTools />
            </div>
            <h3 className="metric-title">Service Providers</h3>
            <p className="metric-value">{typeof analyticsData.totals?.serviceProviders === 'number' ? analyticsData.totals.serviceProviders.toLocaleString() : 0}</p>
            <div className="metric-description">Active service providers</div>
          </div>

          <div className="metric-card">
            <div className="metric-icon bookings">
              <FaChartBar />
            </div>
            <h3 className="metric-title">Total Requests</h3>
            <p className="metric-value">{typeof analyticsData.totalBookings === 'number' ? analyticsData.totalBookings.toLocaleString() : 0}</p>
            <div className="metric-description">Completed service requests</div>
          </div>

          <div className="metric-card">
            <div className="metric-icon jobfairs">
              <FaCalendarAlt />
            </div>
            <h3 className="metric-title">Active Users</h3>
            <p className="metric-value">{typeof analyticsData.activeUsers === 'number' ? analyticsData.activeUsers.toLocaleString() : 0}</p>
            <div className="metric-description">~70% of total users</div>
          </div>
        </div>
      </div>

      {/* User Growth Trend Chart */}
      <div className="analytics-card">
        <div className="card-header">
          <h2>📈 User Registration Trends</h2>
          <div className="card-subinfo">Monthly user growth over time</div>
        </div>
        <div className="chart-container user-growth-chart" ref={userGrowthChartRef}>
          <Line
            data={userGrowthChartData}
            options={{
              responsive: true,
              maintainAspectRatio: true,
              aspectRatio: 2.5,
              plugins: {
                legend: {
                  position: 'top',
                },
                title: {
                  display: false,
                },
              },
              scales: {
                y: {
                  beginAtZero: true,
                  ticks: {
                    precision: 0
                  }
                }
              }
            }}
          />
        </div>
      </div>

      {/* Demographics Charts */}
      <div className="analytics-card">
        <div className="card-header">
          <h2>👥 User Demographics</h2>
        </div>
        <div className="charts-grid">
          <div className="chart-item">
            <h4>Age Distribution</h4>
            <div className="chart-wrapper age-distribution-chart" ref={ageGroupsChartRef}>
              <Bar
                data={ageGroupsChartData}
                options={{
                  responsive: true,
                  maintainAspectRatio: true,
                  aspectRatio: 2,
                  plugins: { 
                    legend: { display: false },
                    tooltip: {
                      callbacks: {
                        label: function(context) {
                          return `${context.label}: ${context.parsed.y} users`;
                        }
                      }
                    }
                  },
                  scales: {
                    y: {
                      beginAtZero: true,
                      ticks: {
                        precision: 0
                      }
                    },
                    x: {
                      ticks: {
                        maxRotation: 0,
                        minRotation: 0
                      }
                    }
                  }
                }}
              />
              <div className="card-subinfo">Age distribution and employment status</div>
            </div>
          </div>
          <div className="chart-item">
            <h4>Employment Status</h4>
            <div className="chart-wrapper employment-chart" ref={employmentChartRef}>
              <Doughnut
                data={employmentChartData}
                options={{
                  responsive: true,
                  maintainAspectRatio: true,
                  aspectRatio: 1.2,
                  plugins: {
                    legend: {
                      position: 'bottom',
                      labels: {
                        boxWidth: 10,
                        font: { size: 10 },
                        padding: 10
                      }
                    },
                    tooltip: {
                      callbacks: {
                        label: function(context) {
                          const label = context.label || '';
                          const value = context.parsed || 0;
                          const total = context.dataset.data.reduce((a, b) => a + b, 0);
                          const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
                          return `${label}: ${value} (${percentage}%)`;
                        }
                      }
                    }
                  },
                  cutout: '65%'
                }}
              />
            </div>
            <div className="employment-summary">
              <div className="employment-rate">
                <span className="rate-label">Employment Rate:</span>
                <span className="rate-value">
                  {(() => {
                    const worker = analyticsData.demographics.employment?.worker || 0;
                    const nonWorker = analyticsData.demographics.employment?.nonWorker || 0;
                    const total = worker + nonWorker;
                    if (total > 0) {
                      return Math.round((worker / total) * 100);
                    }
                    return 0;
                  })()}%
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Skills and Services Charts */}
      <div className="analytics-card">
        <div className="card-header">
          <h2>🛠️ Skills & Services Analysis</h2>
        </div>
        <div className="charts-grid">
          <div className="chart-item">
            <h4>Top Skills Distribution</h4>
            <div className="chart-wrapper skills-chart" ref={skillsChartRef}>
              <Doughnut
                data={skillsChartData}
                options={{
                  responsive: true,
                  maintainAspectRatio: true,
                  aspectRatio: 1.5,
                  plugins: {
                    legend: {
                      position: 'right',
                      labels: {
                        boxWidth: 15,
                        font: { size: 11 }
                      }
                    }
                  }
                }}
              />
              <div className="card-subinfo">Most demanded skills and popular services</div>
            </div>
          </div>
          <div className="chart-item">
            <h4>Popular Services</h4>
            <div className="chart-wrapper services-chart" ref={servicesChartRef}>
              <Bar
                data={servicesChartData}
                options={{
                  responsive: true,
                  maintainAspectRatio: true,
                  aspectRatio: 2,
                  plugins: { 
                    legend: { display: false },
                    tooltip: {
                      callbacks: {
                        label: function(context) {
                          return `${context.label}: ${context.parsed.y} bookings`;
                        }
                      }
                    }
                  },
                  scales: {
                    y: {
                      beginAtZero: true,
                      ticks: {
                        precision: 0
                      }
                    },
                    x: {
                      ticks: {
                        maxRotation: 45,
                        minRotation: 45
                      }
                    }
                  }
                }}
              />
            </div>
          </div>
        </div>
      </div>



      {/* Fixed Export Button */}
      <button className="fixed-export-btn" onClick={handleExportReport} title="Export Full Report">
        <FaDownload /> Export Full Report
      </button>


    </div>
  );
};

export default SystemAnalytics;
