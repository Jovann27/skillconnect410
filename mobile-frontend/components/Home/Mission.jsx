import React from 'react';
import { View, Text, StyleSheet, Dimensions, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');
const isAndroid = Platform.OS === 'android';

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
    paddingVertical: isAndroid ? 16 : 20,
    paddingHorizontal: isAndroid ? 12 : 15,
  },
  gradient: {
    borderRadius: 15,
    padding: isAndroid ? 12 : 15,
  },
  content: {
    gap: isAndroid ? 14 : 16,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: isAndroid ? 14 : 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  title: {
    fontSize: isAndroid ? (width < 360 ? 18 : 19) : 20,
    fontWeight: 'bold',
    color: '#c20884',
    textAlign: 'center',
    marginBottom: isAndroid ? 10 : 12,
  },
  description: {
    fontSize: isAndroid ? 13 : 14,
    color: '#666',
    lineHeight: isAndroid ? 18 : 20,
    textAlign: 'center',
    paddingHorizontal: isAndroid ? 4 : 0,
  },
});

export default Mission;
