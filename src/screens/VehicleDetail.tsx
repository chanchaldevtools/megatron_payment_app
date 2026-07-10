import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
  SafeAreaView,
  Alert,
  Modal, // ⚠️ Added Modal
  TextInput, // ⚠️ Added TextInput for the modal
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage'; 
import Icon from 'react-native-vector-icons/Ionicons';
import { StackNavigationProp } from '@react-navigation/stack';
import { useFocusEffect } from '@react-navigation/native';
import { apiService } from '../services/ApiServices';
import { responsiveWidth, responsiveHeight, responsiveFont } from "../utils/responsive";

// --- START: Interface Definitions ---

type RootStackParamList = {
  VehicleTrips: { vehicleNumber: string; vehicle: any };
  TripDetail: { tripId: Trip, vehicle: any };
  AddTrip: { vehicle: any };
};

type VehicleTripsScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'VehicleTrips'
>;

interface Props {
  navigation: VehicleTripsScreenNavigationProp;
  route: { params: { vehicleNumber: string; vehicle: any } };
}

interface Trip {
  id: number;
  trip_id: string;
  transport_date: string;
  source: string;
  destination: string;
  status?: 'completed' | 'Active' | 'upcoming';
  distance?: string;
  earnings?: string;

  checkedBy?: string | null;
}

type FilterType = 'All' | 'Checked' | 'Non-Checked';

// --- Global/Mock Constants (Used for checkedBy value, Admin check logic is now dynamic)
const MOCK_CURRENT_USER_ID = 'AdminUser123'; 

// --- END: Interface Definitions ---


