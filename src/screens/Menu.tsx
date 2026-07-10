import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  SafeAreaView,
  StatusBar,
  Platform,
  Dimensions,
} from 'react-native';
import { useColorScheme } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native'; // Added navigation hook

const { width } = Dimensions.get('window');

const ThemeColors = {
  light: {
    background: '#FFFFFF',
    surface: '#F8F9FA',
    primary: '#006D5B',
    secondary: '#8B5CF6',
    text: '#1F2937',
    textSecondary: '#6B7280',
    border: '#E5E7EB',
    card: '#FFFFFF',
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
    icon: '#6B7280',
  },
  dark: {
    background: '#111827',
    surface: '#1F2937',
    primary: '#006D5B',
    secondary: '#A78BFA',
    text: '#F9FAFB',
    textSecondary: '#D1D5DB',
    border: '#374151',
    card: '#1F2937',
    success: '#34D399',
    warning: '#FBBF24',
    error: '#F87171',
    icon: '#9CA3AF',
  }
};

const ProfileScreen = () => {
  const navigation = useNavigation(); // Initialize navigation
  const systemTheme = useColorScheme();
  const [userTheme, setUserTheme] = useState(null);
  const [userName, setUserName] = useState('John Doe');
  const [userEmail, setUserEmail] = useState('john.doe@example.com');

  const currentTheme = userTheme || systemTheme || 'light';
  const colors = currentTheme === 'dark' ? ThemeColors.dark : ThemeColors.light;
  const isDark = currentTheme === 'dark';

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const savedName = await AsyncStorage.getItem('userName');
      const savedEmail = await AsyncStorage.getItem('userEmail');
      if (savedName) setUserName(savedName);
      if (savedEmail) setUserEmail(savedEmail);
    } catch (error) {
      console.log('Error loading user data:', error);
    }
  };

  const handleLogoutAction = () => {
    Alert.alert(
      'Log Out',
      'Are you sure you want to log out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Log Out',
          style: 'destructive',
          onPress: async () => {
            try {
              // 1. Clear all session data
              await AsyncStorage.multiRemove(['userData', 'userName', 'userEmail']);
              
              // 2. Redirect to Login and wipe navigation history
              navigation.reset({
                index: 0,
                routes: [{ name: 'Login' }], // Ensure 'Login' matches your Stack Navigator name
              });
            } catch (error) {
              Alert.alert('Error', 'Failed to logout');
            }
          }
        }
      ]
    );
  };

  const handleDriverPayNavigation = () => {
    // Navigate to the Driver Pay screen
    navigation.navigate('DriverCredits'); // Ensure 'DriverPay' matches your Navigator route name
  };

  const renderHighlightedButton = (action) => (
    <TouchableOpacity
      key={action.id}
      style={[styles.highlightedButton, { backgroundColor: colors.error }]}
      onPress={handleLogoutAction}
      activeOpacity={0.8}
    >
      <Icon name="logout" size={22} color="#FFFFFF" />
      <Text style={[styles.highlightedButtonText, { color: '#FFFFFF' }]}>
        Logout
      </Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      
      <View style={styles.header}>
        <Text style={styles.title}>Menu</Text>
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.additionalActions}>
          <TouchableOpacity 
            style={[styles.additionalButton, { borderColor: colors.border }]}
            onPress={handleDriverPayNavigation} // Added redirect here
          >
            <Icon name="cash-multiple" size={20} color={colors.primary} />
            <Text style={[styles.additionalButtonText, { color: colors.text }]}>
              Driver Pay Management
            </Text>
            <Icon name="chevron-right" size={20} color={colors.icon} />
          </TouchableOpacity>
        </View>
        
        <View style={styles.highlightedActionsContainer}>
          {/* Logout Button */}
          <TouchableOpacity
            style={[styles.highlightedButton, { backgroundColor: colors.error }]}
            onPress={handleLogoutAction}
          >
            <Icon name="logout" size={22} color="#FFFFFF" />
            <Text style={[styles.highlightedButtonText, { color: '#FFFFFF' }]}>
              Logout
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 30,
  },
  header: {
    backgroundColor: '#006D5B',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  additionalActions: {
    marginHorizontal: 16,
    marginTop: 20,
    gap: 12,
  },
  additionalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
    borderRadius: 14,
    borderWidth: 1.5,
    gap: 12,
  },
  additionalButtonText: {
    fontSize: 15,
    fontWeight: '800',
    fontFamily:'bold',
    flex: 1,
  },
  highlightedActionsContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    marginTop: 8,
  },
  highlightedButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 14,
    gap: 10,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  highlightedButtonText: {
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
  },
});

export default ProfileScreen;