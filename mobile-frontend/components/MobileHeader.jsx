import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useMainContext } from '../contexts/MainContext';
import { useNavigation } from '@react-navigation/native';

const MobileHeader = ({ title, showBack = false, showProfile = true, showNotifications = true }) => {
  const { user } = useMainContext();
  const navigation = useNavigation();

  const handleProfilePress = () => {
    navigation.navigate('UserTabs', { screen: 'Profile' });
  };

  const handleNotificationsPress = () => {
    navigation.navigate('UserTabs', { screen: 'Notifications' });
  };

  const handleBackPress = () => {
    navigation.goBack();
  };

  return (
    <View style={styles.header}>
      <View style={styles.leftSection}>
        {showBack && (
          <TouchableOpacity onPress={handleBackPress} style={styles.backButton}>
            <Text style={styles.backText}>←</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.centerSection}>
        <Text style={styles.title} numberOfLines={1}>
          {title || 'SkillConnect'}
        </Text>
      </View>

      <View style={styles.rightSection}>
        <View style={styles.rightButtons}>
          {showNotifications && user && (
            <TouchableOpacity onPress={handleNotificationsPress} style={styles.notificationsButton}>
              <MaterialIcons name="notifications" size={24} color="#fff" />
            </TouchableOpacity>
          )}
          {showProfile && user && (
            <TouchableOpacity onPress={handleProfilePress} style={styles.profileButton}>
              <Text style={styles.profileText}>
                {user.firstName?.charAt(0) || 'U'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e91e63',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: 50, // Account for status bar
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  leftSection: {
    flex: 1,
    alignItems: 'flex-start',
  },
  centerSection: {
    flex: 2,
    alignItems: 'center',
  },
  rightSection: {
    flex: 1,
    alignItems: 'flex-end',
  },
  backButton: {
    padding: 8,
  },
  backText: {
    fontSize: 24,
    color: '#fff',
    fontWeight: 'bold',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
  },
  rightButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  notificationsButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
});

export default MobileHeader;
