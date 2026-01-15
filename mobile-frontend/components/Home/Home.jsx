import React from 'react';
import { ScrollView, View, StyleSheet } from 'react-native';
import HeroSection from './HeroSection';
import Announcement from './Announcement';
import Mission from './Mission';
import HowItWorks from './HowItWorks';
import TeamSection from './Officials';
import DevelopmentCards from './DevelopmentCards';
import ContactForm from './ContactForm';

const Home = () => {
  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <HeroSection />
      <Announcement />
      <Mission />
      <HowItWorks />
      <TeamSection />
      <DevelopmentCards />
      <ContactForm />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
});

export default Home;
