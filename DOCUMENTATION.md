# SkillConnect System Documentation

## Overview

SkillConnect is a comprehensive skill-sharing platform that connects service providers with community members seeking various services. The system enables users to post service requests, find qualified providers, book appointments, communicate in real-time, and leave reviews.

## Architecture

### Tech Stack

**Backend:**
- Node.js with Express.js framework
- MongoDB with Mongoose ODM
- Socket.IO for real-time communication
- JWT for authentication
- Express-fileupload for file handling
- Nodemailer for email notifications
- Cloudinary for image management

**Frontend (Web):**
- React 18 with Vite build tool
- React Router for navigation
- Axios for API communication
- Socket.IO client for real-time features
- Tailwind CSS for styling
- Chart.js for analytics
- MapLibre GL for maps

**Mobile Frontend:**
- React Native with Expo
- React Navigation for routing
- Axios for API communication
- Socket.IO client for real-time features

### System Components

1. **User Management**: Registration, authentication, profile management
2. **Service Requests**: Posting, browsing, accepting requests
3. **Provider Management**: Service provider profiles, verification, ratings
4. **Booking System**: Appointment scheduling and management
5. **Real-time Chat**: Communication between requesters and providers
6. **Review System**: Rating and feedback for completed services
7. **Admin Dashboard**: System management and analytics
8. **Recommendation Engine**: AI-powered provider/request matching

## Core Functionality

### User Roles

1. **Community Member**: Can post service requests and book providers
2. **Service Provider**: Can offer services, accept requests, manage bookings
3. **Admin**: System administration, user management, analytics

### Key Features

#### Service Request Flow
1. Community members post service requests with details (type, location, budget, date/time)
2. System notifies matching service providers
3. Providers can view and accept requests
4. Accepted requests become bookings
5. Real-time chat enables communication
6. Services are completed and reviewed

#### Provider Discovery
- Browse providers by skills, ratings, location
- View provider profiles with reviews and portfolio
- AI-powered recommendations based on user preferences and history

#### Booking Management
- Schedule appointments with preferred dates/times
- Track booking status (Working, Complete, Cancelled)
- Real-time updates via WebSocket

#### Real-time Communication
- Chat within booking contexts
- Typing indicators
- Message seen status
- Notification system

## API Endpoints

### Authentication
- `POST /api/v1/user/register` - User registration
- `POST /api/v1/user/login` - User login
- `POST /api/v1/admin/auth/login` - Admin login

### Service Requests
- `POST /api/v1/user/post-service-request` - Create service request
- `GET /api/v1/user/available-requests` - Browse available requests
- `POST /api/v1/user/accept-request/:id` - Accept service request

### Providers
- `GET /api/v1/user/providers` - Browse service providers
- `GET /api/v1/user/provider-profile/:id` - View provider profile

### Bookings
- `GET /api/v1/user/bookings` - Get user bookings
- `PUT /api/v1/user/booking-status/:id` - Update booking status

### Chat
- `GET /api/v1/user/chat-history` - Get chat history
- `POST /api/v1/user/send-message` - Send message
- `PUT /api/v1/user/mark-seen/:appointmentId` - Mark messages as seen

### Reviews
- `POST /api/v1/user/leave-review` - Submit review

## Database Schema

### Key Models

#### User
```javascript
{
  firstName: String,
  lastName: String,
  email: String,
  phone: String,
  password: String,
  role: "Community Member" | "Service Provider" | "Admin",
  skills: [String],
  serviceDescription: String,
  serviceRate: Number,
  profilePic: String,
  isOnline: Boolean,
  verified: Boolean,
  banned: Boolean,
  averageRating: Number,
  totalReviews: Number
}
```

#### ServiceRequest
```javascript
{
  requester: ObjectId,
  name: String,
  address: String,
  phone: String,
  typeOfWork: String,
  preferredDate: Date,
  time: String,
  minBudget: Number,
  maxBudget: Number,
  notes: String,
  status: "Open" | "Working" | "Complete" | "Cancelled" | "Waiting",
  serviceProvider: ObjectId,
  targetProvider: ObjectId,
  expiresAt: Date
}
```

#### Booking
```javascript
{
  requester: ObjectId,
  provider: ObjectId,
  serviceRequest: ObjectId,
  status: "Working" | "Complete" | "Cancelled" | "Applied" | "In Progress",
  commissionFee: Number
}
```

#### Chat
```javascript
{
  appointment: ObjectId,
  sender: ObjectId,
  message: String,
  status: "sent" | "seen",
  seenBy: [{
    user: ObjectId,
    seenAt: Date
  }]
}
```

#### Review
```javascript
{
  booking: ObjectId,
  reviewer: ObjectId,
  reviewee: ObjectId,
  rating: Number,
  comments: String
}
```

## Security Features

- JWT authentication with role-based access control
- Password hashing with bcrypt
- Rate limiting on API endpoints
- Input validation and sanitization
- CORS configuration
- Helmet for security headers
- MongoDB query sanitization
- CSRF protection for sensitive operations

