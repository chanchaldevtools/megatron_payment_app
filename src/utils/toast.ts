// src/utils/toast.ts
import { ToastAndroid, Platform, Alert } from 'react-native';

export const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
  if (Platform.OS === 'android') {
    ToastAndroid.show(message, ToastAndroid.SHORT);
  } else {
    // For iOS, use Alert or implement a custom toast solution
    Alert.alert(
      type.charAt(0).toUpperCase() + type.slice(1),
      message,
      [{ text: 'OK' }]
    );
  }
};