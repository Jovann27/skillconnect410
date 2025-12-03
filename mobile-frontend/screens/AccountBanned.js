import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Alert,
} from 'react-native';
import { useMainContext } from '../contexts/MainContext';

const AccountBanned = ({ navigation }) => {
  const { user, logout } = useMainContext();

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await logout();
            navigation.replace('Login');
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Text style={styles.icon}>🚫</Text>
        </View>

        <Text style={styles.title}>Account Suspended</Text>

        <View style={styles.messageContainer}>
          <Text style={styles.message}>
            Hello <Text style={styles.name}>{user?.firstName} {user?.lastName}</Text>,
          </Text>
          <Text style={styles.message}>
            Your account has been suspended due to violation of our community guidelines.
          </Text>
          <Text style={styles.message}>
            If you believe this suspension was made in error, please contact our support team for assistance.
          </Text>
        </View>

        <View style={styles.detailsContainer}>
          <View style={styles.detailItem}>
            <Text style={styles.detailIcon}>📧</Text>
            <Text style={styles.detailText}>Contact support for account reinstatement</Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={styles.detailIcon}>🛡️</Text>
            <Text style={styles.detailText}>Review our community guidelines</Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={styles.detailIcon}>❓</Text>
            <Text style={styles.detailText}>Need help? Reach out to our support team</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutButtonText}>Logout</Text>
        </TouchableOpacity>

        <Text style={styles.footer}>We appreciate your understanding.</Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#dc3545',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
    paddingVertical: 50,
  },
  iconContainer: {
    marginBottom: 30,
  },
  icon: {
    fontSize: 80,
    textAlign: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    marginBottom: 30,
  },
  messageContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 15,
    padding: 20,
    marginBottom: 30,
    width: '100%',
  },
  message: {
    color: 'white',
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
    marginBottom: 10,
  },
  name: {
    fontWeight: 'bold',
  },
  detailsContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 15,
    padding: 20,
    marginBottom: 40,
    width: '100%',
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  detailIcon: {
    fontSize: 20,
    marginRight: 15,
    width: 25,
    textAlign: 'center',
  },
  detailText: {
    color: 'white',
    fontSize: 14,
    flex: 1,
    lineHeight: 20,
  },
  logoutButton: {
    backgroundColor: '#dc3545',
    paddingHorizontal: 40,
    paddingVertical: 15,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: 'white',
    marginBottom: 30,
  },
  logoutButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  footer: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
    fontStyle: 'italic',
    textAlign: 'center',
  },
});

export default AccountBanned;
