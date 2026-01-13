import Report from "../models/report.js";
import { catchAsyncError } from "../middlewares/catchAsyncError.js";
import ErrorHandler from "../middlewares/error.js";
import User from "../models/userSchema.js";
import Booking from "../models/booking.js";
import ServiceRequest from "../models/serviceRequest.js";

// Analytics Reports
export const totalsReport = catchAsyncError(async (req, res, next) => {
  try {
    // Get total users (excluding banned users)
    const totalUsers = await User.countDocuments({ banned: { $ne: true } });
    
    // Get total service providers (users with role "Service Provider" and not banned)
    const serviceProviders = await User.countDocuments({ 
      role: "Service Provider",
      banned: { $ne: true }
    });
    
    // Get total population (all users including banned, for coverage area calculation)
    const totalPopulation = await User.countDocuments();
    
    res.status(200).json({
      success: true,
      data: {
        totalUsers,
        serviceProviders,
        totalPopulation
      }
    });
  } catch (err) {
    console.error(err);
    return next(new ErrorHandler("Failed to fetch totals report", 500));
  }
});

export const demographicsReport = catchAsyncError(async (req, res, next) => {
  try {
    // Get all users (excluding banned)
    const users = await User.find({ banned: { $ne: true } }).select('birthdate employed');
    
    // Calculate age groups
    const ageGroups = {
      '18-25': 0,
      '26-35': 0,
      '36-45': 0,
      '46-55': 0,
      '56-65': 0,
      '65+': 0
    };
    
    // Employment status
    const employment = {
      worker: 0,
      nonWorker: 0
    };
    
    const currentDate = new Date();
    
    users.forEach(user => {
      // Calculate age from birthdate
      if (user.birthdate) {
        const birthDate = new Date(user.birthdate);
        const age = currentDate.getFullYear() - birthDate.getFullYear();
        const monthDiff = currentDate.getMonth() - birthDate.getMonth();
        const actualAge = monthDiff < 0 || (monthDiff === 0 && currentDate.getDate() < birthDate.getDate()) 
          ? age - 1 
          : age;
        
        // Categorize by age group
        if (actualAge >= 18 && actualAge <= 25) {
          ageGroups['18-25']++;
        } else if (actualAge >= 26 && actualAge <= 35) {
          ageGroups['26-35']++;
        } else if (actualAge >= 36 && actualAge <= 45) {
          ageGroups['36-45']++;
        } else if (actualAge >= 46 && actualAge <= 55) {
          ageGroups['46-55']++;
        } else if (actualAge >= 56 && actualAge <= 65) {
          ageGroups['56-65']++;
        } else if (actualAge > 65) {
          ageGroups['65+']++;
        }
      }
      
      // Count employment status
      // The employed field can be "employed" or "unemployed" (lowercase)
      if (user.employed) {
        const employedStatus = user.employed.toLowerCase().trim();
        if (employedStatus === 'employed') {
          employment.worker++;
        } else if (employedStatus === 'unemployed') {
          employment.nonWorker++;
        }
        // If the value doesn't match expected values, we don't count it
      }
    });
    
    res.status(200).json({
      success: true,
      data: {
        ageGroups,
        employment
      }
    });
  } catch (err) {
    console.error(err);
    return next(new ErrorHandler("Failed to fetch demographics report", 500));
  }
});

export const skillsReport = catchAsyncError(async (req, res, next) => {
  try {
    // Get all users with skills (excluding banned)
    const users = await User.find({ 
      banned: { $ne: true },
      skills: { $exists: true, $ne: [] }
    }).select('skills');
    
    // Count skills
    const skillsCount = {};
    
    users.forEach(user => {
      if (user.skills && Array.isArray(user.skills)) {
        user.skills.forEach(skill => {
          if (skill && skill.trim()) {
            const skillName = skill.trim();
            skillsCount[skillName] = (skillsCount[skillName] || 0) + 1;
          }
        });
      }
    });
    
    res.status(200).json({
      success: true,
      data: skillsCount
    });
  } catch (err) {
    console.error(err);
    return next(new ErrorHandler("Failed to fetch skills report", 500));
  }
});

