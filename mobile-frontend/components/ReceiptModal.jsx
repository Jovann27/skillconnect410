import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

const ReceiptModal = ({ request, booking, isOpen, onClose }) => {
  if (!isOpen || !request) return null;

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Debug logging to verify data is available
  console.log('Mobile ReceiptModal - Request data:', request);
  console.log('Mobile ReceiptModal - Booking data:', booking);
  console.log('Mobile ReceiptModal - Requester info:', request?.requester);
  console.log('Mobile ReceiptModal - ServiceProvider info:', request?.serviceProvider);

  return (
    <View style={styles.overlay}>
      <View style={styles.modal}>
        <View style={styles.header}>
          <Text style={styles.title}>Service Receipt</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#666" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
          {/* Receipt Header */}
          <View style={styles.section}>
            <View style={styles.headerSection}>
              <View style={styles.logo}>
                <Text style={styles.logoText}>SC</Text>
              </View>
              <View style={styles.titleSection}>
                <Text style={styles.receiptTitle}>Service Completion Receipt</Text>
                <Text style={styles.orderNumber}>Order #{request._id?.slice(-8).toUpperCase() || "N/A"}</Text>
              </View>
            </View>
          </View>

          {/* Service Details */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Service Details</Text>
            <View style={styles.detailsGrid}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Service Type:</Text>
                <Text style={styles.detailValue}>{request.typeOfWork || "N/A"}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Date Requested:</Text>
                <Text style={styles.detailValue}>{formatDate(request.createdAt)}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Preferred Time:</Text>
                <Text style={styles.detailValue}>{request.time || "N/A"}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Service Address:</Text>
                <Text style={styles.detailValue}>{request.address || "N/A"}</Text>
              </View>
            </View>
          </View>

          {/* Client Information */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Client Information</Text>
            <View style={styles.detailsGrid}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Name:</Text>
                <Text style={styles.detailValue}>
                  {(request?.requester?.firstName || request?.name) || "N/A"} {(request?.requester?.lastName) || ""}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Phone:</Text>
                <Text style={styles.detailValue}>{(request?.requester?.phone || request?.phone) || "N/A"}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Email:</Text>
                <Text style={styles.detailValue}>{(request?.requester?.email || request?.email) || "N/A"}</Text>
              </View>
            </View>
          </View>

          {/* Provider Information */}
          {(booking?.provider || request?.serviceProvider) && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Service Provider</Text>
              <View style={styles.detailsGrid}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Name:</Text>
                  <Text style={styles.detailValue}>
                    {(booking?.provider?.firstName || request?.serviceProvider?.firstName)} {(booking?.provider?.lastName || request?.serviceProvider?.lastName)}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Phone:</Text>
                  <Text style={styles.detailValue}>{(booking?.provider?.phone || request?.serviceProvider?.phone) || "N/A"}</Text>
                </View>
                {booking?.completedAt && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Service Completed:</Text>
                    <Text style={styles.detailValue}>{formatDate(booking.completedAt)}</Text>
                  </View>
                )}
              </View>
            </View>
          )}

          {/* Service Notes */}
          {request.notes && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Service Notes</Text>
              <Text style={styles.notes}>{request.notes}</Text>
            </View>
          )}

          {/* Payment Summary */}
          <View style={[styles.section, styles.paymentSection]}>
            <Text style={styles.sectionTitle}>Payment Summary</Text>
            <View style={styles.paymentDetails}>
              <View style={styles.paymentRow}>
                <Text style={styles.paymentLabel}>Service Fee</Text>
                <Text style={styles.paymentValue}>₱{request.budget?.toLocaleString() || "0"}</Text>
              </View>
              <View style={[styles.paymentRow, styles.totalRow]}>
                <Text style={[styles.paymentLabel, styles.totalLabel]}>Total Amount</Text>
                <Text style={[styles.paymentValue, styles.totalValue]}>₱{request.budget?.toLocaleString() || "0"}</Text>
              </View>
            </View>
          </View>

          {/* Completion Details */}
          {booking && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Completion Details</Text>
              <View style={styles.completionDetails}>
                <View style={styles.completionItem}>
                  <Ionicons name="checkmark-circle" size={20} color="#28a745" />
                  <Text style={styles.completionText}>
                    Service completed on {formatDate(booking.completedAt)} at {formatTime(booking.completedAt)}
                  </Text>
                </View>
                {booking.completionNotes && (
                  <View style={styles.completionItem}>
                    <Ionicons name="document-text" size={20} color="#667eea" />
                    <Text style={styles.completionText}>Provider notes: {booking.completionNotes}</Text>
                  </View>
                )}
              </View>
            </View>
          )}

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Thank you for using SkillConnect!</Text>
            <Text style={styles.footerDate}>Receipt generated on {formatDate(new Date())}</Text>
          </View>
        </ScrollView>

        {/* Action Buttons */}
        <View style={styles.actions}>
          <TouchableOpacity style={styles.secondaryButton} onPress={onClose}>
            <Text style={styles.secondaryButtonText}>Close</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.primaryButton} onPress={() => console.log('Print receipt')}>
            <Ionicons name="print" size={16} color="#fff" />
            <Text style={styles.primaryButtonText}>Print Receipt</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
    padding: 20,
  },
  modal: {
    backgroundColor: '#fff',
    borderRadius: 12,
    width: width * 0.9,
    maxHeight: '90%',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 2,
    borderBottomColor: '#f0f0f0',
    backgroundColor: '#667eea',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
  },
  closeButton: {
    padding: 5,
  },
  body: {
    padding: 20,
    maxHeight: '70%',
  },
  section: {
    marginBottom: 20,
  },
  headerSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 2,
    borderBottomColor: '#e0e0e0',
  },
  logo: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#667eea',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  logoText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  titleSection: {
    flex: 1,
  },
  receiptTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 5,
  },
  orderNumber: {
    fontSize: 14,
    color: '#666',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 15,
    paddingBottom: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  detailsGrid: {
    gap: 10,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  detailLabel: {
    fontWeight: '500',
    color: '#666',
    fontSize: 14,
  },
  detailValue: {
    fontWeight: '600',
    color: '#1a1a1a',
    fontSize: 14,
    textAlign: 'right',
    flex: 1,
  },
  notes: {
    backgroundColor: '#f9f9f9',
    padding: 15,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#667eea',
    color: '#555',
    lineHeight: 20,
  },
  paymentSection: {
    backgroundColor: '#f8f9fa',
    padding: 20,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#e9ecef',
  },
  paymentDetails: {
    gap: 10,
  },
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 5,
  },
  totalRow: {
    borderTopWidth: 2,
    borderTopColor: '#dee2e6',
    paddingTop: 15,
    marginTop: 5,
  },
  paymentLabel: {
    fontSize: 15,
    color: '#1a1a1a',
  },
  paymentValue: {
    fontSize: 15,
    color: '#1a1a1a',
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  totalValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  completionDetails: {
    gap: 15,
  },
  completionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 10,
    backgroundColor: '#f8f9fa',
    borderRadius: 6,
    borderLeftWidth: 3,
    borderLeftColor: '#28a745',
  },
  completionText: {
    color: '#495057',
    lineHeight: 18,
    flex: 1,
  },
  footer: {
    alignItems: 'center',
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 2,
    borderTopColor: '#e0e0e0',
  },
  footerText: {
    color: '#666',
    marginBottom: 5,
  },
  footerDate: {
    color: '#999',
    fontSize: 12,
  },
  actions: {
    flexDirection: 'row',
    gap: 15,
    justifyContent: 'flex-end',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    backgroundColor: '#f8f9fa',
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
  },
  secondaryButton: {
    backgroundColor: '#6c757d',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 6,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#fff',
    fontWeight: '500',
  },
  primaryButton: {
    backgroundColor: '#667eea',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 6,
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  primaryButtonText: {
    color: '#fff',
    fontWeight: '500',
  },
});

export default ReceiptModal;