const VehicleTripsScreen: React.FC<Props> = ({ navigation, route }) => {
  const { vehicleNumber, vehicle } = route.params;
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [vehicleNumbers, setVehicleNumbers] = useState('');
  const [filter, setFilter] = useState<FilterType>('All'); 
  const [userType, setUserType] = useState<string | null>(null); 
  const isAdmin = userType === 'Admin' || userType === 'admin'; 

  // ⚠️ NEW State for Edit Modal
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingTrip, setEditingTrip] = useState<Trip | null>(null);
  const [newRate, setNewRate] = useState('');
  const [newWeight, setNewWeight] = useState('');
  const [newTrip, setNewTrip] = useState('');

  useEffect(() => {
    const fetchUserType = async () => {
      try {
        const type = await AsyncStorage.getItem('userData');
        if (type) {
          const parsed = JSON.parse(type);
          // Assuming user_type is the correct field in the stored user data
          setUserType(parsed?.user_type || null); 
        }
      } catch (error) {
        console.error('Error fetching user type:', error);
      }
    };
    fetchUserType();
  }, []);
  
  const fetchTrips = useCallback(async () => {
    try {
      setLoading(true);
      setVehicleNumbers(vehicle?.vehicle_number || vehicleNumber || 'N/A');
      // NOTE: Assuming TransportList returns the trips with 'rate' and 'waight' fields
      const response = await apiService.TransportList(vehicle.id); 
      // Ensure the response data matches the Trip interface structure
      const data: Trip[] = response || []; 
      setTrips(data); 
    } catch (err) {
      console.error('Error fetching trips', err);
      Alert.alert("Error", "Failed to fetch trip data.");
      setTrips([]);
    } finally {
      setLoading(false);
    }
  }, [vehicle, vehicleNumber]);

  useFocusEffect(
    useCallback(() => {
      fetchTrips();
      return () => {}; 
    }, [fetchTrips])
  );

  // 1. Check Trip Logic (Updated as per previous request)
  const handleMakeChecked = async (tripId: number) => {
    if (!isAdmin) {
      Alert.alert("Permission Denied", "Only administrators can mark a trip as checked.");
      return;
    }

    Alert.alert(
      `CHECK Trip`,
      `Are you sure you want to mark this trip as checked? This action cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: 'CHECK', 
          style: 'default',
          onPress: async () => {
            try {
              // API Call to mark as checked
              const response = await apiService.MakeChecked({ transport_id: tripId });
              
              if(response?.status === true){
                setTrips(currentTrips => 
                  currentTrips.map(trip => 
                    // Update only the checkedBy field
                    trip.id === tripId ? { ...trip, checkedBy: MOCK_CURRENT_USER_ID } : trip
                  )
                );
                Alert.alert("Success", "Trip has been successfully marked as checked!");
              } else {
                Alert.alert("Error", response?.message || "Failed to mark trip as checked.");
              }
            } catch (error) {
              console.error(`Error updating check status for trip ${tripId}:`, error);
              Alert.alert("Error", "A network error occurred. Please try again.");
            }
          } 
        },
      ]
    );
  };

  // 2. NEW: Edit Transport Modal Handlers
  const openEditModal = (trip: Trip) => {
    
    setEditingTrip(trip);
    // Initialize inputs with current values (default to empty string if null/undefined)
    setNewRate(String(trip.rate || '')); 
    setNewWeight(String(trip.weight || ''));
    setNewTrip(String(trip.trip_id|| ''));
    
    setEditModalVisible(true);
  };

  const handleEditTransport = async () => {
    if (!editingTrip) return;

    const rateValue = parseFloat(newRate);
    const weightValue = parseFloat(newWeight);
     const tripValue = newTrip;

    // Validation
    if (isNaN(rateValue) || rateValue <= 0) {
      Alert.alert("Validation Error", "Please enter a valid rate (number greater than 0).");
      return;
    }
    if (isNaN(weightValue) || weightValue <= 0) {
      Alert.alert("Validation Error", "Please enter a valid weight (number greater than 0).");
      return;
    }
    if (tripValue <= 0) {
      Alert.alert("Validation Error", "Please enter a valid Trip ID");
      return;
    }

    setLoading(true);
    try {
      // API Call to update rate and weight
      const response = await apiService.editrate({
        transport_id: String(editingTrip.id),
        rate: String(rateValue), // API expects string
        waight: String(weightValue), // API expects string
        trip_id: String(tripValue),
        type: 'Main',
      });

      if (response?.status === true) {
        // Update local state
        setTrips(currentTrips => 
          currentTrips.map(trip => 
            trip.id === editingTrip.id 
              ? { ...trip, rate: rateValue, waight: weightValue } 
              : trip
          )
        );
        Alert.alert("Success", "Trip rate and weight updated successfully!");
        setEditModalVisible(false);
      } else {
        Alert.alert('Error',response.message);
      }

    } catch (error) {
      console.error(`Error updating transport details for trip ${editingTrip.id}:`, error);
      Alert.alert("Error", "A network error occurred during the update.");
    } finally {
      setLoading(false);
    }
  };

  // --- END: API & Data Logic ---

  // Filtering logic
  const filteredTrips = useMemo(() => {
    if (filter === 'All') {
      return trips;
    }
    return trips.filter(trip => {
      const isChecked = !!trip.checkedBy; 
      return filter === 'Checked' ? isChecked : !isChecked;
    });
  }, [trips, filter]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return '#10B981'; 
      case 'Active': return '#F59E0B'; 
      case 'upcoming': return '#3B82F6'; 
      default: return '#6B7280'; 
    }
  };

  const handleAddTrip = () => {
    navigation.navigate('AddTrip', { vehicle });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const StatusIndicator = ({ status }: { status: string }) => (
    <View style={[styles.statusDot, { backgroundColor: getStatusColor(status) }]}>
      <View style={[styles.statusGlow, { backgroundColor: getStatusColor(status) }]} />
    </View>
  );

  const WatermarkStamp = ({ isChecked }: { isChecked: boolean }) => {
    // Determine color based on checked status
    const stampColor = isChecked ? '#10B981' : '#EF4444'; // Green for checked, Red for unchecked
    const stampBackgroundColor = isChecked ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)';
    const stampBorderColor = isChecked ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)';

    return (
      <View style={styles.watermarkContainer}>
        <View style={[styles.stampOuterCircle, { borderColor: stampBorderColor, backgroundColor: stampBackgroundColor }]}>
          <View style={[styles.stampInnerCircle, { borderColor: stampBorderColor, backgroundColor: stampBackgroundColor }]}>
            <Text style={[styles.stampText, { color: stampColor }]}>MAIN</Text>
            <Text style={[styles.stampText, { color: stampColor }]}>TRIP</Text>
          </View>
        </View>
      </View>
    );
  };

  const FilterButtons = () => {
    const filters: FilterType[] = ['All', 'Checked', 'Non-Checked'];
    return (
      <View style={styles.filterContainer}>
        {filters.map((f) => (
          <TouchableOpacity
            key={f}
            style={[
              styles.filterButton,
              filter === f && styles.filterButtonActive,
            ]}
            onPress={() => setFilter(f)}
          >
            <Text
              style={[
                styles.filterText,
                filter === f && styles.filterTextActive,
              ]}
            >
              {f}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const renderEditModal = () => (
    <Modal
      animationType="slide"
      transparent={true}
      visible={editModalVisible}
      onRequestClose={() => setEditModalVisible(false)}
    >
      <View style={modalStyles.centeredView}>
        <View style={modalStyles.modalView}>
          <Text style={modalStyles.modalTitle}>Edit Transport Details</Text>
          {editingTrip && (
            <Text style={modalStyles.tripIdText}>Trip ID: {editingTrip.trip_id || `TRIP${editingTrip.id}`}</Text>
          )}

          <Text style={modalStyles.label}>Rate *</Text>
          <TextInput
            style={modalStyles.input}
            onChangeText={setNewRate}
            value={newRate}
            placeholder="Enter new rate"
            keyboardType="numeric"
          />

          <Text style={modalStyles.label}>Weight *</Text>
          <TextInput
            style={modalStyles.input}
            onChangeText={setNewWeight}
            value={newWeight}
            placeholder="Enter new weight"
            keyboardType="numeric"
          />
          <Text style={modalStyles.label}>Trip Id *</Text>
          <TextInput
            style={modalStyles.input}
            onChangeText={setNewTrip}
            value={newTrip}
            placeholder="Enter new TripId"
            
          />

          <View style={modalStyles.buttonContainer}>
            <TouchableOpacity
              style={[modalStyles.button, modalStyles.buttonClose]}
              onPress={() => setEditModalVisible(false)}
              disabled={loading}
            >
              <Text style={modalStyles.textStyle}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[modalStyles.button, modalStyles.buttonSave, loading && { opacity: 0.6 }]}
              onPress={handleEditTransport}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={modalStyles.textStyle}>Save Changes</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  const renderTripItem = ({ item, index }: { item: Trip; index: number }) => {
    const isChecked = !!item.checkedBy;
    // Greenish for checked, Yellowish for unchecked (Pending Review)
    const cardBackgroundColor = isChecked ? '#E6FFF9' : '#FFFBEB'; 

    return (
      <TouchableOpacity 
        style={[styles.tripCard, { backgroundColor: cardBackgroundColor }]}
        onPress={() => navigation.navigate('TripDetail', { tripId: item, vehicle: vehicle })}
        activeOpacity={0.7}
      >
        <WatermarkStamp isChecked={isChecked} />
        <View style={[styles.statusLine, { backgroundColor: getStatusColor(item.status || 'upcoming') }]} />
        <View style={styles.tripContent}>
          
          {/* Trip Header Section */}
          <View style={styles.tripHeader}>
            <View style={styles.tripBasicInfo}>
              <View style={styles.slNoContainer}>
                <Text style={styles.slNo}>{String(index + 1).padStart(2, '0')}</Text>
              </View>
              <View style={styles.tripInfo}>
                <Text style={styles.tripId}>{item.trip_id || `TRIP${item.id}`}</Text>
                <Text style={styles.tripDate}>{formatDate(item.transport_date)}</Text>
                <Text style={styles.tripDateTwo}>Driver Name : {item.driver_name || 'N/A'}</Text>
              </View>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(item.status || 'upcoming')}20` }]}>
              <StatusIndicator status={item.status || 'upcoming'} />
              <Text style={[styles.statusText, { color: getStatusColor(item.status || 'upcoming') }]}>
                {item.status?.toUpperCase() || 'UPCOMING'}
              </Text>
            </View>
          </View>

          {/* Route Section */}
          <View style={styles.routeSection}>
            <View style={styles.routePath}>
              <View style={styles.routeDot} />
              <View style={styles.routeLine} />
              <View style={[styles.routeDot, styles.routeDotDestination]} />
            </View>
            <View style={styles.routeDetails}>
              <View style={styles.routeItem}>
                <Text style={styles.routeLabel}>From</Text>
                <Text style={styles.placeText}>{item.source}</Text>
              </View>
              <View style={styles.routeItem}>
                <Text style={styles.routeLabel}>To</Text>
                <Text style={styles.placeText}>{item.destination}</Text>
              </View>
            </View>
          </View>
          
          
          <View style={styles.checkedByRow}>
            
           {!isChecked && (
              <TouchableOpacity
                style={[
                  styles.adminCheckButton,
                  { backgroundColor: '#3B82F6', marginRight: responsiveWidth(8) } // Blue for Edit
                ]}
                onPress={() => openEditModal(item)}
              >
                <Icon 
                  name="create-outline" 
                  size={responsiveFont(14)} 
                  color="#fff" 
                />
                <Text style={styles.adminCheckButtonText}>
                  Edit Transport
                </Text>
              </TouchableOpacity>
           )}

           
            {isAdmin && !isChecked && (
              <TouchableOpacity
                style={[
                  styles.adminCheckButton,
                  { backgroundColor: '#006D5B' }
                ]}
                onPress={() => handleMakeChecked(item.id)}
              >
                <Icon 
                  name="checkmark-circle-outline" 
                  size={responsiveFont(14)} 
                  color="#fff" 
                />
                <Text style={styles.adminCheckButtonText}>
                  Check Trip
                </Text>
              </TouchableOpacity>
            )}

          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#006D5B" barStyle="light-content" /> 

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Trip History</Text>
          <Text style={styles.vehicleNumber}>{vehicleNumbers}</Text>
        </View>
        <View style={styles.headerIcon}>
          <Icon name="car-sport" size={28} color="#fff" />
        </View>
      </View>
      
      <FilterButtons />

      {/* Content */}
      {loading && !trips.length ? ( // Show loading only initially or on refresh
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#006D5B" />
          <Text style={styles.loadingText}>Loading trips...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredTrips}
          keyExtractor={item => item.id.toString()}
          renderItem={renderTripItem}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <Icon name="map-outline" size={40} color="#D1D5DB" />
              </View>
              <Text style={styles.emptyStateTitle}>
                {filter === 'All' ? 'No Trips Found' : `No ${filter} Trips Found`} 
              </Text>
              <Text style={styles.emptyStateText}>
                {filter === 'All' 
                  ? 'No trips recorded for this vehicle yet.'
                  : `Try selecting 'All' to view all trips or 'Non-Checked' to find pending trips.`
                }
              </Text>
              {filter === 'All' && (
                <TouchableOpacity 
                  style={styles.addFirstTripButton}
                  onPress={() => navigation.navigate('AddTrip', { vehicle })}
                >
                  <Text style={styles.addFirstTripText}>Add First Trip</Text>
                </TouchableOpacity>
              )}
            </View>
          }
          showsVerticalScrollIndicator={false}
        />
      )}
      
      {/* Edit Modal */}
      {renderEditModal()}

      <TouchableOpacity
        style={styles.fab}
        onPress={handleAddTrip}
      >
        <Icon name="add" size={30} color="#fff" />
      </TouchableOpacity>
    </SafeAreaView>
  );
};

