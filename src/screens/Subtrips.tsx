import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,

  Alert,
  Modal, // ⚠️ Added Modal
  TextInput, // ⚠️ Added TextInput for the modal
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
// ⚠️ Added AsyncStorage import for Admin check
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/Ionicons';
import { StackNavigationProp } from '@react-navigation/stack';
import { useFocusEffect } from '@react-navigation/native';
import { apiService } from '../services/ApiServices';
// Note: Assuming responsive utils are available
// import { responsiveWidth, responsiveHeight, responsiveFont } from "../utils/responsive";

// --- START: Interface Definitions ---

type RootStackParamList = {
  VehicleTrips: { vehicleNumber: string; vehicle: any };
  TripDetail: { trip: Trip };
  AddTrip: { vehicleNumber: string };
  SubTripDetail: { tripId: Trip, vehicle: any }; // Added for clarity
  AddTripScreen: { vehicle: any, tripId: Trip }; // Renamed from AddTrip
};

type VehicleTripsScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'VehicleTrips'
>;

interface Props {
  navigation: VehicleTripsScreenNavigationProp;
  route: { params: { vehicleNumber: string; vehicle: any; tripId: Trip } }; // ⚠️ tripId added to params
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
  rate?: number; // ⚠️ Added rate
  waight?: number; // ⚠️ Added waight
  checkedBy?: string | null;
}

// --- END: Interface Definitions ---


