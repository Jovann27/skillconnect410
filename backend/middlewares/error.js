import logger from "../utils/logger.js";

// Pattern 6: Graceful Error Handling with Logging
class ErrorHandler extends Error {
  constructor(message, statusCode, context = {}) {
    super(message);
    this.statusCode = statusCode;
    this.context = context; // For logging context
    this.timestamp = new Date().toISOString();
  }
}

export const errorMiddleware = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.message = err.message || "Internal Server Error";

  // Log error with context
  const errorLog = {
    timestamp: err.timestamp || new Date().toISOString(),
    statusCode: err.statusCode,
    message: err.message,
    url: req.originalUrl,
    method: req.method,
    userId: req.user?.id || "anonymous",
    context: err.context || {},
    stack: process.env.NODE_ENV === "development" ? err.stack : undefined
  };

  logger.error("Request Error", errorLog);

  // Send response
  res.status(err.statusCode).json({
    success: false,
    message: err.message,
    error: process.env.NODE_ENV === "development" ? err : undefined
  });
};

export default ErrorHandler;
