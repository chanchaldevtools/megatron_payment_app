import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View, Alert, Linking, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Provider as PaperProvider, Text } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/Ionicons';
import OTPLoginScreen from './src/screens/OTPLoginScreen';
import Dashboard from './src/screens/Dashboard'; 
import VehicleDetail from './src/screens/VehicleDetail';
import AddTrip from './src/screens/AddTrip';
import TripDetail from './src/screens/TripDetail';
import Transactions from './src/screens/Transactions';
import AllTransactions from './src/screens/AllTransactions';
import AddTripScreen from './src/screens/AddSubTrip';
import Subtrips from './src/screens/Subtrips';
import SubTripDetail from './src/screens/SubTripDetail';
import NetInfo from '@react-native-community/netinfo';
import NoInternetScreen from './src/screens/NoInternetScreen';
import CloseTrip from './src/screens/CloseTrip';
import DriverExpensePreview from './src/screens/DriverExpensePreview';
import Report from './src/screens/Report';
import Menu from './src/screens/Menu';
import DriverDetails from './src/screens/DriverDetails';
import DriverCredits from './src/screens/DriverCredit';
import { SafeAreaView } from 'react-native-safe-area-context';
// ✅ FIX: Lazy load Sentry to avoid React duplication
// import * as Sentry from '@sentry/react-native';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

// Utility function to clean and validate URL
const cleanApkUrl = (rawUrl: string): string => {
  if (!rawUrl) return '';
  
  const lines = rawUrl.split('\r\n').filter(line => line.trim().length > 0);
  let url = lines[lines.length - 1] || rawUrl;
  url = url.trim();
  
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = 'https://' + url;
  }
  
  console.log('Cleaned URL:', url);
  return url;
};

// Maintenance Mode Screen Component
const MaintenanceScreen = ({ maintenanceData }: { maintenanceData: any }) => {
  const { note, max_time } = maintenanceData || {};
  
  const formatTime = (minutes: number) => {
    if (minutes < 60) {
      return `${minutes} minutes`;
    } else {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      return `${hours} hour${hours > 1 ? 's' : ''}${mins > 0 ? ` ${mins} minute${mins > 1 ? 's' : ''}` : ''}`;
    }
  };

  return (
    <View style={styles.maintenanceContainer}>
      <Icon name="construct-outline" size={80} color="#FFA500" />
      <Text style={styles.maintenanceTitle}>Maintenance Mode</Text>
      
      <View style={styles.maintenanceMessageBox}>
        <Icon name="information-circle-outline" size={24} color="#FFA500" style={styles.infoIcon} />
        <Text style={styles.maintenanceMessage}>
          {note || 'The app is currently under maintenance. Please try again later.'}
        </Text>
      </View>
      
      {max_time && (
        <View style={styles.timeContainer}>
          <Icon name="time-outline" size={20} color="#666" />
          <Text style={styles.timeText}>
            Estimated completion time: {formatTime(max_time)}
          </Text>
        </View>
      )}
      
      <View style={styles.tipsContainer}>
        <Text style={styles.tipsTitle}>What you can do:</Text>
        <View style={styles.tipItem}>
          <Icon name="checkmark-circle-outline" size={18} color="#4CAF50" />
          <Text style={styles.tipText}>Please wait for the maintenance to complete</Text>
        </View>
        <View style={styles.tipItem}>
          <Icon name="checkmark-circle-outline" size={18} color="#4CAF50" />
          <Text style={styles.tipText}>The app will be back shortly</Text>
        </View>
        <View style={styles.tipItem}>
          <Icon name="checkmark-circle-outline" size={18} color="#4CAF50" />
          <Text style={styles.tipText}>All your data is safe and secure</Text>
        </View>
      </View>
      
      <TouchableOpacity 
        style={styles.retryButton}
        onPress={() => window.location.reload()}
      >
        <Icon name="refresh-outline" size={20} color="#fff" />
        <Text style={styles.retryButtonText}>Check Status Again</Text>
      </TouchableOpacity>
    </View>
  );
};

