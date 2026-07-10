import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import {
  Button,
  Provider as PaperProvider,
  Card,
  Title,
  Checkbox,
  Divider,
} from 'react-native-paper';
import { apiService } from '../services/ApiServices';

const { width } = Dimensions.get('window');
const DriverExpensePreview = ({ route, navigation }) => {
  const { calculationData } = route.params;
  const [isCalculationConfirmed, setIsCalculationConfirmed] = useState(false);
  const [loading, setLoading] = useState(false);

  console.log('📊 Calculation Data Received:', calculationData);

  // Safely destructure with fallbacks
  const {
    driver_pay_details = {},
    extra_charges = {},
    final_summary = {},
    main_transport = {},
    sub_transport = {},
    totals = {},
    trip_info = {}
  } = calculationData || {};

 

  const handleEditCalculation = () => {
    navigation.goBack(); // Goes back to DriverExpenseForm
  };

  const formatCurrency = (amount) => {
    const numAmount = parseFloat(amount || 0);
    return `₹${numAmount.toLocaleString('en-IN')}`;
  };

  const formatDays = (days) => {
    return `${days} day${days !== 1 ? 's' : ''}`;
  };

  const getSalaryTypeText = (type) => {
    return type === 'perday' ? 'Per Day Basis' : 'Fixed Salary';
  };

  return (
    <PaperProvider>
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Title style={styles.title}>Calculation Preview</Title>
          <Text style={styles.subtitle}>
            Review all calculated amounts before final confirmation
          </Text>
        </View>

        {/* Trip Information Card */}
        <Card style={styles.sectionCard}>
          <Card.Content>
            <Text style={styles.sectionTitle}>🚗 Trip Information</Text>
            <View style={styles.tripInfoContainer}>
              <View style={styles.tripInfoRow}>
                <View style={styles.tripInfoItem}>
                  <Text style={styles.tripInfoLabel}>Transport ID</Text>
                  <Text style={styles.tripInfoValue}>{trip_info.transport_id || 'N/A'}</Text>
                </View>
                <View style={styles.tripInfoItem}>
                  <Text style={styles.tripInfoLabel}>Duration</Text>
                  <Text style={styles.tripInfoValue}>{formatDays(trip_info.days || 0)}</Text>
                </View>
              </View>
              <View style={styles.tripInfoRow}>
                <View style={styles.tripInfoItem}>
                  <Text style={styles.tripInfoLabel}>Salary Type</Text>
                  <Text style={styles.tripInfoValue}>{getSalaryTypeText(trip_info.salary_type)}</Text>
                </View>
                <View style={styles.tripInfoItem}>
                  <Text style={styles.tripInfoLabel}>Period</Text>
                  <Text style={styles.tripInfoValue}>
                    {trip_info.start_date} to {trip_info.end_date}
                  </Text>
                </View>
              </View>
            </View>
          </Card.Content>
        </Card>

        {/* Driver Payment Details */}
        <Card style={styles.sectionCard}>
          <Card.Content>
            <Text style={styles.sectionTitle}>👨‍💼 Driver Payment Details</Text>
            <View style={styles.detailsContainer}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Per Day Salary</Text>
                <Text style={styles.detailValue}>
                  {formatCurrency(driver_pay_details.per_day_salary)}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Per Day Fooding</Text>
                <Text style={styles.detailValue}>
                  {formatCurrency(driver_pay_details.per_day_fooding)}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Total Salary</Text>
                <Text style={styles.detailValue}>
                  {formatCurrency(driver_pay_details.total_salary)}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Total Fooding</Text>
                <Text style={styles.detailValue}>
                  {formatCurrency(driver_pay_details.total_fooding)}
                </Text>
              </View>
              
              <Divider style={styles.divider} />
              
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Incentive</Text>
                <Text style={[styles.detailValue, styles.positiveAmount]}>
                  +{formatCurrency(driver_pay_details.incentive)}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Shortage</Text>
                <Text style={[styles.detailValue, styles.negativeAmount]}>
                  -{formatCurrency(driver_pay_details.shortage)}
                </Text>
              </View>
              
              <Divider style={styles.divider} />
              
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Gross Pay</Text>
                <Text style={[styles.detailValue, styles.boldText]}>
                  {formatCurrency(driver_pay_details.gross_pay)}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Driver Cash Balance</Text>
                <Text style={styles.detailValue}>
                  {formatCurrency(driver_pay_details.driver_cash_balance)}
                </Text>
              </View>
              <View style={[styles.detailRow, styles.netPayRow]}>
                <Text style={[styles.detailLabel, styles.boldText]}>Net Pay After Balance</Text>
                <Text style={[
                  styles.detailValue, 
                  styles.boldText,
                  styles.largeText,
                  (driver_pay_details.net_pay_after_balance || 0) < 0 ? styles.negativeAmount : styles.positiveAmount
                ]}>
                  {formatCurrency(driver_pay_details.net_pay_after_balance)}
                </Text>
              </View>
            </View>
          </Card.Content>
        </Card>

        {/* Extra Charges */}
        <Card style={styles.sectionCard}>
          <Card.Content>
            <Text style={styles.sectionTitle}>💰 Extra Charges</Text>
            <View style={styles.detailsContainer}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Fastag Amount</Text>
                <Text style={styles.detailValue}>
                  {formatCurrency(extra_charges.fastag)}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Other Charges</Text>
                <Text style={styles.detailValue}>
                  {formatCurrency(extra_charges.other_charges)}
                </Text>
              </View>
            </View>
          </Card.Content>
        </Card>

        {/* Transport Breakdown */}
        <Card style={styles.sectionCard}>
          <Card.Content>
            <Text style={styles.sectionTitle}>📊 Transport Breakdown</Text>
            
            <Text style={styles.subsectionTitle}>Main Transport</Text>
            <View style={styles.detailsContainer}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Rent</Text>
                <Text style={styles.detailValue}>
                  {formatCurrency(main_transport.rent)}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Driver Expense</Text>
                <Text style={styles.detailValue}>
                  {formatCurrency(main_transport.driver_expense)}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Vehicle Expense</Text>
                <Text style={styles.detailValue}>
                  {formatCurrency(main_transport.vehicle_expense)}
                </Text>
              </View>
            </View>

            <Text style={styles.subsectionTitle}>Sub Transport Total</Text>
            <View style={styles.detailsContainer}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Rent</Text>
                <Text style={styles.detailValue}>
                  {formatCurrency(sub_transport.rent)}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Driver Expense</Text>
                <Text style={styles.detailValue}>
                  {formatCurrency(sub_transport.driver_expense)}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Vehicle Expense</Text>
                <Text style={styles.detailValue}>
                  {formatCurrency(sub_transport.vehicle_expense)}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Advance Account</Text>
                <Text style={styles.detailValue}>
                  {formatCurrency(sub_transport.advance_account)}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Advance by Company</Text>
                <Text style={styles.detailValue}>
                  {formatCurrency(sub_transport.advance_by_company)}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Driver Cash</Text>
                <Text style={styles.detailValue}>
                  {formatCurrency(sub_transport.driver_cash)}
                </Text>
              </View>
            </View>
          </Card.Content>
        </Card>

        {/* Final Summary */}
        

        {/* Total Amounts */}
        <Card style={styles.sectionCard}>
          <Card.Content>
            <Text style={styles.sectionTitle}>📈 Total Amounts</Text>
            <View style={styles.detailsContainer}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Total Trip Rent</Text>
                <Text style={styles.detailValue}>
                  {formatCurrency(totals.total_trip_rent)}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Total Vehicle Expense</Text>
                <Text style={styles.detailValue}>
                  {formatCurrency(totals.total_vehicle_expense)}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Extra Driver Expense</Text>
                <Text style={styles.detailValue}>
                  {formatCurrency(totals.total_driver_expense)}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Received Amount</Text>
                <Text style={styles.detailValue}>
                  {formatCurrency(totals.total_advance_account)}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Driver Advance by Company</Text>
                <Text style={styles.detailValue}>
                  {formatCurrency(totals.total_advance_by_company)}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Driver Cash By party/company</Text>
                <Text style={styles.detailValue}>
                  {formatCurrency(totals.total_driver_cash)}
                </Text>
              </View>
            </View>
          </Card.Content>
        </Card>
<Card style={[styles.sectionCard, styles.finalSummaryCard]}>
          <Card.Content>
            <Text style={styles.sectionTitle}>🎯 Final Summary</Text>
            <View style={styles.summaryContainer}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Total fare including main & Sub</Text>
                <Text style={styles.summaryValue}>
                  {formatCurrency(totals.total_trip_rent)}
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Total Expenses</Text>
                <Text style={styles.summaryValue}>
                  {formatCurrency(final_summary.total_trip_expense)}
                </Text>
              </View>
              <Divider style={styles.finalDivider} />
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, styles.netProfitLabel]}>NET PROFIT</Text>
                <Text style={[styles.summaryValue, styles.netProfitValue]}>
                  {formatCurrency(final_summary.net_profit)}
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, styles.netProfitLabel]}>ADVANCED</Text>
                <Text style={[styles.summaryValue, styles.netProfitValue]}>
                  {formatCurrency(totals.total_advance_account)}
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, styles.netProfitLabel]}>DUE AMOUNT</Text>
                <Text style={[styles.summaryValue, styles.netProfitValue]}>
                  {formatCurrency(final_summary.net_profit-totals.total_advance_account)}
                </Text>
              </View>
            </View>
          </Card.Content>
        </Card>
       
        <View style={styles.buttonContainer}>
          <Button
            mode="outlined"
            style={[styles.button, styles.editButton]}
            onPress={handleEditCalculation}
            disabled={loading}
            icon="pencil"
          >
            Edit Calculation
          </Button>
          
        </View>
      </ScrollView>
    </PaperProvider>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 30,
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    elevation: 2,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#006D5B',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  sectionCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  finalSummaryCard: {
    backgroundColor: '#f0f9f4',
    borderColor: '#4caf50',
    borderWidth: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#006D5B',
    marginBottom: 16,
  },
  subsectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginTop: 8,
    marginBottom: 12,
    paddingLeft: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#006D5B',
  },
  tripInfoContainer: {
    marginTop: 8,
  },
  tripInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  tripInfoItem: {
    flex: 1,
    paddingHorizontal: 4,
  },
  tripInfoLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
    fontWeight: '500',
  },
  tripInfoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  detailsContainer: {
    marginTop: 8,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  detailLabel: {
    fontSize: 14,
    color: '#555',
    flex: 1,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    textAlign: 'right',
  },
  netPayRow: {
    backgroundColor: '#f8f9fa',
    borderRadius: 6,
    paddingHorizontal: 8,
    marginTop: 4,
  },
  positiveAmount: {
    color: '#4caf50',
    fontWeight: '600',
  },
  negativeAmount: {
    color: '#ff4444',
    fontWeight: '600',
  },
  boldText: {
    fontWeight: 'bold',
  },
  largeText: {
    fontSize: 16,
  },
  summaryContainer: {
    marginTop: 8,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  summaryLabel: {
    fontSize: 15,
    color: '#555',
    fontWeight: '500',
  },
  summaryValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  netProfitLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#006D5B',
  },
  netProfitValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#006D5B',
  },
  divider: {
    marginVertical: 8,
    backgroundColor: '#e0e0e0',
  },
  finalDivider: {
    marginVertical: 12,
    backgroundColor: '#4caf50',
    height: 2,
  },
  confirmationCard: {
    backgroundColor: '#fff8e1',
    borderColor: '#ffd54f',
    borderWidth: 2,
    borderRadius: 12,
    marginBottom: 20,
  },
  confirmationContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  confirmationTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  confirmationTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#856404',
    marginBottom: 4,
  },
  confirmationText: {
    fontSize: 14,
    color: '#856404',
    lineHeight: 20,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  button: {
    flex: 1,
    marginHorizontal: 6,
    paddingVertical: 8,
    borderRadius: 8,
  },
  editButton: {
    borderColor: '#006D5B',
  },
  confirmButton: {
    backgroundColor: '#006D5B',
  },
});
export default DriverExpensePreview;