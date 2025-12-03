import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from "react-native";
import { Ionicons, FontAwesome5 } from "@expo/vector-icons"; // Added FontAwesome5 for 'tools'
import { LinearGradient } from "expo-linear-gradient"; // Import LinearGradient
import api from "../../api";
import { commonStyles } from "../../utils/commonStyles";

// Helper component for the gradient highlight.
// This is the practical way to match the color of your web highlight.
const TitleHighlight = ({ children }) => (
  <Text style={styles.titleHighlight}>{children}</Text>
);

// --- HOME COMPONENT ---
export default function Home({ navigation }) {
  const [jobfair, setJobfair] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchJobfair = async () => {
      try {
        const { data } = await api.get("/settings/jobfair");
        if (data.success) {
          setJobfair(data.jobfair);
        }
      } catch (err) {
        setError("Error: " + (err.response?.data?.message || err.message));
      } finally {
        setLoading(false);
      }
    };
    fetchJobfair();
  }, []);

  const handleFindServices = () => console.log("Navigate to Find Services");
  const handlePostSkills = () => console.log("Navigate to Post Skills");

  // --- ANNOUNCEMENT RENDER ---
  const renderAnnouncement = () => {
    if (loading) {
      return (
        <View style={styles.announcementContainer}>
          <ActivityIndicator size="large" color="#d6355d" />
        </View>
      );
    }
    if (error) {
      return (
        <View style={styles.announcementContainer}>
          <Text style={styles.announcementErrorText}>{error}</Text>
        </View>
      );
    }
    if (!jobfair || new Date(jobfair.date) < new Date()) {
      return null;
    }

    return (
      <View style={styles.announcementContainer}>
        <View style={styles.sectionMainTitle}>
          <Text style={styles.sectionH1}>CAREER FAIR</Text>
          <View style={styles.sectionH1Underline} />
        </View>

        <View style={styles.announcementCard}>
          {/* We wrap the content in the gradient background */}
          <LinearGradient
            colors={["#ff9ff3", "#f9a8d4", "#ff6b9d", "#c44569"]}
            style={styles.announcementGradient}
          >
            {/* Image Section */}
            <View style={styles.announcementImages}>
              <Image
                style={styles.announcementImage}
                source={{
                  uri: "https://images.unsplash.com/photo-1521791136064-7986c2920216?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1469&q=80",
                }}
              />
              <Image
                style={[styles.announcementImage, { marginTop: 8 }]}
                source={{
                  uri: "https://images.unsplash.com/photo-1556761175-b413da4baf72?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1574&q=80",
                }}
              />
            </View>

            {/* Content Section */}
            <View style={styles.announcementContent}>
              <Text style={styles.announcementTitle}>{jobfair.title}</Text>
              <View style={styles.announcementTitleUnderline} />
              {jobfair.description && (
                <View style={styles.announcementDescWrapper}>
                  <Text style={styles.announcementDesc}>
                    {jobfair.description}
                  </Text>
                </View>
              )}
              <View style={styles.infoContainer}>
                {/* Date */}
                <View style={styles.infoItem}>
                  <View style={[styles.infoIconView, styles.dateIcon]}>
                    <Ionicons name="calendar" size={20} color="#4ee44e" />
                  </View>
                  <View style={styles.infoTextView}>
                    <Text style={styles.infoLabel}>DATE</Text>
                    <Text style={styles.infoValue}>
                      {new Date(jobfair.date).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </Text>
                  </View>
                </View>
                {/* Time */}
                <View style={styles.infoItem}>
                  <View style={[styles.infoIconView, styles.timeIcon]}>
                    <Ionicons name="time" size={20} color="#e22d2d" />
                  </View>
                  <View style={styles.infoTextView}>
                    <Text style={styles.infoLabel}>TIME</Text>
                    <Text style={styles.infoValue}>
                      {jobfair.startTime} - {jobfair.endTime}
                    </Text>
                  </View>
                </View>
                {/* Location */}
                <View style={styles.infoItem}>
                  <View style={[styles.infoIconView, styles.locationIcon]}>
                    <Ionicons name="location" size={20} color="#329be0" />
                  </View>
                  <View style={styles.infoTextView}>
                    <Text style={styles.infoLabel}>LOCATION</Text>
                    <Text style={styles.infoValue}>{jobfair.location}</Text>
                  </View>
                </View>
              </View>
            </View>
          </LinearGradient>
        </View>
      </View>
    );
  };

  // --- MAIN RETURN ---
  return (
    <ScrollView style={commonStyles.screenContainer} contentContainerStyle={commonStyles.scrollContainer}>
      {/* Hero Section */}
      <LinearGradient
        colors={["#f8d8ea98", "#eca7cd83", "#fac0fa88"]}
        style={styles.header}
      >
        <Text style={styles.welcome}>Welcome to</Text>
        <View style={styles.heroTitleContainer}>
          <Text style={styles.title}>
            SkillConnect
            <TitleHighlight>4B410</TitleHighlight>
          </Text>
          <View style={styles.heroTitleUnderline} />
        </View>
        <Text style={styles.subtitle}>BARANGAY 410 ZONE 42</Text>
        <Text style={styles.paragraph}>
          Connecting skilled workers with opportunities in Barangay 410 Zone 42.
          Find local services, post your skills, and build a stronger community
          together.
        </Text>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button, styles.primaryButton]}
            onPress={handleFindServices}
          >
            <FontAwesome5 name="tools" size={16} color="#ffffff" />
            <Text style={styles.primaryButtonText}>Find Services</Text>
            <Ionicons name="arrow-forward" size={16} color="#ffffff" />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, styles.secondaryButton]}
            onPress={handlePostSkills}
          >
            <Ionicons name="people" size={18} color="#d6355d" />
            <Text style={styles.secondaryButtonText}>Provide a Service</Text>
            <Ionicons name="arrow-forward" size={16} color="#d6355d" />
          </TouchableOpacity>
        </View>

        <View style={styles.featuresContainer}>
          <View style={styles.feature}>
            <Ionicons name="star" size={16} color="#475569" />
            <Text style={styles.featureText}>Verified Professionals</Text>
          </View>
          <View style={styles.feature}>
            <Ionicons name="people" size={16} color="#475569" />
            <Text style={styles.featureText}>Local Community</Text>
          </View>
          <View style={styles.feature}>
            <Ionicons name="search" size={16} color="#475569" />
            <Text style={styles.featureText}>Easy to Find Services</Text>
          </View>
        </View>
      </LinearGradient>

      {/* How It Works Section */}
      <LinearGradient
        colors={["#f8fafc", "#f1f5f9"]}
        style={styles.howItWorks}
      >
        <Text style={styles.howTitle}>How SkillConnect4B410 Works</Text>
        <View style={styles.howUnderline} />

        <View style={styles.stepsContainer}>
          {/* Step 1 */}
          <View style={styles.stepCard}>
            <View style={styles.stepCardTopBorder} />
            <Ionicons
              name="person-add"
              size={32}
              color="#d6355d"
              style={styles.stepIcon}
            />
            <Text style={styles.stepTitle}>Create Account</Text>
            <Text style={styles.stepDesc}>
              Lorem, ipsum dolor sit amet consectetur adipisicing elit.
              Consequuntur, culpa.
            </Text>
          </View>
          {/* Step 2 */}
          <View style={styles.stepCard}>
            <View style={styles.stepCardTopBorder} />
            <Ionicons
              name="search"
              size={32}
              color="#d6355d"
              style={styles.stepIcon}
            />
            <Text style={styles.stepTitle}>Find a Job/Post a Job</Text>
            <Text style={styles.stepDesc}>
              Lorem, ipsum dolor sit amet consectetur adipisicing elit.
              Consequuntur, culpa.
            </Text>
          </View>
          {/* Step 3 */}
          <View style={styles.stepCard}>
            <View style={styles.stepCardTopBorder} />
            <Ionicons
              name="send"
              size={32}
              color="#d6355d"
              style={styles.stepIcon}
            />
            <Text style={styles.stepTitle}>
              Apply For Job/Recruit Suitable Candidates
            </Text>
            <Text style={styles.stepDesc}>
              Lorem, ipsum dolor sit amet consectetur adipisicing elit.
              Consequuntur, culpa.
            </Text>
          </View>
        </View>
      </LinearGradient>

      {/* Mission & Vision */}
      <View style={styles.mvContainer}>
        {/* Mission */}
        <LinearGradient
          colors={["#fce7f3", "#fdf2f8"]}
          style={[styles.mvBox, styles.missionBox]}
        >
          <Text style={[styles.mvTitle, styles.missionTitle]}>MISSION</Text>
          <View style={styles.mvTitleUnderline} />
          <Text style={styles.mvText}>
            Lorem, ipsum dolor sit amet consectetur adipisicing elit. Molestias
            minima, inventore, architecto voluptatum excepturi porro odit
            ducimus velit ipsam laudantium labore dicta, totam eveniet ad alias
            consequuntur voluptate voluptatem impedit!
          </Text>
        </LinearGradient>
        {/* Vision */}
        <LinearGradient
          colors={["#f0f9ff", "#e0f2fe"]}
          style={[styles.mvBox, styles.visionBox]}
        >
          <Text style={[styles.mvTitle, styles.visionTitle]}>VISION</Text>
          <View style={styles.mvTitleUnderline} />
          <Text style={styles.mvText}>
            Lorem ipsum dolor sit amet consectetur adipisicing elit. Maiores at
            expedita aut adipisci itaque architecto modi aliquam! Ad tempora,
            incidunt quae a quia repellendus dolore fugiat recusandae vel
            quibusdam ea.
          </Text>
        </LinearGradient>
      </View>

      {/* --- ANNOUNCEMENT SECTION --- */}
      {renderAnnouncement()}
    </ScrollView>
  );
}

