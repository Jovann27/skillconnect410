import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';

// Reusable list item component
const ListItem = ({icon, name, onPress}) => (
  <TouchableOpacity style={styles.listItem} onPress={onPress}>
    <View style={styles.listItemContent}>
      {icon}
      <Text style={styles.listItemText}>{name}</Text>
    </View>
    <Feather name="chevron-right" size={24} color="#828282" />
  </TouchableOpacity>
);

// --- MODIFIED DATA ---
// Added a 'target' property to tell the app where to navigate
const listData = [
  {
    id: '1',
    name: 'Favourites',
    icon: <Feather name="star" size={20} color="#555" />,
    target: 'Favourites', // This is the name of the screen in your navigator
  },
  {
    id: '2',
    name: 'Blocked',
    icon: <MaterialCommunityIcons name="block-helper" size={20} color="#555" />,
    target: 'Blocked', // This is the name of the screen in your navigator
  },
];

const Workers = ({ navigation }) => {
  return (
    <SafeAreaView style={styles.container}>
    
      {/* List of items */}
      <FlatList
        data={listData}
        keyExtractor={item => item.id}
        renderItem={({item}) => (
          <ListItem
            icon={item.icon}
            name={item.name}
            // --- FIXED NAVIGATION ---
            // Replaced the alert with navigation.navigate()
            onPress={() => navigation.navigate(item.target)}
          />
        )}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    paddingVertical: 15,
    paddingHorizontal: 20,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#EAEAEA',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111',
  },
  sectionHeader: {
    backgroundColor: '#F7F7F7',
    paddingVertical: 8,
    paddingHorizontal: 20,
  },
  sectionHeaderText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  listItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  listItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  listItemText: {
    marginLeft: 15,
    fontSize: 16,
    color: '#333',
  },
});

// --- CORRECTED EXPORT NAME ---
export default Workers;
