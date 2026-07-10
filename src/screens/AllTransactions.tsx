import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  Modal,
  Alert,
  Dimensions,
  ActivityIndicator,
  TextInput,
  Platform,
} from 'react-native';
import { apiService, IMAGE_URL } from '../services/ApiServices';
import {
  widthPercentageToDP as wp,
  heightPercentageToDP as hp,
} from 'react-native-responsive-screen';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';

const { width } = Dimensions.get('window');

const Transactions = ({ route }) => {
  const [userType, setUserType] = useState(null);
  const navigation = useNavigation();

  // Vehicle Filter
  const [vehicleNumberFilter, setVehicleNumberFilter] = useState('');
  
  // Date Range Filter (Only for Success section)
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [tempStartDate, setTempStartDate] = useState(null);
  const [tempEndDate, setTempEndDate] = useState(null);
  
  const debounceTimer = useRef(null);

  const [activeSection, setActiveSection] = useState('Pending');
  const [imageLoading, setImageLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [tripModalVisible, setTripModalVisible] = useState(false);
  const [selectedTripDetails, setSelectedTripDetails] = useState(null);
  const [page, setPage] = useState({
    Pending: 1,
    Approved: 1,
    Success: 1,
  });
  const [hasMore, setHasMore] = useState({
    Pending: true,
    Approved: true,
    Success: true,
  });

  const [transactionData, setTransactions] = useState({
    Pending: [],
    Approved: [],
    Success: [],
  });
  
  // Format date for API
  const formatDateForAPI = (date) => {
    if (!date) return null;
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  
  // Format date for display
  const formatDateForDisplay = (date) => {
    if (!date) return '';
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };
  
  // Clear date filters
  const clearDateFilters = () => {
    setStartDate(null);
    setEndDate(null);
    setTempStartDate(null);
    setTempEndDate(null);
    
    if (activeSection === 'Success') {
      setPage((prev) => ({ ...prev, Success: 1 }));
      setHasMore((prev) => ({ ...prev, Success: true }));
      fetchTransactions('Success', 'Success', 1, vehicleNumberFilter, null, null);
    }
  };
  
  // Apply date filters
  const applyDateFilters = () => {
    setStartDate(tempStartDate);
    setEndDate(tempEndDate);
    setShowStartDatePicker(false);
    setShowEndDatePicker(false);
    
    if (activeSection === 'Success') {
      setPage((prev) => ({ ...prev, Success: 1 }));
      setHasMore((prev) => ({ ...prev, Success: true }));
      fetchTransactions('Success', 'Success', 1, vehicleNumberFilter, tempStartDate, tempEndDate);
    }
  };
  
  // Handle start date change
  const onStartDateChange = (event, selectedDate) => {
    if (Platform.OS === 'android') {
      setShowStartDatePicker(false);
      if (selectedDate) {
        setStartDate(selectedDate);
        setTempStartDate(selectedDate);
        if (activeSection === 'Success') {
          setPage((prev) => ({ ...prev, Success: 1 }));
          setHasMore((prev) => ({ ...prev, Success: true }));
          fetchTransactions('Success', 'Success', 1, vehicleNumberFilter, selectedDate, endDate);
        }
      }
    } else {
      if (event.type === 'set' && selectedDate) {
        setTempStartDate(selectedDate);
      } else if (event.type === 'dismissed') {
        setShowStartDatePicker(false);
      }
    }
  };
  
  // Handle end date change
  const onEndDateChange = (event, selectedDate) => {
    if (Platform.OS === 'android') {
      setShowEndDatePicker(false);
      if (selectedDate) {
        setEndDate(selectedDate);
        setTempEndDate(selectedDate);
        if (activeSection === 'Success') {
          setPage((prev) => ({ ...prev, Success: 1 }));
          setHasMore((prev) => ({ ...prev, Success: true }));
          fetchTransactions('Success', 'Success', 1, vehicleNumberFilter, startDate, selectedDate);
        }
      }
    } else {
      if (event.type === 'set' && selectedDate) {
        setTempEndDate(selectedDate);
      } else if (event.type === 'dismissed') {
        setShowEndDatePicker(false);
      }
    }
  };
  
  // Handle iOS apply
  const handleApplyDates = () => {
    setStartDate(tempStartDate);
    setEndDate(tempEndDate);
    setShowStartDatePicker(false);
    setShowEndDatePicker(false);
    
    if (activeSection === 'Success') {
      setPage((prev) => ({ ...prev, Success: 1 }));
      setHasMore((prev) => ({ ...prev, Success: true }));
      fetchTransactions('Success', 'Success', 1, vehicleNumberFilter, tempStartDate, tempEndDate);
    }
  };
  
  // Handle iOS cancel
  const handleCancelDates = () => {
    setTempStartDate(startDate);
    setTempEndDate(endDate);
    setShowStartDatePicker(false);
    setShowEndDatePicker(false);
  };
  
  // Debounced vehicle filter handler
  const handleFilterChange = (text) => {
    setVehicleNumberFilter(text);
    
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
    
    debounceTimer.current = setTimeout(() => {
      setPage((prev) => ({ ...prev, [activeSection]: 1 }));
      setHasMore((prev) => ({ ...prev, [activeSection]: true }));
      
      if (activeSection === 'Success') {
        fetchTransactions(activeSection, activeSection, 1, text, startDate, endDate);
      } else {
        fetchTransactions(activeSection, activeSection, 1, text);
      }
    }, 500);
  };
  
  // Memoized fetch function
  const fetchTransactions = useCallback(async (
    payment_type,
    section,
    pageNo = 1,
    filter = vehicleNumberFilter,
    start_date = null,
    end_date = null
  ) => {
    try {
      if (pageNo === 1) setLoading(true);

      const apiParams = {
        payment_status: payment_type,
        page: pageNo,
        vehicle_number: filter || null,
      };
      
      if (payment_type === 'Success' && start_date && end_date) {
        apiParams.start_date = formatDateForAPI(start_date);
        apiParams.end_date = formatDateForAPI(end_date);
      }

      const result = await apiService.TransactionsFilter(apiParams);

      const paymentList = result?.payments?.data || [];
      const lastPage = result?.payments?.last_page || 1;
      
      if (paymentList.length > 0 || pageNo === 1) {
        setTransactions((prev) => ({
          ...prev,
          [section]: pageNo === 1
            ? paymentList.map(mapPayment)
            : [...prev[section], ...paymentList.map(mapPayment)],
        }));

        setHasMore((prev) => ({
          ...prev,
          [section]: pageNo < lastPage,
        }));

        setPage((prev) => ({ ...prev, [section]: pageNo }));
      } else {
        setHasMore((prev) => ({ ...prev, [section]: false }));
      }
    } catch (error) {
      console.error('Error fetching transactions:', error);
    } finally {
      setLoading(false);
    }
  }, [vehicleNumberFilter, startDate, endDate]);

  useEffect(() => {
    fetchTransactions('Pending', 'Pending', 1);
  }, [route]);

  useEffect(() => {
    const fetchUserType = async () => {
      try {
        const type = await AsyncStorage.getItem('userData');
        const parsed = JSON.parse(type);
        setUserType(parsed?.user_type || null);
      } catch (error) {
        console.error('Error fetching user type:', error);
      }
    };
    fetchUserType();
  }, []);

  useEffect(() => {
    setPage((prev) => ({ ...prev, [activeSection]: 1 }));
    setHasMore((prev) => ({ ...prev, [activeSection]: true }));
    setTransactions((prev) => ({ ...prev, [activeSection]: [] }));

    if (activeSection === 'Success' && startDate && endDate) {
      fetchTransactions(activeSection, activeSection, 1, vehicleNumberFilter, startDate, endDate);
    } else {
      fetchTransactions(activeSection, activeSection, 1, vehicleNumberFilter);
    }
  }, [activeSection, vehicleNumberFilter, startDate, endDate]);

  const mapPayment = (p) => ({
    id: p.id.toString(),
    amount: p.amount,
    date: new Date(p.created_at).toLocaleString(),
    paymentMode: p.payment_mode,
    paymentStatus: p.payment_status,
    location: p.location,
    reason: p.comment,
    upiId: p.upi_id,
    added_by: p.added_by,
    approved_by: p.approved_by,
    paid_by: p.paid_by,
    bankDetails: p.bank_name
      ? {
          accountHolder: p.account_holder_name,
          accountNo: p.account_number,
          ifsc: p.ifsc_code,
        }
      : null,
    qrCode: p.qr_code_picture,
    image: p.payment_success_picture || p.payment_raise_picture,
    approved: p.payment_status === 'Approved' || p.payment_status === 'Success',
    fromLocation: p.from_location || 'Loading...',
    toLocation: p.to_location || 'Loading...',
    vehicleNumber: p.transport?.vehicle_list?.vehicle_number || 'N/A',
  });

  const handleLoadMore = () => {
    if (hasMore[activeSection] && !loading) {
      const nextPage = page[activeSection] + 1;
      if (activeSection === 'Success' && startDate && endDate) {
        fetchTransactions(activeSection, activeSection, nextPage, vehicleNumberFilter, startDate, endDate);
      } else {
        fetchTransactions(activeSection, activeSection, nextPage, vehicleNumberFilter);
      }
    }
  };

  const GotoTripDetails = async (item) => {
    try {
      setLoading(true);
      const tripDetailsResponse = await apiService.GetTripDetails({ id: item.id });
      if (tripDetailsResponse) {
        const detailedTripData = tripDetailsResponse;
        const fullDetails = {
          ...item,
          fromLocation: detailedTripData.transports.source,
          toLocation: detailedTripData.transports.destination,
          vehicleNumber: detailedTripData.vehicle.vehicle_number,
          tripId: detailedTripData.transport_type == 'Sub' ? detailedTripData.sendableTransport?.trip_id : detailedTripData.transports.trip_id,
          transports: detailedTripData.transports,
          vehicle: detailedTripData.vehicle,
          TripType: detailedTripData.transport_type,
          MainTrip: detailedTripData.sendableTransport,
          position: detailedTripData.position
        };
        setSelectedTripDetails(fullDetails);
        setTripModalVisible(true);
      } else {
        Alert.alert('Error', 'Failed to load trip details: Data not found.');
      }
    } catch (error) {
      console.error('Error fetching trip details:', error);
      Alert.alert('Error', 'Could not connect to server to load trip details.');
    } finally {
      setLoading(false);
    }
  };
  
  const onRefresh = async () => {
    try {
      setRefreshing(true);
      setPage((prev) => ({ ...prev, [activeSection]: 1 }));
      setHasMore((prev) => ({ ...prev, [activeSection]: true }));
      
      if (activeSection === 'Success' && startDate && endDate) {
        await fetchTransactions(activeSection, activeSection, 1, vehicleNumberFilter, startDate, endDate);
      } else {
        await fetchTransactions(activeSection, activeSection, 1, vehicleNumberFilter);
      }
    } catch (error) {
      console.error('Refresh error:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const updatePaymentStatus = async (
    id,
    currentStatus,
    targetStatus,
    successMessage,
    failureMessage,
  ) => {
    Alert.alert(
      'Confirm Action',
      `Are you sure you want to change the status to ${targetStatus}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: targetStatus,
          onPress: async () => {
            try {
              setLoading(true);
              const formData = { id, payment_status: targetStatus };
              const response = await apiService.UpdatePaymentStatus(formData);

              if (response?.status || response?.success) {
                Alert.alert('Success', successMessage);
                await Promise.all([
                  fetchTransactions('Pending', 'Pending', 1, vehicleNumberFilter),
                  fetchTransactions('Approved', 'Approved', 1, vehicleNumberFilter),
                  fetchTransactions('Success', 'Success', 1, vehicleNumberFilter, startDate, endDate),
                ]);
              } else {
                Alert.alert('Error', response?.message || failureMessage);
              }
            } catch (error) {
              console.error(`${targetStatus} error:`, error);
              Alert.alert('Error', 'Something went wrong. Please try again.');
            } finally {
              setLoading(false);
            }
          },
        },
      ],
    );
  };
  
  const getFinancialYear = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    const fyStartYear = month >= 3 ? year : year - 1;
    const fyEndYear = fyStartYear + 1;
    return `${fyStartYear}-${fyEndYear}`;
  };
  
  const renderTripDetailsModal = () => {
    if (!selectedTripDetails) return null;
    return (
      <Modal
        visible={tripModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setTripModalVisible(false)}
      >
        <View style={styles.tripModalContainer}>
          <View style={styles.tripModalContent}>
            <Text style={styles.tripModalTitle}>
              🚚 {selectedTripDetails.vehicleNumber}
            </Text>

            <View style={styles.tripDetailSection}>
              <Text style={[styles.tripDetailValue, { textAlign: 'center' }]}>
                Main Trip : {selectedTripDetails.MainTrip?.source || 'N/A'} ➜{' '}
                {selectedTripDetails.MainTrip?.destination || 'N/A'}
              </Text>
              {selectedTripDetails.TripType !== 'Main' && (
                <Text style={[styles.tripDetailValue, { textAlign: 'center' }]}>
                  Sub Trip : {selectedTripDetails.fromLocation} ➜{' '}
                  {selectedTripDetails.toLocation} ({selectedTripDetails.position})
                </Text>
              )}
            </View>

            <View style={styles.tripDetailSection}>
              <Text style={[styles.tripDetailValue, { textAlign: 'center' }]}>
                TRIP ID : {selectedTripDetails.tripId}
              </Text>
              <Text style={[styles.tripDetailValue, { textAlign: 'center' }]}>
                FY : {getFinancialYear()}
              </Text>
            </View>
            <View style={styles.separator} />

            <View style={styles.tripDetailSection}>
              <Text style={styles.detailLabel}>Expense Amount:</Text>
              <Text style={[styles.tripDetailValue, { color: '#006D5B', fontSize: wp('4%') }]}>
                ₹{selectedTripDetails.amount}
              </Text>
              
              <View style={styles.buttonRow}>
                <TouchableOpacity
                  onPress={() => {
                    setTripModalVisible(false);
                    navigation.navigate(
                      selectedTripDetails.TripType === 'Main'
                        ? 'TripDetail'
                        : 'SubTripDetail',
                      {
                        tripId: selectedTripDetails.transports,
                        vehicle: selectedTripDetails.vehicle,
                      }
                    );
                  }}
                  style={[styles.tripModalCloseButton, { flex: 1, marginRight: 5 }]}
                >
                  <Text style={styles.tripModalCloseButtonText}>GO TO TRIP</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  onPress={() => {
                    setTripModalVisible(false);
                    navigation.navigate('Report', { 
                      transport_id: selectedTripDetails.MainTrip 
                    });
                  }}
                  style={[styles.tripModalCloseButton, { flex: 1, marginLeft: 5 }]}
                >
                  <Text style={styles.tripModalCloseButtonText}>REPORT</Text>
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.tripModalCloseButton, { backgroundColor: 'red', borderColor: 'red' }]}
              onPress={() => setTripModalVisible(false)}
            >
              <Text style={[styles.tripModalCloseButtonText, { color: 'white' }]}>
                CLOSE
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  };
  
  const handleApprove = (section, id) => {
    if (section === 'Pending') {
      updatePaymentStatus(
        id,
        'Pending',
        'Approved',
        'Transaction approved successfully!',
        'Failed to approve transaction.',
      );
    } else if (section === 'Approved') {
      updatePaymentStatus(
        id,
        'Approved',
        'Success',
        'Payment marked as completed!',
        'Failed to mark payment as completed.',
      );
    }
  };

  const handleDisapprove = (id) => {
    updatePaymentStatus(
      id,
      'Approved',
      'Pending',
      'Transaction disapproved and moved to Pending.',
      'Failed to disapprove transaction.',
    );
  };

  const openImageModal = (imageUri) => {
    setSelectedImage(imageUri);
    setModalVisible(true);
    setImageLoading(true);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Success':
      case 'Completed':
        return '#4CAF50';
      case 'Approved':
        return '#0EA5E9';
      case 'Pending':
        return '#FF9800';
      case 'Failed':
        return '#F44336';
      default:
        return '#666';
    }
  };

  const getPaymentModeColor = (mode) => {
    switch (mode) {
      case 'Cash':
        return '#2196F3';
      case 'UPI':
      case 'GPay':
        return '#9C27B0';
      case 'Bank':
        return '#FF5722';
      case 'Cheque':
        return '#795548';
      case 'QR':
        return '#F59E0B';
      default:
        return '#666';
    }
  };
  
  // Date Range Filter Component (Only for Success section)
  const renderDateRangeFilter = () => {
    if (activeSection !== 'Success') return null;
    
    const hasChanges = Platform.OS === 'ios' && 
                      (tempStartDate !== startDate || tempEndDate !== endDate) && 
                      (tempStartDate || tempEndDate);
    
    return (
      <View style={styles.dateRangeContainer}>
        <Text style={styles.dateRangeLabel}>📅 Date Range Filter:</Text>
        <View style={styles.dateRangeRow}>
          <TouchableOpacity
            style={styles.dateButton}
            onPress={() => {
              setTempStartDate(startDate || new Date());
              setShowStartDatePicker(true);
            }}
          >
            <Text style={styles.dateButtonText}>
              {startDate ? formatDateForDisplay(startDate) : 'Select Start Date'}
            </Text>
          </TouchableOpacity>
          
          <Text style={styles.dateSeparator}>→</Text>
          
          <TouchableOpacity
            style={styles.dateButton}
            onPress={() => {
              setTempEndDate(endDate || new Date());
              setShowEndDatePicker(true);
            }}
          >
            <Text style={styles.dateButtonText}>
              {endDate ? formatDateForDisplay(endDate) : 'Select End Date'}
            </Text>
          </TouchableOpacity>
          
          {(startDate || endDate) && (
            <TouchableOpacity
              style={styles.clearDateButton}
              onPress={clearDateFilters}
            >
              <Text style={styles.clearDateButtonText}>✕ Clear</Text>
            </TouchableOpacity>
          )}
        </View>
        
        {showStartDatePicker && (
          <DateTimePicker
            value={tempStartDate || new Date()}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={onStartDateChange}
            maximumDate={endDate || new Date()}
          />
        )}
        
        {showEndDatePicker && (
          <DateTimePicker
            value={tempEndDate || new Date()}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={onEndDateChange}
            minimumDate={startDate}
            maximumDate={new Date()}
          />
        )}
        
        {hasChanges && (
          <View style={styles.dateActionButtons}>
            <TouchableOpacity
              style={[styles.dateActionButton, styles.cancelButton]}
              onPress={handleCancelDates}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.dateActionButton, styles.applyButton]}
              onPress={handleApplyDates}
            >
              <Text style={styles.applyButtonText}>Apply</Text>
            </TouchableOpacity>
          </View>
        )}
        
        {(startDate && endDate) && (
          <View style={styles.activeFilterInfo}>
            <Text style={styles.activeFilterText}>
              Showing results from {formatDateForDisplay(startDate)} to {formatDateForDisplay(endDate)}
            </Text>
          </View>
        )}
      </View>
    );
  };
  
  const renderTransactionCard = ({ item, index }) => (
    <View style={styles.cardContainer}>
      <TouchableOpacity
        onPress={() => GotoTripDetails(item)}
        disabled={loading}
      >
        <View style={styles.card}>
          <View style={styles.mainRow}>
            <View style={styles.amountColumn}>
              <Text style={styles.amount}>₹{item.amount}</Text>
            </View>

            <View style={styles.statusColumn}>
              <View
                style={[
                  styles.statusBadge,
                  { backgroundColor: getStatusColor(item.paymentStatus) },
                ]}
              >
                <Text style={styles.statusText}>{item.paymentStatus}</Text>
              </View>
            </View>

            <View style={styles.dateColumn}>
              <Text style={styles.dateText}>{item.date}</Text>
            </View>

            <View style={styles.modeColumn}>
              <View
                style={[
                  styles.modeBadge,
                  { backgroundColor: getPaymentModeColor(item.paymentMode) },
                ]}
              >
                <Text style={styles.modeText}>{item.paymentMode}</Text>
              </View>
            </View>
          </View>

          <View style={styles.rowDivider} />

          <View style={styles.detailsRow}>
            <View style={styles.detailSection}>
              <Text style={styles.detailLabel}>Location</Text>
              <Text style={styles.detailValue}>{item.location}</Text>
            </View>

            <View style={styles.detailSection}>
              <Text style={styles.detailLabel}>Reason</Text>
              <Text style={styles.detailValue}>{item.reason || '-'}</Text>
            </View>
          </View>

          <View style={styles.rowDivider} />
          <View style={styles.paymentDetailsRow}>
            <Text style={[styles.paymentDetailLabel, { fontStyle: 'italic', fontWeight: '800' }]}>
              Vehicle Number: {item.vehicleNumber}
            </Text>
          </View>

          {item.paymentMode === 'BANK' && item.bankDetails && (
            <>
              <View style={styles.rowDivider} />
              <View style={styles.paymentDetailsRow}>
                <Text style={styles.paymentDetailLabel}>Bank Details:</Text>
                <View style={styles.bankDetails}>
                  <Text style={styles.bankText}>
                    A/C Holder: {item.bankDetails.accountHolder}
                  </Text>
                  <Text style={styles.bankText}>
                    A/C No: {item.bankDetails.accountNo}
                  </Text>
                  <Text style={styles.bankText}>
                    IFSC: {item.bankDetails.ifsc}
                  </Text>
                </View>
              </View>
            </>
          )}

          {item.paymentMode === 'UPI' && item.upiId && (
            <>
              <View style={styles.rowDivider} />
              <View style={styles.paymentDetailsRow}>
                <Text style={styles.paymentDetailLabel}>UPI ID:</Text>
                <Text style={styles.upiText}>{item.upiId}</Text>
              </View>
            </>
          )}

          <View style={styles.cardFooter}>
            {item.qrCode ? (
              <TouchableOpacity
                style={styles.imageButton}
                onPress={() => openImageModal(IMAGE_URL + item.qrCode)}
              >
                <Text style={styles.imageButtonText}>VIEW QR</Text>
              </TouchableOpacity>
            ) : (
              <View style={{ flex: 1 }} />
            )}

            {userType == 'Admin' ? (
              <View style={styles.actionButtonContainer}>
                {activeSection === 'Approved' && (
                  <TouchableOpacity
                    style={styles.disapproveButton}
                    onPress={() => handleDisapprove(item.id)}
                    disabled={loading}
                  >
                    <Text style={styles.disapproveButtonText}>DISAPPROVE</Text>
                  </TouchableOpacity>
                )}

                {activeSection !== 'Success' ? (
                  <TouchableOpacity
                    style={styles.approveButton}
                    onPress={() => handleApprove(activeSection, item.id)}
                    disabled={loading}
                  >
                    <Text style={styles.approveButtonText}>
                      {activeSection === 'Pending' ? 'APPROVE' : 'MARK PAID'}
                    </Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            ) : null}
          </View>
          
          {activeSection === 'Pending' && (
            <View style={styles.payInfo}>
              <Text style={styles.raiseText}>Payment Raise By : {item.added_by}</Text>
            </View>
          )}

          {activeSection === 'Approved' && (
            <>
              <View style={styles.payInfo}>
                <Text style={styles.raiseText}>Payment Raise By : {item.added_by}</Text>
              </View>
              <View style={styles.payInfo}>
                <Text style={styles.approveText}>Payment Approved By : {item.approved_by}</Text>
              </View>
            </>
          )}

          {activeSection === 'Success' && (
            <View style={styles.payInfo}>
              <Text style={styles.raiseText}>Payment Raise By : {item.added_by}</Text>
              <Text style={styles.approveText}>Payment Approved By : {item.approved_by}</Text>
              <Text style={styles.doneText}>Payment Done By : {item.paid_by}</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>

      {index < transactionData[activeSection].length - 1 && (
        <View style={styles.cardDivider} />
      )}
    </View>
  );

  const SectionButton = ({ title, section }) => (
    <TouchableOpacity
      style={[
        styles.sectionButton,
        activeSection === section && styles.sectionButtonActive,
      ]}
      onPress={() => setActiveSection(section)}
    >
      <Text
        style={[
          styles.sectionButtonText,
          activeSection === section && styles.sectionButtonTextActive,
        ]}
      >
        {title}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.sectionTabs}>
        <SectionButton title="Pending" section="Pending" />
        <SectionButton title="Approved" section="Approved" />
        <SectionButton title="Success" section="Success" />
      </View>
      
      {/* Vehicle Number Filter */}
      <View style={styles.filterContainer}>
        <TextInput
          style={styles.filterInput}
          placeholder="Filter by Vehicle No. (e.g., MH04AB1234)"
          placeholderTextColor="#94A3B8"
          value={vehicleNumberFilter}
          onChangeText={handleFilterChange}
          autoCapitalize="characters"
        />
      </View>
      
      {/* Date Range Filter - Only for Success Section */}
      {renderDateRangeFilter()}
      
      {loading && transactionData[activeSection].length === 0 ? (
        <ActivityIndicator size="large" color="#006D5B" style={{ marginTop: 20 }} />
      ) : (
        <FlatList
          data={transactionData[activeSection]}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderTransactionCard}
          refreshing={refreshing}
          onRefresh={onRefresh}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            hasMore[activeSection] && loading ? (
              <ActivityIndicator size="small" color="#006D5B" style={{ margin: 16 }} />
            ) : (
              <Text style={{ textAlign: 'center', padding: 10, color: '#888' }}>
                {transactionData[activeSection].length > 0 ? 'End of list' : ''}
              </Text>
            )
          }
          ListEmptyComponent={
            !loading && (
              <View style={styles.noDataContainer}>
                <Text style={styles.noDataTitle}>No Transactions Found</Text>
                <Text style={styles.noDataSubtitle}>
                  There are no records available for this section.
                </Text>
              </View>
            )
          }
        />
      )}

      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Document View</Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => {
                setModalVisible(false);
                setSelectedImage(null);
              }}
            >
              <Text style={styles.closeButtonText}>CLOSE</Text>
            </TouchableOpacity>
          </View>

          <View style={{ width: '90%', height: '70%', justifyContent: 'center', alignItems: 'center' }}>
            {imageLoading && (
              <ActivityIndicator size="large" color="#006D5B" style={{ position: 'absolute' }} />
            )}
            {selectedImage && (
              <Image
                source={{ uri: selectedImage }}
                style={styles.modalImage}
                resizeMode="contain"
                onLoadStart={() => setImageLoading(true)}
                onLoadEnd={() => setImageLoading(false)}
              />
            )}
          </View>
        </View>
      </Modal>

      {renderTripDetailsModal()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  sectionTabs: {
    flexDirection: 'row',
    marginHorizontal: wp('4%'),
    marginTop: hp('2%'),
    backgroundColor: '#FFFFFF',
    borderRadius: wp('3%'),
    padding: wp('1.5%'),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    marginBottom: wp('2%'),
  },
  filterContainer: {
    marginHorizontal: wp('4%'),
    marginBottom: hp('1.5%'),
    backgroundColor: '#FFFFFF',
    borderRadius: wp('2%'),
    padding: wp('1%'),
    elevation: 2,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  filterInput: {
    fontSize: wp('3.5%'),
    paddingHorizontal: wp('3%'),
    paddingVertical: hp('1.5%'),
    color: '#1E293B',
    fontWeight: '600',
  },
  dateRangeContainer: {
    marginHorizontal: wp('4%'),
    marginBottom: hp('1.5%'),
    backgroundColor: '#FFFFFF',
    borderRadius: wp('2%'),
    padding: wp('3%'),
    elevation: 2,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  dateRangeLabel: {
    fontSize: wp('3.2%'),
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: hp('1%'),
  },
  dateRangeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dateButton: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: wp('3%'),
    paddingVertical: hp('1.2%'),
    borderRadius: wp('2%'),
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  dateButtonText: {
    fontSize: wp('3%'),
    color: '#1E293B',
    textAlign: 'center',
  },
  dateSeparator: {
    marginHorizontal: wp('2%'),
    fontSize: wp('3%'),
    color: '#64748B',
    fontWeight: 'bold',
  },
  clearDateButton: {
    backgroundColor: '#F44336',
    paddingHorizontal: wp('3%'),
    paddingVertical: hp('1.2%'),
    borderRadius: wp('2%'),
    marginLeft: wp('2%'),
  },
  clearDateButtonText: {
    fontSize: wp('3%'),
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  dateActionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: hp('1.5%'),
  },
  dateActionButton: {
    flex: 1,
    paddingVertical: hp('1.2%'),
    borderRadius: wp('2%'),
    marginHorizontal: wp('1%'),
    alignItems: 'center',
  },
  applyButton: {
    backgroundColor: '#006D5B',
  },
  applyButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: wp('3%'),
  },
  cancelButton: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cancelButtonText: {
    color: '#64748B',
    fontWeight: 'bold',
    fontSize: wp('3%'),
  },
  activeFilterInfo: {
    marginTop: hp('1%'),
    paddingTop: hp('1%'),
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  activeFilterText: {
    fontSize: wp('2.8%'),
    color: '#006D5B',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  dateColumn: { flex: 1.5, alignItems: 'center' },
  amountColumn: { flex: 1, alignItems: 'center' },
  statusColumn: { flex: 1, alignItems: 'center' },
  modeColumn: { flex: 1, alignItems: 'center' },
  sectionButton: {
    flex: 1,
    paddingVertical: hp('1.5%'),
    alignItems: 'center',
    borderRadius: wp('2%'),
  },
  sectionButtonActive: {
    backgroundColor: '#006D5B',
    elevation: 3,
  },
  sectionButtonText: {
    fontSize: wp('3.2%'),
    fontWeight: '700',
    color: '#64748B',
  },
  sectionButtonTextActive: { color: '#FFFFFF', fontWeight: 'bold' },
  cardContainer: {
    marginHorizontal: wp('4%'),
    marginBottom: hp('1.5%'),
  },
  card: {
    backgroundColor: '#FFFFFF',
    padding: wp('4%'),
    borderRadius: wp('3%'),
    elevation: 3,
    borderLeftWidth: 4,
    borderLeftColor: '#006D5B',
  },
  mainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: hp('0.5%'),
  },
  amount: { fontSize: wp('4%'), fontWeight: 'bold', color: '#1E293B' },
  dateText: {
    fontSize: wp('3%'),
    color: '#64748B',
    fontWeight: '600',
    textAlign: 'center',
  },
  statusBadge: {
    paddingHorizontal: wp('2%'),
    paddingVertical: hp('0.5%'),
    borderRadius: wp('2%'),
  },
  statusText: {
    fontSize: wp('2.5%'),
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  modeBadge: {
    paddingHorizontal: wp('2%'),
    paddingVertical: hp('0.5%'),
    borderRadius: wp('2%'),
  },
  modeText: {
    fontSize: wp('2.5%'),
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  rowDivider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: hp('1%'),
  },
  detailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: wp('1%'),
  },
  detailSection: {
    flex: 1,
    marginRight: wp('2%'),
  },
  detailLabel: {
    fontSize: wp('2.8%'),
    color: '#64748B',
    marginBottom: hp('0.5%'),
    fontWeight: '600',
  },
  detailValue: {
    fontSize: wp('3.2%'),
    color: '#1E293B',
    fontWeight: '600',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: hp('1.5%'),
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: hp('1.5%'),
  },
  imageButton: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: wp('5%'),
    paddingVertical: hp('1%'),
    borderRadius: wp('2%'),
    flex: 1,
    marginRight: wp('2%'),
    alignItems: 'center',
  },
  imageButtonText: {
    fontSize: wp('3%'),
    fontWeight: 'bold',
    color: '#006D5B',
  },
  actionButtonContainer: {
    flexDirection: 'row',
    flex: 2.5,
    marginLeft: wp('2%'),
    justifyContent: 'flex-end',
  },
  disapproveButton: {
    backgroundColor: '#F44336',
    paddingHorizontal: wp('2%'),
    paddingVertical: hp('1%'),
    borderRadius: wp('2%'),
    marginLeft: wp('1%'),
    marginRight: wp('2%'),
    alignItems: 'center',
    flex: 1,
  },
  disapproveButtonText: {
    fontSize: wp('3%'),
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  approveButton: {
    backgroundColor: '#006D5B',
    paddingHorizontal: wp('3%'),
    paddingVertical: hp('1%'),
    borderRadius: wp('2%'),
    alignItems: 'center',
    flex: 1,
  },
  approveButtonText: {
    fontSize: wp('3%'),
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  modalContainer: { flex: 1, backgroundColor: '#000000' },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: wp('4%'),
    paddingTop: hp('6%'),
  },
  modalTitle: { fontSize: wp('4.5%'), fontWeight: 'bold', color: '#FFFFFF' },
  closeButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: wp('4%'),
    paddingVertical: hp('1%'),
    borderRadius: wp('2%'),
  },
  closeButtonText: {
    fontSize: wp('3.5%'),
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  modalImage: { flex: 1, width: width, marginVertical: hp('2%') },
  noDataContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: hp('5%'),
    padding: wp('5%'),
  },
  noDataTitle: {
    fontSize: wp('4%'),
    fontWeight: 'bold',
    color: '#333',
    marginBottom: hp('0.5%'),
  },
  noDataSubtitle: {
    fontSize: wp('3%'),
    color: '#666',
    textAlign: 'center',
  },
  tripModalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  tripModalContent: {
    width: wp('85%'),
    backgroundColor: '#FFFFFF',
    borderRadius: wp('3%'),
    padding: wp('6%'),
    elevation: 10,
  },
  tripModalTitle: {
    fontSize: wp('5%'),
    fontWeight: 'bold',
    color: '#006D5B',
    marginBottom: hp('2%'),
    borderBottomWidth: 2,
    borderBottomColor: '#E2E8F0',
    paddingBottom: hp('1%'),
  },
  tripDetailSection: {
    marginBottom: hp('1.5%'),
  },
  tripDetailValue: {
    fontSize: wp('3.7%'),
    color: '#1E293B',
    fontWeight: '700',
    marginTop: hp('0.3%'),
  },
  separator: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: hp('1.5%'),
  },
  tripModalCloseButton: {
    backgroundColor: '#F1F5F9',
    paddingVertical: hp('1.5%'),
    borderRadius: wp('2%'),
    marginTop: hp('2%'),
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#006D5B',
  },
  tripModalCloseButtonText: {
    fontSize: wp('4%'),
    fontWeight: 'bold',
    color: '#006D5B',
  },
  payInfo: {
    alignItems: 'flex-start',
    marginTop: 10,
  },
  raiseText: {
    fontSize: 10,
    color: '#080808ff',
    fontStyle: 'italic',
  },
  approveText: {
    fontSize: 10,
    color: '#000304ff',
    fontStyle: 'italic',
  },
  doneText: {
    fontSize: 10,
    color: '#030303ff',
    fontStyle: 'italic',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 10,
  },
  paymentDetailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  paymentDetailLabel: {
    fontSize: wp('3%'),
    color: '#64748B',
    fontWeight: 'bold',
    marginRight: wp('2%'),
  },
  bankDetails: {
    flex: 1,
  },
  bankText: {
    fontSize: wp('3%'),
    color: '#1E293B',
    marginVertical: hp('0.2%'),
  },
  upiText: {
    fontSize: wp('3%'),
    color: '#1E293B',
    fontWeight: '600',
  },
  cardDivider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: hp('0.5%'),
  },
});

export default Transactions;