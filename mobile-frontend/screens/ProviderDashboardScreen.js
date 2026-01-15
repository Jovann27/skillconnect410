import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  FlatList,
  Alert,
  Modal,
  TextInput,
  RefreshControl,
  Image,
} from 'react-native';
import { useMainContext } from '../contexts/MainContext';
import Loader from '../components/Loader';

const ProviderDashboardScreen = () => {
  const { user, api } = useMainContext();

  // Core state
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  // Modal state
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [commissionFee, setCommissionFee] = useState('');
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);

  // Data state
  const [serviceRequests, setServiceRequests] = useState([]);
  const [serviceOffers, setServiceOffers] = useState([]);
  const [applications, setApplications] = useState([]);
  const [activeBookings, setActiveBookings] = useState([]);
  const [certificates, setCertificates] = useState([]);
  const [workProof, setWorkProof] = useState([]);

  // Proof of work modal state
  const [showProofModal, setShowProofModal] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [proofFiles, setProofFiles] = useState([]);
  const [completionNotes, setCompletionNotes] = useState('');

  useEffect(() => {
    if (user) {
      fetchData();
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
      const response = await api.get('/user/available-service-requests?limit=10000');
      if (response.data.success) {
        setServiceRequests(response.data.requests);
      }
    } catch (error) {
      console.error('Error fetching service requests:', error);
    }
  };

  const fetchServiceOffers = async () => {
    try {
      const response = await api.get('/user/provider-offers');
      if (response.data.success) {
        setServiceOffers(response.data.offers);
      }
    } catch (error) {
      console.error('Error fetching service offers:', error);
    }
  };

  const fetchApplications = async () => {
    try {
      const response = await api.get('/user/provider-applications');
      if (response.data.success) {
        setApplications(response.data.applications);
      }
    } catch (error) {
      console.error('Error fetching applications:', error);
    }
  };

  const fetchCertificates = async () => {
    try {
      const response = await api.get('/user/my-certificates');
      if (response.data.success) {
        setCertificates(response.data.certificates);
      }
    } catch (error) {
      console.error('Error fetching certificates:', error);
    }
  };

  const fetchActiveBookings = async () => {
    try {
      const response = await api.get('/user/bookings', {
        params: { status: 'In Progress' }
      });
      if (response.data.success) {
        // Filter to only show bookings where current user is the provider
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
      Alert.alert('Error', 'Failed to load active bookings');
    }
  };

  const fetchWorkProof = async () => {
    try {
      const response = await api.get('/user/my-work-proof');
      if (response.data.success) {
        setWorkProof(response.data.workProof);
      }
    } catch (error) {
      console.error('Error fetching work proof:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
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
        'Accept Offer',
        'Are you sure you want to accept this offer? This action cannot be undone.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Accept', onPress: async () => await processOfferResponse(offer, action) },
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

  const renderOverviewTab = () => (
    <View style={styles.overviewContainer}>
      <Text style={styles.sectionTitle}>Recent Activity</Text>
      <View style={styles.activityList}>
        {serviceRequests.length > 0 && (
          <View style={styles.activityItem}>
            <Text style={styles.activityIcon}>📋</Text>
            <View style={styles.activityContent}>
              <Text style={styles.activityTitle}>New service request available</Text>
              <Text style={styles.activityText}>{serviceRequests.length} requests waiting for your response</Text>
            </View>
          </View>
        )}
        {serviceOffers.length > 0 && (
          <View style={styles.activityItem}>
            <Text style={styles.activityIcon}>🤝</Text>
            <View style={styles.activityContent}>
              <Text style={styles.activityTitle}>Pending service offers</Text>
              <Text style={styles.activityText}>{serviceOffers.length} offers need your attention</Text>
            </View>
          </View>
        )}
        {applications.length > 0 && (
          <View style={styles.activityItem}>
            <Text style={styles.activityIcon}>📄</Text>
            <View style={styles.activityContent}>
              <Text style={styles.activityTitle}>Work records submitted</Text>
              <Text style={styles.activityText}>{applications.length} work records pending response</Text>
            </View>
          </View>
        )}
      </View>
    </View>
  );

  const renderRequestsTab = () => (
    <View>
      <Text style={styles.sectionTitle}>Available Service Requests</Text>
      {serviceRequests.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyEmoji}>📋</Text>
          <Text style={styles.emptyTitle}>No available service requests</Text>
          <Text style={styles.emptyText}>Check back later for new opportunities.</Text>
        </View>
      ) : (
        <FlatList
          data={serviceRequests}
          renderItem={renderServiceRequestItem}
          keyExtractor={(item) => item._id}
          scrollEnabled={false}
        />
      )}
    </View>
  );

  const renderOffersTab = () => (
    <View>
      <Text style={styles.sectionTitle}>Service Offers</Text>
      {serviceOffers.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyEmoji}>🤝</Text>
          <Text style={styles.emptyTitle}>No pending service offers</Text>
          <Text style={styles.emptyText}>You'll be notified when clients send you offers.</Text>
        </View>
      ) : (
        <FlatList
          data={serviceOffers}
          renderItem={renderServiceOfferItem}
          keyExtractor={(item) => item._id}
          scrollEnabled={false}
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

    // Ensure uniqueness by _id to prevent duplicate records for the same booking ID
    const uniqueWorkRecords = allWorkRecords.filter((record, index, self) =>
      index === self.findIndex(r => r._id === record._id)
    );

    return (
      <View>
        <Text style={styles.sectionTitle}>My Work Records</Text>
        {uniqueWorkRecords.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyEmoji}>📄</Text>
            <Text style={styles.emptyTitle}>No work records yet</Text>
            <Text style={styles.emptyText}>Your submitted applications and active jobs will appear here.</Text>
          </View>
        ) : (
          <FlatList
            data={uniqueWorkRecords}
            renderItem={renderWorkRecordItem}
            keyExtractor={(item) => item._id}
            scrollEnabled={false}
          />
        )}
      </View>
    );
  };

  const renderServiceRequestItem = ({ item }) => {
    const alreadyApplied = hasAlreadyApplied(item._id);
    return (
      <View style={styles.requestCard}>
        <View style={styles.requestHeader}>
          <Text style={styles.requestTitle}>{item.name}</Text>
          <Text style={styles.requestBudget}>
            ₱{item.minBudget} - ₱{item.maxBudget}
          </Text>
        </View>

        <Text style={styles.requestType}>{item.typeOfWork}</Text>
        <Text style={styles.requestLocation}>📍 {item.address}</Text>
        <Text style={styles.requestDescription} numberOfLines={2}>
          {item.notes || 'No description provided'}
        </Text>

        {alreadyApplied ? (
          <View style={styles.alreadyApplied}>
            <Text style={styles.alreadyAppliedText}>✓ Already Applied</Text>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.applyButton}
            onPress={() => {
              setSelectedRequest(item);
              setCommissionFee('');
              setShowApplyModal(true);
            }}
          >
            <Text style={styles.applyButtonText}>Apply to Request</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const renderServiceOfferItem = ({ item }) => (
    <View style={styles.offerCard}>
      <View style={styles.offerHeader}>
        <Text style={styles.offerTitle}>{item.title}</Text>
        <Text style={[styles.offerType,
          item.type === 'direct' ? styles.directOffer : styles.requestOffer
        ]}>
          {item.type === 'direct' ? 'Direct Offer' : 'Service Request Offer'}
        </Text>
      </View>

      <Text style={styles.offerDescription}>{item.description}</Text>
      <Text style={styles.offerLocation}>{item.location}</Text>

      <View style={styles.offerFooter}>
        <Text style={styles.offerBudget}>
          ₱{item.minBudget && item.maxBudget
            ? `${item.minBudget.toLocaleString()} - ₱${item.maxBudget.toLocaleString()}`
            : item.minBudget || item.maxBudget
            ? `₱${(item.minBudget || item.maxBudget).toLocaleString()}`
            : 'Budget not specified'
          }
        </Text>
        <Text style={styles.offerRequester}>
          From: {item.requester?.firstName} {item.requester?.lastName}
        </Text>
      </View>

      <View style={styles.offerActions}>
        <TouchableOpacity
          style={[styles.actionButton, styles.acceptButton]}
          onPress={() => handleRespondToOffer(item, 'accept')}
        >
          <Text style={styles.acceptButtonText}>Accept</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.declineButton]}
          onPress={() => handleRespondToOffer(item, 'decline')}
        >
          <Text style={styles.declineButtonText}>Decline</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderApplicationItem = ({ item }) => (
    <View style={styles.applicationCard}>
      <Text style={styles.applicationTitle}>
        {item.serviceRequest?.title || item.serviceRequest?.name || 'Service Request'}
      </Text>
      <Text style={styles.applicationClient}>
        Client: {item.requester?.firstName} {item.requester?.lastName}
      </Text>
      <Text style={styles.applicationStatus}>
        Status: <Text style={[styles.statusText,
          item.status === 'In Progress' && styles.statusProgress,
          item.status === 'Pending' && styles.statusPending,
          item.status === 'Declined' && styles.statusDeclined
        ]}>
          {item.status}
        </Text>
      </Text>
      <Text style={styles.applicationDate}>
        Applied: {new Date(item.createdAt).toLocaleDateString()}
      </Text>
    </View>
  );

  const renderWorkRecordItem = ({ item }) => (
    <View style={styles.workRecordCard}>
      <View style={styles.workRecordHeader}>
        <Text style={styles.workRecordTitle}>{item.title}</Text>
        <Text style={[styles.workRecordType,
          item.type === 'active_booking' ? styles.activeBookingType : styles.applicationType
        ]}>
          {item.type === 'active_booking' ? 'Active Job' : 'Application'}
        </Text>
      </View>

      <Text style={styles.workRecordDescription} numberOfLines={2}>
        {item.description}
      </Text>

      <View style={styles.workRecordInfo}>
        <Text style={styles.workRecordClient}>
          Client: {item.client?.firstName} {item.client?.lastName}
        </Text>
        <Text style={styles.workRecordBudget}>
          {item.budget ? `₱${item.budget.toLocaleString()}` : 'Budget not specified'}
        </Text>
      </View>

      <View style={styles.workRecordFooter}>
        <Text style={[styles.workRecordStatus,
          item.status === 'In Progress' && styles.statusProgress,
          item.status === 'Applied' && styles.statusPending,
          item.status === 'Declined' && styles.statusDeclined,
          item.status === 'Completed' && styles.statusCompleted
        ]}>
          {item.status}
        </Text>
        <Text style={styles.workRecordDate}>
          {item.type === 'active_booking'
            ? `Started: ${new Date(item.createdAt).toLocaleDateString()}`
            : `Applied: ${new Date(item.createdAt).toLocaleDateString()}`
          }
        </Text>
      </View>

      {item.type === 'active_booking' && item.status === 'In Progress' && (
        <TouchableOpacity
          style={styles.uploadProofButton}
          onPress={() => {
            setSelectedBooking(item);
            setShowProofModal(true);
          }}
        >
          <Text style={styles.uploadProofButtonText}>Upload Proof of Work & Complete</Text>
        </TouchableOpacity>
      )}
    </View>
  );

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

  if (loading) {
    return <Loader />;
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.welcome}>Service Provider Dashboard</Text>
        <Text style={styles.userName}>{user?.firstName} {user?.lastName}</Text>
        <View style={styles.profileStatus}>
          <Text style={styles.profileCompletion}>
            Profile: {user?.verified ? 'Verified' : 'Unverified'}
          </Text>
        </View>
      </View>

      {/* Quick Stats */}
      <View style={styles.statsContainer}>
        <View style={[styles.statCard, { borderLeftColor: '#007bff' }]}>
          <Text style={styles.statValue}>{serviceRequests.length}</Text>
          <Text style={styles.statTitle}>Available Requests</Text>
        </View>
        <View style={[styles.statCard, { borderLeftColor: '#28a745' }]}>
          <Text style={styles.statValue}>{serviceOffers.length}</Text>
          <Text style={styles.statTitle}>Pending Offers</Text>
        </View>
        <View style={[styles.statCard, { borderLeftColor: '#9c27b0' }]}>
          <Text style={styles.statValue}>{applications.length}</Text>
          <Text style={styles.statTitle}>Work Records</Text>
        </View>
      </View>

      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'overview' && styles.activeTab]}
          onPress={() => setActiveTab('overview')}
        >
          <Text style={[styles.tabText, activeTab === 'overview' && styles.activeTabText]}>
            Overview
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'requests' && styles.activeTab]}
          onPress={() => setActiveTab('requests')}
        >
          <Text style={[styles.tabText, activeTab === 'requests' && styles.activeTabText]}>
            Requests
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'offers' && styles.activeTab]}
          onPress={() => setActiveTab('offers')}
        >
          <Text style={[styles.tabText, activeTab === 'offers' && styles.activeTabText]}>
            Offers
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'applications' && styles.activeTab]}
          onPress={() => setActiveTab('applications')}
        >
          <Text style={[styles.tabText, activeTab === 'applications' && styles.activeTabText]}>
            Applications
          </Text>
        </TouchableOpacity>
      </View>

      {/* Tab Content */}
      <View style={styles.tabContent}>
        {activeTab === 'overview' && renderOverviewTab()}
        {activeTab === 'requests' && renderRequestsTab()}
        {activeTab === 'offers' && renderOffersTab()}
        {activeTab === 'applications' && renderApplicationsTab()}
      </View>

      {/* Apply Modal */}
      <Modal visible={showApplyModal} animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Confirm Application</Text>

            {selectedRequest && (
              <View style={styles.requestPreview}>
                <Text style={styles.previewTitle}>{selectedRequest.name}</Text>
                <Text style={styles.previewType}>{selectedRequest.typeOfWork}</Text>
                <Text style={styles.previewBudget}>
                  Budget: ₱{selectedRequest.minBudget} - ₱{selectedRequest.maxBudget}
                </Text>
              </View>
            )}

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Desired Commission Fee (₱)</Text>
              <TextInput
                style={styles.textInput}
                value={commissionFee}
                onChangeText={setCommissionFee}
                placeholder="Enter your commission fee"
                keyboardType="numeric"
              />
              <Text style={styles.inputHelp}>
                Fee must be within the client's budget range
              </Text>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setShowApplyModal(false);
                  setSelectedRequest(null);
                  setCommissionFee('');
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
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
      <Modal visible={showSuccessModal} animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.successIcon}>✓</Text>
            <Text style={styles.modalTitle}>Application Submitted!</Text>
            <Text style={styles.successMessage}>{successMessage}</Text>

            <View style={styles.successInfo}>
              <Text style={styles.infoText}>
                <Text style={styles.infoBold}>What happens next?</Text>{'\n'}
                The client will review your application and may contact you for further details.
                You'll be notified once they make a decision.
              </Text>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.secondaryButton]}
                onPress={() => {
                  setShowSuccessModal(false);
                  setSuccessMessage('');
                }}
              >
                <Text style={styles.secondaryButtonText}>Continue Browsing</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.primaryButton]}
                onPress={() => {
                  setShowSuccessModal(false);
                  setSuccessMessage('');
                  setActiveTab('applications');
                }}
              >
                <Text style={styles.primaryButtonText}>View My Applications</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Duplicate Modal */}
      <Modal visible={showDuplicateModal} animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.warningIcon}>⚠️</Text>
            <Text style={styles.modalTitle}>Already Applied</Text>
            <Text style={styles.warningMessage}>
              You have already submitted an application for this service request.
              You cannot apply to the same request multiple times.
            </Text>

            <View style={styles.warningInfo}>
              <Text style={styles.infoText}>
                <Text style={styles.infoBold}>Check your applications:</Text>{'\n'}
                You can view and manage your existing applications in the "Applications" tab.
              </Text>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.secondaryButton]}
                onPress={() => {
                  setShowDuplicateModal(false);
                }}
              >
                <Text style={styles.secondaryButtonText}>Continue Browsing</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.primaryButton]}
                onPress={() => {
                  setShowDuplicateModal(false);
                  setActiveTab('applications');
                }}
              >
                <Text style={styles.primaryButtonText}>View My Applications</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Proof of Work Upload Modal */}
      <Modal visible={showProofModal} animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Upload Proof of Work</Text>

            {selectedBooking && (
              <View style={styles.requestPreview}>
                <Text style={styles.previewTitle}>{selectedBooking.title}</Text>
                <Text style={styles.previewType}>Client: {selectedBooking.client?.firstName} {selectedBooking.client?.lastName}</Text>
              </View>
            )}

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Upload Photos/Videos of Completed Work</Text>
              <TouchableOpacity
                style={styles.fileInput}
                onPress={() => Alert.alert('File Upload', 'File picker will be implemented soon')}
              >
                <Text style={styles.fileInputText}>
                  {proofFiles.length > 0 ? `${proofFiles.length} file(s) selected` : 'Tap to select files'}
                </Text>
              </TouchableOpacity>
              <Text style={styles.inputHelp}>
                Supported formats: Images, Videos, PDFs (Max 5MB each)
              </Text>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Completion Notes (Optional)</Text>
              <TextInput
                style={[styles.textInput, { height: 80 }]}
                value={completionNotes}
                onChangeText={setCompletionNotes}
                placeholder="Describe what was completed..."
                multiline
                maxLength={500}
              />
              <Text style={styles.inputHelp}>
                {completionNotes.length}/500 characters
              </Text>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setShowProofModal(false);
                  setSelectedBooking(null);
                  setProofFiles([]);
                  setCompletionNotes('');
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={handleUploadProofOfWork}
                disabled={proofFiles.length === 0}
              >
                <Text style={styles.confirmButtonText}>Upload & Complete</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.warningInfo}>
              <Text style={styles.infoText}>
                <Text style={styles.infoBold}>Note:</Text> Once uploaded, this job will be marked as completed and the client will be able to leave a review.
              </Text>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    backgroundColor: '#007bff',
    padding: 20,
    paddingTop: 60,
  },
  welcome: {
    fontSize: 16,
    color: '#fff',
    opacity: 0.9,
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 4,
  },
  profileStatus: {
    marginTop: 8,
  },
  profileCompletion: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.8,
  },
  statsContainer: {
    flexDirection: 'row',
    padding: 20,
    paddingTop: 10,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginHorizontal: 4,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  statTitle: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    textTransform: 'uppercase',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    margin: 20,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: '#007bff',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  activeTabText: {
    color: '#fff',
  },
  tabContent: {
    padding: 20,
  },
  overviewContainer: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  activityList: {
    marginTop: 16,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    marginBottom: 8,
  },
  activityIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
  },
  activityText: {
    fontSize: 14,
    color: '#666',
  },
  requestCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  requestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  requestTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
    marginRight: 8,
  },
  requestBudget: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#28a745',
  },
  requestType: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  requestLocation: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  requestDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 12,
  },
  alreadyApplied: {
    backgroundColor: '#d4edda',
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  alreadyAppliedText: {
    color: '#155724',
    fontSize: 14,
    fontWeight: 'bold',
  },
  applyButton: {
    backgroundColor: '#007bff',
    borderRadius: 6,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  applyButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  offerCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  offerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  offerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
    marginRight: 8,
  },
  offerType: {
    fontSize: 12,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
    fontWeight: 'bold',
  },
  directOffer: {
    backgroundColor: '#e3f2fd',
    color: '#1976d2',
  },
  requestOffer: {
    backgroundColor: '#f3e5f5',
    color: '#7b1fa2',
  },
  offerDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  offerLocation: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  offerFooter: {
    marginBottom: 12,
  },
  offerBudget: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#28a745',
    marginBottom: 4,
  },
  offerRequester: {
    fontSize: 12,
    color: '#666',
  },
  offerActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    flex: 1,
    borderRadius: 6,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  acceptButton: {
    backgroundColor: '#28a745',
  },
  declineButton: {
    backgroundColor: '#dc3545',
  },
  acceptButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  declineButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  applicationCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  applicationTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  applicationClient: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  applicationStatus: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  statusText: {
    fontWeight: 'bold',
  },
  statusProgress: {
    color: '#ffc107',
  },
  statusPending: {
    color: '#ffc107',
  },
  statusDeclined: {
    color: '#dc3545',
  },
  applicationDate: {
    fontSize: 12,
    color: '#999',
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 40,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 20,
    width: '90%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 20,
  },
  requestPreview: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 16,
    marginBottom: 20,
  },
  previewTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  previewType: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  previewBudget: {
    fontSize: 14,
    color: '#28a745',
    fontWeight: '500',
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
  },
  inputHelp: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    flex: 1,
    borderRadius: 6,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  cancelButton: {
    backgroundColor: '#6c757d',
  },
  confirmButton: {
    backgroundColor: '#007bff',
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  successIcon: {
    fontSize: 48,
    color: '#28a745',
    textAlign: 'center',
    marginBottom: 16,
  },
  successMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 24,
  },
  successInfo: {
    backgroundColor: '#d4edda',
    borderRadius: 8,
    padding: 16,
    marginBottom: 20,
  },
  infoText: {
    fontSize: 14,
    color: '#155724',
    lineHeight: 20,
  },
  infoBold: {
    fontWeight: 'bold',
  },
  secondaryButton: {
    backgroundColor: '#6c757d',
  },
  primaryButton: {
    backgroundColor: '#007bff',
  },
  secondaryButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  warningIcon: {
    fontSize: 48,
    textAlign: 'center',
    marginBottom: 16,
  },
  warningMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 24,
  },
  warningInfo: {
    backgroundColor: '#fff3cd',
    borderRadius: 8,
    padding: 16,
    marginBottom: 20,
  },
  workRecordCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  workRecordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  workRecordTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
    marginRight: 8,
  },
  workRecordType: {
    fontSize: 12,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
    fontWeight: 'bold',
  },
  activeBookingType: {
    backgroundColor: '#d4edda',
    color: '#155724',
  },
  applicationType: {
    backgroundColor: '#e3f2fd',
    color: '#1976d2',
  },
  workRecordDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 12,
  },
  workRecordInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  workRecordClient: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  workRecordBudget: {
    fontSize: 14,
    color: '#28a745',
    fontWeight: '500',
  },
  workRecordFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  workRecordStatus: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  statusCompleted: {
    color: '#28a745',
  },
  workRecordDate: {
    fontSize: 12,
    color: '#999',
  },
  uploadProofButton: {
    backgroundColor: '#28a745',
    borderRadius: 6,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  uploadProofButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  fileInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#f9f9f9',
    alignItems: 'center',
  },
  fileInputText: {
    fontSize: 14,
    color: '#666',
  },
});

export default ProviderDashboardScreen;
