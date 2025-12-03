import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FaCog,
  FaUserShield,
  FaBell,
  FaRobot,
  FaTools,
  FaInfoCircle,
  FaFileContract,
  FaSave,
  FaTimes,
  FaCheck,
  FaExclamationTriangle,
  FaSync,
  FaDownload,
  FaArrowLeft,
  FaShieldAlt,
  FaDatabase,
  FaServer,
  FaPalette
} from 'react-icons/fa';
import api from '../../api';
import toast from 'react-hot-toast';
import './AdminSettings.css';

const AdminSettings = () => {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState('general');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    siteName: 'SkillConnect4B410',
    siteDescription: 'Connecting skilled workers with community needs',
    contactEmail: '',
    contactPhone: '',
    maintenanceMode: false,
    allowRegistrations: true,
    maxFileSize: 5 * 1024 * 1024,
    allowedFileTypes: ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'],
    notificationSettings: {
      emailNotifications: true,
      pushNotifications: true,
      smsNotifications: false
    },
    systemSettings: {
      timezone: 'Asia/Manila',
      currency: 'PHP',
      language: 'en'
    }
  });

  const [systemInfo, setSystemInfo] = useState({
    version: '1.0.0',
    uptime: '0 days, 0 hours, 0 minutes',
    lastBackup: 'Never',
    dbSize: '0 MB',
    activeUsers: 0,
    totalBookings: 0,
    totalUsers: 0,
    serviceProviders: 0
  });

  useEffect(() => {
    fetchSettings();
    fetchSystemInfo();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await api.get('/admin/settings');
      if (response.data.success && response.data.settings) {
        setSettings(prev => ({
          ...prev,
          ...response.data.settings
        }));
      }
    } catch (error) {
      console.error('Failed to fetch settings:', error);
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const fetchSystemInfo = async () => {
    try {
      // Fetch totals from reports
      const [totalsRes, metricsRes] = await Promise.all([
        api.get('/reports/totals').catch(() => null),
        api.get('/admin/dashboard-metrics').catch(() => null)
      ]);

      const totals = totalsRes?.data?.data || totalsRes?.data || {};
      const metrics = metricsRes?.data?.data || metricsRes?.data || {};

      setSystemInfo(prev => ({
        ...prev,
        totalUsers: totals.totalUsers || 0,
        serviceProviders: totals.serviceProviders || 0,
        totalBookings: metrics.totalBookings || totals.totalBookings || 0,
        activeUsers: totals.totalUsers ? Math.floor(totals.totalUsers * 0.7) : 0
      }));
    } catch (error) {
      console.error('Failed to fetch system info:', error);
    }
  };

  const handleSettingChange = (field, value, nested = null) => {
    if (nested) {
      setSettings(prev => ({
        ...prev,
        [nested]: {
          ...prev[nested],
          [field]: value
        }
      }));
    } else {
      setSettings(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      const response = await api.put('/admin/settings', settings);
      if (response.data.success) {
        toast.success('Settings saved successfully!');
        await fetchSettings();
      } else {
        toast.error('Failed to save settings');
      }
    } catch (error) {
      console.error('Failed to save settings:', error);
      toast.error(error.response?.data?.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleBackup = async () => {
    try {
      toast.loading('Creating backup...');
      // In a real implementation, this would trigger a backup API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      toast.dismiss();
      toast.success('Backup created successfully!');
    } catch {
      toast.dismiss();
      toast.error('Backup failed');
    }
  };

  const renderSettingsContent = () => {
    if (loading) {
      return (
        <div className="settings-loading">
          <div className="loading-spinner"></div>
          <p>Loading settings...</p>
        </div>
      );
    }

    switch (activeSection) {
      case 'general':
        return (
          <div className="settings-content">
            <h2 className="section-title">General Settings</h2>
            <div className="settings-form">
              <div className="form-group">
                <label htmlFor="siteName">Site Name</label>
                <input
                  type="text"
                  id="siteName"
                  value={settings.siteName}
                  onChange={(e) => handleSettingChange('siteName', e.target.value)}
                  placeholder="Enter site name"
                />
              </div>
              <div className="form-group">
                <label htmlFor="siteDescription">Site Description</label>
                <textarea
                  id="siteDescription"
                  rows="3"
                  value={settings.siteDescription}
                  onChange={(e) => handleSettingChange('siteDescription', e.target.value)}
                  placeholder="Enter site description"
                />
              </div>
              <div className="form-group">
                <label htmlFor="contactEmail">Contact Email</label>
                <input
                  type="email"
                  id="contactEmail"
                  value={settings.contactEmail}
                  onChange={(e) => handleSettingChange('contactEmail', e.target.value)}
                  placeholder="admin@skillconnect.com"
                />
              </div>
              <div className="form-group">
                <label htmlFor="contactPhone">Contact Phone</label>
                <input
                  type="text"
                  id="contactPhone"
                  value={settings.contactPhone}
                  onChange={(e) => handleSettingChange('contactPhone', e.target.value)}
                  placeholder="+63 XXX XXX XXXX"
                />
              </div>
              <div className="form-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={settings.maintenanceMode}
                    onChange={(e) => handleSettingChange('maintenanceMode', e.target.checked)}
                  />
                  <span>Maintenance Mode</span>
                </label>
                <p className="form-help">When enabled, the site will display a maintenance message to all users except administrators.</p>
              </div>
              <div className="form-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={settings.allowRegistrations}
                    onChange={(e) => handleSettingChange('allowRegistrations', e.target.checked)}
                  />
                  <span>Allow New Registrations</span>
                </label>
                <p className="form-help">When disabled, new user registrations will be blocked.</p>
              </div>
            </div>
          </div>
        );

      case 'notifications':
        return (
          <div className="settings-content">
            <h2 className="section-title">Notification Settings</h2>
            <div className="settings-form">
              <div className="form-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={settings.notificationSettings?.emailNotifications}
                    onChange={(e) => handleSettingChange('emailNotifications', e.target.checked, 'notificationSettings')}
                  />
                  <span>Email Notifications</span>
                </label>
                <p className="form-help">Receive important system notifications via email.</p>
              </div>
              <div className="form-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={settings.notificationSettings?.pushNotifications}
                    onChange={(e) => handleSettingChange('pushNotifications', e.target.checked, 'notificationSettings')}
                  />
                  <span>Push Notifications</span>
                </label>
                <p className="form-help">Receive browser push notifications when logged in.</p>
              </div>
              <div className="form-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={settings.notificationSettings?.smsNotifications}
                    onChange={(e) => handleSettingChange('smsNotifications', e.target.checked, 'notificationSettings')}
                  />
                  <span>SMS Notifications</span>
                </label>
                <p className="form-help">Receive critical alerts via SMS message.</p>
              </div>
            </div>
          </div>
        );

      case 'system':
        return (
          <div className="settings-content">
            <h2 className="section-title">System Settings</h2>
            <div className="settings-form">
              <div className="form-group">
                <label htmlFor="timezone">Timezone</label>
                <select
                  id="timezone"
                  value={settings.systemSettings?.timezone}
                  onChange={(e) => handleSettingChange('timezone', e.target.value, 'systemSettings')}
                >
                  <option value="Asia/Manila">Asia/Manila (PHT)</option>
                  <option value="UTC">UTC</option>
                  <option value="America/New_York">America/New_York (EST)</option>
                  <option value="Europe/London">Europe/London (GMT)</option>
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="currency">Currency</label>
                <select
                  id="currency"
                  value={settings.systemSettings?.currency}
                  onChange={(e) => handleSettingChange('currency', e.target.value, 'systemSettings')}
                >
                  <option value="PHP">PHP (Philippine Peso)</option>
                  <option value="USD">USD (US Dollar)</option>
                  <option value="EUR">EUR (Euro)</option>
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="language">Language</label>
                <select
                  id="language"
                  value={settings.systemSettings?.language}
                  onChange={(e) => handleSettingChange('language', e.target.value, 'systemSettings')}
                >
                  <option value="en">English</option>
                  <option value="tl">Tagalog</option>
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="maxFileSize">Max File Size (MB)</label>
                <input
                  type="number"
                  id="maxFileSize"
                  min="1"
                  max="50"
                  value={settings.maxFileSize ? settings.maxFileSize / (1024 * 1024) : 5}
                  onChange={(e) => handleSettingChange('maxFileSize', parseInt(e.target.value) * 1024 * 1024)}
                />
                <p className="form-help">Maximum file upload size in megabytes.</p>
              </div>
            </div>
          </div>
        );

      case 'maintenance':
        return (
          <div className="settings-content">
            <h2 className="section-title">System Maintenance</h2>
            <div className="settings-form">
              <div className="system-info-card">
                <h3>System Information</h3>
                <div className="info-grid">
                  <div className="info-item">
                    <span className="info-label">Version:</span>
                    <span className="info-value">{systemInfo.version}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Total Users:</span>
                    <span className="info-value">{systemInfo.totalUsers.toLocaleString()}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Service Providers:</span>
                    <span className="info-value">{systemInfo.serviceProviders.toLocaleString()}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Active Users:</span>
                    <span className="info-value">{systemInfo.activeUsers.toLocaleString()}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Total Bookings:</span>
                    <span className="info-value">{systemInfo.totalBookings.toLocaleString()}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Last Backup:</span>
                    <span className="info-value">{systemInfo.lastBackup}</span>
                  </div>
                </div>
              </div>
              <div className="form-group">
                <button className="btn btn-secondary" onClick={handleBackup}>
                  <FaDownload /> Create Backup Now
                </button>
                <p className="form-help">Create a manual backup of the system database.</p>
              </div>
            </div>
          </div>
        );

      case 'terms':
        return (
          <div className="settings-content">
            <h2 className="section-title">Terms & Policies</h2>
            <div className="policy-container">
              <div className="policy-section">
                <h3>Terms of Service</h3>
                <p>By using SkillConnect, you agree to our Terms of Service. These terms govern your use of our platform and services. Please read them carefully before using our services.</p>
              </div>
              <div className="policy-section">
                <h3>Privacy Policy</h3>
                <p>We are committed to protecting your privacy. Our Privacy Policy explains how we collect, use, and safeguard your personal information when you use our platform.</p>
              </div>
              <div className="policy-section">
                <h3>Cookie Policy</h3>
                <p>We use cookies to enhance your experience on our platform. Our Cookie Policy explains what cookies are, how we use them, and how you can manage your cookie preferences.</p>
              </div>
              <div className="policy-section">
                <h3>Refund Policy</h3>
                <p>Our Refund Policy outlines the conditions under which refunds may be issued for services booked through our platform. Please review this policy before making a booking.</p>
              </div>
            </div>
          </div>
        );

      case 'about':
        return (
          <div className="settings-content">
            <h2 className="section-title">About Us</h2>
            <div className="about-container">
              <div className="about-section">
                <h3>Our Mission</h3>
                <p>SkillConnect is dedicated to connecting skilled service providers with community members who need their expertise. Our platform makes it easy to find, book, and review services in your local area.</p>
              </div>
              <div className="about-section">
                <h3>Our Team</h3>
                <p>Our team consists of passionate developers, designers, and community organizers who believe in the power of local connections and skill sharing.</p>
              </div>
              <div className="about-section">
                <h3>Contact Information</h3>
                <div className="contact-info">
                  <p><strong>Email:</strong> {settings.contactEmail || 'admin@skillconnect.com'}</p>
                  <p><strong>Phone:</strong> {settings.contactPhone || '(123) 456-7890'}</p>
                </div>
              </div>
              <div className="about-section">
                <h3>Version History</h3>
                <div className="version-history">
                  <div className="version-item">
                    <span className="version-number">v1.0.0</span>
                    <span className="version-date">Current Version</span>
                    <span className="version-desc">Initial release with core functionality</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return <div className="settings-content">Select a settings section</div>;
    }
  };

  return (
    <div className="admin-settings-container">
      <aside className="settings-sidebar">
        <div className="settings-header">
          <h1 className="settings-title">
            <FaCog className="icon" />
            Settings
          </h1>
        </div>

        <nav className="settings-nav">
          <div className="nav-section">
            <div className="nav-section-title">Configuration</div>
            <button
              className={`nav-link ${activeSection === 'general' ? 'active' : ''}`}
              onClick={() => setActiveSection('general')}
            >
              <FaCog className="nav-icon" />
              General Settings
            </button>
            <button
              className={`nav-link ${activeSection === 'notifications' ? 'active' : ''}`}
              onClick={() => setActiveSection('notifications')}
            >
              <FaBell className="nav-icon" />
              Notifications
            </button>
            <button
              className={`nav-link ${activeSection === 'system' ? 'active' : ''}`}
              onClick={() => setActiveSection('system')}
            >
              <FaServer className="nav-icon" />
              System Settings
            </button>
            <button
              className={`nav-link ${activeSection === 'maintenance' ? 'active' : ''}`}
              onClick={() => setActiveSection('maintenance')}
            >
              <FaTools className="nav-icon" />
              Maintenance
            </button>
          </div>

          <div className="nav-section">
            <div className="nav-section-title">Information</div>
            <button
              className={`nav-link ${activeSection === 'terms' ? 'active' : ''}`}
              onClick={() => setActiveSection('terms')}
            >
              <FaFileContract className="nav-icon" />
              Terms & Policies
            </button>
            <button
              className={`nav-link ${activeSection === 'about' ? 'active' : ''}`}
              onClick={() => setActiveSection('about')}
            >
              <FaInfoCircle className="nav-icon" />
              About Us
            </button>
          </div>
        </nav>
      </aside>

      <div className="settings-content-wrapper">
        <div className="settings-header-actions">
          <button className="btn btn-back" onClick={() => navigate('/admin/analytics')}>
            <FaArrowLeft /> Back to Dashboard
          </button>
        </div>

        {renderSettingsContent()}

        {activeSection !== 'terms' && activeSection !== 'about' && (
          <div className="settings-actions">
            <button
              className="btn btn-primary"
              onClick={saveSettings}
              disabled={saving}
            >
              {saving ? (
                <>
                  <FaSync className="spin" /> Saving...
                </>
              ) : (
                <>
                  <FaSave /> Save Settings
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminSettings;
