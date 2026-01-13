# SkillConnect - Detailed Action Plan & Implementation Guide

**Document Type:** Implementation Roadmap  
**Created:** January 13, 2026  
**Status:** Active - Ready for Implementation

---

## 🚀 Quick Start: Critical Fixes (Do First!)

### ⚠️ CRITICAL: Database & Credential Rotation (DO THIS NOW - 30 mins)

```bash
# STEP 1: Backup current database
mongodump --uri="mongodb+srv://skillconnect:16FapDsSca9IcpV2@skillconnect4b410.lceuwef.mongodb.net/skillconnect"

# STEP 2: Generate new secrets
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# STEP 3: Create new MongoDB user in Atlas
# - Change password immediately
# - Rotate credentials

# STEP 4: Generate new JWT secrets
# Run above crypto command 2 times and update .env

# STEP 5: Update .env file with new credentials
# NEVER commit this change
```

### ⚠️ CRITICAL: Add .env to Git Ignore

```bash
# In backend directory
echo ".env" >> .gitignore
echo ".env.local" >> .gitignore

# Remove from git history (dangerous but necessary)
git rm --cached backend/.env
git commit -m "Remove .env from version control"
```

### ⚠️ CRITICAL: Update .env Template

Create `backend/.env.example`:
```dotenv
PORT=4000
MONGO_URI=mongodb+srv://[username]:[password]@[cluster].mongodb.net/skillconnect
JWT_SECRET_KEY=[generate with crypto.randomBytes(32).toString('hex')]
ADMIN_JWT_SECRET_KEY=[generate with crypto.randomBytes(32).toString('hex')]
JWT_EXPIRE=7d
COOKIE_EXPIRE=5
NODE_ENV=development
BASE_URL=http://localhost:4000/api/v1
FRONTEND_URL=http://localhost:5173
ALLOWED_ORIGINS=http://localhost:5173
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_EMAIL=[your-email@gmail.com]
SMTP_PASSWORD=[app-password-from-google]
REDIS_URL=redis://localhost:6379
SENTRY_DSN=
LOG_LEVEL=info
```

---

## 📋 Detailed Action Items by Priority

### PHASE 1: SECURITY & CRITICAL FIXES (Weeks 1-2)

#### 1. **Remove All Console.log Statements**

**Script to identify all console.log:**
```bash
grep -r "console\.log\|console\.error\|console\.warn" backend/ --include="*.js" | grep -v node_modules
```

**Files to clean up:**
- backend/controllers/adminFlowController.js (2 instances)
- backend/controllers/userController.js (5 instances)
- backend/middlewares/auth.js (6 instances)
- backend/server.js (multiple)
- backend/utils/ (various)

**Replacement pattern:**
```javascript
// BEFORE
console.log("User authenticated:", user._id);

// AFTER
logger.debug("User authenticated: ${user._id}");
```

**Implementation:**
```javascript
// Update all files with this pattern
const logger = require('./utils/logger.js');
// Replace console.log -> logger.info (info-level messages)
// Replace console.warn -> logger.warn
// Replace console.error -> logger.error  
// Keep debug logs but use logger.debug
```

---

#### 2. **Implement Comprehensive Input Validation**

**Create validation schema file:**

```javascript
// backend/validators/schemas.js
export const serviceRequestSchema = {
  name: {
    type: 'string',
    required: true,
    minLength: 3,
    maxLength: 100,
    pattern: /^[a-zA-Z0-9\s\-_.]+$/
  },
  address: {
    type: 'string',
    required: false,
    minLength: 5,
    maxLength: 200
  },
  phone: {
    type: 'string',
    pattern: /^[\+]?[1-9][\d]{0,15}$/
  },
  typeOfWork: {
    type: 'string',
    required: true,
    minLength: 2,
    maxLength: 50
  },
  // ... etc
};

// Usage in routes:
router.post('/service-request', 
  validateSchema(serviceRequestSchema),
  postServiceRequest
);
```

