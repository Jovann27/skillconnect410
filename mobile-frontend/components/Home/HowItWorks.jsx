import React from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');
const isAndroid = Platform.OS === 'android';

const HowItWorks = () => {
  const steps = [
    {
      icon: '👤',
      title: 'Create Account',
      description: 'Sign up in seconds and set up your profile. Choose your role as a Service Provider or Community Member.',
      color: '#e11d48',
    },
    {
      icon: '🔍',
      title: 'Find or Post Services',
      description: 'Browse available services in your area or post your own offerings. Filter by category, location, and ratings.',
      color: '#6366f1',
    },
    {
      icon: '🤝',
      title: 'Connect & Collaborate',
      description: 'Apply for services, send messages, and finalize arrangements. Work together seamlessly.',
      color: '#10b981',
    }
  ];

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#fff', '#f8f9fa', '#fff']}
        style={styles.gradient}
      >
        <View style={styles.header}>
          <Text style={styles.mainTitle}>How SkillConnect Works</Text>
          <Text style={styles.subtitle}>
            Three simple steps to connect with skilled professionals
          </Text>
        </View>

        <View style={styles.stepsContainer}>
          {steps.map((step, index) => (
            <View key={index} style={styles.stepCard}>
              <View style={styles.stepHeader}>
                <View style={styles.stepNumber}>
                  <Text style={styles.stepNumberText}>{index + 1}</Text>
                </View>
                <Text style={styles.stepIcon}>{step.icon}</Text>
              </View>

              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>{step.title}</Text>
                <Text style={styles.stepDescription}>{step.description}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.ctaContainer}>
          <Text style={styles.ctaTitle}>Ready to Get Started?</Text>
          <Text style={styles.ctaText}>
            Join thousands of community members and skilled professionals
          </Text>
        </View>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: isAndroid ? 16 : 20,
    paddingHorizontal: isAndroid ? 12 : 15,
  },
  gradient: {
    borderRadius: 15,
    padding: isAndroid ? 12 : 15,
  },
  header: {
    alignItems: 'center',
    marginBottom: isAndroid ? 20 : 24,
  },
  mainTitle: {
    fontSize: isAndroid ? (width < 360 ? 20 : 22) : 24,
    fontWeight: 'bold',
    color: '#c20884',
    textAlign: 'center',
    marginBottom: isAndroid ? 6 : 8,
  },
  subtitle: {
    fontSize: isAndroid ? 13 : 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: isAndroid ? 18 : 20,
    paddingHorizontal: isAndroid ? 10 : 0,
  },
  stepsContainer: {
    gap: isAndroid ? 14 : 16,
    marginBottom: isAndroid ? 20 : 24,
  },
  stepCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: isAndroid ? 14 : 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: isAndroid ? 10 : 12,
  },
  stepNumber: {
    width: isAndroid ? 26 : 28,
    height: isAndroid ? 26 : 28,
    backgroundColor: '#c20884',
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: isAndroid ? 8 : 10,
  },
  stepNumberText: {
    color: '#fff',
    fontSize: isAndroid ? 13 : 14,
    fontWeight: 'bold',
  },
  stepIcon: {
    fontSize: isAndroid ? 18 : 20,
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: isAndroid ? 15 : 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: isAndroid ? 5 : 6,
  },
  stepDescription: {
    fontSize: isAndroid ? 12 : 13,
    color: '#666',
    lineHeight: isAndroid ? 16 : 18,
  },
  ctaContainer: {
    alignItems: 'center',
    backgroundColor: '#c20884',
    borderRadius: 12,
    padding: isAndroid ? 14 : 16,
  },
  ctaTitle: {
    fontSize: isAndroid ? 15 : 16,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: isAndroid ? 5 : 6,
  },
  ctaText: {
    fontSize: isAndroid ? 12 : 13,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    lineHeight: isAndroid ? 16 : 18,
  },
});

export default HowItWorks;
