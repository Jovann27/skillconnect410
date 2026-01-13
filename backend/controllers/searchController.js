import ServiceRequest from '../models/serviceRequest.js';
import User from '../models/userSchema.js';
import SavedSearch from '../models/savedSearch.js';
import { catchAsyncError } from '../middlewares/catchAsyncError.js';
import ErrorHandler from '../utils/errorHandler.js';

/**
 * @swagger
 * /api/v1/search/service-requests:
 *   get:
 *     summary: Advanced search for service requests
 *     description: Search and filter service requests with full-text search, advanced filtering, and pagination
 *     tags: [Search]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/language'
 *       - name: q
 *         in: query
 *         description: Full-text search query
 *         schema:
 *           type: string
 *         example: "plumbing repair"
 *       - name: status
 *         in: query
 *         description: Filter by request status
 *         schema:
 *           type: string
 *           enum: [Open, Offered, Accepted, "In Progress", Completed, Cancelled]
 *       - name: typeOfWork
 *         in: query
 *         description: Filter by type of work
 *         schema:
 *           type: string
 *       - name: minBudget
 *         in: query
 *         description: Minimum budget filter
 *         schema:
 *           type: number
 *       - name: maxBudget
 *         in: query
 *         description: Maximum budget filter
 *         schema:
 *           type: number
 *       - name: location
 *         in: query
 *         description: Location-based filter
 *         schema:
 *           type: string
 *       - name: sortBy
 *         in: query
 *         description: Sort field
 *         schema:
 *           type: string
 *           enum: [createdAt, budget, status]
 *           default: createdAt
 *       - name: sortOrder
 *         in: query
 *         description: Sort order
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *       - $ref: '#/components/parameters/page'
 *       - $ref: '#/components/parameters/limit'
 *     responses:
 *       200:
 *         description: Service requests retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/ServiceRequest'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     currentPage:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 *                     totalItems:
 *                       type: integer
 *                     itemsPerPage:
 *                       type: integer
 */
export const searchServiceRequests = catchAsyncError(async (req, res, next) => {
  const {
    q, // search query
    status,
    typeOfWork,
    minBudget,
    maxBudget,
    location,
    sortBy = 'createdAt',
    sortOrder = 'desc',
    page = 1,
    limit = 10
  } = req.query;

  let matchConditions = {};

  // Text search
  if (q) {
    matchConditions.$text = { $search: q };
  }

  // Status filter
  if (status) {
    matchConditions.status = status;
  }

  // Type of work filter
  if (typeOfWork) {
    matchConditions.typeOfWork = { $regex: typeOfWork, $options: 'i' };
  }

  // Budget range filter
  if (minBudget || maxBudget) {
    matchConditions.$and = matchConditions.$and || [];
    if (minBudget) {
      matchConditions.$and.push({ maxBudget: { $gte: parseFloat(minBudget) } });
    }
    if (maxBudget) {
      matchConditions.$and.push({ minBudget: { $lte: parseFloat(maxBudget) } });
    }
  }

  // Location filter
  if (location) {
    matchConditions.address = { $regex: location, $options: 'i' };
  }

  // Exclude expired requests
  matchConditions.expiresAt = { $gt: new Date() };

  const sortOptions = {};
  sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;

  const skip = (parseInt(page) - 1) * parseInt(limit);

  let aggregationPipeline = [
    { $match: matchConditions },
    {
      $lookup: {
        from: 'users',
        localField: 'requester',
        foreignField: '_id',
        as: 'requester'
      }
    },
    {
      $lookup: {
        from: 'users',
        localField: 'serviceProvider',
        foreignField: '_id',
        as: 'serviceProvider'
      }
    },
    {
      $unwind: { path: '$requester', preserveNullAndEmptyArrays: true }
    },
    {
      $unwind: { path: '$serviceProvider', preserveNullAndEmptyArrays: true }
    },
    {
      $project: {
        name: 1,
        address: 1,
        phone: 1,
        typeOfWork: 1,
        preferredDate: 1,
        time: 1,
        minBudget: 1,
        maxBudget: 1,
        notes: 1,
        status: 1,
        expiresAt: 1,
        eta: 1,
        createdAt: 1,
        requester: {
          _id: 1,
          firstName: 1,
          lastName: 1,
          username: 1,
          profilePic: 1,
          averageRating: 1
        },
        serviceProvider: {
          _id: 1,
          firstName: 1,
          lastName: 1,
          username: 1,
          profilePic: 1,
          averageRating: 1
        },
        score: { $meta: 'textScore' }
      }
    },
    { $sort: q ? { score: { $meta: 'textScore' }, ...sortOptions } : sortOptions },
    { $skip: skip },
    { $limit: parseInt(limit) }
  ];

  const results = await ServiceRequest.aggregate(aggregationPipeline);

  // Get total count for pagination
  const totalCountPipeline = [
    { $match: matchConditions },
    { $count: 'total' }
  ];

  const totalResult = await ServiceRequest.aggregate(totalCountPipeline);
  const total = totalResult.length > 0 ? totalResult[0].total : 0;

  res.status(200).json({
    success: true,
    data: results,
    pagination: {
      currentPage: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit)),
      totalItems: total,
      itemsPerPage: parseInt(limit)
    }
  });
});