**Endpoints needing validation:**
- All POST endpoints (create operations)
- All PUT endpoints (update operations)
- All DELETE endpoints (delete operations)

---

#### 3. **Implement Rate Limiting**

**Create rate limit middleware:**

```javascript
// backend/middlewares/rateLimiter.js
import rateLimit from 'express-rate-limit';
import { getRedisClient } from '../utils/redis.js';
import RedisStore from 'rate-limit-redis';

// Auth endpoints - most strict
export const authLimiter = rateLimit({
  store: new RedisStore({
    client: getRedisClient(),
    prefix: 'rl:auth:'
  }),
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per window
  message: 'Too many login attempts',
  standardHeaders: true,
  legacyHeaders: false,
});

// API endpoints - moderate
export const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30,
  message: 'Too many requests'
});

// Sensitive operations - strict
export const sensitiveOperationLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 3,
  skipSuccessfulRequests: true
});
```

**Apply to routes:**
```javascript
// backend/routes/userAuthRouter.js
import { authLimiter } from '../middlewares/rateLimiter.js';

router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);
router.post('/forgot-password', authLimiter, forgotPassword);
```

---

#### 4. **Fix CORS Configuration**

**Update backend/app.js:**
```javascript
// BEFORE (vulnerable)
const allowedOrigins = (process.env.ALLOWED_ORIGINS || FRONTEND_URL)
  .split(",")
  .map(s => s.trim());

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
}));

// AFTER (secure)
const allowedOrigins = (process.env.ALLOWED_ORIGINS || FRONTEND_URL)
  .split(",")
  .map(s => s.trim())
  .filter(origin => {
    // In production, require HTTPS
    if (process.env.NODE_ENV === 'production') {
      return origin.startsWith('https://');
    }
    return true;
  });

// Validate environment-specific origins
if (process.env.NODE_ENV === 'production' && 
    allowedOrigins.some(o => o.includes('localhost'))) {
  throw new Error('localhost not allowed in production CORS config');
}

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('CORS blocked'));
    }
  },
  credentials: true,
  maxAge: 86400, // 24 hours
}));

// Set additional security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"], // Remove unsafe-inline in production
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      imgSrc: ["'self'", "data:", "https:"],
    }
  },
  hsts: { maxAge: 31536000, includeSubDomains: true },
  noSniff: true,
  xssFilter: true,
  referrerPolicy: { policy: "strict-origin-when-cross-origin" }
}));

// Set SameSite cookie
app.use(cookieParser());
app.use((req, res, next) => {
  const originalCookie = res.cookie.bind(res);
  res.cookie = function(name, val, options = {}) {
    if (!options.sameSite) {
      options.sameSite = 'Strict';
    }
    if (process.env.NODE_ENV === 'production') {
      options.secure = true; // HTTPS only
    }
    return originalCookie(name, val, options);
  };
  next();
});
```

---

#### 5. **Implement CSRF Token Protection**

**Create CSRF middleware:**
```javascript
// backend/middlewares/csrfProtection.js
import csrf from 'csurf';

const csrfProtection = csrf({ cookie: true });

// Middleware to generate CSRF token
export const generateCsrfToken = (req, res, next) => {
  res.locals.csrfToken = req.csrfToken();
  next();
};

// Middleware to verify CSRF token
export const verifyCsrfToken = csrfProtection;
```

**Apply to routes:**
```javascript
// Apply to all state-changing operations
router.post('/service-request', verifyCsrfToken, postServiceRequest);
router.put('/user/profile', verifyCsrfToken, updateProfile);
router.delete('/booking/:id', verifyCsrfToken, deleteBooking);
```

---

### PHASE 2: LOGGING & ERROR HANDLING (Weeks 2-3)

#### 1. **Replace All Console.log with Logger**

**Create comprehensive logger configuration:**

