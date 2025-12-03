import { useState, useRef, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  Image,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { socket } from "../utils/socket";
import { useMainContext } from "../contexts/MainContext";

// Constants
const API_BASE_URL = 'http://192.168.1.11:4000/api/v1';

// Helper function to get full profile image URL
const getProfileImageUrl = (profilePic) => {
  if (!profilePic) return require("../assets/default-profile.png");
  if (profilePic.startsWith('http')) return { uri: profilePic };
  return { uri: `${API_BASE_URL}${profilePic}` };
};

// Helper function to sort chat list by last message timestamp
const sortChatList = (list) => {
  return list.sort((a, b) => {
    const aTime = a.lastMessage ? new Date(a.lastMessage.timestamp) : new Date(0);
    const bTime = b.lastMessage ? new Date(b.lastMessage.timestamp) : new Date(0);
    return bTime - aTime;
  });
};

// Note: helpAPI is not implemented yet, using fallback hardcoded topics

export default function Chat({ route, navigation }) {
  const { worker } = route.params || {};
  const { api, user } = useMainContext();
  const [view, setView] = useState('list'); // 'list' or 'chat' or 'help' or 'help-topics'
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
  const [selectedHelpTopic, setSelectedHelpTopic] = useState(null);
  const [helpCategories, setHelpCategories] = useState([]);
  const [localUser, setLocalUser] = useState(null);
  const [workProofImage, setWorkProofImage] = useState(null);
  const [completingWork, setCompletingWork] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showRequestDetails, setShowRequestDetails] = useState(true);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const flatListRef = useRef(null);

  // Scroll to bottom function
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollToEnd({ animated: true });
  };

  // Fetch chat list
  const fetchChatList = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.getChatList();
      const rawChatList = response.data.chatList || [];

      // Group chats by otherUser._id to avoid duplicates
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
            // Merge appointments and accumulate unread counts
            groupedChats[otherUserId].appointments.push(chat.appointmentId);
            groupedChats[otherUserId].totalUnreadCount += chat.unreadCount || 0;

            // Keep the most recent lastMessage
            if (chat.lastMessage && (!groupedChats[otherUserId].lastMessage ||
                new Date(chat.lastMessage.timestamp) > new Date(groupedChats[otherUserId].lastMessage.timestamp))) {
              groupedChats[otherUserId].lastMessage = chat.lastMessage;
              groupedChats[otherUserId].serviceRequest = chat.serviceRequest;
              groupedChats[otherUserId].status = chat.status;
            }
          }
        }
      });

      const groupedChatList = Object.values(groupedChats);
      const sortedChatList = sortChatList(groupedChatList);
      setChatList(sortedChatList);

      const counts = {};
      sortedChatList.forEach(chat => {
        // Use the first appointment ID for unread counts (simplified)
        counts[chat.appointments[0]] = chat.totalUnreadCount;
      });
      setUnreadCounts(counts);
    } catch (err) {
      console.error('Error fetching chat list:', err);
      const errorMessage = err.message || 'Failed to load chats. Please check your connection and try again.';
      setError(errorMessage);
      // Show alert for critical errors
      if (err.status === 401) {
        Alert.alert('Session Expired', 'Please log in again.');
        // You might want to navigate to login screen here
      }
    } finally {
      setLoading(false);
    }
  };

  // Mark messages as seen
  const markMessagesAsSeen = async (appointmentId) => {
    try {
      await api.markMessagesAsSeen(appointmentId);
      setUnreadCounts(prev => ({ ...prev, [appointmentId]: 0 }));
    } catch (err) {
      console.error('Error marking messages as seen:', err);
    }
  };

  // Fetch chat history
  const fetchChatHistory = async (appointmentId) => {
    try {
      const response = await api.getChatHistory();
      // Find the chat history for the specific appointment
      const appointmentChat = response.data.chatHistory?.find(
        chat => chat.appointmentId.toString() === appointmentId.toString()
      );
      const chatMessages = appointmentChat?.messages || [];
      setMessages(chatMessages);
      markMessagesAsSeen(appointmentId);
      scrollToBottom();
    } catch (error) {
      console.error("Error fetching chat history:", error);
      setError('Failed to load chat history');
    }
  };

  // Fetch help topics
  const fetchHelpTopics = async () => {
    // Note: helpAPI is not implemented yet, using fallback hardcoded topics
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

  // Get user data
  const getUserData = async () => {
    try {
      const savedUser = await AsyncStorage.getItem("user");
      if (savedUser) {
        setLocalUser(JSON.parse(savedUser));
      }
    } catch (err) {
      console.log("Error loading user data:", err);
    }
  };

  useEffect(() => {
    getUserData();
    if (view === 'list') {
      fetchChatList();
    }
    if (view === 'help') {
      fetchHelpTopics();
    }
  }, [view]);

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

  // Socket event listeners
  useEffect(() => {
    if (!user) return;

    // Socket event listeners (mock implementations for now)
    const handleNewMessage = (message) => {
      if (selectedChat && message.appointment.toString() === selectedChat.appointmentId.toString()) {
        setMessages(prev => [...prev, message]);
        markMessagesAsSeen(selectedChat.appointmentId);
      } else {
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
      if (selectedChat && data.userId !== user._id) {
        setTypingUsers(prev => new Set([...prev, data.userId]));
      }
    };

    const handleUserStoppedTyping = (data) => {
      if (data.userId !== user._id) {
        setTypingUsers(prev => {
          const newSet = new Set(prev);
          newSet.delete(data.userId);
          return newSet;
        });
      }
    };

    // Socket listeners for real-time functionality
    if (socket && typeof socket.on === 'function') {
      socket.on('new-message', handleNewMessage);
      socket.on('chat-history', handleChatHistory);
      socket.on('user-typing', handleUserTyping);
      socket.on('user-stopped-typing', handleUserStoppedTyping);
    }

    return () => {
      if (socket && typeof socket.off === 'function') {
        socket.off('new-message', handleNewMessage);
        socket.off('chat-history', handleChatHistory);
        socket.off('user-typing', handleUserTyping);
        socket.off('user-stopped-typing', handleUserStoppedTyping);
      }
    };
  }, [selectedChat, user]);

  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom();
    }
  }, [messages]);

  // Send message
  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedChat) return;

    try {
      const messageData = {
        appointmentId: selectedChat.appointmentId,
        message: newMessage.trim()
      };

      const response = await api.sendMessage(messageData);

      // Add the sent message to the UI immediately
      const sentMessage = {
        id: response.data.messageId || Date.now(),
        message: newMessage.trim(),
        sender: { _id: user._id, firstName: user.firstName, lastName: user.lastName, profilePic: user.profilePic },
        timestamp: new Date(),
        status: 'sent'
      };

      setMessages(prev => [...prev, sentMessage]);
      setNewMessage('');
      socket.emit('stop-typing', selectedChat.appointmentId);
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

    } catch (err) {
      console.error('Error sending message:', err);
      setError('Failed to send message');
    }
  };

  // Handle typing
  const handleTyping = () => {
    if (!selectedChat) return;

    socket.emit('typing', selectedChat.appointmentId);

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('stop-typing', selectedChat.appointmentId);
    }, 1000);
  };

  // Helper functions
  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return isNaN(date.getTime()) ? '' : date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getMessageStatusIcon = (status) => {
    switch (status) {
      case 'sent': return '✓';
      case 'delivered': return '✓✓';
      case 'seen': return '✓✓';
      default: return '';
    }
  };

  // Navigation functions
  const openChat = (chat) => {
    setSelectedChat(chat);
    setView('chat');
    setError(null);
    fetchChatHistory(chat.appointmentId);
    socket.emit('join-chat', chat.appointmentId);
  };

  const backToList = () => {
    setView('list');
    setSelectedChat(null);
    setMessages([]);
    setTypingUsers(new Set());
    setSupportMessages([]);
  };

  // Support functions
  const sendSupportMessage = () => {
    if (!supportMessage.trim()) return;

    const userMsg = { sender: 'user', message: supportMessage.trim(), timestamp: new Date() };
    setSupportMessages(prev => [...prev, userMsg]);
    setSupportMessage('');

    setSupportLoading(true);
    setTimeout(() => {
      const supportResponse = getSupportResponse(userMsg.message);
      const supportMsg = { sender: 'support', message: supportResponse, timestamp: new Date() };
      setSupportMessages(prev => [...prev, supportMsg]);
      setSupportLoading(false);
    }, 1000);
  };

  const getSupportResponse = (userMessage) => {
    if (!userMessage || typeof userMessage !== 'string') {
      return "I'm sorry, I didn't understand that. Please describe your issue in detail.";
    }

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

  const handleSupportOption = (option) => {
    const messageMap = {
      password: 'I need help with password reset',
      booking: 'I need help with booking a service',
      account: 'I have account issues',
      technical: 'I have a technical issue or found a bug',
      other: 'I have another support request'
    };
    const userMsg = { sender: 'user', message: messageMap[option], timestamp: new Date() };
    setSupportMessages([userMsg]);
    setSupportLoading(true);
    setTimeout(() => {
      const supportMsg = { sender: 'support', message: getSupportResponse(userMsg.message), timestamp: new Date() };
      setSupportMessages([userMsg, supportMsg]);
      setSupportLoading(false);
    }, 1000);
  };

  const handleCompleteWork = async () => {
    if (!selectedChat || !workProofImage) return;

    setCompletingWork(true);
    try {
      const formData = new FormData();
      formData.append('proofImage', workProofImage);
      formData.append('appointmentId', selectedChat.appointmentId);

      await api.completeWork(formData);

      // Update the chat status locally
      setSelectedChat(prev => prev ? { ...prev, status: 'Complete' } : null);

      // Update chat list
      setChatList(prev => prev.map(chat =>
        chat.appointments.includes(selectedChat.appointmentId)
          ? { ...chat, status: 'Complete' }
          : chat
      ));

      setWorkProofImage(null);
      Alert.alert('Success', 'Work completed successfully!');
    } catch (err) {
      console.error('Error completing work:', err);
      Alert.alert('Error', 'Failed to complete work. Please try again.');
    } finally {
      setCompletingWork(false);
    }
  };

  // Render functions
  const renderChatListItem = ({ item }) => (
    <TouchableOpacity
      style={styles.chatListItem}
      onPress={() => openChat(item)}
    >
      <Image
        source={getProfileImageUrl(item.otherUser?.profilePic)}
        style={styles.chatListImage}
      />
      <View style={styles.chatListContent}>
        <View style={styles.chatListHeader}>
          <Text style={styles.chatListName}>
            {item.otherUser?.firstName} {item.otherUser?.lastName}
          </Text>
          {item.lastMessage && (
            <Text style={styles.chatListTime}>{formatTime(item.lastMessage.timestamp)}</Text>
          )}
        </View>
        <View style={styles.chatListMessageRow}>
          <Text style={styles.chatListService}>{item.serviceRequest?.name}</Text>
          {item.lastMessage ? (
            <Text style={styles.chatListMessage} numberOfLines={1}>
              <Text style={styles.messageSender}>
                {item.lastMessage.sender?.firstName}:
              </Text> {item.lastMessage.message}
            </Text>
          ) : (
            <Text style={styles.noMessages}>No messages yet</Text>
          )}
        </View>
      </View>
      {unreadCounts[item.appointmentId] > 0 && (
        <View style={styles.unreadBadge}>
          <Text style={styles.unreadText}>{unreadCounts[item.appointmentId]}</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  const renderMessage = ({ item }) => {
    const isOwn = item.sender._id === user?._id;

    return (
      <View style={[styles.messageWrapper, isOwn ? styles.ownMessage : styles.otherMessage]}>
        <Text style={styles.messageTimestamp}>
          {formatTime(item.timestamp)}
        </Text>
        <View style={[styles.messageContainer, isOwn ? styles.ownContainer : styles.otherContainer]}>
          {!isOwn && (
            <Image
              source={getProfileImageUrl(item.sender.profilePic)}
              style={styles.messageAvatar}
            />
          )}
          <View style={[styles.messageBubble, isOwn ? styles.ownBubble : styles.otherBubble]}>
            <Text style={[styles.messageText, isOwn ? styles.ownText : styles.otherText]}>
              {item.message}
            </Text>
          </View>
          {isOwn && (
            <Text style={styles.messageStatus}>
              {getMessageStatusIcon(item.status)}
            </Text>
          )}
        </View>
      </View>
    );
  };

  const renderSupportMessage = ({ item }) => {
    const isUser = item.sender === 'user';

    return (
      <View style={[styles.messageWrapper, isUser ? styles.ownMessage : styles.otherMessage]}>
        <View style={[styles.messageContainer, isUser ? styles.ownContainer : styles.otherContainer]}>
          <View style={[styles.messageBubble, isUser ? styles.ownBubble : styles.otherBubble]}>
            <Text style={[styles.messageText, isUser ? styles.ownText : styles.otherText]}>
              {item.message}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        {view === 'chat' ? (
          <>
            <TouchableOpacity onPress={backToList} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color="#333" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>
              {selectedChat?.otherUser?.firstName} {selectedChat?.otherUser?.lastName}
            </Text>
            <View style={[styles.statusIndicator, { backgroundColor: selectedChat?.status?.toLowerCase() === 'active' ? '#4CAF50' : '#FFC107' }]} />
          </>
        ) : view === 'help' ? (
          <>
            <TouchableOpacity onPress={() => setView('list')} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color="#333" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Help Center</Text>
          </>
        ) : view === 'help-topics' ? (
          <>
            <TouchableOpacity onPress={() => setView('help')} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color="#333" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Help Topics</Text>
          </>
        ) : (
          <>
            <Text style={styles.headerTitle}>Messages</Text>
            <View style={styles.headerActions}>
              <TouchableOpacity onPress={() => setView('help')} style={styles.helpHeaderButton}>
                <Ionicons name="help-circle-outline" size={24} color="#333" />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => navigation.goBack()}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>

      {/* Body */}
      <View style={styles.body}>
        {view === 'list' ? (
          loading ? (
            <Text style={styles.loadingText}>Loading...</Text>
          ) : error ? (
            <Text style={styles.errorText}>{error}</Text>
          ) : chatList.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="chatbubble-outline" size={64} color="#ccc" />
              <Text style={styles.emptyText}>No chats available.</Text>
              <TouchableOpacity style={styles.helpButton} onPress={() => setView('help')}>
                <Text style={styles.helpButtonText}>Get Help</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <FlatList
              data={chatList}
              keyExtractor={(item) => item.appointmentId}
              renderItem={renderChatListItem}
              style={styles.chatList}
              showsVerticalScrollIndicator={false}
            />
          )
        ) : view === 'chat' ? (
          <View style={styles.chatView}>
            {error && <Text style={styles.errorText}>{error}</Text>}

            {/* Request Details Section */}
            {selectedChat?.serviceRequest && (
              <View style={styles.requestDetailsSection}>
                <Text style={styles.requestDetailsTitle}>Request Details</Text>
                <View style={styles.requestInfo}>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Service:</Text>
                    <Text style={styles.detailValue}>
                      {selectedChat.serviceRequest.typeOfWork || selectedChat.serviceRequest.name || 'N/A'}
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Budget:</Text>
                    <Text style={styles.detailValue}>
                      {selectedChat.serviceRequest.budget ? `₱${selectedChat.serviceRequest.budget}` : 'N/A'}
                    </Text>
                  </View>
                  {user?.role === 'Service Provider' && (
                    <>
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Location:</Text>
                        <Text style={styles.detailValue}>
                          {selectedChat.serviceRequest.address || 'N/A'}
                        </Text>
                      </View>
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Notes:</Text>
                        <Text style={styles.detailValue}>
                          {selectedChat.serviceRequest.notes || 'N/A'}
                        </Text>
                      </View>
                    </>
                  )}
                </View>

                {/* Work Confirmation Section - Only show for service providers when status is Working */}
                {user?.role === 'Service Provider' && selectedChat?.status === 'Working' && (
                  <View style={styles.workConfirmationSection}>
                    <Text style={styles.workConfirmationTitle}>Complete Work</Text>
                    <View style={styles.workConfirmationForm}>
                      <TouchableOpacity
                        style={styles.imagePickerButton}
                        onPress={() => {
                          // For React Native, you would use ImagePicker or similar
                          Alert.alert('Image Picker', 'Image picker functionality would be implemented here');
                        }}
                      >
                        <Ionicons name="camera" size={20} color="#666" />
                        <Text style={styles.imagePickerText}>
                          {workProofImage ? 'Image Selected' : 'Select Proof Image'}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.confirmWorkButton, { opacity: completingWork || !workProofImage ? 0.5 : 1 }]}
                        onPress={handleCompleteWork}
                        disabled={completingWork || !workProofImage}
                      >
                        <Text style={styles.confirmWorkButtonText}>
                          {completingWork ? 'Completing...' : 'Confirm Work Done'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </View>
            )}

            <FlatList
              ref={messagesEndRef}
              data={messages}
              keyExtractor={(item) => item.id || item._id}
              renderItem={renderMessage}
              style={styles.messagesContainer}
              showsVerticalScrollIndicator={false}
              onContentSizeChange={scrollToBottom}
            />

            {typingUsers.size > 0 && (
              <View style={styles.typingIndicator}>
                <Text style={styles.typingText}>Someone is typing...</Text>
              </View>
            )}

            <View style={styles.messageInput}>
              <TextInput
                style={styles.messageInputField}
                value={newMessage}
                onChangeText={(text) => {
                  setNewMessage(text);
                  handleTyping();
                }}
                placeholder="Type a message..."
                multiline
              />
              <TouchableOpacity
                style={[styles.sendButton, { opacity: newMessage.trim() ? 1 : 0.5 }]}
                onPress={sendMessage}
                disabled={!newMessage.trim()}
              >
                <Ionicons name="send" size={20} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
        ) : view === 'help-topics' ? (
          <View style={styles.helpTopicsView}>
            <FlatList
              data={helpCategories}
              keyExtractor={(item) => item[0]}
              renderItem={({ item: [category, topics] }) => (
                <View style={styles.categorySection}>
                  <Text style={styles.categoryTitle}>{category}</Text>
                  {topics.map((topic) => (
                    <TouchableOpacity
                      key={topic.id}
                      style={styles.helpTopicItem}
                      onPress={() => {
                        setSelectedHelpTopic(topic);
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
                      <Text style={styles.helpTopicTitle}>{topic.title}</Text>
                      <Text style={styles.helpTopicDesc}>{topic.description}</Text>
                      <Ionicons name="chevron-forward" size={16} color="#999" />
                    </TouchableOpacity>
                  ))}
                </View>
              )}
              showsVerticalScrollIndicator={false}
            />
          </View>
        ) : (
          // Help view
          <View style={styles.chatView}>
            <FlatList
              ref={messagesEndRef}
              data={supportMessages}
              keyExtractor={(item, index) => item.timestamp?.toString() || index.toString()}
              renderItem={renderSupportMessage}
              style={styles.messagesContainer}
              showsVerticalScrollIndicator={false}
            />

            {supportMessages.length === 0 && !supportLoading && (
              <View style={styles.messageWrapper}>
                <View style={[styles.messageContainer, styles.otherContainer]}>
                  <View style={[styles.messageBubble, styles.otherBubble]}>
                    <Text style={styles.otherText}>
                      Welcome to Help Center! How can we assist you today?
                    </Text>
                    <View style={styles.quickActions}>
                      <TouchableOpacity
                        style={styles.quickActionButton}
                        onPress={() => handleSupportOption('password')}
                      >
                        <Text style={styles.quickActionText}>Password Reset</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.quickActionButton}
                        onPress={() => handleSupportOption('booking')}
                      >
                        <Text style={styles.quickActionText}>Booking Help</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.quickActionButton}
                        onPress={() => handleSupportOption('account')}
                      >
                        <Text style={styles.quickActionText}>Account Issues</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.quickActionButton}
                        onPress={() => handleSupportOption('technical')}
                      >
                        <Text style={styles.quickActionText}>Technical Issues</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.quickActionButton}
                        onPress={() => handleSupportOption('other')}
                      >
                        <Text style={styles.quickActionText}>Other</Text>
                      </TouchableOpacity>
                    </View>
                    <TouchableOpacity
                      style={styles.browseTopicsButton}
                      onPress={() => setView('help-topics')}
                    >
                      <Ionicons name="list-outline" size={16} color="#c20884" />
                      <Text style={styles.browseTopicsText}>Browse Help Topics</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            )}

            {supportMessages.length > 0 && supportMessages[supportMessages.length - 1].sender === 'support' && !supportLoading && (
              <View style={styles.messageWrapper}>
                <View style={[styles.messageContainer, styles.otherContainer]}>
                  <View style={[styles.messageBubble, styles.otherBubble]}>
                    <Text style={styles.otherText}>
                      Is there anything else I can help you with?
                    </Text>
                    <View style={styles.quickActions}>
                      <TouchableOpacity
                        style={styles.quickActionButton}
                        onPress={() => handleSupportOption('password')}
                      >
                        <Text style={styles.quickActionText}>Password Reset</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.quickActionButton}
                        onPress={() => handleSupportOption('booking')}
                      >
                        <Text style={styles.quickActionText}>Booking Help</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.quickActionButton}
                        onPress={() => handleSupportOption('account')}
                      >
                        <Text style={styles.quickActionText}>Account Issues</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.quickActionButton}
                        onPress={() => handleSupportOption('technical')}
                      >
                        <Text style={styles.quickActionText}>Technical Issues</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.quickActionButton}
                        onPress={() => handleSupportOption('other')}
                      >
                        <Text style={styles.quickActionText}>Other</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              </View>
            )}

            {supportLoading && (
              <View style={styles.typingIndicator}>
                <Text style={styles.typingText}>Support is typing...</Text>
              </View>
            )}

            <View style={styles.messageInput}>
              <TextInput
                style={styles.messageInputField}
                value={supportMessage}
                onChangeText={setSupportMessage}
                placeholder="Type your message to support..."
                onSubmitEditing={sendSupportMessage}
              />
              <TouchableOpacity
                style={[styles.sendButton, { opacity: supportMessage.trim() ? 1 : 0.5 }]}
                onPress={sendSupportMessage}
                disabled={!supportMessage.trim() || supportLoading}
              >
                <Text style={styles.sendButtonText}>📤</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9F9F9" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  backButton: { padding: 5 },
  headerTitle: { fontSize: 18, fontWeight: "700", color: "#333" },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 15,
  },
  helpHeaderButton: { padding: 5 },
  statusIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  body: { flex: 1 },

  // Chat List Styles
  chatList: { flex: 1 },
  chatListItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 15,
    marginHorizontal: 10,
    marginVertical: 5,
    borderRadius: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  chatListImage: { width: 50, height: 50, borderRadius: 25, marginRight: 12 },
  chatListContent: { flex: 1 },
  chatListHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  chatListName: { fontSize: 16, fontWeight: "600", color: "#333" },
  chatListTime: { fontSize: 12, color: "#999" },
  chatListMessageRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  chatListService: { fontSize: 12, color: "#c20884", fontWeight: "500" },
  chatListMessage: { fontSize: 14, color: "#666", flex: 1 },
  messageSender: { fontWeight: "600" },
  noMessages: { fontSize: 14, color: "#999", fontStyle: "italic" },

  // Chat View Styles
  chatView: { flex: 1 },
  messagesContainer: { flex: 1, padding: 10 },
  messageWrapper: {
    marginVertical: 4,
    paddingHorizontal: 10,
  },
  ownMessage: { alignItems: "flex-end" },
  otherMessage: { alignItems: "flex-start" },
  messageTimestamp: {
    fontSize: 10,
    color: "#999",
    marginBottom: 2,
  },
  messageContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    maxWidth: "80%",
  },
  ownContainer: { justifyContent: "flex-end" },
  otherContainer: { justifyContent: "flex-start" },
  messageAvatar: { width: 30, height: 30, borderRadius: 15, marginRight: 8 },
  messageBubble: {
    borderRadius: 18,
    paddingVertical: 10,
    paddingHorizontal: 15,
    maxWidth: "100%",
  },
  ownBubble: { backgroundColor: "#c20884", marginLeft: 40 },
  otherBubble: { backgroundColor: "#EAEAEA", marginRight: 40 },
  messageText: { fontSize: 15 },
  ownText: { color: "#fff" },
  otherText: { color: "#000" },
  messageStatus: {
    fontSize: 12,
    color: "#999",
    marginLeft: 5,
    marginBottom: 5,
  },

  // Message Input
  messageInput: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  messageInputField: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 8,
    fontSize: 14,
    maxHeight: 80,
  },
  sendButton: {
    backgroundColor: "#c20884",
    borderRadius: 20,
    padding: 10,
    marginLeft: 10,
  },
  sendButtonText: { color: "#fff", fontSize: 16 },

  // Support Options
  supportOptions: {
    flex: 1,
    justifyContent: "center",
    padding: 20,
  },
  supportTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    textAlign: "center",
    marginBottom: 20,
  },
  supportOption: {
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  supportOptionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 5,
  },
  supportOptionDesc: {
    fontSize: 14,
    color: "#666",
  },

  // Typing Indicator
  typingIndicator: {
    padding: 10,
    alignItems: "center",
  },
  typingText: {
    fontSize: 12,
    color: "#999",
    fontStyle: "italic",
  },

  // Unread Badge
  unreadBadge: {
    backgroundColor: "#c20884",
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 10,
  },
  unreadText: { color: "#fff", fontSize: 12, fontWeight: "600" },

  // Empty State
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  emptyText: { fontSize: 18, fontWeight: "600", color: "#666", marginTop: 16 },
  helpButton: {
    backgroundColor: "#c20884",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    marginTop: 20,
  },
  helpButtonText: { color: "#fff", fontSize: 14, fontWeight: "600" },

  // Quick Actions
  quickActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 10,
  },
  quickActionButton: {
    backgroundColor: "#667eea",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 4,
    marginBottom: 4,
  },
  quickActionText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "500",
  },

  // Help Topics View
  helpTopicsView: { flex: 1, padding: 10 },
  categorySection: { marginBottom: 20 },
  categoryTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#333",
    marginBottom: 10,
    paddingHorizontal: 10,
  },
  helpTopicItem: {
    backgroundColor: "#fff",
    padding: 15,
    marginHorizontal: 10,
    marginVertical: 5,
    borderRadius: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 3,
    flexDirection: "row",
    alignItems: "center",
  },
  helpTopicTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    flex: 1,
  },
  helpTopicDesc: {
    fontSize: 14,
    color: "#666",
    flex: 1,
    marginTop: 2,
  },

  // Browse Topics Button
  browseTopicsButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f8f9fa",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginTop: 15,
    borderWidth: 1,
    borderColor: "#e9ecef",
  },
  browseTopicsText: {
    color: "#c20884",
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 8,
  },

  // Request Details Section
  requestDetailsSection: {
    backgroundColor: "#fff",
    padding: 15,
    marginHorizontal: 10,
    marginVertical: 10,
    borderRadius: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  requestDetailsTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#333",
    marginBottom: 15,
  },
  requestInfo: {
    marginBottom: 15,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666",
    flex: 1,
  },
  detailValue: {
    fontSize: 14,
    color: "#333",
    flex: 2,
    textAlign: "right",
  },

  // Work Confirmation Section
  workConfirmationSection: {
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
    paddingTop: 15,
  },
  workConfirmationTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 10,
  },
  workConfirmationForm: {
    gap: 10,
  },
  imagePickerButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f8f9fa",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e9ecef",
  },
  imagePickerText: {
    fontSize: 14,
    color: "#666",
    marginLeft: 8,
  },
  confirmWorkButton: {
    backgroundColor: "#10b981",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: "center",
  },
  confirmWorkButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },

  // Loading and Error
  loadingText: { textAlign: "center", fontSize: 16, color: "#666", marginTop: 50 },
  errorText: { textAlign: "center", fontSize: 16, color: "#E53935", marginTop: 50 },
});
