import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'SkillConnect API',
      version: '1.0.0',
      description: 'Comprehensive API documentation for the SkillConnect platform - connecting service providers with customers through intelligent matchmaking and service management.',
      contact: {
        name: 'SkillConnect Development Team',
        email: 'dev@skillconnect.com',
        url: 'https://skillconnect.com'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: process.env.NODE_ENV === 'production'
          ? 'https://api.skillconnect.com/v1'
          : 'http://localhost:4000/api/v1',
        description: process.env.NODE_ENV === 'production' ? 'Production server' : 'Development server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT Authorization header using the Bearer scheme. Example: "Authorization: Bearer {token}"'
        },
        cookieAuth: {
          type: 'apiKey',
          in: 'cookie',
          name: 'token',
          description: 'Session cookie containing JWT token'
        }
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false
            },
            message: {
              type: 'string',
              example: 'Error description'
            },
            error: {
              type: 'object',
              description: 'Additional error details'
            }
          }
        },
        Success: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true
            },
            message: {
              type: 'string',
              example: 'Operation successful'
            },
            data: {
              type: 'object',
              description: 'Response data'
            }
          }
        },
        User: {
          type: 'object',
          properties: {
            _id: {
              type: 'string',
              example: '507f1f77bcf86cd799439011'
            },
            username: {
              type: 'string',
              example: 'john_doe'
            },
            firstName: {
              type: 'string',
              example: 'John'
            },
            lastName: {
              type: 'string',
              example: 'Doe'
            },
            email: {
              type: 'string',
              format: 'email',
              example: 'john.doe@example.com'
            },
            role: {
              type: 'string',
              enum: ['Community Member', 'Service Provider', 'Admin'],
              example: 'Service Provider'
            },
            skills: {
              type: 'array',
              items: {
                type: 'string'
              },
              example: ['plumbing', 'electrical']
            },
            averageRating: {
              type: 'number',
              minimum: 0,
              maximum: 5,
              example: 4.5
            },
            verified: {
              type: 'boolean',
              example: true
            },
            isOnline: {
              type: 'boolean',
              example: true
            }
          }
        },
        ServiceRequest: {
          type: 'object',
          properties: {
            _id: {
              type: 'string',
              example: '507f1f77bcf86cd799439011'
            },
            name: {
              type: 'string',
              example: 'Fix leaking faucet'
            },
            typeOfWork: {
              type: 'string',
              example: 'Plumbing'
            },
            address: {
              type: 'string',
              example: '123 Main St, City, State'
            },
            preferredDate: {
              type: 'string',
              format: 'date',
              example: '2024-01-15'
            },
            status: {
              type: 'string',
              enum: ['Open', 'Offered', 'Accepted', 'In Progress', 'Completed', 'Cancelled'],
              example: 'Open'
            },
            minBudget: {
              type: 'number',
              example: 50
            },
            maxBudget: {
              type: 'number',
              example: 150
            },
            requester: {
              $ref: '#/components/schemas/User'
            }
          }
        },
        SearchFilters: {
          type: 'object',
          properties: {
            q: {
              type: 'string',
              description: 'Full-text search query',
              example: 'plumbing repair'
            },
            skills: {
              type: 'array',
              items: {
                type: 'string'
              },
              description: 'Filter by skills (comma-separated)',
              example: ['plumbing', 'electrical']
            },
            location: {
              type: 'string',
              description: 'Filter by location',
              example: 'New York'
            },
            minRating: {
              type: 'number',
              minimum: 0,
              maximum: 5,
              description: 'Minimum rating filter',
              example: 4.0
            },
            maxRate: {
              type: 'number',
              description: 'Maximum hourly rate filter',
              example: 100
            },
            availability: {
              type: 'string',
              enum: ['Available', 'Currently Working', 'Not Available'],
              description: 'Availability status filter',
              example: 'Available'
            },
            verified: {
              type: 'boolean',
              description: 'Filter only verified providers',
              example: true
            },
            sortBy: {
              type: 'string',
              enum: ['averageRating', 'serviceRate', 'totalReviews', 'createdAt'],
              description: 'Sort field',
              example: 'averageRating'
            },
            sortOrder: {
              type: 'string',
              enum: ['asc', 'desc'],
              description: 'Sort order',
              example: 'desc'
            },
            page: {
              type: 'integer',
              minimum: 1,
              description: 'Page number',
              example: 1
            },
            limit: {
              type: 'integer',
              minimum: 1,
              maximum: 100,
              description: 'Items per page',
              example: 10
            }
          }
        }
      },
      parameters: {
        language: {
          name: 'Accept-Language',
          in: 'header',
          description: 'Language preference for localization (en, es, ar)',
          required: false,
          schema: {
            type: 'string',
            enum: ['en', 'es', 'ar'],
            default: 'en'
          }
        },
        page: {
          name: 'page',
          in: 'query',
          description: 'Page number for pagination',
          required: false,
          schema: {
            type: 'integer',
            minimum: 1,
            default: 1
          }
        },
        limit: {
          name: 'limit',
          in: 'query',
          description: 'Number of items per page',
          required: false,
          schema: {
            type: 'integer',
            minimum: 1,
            maximum: 100,
            default: 10
          }
        }
      }
    },
    security: [
      {
        bearerAuth: []
      },
      {
        cookieAuth: []
      }
    ],
    tags: [
      {
        name: 'Authentication',
        description: 'User authentication and authorization endpoints'
      },
      {
        name: 'Users',
        description: 'User profile management and information'
      },
      {
        name: 'Services',
        description: 'Service request and offer management'
      },
      {
        name: 'Search',
        description: 'Advanced search and filtering capabilities'
      },
      {
        name: 'Notifications',
        description: 'Push notifications and messaging'
      },
      {
        name: 'Reports',
        description: 'Analytics and reporting endpoints'
      },
      {
        name: 'Settings',
        description: 'System settings and configuration'
      },
      {
        name: 'Health',
        description: 'API health and status endpoints'
      }
    ],
    externalDocs: {
      description: 'Find more information about SkillConnect',
      url: 'https://skillconnect.com/docs'
    }
  },
  apis: [
    './routes/*.js',
    './controllers/*.js',
    './models/*.js'
  ]
};

const specs = swaggerJsdoc(options);

export { swaggerUi, specs };