```javascript
// backend/utils/logger.js
import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';

const logger = winston.createLogger({
  defaultMeta: { service: 'skillconnect' },
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ 
      filename: 'logs/error.log', 
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    new winston.transports.File({ 
      filename: 'logs/combined.log',
      maxsize: 5242880,
      maxFiles: 5
    }),
    new DailyRotateFile({
      filename: 'logs/combined-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxDays: '14d'
    })
  ]
});

// Add console output in development
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }));
}

// Create request ID middleware
export const requestLogger = (req, res, next) => {
  const requestId = req.headers['x-request-id'] || generateId();
  req.id = requestId;
  
  logger.info('Incoming request', {
    requestId,
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userId: req.user?._id,
    timestamp: new Date().toISOString()
  });
  
  next();
};

export default logger;
```

**Update all controllers:**
```javascript
// BEFORE
console.log('User authenticated:', user._id);
console.error('Error updating booking:', error);

// AFTER  
logger.info('User authenticated', { userId: user._id, requestId: req.id });
logger.error('Error updating booking', { 
  error: error.message,
  stack: error.stack,
  bookingId,
  requestId: req.id 
});
```

---

#### 2. **Implement Structured Error Handling**

**Create error classification:**

```javascript
// backend/utils/errorCodes.js
export const ERROR_CODES = {
  // Authentication (1xxx)
  AUTH_FAILED: 'ERR_AUTH_FAILED_1001',
  TOKEN_INVALID: 'ERR_TOKEN_INVALID_1002',
  TOKEN_EXPIRED: 'ERR_TOKEN_EXPIRED_1003',
  INSUFFICIENT_PERMISSIONS: 'ERR_INSUFFICIENT_PERMISSIONS_1004',
  
  // Validation (2xxx)
  VALIDATION_FAILED: 'ERR_VALIDATION_FAILED_2001',
  INVALID_INPUT: 'ERR_INVALID_INPUT_2002',
  MISSING_REQUIRED_FIELD: 'ERR_MISSING_FIELD_2003',
  
  // Resource (3xxx)
  RESOURCE_NOT_FOUND: 'ERR_NOT_FOUND_3001',
  RESOURCE_ALREADY_EXISTS: 'ERR_ALREADY_EXISTS_3002',
  RESOURCE_CONFLICT: 'ERR_CONFLICT_3003',
  
  // Server (5xxx)
  INTERNAL_ERROR: 'ERR_INTERNAL_ERROR_5001',
  SERVICE_UNAVAILABLE: 'ERR_SERVICE_UNAVAILABLE_5002',
  DATABASE_ERROR: 'ERR_DATABASE_ERROR_5003',
};
```

**Update error middleware:**

```javascript
// backend/middlewares/error.js
export const errorMiddleware = (err, req, res, next) => {
  const requestId = req.id || 'unknown';
  
  // Log error with context
  logger.error('Request error', {
    requestId,
    errorCode: err.code || ERROR_CODES.INTERNAL_ERROR,
    message: err.message,
    path: req.path,
    method: req.method,
    userId: req.user?._id,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
  
  const statusCode = err.statusCode || 500;
  const errorCode = err.code || ERROR_CODES.INTERNAL_ERROR;
  
  // Determine safe message
  let safeMessage = "An error occurred";
  if (process.env.NODE_ENV === 'development') {
    safeMessage = err.message;
  } else {
    // Map error codes to safe messages
    const errorMessageMap = {
      [ERROR_CODES.AUTH_FAILED]: "Authentication failed",
      [ERROR_CODES.TOKEN_EXPIRED]: "Session expired. Please login again.",
      [ERROR_CODES.VALIDATION_FAILED]: "Invalid input provided",
      [ERROR_CODES.RESOURCE_NOT_FOUND]: "Resource not found",
      [ERROR_CODES.INTERNAL_ERROR]: "An internal error occurred",
    };
    safeMessage = errorMessageMap[errorCode] || "An error occurred";
  }
  
  res.status(statusCode).json({
    success: false,
    message: safeMessage,
    errorCode,
    requestId, // For debugging
    ...(process.env.NODE_ENV === 'development' && { details: err.message })
  });
};
```

