import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { Platform } from 'react-native';

// Request camera permissions
export const requestCameraPermission = async () => {
  try {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    return status === 'granted';
  } catch (error) {
    console.error('Error requesting camera permission:', error);
    return false;
  }
};

// Request media library permissions
export const requestMediaLibraryPermission = async () => {
  try {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    return status === 'granted';
  } catch (error) {
    console.error('Error requesting media library permission:', error);
    return false;
  }
};

// Take photo with camera
export const takePhoto = async (options = {}) => {
  try {
    const permissionGranted = await requestCameraPermission();
    if (!permissionGranted) {
      throw new Error('Camera permission not granted');
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: options.allowsEditing || true,
      aspect: options.aspect || [4, 3],
      quality: options.quality || 0.8,
      exif: false,
      ...options,
    });

    if (!result.canceled) {
      return result.assets[0];
    }
    return null;
  } catch (error) {
    console.error('Error taking photo:', error);
    throw error;
  }
};

// Pick image from gallery
export const pickImageFromGallery = async (options = {}) => {
  try {
    const permissionGranted = await requestMediaLibraryPermission();
    if (!permissionGranted) {
      throw new Error('Media library permission not granted');
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: options.allowsEditing || true,
      aspect: options.aspect || [4, 3],
      quality: options.quality || 0.8,
      exif: false,
      ...options,
    });

    if (!result.canceled) {
      return result.assets[0];
    }
    return null;
  } catch (error) {
    console.error('Error picking image:', error);
    throw error;
  }
};

// Compress and resize image
export const compressImage = async (imageUri, options = {}) => {
  try {
    const compressedImage = await ImageManipulator.manipulateAsync(
      imageUri,
      [
        {
          resize: {
            width: options.width || 1024,
          },
        },
      ],
      {
        compress: options.compress || 0.8,
        format: ImageManipulator.SaveFormat.JPEG,
        base64: options.includeBase64 || false,
      }
    );
    return compressedImage;
  } catch (error) {
    console.error('Error compressing image:', error);
    throw error;
  }
};

// Create form data for image upload
export const createImageFormData = (image, fieldName = 'proofImage') => {
  const formData = new FormData();

  if (image) {
    const imageFile = {
      uri: Platform.OS === 'ios' ? image.uri.replace('file://', '') : image.uri,
      type: 'image/jpeg',
      name: `${fieldName}_${Date.now()}.jpg`,
    };
    formData.append(fieldName, imageFile);
  }

  return formData;
};

// Validate image
export const validateImage = (image) => {
  const errors = [];

  if (!image) {
    errors.push('Image is required');
    return errors;
  }

  // Check file size (max 10MB)
  const maxSize = 10 * 1024 * 1024; // 10MB
  if (image.fileSize && image.fileSize > maxSize) {
    errors.push('Image size must be less than 10MB');
  }

  // Check file type
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
  if (image.type && !allowedTypes.includes(image.type.toLowerCase())) {
    errors.push('Only JPEG, PNG, and GIF images are allowed');
  }

  return errors;
};

// Get image dimensions
export const getImageDimensions = async (imageUri) => {
  try {
    const { width, height } = await new Promise((resolve, reject) => {
      Image.getSize(
        imageUri,
        (width, height) => resolve({ width, height }),
        (error) => reject(error)
      );
    });
    return { width, height };
  } catch (error) {
    console.error('Error getting image dimensions:', error);
    return null;
  }
};

// Generate thumbnail
export const generateThumbnail = async (imageUri, size = 150) => {
  try {
    const thumbnail = await ImageManipulator.manipulateAsync(
      imageUri,
      [
        {
          resize: {
            width: size,
            height: size,
          },
        },
      ],
      {
        compress: 0.7,
        format: ImageManipulator.SaveFormat.JPEG,
      }
    );
    return thumbnail;
  } catch (error) {
    console.error('Error generating thumbnail:', error);
    throw error;
  }
};

// Image picker options for proof of work
export const PROOF_OF_WORK_IMAGE_OPTIONS = {
  allowsEditing: true,
  aspect: [4, 3],
  quality: 0.8,
  base64: false,
  exif: false,
};

// Compress image for upload
export const prepareImageForUpload = async (imageUri) => {
  try {
    // Compress and resize
    const compressedImage = await compressImage(imageUri, {
      width: 1200,
      compress: 0.8,
    });

    // Generate thumbnail
    const thumbnail = await generateThumbnail(imageUri, 200);

    return {
      original: compressedImage,
      thumbnail,
    };
  } catch (error) {
    console.error('Error preparing image for upload:', error);
    throw error;
  }
};

// Clean up temporary files (if any)
export const cleanupTempFiles = async (fileUris = []) => {
  try {
    // On mobile, temporary files are usually cleaned up automatically
    // This is a placeholder for any specific cleanup logic needed
    console.log('Cleanup completed for files:', fileUris);
  } catch (error) {
    console.error('Error cleaning up temp files:', error);
  }
};
