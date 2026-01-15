import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, Image, ActivityIndicator, ScrollView, Dimensions, Platform } from "react-native";
import { LinearGradient } from 'expo-linear-gradient';
import api from "../../api";

const { width } = Dimensions.get('window');
const isAndroid = Platform.OS === 'android';

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
    paddingVertical: isAndroid ? 16 : 20,
    paddingHorizontal: isAndroid ? 12 : 15,
  },
  gradient: {
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    alignItems: 'center',
    paddingTop: isAndroid ? 16 : 20,
    paddingBottom: isAndroid ? 12 : 15,
  },
  title: {
    fontSize: isAndroid ? (width < 360 ? 20 : 22) : 24,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
  },
  mainContent: {
    flexDirection: 'column',
    paddingHorizontal: isAndroid ? 12 : 15,
    paddingBottom: isAndroid ? 16 : 20,
  },
  leftContent: {
    marginBottom: isAndroid ? 16 : 20,
  },
  card: {
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardGradient: {
    padding: isAndroid ? 14 : 16,
  },
  eventTitle: {
    fontSize: isAndroid ? (width < 360 ? 18 : 20) : 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: isAndroid ? 10 : 12,
    textAlign: 'center',
  },
  description: {
    fontSize: isAndroid ? 13 : 14,
    color: '#666',
    lineHeight: isAndroid ? 18 : 20,
    marginBottom: isAndroid ? 16 : 20,
    textAlign: 'center',
  },
  details: {
    gap: isAndroid ? 14 : 16,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: isAndroid ? 36 : 40,
    height: isAndroid ? 36 : 40,
    backgroundColor: '#fce4ec',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: isAndroid ? 10 : 12,
  },
  icon: {
    fontSize: isAndroid ? 18 : 20,
  },
  detailLabel: {
    fontSize: isAndroid ? 10 : 11,
    fontWeight: '600',
    color: '#666',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: isAndroid ? 1 : 2,
  },
  detailValue: {
    fontSize: isAndroid ? 13 : 14,
    fontWeight: '500',
    color: '#333',
  },
  rightContent: {
    flex: 1,
  },
  imagesGrid: {
    flexDirection: 'row',
    gap: isAndroid ? 10 : 12,
  },
  image: {
    flex: 1,
    height: isAndroid ? (width < 360 ? 100 : 110) : 120,
    borderRadius: 8,
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
});

export default Announcement;
