import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView,
  TextInput, Alert, Image, FlatList, ActivityIndicator, KeyboardAvoidingView,
  Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useMainContext } from '../contexts/MainContext';
import { socket } from '../utils/socket';
import { useNavigation } from '@react-navigation/native';
import * as Notifications from 'expo-notifications';

const API_BASE_URL = process.env.VITE_API_BASE_URL;

// Helper function to sort chat list by last message timestamp
const sortChatList = (list) => {
  return list.sort((a, b) => {
    const aTime = a.lastMessage ? new Date(a.lastMessage.timestamp) : new Date(0);
    const bTime = b.lastMessage ? new Date(b.lastMessage.timestamp) : new Date(0);
    return bTime - aTime;
  });
};

const ChatIcon = () => {
  const navigation = useNavigation();
  const { api, user, isLoggedIn } = useMainContext();
  const [isOpen, setIsOpen] = useState(false);
  const [view, setView] = useState('list'); // 'list' or 'chat' or 'help'
  const [chatList, setChatList] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [typingUsers, setTypingUsers] = useState(new Set());
  const [unreadCounts, setUnreadCounts] = useState({});
  const [supportMessages, setSupportMessages] = useState([]);
  const [supportMessage, setSupportMessage] = useState('');
  const [supportLoading, setSupportLoading] = useState(false);
  const [helpTopics, setHelpTopics] = useState([]);
  const [helpCategories, setHelpCategories] = useState([]);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // Functions used in useEffect

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollToEnd({ animated: true });
  }, []);

  const fetchChatList = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.getChatList();
      const rawChatList = response.data.chatList || [];

      const groupedChats = {};
      rawChatList.forEach(chat => {
        const otherUserId = chat.otherUser?._id?.toString();
        if (otherUserId) {
          if (!groupedChats[otherUserId]) {
            groupedChats[otherUserId] = {
              ...chat,
              appointments: [chat.appointmentId],
              totalUnreadCount: chat.unreadCount || 0
            };
          } else {
            groupedChats[otherUserId].appointments.push(chat.appointmentId);
            groupedChats[otherUserId].totalUnreadCount += chat.unreadCount || 0;

            if (chat.lastMessage && (!groupedChats[otherUserId].lastMessage ||
                new Date(chat.lastMessage.timestamp) > new Date(groupedChats[otherUserId].lastMessage.timestamp))) {
              groupedChats[otherUserId].lastMessage = chat.lastMessage;
              groupedChats[otherUserId].serviceRequest = chat.serviceRequest;
              groupedChats[otherUserId].status = chat.status;
            }

            // If any appointment can be completed, allow completion for this chat
            if (chat.canComplete) {
              groupedChats[otherUserId].canComplete = true;
            }
          }
        }
      });

      const groupedChatList = Object.values(groupedChats);
      const sortedChatList = sortChatList(groupedChatList);
      setChatList(sortedChatList);

      const counts = {};
      sortedChatList.forEach(chat => {
        counts[chat.appointments[0]] = chat.totalUnreadCount;
      });
      setUnreadCounts(counts);
    } catch (err) {
      console.error('Error fetching chat list:', err);
      setError('Failed to load chats');
    } finally {
      setLoading(false);
    }
  }, [api]);

  const markMessagesAsSeen = useCallback(async (appointmentId) => {
    try {
      await api.markMessagesAsSeen(appointmentId);
      setUnreadCounts(prev => ({ ...prev, [appointmentId]: 0 }));
    } catch (err) {
      console.error('Error marking messages as seen:', err);
    }
  }, [api]);

  // Socket event listeners

  useEffect(() => {
    if (!isLoggedIn || !user) return;

    fetchChatList();

    // Socket event listeners
    const handleNewMessage = (message) => {
      if (selectedChat && message.appointment.toString() === selectedChat.appointmentId.toString()) {
        // Prevent duplicate messages by checking if message already exists
        setMessages(prev => {
          const messageExists = prev.some(msg =>
            msg._id === message._id ||
            (msg.id === message.id && msg.id) ||
            (msg.sender._id === message.sender._id &&
             msg.message === message.message &&
             Math.abs(new Date(msg.timestamp || msg.createdAt) - new Date(message.timestamp || message.createdAt)) < 5000) // Within 5 seconds
          );
          if (messageExists) {
            return prev; // Don't add duplicate
          }
          return [...prev, message];
        });
        markMessagesAsSeen(selectedChat.appointmentId);
      } else {
        // Update unread count for other chats
        setUnreadCounts(prev => ({
          ...prev,
          [message.appointment]: (prev[message.appointment] || 0) + 1
        }));
        // Update chat list with new message
        setChatList(prev => {
          const updated = prev.map(chat => {
            if (chat.appointments.includes(message.appointment)) {
              return {
                ...chat,
                lastMessage: message,
                totalUnreadCount: chat.totalUnreadCount + 1
              };
            }
            return chat;
          });
          return sortChatList(updated);
        });
      }
      scrollToBottom();
    };

    const handleChatHistory = (history) => {
      setMessages(history || []);
      if (selectedChat) {
        markMessagesAsSeen(selectedChat.appointmentId);
      }
      scrollToBottom();
    };

    const handleUserTyping = (data) => {
      if (user && selectedChat && data.userId !== user._id) {
        setTypingUsers(prev => new Set([...prev, data.userId]));
      }
    };

    const handleUserStoppedTyping = (data) => {
      if (user && data.userId !== user._id) {
        setTypingUsers(prev => {
          const newSet = new Set(prev);
          newSet.delete(data.userId);
          return newSet;
        });
      }
    };

    const handleError = (error) => {
      console.error('Socket error:', error);
      setError(error);
    };

    socket.on('new-message', handleNewMessage);
    socket.on('chat-history', handleChatHistory);
    socket.on('user-typing', handleUserTyping);
    socket.on('user-stopped-typing', handleUserStoppedTyping);
    socket.on('error', handleError);

    return () => {
      socket.off('new-message', handleNewMessage);
      socket.off('chat-history', handleChatHistory);
      socket.off('user-typing', handleUserTyping);
      socket.off('user-stopped-typing', handleUserStoppedTyping);
      socket.off('error', handleError);
    };
  }, [selectedChat, user, isOpen, isLoggedIn, fetchChatList, markMessagesAsSeen, scrollToBottom]);

  useEffect(() => {
    if (!isLoggedIn || !user) return;
    scrollToBottom();
  }, [messages, isLoggedIn, user, scrollToBottom]);

  // Fetch help topics
  const fetchHelpTopics = () => {
    setHelpTopics([
      {
        id: 1,
        category: "Account",
        title: "Password Reset",
        description: "Forgot your password or need to change it",
        content: "Go to Settings > Account > Change Password. If you forgot your password, use 'Forgot Password' on the login screen."
      },
      {
        id: 2,
        category: "Account",
        title: "Profile Updates",
        description: "Update your personal information and profile",
        content: "Navigate to Profile section to edit your name, email, phone, and profile picture."
      },
      {
        id: 3,
        category: "Booking",
        title: "How to Book Services",
        description: "Learn how to find and book skilled workers",
        content: "Browse skilled users by service type, check their ratings and reviews, then send a service request with your requirements."
      },
      {
        id: 4,
        category: "Booking",
        title: "Track Service Requests",
        description: "Monitor the status of your service requests",
        content: "Check your dashboard for active requests. You'll receive notifications when workers respond or accept your requests."
      },
      {
        id: 5,
        category: "Payments",
        title: "Payment Methods",
        description: "Information about payments and billing",
        content: "Payments are processed securely through our platform. Contact support for billing questions."
      },
      {
        id: 6,
        category: "Technical",
        title: "App Issues",
        description: "Report bugs or technical problems",
        content: "Please describe the issue you're experiencing. Include your device type and app version for faster resolution."
      },
      {
        id: 7,
        category: "Technical",
        title: "Connection Problems",
        description: "Issues with internet connectivity",
        content: "Ensure you have a stable internet connection. Try restarting the app or checking your network settings."
      },
      {
        id: 8,
        category: "General",
        title: "Contact Support",
        description: "Get in touch with our support team",
        content: "Email: skillconnect4b410@gmail.com\nPhone: Available during business hours\nWe'll respond within 24 hours."
      }
    ]);
  };

  // Organize help topics by categories
  useEffect(() => {
    if (helpTopics.length > 0) {
      const categories = {};
      helpTopics.forEach(topic => {
        const category = topic.category || 'General';
        if (!categories[category]) {
          categories[category] = [];
        }
        categories[category].push(topic);
      });
      setHelpCategories(Object.entries(categories));
    }
  }, [helpTopics]);

  // Fetch help topics when help view is opened
  useEffect(() => {
    if (view === 'help' && helpTopics.length === 0) {
      fetchHelpTopics();
    }
  }, [view, helpTopics.length]);

  // User menu handlers
  const handleReportUser = async () => {
    if (!selectedChat) return;
    Alert.prompt(
      'Report User',
      'Please provide a reason for reporting this user:',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Report',
          onPress: async (reason) => {
            if (reason && reason.trim()) {
              try {
                const response = await api.post('/user/report-user', {
                  reportedUserId: selectedChat.otherUser._id,
                  reason: reason.trim(),
                  appointmentId: selectedChat.appointmentId
                });

                if (response.data.success) {
                  Alert.alert('Success', 'User reported successfully. Our team will review your report.');
                }
              } catch (err) {
                console.error('Error reporting user:', err);
                const errorMessage = err.response?.data?.message || 'Failed to report user. Please try again.';
                Alert.alert('Error', errorMessage);
              }
            }
          }
        }
      ]
    );
    setShowUserMenu(false);
  };

  const handleBlockUser = async () => {
    if (!selectedChat) return;
    Alert.alert(
      'Block User',
      `Are you sure you want to block ${selectedChat.otherUser.firstName} ${selectedChat.otherUser.lastName}? You won't be able to send or receive messages from this user.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Block',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await api.post('/user/block-user', {
                targetUserId: selectedChat.otherUser._id
              });

              if (response.data.success) {
                Alert.alert('Success', `User ${selectedChat.otherUser.firstName} ${selectedChat.otherUser.lastName} has been blocked.`);
                // Close the chat and remove from chat list
                backToList();
              }
            } catch (err) {
              console.error('Error blocking user:', err);
              const errorMessage = err.response?.data?.message || 'Failed to block user. Please try again.';
              Alert.alert('Error', errorMessage);
            }
          }
        }
      ]
    );
    setShowUserMenu(false);
  };

  const handleRateUser = async () => {
    if (!selectedChat) return;
    Alert.prompt(
      'Rate User',
      'Rate this user (1-5 stars):',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Submit',
          onPress: async (rating) => {
            const ratingNum = parseInt(rating);
            if (ratingNum >= 1 && ratingNum <= 5) {
              Alert.prompt(
                'Add Comment',
                'Add a comment (optional):',
                [
                  { text: 'Skip', onPress: async () => await submitRating(ratingNum) },
                  {
                    text: 'Add Comment',
                    onPress: async (comment) => await submitRating(ratingNum, comment)
                  }
                ]
              );
            } else if (rating !== null) {
              Alert.alert('Invalid Rating', 'Please enter a rating between 1 and 5.');
            }
          }
        }
      ]
    );
    setShowUserMenu(false);
  };

  const submitRating = async (rating, comments = '') => {
    try {
      const response = await api.post('/review', {
        bookingId: selectedChat.appointmentId,
        rating: rating,
        comments: comments || ''
      });

      if (response.data.success) {
        Alert.alert('Success', `Thank you for rating ${selectedChat.otherUser.firstName} ${selectedChat.otherUser.lastName} with ${rating} stars!`);
      }
    } catch (err) {
      console.error('Error rating user:', err);
      const errorMessage = err.response?.data?.message || 'Failed to submit rating. Please try again.';
      Alert.alert('Error', errorMessage);
    }
  };

  const handleStatusBadgePress = () => {
    if (!selectedChat?.serviceRequest) return;

    const isProvider = selectedChat.serviceRequest.provider._id === user._id;
    if (isProvider) {
      navigation.navigate('ClientAccepted', { requestId: selectedChat.appointmentId });
    } else {
      navigation.navigate('WaitingForWorker');
    }
  };

  // Function to fetch booking details
  const fetchBookingDetails = async (appointmentId) => {
    try {
      const response = await api.get(`/user/booking/${appointmentId}`);
      return response.data.booking;
    } catch (err) {
      console.error('Error fetching booking details:', err);
      return null;
    }
  };

  const fetchMessages = useCallback(async (appointmentId) => {
    try {
      // Fetch chat history for this specific appointment
      const response = await api.getChatHistory();
      const chatMessages = response.data.chatHistory || [];
      setMessages(chatMessages);
      // Mark messages as seen
      if (chatMessages.length > 0) {
        await api.markMessagesAsSeen(appointmentId);
      }
      scrollToBottom();

      // Join socket room
      socket.emit('join-chat', appointmentId);
    } catch (err) {
      console.error('Error fetching chat history:', err);
      setError('Failed to load chat history');
    }
  }, [api, scrollToBottom]);

  const openChat = useCallback(async (chat, specificAppointmentId = null) => {
    const appointmentId = specificAppointmentId || chat.appointments?.[0] || chat.appointmentId;

    let selectedChatData = { ...chat, appointmentId };

    if (appointmentId) {
      // Fetch latest booking details to ensure accurate status
      try {
        const booking = await fetchBookingDetails(appointmentId);
        if (booking) {
          selectedChatData.status = booking.status;
          selectedChatData.serviceRequest = booking.serviceRequest;
          selectedChatData.canComplete = booking.provider.toString() === user._id.toString() && booking.status === 'Working';
        }
      } catch (err) {
        console.error('Error fetching booking details:', err);
      }
    }

    setSelectedChat(selectedChatData);
    setView('chat');
    setError(null);

    if (appointmentId) {
      fetchMessages(appointmentId);
    } else {
      setMessages([]); // No messages for new provider chats
    }
  }, [user, fetchMessages]);

  // Effect to handle opening chat panel from external trigger - simplified for mobile
  useEffect(() => {
    if (!isLoggedIn) return;
    // Mobile version doesn't need external triggers for now
  }, [isLoggedIn]);

  // Remaining functions

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedChat) return;

    // If no appointment exists, create a service request first (inquiry)
    if (!selectedChat.appointmentId) {
      try {
        // Create a service request with the message as inquiry
        const sanitizedMessage = newMessage.trim().replace(/[^a-zA-Z0-9\s\-_.]/g, '').substring(0, 50);
        const serviceRequestData = {
          targetProvider: selectedChat.otherUser._id,
          name: `Inquiry - ${sanitizedMessage}${newMessage.trim().length > 50 ? '...' : ''}`,
          address: user.address || 'Not specified',
          ...(user.phone && user.phone !== 'Not provided' && { phone: user.phone }),
          typeOfWork: 'Consultation', // Use a valid service type for inquiries
          time: '09:00', // Default time
          budget: 0, // Inquiry, no budget set yet
          notes: `Inquiry from ${user.firstName} ${user.lastName}: ${newMessage.trim()}`
        };

        const requestResponse = await api.post('/user/post-service-request', serviceRequestData);
        if (requestResponse.data.success) {
          // Update the selectedChat with inquiry status
          setSelectedChat(prev => ({
            ...prev,
            status: 'Waiting for provider response',
            serviceRequest: {
              name: serviceRequestData.name,
              provider: { _id: selectedChat.otherUser._id }
            }
          }));

          // Add system message to indicate inquiry was sent
          const systemMessage = {
            id: Date.now(),
            message: 'Inquiry sent! You\'ll be able to chat once the provider accepts your request.',
            sender: { _id: 'system', firstName: 'System', lastName: '', profilePic: null },
            timestamp: new Date(),
            status: 'delivered',
            isSystem: true
          };
          setMessages([systemMessage]);

          // Clear input
          setNewMessage('');
        } else {
          throw new Error('Failed to create service request');
        }
      } catch (err) {
        console.error('Error sending inquiry:', err);
        const errorMessage = err.response?.data?.message || 'Failed to send inquiry. Please try again.';
        setError(errorMessage);
      }
      return;
    }

    // If we have an appointment (booking), send the actual chat message
    // Add the sent message to the UI immediately
    const sentMessage = {
      id: Date.now(),
      message: newMessage.trim(),
      sender: { _id: user._id, firstName: user.firstName, lastName: user.lastName, profilePic: user.profilePic },
      timestamp: new Date(),
      status: 'sent'
    };
    setMessages(prev => [...prev, sentMessage]);

    try {
      await api.sendMessage({
        appointmentId: selectedChat.appointmentId,
        message: newMessage.trim()
      });

      // Clear input and stop typing indicator
      setNewMessage('');
      socket.emit('stop-typing', selectedChat.appointmentId);
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    } catch (err) {
      console.error('Error sending message:', err);
      setError('Failed to send message');
      // Remove the message if sending failed
      setMessages(prev => prev.filter(msg => msg.id !== sentMessage.id));
    }
  };

  const handleTyping = () => {
    if (!selectedChat) return;

    socket.emit('typing', selectedChat.appointmentId);

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout to stop typing
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('stop-typing', selectedChat.appointmentId);
    }, 1000);
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return isNaN(date.getTime()) ? '' : date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getProfileImageUrl = (profilePic) => {
    if (profilePic) {
      return profilePic.startsWith('http') ? profilePic : `${API_BASE_URL}${profilePic}`;
    }
    return '/default-profile.png';
  };

  const toggleChat = () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      setView('list');
      setSelectedChat(null);
      setMessages([]);
      setError(null);
    }
  };

  const backToList = () => {
    setView('list');
    setSelectedChat(null);
    setMessages([]);
    setTypingUsers(new Set());
    setSupportMessages([]);
  };

  const sendSupportMessage = () => {
    if (!supportMessage.trim()) return;

    const userMsg = { sender: 'user', message: supportMessage.trim(), timestamp: new Date() };
    setSupportMessages(prev => [...prev, userMsg]);
    setSupportMessage('');

    // Simulate support typing
    setSupportLoading(true);
    setTimeout(() => {
      const supportResponse = getSupportResponse(userMsg.message);
      const supportMsg = { sender: 'support', message: supportResponse, timestamp: new Date() };
      setSupportMessages(prev => [...prev, supportMsg]);
      setSupportLoading(false);
    }, 1000); // 1 second delay
  };

  const getSupportResponse = (userMessage) => {
    const lowerMsg = userMessage.toLowerCase();
    if (lowerMsg.includes('password')) {
      return "For password issues, please visit the Account Settings page or contact us at skillconnect4b410@gmail.com.";
    }
    if (lowerMsg.includes('booking')) {
      return "To book a service, navigate to the skilled users list and select a service. If you need help, check our help center.";
    }
    if (lowerMsg.includes('account')) {
      return "For account-related issues, please check your profile settings or contact us at skillconnect4b410@gmail.com.";
    }
    if (lowerMsg.includes('technical') || lowerMsg.includes('bug') || lowerMsg.includes('report')) {
      return "For technical issues or bugs, please provide details about what happened and your device/browser info. We'll investigate and get back to you.";
    }
    if (lowerMsg.includes('help') || lowerMsg.includes('support') || lowerMsg.includes('other') || lowerMsg.includes('contact')) {
      return "I'm here to help! Please describe your issue in detail.";
    }
    return "Thank you for contacting support. Our team will respond shortly. For urgent issues, email skillconnect4b410@gmail.com.";
  };

  // Only show for authenticated users
  if (!isLoggedIn || !user) {
    return null;
  }

  const totalUnreadCount = Object.values(unreadCounts).reduce((sum, count) => sum + count, 0);

  const renderChatItem = ({ item: chat }) => (
    <TouchableOpacity
      style={styles.chatItem}
      onPress={() => openChat(chat)}
    >
      <View style={styles.chatItemHeader}>
        <Text style={styles.chatItemHeaderH4}>
          {chat.otherUser?.firstName} {chat.otherUser?.lastName}
        </Text>
        {chat.lastMessage && (
          <Text style={styles.chatItemHeaderSmall}>{formatTime(chat.lastMessage.timestamp)}</Text>
        )}
      </View>
      <View style={styles.chatItemContent}>
        <Text style={styles.serviceName}>{chat.serviceRequest?.name}</Text>
        {chat.lastMessage ? (
          <Text style={styles.lastMessage}>
            <Text style={styles.senderName}>{chat.lastMessage.sender?.firstName}:</Text> {chat.lastMessage.message}
          </Text>
        ) : (
          <Text style={styles.noMessages}>No messages yet</Text>
        )}
      </View>
      {unreadCounts[chat.appointments?.[0]] > 0 && (
        <View style={styles.unreadBadge}>
          <Text style={styles.unreadBadgeText}>{unreadCounts[chat.appointments?.[0]]}</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  const renderMessage = ({ item: msg, index }) => (
    <View
      style={[
        styles.messageWrapper,
        msg.sender._id === user._id ? styles.messageWrapperOwn : styles.messageWrapperOther
      ]}
    >
      {msg.isSystem ? (
        <View style={styles.systemMessage}>
          <Text style={styles.systemMessageText}>{msg.message}</Text>
        </View>
      ) : (
        <>
          <Text style={styles.messageTimestamp}>
            {formatTime(msg.timestamp)}
          </Text>
          <View style={[
            styles.message,
            msg.sender._id === user._id ? styles.messageOwn : styles.messageOther
          ]}>
            {msg.sender._id !== user._id && (
              <Image
                source={{ uri: getProfileImageUrl(msg.sender.profilePic) }}
                style={styles.messageAvatar}
                onError={(e) => {
                  // Handle error by showing default avatar
                }}
              />
            )}
            <View style={[
              styles.messageContent,
              msg.sender._id === user._id ? styles.messageContentOwn : styles.messageContentOther
            ]}>
              <Text style={styles.messageText}>{msg.message}</Text>
              {msg.sender._id === user._id && msg.status && (
                <Text style={[
                  styles.messageStatus,
                  msg.status === 'seen' ? styles.messageStatusSeen : styles.messageStatusDefault
                ]}>
                  {msg.status === 'sent' ? '✓' : msg.status === 'delivered' ? '✓✓' : msg.status === 'seen' ? '✓✓' : ''}
                </Text>
              )}
            </View>
          </View>
        </>
      )}
    </View>
  );

  return (
    <>
      {/* Chat Icon */}
      <TouchableOpacity
        style={styles.chatIcon}
        onPress={toggleChat}
      >
        <Icon name="chat" size={24} color="#fff" />
        {totalUnreadCount > 0 && (
          <View style={styles.chatBadge}>
            <Text style={styles.chatBadgeText}>{totalUnreadCount}</Text>
          </View>
        )}
      </TouchableOpacity>

      {/* Chat Modal */}
      <Modal
        visible={isOpen}
        animationType="slide"
        transparent={false}
        onRequestClose={toggleChat}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.chatHeader}>
            {view === 'chat' ? (
              <>
                <TouchableOpacity style={styles.backButton} onPress={backToList}>
                  <Icon name="arrow-back" size={24} color="#fff" />
                </TouchableOpacity>
                <View style={styles.headerTitleSection}>
                  <Text style={styles.chatHeaderTitle}>
                    {selectedChat?.otherUser?.firstName} {selectedChat?.otherUser?.lastName}
                  </Text>
                  {selectedChat?.status && (
                    <TouchableOpacity
                      onPress={handleStatusBadgePress}
                      style={[
                        styles.statusBadge,
                        selectedChat.status.toLowerCase() === 'available' && styles.statusBadgeAvailable,
                        selectedChat.status.toLowerCase() === 'working' && styles.statusBadgeWorking,
                        selectedChat.status.toLowerCase() === 'complete' && styles.statusBadgeComplete,
                        selectedChat.status.toLowerCase() === 'cancelled' && styles.statusBadgeCancelled
                      ]}
                    >
                      <Text style={styles.statusBadgeText}>{selectedChat.status}</Text>
                    </TouchableOpacity>
                  )}
                </View>
                <View style={styles.chatHeaderActions}>
                  <TouchableOpacity
                    style={styles.userMenuBtn}
                    onPress={() => setShowUserMenu(!showUserMenu)}
                  >
                    <Icon name="more-vert" size={24} color="#fff" />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.closeButton} onPress={toggleChat}>
                    <Icon name="close" size={24} color="#fff" />
                  </TouchableOpacity>
                </View>
              </>
            ) : view === 'help' ? (
              <>
                <TouchableOpacity style={styles.backButton} onPress={() => setView('list')}>
                  <Icon name="arrow-back" size={24} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Help Center</Text>
                <TouchableOpacity style={styles.closeButton} onPress={toggleChat}>
                  <Icon name="close" size={24} color="#fff" />
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={styles.headerTitle}>Messages</Text>
                <View style={styles.headerActions}>
                  <TouchableOpacity style={styles.helpButton} onPress={() => setView('help')}>
                    <Icon name="help" size={20} color="#fff" />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.closeButton} onPress={toggleChat}>
                    <Icon name="close" size={24} color="#fff" />
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>

          {/* User Menu Dropdown */}
          {showUserMenu && selectedChat && (
            <View style={styles.userMenuDropdown}>
              <TouchableOpacity
                style={styles.userMenuItem}
                onPress={handleReportUser}
              >
                <Icon name="report" size={16} color="#666" />
                <Text style={styles.userMenuText}>Report User</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.userMenuItem}
                onPress={handleBlockUser}
              >
                <Icon name="block" size={16} color="#666" />
                <Text style={styles.userMenuText}>Block User</Text>
              </TouchableOpacity>
              {user?.role !== 'Service Provider' && (
                <TouchableOpacity
                  style={styles.userMenuItemLast}
                  onPress={handleRateUser}
                >
                  <Icon name="star" size={16} color="#666" />
                  <Text style={styles.userMenuText}>Rate User</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          <View style={styles.messagesContainer}>
            {view === 'list' ? (
              loading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color="#2196F3" />
                  <Text style={styles.loadingText}>Loading conversations...</Text>
                </View>
              ) : error ? (
                <View style={styles.errorContainer}>
                  <Icon name="error" size={48} color="#ccc" />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : (
                <FlatList
                  data={[{ id: 'help', isHelp: true }, ...chatList]}
                  keyExtractor={(item) => item.id || item.otherUser?._id || 'help'}
                  renderItem={({ item }) => {
                    if (item.isHelp) {
                      return (
                        <TouchableOpacity style={styles.chatItem} onPress={() => setView('help')}>
                          <View style={styles.chatItemHeader}>
                            <Text style={styles.chatItemHeaderH4}>Help Center</Text>
                            <Text style={styles.chatItemHeaderSmall}>Support</Text>
                          </View>
                          <Text style={styles.lastMessage}>Get help with your questions</Text>
                        </TouchableOpacity>
                      );
                    }
                    return renderChatItem({ item });
                  }}
                  showsVerticalScrollIndicator={false}
                  style={styles.chatList}
                />
              )
            ) : view === 'chat' ? (
              <KeyboardAvoidingView
                style={styles.chatMessages}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              >
                {error && (
                  <View style={styles.error}>
                    <Text style={styles.errorText}>{error}</Text>
                  </View>
                )}

                <FlatList
                  data={messages}
                  keyExtractor={(item, index) => item._id || item.id || `msg-${index}`}
                  renderItem={renderMessage}
                  showsVerticalScrollIndicator={false}
                  style={styles.messagesList}
                  ref={messagesEndRef}
                  onContentSizeChange={scrollToBottom}
                />

                {typingUsers.size > 0 && (
                  <View style={styles.typingIndicator}>
                    <Text style={styles.typingText}>Someone is typing...</Text>
                  </View>
                )}

                <View style={styles.messageInputSection}>
                  <TextInput
                    style={styles.messageInput}
                    value={newMessage}
                    onChangeText={(text) => {
                      setNewMessage(text);
                      if (selectedChat?.appointmentId) {
                        handleTyping();
                      }
                    }}
                    placeholder={selectedChat?.appointmentId ? "Type a message..." : "Send inquiry message to check availability..."}
                    multiline
                    onSubmitEditing={sendMessage}
                  />
                  <TouchableOpacity
                    style={[styles.sendButton, (!newMessage.trim() || loading) && styles.sendButtonDisabled]}
                    onPress={sendMessage}
                    disabled={!newMessage.trim() || loading}
                  >
                    <Icon name="send" size={20} color="#fff" />
                  </TouchableOpacity>
                </View>
              </KeyboardAvoidingView>
            ) : view === 'help-topics' ? (
              // Help Topics view
              <View style={styles.helpTopicsContainer}>
                <ScrollView style={styles.helpTopicsScrollView} showsVerticalScrollIndicator={false}>
                  {helpCategories.map(([category, topics]) => (
                    <View key={category} style={styles.categorySection}>
                      <Text style={styles.categoryTitle}>{category}</Text>
                      {topics.map((topic) => (
                        <TouchableOpacity
                          key={topic.id}
                          style={styles.helpTopicItem}
                          onPress={() => {
                            setView('help');
                            // Add user message about the selected topic
                            const userMsg = { sender: 'user', message: `I need help with: ${topic.title}`, timestamp: new Date() };
                            setSupportMessages([userMsg]);
                            setSupportLoading(true);
                            setTimeout(() => {
                              const supportMsg = { sender: 'support', message: topic.content, timestamp: new Date() };
                              setSupportMessages([userMsg, supportMsg]);
                              setSupportLoading(false);
                            }, 1000);
                          }}
                        >
                          <View style={styles.helpTopicContent}>
                            <Text style={styles.helpTopicTitle}>{topic.title}</Text>
                            <Text style={styles.helpTopicDesc}>{topic.description}</Text>
                          </View>
                          <Text style={styles.helpTopicArrow}>›</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  ))}
                </ScrollView>
                <View style={styles.browseTopicsButton}>
                  <TouchableOpacity
                    style={styles.browseTopicsTouchable}
                    onPress={() => setView('help')}
                  >
                    <Icon name="chat" size={16} color="#2196F3" />
                    <Text style={styles.browseTopicsText}>Chat with Support</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              // Help Chat view
              <KeyboardAvoidingView
                style={styles.helpContainer}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              >
                <ScrollView style={styles.helpScrollView} showsVerticalScrollIndicator={false}>
                  {supportMessages.length === 0 && !supportLoading && (
                    <View style={styles.welcomeMessage}>
                      <Text style={styles.welcomeText}>Welcome to Help Center! How can we assist you today?</Text>
                      <View style={styles.quickActions}>
                        <TouchableOpacity
                          style={styles.quickActionButton}
                          onPress={() => {
                            const message = 'I need help with password reset';
                            setSupportMessages([{ sender: 'user', message, timestamp: new Date() }]);
                            setSupportLoading(true);
                            setTimeout(() => {
                              setSupportMessages(prev => [...prev, {
                                sender: 'support',
                                message: getSupportResponse(message),
                                timestamp: new Date()
                              }]);
                              setSupportLoading(false);
                            }, 1000);
                          }}
                        >
                          <Text style={styles.quickActionText}>Password Reset</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.quickActionButton}
                          onPress={() => {
                            const message = 'I need help with booking a service';
                            setSupportMessages([{ sender: 'user', message, timestamp: new Date() }]);
                            setSupportLoading(true);
                            setTimeout(() => {
                              setSupportMessages(prev => [...prev, {
                                sender: 'support',
                                message: getSupportResponse(message),
                                timestamp: new Date()
                              }]);
                              setSupportLoading(false);
                            }, 1000);
                          }}
                        >
                          <Text style={styles.quickActionText}>Booking Help</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.quickActionButton}
                          onPress={() => {
                            const message = 'I have account issues';
                            setSupportMessages([{ sender: 'user', message, timestamp: new Date() }]);
                            setSupportLoading(true);
                            setTimeout(() => {
                              setSupportMessages(prev => [...prev, {
                                sender: 'support',
                                message: getSupportResponse(message),
                                timestamp: new Date()
                              }]);
                              setSupportLoading(false);
                            }, 1000);
                          }}
                        >
                          <Text style={styles.quickActionText}>Account Issues</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.quickActionButton}
                          onPress={() => setView('help-topics')}
                        >
                          <Text style={styles.quickActionText}>Browse Topics</Text>
                        </TouchableOpacity>
                      </View>
                      <View style={styles.browseTopicsButton}>
                        <TouchableOpacity
                          style={styles.browseTopicsTouchable}
                          onPress={() => setView('help-topics')}
                        >
                          <Icon name="list" size={16} color="#2196F3" />
                          <Text style={styles.browseTopicsText}>Browse Help Topics</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}

                  {supportMessages.length > 0 && supportMessages[supportMessages.length - 1].sender === 'support' && !supportLoading && (
                    <View style={styles.followUpMessage}>
                      <Text style={styles.followUpText}>Is there anything else I can help you with?</Text>
                      <View style={styles.quickActions}>
                        <TouchableOpacity
                          style={styles.quickActionButton}
                          onPress={() => {
                            const message = 'I need help with password reset';
                            setSupportMessages(prev => [...prev, { sender: 'user', message, timestamp: new Date() }]);
                            setSupportLoading(true);
                            setTimeout(() => {
                              setSupportMessages(prev => [...prev, {
                                sender: 'support',
                                message: getSupportResponse(message),
                                timestamp: new Date()
                              }]);
                              setSupportLoading(false);
                            }, 1000);
                          }}
                        >
                          <Text style={styles.quickActionText}>Password Reset</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.quickActionButton}
                          onPress={() => {
                            const message = 'I need help with booking a service';
                            setSupportMessages(prev => [...prev, { sender: 'user', message, timestamp: new Date() }]);
                            setSupportLoading(true);
                            setTimeout(() => {
                              setSupportMessages(prev => [...prev, {
                                sender: 'support',
                                message: getSupportResponse(message),
                                timestamp: new Date()
                              }]);
                              setSupportLoading(false);
                            }, 1000);
                          }}
                        >
                          <Text style={styles.quickActionText}>Booking Help</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.quickActionButton}
                          onPress={() => {
                            const message = 'I have account issues';
                            setSupportMessages(prev => [...prev, { sender: 'user', message, timestamp: new Date() }]);
                            setSupportLoading(true);
                            setTimeout(() => {
                              setSupportMessages(prev => [...prev, {
                                sender: 'support',
                                message: getSupportResponse(message),
                                timestamp: new Date()
                              }]);
                              setSupportLoading(false);
                            }, 1000);
                          }}
                        >
                          <Text style={styles.quickActionText}>Account Issues</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.quickActionButton}
                          onPress={() => setView('help-topics')}
                        >
                          <Text style={styles.quickActionText}>Browse Topics</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}

                  {supportMessages.map((msg, index) => (
                    <View key={index} style={[
                      styles.messageWrapper,
                      msg.sender === 'user' ? styles.messageWrapperOwn : styles.messageWrapperOther
                    ]}>
                      <View style={[
                        styles.message,
                        msg.sender === 'user' ? styles.messageOwn : styles.messageOther
                      ]}>
                        <View style={[
                          styles.messageContent,
                          msg.sender === 'user' ? styles.messageContentOwn : styles.messageContentOther
                        ]}>
                          <Text style={styles.messageText}>{msg.message}</Text>
                        </View>
                      </View>
                    </View>
                  ))}

                  {supportLoading && (
                    <View style={styles.typingIndicator}>
                      <Text style={styles.typingText}>Support is typing...</Text>
                    </View>
                  )}
                </ScrollView>

                <View style={styles.messageInputSection}>
                  <TextInput
                    style={styles.messageInput}
                    value={supportMessage}
                    onChangeText={setSupportMessage}
                    placeholder="Type your message to support..."
                    onSubmitEditing={sendSupportMessage}
                  />
                  <TouchableOpacity
                    style={[styles.sendButton, (!supportMessage.trim() || supportLoading) && styles.sendButtonDisabled]}
                    onPress={sendSupportMessage}
                    disabled={!supportMessage.trim() || supportLoading}
                  >
                    <Icon name="send" size={20} color="#fff" />
                  </TouchableOpacity>
                </View>
              </KeyboardAvoidingView>
            )}
          </View>
        </SafeAreaView>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  chatIcon: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#2196F3',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  chatBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#FF4444',
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  chatBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  chatHeader: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    padding: 8,
  },
  headerTitleSection: {
    flex: 1,
    alignItems: 'center',
  },
  chatHeaderTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  statusBadge: {
    fontSize: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginTop: 4,
  },
  statusBadgeAvailable: {
    backgroundColor: '#4CAF50',
  },
  statusBadgeWorking: {
    backgroundColor: '#FF9800',
  },
  statusBadgeComplete: {
    backgroundColor: '#2196F3',
  },
  statusBadgeCancelled: {
    backgroundColor: '#F44336',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  helpButton: {
    padding: 8,
    marginRight: 8,
  },
  closeButton: {
    padding: 8,
  },
  messagesContainer: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 16,
  },
  chatList: {
    flex: 1,
  },
  chatItem: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 16,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    position: 'relative',
  },
  chatItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  chatItemHeaderH4: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  chatItemHeaderSmall: {
    fontSize: 12,
    color: '#666',
  },
  chatItemContent: {
    marginBottom: 8,
  },
  serviceName: {
    fontSize: 14,
    color: '#2196F3',
    fontWeight: '600',
    marginBottom: 4,
  },
  lastMessage: {
    fontSize: 14,
    color: '#666',
  },
  senderName: {
    fontWeight: 'bold',
  },
  noMessages: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
  },
  unreadBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#FF4444',
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  unreadBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  chatMessages: {
    flex: 1,
  },
  error: {
    backgroundColor: '#ffebee',
    padding: 12,
    margin: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#f44336',
  },
  messagesList: {
    flex: 1,
    padding: 16,
  },
  messageWrapper: {
    marginBottom: 16,
  },
  messageWrapperOwn: {
    alignItems: 'flex-end',
  },
  messageWrapperOther: {
    alignItems: 'flex-start',
  },
  systemMessage: {
    alignSelf: 'center',
    backgroundColor: '#e0e0e0',
    padding: 12,
    borderRadius: 16,
    marginVertical: 8,
  },
  systemMessageText: {
    color: '#666',
    fontSize: 14,
    textAlign: 'center',
  },
  messageTimestamp: {
    fontSize: 10,
    color: '#666',
    marginBottom: 4,
  },
  message: {
    flexDirection: 'row',
    maxWidth: '80%',
    alignItems: 'flex-end',
  },
  messageOwn: {
    flexDirection: 'row-reverse',
  },
  messageOther: {
    flexDirection: 'row',
  },
  messageAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginHorizontal: 8,
    borderWidth: 2,
    borderColor: '#e0e0e0',
  },
  messageContent: {
    padding: 12,
    borderRadius: 16,
    maxWidth: 250,
  },
  messageContentOwn: {
    backgroundColor: '#2196F3',
    borderBottomRightRadius: 4,
  },
  messageContentOther: {
    backgroundColor: '#fff',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
  },
  typingIndicator: {
    padding: 12,
    backgroundColor: '#e0e0e0',
    borderRadius: 16,
    alignSelf: 'flex-start',
    marginHorizontal: 16,
    marginBottom: 8,
  },
  typingText: {
    color: '#666',
    fontSize: 14,
    fontStyle: 'italic',
  },
  messageInputSection: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  messageInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginRight: 12,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
    maxHeight: 100,
  },
  sendButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#2196F3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#ccc',
  },
  helpContainer: {
    flex: 1,
  },
  helpScrollView: {
    flex: 1,
    padding: 16,
  },
  welcomeMessage: {
    alignItems: 'center',
    marginBottom: 20,
  },
  welcomeText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  quickActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  quickActionButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    margin: 4,
  },
  quickActionText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  userMenuDropdown: {
    position: 'absolute',
    top: 60,
    right: 16,
    backgroundColor: '#fff',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 8,
    minWidth: 180,
    zIndex: 1000,
  },
  userMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  userMenuItemLast: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  userMenuText: {
    fontSize: 14,
    color: '#333',
    marginLeft: 12,
  },
  chatHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userMenuBtn: {
    padding: 8,
    marginRight: 8,
  },
  helpTopicsContainer: {
    flex: 1,
  },
  helpTopicsScrollView: {
    flex: 1,
    padding: 16,
  },
  categorySection: {
    marginBottom: 24,
  },
  categoryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 2,
    borderBottomColor: '#2196F3',
  },
  helpTopicItem: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  helpTopicContent: {
    flex: 1,
  },
  helpTopicTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  helpTopicDesc: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  helpTopicArrow: {
    fontSize: 20,
    color: '#666',
    fontWeight: 'bold',
  },
  browseTopicsButton: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    backgroundColor: '#f9f9f9',
  },
  browseTopicsTouchable: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2196F3',
  },
  browseTopicsText: {
    fontSize: 16,
    color: '#2196F3',
    fontWeight: '600',
    marginLeft: 8,
  },
  followUpMessage: {
    alignItems: 'center',
    marginBottom: 20,
  },
  followUpText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 16,
  },
  statusBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  messageStatus: {
    position: 'absolute',
    bottom: 4,
    right: 8,
    fontSize: 12,
    fontWeight: 'bold',
  },
  messageStatusSeen: {
    color: '#4CAF50',
  },
  messageStatusDefault: {
    color: '#666',
  },
});

export default ChatIcon;
