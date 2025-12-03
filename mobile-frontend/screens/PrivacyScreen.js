import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';

export default function PrivacyScreen() {
  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Privacy Policy</Text>

      <Text style={styles.sectionTitle}>1. Information We Collect</Text>
      <Text style={styles.content}>
        We collect information you provide directly to us, such as when you create an account, use our services, or contact us for support.
      </Text>

      <Text style={styles.sectionTitle}>2. How We Use Your Information</Text>
      <Text style={styles.content}>
        We use the information we collect to provide, maintain, and improve our services, process transactions, and communicate with you.
      </Text>

      <Text style={styles.sectionTitle}>3. Information Sharing</Text>
      <Text style={styles.content}>
        We do not sell, trade, or otherwise transfer your personal information to third parties without your consent, except as described in this policy.
      </Text>

      <Text style={styles.sectionTitle}>4. Data Security</Text>
      <Text style={styles.content}>
        We implement appropriate security measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction.
      </Text>

      <Text style={styles.sectionTitle}>5. Your Rights</Text>
      <Text style={styles.content}>
        You have the right to access, update, or delete your personal information. You can also opt out of certain data collection practices.
      </Text>

      <Text style={styles.sectionTitle}>6. Cookies and Tracking</Text>
      <Text style={styles.content}>
        We may use cookies and similar technologies to enhance your experience on our platform and analyze usage patterns.
      </Text>

      <Text style={styles.sectionTitle}>7. Third-Party Services</Text>
      <Text style={styles.content}>
        Our service may contain links to third-party websites or services. We are not responsible for the privacy practices of these external sites.
      </Text>

      <Text style={styles.sectionTitle}>8. Children's Privacy</Text>
      <Text style={styles.content}>
        Our service is not intended for children under 13. We do not knowingly collect personal information from children under 13.
      </Text>

      <Text style={styles.sectionTitle}>9. Changes to This Policy</Text>
      <Text style={styles.content}>
        We may update this privacy policy from time to time. We will notify you of any changes by posting the new policy on this page.
      </Text>

      <Text style={styles.sectionTitle}>10. Contact Us</Text>
      <Text style={styles.content}>
        If you have any questions about this privacy policy, please contact us through the app or our support channels.
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
