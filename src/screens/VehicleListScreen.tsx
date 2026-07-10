import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Modal,
  Pressable,
  Alert,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  ScrollView,
  Dimensions
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { StackNavigationProp } from '@react-navigation/stack';
import { apiService, Vehicle } from '../services/ApiServices';
import {
  widthPercentageToDP as wp,
  heightPercentageToDP as hp,
} from 'react-native-responsive-screen';
import AsyncStorage from '@react-native-async-storage/async-storage';

type RootStackParamList = {
  VehicleList: undefined;
  VehicleDetail: { vehicle: Vehicle };
  AddVehicle: undefined;
};

type VehicleListScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'VehicleList'
>;

interface Props {
  navigation: VehicleListScreenNavigationProp;
}

const VehicleListScreen: React.FC<Props> = ({ navigation }) => {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [usertype, setusertype] = useState('');
  const [page, setPage] = useState<number>(1);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [addModalVisible, setAddModalVisible] = useState<boolean>(false);
  const [editModalVisible, setEditModalVisible] = useState<boolean>(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [deleteModalVisible, setDeleteModalVisible] = useState<boolean>(false);
  const [deletingVehicleId, setDeletingVehicleId] = useState<number | null>(null);

  useEffect(() => {
    getUserType();
    loadVehicles(true);
  }, []);

  const getUserType = async () => {
    try {
      const data = await AsyncStorage.getItem('userData');
      if (data) {
        const parsed = JSON.parse(data);
        setusertype(parsed.user_type);
      } else {
        console.log("No user data found");
      }
    } catch (error) {
      console.log("Error reading userData", error);
    }
  };

  const loadVehicles = async (reset = false) => {
    if (loading || (!reset && !hasMore)) return;
    const currentPage = reset ? 1 : page;
    setLoading(true);
    try {
      const response = await apiService.fetchVehicles(currentPage, 5);
      const newVehicles = response.vehicles || [];
      if (reset) {
        setVehicles(newVehicles);
        setPage(2);
      } else {
        setVehicles(prev => {
          const combined = [...prev, ...newVehicles];
          return combined.filter((v, i, arr) => i === arr.findIndex(x => x.id === v.id));
        });
        setPage(prev => prev + 1);
      }

      setHasMore(newVehicles.length > 0 && response.hasMore);
    } catch (error: any) {
      console.error(error);
      Alert.alert('Error', error.response?.data?.message || 'Failed to load vehicles');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    setSearchQuery('');
    setHasMore(true);
    loadVehicles(true);
  };

  const filteredVehicles = vehicles.filter(vehicle => {
    const q = searchQuery.toLowerCase();
    return (
      vehicle.vehicle_number.toLowerCase().includes(q) ||
      vehicle.driver_name.toLowerCase().includes(q) ||
      vehicle.vehicle_type.toLowerCase().includes(q) ||
      vehicle.vehicle_model.toLowerCase().includes(q)
    );
  });

  const openEditModal = (vehicle: Vehicle) => {
    setEditingVehicle(vehicle);
    setEditModalVisible(true);
  };

  const confirmDelete = (id: number) => {
    setDeletingVehicleId(id);
    setDeleteModalVisible(true);
  };

  const deleteVehicle = async (id: number) => {
    try {
      setDeleteModalVisible(false);
      setDeletingVehicleId(null);
      
      await apiService.deleteVehicle(id);
      setVehicles(prev => prev.filter(v => v.id !== id));
      Alert.alert('Deleted', 'Vehicle removed successfully');
    } catch (error: any) {
      console.error(error);
      Alert.alert('Error', 'Failed to delete vehicle');
    }
  };

  const viewVehicleDetails = (vehicle: Vehicle) => {
    navigation.navigate('VehicleDetail', { vehicle });
  };

  const renderVehicleItem = ({ item }: { item: Vehicle }) => (
    <View style={styles.vehicleCard}>
     

      <View style={styles.cardContent}>
        <View style={styles.cardHeader}>
          <View style={styles.vehicleInfo}>
            <Text style={styles.vehicleNumber}>{item.vehicle_number}</Text>
            <View style={styles.vehicleDetails}>
              <View style={styles.detailBadge}>
                <Text style={styles.detailText}>{item.vehicle_type}</Text>
              </View>
              <View style={styles.detailBadge}>
                <Text style={styles.detailText}>{item.vehicle_model}</Text>
              </View>
            </View>
          </View>
          <View style={styles.actions}>
            <TouchableOpacity onPress={() => viewVehicleDetails(item)} style={styles.iconButton}>
              <Icon name="eye" size={wp('5%')} color="#3B82F6" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => openEditModal(item)} style={styles.iconButton}>
              <Icon name="create" size={wp('5%')} color="#10B981" />
            </TouchableOpacity>
            {usertype == 'Admin' ? (
              <TouchableOpacity onPress={() => confirmDelete(item.id)} style={styles.iconButton}>
                <Icon name="trash" size={wp('5%')} color="#EF4444" />
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
        
        <View style={styles.driverInfo}>
          <View style={styles.infoRow}>
            <Icon name="person" size={wp('4%')} color="#6B7280" />
            <Text style={styles.infoText}>{item.driver_name}</Text>
          </View>
          <View style={styles.infoRow}>
            <Icon name="call" size={wp('4%')} color="#6B7280" />
            <Text style={styles.infoText}>{item.driver_number}</Text>
          </View>
        </View>
      </View>
    </View>
  );

  const renderFooter = () =>
    loading ? (
      <View style={styles.footer}>
        {hasMore ? <ActivityIndicator size="large" color="#4F46E5" /> : <Text style={styles.noMoreText}>No more vehicles</Text>}
      </View>
    ) : null;

  return (
    <View style={styles.container}>
      {/* Header */}
      
      {/* Search */}
      <View style={styles.searchContainer}>
        <Icon name="search" size={wp('5%')} color="#9CA3AF" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search vehicles, drivers, type, or model..."
          placeholderTextColor="#6B7280"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Icon name="close-circle" size={wp('5%')} color="#9CA3AF" />
          </TouchableOpacity>
        )}
      </View>

      {/* Vehicle List */}
      <FlatList
        data={filteredVehicles}
        renderItem={renderVehicleItem}
        keyExtractor={item => item.id.toString()}
        contentContainerStyle={styles.listContent}
        onEndReached={() => loadVehicles(false)}
        onEndReachedThreshold={0.1}
        onRefresh={handleRefresh}
        refreshing={refreshing}
        ListFooterComponent={renderFooter}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          !loading && (
            <View style={styles.emptyState}>
              <Icon name="car-sport-outline" size={wp('20%')} color="#D1D5DB" />
              <Text style={styles.emptyStateText}>No vehicles found</Text>
              <Text style={styles.emptyStateSubtext}>
                {searchQuery ? 'Try adjusting your search' : 'Add your first vehicle to get started'}
              </Text>
            </View>
          )
        }
      />

      <TouchableOpacity style={styles.fab} onPress={() => setAddModalVisible(true)}>
        <Icon name="add" size={wp('8%')} color="#fff" />
      </TouchableOpacity>

      {/* Modals */}
      {addModalVisible && (
        <AddVehicleModal
          visible={addModalVisible}
          onClose={() => setAddModalVisible(false)}
          onSubmit={(v: Vehicle) => setVehicles(prev => [v, ...prev])}
        />
      )}

      {editModalVisible && editingVehicle && (
        <EditVehicleModal
          vehicle={editingVehicle}
          visible={editModalVisible}
          onClose={() => setEditModalVisible(false)}
          onSubmit={(v: Vehicle) =>
            setVehicles(prev => prev.map(item => (item.id === v.id ? v : item)))
          }
        />
      )}
      
      {deleteModalVisible && deletingVehicleId !== null && (
        <DeleteConfirmationModal
          vehicleId={deletingVehicleId}
          visible={deleteModalVisible}
          onClose={() => setDeleteModalVisible(false)}
          onConfirmDelete={deleteVehicle}
        />
      )}
    </View>
  );
};

