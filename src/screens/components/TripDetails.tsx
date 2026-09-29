import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Modal, 
  TextInput, 
  TouchableWithoutFeedback,
  Keyboard,
  Alert,
  Image,
  ActivityIndicator,
  SafeAreaView,
  PermissionsAndroid, 
  Platform 
} from 'react-native';
import ImageCropPicker from 'react-native-image-crop-picker';
import { apiService } from '../../services/ApiServices';
import { useNavigation } from '@react-navigation/native';
import { WebView } from 'react-native-webview';
import { RNHTMLtoPDF } from 'react-native-html-to-pdf';
import RNFS from 'react-native-fs';
import SplitPaymentModal from './SplitPaymentModal';
import {
  widthPercentageToDP as wp,
  heightPercentageToDP as hp,
} from 'react-native-responsive-screen';

interface TripDetailsProps {
  transportData: any;
  paymentHistory: any;
}

const TripDetails = ({ transportData, Paymenthistory, vehicle, DataType }: TripDetailsProps) => {
  const tripData = transportData;
  const PaymentList = Paymenthistory;
  const navigation = useNavigation();
  const [DCloading, setDCloading] = useState(false);
  const [DriverCash, setDriverCash] = useState(0);
  const [Advac, setAdvac] = useState(0);
  const [AdvaLoader, setAdvaLoader] = useState(false);
  const [Advbc, setAdvbc] = useState(0);
  const [AdvbcLoader, setAdvbcLoader] = useState(false);
  const [VE, setVE] = useState(0);
  const [DE, setDE] = useState(0);
  const [RE, setRE] = useState(0);
  const [htmlContent, setHtmlContent] = useState(null);
  const [loading, setLoading] = useState(false);
  const [webviewVisible, setWebviewVisible] = useState(false);
  const [error, setError] = useState(null);
  const [fetchingBill, setfetchingBill] = useState(false);
  const [GCloading, setGCloading] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isDisabled, setIsDisabled] = useState(false);
  const [splitModalVisible, setSplitModalVisible] = useState(false);
  const [splitLoader, setSplitLoader] = useState(false);

  useEffect(() => {
    if (PaymentList) {
      console.log(PaymentList);
      setDriverCash(PaymentList.DC);
      setAdvac(PaymentList.ADVAC);
      setAdvbc(PaymentList.ADVACBC);
      setVE(PaymentList.VE);
      setDE(PaymentList.DE);
      setRE(PaymentList.RE);
    }
  }, [PaymentList]);

  const [advanceAccountModal, setAdvanceAccountModal] = useState(false);
  const [companyAdvanceModal, setCompanyAdvanceModal] = useState(false);
  const [driverCashModal, setDriverCashModal] = useState(false);
  const [advanceAccountData, setAdvanceAccountData] = useState({
    amount: '',
    location: '',
    comment: '',
    paymentPhoto: null
  });

  const [guaranteeChargeModal, setGuaranteeChargeModal] = useState(false);
  const [guaranteeChargeData, setGuaranteeChargeData] = useState({
    id: '',
    dataType: '',
    amount: '',
  });

  const [companyAdvanceData, setCompanyAdvanceData] = useState({
    amount: '',
    comments: '',
    location: '',
    status: 'pending',
    paymentMode: 'CASH',
    upiId: '',
    bankDetails: {
      accountNumber: '',
      ifscCode: '',
      bankName: '',
      accountHolder: ''
    },
    qrCode: null
  });

  const requestStoragePermission = async () => {
    if (Platform.OS === 'android') {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
        {
          title: 'Storage Permission Required',
          message: 'App needs access to your storage to download PDF',
        }
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    }
    return true;
  };

  const generatePDF = async () => {
    const isPermitted = await requestStoragePermission();
    if (!isPermitted) {
      Alert.alert('Permission Denied!');
      return;
    }

    const htmlContent = `
      <h1 style="text-align:center;color:#2196F3;">Hello PDF</h1>
      <p>This PDF is generated from HTML in React Native.</p>
    `;

    let options = {
      html: htmlContent,
      fileName: 'MyInvoice',
      directory: 'Downloads',
    };
    try {
      let file = await RNHTMLtoPDF.convert(options);
      console.log('files', file);
      Alert.alert('PDF Downloaded', 'Saved at: ' + file.filePath);
    } catch (error) {
      console.log('PDF ERROR:', error);
    }
  };

  const [driverCashData, setDriverCashData] = useState({
    amount: '',
    location: '',
    paidBy: 'Company'
  });

  const selectImage = async (type, field) => {
    try {
      const image = await ImageCropPicker.openPicker({
        cropping: true,
        mediaType: 'photo',
        cropperToolbarTitle: 'Crop Image',
        compressImageQuality: 0.7,
      });

      const imageUri = image.path;

      if (type === 'advanceAccount') {
        setAdvanceAccountData({
          ...advanceAccountData,
          paymentPhoto: imageUri
        });
      } else if (type === 'companyAdvance' && field === 'qr') {
        setCompanyAdvanceData({
          ...companyAdvanceData,
          qrCode: imageUri
        });
      }
      
      Alert.alert('Success', 'Image selected and cropped successfully!');
      
    } catch (error) {
      if (error.code === 'E_PICKER_CANCELLED') {
        console.log('User cancelled image picker or crop');
      } else {
        console.log('ImagePicker Error: ', error);
        Alert.alert('Error', 'Failed to select or crop image');
      }
    }
  };

  const handleButtonPress = (buttonType) => {
    switch (buttonType) {
      case 'Advance Account':
        setAdvanceAccountModal(true);
        break;
      case 'Advance by Company':
        setCompanyAdvanceModal(true);
        break;
      case 'Driver Cash':
        setDriverCashModal(true);
        break;
    }
  };

  const handleAdvanceAccountSubmit = async () => {
    if (!advanceAccountData.amount || !advanceAccountData.location) {
      Alert.alert('Error', 'Please fill all required fields');
      return;
    }
    setAdvaLoader(true);
    const payload: any = {
      payment_type: 'ADVC',
      amount: advanceAccountData.amount,
      location: advanceAccountData.location,
      comment: advanceAccountData.comment,
      payment_mode: 'CASH',
      payment_status: 'Pending',
      payment_raise_picture: advanceAccountData.paymentPhoto,
    };
    if (DataType === 'Main') {
      payload.transport_id = tripData.id;
    } else {
      payload.child_id = tripData.id;
    }
    const result = await apiService.AddDriverCash(payload);

    setAdvac((prev) => prev + Number(advanceAccountData.amount || 0));
    setAdvanceAccountModal(false);
    resetAdvanceAccountForm();
    setAdvaLoader(false);
    Alert.alert('Success', 'Advance Account submitted successfully!');
  };

  const handleCompanyAdvanceSubmit = async () => {
    const { amount, location, paymentMode, upiId, bankDetails, qrCode } = companyAdvanceData;
    if (!amount || !location) {
      Alert.alert('Error', 'Please fill all required fields (Amount & Location)');
      return;
    }

    if (paymentMode === 'UPI') {
      if (!upiId) {
        Alert.alert('Error', 'Please enter UPI ID');
        return;
      }
    }

    if (paymentMode === 'BANK') {
      if (!bankDetails?.accountHolder || !bankDetails?.bankName || !bankDetails?.accountNumber || !bankDetails?.ifscCode) {
        Alert.alert('Error', 'Please fill all bank details (Bank Name, Account Number, IFSC Code, Account Holder Name)');
        return;
      }
    }

    if (paymentMode === 'QR') {
      if (!qrCode) {
        Alert.alert('Error', 'Please select a QR Code image');
        return;
      }
    }

    setAdvbcLoader(true);
    let payload: any = {
      payment_type: 'ADVACBC',
      payment_mode: paymentMode ?? null,
      amount: companyAdvanceData.amount ?? null,
      location: companyAdvanceData.location ?? null,
      payment_status: 'Pending',
      comment: companyAdvanceData.comments ?? null,
      upi_id: upiId ?? null,
      bank_name: companyAdvanceData.bankDetails?.bankName ?? null,
      account_holder_name: companyAdvanceData.bankDetails?.accountHolder ?? null,
      ifsc_code: companyAdvanceData.bankDetails?.ifscCode ?? null,
      account_number: companyAdvanceData.bankDetails?.accountNumber ?? null,
      qr_code_picture: companyAdvanceData.qrCode ?? null,
    };

    if (DataType === 'Main') {
      payload.transport_id = tripData.id;
    } else {
      payload.child_id = tripData.id;
    }

    const result = await apiService.AddDriverCash(payload);

    setAdvbcLoader(false);
    setAdvbc((prev) => prev + Number(companyAdvanceData.amount || 0));
    setCompanyAdvanceModal(false);
    resetCompanyAdvanceForm();
    Alert.alert('Success', 'Company Advance submitted successfully!');
  };

  const handleDriverCashSubmit = async () => {
    if (!driverCashData.amount || !driverCashData.location) {
      Alert.alert('Error', 'Please fill amount and location');
      return;
    }
    setDCloading(true);
    let payload: any = {
      payment_type: 'DC',
      amount: driverCashData.amount,
      location: driverCashData.location,
      payment_mode: 'CASH',
      payment_status: 'Pending',
      received_from: driverCashData.paidBy,
    };
    if (DataType === 'Main') {
      payload.transport_id = tripData.id;
    } else {
      payload.child_id = tripData.id;
    }
    const result = await apiService.AddDriverCash(payload);

    setDCloading(false);
    setDriverCash((prev) => prev + Number(driverCashData.amount || 0));
    setDriverCashModal(false);
    resetDriverCashForm();
    Alert.alert('Success', 'Driver Cash submitted successfully!');
  };

  const resetAdvanceAccountForm = () => {
    setAdvanceAccountData({
      amount: '',
      location: '',
      comment: '',
      paymentPhoto: null
    });
  };

  const handleGuaranteeChargeSubmit = async () => {
    if (!guaranteeChargeData.amount) {
      Alert.alert("Error", "Please enter an amount");
      return;
    }

    setGCloading(true);
    try {
      const payload = {
        type: guaranteeChargeData.dataType,
        transport_id: guaranteeChargeData.id,
        amount: guaranteeChargeData.amount,
      };
      const result = await apiService.ApplyGcharge(payload);
      if (result.success) {
        Alert.alert("Success", result.message || "Bilty charge added successfully");
        setGuaranteeChargeModal(false);
        navigation.goBack();
      } else {
        Alert.alert("Error", result.message || "Failed to add bilty charge");
      }
    } catch (error) {
      Alert.alert("Error", "Something went wrong");
    } finally {
      setGCloading(false);
    }
  };

  const resetCompanyAdvanceForm = () => {
    setCompanyAdvanceData({
      amount: '',
      location: '',
      status: 'Pending',
      paymentMode: 'CASH',
      upiId: '',
      bankDetails: {
        accountNumber: '',
        ifscCode: '',
        bankName: '',
        accountHolder: '',
      },
      qrCode: null
    });
  };

  const resetDriverCashForm = () => {
    setDriverCashData({
      amount: '',
      location: ''
    });
  };

  const handleCreateTransaction = () => {
    if (tripData.checkedBy != null) {
      Alert.alert('Info', 'Transaction already created');
      return;
    }
    setSplitModalVisible(true);
  };

  // Handle Split Payment Submit
  const handleSplitSubmit = async (data) => {
    setSplitLoader(true);
    try {
      console.log('Split Payment Data:', data);
      
      // Your API call here
      const payload = {
        tripId: data.tripId,
        amount: data.amount,
        totalAmount: data.totalAmount,
        location: data.location,
        comment: data.comment,
        paymentPhoto: data.paymentPhoto,
        transport_id: tripData.id,
        dataType: DataType
      };
      
      // const response = await apiService.createSplitPayment(payload);
      
      Alert.alert('Success', 'Split payment created successfully');
      setSplitModalVisible(false);
      
      // Update trip data if needed
      // setTripData({...tripData, checkedBy: 'User'});
      
    } catch (error) {
      console.error('Error creating split payment:', error);
      Alert.alert('Error', 'Failed to create split payment');
    } finally {
      setSplitLoader(false);
    }
  };

  const GetBill = async (BillNumber) => {
    if (BillNumber === null) {
      alert('Bill Number Not Added Yet');
    } else {
      try {
        setfetchingBill(true);
        setError(null);
        setLoading(true);
        setHtmlContent(null);
        const url = 'https://inextwebs.com/megatron/public/api/getbilling';
        const form = new FormData();
        form.append('bill_number', BillNumber);
        const res = await fetch(url, {
          method: 'POST',
          body: form,
        });
        if (res.ok) {
          const text = await res.text();
          setHtmlContent(text);
          setfetchingBill(false);
          setWebviewVisible(true);
        } else {
          alert('Bill Not Generated Yet');
          setfetchingBill(false);
        }
      } catch (err) {
        console.error('GetBill error', err);
        setError('Network or parsing error');
      } finally {
        setLoading(false);
      }
    }
  };

  const OpenGC = (id, DataType) => {
    setGuaranteeChargeData({
      id: id,
      dataType: DataType,
      amount: '',
    });
    setGuaranteeChargeModal(true);
  };

  const renderPaymentModeFields = () => {
    switch (companyAdvanceData.paymentMode) {
      case 'UPI':
        return (
          <TextInput
            style={styles.input}
            placeholder="Enter UPI ID"
            placeholderTextColor="#999"
            value={companyAdvanceData.upiId}
            onChangeText={(text) => setCompanyAdvanceData({...companyAdvanceData, upiId: text})}
          />
        );
      case 'BANK':
        return (
          <>
            <TextInput
              style={styles.input}
              placeholder="Bank Name"
              placeholderTextColor="#999"
              value={companyAdvanceData.bankDetails.bankName}
              onChangeText={(text) => setCompanyAdvanceData({
                ...companyAdvanceData,
                bankDetails: {...companyAdvanceData.bankDetails, bankName: text}
              })}
            />
            <TextInput
              style={styles.input}
              placeholder="Account Number"
              placeholderTextColor="#999"
              keyboardType="numeric"
              value={companyAdvanceData.bankDetails.accountNumber}
              onChangeText={(text) => setCompanyAdvanceData({
                ...companyAdvanceData,
                bankDetails: {...companyAdvanceData.bankDetails, accountNumber: text}
              })}
            />
            <TextInput
              style={styles.input}
              placeholder="Account Holder Name"
              placeholderTextColor="#999"
              value={companyAdvanceData.bankDetails.accountHolder}
              onChangeText={(text) => setCompanyAdvanceData({
                ...companyAdvanceData,
                bankDetails: {...companyAdvanceData.bankDetails, accountHolder: text}
              })}
            />
            <TextInput
              style={styles.input}
              placeholder="IFSC Code"
              placeholderTextColor="#999"
              value={companyAdvanceData.bankDetails.ifscCode}
              onChangeText={(text) => setCompanyAdvanceData({
                ...companyAdvanceData,
                bankDetails: {...companyAdvanceData.bankDetails, ifscCode: text}
              })}
            />
          </>
        );
      case 'QR':
        return (
          <View>
            <TouchableOpacity
              style={styles.uploadButton}
              onPress={() => selectImage('companyAdvance', 'qr')}
            >
              <Text style={styles.uploadButtonText}>
                {companyAdvanceData.qrCode ? 'QR Code Selected' : 'Select QR Code (Opens Cropper)'}
              </Text>
            </TouchableOpacity>
            {companyAdvanceData.qrCode && (
              <Image source={{ uri: companyAdvanceData.qrCode }} style={styles.previewImage} />
            )}
          </View>
        );
      default:
        return null;
    }
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Payments Details</Text>
          {DataType == 'Main' ? (
            <TouchableOpacity onPress={() => GetBill(tripData.bill_number)} disabled={fetchingBill}>
              <Text style={styles.viewBtn}>{fetchingBill ? ('Fetching...') : ('View Bill')}</Text>
            </TouchableOpacity>
          ) : null}
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Rate / MT :</Text>
          <Text style={styles.detailValue}>Rs: {tripData.rate}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Weight :</Text>
          <Text style={styles.detailValue}>{tripData.weight}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Bilty Charge :</Text>
          <Text style={styles.detailValue}>{tripData.g_charge}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Total Amount :</Text>
          <Text style={styles.detailValue}>
            Rs: {Math.round((Number(tripData.total) || 0) + (Number(tripData.total_fair) || 0))}
          </Text>
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Payments Details</Text>
          <TouchableOpacity onPress={() => navigation.navigate("Transactions", { transport_id: tripData, vehicle: vehicle, DataType })}>
            <Text style={styles.viewBtn}>Transactions</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Driver Cash</Text>
          <Text style={styles.detailValue}>₹{DriverCash}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Advance Account</Text>
          <Text style={styles.detailValue}>₹{Advac}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Advance By Company</Text>
          <Text style={styles.detailValue}>₹{Advbc}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Total Remaining Due</Text>
          <Text style={styles.detailValue}>₹{Math.round(RE)}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Accounts Management</Text>
        <View style={styles.buttonsContainer}>
          <TouchableOpacity
            disabled={tripData.checkedBy == null ? false : true}
            style={[
              styles.button,
              styles.advanceButton,
              { opacity: (tripData.checkedBy == null ? false : true) ? 0.5 : 1 }
            ]}
            onPress={() => OpenGC(transportData.id, DataType)}
          >
            <Text style={styles.buttonText}>Add Bilty Charge</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.button,
              styles.advanceButton,
              { opacity: (tripData.checkedBy == null ? false : true) ? 0.5 : 1 }
            ]}
            disabled={tripData.checkedBy == null ? false : true}
            onPress={() => handleButtonPress('Advance Account')}
          >
            <Text style={styles.buttonText}>Advance Account</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.button,
              styles.advanceButton,
              { opacity: tripData.checkedBy == null ? 1 : 0.5 }
            ]}
            onPress={handleCreateTransaction}
            disabled={tripData.checkedBy != null}
          >
            <Text style={styles.buttonText}>Create Transaction ID</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.button,
              styles.companyButton,
              { opacity: (tripData.checkedBy == null ? false : true) ? 0.5 : 1 }
            ]}
            disabled={tripData.checkedBy == null ? false : true}
            onPress={() => handleButtonPress('Advance by Company')}
          >
            <Text style={styles.buttonText}>Advance by Company</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.button,
              styles.driverButton,
              { opacity: (tripData.checkedBy == null ? false : true) ? 0.5 : 1 }
            ]}
            disabled={tripData.checkedBy == null ? false : true}
            onPress={() => handleButtonPress('Driver Cash')}
          >
            <Text style={styles.buttonText}>Driver Cash</Text>
          </TouchableOpacity>
        </View>

        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 }}>
          {DataType == 'Main' ? (
            <TouchableOpacity
              style={[styles.button, styles.driverButton, { flex: 1, marginRight: 5 }]}
              onPress={() => navigation.navigate('Report', { transport_id: tripData })}
            >
              <Text style={styles.buttonText}>View Report</Text>
            </TouchableOpacity>
          ) : null}

          {!tripData.transport_id && (
            <TouchableOpacity
              onPress={() => navigation.navigate('CloseTrip', { transport_id: tripData })}
              style={[styles.button, styles.driverButton, { flex: 1, marginLeft: 5 }]}
            >
              <Text style={styles.buttonText}>Calculate</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Company Advance Modal */}
      <Modal
        visible={companyAdvanceModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setCompanyAdvanceModal(false)}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.modalOverlay}>
            <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
              <Text style={styles.modalTitle}>Advance by Company</Text>

              <Text style={styles.label}>Amount *</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter amount"
                placeholderTextColor="#999"
                keyboardType="numeric"
                value={companyAdvanceData.amount}
                onChangeText={(text) => setCompanyAdvanceData({...companyAdvanceData, amount: text})}
              />
              <Text style={styles.label}>Comments *</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter Reason"
                placeholderTextColor="#999"
                value={companyAdvanceData.comments}
                onChangeText={(text) => setCompanyAdvanceData({...companyAdvanceData, comments: text})}
              />

              <Text style={styles.label}>Location *</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter location"
                placeholderTextColor="#999"
                value={companyAdvanceData.location}
                onChangeText={(text) => setCompanyAdvanceData({...companyAdvanceData, location: text})}
              />

              <Text style={styles.label}>Payment Mode</Text>
              <View style={styles.paymentModeContainer}>
                {['CASH', 'UPI', 'BANK', 'QR'].map((mode) => (
                  <TouchableOpacity
                    key={mode}
                    style={[
                      styles.paymentModeButton,
                      companyAdvanceData.paymentMode === mode && styles.paymentModeButtonSelected
                    ]}
                    onPress={() => setCompanyAdvanceData({...companyAdvanceData, paymentMode: mode})}
                  >
                    <Text style={[
                      styles.paymentModeText,
                      companyAdvanceData.paymentMode === mode && styles.paymentModeTextSelected
                    ]}>
                      {mode.charAt(0).toUpperCase() + mode.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {renderPaymentModeFields()}
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => setCompanyAdvanceModal(false)}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modalButton, styles.submitButton]}
                  onPress={handleCompanyAdvanceSubmit}
                  disabled={AdvbcLoader}
                >
                  {AdvbcLoader ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.submitButtonText}>Submit</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Driver Cash Modal */}
      <Modal
        visible={driverCashModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setDriverCashModal(false)}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Driver Cash</Text>

              <Text style={styles.label}>Amount *</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter amount"
                placeholderTextColor="#999"
                keyboardType="numeric"
                value={driverCashData.amount}
                onChangeText={(text) => setDriverCashData({...driverCashData, amount: text})}
              />

              <Text style={styles.label}>Location *</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter location"
                placeholderTextColor="#999"
                value={driverCashData.location}
                onChangeText={(text) => setDriverCashData({...driverCashData, location: text})}
              />

              <Text style={styles.label}>Paid By *</Text>
              <View style={styles.paidByContainer}>
                <TouchableOpacity
                  style={[
                    styles.paidByButton,
                    driverCashData.paidBy === 'Company' && styles.paidByButtonSelected
                  ]}
                  onPress={() => setDriverCashData({...driverCashData, paidBy: 'Company'})}
                >
                  <Text style={[
                    styles.paidByText,
                    driverCashData.paidBy === 'Company' && styles.paidByTextSelected
                  ]}>
                    Company
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.paidByButton,
                    driverCashData.paidBy === 'Party' && styles.paidByButtonSelected
                  ]}
                  onPress={() => setDriverCashData({...driverCashData, paidBy: 'Party'})}
                >
                  <Text style={[
                    styles.paidByText,
                    driverCashData.paidBy === 'Party' && styles.paidByTextSelected
                  ]}>
                    Party
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => setDriverCashModal(false)}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modalButton, styles.submitButton]}
                  onPress={handleDriverCashSubmit}
                  disabled={DCloading}
                >
                  {DCloading ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.submitButtonText}>Submit</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* WebView Modal */}
      <Modal
        visible={webviewVisible}
        animationType="slide"
        onRequestClose={() => setWebviewVisible(false)}
      >
        <SafeAreaView style={{ flex: 1 }}>
          <View style={styles.webviewHeader}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setWebviewVisible(false)}>
              <Text style={styles.closeText}>Close</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={generatePDF} style={styles.webviewTitle}>
              <Text style={styles.webviewTitle}>Download</Text>
            </TouchableOpacity>
            <View style={{ width: 70 }} />
          </View>

          {htmlContent ? (
            <WebView
              originWhitelist={['*']}
              source={{ html: htmlContent, baseUrl: 'https://inextwebs.com/' }}
              startInLoadingState={true}
              renderLoading={() => (
                <View style={styles.webviewLoading}>
                  <ActivityIndicator size="large" />
                </View>
              )}
            />
          ) : (
            <View style={styles.webviewLoading}>
              <Text>No content to display.</Text>
            </View>
          )}
        </SafeAreaView>
      </Modal>

      {/* Guarantee Charge Modal */}
      <Modal
        visible={guaranteeChargeModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setGuaranteeChargeModal(false)}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Bilty Charge</Text>

              <Text style={styles.label}>Amount *</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter amount"
                placeholderTextColor="#999"
                keyboardType="numeric"
                value={guaranteeChargeData.amount}
                onChangeText={(text) => setGuaranteeChargeData({...guaranteeChargeData, amount: text})}
              />

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => setGuaranteeChargeModal(false)}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modalButton, styles.submitButton]}
                  onPress={handleGuaranteeChargeSubmit}
                  disabled={GCloading}
                >
                  {GCloading ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.submitButtonText}>Submit</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Advance Account Modal */}
      <Modal
        visible={advanceAccountModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setAdvanceAccountModal(false)}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.modalOverlay}>
            <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
              <Text style={styles.modalTitle}>Advance Account</Text>

              <Text style={styles.label}>Amount *</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter amount"
                placeholderTextColor="#999"
                keyboardType="numeric"
                value={advanceAccountData.amount}
                onChangeText={(text) => setAdvanceAccountData({...advanceAccountData, amount: text})}
              />

              <Text style={styles.label}>Location *</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter location"
                placeholderTextColor="#999"
                value={advanceAccountData.location}
                onChangeText={(text) => setAdvanceAccountData({...advanceAccountData, location: text})}
              />

              <Text style={styles.label}>Comment</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Enter comment (optional)"
                placeholderTextColor="#999"
                value={advanceAccountData.comment}
                onChangeText={(text) => setAdvanceAccountData({...advanceAccountData, comment: text})}
                multiline={true}
                numberOfLines={3}
              />

              <Text style={styles.label}>Payment Photo (Optional)</Text>
              <TouchableOpacity
                style={styles.uploadButton}
                onPress={() => selectImage('advanceAccount', 'paymentPhoto')}
              >
                <Text style={styles.uploadButtonText}>
                  {advanceAccountData.paymentPhoto ? 'Image Selected (Opens Cropper)' : 'Select Payment Photo (Opens Cropper)'}
                </Text>
              </TouchableOpacity>

              {advanceAccountData.paymentPhoto && (
                <Image source={{ uri: advanceAccountData.paymentPhoto }} style={styles.previewImage} />
              )}

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => setAdvanceAccountModal(false)}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modalButton, styles.submitButton]}
                  onPress={handleAdvanceAccountSubmit}
                  disabled={AdvaLoader}
                >
                  {AdvaLoader ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.submitButtonText}>Submit</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Split Payment Modal */}
      <SplitPaymentModal
        visible={splitModalVisible}
        onClose={() => setSplitModalVisible(false)}
        onSubmit={handleSplitSubmit}
        loader={splitLoader}
        initialData={{
          tripId: tripData.tripId || tripData.id || '',
          location: tripData.location || '',
          amount: tripData.total || ''
        }}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  paidByContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 10,
  },
  disabledButton: {
    backgroundColor: '#CCCCCC',
    opacity: 0.6,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  billButton: {
    backgroundColor: '#006D5B',
    marginLeft: '50%',
    padding: wp('4%'),
    width: wp('100%'),
    top: '-17%',
    left: '20%',
    borderRadius: 5,
  },
  billtext: {
    color: 'white',
    textAlign: 'center',
    fontSize: 18,
    padding: 5,
  },
  paidByButton: {
    flex: 1,
    padding: 16,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    backgroundColor: '#f8f9fa',
    alignItems: 'center',
  },
  paidByButtonSelected: {
    backgroundColor: '#006D5B',
    borderColor: '#006D5B',
  },
  paidByText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  paidByTextSelected: {
    color: '#fff',
    fontWeight: 'bold',
  },
  container: {
    backgroundColor: '#f5f5f5',
    padding: 16,
    marginBottom: wp('10%')
  },
  section: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    marginBottom: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  sectionTitle: {
    fontSize: wp('4%'),
    fontWeight: 'bold',
    color: '#006D5B',
    marginBottom: wp('6%'),
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  detailLabel: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 16,
    color: '#333',
    fontWeight: '600',
  },
  buttonsContainer: {
    flexDirection: 'column',
    gap: 16,
  },
  button: {
    padding: 18,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  advanceButton: {
    backgroundColor: '#006D5B',
  },
  companyButton: {
    backgroundColor: '#006D5B',
  },
  driverButton: {
    backgroundColor: '#006D5B',
  },
  buttonText: {
    color: '#fff',
    fontSize: wp('4%'),
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 5,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxHeight: '100%',
  },
  modalTitle: {
    fontSize: wp('5%'),
    fontWeight: 'bold',
    color: '#006D5B',
    marginBottom: 24,
    textAlign: 'center',
  },
  label: {
    fontSize: wp('4%'),
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    marginTop: 8,
  },
  input: {
    borderWidth: 2,
    borderColor: '#e0e0e0',
    borderRadius: 10,
    padding: wp('3%'),
    marginBottom: 16,
    fontSize: wp('4%'),
    backgroundColor: '#fafafa',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  paymentModeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
    gap: 10,
  },
  paymentModeButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    backgroundColor: '#f8f9fa',
    minWidth: 80,
  },
  paymentModeButtonSelected: {
    backgroundColor: '#006D5B',
    borderColor: '#006D5B',
  },
  paymentModeText: {
    fontSize: wp('3%'),
    color: '#666',
    textAlign: 'center',
    fontWeight: '500',
  },
  paymentModeTextSelected: {
    color: '#fff',
    fontWeight: 'bold',
  },
  statusContainer: {
    flexDirection: 'row',
    marginBottom: 24,
    gap: 10,
  },
  statusButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    backgroundColor: '#f8f9fa',
    flex: 1,
  },
  statusButtonSelected: {
    backgroundColor: '#006D5B',
    borderColor: '#006D5B',
  },
  statusText: {
    fontSize: wp('3%'),
    color: '#666',
    textAlign: 'center',
    fontWeight: '500',
  },
  statusTextSelected: {
    color: '#fff',
    fontWeight: 'bold',
  },
  uploadButton: {
    backgroundColor: '#f8f9fa',
    borderWidth: 2,
    borderColor: '#e0e0e0',
    borderRadius: 10,
    padding: wp('4%'),
    alignItems: 'center',
    marginBottom: 16,
  },
  uploadButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '500',
  },
  previewImage: {
    width: '100%',
    height: wp('40%'),
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#e0e0e0',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 8,
  },
  modalButton: {
    flex: 1,
    padding: 18,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 50
  },
  cancelButton: {
    backgroundColor: '#f0f0f0',
    borderWidth: 2,
    borderColor: '#ddd',
  },
  submitButton: {
    backgroundColor: '#006D5B',
  },
  cancelButtonText: {
    color: '#666',
    fontWeight: 'bold',
    fontSize: 16,
  },
  submitButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  viewBtn: {
    fontSize: wp('3%'),
    color: '#006D5B',
    padding: wp('2%'),
    borderColor: '#006D5B',
    borderWidth: 2,
    borderRadius: 5,
    fontWeight: '600',
  },
  billText: { color: '#fff', fontWeight: '600' },
  loadingRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  errorText: { color: 'red', marginTop: 8 },
  webviewHeader: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  closeButton: {
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  closeText: { color: '#007bff', fontWeight: '600' },
  webviewTitle: { fontWeight: '700', fontSize: 16 },
  webviewLoading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});

export default TripDetails;