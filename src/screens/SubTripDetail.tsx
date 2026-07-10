import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  Text,
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import Header from './components/Header';
import TransportInfo from './components/TransportInfo';
import TripDetails from './components/TripDetails';
import DriverExpenses from './components/DriverExpenses';
import VehicleInfo from './components/VehicleInfo';
import { apiService } from '../services/ApiServices';
import {
  responsiveWidth,
  responsiveHeight,
  responsiveFont,
} from '../utils/responsive';

const Tab = createMaterialTopTabNavigator();

export default function App({ route }: any) {
  const [transportData, setTransportData] = useState({});
  const { tripId, vehicle } = route.params;
  const [Paymenthistory, setPaymenthistory] = useState([]);
  const navigation = useNavigation();

  

  const handleCreateSubTrip = () => {
    navigation.navigate('AddTripScreen', { tripId: tripId, vehicle: vehicle });
  };

  const handleGoSubTrip = () => {
    navigation.navigate('Subtrips', { tripId: tripId, vehicle: vehicle });
  };

  useEffect(() => {
    const fetchPaymentHistory = async () => {
      try {
        const result = await apiService.PaymentHistory({
          type: 'Sub',
          transport_id: tripId.id,
        });

        setPaymenthistory(result);
        setTransportData({
          vehicleNumber: vehicle?.vehicle_number || 'N/A',
          odometerKm: tripId?.odm_km || 'N/A',
          transportDate: tripId?.transport_date || 'N/A',
          source: tripId?.source || 'N/A',
          destination: tripId?.destination || 'N/A',
          receivingAmount: tripId?.receving || 'N/A',
        });
      } catch (error) {
        console.error('Error fetching PaymentHistory:', error);
      }
    };
    fetchPaymentHistory();
  }, [tripId, vehicle]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#006D5B" barStyle="light-content" />

      {/* Main ScrollView for the entire screen */}
      <ScrollView
        style={styles.mainScrollView}
        contentContainerStyle={styles.mainScrollContent}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled={true}
      >
        <View style={styles.content}>
          <Header
            vehicleNumber={transportData.vehicleNumber}
            odometerKm={transportData.odometerKm}
          />

          <TransportInfo
            transportDate={transportData.transportDate}
            source={transportData.source}
            destination={transportData.destination}
            receivingAmount={transportData.receivingAmount}
          />

         
          <View style={styles.tabContainer}>
            <Tab.Navigator
              screenOptions={{
                tabBarLabelStyle: styles.tabLabel,
                tabBarStyle: styles.tabBar,
                tabBarIndicatorStyle: styles.tabIndicator,
                tabBarActiveTintColor: '#006D5B',
                tabBarInactiveTintColor: '#666',
              }}
            >
              <Tab.Screen name="Trip Details">
                {() => (
                  <ScrollView 
                    style={styles.tabScrollView}
                    contentContainerStyle={styles.tabScrollContent}
                    showsVerticalScrollIndicator={true}
                    nestedScrollEnabled={true}
                  >
                    <TripDetails
                      transportData={tripId}
                      vehicle={vehicle}
                      Paymenthistory={Paymenthistory}
                      DataType={'Sub'}
                    />
                  </ScrollView>
                )}
              </Tab.Screen>

              <Tab.Screen name="Driver Expenses">
                {() => (
                  <ScrollView 
                    style={styles.tabScrollView}
                    contentContainerStyle={styles.tabScrollContent}
                    showsVerticalScrollIndicator={true}
                    nestedScrollEnabled={true}
                  >
                    <DriverExpenses
                      transports={tripId}
                      Paymenthistory={Paymenthistory.DC}
                      DataType={'Sub'}
                    />
                  </ScrollView>
                )}
              </Tab.Screen>

              <Tab.Screen name="Vehicle Expenses">
                {() => (
                  <ScrollView 
                    style={styles.tabScrollView}
                    contentContainerStyle={styles.tabScrollContent}
                    showsVerticalScrollIndicator={true}
                    nestedScrollEnabled={true}
                  >
                    <VehicleInfo transports={tripId} DataType={'Sub'} />
                  </ScrollView>
                )}
              </Tab.Screen>
            </Tab.Navigator>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  mainScrollView: {
    flex: 1,
  },
  mainScrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    minHeight: responsiveHeight(800), // Ensure minimum height for scrolling
  },
  buttonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: responsiveWidth(10),
    backgroundColor: '#fff',
    marginHorizontal: responsiveWidth(10),
    marginTop: responsiveHeight(10),
    borderRadius: responsiveWidth(6),
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: responsiveHeight(1) },
    shadowOpacity: 0.1,
    shadowRadius: responsiveWidth(2),
    paddingVertical: responsiveHeight(10),
    paddingHorizontal: responsiveWidth(10),
  },
  button: {
    flex: 1,
    paddingVertical: responsiveHeight(12),
    borderRadius: responsiveWidth(4),
    alignItems: 'center',
    justifyContent: 'center',
  },
  outlineButton: {
    backgroundColor: 'transparent',
    borderWidth: responsiveWidth(0.5),
    borderColor: '#006D5B',
  },
  outlineButtonText: {
    color: '#006D5B',
    fontWeight: 'bold',
    fontSize: responsiveFont(14),
  },
  filledButton: {
    backgroundColor: '#006D5B',
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: responsiveFont(14),
  },
  tabContainer: {
    flex: 1,
    marginTop: responsiveHeight(10),
    minHeight: responsiveHeight(600), // Use minHeight instead of fixed height
  },
  tabScrollView: {
    flex: 1,
  },
  tabScrollContent: {
    flexGrow: 1,
    paddingBottom: responsiveHeight(20),
  },
  tabBar: {
    backgroundColor: '#fff',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: responsiveHeight(1.5) },
    shadowOpacity: 0.1,
    shadowRadius: responsiveWidth(1),
  },
  tabLabel: {
    fontSize: responsiveFont(14),
    fontWeight: '600',
    textTransform: 'none',
  },
  tabIndicator: {
    backgroundColor: '#006D5B',
    height: responsiveHeight(3),
    borderRadius: responsiveWidth(2),
  },
});