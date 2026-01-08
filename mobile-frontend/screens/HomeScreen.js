import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
} from 'react-native';
import { useMainContext } from '../contexts/MainContext';

const HomeScreen = ({ navigation }) => {
  const { user, isLoggedIn } = useMainContext();

  const handleGetStarted = () => {
    if (isLoggedIn) {
      // Navigate to dashboard based on role
      navigation.navigate('Dashboard');
    } else {
      navigation.navigate('Login');
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>SkillConnect</Text>
          <Text style={styles.subtitle}>Connect with skilled professionals in your community</Text>
        </View>

        {/* Hero Section */}
        <View style={styles.hero}>
          <Text style={styles.heroTitle}>Find the right service provider for your needs</Text>
          <Text style={styles.heroText}>
            Whether you need home repairs, tutoring, or professional services,
            connect with verified service providers in your area.
          </Text>
          <TouchableOpacity style={styles.primaryButton} onPress={handleGetStarted}>
            <Text style={styles.primaryButtonText}>
              {isLoggedIn ? 'Go to Dashboard' : 'Get Started'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Features */}
        <View style={styles.features}>
          <Text style={styles.sectionTitle}>Why Choose SkillConnect?</Text>

          <View style={styles.feature}>
            <Text style={styles.featureTitle}>Verified Professionals</Text>
            <Text style={styles.featureText}>
              All service providers are thoroughly vetted and verified to ensure quality service.
            </Text>
          </View>

          <View style={styles.feature}>
            <Text style={styles.featureTitle}>Local Community Focus</Text>
            <Text style={styles.featureText}>
              Connect with skilled individuals in your local area for convenient and reliable services.
            </Text>
          </View>

          <View style={styles.feature}>
            <Text style={styles.featureTitle}>Wide Range of Services</Text>
            <Text style={styles.featureText}>
              From home repairs to professional consulting, find experts in various fields.
            </Text>
          </View>
        </View>

        {/* CTA Section */}
        <View style={styles.cta}>
          <Text style={styles.ctaTitle}>Ready to get started?</Text>
          <Text style={styles.ctaText}>
            Join our community of service providers and clients today.
          </Text>
          {!isLoggedIn && (
            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[styles.secondaryButton, styles.buttonHalf]}
                onPress={() => navigation.navigate('Register')}
              >
                <Text style={styles.secondaryButtonText}>Sign Up</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.outlineButton, styles.buttonHalf]}
                onPress={() => navigation.navigate('Login')}
              >
                <Text style={styles.outlineButtonText}>Sign In</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
  },
  header: {
    padding: 20,
    paddingTop: 60,
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#007bff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
  },
  hero: {
    padding: 20,
    alignItems: 'center',
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 16,
    color: '#333',
  },
  heroText: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
    color: '#666',
  },
  primaryButton: {
    backgroundColor: '#007bff',
    borderRadius: 8,
    paddingVertical: 16,
    paddingHorizontal: 32,
    minWidth: 200,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  features: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 32,
    color: '#333',
  },
  feature: {
    marginBottom: 24,
    padding: 20,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  featureTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  featureText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#666',
  },
  cta: {
    padding: 20,
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  ctaTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
    color: '#333',
  },
  ctaText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
    color: '#666',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    maxWidth: 300,
  },
  buttonHalf: {
    flex: 1,
    marginHorizontal: 4,
  },
  secondaryButton: {
    backgroundColor: '#28a745',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  outlineButton: {
    borderWidth: 1,
    borderColor: '#007bff',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  outlineButtonText: {
    color: '#007bff',
    fontSize: 14,
    fontWeight: 'bold',
  },
});

export default HomeScreen;