// --- STYLESHEET ---
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff", // Fallback
  },
  scroll: {
    padding: 20,
    paddingBottom: 40,
  },
  // --- Hero Section ---
  header: {
    alignItems: "center",
    marginBottom: 30,
    padding: 20,
    borderRadius: 20,
    overflow: "hidden", // Ensures gradient respects border radius
  },
  welcome: {
    fontSize: 18, // 1.1rem
    color: "#2c3e50",
    marginBottom: 16, // 1rem
    fontWeight: "500",
  },
  heroTitleContainer: {
    marginBottom: 24, // 1.5rem
    alignItems: "center",
  },
  title: {
    fontSize: 34, // Approx 3rem
    fontWeight: "900",
    color: "#2c3e50",
    lineHeight: 50,
  },
  titleHighlight: {
    // This is the simplest way to mimic the color.
    // A true gradient text requires MaskedView and is very complex.
    color: "#d6355d",
  },
  heroTitleUnderline: {
    width: 120,
    height: 4,
    backgroundColor: "#ffd700", // Using one color from the gradient
    marginTop: 16, // 1rem
    borderRadius: 2,
  },
  subtitle: {
    marginBottom: 32, // 2rem
    fontSize: 22, // 1.8rem
    color: "#2c3e50",
    fontWeight: "600",
    letterSpacing: 1,
  },
  paragraph: {
    fontSize: 17, // 1.1rem
    color: "#6c757d",
    lineHeight: 27, // 1.7
    textAlign: "center",
    maxWidth: 600,
    marginBottom: 32,
  },
  buttonContainer: {
    width: "100%",
    marginBottom: 48, // 3rem
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16, // 1rem
    paddingHorizontal: 32, // 2rem
    borderRadius: 50, // 50px
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    marginVertical: 8,
  },
  primaryButton: {
    backgroundColor: "#d6355d",
  },
  primaryButtonText: {
    color: "#ffffff",
    fontWeight: "600",
    fontSize: 17, // 1.1rem
    marginHorizontal: 10,
  },
  secondaryButton: {
    backgroundColor: "#ffffff",
    borderWidth: 2,
    borderColor: "#d6355d",
  },
  secondaryButtonText: {
    color: "#d6355d",
    fontWeight: "600",
    fontSize: 17, // 1.1rem
    marginHorizontal: 10,
  },
  featuresContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    width: "100%",
  },
  feature: {
    alignItems: "center",
  },
  featureText: {
    fontSize: 14, // 0.875rem
    color: "#475569",
    fontWeight: "500",
    marginTop: 4,
  },
  // --- How It Works ---
  howItWorks: {
    padding: 24, // 1.5rem
    paddingVertical: 48, // 3rem
    borderRadius: 20,
    marginBottom: 30,
    alignItems: "center",
  },
  howTitle: {
    fontSize: 32, // 2.75rem
    fontWeight: "800",
    color: "#1e293b",
    marginBottom: 16, // 1rem
    textAlign: "center",
  },
  howUnderline: {
    width: 80,
    height: 4,
    backgroundColor: "#d6355d", // From gradient
    borderRadius: 2,
    marginBottom: 48, // 3rem
  },
  stepsContainer: {
    width: "100%",
  },
  stepCard: {
    backgroundColor: "white",
    padding: 32, // 2rem
    borderRadius: 16, // 1rem
    alignItems: "center",
    marginBottom: 24, // 1.5rem
    // Shadow from web CSS
    elevation: 3,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 4 },
    borderWidth: 1,
    borderColor: "#f1f5f9",
    overflow: "hidden", // for the top border
  },
  stepCardTopBorder: {
    // Mimics the hover::before effect
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: "#d6355d",
  },
  stepIcon: {
    marginBottom: 24, // 1.5rem
  },
  stepTitle: {
    fontSize: 20, // 1.25rem
    fontWeight: "700",
    color: "#1e293b",
    marginBottom: 16, // 1rem
    textAlign: "center",
  },
  stepDesc: {
    color: "#64748b",
    lineHeight: 24, // 1.6
    fontSize: 15, // 0.95rem
    textAlign: "center",
  },
  // --- Mission & Vision ---
  mvContainer: {
    marginBottom: 20,
    width: "100%",
  },
  mvBox: {
    padding: 32, // 2rem
    borderRadius: 16, // 1rem
    marginBottom: 24, // 1.5rem
    borderLeftWidth: 5,
  },
  missionBox: {
    borderColor: "#d6355d",
  },
  visionBox: {
    borderColor: "#2c3e50",
  },
  mvTitle: {
    fontSize: 28, // 2rem
    fontWeight: "800",
    marginBottom: 8,
  },
  missionTitle: {
    color: "#d6355d",
  },
  visionTitle: {
    color: "#2c3e50",
  },
  mvTitleUnderline: {
    // Mimics the ::after underline
    height: 3,
    width: 100, // Fixed width, or use '100%'
    backgroundColor: "currentColor", // This won't work, set color explicitly
    marginBottom: 16, // 1.5rem
  },
  mvText: {
    fontSize: 17, // 1.1rem
    lineHeight: 27, // 1.7
    color: "#374151",
  },
  // --- ANNOUNCEMENT STYLES ---
  announcementContainer: {
    marginBottom: 30,
    width: "100%",
  },
  sectionMainTitle: {
    alignItems: "center",
    marginBottom: 32, // 2rem
  },
  sectionH1: {
    fontSize: 32, // 4rem
    fontWeight: "900",
    color: "#2c3e50",
    letterSpacing: 3,
    textTransform: "uppercase",
  },
  sectionH1Underline: {
    width: 120,
    height: 5,
    backgroundColor: "#d6355d", // From gradient
    borderRadius: 3,
    marginTop: 16, // 15px
  },
  announcementCard: {
    borderRadius: 16,
    overflow: "hidden",
    elevation: 8,
    shadowColor: "rgba(0, 0, 0, 0.3)",
    shadowOpacity: 1,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 12 },
  },
  announcementGradient: {
    // This view holds the content
    padding: 24, // 1.5rem
  },
  announcementImages: {
    // This is a custom addition for the mobile layout
    marginBottom: 16,
  },
  announcementImage: {
    width: "100%",
    height: 180,
    borderRadius: 8,
  },
  announcementContent: {
    // No background needed, gradient is parent
  },
  announcementTitle: {
    fontSize: 28, // 3.5rem is too big for mobile
    fontWeight: "900",
    letterSpacing: 3,
    textTransform: "uppercase",
    color: "#2d1b69",
  },
  announcementTitleUnderline: {
    width: 100,
    height: 4,
    backgroundColor: "#2d1b69",
    borderRadius: 2,
    marginTop: 10,
    marginBottom: 24, // 2rem
  },
  announcementDescWrapper: {
    // Mimics the CSS
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    padding: 24, // 1.5rem
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.3)",
    marginBottom: 32, // 2rem
    elevation: 1,
  },
  announcementDesc: {
    fontSize: 17, // 1.1rem
    lineHeight: 27, // 1.7
    color: "#2d1b69",
    fontWeight: "400",
  },
  infoContainer: {
    gap: 16, // 1.5rem
  },
  infoItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    padding: 12, // 1rem
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.3)",
    elevation: 1,
  },
  infoIconView: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16, // 1.5rem
  },
  dateIcon: {
    backgroundColor: "rgba(78, 228, 78, 0.2)",
  },
  timeIcon: {
    backgroundColor: "rgba(248, 210, 75, 0.2)",
  },
  locationIcon: {
    backgroundColor: "rgba(78, 183, 255, 0.2)",
  },
  infoTextView: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 13, // 0.9rem
    fontWeight: "600",
    letterSpacing: 1,
    textTransform: "uppercase",
    color: "#2d1b69",
    marginBottom: 4, // 0.3rem
  },
  infoValue: {
    fontSize: 17, // 1.1rem
    fontWeight: "500",
    color: "#2d1b69",
  },
  announcementErrorText: {
    color: "#d6355d",
    textAlign: "center",
    fontSize: 16,
  },
});
