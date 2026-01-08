import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { createStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { MainProvider, useMainContext } from './contexts/MainContext';
import { RoleGuard } from './components/RoleGuard';
import Loader from './components/Loader';
import CustomDrawer from './components/CustomDrawer';

// Import screens (we'll create these next)
import HomeScreen from './screens/HomeScreen';
import LoginScreen from './screens/LoginScreen';
import RegisterScreen from './screens/RegisterScreen';
import AdminLoginScreen from './screens/AdminLoginScreen';
import AdminDashboardScreen from './screens/AdminDashboardScreen';
import ProviderDashboardScreen from './screens/ProviderDashboardScreen';
import ClientDashboardScreen from './screens/ClientDashboardScreen';
import ManageProfileScreen from './screens/ManageProfileScreen';
import SettingsScreen from './screens/SettingsScreen';
import VerificationPendingScreen from './screens/VerificationPendingScreen';
import AccountBannedScreen from './screens/AccountBannedScreen';

// Create navigators
const Drawer = createDrawerNavigator();
const Stack = createStackNavigator();

// Main drawer navigator for authenticated users
const MainDrawerNavigator = () => {
  return (
    <Drawer.Navigator
      drawerContent={(props) => <CustomDrawer {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Drawer.Screen name="Home" component={HomeScreen} />
      <Drawer.Screen name="Dashboard" component={UserDashboardNavigator} />
      <Drawer.Screen name="Profile" component={ManageProfileScreen} />
      <Drawer.Screen name="Settings" component={SettingsScreen} />
    </Drawer.Navigator>
  );
};

// User dashboard navigator (nested stack)
const UserDashboardNavigator = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="UserDashboard" component={UserDashboardScreen} />
      <Stack.Screen name="ProviderDashboard" component={ProviderDashboardScreen} />
      <Stack.Screen name="ClientDashboard" component={ClientDashboardScreen} />
    </Stack.Navigator>
  );
};

// Admin stack navigator
const AdminStackNavigator = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="AdminDashboard" component={AdminDashboardScreen} />
    </Stack.Navigator>
  );
};

// Auth stack navigator
const AuthStackNavigator = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
      <Stack.Screen name="AdminLogin" component={AdminLoginScreen} />
    </Stack.Navigator>
  );
};

// User dashboard component that renders appropriate dashboard based on role
const UserDashboardScreen = ({ navigation }) => {
  const { user } = useMainContext();
  const userRole = user?.role;

  React.useEffect(() => {
    if (userRole === "Service Provider") {
      navigation.navigate("ProviderDashboard");
    } else {
      navigation.navigate("ClientDashboard");
    }
  }, [userRole, navigation]);

  return <Loader />;
};

// Main app component
const AppContent = () => {
  const { user, loading, isLoggedIn } = useMainContext();

  if (loading) {
    return <Loader />;
  }

  // Check if user is banned
  if (user?.banned) {
    return <AccountBannedScreen />;
  }

  // Check if user is verified
  if (isLoggedIn && !user?.verified) {
    return <VerificationPendingScreen />;
  }

  // Check if user is admin
  if (isLoggedIn && user?.role === "Admin") {
    return (
      <NavigationContainer>
        <AdminStackNavigator />
        <StatusBar style="auto" />
      </NavigationContainer>
    );
  }

  // Authenticated user
  if (isLoggedIn) {
    return (
      <NavigationContainer>
        <MainDrawerNavigator />
        <StatusBar style="auto" />
      </NavigationContainer>
    );
  }

  // Unauthenticated user
  return (
    <NavigationContainer>
      <AuthStackNavigator />
      <StatusBar style="auto" />
    </NavigationContainer>
  );
};

const App = () => {
  return (
    <MainProvider>
      <AppContent />
    </MainProvider>
  );
};

export default App;