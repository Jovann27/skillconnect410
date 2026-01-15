import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Linking,
  Alert,
  ScrollView
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';

const Footer = ({ style }) => {
  const navigation = useNavigation();

  const currentYear = new Date().getFullYear();

  const handleSocialLink = async (url) => {
    try {
      await Linking.openURL(url);
    } catch (error) {
      Alert.alert('Error', 'Unable to open link');
    }
  };

  const handleNavigation = (screenName) => {
    // Handle navigation to different screens
    // This would depend on your app's navigation structure
    switch (screenName) {
      case 'Terms':
        // Navigate to terms screen or open web link
        Alert.alert('Terms & Conditions', 'Terms & Conditions screen coming soon!');
        break;
      case 'Privacy':
        Alert.alert('Privacy Policy', 'Privacy Policy screen coming soon!');
        break;
      case 'Contact':
        navigation.navigate('Settings'); // Or a contact screen
        break;
      default:
        break;
    }
  };

  const socialLinks = [
    {
      name: 'facebook',
      icon: 'logo-facebook',
      url: 'https://facebook.com',
      color: '#1877f2'
    },
    {
      name: 'instagram',
      icon: 'logo-instagram',
      url: 'https://instagram.com',
      color: '#e4405f'
    },
    {
      name: 'twitter',
      icon: 'logo-twitter',
      url: 'https://twitter.com',
      color: '#1da1f2'
    },
    {
      name: 'linkedin',
      icon: 'logo-linkedin',
      url: 'https://linkedin.com',
      color: '#0077b5'
    },
    {
      name: 'youtube',
      icon: 'logo-youtube',
      url: 'https://youtube.com',
      color: '#ff0000'
    }
  ];

  return (
    <View style={[styles.container, style]}>
      <View style={styles.content}>
        {/* Logo/Brand Section */}
        <View style={styles.brandSection}>
          <Text style={styles.brandText}>SkillConnect4B410</Text>
          <Text style={styles.tagline}>
            Building modern solutions with simplicity and elegance.
          </Text>
        </View>

        {/* Quick Links Section */}
        <View style={styles.linksSection}>
          <Text style={styles.sectionTitle}>Quick Links</Text>
          <View style={styles.linksContainer}>
            <TouchableOpacity
              style={styles.linkItem}
              onPress={() => handleNavigation('Home')}
            >
              <Text style={styles.linkText}>Home</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.linkItem}
              onPress={() => handleNavigation('Services')}
            >
              <Text style={styles.linkText}>Services</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.linkItem}
              onPress={() => handleNavigation('Contact')}
            >
              <Text style={styles.linkText}>Contact</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Social Media Section */}
        <View style={styles.socialSection}>
          <Text style={styles.sectionTitle}>Follow Us</Text>
          <View style={styles.socialContainer}>
            {socialLinks.map((social) => (
              <TouchableOpacity
                key={social.name}
                style={[styles.socialButton, { borderColor: social.color }]}
                onPress={() => handleSocialLink(social.url)}
                activeOpacity={0.7}
              >
                <Icon name={social.icon} size={24} color={social.color} />
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>

      {/* Bottom Section */}
      <View style={styles.bottomSection}>
        <Text style={styles.copyright}>
          © {currentYear} SkillConnect4B410. All rights reserved.
        </Text>
        <View style={styles.legalLinks}>
          <TouchableOpacity onPress={() => handleNavigation('Terms')}>
            <Text style={styles.legalLink}>Terms & Conditions</Text>
          </TouchableOpacity>
          <Text style={styles.separator}>|</Text>
          <TouchableOpacity onPress={() => handleNavigation('Privacy')}>
            <Text style={styles.legalLink}>Privacy Policy</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#dc143c',
    paddingVertical: 24,
    paddingHorizontal: 20,
  },
  content: {
    marginBottom: 20,
  },
  brandSection: {
    marginBottom: 24,
    alignItems: 'center',
  },
  brandText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  tagline: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.9,
    textAlign: 'center',
    lineHeight: 20,
  },
  linksSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 12,
  },
  linksContainer: {
    gap: 8,
  },
  linkItem: {
    paddingVertical: 4,
  },
  linkText: {
    fontSize: 16,
    color: '#fff',
    opacity: 0.9,
  },
  socialSection: {
    marginBottom: 24,
  },
  socialContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 12,
  },
  socialButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  bottomSection: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.2)',
    paddingTop: 16,
    alignItems: 'center',
  },
  copyright: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.8,
    marginBottom: 8,
    textAlign: 'center',
  },
  legalLinks: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  legalLink: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.8,
    textDecorationLine: 'underline',
  },
  separator: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.6,
  },
});

export default Footer;
