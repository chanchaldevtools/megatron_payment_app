// src/screens/AddTripScreen.tsx
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  StatusBar,
  Platform,
  KeyboardAvoidingView,
  Keyboard,
  TouchableWithoutFeedback,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { StackNavigationProp } from '@react-navigation/stack';
import DateTimePicker from '@react-native-community/datetimepicker';
import { apiService } from '../services/ApiServices';
import { responsiveWidth, responsiveHeight, responsiveFont } from "../utils/responsive";

type RootStackParamList = {
  VehicleTrips: { vehicle: any };
  AddTrip: { vehicle: any };
};

type AddTripScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'AddTrip'
>;

interface Props {
  navigation: AddTripScreenNavigationProp;
  route: { params: { vehicle: any } };
}

interface FormData {
  transport_date: string;
  source: string;
  destination: string;
  weight: string;
  rate: string;
  receving: string;
  day_limit: string;
  odm_km: string;
  bill_number: string;
}

interface Errors {
  transport_date?: string;
  source?: string;
  destination?: string;
  weight?: string;
  rate?: string;
  receving?: string;
  day_limit?: string;
  odm_km?: string;
  bill_number?: string;
}

const AddTripScreen: React.FC<Props> = ({ navigation, route }) => {
  const { vehicle } = route.params || {};
  const [loading, setLoading] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [vehicleId, setVehicleId] = useState<number | null>(null);
  
  // Refs for scrolling to inputs
  const scrollViewRef = useRef<ScrollView>(null);
  const inputRefs: { [key: string]: any } = {};
  
  const [formData, setFormData] = useState<FormData>({
    transport_date: new Date().toISOString().split('T')[0],
    source: '',
    destination: '',
    weight: '',
    rate: '',
    receving: '',
    day_limit: '',
    odm_km: '',
    bill_number: ''
  });

  useEffect(() => {
    if (vehicle) {
      setVehicleNumber(vehicle.vehicle_number ?? '');
      setVehicleId(vehicle.id ?? null);
      console.log('Received vehicle:', vehicle);
    }
  }, [vehicle]);

  const [errors, setErrors] = useState<Errors>({});

  const validateForm = (): boolean => {
    const newErrors: Errors = {};

    if (!formData.transport_date.trim()) {
      newErrors.transport_date = 'Transport date is required';
    }

    if (!formData.source.trim()) {
      newErrors.source = 'Source is required';
    }

    if (!formData.destination.trim()) {
      newErrors.destination = 'Destination is required';
    }
    if (!formData.bill_number.trim()) {
      newErrors.bill_number = 'Bill Number is required';
    }

    if (!formData.weight.trim()) {
      newErrors.weight = 'Weight is required';
    } else if (
      isNaN(parseFloat(formData.weight)) ||
      parseFloat(formData.weight) <= 0
    ) {
      newErrors.weight = 'Weight must be a valid number greater than 0';
    }

    if (!formData.rate.trim()) {
      newErrors.rate = 'Rate is required';
    } else if (
      isNaN(parseFloat(formData.rate)) ||
      parseFloat(formData.rate) <= 0
    ) {
      newErrors.rate = 'Rate must be a valid number greater than 0';
    }

    if (!formData.receving.trim()) {
      newErrors.receving = 'Receiving party is required';
    }

    if (!formData.day_limit.trim()) {
      newErrors.day_limit = 'Day limit is required';
    }

    if (!formData.odm_km.trim()) {
      newErrors.odm_km = 'ODM KM is required';
    } else if (
      isNaN(parseFloat(formData.odm_km)) ||
      parseFloat(formData.odm_km) < 0
    ) {
      newErrors.odm_km = 'ODM KM must be a valid number';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleDateChange = (event: any, date?: Date) => {
    setShowDatePicker(false);
    if (date) {
      setSelectedDate(date);
      setFormData({
        ...formData,
        transport_date: date.toISOString().split('T')[0],
      });
      if (errors.transport_date) {
        setErrors({ ...errors, transport_date: undefined });
      }
    }
  };

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData({
      ...formData,
      [field]: value,
    });
    if (errors[field]) {
      setErrors({ ...errors, [field]: undefined });
    }
  };

  // Function to handle focus and scroll to input
  const handleInputFocus = (fieldName: string, yPosition: number) => {
    if (scrollViewRef.current) {
      scrollViewRef.current.scrollTo({ y: yPosition - 100, animated: true });
    }
  };

  const calculateTotal = (): string => {
    const weight = parseFloat(formData.weight) || 0;
    const rate = parseFloat(formData.rate) || 0;
    return (weight * rate).toFixed(2);
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      Alert.alert('Validation Error', 'Please fix all errors before submitting.');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        transport_date: formData.transport_date,
        source: formData.source,
        destination: formData.destination,
        weight: parseFloat(formData.weight),
        rate: parseFloat(formData.rate),
        receving: formData.receving,
        day_limit: formData.day_limit,
        odm_km: formData.odm_km,
        bill_number: formData.bill_number
      };
       
      const response = await apiService.transportStore(vehicleId, payload);
      if (response.success) {
        Alert.alert('Success', 'Transport trip added successfully!', [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]);
      } else {
        throw new Error(response.message || 'Failed to add transport trip');
      }
    } catch (error: any) {
      console.error('Error adding transport:', error);
      Alert.alert(
        'Error',
        error.message || 'Failed to add transport trip. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const formatDisplayDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
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
          <Text style={styles.headerTitle}>Add New Trip</Text>
          <Text style={styles.vehicleNumber}>
            {vehicleNumber}
          </Text>
        </View>
        <View style={styles.headerIcon}>
          <Icon name="add-circle" size={28} color="#fff" />
        </View>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView
            ref={scrollViewRef}
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Vehicle Info Card */}
            <View style={styles.vehicleCard}>
              <Icon name="car-sport" size={24} color="#006D5B" />
              <View style={styles.vehicleInfo}>
                <Text style={styles.vehicleLabel}>Vehicle</Text>
                <Text style={styles.vehicleValue}>
                  {vehicleNumber}
                </Text>
              </View>
            </View>

            {/* Form */}
            <View style={styles.formContainer}>
              {/* Transport Date */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Transport Date *</Text>
                <TouchableOpacity
                  style={[styles.dateInput, errors.transport_date && styles.inputError]}
                  onPress={() => setShowDatePicker(true)}
                >
                  <Text style={styles.dateText}>
                    {formatDisplayDate(formData.transport_date)}
                  </Text>
                  <Icon name="calendar" size={20} color="#6B7280" />
                </TouchableOpacity>
                {errors.transport_date && (
                  <Text style={styles.errorText}>{errors.transport_date}</Text>
                )}
              </View>

              {/* Source & Destination Row */}
              <View style={styles.row}>
                <View style={[styles.inputGroup, styles.flex1]}>
                  <Text style={styles.label}>Source *</Text>
                  <TextInput
                    ref={ref => inputRefs.source = ref}
                    style={[styles.input, errors.source && styles.inputError]}
                    value={formData.source}
                    onChangeText={(text) => handleInputChange('source', text)}
                    placeholder="Enter source location"
                    placeholderTextColor="#9CA3AF"
                    onFocus={() => handleInputFocus('source', 300)}
                  />
                  {errors.source && (
                    <Text style={styles.errorText}>{errors.source}</Text>
                  )}
                </View>

                <View style={[styles.inputGroup, styles.flex1]}>
                  <Text style={styles.label}>Destination *</Text>
                  <TextInput
                    ref={ref => inputRefs.destination = ref}
                    style={[styles.input, errors.destination && styles.inputError]}
                    value={formData.destination}
                    onChangeText={(text) => handleInputChange('destination', text)}
                    placeholder="Enter destination"
                    placeholderTextColor="#9CA3AF"
                    onFocus={() => handleInputFocus('destination', 300)}
                  />
                  {errors.destination && (
                    <Text style={styles.errorText}>{errors.destination}</Text>
                  )}
                </View>
              </View>

              {/* Weight & Rate Row */}
              <View style={styles.row}>
                <View style={[styles.inputGroup, styles.flex1]}>
                  <Text style={styles.label}>Weight (tons) *</Text>
                  <TextInput
                    ref={ref => inputRefs.weight = ref}
                    style={[styles.input, errors.weight && styles.inputError]}
                    value={formData.weight}
                    onChangeText={(text) => handleInputChange('weight', text)}
                    placeholder="0.00"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="decimal-pad"
                    onFocus={() => handleInputFocus('weight', 450)}
                  />
                  {errors.weight && (
                    <Text style={styles.errorText}>{errors.weight}</Text>
                  )}
                </View>

                <View style={[styles.inputGroup, styles.flex1]}>
                  <Text style={styles.label}>Rate (per ton) *</Text>
                  <TextInput
                    ref={ref => inputRefs.rate = ref}
                    style={[styles.input, errors.rate && styles.inputError]}
                    value={formData.rate}
                    onChangeText={(text) => handleInputChange('rate', text)}
                    placeholder="0.00"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="decimal-pad"
                    onFocus={() => handleInputFocus('rate', 450)}
                  />
                  {errors.rate && (
                    <Text style={styles.errorText}>{errors.rate}</Text>
                  )}
                </View>
              </View>

              {/* Total Calculation */}
              <View style={styles.totalContainer}>
                <Text style={styles.totalLabel}>Total Amount</Text>
                <Text style={styles.totalAmount}>₹{calculateTotal()}</Text>
              </View>

              {/* Receiving Party */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Receiving *</Text>
                <TextInput
                  ref={ref => inputRefs.receving = ref}
                  style={[styles.input, errors.receving && styles.inputError]}
                  value={formData.receving}
                  onChangeText={(text) => handleInputChange('receving', text)}
                  placeholder="Enter Receiving"
                  placeholderTextColor="#9CA3AF"
                  onFocus={() => handleInputFocus('receving', 620)}
                />
                {errors.receving && (
                  <Text style={styles.errorText}>{errors.receving}</Text>
                )}
              </View>

              {/* Day Limit */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Day Limit *</Text>
                <TextInput
                  ref={ref => inputRefs.day_limit = ref}
                  style={[styles.input, errors.day_limit && styles.inputError]}
                  value={formData.day_limit}
                  onChangeText={(text) => handleInputChange('day_limit', text)}
                  placeholder="e.g., 5 days"
                  placeholderTextColor="#9CA3AF"
                  onFocus={() => handleInputFocus('day_limit', 700)}
                />
                {errors.day_limit && (
                  <Text style={styles.errorText}>{errors.day_limit}</Text>
                )}
              </View>

              {/* ODM KM */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>ODM KM *</Text>
                <TextInput
                  ref={ref => inputRefs.odm_km = ref}
                  style={[styles.input, errors.odm_km && styles.inputError]}
                  value={formData.odm_km}
                  onChangeText={(text) => handleInputChange('odm_km', text)}
                  placeholder="Enter ODM kilometers"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="decimal-pad"
                  onFocus={() => handleInputFocus('odm_km', 780)}
                />
                {errors.odm_km && (
                  <Text style={styles.errorText}>{errors.odm_km}</Text>
                )}
              </View>

              {/* Trip ID */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Trip Id *</Text>
                <TextInput
                  ref={ref => inputRefs.bill_number = ref}
                  style={[styles.input, errors.bill_number && styles.inputError]}
                  value={formData.bill_number}
                  onChangeText={(text) => handleInputChange('bill_number', text)}
                  placeholder="Enter Trip Id"
                  placeholderTextColor="#9CA3AF"
                  onFocus={() => handleInputFocus('bill_number', 860)}
                />
                {errors.bill_number && (
                  <Text style={styles.errorText}>{errors.bill_number}</Text>
                )}
              </View>

              {/* Submit Button */}
              <TouchableOpacity
                style={[styles.submitButton, loading && styles.submitButtonDisabled]}
                onPress={handleSubmit}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Icon name="checkmark-circle" size={20} color="#fff" />
                    <Text style={styles.submitButtonText}>Add Transport Trip</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>

      {/* Date Picker */}
      {showDatePicker && (
        <DateTimePicker
          value={selectedDate}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleDateChange}
          maximumDate={new Date()}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    backgroundColor: '#006D5B',
    paddingHorizontal: responsiveWidth(20),
    paddingTop: responsiveHeight(10),
    paddingBottom: responsiveHeight(20),
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: responsiveHeight(4) },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: responsiveWidth(16),
    paddingBottom: responsiveHeight(30),
  },
  vehicleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: responsiveWidth(16),
    borderRadius: responsiveWidth(12),
    marginBottom: responsiveHeight(20),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: responsiveHeight(2) },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  vehicleInfo: {
    marginLeft: responsiveWidth(12),
  },
  vehicleLabel: {
    fontSize: responsiveFont(12),
    color: '#6B7280',
    fontWeight: '500',
  },
  vehicleValue: {
    fontSize: responsiveFont(16),
    color: '#1F2937',
    fontWeight: '600',
  },
  formContainer: {
    backgroundColor: '#fff',
    borderRadius: responsiveWidth(16),
  },
  inputGroup: {
    marginBottom: responsiveHeight(16),
  },
  label: {
    fontSize: responsiveFont(14),
    fontWeight: '600',
    color: '#374151',
    marginBottom: responsiveHeight(6),
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: responsiveWidth(8),
    padding: responsiveWidth(12),
    fontSize: responsiveFont(14),
    color: '#1F2937',
    backgroundColor: '#F9FAFB',
  },
  inputError: {
    borderColor: '#EF4444',
    backgroundColor: '#FEF2F2',
  },
  errorText: {
    color: '#EF4444',
    fontSize: responsiveFont(12),
    marginTop: responsiveHeight(4),
  },
  row: {
    flexDirection: 'row',
    gap: responsiveWidth(12),
  },
  flex1: {
    flex: 1,
  },
  dateInput: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: responsiveWidth(8),
    padding: responsiveWidth(12),
    backgroundColor: '#F9FAFB',
  },
  dateText: {
    fontSize: responsiveFont(16),
    color: '#1F2937',
  },
  totalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F0F9FF',
    padding: responsiveWidth(16),
    borderRadius: responsiveWidth(8),
    marginBottom: responsiveHeight(16),
    borderLeftWidth: responsiveWidth(4),
    borderLeftColor: '#006D5B',
  },
  totalLabel: {
    fontSize: responsiveFont(16),
    fontWeight: '600',
    color: '#006D5B',
  },
  totalAmount: {
    fontSize: responsiveFont(18),
    fontWeight: '700',
    color: '#006D5B',
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#006D5B',
    padding: responsiveWidth(16),
    borderRadius: responsiveWidth(12),
    gap: responsiveWidth(8),
    marginTop: responsiveHeight(8),
  },
  submitButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: responsiveFont(16),
    fontWeight: '600',
  },
});

export default AddTripScreen;