---

#### 3. **Add Health Check Endpoint**

```javascript
// backend/routes/healthRouter.js
import express from 'express';
import { dbConnection } from '../database/dbConnection.js';
import { getRedisClient } from '../utils/redis.js';
import logger from '../utils/logger.js';

const router = express.Router();

router.get('/health', async (req, res) => {
  const health = {
    status: 'UP',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    checks: {}
  };
  
  // Check MongoDB
  try {
    // Attempt a simple query
    const db = mongoose.connection;
    health.checks.database = db.readyState === 1 ? 'UP' : 'DOWN';
  } catch (error) {
    health.checks.database = 'DOWN';
    health.status = 'DEGRADED';
  }
  
  // Check Redis
  try {
    const redisClient = getRedisClient();
    if (redisClient && redisClient.isOpen) {
      health.checks.redis = 'UP';
    } else {
      health.checks.redis = 'DOWN';
      health.status = 'DEGRADED';
    }
  } catch (error) {
    health.checks.redis = 'DOWN';
  }
  
  const statusCode = health.status === 'UP' ? 200 : 503;
  res.status(statusCode).json(health);
});

router.get('/ready', async (req, res) => {
  // Readiness check - can serve requests?
  try {
    // Quick database check
    await mongoose.connection.db.admin().ping();
    res.status(200).json({ ready: true });
  } catch (error) {
    res.status(503).json({ ready: false });
  }
});

export default router;
```

**Add to app.js:**
```javascript
import healthRouter from './routes/healthRouter.js';
app.use('/api/v1/health', healthRouter);
```

---

### PHASE 3: DATABASE & TRANSACTIONS (Weeks 3-4)

#### 1. **Implement Database Transactions**

**Example: Booking creation with transaction**

```javascript
// backend/controllers/userFlowController.js
import mongoose from 'mongoose';

export const createBooking = catchAsyncError(async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const { serviceRequestId, providerId } = req.body;
    
    // All operations within transaction
    const booking = await Booking.create(
      [{
        requester: req.user._id,
        provider: providerId,
        serviceRequest: serviceRequestId,
        status: "Pending",
        createdAt: new Date()
      }],
      { session }
    );
    
    // Update service request within same transaction
    await ServiceRequest.findByIdAndUpdate(
      serviceRequestId,
      { status: "Assigned", booking: booking[0]._id },
      { session, new: true }
    );
    
    // Update provider stats within same transaction
    await User.findByIdAndUpdate(
      providerId,
      { $inc: { totalJobsAssigned: 1 } },
      { session }
    );
    
    await session.commitTransaction();
    
    res.status(201).json({ success: true, booking: booking[0] });
  } catch (error) {
    await session.abortTransaction();
    logger.error('Transaction failed', { error: error.message });
    next(error);
  } finally {
    session.endSession();
  }
});
```

---

#### 2. **Add Database Indexes**

**Create index management script:**

