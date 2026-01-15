import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ScrollView, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import api from '../../api';

const ContactForm = () => {
  const [formData, setFormData] = useState({ name: '', email: '', subject: '', message: '' });
  const [loading, setLoading] = useState(false);

  const handleChange = (field, value) => {
    setFormData({ ...formData, [field]: value });
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.email || !formData.subject || !formData.message) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setLoading(true);

    try {
      const res = await api.post('/contact/send', formData);

      if (res.data.success) {
        Alert.alert('Success', res.data.message || 'Email Sent Successfully!!');
        setFormData({ name: '', email: '', subject: '', message: '' });
      }
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to send your email!';
      Alert.alert('Error', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#f8f9fa', '#fce4ec', '#f8f9fa']}
        style={styles.gradient}
      >
        <View style={styles.content}>
          <View style={styles.formContainer}>
            <Text style={styles.title}>Let's Get In Touch</Text>

            <View style={styles.form}>
              <TextInput
                style={styles.input}
                placeholder="Your name"
                value={formData.name}
                onChangeText={(value) => handleChange('name', value)}
              />

              <TextInput
                style={styles.input}
                placeholder="Your email"
                value={formData.email}
                onChangeText={(value) => handleChange('email', value)}
                keyboardType="email-address"
                autoCapitalize="none"
              />

              <TextInput
                style={styles.input}
                placeholder="Subject"
                value={formData.subject}
                onChangeText={(value) => handleChange('subject', value)}
              />

              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="How Can We Help?"
                value={formData.message}
                onChangeText={(value) => handleChange('message', value)}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />

              <TouchableOpacity
                style={[styles.button, loading && styles.buttonDisabled]}
                onPress={handleSubmit}
                disabled={loading}
              >
                <Text style={styles.buttonText}>
                  {loading ? 'Sending...' : 'Send Message'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.imageContainer}>
            <Image
              source={{ uri: 'https://i.ibb.co/MxKr7FVx/1000205778-removebg-preview.png' }}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>
        </View>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 20,
    paddingHorizontal: 15,
  },
  gradient: {
    borderRadius: 15,
    padding: 15,
  },
  content: {
    flexDirection: 'column',
    alignItems: 'center',
  },
  formContainer: {
    width: '100%',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 20,
  },
  form: {
    gap: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  button: {
    backgroundColor: '#c20884',
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  imageContainer: {
    alignItems: 'center',
  },
  logo: {
    width: 150,
    height: 150,
  },
});

export default ContactForm;
