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
  Image,
  ActivityIndicator,
  Alert,
  FlatList,
  SafeAreaView,
  Dimensions,
} from 'react-native';
import ImageCropPicker from 'react-native-image-crop-picker';

const { width, height } = Dimensions.get('window');

const SplitPaymentModal = ({
  visible,
  onClose,
  onSubmit,
  loader = false,
  initialData = {}
}) => {
  const [splitPaymentData, setSplitPaymentData] = useState({
    tripId: initialData.tripId || '',
    amount: initialData.amount || '',
    totalAmount: initialData.totalAmount || 0,
    location: initialData.location || '',
    comment: initialData.comment || '',
    paymentPhoto: initialData.paymentPhoto || null,
    paymentPhotoPath: initialData.paymentPhotoPath || null
  });

  // State for multiple entries
  const [entries, setEntries] = useState([
    { id: 1, tripId: '', amount: '' }
  ]);
  const [nextId, setNextId] = useState(2);
  const [imageLoading, setImageLoading] = useState(false);
  const [remainingAmount, setRemainingAmount] = useState(0);
  const [isAddMoreDisabled, setIsAddMoreDisabled] = useState(false);

  // Calculate total of all entries
  const calculateTotal = () => {
    let total = 0;
    entries.forEach(entry => {
      total += parseFloat(entry.amount) || 0;
    });
    return total;
  };

  // Calculate remaining amount
  const calculateRemaining = () => {
    const mainAmount = parseFloat(splitPaymentData.amount) || 0;
    const entriesTotal = calculateTotal();
    const remaining = mainAmount - entriesTotal;
    setRemainingAmount(remaining);
    
    // Check if add more should be disabled
    if (mainAmount > 0 && remaining <= 0) {
      setIsAddMoreDisabled(true);
    } else {
      setIsAddMoreDisabled(false);
    }
    return remaining;
  };

  // Update remaining amount when entries or main amount changes
  useEffect(() => {
    calculateRemaining();
  }, [entries, splitPaymentData.amount]);

  const handleAmountChange = (text) => {
    const newAmount = text;
    setSplitPaymentData({
      ...splitPaymentData,
      amount: newAmount,
      totalAmount: newAmount ? parseFloat(newAmount) || 0 : 0
    });
  };

  // Handle entry changes
  const handleEntryChange = (id, field, value) => {
    setEntries(entries.map(entry => 
      entry.id === id ? { ...entry, [field]: value } : entry
    ));
  };

  // Check if first entry is empty
  const isFirstEntryEmpty = () => {
    const firstEntry = entries[0];
    return !firstEntry.tripId.trim() && !firstEntry.amount.trim();
  };

  // Add new entry with auto-fill
  const addEntry = () => {
    // Check if first entry is empty
    if (isFirstEntryEmpty()) {
      Alert.alert('Info', 'Please fill the first entry before adding more');
      return;
    }

    const mainAmount = parseFloat(splitPaymentData.amount) || 0;
    const currentTotal = calculateTotal();
    const remaining = mainAmount - currentTotal;
    
    // Check if we can add more
    if (remaining <= 0) {
      Alert.alert('Info', 'Amount is fully distributed');
      return;
    }

    // Auto-fill remaining amount in the new entry
    const newEntryAmount = remaining > 0 ? remaining.toString() : '';
    
    setEntries([...entries, { 
      id: nextId, 
      tripId: '', 
      amount: newEntryAmount 
    }]);
    setNextId(nextId + 1);
    
    // Calculate remaining after adding
    setTimeout(() => {
      calculateRemaining();
    }, 100);
  };

  // Remove entry
  const removeEntry = (id) => {
    if (entries.length > 1) {
      setEntries(entries.filter(entry => entry.id !== id));
    } else {
      Alert.alert('Info', 'At least one entry is required');
    }
  };

  const selectImage = async () => {
    try {
      setImageLoading(true);
      
      const image = await ImageCropPicker.openPicker({
        width: 800,
        height: 800,
        cropping: true,
        cropperCircleOverlay: false,
        compressImageQuality: 0.8,
        includeBase64: true,
        mediaType: 'photo',
      });

      if (image) {
        setSplitPaymentData({
          ...splitPaymentData,
          paymentPhoto: image.path,
          paymentPhotoPath: image.path
        });
      }
    } catch (error) {
      if (error.code !== 'E_PICKER_CANCELLED') {
        console.log('Error selecting image:', error);
        Alert.alert('Error', 'Failed to select image');
      }
    } finally {
      setImageLoading(false);
    }
  };

  const handleSubmit = () => {
    // Validate entries
    const invalidEntries = entries.filter(entry => !entry.tripId.trim() || !entry.amount.trim());
    if (invalidEntries.length > 0) {
      Alert.alert('Validation Error', 'Please fill Trip ID and Amount for all entries');
      return;
    }

    if (!splitPaymentData.tripId.trim()) {
      Alert.alert('Validation Error', 'Please enter Transaction ID');
      return;
    }

    if (!splitPaymentData.amount.trim()) {
      Alert.alert('Validation Error', 'Please enter Amount');
      return;
    }

    // Check if total matches
    const mainAmount = parseFloat(splitPaymentData.amount) || 0;
    const entriesTotal = calculateTotal();
    
    if (entriesTotal !== mainAmount) {
      Alert.alert('Validation Error', `Total amount (${entriesTotal}) does not match main amount (${mainAmount})`);
      return;
    }

    // Prepare data for submission
    const submitData = {
      transactionId: splitPaymentData.tripId,
      mainAmount: splitPaymentData.amount,
      entries: entries,
      totalAmount: entriesTotal,
      paymentPhoto: splitPaymentData.paymentPhoto,
    };

    if (onSubmit) {
      onSubmit(submitData);
    }
  };

  const resetForm = () => {
    setSplitPaymentData({
      tripId: '',
      amount: '',
      totalAmount: 0,
      location: '',
      comment: '',
      paymentPhoto: null,
      paymentPhotoPath: null
    });
    setEntries([{ id: 1, tripId: '', amount: '' }]);
    setNextId(2);
    setRemainingAmount(0);
    setIsAddMoreDisabled(false);
  };

  useEffect(() => {
    if (!visible) {
      resetForm();
    }
  }, [visible]);

  // Render each entry row
  const renderEntry = ({ item, index }) => (
    <View style={styles.entryRow}>
      <View style={styles.entryTripId}>
        <TextInput
          style={[styles.input, styles.entryInput]}
          placeholder="Trip ID"
          placeholderTextColor="#999"
          value={item.tripId}
          onChangeText={(text) => handleEntryChange(item.id, 'tripId', text)}
        />
      </View>
      <View style={styles.entryAmount}>
        <TextInput
          style={[styles.input, styles.entryInput]}
          placeholder="Amount"
          placeholderTextColor="#999"
          keyboardType="numeric"
          value={item.amount}
          onChangeText={(text) => handleEntryChange(item.id, 'amount', text)}
        />
      </View>
      <TouchableOpacity 
        style={styles.deleteButton}
        onPress={() => removeEntry(item.id)}
      >
        <Text style={styles.deleteButtonText}>✕</Text>
      </TouchableOpacity>
    </View>
  );

  const mainAmount = parseFloat(splitPaymentData.amount) || 0;
  const entriesTotal = calculateTotal();
  const isAmountValid = mainAmount > 0 && entriesTotal > 0 && entriesTotal === mainAmount;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.safeArea}>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.modalContainer}>
            {/* Header */}
            <View style={styles.headerContainer}>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Split Payment</Text>
              <View style={{ width: 30 }} />
            </View>

            <ScrollView 
              style={styles.scrollView}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.scrollContent}
            >
              {/* Transaction ID */}
              <Text style={styles.label}>Transaction ID</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter Transaction ID"
                placeholderTextColor="#999"
                value={splitPaymentData.tripId}
                onChangeText={(text) => setSplitPaymentData({...splitPaymentData, tripId: text})}
              />

              {/* Amount */}
              <Text style={styles.label}>Amount</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter amount"
                placeholderTextColor="#999"
                keyboardType="numeric"
                value={splitPaymentData.amount}
                onChangeText={handleAmountChange}
              />

              {/* Remaining Amount Display */}
              {mainAmount > 0 && (
                <View style={[
                  styles.remainingContainer,
                  remainingAmount === 0 ? styles.remainingEqual : styles.remainingNotEqual
                ]}>
                  <Text style={styles.remainingLabel}>Remaining Amount:</Text>
                  <Text style={[
                    styles.remainingValue,
                    remainingAmount === 0 ? styles.remainingEqualText : styles.remainingNotEqualText
                  ]}>
                    ₹ {remainingAmount}
                  </Text>
                </View>
              )}

              {/* Screen Short */}
              <Text style={styles.label}>Screen Short</Text>
              <TouchableOpacity 
                style={styles.uploadButton}
                onPress={selectImage}
                disabled={imageLoading}
              >
                {imageLoading ? (
                  <ActivityIndicator size="small" color="#0066cc" />
                ) : (
                  <Text style={styles.uploadButtonText}>
                    {splitPaymentData.paymentPhoto ? 'Change Photo' : 'Select Screen Short'}
                  </Text>
                )}
              </TouchableOpacity>
              
              {splitPaymentData.paymentPhoto && (
                <View style={styles.imagePreviewContainer}>
                  <Image 
                    source={{ uri: splitPaymentData.paymentPhoto }} 
                    style={styles.previewImage} 
                  />
                  <TouchableOpacity 
                    style={styles.removeImageButton}
                    onPress={() => setSplitPaymentData({
                      ...splitPaymentData,
                      paymentPhoto: null,
                      paymentPhotoPath: null
                    })}
                  >
                    <Text style={styles.removeImageText}>✕ Remove</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Entries List - Trip ID & Amount side by side with delete */}
              <View style={styles.entriesHeader}>
                <Text style={[styles.label, styles.entriesLabel]}>Trip ID</Text>
                <Text style={[styles.label, styles.entriesLabel, styles.amountLabel]}>Amount</Text>
                <View style={styles.deleteHeader} />
              </View>

              <FlatList
                data={entries}
                renderItem={renderEntry}
                keyExtractor={(item) => item.id.toString()}
                scrollEnabled={false}
              />

              {/* Add More Button */}
              <TouchableOpacity 
                style={[
                  styles.addMoreButton,
                  (isAddMoreDisabled || mainAmount === 0 || isFirstEntryEmpty()) ? styles.addMoreDisabled : null
                ]}
                onPress={addEntry}
                disabled={isAddMoreDisabled || mainAmount === 0 || isFirstEntryEmpty()}
              >
                <Text style={[
                  styles.addMoreText,
                  (isAddMoreDisabled || mainAmount === 0 || isFirstEntryEmpty()) ? styles.addMoreTextDisabled : null
                ]}>
                  {mainAmount === 0 ? 'Enter amount first' : 
                   isFirstEntryEmpty() ? 'Fill first entry first' :
                   isAddMoreDisabled ? 'Amount fully distributed' : '+ Add More'}
                </Text>
              </TouchableOpacity>

              {/* Total Amount */}
              <View style={[
                styles.totalContainer,
                mainAmount > 0 && entriesTotal > 0 && entriesTotal === mainAmount ? 
                  styles.totalEqual : styles.totalNotEqual
              ]}>
                <Text style={styles.totalLabel}>
                  Total Amount:
                  {mainAmount > 0 && entriesTotal > 0 && entriesTotal !== mainAmount && 
                    ` (Expected: ₹${mainAmount})`}
                </Text>
                <Text style={[
                  styles.totalValue,
                  mainAmount > 0 && entriesTotal > 0 && entriesTotal === mainAmount ?
                    styles.totalEqualText : styles.totalNotEqualText
                ]}>
                  ₹ {entriesTotal}
                </Text>
              </View>

              {/* Buttons */}
              <View style={styles.modalButtons}>
                <TouchableOpacity 
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={onClose}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[
                    styles.modalButton, 
                    styles.submitButton,
                    !isAmountValid ? styles.submitDisabled : null
                  ]}
                  onPress={handleSubmit}
                  disabled={loader || !isAmountValid}
                >
                  {loader ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.submitButtonText}>Submit</Text>
                  )}
                </TouchableOpacity>
              </View>
              
              {/* Bottom spacer */}
              <View style={styles.bottomSpacer} />
            </ScrollView>
          </View>
        </TouchableWithoutFeedback>
      </SafeAreaView>
    </Modal>
  );
};

