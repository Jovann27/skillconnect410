import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMainContext } from '../mainContext';
import api from '../api';
import socket from '../utils/socket';
import { FaFacebookMessenger } from 'react-icons/fa';
import { BsThreeDotsVertical } from 'react-icons/bs';
import { MdClose } from 'react-icons/md';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

// Helper function to sort chat list by last message timestamp
const sortChatList = (list) => {
  return list.sort((a, b) => {
    const aTime = a.lastMessage ? new Date(a.lastMessage.timestamp) : new Date(0);
    const bTime = b.lastMessage ? new Date(b.lastMessage.timestamp) : new Date(0);
    return bTime - aTime;
  });
};

const ChatIcon = () => {
  const navigate = useNavigate();
  const { isAuthorized, tokenType, user, admin, openChatAppointmentId, setOpenChatAppointmentId } = useMainContext();
  const [isOpen, setIsOpen] = useState(false);
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

  const [helpCategories, setHelpCategories] = useState([]);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // Tailwind CSS classes defined as constants for better organization
  const chatIconClasses = {
    chatIcon: "relative w-10 h-10 flex items-center justify-center p-[3px_2px_0_2px] cursor-pointer rounded-full transition-all duration-300 mr-2.5 text-white text-xl hover:scale-110 hover:bg-gray-200 hover:text-gray-900 shadow-2xl",
    chatBadge: "absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold",
    chatPanel: "fixed top-[70px] right-0 w-[520px] h-[616px] bg-pink-100 shadow-2xl flex flex-col z-[1001] overflow-hidden",
    chatHeader: "bg-gradient-to-br from-pink-500 to-pink-600 text-white p-3 flex justify-between items-center gap-2.5 border-b border-white/10",
    backButton: "bg-none border-none text-white text-xl cursor-pointer p-1 flex items-center justify-center transition-all duration-200 hover:scale-115",
    headerTitleSection: "flex-1 text-center",
    chatHeaderTitle: "m-0 text-base font-semibold",
    chatHeaderActions: "flex items-center gap-2",
    statusBadge: "text-xs py-1 px-2.5 rounded-xl bg-orange-500 font-semibold capitalize text-white",
    statusBadgeAvailable: "bg-green-500",
    statusBadgeWorking: "bg-orange-500",
    statusBadgeComplete: "bg-blue-500",
    statusBadgeCancelled: "bg-red-500",
    userMenuBtn: "bg-none border-none text-white cursor-pointer p-1.5 rounded hover:bg-white/15 transition-all duration-200 hover:scale-105 flex items-center justify-center text-lg",
    headerActions: "flex items-center gap-2.5",
    helpHeaderBtn: "border-none text-white cursor-pointer p-2 rounded-full w-9 h-9 flex items-center justify-center transition-all duration-200 bg-white/10 hover:scale-110 hover:bg-white/20",
    closeHeaderBtn: "border-none text-white cursor-pointer p-2 font-semibold rounded-full w-9 h-9 flex items-center justify-center transition-all duration-200 bg-white/10 hover:scale-110 hover:bg-white/20",
    userMenuDropdown: "absolute top-[65px] right-0 bg-white rounded-lg shadow-xl border border-gray-200 z-[1002] min-w-[180px] overflow-hidden",
    userMenuItem: "w-full p-3 bg-none border-none text-left cursor-pointer text-sm font-medium text-gray-700 transition-colors duration-200 border-b border-gray-100 hover:bg-gray-50 hover:text-gray-900",
    userMenuItemLast: "w-full p-3 bg-none border-none text-left cursor-pointer text-sm font-medium text-gray-700 transition-colors duration-200 hover:bg-gray-50 hover:text-gray-900",
    messagesContainer: "flex-1 flex flex-col overflow-hidden",
    loadingText: "flex items-center justify-center gap-3 p-5",
    errorText: "flex flex-col items-center gap-2 p-5",
    chatList: "flex flex-col gap-3 p-3.5 overflow-y-auto h-full",
    chatItem: "p-3.5 border border-gray-300 rounded-xl cursor-pointer transition-all duration-300 bg-gray-50 relative hover:bg-gray-100 hover:border-blue-500 hover:-translate-y-0.5 hover:shadow-lg",
    chatItemHeader: "flex justify-between items-center mb-2",
    chatItemHeaderH4: "m-0 text-base font-semibold text-gray-800",
    chatItemHeaderSmall: "text-sm text-gray-600",
    chatItemContent: "mb-1.5",
    serviceName: "text-sm text-blue-600 font-medium m-0 mb-1.5",
    lastMessage: "text-base text-gray-600 m-0 overflow-hidden text-ellipsis whitespace-nowrap",
    noMessages: "text-base text-gray-500 italic m-0",
    unreadBadge: "absolute top-2.5 right-2.5 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold",
    chatMessages: "flex-1 flex flex-col h-full",
    messagesContainerInner: "flex-1 overflow-y-auto flex flex-col bg-pink-100/30",
    error: "text-red-400 text-center p-2.5 bg-gray-800 rounded-lg m-3.5 text-sm border border-red-500",
    messageWrapper: "flex flex-col items-start",
    messageWrapperOwn: "items-end",
    messageTimestamp: "text-xs text-gray-500 mb-1.5 text-right mr-2",
    message: "flex items-end max-w-[75%] animate-[messageSlideIn_0.3s_ease-out]",
    messageOwn: "flex-row-reverse",
    messageOther: "flex-row",
    messageAvatar: "w-8 h-8 rounded-full mx-2 object-cover border-2 border-gray-200",
    messageContent: "p-2.5 pr-3.5 rounded-[18px] max-w-[220px] break-words relative text-sm leading-5",
    messageContentOwn: "bg-gradient-to-br from-blue-500 to-blue-700 text-white rounded-br",
    messageContentOther: "bg-white text-black rounded-bl",
    messageStatus: "absolute -bottom-0.5 -right-0.5 text-sm text-gray-400",
    typingIndicator: "p-2 pr-3 rounded-[18px] bg-gray-300 self-start italic text-gray-600 text-base rounded-bl",
    messageInputSection: "flex items-center gap-2.5 p-3 border-t border-black/10 bg-gradient-to-br from-pink-500 to-pink-600",
    messageInput: "flex-1 p-3 pr-4 border border-gray-900 rounded-3xl outline-none text-sm bg-gray-100 text-black transition-all duration-200 font-inherit focus:border-pink-400 focus:bg-white focus:shadow-[0_0_0_3px_rgba(56,48,53,0.5)] placeholder:text-gray-500",
    sendButton: "bg-gradient-to-br from-pink-600 to-pink-700 text-white border-none rounded-full w-[42px] h-[42px] cursor-pointer text-base transition-all duration-200 flex items-center justify-center flex-shrink-0 shadow-lg hover:scale-105 hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed",
    helpTopicsView: "flex-1 p-3.5 overflow-y-auto bg-pink-100/30",
    categorySection: "mb-6",
    categoryTitle: "text-lg font-bold text-gray-800 mb-3.5 pb-2 border-b-2 border-blue-600",
    helpTopicItem: "bg-white p-3.5 mb-2.5 rounded-xl cursor-pointer transition-all duration-300 border border-gray-300 flex items-center justify-between hover:bg-gray-50 hover:border-blue-500 hover:-translate-y-0.5 hover:shadow-lg",
    helpTopicContent: "flex-1",
    helpTopicTitle: "text-base font-semibold text-gray-800 m-0 mb-1",
    helpTopicDesc: "text-sm text-gray-600 m-0 leading-5",
    helpTopicArrow: "text-lg text-gray-500 font-bold",
    quickActions: "flex flex-wrap gap-2 mt-2.5",
    quickActionButton: "bg-blue-600 text-white border-none py-2 px-3 rounded cursor-pointer text-sm font-medium transition-colors duration-200 hover:bg-blue-700",
    browseTopicsButton: "flex items-center justify-center bg-gray-50 p-3 rounded-lg mt-3.5 border border-gray-200 cursor-pointer transition-all duration-200 hover:bg-gray-100 hover:border-blue-500",
    browseTopicsText: "text-pink-700 text-sm font-semibold ml-2",
    messageInputSupport: "flex items-center gap-2.5 p-2.5 pr-3.5 border-t border-gray-800 bg-pink-200/70",
    messageInputSupportInput: "flex-1 p-2.5 pr-3.5 border border-gray-600 rounded-2xl outline-none text-sm bg-gray-300 text-black transition-colors duration-200 focus:border-black placeholder:text-gray-700",
    sendBtn: "bg-blue-500 text-white border-none rounded-full w-10 h-10 cursor-pointer text-base transition-all duration-200 flex items-center justify-center hover:bg-blue-700 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
  };

  // Functions used in useEffect

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  const fetchChatList = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get('/user/chat-list');
      const rawChatList = data.chatList || [];

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
  }, []);

  const markMessagesAsSeen = useCallback(async (appointmentId) => {
    try {
      await api.put(`/user/chat/${appointmentId}/mark-seen`);
      setUnreadCounts(prev => ({ ...prev, [appointmentId]: 0 }));
    } catch (err) {
      console.error('Error marking messages as seen:', err);
    }
  }, []);

  // Socket event listeners

  useEffect(() => {
    if (!isAuthorized || tokenType !== 'user' || !user) return;

    fetchChatList();

    // Socket event listeners
    const handleNewMessage = (message) => {
      if (selectedChat && message.appointment.toString() === selectedChat.appointmentId.toString()) {
        setMessages(prev => [...prev, message]);
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

    const handleMessageNotification = (data) => {
      // Show browser notification if chat is not open
      if (!isOpen || (selectedChat && selectedChat.appointmentId !== data.appointmentId)) {
        if (Notification.permission === 'granted') {
          new Notification(`New message from ${data.from}`, {
            body: data.message.message,
            icon: '/skillconnect.png'
          });
        }
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
    socket.on('message-notification', handleMessageNotification);
    socket.on('error', handleError);

    // Request notification permission
    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }

    return () => {
      socket.off('new-message', handleNewMessage);
      socket.off('chat-history', handleChatHistory);
      socket.off('user-typing', handleUserTyping);
      socket.off('user-stopped-typing', handleUserStoppedTyping);
      socket.off('message-notification', handleMessageNotification);
      socket.off('error', handleError);
    };
  }, [selectedChat, user, isOpen, isAuthorized, tokenType, fetchChatList, markMessagesAsSeen, scrollToBottom]);

  useEffect(() => {
    if (!isAuthorized || tokenType !== 'user' || !user) return;
    scrollToBottom();
  }, [messages, isAuthorized, tokenType, user, scrollToBottom]);

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
      // Fetch chat history and filter for this appointment
      const response = await api.get('/user/chat-history');
      const appointmentChat = response.data.chatHistory?.find(
        chat => chat.appointmentId.toString() === appointmentId.toString()
      );
      const chatMessages = appointmentChat?.messages || [];
      setMessages(chatMessages);
      // Mark messages as seen
      if (chatMessages.length > 0) {
        await api.put(`/user/chat/${appointmentId}/mark-seen`);
      }
      scrollToBottom();

      // Join socket room
      socket.emit('join-chat', appointmentId);
    } catch (err) {
      console.error('Error fetching chat history:', err);
      setError('Failed to load chat history');
    }
  }, [scrollToBottom]);

  const openChat = useCallback(async (chat, specificAppointmentId = null) => {
    const appointmentId = specificAppointmentId || chat.appointmentId;
    let selectedChatData = { ...chat, appointmentId };

    // Fetch latest booking details to ensure accurate status
    if (appointmentId) {
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
    fetchMessages(appointmentId);
  }, [user, fetchMessages]);

  // Effect to handle opening chat from external trigger
  useEffect(() => {
    if (openChatAppointmentId && chatList.length > 0) {
      // Find the chat with the appointmentId
      const chatToOpen = chatList.find(chat =>
        chat.appointments.includes(openChatAppointmentId)
      );

      if (chatToOpen) {
        setIsOpen(true);
        openChat(chatToOpen, openChatAppointmentId);
        setOpenChatAppointmentId(null); // Reset
      } else {
        // If chat not found, try to fetch booking details and create chat object
        fetchBookingDetails(openChatAppointmentId).then(booking => {
          if (booking) {
            const isProvider = user?.role === 'Service Provider';
            const otherUser = isProvider ? booking.requester : booking.provider;
            const chatData = {
              otherUser,
              serviceRequest: booking.serviceRequest,
              status: booking.status,
              canComplete: booking.provider.toString() === user._id.toString() && booking.status === 'Working',
              appointments: [openChatAppointmentId],
              appointmentId: openChatAppointmentId,
              totalUnreadCount: 0,
              lastMessage: null
            };
            setIsOpen(true);
            openChat(chatData, openChatAppointmentId);
          } else {
            console.warn('Appointment not found:', openChatAppointmentId);
          }
          setOpenChatAppointmentId(null); // Reset
        }).catch(err => {
          console.error('Error fetching booking:', err);
          setOpenChatAppointmentId(null);
        });
      }
    }
  }, [openChatAppointmentId, chatList, user, openChat, setOpenChatAppointmentId]);

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



  // Only show for authenticated users (both regular users and admins)
  if (!isAuthorized || (!user && !admin)) {
    return null;
  }

  // Remaining functions

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedChat) return;

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
      await api.post('/user/send-message', {
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

  const getMessageStatusIcon = (status) => {
    switch (status) {
      case 'sent': return '✓';
      case 'delivered': return '✓✓';
      case 'seen': return '✓✓';
      default: return '';
    }
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



  // User menu handlers
  const handleReportUser = async () => {
    if (!selectedChat) return;
    const reason = prompt('Please provide a reason for reporting this user:');
    if (reason && reason.trim()) {
      try {
        const response = await api.post('/user/report-user', {
          reportedUserId: selectedChat.otherUser._id,
          reason: reason.trim(),
          appointmentId: selectedChat.appointmentId
        });

        if (response.data.success) {
          alert('User reported successfully. Our team will review your report.');
        }
      } catch (err) {
        console.error('Error reporting user:', err);
        const errorMessage = err.response?.data?.message || 'Failed to report user. Please try again.';
        alert(errorMessage);
      }
    }
  };

  const handleBlockUser = async () => {
    if (!selectedChat) return;
    const confirmBlock = window.confirm(`Are you sure you want to block ${selectedChat.otherUser.firstName} ${selectedChat.otherUser.lastName}? You won't be able to send or receive messages from this user.`);
    if (confirmBlock) {
      try {
        const response = await api.post('/user/block-user', {
          targetUserId: selectedChat.otherUser._id
        });

        if (response.data.success) {
          alert(`User ${selectedChat.otherUser.firstName} ${selectedChat.otherUser.lastName} has been blocked.`);
          // Close the chat and remove from chat list
          backToList();
        }
      } catch (err) {
        console.error('Error blocking user:', err);
        const errorMessage = err.response?.data?.message || 'Failed to block user. Please try again.';
        alert(errorMessage);
      }
    }
  };

  const handleRateUser = async () => {
    if (!selectedChat) return;
    const rating = prompt('Rate this user (1-5 stars):', '5');
    const ratingNum = parseInt(rating);
    if (ratingNum >= 1 && ratingNum <= 5) {
      const comment = prompt('Add a comment (optional):');
      try {
        const response = await api.post('/review', {
          bookingId: selectedChat.appointmentId,
          rating: ratingNum,
          comments: comment || ''
        });

        if (response.data.success) {
          alert(`Thank you for rating ${selectedChat.otherUser.firstName} ${selectedChat.otherUser.lastName} with ${ratingNum} stars!`);
        }
      } catch (err) {
        console.error('Error rating user:', err);
        const errorMessage = err.response?.data?.message || 'Failed to submit rating. Please try again.';
        alert(errorMessage);
      }
    } else if (rating !== null) {
      alert('Please enter a rating between 1 and 5.');
    }
  };

  const totalUnreadCount = Object.values(unreadCounts).reduce((sum, count) => sum + count, 0);

  return (
    <>
      {/* Chat Icon */}
      <button
        className={chatIconClasses.chatIcon}
        onClick={toggleChat}
      >
        <FaFacebookMessenger size={24} />
        {totalUnreadCount > 0 && (
          <span className={chatIconClasses.chatBadge}>{totalUnreadCount}</span>
        )}
      </button>

      {/* Chat Panel */}
      {isOpen && (
        <div className={chatIconClasses.chatPanel}>
          <div className={chatIconClasses.chatHeader}>
            {view === 'chat' ? (
              <>
                <button className={chatIconClasses.backButton} onClick={backToList}>
                  <i className="fas fa-chevron-left"></i>
                </button>
                <div className={chatIconClasses.headerTitleSection}>
                  <h2 className={chatIconClasses.chatHeaderTitle}>
                    {selectedChat?.otherUser?.firstName} {selectedChat?.otherUser?.lastName}
                  </h2>
                </div>
                <div className={chatIconClasses.chatHeaderActions}>
                  <button
                    className={`${chatIconClasses.statusBadge} ${chatIconClasses[`statusBadge${selectedChat?.status?.toLowerCase() === 'available' ? 'Available' : selectedChat?.status?.toLowerCase() === 'working' ? 'Working' : selectedChat?.status?.toLowerCase() === 'complete' ? 'Complete' : selectedChat?.status?.toLowerCase() === 'cancelled' ? 'Cancelled' : ''}`]}`}
                    onClick={() => {
                      if (selectedChat?.serviceRequest) {
                        const isProvider = selectedChat.serviceRequest.provider._id === user._id;
                        if (isProvider) {
                          navigate('/user/client-accepted', { state: { requestId: selectedChat.appointmentId } });
                        } else {
                          navigate('/user/waiting-for-worker');
                        }
                      }
                    }}
                    title="View Request Details"
                  >
                    {selectedChat?.status}
                  </button>
                  <button
                    className={chatIconClasses.userMenuBtn}
                    onClick={() => setShowUserMenu(!showUserMenu)}
                    title="User options"
                  >
                    <BsThreeDotsVertical size={20} />
                  </button>
                </div>
              </>
            ) : view === 'help' ? (
              <>
                <button className={chatIconClasses.backButton} onClick={() => setView('list')}><i className="fas fa-chevron-left"></i></button>
                <h2>Help Center</h2>
              </>
            ) : view === 'help-topics' ? (
              <>
                <button className={chatIconClasses.backButton} onClick={() => setView('help')}><i className="fas fa-chevron-left"></i></button>
                <h2>Help Topics</h2>
              </>
            ) : (
              <>
                <h2>Messages</h2>
                <div className={chatIconClasses.headerActions}>
                  <button className={chatIconClasses.helpHeaderBtn} onClick={() => setView('help')} title="Help">
                    ?
                  </button>
                  <button className={chatIconClasses.closeHeaderBtn} onClick={toggleChat}><MdClose size={20} /></button>
                </div>
              </>
            )}
          </div>

          {/* User Menu Dropdown */}
          {showUserMenu && selectedChat && (
            <div className={chatIconClasses.userMenuDropdown}>
              <button
                className={chatIconClasses.userMenuItem}
                onClick={() => {
                  setShowUserMenu(false);
                  handleReportUser();
                }}
              >
                🚨 Report User
              </button>
              <button
                className={chatIconClasses.userMenuItem}
                onClick={() => {
                  setShowUserMenu(false);
                  handleBlockUser();
                }}
              >
                🚫 Block User
              </button>
              {user?.role !== 'Service Provider' && (
                <button
                  className={chatIconClasses.userMenuItemLast}
                  onClick={() => {
                    setShowUserMenu(false);
                    handleRateUser();
                  }}
                >
                  ⭐ Rate User
                </button>
              )}
            </div>
          )}

          <div className={chatIconClasses.messagesContainer}>
            {view === 'list' ? (
              loading ? (
                <div className={chatIconClasses.loadingText}>
                  <div className="w-5 h-5 border-2 border-pink-700 border-t-transparent rounded-full animate-spin"></div>
                  Loading conversations...
                </div>
              ) : error ? (
                <div className={chatIconClasses.errorText}>
                  <span className="text-2xl">⚠️</span>
                  {error}
                </div>
              ) : (
                <div className={chatIconClasses.chatList}>
                  <div className={chatIconClasses.chatItem} onClick={() => setView('help')}>
                    <div className={chatIconClasses.chatItemHeader}>
                      <h4 className={chatIconClasses.chatItemHeaderH4}>Help Center</h4>
                      <small className={chatIconClasses.chatItemHeaderSmall}>Support</small>
                    </div>
                    <p className={chatIconClasses.lastMessage}>Get help with your questions</p>
                  </div>
                  {tokenType === 'user' && chatList.map((chat) => (
                    <div
                      key={chat.appointmentId}
                      className={chatIconClasses.chatItem}
                      onClick={() => openChat(chat)}
                    >
                      <div className={chatIconClasses.chatItemHeader}>
                        <h4 className={chatIconClasses.chatItemHeaderH4}>
                          {chat.otherUser?.firstName} {chat.otherUser?.lastName}
                        </h4>
                        {chat.lastMessage && (
                          <small className={chatIconClasses.chatItemHeaderSmall}>{formatTime(chat.lastMessage.timestamp)}</small>
                        )}
                      </div>
                      <div className={chatIconClasses.chatItemContent}>
                        <p className={chatIconClasses.serviceName}>{chat.serviceRequest?.name}</p>
                        {chat.lastMessage ? (
                          <p className={chatIconClasses.lastMessage}>
                            <strong>{chat.lastMessage.sender?.firstName}:</strong> {chat.lastMessage.message}
                          </p>
                        ) : (
                          <p className={chatIconClasses.noMessages}>No messages yet</p>
                        )}
                      </div>
                      {unreadCounts[chat.appointmentId] > 0 && (
                        <span className={chatIconClasses.unreadBadge}>{unreadCounts[chat.appointmentId]}</span>
                      )}
                    </div>
                  ))}
                </div>
              )
            ) : view === 'chat' ? (
              <div className={chatIconClasses.chatMessages}>
                  {error && <p className={chatIconClasses.error}>{error}</p>}

                  <div className={chatIconClasses.messagesContainerInner}>
                  {messages.map((msg) => (
                    <div
                      key={msg.id || msg._id}
                      className={`${chatIconClasses.messageWrapper} ${msg.sender._id === user._id ? chatIconClasses.messageWrapperOwn : ''}`}
                    >
                      <div className={chatIconClasses.messageTimestamp}>
                        <small>{formatTime(msg.timestamp)}</small>
                      </div>
                      <div className={`${chatIconClasses.message} ${msg.sender._id === user._id ? chatIconClasses.messageOwn : chatIconClasses.messageOther}`}>
                        {msg.sender._id !== user._id && (
                          <img
                            src={getProfileImageUrl(msg.sender.profilePic)}
                            alt={`${msg.sender.firstName} ${msg.sender.lastName}`}
                            className={chatIconClasses.messageAvatar}
                            onError={(e) => {
                              e.target.src = '/default-profile.png';
                            }}
                          />
                        )}
                        <div className={`${chatIconClasses.messageContent} ${msg.sender._id === user._id ? chatIconClasses.messageContentOwn : chatIconClasses.messageContentOther}`}>
                          <span>{msg.message}</span>
                        </div>
                        {msg.sender._id === user._id && (
                          <span className={`${chatIconClasses.messageStatus} text-${msg.status === 'seen' ? 'green' : 'gray'}-400`}>
                            {getMessageStatusIcon(msg.status)}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}

                  {typingUsers.size > 0 && (
                    <div className={chatIconClasses.typingIndicator}>
                      <span>Someone is typing...</span>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>

                <div className={chatIconClasses.messageInputSection}>
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => {
                      setNewMessage(e.target.value);
                      handleTyping();
                    }}
                    onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                    placeholder="Type a message..."
                    disabled={loading}
                    className={chatIconClasses.messageInput}
                  />
                  <button
                    className={chatIconClasses.sendButton}
                    onClick={sendMessage}
                    disabled={!newMessage.trim() || loading}
                    title="Send message"
                  >
                    <i className="fas fa-paper-plane"></i>
                  </button>
                </div>
              </div>
            ) : view === 'help-topics' ? (
              <div className={chatIconClasses.helpTopicsView}>
                {helpCategories.map(([category, topics]) => (
                  <div key={category} className={chatIconClasses.categorySection}>
                    <h4 className={chatIconClasses.categoryTitle}>{category}</h4>
                    {topics.map((topic) => (
                      <div
                        key={topic.id}
                        className={chatIconClasses.helpTopicItem}
                        onClick={() => {
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
                        <div className={chatIconClasses.helpTopicContent}>
                          <h5 className={chatIconClasses.helpTopicTitle}>{topic.title}</h5>
                          <p className={chatIconClasses.helpTopicDesc}>{topic.description}</p>
                        </div>
                        <span className={chatIconClasses.helpTopicArrow}>›</span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            ) : (
              <div className={chatIconClasses.chatMessages}>
                <div className={chatIconClasses.messagesContainerInner}>
                  {supportMessages.map((msg, index) => (
                    <div key={index} className={`${chatIconClasses.messageWrapper} ${msg.sender === 'user' ? chatIconClasses.messageWrapperOwn : ''}`}>
                      <div className={`${chatIconClasses.message} ${msg.sender === 'user' ? chatIconClasses.messageOwn : chatIconClasses.messageOther}`}>
                        <div className={`${chatIconClasses.messageContent} ${msg.sender === 'user' ? chatIconClasses.messageContentOwn : chatIconClasses.messageContentOther}`}>
                          <span>{msg.message}</span>
                        </div>
                      </div>
                    </div>
                  ))}

                  {supportLoading && (
                    <div className={chatIconClasses.typingIndicator}>
                      <span>Support is typing...</span>
                    </div>
                  )}

                  {supportMessages.length === 0 && !supportLoading && (
                    <div className={`${chatIconClasses.messageWrapper}`}>
                      <div className={`${chatIconClasses.message} ${chatIconClasses.messageOther}`}>
                        <div className={chatIconClasses.messageContentOther}>
                          <span>Welcome to Help Center! How can we assist you today?</span>
                          <div className={chatIconClasses.quickActions}>
                            <button className={chatIconClasses.quickActionButton} onClick={() => handleSupportOption('password')}>Password Reset</button>
                            <button className={chatIconClasses.quickActionButton} onClick={() => handleSupportOption('booking')}>Booking Help</button>
                            <button className={chatIconClasses.quickActionButton} onClick={() => handleSupportOption('account')}>Account Issues</button>
                            <button className={chatIconClasses.quickActionButton} onClick={() => handleSupportOption('technical')}>Technical Issues</button>
                            <button className={chatIconClasses.quickActionButton} onClick={() => handleSupportOption('other')}>Other</button>
                          </div>
                          <div className={chatIconClasses.browseTopicsButton} onClick={() => setView('help-topics')}>
                            <span>📋</span>
                            <span className={chatIconClasses.browseTopicsText}>Browse Help Topics</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {supportMessages.length > 0 && supportMessages[supportMessages.length - 1].sender === 'support' && !supportLoading && (
                    <div className={`${chatIconClasses.messageWrapper}`}>
                      <div className={`${chatIconClasses.message} ${chatIconClasses.messageOther}`}>
                        <div className={chatIconClasses.messageContentOther}>
                          <span>Is there anything else I can help you with?</span>
                          <div className={chatIconClasses.quickActions}>
                            <button className={chatIconClasses.quickActionButton} onClick={() => handleSupportOption('password')}>Password Reset</button>
                            <button className={chatIconClasses.quickActionButton} onClick={() => handleSupportOption('booking')}>Booking Help</button>
                            <button className={chatIconClasses.quickActionButton} onClick={() => handleSupportOption('account')}>Account Issues</button>
                            <button className={chatIconClasses.quickActionButton} onClick={() => handleSupportOption('technical')}>Technical Issues</button>
                            <button className={chatIconClasses.quickActionButton} onClick={() => handleSupportOption('other')}>Other</button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>

                <div className={chatIconClasses.messageInputSupport}>
                  <input
                    type="text"
                    value={supportMessage}
                    onChange={(e) => setSupportMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && sendSupportMessage()}
                    placeholder="Type your message to support..."
                    disabled={supportLoading}
                    className={chatIconClasses.messageInputSupportInput}
                  />
                  <button
                    className={chatIconClasses.sendBtn}
                    onClick={sendSupportMessage}
                    disabled={!supportMessage.trim() || supportLoading}
                  >
                    📤
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default ChatIcon;
