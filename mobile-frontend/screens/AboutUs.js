import React from "react";
import { ScrollView, Text, StyleSheet, View, Image, TextInput, TouchableOpacity } from "react-native";

const AboutUs = () => {
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.screenContent}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.barangayLabel}>Barangay 410 Zone 42</Text>
        <Text style={styles.pageTitle}>GALING at GANDA</Text>
        <Image
          source={{ uri: "https://i.ibb.co/84MzQQf8/Barangay-team.png" }}
          style={styles.headerImage}
        />
      </View>

      {/* Info */}
      <View style={styles.infoRow}>
        <Text style={styles.infoCopy}>
          Barangay 410 is a community located in the district of Sampaloc, Manila. Based on
          the 2020 Census, it had a population of 2,444 with a coverage of 0.13% of the city's
          total population.
        </Text>
        <Image
          source={{ uri: "https://i.ibb.co/MxQxQp9g/map.png" }}
          style={styles.mapImage}
        />
      </View>

      {/* Mission + Vision */}
      <View style={styles.missionVisionRow}>
        <View style={[styles.card, styles.missionCard]}>
          <Text style={styles.cardHeading}>Mission</Text>
          <Text style={styles.cardCopy}>
            To provide high-quality, ethically sourced services in a welcoming environment where
            people can connect, collaborate, and grow together.
          </Text>
        </View>
        <View style={[styles.card, styles.visionCard]}>
          <Text style={styles.cardHeading}>Vision</Text>
          <Text style={styles.cardCopy}>
            To be the most trusted local skills marketplace known for exceptional quality,
            sustainability, and community impact.
          </Text>
        </View>
      </View>

      {/* Development cards */}
      <View style={styles.devGrid}>
        {DEV_ITEMS.map((item) => (
          <View key={item.title} style={styles.devCard}>
            <Image source={{ uri: item.image }} style={styles.devImage} />
            <Text style={styles.devTitle}>{item.title}</Text>
            <Text style={styles.devCopy}>{item.copy}</Text>
          </View>
        ))}
      </View>

      {/* About SkillConnect */}
      <View style={styles.aboutSkillconnect}>
        <Text style={styles.sectionTitle}>About SkillConnect</Text>
        <Text style={styles.sectionCopy}>
          SkillConnect is a platform designed to connect skilled laborers with industries and
          businesses who need their services. Whether you’re a professional looking for
          opportunities or someone seeking reliable help, SkillConnect bridges the gap.
        </Text>
        <Image
          source={{ uri: "https://i.ibb.co/nsYsmHQ1/SkillConnect.png" }}
          style={styles.skillconnectImage}
        />
      </View>

      {/* Contact section */}
      <View style={styles.contactSection}>
        <View style={styles.contactForm}>
          <Text style={styles.contactTitle}>Let’s Get In Touch</Text>
          <TextInput placeholder="Your name" style={styles.input} placeholderTextColor="#888" />
          <TextInput placeholder="Your email" style={styles.input} placeholderTextColor="#888" />
          <TextInput
            placeholder="How can we help?"
            style={[styles.input, styles.textarea]}
            placeholderTextColor="#888"
            multiline
            numberOfLines={4}
          />
          <TouchableOpacity style={styles.sendButton}>
            <Text style={styles.sendButtonText}>Send Message</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.contactImageWrapper}>
          <Image
            source={{ uri: "https://i.ibb.co/FLCfgXNr/contact.png" }}
            style={styles.contactImage}
          />
        </View>
      </View>
    </ScrollView>
  );
};

const DEV_ITEMS = [
  {
    title: "Encourage Skill Development",
    copy: "Providing continuous training and education programs to equip individuals with necessary skills.",
    image: "https://i.ibb.co/jZZQYb0h/skill.png",
  },
  {
    title: "Expand Career Opportunities",
    copy: "Offering pathways for employment and advancement across various fields.",
    image: "https://i.ibb.co/qT2wQyT/career.png",
  },
  {
    title: "Promote Sustainable Livelihood",
    copy: "Supporting sustainable projects that help maintain long-term economic growth for residents.",
    image: "https://i.ibb.co/rKddwgMk/livelihood.png",
  },
];

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#f8ddee",
  },
  screenContent: {
    paddingBottom: 50,
    gap: 30,
  },
  header: {
    paddingVertical: 32,
    backgroundColor: "#eec0da",
    alignItems: "center",
  },
  barangayLabel: {
    fontSize: 18,
    fontWeight: "600",
    color: "#4b004b",
  },
  pageTitle: {
    fontSize: 32,
    fontWeight: "800",
    color: "#1f0036",
    marginTop: 6,
    marginBottom: 20,
  },
  headerImage: {
    width: "100%",
    height: 180,
    resizeMode: "cover",
  },
  infoRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    backgroundColor: "#fff",
    padding: 20,
    gap: 20,
    justifyContent: "center",
  },
  infoCopy: {
    flex: 1,
    minWidth: 260,
    fontSize: 16,
    lineHeight: 24,
    color: "#111",
  },
  mapImage: {
    flex: 1,
    minWidth: 260,
    height: 200,
    borderRadius: 12,
  },
  missionVisionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 20,
    paddingHorizontal: 20,
  },
  card: {
    flex: 1,
    minWidth: 280,
    borderRadius: 20,
    padding: 24,
    backgroundColor: "#fff",
  },
  missionCard: {
    backgroundColor: "#fff1f6",
    borderLeftWidth: 8,
    borderLeftColor: "#d6336c",
  },
  visionCard: {
    backgroundColor: "#e8f5ff",
    borderLeftWidth: 8,
    borderLeftColor: "#003366",
  },
  cardHeading: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 10,
  },
  cardCopy: {
    fontSize: 15,
    lineHeight: 22,
    color: "#333",
  },
  devGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 16,
    paddingHorizontal: 20,
  },
  devCard: {
    width: 320,
    borderRadius: 16,
    backgroundColor: "#fff",
    padding: 16,
    elevation: 4,
  },
  devImage: {
    width: "100%",
    height: 180,
    borderRadius: 12,
    marginBottom: 10,
  },
  devTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#a10d6a",
    marginBottom: 6,
  },
  devCopy: {
    fontSize: 14,
    color: "#333",
  },
  aboutSkillconnect: {
    marginHorizontal: 20,
    borderRadius: 18,
    padding: 20,
    backgroundColor: "#f2d7e9",
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#a10d6a",
    marginBottom: 8,
  },
  sectionCopy: {
    fontSize: 15,
    color: "#333",
    marginBottom: 12,
  },
  skillconnectImage: {
    width: "100%",
    height: 200,
    borderRadius: 12,
  },
  contactSection: {
    marginHorizontal: 20,
    borderRadius: 20,
    overflow: "hidden",
    backgroundColor: "#fff",
    elevation: 6,
  },
  contactForm: {
    padding: 24,
    gap: 12,
  },
  contactTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#000",
  },
  input: {
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: "#f6f6f6",
    color: "#111",
  },
  textarea: {
    height: 120,
    textAlignVertical: "top",
  },
  sendButton: {
    backgroundColor: "#a10d6a",
    borderRadius: 25,
    paddingVertical: 14,
    alignItems: "center",
  },
  sendButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
  },
  contactImageWrapper: {
    backgroundColor: "#1e3a8a",
    padding: 20,
    alignItems: "center",
  },
  contactImage: {
    width: 220,
    height: 220,
    resizeMode: "contain",
  },
});

export default AboutUs;

