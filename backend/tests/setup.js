/**
 * Test Setup and Configuration
 */

import { beforeAll, afterAll } from 'vitest';
import mongoose from 'mongoose';

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET_KEY = 'test-secret-key';
process.env.JWT_EXPIRE = '7d';
process.env.TEST_DB_URI = process.env.TEST_DB_URI || 'mongodb://localhost:27017/skillconnect_test';

// Global test setup
beforeAll(async () => {
  // Connect to test database
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(process.env.TEST_DB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
  }
});

// Global test teardown
afterAll(async () => {
  // Close database connection
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close();
  }
});

// Suppress console errors during tests
const originalError = console.error;
beforeAll(() => {
  console.error = (...args) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('Warning:')
    ) {
      return;
    }
    originalError.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
});