export const skilledPerTrade = catchAsyncError(async (req, res, next) => {
  try {
    // Get all service providers (excluding banned)
    const serviceProviders = await User.find({ 
      role: "Service Provider",
      banned: { $ne: true }
    }).select('role skills service');
    
    // Count by role
    const byRole = {};
    serviceProviders.forEach(user => {
      const role = user.role || 'Unknown';
      byRole[role] = (byRole[role] || 0) + 1;
    });
    
    // Count by skill
    const bySkill = {};
    serviceProviders.forEach(user => {
      if (user.skills && Array.isArray(user.skills)) {
        user.skills.forEach(skill => {
          if (skill && skill.trim()) {
            const skillName = skill.trim();
            bySkill[skillName] = (bySkill[skillName] || 0) + 1;
          }
        });
      }
    });
    
    res.status(200).json({
      success: true,
      data: {
        byRole,
        bySkill
      }
    });
  } catch (err) {
    console.error(err);
    return next(new ErrorHandler("Failed to fetch skilled per trade report", 500));
  }
});

export const mostBookedServices = catchAsyncError(async (req, res, next) => {
  try {
    // Get all completed bookings
    const bookings = await Booking.find({ 
      status: 'Complete'
    }).populate('serviceRequest', 'typeOfWork');
    
    // Count services by typeOfWork from service requests
    const serviceCounts = {};
    
    bookings.forEach(booking => {
      if (booking.serviceRequest && booking.serviceRequest.typeOfWork) {
        const serviceType = booking.serviceRequest.typeOfWork;
        serviceCounts[serviceType] = (serviceCounts[serviceType] || 0) + 1;
      }
    });
    
    // If no completed bookings, try to get from service requests
    if (Object.keys(serviceCounts).length === 0) {
      const serviceRequests = await ServiceRequest.find({
        status: { $in: ['Working', 'Complete'] }
      }).select('typeOfWork');
      
      serviceRequests.forEach(request => {
        if (request.typeOfWork) {
          const serviceType = request.typeOfWork;
          serviceCounts[serviceType] = (serviceCounts[serviceType] || 0) + 1;
        }
      });
    }
    
    res.status(200).json({
      success: true,
      data: serviceCounts
    });
  } catch (err) {
    console.error(err);
    return next(new ErrorHandler("Failed to fetch most booked services report", 500));
  }
});

export const totalsOverTime = catchAsyncError(async (req, res, next) => {
  try {
    const months = parseInt(req.query.months) || 12;
    const currentDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);
    
    // Get all users created within the time range (excluding banned)
    const users = await User.find({
      createdAt: { $gte: startDate, $lte: currentDate },
      banned: { $ne: true }
    }).select('createdAt').sort({ createdAt: 1 });
    
    // Group by month
    const monthlyData = {};
    
    users.forEach(user => {
      const date = new Date(user.createdAt);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      monthlyData[monthKey] = (monthlyData[monthKey] || 0) + 1;
    });
    
    // Generate labels and values for the requested months
    const labels = [];
    const values = [];
    
    for (let i = months - 1; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const monthName = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      
      labels.push(monthName);
      values.push(monthlyData[monthKey] || 0);
    }
    
    res.status(200).json({
      success: true,
      data: {
        labels,
        values
      }
    });
  } catch (err) {
    console.error(err);
    return next(new ErrorHandler("Failed to fetch totals over time report", 500));
  }
});