```javascript
// backend/scripts/createIndexes.js
import mongoose from 'mongoose';
import User from '../models/userSchema.js';
import ServiceRequest from '../models/serviceRequest.js';
import Booking from '../models/booking.js';
import Chat from '../models/chat.js';

async function createIndexes() {
  try {
    // User indexes
    await User.collection.createIndex({ email: 1 }, { unique: true });
    await User.collection.createIndex({ username: 1 }, { unique: true });
    await User.collection.createIndex({ verified: 1 });
    await User.collection.createIndex({ role: 1 });
    await User.collection.createIndex({ skills: 1 });
    await User.collection.createIndex({ createdAt: -1 });
    
    // Service Request indexes
    await ServiceRequest.collection.createIndex({ requester: 1 });
    await ServiceRequest.collection.createIndex({ status: 1 });
    await ServiceRequest.collection.createIndex({ typeOfWork: 1 });
    await ServiceRequest.collection.createIndex({ expiresAt: 1 });
    await ServiceRequest.collection.createIndex(
      { requester: 1, status: 1, createdAt: -1 }
    );
    
    // Booking indexes
    await Booking.collection.createIndex({ requester: 1, status: 1 });
    await Booking.collection.createIndex({ provider: 1, status: 1 });
    await Booking.collection.createIndex({ createdAt: -1 });
    
    // Chat indexes
    await Chat.collection.createIndex({ participants: 1 });
    await Chat.collection.createIndex({ createdAt: -1 });
    await Chat.collection.createIndex({ appointmentId: 1 });
    
    console.log('✅ All indexes created successfully');
  } catch (error) {
    console.error('❌ Error creating indexes:', error);
    process.exit(1);
  }
}

// Run with: node backend/scripts/createIndexes.js
```

---

### PHASE 4: TESTING (Weeks 4-5)

#### 1. **Setup Testing Infrastructure**

**Create test configuration:**

```javascript
// backend/vitest.config.js
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      reporter: ['text', 'json', 'html'],
      include: ['controllers/**/*.js', 'utils/**/*.js', 'middlewares/**/*.js'],
      exclude: ['node_modules/', 'logs/'],
      lines: 80,
      functions: 80,
      branches: 80,
      statements: 80
    }
  }
});
```

#### 2. **Example Test Suite**

```javascript
// backend/controllers/__tests__/userController.test.js
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as userController from '../userController.js';
import User from '../../models/userSchema.js';

vi.mock('../../models/userSchema.js');

describe('User Controller', () => {
  describe('registerUser', () => {
    let req, res, next;
    
    beforeEach(() => {
      req = {
        body: {
          username: 'testuser',
          email: 'test@example.com',
          password: 'Test@123456',
          confirmPassword: 'Test@123456',
          firstName: 'Test',
          lastName: 'User',
          phone: '1234567890',
          address: '123 Test St',
          birthdate: '1990-01-01',
          role: 'Community Member'
        }
      };
      
      res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn().mockReturnThis()
      };
      
      next = vi.fn();
    });
    
    it('should register user with valid data', async () => {
      User.findOne = vi.fn().mockResolvedValue(null);
      User.create = vi.fn().mockResolvedValue({
        _id: '123',
        username: 'testuser',
        email: 'test@example.com'
      });
      
      await userController.registerUser(req, res, next);
      
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalled();
    });
    
    it('should reject if email already exists', async () => {
      User.findOne = vi.fn().mockResolvedValue({ email: 'test@example.com' });
      
      await userController.registerUser(req, res, next);
      
      expect(next).toHaveBeenCalled();
    });
    
    it('should reject if passwords do not match', async () => {
      req.body.confirmPassword = 'Different@123';
      
      await userController.registerUser(req, res, next);
      
      expect(next).toHaveBeenCalled();
    });
  });
});
```

---

### PHASE 5: SOCKET.IO & REAL-TIME IMPROVEMENTS (Week 5)

#### 1. **Fix Socket.io Broadcasting**

```javascript
// backend/server.js - Update WebSocket handling
const handleSocketConnection = (socket) => {
  socket.on('connect', () => {
    // Verify user
    const token = socket.handshake.auth.token;
    // ... verify token ...
    
    // Join user-specific room
    socket.join(`user:${userId}`);
    socket.join(`notifications:${userId}`);
    
    logger.info(`User ${userId} connected`, { socketId: socket.id });
  });
  
  socket.on('message', (data) => {
    // Send to specific user room instead of broadcast
    io.to(`user:${data.recipientId}`).emit('message', {
      from: socket.userId,
      content: data.message,
      timestamp: new Date()
    });
  });
  
  socket.on('disconnect', () => {
    socket.leave(`user:${socket.userId}`);
    logger.info(`User ${socket.userId} disconnected`);
  });
};
```

