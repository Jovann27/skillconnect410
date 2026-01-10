import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  Alert,
  Linking,
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import { useMainContext } from '../contexts/MainContext';
import socket from '../utils/socket';
import Loader from './Loader';

const AcceptedOrderPage = ({ request, isOpen, onClose }) => {
  const { api, user } = useMainContext();
  const [status, setStatus] = useState("Accepted");
  const [workerData, setWorkerData] = useState(null);
  const [currentRequest, setCurrentRequest] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [completingWork, setCompletingWork] = useState(false);
  const [workProofImage, setWorkProofImage] = useState(null);

  useEffect(() => {
    if (!isOpen || !request) {
      setIsLoading(false);
      return;
    }

    const initialize = async () => {
      setIsLoading(true);
      setError(null);
      setCurrentRequest(request);

      if (request.status === "Working" || request.status === "Accepted") {
        setStatus("Accepted");
        if (request.serviceProvider || request.acceptedBy) {
          const provider = request.serviceProvider || request.acceptedBy;
          setWorkerData({
            name: `${provider.firstName} ${provider.lastName}`,
            skill: request.typeOfWork,
            phone: provider.phone,
            image: provider.profilePic || "/default-profile.png",
            eta: request.eta,
          });
        }
      }
      setIsLoading(false);
    };

    initialize();

    if (socket && request._id) {
      socket.emit("join-service-request", request._id);
      const handleUpdate = async (updateData) => {
        if (updateData?.requestId !== request._id) return;
        try {
          const response = await api.get(`/user/service-request/${request._id}`);
          const updatedRequest = response.data?.request;
          if (updatedRequest) {
            setCurrentRequest(updatedRequest);
            const provider = updatedRequest.serviceProvider || updatedRequest.acceptedBy;
            if (provider) {
              setWorkerData({
                name: `${provider.firstName || ''} ${provider.lastName || ''}`.trim(),
                skill: updatedRequest.typeOfWork,
                phone: provider.phone,
                image: provider.profilePic || "/default-profile.png",
                eta: updatedRequest.eta,
              });
            }
          }
        } catch (err) {
          console.error("Failed to update request via socket:", err);
        }
      };
      socket.on("service-request-updated", handleUpdate);
      return () => {
        socket.off("service-request-updated", handleUpdate);
        socket.emit("leave-service-request", request._id);
      };
    }
  }, [request, isOpen]);

  const handleCancel = async () => {
    if (!currentRequest?._id) return;

    Alert.alert(
      'Cancel Order',
      'Are you sure you want to cancel this order?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await api.delete(`/user/service-request/${currentRequest._id}/cancel`);
              if (response.data.success) {
                Alert.alert('Success', 'Order cancelled successfully');
                onClose();
              } else {
                Alert.alert('Error', 'Failed to cancel the order. Please try again.');
              }
            } catch (err) {
              console.error("Error cancelling order:", err);
              Alert.alert('Error', 'Failed to cancel the order. Please try again.');
            }
          }
        }
      ]
    );
  };

  const handleChat = async () => {
    if (currentRequest.serviceProvider || currentRequest.acceptedBy) {
      try {
        // Find the booking associated with this request
        const response = await api.get("/user/bookings");
        const bookings = response.data.bookings || [];
        const booking = bookings.find(b => b.serviceRequest && b.serviceRequest._id === currentRequest._id);

        if (booking) {
          // For now, just show a message. Chat functionality would need to be implemented
          const provider = currentRequest.serviceProvider || currentRequest.acceptedBy;
          Alert.alert('Chat', `Opening chat with ${provider.firstName}`);
        } else {
          Alert.alert('Error', 'No active booking found for this request.');
        }
      } catch (err) {
        console.error("Error finding booking for chat:", err);
        Alert.alert('Error', 'Failed to open chat. Please try again.');
      }
    } else {
      Alert.alert('Error', 'No service provider assigned for chat.');
    }
  };

  const handleCompleteWork = async () => {
    if (!workProofImage) return;

    setCompletingWork(true);

    try {
      // Find the booking associated with this request
      const response = await api.get("/user/bookings");
      const bookings = response.data.bookings || [];
      const booking = bookings.find(b => b.serviceRequest && b.serviceRequest._id === currentRequest._id);

      if (!booking) {
        Alert.alert('Error', 'No active booking found.');
        return;
      }

      // For now, just complete the work without uploading image
      // TODO: Implement image upload
      const completeResponse = await api.put(`/user/booking/${booking._id}/status`, { status: "Complete" });

      if (completeResponse.data.success) {
        Alert.alert('Success', 'Work completed successfully');
        onClose();
      } else {
        Alert.alert('Error', 'Failed to complete work.');
      }
    } catch (err) {
      console.error("Error completing work:", err);
      Alert.alert('Error', 'Failed to complete work.');
    } finally {
      setCompletingWork(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getStatusBadgeClass = () => {
    if (status === "Accepted") return styles.statusFound;
    if (currentRequest?.status === "No Longer Available") return styles.statusExpired;
    return styles.statusSearching;
  };

  const getStatusText = () => {
    if (status === "Accepted") return "Provider Assigned";
    if (currentRequest?.status === "No Longer Available") return "Expired";
    return "Processing";
  };

  const renderOrderDetails = () => (
    <ScrollView style={styles.pageWrapper} showsVerticalScrollIndicator={false}>
      <View style={styles.container}>
        <View style={styles.gridLayout}>

          {/* LEFT COLUMN - Order Details & Actions */}
          <View style={styles.mainContent}>

            {/* Header Card */}
            <View style={styles.card}>
              <View style={styles.headerLeft}>
                <Text style={styles.orderTitle}>Service Order</Text>
                <Text style={styles.orderId}>Order #{currentRequest?._id?.slice(-6) || "N/A"}</Text>
              </View>
              <View style={[styles.statusBadge, getStatusBadgeClass()]}>
                <Text style={styles.statusBadgeText}>{getStatusText()}</Text>
              </View>
            </View>

            {/* Order Information */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Order Information</Text>
              <View style={styles.detailsGrid}>
                <View style={styles.detailRow}>
                  <Icon name="clock-o" size={16} color="#666" />
                  <View style={styles.detailContent}>
                    <Text style={styles.detailLabel}>Service Date</Text>
                    <Text style={styles.detailValue}>{formatDate(currentRequest?.createdAt)}</Text>
                  </View>
                </View>
                <View style={styles.detailRow}>
                  <Icon name="map-marker" size={16} color="#666" />
                  <View style={styles.detailContent}>
                    <Text style={styles.detailLabel}>Location</Text>
                    <Text style={styles.detailValue}>{currentRequest?.address || "N/A"}</Text>
                  </View>
                </View>
                <View style={styles.detailRow}>
                  <Icon name="wrench" size={16} color="#666" />
                  <View style={styles.detailContent}>
                    <Text style={styles.detailLabel}>Service Type</Text>
                    <Text style={styles.detailValue}>{currentRequest?.typeOfWork || "N/A"}</Text>
                  </View>
                </View>
                <View style={styles.detailRow}>
                  <Icon name="dollar" size={16} color="#666" />
                  <View style={styles.detailContent}>
                    <Text style={styles.detailLabel}>Budget</Text>
                    <Text style={styles.budgetValue}>₱{currentRequest?.budget || "N/A"}</Text>
                  </View>
                </View>
              </View>
              {currentRequest?.notes && (
                <View style={styles.detailRowNotes}>
                  <Icon name="file-text-o" size={16} color="#666" />
                  <View style={styles.detailContent}>
                    <Text style={styles.detailLabel}>Notes</Text>
                    <Text style={styles.detailValue}>{currentRequest.notes}</Text>
                  </View>
                </View>
              )}
            </View>

            {/* Action Buttons */}
            <View style={styles.actionsCard}>
              <TouchableOpacity style={styles.actionButton} onPress={handleChat}>
                <Icon name="comments" size={16} color="#fff" />
                <Text style={styles.actionButtonText}>Chat with Provider</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionButton, styles.cancelAction]} onPress={handleCancel}>
                <Icon name="times" size={16} color="#fff" />
                <Text style={styles.actionButtonText}>Cancel Order</Text>
              </TouchableOpacity>
            </View>

          </View>

          {/* CENTER COLUMN - Provider Details & Work Completion */}
          <View style={styles.centerContent}>

            {/* Assigned Provider */}
            {workerData && (
              <View style={styles.card}>
                <View style={styles.assignedHeader}>
                  <View style={styles.assignedIcon}>
                    <Icon name="check" size={20} color="#fff" />
                  </View>
                  <View style={styles.assignedInfo}>
                    <Text style={styles.assignedTitle}>Provider Assigned</Text>
                    <Text style={styles.assignedSubtitle}>Your service provider is assigned to this order</Text>
                  </View>
                </View>
                <View style={styles.assignedBody}>
                  <View style={styles.providerImage}>
                    <Icon name="user" size={30} color="#666" />
                  </View>
                  <View style={styles.assignedDetails}>
                    <Text style={styles.providerName}>{workerData.name}</Text>
                    <Text style={styles.providerSkill}>{workerData.skill}</Text>
                    <Text style={styles.providerPhone}>{workerData.phone}</Text>
                    {workerData.eta && (
                      <Text style={styles.providerEta}>
                        ETA: {new Date(workerData.eta).toLocaleTimeString()}
                      </Text>
                    )}
                  </View>
                </View>
              </View>
            )}

            {/* Work Completion Section - Only show for service providers when status is Working */}
            {currentRequest?.status === 'Working' && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Complete Work</Text>
                <View style={styles.workCompletionForm}>
                  <TouchableOpacity style={styles.fileInput}>
                    <Icon name="camera" size={20} color="#666" />
                    <Text style={styles.fileInputText}>Upload Work Proof Image</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.completeButton, !workProofImage && styles.completeButtonDisabled]}
                    onPress={handleCompleteWork}
                    disabled={completingWork || !workProofImage}
                  >
                    <Icon name="check" size={16} color="#fff" />
                    <Text style={styles.completeButtonText}>
                      {completingWork ? 'Completing...' : 'Confirm Work Done'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Customer Details Card */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Customer Details</Text>
              <View style={styles.customerDetails}>
                <View style={styles.detailRow}>
                  <Icon name="user" size={16} color="#666" />
                  <View style={styles.detailContent}>
                    <Text style={styles.detailLabel}>Full Name</Text>
                    <Text style={styles.detailValue}>{currentRequest?.name || "N/A"}</Text>
                  </View>
                </View>
                <View style={styles.detailRow}>
                  <Icon name="phone" size={16} color="#666" />
                  <View style={styles.detailContent}>
                    <Text style={styles.detailLabel}>Phone Number</Text>
                    <Text style={styles.detailValue}>{currentRequest?.phone || "N/A"}</Text>
                  </View>
                </View>
              </View>
            </View>

          </View>

          {/* RIGHT COLUMN - Additional Actions */}
          <View style={styles.sidebar}>

            <View style={styles.actionsCard}>
              {workerData && (
                <TouchableOpacity
                  style={[styles.actionButton, styles.callAction]}
                  onPress={() => Linking.openURL(`tel:${workerData.phone}`)}
                >
                  <Icon name="phone" size={16} color="#fff" />
                  <Text style={styles.actionButtonText}>Call Provider</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </View>
    </ScrollView>
  );

  if (!isOpen) return null;

  if (isLoading) {
    return (
      <Modal visible={true} animationType="slide">
        <View style={styles.loadingContainer}>
          <Loader />
          <Text style={styles.loadingText}>Loading your order</Text>
        </View>
      </Modal>
    );
  }

  if (error) {
    return (
      <Modal visible={true} animationType="slide">
        <View style={styles.errorContainer}>
          <Icon name="exclamation-triangle" size={48} color="#dc3545" />
          <Text style={styles.errorTitle}>Error</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => window.location.reload()}>
            <Text style={styles.retryButtonText}>Refresh Page</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>Close</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible={isOpen} animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Service Order Details</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeModalButton}>
            <Icon name="times" size={24} color="#666" />
          </TouchableOpacity>
        </View>

        {renderOrderDetails()}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  closeModalButton: {
    padding: 8,
  },
  pageWrapper: {
    flex: 1,
  },
  container: {
    padding: 16,
  },
  gridLayout: {
    flex: 1,
  },
  mainContent: {
    flex: 1,
  },
  centerContent: {
    marginTop: 16,
  },
  sidebar: {
    marginTop: 16,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  headerLeft: {
    marginBottom: 12,
  },
  orderTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  orderId: {
    fontSize: 14,
    color: '#666',
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusFound: {
    backgroundColor: '#d4edda',
  },
  statusExpired: {
    backgroundColor: '#f8d7da',
  },
  statusSearching: {
    backgroundColor: '#fff3cd',
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#333',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  detailsGrid: {
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  detailRowNotes: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  detailContent: {
    marginLeft: 12,
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 14,
    color: '#333',
  },
  budgetValue: {
    fontSize: 14,
    color: '#28a745',
    fontWeight: 'bold',
  },
  actionsCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  actionButton: {
    backgroundColor: '#007bff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  cancelAction: {
    backgroundColor: '#dc3545',
  },
  callAction: {
    backgroundColor: '#28a745',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  assignedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  assignedIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#28a745',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  assignedInfo: {
    flex: 1,
  },
  assignedTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  assignedSubtitle: {
    fontSize: 12,
    color: '#666',
  },
  assignedBody: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  providerImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  assignedDetails: {
    flex: 1,
  },
  providerName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  providerSkill: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  providerPhone: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  providerEta: {
    fontSize: 12,
    color: '#007bff',
    fontWeight: 'bold',
  },
  workCompletionForm: {
    alignItems: 'center',
  },
  fileInput: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    marginBottom: 16,
    width: '100%',
  },
  fileInputText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  completeButton: {
    backgroundColor: '#28a745',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    width: '100%',
  },
  completeButtonDisabled: {
    backgroundColor: '#ccc',
  },
  completeButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  customerDetails: {
    // Same as detailsGrid
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    marginTop: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#007bff',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    marginBottom: 10,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  closeButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  closeButtonText: {
    color: '#666',
    fontSize: 16,
  },
});

export default AcceptedOrderPage;