import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useMainContext } from '../../contexts/MainContext';

const CustomLink = ({
  to,
  children,
  style,
  textStyle,
  onPress,
  disabled = false,
  ...props
}) => {
  const navigation = useNavigation();
  const { setNavigationLoading } = useMainContext();

  const handlePress = () => {
    if (disabled) return;

    // Call custom onPress if provided
    if (onPress) {
      onPress();
      return;
    }

    // Show loader and navigate
    setNavigationLoading(true);

    // Navigate after a short delay to show loader
    setTimeout(() => {
      navigation.navigate(to);
      setNavigationLoading(false);
    }, 100);
  };

  return (
    <TouchableOpacity
      style={[styles.container, disabled && styles.disabled, style]}
      onPress={handlePress}
      disabled={disabled}
      activeOpacity={0.7}
      {...props}
    >
      {typeof children === 'string' ? (
        <Text style={[styles.text, disabled && styles.disabledText, textStyle]}>
          {children}
        </Text>
      ) : (
        children
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  text: {
    color: '#007bff',
    fontSize: 16,
    fontWeight: '500',
  },
  disabled: {
    opacity: 0.5,
  },
  disabledText: {
    color: '#999',
  },
});

export default CustomLink;