---

## 🔒 Security Hardening Checklist

- [ ] Rotate all credentials
- [ ] Remove secrets from code
- [ ] Implement rate limiting
- [ ] Fix CORS configuration
- [ ] Add CSRF protection
- [ ] Remove console.log statements
- [ ] Implement proper input validation
- [ ] Add transaction support
- [ ] Create database indexes
- [ ] Implement comprehensive logging
- [ ] Set up health checks
- [ ] Configure error handling
- [ ] Add security headers
- [ ] Implement 2FA
- [ ] Set up monitoring/alerts

---

## 📦 Deployment Checklist

- [ ] All environment variables in secrets manager
- [ ] Database backups configured
- [ ] Load balancing setup
- [ ] CDN configured for static assets
- [ ] Rate limiting configured
- [ ] Security headers set
- [ ] HTTPS enforced
- [ ] Monitoring and logging active
- [ ] Alerting configured
- [ ] Rollback procedure documented
- [ ] Health checks verified
- [ ] Database indexes created
- [ ] Caching strategy implemented

---

## 🎓 Learning Resources

For team members to understand implemented patterns:

1. **Security:**
   - [OWASP Cheat Sheets](https://cheatsheetseries.owasp.org/)
   - [Node.js Security Checklist](https://blog.risingstack.com/node-js-security-checklist/)

2. **Database:**
   - [MongoDB Transactions](https://docs.mongodb.com/manual/core/transactions/)
   - [Database Index Strategies](https://use-the-index-luke.com/)

3. **Testing:**
   - [Vitest Documentation](https://vitest.dev/)
   - [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)

4. **Architecture:**
   - [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices)
   - [Clean Code in JavaScript](https://www.educative.io/courses/clean-code-in-javascript)

---

## 📊 Progress Tracking

Use this template to track implementation progress:

```markdown
### Week 1 Progress
- [ ] Credential rotation (CRITICAL)
- [ ] Remove .env from git
- [ ] Remove console.log statements
- [ ] Implement rate limiting
- [ ] Fix CORS configuration

### Week 2 Progress
- [ ] Input validation implementation
- [ ] Logger configuration
- [ ] Error code implementation
- [ ] Health check endpoints
- [ ] CSRF protection

### Week 3 Progress
- [ ] Database transaction implementation
- [ ] Create database indexes
- [ ] Implement caching strategy
- [ ] Socket.io improvements
- [ ] 2FA implementation

### Week 4 Progress
- [ ] Test suite creation
- [ ] Documentation updates
- [ ] Code review process
- [ ] Monitoring setup
- [ ] Deployment automation

### Week 5+ Progress
- [ ] Payment integration
- [ ] Advanced features
- [ ] Performance optimization
- [ ] Scaling preparation
- [ ] Production hardening
```

---

## 🚨 Emergency Response Procedures

### If Credentials are Compromised

1. **Immediate (5 mins):**
   - Revoke all credentials
   - Rotate database passwords
   - Invalidate all existing JWT tokens
   - Alert security team

2. **Short-term (30 mins):**
   - Audit access logs
   - Check for data breaches
   - Generate new credentials
   - Update applications

3. **Medium-term (24 hours):**
   - Full security audit
   - Notify users if needed
   - Implement additional monitoring
   - Review security procedures

### If Deployment Fails

1. **Immediate:**
   - Rollback to previous version
   - Notify stakeholders
   - Begin post-mortem

2. **Investigation:**
   - Review deployment logs
   - Check for environment issues
   - Verify all configuration

3. **Prevent Recurrence:**
   - Add automated tests
   - Implement staged rollout
   - Add rollback automation

---

**This action plan should be reviewed and updated regularly as progress is made.**
