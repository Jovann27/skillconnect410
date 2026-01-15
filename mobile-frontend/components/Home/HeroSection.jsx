import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, Image, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');
const isAndroid = Platform.OS === 'android';

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
    minHeight: height * 0.7,
  },
  gradient: {
    flex: 1,
    minHeight: height * 0.7,
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
    paddingHorizontal: isAndroid ? 16 : 20,
    paddingVertical: isAndroid ? 30 : 40,
    paddingTop: isAndroid ? 60 : 40,
  },
  textContainer: {
    alignItems: 'center',
    marginBottom: isAndroid ? 30 : 40,
  },
  welcomeText: {
    fontSize: isAndroid ? 16 : 18,
    fontWeight: '500',
    color: '#666',
    marginBottom: 8,
  },
  title: {
    fontSize: isAndroid ? (width < 360 ? 28 : 32) : 36,
    fontWeight: '900',
    color: '#333',
    textAlign: 'center',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: isAndroid ? 18 : 20,
    fontWeight: 'bold',
    color: '#c20884',
    marginBottom: 8,
  },
  location: {
    fontSize: isAndroid ? 14 : 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  description: {
    fontSize: isAndroid ? 14 : 16,
    color: '#555',
    textAlign: 'center',
    lineHeight: isAndroid ? 20 : 24,
    maxWidth: isAndroid ? width * 0.85 : 300,
    paddingHorizontal: 10,
  },
  buttonContainer: {
    flexDirection: isAndroid && width < 400 ? 'column' : 'row',
    gap: isAndroid ? 12 : 15,
    marginBottom: isAndroid ? 25 : 30,
    width: '100%',
    maxWidth: 320,
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: '#fff',
    paddingHorizontal: isAndroid ? 20 : 25,
    paddingVertical: isAndroid ? 14 : 12,
    borderRadius: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 5,
    minWidth: isAndroid ? 160 : 'auto',
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#c20884',
    fontSize: isAndroid ? 14 : 16,
    fontWeight: 'bold',
  },
  secondaryButton: {
    backgroundColor: '#c20884',
    borderWidth: 2,
    borderColor: '#c20884',
    paddingHorizontal: isAndroid ? 20 : 25,
    paddingVertical: isAndroid ? 14 : 12,
    borderRadius: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 5,
    minWidth: isAndroid ? 160 : 'auto',
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#fff',
    fontSize: isAndroid ? 14 : 16,
    fontWeight: 'bold',
  },
  trustContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    maxWidth: isAndroid ? width * 0.9 : 350,
    paddingHorizontal: isAndroid ? 10 : 0,
  },
  trustItem: {
    alignItems: 'center',
    flex: 1,
    minWidth: isAndroid ? 80 : 'auto',
  },
  trustIcon: {
    width: isAndroid ? 36 : 40,
    height: isAndroid ? 36 : 40,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: isAndroid ? 4 : 5,
    backdropFilter: 'blur(10px)',
  },
  starIcon: {
    fontSize: isAndroid ? 18 : 20,
    color: '#ffd700',
  },
  usersIcon: {
    fontSize: isAndroid ? 18 : 20,
    color: '#4CAF50',
  },
  searchIcon: {
    fontSize: isAndroid ? 18 : 20,
    color: '#c20884',
  },
  trustText: {
    fontSize: isAndroid ? 11 : 12,
    fontWeight: '500',
    color: '#333',
    textAlign: 'center',
    lineHeight: isAndroid ? 14 : 'auto',
    paddingHorizontal: 2,
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
