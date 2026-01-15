import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

const HeroSection = () => {
  const navigation = useNavigation();

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#fce4ec', '#f8bbd9', '#fce4ec']}
        style={styles.gradient}
      >
        {/* Background Pattern */}
        <View style={styles.pattern}>
          <View style={styles.patternGrid}></View>
        </View>

        {/* Gradient Overlay */}
        <View style={styles.overlay}></View>

        <View style={styles.content}>
          <View style={styles.textContainer}>
            <Text style={styles.welcomeText}>Welcome to</Text>
            <Text style={styles.title}>SkillConnect</Text>
            <Text style={styles.subtitle}>4B410</Text>
            <Text style={styles.location}>BARANGAY 410 ZONE 42</Text>
            <Text style={styles.description}>
              Connecting skilled workers with opportunities in Barangay 410 Zone 42.
              Find local services, post your skills, and build a stronger community together.
            </Text>
          </View>

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => navigation.navigate('BrowseServices')}
            >
              <Text style={styles.primaryButtonText}>Find Services</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => navigation.navigate('Login')}
            >
              <Text style={styles.secondaryButtonText}>Provide a Service</Text>
            </TouchableOpacity>
          </View>

          {/* Trust Indicators */}
          <View style={styles.trustContainer}>
            <View style={styles.trustItem}>
              <View style={styles.trustIcon}>
                <Text style={styles.starIcon}>⭐</Text>
              </View>
              <Text style={styles.trustText}>Verified Professionals</Text>
            </View>
            <View style={styles.trustItem}>
              <View style={styles.trustIcon}>
                <Text style={styles.usersIcon}>👥</Text>
              </View>
              <Text style={styles.trustText}>Local Community</Text>
            </View>
            <View style={styles.trustItem}>
              <View style={styles.trustIcon}>
                <Text style={styles.searchIcon}>🔍</Text>
              </View>
              <Text style={styles.trustText}>Easy to Find Services</Text>
            </View>
          </View>
        </View>

        {/* Floating Elements */}
        <View style={styles.floatingElements}>
          <View style={styles.floatingElement1}>
            <Text style={styles.floatingIcon}>🔧</Text>
          </View>
          <View style={styles.floatingElement2}>
            <Text style={styles.floatingIcon}>👥</Text>
          </View>
          <View style={styles.floatingElement3}>
            <Text style={styles.floatingIcon}>⭐</Text>
          </View>
        </View>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    minHeight: height * 0.9,
  },
  gradient: {
    flex: 1,
    minHeight: height * 0.9,
  },
  pattern: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.1,
  },
  patternGrid: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
    backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)',
    backgroundSize: '20px 20px',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 40,
  },
  textContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  welcomeText: {
    fontSize: 18,
    fontWeight: '500',
    color: '#666',
    marginBottom: 10,
  },
  title: {
    fontSize: 48,
    fontWeight: '900',
    color: '#333',
    textAlign: 'center',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#c20884',
    marginBottom: 10,
  },
  location: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 20,
  },
  description: {
    fontSize: 16,
    color: '#555',
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: 300,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 15,
    marginBottom: 30,
  },
  primaryButton: {
    backgroundColor: '#fff',
    paddingHorizontal: 25,
    paddingVertical: 12,
    borderRadius: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 5,
  },
  primaryButtonText: {
    color: '#c20884',
    fontSize: 16,
    fontWeight: 'bold',
  },
  secondaryButton: {
    backgroundColor: '#c20884',
    borderWidth: 2,
    borderColor: '#c20884',
    paddingHorizontal: 25,
    paddingVertical: 12,
    borderRadius: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 5,
  },
  secondaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  trustContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    maxWidth: 350,
  },
  trustItem: {
    alignItems: 'center',
    flex: 1,
  },
  trustIcon: {
    width: 40,
    height: 40,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 5,
    backdropFilter: 'blur(10px)',
  },
  starIcon: {
    fontSize: 20,
    color: '#ffd700',
  },
  usersIcon: {
    fontSize: 20,
    color: '#4CAF50',
  },
  searchIcon: {
    fontSize: 20,
    color: '#c20884',
  },
  trustText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#333',
    textAlign: 'center',
  },
  floatingElements: {
    ...StyleSheet.absoluteFillObject,
    pointerEvents: 'none',
  },
  floatingElement1: {
    position: 'absolute',
    top: '25%',
    left: '20%',
    width: 50,
    height: 50,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  floatingElement2: {
    position: 'absolute',
    top: '75%',
    right: '20%',
    width: 50,
    height: 50,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  floatingElement3: {
    position: 'absolute',
    bottom: '25%',
    left: '30%',
    width: 50,
    height: 50,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  floatingIcon: {
    fontSize: 24,
    color: '#fff',
  },
});

export default HeroSection;