/**
 * Advanced search for service providers
 */
export const searchServiceProviders = catchAsyncError(async (req, res, next) => {
  const {
    q, // search query
    skills,
    serviceTypes,
    location,
    availability,
    minRating,
    maxRate,
    verified,
    sortBy = 'averageRating',
    sortOrder = 'desc',
    page = 1,
    limit = 10
  } = req.query;

  let matchConditions = {
    role: 'Service Provider',
    banned: false,
    suspended: false
  };

  // Text search
  if (q) {
    matchConditions.$text = { $search: q };
  }

  // Skills filter
  if (skills) {
    const skillsArray = skills.split(',').map(skill => skill.trim());
    matchConditions.skills = { $in: skillsArray };
  }

  // Service types filter
  if (serviceTypes) {
    const serviceTypeIds = serviceTypes.split(',').map(id => id.trim());
    matchConditions.serviceTypes = { $in: serviceTypeIds };
  }

  // Location filter
  if (location) {
    matchConditions.address = { $regex: location, $options: 'i' };
  }

  // Availability filter
  if (availability) {
    matchConditions.availability = availability;
  }

  // Rating filter
  if (minRating) {
    matchConditions.averageRating = { $gte: parseFloat(minRating) };
  }

  // Rate filter
  if (maxRate) {
    matchConditions.serviceRate = { $lte: parseFloat(maxRate) };
  }

  // Verified filter
  if (verified === 'true') {
    matchConditions.verified = true;
  }

  const sortOptions = {};
  sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;

  const skip = (parseInt(page) - 1) * parseInt(limit);

  let aggregationPipeline = [
    { $match: matchConditions },
    {
      $lookup: {
        from: 'services',
        localField: 'serviceTypes',
        foreignField: '_id',
        as: 'serviceTypes'
      }
    },
    {
      $project: {
        username: 1,
        firstName: 1,
        lastName: 1,
        email: 1,
        phone: 1,
        address: 1,
        profilePic: 1,
        skills: 1,
        occupation: 1,
        yearsExperience: 1,
        totalJobsCompleted: 1,
        availability: 1,
        serviceRate: 1,
        serviceDescription: 1,
        averageRating: 1,
        totalReviews: 1,
        verified: 1,
        isOnline: 1,
        createdAt: 1,
        serviceTypes: {
          _id: 1,
          name: 1,
          description: 1
        },
        score: { $meta: 'textScore' }
      }
    },
    { $sort: q ? { score: { $meta: 'textScore' }, ...sortOptions } : sortOptions },
    { $skip: skip },
    { $limit: parseInt(limit) }
  ];

  const results = await User.aggregate(aggregationPipeline);

  // Get total count for pagination
  const totalCountPipeline = [
    { $match: matchConditions },
    { $count: 'total' }
  ];

  const totalResult = await User.aggregate(totalCountPipeline);
  const total = totalResult.length > 0 ? totalResult[0].total : 0;

  res.status(200).json({
    success: true,
    data: results,
    pagination: {
      currentPage: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit)),
      totalItems: total,
      itemsPerPage: parseInt(limit)
    }
  });
});

