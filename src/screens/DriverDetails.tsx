import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  StatusBar,
  TextInput,
  Modal,
  ScrollView,
  Alert,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  RefreshControl,
  useWindowDimensions,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { apiService } from '../services/ApiServices';

const { width, height } = Dimensions.get('window');
const BankStatementScreen = ({ route, navigation }) => {
  const driverId = route.params?.driverId.id;
  const { width: windowWidth } = useWindowDimensions();
  const isSmallScreen = windowWidth < 375;
  // State Management
  const [driver, setDriver] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [filteredTransactions, setFilteredTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [detailsModalVisible, setDetailsModalVisible] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [accountSummary, setAccountSummary] = useState(null);
  const [saving, setSaving] = useState(false);
  const [selectedTransactions, setSelectedTransactions] = useState([]);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  
  // New transaction form state
  const [newTransaction, setNewTransaction] = useState({
    type: 'debit',
    amount: '',
    description: '',
    mode: 'UPI',
    transaction_id: '',
    date: new Date().toISOString().split('T')[0],
    time: new Date().toLocaleTimeString('en-IN', { hour12: false, hour: '2-digit', minute: '2-digit' }),
    reference_no: `REF${Math.floor(Math.random() * 1000000000)}`,
    bank_ref_no: `BANK${Math.floor(Math.random() * 1000000000)}`,
    status: 'SUCCESS',
  });

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [errors, setErrors] = useState({});

  // Filter States
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    type: 'all',
    minAmount: '',
    maxAmount: '',
    search: '',
    mode: 'all',
    status: 'all',
  });

  // Calculate running balance and prepare table data
  const prepareTableData = useCallback((transactionsList, summary) => {
    let balance = summary?.current_balance || 0;
    const sortedTransactions = [...transactionsList].sort((a, b) => {
      const dateA = new Date(`${a.date}T${a.time}`);
      const dateB = new Date(`${b.date}T${b.time}`);
      return dateB - dateA;
    });
    const transactionsWithBalance = sortedTransactions.map(transaction => {
      if (transaction.type === 'credit') {
        balance += parseFloat(transaction.amount);
      } else {
        balance -= parseFloat(transaction.amount);
      }
      
      return {
        ...transaction,
        running_balance: balance
      };
    });

    return transactionsWithBalance;
  }, []);

  // Fetch driver and transactions
  const fetchDriverAndTransactions = async () => {
    try {
      setLoading(true);
      const response = await apiService.GetDriverTransactions(driverId);
      
      if (response.status) {
        setDriver(response.driver);
        setAccountSummary(response.summary);
        
        if (response.transactions && response.transactions.length > 0) {
          const transactionsWithBalance = prepareTableData(response.transactions, response.summary);
          setTransactions(response.transactions);
          setFilteredTransactions(transactionsWithBalance);
        } else {
          setTransactions([]);
          setFilteredTransactions([]);
        }
      } else {
        Alert.alert('Error', response.message || 'Failed to fetch transactions');
      }
    } catch (error) {
      console.error('Error fetching transactions:', error);
      Alert.alert('Error', 'Failed to load transactions');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Filter transactions
  const applyFilters = async () => {
    try {
      setLoading(true);
      const filterParams = {};
      
      if (filters.startDate) filterParams.startDate = filters.startDate;
      if (filters.endDate) filterParams.endDate = filters.endDate;
      if (filters.type !== 'all') filterParams.type = filters.type;
      if (filters.mode !== 'all') filterParams.mode = filters.mode;
      if (filters.status !== 'all') filterParams.status = filters.status;
      if (filters.minAmount) filterParams.minAmount = filters.minAmount;
      if (filters.maxAmount) filterParams.maxAmount = filters.maxAmount;
      if (filters.search) filterParams.search = filters.search;

      const response = await apiService.FilterTransactions(driverId, filterParams);
      
      if (response.status) {
        if (response.transactions && response.transactions.length > 0) {
          const transactionsWithBalance = prepareTableData(response.transactions, response.summary);
          setFilteredTransactions(transactionsWithBalance);
        } else {
          setFilteredTransactions([]);
        }
        setAccountSummary(response.summary);
        setFilterModalVisible(false);
      }
    } catch (error) {
      console.error('Filter error:', error);
      Alert.alert('Error', 'Failed to apply filters');
    } finally {
      setLoading(false);
    }
  };

  // Add new transaction
  const handleAddTransaction = async () => {
    if (!newTransaction.amount || !newTransaction.description || !newTransaction.transaction_id) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    try {
      setSaving(true);
      setErrors({});

      const transactionData = {
        ...newTransaction,
        amount: parseFloat(newTransaction.amount),
      };

      const response = await apiService.CreateTransaction(driverId, transactionData);
      
      if (response.status) {
        Alert.alert('Success', response.message || 'Transaction added successfully!');
        setAddModalVisible(false);
        resetNewTransactionForm();
        fetchDriverAndTransactions();
      } else {
        if (response.errors) {
          setErrors(response.errors);
          Alert.alert('Validation Error', 'Please check the form fields');
        } else {
          Alert.alert('Error', response.message || 'Failed to add transaction');
        }
      }
    } catch (error) {
      console.error('Add transaction error:', error);
      Alert.alert('Error', error.message || 'Failed to add transaction');
    } finally {
      setSaving(false);
    }
  };

  // Delete selected transactions
  const handleDeleteSelected = async () => {
    if (selectedTransactions.length === 0) {
      Alert.alert('No Selection', 'Please select transactions to delete');
      return;
    }

    Alert.alert(
      'Confirm Delete',
      `Are you sure you want to delete ${selectedTransactions.length} transaction(s)?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await apiService.DeleteMultipleTransactions(driverId, {
                transaction_ids: selectedTransactions
              });
              
              if (response.status) {
                Alert.alert('Success', response.message || 'Transactions deleted successfully!');
                setSelectedTransactions([]);
                setIsSelectionMode(false);
                fetchDriverAndTransactions();
              } else {
                Alert.alert('Error', response.message || 'Failed to delete transactions');
              }
            } catch (error) {
              console.error('Delete error:', error);
              Alert.alert('Error', 'Failed to delete transactions');
            }
          },
        },
      ]
    );
  };

  // Handle row click
  const handleRowClick = (transaction) => {
    if (!transaction) return;
    
    if (isSelectionMode) {
      toggleTransactionSelection(transaction.id);
    } else {
      setSelectedTransaction(transaction);
      setDetailsModalVisible(true);
    }
  };

  // Toggle transaction selection
  const toggleTransactionSelection = (id) => {
    if (selectedTransactions.includes(id)) {
      setSelectedTransactions(selectedTransactions.filter(item => item !== id));
    } else {
      setSelectedTransactions([...selectedTransactions, id]);
    }
  };

  // Reset new transaction form
  const resetNewTransactionForm = () => {
    setNewTransaction({
      type: 'debit',
      amount: '',
      description: '',
      mode: 'UPI',
      transaction_id: '',
      date: new Date().toISOString().split('T')[0],
      time: new Date().toLocaleTimeString('en-IN', { hour12: false, hour: '2-digit', minute: '2-digit' }),
      reference_no: `REF${Math.floor(Math.random() * 1000000000)}`,
      bank_ref_no: `BANK${Math.floor(Math.random() * 1000000000)}`,
      status: 'SUCCESS',
    });
    setErrors({});
  };

  // Reset filters
  const resetFilters = () => {
    setFilters({
      startDate: '',
      endDate: '',
      type: 'all',
      minAmount: '',
      maxAmount: '',
      search: '',
      mode: 'all',
      status: 'all',
    });
    fetchDriverAndTransactions();
    setFilterModalVisible(false);
  };

  // Format currency in INR
  const formatINR = (amount) => {
    if (!amount && amount !== 0) return '₹0.00';
    return `₹${parseFloat(amount).toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  // Format date to DD/MM/YYYY
  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).replace(/-/g, '/');
  };

  // Format time to HH:MM
  const formatTime = (timeStr) => {
    if (!timeStr) return '';
    return timeStr.split(':').slice(0, 2).join(':');
  };

  // Truncate text
  const truncateText = (text, maxLength) => {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  // Get status color
  const getStatusColor = (status) => {
    switch(status) {
      case 'SUCCESS': return '#4caf50';
      case 'PENDING': return '#ff9800';
      case 'FAILED': return '#f44336';
      default: return '#757575';
    }
  };

  // Get status icon
  const getStatusIcon = (status) => {
    switch(status) {
      case 'SUCCESS': return 'check-circle';
      case 'PENDING': return 'schedule';
      case 'FAILED': return 'error';
      default: return 'help';
    }
  };

  // Get mode icon
  const getModeIcon = (mode) => {
    switch(mode) {
      case 'UPI': return 'smartphone';
      case 'NEFT': return 'account-balance';
      case 'IMPS': return 'flash-on';
      case 'RTGS': return 'account-balance';
      case 'Debit Card': return 'credit-card';
      case 'ATM': return 'atm';
      case 'Cash': return 'money';
      case 'Cheque': return 'receipt';
      default: return 'payment';
    }
  };

  // Get mode color
  const getModeColor = (mode) => {
    switch(mode) {
      case 'UPI': return '#674ea7';
      case 'NEFT': return '#2196f3';
      case 'IMPS': return '#ff9800';
      case 'RTGS': return '#4caf50';
      case 'Debit Card': return '#f44336';
      case 'ATM': return '#9c27b0';
      case 'Cash': return '#ff5722';
      case 'Cheque': return '#795548';
      default: return '#757575';
    }
  };

  // Render table header
  const renderTableHeader = () => (
    <View style={styles.tableHeader}>
      <View style={[styles.tableHeaderCell, styles.dateTimeHeaderCell]}>
        <Text style={styles.tableHeaderText}>Date/Time</Text>
      </View>
      <View style={[styles.tableHeaderCell, styles.amountHeaderCell]}>
        <Text style={styles.tableHeaderText}>Credit</Text>
      </View>
      <View style={[styles.tableHeaderCell, styles.amountHeaderCell]}>
        <Text style={styles.tableHeaderText}>Debit</Text>
      </View>
      <View style={[styles.tableHeaderCell, styles.balanceHeaderCell]}>
        <Text style={styles.tableHeaderText}>Balance</Text>
      </View>
    </View>
  );

  // Render table row
  const renderTableRow = ({ item, index }) => {
    if (!item) return null;
    
    const isSelected = selectedTransactions.includes(item.id);
    
    return (
      <TouchableOpacity 
        onPress={() => handleRowClick(item)}
        onLongPress={() => {
          setIsSelectionMode(true);
          toggleTransactionSelection(item.id);
        }}
        activeOpacity={0.7}
        delayLongPress={200}
        style={[
          styles.tableRow,
          index % 2 === 0 ? styles.evenRow : styles.oddRow,
          isSelected && styles.selectedRow,
        ]}
      >
        {isSelectionMode && (
          <View style={styles.selectionIndicator}>
            {isSelected && (
              <Icon name="check-circle" size={16} color="#006D5B" />
            )}
          </View>
        )}
        
        {/* Date/Time Column */}
        <View style={[styles.tableCell, styles.dateTimeCell]}>
          <Text style={styles.dateText}>{formatDate(item.date)}</Text>
          <Text style={styles.timeText}>{formatTime(item.time)}</Text>
          <Text style={styles.txnIdText}>ID: {truncateText(item.transaction_id, 12)}</Text>
        </View>
        
        {/* Credit Column */}
        <View style={[styles.tableCell, styles.amountCell]}>
          {item.type === 'credit' ? (
            <Text style={[styles.cellText, styles.creditAmount]}>
              {formatINR(item.amount)}
            </Text>
          ) : (
            <Text style={styles.emptyCell}>-</Text>
          )}
        </View>
        
        {/* Debit Column */}
        <View style={[styles.tableCell, styles.amountCell]}>
          {item.type === 'debit' ? (
            <Text style={[styles.cellText, styles.debitAmount]}>
              {formatINR(item.amount)}
            </Text>
          ) : (
            <Text style={styles.emptyCell}>-</Text>
          )}
        </View>
        
        {/* Balance Column */}
        <View style={[styles.tableCell, styles.balanceCell]}>
          <Text style={[styles.cellText, styles.boldItalicBalance]}>
            {formatINR(item.balance)}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  // Render empty state
  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Icon name="receipt" size={80} color="#e0e0e0" />
      <Text style={styles.emptyStateTitle}>No transactions found</Text>
      <Text style={styles.emptyStateText}>
        {filters.search ? 'Try adjusting your search' : 'Add your first transaction'}
      </Text>
      <TouchableOpacity 
        style={styles.emptyStateButton}
        onPress={() => setAddModalVisible(true)}
      >
        <Icon name="add" size={16} color="#fff" />
        <Text style={styles.emptyStateButtonText}>Add Transaction</Text>
      </TouchableOpacity>
    </View>
  );

  // Load data on mount
  useEffect(() => {
    if (driverId) {
      fetchDriverAndTransactions();
    }
  }, [driverId]);

  // Apply filters when search query changes (debounced)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (filters.search !== undefined) {
        applyFilters();
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [filters.search]);

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#006D5B" />
          <Text style={styles.loadingText}>Loading transactions...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#006D5B" />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Icon name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headerInfo}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              Bank Statement
            </Text>
            <Text style={styles.headerSubtitle} numberOfLines={1}>
              {driver?.name || 'Loading...'}
            </Text>
          </View>
        </View>
        <TouchableOpacity style={styles.addButton} onPress={() => setAddModalVisible(true)}>
          <Icon name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Compact Balance Summary */}
      <View style={styles.compactBalanceContainer}>
        <View style={styles.compactBalanceRow}>
          <View style={styles.compactBalanceItem}>
            <Icon name="account-balance" size={18} color="#006D5B" />
            <Text style={styles.compactBalanceLabel}>Balance:</Text>
            <Text style={styles.compactBalanceValue}>
              {formatINR(accountSummary?.current_balance || 0)}
            </Text>
          </View>
          
        </View>
      </View>

      {/* Action Bar */}
      <View style={styles.actionBar}>
        <View style={styles.searchContainer}>
          <Icon name="search" size={20} color="#666" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search transactions..."
            value={filters.search}
            onChangeText={(text) => setFilters({...filters, search: text})}
            placeholderTextColor="#999"
          />
          {filters.search ? (
            <TouchableOpacity onPress={() => setFilters({...filters, search: ''})}>
              <Icon name="close" size={20} color="#666" />
            </TouchableOpacity>
          ) : null}
        </View>

        <View style={styles.actionButtons}>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => setFilterModalVisible(true)}
          >
            <Icon name="filter-list" size={22} color="#006D5B" />
            {Object.values(filters).some(f => f !== '' && f !== 'all') && (
              <View style={styles.filterIndicator} />
            )}
          </TouchableOpacity>

          {isSelectionMode ? (
            <>
              <TouchableOpacity 
                style={[styles.actionButton, styles.deleteButton]}
                onPress={handleDeleteSelected}
              >
                <Icon name="delete" size={22} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.actionButton, styles.cancelButton]}
                onPress={() => {
                  setIsSelectionMode(false);
                  setSelectedTransactions([]);
                }}
              >
                <Icon name="close" size={22} color="#fff" />
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => setIsSelectionMode(true)}
            >
              <Icon name="checklist" size={22} color="#006D5B" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={styles.tableContainer}>
        {renderTableHeader()}
        <FlatList
          data={filteredTransactions}
          renderItem={renderTableRow}
          keyExtractor={(item, index) => item?.id?.toString() || index.toString()}
          ListEmptyComponent={renderEmptyState}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                fetchDriverAndTransactions();
              }}
              colors={['#006D5B']}
            />
          }
          showsVerticalScrollIndicator={true}
          initialNumToRender={10}
          maxToRenderPerBatch={10}
          windowSize={5}
        />
      </View>

      {/* Transaction Details Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={detailsModalVisible}
        onRequestClose={() => setDetailsModalVisible(false)}
      >
        <View style={styles.detailsModalOverlay}>
          <View style={styles.detailsModalContainer}>
            {selectedTransaction && (
              <>
                <View style={styles.detailsModalHeader}>
                  <View style={styles.detailsModalTitleContainer}>
                    <Icon name="receipt" size={24} color="#006D5B" />
                    <Text style={styles.detailsModalTitle}>Transaction Details</Text>
                  </View>
                  <TouchableOpacity 
                    onPress={() => setDetailsModalVisible(false)}
                  >
                    <Icon name="close" size={24} color="#333" />
                  </TouchableOpacity>
                </View>

                <ScrollView style={styles.detailsModalContent}>
                  {/* Transaction Type and Amount */}
                  <View style={styles.detailsSection}>
                    <View style={styles.typeAmountContainer}>
                      <View style={[
                        styles.typeBadge,
                        selectedTransaction.type === 'credit' ? styles.creditBadge : styles.debitBadge
                      ]}>
                        <Text style={styles.typeBadgeText}>
                          {selectedTransaction.type?.toUpperCase()}
                        </Text>
                      </View>
                      <Text style={[
                        styles.detailsAmount,
                        selectedTransaction.type === 'credit' ? styles.creditAmount : styles.debitAmount
                      ]}>
                        {selectedTransaction.type === 'credit' ? '+' : '-'} {formatINR(selectedTransaction.amount)}
                      </Text>
                    </View>
                  </View>
                  
                  {/* Status */}
                  <View style={styles.detailsSection}>
                    <View style={[
                      styles.statusContainer,
                      { backgroundColor: `${getStatusColor(selectedTransaction.status)}15` }
                    ]}>
                      <Icon 
                        name={getStatusIcon(selectedTransaction.status)} 
                        size={20} 
                        color={getStatusColor(selectedTransaction.status)} 
                      />
                      <Text style={[
                        styles.statusText,
                        { color: getStatusColor(selectedTransaction.status) }
                      ]}>
                        {selectedTransaction.status}
                      </Text>
                    </View>
                  </View>

                  {/* Basic Details */}
                  <View style={styles.detailsGrid}>
                    <View style={styles.detailItem}>
                      <Text style={styles.detailLabel}>Date</Text>
                      <Text style={styles.detailValue}>
                        {formatDate(selectedTransaction.date)}
                      </Text>
                    </View>
                    <View style={styles.detailItem}>
                      <Text style={styles.detailLabel}>Time</Text>
                      <Text style={styles.detailValue}>
                        {formatTime(selectedTransaction.time)}
                      </Text>
                    </View>
                  </View>

                  {/* Description */}
                  <View style={styles.detailsSection}>
                    <Text style={styles.detailLabel}>Description</Text>
                    <Text style={styles.descriptionText}>
                      {selectedTransaction.description}
                    </Text>
                  </View>

                  {/* Payment Details */}
                  <View style={styles.detailsSection}>
                    <Text style={styles.detailLabel}>Payment Details</Text>
                    <View style={styles.detailsGrid}>
                      <View style={styles.detailItem}>
                        <Icon name="payment" size={16} color="#666" />
                        <Text style={styles.detailLabelSmall}>Mode:</Text>
                        <Text style={styles.detailValue}>{selectedTransaction.mode}</Text>
                      </View>
                      <View style={styles.detailItem}>
                        <Icon name="receipt" size={16} color="#666" />
                        <Text style={styles.detailLabelSmall}>Txn ID:</Text>
                        <Text style={styles.detailValue}>{selectedTransaction.transaction_id}</Text>
                      </View>
                    </View>
                  </View>

                  {/* Reference Numbers */}
                  <View style={styles.detailsSection}>
                    <Text style={styles.detailLabel}>Reference Numbers</Text>
                    <View style={styles.referenceGrid}>
                      <View style={styles.referenceItem}>
                        <Text style={styles.referenceLabel}>Reference No:</Text>
                        <Text style={styles.referenceValue}>{selectedTransaction.reference_no}</Text>
                      </View>
                      <View style={styles.referenceItem}>
                        <Text style={styles.referenceLabel}>Bank Ref No:</Text>
                        <Text style={styles.referenceValue}>{selectedTransaction.bank_ref_no}</Text>
                      </View>
                    </View>
                  </View>

                  {/* Created At */}
                  {selectedTransaction.created_at && (
                    <View style={styles.detailsSection}>
                      <Text style={styles.detailLabel}>Transaction Created</Text>
                      <Text style={styles.detailValue}>
                        {new Date(selectedTransaction.created_at).toLocaleString('en-IN')}
                      </Text>
                    </View>
                  )}
                </ScrollView>

                <View style={styles.detailsModalActions}>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.closeDetailsButton]}
                    onPress={() => setDetailsModalVisible(false)}
                  >
                    <Text style={styles.closeDetailsButtonText}>Close</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Add Transaction Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={addModalVisible}
        onRequestClose={() => !saving && setAddModalVisible(false)}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleContainer}>
                <Icon name="receipt" size={24} color="#006D5B" />
                <Text style={styles.modalTitle}>Add New Transaction</Text>
              </View>
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={() => !saving && setAddModalVisible(false)}
              >
                <Icon name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
              {/* Transaction Type */}
              <View style={styles.formSection}>
                <Text style={styles.sectionTitle}>
                  <Text style={styles.required}>* </Text>
                  Transaction Type
                </Text>
                <View style={styles.typeButtons}>
                  <TouchableOpacity
                    style={[
                      styles.typeButton,
                      newTransaction.type === 'credit' && styles.typeButtonActive,
                      newTransaction.type === 'credit' && styles.creditButtonActive,
                    ]}
                    onPress={() => setNewTransaction({...newTransaction, type: 'credit'})}
                    disabled={saving}
                  >
                    <Icon name="arrow-downward" size={20} color={newTransaction.type === 'credit' ? '#fff' : '#4caf50'} />
                    <Text style={[
                      styles.typeButtonText,
                      newTransaction.type === 'credit' && styles.typeButtonTextActive,
                    ]}>Credit</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[
                      styles.typeButton,
                      newTransaction.type === 'debit' && styles.typeButtonActive,
                      newTransaction.type === 'debit' && styles.debitButtonActive,
                    ]}
                    onPress={() => setNewTransaction({...newTransaction, type: 'debit'})}
                    disabled={saving}
                  >
                    <Icon name="arrow-upward" size={20} color={newTransaction.type === 'debit' ? '#fff' : '#f44336'} />
                    <Text style={[
                      styles.typeButtonText,
                      newTransaction.type === 'debit' && styles.typeButtonTextActive,
                    ]}>Debit</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Transaction Details */}
              <View style={styles.detailsGrid}>
                <View style={styles.gridItem}>
                  <Text style={styles.sectionTitle}>
                    <Text style={styles.required}>* </Text>
                    Transaction ID
                  </Text>
                  <TextInput
                    style={[styles.input, errors.transaction_id && styles.inputError]}
                    value={newTransaction.transaction_id}
                    onChangeText={(text) => {
                      setNewTransaction({...newTransaction, transaction_id: text});
                      if (errors.transaction_id) setErrors({...errors, transaction_id: null});
                    }}
                    placeholder="e.g., TXN001"
                    editable={!saving}
                  />
                  {errors?.transaction_id && (
                    <Text style={styles.errorText}>{errors.transaction_id[0]}</Text>
                  )}
                </View>

                <View style={styles.gridItem}>
                  <Text style={styles.sectionTitle}>
                    <Text style={styles.required}>* </Text>
                    Amount (₹)
                  </Text>
                  <TextInput
                    style={[styles.input, errors.amount && styles.inputError]}
                    value={newTransaction.amount}
                    onChangeText={(text) => {
                      setNewTransaction({...newTransaction, amount: text});
                      if (errors.amount) setErrors({...errors, amount: null});
                    }}
                    placeholder="0.00"
                    keyboardType="decimal-pad"
                    editable={!saving}
                  />
                  {errors?.amount && (
                    <Text style={styles.errorText}>{errors.amount[0]}</Text>
                  )}
                </View>
              </View>

              {/* Description */}
              <View style={styles.formSection}>
                <Text style={styles.sectionTitle}>
                  <Text style={styles.required}>* </Text>
                  Description
                </Text>
                <TextInput
                  style={[styles.input, styles.textArea, errors.description && styles.inputError]}
                  value={newTransaction.description}
                  onChangeText={(text) => {
                    setNewTransaction({...newTransaction, description: text});
                    if (errors.description) setErrors({...errors, description: null});
                  }}
                  placeholder="Enter transaction description"
                  multiline
                  numberOfLines={3}
                  editable={!saving}
                />
                {errors?.description && (
                  <Text style={styles.errorText}>{errors.description[0]}</Text>
                )}
              </View>

              {/* Date and Time */}
              <View style={styles.formSection}>
                <Text style={styles.sectionTitle}>Date & Time</Text>
                <View style={styles.dateTimeContainer}>
                  <TouchableOpacity 
                    style={[styles.dateTimeButton, saving && styles.disabled]}
                    onPress={() => !saving && setShowDatePicker(true)}
                    disabled={saving}
                  >
                    <Icon name="calendar-today" size={18} color="#666" />
                    <Text style={styles.dateTimeText}>{newTransaction.date}</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={[styles.dateTimeButton, saving && styles.disabled]}
                    onPress={() => !saving && setShowTimePicker(true)}
                    disabled={saving}
                  >
                    <Icon name="access-time" size={18} color="#666" />
                    <Text style={styles.dateTimeText}>{newTransaction.time}</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Payment Mode */}
              <View style={styles.formSection}>
                <Text style={styles.sectionTitle}>Payment Mode</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.chipContainer}>
                    {['UPI', 'NEFT', 'IMPS', 'Debit Card', 'ATM', 'Cash', 'Cheque', 'Other'].map((mode) => (
                      <TouchableOpacity
                        key={mode}
                        style={[
                          styles.chip,
                          newTransaction.mode === mode && styles.chipActive,
                          { borderColor: getModeColor(mode) },
                          saving && styles.disabled,
                        ]}
                        onPress={() => !saving && setNewTransaction({...newTransaction, mode})}
                        disabled={saving}
                      >
                        <Icon name={getModeIcon(mode)} size={14} color={newTransaction.mode === mode ? '#fff' : getModeColor(mode)} />
                        <Text style={[
                          styles.chipText,
                          newTransaction.mode === mode && styles.chipTextActive,
                        ]}>
                          {mode}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </View>

              {/* Status */}
              <View style={styles.formSection}>
                <Text style={styles.sectionTitle}>Status</Text>
                <View style={styles.chipContainer}>
                  {['SUCCESS', 'PENDING', 'FAILED'].map((status) => (
                    <TouchableOpacity
                      key={status}
                      style={[
                        styles.statusChip,
                        newTransaction.status === status && styles.statusChipActive,
                        newTransaction.status === status && { backgroundColor: `${getStatusColor(status)}20`, borderColor: getStatusColor(status) }
                      ]}
                      onPress={() => !saving && setNewTransaction({...newTransaction, status})}
                      disabled={saving}
                    >
                      <Icon name={getStatusIcon(status)} size={14} color={newTransaction.status === status ? getStatusColor(status) : '#666'} />
                      <Text style={[
                        styles.chipText,
                        newTransaction.status === status && { color: getStatusColor(status) }
                      ]}>
                        {status}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelModalButton, saving && styles.disabled]}
                onPress={() => !saving && setAddModalVisible(false)}
                disabled={saving}
              >
                <Text style={styles.cancelModalButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.submitButton, saving && styles.disabled]}
                onPress={handleAddTransaction}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Icon name="check" size={18} color="#fff" />
                    <Text style={styles.submitButtonText}>Add Transaction</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>

        {/* Date Picker */}
        {showDatePicker && (
          <DateTimePicker
            value={new Date(newTransaction.date)}
            mode="date"
            display="default"
            onChange={(event, date) => {
              setShowDatePicker(false);
              if (date) {
                setNewTransaction({
                  ...newTransaction,
                  date: date.toISOString().split('T')[0],
                });
              }
            }}
          />
        )}

        {/* Time Picker */}
        {showTimePicker && (
          <DateTimePicker
            value={new Date(`2000-01-01T${newTransaction.time}`)}
            mode="time"
            display="default"
            onChange={(event, time) => {
              setShowTimePicker(false);
              if (time) {
                setNewTransaction({
                  ...newTransaction,
                  time: time.toLocaleTimeString('en-IN', { hour12: false, hour: '2-digit', minute: '2-digit' }),
                });
              }
            }}
          />
        )}
      </Modal>

      {/* Filter Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={filterModalVisible}
        onRequestClose={() => setFilterModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity 
            style={styles.modalOverlayTouchable}
            activeOpacity={1}
            onPress={() => setFilterModalVisible(false)}
          />
          <View style={[styles.modalContainer, isSmallScreen && styles.smallModalContainer]}>
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleContainer}>
                <Icon name="filter-list" size={24} color="#006D5B" />
                <Text style={styles.modalTitle}>Filter Transactions</Text>
              </View>
              <TouchableOpacity onPress={() => setFilterModalVisible(false)}>
                <Icon name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
              {/* Transaction Type */}
              <View style={styles.formSection}>
                <Text style={styles.sectionTitle}>Transaction Type</Text>
                <View style={[styles.typeButtons, isSmallScreen && styles.smallTypeButtons]}>
                  {['all', 'credit', 'debit'].map((type) => (
                    <TouchableOpacity
                      key={type}
                      style={[
                        styles.typeButton,
                        filters.type === type && styles.creditButtonActive,
                        filters.type === type && type === 'credit' && styles.creditButtonActive,
                        filters.type === type && type === 'debit' && styles.debitButtonActive,
                      ]}
                      onPress={() => setFilters({...filters, type})}
                    >
                      <Text style={[
                        styles.typeButtonText,
                        filters.type === type && styles.typeButtonTextActive,
                      ]}>
                        {type === 'all' ? 'All' : type === 'credit' ? 'Credits' : 'Debits'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Date Range */}
              <View style={styles.formSection}>
                <Text style={styles.sectionTitle}>Date Range</Text>
                <View style={[styles.dateInputs, isSmallScreen && styles.columnDateInputs]}>
                  <View style={styles.dateInput}>
                    <Text style={styles.inputLabel}>From Date</Text>
                    <TextInput
                      style={styles.input}
                      value={filters.startDate}
                      onChangeText={(text) => setFilters({...filters, startDate: text})}
                      placeholder="YYYY-MM-DD"
                    />
                  </View>
                  <View style={styles.dateInput}>
                    <Text style={styles.inputLabel}>To Date</Text>
                    <TextInput
                      style={styles.input}
                      value={filters.endDate}
                      onChangeText={(text) => setFilters({...filters, endDate: text})}
                      placeholder="YYYY-MM-DD"
                    />
                  </View>
                </View>
              </View>

              {/* Amount Range */}
              <View style={styles.formSection}>
                <Text style={styles.sectionTitle}>Amount Range (₹)</Text>
                <View style={[styles.amountInputs, isSmallScreen && styles.columnAmountInputs]}>
                  <View style={styles.amountInput}>
                    <TextInput
                      style={styles.input}
                      value={filters.minAmount}
                      onChangeText={(text) => setFilters({...filters, minAmount: text})}
                      placeholder="Min Amount"
                      keyboardType="numeric"
                    />
                  </View>
                  <Text style={styles.toText}>to</Text>
                  <View style={styles.amountInput}>
                    <TextInput
                      style={styles.input}
                      value={filters.maxAmount}
                      onChangeText={(text) => setFilters({...filters, maxAmount: text})}
                      placeholder="Max Amount"
                      keyboardType="numeric"
                    />
                  </View>
                </View>
              </View>

              {/* Payment Mode */}
              <View style={styles.formSection}>
                <Text style={styles.sectionTitle}>Payment Mode</Text>
                <View style={styles.chipContainer}>
                  {['all', 'UPI', 'NEFT', 'IMPS', 'Debit Card', 'ATM', 'Cash', 'Cheque', 'Other'].map((mode) => (
                    <TouchableOpacity
                      key={mode}
                      style={[
                        styles.chip,
                        filters.mode === mode && styles.chipActive,
                      ]}
                      onPress={() => setFilters({...filters, mode})}
                    >
                      <Text style={[
                        styles.chipText,
                        filters.mode === mode && styles.chipTextActive,
                      ]}>
                        {mode === 'all' ? 'All Modes' : mode}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Status Filter */}
              <View style={styles.formSection}>
                <Text style={styles.sectionTitle}>Status</Text>
                <View style={styles.chipContainer}>
                  {['all', 'SUCCESS', 'PENDING', 'FAILED'].map((status) => (
                    <TouchableOpacity
                      key={status}
                      style={[
                        styles.statusChip,
                        filters.status === status && styles.statusChipActive,
                        filters.status === status && { backgroundColor: `${getStatusColor(status)}20`, borderColor: getStatusColor(status) }
                      ]}
                      onPress={() => setFilters({...filters, status})}
                    >
                      <Text style={[
                        styles.chipText,
                        filters.status === status && { color: getStatusColor(status) }
                      ]}>
                        {status === 'all' ? 'All Status' : status}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.resetButton]}
                onPress={resetFilters}
              >
                <Icon name="refresh" size={18} color="#666" />
                <Text style={styles.resetButtonText}>Reset All</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.applyButton]}
                onPress={applyFilters}
              >
                <Icon name="check" size={18} color="#fff" />
                <Text style={styles.applyButtonText}>Apply Filters</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  header: {
    backgroundColor: '#006D5B',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 10 : 20,
    paddingBottom: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  headerContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    marginRight: 12,
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  headerSubtitle: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.9)',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#0fc0a3',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  // Compact Balance Summary
  compactBalanceContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  compactBalanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  compactBalanceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  compactBalanceLabel: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  compactBalanceValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#006D5B',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  compactCreditText: {
    fontSize: 12,
    color: '#4caf50',
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  compactDebitText: {
    fontSize: 12,
    color: '#f44336',
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  actionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    paddingHorizontal: 10,
    height: 36,
    marginRight: 8,
  },
  searchIcon: {
    marginRight: 6,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#333',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 6,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f8f9fa',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  deleteButton: {
    backgroundColor: '#f44336',
  },
  cancelButton: {
    backgroundColor: '#666',
  },
  filterIndicator: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#ff5722',
  },
  transactionsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  transactionsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  transactionsInfo: {
    fontSize: 11,
    color: '#666',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  selectionInfo: {
    fontSize: 11,
    color: '#006D5B',
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  tableContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  // Table Styles
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#006D5B',
    height: 40,
    borderBottomWidth: 1,
    borderBottomColor: '#005246',
  },
  tableHeaderCell: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderRightWidth: 1,
    borderRightColor: '#005246',
  },
  dateTimeHeaderCell: {
    flex: 2,
  },
  amountHeaderCell: {
    flex: 1,
  },
  balanceHeaderCell: {
    flex: 1.5,
    borderRightWidth: 0,
  },
  tableHeaderText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  tableRow: {
    flexDirection: 'row',
    minHeight: 60,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    position: 'relative',
    
  },
  evenRow: {
    backgroundColor: '#fff',
  },
  oddRow: {
    backgroundColor: '#f8f9fa',
  },
  selectedRow: {
    backgroundColor: '#e8f5e8',
  },
  selectionIndicator: {
    position: 'absolute',
    top: 4,
    left: 4,
    zIndex: 1,
  },
  tableCell: {
    justifyContent: 'center',
    paddingHorizontal: 4,
    paddingVertical: 6,
    borderRightWidth: 1,
    borderRightColor: '#f0f0f0',
    fontSize:16,
  },
  dateTimeCell: {
    flex: 2,
    alignItems: 'flex-start',
  },
  amountCell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  balanceCell: {
    flex: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: 0,
  },
  dateText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  timeText: {
    fontSize: 10,
    color: '#666',
    marginBottom: 2,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  txnIdText: {
    fontSize: 9,
    color: '#888',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  cellText: {
    fontSize: 12,
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  emptyCell: {
    fontSize: 12,
    color: '#ccc',
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  creditAmount: {
    color: '#4caf50',
    fontWeight: '600',
  },
  debitAmount: {
    color: '#f44336',
    fontWeight: '600',
  },
  boldItalicBalance: {
    fontWeight: 'bold',
    fontStyle: 'italic',
    color: '#006D5B',
  },
  // Details Modal Styles
  detailsModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  detailsModalContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    width: '100%',
    maxHeight: '80%',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  detailsModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  detailsModalTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  detailsModalTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  detailsModalContent: {
    padding: 16,
  },
  detailsModalActions: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    bottom:20,
  },
  detailsSection: {
    marginBottom: 16,
  },
  typeAmountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  typeBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  creditBadge: {
    backgroundColor: '#4caf50',
  },
  debitBadge: {
    backgroundColor: '#f44336',
  },
  typeBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  detailsAmount: {
    fontSize: 20,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    alignSelf: 'flex-start',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  detailsGrid: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
  },
  detailItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  detailLabelSmall: {
    fontSize: 11,
    color: '#666',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  detailValue: {
    fontSize: 13,
    color: '#333',
    fontWeight: '500',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  descriptionText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  referenceGrid: {
    gap: 10,
  },
  referenceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  referenceLabel: {
    fontSize: 11,
    color: '#666',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  referenceValue: {
    fontSize: 11,
    color: '#333',
    fontWeight: '500',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  closeDetailsButton: {
    backgroundColor: '#006D5B',
  },
  closeDetailsButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalOverlayTouchable: {
    flex: 1,
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: height * 0.85,
    width: '100%',
  },
  smallModalContainer: {
    maxHeight: height * 0.9,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  closeButton: {
    padding: 4,
  },
  modalContent: {
    padding: 16,
  },
  formSection: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  required: {
    color: '#f44336',
  },
  gridItem: {
    flex: 1,
  },
  typeButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  smallTypeButtons: {
    gap: 8,
  },
  typeButton: {
    flex: 1,
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#111111',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  typeButtonActive: {
    borderWidth: 2,
    color: '#121111',
  },
  creditButtonActive: {
    backgroundColor: '#4caf50',
    borderColor: '#4caf50',
  },
  debitButtonActive: {
    backgroundColor: '#f44336',
    borderColor: '#f44336',
  },
  typeButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  typeButtonTextActive: {
    color: '#fff',
  },
  input: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 10,
    padding: 12,
    fontSize: 13,
    backgroundColor: '#f8f9fa',
    color: '#333',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  inputError: {
    borderColor: '#f44336',
    borderWidth: 1,
  },
  errorText: {
    color: '#f44336',
    fontSize: 11,
    marginTop: 4,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  textArea: {
    height: 70,
    textAlignVertical: 'top',
  },
  dateTimeContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  dateTimeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    minHeight: 44,
  },
  dateTimeText: {
    fontSize: 13,
    color: '#333',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  chipActive: {
    backgroundColor: '#006D5B',
    borderColor: '#006D5B',
  },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  statusChipActive: {
    borderWidth: 2,
  },
  chipText: {
    fontSize: 11,
    fontWeight: '500',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  chipTextActive: {
    color: '#fff',
  },
  dateInputs: {
    flexDirection: 'row',
    gap: 10,
  },
  columnDateInputs: {
    flexDirection: 'column',
    gap: 10,
  },
  dateInput: {
    flex: 1,
  },
  amountInputs: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  columnAmountInputs: {
    flexDirection: 'column',
    gap: 10,
  },
  toText: {
    fontSize: 13,
    color: '#666',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  modalActions: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    gap: 10,
  },
  modalButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 10,
    minHeight: 44,
  },
  cancelModalButton: {
    backgroundColor: '#f8f9fa',
  },
  cancelModalButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  submitButton: {
    backgroundColor: '#006D5B',
  },
  submitButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  resetButton: {
    backgroundColor: '#f8f9fa',
  },
  resetButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  applyButton: {
    backgroundColor: '#006D5B',
  },
  applyButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  disabled: {
    opacity: 0.5,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 50,
    paddingHorizontal: 20,
  },
  emptyStateTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#999',
    marginTop: 16,
    marginBottom: 6,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  emptyStateText: {
    fontSize: 13,
    color: '#ccc',
    marginBottom: 20,
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  emptyStateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#006D5B',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  emptyStateButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
});

export default BankStatementScreen;