## Real-time Features

### Socket.IO Events

#### Client Events
- `join-chat`: Join chat room for booking
- `send-message`: Send chat message
- `typing`: Send typing indicator
- `stop-typing`: Stop typing indicator
- `message-seen`: Mark message as seen

#### Server Events
- `new-message`: New message in chat
- `user-typing`: User is typing
- `user-stopped-typing`: User stopped typing
- `message-seen-update`: Message seen status updated

## Bugs and Issues

### Identified Issues

1. **File Upload Path Issue**: In `updateProfilePicture` function, using `process.cwd()` instead of relative path for ES modules
   - **Status**: Fixed - Changed to use `backend/uploads/${fileName}`

2. **Debug Logging in Mobile App**: Console.log statements in mobile screens for debugging purposes
   - **Location**: `mobile-frontend/screens/AvailableRequestsScreen.js`, `mobile-frontend/screens/ClientDashboardScreen.js`
   - **Impact**: Development logs in production
   - **Recommendation**: Remove console.log statements or use proper logging library

3. **Error Handling in Email Service**: Email sending failures don't fail the main request but are logged
   - **Location**: `backend/controllers/userFlowController.js` in `offerToProvider`
   - **Impact**: Silent email failures
   - **Recommendation**: Implement proper email retry mechanism or queue

4. **Reverse Geocoding Placeholder**: `reverseGeocode` function returns placeholder data
   - **Location**: `backend/controllers/userFlowController.js`
   - **Impact**: Location services not functional
   - **Recommendation**: Integrate with Google Maps API or similar service

5. **Inconsistent Status Values**: Different status enums across booking and service request models
   - **Impact**: Potential state synchronization issues
   - **Recommendation**: Standardize status values across all models

### Potential Issues

1. **Race Conditions**: Multiple providers accepting the same request simultaneously
2. **Memory Leaks**: Socket connections not properly cleaned up
3. **Rate Limiting**: May not be sufficient for high-traffic scenarios
4. **Database Indexes**: May need additional indexes for performance optimization

## Performance Considerations

### Database Optimization
- Aggregation pipelines used for complex queries
- Selective field projection to reduce data transfer
- Pagination implemented on list endpoints
- Indexes on frequently queried fields

### Caching Strategy
- No caching implemented currently
- Recommendation: Implement Redis for session storage and API response caching

### File Upload Optimization
- File size limits (5MB)
- File type validation
- Unique filename generation to prevent conflicts

## Possible Improvements

### High Priority

1. **Implement Caching Layer**
   - Redis for session management and API response caching
   - Improve performance for frequently accessed data

2. **Enhanced Error Monitoring**
   - Implement proper logging system (Winston, Morgan)
   - Add error tracking (Sentry)
   - Remove console.log statements from production code

3. **Email Service Reliability**
   - Implement email queue (Bull, Redis)
   - Add retry logic with exponential backoff
   - Email templates and better error handling

4. **Location Services**
   - Integrate Google Maps API for reverse geocoding
   - Add location-based search and filtering
   - Implement distance calculations

### Medium Priority

5. **Advanced Recommendation Engine**
   - Improve AI algorithms for better provider matching
   - Add collaborative filtering based on user behavior
   - Implement A/B testing for recommendation effectiveness

6. **Real-time Notifications**
   - Push notifications for mobile app
   - Email notifications for important events
   - In-app notification center

7. **Payment Integration**
   - Integrate payment gateway (Stripe, PayPal)
   - Escrow system for service payments
   - Commission fee collection

8. **Admin Analytics Enhancement**
   - More detailed analytics dashboard
   - Real-time metrics
   - Export functionality for reports

### Low Priority

9. **Multi-language Support**
   - Internationalization (i18n)
   - RTL language support
   - Localized date/time formatting

10. **Advanced Search and Filtering**
    - Full-text search capabilities
    - Advanced filtering options
    - Saved search functionality

11. **Mobile App Enhancements**
    - Offline functionality
    - Camera integration for proof of work
    - GPS location services

12. **API Documentation**
    - OpenAPI/Swagger documentation
    - API versioning strategy
    - Developer portal

## Deployment and DevOps

### Environment Setup
- Node.js 18+ required
- MongoDB database
- Redis recommended for caching
- Cloudinary for image storage

### Build and Deployment
- Separate build scripts for frontend and backend
- Environment-specific configurations
- Docker containerization recommended

### Monitoring
- Health check endpoints implemented
- Basic error logging
- No application performance monitoring currently

## Conclusion

SkillConnect is a well-architected skill-sharing platform with robust security, real-time features, and comprehensive functionality. The identified bugs are minor and have been addressed where possible. The suggested improvements focus on reliability, performance, and user experience enhancements.

The system demonstrates good separation of concerns, proper error handling, and scalable architecture suitable for a growing user base.