// --- START: Stylesheet ---

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB', 
  },
  header: {
    backgroundColor: '#006D5B', // Theme color
    paddingHorizontal: responsiveWidth(20),
    paddingTop: responsiveHeight(10),
    paddingBottom: responsiveHeight(20),
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: responsiveHeight(2) },
    elevation: 3,
  },
  backButton: {
    padding: responsiveWidth(8),
    marginRight: responsiveWidth(12),
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    color: '#fff',
    fontSize: responsiveFont(20),
    fontWeight: '700',
    marginBottom: responsiveHeight(4),
  },
  vehicleNumber: {
    color: '#E0E7FF',
    fontSize: responsiveFont(14),
    fontWeight: '500',
  },
  headerIcon: {
    padding: responsiveWidth(8),
  },
  filterContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: responsiveWidth(16),
    paddingVertical: responsiveHeight(10),
    backgroundColor: '#E6FFF9', 
    borderBottomWidth: 1,
    borderBottomColor: '#B2F7E1',
  },
  filterButton: {
    paddingVertical: responsiveHeight(8),
    paddingHorizontal: responsiveWidth(16),
    borderRadius: responsiveWidth(20),
    backgroundColor: 'transparent',
  },
  filterButtonActive: {
    backgroundColor: '#006D5B',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  filterText: {
    fontSize: responsiveFont(14),
    fontWeight: '600',
    color: '#006D5B',
  },
  filterTextActive: {
    color: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: responsiveHeight(12),
    color: '#6B7280',
    fontSize: responsiveFont(16),
  },
  listContent: {
    padding: responsiveWidth(16),
    paddingBottom: responsiveHeight(100),
  },
  tripCard: {
    borderRadius: responsiveWidth(20),
    marginBottom: responsiveHeight(16),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: responsiveHeight(2) },
    shadowOpacity: 0.1,
    shadowRadius: responsiveWidth(8),
    elevation: 3,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  watermarkContainer: {
    position: 'absolute',
    top: responsiveHeight(70),
    right: responsiveWidth(10),
    zIndex: 1,
    opacity: 0.5, 
    transform: [{ rotate: '-15deg' }],
  },
  stampOuterCircle: {
    width: responsiveWidth(90),
    height: responsiveWidth(90),
    borderRadius: responsiveWidth(45),
    borderWidth: responsiveWidth(2),
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stampInnerCircle: {
    width: responsiveWidth(70),
    height: responsiveWidth(70),
    borderRadius: responsiveWidth(35),
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: responsiveWidth(1),
  },
  stampText: {
    fontSize: responsiveFont(12), 
    fontWeight: '900',
    letterSpacing: 1,
    textAlign: 'center',
    lineHeight: responsiveHeight(14),
  },
  statusLine: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: responsiveWidth(6), 
    zIndex: 2,
  },
  tripContent: {
    padding: responsiveWidth(16),
    marginLeft: responsiveWidth(6), 
    position: 'relative',
    zIndex: 3,
  },
  tripHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: responsiveHeight(16),
    paddingBottom: responsiveHeight(10),
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  tripBasicInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  slNoContainer: {
    marginRight: responsiveWidth(12),
  },
  slNo: {
    fontSize: responsiveFont(14),
    fontWeight: '700',
    color: '#006D5B',
    backgroundColor: '#E6FFF9', 
    paddingHorizontal: responsiveWidth(8),
    paddingVertical: responsiveHeight(4),
    borderRadius: responsiveWidth(8),
  },
  tripInfo: {
    flex: 1,
  },
  tripId: {
    fontSize: responsiveFont(16),
    fontWeight: '700',
    color: '#1F2937',
  },
  tripDate: {
    fontSize: responsiveFont(12),
    color: '#6B7280',
    marginTop: responsiveHeight(2),
  },
   tripDateTwo: {
    fontSize: responsiveFont(12),
    color: '#000000',
    marginTop: responsiveHeight(2),
    fontWeight:'700'
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: responsiveWidth(10), 
    paddingVertical: responsiveHeight(6),
    borderRadius: responsiveWidth(16), 
    gap: responsiveWidth(6),
  },
  statusDot: {
    width: responsiveWidth(8),
    height: responsiveWidth(8),
    borderRadius: responsiveWidth(4),
  },
  statusGlow: {
    width: responsiveWidth(12),
    height: responsiveWidth(12),
    borderRadius: responsiveWidth(6),
    opacity: 0.3,
    position: 'absolute',
    top: responsiveHeight(-2),
    left: responsiveWidth(-2),
  },
  statusText: {
    fontSize: responsiveFont(10),
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  routeSection: {
    flexDirection: 'row',
    marginBottom: responsiveHeight(16),
    paddingBottom: responsiveHeight(16),
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  routePath: {
    alignItems: 'center',
    marginRight: responsiveWidth(12),
    width: responsiveWidth(24),
  },
  routeDot: {
    width: responsiveWidth(10), 
    height: responsiveWidth(10),
    borderRadius: responsiveWidth(5),
    backgroundColor: '#006D5B',
    zIndex: 2,
    borderWidth: 2,
    borderColor: '#fff',
  },
  routeDotDestination: {
    backgroundColor: '#EF4444',
  },
  routeLine: {
    width: responsiveWidth(2),
    height: responsiveHeight(30),
    backgroundColor: '#E5E7EB',
    marginVertical: responsiveHeight(2),
  },
  routeDetails: {
    flex: 1,
  },
  routeItem: {
    marginBottom: responsiveHeight(8),
  },
  routeLabel: {
    fontSize: responsiveFont(10),
    color: '#6B7280',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  placeText: {
    fontSize: responsiveFont(14),
    color: '#374151',
    fontWeight: '600',
    marginTop: responsiveHeight(2),
  },
  // ⚠️ NEW: Metrics Styles
  tripMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: responsiveHeight(10),
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    marginBottom: responsiveHeight(10),
  },
  metricItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: responsiveWidth(4),
  },
  metricLabel: {
    fontSize: responsiveFont(12),
    color: '#6B7280',
    fontWeight: '500',
  },
  metricValue: {
    fontSize: responsiveFont(13),
    fontWeight: '700',
    color: '#1F2937',
  },
  // ---

  checkedByRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end', // Aligned to the right
    alignItems: 'center',
    marginTop: responsiveHeight(10),
  },
  adminCheckButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: responsiveWidth(12),
    paddingVertical: responsiveHeight(6),
    borderRadius: responsiveWidth(12),
    gap: responsiveWidth(4),
  },
  adminCheckButtonText: {
    color: '#fff',
    fontSize: responsiveFont(10),
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: responsiveHeight(10),
    backgroundColor: '#fff',
    marginHorizontal: responsiveWidth(16),
    marginTop: responsiveHeight(20),
    borderRadius: responsiveWidth(16),
    padding: responsiveWidth(10),
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  emptyIcon: {
    marginBottom: responsiveHeight(16),
  },
  emptyStateTitle: {
    fontSize: responsiveFont(12),
    fontWeight: '700',
    color: '#4B5563',
    marginBottom: responsiveHeight(8),
  },
  emptyStateText: {
    fontSize: responsiveFont(14),
    color: '#9CA3AF',
    textAlign: 'center',
    marginBottom: responsiveHeight(20),
    lineHeight: responsiveHeight(20),
  },
  addFirstTripButton: {
    backgroundColor: '#006D5B',
    paddingHorizontal: responsiveWidth(24),
    paddingVertical: responsiveHeight(12),
    borderRadius: responsiveWidth(12),
  },
  addFirstTripText: {
    color: '#fff',
    fontSize: responsiveFont(14),
    fontWeight: '600',
  },
  fab: {
    position: 'absolute',
    bottom: responsiveHeight(24),
    right: responsiveWidth(24),
    backgroundColor: '#006D5B',
    width: responsiveWidth(60),
    height: responsiveWidth(60),
    borderRadius: responsiveWidth(30),
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: responsiveHeight(4) },
    shadowOpacity: 0.3,
    shadowRadius: responsiveWidth(8),
    elevation: 8,
  },
});

