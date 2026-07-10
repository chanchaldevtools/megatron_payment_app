import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  RefreshControl,
  ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { apiService } from '../services/ApiServices';

const DriverManagementScreen = () => {
  const navigation = useNavigation();

  // State Management
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentDriver, setCurrentDriver] = useState({
    id: '',
    name: '',
    phone_number: '',
    vehicle_number: '',
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  // Fetch drivers from API
  const fetchDrivers = async () => {
    try {
      setLoading(true);
      const response = await apiService.GetDrivers();
      
      // Check if response has data in different structures
      if (response && response.drivers) {
        // If response has {drivers: [...]} structure
        setDrivers(response.drivers);
      } else if (response && response.data) {
        // If response has {data: [...]} structure
        setDrivers(response.data);
      } else if (Array.isArray(response)) {
        // If response is directly an array
        setDrivers(response);
      } else if (response && response.status && response.data) {
        // If response has {status: true, data: [...]} structure
        setDrivers(response.data);
      } else {
        setDrivers([]);
      }
    } catch (error) {
      console.error('Error fetching drivers:', error);
      Alert.alert('Error', 'Failed to fetch drivers. Please try again.');
      setDrivers([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Create new driver
  const handleCreateDriver = async () => {
    try {
      setSaving(true);
      const driverData = {
        name: currentDriver.name,
        phone_number: currentDriver.phone_number,
        vehicle_number: currentDriver.vehicle_number
      };

      const response = await apiService.CreateDriver(driverData);
      
      if (response && (response.status === true || response.driver)) {
        Alert.alert('Success', response.message || 'Driver created successfully');
        setModalVisible(false);
        resetForm();
        fetchDrivers(); // Refresh the list
      } else {
        Alert.alert('Error', response.message || 'Failed to create driver');
      }
    } catch (error) {
      console.error('Create driver error:', error);
      
      // Handle validation errors
      if (error.errors) {
        setErrors(error.errors);
        Alert.alert('Validation Error', 'Please check the form fields');
      } else {
        Alert.alert('Error', error.message || 'Failed to create driver');
      }
    } finally {
      setSaving(false);
    }
  };

  // Update driver
  const handleUpdateDriver = async () => {
    try {
      setSaving(true);
      const driverData = {
        name: currentDriver.name,
        phone_number: currentDriver.phone_number,
        vehicle_number: currentDriver.vehicle_number
      };

      const response = await apiService.UpdateDriver(currentDriver.id, driverData);
      
      if (response && (response.status === true || response.driver)) {
        Alert.alert('Success', response.message || 'Driver updated successfully');
        setModalVisible(false);
        resetForm();
        fetchDrivers(); // Refresh the list
      } else {
        Alert.alert('Error', response.message || 'Failed to update driver');
      }
    } catch (error) {
      console.error('Update driver error:', error);
      
      // Handle validation errors
      if (error.errors) {
        setErrors(error.errors);
        Alert.alert('Validation Error', 'Please check the form fields');
      } else {
        Alert.alert('Error', error.message || 'Failed to update driver');
      }
    } finally {
      setSaving(false);
    }
  };

  // Delete driver
  const handleDeleteDriver = async (id, name) => {
    Alert.alert(
      'Delete Driver',
      `Are you sure you want to delete ${name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await apiService.DeleteDriver(id);
              
              if (response && response.status === true) {
                Alert.alert('Success', response.message || 'Driver deleted successfully');
                fetchDrivers(); // Refresh the list
              } else {
                Alert.alert('Error', response?.message || 'Failed to delete driver');
              }
            } catch (error) {
              console.error('Delete driver error:', error);
              Alert.alert('Error', error.message || 'Failed to delete driver');
            }
          }
        },
      ]
    );
  };

  // Handle search
  const handleSearch = (text) => {
    setSearchQuery(text);
    if (text.trim() === '') {
      fetchDrivers();
    }
  };

  // Filtered drivers based on search
  const filteredDrivers = useMemo(() => {
    if (!searchQuery.trim()) return drivers;
    
    return drivers.filter(driver =>
      driver.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      driver.phone_number?.includes(searchQuery) ||
      driver.vehicle_number?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [drivers, searchQuery]);

  const resetForm = () => {
    setCurrentDriver({ 
      id: '', 
      name: '', 
      phone_number: '', 
      vehicle_number: '' 
    });
    setEditMode(false);
    setErrors({});
  };

  const handleSaveDriver = () => {
    if (!currentDriver.name || !currentDriver.phone_number || !currentDriver.vehicle_number) {
      Alert.alert('Missing Info', 'Please fill in all required fields.');
      return;
    }

    if (editMode) {
      handleUpdateDriver();
    } else {
      handleCreateDriver();
    }
  };

  const renderDriverItem = ({ item }) => (
    <View style={styles.driverCard}>
      <TouchableOpacity 
        style={styles.cardContent} 
        onPress={() => navigation.navigate('DriverDetails', { driverId: item})}
      >
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {item.name?.charAt(0)?.toUpperCase() || 'D'}
          </Text>
        </View>
        <View style={styles.driverInfo}>
          <Text style={styles.driverName}>{item.name || 'Unnamed Driver'}</Text>
          <View style={styles.detailRow}>
            <Icon name="phone" size={14} color="#666" />
            <Text style={styles.detailText}>{item.phone_number || 'N/A'}</Text>
          </View>
          <View style={styles.detailRow}>
            <Icon name="directions-car" size={14} color="#666" />
            <Text style={styles.detailText}>{item.vehicle_number || 'N/A'}</Text>
          </View>
          {item.created_at && (
            <View style={styles.detailRow}>
              <Icon name="calendar-today" size={14} color="#666" />
              <Text style={styles.detailText}>
                Added: {new Date(item.created_at).toLocaleDateString()}
              </Text>
            </View>
          )}
        </View>
      </TouchableOpacity>

      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={[styles.iconButton, styles.editButton]}
          onPress={() => {
            setCurrentDriver({
              id: item.id,
              name: item.name,
              phone_number: item.phone_number,
              vehicle_number: item.vehicle_number
            });
            setEditMode(true);
            setErrors({});
            setModalVisible(true);
          }}
        >
          <Icon name="edit" size={18} color="#3498db" />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.iconButton, styles.deleteButton]}
          onPress={() => handleDeleteDriver(item.id, item.name)}
        >
          <Icon name="delete" size={18} color="#e74c3c" />
        </TouchableOpacity>
      </View>
    </View>
  );

  // Load drivers on focus
  useFocusEffect(
    useCallback(() => {
      fetchDrivers();
    }, [])
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Driver Management</Text>
        <Text style={styles.headerSubtitle}>
          Total Drivers: {drivers.length}
        </Text>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Icon name="search" size={20} color="#999" />
        <TextInput
          style={styles.searchInput} placeholderTextColor="#000"
          placeholder="Search by name, phone, or vehicle..."
          value={searchQuery}
          onChangeText={handleSearch}
        />
        {searchQuery ? (
          <TouchableOpacity onPress={() => handleSearch('')}>
            <Icon name="close" size={20} color="#999" />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Loading Indicator */}
      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#006D5B" />
          <Text style={styles.loadingText}>Loading drivers...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredDrivers}
          renderItem={renderDriverItem}
          keyExtractor={item => item.id?.toString() || Math.random().toString()}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                fetchDrivers();
              }}
              colors={['#006D5B']}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Icon name="person-off" size={60} color="#ccc" />
              <Text style={styles.emptyText}>No drivers found</Text>
              {searchQuery ? (
                <Text style={styles.emptySubtext}>
                  Try a different search term
                </Text>
              ) : (
                <TouchableOpacity 
                  style={styles.addFirstButton}
                  onPress={() => { resetForm(); setModalVisible(true); }}
                >
                  <Text style={styles.addFirstButtonText}>Add Your First Driver</Text>
                </TouchableOpacity>
              )}
            </View>
          }
        />
      )}

      {/* Floating Action Button */}
      <TouchableOpacity 
        style={styles.fab} 
        onPress={() => { resetForm(); setModalVisible(true); }}
        disabled={saving}
      >
        <Icon name="add" size={30} color="#fff" />
      </TouchableOpacity>

      {/* Add/Edit Modal */}
      <Modal 
        visible={modalVisible} 
        animationType="slide" 
        transparent
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editMode ? 'Edit Driver' : 'Add New Driver'}
              </Text>
              <TouchableOpacity 
                onPress={() => setModalVisible(false)}
                disabled={saving}
              >
                <Icon name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <ScrollView 
              contentContainerStyle={styles.form}
              showsVerticalScrollIndicator={false}
            >
              <Text style={styles.label}>Full Name *</Text>
              <TextInput
                style={[styles.input, errors.name && styles.inputError]}
                value={currentDriver.name}
                onChangeText={t => {
                  setCurrentDriver({...currentDriver, name: t});
                  if (errors.name) setErrors({...errors, name: null});
                }}
                placeholder="Enter driver's full name"
                editable={!saving}
              />
              {errors?.name && (
                <Text style={styles.errorText}>{errors.name[0]}</Text>
              )}

              <Text style={styles.label}>Phone Number *</Text>
              <TextInput
                style={[styles.input, errors.phone_number && styles.inputError]}
                value={currentDriver.phone_number}
                onChangeText={t => {
                  setCurrentDriver({...currentDriver, phone_number: t});
                  if (errors.phone_number) setErrors({...errors, phone_number: null});
                }}
                keyboardType="phone-pad"
                placeholder="Enter phone number"
                editable={!saving}
              />
              {errors?.phone_number && (
                <Text style={styles.errorText}>{errors.phone_number[0]}</Text>
              )}

              <Text style={styles.label}>Vehicle Number *</Text>
              <TextInput
                style={[styles.input, errors.vehicle_number && styles.inputError]}
                value={currentDriver.vehicle_number}
                onChangeText={t => {
                  setCurrentDriver({...currentDriver, vehicle_number: t});
                  if (errors.vehicle_number) setErrors({...errors, vehicle_number: null});
                }}
                placeholder="Enter vehicle number (e.g., ABC-1234)"
                autoCapitalize="characters"
                editable={!saving}
              />
              {errors?.vehicle_number && (
                <Text style={styles.errorText}>{errors.vehicle_number[0]}</Text>
              )}

              <View style={styles.modalButtons}>
                <TouchableOpacity 
                  style={[styles.cancelBtn, saving && styles.disabledBtn]}
                  onPress={() => setModalVisible(false)}
                  disabled={saving}
                >
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.saveBtn, saving && styles.disabledBtn]}
                  onPress={handleSaveDriver}
                  disabled={saving}
                >
                  {saving ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.saveBtnText}>
                      {editMode ? 'Update Driver' : 'Add Driver'}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' },
  header: { padding: 20, backgroundColor: '#006D5B' },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#f7fafdff' },
  headerSubtitle: { fontSize: 14, color: '#ffffffff', marginTop: 4 },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    margin: 16,
    paddingHorizontal: 15,
    borderRadius: 12,
    height: 50,
    borderWidth: 1,
    borderColor: '#E1E6ED',
  },
  searchInput: { flex: 1, marginLeft: 10, fontSize: 16 },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
    fontSize: 16,
  },
  listContent: { paddingHorizontal: 16, paddingBottom: 100 },
  driverCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  cardContent: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#E8F0FE',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  avatarText: { color: '#006D5B', fontWeight: 'bold', fontSize: 18 },
  driverInfo: { flex: 1 },
  driverName: { fontSize: 17, fontWeight: '600', color: '#1A1C1E', marginBottom: 4 },
  detailRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 2 },
  detailText: { fontSize: 13, color: '#6C757D', marginLeft: 6 },
  actionButtons: { flexDirection: 'row', gap: 5 },
  iconButton: { padding: 8, borderRadius: 8, backgroundColor: '#F8F9FA' },
  fab: {
    position: 'absolute',
    bottom: 30,
    right: 25,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#006D5B',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    paddingBottom: 40,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  modalTitle: { fontSize: 20, fontWeight: 'bold' },
  form: { padding: 20 },
  label: { fontSize: 14, fontWeight: '600', color: '#444', marginBottom: 8 },
  input: {
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#E1E6ED',
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    marginBottom: 5,
  },
  inputError: {
    borderColor: '#e74c3c',
    borderWidth: 1,
  },
  errorText: {
    color: '#e74c3c',
    fontSize: 12,
    marginBottom: 10,
    marginTop: -5,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    gap: 10,
  },
  saveBtn: {
    backgroundColor: '#006D5B',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    flex: 1,
  },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  cancelBtn: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E1E6ED',
    flex: 1,
  },
  cancelBtnText: { color: '#666', fontSize: 16, fontWeight: '600' },
  disabledBtn: {
    opacity: 0.5,
  },
  emptyState: { 
    alignItems: 'center', 
    marginTop: 50,
    paddingHorizontal: 20,
  },
  emptyText: { 
    color: '#999', 
    marginTop: 10, 
    fontSize: 16,
    fontWeight: '600',
  },
  emptySubtext: {
    color: '#aaa',
    marginTop: 5,
    fontSize: 14,
  },
  addFirstButton: {
    marginTop: 20,
    backgroundColor: '#006D5B',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  addFirstButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default DriverManagementScreen;