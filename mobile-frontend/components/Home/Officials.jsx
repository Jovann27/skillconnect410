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
    paddingVertical: 20,
    paddingHorizontal: 15,
  },
  gradient: {
    borderRadius: 15,
    padding: 15,
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  mainTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: 'normal',
    color: '#666',
    textAlign: 'center',
    marginBottom: 12,
  },
  description: {
    fontSize: 13,
    color: '#666',
    textAlign: 'center',
    lineHeight: 18,
  },
  teamContainer: {
    paddingHorizontal: 8,
    gap: 12,
  },
  teamMember: {
    alignItems: 'center',
    width: 100,
  },
  imageContainer: {
    width: 80,
    height: 100,
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: 6,
    backgroundColor: '#f0f0f0',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  role: {
    fontSize: 11,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    lineHeight: 14,
  },
});

export default TeamSection;
