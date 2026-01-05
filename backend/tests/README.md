# Test Suite Documentation

## Overview

This test suite validates the SkillConnect platform's core functionality, including:
- Hybrid Recommendation Algorithm
- Admin Verification Flows
- Reporting and Analytics
- End-to-End User Workflows

## Test Structure

```
backend/tests/
├── setup.js                 # Test configuration and setup
├── recommendation.test.js   # Recommendation algorithm tests
└── verification.test.js     # Verification and reporting tests
```

## Prerequisites

1. **Node.js** >= 18.0.0
2. **MongoDB** running locally or accessible test database
3. **Test Database** configured (default: `mongodb://localhost:27017/skillconnect_test`)

## Installation

```bash
cd backend
npm install
```

## Running Tests

### Run All Tests

```bash
npm test
```

### Run Tests in Watch Mode

```bash
npm run test:watch
```

### Run Tests with Coverage

```bash
npm run test:coverage
```

### Run Specific Test File

```bash
npm test recommendation.test.js
npm test verification.test.js
```

## Test Database Setup

The tests use a separate test database to avoid affecting production data.

**Environment Variable:**
```bash
TEST_DB_URI=mongodb://localhost:27017/skillconnect_test
```

**Note:** The test database is automatically cleaned after each test run.

## Test Coverage

### Recommendation Algorithm Tests

- ✅ Content-based filtering
- ✅ Collaborative filtering
- ✅ Hybrid fusion algorithm
- ✅ Worker-to-request recommendations
- ✅ Edge cases (empty data, no matches, etc.)

### Verification Tests

- ✅ User verification workflow
- ✅ Certificate verification
- ✅ Work proof verification
- ✅ Report creation and management
- ✅ Report status updates

## Writing New Tests

### Test Template

```javascript
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';

describe('Feature Name', () => {
  beforeAll(async () => {
    // Setup before all tests
  });

  afterAll(async () => {
    // Cleanup after all tests
  });

  beforeEach(async () => {
    // Setup before each test
  });

  it('should do something', async () => {
    // Test implementation
    expect(result).toBe(expected);
  });
});
```

### Best Practices

1. **Isolation:** Each test should be independent
2. **Cleanup:** Always clean up test data
3. **Naming:** Use descriptive test names
4. **Assertions:** Use appropriate matchers
5. **Async:** Properly handle async operations

## Continuous Integration

Tests can be integrated into CI/CD pipelines:

```yaml
# Example GitHub Actions
- name: Run Tests
  run: |
    cd backend
    npm test
```

## Troubleshooting

### Tests Failing

1. Check MongoDB connection
2. Verify test database is accessible
3. Check environment variables
4. Review test logs for errors

### Database Connection Issues

```bash
# Check MongoDB is running
mongosh --eval "db.adminCommand('ping')"

# Verify test database URI
echo $TEST_DB_URI
```

### Common Issues

**Issue:** Tests timeout
**Solution:** Increase timeout in `vitest.config.js`

**Issue:** Database not cleaning up
**Solution:** Check `afterAll` hooks are executing

**Issue:** Import errors
**Solution:** Verify file paths and ES module syntax

## Coverage Goals

- **Current:** ~60%
- **Target:** 80%+
- **Critical Paths:** 100%

## Next Steps

1. Add integration tests for API endpoints
2. Add E2E tests with Playwright/Cypress
3. Add performance tests
4. Add security tests
5. Increase coverage to 80%+
