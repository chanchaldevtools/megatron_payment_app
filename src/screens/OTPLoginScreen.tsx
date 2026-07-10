import React, { useState, useRef,useLayoutEffect  } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Image,
  ScrollView,
  StatusBar,
  Button 
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiService } from '../services/ApiServices';
import { useNavigation } from '@react-navigation/native';

const { width, height } = Dimensions.get('window');
const OTPLoginScreen = ({ navigation }) => {
  const [phoneNumber, setPhoneNumber] = useState('');
 
  const [otp, setOtp] = useState(['', '', '', '']); // <- exactly 4 items
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [sessionId, setSessionId] = useState('');
  const otpInputRefs = useRef([]);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  
  const animateIn = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const validatePhoneNumber = (number) => {
    const phoneRegex = /^[0-9]{10}$/;
    return phoneRegex.test(number.replace(/\D/g, ''));
  };

  const handleSendOtp = async () => {
    if (!validatePhoneNumber(phoneNumber)) {
      Alert.alert('Invalid Number', 'Please enter a valid 10-digit phone number');
      return;
    }

    setIsLoading(true);
    try {
      const result = await apiService.login(phoneNumber);
      console.log('Login result:', result);
      if (result.success) {
        setIsOtpSent(true);
        setSessionId(result.token || result.session || ''); // depends on your API
        setCountdown(60);
        startCountdown();
        animateIn();
        setTimeout(() => {
          otpInputRefs.current[0]?.focus();
        }, 300);
      } else {
        Alert.alert('Error', result.message || 'Failed to send OTP');
      }
    } catch (error: any) {
      console.error('Login failed:', error);
      Alert.alert('Error', error?.response?.data?.message || 'Something went wrong');
    } finally {
      setIsLoading(false);
    }
  };

  const startCountdown = () => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // Better handle change: supports paste & single-digit input
  const handleOtpChange = (value, index) => {
    // accept only digits
    if (!/^\d*$/.test(value)) return;

    const newOtp = [...otp];

    if (value.length > 1) {
      // user pasted multiple digits — fill from current index
      const digits = value.split('').filter((d) => /\d/.test(d));
      for (let i = 0; i < digits.length && index + i < newOtp.length; i++) {
        newOtp[index + i] = digits[i];
      }
    } else {
      // normal single-digit input or clearing
      newOtp[index] = value;
    }

    setOtp(newOtp);

    // move focus to next empty input
    const nextIndex = newOtp.findIndex((d, i) => i > index && d === '');
    if (value && index < newOtp.length - 1) {
      // If pasted many digits, focus after last placed digit
      const placedCount = value.length > 1 ? value.length : 1;
      const focusIndex = Math.min(index + placedCount, newOtp.length - 1);
      otpInputRefs.current[focusIndex]?.focus();
    } else if (value && index < newOtp.length - 1) {
      otpInputRefs.current[index + 1]?.focus();
    }

    // If all digits filled, auto-verify
    if (newOtp.join('').length === newOtp.length) {
      // small delay to ensure state updates
      setTimeout(() => {
        handleVerifyOtp(newOtp.join(''));
      }, 50);
    }
  };

  const handleKeyPress = (e, index) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      setTimeout(() => {
        otpInputRefs.current[index - 1]?.focus();
      }, 10);
    }
  };

  const handleVerifyOtp = async (otpValueParam) => {
    // compute OTP value from param or from state — always fresh
    const otpValue = typeof otpValueParam === 'string' ? otpValueParam : otp.join('');
    console.log('Attempt verify otpValue:', otpValue);

    if (!sessionId) {
      Alert.alert('Session expired', 'Please resend OTP and try again.');
      return;
    }

    if (otpValue.length !== otp.length) {
      Alert.alert('Invalid OTP', `Please enter all ${otp.length} digits`);
      return;
    }

    setIsLoading(true);
    try {
      const result = await apiService.verifyOTP(sessionId, otpValue);
      if (result.success) {
        
        await AsyncStorage.setItem('userData', JSON.stringify(result.user || result.data || result));
        navigation.replace('Main')
      } else {
        Alert.alert('Error', result.message || 'Invalid OTP');
      }
    } catch (error: any) {
      console.error('OTP verification failed:', error);
      Alert.alert('Error', error?.response?.data?.message || 'Something went wrong');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (countdown > 0) return;
    setIsLoading(true);
    try {
      const result = await apiService.login(phoneNumber);
      if (result.success) {
        setSessionId(result.token || result.session || '');
        setCountdown(60);
        startCountdown();
        Alert.alert('Success', 'OTP resent successfully!');
        // clear otp inputs for clarity
        setOtp(['', '', '', '']);
        setTimeout(() => otpInputRefs.current[0]?.focus(), 250);
      } else {
        Alert.alert('Error', result.message || 'Failed to resend OTP');
      }
    } catch (error: any) {
      console.error('Resend OTP failed:', error);
      Alert.alert('Error', error?.response?.data?.message || 'Something went wrong');
    } finally {
      setIsLoading(false);
    }
  };
useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <Button
          title="Skip"
          onPress={() => navigation.replace('Dashboard')}
          color="#6366F1"
        />
      ),
    });
  }, [navigation]);
  const renderOtpInputs = () => {
    return otp.map((digit, index) => (
      <TextInput
        key={index}
        ref={(ref) => {
          otpInputRefs.current[index] = ref;
        }}
        style={[
          styles.otpInput,
          digit && styles.otpInputFilled,
        ]}
        value={digit}
        onChangeText={(value) => handleOtpChange(value, index)}
        onKeyPress={(e) => handleKeyPress(e, index)}
        keyboardType="number-pad"
        maxLength={4} // allow paste of full code into one input
        selectTextOnFocus
      />
    ));
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar barStyle="light-content" backgroundColor="#6366F1" />
      
      {/* Background Gradient Effect */}
      <View style={styles.background}>
        <View style={styles.gradientTop} />
        <View style={styles.gradientBottom} />
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Section */}
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <View style={styles.logoWrapper}>
              <Image 
                source={require('../assets/logo.png')}
                style={styles.logo}
                resizeMode="contain"
              />
              <View style={styles.logoGlow} />
            </View>
          </View>
          
          <Text style={styles.companyName}>MEGATRON LOGISTICS</Text>
          <Text style={styles.tagline}>Smart Transport Solutions</Text>
        </View>

        {/* Content Section */}
        <View style={styles.content}>
          <View style={styles.card}>
            <Text style={styles.title}>
              {isOtpSent ? 'Enter Verification Code' : 'Welcome Back!'}
            </Text>
            
            <Text style={styles.subtitle}>
              {isOtpSent 
                ? `We've sent a 4-digit code to +91 ${phoneNumber}`
                : 'Enter your phone number to get started'
              }
            </Text>

            {!isOtpSent ? (
              <View style={styles.phoneInputContainer}>
                
                <TextInput
                  style={styles.phoneInput}
                  placeholder="Enter your phone number"
                  placeholderTextColor="#9CA3AF"
                  value={phoneNumber}
                  onChangeText={setPhoneNumber}
                  keyboardType="phone-pad"
                  maxLength={10}
                  autoFocus
                />
              </View>
            ) : (
              <View style={styles.otpContainer}>
                <Text style={styles.otpLabel}>Enter 4-digit code</Text>
                <View style={styles.otpInputsContainer}>
                  {renderOtpInputs()}
                </View>
              </View>
            )}

            <TouchableOpacity
              style={[
                styles.button,
                (!validatePhoneNumber(phoneNumber) || isLoading) && styles.buttonDisabled,
              ]}
              onPress={() => (isOtpSent ? handleVerifyOtp() : handleSendOtp())}
              disabled={!validatePhoneNumber(phoneNumber) || isLoading}
              activeOpacity={0.9}
            >
              <View style={styles.buttonContent}>
                {isLoading && (
  <ActivityIndicator size="small" color="#fff" style={{ marginRight: 10 }} />
)}
                <Text style={styles.buttonText}>
                  {isLoading 
                    ? (isOtpSent ? 'Verifying...' : 'Sending...')
                    : (isOtpSent ? 'Verify OTP' : 'Send OTP')
                  }
                </Text>
              </View>
            </TouchableOpacity>

            {isOtpSent && (
              <View style={styles.resendContainer}>
                <Text style={styles.resendText}>
                  Didn't receive the code?{' '}
                </Text>
                <TouchableOpacity 
                  onPress={handleResendOtp} 
                  disabled={countdown > 0 || isLoading}
                >
                  <Text style={[
                    styles.resendButton,
                    (countdown > 0 || isLoading) && styles.resendButtonDisabled
                  ]}>
                    Resend {countdown > 0 ? `(${countdown}s)` : 'Now'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>

        <View >
          <Text style={styles.version}>RELEASE VERSION : 10.0.0.0</Text>
        </View>
        
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  // keep your styles as-is (same as you posted earlier)
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',

  },
  version:{
   textAlign:'center',
   marginTop:15,
   fontStyle:'italic',
  color:'#006D5B'
  },
  background: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  gradientTop: {
    height: height * 0.4,
    backgroundColor: '#006D5B',
    
  },
  gradientBottom: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 30,
  },
  header: {
    alignItems: 'center',
    paddingTop: height * 0.08,
    paddingBottom: 20,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  logoWrapper: {
    position: 'relative',
  },
  logo: {
    width: 120,
    height: 120,
    borderRadius: 30,
    backgroundColor: '#FFFFFF',
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  logoGlow: {
    position: 'absolute',
    top: -10,
    left: -10,
    right: -10,
    bottom: -10,
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    borderRadius: 40,
    zIndex: -1,
  },
  companyName: {
    fontSize: 25,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 5,
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  tagline: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '500',
  },
  content: {
    flex: 1,
    
    paddingTop: 20,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 25,
    padding: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 25,
    height:'100%'
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#1F2937',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 22,
  },
  phoneInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#006D5B',
    marginBottom: 25,
    overflow: 'hidden',
  },
  phonePrefix: {
    paddingHorizontal: 20,
    paddingVertical: 18,
    backgroundColor: '#F1F5F9',
    borderRightWidth: 2,
    borderRightColor: '#E2E8F0',
  },
  prefixText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#475569',
  },
  phoneInput: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 18,
    fontSize: 16,
    color: '#1F2937',
    fontWeight: '500',
  },
  otpContainer: {
    marginBottom: 25,
  },
  otpLabel: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 15,
    fontWeight: '500',
  },
  otpInputsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  otpInput: {
    width: 70,
    height: 70,
    borderWidth: 2,
    borderColor: '#006D5B',
    textAlign: 'center',
    fontSize: 22,
    fontWeight: '700',
    color: '#1F2937',
    
  },
  otpInputFilled: {
    borderColor: '#6366F1',
    backgroundColor: '#FFFFFF',
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  button: {
    backgroundColor: '#006D5B',
    borderRadius: 15,
    marginBottom: 20,
    overflow: 'hidden',
  },
  buttonContent: {
    paddingVertical: 18,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
  },
  loadingSpinner: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    borderTopColor: 'transparent',
    marginRight: 10,
  },
  resendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  resendText: {
    color: '#6B7280',
    fontSize: 14,
  },
  resendButton: {
    color: '#6366F1',
    fontSize: 14,
    fontWeight: '600',
  },
  resendButtonDisabled: {
    color: '#9CA3AF',
  },
  footer: {
    paddingHorizontal: 25,
    paddingTop: 20,
    alignItems: 'center',
  },
  footerText: {
    color: '#9CA3AF',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 16,
  },
  footerLink: {
    color: '#6366F1',
    fontWeight: '600',
  },
});

export default OTPLoginScreen;
