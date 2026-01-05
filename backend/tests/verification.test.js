/**
 * Tests for Admin Verification and Reporting Flows
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import User from '../models/userSchema.js';
import Admin from '../models/adminSchema.js';
import Certificate from '../models/certificate.js';
import WorkProof from '../models/workProof.js';
import Report from '../models/report.js';
import { verifyUser, getPendingCertificates, verifyCertificate, getPendingWorkProof, verifyWorkProof } from '../controllers/adminController.js';
import { reportUser, getReports, updateReportStatus } from '../controllers/reportsController.js';

const TEST_DB_URI = process.env.TEST_DB_URI || 'mongodb://localhost:27017/skillconnect_test';

describe('Admin Verification Flow', () => {
  let testAdmin;
  let testWorker;
  let testCertificate;
  let testWorkProof;

  beforeAll(async () => {
    await mongoose.connect(TEST_DB_URI);
  });

  afterAll(async () => {
    await User.deleteMany({ email: /test@/ });
    await Admin.deleteMany({ email: /test@/ });
    await Certificate.deleteMany({});
    await WorkProof.deleteMany({});
    await Report.deleteMany({});
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    // Create test admin
    testAdmin = await Admin.create({
      name: 'Test Admin',
      email: 'testadmin@test.com',
      password: 'Test123456',
      role: 'Admin'
    });

    // Create test worker
    testWorker = await User.create({
      username: 'testworker',
      firstName: 'Test',
      lastName: 'Worker',
      email: 'testworker@test.com',
      phone: '1234567890',
      address: 'Test Address',
      birthdate: new Date('1990-01-01'),
      role: 'Service Provider',
      skills: ['Plumbing'],
      verified: false,
      password: 'Test123456'
    });

    // Create test certificate
    testCertificate = await Certificate.create({
      provider: testWorker._id,
      title: 'Test Certificate',
      description: 'Test certificate description',
      certificateUrl: '/uploads/test-cert.jpg',
      verified: false
    });

    // Create test work proof
    testWorkProof = await WorkProof.create({
      provider: testWorker._id,
      title: 'Test Work Proof',
      description: 'Test work proof description',
      imageUrl: '/uploads/test-proof.jpg',
      serviceType: 'Plumbing',
      verified: false
    });
  });

  describe('User Verification', () => {
    it('should verify a worker account', async () => {
      const req = {
        params: { id: testWorker._id.toString() },
        admin: testAdmin
      };
      const res = {
        status: (code) => ({
          json: (data) => ({ statusCode: code, data })
        })
      };
      const next = () => {};

      await verifyUser(req, res, next);

      const updatedWorker = await User.findById(testWorker._id);
      expect(updatedWorker.verified).toBe(true);
      expect(updatedWorker.verifiedBy.toString()).toBe(testAdmin._id.toString());
    });

    it('should not verify already verified user', async () => {
      await User.findByIdAndUpdate(testWorker._id, { verified: true });

      const req = {
        params: { id: testWorker._id.toString() },
        admin: testAdmin
      };
      const res = {};
      const next = (error) => {
        expect(error.message).toContain('already verified');
      };

      await verifyUser(req, res, next);
    });
  });

  describe('Certificate Verification', () => {
    it('should get pending certificates', async () => {
      const req = {};
      const res = {
        status: (code) => ({
          json: (data) => ({ statusCode: code, data })
        })
      };
      const next = () => {};

      const result = await getPendingCertificates(req, res, next);
      expect(result.data.certificates.length).toBeGreaterThan(0);
    });

    it('should verify a certificate', async () => {
      const req = {
        params: { certificateId: testCertificate._id.toString() },
        admin: testAdmin
      };
      const res = {
        status: (code) => ({
          json: (data) => ({ statusCode: code, data })
        })
      };
      const next = () => {};

      await verifyCertificate(req, res, next);

      const updatedCertificate = await Certificate.findById(testCertificate._id);
      expect(updatedCertificate.verified).toBe(true);
      expect(updatedCertificate.verifiedBy.toString()).toBe(testAdmin._id.toString());
    });
  });

  describe('Work Proof Verification', () => {
    it('should get pending work proofs', async () => {
      const req = {};
      const res = {
        status: (code) => ({
          json: (data) => ({ statusCode: code, data })
        })
      };
      const next = () => {};

      const result = await getPendingWorkProof(req, res, next);
      expect(result.data.workProofs.length).toBeGreaterThan(0);
    });

    it('should verify work proof', async () => {
      const req = {
        params: { workProofId: testWorkProof._id.toString() },
        admin: testAdmin
      };
      const res = {
        status: (code) => ({
          json: (data) => ({ statusCode: code, data })
        })
      };
      const next = () => {};

      await verifyWorkProof(req, res, next);

      const updatedWorkProof = await WorkProof.findById(testWorkProof._id);
      expect(updatedWorkProof.verified).toBe(true);
      expect(updatedWorkProof.verifiedBy.toString()).toBe(testAdmin._id.toString());
    });
  });
});

describe('Reporting Flow', () => {
  let testReporter;
  let testReportedUser;
  let testReport;

  beforeAll(async () => {
    await mongoose.connect(TEST_DB_URI);
  });

  afterAll(async () => {
    await User.deleteMany({ email: /test@/ });
    await Report.deleteMany({});
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    testReporter = await User.create({
      username: 'testreporter',
      firstName: 'Test',
      lastName: 'Reporter',
      email: 'testreporter@test.com',
      phone: '1234567890',
      address: 'Test Address',
      birthdate: new Date('1990-01-01'),
      role: 'Community Member',
      password: 'Test123456'
    });

    testReportedUser = await User.create({
      username: 'testreported',
      firstName: 'Test',
      lastName: 'Reported',
      email: 'testreported@test.com',
      phone: '1234567891',
      address: 'Test Address',
      birthdate: new Date('1990-01-01'),
      role: 'Service Provider',
      password: 'Test123456'
    });
  });

  describe('User Reporting', () => {
    it('should create a report', async () => {
      const req = {
        body: {
          reportedUserId: testReportedUser._id.toString(),
          reason: 'Inappropriate behavior',
          description: 'Test description'
        },
        user: testReporter
      };
      const res = {
        status: (code) => ({
          json: (data) => ({ statusCode: code, data })
        })
      };
      const next = () => {};

      const result = await reportUser(req, res, next);
      expect(result.data.success).toBe(true);
      expect(result.data.report).toBeDefined();
    });

    it('should not allow self-reporting', async () => {
      const req = {
        body: {
          reportedUserId: testReporter._id.toString(),
          reason: 'Test reason'
        },
        user: testReporter
      };
      const res = {};
      const next = (error) => {
        expect(error.message).toContain('Cannot report yourself');
      };

      await reportUser(req, res, next);
    });

    it('should get reports with filters', async () => {
      // Create a report first
      testReport = await Report.create({
        reporter: testReporter._id,
        reportedUser: testReportedUser._id,
        reason: 'Test reason',
        description: 'Test description',
        status: 'pending'
      });

      const req = {
        query: {
          status: 'pending',
          page: 1,
          limit: 10
        }
      };
      const res = {
        status: (code) => ({
          json: (data) => ({ statusCode: code, data })
        })
      };
      const next = () => {};

      const result = await getReports(req, res, next);
      expect(result.data.reports.length).toBeGreaterThan(0);
      expect(result.data.pagination).toBeDefined();
    });

    it('should update report status', async () => {
      const report = await Report.create({
        reporter: testReporter._id,
        reportedUser: testReportedUser._id,
        reason: 'Test reason',
        status: 'pending'
      });

      const req = {
        params: { reportId: report._id.toString() },
        body: { status: 'resolved' }
      };
      const res = {
        status: (code) => ({
          json: (data) => ({ statusCode: code, data })
        })
      };
      const next = () => {};

      const result = await updateReportStatus(req, res, next);
      expect(result.data.success).toBe(true);
      expect(result.data.report.status).toBe('resolved');
    });
  });
});
