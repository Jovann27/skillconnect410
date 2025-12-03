import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api.js';
import { useMainContext } from '../../mainContext';
import './settings.css';

const Settings = () => {
  const { setUser, logout } = useMainContext();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [passwordLength, setPasswordLength] = useState(0);
  const [isEditingPassword, setIsEditingPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [editingField, setEditingField] = useState(null);
  const [draftValue, setDraftValue] = useState('');
  const [activeSection, setActiveSection] = useState('profile');
  const [formData, setFormData] = useState({
    username: '',
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
  });
  const [notificationPreferences, setNotificationPreferences] = useState({
    emailNotifications: true,
    smsNotifications: false,
    pushNotifications: true,
  });
  const fileInputRef = useRef(null);
  const navigate = useNavigate();

  const fetchUserProfile = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get('/user/me');
      if (response.data.success) {
        const userData = response.data.user;
        setUser(userData);
        setFormData({
          username: userData.username || '',
          firstName: userData.firstName || '',
          lastName: userData.lastName || '',
          email: userData.email || '',
          phone: userData.phone || '',
        });
      }
    } catch (err) {
      setError('Failed to fetch profile data');
      console.error('Error fetching profile:', err);
    } finally {
      setLoading(false);
    }
  }, [setUser]);

  const fetchPasswordLength = useCallback(async () => {
    try {
      const res = await api.get("/user/me/password");
      if (res.data.success) setPasswordLength(res.data.length);
    } catch (err) {
      console.error("Failed to fetch password length:", err);
    }
  }, []);

  const fetchNotificationPreferences = useCallback(async () => {
    try {
      const res = await api.get("/user/notification-preferences");
      if (res.data.success) {
        const prefs = res.data.preferences;
        setNotificationPreferences({
          emailNotifications: prefs.emailNotifications,
          smsNotifications: prefs.smsNotifications,
          pushNotifications: prefs.pushNotifications,
        });
      }
    } catch (err) {
      console.error("Failed to fetch notification preferences:", err);
    }
  }, []);

  useEffect(() => {
    fetchUserProfile();
    fetchPasswordLength();
    fetchNotificationPreferences();
  }, [fetchUserProfile, fetchPasswordLength, fetchNotificationPreferences]);


  const maskPhone = (value = '') => value ? value.replace(/.(?=.{4})/g, '*') : '';
  const maskEmail = (value = '') => {
    if (!value.includes('@')) return value;
    const [local, domain] = value.split('@');
    if (!local) return value;
    const visible = local.slice(0, 2);
    return `${visible}${local.length > 2 ? '***' : ''}@${domain}`;
  };

  const startFieldEdit = (field) => {
    setEditingField(field);
    setDraftValue(formData[field] || '');
    setError('');
    setSuccess('');
  };

  const cancelFieldEdit = () => {
    setEditingField(null);
    setDraftValue('');
  };

  const handleFieldSave = async () => {
    if (!editingField) return;
    if (!draftValue.trim()) {
      setError('Value cannot be empty.');
      return;
    }
    try {
      setSaving(true);
      setError('');
      setSuccess('');
      const payload = { [editingField]: draftValue.trim() };
      const response = await api.put('/user/update-profile', payload);
      if (response.data.success) {
        setUser(response.data.user);
        setFormData(prev => ({ ...prev, [editingField]: draftValue.trim() }));
        setSuccess(`${editingField === 'phone' ? 'Phone number' : 'Email'} updated successfully.`);
        cancelFieldEdit();
      } else {
        setError('Failed to update profile');
      }
    } catch (err) {
      console.error('Error updating profile:', err);
      setError('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordUpdate = async () => {
    try {
      const res = await api.put('/user/password/update', { newPassword });
      if (res.data.success) {
        setSuccess('Password updated successfully');
        setIsEditingPassword(false);
        setPasswordLength(newPassword.length);
        setNewPassword('');
      } else {
        setError('Failed to update password');
      }
    } catch (err) {
      console.error('Error updating password:', err);
      setError('Error updating password');
    }
  };
  
  const maskPassword = (length) => '*'.repeat(length || 0);

  const handleProfilePicSelect = () => {
    fileInputRef.current?.click();
  };

  const onProfilePicChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      setSaving(true);
      setError('');
      setSuccess('');
      const data = new FormData();
      data.append('profilePic', file);
      const response = await api.put('/user/update-profile', data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (response.data.success) {
        setUser(response.data.user);
        setSuccess('Profile picture updated.');
      } else {
        setError('Failed to update profile picture');
      }
    } catch (err) {
      console.error('Profile picture update failed:', err);
      setError('Failed to update profile picture');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveNotificationPreferences = async () => {
    try {
      setSaving(true);
      setError('');
      setSuccess('');
      const response = await api.put('/user/notification-preferences', notificationPreferences);
      if (response.data.success) {
        setSuccess('Notification preferences updated successfully.');
      } else {
        setError('Failed to update notification preferences');
      }
    } catch (err) {
      console.error('Error updating notification preferences:', err);
      setError('Failed to update notification preferences');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  if (loading) return <p>Loading...</p>;

  const accountNav = [
    { label: "Profile", icon: "👤", key: "profile" },
    { label: "Notification", icon: "🔔", key: "notifications" }
  ];

  const aboutNav = [
    { label: "Terms & Policies", icon: "📝", key: "terms" },
    { label: "About us", icon: "ℹ️", key: "about" }
  ];

  return (
    <div className="settings-shell">
      <aside className="settings-shell__sidebar">
        <div className="settings-shell__group">
          <p className="settings-shell__title">Account</p>
          {accountNav.map(item => (
            <button
              key={item.key}
              className={`settings-shell__link ${activeSection === item.key ? 'is-active' : ''}`}
              onClick={() => setActiveSection(item.key)}
              type="button"
            >
              <span>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </div>

        <div className="settings-shell__group">
          <p className="settings-shell__title">About</p>
          {aboutNav.map(item => (
            <button
              key={item.key}
              className={`settings-shell__link ${activeSection === item.key ? 'is-active' : ''}`}
              onClick={() => setActiveSection(item.key)}
              type="button"
            >
              <span>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </div>

        <button className="settings-shell__logout" type="button" onClick={handleLogout}>
          Log Out ⏻
        </button>
      </aside>

      <main className="settings-shell__content">
        <header className="settings-profile-header">
          <h1>{activeSection === 'profile' ? 'Profile' : activeSection === 'notifications' ? 'Notifications' : activeSection === 'terms' ? 'Terms & Policies' : 'About SkillConnect'}</h1>
        </header>

        {error && <p className="error-text">{error}</p>}
        {success && <p className="success-text">{success}</p>}

        {activeSection === 'profile' && (
          <section className="settings-profile-card">
            <div className="profile-row">
              <div className="profile-label">First Name</div>
              <div className="profile-value">{formData.firstName}</div>
            </div>
            <div className="profile-row">
              <div className="profile-label">Last Name</div>
              <div className="profile-value">{formData.lastName}</div>
            </div>
            <div className="profile-row editable">
              <div className="profile-label">Phone</div>
              {editingField === 'phone' ? (
                <div className="profile-inline-editor">
                  <input
                    type="tel"
                    value={draftValue}
                    onChange={(e) => setDraftValue(e.target.value)}
                    placeholder="+63 900 000 0000"
                  />
                  <div className="profile-inline-actions">
                    <button type="button" onClick={handleFieldSave} disabled={saving}>
                      Save
                    </button>
                    <button type="button" onClick={cancelFieldEdit} disabled={saving}>
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="profile-value">{maskPhone(formData.phone)}</div>
                  <button type="button" className="profile-action" onClick={() => startFieldEdit('phone')}>
                    Change
                  </button>
                </>
              )}
            </div>
            <div className="profile-row editable">
              <div className="profile-label">Email</div>
              {editingField === 'email' ? (
                <div className="profile-inline-editor">
                  <input
                    type="email"
                    value={draftValue}
                    onChange={(e) => setDraftValue(e.target.value)}
                    placeholder="name@email.com"
                  />
                  <div className="profile-inline-actions">
                    <button type="button" onClick={handleFieldSave} disabled={saving}>
                      Save
                    </button>
                    <button type="button" onClick={cancelFieldEdit} disabled={saving}>
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="profile-value">{maskEmail(formData.email)}</div>
                  <button type="button" className="profile-action" onClick={() => startFieldEdit('email')}>
                    Change
                  </button>
                </>
              )}
            </div>
            <div className="profile-row editable">
              <div className="profile-label">Password</div>
              <div className="profile-value">{maskPassword(passwordLength)}</div>
              <button
                type="button"
                className="profile-action"
                onClick={() => setIsEditingPassword(true)}
              >
                Change
              </button>
            </div>
            <div className="profile-row editable">
              <div className="profile-label">Profile picture</div>
              <div className="profile-value">profilepicture.jpg</div>
              <button type="button" className="profile-action" onClick={handleProfilePicSelect}>
                Update
              </button>
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                style={{ display: 'none' }}
                onChange={onProfilePicChange}
              />
            </div>
            <div className="profile-row accent">
              <div className="profile-label">Account</div>
              <button type="button" className="profile-action delete">
                Delete Account
              </button>
            </div>
          </section>
        )}

        {activeSection === 'notifications' && (
          <section className="settings-card">
            <h2>Notification Preferences</h2>
            <p>Manage how we keep you updated about service requests and account activity.</p>
            <div className="toggle-row">
              <label>
                <input
                  type="checkbox"
                  checked={notificationPreferences.emailNotifications}
                  onChange={(e) => setNotificationPreferences(prev => ({ ...prev, emailNotifications: e.target.checked }))}
                />
                Email reminders
              </label>
              <p className="option-description">Receive service request confirmations, updates, and important account notifications via email.</p>
            </div>
            <div className="toggle-row">
              <label>
                <input
                  type="checkbox"
                  checked={notificationPreferences.smsNotifications}
                  onChange={(e) => setNotificationPreferences(prev => ({ ...prev, smsNotifications: e.target.checked }))}
                />
                SMS alerts
              </label>
              <p className="option-description">Get urgent notifications about service request changes and service updates via text message.</p>
            </div>
            <div className="toggle-row">
              <label>
                <input
                  type="checkbox"
                  checked={notificationPreferences.pushNotifications}
                  onChange={(e) => setNotificationPreferences(prev => ({ ...prev, pushNotifications: e.target.checked }))}
                />
                Push notifications
              </label>
              <p className="option-description">Receive instant notifications on your device for new messages, service requests, and updates.</p>
            </div>
            <button className="primary-btn" type="button" onClick={handleSaveNotificationPreferences} disabled={saving}>
              {saving ? 'Saving...' : 'Save Preferences'}
            </button>
          </section>
        )}

        {activeSection === 'terms' && (
          <section className="settings-card">
            <h2>Terms & Policies</h2>
            <p>Please review our latest terms of service and privacy practices.</p>
            <button className="primary-btn" type="button" onClick={() => navigate('/terms')}>
              View Terms & Policies
            </button>
          </section>
        )}

        {activeSection === 'about' && (
          <section className="settings-card">
            <h2>About SkillConnect</h2>
            <p>Learn how we connect trusted service providers with the community.</p>
            <button className="primary-btn" type="button" onClick={() => navigate('/about')}>
              Visit About Page
            </button>
          </section>
        )}

        {isEditingPassword && (
          <div className="settings-password-modal">
            <div className="password-modal__card">
              <h3>Update Password</h3>
              <input
                type="password"
                placeholder="Enter new password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
              <div className="password-modal__actions">
                <button type="button" onClick={() => {
                  setIsEditingPassword(false); setNewPassword('');
                }}>Cancel</button>
                <button
                  type="button"
                  disabled={!newPassword}
                  onClick={handlePasswordUpdate}
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Settings;
