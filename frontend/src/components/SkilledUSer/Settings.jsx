import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api.js';
import { useMainContext } from '../../mainContext';

const Settings = () => {
  const { setUser } = useMainContext();
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const accountNav = [
    { label: "Profile", icon: "👤", key: "profile" },
    { label: "Notification", icon: "🔔", key: "notifications" }
  ];

  const aboutNav = [
    { label: "Terms & Policies", icon: "📝", key: "terms" },
    { label: "About us", icon: "ℹ️", key: "about" }
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <aside className="w-64 bg-white shadow-lg">
        <div className="p-6">
          <div className="mb-8">
            <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Account</p>
            <nav className="space-y-2">
              {accountNav.map(item => (
                <button
                  key={item.key}
                  className={`w-full flex items-center space-x-3 px-4 py-3 text-left rounded-lg transition-colors duration-200 ${
                    activeSection === item.key
                      ? 'bg-blue-100 text-blue-700 border-r-4 border-blue-500'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                  onClick={() => setActiveSection(item.key)}
                  type="button"
                >
                  <span className="text-lg">{item.icon}</span>
                  <span className="font-medium">{item.label}</span>
                </button>
              ))}
            </nav>
          </div>

          <div className="mb-8">
            <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">About</p>
            <nav className="space-y-2">
              {aboutNav.map(item => (
                <button
                  key={item.key}
                  className={`w-full flex items-center space-x-3 px-4 py-3 text-left rounded-lg transition-colors duration-200 ${
                    activeSection === item.key
                      ? 'bg-blue-100 text-blue-700 border-r-4 border-blue-500'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                  onClick={() => setActiveSection(item.key)}
                  type="button"
                >
                  <span className="text-lg">{item.icon}</span>
                  <span className="font-medium">{item.label}</span>
                </button>
              ))}
            </nav>
          </div>
        </div>
      </aside>

      <main className="flex-1 p-8">
        <div className="max-w-4xl mx-auto">
          <header className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">
              {activeSection === 'profile' ? 'Profile' : activeSection === 'notifications' ? 'Notifications' : activeSection === 'terms' ? 'Terms & Policies' : 'About SkillConnect'}
            </h1>
          </header>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
              {error}
            </div>
          )}
          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-6">
              {success}
            </div>
          )}

          {activeSection === 'profile' && (
            <section className="space-y-6">
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-6">Personal Information</h2>
                <div className="space-y-4">
                  <div className="flex justify-between items-center py-3 border-b border-gray-100">
                    <span className="font-medium text-gray-700">First Name</span>
                    <span className="text-gray-900">{formData.firstName}</span>
                  </div>
                  <div className="flex justify-between items-center py-3 border-b border-gray-100">
                    <span className="font-medium text-gray-700">Last Name</span>
                    <span className="text-gray-900">{formData.lastName}</span>
                  </div>
                  <div className="flex justify-between items-center py-3 border-b border-gray-100">
                    <span className="font-medium text-gray-700">Phone</span>
                    {editingField === 'phone' ? (
                      <div className="flex items-center space-x-2">
                        <input
                          type="tel"
                          value={draftValue}
                          onChange={(e) => setDraftValue(e.target.value)}
                          placeholder="+63 900 000 0000"
                          className="px-3 py-1 border border-gray-300 rounded text-sm"
                        />
                        <button
                          type="button"
                          onClick={handleFieldSave}
                          disabled={saving}
                          className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={cancelFieldEdit}
                          disabled={saving}
                          className="px-3 py-1 bg-gray-600 text-white text-sm rounded hover:bg-gray-700"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <span className="text-gray-900">{maskPhone(formData.phone)}</span>
                        <button
                          type="button"
                          className="text-blue-600 hover:text-blue-800 text-sm underline"
                          onClick={() => startFieldEdit('phone')}
                        >
                          Change
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="flex justify-between items-center py-3 border-b border-gray-100">
                    <span className="font-medium text-gray-700">Email</span>
                    {editingField === 'email' ? (
                      <div className="flex items-center space-x-2">
                        <input
                          type="email"
                          value={draftValue}
                          onChange={(e) => setDraftValue(e.target.value)}
                          placeholder="name@email.com"
                          className="px-3 py-1 border border-gray-300 rounded text-sm"
                        />
                        <button
                          type="button"
                          onClick={handleFieldSave}
                          disabled={saving}
                          className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={cancelFieldEdit}
                          disabled={saving}
                          className="px-3 py-1 bg-gray-600 text-white text-sm rounded hover:bg-gray-700"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <span className="text-gray-900">{maskEmail(formData.email)}</span>
                        <button
                          type="button"
                          className="text-blue-600 hover:text-blue-800 text-sm underline"
                          onClick={() => startFieldEdit('email')}
                        >
                          Change
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="flex justify-between items-center py-3 border-b border-gray-100">
                    <span className="font-medium text-gray-700">Password</span>
                    <div className="flex items-center space-x-2">
                      <span className="text-gray-900 font-mono">{maskPassword(passwordLength)}</span>
                      <button
                        type="button"
                        className="text-blue-600 hover:text-blue-800 text-sm underline"
                        onClick={() => setIsEditingPassword(true)}
                      >
                        Change
                      </button>
                    </div>
                  </div>
                  <div className="flex justify-between items-center py-3 border-b border-gray-100">
                    <span className="font-medium text-gray-700">Profile Picture</span>
                    <div className="flex items-center space-x-2">
                      <span className="text-gray-600 text-sm">profilepicture.jpg</span>
                      <button
                        type="button"
                        className="text-blue-600 hover:text-blue-800 text-sm underline"
                        onClick={handleProfilePicSelect}
                      >
                        Update
                      </button>
                      <input
                        type="file"
                        ref={fileInputRef}
                        accept="image/*"
                        className="hidden"
                        onChange={onProfilePicChange}
                      />
                    </div>
                  </div>
                  <div className="flex justify-between items-center py-3">
                    <span className="font-medium text-gray-700">Account</span>
                    <button
                      type="button"
                      className="text-red-600 hover:text-red-800 text-sm underline"
                    >
                      Delete Account
                    </button>
                  </div>
                </div>
              </div>
            </section>
          )}

          {activeSection === 'notifications' && (
            <section className="space-y-6">
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-2">Notification Preferences</h2>
                <p className="text-gray-600 mb-6">Manage how we keep you updated about service requests and account activity.</p>

                <div className="space-y-6">
                  <div className="flex items-start space-x-3">
                    <input
                      type="checkbox"
                      id="email-notifications"
                      checked={notificationPreferences.emailNotifications}
                      onChange={(e) => setNotificationPreferences(prev => ({ ...prev, emailNotifications: e.target.checked }))}
                      className="mt-1 w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <div>
                      <label htmlFor="email-notifications" className="font-medium text-gray-900 cursor-pointer">Email reminders</label>
                      <p className="text-sm text-gray-600">Receive service request confirmations, updates, and important account notifications via email.</p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <input
                      type="checkbox"
                      id="sms-notifications"
                      checked={notificationPreferences.smsNotifications}
                      onChange={(e) => setNotificationPreferences(prev => ({ ...prev, smsNotifications: e.target.checked }))}
                      className="mt-1 w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <div>
                      <label htmlFor="sms-notifications" className="font-medium text-gray-900 cursor-pointer">SMS alerts</label>
                      <p className="text-sm text-gray-600">Get urgent notifications about service request changes and service updates via text message.</p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <input
                      type="checkbox"
                      id="push-notifications"
                      checked={notificationPreferences.pushNotifications}
                      onChange={(e) => setNotificationPreferences(prev => ({ ...prev, pushNotifications: e.target.checked }))}
                      className="mt-1 w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <div>
                      <label htmlFor="push-notifications" className="font-medium text-gray-900 cursor-pointer">Push notifications</label>
                      <p className="text-sm text-gray-600">Receive instant notifications on your device for new messages, service requests, and updates.</p>
                    </div>
                  </div>
                </div>

                <button
                  className="mt-6 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-lg transition-colors duration-200 disabled:opacity-50"
                  type="button"
                  onClick={handleSaveNotificationPreferences}
                  disabled={saving}
                >
                  {saving ? 'Saving...' : 'Save Preferences'}
                </button>
              </div>
            </section>
          )}

          {activeSection === 'terms' && (
            <section className="space-y-6">
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-2">Terms & Policies</h2>
                <p className="text-gray-600 mb-6">Please review our latest terms of service and privacy practices.</p>
                <button
                  className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-lg transition-colors duration-200"
                  type="button"
                  onClick={() => navigate('/terms')}
                >
                  View Terms & Policies
                </button>
              </div>
            </section>
          )}

          {activeSection === 'about' && (
            <section className="space-y-6">
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-2">About SkillConnect</h2>
                <p className="text-gray-600 mb-6">Learn how we connect trusted service providers with the community.</p>
                <button
                  className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-lg transition-colors duration-200"
                  type="button"
                  onClick={() => navigate('/about')}
                >
                  Visit About Page
                </button>
              </div>
            </section>
          )}

        </div>
      </main>

        {isEditingPassword && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Update Password</h3>
              <input
                type="password"
                placeholder="Enter new password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-4"
              />
              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditingPassword(false);
                    setNewPassword('');
                  }}
                  className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors duration-200"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!newPassword}
                  onClick={handlePasswordUpdate}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 disabled:opacity-50"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
  );
};

export default Settings;
