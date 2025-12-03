import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';

export default function TermsScreen() {
  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Terms and Conditions</Text>

      <Text style={styles.sectionTitle}>1. Introduction</Text>
      <Text style={styles.content}>
        Welcome to SkillConnect. These terms and conditions outline the rules and regulations for the use of our mobile application.
      </Text>

      <Text style={styles.sectionTitle}>2. Acceptance of Terms</Text>
      <Text style={styles.content}>
        By accessing and using SkillConnect, you accept and agree to be bound by the terms and provision of this agreement.
      </Text>

      <Text style={styles.sectionTitle}>3. User Accounts</Text>
      <Text style={styles.content}>
        To use certain features of our service, you must register for an account. You are responsible for maintaining the confidentiality of your account information.
      </Text>

      <Text style={styles.sectionTitle}>4. Service Usage</Text>
      <Text style={styles.content}>
        Our platform connects community members with skilled service providers. Users must provide accurate information and use the service responsibly.
      </Text>

      <Text style={styles.sectionTitle}>5. Prohibited Activities</Text>
      <Text style={styles.content}>
        Users are prohibited from engaging in fraudulent activities, harassment, or any illegal behavior on our platform.
      </Text>

      <Text style={styles.sectionTitle}>6. Termination</Text>
      <Text style={styles.content}>
        We reserve the right to terminate or suspend your account at our discretion for violations of these terms.
      </Text>

      <Text style={styles.sectionTitle}>7. Limitation of Liability</Text>
      <Text style={styles.content}>
        SkillConnect shall not be liable for any indirect, incidental, or consequential damages arising from your use of the service.
      </Text>

      <Text style={styles.sectionTitle}>8. Changes to Terms</Text>
      <Text style={styles.content}>
        We may update these terms from time to time. Continued use of the service constitutes acceptance of the updated terms.
      </Text>

      <Text style={styles.sectionTitle}>9. Contact Information</Text>
      <Text style={styles.content}>
        If you have any questions about these terms, please contact us through the app or our support channels.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#555',
    marginTop: 15,
    marginBottom: 8,
  },
  content: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
    marginBottom: 10,
  },
});
