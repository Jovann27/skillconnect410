import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const Mission = () => {
  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#f8f9fa', '#fce4ec', '#f8f9fa']}
        style={styles.gradient}
      >
        <View style={styles.content}>
          <View style={styles.card}>
            <Text style={styles.title}>MISSION</Text>
            <Text style={styles.description}>
              Lorem, ipsum dolor sit amet consectetur adipisicing elit. Molestias minima, inventore, architecto voluptatum excepturi porro odit ducimus velit ipsam laudantium labore dicta, totam eveniet ad alias consequuntur voluptate voluptatem impedit!
            </Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.title}>VISION</Text>
            <Text style={styles.description}>
              Lorem ipsum dolor sit amet consectetur adipisicing elit. Maiores at expedita aut adipisci itaque architecto modi aliquam! Ad tempora, incidunt quae a quia repellendus dolore fugiat recusandae vel quibusdam ea.
            </Text>
          </View>
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
  content: {
    gap: 24,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#c20884',
    textAlign: 'center',
    marginBottom: 16,
  },
  description: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
    textAlign: 'center',
  },
});

export default Mission;