// Styles for Split Payment Modal
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    backgroundColor: '#fff',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    flex: 1,
  },
  closeButton: {
    padding: 5,
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    fontSize: 22,
    color: '#666',
    fontWeight: 'bold',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingBottom: 40,
  },
  entriesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 5,
    paddingHorizontal: 2,
  },
  entriesLabel: {
    marginTop: 0,
    marginBottom: 0,
    flex: 1,
  },
  amountLabel: {
    flex: 1,
    marginLeft: 8,
  },
  deleteHeader: {
    width: 36,
  },
  entryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    width: '100%',
  },
  entryTripId: {
    flex: 1,
    marginRight: 8,
  },
  entryAmount: {
    flex: 1,
    marginRight: 8,
  },
  entryInput: {
    marginBottom: 0,
    width: '100%',
  },
  deleteButton: {
    width: 36,
    height: 36,
    backgroundColor: '#ffebee',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#ffcdd2',
  },
  deleteButtonText: {
    color: '#d32f2f',
    fontSize: 18,
    fontWeight: 'bold',
  },
  addMoreButton: {
    backgroundColor: '#e3f2fd',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 5,
    borderWidth: 1,
    borderColor: '#bbdefb',
    borderStyle: 'dashed',
    width: '100%',
  },
  addMoreDisabled: {
    backgroundColor: '#f5f5f5',
    borderColor: '#e0e0e0',
    opacity: 0.7,
  },
  addMoreText: {
    color: '#1976d2',
    fontSize: 14,
    fontWeight: '600',
  },
  addMoreTextDisabled: {
    color: '#999',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 5,
    marginTop: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
    color: '#333',
    marginBottom: 10,
    width: '100%',
  },
  remainingContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1,
    width: '100%',
  },
  remainingEqual: {
    backgroundColor: '#e8f5e9',
    borderColor: '#a5d6a7',
  },
  remainingNotEqual: {
    backgroundColor: '#fff3e0',
    borderColor: '#ffcc80',
  },
  remainingLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  remainingValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  remainingEqualText: {
    color: '#2e7d32',
  },
  remainingNotEqualText: {
    color: '#e65100',
  },
  totalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    borderRadius: 10,
    marginVertical: 16,
    borderWidth: 1,
    width: '100%',
  },
  totalEqual: {
    backgroundColor: '#e8f5e9',
    borderColor: '#a5d6a7',
  },
  totalNotEqual: {
    backgroundColor: '#fff3e0',
    borderColor: '#ffcc80',
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  totalValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  totalEqualText: {
    color: '#2e7d32',
  },
  totalNotEqualText: {
    color: '#e65100',
  },
  uploadButton: {
    backgroundColor: '#e8f0fe',
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    marginTop: 5,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
    width: '100%',
  },
  uploadButtonText: {
    color: '#0066cc',
    fontSize: 14,
    fontWeight: '500',
  },
  imagePreviewContainer: {
    marginTop: 10,
    alignItems: 'center',
    width: '100%',
  },
  previewImage: {
    width: '100%',
    height: 200,
    borderRadius: 10,
    resizeMode: 'cover',
  },
  removeImageButton: {
    marginTop: 8,
    padding: 8,
    backgroundColor: '#ffebee',
    borderRadius: 8,
  },
  removeImageText: {
    color: '#d32f2f',
    fontSize: 14,
    fontWeight: '500',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    gap: 12,
    width: '100%',
  },
  modalButton: {
    flex: 1,
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
  },
  cancelButton: {
    backgroundColor: '#f0f0f0',
  },
  submitButton: {
    backgroundColor: '#006D5B',
  },
  submitDisabled: {
    backgroundColor: '#cccccc',
    opacity: 0.6,
  },
  cancelButtonText: {
    color: '#333',
    fontSize: 16,
    fontWeight: '600',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  bottomSpacer: {
    height: 20,
  },
});

export default SplitPaymentModal;