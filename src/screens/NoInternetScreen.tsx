import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Animated,
  Linking,
  Alert,
} from 'react-native';
import noInternetImage from '../assets/icon.png';

const NoInternetScreen = ({ onRetry }) => {
  const pulseAnim = React.useRef(new Animated.Value(1)).current;

  React.useEffect(() => {
    const pulse = Animated.sequence([
      Animated.timing(pulseAnim, {
        toValue: 1.1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.timing(pulseAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
    ]);
    Animated.loop(pulse).start();
  }, []);
  const handleContactSupport = () => {
    const phoneNumber = '7029869895'; 
    Linking.canOpenURL(phoneNumber)
      .then((supported) => {
        if (!supported) {
          Alert.alert('Error', 'Calling not supported on this device');
        } else {
          return Linking.openURL(phoneNumber);
        }
      })
      .catch((err) => console.error('Error opening dialer:', err));
  };

  return (
    <View style={styles.container}>
      <Animated.View
        style={[styles.iconContainer, { transform: [{ scale: pulseAnim }] }]}
      >
        <Image source={noInternetImage} style={styles.image} resizeMode="contain" />
      </Animated.View>

      <Text style={styles.title}>Oops! No Connection</Text>

      <Text style={styles.subtitle}>
        It seems you're offline. Please check your internet connection and try again.
      </Text>

      <View style={styles.tipsContainer}>
        <View style={styles.tipItem}>
          <View style={styles.tipIcon}>
            <Text style={styles.tipIconText}>📶</Text>
          </View>
          <Text style={styles.tipText}>Check Wi-Fi or mobile data</Text>
        </View>

        <View style={styles.tipItem}>
          <View style={styles.tipIcon}>
            <Text style={styles.tipIconText}>🔄</Text>
          </View>
          <Text style={styles.tipText}>Restart your router</Text>
        </View>

        <View style={styles.tipItem}>
          <View style={styles.tipIcon}>
            <Text style={styles.tipIconText}>✈️</Text>
          </View>
          <Text style={styles.tipText}>Toggle airplane mode</Text>
        </View>
      </View>

      <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
        <Text style={styles.retryButtonText}>Try Again</Text>
      </TouchableOpacity>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Still having trouble?</Text>
        <TouchableOpacity onPress={handleContactSupport}>
          <Text style={styles.contactText}>Contact Support</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#f8fafc',
    zIndex: 9999,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  iconContainer: {
    marginBottom: 30,
    padding: 20,
    borderRadius: 60,
   
  },
  image: {
    width: 100,
    height: 100,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1e293b',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 40,
  },
  tipsContainer: {
    width: '100%',
    marginBottom: 40,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  tipIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
   
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  tipIconText: {
    fontSize: 18,
  },
  tipText: {
    fontSize: 14,
    color: '#475569',
    fontWeight: '500',
  },
  retryButton: {
    backgroundColor: '#006D5B',
    paddingHorizontal: 40,
    paddingVertical: 16,
    borderRadius: 12,
    shadowColor: '#006D5B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
    marginBottom: 30,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  footer: {
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: '#94a3b8',
    marginBottom: 8,
  },
  contactText: {
    fontSize: 14,
    color: '#006D5B',
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});

export default NoInternetScreen;