// ✅ FIXED: useState is now properly inside the component
const UpgradeScreen = ({ apkUrl }: { apkUrl: string }) => {
  const [cleanedUrl, setCleanedUrl] = useState('');
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    const cleanUrl = cleanApkUrl(apkUrl);
    setCleanedUrl(cleanUrl);
  }, [apkUrl]);

  const handleUpdate = async (url: string) => {
    if (!url) {
      Alert.alert('Error', 'Download link is not available. Please contact support.');
      return;
    }

    setIsDownloading(true);
    try {
      console.log('Attempting to open URL:', url);
      
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
      } else {
        if (Platform.OS === 'android') {
          await Linking.openURL(url);
        } else {
          Alert.alert(
            'Download Instructions',
            `Please visit this URL in your browser to download the update:\n\n${url}`,
            [{ text: 'OK' }]
          );
        }
      }
    } catch (error) {
      console.error('Error opening URL:', error);
      Alert.alert(
        'Download Failed',
        `Unable to open the download link. Please visit this URL manually:\n\n${url}`,
        [
          {
            text: 'Copy URL',
            onPress: () => {
              Alert.alert('URL Copied', 'Please paste this in your browser to download the update.');
            }
          },
          { text: 'OK' }
        ]
      );
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Icon name="alert-circle-outline" size={80} color="#FF6B6B" />
      <Text style={styles.title}>Update Required</Text>
      <Text style={styles.message}>
        A new version of the app is available. Please update to continue using the application.
      </Text>
      
      {cleanedUrl ? (
        <TouchableOpacity 
          style={[styles.button, isDownloading && styles.buttonDisabled]} 
          onPress={() => handleUpdate(cleanedUrl)}
          disabled={isDownloading}
        >
          {isDownloading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Update Now</Text>
          )}
        </TouchableOpacity>
      ) : (
        <Text style={styles.errorText}>
          Download link not available. Please contact support.
        </Text>
      )}
      
      <Text style={styles.urlText}>
        {cleanedUrl || 'No download URL available'}
      </Text>
    </View>
  );
};

// Check Maintenance Mode
const checkMaintenanceMode = async (): Promise<{ 
  isMaintenance: boolean; 
  maintenanceData: any 
}> => {
  try {
    console.log('Checking maintenance mode...');
    const response = await fetch('https://truckapp.inextwebs.com/public/api/getmaintanancemode', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({}),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log('Maintenance API response:', data);
    
    if (data.status && data.data && data.data.is_maintanance === "1") {
      return {
        isMaintenance: true,
        maintenanceData: data.data
      };
    }
    
    return {
      isMaintenance: false,
      maintenanceData: null
    };
  } catch (error) {
    console.error('Error checking maintenance mode:', error);
    return {
      isMaintenance: false,
      maintenanceData: null
    };
  }
};

// Check App Version
const checkAppVersion = async (): Promise<{ 
  requiresUpdate: boolean; 
  apkUrl: string 
}> => {
  try {
    console.log('Checking app version...');
    const response = await fetch('https://truckapp.inextwebs.com/public/api/getversionControl', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({}),
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    console.log('Version API response:', data);
    if (data.status && data.data) {
      const currentVersion = data.data.current_version.toString();
      const rawApkUrl = data.data.apk_url;
      const cleanedApkUrl = cleanApkUrl(rawApkUrl);
      const appVersion = "14";
      console.log('API Version:', currentVersion, 'App Version:', appVersion, 'APK URL:', cleanedApkUrl);
      return {
        requiresUpdate: currentVersion !== appVersion,
        apkUrl: cleanedApkUrl
      };
    }
    
    console.warn('Invalid API response format');
    return { requiresUpdate: false, apkUrl: '' };
  } catch (error) {
    console.error('Error checking app version:', error);
    return { requiresUpdate: false, apkUrl: '' };
  }
};

const HomeStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="Dashboard" component={Dashboard} options={{ headerShown: false }}/>
    <Stack.Screen name="VehicleDetail" component={VehicleDetail} />
    <Stack.Screen name="AddTrip" component={AddTrip} />
    <Stack.Screen name="CloseTrip" component={CloseTrip} />
    <Stack.Screen name="DriverExpensePreview" component={DriverExpensePreview} options={{ title: 'Calculation Preview' }}/>
  </Stack.Navigator>
);

const PaymentsStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="PaymentsList" component={AllTransactions} />
  </Stack.Navigator>
);

const MenuStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="Menu" component={Menu} />
    <Stack.Screen name="DriverCredits" component={DriverCredits} />
    <Stack.Screen name="DriverDetails" component={DriverDetails} />
     <Stack.Screen name="CloseTrip" component={CloseTrip} />
  </Stack.Navigator>
);

const MainTabs = () => {
  const [userType, setUserType] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserType = async () => {
      try {
        const type = await AsyncStorage.getItem('userData'); 
        if (type) {
          const parsed = JSON.parse(type);
          setUserType(parsed.user_type);
        }
      } catch (error) {
        console.error('Error fetching user type:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchUserType();
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#006D5B" />
      </View>
    );
  }

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ color, size }) => {
          let iconName: string = 'home';
          if (route.name === 'Home') iconName = 'home-outline';
          else if (route.name === 'Payments') iconName = 'card-outline';
          else if (route.name === 'Menu') iconName = 'menu-outline';
          return <Icon name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#006D5B',
        tabBarInactiveTintColor: '#aeb0b0ff',
      })}>
      <Tab.Screen name="Home" component={HomeStack} />
      <Tab.Screen name="Payments" component={PaymentsStack} />
      <Tab.Screen name="Menu" component={MenuStack} />
    </Tab.Navigator>
  );
};

