import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import ImagePicker from 'react-native-image-crop-picker';
import { apiService } from '../../services/ApiServices';
import * as Sentry from '@sentry/react-native';
import { Button } from 'react-native-paper';
import {
  widthPercentageToDP as wp,
  heightPercentageToDP as hp,
} from 'react-native-responsive-screen';
import { IMAGE_URL } from '../../services/ApiServices';

const VehicleInfo = ({ transports, DataType }) => {
  const [expenses, setExpenses] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);

  const [expenseMenuVisible, setExpenseMenuVisible] = useState(false);
  const [paymentMenuVisible, setPaymentMenuVisible] = useState(false);

  // States for payment status/details modal
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState(null);

  const [formData, setFormData] = useState({
    type: '',
    location: '',
    amount: '',
    otherType: '',
    paymentMode: '',
    qrImage: null,
    meterImage: null,
    otp: '',
    upiId: '',
    bankName: '',
    accountNumber: '',
    accountHolder: '',
    ifscCode: '',
    dieselLiters: '', // New field for diesel liters
  });

  const expenseTypes = [
    { label: 'Select Option', value: '' },
    { label: 'Loading', value: 'Loading' },
    { label: 'Tripal Rassa', value: 'Tripal Rassa' },
    { label: 'Parking', value: 'Parking' },
    { label: 'Police', value: 'Police' },
    { label: 'Border', value: 'Border' },
    { label: 'Cash Toll', value: 'Cash Toll' },
    { label: 'Urea', value: 'Urea' },
    { label: 'Unloading/Kata', value: 'Unloading/Kata' },
    { label: 'Diesel', value: 'Diesel' },
    { label: 'Diesel By Party', value: 'Diesel by Party' },
    { label: 'Topay', value: 'Topay' },
    { label: 'Others', value: 'Others' },
  ];

  const paymentModes = [
    { label: 'Select Payment Mode', value: '' },
    { label: 'Acc/Pay', value: 'BANK' },
    { label: 'QR Code', value: 'QR' },
    { label: 'UPI', value: 'UPI' },
    { label: 'Cash', value: 'CASH' },
    { label: 'OTP-BPCL', value: 'OTP' },
    { label: 'Biswanath Charali', value: 'Biswanath Charali' },
    { label: 'Chakdala', value: 'Chakdala' },
  ];

  const getPaymentLabel = (value) => paymentModes.find(p => p.value === value)?.label || value;

  const totalExpenses = expenses.reduce(
    (sum, e) => sum + parseInt(String(e.amount).replace(/[^0-9]/g, '') || 0),
    0
  );

  // Helper function to get full image URL
  const getImageUrl = (imagePath) => {
    if (!imagePath) return null;
    if (imagePath.startsWith('http')) return imagePath;
    if (imagePath.startsWith('file:')) return imagePath;
    return IMAGE_URL + imagePath;
  };

  // Open payment details modal
  const openPaymentDetailsModal = (expense) => {
    setSelectedExpense(expense);
    setPaymentModalVisible(true);
  };

  // Update payment status with confirmation
  const updatePaymentStatus = async (status, confirmationMessage) => {
    if (!selectedExpense) return;

    Alert.alert(
      "Confirm Action",
      confirmationMessage,
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Confirm",
          onPress: async () => {
            try {
              setLoading(true);
             
              const response = await apiService.UpdatePaymentStatus({
                id: selectedExpense.id,
                payment_status: status,
              });

              if (response?.status || response?.success) {
                setExpenses(prev => prev.map(exp =>
                  exp.id === selectedExpense.id
                    ? { ...exp, payment_status: status }
                    : exp
                ));

                setSelectedExpense(prev => ({ ...prev, payment_status: status }));
                setPaymentModalVisible(false);

                Alert.alert('Success', `Expense status updated to ${status}!`);
                await fetchExpenses();
              } else {
                Alert.alert('Error', response.message || 'Failed to update payment status.');
              }
            } catch (error) {
              console.error("Update payment status error:", error);
              Alert.alert('Error', 'Failed to update payment status.');
              Sentry.captureException(error);
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  // Delete expense handler
  const handleDeleteExpense = async (expenseId) => {
    Alert.alert(
      "Confirm Deletion",
      "Are you sure you want to delete this expense permanently?",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              setLoading(true);
              await apiService.DeletePayment({ payment_id: expenseId });

              Alert.alert('Success', 'Expense deleted successfully!');
              setPaymentModalVisible(false);
              await fetchExpenses();
            } catch (err) {
              console.log('Delete error:', err);
              Alert.alert('Error', 'Failed to delete expense.');
              Sentry.captureException(err);
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const fetchExpenses = async () => {
    if (!transports?.id) return;
    try {
      setLoading(true);
      const result = await apiService.AllTransactions({
        transport_id: transports.id,
        type: DataType,
        payment_type: 'VE',
      });

      if (result?.payments) {
        const mapped = result.payments.map((item, index) => ({
          id: item.id || `temp-${index + 1}`,
          category: item.comment || 'Unknown',
          amount: `₹${parseInt(item.amount || 0).toLocaleString()}`,
          date: item.date || new Date().toISOString().split('T')[0],
          location: item.location || 'N/A',
          payment_status: item.payment_status || 'Pending',
          payment_mode: item.payment_mode || 'N/A',
          upi_id: item.upi_id || 'N/A',
          bank_name: item.bank_name || 'N/A',
          account_holder_name: item.account_holder_name || 'N/A',
          ifsc_code: item.ifsc_code || 'N/A',
          account_number: item.account_number || 'N/A',
          qr_code_picture: item.qr_code_picture || null,
          meter_image: item.meter_image || null,
          otp: item.otp || 'N/A',
          diesel_liters: item.diesel_liters || 'N/A', // Add diesel liters to mapped data
        }));
        setExpenses(mapped);
      }
    } catch (error) {
      console.log('Expense fetch error:', error);
      Alert.alert('Error', 'Failed to fetch expenses.');
      Sentry.captureException(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, [transports]);

  const handleInputChange = (key, value) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const resetForm = () => {
    setFormData({
      type: '',
      location: '',
      amount: '',
      otherType: '',
      paymentMode: '',
      qrImage: null,
      meterImage: null,
      otp: '',
      upiId: '',
      bankName: '',
      accountNumber: '',
      accountHolder: '',
      ifscCode: '',
      dieselLiters: '', // Reset diesel liters
    });
  };

  // Image picking with cropping for QR Code (Gallery only)
  const pickQRImage = async () => {
    try {
      const options = {
        width: 500,
        height: 500,
        cropping: true,
        cropperCircleOverlay: false,
        compressImageQuality: 0.8,
        includeBase64: false,
        cropperActiveWidgetColor: '#006D5B',
        cropperStatusBarColor: '#006D5B',
        cropperToolbarColor: '#006D5B',
        showCropGuidelines: true,
        showCropFrame: true,
        freeStyleCropEnabled: true,
        enableRotationGesture: true,
      };

      const image = await ImagePicker.openPicker(options);

      handleInputChange('qrImage', {
        uri: image.path,
        fileName: image.filename || `qr_${Date.now()}.jpg`,
        type: image.mime || 'image/jpeg',
        width: image.width,
        height: image.height,
        size: image.size,
        path: image.path,
        mime: image.mime,
        modificationDate: image.modificationDate,
      });

    } catch (err) {
      if (err.message !== 'User cancelled image selection') {
        console.log('QR Image picker error:', err);
        Alert.alert('Error', 'Failed to select/crop image.');
        Sentry.captureException(err);
      }
    }
  };

  // Image picking with cropping for Meter Image (Gallery only)
  const pickMeterImage = async () => {
    try {
      const options = {
        width: 800,
        height: 600,
        cropping: true,
        cropperCircleOverlay: false,
        compressImageQuality: 0.8,
        includeBase64: false,
        cropperActiveWidgetColor: '#006D5B',
        cropperStatusBarColor: '#006D5B',
        cropperToolbarColor: '#006D5B',
        showCropGuidelines: true,
        showCropFrame: true,
        freeStyleCropEnabled: true,
        enableRotationGesture: true,
      };

      const image = await ImagePicker.openPicker(options);

      handleInputChange('meterImage', {
        uri: image.path,
        fileName: image.filename || `meter_${Date.now()}.jpg`,
        type: image.mime || 'image/jpeg',
        width: image.width,
        height: image.height,
        size: image.size,
        path: image.path,
        mime: image.mime,
        modificationDate: image.modificationDate,
      });

    } catch (err) {
      if (err.message !== 'User cancelled image selection') {
        console.log('Meter Image picker error:', err);
        Alert.alert('Error', 'Failed to select/crop image.');
        Sentry.captureException(err);
      }
    }
  };

  const handleSubmit = async () => {
    try {
      // Validation
      if (!formData.type) return Alert.alert('Error', 'Select expense type');
      if (!formData.location) return Alert.alert('Error', 'Enter location');
      if (!formData.amount || isNaN(formData.amount) || parseFloat(formData.amount) <= 0)
        return Alert.alert('Error', 'Enter valid amount');
      if (formData.type === 'Others' && !formData.otherType)
        return Alert.alert('Error', 'Specify other expense type');
      if (!formData.paymentMode) return Alert.alert('Error', 'Select payment mode');
      
      // Diesel and Diesel by Party specific validation
      if (formData.type === 'Diesel' || formData.type === 'Diesel by Party') {
        if (!formData.dieselLiters || isNaN(formData.dieselLiters) || parseFloat(formData.dieselLiters) <= 0) {
          return Alert.alert('Error', 'Enter valid diesel liters');
        }
        // Only require meter image for Diesel (not for Diesel by Party)
        if (formData.type === 'Diesel' && !formData.meterImage) {
          return Alert.alert('Error', 'Upload meter image');
        }
      }
      
      // Payment mode specific validation
      if (formData.paymentMode === 'QR' && !formData.qrImage)
        return Alert.alert('Error', 'Upload QR image');
      if (formData.paymentMode === 'OTP' && !formData.otp)
        return Alert.alert('Error', 'Enter OTP');
      if (formData.paymentMode === 'UPI' && !formData.upiId)
        return Alert.alert('Error', 'Enter UPI ID');
      if (formData.paymentMode === 'BANK') {
        if (!formData.bankName || !formData.accountNumber || !formData.accountHolder || !formData.ifscCode) {
          return Alert.alert('Error', 'Fill all bank details');
        }
      }

      setLoading(true);

      const payload = {
        payment_type: 'VE',
        amount: formData.amount,
        location: formData.location,
        comment: formData.type === 'Others' ? formData.otherType : formData.type,
        payment_mode: formData.paymentMode,
        payment_status: 'Pending',
      };

      // Add diesel liters to payload if expense type is Diesel or Diesel by Party
      if (formData.type === 'Diesel' || formData.type === 'Diesel by Party') {
        payload.diesel_liters = parseFloat(formData.dieselLiters);
      }

      if (DataType === 'Main') {
        payload.transport_id = transports.id;
      } else {
        payload.child_id = transports.id;
      }

      // Payment mode specific fields
      if (formData.paymentMode === 'OTP') {
        payload.otp = formData.otp;
      }
      if (formData.paymentMode === 'UPI') {
        payload.upi_id = formData.upiId;
      }
      if (formData.paymentMode === 'BANK') {
        payload.bank_name = formData.bankName;
        payload.account_number = formData.accountNumber;
        payload.account_holder_name = formData.accountHolder;
        payload.ifsc_code = formData.ifscCode;
      }

      // Handle images
      if (formData.paymentMode === 'QR' && formData.qrImage) {
        payload.qr_code_picture = formData.qrImage.uri;
      }

      if (formData.type === 'Diesel' && formData.meterImage) {
        payload.meter_image = formData.meterImage.uri;
      }

      const response = await apiService.AddDriverCash(payload);

      if (response?.status || response?.success || response) {
        Alert.alert('Success', 'Expense added successfully!');
        setModalVisible(false);
        resetForm();
        await fetchExpenses();
      } else {
        Alert.alert('Error', response?.message || 'Failed to add expense.');
      }
    } catch (err) {
      console.log('Submit error:', err);
      Alert.alert('Error', err?.response?.data?.message || err?.message || 'Failed to add expense.');
      Sentry.captureException(err);
    } finally {
      setLoading(false);
    }
  };

  const renderExpenseTypeSelector = () => (
    <View>
      <Text style={styles.label}>Expense Type *</Text>
      <TouchableOpacity
        style={styles.selectorButton}
        onPress={() => setExpenseMenuVisible(true)}
      >
        <Text style={styles.selectorButtonText}>
          {formData.type ? expenseTypes.find(p => p.value === formData.type)?.label : 'Select Expense Type'}
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderPaymentModeSelector = () => (
    <View>
      <Text style={styles.label}>Payment Mode *</Text>
      <TouchableOpacity
        style={styles.selectorButton}
        onPress={() => setPaymentMenuVisible(true)}
      >
        <Text style={styles.selectorButtonText}>
          {formData.paymentMode ? paymentModes.find(p => p.value === formData.paymentMode)?.label : 'Select Payment Mode'}
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderExpenseTypeModal = () => (
    <Modal
      visible={expenseMenuVisible}
      transparent
      animationType="slide"
      onRequestClose={() => setExpenseMenuVisible(false)}
    >
      <View style={styles.menuModalContainer}>
        <View style={styles.menuModalContent}>
          <Text style={styles.menuModalTitle}>Select Expense Type</Text>
          <ScrollView style={styles.menuScrollView}>
            {expenseTypes.map((item) => (
              <TouchableOpacity
                key={item.value}
                style={styles.menuItem}
                onPress={() => {
                  handleInputChange('type', item.value);
                  setExpenseMenuVisible(false);
                }}
              >
                <Text style={styles.menuItemText}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <TouchableOpacity
            style={styles.menuCloseButton}
            onPress={() => setExpenseMenuVisible(false)}
          >
            <Text style={styles.menuCloseButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  const renderPaymentModeModal = () => (
    <Modal
      visible={paymentMenuVisible}
      transparent
      animationType="slide"
      onRequestClose={() => setPaymentMenuVisible(false)}
    >
      <View style={styles.menuModalContainer}>
        <View style={styles.menuModalContent}>
          <Text style={styles.menuModalTitle}>Select Payment Mode</Text>
          <ScrollView style={styles.menuScrollView}>
            {paymentModes.map((item) => (
              <TouchableOpacity
                key={item.value}
                style={styles.menuItem}
                onPress={() => {
                  handleInputChange('paymentMode', item.value);
                  setPaymentMenuVisible(false);
                }}
              >
                <Text style={styles.menuItemText}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <TouchableOpacity
            style={styles.menuCloseButton}
            onPress={() => setPaymentMenuVisible(false)}
          >
            <Text style={styles.menuCloseButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  // Redesigned Payment Details Modal
  const renderPaymentDetailsModal = () => {
    if (!selectedExpense) return null;

    const { 
      payment_mode, 
      upi_id, 
      bank_name, 
      account_number, 
      account_holder_name, 
      ifsc_code, 
      qr_code_picture, 
      meter_image,
      otp,
      category,
      amount,
      location,
      date,
      payment_status,
      diesel_liters // Add diesel liters to destructuring
    } = selectedExpense;

    const getStatusColor = (status) => {
      switch(status) {
        case 'Pending': return '#F59E0B';
        case 'Approved': return '#3B82F6';
        case 'Success': return '#10B981';
        default: return '#6B7280';
      }
    };

    const renderPaymentInfo = () => {
      switch (payment_mode) {
        case 'BANK':
          return (
            <View style={styles.infoCard}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Bank Name</Text>
                <Text style={styles.infoValue}>{bank_name || 'N/A'}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Account Number</Text>
                <Text style={styles.infoValue}>{account_number || 'N/A'}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Account Holder</Text>
                <Text style={styles.infoValue}>{account_holder_name || 'N/A'}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>IFSC Code</Text>
                <Text style={styles.infoValue}>{ifsc_code || 'N/A'}</Text>
              </View>
            </View>
          );
        case 'UPI':
          return (
            <View style={styles.infoCard}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>UPI ID</Text>
                <Text style={styles.infoValue}>{upi_id || 'N/A'}</Text>
              </View>
            </View>
          );
        case 'QR':
          return (
            <View style={styles.infoCard}>
              <Text style={styles.infoLabel}>QR Code</Text>
              {qr_code_picture && qr_code_picture !== 'N/A' ? (
                <View style={styles.imageContainer}>
                  <Image
                    source={{ uri: getImageUrl(qr_code_picture) }}
                    style={styles.qrImage}
                    resizeMode="contain"
                  />
                </View>
              ) : (
                <Text style={styles.infoValue}>No QR Image Uploaded</Text>
              )}
            </View>
          );
        case 'OTP':
          return (
            <View style={styles.infoCard}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>OTP</Text>
                <Text style={styles.infoValue}>{otp || 'N/A'}</Text>
              </View>
            </View>
          );
        case 'CASH':
          return (
            <View style={styles.infoCard}>
              <Text style={styles.infoValue}>Payment was recorded as Cash</Text>
            </View>
          );
        default:
          return (
            <View style={styles.infoCard}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Payment Mode</Text>
                <Text style={styles.infoValue}>{getPaymentLabel(payment_mode)}</Text>
              </View>
            </View>
          );
      }
    };

    return (
      <Modal
        visible={paymentModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setPaymentModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.paymentModalContent}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalHeaderTitle}>Expense Details</Text>
              <TouchableOpacity 
                onPress={() => setPaymentModalVisible(false)}
                style={styles.closeButton}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Status Badge */}
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(payment_status) + '20' }]}>
                <View style={[styles.statusDot, { backgroundColor: getStatusColor(payment_status) }]} />
                <Text style={[styles.statusText, { color: getStatusColor(payment_status) }]}>
                  {payment_status?.charAt(0).toUpperCase() + payment_status?.slice(1) || 'Pending'}
                </Text>
              </View>

              {/* Expense Info Card */}
              <View style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>Expense Information</Text>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Category</Text>
                  <Text style={styles.infoValue}>{category}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Amount</Text>
                  <Text style={[styles.infoValue, styles.amountText]}>{amount}</Text>
                </View>
                {/* Show Diesel Liters if category is Diesel or Diesel by Party */}
                {(category === 'Diesel' || category === 'Diesel by Party') && diesel_liters && diesel_liters !== 'N/A' && (
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Diesel Liters</Text>
                    <Text style={styles.infoValue}>{diesel_liters} L</Text>
                  </View>
                )}
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Location</Text>
                  <Text style={styles.infoValue}>{location}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Date</Text>
                  <Text style={styles.infoValue}>{date}</Text>
                </View>
              </View>

              {/* Meter Image for Diesel (not for Diesel by Party) */}
              {category === 'Diesel' && meter_image && meter_image !== 'N/A' && (
                <View style={styles.sectionCard}>
                  <Text style={styles.sectionTitle}>Meter Reading</Text>
                  <View style={styles.imageContainer}>
                    <Image
                      source={{ uri: getImageUrl(meter_image) }}
                      style={styles.meterImage}
                      resizeMode="contain"
                    />
                  </View>
                </View>
              )}

              {/* Payment Info Card */}
              <View style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>Payment Information</Text>
                
                {renderPaymentInfo()}
              </View>

              {/* Action Buttons */}
              {payment_status !== 'Success' && (
                <View style={styles.actionSection}>
                  {payment_status === 'Pending' && (
                    <TouchableOpacity
                      style={[styles.actionButton, styles.approveButton]}
                      onPress={() => updatePaymentStatus('Approved', `Approve payment of ${amount} for ${category}?`)}
                      disabled={loading}
                    >
                      {loading ? (
                        <ActivityIndicator color="#fff" />
                      ) : (
                        <Text style={styles.actionButtonText}>Approve Payment</Text>
                      )}
                    </TouchableOpacity>
                  )}

                  {payment_status === 'Approved' && (
                    <TouchableOpacity
                      style={[styles.actionButton, styles.paidButton]}
                      onPress={() => updatePaymentStatus('Success', `Mark payment of ${amount} for ${category} as PAID?`)}
                      disabled={loading}
                    >
                      {loading ? (
                        <ActivityIndicator color="#fff" />
                      ) : (
                        <Text style={styles.actionButtonText}>Mark As Paid</Text>
                      )}
                    </TouchableOpacity>
                  )}
                </View>
              )}

              {/* Delete Button (Only for Pending) */}
              {payment_status === 'Pending' && (
                <TouchableOpacity
                  style={styles.deleteActionButton}
                  onPress={() => handleDeleteExpense(selectedExpense.id)}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#DC2626" />
                  ) : (
                    <Text style={styles.deleteActionButtonText}>Delete Expense</Text>
                  )}
                </TouchableOpacity>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  };

  return (
    <ScrollView style={styles.container}>
      {/* Total Card */}
      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>Total Expenses</Text>
        <View style={styles.summaryRow}>
          <Text style={styles.totalAmount}>₹{totalExpenses.toLocaleString()}</Text>
          <TouchableOpacity 
           disabled={transports.checkedBy==null?false:true}
            style={[
    styles.addButton, 
    { opacity: (transports.checkedBy == null ? false : true) ? 0.5 : 1 }
  ]}  
            onPress={() => { 
              setModalVisible(true); 
              resetForm(); 
            }}
          >
            <Text style={styles.addButtonText}>Add</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Modal (Add Expense) */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <ScrollView contentContainerStyle={styles.modalContainer} keyboardShouldPersistTaps="handled">
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Expense</Text>

            {renderExpenseTypeSelector()}

            {formData.type === 'Others' && (
              <TextInput 
                style={styles.textInput} 
                placeholder="Specify type" 
                value={formData.otherType} 
                onChangeText={t => handleInputChange('otherType', t)} 
              />
            )}

            <Text style={styles.label}>Location *</Text>
            <TextInput 
              style={styles.textInput} 
              placeholder="Enter location" 
              value={formData.location} 
              onChangeText={t => handleInputChange('location', t)} 
            />

            <Text style={styles.label}>Amount (₹) *</Text>
            <TextInput 
              style={styles.textInput} 
              placeholder="Enter amount" 
              keyboardType="numeric" 
              value={formData.amount} 
              onChangeText={t => handleInputChange('amount', t)} 
            />

            {/* Diesel Liters Input - Shows when Diesel or Diesel by Party is selected */}
            {(formData.type === 'Diesel' || formData.type === 'Diesel by Party') && (
              <View>
                <Text style={styles.label}>Diesel Liters *</Text>
                <TextInput 
                  style={styles.textInput} 
                  placeholder="Enter diesel quantity in liters" 
                  keyboardType="numeric" 
                  value={formData.dieselLiters} 
                  onChangeText={t => handleInputChange('dieselLiters', t)} 
                />
              </View>
            )}

            {renderPaymentModeSelector()}

            {/* QR Code Upload - Gallery Only with Cropping */}
            {formData.paymentMode === 'QR' && (
              <View style={{ marginVertical: 10 }}>
                <Text style={styles.label}>Upload QR Code *</Text>
                <TouchableOpacity 
                  style={styles.uploadButton} 
                  onPress={pickQRImage}
                >
                  <Text style={styles.uploadButtonText}>📁 Select QR Code Image (Crop)</Text>
                </TouchableOpacity>
                {formData.qrImage && (
                  <View style={styles.previewContainer}>
                    <Image 
                      source={{ uri: formData.qrImage.uri }} 
                      style={styles.previewImage} 
                    />
                    {formData.qrImage.width && formData.qrImage.height && (
                      <Text style={styles.previewText}>
                        {formData.qrImage.width} x {formData.qrImage.height} (cropped)
                      </Text>
                    )}
                  </View>
                )}
              </View>
            )}

            {/* Diesel Meter Image Upload - Only for Diesel (not for Diesel by Party) */}
            {formData.type === 'Diesel' && (
              <View style={{ marginVertical: 10 }}>
                <Text style={styles.label}>Upload Meter Image *</Text>
                <TouchableOpacity 
                  style={styles.uploadButton} 
                  onPress={pickMeterImage}
                >
                  <Text style={styles.uploadButtonText}>📁 Select Meter Image (Crop)</Text>
                </TouchableOpacity>
                {formData.meterImage && (
                  <View style={styles.previewContainer}>
                    <Image 
                      source={{ uri: formData.meterImage.uri }} 
                      style={styles.previewImage} 
                    />
                    {formData.meterImage.width && formData.meterImage.height && (
                      <Text style={styles.previewText}>
                        {formData.meterImage.width} x {formData.meterImage.height} (cropped)
                      </Text>
                    )}
                  </View>
                )}
              </View>
            )}

            {formData.paymentMode === 'OTP' && (
              <TextInput 
                style={styles.textInput} 
                placeholder="Enter OTP" 
                placeholderTextColor='#000000'
                keyboardType="numeric" 
                value={formData.otp} 
                onChangeText={t => handleInputChange('otp', t)} 
              />
            )}

            {formData.paymentMode === 'UPI' && (
              <TextInput 
                style={styles.textInput} 
                placeholder="Enter UPI ID" 
                placeholderTextColor='#000000'
                value={formData.upiId} 
                onChangeText={t => handleInputChange('upiId', t)} 
              />
            )}

            {formData.paymentMode === 'BANK' && (
              <>
                <TextInput 
                  style={styles.textInput} 
                  placeholder="Bank Name" 
                  placeholderTextColor='#000000'
                  value={formData.bankName} 
                  onChangeText={t => handleInputChange('bankName', t)} 
                />
                <TextInput 
                  style={styles.textInput} 
                  placeholder="Account Number" 
                  placeholderTextColor='#000000'
                  keyboardType="numeric" 
                  value={formData.accountNumber} 
                  onChangeText={t => handleInputChange('accountNumber', t)} 
                />
                <TextInput 
                  style={styles.textInput} 
                  placeholder="Account Holder Name" 
                  placeholderTextColor='#000000'
                  value={formData.accountHolder} 
                  onChangeText={t => handleInputChange('accountHolder', t)} 
                />
                <TextInput 
                  style={styles.textInput} 
                  placeholder="IFSC Code" 
                  placeholderTextColor='#000000'
                  value={formData.ifscCode} 
                  onChangeText={t => handleInputChange('ifscCode', t)} 
                />
              </>
            )}

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 20 }}>
              <TouchableOpacity 
                style={styles.cancelButton} 
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.submitButton, loading && { opacity: 0.6 }]}
                onPress={handleSubmit}
                disabled={loading}
              >
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitButtonText}>Submit</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </Modal>

      {/* Menu Modals */}
      {renderExpenseTypeModal()}
      {renderPaymentModeModal()}

      {/* Payment Details Modal */}
      {renderPaymentDetailsModal()}

      {/* Expense List */}
      <View style={styles.section}>
        {expenses.length === 0 ? (
          <Text style={{ textAlign: 'center', marginTop: 20 }}>No expenses found</Text>
        ) : (
          expenses.map(exp => (
            <View key={exp.id} style={styles.expenseItem}>
              <View style={styles.expenseHeader}>
                <Text style={styles.expenseCategory}>{exp.category}</Text>
                <Text style={styles.expenseAmount}>{exp.amount}</Text>
              </View>

              <View style={styles.expenseDetails}>
                <Text style={styles.expenseDate}>{exp.date}</Text>
                <Text style={styles.expenseLocation}>{exp.location}</Text>
              </View>

              {/* Show Diesel Liters in list if category is Diesel or Diesel by Party */}
              {(exp.category === 'Diesel' || exp.category === 'Diesel by Party') && exp.diesel_liters && exp.diesel_liters !== 'N/A' && (
                <Text style={styles.dieselLitersText}>Liters: {exp.diesel_liters} L</Text>
              )}

              {/* Status Button */}
              <TouchableOpacity
                onPress={() => openPaymentDetailsModal(exp)}
                style={[
                  styles.paymentStatusButton,
                  exp.payment_status === 'Success' && styles.paidButton,
                  exp.payment_status === 'Approved' && styles.approvedButton,
                  exp.payment_status === 'Pending' && styles.pendingButton,
                ]}
              >
                <Text style={styles.paymentStatusButtonText}>
                  Status: {exp.payment_status?.charAt(0).toUpperCase() + exp.payment_status?.slice(1) || 'Pending'} • Tap for Details
                </Text>
              </TouchableOpacity>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  // --- General Styles ---
  container: { flex: 1, padding: 16, backgroundColor: '#f5f5f5' },
  summaryCard: { backgroundColor: '#fff', padding: 16, borderRadius: 12, marginBottom: 16, elevation: 2 },
  summaryTitle: { fontSize: 16, color: '#666', marginBottom: 8 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  totalAmount: { fontSize: 22, fontWeight: 'bold', color: '#006D5B' },
  addButton: { backgroundColor: '#006D5B', padding: 10, borderRadius: 6 },
  addButtonText: { color: '#fff', fontWeight: '600' },
  section: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    marginTop: 10
  },
  expenseItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0'
  },
  expenseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4
  },
  expenseCategory: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333'
  },
  expenseAmount: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#006D5B'
  },
  expenseDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  expenseDate: {
    fontSize: 12,
    color: '#666'
  },
  expenseLocation: {
    fontSize: 12,
    color: '#666'
  },
  dieselLitersText: {
    fontSize: 12,
    color: '#006D5B',
    marginTop: 4,
    fontWeight: '500'
  },

  // --- Modal & Form Styles ---
  modalContainer: { flexGrow: 1, justifyContent: 'center', padding: 20, backgroundColor: 'rgba(0,0,0,0.5)' },
  modalContent: { backgroundColor: '#fff', borderRadius: 12, padding: 20 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#006D5B', marginBottom: 16, textAlign: 'center' },
  label: { fontWeight: '600', marginBottom: 6, color: '#333' },
  textInput: {borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12, marginBottom: 10, backgroundColor: '#fff' },
  selectorButton: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    backgroundColor: '#fff'
  },
  selectorButtonText: { color: '#333' },
  uploadButton: {
    borderWidth: 1,
    borderColor: '#006D5B',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 10,
    backgroundColor: '#F0FDF4'
  },
  uploadButtonText: {
    color: '#006D5B',
    fontWeight: '600'
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#e0e0e0',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginRight: 10
  },
  cancelButtonText: {
    color: '#333',
    fontWeight: '600'
  },
  submitButton: {
    flex: 1,
    backgroundColor: '#006D5B',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginLeft: 10
  },
  submitButtonText: {
    color: '#fff',
    fontWeight: '600'
  },
  previewContainer: {
    alignItems: 'center',
    marginTop: 8
  },
  previewImage: {
    width: 100,
    height: 100,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#ddd'
  },
  previewText: {
    fontSize: 12,
    color: '#666',
    marginTop: 4
  },

  // --- Dropdown/Menu Modal Styles ---
  menuModalContainer: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 20
  },
  menuModalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    maxHeight: '80%'
  },
  menuModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#006D5B',
    marginBottom: 16,
    textAlign: 'center'
  },
  menuScrollView: {
    maxHeight: 300
  },
  menuItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0'
  },
  menuItemText: {
    fontSize: 16,
    color: '#333'
  },
  menuCloseButton: {
    backgroundColor: '#e0e0e0',
    padding: 15,
    borderRadius: 8,
    marginTop: 10,
    alignItems: 'center'
  },
  menuCloseButtonText: {
    color: '#333',
    fontWeight: '600'
  },

  // --- Payment Status Styles (List) ---
  paymentStatusButton: {
    marginTop: hp('1%'),
    padding: wp('3%'),
    borderRadius: wp('2%'),
    alignItems: 'center',
  },
  paidButton: {
    backgroundColor: '#006D5B',
  },
  approvedButton: {
    backgroundColor: '#3B82F6',
  },
  pendingButton: {
    backgroundColor: '#F59E0B',
  },
  paymentStatusButtonText: {
    fontSize: wp('3.5%'),
    fontWeight: '600',
    color: '#ffffff',
  },

  // --- Redesigned Payment Modal Styles ---
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  paymentModalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    width: '100%',
    maxHeight: '90%',
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalHeaderTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '600',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 16,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
  },
  sectionCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  infoLabel: {
    fontSize: 14,
    color: '#6B7280',
    flex: 1,
  },
  infoValue: {
    fontSize: 14,
    color: '#1F2937',
    fontWeight: '500',
    flex: 2,
    textAlign: 'right',
  },
  amountText: {
    fontSize: 16,
    color: '#006D5B',
    fontWeight: '700',
  },
  infoCard: {
    marginTop: 8,
  },
  imageContainer: {
    alignItems: 'center',
    marginTop: 8,
  },
  qrImage: {
    width: wp('50%'),
    height: wp('50%'),
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  meterImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  actionSection: {
    marginTop: 8,
    marginBottom: 12,
  },
  actionButton: {
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  approveButton: {
    backgroundColor: '#3B82F6',
  },
  paidButton: {
    backgroundColor: '#006D5B',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  deleteActionButton: {
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#DC2626',
    backgroundColor: '#FEF2F2',
  },
  deleteActionButtonText: {
    color: '#DC2626',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default VehicleInfo;