import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
  Dimensions,
  FlatList,
} from 'react-native';
import {
  TextInput,
  Button,
  Provider as PaperProvider,
  Card,
  Title,
  Portal,
  Modal,
} from 'react-native-paper';
import DateTimePicker from '@react-native-community/datetimepicker';
import { apiService } from '../services/ApiServices';

const { width } = Dimensions.get('window');

const DriverExpenseForm = ({ route, navigation }) => {
  // ✅ Fix: Properly handle route params
  const routeParams = route.params;
  console.log('Route params:', routeParams);
  console.log('Route params type:', typeof routeParams);
  console.log('Route params keys:', routeParams ? Object.keys(routeParams) : 'No params');

  const [formData, setFormData] = useState({
    journeyStartDate: new Date(),
    journeyEndDate: new Date(),
    driverSalaryType: '',
    driverFixedSalary: '',
    driverPerDaySalary: '',
    perDayFooding: '',
    driverShortage: '',
    fastagAmount: '',
    driverIncentive: '',
    otherCharges: '',
  });

  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [showDropdownModal, setShowDropdownModal] = useState(false);
  const [loading, setLoading] = useState(false);

  const salaryTypes = [
    { label: 'Fixed Salary', value: 'fixed' },
    { label: 'Per Day Basis', value: 'perday' },
  ];

  // ✅ Fix: Properly set journeyStartDate from transport_date
  useEffect(() => {
    console.log('🔍 useEffect triggered with routeParams:', routeParams);
    
    if (routeParams) {
      // Handle different possible structures
      let transportData;
      
      // Case 1: routeParams is the transport object itself
      if (routeParams.transport_date || routeParams.id) {
        transportData = routeParams;
      }
      // Case 2: routeParams has a transport_id property
      else if (routeParams.transport_id) {
        transportData = routeParams.transport_id;
      }
      
      console.log('📦 Extracted transportData:', transportData);
      
      if (transportData?.transport_date) {
        console.log('📅 Found transport_date:', transportData.transport_date);
        console.log('📅 transport_date type:', typeof transportData.transport_date);
        
        let startDate;
        
        // Handle different date formats
        if (typeof transportData.transport_date === 'string') {
          // If it's a string (ISO format or other)
          startDate = new Date(transportData.transport_date);
          console.log('📅 Parsed from string:', startDate);
        } else if (transportData.transport_date instanceof Date) {
          // If it's already a Date object
          startDate = transportData.transport_date;
          console.log('📅 Already a Date object:', startDate);
        } else if (transportData.transport_date.seconds) {
          // If it's a Firebase timestamp { seconds: xxx, nanoseconds: xxx }
          startDate = new Date(transportData.transport_date.seconds * 1000);
          console.log('📅 Parsed from Firebase timestamp:', startDate);
        } else if (transportData.transport_date.toDate) {
          // If it has a toDate() method
          startDate = transportData.transport_date.toDate();
          console.log('📅 Parsed using toDate():', startDate);
        } else {
          // Fallback: try to create date from whatever it is
          startDate = new Date(transportData.transport_date);
          console.log('📅 Fallback parsing:', startDate);
        }
        
        // Validate the start date
        if (!startDate || isNaN(startDate.getTime())) {
          console.warn('❌ Invalid start date, using current date');
          startDate = new Date();
        } else {
          console.log('✅ Valid start date:', startDate);
        }
        
        const today = new Date();
        
        setFormData(prev => ({
          ...prev,
          journeyStartDate: startDate,
          journeyEndDate: today,
        }));
        
        console.log('🎯 Form data updated with start date:', startDate);
        console.log('🎯 Form data updated with end date:', today);
      } else {
        console.warn('❌ No transport_date found in route params');
        console.log('🔍 Available data:', transportData);
      }
    } else {
      console.warn('❌ No route params available');
    }
  }, [routeParams]);

  const handleInputChange = (key, value) => {
    console.log(`🔄 Updating ${key}:`, value);
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const onStartDateChange = (event, selectedDate) => {
    const currentDate = selectedDate || formData.journeyStartDate;
    
    if (event.type === 'set') {
      console.log('📅 Start date selected:', currentDate);
      handleInputChange('journeyStartDate', currentDate);
      
      // Ensure end date is not before start date
      if (formData.journeyEndDate < currentDate) {
        handleInputChange('journeyEndDate', currentDate);
      }
    }
    
    setShowStartDatePicker(false);
  };

  const onEndDateChange = (event, selectedDate) => {
    const currentDate = selectedDate || formData.journeyEndDate;
    
    if (event.type === 'set') {
      console.log('📅 End date selected:', currentDate);
      
      // Ensure end date is not before start date
      if (currentDate >= formData.journeyStartDate) {
        handleInputChange('journeyEndDate', currentDate);
      } else {
        Alert.alert('Error', 'End date cannot be before start date');
      }
    }
    
    setShowEndDatePicker(false);
  };

  // ✅ Format date as MM/DD/YY (10/14/25)
  const formatDate = (date) => {
    if (!date || isNaN(date.getTime())) return 'Invalid Date';
    
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const year = date.getFullYear().toString().slice(-2);
    
    return `${month}/${day}/${year}`;
  };

  // ✅ Alternative format for display if needed
  const formatDateLong = (date) => {
    if (!date || isNaN(date.getTime())) return 'Invalid Date';
    
    return date.toLocaleDateString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: '2-digit'
    });
  };

  const getJourneyDuration = () => {
    const { journeyStartDate, journeyEndDate } = formData;
    
    if (!journeyStartDate || !journeyEndDate || 
        isNaN(journeyStartDate.getTime()) || isNaN(journeyEndDate.getTime())) {
      return 0;
    }

    const timeDiff = journeyEndDate.getTime() - journeyStartDate.getTime();
    const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
    return Math.max(0, daysDiff)-1 ; // +1 to include both start and end dates
  };

  const calculateTotal = () => {
    const {
      driverFixedSalary,
      driverPerDaySalary,
      perDayFooding,
      driverShortage,
      fastagAmount,
      driverIncentive,
      otherCharges,
      driverSalaryType,
    } = formData;

    const days = getJourneyDuration();
    let total = 0;

    // Calculate base salary
    if (driverSalaryType === 'perday') {
      const perDaySalary = parseFloat(driverPerDaySalary || 0);
      const fooding = parseFloat(perDayFooding || 0);
      total += (perDaySalary + fooding) * days;
    } else if (driverSalaryType === 'fixed') {
      total += parseFloat(driverFixedSalary || 0);
    }

    // Add incentives
    total += parseFloat(driverIncentive || 0);
    
    // Subtract deductions
    total -= parseFloat(driverShortage || 0);
    total -= parseFloat(fastagAmount || 0);
    total -= parseFloat(otherCharges || 0);

    return isNaN(total) ? 0 : Math.max(0, total);
  };

  const validateForm = () => {
    if (!formData.driverSalaryType) {
      Alert.alert('Error', 'Please select salary type');
      return false;
    }

    if (formData.driverSalaryType === 'fixed' && !formData.driverFixedSalary) {
      Alert.alert('Error', 'Please enter fixed salary amount');
      return false;
    }

    if (formData.driverSalaryType === 'perday') {
      if (!formData.driverPerDaySalary) {
        Alert.alert('Error', 'Please enter per day salary amount');
        return false;
      }
      if (!formData.perDayFooding) {
        Alert.alert('Error', 'Please enter per day fooding amount');
        return false;
      }
    }

    if (formData.journeyEndDate < formData.journeyStartDate) {
      Alert.alert('Error', 'End date cannot be before start date');
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      setLoading(true);

      // Get transport ID from the correct location
      const transportId = routeParams?.id || routeParams?.transport_id?.id;
      
      const payload = {
        transport_id: transportId,
        start_date: formData.journeyStartDate.toISOString().split('T')[0],
        end_date: formData.journeyEndDate.toISOString().split('T')[0],
        salary_type: formData.driverSalaryType,
        fixed_salary: formData.driverFixedSalary || 0,
        perday_salary: formData.driverPerDaySalary || 0,
        perday_fooding: formData.perDayFooding || 0,
        driver_sortage: formData.driverShortage || 0,
        fastag: formData.fastagAmount || 0,
        incentive: formData.driverIncentive || 0,
        other_charges: formData.otherCharges || 0,
        total_amount: calculateTotal(),
        journey_duration: getJourneyDuration(),
      };

      console.log('📤 Payload:', payload);

      const response = await apiService.Calculation(payload);
      console.log('✅ API Response: gggggggg', response);

      Alert.alert('Success', 'Expense calculated successfully!');
      //console.log(response);
     navigation.navigate('Report', { transport_id: transportId });
    } catch (error) {
      console.error('❌ API Error:', error);
      Alert.alert('Error', error.message || 'Something went wrong!');
    } finally {
      setLoading(false);
    }
  };

  // Debug information
  console.log('🔍 Current form data:', {
    startDate: formData.journeyStartDate,
    formattedStartDate: formatDate(formData.journeyStartDate),
    endDate: formData.journeyEndDate,
    formattedEndDate: formatDate(formData.journeyEndDate),
    transportDate: routeParams?.transport_date
  });

  const totalAmount = calculateTotal();
  const isPerDayBasis = formData.driverSalaryType === 'perday';
  const isFixedSalary = formData.driverSalaryType === 'fixed';
  const journeyDuration = getJourneyDuration();

  return (
    <PaperProvider>
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        <Card style={styles.card}>
          <Card.Content>
            <Title style={styles.title}>Driver Expense Form</Title>

            {/* Journey Dates Section */}
            <View style={styles.section}>
              <Text style={styles.sectionHeader}>Journey Dates</Text>
              
              <View style={styles.dateRow}>
                <View style={styles.dateInputContainer}>
                  <Text style={styles.label}>Journey Start Date *</Text>
                  <TouchableOpacity
                    style={styles.dateButton}
                    onPress={() => setShowStartDatePicker(true)}
                    disabled={loading}
                  >
                    <Text style={styles.dateButtonText}>
                      {formatDate(formData.journeyStartDate)}
                    </Text>
                    <Text style={styles.dateButtonSubtext}>
                      Click to change date
                    </Text>
                  </TouchableOpacity>
                </View>
                
                <View style={styles.dateInputContainer}>
                  <Text style={styles.label}>Journey End Date *</Text>
                  <TouchableOpacity
                    style={styles.dateButton}
                    onPress={() => setShowEndDatePicker(true)}
                    disabled={loading}
                  >
                    <Text style={styles.dateButtonText}>
                      {formatDate(formData.journeyEndDate)}
                    </Text>
                    <Text style={styles.dateButtonSubtext}>
                      Click to change date
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Date Pickers */}
              {showStartDatePicker && (
                <DateTimePicker
                  value={formData.journeyStartDate}
                  mode="date"
                  display="spinner"
                  onChange={onStartDateChange}
                  maximumDate={new Date(2100, 11, 31)}
                  minimumDate={new Date(2000, 0, 1)}
                />
              )}
              
              {showEndDatePicker && (
                <DateTimePicker
                  value={formData.journeyEndDate}
                  mode="date"
                  display="spinner"
                  onChange={onEndDateChange}
                  maximumDate={new Date(2100, 11, 31)}
                  minimumDate={formData.journeyStartDate}
                />
              )}

              {/* Journey Duration */}
              <View style={styles.durationContainer}>
                <Text style={styles.durationText}>
                  Journey Duration: {journeyDuration} day(s)
                </Text>
                <Text style={styles.durationSubtext}>
                  From {formatDate(formData.journeyStartDate)} to {formatDate(formData.journeyEndDate)}
                </Text>
              </View>
            </View>

            {/* Salary Information Section */}
            <View style={styles.section}>
              <Text style={styles.sectionHeader}>Salary Information</Text>
              
              {/* Salary Type Dropdown */}
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Driver Salary Type *</Text>
                <TouchableOpacity
                  style={styles.dropdownTouchable}
                  onPress={() => setShowDropdownModal(true)}
                  disabled={loading}
                >
                  <Text style={[
                    styles.dropdownButtonText,
                    !formData.driverSalaryType && styles.placeholderText
                  ]}>
                    {formData.driverSalaryType
                      ? salaryTypes.find(i => i.value === formData.driverSalaryType)?.label
                      : 'Select Salary Type'}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Fixed Salary */}
              {isFixedSalary && (
                <TextInput
                  label="Driver Fixed Salary (₹) *"
                  mode="outlined"
                  keyboardType="numeric"
                  style={styles.input}
                  value={formData.driverFixedSalary}
                  onChangeText={text => handleInputChange('driverFixedSalary', text.replace(/[^0-9.]/g, ''))}
                  disabled={loading}
                  left={<TextInput.Affix text="₹" />}
                />
              )}

              {/* Per Day Salary */}
              {isPerDayBasis && (
                <>
                  <TextInput
                    label="Driver Per Day Salary (₹) *"
                    mode="outlined"
                    keyboardType="numeric"
                    style={styles.input}
                    value={formData.driverPerDaySalary}
                    onChangeText={text => handleInputChange('driverPerDaySalary', text.replace(/[^0-9.]/g, ''))}
                    disabled={loading}
                    left={<TextInput.Affix text="₹" />}
                  />
                  <TextInput
                    label="Per Day Fooding (₹) *"
                    mode="outlined"
                    keyboardType="numeric"
                    style={styles.input}
                    value={formData.perDayFooding}
                    onChangeText={text => handleInputChange('perDayFooding', text.replace(/[^0-9.]/g, ''))}
                    disabled={loading}
                    left={<TextInput.Affix text="₹" />}
                  />
                </>
              )}
            </View>

            {/* Additional Charges Section */}
            <View style={styles.section}>
              <Text style={styles.sectionHeader}>Additional Charges</Text>
              
              <TextInput
                label="Driver Shortage (₹)"
                mode="outlined"
                keyboardType="numeric"
                style={styles.input}
                value={formData.driverShortage}
                onChangeText={text => handleInputChange('driverShortage', text.replace(/[^0-9.]/g, ''))}
                disabled={loading}
                left={<TextInput.Affix text="₹" />}
              />
              <TextInput
                label="Fastag Amount (₹)"
                mode="outlined"
                keyboardType="numeric"
                style={styles.input}
                value={formData.fastagAmount}
                onChangeText={text => handleInputChange('fastagAmount', text.replace(/[^0-9.]/g, ''))}
                disabled={loading}
                left={<TextInput.Affix text="₹" />}
              />
              <TextInput
                label="Driver Incentive (₹)"
                mode="outlined"
                keyboardType="numeric"
                style={styles.input}
                value={formData.driverIncentive}
                onChangeText={text => handleInputChange('driverIncentive', text.replace(/[^0-9.]/g, ''))}
                disabled={loading}
                left={<TextInput.Affix text="₹" />}
              />
              <TextInput
                label="Other Charges (₹)"
                mode="outlined"
                keyboardType="numeric"
                style={styles.input}
                value={formData.otherCharges}
                onChangeText={text => handleInputChange('otherCharges', text.replace(/[^0-9.]/g, ''))}
                disabled={loading}
                left={<TextInput.Affix text="₹" />}
              />
            </View>

            {/* Total Amount */}
            <Card style={styles.totalCard}>
              <Card.Content>
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Total Amount:</Text>
                  <Text style={styles.totalAmount}>₹{totalAmount.toLocaleString()}</Text>
                </View>
                <Text style={styles.totalSubtext}>
                  Based on {journeyDuration} day(s) journey
                </Text>
              </Card.Content>
            </Card>

            {/* Submit Button */}
            <Button
              mode="contained"
              style={[styles.submitButton, loading && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={loading}
              loading={loading}
              icon="calculator"
            >
              {loading ? 'Calculating...' : 'Calculate Expense'}
            </Button>
          </Card.Content>
        </Card>
      </ScrollView>

      {/* Dropdown Modal */}
      <Portal>
        <Modal
          visible={showDropdownModal}
          onDismiss={() => setShowDropdownModal(false)}
          contentContainerStyle={styles.dropdownModal}
        >
          <Text style={styles.modalTitle}>Select Salary Type</Text>
          <FlatList
            data={salaryTypes}
            keyExtractor={item => item.value}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.modalOption}
                onPress={() => {
                  handleInputChange('driverSalaryType', item.value);
                  setShowDropdownModal(false);
                }}
                disabled={loading}
              >
                <Text style={styles.modalOptionText}>{item.label}</Text>
              </TouchableOpacity>
            )}
          />
        </Modal>
      </Portal>
    </PaperProvider>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#f5f5f5' 
  },
  scrollContent: { 
    padding: 16 
  },
  card: { 
    backgroundColor: '#fff', 
    elevation: 4, 
    borderRadius: 12, 
    marginBottom: 16,
  },
  title: {
    textAlign: 'center',
    marginBottom: 20,
    color: '#006D5B',
    fontSize: 22,
    fontWeight: 'bold',
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#006D5B',
    marginBottom: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  label: { 
    fontSize: 14, 
    fontWeight: '600', 
    marginBottom: 8, 
    color: '#333' 
  },
  dateRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    marginBottom: 16 
  },
  dateInputContainer: { 
    flex: 1, 
    marginHorizontal: 4 
  },
  dateButton: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  dateButtonText: { 
    fontSize: 16, 
    color: '#333',
    fontWeight: '600',
  },
  dateButtonSubtext: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  durationContainer: {
    backgroundColor: '#e3f2fd',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  durationText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1976d2',
  },
  durationSubtext: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  inputContainer: { 
    marginBottom: 16 
  },
  dropdownTouchable: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 16,
    backgroundColor: '#fff',
  },
  dropdownButtonText: { 
    fontSize: 16, 
    color: '#333' 
  },
  placeholderText: {
    color: '#999',
  },
  input: {
    marginBottom: 16,
    backgroundColor: '#fff',
  },
  totalCard: {
    backgroundColor: '#f8fff8',
    borderColor: '#4caf50',
    borderWidth: 1,
    marginVertical: 16,
    borderRadius: 8,
  },
  totalRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  totalLabel: { 
    fontSize: 18, 
    fontWeight: 'bold', 
    color: '#333' 
  },
  totalAmount: { 
    fontSize: 20, 
    fontWeight: 'bold', 
    color: '#006D5B' 
  },
  totalSubtext: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  submitButton: { 
    backgroundColor: '#006D5B', 
    marginTop: 8, 
    paddingVertical: 8,
    borderRadius: 8,
  },
  submitButtonDisabled: { 
    backgroundColor: '#ccc' 
  },
  dropdownModal: {
    backgroundColor: '#fff',
    marginHorizontal: 30,
    borderRadius: 12,
    padding: 20,
    maxHeight: '60%',
  },
  modalTitle: { 
    fontSize: 18, 
    fontWeight: 'bold', 
    color: '#006D5B', 
    marginBottom: 16,
    textAlign: 'center',
  },
  modalOption: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalOptionText: { 
    fontSize: 16, 
    color: '#333',
    textAlign: 'center',
  },
});

export default DriverExpenseForm;