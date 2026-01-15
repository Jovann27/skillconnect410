import React from 'react';
import { View, Text, StyleSheet, Image, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const TeamMember = ({ role, imageUrl }) => (
  <View style={styles.teamMember}>
    <View style={styles.imageContainer}>
      <Image
        source={{ uri: imageUrl }}
        style={styles.image}
        resizeMode="cover"
      />
    </View>
    <Text style={styles.role}>{role}</Text>
  </View>
);

const TeamSection = () => {
  const teamMembers = [
    {
      role: "Barangay Chairman",
      imageUrl: "https://via.placeholder.com/150"
    },
    {
      role: "Sk Chairman",
      imageUrl: "https://via.placeholder.com/150"
    },
    {
      role: "Kagawad",
      imageUrl: "https://via.placeholder.com/150"
    },
    {
      role: "Treasurer",
      imageUrl: "https://via.placeholder.com/150"
    },
    {
      role: "Barangay Official",
      imageUrl: "https://via.placeholder.com/150"
    },
    {
      role: "Barangay Official",
      imageUrl: "https://via.placeholder.com/150"
    }
  ];

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#fce4ec', '#fce4ec', '#fff']}
        style={styles.gradient}
      >
        <View style={styles.header}>
          <Text style={styles.mainTitle}>About The Organization</Text>
          <Text style={styles.subtitle}>Committed. Skilled. Community-Focused.</Text>
          <Text style={styles.description}>
            We serve with care and commitment, connecting skilled workers to opportunities that uplift our community.
          </Text>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.teamContainer}
        >
          {teamMembers.map((member, index) => (
            <TeamMember
              key={index}
              role={member.role}
              imageUrl={member.imageUrl}
            />
          ))}
        </ScrollView>
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
    marginBottom: 32,
  },
  mainTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 20,
    fontWeight: 'normal',
    color: '#666',
    textAlign: 'center',
    marginBottom: 16,
  },
  description: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
  teamContainer: {
    paddingHorizontal: 10,
    gap: 16,
  },
  teamMember: {
    alignItems: 'center',
    width: 120,
  },
  imageContainer: {
    width: 100,
    height: 120,
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 8,
    backgroundColor: '#f0f0f0',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  role: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
  },
});

export default TeamSection;
