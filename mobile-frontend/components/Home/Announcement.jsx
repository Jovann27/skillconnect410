import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, Image, ActivityIndicator, ScrollView } from "react-native";
import { LinearGradient } from 'expo-linear-gradient';
import api from "../../api";

const Announcement = () => {
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

  if (loading) return (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color="#c20884" />
    </View>
  );

  if (error) return null;

  if (!jobfair || new Date(jobfair.date) < new Date()) return null;

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#fce4ec', '#fff', '#fce4ec']}
        style={styles.gradient}
      >
        <View style={styles.header}>
          <Text style={styles.title}>CAREER FAIR</Text>
        </View>

        <View style={styles.mainContent}>
          <View style={styles.leftContent}>
            <View style={styles.card}>
              <LinearGradient
                colors={['#fce4ec', '#fff', '#fce4ec']}
                style={styles.cardGradient}
              >
                <Text style={styles.eventTitle}>{jobfair.title}</Text>

                {jobfair.description && (
                  <Text style={styles.description}>{jobfair.description}</Text>
                )}

                <View style={styles.details}>
                  <View style={styles.detailItem}>
                    <View style={styles.iconContainer}>
                      <Text style={styles.icon}>📅</Text>
                    </View>
                    <View>
                      <Text style={styles.detailLabel}>DATE</Text>
                      <Text style={styles.detailValue}>
                        {jobfair.date ? new Date(jobfair.date).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        }) : 'Jun 24, 2025'}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.detailItem}>
                    <View style={styles.iconContainer}>
                      <Text style={styles.icon}>⏰</Text>
                    </View>
                    <View>
                      <Text style={styles.detailLabel}>TIME</Text>
                      <Text style={styles.detailValue}>
                        {jobfair.startTime} - {jobfair.endTime}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.detailItem}>
                    <View style={styles.iconContainer}>
                      <Text style={styles.icon}>📍</Text>
                    </View>
                    <View>
                      <Text style={styles.detailLabel}>LOCATION</Text>
                      <Text style={styles.detailValue}>
                        {jobfair.location}
                      </Text>
                    </View>
                  </View>
                </View>
              </LinearGradient>
            </View>
          </View>

          <View style={styles.rightContent}>
            <View style={styles.imagesGrid}>
              <Image
                source={{ uri: "https://images.unsplash.com/photo-1521791136064-7986c2920216?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1469&q=80" }}
                style={styles.image}
                resizeMode="cover"
              />
              <Image
                source={{ uri: "https://images.unsplash.com/photo-1556761175-b413da4baf72?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1574&q=80" }}
                style={styles.image}
                resizeMode="cover"
              />
            </View>
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  header: {
    alignItems: 'center',
    paddingTop: 40,
    paddingBottom: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
  },
  mainContent: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  leftContent: {
    flex: 1,
    paddingRight: 20,
  },
  card: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardGradient: {
    padding: 24,
  },
  eventTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
    marginBottom: 24,
    textAlign: 'center',
  },
  details: {
    gap: 20,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 48,
    height: 48,
    backgroundColor: '#fce4ec',
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  icon: {
    fontSize: 24,
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  rightContent: {
    flex: 1,
  },
  imagesGrid: {
    gap: 16,
  },
  image: {
    width: '100%',
    height: 180,
    borderRadius: 12,
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
});

export default Announcement;