// ================= Delete Confirmation Modal with CAPTCHA =================
const DeleteConfirmationModal = ({ vehicleId, visible, onClose, onConfirmDelete }: { vehicleId: number, visible: boolean, onClose: () => void, onConfirmDelete: (id: number) => Promise<void> }) => {
    const [num1, setNum1] = useState(0);
    const [num2, setNum2] = useState(0);
    const [operator, setOperator] = useState<string>('');
    const [correctAnswer, setCorrectAnswer] = useState(0);
    const [userAnswer, setUserAnswer] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        generateCaptcha();
    }, []);

    const generateCaptcha = () => {
        const n1 = Math.floor(Math.random() * 10) + 1;
        const n2 = Math.floor(Math.random() * 10) + 1;
        const operators = ['+', '-'];
        const op = operators[Math.floor(Math.random() * operators.length)];

        let result = 0;
        let finalN1 = n1;
        let finalN2 = n2;

        if (op === '+') {
            result = n1 + n2;
        } else if (op === '-') {
            if (n1 < n2) {
                finalN1 = n2;
                finalN2 = n1;
            }
            result = finalN1 - finalN2;
        }

        setNum1(finalN1);
        setNum2(finalN2);
        setOperator(op);
        setCorrectAnswer(result);
        setUserAnswer('');
    };

    const handleDelete = async () => {
        if (loading) return;

        if (!userAnswer.trim()) {
            Alert.alert('Captcha Required', 'Please solve the math problem to confirm deletion.');
            return;
        }

        const answer = parseInt(userAnswer, 10);

        if (answer === correctAnswer) {
            setLoading(true);
            Alert.alert('Confirm Deletion', 'Vehicle deletion will proceed.', [
                {
                    text: 'Continue',
                    onPress: async () => {
                        await onConfirmDelete(vehicleId);
                        setLoading(false);
                    }
                }
            ]);
        } else {
            Alert.alert('Incorrect CAPTCHA', 'Please solve the math problem correctly to delete the vehicle.');
            generateCaptcha();
        }
    };

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
                <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                    <View style={styles.modalOverlayPressable}>
                        <View style={styles.modalContent}>
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>Confirm Delete</Text>
                                <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                                    <Icon name="close" size={wp('6%')} color="#6B7280" />
                                </TouchableOpacity>
                            </View>

                            <ScrollView
                                style={styles.modalBody}
                                keyboardShouldPersistTaps="handled"
                                contentContainerStyle={{ flexGrow: 1 }}
                            >
                                <Text style={styles.infoText}>
                                    To confirm deletion of this vehicle, please solve the mathematical captcha below. This action is permanent.
                                </Text>

                                <View style={localStyles.captchaContainer}>
                                    <Text style={localStyles.captchaText}>
                                        {num1} {operator} {num2} =
                                    </Text>
                                    <TextInput
                                        style={[styles.input, localStyles.captchaInput]}
                                        placeholderTextColor={'black'}
                                        value={userAnswer}
                                        onChangeText={setUserAnswer}
                                        keyboardType="numeric"
                                        maxLength={3}
                                    />
                                </View>
                            </ScrollView>

                            <View style={styles.modalActions}>
                                <Pressable style={styles.cancelBtn} onPress={onClose} disabled={loading}>
                                    <Text style={styles.cancelBtnText}>Cancel</Text>
                                </Pressable>
                                <Pressable style={localStyles.deleteBtn} onPress={handleDelete} disabled={loading}>
                                    {loading ? <ActivityIndicator color="#fff" /> : <Text style={localStyles.deleteBtnText}>Confirm Delete</Text>}
                                </Pressable>
                            </View>
                        </View>
                    </View>
                </TouchableWithoutFeedback>
            </KeyboardAvoidingView>
        </Modal>
    );
};

