import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import { MainProvider, useMainContext } from './contexts/MainContext';
import { View, ActivityIndicator, TouchableOpacity, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

// Auth Screens
import Login from './screens/Auth/Login';
import Register from './screens/Auth/Register';
import ForgotPassword from './screens/Auth/ForgotPassword';
import VerifyEmail from './screens/Auth/VerifyEmail';
import ResetPassword from './screens/Auth/ResetPassword';

// User Screens
import ProviderDashboard from './screens/ProviderDashboard';
import ClientDashboard from './screens/ClientDashboard';
import ManageProfile from './screens/ManageProfile';
import Settings from './screens/Settings';
import ServiceProviders from './screens/ServiceProviders';
import VerificationPending from './screens/VerificationPending';
import AccountBanned from './screens/AccountBanned';

// Import Home components
import Home from './components/Home/Home';

// Placeholder screens for drawer navigation
const PlaceOrder = () => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
    <Text>Place Order Screen - Coming Soon</Text>
  </View>
);

const Records = () => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
    <Text>My Records Screen - Coming Soon</Text>
  </View>
);

const Chat = () => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
    <Text>Chat Screen - Coming Soon</Text>
  </View>
);

const ProfileReviews = () => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
    <Text>Profile Reviews Screen - Coming Soon</Text>
  </View>
);

const Service = () => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
    <Text>My Service Screen - Coming Soon</Text>
  </View>
);

// Admin functionality removed for mobile - placeholder for AdminLogin
const AdminLogin = () => null;

// Components
import Loader from './components/Loader';
import NotificationListener from './components/NotificationListener';
import ChatIcon from './components/ChatIcon';
import CustomDrawer from './components/CustomDrawer';

// Layout Components
import { ErrorBoundary, PopupContext } from './screens/Layout';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Account status guard component (checks banned status first, then verification)
const AccountStatusGuard = ({ children }) => {
  const { user } = useMainContext();

  // Check if user is banned first
  if (user?.banned) {
    return <AccountBanned />;
  }

  // Check if user is verified
  if (!user?.verified) {
    return <VerificationPending />;
  }

  return children;
};

// User Dashboard component that renders appropriate dashboard based on role
const UserDashboard = () => {
  const { user } = useMainContext();
  const userRole = user?.role;

  // Service Providers get ProviderDashboard, Community Members redirect to browse-providers
  if (userRole === "Service Provider") {
    return (
      <AccountStatusGuard>
        <ProviderDashboard />
      </AccountStatusGuard>
    );
  } else {
    // Community Member or any other role redirects to browse-providers
    return (
      <AccountStatusGuard>
        <ClientDashboard />
      </AccountStatusGuard>
    );
  }
};

// User Tab Navigator
const UserTabNavigator = () => {
  const { user, isLoggedIn } = useMainContext();
  const userRole = user?.role;

  return (
    <CustomDrawer>
      {(toggleDrawer) => (
        <View style={{ flex: 1 }}>
          {/* Custom Header with Hamburger Menu */}
          {isLoggedIn && (
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingHorizontal: 20,
              paddingVertical: 15,
              backgroundColor: '#fff',
              borderBottomWidth: 1,
              borderBottomColor: '#eee',
              paddingTop: 50, // Account for status bar
            }}>
              <TouchableOpacity
                onPress={toggleDrawer}
                style={{
                  padding: 8,
                  marginRight: 15,
                }}
              >
                <Ionicons name="menu" size={24} color="#c20884" />
              </TouchableOpacity>
              <Text style={{
                fontSize: 20,
                fontWeight: 'bold',
                color: '#c20884',
              }}>
                SkillConnect
              </Text>
            </View>
          )}

          {/* Main Content Area */}
          <View style={{ flex: 1 }}>
            <Stack.Navigator screenOptions={{ headerShown: false }}>
              <Stack.Screen name="Dashboard" component={UserDashboard} />
              <Stack.Screen name="Profile" component={ManageProfile} />
              <Stack.Screen name="Settings" component={Settings} />
              <Stack.Screen name="PlaceOrder" component={PlaceOrder} />
              <Stack.Screen name="Records" component={Records} />
              <Stack.Screen name="Chat" component={Chat} />
              <Stack.Screen name="Workers" component={ServiceProviders} />
              <Stack.Screen name="ProfileReviews" component={ProfileReviews} />
              <Stack.Screen name="Service" component={Service} />
            </Stack.Navigator>
          </View>
        </View>
      )}
    </CustomDrawer>
  );
};

const AppContent = () => {
  const { isLoggedIn, loading, navigationLoading, user } = useMainContext();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (navigationLoading) {
    return <Loader />;
  }

  return (
    <Stack.Navigator
      screenOptions={{ headerShown: false }}
      initialRouteName="Home"
    >
      {/* Always available screens */}
      <Stack.Screen name="Home" component={Home} />
      <Stack.Screen name="BrowseServices" component={ServiceProviders} />
      <Stack.Screen name="Login" component={Login} />
      <Stack.Screen name="Register" component={Register} />
      <Stack.Screen name="AdminLogin" component={AdminLogin} />
      <Stack.Screen name="ForgotPassword" component={ForgotPassword} />
      <Stack.Screen name="VerifyEmail" component={VerifyEmail} />
      <Stack.Screen name="ResetPassword" component={ResetPassword} />

      {/* Authenticated user screens */}
      {isLoggedIn && (
        <Stack.Screen name="UserTabs" component={UserTabNavigator} />
      )}
    </Stack.Navigator>
  );
};

const App = () => (
  <ErrorBoundary>
    <NavigationContainer>
      <MainProvider>
        <PopupContext>
          <AppContent />
          <NotificationListener />
          <ChatIcon />
        </PopupContext>
      </MainProvider>
    </NavigationContainer>
  </ErrorBoundary>
);

export default App;