/**
 * Get search suggestions/autocomplete
 */
export const getSearchSuggestions = catchAsyncError(async (req, res, next) => {
  const { q, type = 'all', limit = 5 } = req.query;

  if (!q || q.length < 2) {
    return res.status(200).json({
      success: true,
      suggestions: []
    });
  }

  let suggestions = [];

  if (type === 'providers' || type === 'all') {
    // Get provider suggestions
    const providerSuggestions = await User.aggregate([
      {
        $match: {
          role: 'Service Provider',
          banned: false,
          suspended: false,
          $or: [
            { firstName: { $regex: q, $options: 'i' } },
            { lastName: { $regex: q, $options: 'i' } },
            { username: { $regex: q, $options: 'i' } },
            { skills: { $in: [new RegExp(q, 'i')] } },
            { occupation: { $regex: q, $options: 'i' } }
          ]
        }
      },
      {
        $project: {
          _id: 1,
          name: { $concat: ['$firstName', ' ', '$lastName'] },
          username: 1,
          skills: 1,
          occupation: 1,
          type: 'provider'
        }
      },
      { $limit: parseInt(limit) }
    ]);

    suggestions = [...suggestions, ...providerSuggestions];
  }

  if (type === 'services' || type === 'all') {
    // Get service request suggestions
    const serviceSuggestions = await ServiceRequest.aggregate([
      {
        $match: {
          status: { $in: ['Open', 'Offered'] },
          expiresAt: { $gt: new Date() },
          $or: [
            { name: { $regex: q, $options: 'i' } },
            { typeOfWork: { $regex: q, $options: 'i' } }
          ]
        }
      },
      {
        $project: {
          _id: 1,
          name: 1,
          typeOfWork: 1,
          type: 'service'
        }
      },
      { $limit: parseInt(limit) }
    ]);

    suggestions = [...suggestions, ...serviceSuggestions];
  }

  res.status(200).json({
    success: true,
    suggestions
  });
});

/**
 * Get popular search terms
 */
export const getPopularSearchTerms = catchAsyncError(async (req, res, next) => {
  // This would typically come from a search analytics collection
  // For now, return some default popular terms
  const popularTerms = [
    'plumbing',
    'electrical',
    'cleaning',
    'gardening',
    'painting',
    'carpentry',
    'tutoring',
    'photography'
  ];

  res.status(200).json({
    success: true,
    popularTerms
  });
});

/**
 * Save a search query
 */
export const saveSearch = catchAsyncError(async (req, res, next) => {
  const { name, description, searchType, searchParams, notificationEnabled } = req.body;
  const userId = req.user.id;

  // Check if user already has a saved search with this name
  const existingSearch = await SavedSearch.findOne({
    user: userId,
    name: name.trim()
  });

  if (existingSearch) {
    return res.status(400).json({
      success: false,
      message: 'A saved search with this name already exists'
    });
  }

  const savedSearch = new SavedSearch({
    user: userId,
    name: name.trim(),
    description: description?.trim(),
    searchType,
    searchParams,
    notificationEnabled: notificationEnabled || false
  });

  await savedSearch.save();

  res.status(201).json({
    success: true,
    message: 'Search saved successfully',
    data: savedSearch
  });
});

/**
 * Get user's saved searches
 */
