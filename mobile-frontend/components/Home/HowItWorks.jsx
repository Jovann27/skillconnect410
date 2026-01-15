import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

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
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  gradient: {
    borderRadius: 20,
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  mainTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#c20884',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
  },
  stepsContainer: {
    gap: 24,
    marginBottom: 40,
  },
  stepCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  stepNumber: {
    width: 32,
    height: 32,
    backgroundColor: '#c20884',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  stepNumberText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  stepIcon: {
    fontSize: 24,
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  stepDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  ctaContainer: {
    alignItems: 'center',
    backgroundColor: '#c20884',
    borderRadius: 16,
    padding: 24,
  },
  ctaTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 8,
  },
  ctaText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default HowItWorks;