// User Reports
export const reportUser = catchAsyncError(async (req, res, next) => {
  const { reportedUserId, reason, description, appointmentId } = req.body;
  const reporterId = req.user._id;

  if (!reportedUserId || !reason) {
    return next(new ErrorHandler("Reported user ID and reason are required", 400));
  }

  if (reporterId.toString() === reportedUserId.toString()) {
    return next(new ErrorHandler("Cannot report yourself", 400));
  }

  // Check if reported user exists
  const reportedUser = await User.findById(reportedUserId);
  if (!reportedUser) {
    return next(new ErrorHandler("Reported user not found", 404));
  }

  // Check if reporter exists
  const reporter = await User.findById(reporterId);
  if (!reporter) {
    return next(new ErrorHandler("Reporter not found", 404));
  }

  // Check if user has already reported this person recently (within last 24 hours)
  const recentReport = await Report.findOne({
    reporter: reporterId,
    reportedUser: reportedUserId,
    createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
  });

  if (recentReport) {
    return next(new ErrorHandler("You have already reported this user recently. Please wait before submitting another report.", 400));
  }

  const report = await Report.create({
    reporter: reporterId,
    reportedUser: reportedUserId,
    reason: reason.trim(),
    description: description ? description.trim() : "",
    appointment: appointmentId || null
  });

  res.status(201).json({
    success: true,
    message: "User reported successfully. Our team will review your report.",
    report: {
      id: report._id,
      status: report.status,
      createdAt: report.createdAt
    }
  });
});

// Get reports (for admin use)
export const getReports = catchAsyncError(async (req, res) => {
  const { status, page = 1, limit = 10 } = req.query;

  const query = {};
  if (status) {
    query.status = status;
  }

  const reports = await Report.find(query)
    .populate('reporter', 'firstName lastName email')
    .populate('reportedUser', 'firstName lastName email')
    .populate('appointment', 'serviceRequest')
    .sort({ createdAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);

  const total = await Report.countDocuments(query);

  res.status(200).json({
    success: true,
    reports,
    pagination: {
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      totalReports: total
    }
  });
});

// Update report status (for admin use)
export const updateReportStatus = catchAsyncError(async (req, res, next) => {
  const { reportId } = req.params;
  const { status } = req.body;

  if (!["pending", "investigating", "resolved", "dismissed"].includes(status)) {
    return next(new ErrorHandler("Invalid status", 400));
  }

  const report = await Report.findByIdAndUpdate(
    reportId,
    { status, updatedAt: new Date() },
    { new: true }
  ).populate('reporter', 'firstName lastName email')
   .populate('reportedUser', 'firstName lastName email');

  if (!report) {
    return next(new ErrorHandler("Report not found", 404));
  }

  res.status(200).json({
    success: true,
    message: "Report status updated successfully",
    report
  });
});

// Enhanced Analytics Dashboard
export const getDashboardAnalytics = catchAsyncError(async (req, res, next) => {
  try {
    const { period = '30d', startDate, endDate } = req.query;

    // Calculate date range
    let dateRange = {};
    if (startDate && endDate) {
      dateRange = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    } else {
      const days = period === '7d' ? 7 : period === '30d' ? 30 : period === '90d' ? 90 : 30;
      dateRange = {
        $gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000)
      };
    }

    // Real-time metrics
    const [
      userStats,
      bookingStats,
      serviceRequestStats,
      revenueStats,
      notificationStats
    ] = await Promise.all([
      getUserAnalytics(dateRange),
      getBookingAnalytics(dateRange),
      getServiceRequestAnalytics(dateRange),
      getRevenueAnalytics(dateRange),
      getNotificationAnalytics(dateRange)
    ]);

    // Top performing services
    const topServices = await getTopPerformingServices(dateRange);

    // Geographic distribution
    const geographicStats = await getGeographicStats();

    // User engagement metrics
    const engagementStats = await getEngagementStats(dateRange);

    res.status(200).json({
      success: true,
      period,
      dateRange,
      data: {
        users: userStats,
        bookings: bookingStats,
        serviceRequests: serviceRequestStats,
        revenue: revenueStats,
        notifications: notificationStats,
        topServices,
        geographic: geographicStats,
        engagement: engagementStats
      }
    });
  } catch (err) {
    console.error(err);
    return next(new ErrorHandler("Failed to fetch dashboard analytics", 500));
  }
});

const getUserAnalytics = async (dateRange) => {
  const totalUsers = await User.countDocuments();
  const newUsers = await User.countDocuments({ createdAt: dateRange });
  const activeUsers = await User.countDocuments({
    lastLogin: dateRange,
    banned: { $ne: true }
  });
  const verifiedProviders = await User.countDocuments({
    role: "Service Provider",
    verified: true,
    banned: { $ne: true }
  });

  // User growth over time
  const userGrowth = await User.aggregate([
    { $match: { createdAt: dateRange } },
    {
      $group: {
        _id: {
          $dateToString: { format: "%Y-%m-%d", date: "$createdAt" }
        },
        count: { $sum: 1 }
      }
    },
    { $sort: { "_id": 1 } }
  ]);

  return {
    total: totalUsers,
    new: newUsers,
    active: activeUsers,
    verifiedProviders,
    growth: userGrowth
  };
};