const VehicleTripsScreen: React.FC<Props> = ({ navigation, route }) => {
  const { vehicleNumber, vehicle, tripId } = route.params;
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [vehicleNumbers, setVehicleNumbers] = useState('');

  // ⚠️ NEW Admin/User State
  const [userType, setUserType] = useState<string | null>(null);
  const isAdmin = userType === 'Admin' || userType === 'admin';

  // ⚠️ NEW State for Edit Modal
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingTrip, setEditingTrip] = useState<Trip | null>(null);
  const [newRate, setNewRate] = useState('');
  const [newWeight, setNewWeight] = useState('');

  // 1. Fetch User Type on mount
  useEffect(() => {
    const fetchUserType = async () => {
      try {
        const type = await AsyncStorage.getItem('userData');
        if (type) {
          const parsed = JSON.parse(type);
          setUserType(parsed?.user_type || null);
        }
      } catch (error) {
        console.error('Error fetching user type:', error);
      }
    };
    fetchUserType();
  }, []);

  // Fetch trips whenever screen is focused
  const fetchTrips = useCallback(async () => {
    try {
      setLoading(true);
      setVehicleNumbers(vehicle?.vehicle_number || '');
      // Use the parent trip ID to fetch child transports
      const response = await apiService.ChildTransportList(tripId.id);
      const data: Trip[] = response || [];
      setTrips(data);
    } catch (err) {
      console.error('Error fetching trips', err);
    } finally {
      setLoading(false);
    }
  }, [vehicle, tripId]); // Depend on vehicle and parent tripId

  useFocusEffect(

    useCallback(() => {
      fetchTrips();
      return () => { };
    }, [fetchTrips])
  );

  // 2. NEW: Edit Transport Modal Handlers
  const openEditModal = (trip: Trip) => {
    if (!isAdmin) {
      Alert.alert("Permission Denied", "Only administrators can edit transport details.");
      return;
    }
    setEditingTrip(trip);
    // Initialize inputs with current values
    setNewRate(String(trip.rate || ''));
    setNewWeight(String(trip.weight || ''));
    setEditModalVisible(true);
  };

  const handleEditTransport = async () => {
    if (!editingTrip) return;

    const rateValue = parseFloat(newRate);
    const weightValue = parseFloat(newWeight);

    // Validation
    if (isNaN(rateValue) || rateValue <= 0) {
      Alert.alert("Validation Error", "Please enter a valid rate (number greater than 0).");
      return;
    }
    if (isNaN(weightValue) || weightValue <= 0) {
      Alert.alert("Validation Error", "Please enter a valid weight (number greater than 0).");
      return;
    }

    setLoading(true);
    try {
      // Assuming apiService.editrate is available and uses transport_id
      const response = await apiService.editrate({
        transport_id: String(editingTrip.id),
        rate: String(rateValue), // API expects string
        waight: String(weightValue),
        type: 'Sub'
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
        Alert.alert("Success", "Sub-Trip details updated successfully!");
        setEditModalVisible(false);
      } else {
        Alert.alert("Error", response?.message || "Failed to update transport details.");
      }

    } catch (error) {
      console.error(`Error updating transport details for trip ${editingTrip.id}:`, error);
      Alert.alert("Error", "A network error occurred during the update.");
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return '#10B981';
      case 'Active': return '#F59E0B';
      case 'upcoming': return '#3B82F6';
      default: return '#6B7280';
    }
  };

  const handleAddTrip = () => {
    navigation.navigate('AddTripScreen', { vehicle, tripId });
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

  const WatermarkStamp = () => (
    <View style={styles.watermarkContainer}>
      <View style={styles.stampOuterCircle}>
        <View style={styles.stampInnerCircle}>
          <Text style={styles.stampText}>SUB</Text>
          <Text style={styles.stampText}>TRIP</Text>
        </View>
      </View>
    </View>
  );

  const renderEditModal = () => (
    <Modal
      animationType="slide"
      transparent={true}
      visible={editModalVisible}
      onRequestClose={() => setEditModalVisible(false)}
    >
      <View style={modalStyles.centeredView}>
        <View style={modalStyles.modalView}>
          <Text style={modalStyles.modalTitle}>Edit Sub-Trip Details</Text>
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

  const renderTripItem = ({ item, index }: { item: Trip; index: number }) => (
    <TouchableOpacity
      style={styles.tripCard}
      onPress={() => navigation.navigate('SubTripDetail', { tripId: item, vehicle: vehicle })}
      activeOpacity={0.7}
    >
      <WatermarkStamp />
      <View style={[styles.statusLine, { backgroundColor: getStatusColor(item.status || 'upcoming') }]} />
      <View style={styles.tripContent}>
        <View style={styles.tripHeader}>
          <View style={styles.tripBasicInfo}>
            <View style={styles.slNoContainer}>
              <Text style={styles.slNo}>{String(index + 1).padStart(2, '0')}</Text>
            </View>
            <View style={styles.tripInfo}>
              <Text style={styles.tripId}>{item.trip_id || `TRIP${item.id}`}</Text>
              <Text style={styles.tripDate}>{formatDate(item.transport_date)}</Text>
            </View>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(item.status || 'upcoming')}20` }]}>
            <StatusIndicator status={item.status || 'upcoming'} />
            <Text style={[styles.statusText, { color: getStatusColor(item.status || 'upcoming') }]}>
              {item.status?.toUpperCase() || 'UPCOMING'}
            </Text>
          </View>
        </View>

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


        <View style={styles.adminActionRow}>
          <TouchableOpacity
            disabled={item.checkedBy === null ? false : true}
            style={[
              styles.adminEditButton,
              { opacity: (item.checkedBy === null ? false : true) ? 0.5 : 1 }
            ]}
            onPress={() => openEditModal(item)}
          >
            <Icon
              name="create-outline"
              size={14}
              color="#fff"
            />
            <Text style={styles.adminEditButtonText}>
              Edit Transport
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );

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
          <Text style={styles.headerTitle}>Sub-Trip History</Text>
          <Text style={styles.vehicleNumber}>{vehicleNumbers} (Parent: {tripId.trip_id || `TRIP${tripId.id}`})</Text>
        </View>
        <View style={styles.headerIcon}>
          <Icon name="car-sport" size={28} color="#fff" />
        </View>
      </View>

      {/* Content */}
      {loading && !trips.length ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#006D5B" />
          <Text style={styles.loadingText}>Loading sub-trips...</Text>
        </View>
      ) : (
        <FlatList
          data={trips}
          keyExtractor={item => item.id.toString()}
          renderItem={renderTripItem}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <Icon name="map-outline" size={80} color="#D1D5DB" />
              </View>
              <Text style={styles.emptyStateTitle}>No Sub-Trips Found</Text>
              <Text style={styles.emptyStateText}>
                No sub-trips recorded for this main trip yet.
              </Text>
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

// --- START: Stylesheet (Merged and Updated) ---

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    backgroundColor: '#006D5B',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  backButton: {
    padding: 8,
    marginRight: 12,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  vehicleNumber: {
    color: '#E0E7FF',
    fontSize: 14,
    fontWeight: '500',
  },
  headerIcon: {
    padding: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: '#6B7280',
    fontSize: 16,
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  tripCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
    borderColor: '#E5E7EB', // Added border for clarity
  },
  watermarkContainer: {
    position: 'absolute',
    top: 70,
    right: 10,
    zIndex: 1,
    opacity: 0.3,
    transform: [{ rotate: '-15deg' }], // Added rotation
  },
  stampOuterCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(79, 70, 229, 0.2)', // Adjusted for SUB TRIP style
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(79, 70, 229, 0.4)',
    borderStyle: 'dashed',
  },
  stampInnerCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(79, 70, 229, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(79, 70, 229, 0.3)',
  },
  stampText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#3B82F6', // Blue color for SUB TRIP
    letterSpacing: 1,
    textAlign: 'center',
    lineHeight: 12,
  },
  statusLine: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    zIndex: 2,
  },
  tripContent: {
    padding: 16,
    marginLeft: 4,
    position: 'relative',
    zIndex: 3,
  },
  tripHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  tripBasicInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  slNoContainer: {
    marginRight: 12,
  },
  slNo: {
    fontSize: 14,
    fontWeight: '700',
    color: '#006D5B',
    backgroundColor: '#E6FFF9', // Changed back to green theme for SL No background
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  tripInfo: {
    flex: 1,
  },
  tripId: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
  },
  tripDate: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusGlow: {
    width: 12,
    height: 12,
    borderRadius: 6,
    opacity: 0.3,
    position: 'absolute',
    top: -2,
    left: -2,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  routeSection: {
    flexDirection: 'row',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  routePath: {
    alignItems: 'center',
    marginRight: 12,
    width: 24,
  },
  routeDot: {
    width: 10, // Adjusted size
    height: 10,
    borderRadius: 5,
    backgroundColor: '#006D5B',
    zIndex: 2,
    borderWidth: 2,
    borderColor: '#fff',
  },
  routeDotDestination: {
    backgroundColor: '#EF4444',
  },
  routeLine: {
    width: 2,
    height: 30,
    backgroundColor: '#E5E7EB',
    marginVertical: 2,
  },
  routeDetails: {
    flex: 1,
  },
  routeItem: {
    marginBottom: 8,
  },
  routeLabel: {
    fontSize: 10,
    color: '#6B7280',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  placeText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '600',
    marginTop: 2,
  },
  // ⚠️ NEW: Admin Action Row Styles
  adminActionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingTop: 8,
  },
  adminEditButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3B82F6', // Blue color
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4,
  },
  adminEditButtonText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
  // ---
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    marginBottom: 16,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#4B5563', // Darker gray
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    backgroundColor: '#006D5B',
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
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
    margin: 20,
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 35,
    alignItems: 'flex-start',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    width: 400,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#006D5B',
    marginBottom: 10,
  },
  tripIdText: {
    fontSize: 14,
    color: '#4B5563',
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 5,
    marginTop: 10,
  },
  input: {
    width: '100%',
    padding: 10,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    marginBottom: 15,
    fontSize: 14,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 15,
  },
  button: {
    borderRadius: 10,
    padding: 12,
    elevation: 2,
    flex: 1,
    marginHorizontal: 5,
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
    fontSize: 14,
  },
});

export default VehicleTripsScreen;