export const getSavedSearches = catchAsyncError(async (req, res, next) => {
  const userId = req.user.id;
  const { searchType, isActive = true } = req.query;

  let filter = { user: userId };

  if (searchType) {
    filter.searchType = searchType;
  }

  if (isActive !== undefined) {
    filter.isActive = isActive === 'true';
  }

  const savedSearches = await SavedSearch.find(filter)
    .sort({ updatedAt: -1 })
    .select('-__v');

  res.status(200).json({
    success: true,
    data: savedSearches
  });
});

/**
 * Update a saved search
 */
export const updateSavedSearch = catchAsyncError(async (req, res, next) => {
  const { id } = req.params;
  const { name, description, searchParams, notificationEnabled, isActive } = req.body;
  const userId = req.user.id;

  const savedSearch = await SavedSearch.findOne({
    _id: id,
    user: userId
  });

  if (!savedSearch) {
    return res.status(404).json({
      success: false,
      message: 'Saved search not found'
    });
  }

  // Check if new name conflicts with existing search
  if (name && name.trim() !== savedSearch.name) {
    const existingSearch = await SavedSearch.findOne({
      user: userId,
      name: name.trim(),
      _id: { $ne: id }
    });

    if (existingSearch) {
      return res.status(400).json({
        success: false,
        message: 'A saved search with this name already exists'
      });
    }
  }

  // Update fields
  if (name) savedSearch.name = name.trim();
  if (description !== undefined) savedSearch.description = description?.trim();
  if (searchParams) savedSearch.searchParams = searchParams;
  if (notificationEnabled !== undefined) savedSearch.notificationEnabled = notificationEnabled;
  if (isActive !== undefined) savedSearch.isActive = isActive;

  await savedSearch.save();

  res.status(200).json({
    success: true,
    message: 'Saved search updated successfully',
    data: savedSearch
  });
});

/**
 * Delete a saved search
 */
export const deleteSavedSearch = catchAsyncError(async (req, res, next) => {
  const { id } = req.params;
  const userId = req.user.id;

  const savedSearch = await SavedSearch.findOneAndDelete({
    _id: id,
    user: userId
  });

  if (!savedSearch) {
    return res.status(404).json({
      success: false,
      message: 'Saved search not found'
    });
  }

  res.status(200).json({
    success: true,
    message: 'Saved search deleted successfully'
  });
});

/**
 * Execute a saved search
 */
export const executeSavedSearch = catchAsyncError(async (req, res, next) => {
  const { id } = req.params;
  const userId = req.user.id;

  const savedSearch = await SavedSearch.findOne({
    _id: id,
    user: userId
  });

  if (!savedSearch) {
    return res.status(404).json({
      success: false,
      message: 'Saved search not found'
    });
  }

  // Update last executed time
  savedSearch.lastExecuted = new Date();
  await savedSearch.save();

  // Execute the search based on type
  let results;
  const searchParams = { ...savedSearch.searchParams, ...req.query };

  if (savedSearch.searchType === 'providers') {
    // Use existing searchServiceProviders function
    const reqMock = { query: searchParams };
    const resMock = {
      status: (code) => ({
        json: (data) => {
          results = data;
        }
      })
    };

    await searchServiceProviders(reqMock, resMock, () => {});
  } else if (savedSearch.searchType === 'requests') {
    // Use existing searchServiceRequests function
    const reqMock = { query: searchParams };
    const resMock = {
      status: (code) => ({
        json: (data) => {
          results = data;
        }
      })
    };

    await searchServiceRequests(reqMock, resMock, () => {});
  }

  // Update result count
  if (results && results.pagination) {
    savedSearch.resultCount = results.pagination.totalItems;
    await savedSearch.save();
  }

  res.status(200).json({
    success: true,
    data: results,
    savedSearch: {
      id: savedSearch._id,
      name: savedSearch.name,
      searchType: savedSearch.searchType
    }
  });
});