const getBookingAnalytics = async (dateRange) => {
  const totalBookings = await Booking.countDocuments();
  const recentBookings = await Booking.countDocuments({ createdAt: dateRange });
  const completedBookings = await Booking.countDocuments({
    status: 'Completed',
    createdAt: dateRange
  });
  const ongoingBookings = await Booking.countDocuments({
    status: { $in: ['Working', 'In Progress'] }
  });

  // Booking trends
  const bookingTrends = await Booking.aggregate([
    { $match: { createdAt: dateRange } },
    {
      $group: {
        _id: {
          $dateToString: { format: "%Y-%m-%d", date: "$createdAt" }
        },
        total: { $sum: 1 },
        completed: {
          $sum: { $cond: [{ $eq: ["$status", "Completed"] }, 1, 0] }
        }
      }
    },
    { $sort: { "_id": 1 } }
  ]);

  return {
    total: totalBookings,
    recent: recentBookings,
    completed: completedBookings,
    ongoing: ongoingBookings,
    trends: bookingTrends,
    completionRate: recentBookings > 0 ? (completedBookings / recentBookings * 100).toFixed(2) : 0
  };
};

const getServiceRequestAnalytics = async (dateRange) => {
  const totalRequests = await ServiceRequest.countDocuments();
  const openRequests = await ServiceRequest.countDocuments({ status: "Open" });
  const recentRequests = await ServiceRequest.countDocuments({ createdAt: dateRange });

  // Service category distribution
  const categoryDistribution = await ServiceRequest.aggregate([
    { $match: { createdAt: dateRange } },
    {
      $group: {
        _id: "$serviceCategory",
        count: { $sum: 1 }
      }
    },
    { $sort: { count: -1 } },
    { $limit: 10 }
  ]);

  return {
    total: totalRequests,
    open: openRequests,
    recent: recentRequests,
    categoryDistribution
  };
};

const getRevenueAnalytics = async (dateRange) => {
  // Since payments are cash-based, we'll track service completion metrics
  // In a real payment system, this would aggregate payment data
  const completedBookings = await Booking.countDocuments({
    status: 'Completed',
    updatedAt: dateRange
  });

  // Estimate revenue based on average service rates
  const avgServiceRate = 500; // Placeholder - in real system, get from service rates
  const estimatedRevenue = completedBookings * avgServiceRate;

  return {
    totalRevenue: estimatedRevenue,
    completedServices: completedBookings,
    averageRevenuePerService: avgServiceRate,
    period: Object.keys(dateRange).length > 0 ? `${dateRange.$gte.toISOString().split('T')[0]} to ${dateRange.$lte?.toISOString().split('T')[0] || 'now'}` : 'all_time'
  };
};

const getNotificationAnalytics = async (dateRange) => {
  const Notification = (await import("../models/notification.js")).default;

  const totalNotifications = await Notification.countDocuments();
  const recentNotifications = await Notification.countDocuments({ createdAt: dateRange });
  const unreadNotifications = await Notification.countDocuments({
    read: false,
    createdAt: dateRange
  });

  // Notification types distribution
  const typeDistribution = await Notification.aggregate([
    { $match: { createdAt: dateRange } },
    {
      $group: {
        _id: "$type",
        count: { $sum: 1 },
        read: { $sum: { $cond: ["$read", 1, 0] } }
      }
    },
    { $sort: { count: -1 } }
  ]);

  return {
    total: totalNotifications,
    recent: recentNotifications,
    unread: unreadNotifications,
    readRate: recentNotifications > 0 ? ((recentNotifications - unreadNotifications) / recentNotifications * 100).toFixed(2) : 0,
    typeDistribution
  };
};

