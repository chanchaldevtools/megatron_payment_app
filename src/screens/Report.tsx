import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,

  StatusBar,
  TouchableOpacity,
  Modal,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { captureRef } from 'react-native-view-shot';
import Share from 'react-native-share';
// NOTE: Ensure this path is correct in your project environment
import { apiService } from '../services/ApiServices'; 
import {
  widthPercentageToDP as wp,
  heightPercentageToDP as hp,
} from 'react-native-responsive-screen';

const TransportTripDashboard = ({route}) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedOption, setSelectedOption] = useState(null);
  const viewRef = useRef(null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // NOTE: 'SubTransport' ref is not needed as it's rendered inside 'sub_transport'
  const sectionRefs = {
    trip_info: useRef(null),
    main_transport: useRef(null),
    sub_transport: useRef(null),
    totals: useRef(null),
    driver_pay: useRef(null),
    extra_charges: useRef(null),
    final_summary: useRef(null),
    all: useRef(null),
  };

  const transport_id = route?.params?.transport_id;

  console.log(transport_id);
 
  const fetchTripData = async (showLoader = true) => {
    try {
      if (showLoader) setLoading(true);
      console.log('Fetching data for transport:', transport_id?.id);
      
      const Data = {
         transport_id: transport_id.id ?? transport_id
      }
     
      const tripData = await apiService.Report(Data);
      console.log('API Response:', tripData);
      
      if (tripData && tripData.success !== false) {
        setData(tripData);
      } else {
        throw new Error(tripData?.message || 'Failed to fetch data');
      }
      
    } catch (err) {
      console.error('Error in fetchTripData:', err);
      Alert.alert('Error', err.message || 'Failed to load trip data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (transport_id.id??transport_id) {
      fetchTripData();
    }
  }, [transport_id]);

  // FIX: Robust Currency Formatting
  const formatCurrency = (amount) => {
    if (amount === null || amount === undefined || amount === "") return '₹0';
    // Ensure input is treated as a number/string and fallback to 0 if conversion fails
    const numAmount = Number(String(amount).replace(/[^0-9.-]+/g,"")) || 0;
    
    // Use Intl.NumberFormat for currency, which handles Indian locale formatting
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0, 
      maximumFractionDigits: 0,
    }).format(numAmount);
  };

  const shareOptions = [
    { id: 'driver_cost', label: 'Driver Pay Details', section: 'driver_pay' },
    { id: 'total_cost', label: 'Totals', section: 'totals' },
    { id: 'sub_trip', label: 'Sub Transport', section: 'sub_transport' },
    { id: 'main_trip', label: 'Main Transport', section: 'main_transport' },
    { id: 'final_summary', label: 'Final Summary', section: 'final_summary' },
    { id: 'full_report', label: 'Full Report (All Sections)', section: 'all' }, 
  ];

  const captureAndShare = async (section) => {
    try {
      let ref = viewRef;
      
      if (section !== 'all' && sectionRefs[section]?.current) {
        ref = sectionRefs[section];
      }

      if (!ref.current) {
        throw new Error('Capture area not found.');
      }

      const uri = await captureRef(ref.current, {
        format: 'png',
        quality: 0.8,
      });

      const sectionTitle = shareOptions.find(opt => opt.section === section)?.label || 'Report';

      const shareOptionsConfig = {
        title: 'Share Transport Trip Report',
        message: `Sharing Transport Trip Report: ${sectionTitle}`,
        url: uri,
        type: 'image/png',
        social: Share.Social.WHATSAPP,
      };

      await Share.open(shareOptionsConfig);
    } catch (error) {
      console.log('Error sharing:', error);
      if (error.message !== 'User did not share' && !error.message.includes('User did not share')) {
        Alert.alert('Error', 'Failed to share. Please ensure WhatsApp is installed or try again.');
      }
    }
  };

  const handleShare = (option) => {
    setSelectedOption(option);
    setModalVisible(false);
    
    setTimeout(() => {
      captureAndShare(option.section);
    }, 300); 
  };

  const renderSection = (section, title, color, borderColor, ref) => {
    // Show loading or no data state
    if (loading) {
      return (
        <View key={section} style={[styles.card, { borderLeftWidth: 4, borderLeftColor: color }]}>
          <Text style={[styles.header, { backgroundColor: color }]}>{title}</Text>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={color} />
            <Text style={styles.loadingText}>Loading...</Text>
          </View>
        </View>
      );
    }

    if (!data) {
      return (
        <View key={section} style={[styles.card, { borderLeftWidth: 4, borderLeftColor: color }]}>
          <Text style={[styles.header, { backgroundColor: color }]}>{title}</Text>
          <View style={styles.noDataContainer}>
            <Text style={styles.noDataText}>No data available</Text>
          </View>
        </View>
      );
    }

    return (
      <View key={section} ref={ref} style={[styles.card, { borderLeftWidth: 4, borderLeftColor: borderColor }]}>
        <Text style={[styles.header, { backgroundColor: color }]}>{title}</Text>
        
        {section === 'trip_info' && data.trip_info && (
          <>
            <View style={styles.row}>
              <Text style={styles.label}>From:</Text>
              <Text style={styles.value}>{data.trip_info.from || 'N/A'}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>To:</Text>
              <Text style={styles.value}>{data.trip_info.to || 'N/A'}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Start Date:</Text>
              <Text style={styles.value}>{data.trip_info.start_date || 'N/A'}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>End Date:</Text>
              <Text style={styles.value}>{data.trip_info.end_date || 'N/A'}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Days:</Text>
              <Text style={styles.value}>{data.trip_info.days || 'N/A'}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Salary Type:</Text>
              <Text style={styles.value}>{data.trip_info.salary_type || 'N/A'}</Text>
            </View>
            
          </>
        )}

        {section === 'main_transport' && data.main_transport && (
          <>
            <View style={styles.row}>
              <Text style={styles.label}>Rent:</Text>
              <Text style={styles.value}>{formatCurrency(data.main_transport.rent)}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Driver Cash by party/company:</Text>
              <Text style={styles.value}>{formatCurrency(data.main_transport.driver_cash)}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Received Amount:</Text>
              <Text style={styles.value}>{formatCurrency(data.main_transport.advance_account)}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Driver Advance by Company:</Text>
              <Text style={styles.value}>{formatCurrency(data.main_transport.advance_by_company)}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Extra Driver Expense:</Text>
              <Text style={styles.value}>{formatCurrency(data.main_transport.driver_expense)}</Text>
            </View>
            
            <View style={styles.row}>
              <Text style={styles.label}>Vehicle Expense:</Text>
              <Text style={styles.value}>{formatCurrency(data.main_transport.vehicle_expense)}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Urea :</Text>
              <Text style={styles.value}>{formatCurrency(data.main_transport.urea_expense)}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Toll :</Text>
              <Text style={styles.value}>{formatCurrency(data.main_transport.toll)}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Diesel Paid By Party:</Text>
              <Text style={styles.value}>{formatCurrency(data.main_transport.diesel_by_party)}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Diesel Expense:</Text>
              <Text style={styles.value}>{formatCurrency(data.main_transport.diesel_expense)}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Diesel Consume:</Text>
              <Text style={styles.value}>{(data.main_transport.diesel_consume)} Ltr</Text>
            </View>
          </>
        )}

        {/* --- Sub Transport Section (Aggregate & Individual Trip Loop) --- */}
        {section === 'sub_transport' && data.sub_transport && (
          <>
            
            <Text style={[styles.subTransportAggregatedHeader]}>
                Aggregated Sub-Trip Totals
            </Text>
            
            <View style={styles.row}>
              <Text style={styles.label}>Rent (Total):</Text>
              <Text style={[styles.value, styles.profitValue]}>{formatCurrency(data.sub_transport.rent)}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Driver Cash By Party/Company (Total):</Text>
              <Text style={styles.value}>{formatCurrency(data.sub_transport.driver_cash)}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Received Account (Total):</Text>
              <Text style={styles.value}>{formatCurrency(data.sub_transport.advance_account)}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Driver Advance by Company (Total):</Text>
              <Text style={styles.value}>{formatCurrency(data.sub_transport.advance_by_company)}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Extra Driver Expense (Total):</Text>
              <Text style={styles.value}>{formatCurrency(data.sub_transport.driver_expense)}</Text>
            </View>
            <View style={[styles.row, {marginBottom: hp(2)}]}>
              <Text style={styles.label}>Vehicle Expense (Total):</Text>
              <Text style={styles.value}>{formatCurrency(data.sub_transport.vehicle_expense)}</Text>
            </View>
            <View style={[styles.row, {marginBottom: hp(2)}]}>
              <Text style={styles.label}>Urea (Total):</Text>
              <Text style={styles.value}>{formatCurrency(data.sub_transport.urea_expense)}</Text>
            </View>
            <View style={[styles.row, {marginBottom: hp(2)}]}>
              <Text style={styles.label}>Toll (Total):</Text>
              <Text style={styles.value}>{formatCurrency(data.sub_transport.toll)}</Text>
            </View>
            <View style={[styles.row, {marginBottom: hp(2)}]}>
              <Text style={styles.label}>Diesel Paid By Party (Total):</Text>
              <Text style={styles.value}>{formatCurrency(data.sub_transport.diesel_by_party)}</Text>
            </View>
            <View style={[styles.row, {marginBottom: hp(2)}]}>
              <Text style={styles.label}>Diesel Expense (Total):</Text>
              <Text style={styles.value}>{formatCurrency(data.sub_transport.diesel_expense)}</Text>
            </View>
            <View style={[styles.row, {marginBottom: hp(2)}]}>
              <Text style={styles.label}>Diesel Consume (Total):</Text>
              <Text style={styles.value}>{(data.sub_transport.diesel_consume)} Ltr</Text>
            </View>

            {/* 2. Individual Sub-Trip Details (from data.SubTransport Array) */}
            {data.SubTransport && data.SubTransport.map((subTrip, index) => (
              <View key={index} style={styles.subTripDetailContainer}>
                <Text style={styles.subTripHeader}>
                    Sub-Trip {index + 1}: {subTrip.sub_transport_name || 'N/A'}
                </Text>

                <View style={styles.row}>
                  <Text style={styles.label}>Total Rent:</Text>
                  <Text style={[styles.value, styles.profitValue]}>{formatCurrency(subTrip.totalrent)}</Text>
                </View>
                
                {subTrip.payments && (
                    <>
                        <View style={styles.row}>
                            <Text style={styles.label}>Driver Cash By Party/Company:</Text>
                            <Text style={styles.value}>{formatCurrency(subTrip.payments.driver_cash)}</Text>
                        </View>
                        <View style={styles.row}>
                            <Text style={styles.label}>Received Amount:</Text>
                            <Text style={styles.value}>{formatCurrency(subTrip.payments.advance_account)}</Text>
                        </View>
                        <View style={styles.row}>
                            <Text style={styles.label}>Driver Advance by Company:</Text>
                            <Text style={styles.value}>{formatCurrency(subTrip.payments.advance_account_by_company)}</Text>
                        </View>
                        <View style={styles.row}>
                            <Text style={styles.label}>Extra Driver Expense:</Text>
                            <Text style={styles.value}>{formatCurrency(subTrip.payments.driver_expense)}</Text>
                        </View>
                        <View style={[styles.row, {borderBottomWidth: 0}]}>
                            <Text style={styles.label}>Vehicle Expense:</Text>
                            <Text style={styles.value}>{formatCurrency(subTrip.payments.vehicle_expense)}</Text>
                        </View>
                    </>
                )}
              </View>
            ))}
          </>
        )}

        {section === 'totals' && data.totals && (
          <>
            <View style={styles.row}>
              <Text style={styles.label}>Total Trip Rent:</Text>
              <Text style={styles.value}>{formatCurrency(data.totals.total_trip_rent)}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Driver Cash by part/company:</Text>
              <Text style={styles.value}>{formatCurrency(data.totals.total_driver_cash)}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Received Account:</Text>
              <Text style={styles.value}>{formatCurrency(data.totals.total_advance_account)}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Driver Advance by Company:</Text>
              <Text style={styles.value}>{formatCurrency(data.totals.total_advance_by_company)}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Extra Expense:</Text>
              <Text style={styles.value}>{formatCurrency(data.totals.total_driver_expense)}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Total Vehicle Expense:</Text>
              <Text style={styles.value}>{formatCurrency(data.totals.total_vehicle_expense)}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Urea:</Text>
              <Text style={styles.value}>{formatCurrency(data.totals.urea_expense)}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Toll:</Text>
              <Text style={styles.value}>{formatCurrency(data.totals.toll)}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Total Diesel Paid By Party:</Text>
              <Text style={styles.value}>{formatCurrency(data.totals.diesel_by_party)}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Total Diesel Expense:</Text>
              <Text style={styles.value}>{formatCurrency(data.totals.total_Diesel_expense)}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Total Diesel Consume:</Text>
              <Text style={styles.value}>{(data.totals.diesel_consume)} Ltr</Text>
            </View>
            
          </>
        )}

        {section === 'driver_pay' && data.driver_pay_details && (
          <>
            <View style={styles.row}>
              <Text style={styles.label}>Per Day Salary:</Text>
              <Text style={styles.value}>{formatCurrency(data.driver_pay_details.per_day_salary)}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Per Day Fooding:</Text>
              <Text style={styles.value}>{formatCurrency(data.driver_pay_details.per_day_fooding)}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Total Salary:</Text>
              <Text style={styles.value}>{formatCurrency(data.driver_pay_details.total_salary)}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Total Fooding:</Text>
              <Text style={styles.value}>{formatCurrency(data.driver_pay_details.total_fooding)}</Text>
            </View>
            <View style={styles.row}>
              <Text style={[styles.label, {fontWeight: 'bold'}]}>Gross Pay:</Text>
              <Text style={[styles.value, {fontWeight: 'bold'}]}>{formatCurrency(data.driver_pay_details.gross_pay)}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Incentive:</Text>
              <Text style={styles.value}>{formatCurrency(data.driver_pay_details.incentive)}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Shortage:</Text>
              <Text style={styles.value}>{formatCurrency(data.driver_pay_details.shortage)}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Driver Cash Balance (Advance Used):</Text>
              {/* Assuming balance is a deduction, styling it red if positive or zero */}
              <Text style={[styles.value, styles.negativeValue]}>{formatCurrency(data.driver_pay_details.driver_cash_balance)}</Text> 
            </View>
            <View style={[styles.row, {borderBottomWidth: 0, marginTop: hp(1)}]}>
              <Text style={[styles.label, {fontWeight: 'bold', fontSize: wp(4.2)}]}>Net Pay After Balance:</Text>
              <Text style={[styles.value, (data.driver_pay_details.net_pay_after_balance || 0) < 0 ? styles.negativeValue : styles.profitValue, {fontWeight: 'bold', fontSize: wp(4.2)}]}>
                {formatCurrency(data.driver_pay_details.net_pay_after_balance)}
              </Text>
            </View>
          </>
        )}

        {section === 'extra_charges' && data.extra_charges && (
          <>
            <View style={styles.row}>
              <Text style={styles.label}>Fastag:</Text>
              <Text style={styles.value}>{formatCurrency(data.extra_charges.fastag)}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Other Charges:</Text>
              <Text style={styles.value}>{formatCurrency(data.extra_charges.other_charges)}</Text>
            </View>
          </>
        )}

        {section === 'final_summary' && data.final_summary && data.totals && (
          <>
            <View style={styles.row}>
              <Text style={styles.label}>Total fare including main & sub trip:</Text>
              <Text style={styles.value}>{formatCurrency(data.totals.total_trip_rent)}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Total Trip Expense:</Text>
              <Text style={styles.value}>{formatCurrency(data.final_summary.total_trip_expense)}</Text>
            </View>
            <View style={[styles.row, {borderBottomWidth: 0, marginTop: hp(1)}]}>
              <Text style={[styles.label, {fontWeight: 'bold', fontSize: wp(4.2)}]}>Net Profit:</Text>
              <Text style={[styles.value, styles.profitValue, {fontWeight: 'bold', fontSize: wp(4.2)}]}>{formatCurrency(data.final_summary.net_profit)}</Text>
            </View>
          </>
        )}
      </View>
    );
  };

  // Show loading screen
  if (loading && !data) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar backgroundColor="#2c3e50" />
        <View style={styles.loadingScreen}>
          <ActivityIndicator size="large" color="#006D5B" />
          <Text style={styles.loadingScreenText}>Loading Report Data...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Show error screen
  if (!loading && !data) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar backgroundColor="#2c3e50" />
        <View style={styles.errorScreen}>
          <Text style={styles.errorScreenText}>Failed to load data</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => fetchTripData(true)}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#2c3e50" />
      <ScrollView style={styles.scrollView} ref={viewRef}>
        {renderSection('trip_info', `Trip Info (${data?.trip_info?.from || 'N/A'} to ${data?.trip_info?.to || 'N/A'})`, '#006D5B', '#006D5B', sectionRefs.trip_info)}
        {renderSection('main_transport', `Main Transport (${data?.trip_info?.from || 'N/A'} to ${data?.trip_info?.to || 'N/A'})`, '#006D5B', '#006D5B', sectionRefs.main_transport)}
        {/* FIX: Only render the main sub_transport section once. */}
        {renderSection('sub_transport', 'Sub Transport', '#006D5B', '#006D5B', sectionRefs.sub_transport)}
        {renderSection('totals', 'Totals', '#006D5B', '#006D5B', sectionRefs.totals)}
        {renderSection('driver_pay', 'Driver Pay Details', '#006D5B', '#006D5B', sectionRefs.driver_pay)}
        {renderSection('extra_charges', 'Extra Charges', '#006D5B', '#006D5B', sectionRefs.extra_charges)}
        {renderSection('final_summary', 'Final Summary', '#006D5B', '#006D5B', sectionRefs.final_summary)}
      </ScrollView>
      
      <TouchableOpacity
        style={styles.fab}
        onPress={() => setModalVisible(true)}
        disabled={!data}
      >
        <Text style={styles.fabText}>📤</Text>
      </TouchableOpacity>

      {/* Share Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Share on WhatsApp</Text>
            <Text style={styles.modalSubtitle}>Select what to share:</Text>
            
            {shareOptions.map((option) => (
              <TouchableOpacity
                key={option.id}
                style={styles.optionButton}
                onPress={() => handleShare(option)}
              >
                <Text style={styles.optionText}>{option.label}</Text>
              </TouchableOpacity>
            ))}
            
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  scrollView: {
    flex: 1,
    padding: wp(3),
  },
  card: {
    backgroundColor: 'white',
    borderRadius: wp(2.5),
    padding: wp(4),
    marginBottom: hp(2),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: hp(0.3) },
    shadowOpacity: 0.1,
    shadowRadius: wp(1),
    elevation: 5,
  },
  header: {
    fontSize: wp(4),
    fontWeight: 'bold',
    marginBottom: hp(1.8),
    textAlign: 'center',
    paddingVertical: hp(1),
    borderRadius: wp(2),
    color: 'white',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: hp(1),
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  label: {
    fontSize: wp(3.7),
    color: '#555',
    flex: 1,
  },
  value: {
    fontSize: wp(3.7),
    fontWeight: '600',
    color: '#333',
    flex: 1,
    textAlign: 'right',
  },
  negativeValue: {
    color: '#e74c3c',
  },
  positiveValue: {
    color: '#27ae60',
  },
  profitValue: {
    color: '#006D5B',
    fontWeight: 'bold',
  },
  loadingContainer: {
    padding: hp(2.5),
    alignItems: 'center',
  },
  loadingText: {
    marginTop: hp(1),
    color: '#666',
    fontSize: wp(3.6),
  },
  noDataContainer: {
    padding: hp(2.5),
    alignItems: 'center',
  },
  noDataText: {
    color: '#999',
    fontSize: wp(3.6),
  },
  loadingScreen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingScreenText: {
    marginTop: hp(2),
    fontSize: wp(4),
    color: '#666',
  },
  errorScreen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorScreenText: {
    fontSize: wp(4),
    color: '#e74c3c',
    marginBottom: hp(2),
  },
  retryButton: {
    backgroundColor: '#006D5B',
    paddingHorizontal: wp(5),
    paddingVertical: hp(1.5),
    borderRadius: wp(2),
  },
  retryButtonText: {
    color: 'white',
    fontSize: wp(4),
    fontWeight: 'bold',
  },
  fab: {
    position: 'absolute',
    right: wp(5),
    bottom: hp(3),
    backgroundColor: '#006D5B',
    width: wp(15),
    height: wp(15),
    borderRadius: wp(7.5),
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: hp(0.3) },
    shadowOpacity: 0.25,
    shadowRadius: wp(1),
    elevation: 5,
  },
  fabText: {
    fontSize: wp(7),
    color: 'white',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: wp(5),
    padding: wp(6),
    width: '80%',
    maxWidth: wp(80),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: hp(0.3) },
    shadowOpacity: 0.25,
    shadowRadius: wp(1),
    elevation: 5,
  },
  modalTitle: {
    fontSize: wp(5),
    fontWeight: 'bold',
    marginBottom: hp(1),
    textAlign: 'center',
    color: '#333',
  },
  modalSubtitle: {
    fontSize: wp(3.7),
    marginBottom: hp(2),
    textAlign: 'center',
    color: '#666',
  },
  optionButton: {
    backgroundColor: '#f8f9fa',
    padding: hp(1.8),
    borderRadius: wp(2.5),
    marginBottom: hp(1.5),
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  optionText: {
    fontSize: wp(4),
    textAlign: 'center',
    color: '#333',
    fontWeight: '500',
  },
  cancelButton: {
    backgroundColor: '#6c757d',
    padding: hp(1.8),
    borderRadius: wp(2.5),
    marginTop: hp(1.5),
  },
  cancelButtonText: {
    fontSize: wp(4),
    textAlign: 'center',
    color: 'white',
    fontWeight: '500',
  },
  // --- NEW/FIXED SUB-TRANSPORT STYLES ---
  subTransportAggregatedHeader: {
    fontSize: wp(4),
    fontWeight: 'bold',
    color: '#3498db', // Using a distinct color for the sub-header
    textAlign: 'center',
    paddingVertical: hp(1),
    marginBottom: hp(1),
    backgroundColor: '#f1f8ff', // Light background for contrast
    borderRadius: wp(1),
  },
  subTripDetailContainer: {
    paddingTop: hp(1.5),
    paddingBottom: hp(1.5),
    marginTop: hp(1.5),
    // Use dashed border for a subtle separation
    borderTopWidth: 1, 
    borderTopColor: '#e9ecef', 
  },
  subTripHeader: {
    fontSize: wp(4.1),
    fontWeight: 'bold',
    color: '#006D5B', // Theme color for individual trip name
    marginBottom: hp(1),
    paddingBottom: hp(0.5),
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
});

export default TransportTripDashboard;