// ================= Add Vehicle Modal =================
const AddVehicleModal = ({ visible, onClose, onSubmit }: any) => {
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [vehicleType, setVehicleType] = useState('');
  const [vehicleModel, setVehicleModel] = useState('');
  const [driverName, setDriverName] = useState('');
  const [driverPhone, setDriverPhone] = useState('');
  const [loading, setLoading] = useState(false);
  
  const resetForm = () => {
    setVehicleNumber('');
    setVehicleType('');
    setVehicleModel('');
    setDriverName('');
    setDriverPhone('');
  };

  const validateForm = (): boolean => {
    if (!vehicleNumber.trim())
      return Alert.alert('Validation', 'Vehicle number required'), false;

    const vehicleRegex = /^[A-Z0-9]+$/;
    if (!vehicleRegex.test(vehicleNumber.trim()))
      return Alert.alert(
        'Validation',
        'Vehicle number must contain only capital letters (A–Z) and numbers (0–9).'
      ), false;

    if (!vehicleType.trim())
      return Alert.alert('Validation', 'Vehicle type required'), false;

    if (!vehicleModel.trim())
      return Alert.alert('Validation', 'Vehicle model required'), false;

    if (!driverName.trim())
      return Alert.alert('Validation', 'Driver name required'), false;

    if (!driverPhone.trim())
      return Alert.alert('Validation', 'Driver phone required'), false;

    if (!/^\d{10}$/.test(driverPhone))
      return Alert.alert('Validation', 'Driver phone must be 10 digits'), false;

    return true;
  };

  const handleAdd = async () => {
    if (!validateForm()) return;
    setLoading(true);

    try {
      const newVehicle = await apiService.addVehicle({
        vehicle_number: vehicleNumber.trim(),
        vehicle_type: vehicleType.trim(),
        vehicle_model: vehicleModel.trim(),
        driver_name: driverName.trim(),
        driver_number: driverPhone.trim(),
      });

      onSubmit(newVehicle);
      resetForm();
      onClose();
      Alert.alert('Success', 'Vehicle added');

    } catch (error: any) {
      if (error?.response?.status === 422) {
        const errors = error?.response?.data?.errors;
        if (errors) {
          const errorMessages = Object.values(errors).flat().join('\n');
          Alert.alert('Validation Error', errorMessages);
        } else {
          Alert.alert('Validation Error', error?.response?.data?.message || 'Invalid data submitted');
        }
      } else {
        Alert.alert('Error', 'Failed to add vehicle');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.modalOverlayPressable}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Add Vehicle</Text>
                <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                  <Icon name="close" size={wp('6%')} color="#6B7280" />
                </TouchableOpacity>
              </View>

              <ScrollView
                style={styles.modalBody}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={{ flexGrow: 1 }}
              >
                <TextInput
                  style={styles.input}
                  placeholder="Vehicle Number *"
                  value={vehicleNumber}
                  placeholderTextColor={'#6B7280'}
                  onChangeText={setVehicleNumber}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Vehicle Type *"
                  value={vehicleType}
                  placeholderTextColor={'#6B7280'}
                  onChangeText={setVehicleType}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Vehicle Model *"
                  value={vehicleModel}
                  placeholderTextColor={'#6B7280'}
                  onChangeText={setVehicleModel}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Driver Name *"
                  value={driverName}
                  placeholderTextColor={'#6B7280'}
                  onChangeText={setDriverName}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Driver Phone (10 digits) *"
                  value={driverPhone}
                  placeholderTextColor={'#6B7280'}
                  onChangeText={setDriverPhone}
                  keyboardType="phone-pad"
                  maxLength={10}
                />
              </ScrollView>

              <View style={styles.modalActions}>
                <Pressable style={styles.cancelBtn} onPress={onClose} disabled={loading}>
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </Pressable>
                <Pressable style={styles.saveBtn} onPress={handleAdd} disabled={loading}>
                  {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Save</Text>}
                </Pressable>
              </View>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </Modal>
  );
};

// ================= Edit Vehicle Modal =================
const EditVehicleModal = ({ vehicle, visible, onClose, onSubmit }: any) => {
  const [vehicleNumber, setVehicleNumber] = useState(vehicle.vehicle_number);
  const [vehicleType, setVehicleType] = useState(vehicle.vehicle_type);
  const [vehicleModel, setVehicleModel] = useState(vehicle.vehicle_model);
  const [driverName, setDriverName] = useState(vehicle.driver_name);
  const [driverPhone, setDriverPhone] = useState(vehicle.driver_number);
  const [loading, setLoading] = useState(false);

  const validateForm = (): boolean => {
    if (!vehicleNumber.trim()) return Alert.alert('Validation', 'Vehicle number required'), false;
    if (!vehicleType.trim()) return Alert.alert('Validation', 'Vehicle type required'), false;
    if (!vehicleModel.trim()) return Alert.alert('Validation', 'Vehicle model required'), false;
    if (!driverName.trim()) return Alert.alert('Validation', 'Driver name required'), false;
    if (!driverPhone.trim()) return Alert.alert('Validation', 'Driver phone required'), false;
    if (!/^\d{10}$/.test(driverPhone)) return Alert.alert('Validation', 'Driver phone must be 10 digits'), false;
    return true;
  };

  const handleUpdate = async () => {
    if (!validateForm()) return;
    setLoading(true);
    try {
      const updatedVehicle = await apiService.updateVehicle(vehicle.id, {
        vehicle_number: vehicleNumber.trim(),
        vehicle_type: vehicleType.trim(),
        vehicle_model: vehicleModel.trim(),
        driver_name: driverName.trim(),
        driver_number: driverPhone.trim(),
      });
      onSubmit(updatedVehicle);
      onClose();
      Alert.alert('Success', 'Vehicle updated');
    } catch (error: any) {
      console.error(error);
      Alert.alert('Error', 'Failed to update vehicle');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.modalOverlayPressable}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Edit Vehicle</Text>
                <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                  <Icon name="close" size={wp('6%')} color="#6B7280" />
                </TouchableOpacity>
              </View>

              <ScrollView
                style={styles.modalBody}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={{ flexGrow: 1 }}
              >
                <TextInput
                  style={styles.input}
                  placeholder="Vehicle Number *"
                  placeholderTextColor={'#6B7280'}
                  value={vehicleNumber}
                  onChangeText={setVehicleNumber}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Vehicle Type *"
                  value={vehicleType}
                  onChangeText={setVehicleType}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Vehicle Model *"
                  value={vehicleModel}
                  onChangeText={setVehicleModel}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Driver Name *"
                  value={driverName}
                  onChangeText={setDriverName}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Driver Phone (10 digits) *"
                  value={driverPhone}
                  onChangeText={setDriverPhone}
                  keyboardType="phone-pad"
                  maxLength={10}
                />
              </ScrollView>

              <View style={styles.modalActions}>
                <Pressable style={styles.cancelBtn} onPress={onClose} disabled={loading}>
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </Pressable>
                <Pressable style={styles.saveBtn} onPress={handleUpdate} disabled={loading}>
                  {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Update</Text>}
                </Pressable>
              </View>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </Modal>
  );
};

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6'
  },
  header: {
    paddingHorizontal: wp('4%'),
    paddingTop: hp('3%'),
    paddingBottom: hp('1%'),
    backgroundColor: '#fff',
  },
  headerTitle: {
    fontSize: wp('6%'),
    fontWeight: '700',
    color: '#1F2937',
  },
  headerSubtitle: {
    fontSize: wp('3.5%'),
    color: '#6B7280',
    marginTop: hp('0.5%'),
  },
  searchContainer: {
    marginHorizontal: wp('4%'),
    marginVertical: hp('2%'),
    backgroundColor: '#fff',
    borderRadius: wp('3%'),
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: wp('4%'),
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: wp('1.25%'),
    elevation: 3,
  },
  searchInput: {
    flex: 1,
    paddingVertical: hp('2%'),
    paddingHorizontal: wp('2%'),
    fontSize: wp('4%'),
    color: '#111827',
  },
  searchIcon: {
    marginRight: wp('2%')
  },
  listContent: {
    paddingHorizontal: wp('4%'),
    paddingBottom: hp('12%')
  },
  vehicleCard: {
    borderRadius: wp('4%'),
    marginBottom: wp('4%'),
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: wp('1.25%'),
    elevation: 2,
    overflow: 'hidden',
    position: 'relative',
  },
  watermarkContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  watermarkText: {
    fontSize: wp('5%'),
    fontWeight: '900',
    color: '#006D5B', // Very light gray with transparency
    transform: [{ rotate: '-10deg' }],
    textAlign: 'left',
   
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 1,
  },
  cardContent: {
    position: 'relative',
    zIndex: 2,
    padding: wp('4%'),
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: hp('1.5%'),
  },
  vehicleInfo: {
    flex: 1,
  },
  vehicleNumber: {
    fontSize: wp('5%'),
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: hp('1%'),
  },
  vehicleDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: wp('2%'),
  },
  detailBadge: {
    backgroundColor: 'rgba(243, 244, 246, 0.8)',
    paddingHorizontal: wp('3%'),
    paddingVertical: hp('0.5%'),
    borderRadius: wp('2%'),
    borderWidth: 1,
    borderColor: 'rgba(229, 231, 235, 0.5)',
  },
  detailText: {
    fontSize: wp('3.5%'),
    fontWeight: '600',
    color: '#4B5563',
  },
  actions: {
    flexDirection: 'row',
    gap: wp('1.5%'),
  },
  iconButton: {
    padding: wp('2%'),
    borderRadius: wp('2%'),
    backgroundColor: 'rgba(243, 244, 246, 0.8)',
    borderWidth: 1,
    borderColor: 'rgba(229, 231, 235, 0.5)',
  },
  driverInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: wp('3%'),
    paddingTop: hp('1%'),
    borderTopWidth: 1,
    borderTopColor: 'rgba(229, 231, 235, 0.5)',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp('2%'),
    flex: 1,
    minWidth: wp('40%'),
  },
  infoText: {
    fontSize: wp('3.5%'),
    color: '#374151',
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    marginTop: hp('10%'),
    padding: wp('5%')
  },
  emptyStateText: {
    fontSize: wp('4.5%'),
    fontWeight: '600',
    color: '#6B7280',
    marginTop: hp('2%'),
  },
  emptyStateSubtext: {
    fontSize: wp('3.5%'),
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: hp('1%'),
  },
  fab: {
    position: 'absolute',
    bottom: hp('3%'),
    right: wp('6%'),
    backgroundColor: '#006D5B',
    width: wp('16%'),
    height: wp('16%'),
    borderRadius: wp('8%'),
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: wp('1.25%'),
    zIndex: 10,
  },
  modalOverlayPressable: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: wp('5%'),
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: wp('4%'),
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: wp('2.5%'),
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: wp('5%'),
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: wp('5%'),
    fontWeight: '700',
    color: '#1F2937'
  },
  closeButton: {
    padding: wp('1%')
  },
  modalBody: {
    padding: wp('5%'),
    maxHeight: hp('50%')
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: wp('2%'),
    padding: wp('3%'),
    marginBottom: hp('2%'),
    fontSize: wp('4%'),
    backgroundColor: '#f9fafb',
    color: '#111827',
    fontWeight: '600',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: wp('5%'),
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    gap: wp('3%'),
  },
  cancelBtn: {
    paddingHorizontal: wp('5%'),
    paddingVertical: hp('1.5%'),
    backgroundColor: '#F3F4F6',
    borderRadius: wp('2%'),
    minWidth: wp('20%'),
    alignItems: 'center',
  },
  saveBtn: {
    paddingHorizontal: wp('5%'),
    paddingVertical: hp('1.5%'),
    backgroundColor: '#006D5B',
    borderRadius: wp('2%'),
    minWidth: wp('20%'),
    alignItems: 'center',
  },
  cancelBtnText: {
    color: '#374151',
    fontWeight: '600',
    fontSize: wp('4%')
  },
  saveBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: wp('4%')
  },
  footer: {
    padding: wp('5%'),
    alignItems: 'center'
  },
  noMoreText: {
    fontSize: wp('4%'),
    color: '#6B7280',
    fontWeight: '500',
  },
});

// New local styles for the DeleteConfirmationModal
const localStyles = StyleSheet.create({
    captchaContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: hp('2%'),
        marginBottom: hp('2%'),
        padding: wp('4%'),
        backgroundColor: '#F9FAFB',
        borderRadius: wp('2%'),
        borderWidth: 1,
        borderColor: '#D1D5DB',
    },
    captchaText: {
        fontSize: wp('4.5%'),
        fontWeight: '700',
        color: '#1F2937',
    },
    captchaInput: {
        flex: 1,
        marginLeft: wp('4%'),
        marginBottom: 0,
        padding: wp('3%'),
        textAlign: 'center',
    },
    deleteBtn: {
        paddingHorizontal: wp('5%'),
        paddingVertical: hp('1.5%'),
        backgroundColor: '#EF4444',
        borderRadius: wp('2%'),
        minWidth: wp('30%'),
        alignItems: 'center',
    },
    deleteBtnText: {
        color: '#fff',
        fontWeight: '600',
        fontSize: wp('4%'),
    },
});

export default VehicleListScreen;