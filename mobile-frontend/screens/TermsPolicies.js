import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from "react-native";

export default function TermsPolicies({ navigation }) {

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.sectionHeader}>Policies</Text>

      <TouchableOpacity
        style={styles.row}
        onPress={() => navigation.navigate('Terms')}
      >
        <Text style={styles.label}>Terms and Conditions</Text>
        <Text style={styles.link}>Read</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.row}
        onPress={() => navigation.navigate('Privacy')}
      >
        <Text style={styles.label}>Privacy Policy</Text>
        <Text style={styles.link}>Read</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  sectionHeader: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: "#f4f0ef",
    fontWeight: "600",
    color: "#555",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: "#ddd",
  },
  label: {
    fontSize: 16,
    paddingVertical: 10,
    color: "#333",
  },
  link: {
    fontSize: 16,
    color: "#ddae15ff",
    fontWeight: "400",
  },
});
