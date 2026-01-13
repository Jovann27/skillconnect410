import * as Sentry from '@sentry/node';
import logger from './logger.js';

// Initialize Sentry
export const initializeSentry = () => {
  if (process.env.SENTRY_DSN) {
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      environment: process.env.NODE_ENV || 'development',
      integrations: [
        // HTTP integration for automatic instrumentation
        new Sentry.Integrations.Http({ tracing: true }),
        // MongoDB integration
        new Sentry.Integrations.Mongo(),
        // Express integration
        new Sentry.Integrations.Express({ app: null }),
      ],
      // Performance monitoring
      tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
      // Capture console logs as breadcrumbs
      beforeBreadcrumb(breadcrumb, hint) {
        if (breadcrumb.category === 'console') {
          return null; // Filter out console breadcrumbs since we use Winston
        }
        return breadcrumb;
      },
      // Filter out health check endpoints
      beforeSend(event, hint) {
        // Don't send events for health check endpoints
        if (event.request?.url?.includes('/api/v1/ping')) {
          return null;
        }
        return event;
      },
    });

    logger.info('Sentry initialized successfully');
  } else {
    logger.warn('SENTRY_DSN not provided, Sentry will not be initialized');
  }
};

// Middleware for Express error handling
export const sentryErrorHandler = Sentry.Handlers.errorHandler({
  shouldHandleError: (error) => {
    // Don't report 4xx errors as they're client errors
    return error.status >= 500;
  },
});

// Middleware for request handling
export const sentryRequestHandler = Sentry.Handlers.requestHandler({
  shouldCreateTransactionForRequest: (req) => {
    // Only create transactions for API requests
    return req.url?.startsWith('/api/');
  },
});

// Capture exceptions manually
export const captureException = (error, context = {}) => {
  if (process.env.SENTRY_DSN) {
    Sentry.withScope((scope) => {
      if (context.user) {
        scope.setUser({
          id: context.user.id,
          email: context.user.email,
          role: context.user.role,
        });
      }
      if (context.tags) {
        Object.keys(context.tags).forEach((key) => {
          scope.setTag(key, context.tags[key]);
        });
      }
      if (context.extra) {
        Object.keys(context.extra).forEach((key) => {
          scope.setExtra(key, context.extra[key]);
        });
      }
      Sentry.captureException(error);
    });
  }

  // Always log to Winston
  logger.error('Exception captured:', {
    error: error.message,
    stack: error.stack,
    context,
  });
};

// Capture messages
export const captureMessage = (message, level = 'info', context = {}) => {
  if (process.env.SENTRY_DSN) {
    Sentry.withScope((scope) => {
      scope.setLevel(level);
      if (context.tags) {
        Object.keys(context.tags).forEach((key) => {
          scope.setTag(key, context.tags[key]);
        });
      }
      Sentry.captureMessage(message);
    });
  }

  // Log to Winston
  logger.log(level, message, context);
};

// Performance monitoring
export const startTransaction = (name, op) => {
  if (process.env.SENTRY_DSN) {
    return Sentry.startTransaction({
      name,
      op,
    });
  }
  return null;
};

export default Sentry;