const RootStack = createStackNavigator();

const App = () => {
  const [initialRoute, setInitialRoute] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(true);
  const [appStatus, setAppStatus] = useState<'checking' | 'maintenance' | 'update' | 'ready'>('checking');
  const [maintenanceData, setMaintenanceData] = useState<any>(null);
  const [apkUrl, setApkUrl] = useState('');

  useEffect(() => {
    const initializeApp = async () => {
      try {
        const maintenanceCheck = await checkMaintenanceMode();
        
        if (maintenanceCheck.isMaintenance) {
          setAppStatus('maintenance');
          setMaintenanceData(maintenanceCheck.maintenanceData);
          return;
        }

        const versionCheck = await checkAppVersion();
        
        if (versionCheck.requiresUpdate) {
          setAppStatus('update');
          setApkUrl(versionCheck.apkUrl);
          return;
        }

        const userData = await AsyncStorage.getItem('userData');
        if (userData) {
          setInitialRoute('Main');
        } else {
          setInitialRoute('Login');
        }
        
        setAppStatus('ready');
      } catch (e) {
        console.error('Error during app initialization:', e);
        try {
          const userData = await AsyncStorage.getItem('userData');
          setInitialRoute(userData ? 'Main' : 'Login');
          setAppStatus('ready');
        } catch (error) {
          console.error('Error setting initial route:', error);
        }
      }
    };

    initializeApp();

    const unsubscribe = NetInfo.addEventListener(state => {
      setIsConnected(state.isConnected && state.isInternetReachable !== false);
    });

    return () => unsubscribe();
  }, []);

  if (appStatus === 'checking') {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#6366F1" />
        <Text style={{ marginTop: 10 }}>Checking app status...</Text>
      </View>
    );
  }

  if (appStatus === 'maintenance') {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
        <PaperProvider>
          <MaintenanceScreen maintenanceData={maintenanceData} />
        </PaperProvider>
      </SafeAreaView>
    );
  }

  if (appStatus === 'update') {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
        <PaperProvider>
          <UpgradeScreen apkUrl={apkUrl} />
        </PaperProvider>
      </SafeAreaView>
    );
  }

  if (!initialRoute) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#6366F1" />
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
      <PaperProvider>
        <NavigationContainer>
          <RootStack.Navigator screenOptions={{ headerShown: false }} initialRouteName={initialRoute}>
            <RootStack.Screen name="Login" component={OTPLoginScreen} />
            <RootStack.Screen name="Main" component={MainTabs} />
            <Stack.Screen name="CloseTrip" component={CloseTrip} />
            <RootStack.Screen name="TripDetail" component={TripDetail} />
            <RootStack.Screen name="Transactions" component={Transactions} />
            <RootStack.Screen name="AddTripScreen" component={AddTripScreen} />
            <RootStack.Screen name="Subtrips" component={Subtrips} />
            <RootStack.Screen name="SubTripDetail" component={SubTripDetail} />
            <RootStack.Screen name="Report" component={Report} />
          </RootStack.Navigator>
        </NavigationContainer>
        {!isConnected && <NoInternetScreen />}
      </PaperProvider>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginVertical: 20,
    textAlign: 'center',
    color: '#000',
  },
  message: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 30,
    color: '#666',
    lineHeight: 22,
  },
  button: {
    backgroundColor: '#006D5B',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 8,
    minWidth: 150,
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#cccccc',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  errorText: {
    color: '#FF6B6B',
    textAlign: 'center',
    marginTop: 10,
  },
  urlText: {
    marginTop: 20,
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
  },
  
  maintenanceContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
  },
  maintenanceTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    marginVertical: 20,
    textAlign: 'center',
    color: '#FFA500',
  },
  maintenanceMessageBox: {
    flexDirection: 'row',
    backgroundColor: '#FFF9E6',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#FFE58F',
    width: '100%',
    alignItems: 'flex-start',
  },
  infoIcon: {
    marginRight: 10,
    marginTop: 2,
  },
  maintenanceMessage: {
    fontSize: 16,
    color: '#666',
    lineHeight: 22,
    flex: 1,
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    padding: 12,
    borderRadius: 8,
    marginBottom: 30,
  },
  timeText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  tipsContainer: {
    width: '100%',
    backgroundColor: '#F9F9F9',
    padding: 20,
    borderRadius: 10,
    marginBottom: 30,
  },
  tipsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  tipText: {
    fontSize: 14,
    color: '#555',
    marginLeft: 10,
  },
  retryButton: {
    flexDirection: 'row',
    backgroundColor: '#006D5B',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 10,
  },
});

export default App;