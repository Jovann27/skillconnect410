import React from 'react';
import { View, Text, StyleSheet, Image, ScrollView, Dimensions, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');
const isAndroid = Platform.OS === 'android';

const DevelopmentCards = () => {
  const cards = [
    {
      title: 'Encourage Skill Development',
      description: 'Providing continuous training and education programs to equip individuals with necessary skills.',
      image: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=400&h=250&fit=crop',
    },
    {
      title: 'Expand Career Opportunities',
      description: 'Offering pathways for employment and advancement across various fields.',
      image: 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=400&h=250&fit=crop',
    },
    {
      title: 'Promote Sustainable Livelihood',
      description: 'Supporting sustainable projects that help maintain long-term economic growth for residents.',
      image: 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=400&h=250&fit=crop',
    }
  ];

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#fce4ec', '#fce4ec', '#fce4ec']}
        style={styles.gradient}
      >
        <View style={styles.header}>
          <Text style={styles.title}>The People Behind the Work</Text>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.cardsContainer}
        >
          {cards.map((card, index) => (
            <View key={index} style={styles.card}>
              <View style={styles.imageContainer}>
                <Image
                  source={{ uri: card.image }}
                  style={styles.image}
                  resizeMode="cover"
                />
              </View>
              <View style={styles.cardContent}>
                <Text style={styles.cardTitle}>{card.title}</Text>
                <Text style={styles.cardDescription}>{card.description}</Text>
              </View>
            </View>
          ))}
        </ScrollView>
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
    marginBottom: isAndroid ? 16 : 20,
  },
  title: {
    fontSize: isAndroid ? (width < 360 ? 18 : 20) : 22,
    fontWeight: 'bold',
    color: '#c20884',
    textAlign: 'center',
  },
  cardsContainer: {
    gap: isAndroid ? 10 : 12,
    paddingHorizontal: isAndroid ? 4 : 0,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    width: isAndroid ? (width < 360 ? 200 : 220) : 240,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
  },
  imageContainer: {
    height: isAndroid ? (width < 360 ? 100 : 110) : 120,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  cardContent: {
    padding: isAndroid ? 14 : 16,
  },
  cardTitle: {
    fontSize: isAndroid ? 15 : 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: isAndroid ? 6 : 8,
  },
  cardDescription: {
    fontSize: isAndroid ? 12 : 13,
    color: '#666',
    lineHeight: isAndroid ? 16 : 18,
  },
});

export default DevelopmentCards;
