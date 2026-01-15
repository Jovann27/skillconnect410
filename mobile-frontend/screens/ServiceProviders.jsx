import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const ServiceProviders = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Service Providers Management</Text>
      <Text style={styles.message}>Service providers management functionality to be implemented</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 20, fontWeight: 'bold', marginBottom: 10, textAlign: 'center' },
  message: { fontSize: 16, textAlign: 'center' },
});

export default ServiceProviders;
