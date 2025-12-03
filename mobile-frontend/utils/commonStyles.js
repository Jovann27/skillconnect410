import { StyleSheet, Dimensions } from 'react-native';

const { height: screenHeight } = Dimensions.get('window');

export const commonStyles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    minHeight: screenHeight,
    backgroundColor: '#fff',
  },
  scrollContainer: {
    flexGrow: 1,
    minHeight: screenHeight,
    paddingBottom: 20,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 40,
  },
});

export default commonStyles;
