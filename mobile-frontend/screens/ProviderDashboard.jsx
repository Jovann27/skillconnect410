import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput,
  FlatList, Image, Alert, Modal, RefreshControl, ActivityIndicator,
  PanGestureHandler, State, Platform, StatusBar, useWindowDimensions, Dimensions
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useMainContext } from '../contexts/MainContext';
import MobileHeader from '../components/MobileHeader';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { Card, Title, Paragraph, Button, FAB, Chip, Badge, Surface, TextInput as PaperTextInput, Portal, Dialog } from 'react-native-paper';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';

// Helper function to render stars
const renderStars = (rating) => {
  const stars = [];
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 !== 0;

  for (let i = 0; i < 5; i++) {
    if (i < fullStars) {
      stars.push(<Icon key={i} name="star" size={16} color="#FFD700" />);
    } else if (i === fullStars && hasHalfStar) {
      stars.push(<Icon key={i} name="star-half" size={16} color="#FFD700" />);
    } else {
      stars.push(<Icon key={i} name="star-outline" size={16} color="#DDD" />);
    }
  }
  return stars;
};

const ProviderDashboard = () => {
  const { user, api } = useMainContext();
  const navigation = useNavigation();

  // Get device dimensions for responsive design
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const isSmallDevice = screenWidth < 375;
  const isLargeDevice = screenWidth > 414;

  // Core state with offline capabilities
  const [activeTab, setActiveTab] = useState('requests');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [isOffline, setIsOffline] = useState(false);

  // Modal state with bottom-sheet presentation
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [commissionFee, setCommissionFee] = useState('');
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);

  // Proof of work modal state
  const [showProofModal, setShowProofModal] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [proofFiles, setProofFiles] = useState([]);
  const [completionNotes, setCompletionNotes] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  // Data state
  const [serviceRequests, setServiceRequests] = useState([]);
  const [serviceOffers, setServiceOffers] = useState([]);
  const [applications, setApplications] = useState([]);
  const [activeBookings, setActiveBookings] = useState([]);
  const [certificates, setCertificates] = useState([]);
  const [workProof, setWorkProof] = useState([]);

  // Performance optimizations
  const [searchTimeout, setSearchTimeout] = useState(null);

  useEffect(() => {
    // Enhanced status bar styling with theme awareness
    StatusBar.setBarStyle('dark-content', true);
    if (Platform.OS === 'android') {
      StatusBar.setBackgroundColor('#f5f5f5');
      StatusBar.setTranslucent(true);
    }

    if (user && user.role === 'Service Provider') {
      fetchData();
    } else if (user && user.role !== 'Service Provider') {
      Alert.alert('Error', 'This dashboard is only available for service providers');
      navigation.goBack();
    }
  }, [user]);

  const fetchData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchServiceRequests(),
        fetchServiceOffers(),
        fetchApplications(),
        fetchActiveBookings(),
        fetchCertificates(),
        fetchWorkProof()
      ]);
    } catch (error) {
      console.error('Error fetching data:', error);
      Alert.alert('Error', 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const fetchServiceRequests = async () => {
    try {
      const response = await api.get('/user/available-service-requests', {
        params: {
          limit: 10000,
          useRecommendations: true
        }
      });
      if (response.data.success) {
        setServiceRequests(response.data.requests || []);
      } else {
        setServiceRequests([]);
      }
    } catch (error) {
      console.error('Error fetching service requests:', error);
      setServiceRequests([]);
    }
  };

  const fetchServiceOffers = async () => {
    try {
      const response = await api.get('/user/provider-offers', {
        params: {
          page: 1,
          limit: 10000
        }
      });
      if (response.data.success) {
        setServiceOffers(response.data.offers || []);
      } else {
        setServiceOffers([]);
      }
    } catch (error) {
      console.error('Error fetching service offers:', error);
      setServiceOffers([]);
    }
  };

  const fetchApplications = async () => {
    try {
      const response = await api.get('/user/provider-applications');
      if (response.data.success) {
        setApplications(response.data.applications || []);
      } else {
        setApplications([]);
      }
    } catch (error) {
      console.error('Error fetching applications:', error);
      setApplications([]);
    }
  };

  const fetchActiveBookings = async () => {
    try {
      const response = await api.get('/user/bookings', {
        params: { status: 'In Progress' }
      });
      if (response.data.success) {
        const providerBookings = response.data.bookings.filter(booking =>
          booking.provider && String(booking.provider._id) === String(user._id)
        );
        setActiveBookings(providerBookings || []);
      } else {
        setActiveBookings([]);
      }
    } catch (error) {
      console.error('Error fetching active bookings:', error);
      setActiveBookings([]);
    }
  };

  const fetchCertificates = async () => {
    try {
      const response = await api.get('/user/my-certificates');
      if (response.data.success) {
        setCertificates(response.data.certificates || []);
      } else {
        setCertificates([]);
      }
    } catch (error) {
      console.error('Error fetching certificates:', error);
      setCertificates([]);
    }
  };

  const fetchWorkProof = async () => {
    try {
      const response = await api.get('/user/my-work-proof');
      if (response.data.success) {
        setWorkProof(response.data.workProof || []);
      } else {
        setWorkProof([]);
      }
    } catch (error) {
      console.error('Error fetching work proof:', error);
      setWorkProof([]);
    }
  };

  const handleApplyToRequest = async (requestId, commissionFee) => {
    if (hasAlreadyApplied(requestId)) {
      setShowDuplicateModal(true);
      setShowApplyModal(false);
      setSelectedRequest(null);
      setCommissionFee('');
      return;
    }

    try {
      const response = await api.post(`/user/apply-to-request/${requestId}`, {
        commissionFee: parseFloat(commissionFee)
      });
      if (response.data.success) {
        setSuccessMessage(`Your application for "${selectedRequest.name}" has been submitted successfully with a commission fee of ₱${parseFloat(commissionFee).toLocaleString()}!`);
        setShowSuccessModal(true);
        fetchServiceRequests();
        fetchApplications();
        setShowApplyModal(false);
        setSelectedRequest(null);
        setCommissionFee('');
      }
    } catch (error) {
      console.error('Error applying to request:', error);
      Alert.alert('Error', 'Failed to apply to request');
    }
  };

  const handleRespondToOffer = async (offer, action) => {
    if (action === 'accept') {
      const confirmed = Alert.alert(
        'Confirm Acceptance',
        'Are you sure you want to accept this offer? This action cannot be undone.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Accept', onPress: () => processOfferResponse(offer, action) }
        ]
      );
      return;
    }

    await processOfferResponse(offer, action);
  };

  const processOfferResponse = async (offer, action) => {
    try {
      let response;

      if (offer.type === 'direct') {
        response = await api.post(`/user/respond-to-offer/${offer._id}`, { action });
      } else if (offer.type === 'request') {
        if (action === 'accept') {
          response = await api.post(`/user/offer/${offer._id}/accept`);
        } else {
          response = await api.post(`/user/offer/${offer._id}/reject`);
        }
      }

      if (response && response.data.success) {
        Alert.alert('Success', `Offer ${action === 'accept' ? 'accepted' : 'declined'} successfully!`);
        fetchServiceOffers();
        fetchApplications();
      }
    } catch (error) {
      console.error('Error responding to offer:', error);
      Alert.alert('Error', `Failed to ${action} offer`);
    }
  };

  const hasAlreadyApplied = (requestId) => {
    return applications.some(app => app.serviceRequest && app.serviceRequest._id === requestId);
  };

  const selectProofFiles = async () => {
    try {
      Alert.alert(
        'Select File Type',
        'Choose how you want to add proof of work',
        [
          {
            text: 'Take Photo',
            onPress: async () => {
              const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
              if (permissionResult.granted === false) {
                Alert.alert('Permission required', 'Camera permission is required to take photos');
                return;
              }

              const result = await ImagePicker.launchCameraAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                quality: 0.8,
                aspect: [4, 3],
              });

              if (!result.canceled && result.assets && result.assets.length > 0) {
                const file = result.assets[0];
                const fileSize = file.fileSize || 0;
                if (fileSize > 5 * 1024 * 1024) { // 5MB limit
                  Alert.alert('File too large', 'Please select a file smaller than 5MB');
                  return;
                }

                const fileData = {
                  uri: file.uri,
                  type: file.type || 'image/jpeg',
                  name: `proof_${Date.now()}.jpg`,
                  size: fileSize,
                };
                setProofFiles(prev => [...prev, fileData]);
              }
            }
          },
          {
            text: 'Choose from Gallery',
            onPress: async () => {
              const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
              if (permissionResult.granted === false) {
                Alert.alert('Permission required', 'Media library permission is required to select files');
                return;
              }

              const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.All,
                allowsEditing: true,
                quality: 0.8,
                aspect: [4, 3],
              });

              if (!result.canceled && result.assets && result.assets.length > 0) {
                const file = result.assets[0];
                const fileSize = file.fileSize || 0;
                if (fileSize > 5 * 1024 * 1024) { // 5MB limit
                  Alert.alert('File too large', 'Please select a file smaller than 5MB');
                  return;
                }

                let fileName = `proof_${Date.now()}`;
                if (file.type?.startsWith('image/')) {
                  fileName += '.jpg';
                } else if (file.type?.startsWith('video/')) {
                  fileName += '.mp4';
                } else {
                  fileName += '.file';
                }

                const fileData = {
                  uri: file.uri,
                  type: file.type || 'application/octet-stream',
                  name: fileName,
                  size: fileSize,
                };
                setProofFiles(prev => [...prev, fileData]);
              }
            }
          },
          {
            text: 'Select Document',
            onPress: async () => {
              try {
                const result = await DocumentPicker.getDocumentAsync({
                  type: ['application/pdf', 'image/*', 'video/*'],
                  copyToCacheDirectory: true,
                });

                if (result.type === 'success') {
                  const fileSize = result.size || 0;
                  if (fileSize > 5 * 1024 * 1024) { // 5MB limit
                    Alert.alert('File too large', 'Please select a file smaller than 5MB');
                    return;
                  }

                  const fileData = {
                    uri: result.uri,
                    type: result.mimeType || 'application/octet-stream',
                    name: result.name || `document_${Date.now()}`,
                    size: fileSize,
                  };
                  setProofFiles(prev => [...prev, fileData]);
                }
              } catch (error) {
                console.error('Document picker error:', error);
                Alert.alert('Error', 'Failed to select document');
              }
            }
          },
          {
            text: 'Cancel',
            style: 'cancel'
          }
        ]
      );
    } catch (error) {
      console.error('File selection error:', error);
      Alert.alert('Error', 'Failed to select file');
    }
  };

  const removeProofFile = (index) => {
    setProofFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleUploadProofOfWork = async () => {
    if (!selectedBooking || proofFiles.length === 0) {
      Alert.alert('Error', 'Please select files to upload');
      return;
    }

    const formData = new FormData();
    proofFiles.forEach(file => {
      formData.append('proofOfWork', file);
    });
    if (completionNotes.trim()) {
      formData.append('completionNotes', completionNotes.trim());
    }

    try {
      const response = await api.post(`/user/booking/${selectedBooking._id}/upload-proof`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      if (response.data.success) {
        Alert.alert('Success', 'Proof of work uploaded successfully! Service marked as completed.');
        setShowProofModal(false);
        setSelectedBooking(null);
        setProofFiles([]);
        setCompletionNotes('');
        fetchActiveBookings();
        fetchApplications();
      }
    } catch (error) {
      console.error('Error uploading proof of work:', error);
      Alert.alert('Error', 'Failed to upload proof of work');
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchData().then(() => setRefreshing(false));
  };

  const renderRequestsTab = () => (
    <View style={styles.tabContent}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Available Service Requests</Text>
        <Text style={styles.sectionSubtitle}>
          Showing {serviceRequests.length} request{serviceRequests.length !== 1 ? 's' : ''} that match your skills
        </Text>
      </View>

      {serviceRequests.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Icon name="work" size={48} color="#CCC" />
          <Text style={styles.emptyTitle}>No Available Requests</Text>
          <Text style={styles.emptyText}>
            No service requests match your skills at the moment. Check back later!
          </Text>
        </View>
      ) : (
        <FlatList
          data={serviceRequests}
          renderItem={renderRequestCard}
          keyExtractor={(item) => item._id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          contentContainerStyle={styles.requestsList}
        />
      )}
    </View>
  );

  const renderOffersTab = () => (
    <View style={styles.tabContent}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Service Offers</Text>
        <Text style={styles.sectionSubtitle}>
          {serviceOffers.length} offer{serviceOffers.length !== 1 ? 's' : ''} requiring your response
        </Text>
      </View>

      {serviceOffers.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Icon name="handshake" size={48} color="#CCC" />
          <Text style={styles.emptyTitle}>No Pending Offers</Text>
          <Text style={styles.emptyText}>
            You don't have any pending service offers at the moment.
          </Text>
        </View>
      ) : (
        <FlatList
          data={serviceOffers}
          renderItem={renderOfferCard}
          keyExtractor={(item) => item._id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          contentContainerStyle={styles.offersList}
        />
      )}
    </View>
  );

  const renderApplicationsTab = () => {
    const pendingApplications = applications.filter(app => app.status !== 'Accepted');
    const allWorkRecords = [
      ...activeBookings.map(booking => ({
        ...booking,
        type: 'active_booking',
        title: booking.serviceRequest?.name || booking.serviceOffer?.title || 'Active Service',
        description: booking.serviceRequest?.notes || booking.serviceOffer?.description || 'Ongoing service work',
        client: booking.requester,
        budget: booking.serviceRequest?.minBudget || booking.serviceRequest?.maxBudget || booking.serviceOffer?.minBudget || booking.serviceOffer?.maxBudget,
        status: booking.status,
        createdAt: booking.createdAt
      })),
      ...pendingApplications.map(application => ({
        ...application,
        type: 'application',
        title: application.serviceRequest?.name || 'Application',
        description: application.serviceRequest?.notes || 'Service request application',
        client: application.serviceRequest?.requester,
        budget: application.commissionFee || application.serviceRequest?.minBudget || application.serviceRequest?.maxBudget,
        status: application.status || 'Applied',
        createdAt: application.createdAt
      }))
    ];

    const uniqueWorkRecords = allWorkRecords.filter((record, index, self) =>
      index === self.findIndex(r => r._id === record._id)
    );

    return (
      <View style={styles.tabContent}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>My Work Records</Text>
          <Text style={styles.sectionSubtitle}>
            {uniqueWorkRecords.length} active work{uniqueWorkRecords.length !== 1 ? 's' : ''}
          </Text>
        </View>

        {uniqueWorkRecords.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Icon name="file-text" size={48} color="#CCC" />
            <Text style={styles.emptyTitle}>No Work Records</Text>
            <Text style={styles.emptyText}>
              You haven't submitted any work records yet.
            </Text>
          </View>
        ) : (
          <FlatList
            data={uniqueWorkRecords}
            renderItem={renderWorkRecordCard}
            keyExtractor={(item) => item._id}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            contentContainerStyle={styles.workRecordsList}
          />
        )}
      </View>
    );
  };

  const renderRequestCard = ({ item: request }) => {
    const alreadyApplied = hasAlreadyApplied(request._id);
    const matchStrength = request.matchStrength;
    const recommendationScore = request.recommendationScore;

    const getMatchBadgeColor = () => {
      switch(matchStrength) {
        case 'high': return 'success';
        case 'medium': return 'warning';
        default: return 'primary';
      }
    };

    return (
      <Card style={styles.requestCard} mode="elevated">
        <Card.Content>
          <View style={styles.requestHeader}>
            <View style={styles.requestTitleRow}>
              <Title style={styles.requestTitle}>{request.name}</Title>
              {matchStrength && (
                <Chip mode="flat" style={{ backgroundColor: getMatchBadgeColor() }}>
                  {matchStrength.charAt(0).toUpperCase() + matchStrength.slice(1)} Match
                </Chip>
              )}
            </View>
            <Paragraph style={styles.requestType}>{request.typeOfWork}</Paragraph>
            <View style={styles.requestLocationRow}>
              <Icon name="location-on" size={14} color="#666" />
              <Text style={styles.requestLocation}>{request.address || 'Location not specified'}</Text>
            </View>
          </View>

          <View style={styles.requestBudgetRow}>
            <Text style={styles.requestBudget}>
              ₱{request.minBudget && request.maxBudget
                ? `${request.minBudget.toLocaleString()} - ₱${request.maxBudget.toLocaleString()}`
                : request.minBudget || request.maxBudget
                ? `₱${(request.minBudget || request.maxBudget).toLocaleString()}`
                : 'Budget not specified'
              }
            </Text>
            <View style={styles.requestTimeRow}>
              <Icon name="schedule" size={14} color="#666" />
              <Text style={styles.requestTime}>{request.time || 'Time not specified'}</Text>
            </View>
          </View>

          {request.notes && (
            <Paragraph style={styles.requestNotes} numberOfLines={2}>{request.notes}</Paragraph>
          )}

          <View style={styles.requestFooter}>
            <Text style={styles.requestRequester}>
              Requested by {request.requester?.firstName}
            </Text>
            {recommendationScore && (
              <Text style={styles.relevanceScore}>
                Relevance: {(recommendationScore * 100).toFixed(0)}%
              </Text>
            )}
          </View>

          {alreadyApplied ? (
            <View style={styles.alreadyAppliedBadge}>
              <Icon name="check-circle" size={16} color="#4CAF50" />
              <Text style={styles.alreadyAppliedText}>Already Applied</Text>
            </View>
          ) : (
            <Card.Actions>
              <Button
                mode="contained"
                icon="work"
                onPress={() => {
                  setSelectedRequest(request);
                  setCommissionFee('');
                  setShowApplyModal(true);
                }}
                style={styles.applyButton}
              >
                Apply to Request
              </Button>
            </Card.Actions>
          )}
        </Card.Content>
      </Card>
    );
  };

  const renderOfferCard = ({ item: offer }) => (
    <View style={styles.offerCard}>
      <View style={styles.offerHeader}>
        <View style={styles.offerTitleRow}>
          <Text style={styles.offerTitle}>{offer.title}</Text>
          <View style={[styles.offerTypeBadge,
            offer.type === 'direct' ? styles.directBadge : styles.requestBadge
          ]}>
            <Text style={styles.offerTypeText}>
              {offer.type === 'direct' ? 'Direct Offer' : 'Service Request'}
            </Text>
          </View>
        </View>
        <Text style={styles.offerDescription}>{offer.description}</Text>
      </View>

      <View style={styles.offerDetails}>
        <View style={styles.detailRow}>
          <Icon name="location-on" size={14} color="#666" />
          <Text style={styles.detailText}>{offer.location || 'Location not specified'}</Text>
        </View>
        {offer.preferredDate && (
          <View style={styles.detailRow}>
            <Icon name="calendar-today" size={14} color="#666" />
            <Text style={styles.detailText}>
              {new Date(offer.preferredDate).toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </Text>
          </View>
        )}
        <View style={styles.detailRow}>
          <Icon name="person" size={14} color="#666" />
          <Text style={styles.detailText}>
            From: {offer.requester?.firstName} {offer.requester?.lastName}
          </Text>
        </View>
        <Text style={styles.offerDate}>
          Received: {new Date(offer.createdAt).toLocaleDateString()} at {new Date(offer.createdAt).toLocaleTimeString()}
        </Text>
      </View>

      <View style={styles.offerBudget}>
        <Text style={styles.offerBudgetText}>
          ₱{offer.minBudget && offer.maxBudget
            ? `${offer.minBudget.toLocaleString()} - ₱${offer.maxBudget.toLocaleString()}`
            : offer.minBudget || offer.maxBudget
            ? `₱${(offer.minBudget || offer.maxBudget).toLocaleString()}`
            : 'Budget not specified'
          }
        </Text>
        {offer.requester?.phone && (
          <Text style={styles.offerPhone}>{offer.requester.phone}</Text>
        )}
      </View>

      <View style={styles.offerActions}>
        <TouchableOpacity
          style={styles.acceptOfferButton}
          onPress={() => handleRespondToOffer(offer, 'accept')}
        >
          <Icon name="check" size={16} color="#FFF" />
          <Text style={styles.acceptOfferText}>Accept Offer</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.declineOfferButton}
          onPress={() => handleRespondToOffer(offer, 'decline')}
        >
          <Icon name="close" size={16} color="#FFF" />
          <Text style={styles.declineOfferText}>Decline Offer</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderWorkRecordCard = ({ item: record }) => (
    <View style={styles.workRecordCard}>
      <View style={styles.workRecordHeader}>
        <Text style={styles.workRecordTitle}>{record.title}</Text>
        <View style={[styles.statusBadge,
          record.status === 'In Progress' ? styles.inProgressBadge :
          record.status === 'Applied' ? styles.appliedBadge :
          record.status === 'Pending' ? styles.pendingBadge :
          record.status === 'Declined' ? styles.declinedBadge :
          styles.defaultBadge
        ]}>
          <Text style={styles.statusText}>{record.status}</Text>
        </View>
      </View>

      <Text style={styles.workRecordDescription}>{record.description}</Text>
      <Text style={styles.workRecordClient}>Client: {record.client?.firstName} {record.client?.lastName}</Text>

      <View style={styles.workRecordFooter}>
        <Text style={styles.workRecordBudget}>
          {record.budget ? `₱${record.budget.toLocaleString()}` : 'Budget not specified'}
        </Text>
        {record.type === 'active_booking' && (
          <Text style={styles.workRecordDate}>
            Started: {new Date(record.createdAt).toLocaleDateString()}
          </Text>
        )}
        {record.type === 'application' && (
          <Text style={styles.workRecordDate}>
            Applied: {new Date(record.createdAt).toLocaleDateString()}
          </Text>
        )}
      </View>

      {record.type === 'active_booking' && record.status === 'In Progress' && (
        <TouchableOpacity
          style={styles.uploadProofButton}
          onPress={() => {
            setSelectedBooking(record);
            setShowProofModal(true);
          }}
        >
          <Icon name="cloud-upload" size={16} color="#FFF" />
          <Text style={styles.uploadProofText}>Upload Proof & Complete</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
        <Text style={styles.loadingText}>Loading your dashboard...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MobileHeader title="Worker Dashboard" />

      {/* Stats Overview */}
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{serviceRequests.length}</Text>
          <Text style={styles.statLabel}>Available Requests</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{serviceOffers.length}</Text>
          <Text style={styles.statLabel}>Pending Offers</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>
            {(() => {
              const pendingApplications = applications.filter(app => app.status !== 'Accepted');
              const allWorkRecords = [
                ...activeBookings.map(booking => ({ ...booking, _id: booking._id })),
                ...pendingApplications.map(application => ({ ...application, _id: application._id }))
              ];
              const uniqueWorkRecords = allWorkRecords.filter((record, index, self) =>
                index === self.findIndex(r => r._id === record._id)
              );
              return uniqueWorkRecords.length;
            })()}
          </Text>
          <Text style={styles.statLabel}>Work Records</Text>
        </View>
      </View>

      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'requests' && styles.activeTab]}
          onPress={() => setActiveTab('requests')}
        >
          <Text style={[styles.tabText, activeTab === 'requests' && styles.activeTabText]}>Requests</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'offers' && styles.activeTab]}
          onPress={() => setActiveTab('offers')}
        >
          <Text style={[styles.tabText, activeTab === 'offers' && styles.activeTabText]}>Offers</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'applications' && styles.activeTab]}
          onPress={() => setActiveTab('applications')}
        >
          <Text style={[styles.tabText, activeTab === 'applications' && styles.activeTabText]}>Work</Text>
        </TouchableOpacity>
      </View>

      {/* Tab Content */}
      {activeTab === 'requests' && renderRequestsTab()}
      {activeTab === 'offers' && renderOffersTab()}
      {activeTab === 'applications' && renderApplicationsTab()}

      {/* Apply Modal */}
      <Modal visible={showApplyModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Confirm Application</Text>
              <TouchableOpacity onPress={() => setShowApplyModal(false)}>
                <Icon name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            {selectedRequest && (
              <View style={styles.requestDetails}>
                <Text style={styles.selectedRequestName}>{selectedRequest.name}</Text>
                <Text style={styles.selectedRequestType}>{selectedRequest.typeOfWork}</Text>
                <Text style={styles.selectedRequestBudget}>
                  Budget: ₱{selectedRequest.minBudget && selectedRequest.maxBudget
                    ? `${selectedRequest.minBudget.toLocaleString()} - ₱${selectedRequest.maxBudget.toLocaleString()}`
                    : selectedRequest.minBudget || selectedRequest.maxBudget
                    ? `${(selectedRequest.minBudget || selectedRequest.maxBudget).toLocaleString()}`
                    : 'Not specified'
                  }
                </Text>
              </View>
            )}

            <View style={styles.feeInputContainer}>
              <Text style={styles.feeLabel}>Desired Commission Fee (₱)</Text>
              <TextInput
                style={styles.feeInput}
                value={commissionFee}
                onChangeText={setCommissionFee}
                placeholder="Enter your commission fee"
                keyboardType="numeric"
              />
              <Text style={styles.feeNote}>
                Fee must be within the client's budget range
              </Text>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowApplyModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmButton}
                onPress={() => {
                  const fee = parseFloat(commissionFee);
                  if (isNaN(fee) || fee < 0) {
                    Alert.alert('Error', 'Please enter a valid commission fee');
                    return;
                  }
                  if (selectedRequest.maxBudget && fee > selectedRequest.maxBudget) {
                    Alert.alert('Error', `Commission fee cannot exceed ₱${selectedRequest.maxBudget.toLocaleString()}`);
                    return;
                  }
                  if (selectedRequest.minBudget && fee < selectedRequest.minBudget) {
                    Alert.alert('Error', `Commission fee cannot be less than ₱${selectedRequest.minBudget.toLocaleString()}`);
                    return;
                  }
                  handleApplyToRequest(selectedRequest._id, commissionFee);
                }}
              >
                <Text style={styles.confirmButtonText}>Confirm Apply</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Success Modal */}
      <Modal visible={showSuccessModal} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.successModalContent}>
            <Icon name="check-circle" size={64} color="#4CAF50" />
            <Text style={styles.successTitle}>Application Submitted!</Text>
            <Text style={styles.successMessage}>{successMessage}</Text>
            <View style={styles.successActions}>
              <TouchableOpacity
                style={styles.successButton}
                onPress={() => setShowSuccessModal(false)}
              >
                <Text style={styles.successButtonText}>Continue Browsing</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.successButton, styles.primarySuccessButton]}
                onPress={() => {
                  setShowSuccessModal(false);
                  setActiveTab('applications');
                }}
              >
                <Text style={styles.primarySuccessButtonText}>View My Applications</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Duplicate Application Modal */}
      <Modal visible={showDuplicateModal} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.duplicateModalContent}>
            <Icon name="error" size={64} color="#F44336" />
            <Text style={styles.duplicateTitle}>Already Applied</Text>
            <Text style={styles.duplicateMessage}>
              You have already submitted an application for this service request.
              You cannot apply to the same request multiple times.
            </Text>
            <View style={styles.duplicateInfo}>
              <Text style={styles.duplicateInfoText}>
                Check your applications in the "Work" tab.
              </Text>
            </View>
            <View style={styles.duplicateActions}>
              <TouchableOpacity
                style={styles.duplicateButton}
                onPress={() => setShowDuplicateModal(false)}
              >
                <Text style={styles.duplicateButtonText}>Continue Browsing</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.duplicateButton, styles.primaryDuplicateButton]}
                onPress={() => {
                  setShowDuplicateModal(false);
                  setActiveTab('applications');
                }}
              >
                <Text style={styles.primaryDuplicateButtonText}>View My Work</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Proof of Work Modal */}
      <Modal visible={showProofModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Upload Proof of Work</Text>
              <TouchableOpacity onPress={() => setShowProofModal(false)}>
                <Icon name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            {selectedBooking && (
              <View style={styles.bookingDetails}>
                <Text style={styles.bookingTitle}>{selectedBooking.title}</Text>
                <Text style={styles.bookingClient}>
                  Client: {selectedBooking.client?.firstName} {selectedBooking.client?.lastName}
                </Text>
              </View>
            )}

            <View style={styles.fileInputContainer}>
              <Text style={styles.fileInputLabel}>Upload Photos/Videos of Completed Work *</Text>
              <TouchableOpacity style={styles.fileInput} onPress={selectProofFiles}>
                <Icon name="add-photo-alternate" size={24} color="#666" />
                <Text style={styles.fileInputText}>Select Files</Text>
              </TouchableOpacity>

              {proofFiles.length > 0 && (
                <View style={styles.selectedFilesContainer}>
                  <Text style={styles.selectedFilesTitle}>Selected Files ({proofFiles.length})</Text>
                  {proofFiles.map((file, index) => (
                    <View key={index} style={styles.selectedFileItem}>
                      <View style={styles.fileInfo}>
                        <Icon
                          name={
                            file.type?.startsWith('image/') ? 'image' :
                            file.type?.startsWith('video/') ? 'videocam' :
                            'description'
                          }
                          size={20}
                          color="#666"
                        />
                        <Text style={styles.fileName} numberOfLines={1}>
                          {file.name}
                        </Text>
                        <Text style={styles.fileSize}>
                          ({(file.size / 1024 / 1024).toFixed(2)} MB)
                        </Text>
                      </View>
                      <TouchableOpacity
                        onPress={() => removeProofFile(index)}
                        style={styles.removeFileButton}
                      >
                        <Icon name="close" size={16} color="#F44336" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}

              <Text style={styles.fileInputNote}>
                Supported formats: Images, Videos, PDFs (Max 5MB each)
              </Text>
            </View>

            <View style={styles.notesContainer}>
              <Text style={styles.notesLabel}>Completion Notes (Optional)</Text>
              <TextInput
                style={styles.notesInput}
                value={completionNotes}
                onChangeText={setCompletionNotes}
                placeholder="Describe what was completed..."
                multiline
                numberOfLines={3}
              />
              <Text style={styles.charCount}>{completionNotes.length}/500 characters</Text>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowProofModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.uploadButton, proofFiles.length === 0 && styles.disabledButton]}
                onPress={handleUploadProofOfWork}
                disabled={proofFiles.length === 0}
              >
                <Icon name="cloud-upload" size={16} color="#FFF" />
                <Text style={styles.uploadButtonText}>Upload & Complete Job</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.uploadNote}>
              <Text style={styles.uploadNoteText}>
                Once uploaded, this job will be marked as completed and the client will be able to leave a review.
              </Text>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  // Main container with responsive padding and status bar handling
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    paddingTop: 10,
  },

  // Enhanced loading states with better visual feedback
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    paddingTop: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },

  // Enhanced stats overview with responsive design
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    margin: 16,
    marginBottom: 8,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 12,
  },
  statNumber: {
    fontSize: 28,
    fontWeight: '800',
    color: '#2196F3',
    marginBottom: 6,
  },
  statLabel: {
    fontSize: 13,
    color: '#666',
    textAlign: 'center',
    fontWeight: '500',
  },

  // Enhanced tab navigation with larger touch targets
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  tab: {
    flex: 1,
    paddingVertical: 16, // Increased for better touch targets (44px minimum)
    alignItems: 'center',
    borderRadius: 16,
    margin: 4,
    minHeight: 48, // Ensure minimum touch target
  },
  activeTab: {
    backgroundColor: '#2196F3',
    shadowColor: '#2196F3',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 6,
  },
  tabText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#666',
  },
  activeTabText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  tabContent: { flex: 1 },

  // Enhanced section headers
  sectionHeader: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    marginBottom: 6,
  },
  sectionSubtitle: {
    fontSize: 15,
    color: '#666',
    fontWeight: '500',
  },

  // Enhanced empty states with better visual hierarchy
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#333',
    marginTop: 20,
    marginBottom: 12,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 17,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: 300,
  },

  // Optimized request cards with better responsive design
  requestsList: {
    padding: 16,
    paddingBottom: 32,
  },
  requestCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  requestHeader: { marginBottom: 16, padding: 20, paddingBottom: 12 },
  requestTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  requestTitle: { fontSize: 18, fontWeight: '700', color: '#333', flex: 1, marginRight: 12, lineHeight: 24 },
  matchBadge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16 },
  matchBadgeText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  requestType: { fontSize: 15, color: '#666', marginBottom: 6, fontWeight: '500' },
  requestLocationRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  requestLocation: { fontSize: 15, color: '#666', marginLeft: 6 },
  requestBudgetRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  requestBudget: { fontSize: 18, fontWeight: '800', color: '#4CAF50' },
  requestTimeRow: { flexDirection: 'row', alignItems: 'center' },
  requestTime: { fontSize: 13, color: '#666', marginLeft: 6 },
  requestNotes: { fontSize: 15, color: '#666', marginBottom: 12, lineHeight: 22 },
  requestFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 16 },
  requestRequester: { fontSize: 13, color: '#666', fontWeight: '500' },
  relevanceScore: { fontSize: 13, color: '#2196F3', fontWeight: '600' },
  alreadyAppliedBadge: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#E8F5E8', padding: 16, borderRadius: 12, marginHorizontal: 20, marginBottom: 16 },
  alreadyAppliedText: { color: '#4CAF50', fontWeight: '700', marginLeft: 10, fontSize: 16 },
  applyButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#2196F3', padding: 16, borderRadius: 12, marginHorizontal: 20, marginBottom: 16, minHeight: 52 },
  applyButtonText: { color: '#fff', fontWeight: '700', marginLeft: 10, fontSize: 16 },

  // Enhanced offer cards
  offersList: { padding: 16 },
  offerCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  offerHeader: { marginBottom: 16, padding: 20, paddingBottom: 12 },
  offerTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  offerTitle: { fontSize: 18, fontWeight: '700', color: '#333', flex: 1, marginRight: 12 },
  offerTypeBadge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16 },
  directBadge: { backgroundColor: '#2196F3' },
  requestBadge: { backgroundColor: '#FF9800' },
  offerTypeText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  offerDescription: { fontSize: 15, color: '#666', marginBottom: 12 },
  offerDetails: { marginBottom: 16, paddingHorizontal: 20 },
  detailRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  detailText: { fontSize: 15, color: '#666', marginLeft: 10 },
  offerDate: { fontSize: 13, color: '#999', marginTop: 6, fontWeight: '500' },
  offerBudget: { marginBottom: 16, paddingHorizontal: 20 },
  offerBudgetText: { fontSize: 18, fontWeight: '800', color: '#4CAF50' },
  offerPhone: { fontSize: 15, color: '#666', marginTop: 6 },
  offerActions: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingHorizontal: 20, paddingBottom: 16 },
  acceptOfferButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#4CAF50', padding: 16, borderRadius: 12, minHeight: 52, shadowColor: '#4CAF50', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 4 },
  declineOfferButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#F44336', padding: 16, borderRadius: 12, minHeight: 52, shadowColor: '#F44336', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 4 },
  acceptOfferText: { color: '#fff', fontWeight: '700', marginLeft: 10, fontSize: 16 },
  declineOfferText: { color: '#fff', fontWeight: '700', marginLeft: 10, fontSize: 16 },

  // Enhanced work record cards
  workRecordsList: { padding: 16 },
  workRecordCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  workRecordHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  workRecordTitle: { fontSize: 18, fontWeight: '700', color: '#333', flex: 1, marginRight: 12 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16 },
  inProgressBadge: { backgroundColor: '#4CAF50' },
  appliedBadge: { backgroundColor: '#2196F3' },
  pendingBadge: { backgroundColor: '#FF9800' },
  declinedBadge: { backgroundColor: '#F44336' },
  defaultBadge: { backgroundColor: '#666' },
  statusText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  workRecordDescription: { fontSize: 15, color: '#666', marginBottom: 6 },
  workRecordClient: { fontSize: 15, color: '#666', marginBottom: 10 },
  workRecordFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  workRecordBudget: { fontSize: 15, fontWeight: '700', color: '#4CAF50' },
  workRecordDate: { fontSize: 13, color: '#666', fontWeight: '500' },
  uploadProofButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#2196F3', padding: 16, borderRadius: 12, minHeight: 52, shadowColor: '#2196F3', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 4 },
  uploadProofText: { color: '#fff', fontWeight: '700', marginLeft: 10, fontSize: 16 },

  // Enhanced bottom-sheet modals
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: Dimensions.get('window').height * 0.85,
    minHeight: Dimensions.get('window').height * 0.4,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#333',
  },

  // Enhanced apply modal
  requestDetails: { backgroundColor: '#f8f9fa', padding: 20, borderRadius: 16, marginBottom: 20 },
  selectedRequestName: { fontSize: 20, fontWeight: '700', color: '#333', marginBottom: 6 },
  selectedRequestType: { fontSize: 16, color: '#666', marginBottom: 6, fontWeight: '500' },
  selectedRequestBudget: { fontSize: 16, color: '#666', fontWeight: '500' },
  feeInputContainer: { marginBottom: 20 },
  feeLabel: { fontSize: 18, fontWeight: '600', color: '#333', marginBottom: 12 },
  feeInput: {
    borderWidth: 1.5,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    padding: 16,
    fontSize: 17,
    backgroundColor: '#fafafa',
    minHeight: 52,
    color: '#333',
  },
  feeNote: { fontSize: 14, color: '#666', fontStyle: 'italic', marginTop: 8 },
  modalActions: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  cancelButton: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    minHeight: 52,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  confirmButton: {
    flex: 1,
    backgroundColor: '#2196F3',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    minHeight: 52,
    shadowColor: '#2196F3',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  cancelButtonText: { fontSize: 17, fontWeight: '600', color: '#666' },
  confirmButtonText: { fontSize: 17, fontWeight: '600', color: '#fff' },

  // Enhanced success modal
  successModalContent: { backgroundColor: '#fff', borderRadius: 16, padding: 28, alignItems: 'center', margin: 20 },
  successTitle: { fontSize: 22, fontWeight: '700', color: '#333', marginTop: 20, marginBottom: 10 },
  successMessage: { fontSize: 17, color: '#666', textAlign: 'center', marginBottom: 24 },
  successActions: { flexDirection: 'row', width: '100%', gap: 12 },
  successButton: { flex: 1, padding: 16, borderRadius: 12, alignItems: 'center', minHeight: 52 },
  primarySuccessButton: { backgroundColor: '#2196F3', shadowColor: '#2196F3', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 4 },
  successButtonText: { fontSize: 17, fontWeight: '600', color: '#666' },
  primarySuccessButtonText: { color: '#fff' },

  // Enhanced duplicate modal
  duplicateModalContent: { backgroundColor: '#fff', borderRadius: 16, padding: 28, alignItems: 'center', margin: 20 },
  duplicateTitle: { fontSize: 22, fontWeight: '700', color: '#333', marginTop: 20, marginBottom: 10 },
  duplicateMessage: { fontSize: 17, color: '#666', textAlign: 'center', marginBottom: 20 },
  duplicateInfo: { backgroundColor: '#FFF3E0', padding: 16, borderRadius: 12, marginBottom: 24, width: '100%' },
  duplicateInfoText: { fontSize: 15, color: '#E65100', textAlign: 'center' },
  duplicateActions: { flexDirection: 'row', width: '100%', gap: 12 },
  duplicateButton: { flex: 1, padding: 16, borderRadius: 12, alignItems: 'center', minHeight: 52 },
  primaryDuplicateButton: { backgroundColor: '#2196F3', shadowColor: '#2196F3', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 4 },
  duplicateButtonText: { fontSize: 17, fontWeight: '600', color: '#666' },
  primaryDuplicateButtonText: { color: '#fff' },

  // Enhanced proof modal
  bookingDetails: { backgroundColor: '#f8f9fa', padding: 20, borderRadius: 16, marginBottom: 20 },
  bookingTitle: { fontSize: 20, fontWeight: '700', color: '#333', marginBottom: 6 },
  bookingClient: { fontSize: 16, color: '#666' },
  fileInputContainer: { marginBottom: 20 },
  fileInputLabel: { fontSize: 18, fontWeight: '600', color: '#333', marginBottom: 12 },
  fileInput: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#e0e0e0', borderStyle: 'dashed', borderRadius: 12, padding: 24, marginBottom: 12, minHeight: 80 },
  fileInputText: { fontSize: 17, color: '#666', marginLeft: 12 },
  fileInputNote: { fontSize: 14, color: '#666', fontStyle: 'italic' },
  selectedFilesContainer: { backgroundColor: '#f8f9fa', borderRadius: 12, padding: 16, marginBottom: 12 },
  selectedFilesTitle: { fontSize: 16, fontWeight: '600', color: '#333', marginBottom: 12 },
  selectedFileItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#fff', padding: 12, borderRadius: 8, marginBottom: 8, borderWidth: 1, borderColor: '#e0e0e0' },
  fileInfo: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  fileName: { fontSize: 14, color: '#333', marginLeft: 8, flex: 1 },
  fileSize: { fontSize: 12, color: '#666', marginLeft: 8 },
  removeFileButton: { padding: 4 },
  notesContainer: { marginBottom: 20 },
  notesLabel: { fontSize: 18, fontWeight: '600', color: '#333', marginBottom: 12 },
  notesInput: { borderWidth: 1.5, borderColor: '#e0e0e0', borderRadius: 12, padding: 16, fontSize: 16, minHeight: 100, textAlignVertical: 'top', backgroundColor: '#fafafa', color: '#333' },
  charCount: { textAlign: 'right', fontSize: 14, color: '#666', marginTop: 8 },
  uploadButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#4CAF50', padding: 16, borderRadius: 12, minHeight: 52, shadowColor: '#4CAF50', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 4 },
  uploadButtonText: { color: '#fff', fontWeight: '700', marginLeft: 10, fontSize: 16 },
  disabledButton: { backgroundColor: '#ccc', shadowOpacity: 0, elevation: 0 },
  uploadNote: { backgroundColor: '#E3F2FD', padding: 16, borderRadius: 12, marginTop: 20 },
  uploadNoteText: { fontSize: 14, color: '#1976D2', textAlign: 'center', fontWeight: '500' },
});

export default ProviderDashboard;