// ⚠️ NEW: Modal specific styles
const modalStyles = StyleSheet.create({
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalView: {
    margin: responsiveWidth(20),
    backgroundColor: 'white',
    borderRadius: responsiveWidth(20),
    padding: responsiveWidth(35),
    alignItems: 'flex-start',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    width: responsiveWidth(370),
  },
  modalTitle: {
    fontSize: responsiveFont(18),
    fontWeight: '700',
    color: '#006D5B',
    marginBottom: responsiveHeight(10),
  },
  tripIdText: {
    fontSize: responsiveFont(14),
    color: '#4B5563',
    marginBottom: responsiveHeight(20),
  },
  label: {
    fontSize: responsiveFont(14),
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: responsiveHeight(5),
    marginTop: responsiveHeight(10),
  },
  input: {
    width: '100%',
    padding: responsiveHeight(10),
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: responsiveWidth(8),
    marginBottom: responsiveHeight(15),
    fontSize: responsiveFont(14),
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: responsiveHeight(15),
  },
  button: {
    borderRadius: responsiveWidth(10),
    padding: responsiveHeight(12),
    elevation: 2,
    flex: 1,
    marginHorizontal: responsiveWidth(5),
    alignItems: 'center',
  },
  buttonClose: {
    backgroundColor: '#9CA3AF',
  },
  buttonSave: {
    backgroundColor: '#006D5B',
  },
  textStyle: {
    color: 'white',
    fontWeight: 'bold',
    textAlign: 'center',
    fontSize: responsiveFont(14),
  },
});

export default VehicleTripsScreen;