const getTopPerformingServices = async (dateRange) => {
  const topServices = await Booking.aggregate([
    {
      $match: {
        status: 'Completed',
        updatedAt: dateRange
      }
    },
    {
      $lookup: {
        from: 'servicerequests',
        localField: 'serviceRequest',
        foreignField: '_id',
        as: 'serviceRequest'
      }
    },
    { $unwind: '$serviceRequest' },
    {
      $group: {
        _id: '$serviceRequest.serviceCategory',
        bookings: { $sum: 1 },
        avgRating: { $avg: '$serviceRequest.rating' }
      }
    },
    {
      $sort: { bookings: -1 }
    },
    { $limit: 10 }
  ]);

  return topServices;
};

const getGeographicStats = async () => {
  const locationStats = await User.aggregate([
    {
      $match: {
        address: { $exists: true, $ne: null },
        banned: { $ne: true }
      }
    },
    {
      $group: {
        _id: '$address.city',
        users: { $sum: 1 },
        providers: {
          $sum: {
            $cond: [{ $eq: ["$role", "Service Provider"] }, 1, 0]
          }
        }
      }
    },
    { $sort: { users: -1 } },
    { $limit: 10 }
  ]);

  return locationStats;
};

const getEngagementStats = async (dateRange) => {
  // Calculate user engagement based on logins and activity
  const activeUsers = await User.countDocuments({
    lastLogin: dateRange,
    banned: { $ne: true }
  });

  const totalUsers = await User.countDocuments({
    banned: { $ne: true }
  });

  // Calculate retention (simplified)
  const retentionRate = totalUsers > 0 ? (activeUsers / totalUsers * 100).toFixed(2) : 0;

  return {
    activeUsers,
    totalUsers,
    retentionRate: `${retentionRate}%`,
    period: Object.keys(dateRange).length > 0 ? 'specified_period' : 'all_time'
  };
};

// Export functionality for reports
export const exportAnalyticsReport = catchAsyncError(async (req, res, next) => {
  try {
    const { format = 'json', period = '30d' } = req.query;

    // Get analytics data
    const analyticsData = await getDashboardAnalytics(req, res, next);

    if (format === 'csv') {
      // Convert to CSV format
      const csvData = convertAnalyticsToCSV(analyticsData.data);

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="analytics_report_${period}_${new Date().toISOString().split('T')[0]}.csv"`);
      res.send(csvData);
    } else {
      // JSON format
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="analytics_report_${period}_${new Date().toISOString().split('T')[0]}.json"`);
      res.json(analyticsData);
    }
  } catch (err) {
    console.error(err);
    return next(new ErrorHandler("Failed to export analytics report", 500));
  }
});

const convertAnalyticsToCSV = (data) => {
  let csv = 'Category,Metric,Value\n';

  // Users
  csv += `Users,Total,${data.users.total}\n`;
  csv += `Users,New,${data.users.new}\n`;
  csv += `Users,Active,${data.users.active}\n`;
  csv += `Users,Verified Providers,${data.users.verifiedProviders}\n`;

  // Bookings
  csv += `Bookings,Total,${data.bookings.total}\n`;
  csv += `Bookings,Recent,${data.bookings.recent}\n`;
  csv += `Bookings,Completed,${data.bookings.completed}\n`;
  csv += `Bookings,Ongoing,${data.bookings.ongoing}\n`;
  csv += `Bookings,Completion Rate,${data.bookings.completionRate}%\n`;

  // Service Requests
  csv += `Service Requests,Total,${data.serviceRequests.total}\n`;
  csv += `Service Requests,Open,${data.serviceRequests.open}\n`;
  csv += `Service Requests,Recent,${data.serviceRequests.recent}\n`;

  // Revenue
  csv += `Revenue,Total,₱${data.revenue.totalRevenue}\n`;
  csv += `Revenue,Completed Services,${data.revenue.completedServices}\n`;

  // Notifications
  csv += `Notifications,Total,${data.notifications.total}\n`;
  csv += `Notifications,Recent,${data.notifications.recent}\n`;
  csv += `Notifications,Unread,${data.notifications.unread}\n`;
  csv += `Notifications,Read Rate,${data.notifications.readRate}%\n`;

  return csv;
};
