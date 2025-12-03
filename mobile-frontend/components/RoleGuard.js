import React, { useEffect } from "react";
import { View, Text, ActivityIndicator, StyleSheet, TouchableOpacity } from "react-native";
import { useMainContext } from "../contexts/MainContext";

/**
 * RoleGuard Component - Matches web App.jsx RoleGuard pattern
 * 
 * Protects routes based on user role and authentication status
 * 
 * @param {ReactNode} children - Component to render if access is allowed
 * @param {Object} navigation - React Navigation navigation object
 * @param {Array<string>} allowedRoles - Array of roles that can access this route
 * @param {string} fallbackRoute - Route to navigate to if access is denied (default: "Home")
 * @param {boolean} requireAuth - Whether authentication is required (default: true)
 * 
 * Usage:
 * - Service Provider only: allowedRoles={["Service Provider"]}
 * - Service flow (all users): allowedRoles={["Community Member", "Service Provider"]}
 * - No role restriction: allowedRoles={[]} or omit prop
 */
const RoleGuard = ({
  children,
  navigation,
  allowedRoles = [],
  fallbackRoute = "Home",
  requireAuth = true,
}) => {
  const { user, isLoggedIn, loading } = useMainContext();
  const userRole = user?.role;

  useEffect(() => {
    if (loading) return;

    // Check authentication first
    if (requireAuth && !isLoggedIn) {
      navigation?.replace("Login");
      return;
    }

    // Check role-based access
    // Allow access if user has one of the allowed roles
    if (allowedRoles.length > 0) {
      const isRoleAllowed = allowedRoles.includes(userRole);
      
      if (!isRoleAllowed) {
        navigation?.replace(fallbackRoute);
      }
    }
  }, [loading, isLoggedIn, userRole, allowedRoles, fallbackRoute, navigation, requireAuth]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#dd306a" />
      </View>
    );
  }

  if (requireAuth && !isLoggedIn) {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>Sign in required</Text>
        <Text style={styles.copy}>Please log in to continue.</Text>
        <TouchableOpacity style={styles.button} onPress={() => navigation?.replace("Login")}>
          <Text style={styles.buttonText}>Go to Login</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Check role-based access
  if (allowedRoles.length > 0) {
    const isRoleAllowed = allowedRoles.includes(userRole);
    
    if (!isRoleAllowed) {
      return (
        <View style={styles.center}>
          <Text style={styles.title}>Access restricted</Text>
          <Text style={styles.copy}>
            This section is limited to: {allowedRoles.join(", ")} users.
          </Text>
          <TouchableOpacity style={styles.button} onPress={() => navigation?.replace(fallbackRoute)}>
            <Text style={styles.buttonText}>Back to {fallbackRoute}</Text>
          </TouchableOpacity>
        </View>
      );
    }
  }

  return children;
};

/**
 * Higher-Order Component for role-based route protection
 * Wraps a component with RoleGuard functionality
 * 
 * @param {React.Component} Component - Component to wrap
 * @param {Object} options - RoleGuard options (allowedRoles, fallbackRoute, requireAuth)
 * @returns {React.Component} Wrapped component with role protection
 * 
 * Example:
 * const GuardedService = withRoleGuard(Service, {
 *   allowedRoles: ["Service Provider"],
 *   fallbackRoute: "Home"
 * });
 */
export const withRoleGuard = (Component, options = {}) => {
  return (props) => (
    <RoleGuard {...options} navigation={props.navigation}>
      <Component {...props} />
    </RoleGuard>
  );
};

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    backgroundColor: "#fff",
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 8,
    color: "#1f1f1f",
  },
  copy: {
    fontSize: 14,
    textAlign: "center",
    color: "#5f5f5f",
    marginBottom: 16,
  },
  button: {
    backgroundColor: "#dd306a",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 999,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "600",
  },
});

export default RoleGuard;
