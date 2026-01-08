import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Switch,
} from 'react-native';
import { useMainContext } from '../contexts/MainContext';

const SettingsScreen = ({ navigation }) => {
  const { user, logout } = useMainContext();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [locationEnabled, setLocationEnabled] = useState(false);
  const [darkModeEnabled, setDarkModeEnabled] = useState(false);

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Logout', style: 'destructive', onPress: logout },
      ]
    );
  };

  const handleChangePassword = () => {
    Alert.alert('Change Password', 'This feature will be implemented soon!');
  };

  const handlePrivacySettings = () => {
    Alert.alert('Privacy Settings', 'This feature will be implemented soon!');
  };

  const handleNotificationSettings = () => {
    Alert.alert('Notification Settings', 'This feature will be implemented soon!');
  };

  const handleSupport = () => {
    Alert.alert('Support', 'Contact us at support@skillconnect.com');
  };

  const handleAbout = () => {
    Alert.alert('About SkillConnect', 'Version 1.0.0\n\nConnecting communities with skilled professionals.');
  };

  const renderSettingItem = (title, subtitle, onPress, rightComponent = null) => (
    <TouchableOpacity style={styles.settingItem} onPress={onPress}>
      <View style={styles.settingContent}>
        <Text style={styles.settingTitle}>{title}</Text>
        {subtitle && <Text style={styles.settingSubtitle}>{subtitle}</Text>}
      </View>
      {rightComponent}
    </TouchableOpacity>
  );

  const renderSwitch = (value, onValueChange) => (
    <Switch
      value={value}
      onValueChange={onValueChange}
      trackColor={{ false: '#767577', true: '#81b0ff' }}
      thumbColor={value ? '#007bff' : '#f4f3f4'}
    />
  );

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Settings</Text>
      </View>

      <View style={styles.content}>
        {/* Account Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          {renderSettingItem(
            'Manage Profile',
            'Update your personal information',
            () => navigation.navigate('Profile')
          )}
          {renderSettingItem(
            'Change Password',
            'Update your password',
            handleChangePassword
          )}
          {renderSettingItem(
            'Privacy Settings',
            'Manage your privacy preferences',
            handlePrivacySettings
          )}
        </View>

        {/* Preferences */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Preferences</Text>
          {renderSettingItem(
            'Push Notifications',
            'Receive notifications about orders and updates',
            null,
            renderSwitch(notificationsEnabled, setNotificationsEnabled)
          )}
          {renderSettingItem(
            'Location Services',
            'Allow access to location for better service matching',
            null,
            renderSwitch(locationEnabled, setLocationEnabled)
          )}
          {renderSettingItem(
            'Dark Mode',
            'Switch to dark theme',
            null,
            renderSwitch(darkModeEnabled, setDarkModeEnabled)
          )}
        </View>

        {/* Notifications */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notifications</Text>
          {renderSettingItem(
            'Notification Settings',
            'Customize your notification preferences',
            handleNotificationSettings
          )}
        </View>

        {/* Support */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Support</Text>
          {renderSettingItem(
            'Help & Support',
            'Get help or contact support',
            handleSupport
          )}
          {renderSettingItem(
            'About',
            'App version and information',
            handleAbout
          )}
        </View>

        {/* Logout */}
        <View style={styles.section}>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutButtonText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    backgroundColor: '#007bff',
    padding: 20,
    paddingTop: 60,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
  },
  content: {
    padding: 20,
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    padding: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 2,
  },
  settingSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  logoutButton: {
    backgroundColor: '#dc3545',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    margin: 16,
  },
  logoutButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default SettingsScreen;