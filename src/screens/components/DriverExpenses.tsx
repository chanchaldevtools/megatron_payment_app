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
  KeyboardAvoidingView,
  Platform,
  Image,
  Dimensions
} from 'react-native';
import ImagePicker from 'react-native-image-crop-picker';
import { apiService } from '../../services/ApiServices';

const { width } = Dimensions.get('window');

const DriverExpenses = ({ transports, Paymenthistory, DataType }) => {
  const [expenses, setExpenses] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // --- Document States ---
  const [docModalVisible, setDocModalVisible] = useState(false);
  const [writtenDoc, setWrittenDoc] = useState(null); // Stores Server URL
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [fetchingDoc, setFetchingDoc] = useState(false);

  const [formData, setFormData] = useState({
    type: '',
    location: '',
    amount: '',
    otherType: ''
  });
  const [deletingId, setDeletingId] = useState(null);

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
    { label: 'Others', value: 'Others' }
  ];

  const totalExpenses = expenses.reduce(
    (sum, expense) => sum + parseInt(expense.amount.replace(/[^0-9]/g, '') || 0),
    0
  );

  // Fetch expenses from API
  const fetchExpenses = async () => {
    if (!transports?.id) return;
    setFetching(true);
    try {
      const result = await apiService.AllTransactions({
        transport_id: transports.id,
        type: DataType,
        payment_type: 'DE',
      });
      if (result?.payments) {
        const mappedExpenses = result.payments.map((item) => ({
          id: item.id,
          category: item.comment || 'Unknown',
          amount: `₹${parseInt(item.amount).toLocaleString()}`,
          date: item.date || new Date().toISOString().split('T')[0],
          location: item.location || 'N/A',
        }));
        setExpenses(mappedExpenses);
      }
    } catch (error) {
      console.error('Error fetching expenses:', error);
      Alert.alert('Error', 'Failed to fetch expenses');
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, [transports]);

  // --- Document Sync Logic (Fetch/Upload/Delete) ---

  const handleOpenDocModal = async () => {
    setDocModalVisible(true);
    setFetchingDoc(true);
    try {
      // API call to get the current document path from Laravel
      const response = await apiService.GetTransportDocument(transports.id);
      if (response && response.written_doc_url) {
        setWrittenDoc(response.written_doc_url);
      } else {
        setWrittenDoc(null);
      }
    } catch (error) {
      console.log("Doc fetch error:", error);
    } finally {
      setFetchingDoc(false);
    }
  };

  const syncDocument = async (imagePath, action) => {
    setUploadingDoc(true);
    try {
      const formDataObj = new FormData();
      formDataObj.append('transport_id', transports.id);
      formDataObj.append('action_type', action); // 'upload' or 'delete'

      if (action === 'upload' && imagePath) {
        formDataObj.append('image', {
          uri: Platform.OS === 'android' ? imagePath : imagePath.replace('file://', ''),
          type: 'image/jpeg',
          name: `expense_${transports.id}.jpg`,
        });
      }

      const response = await apiService.SyncWrittenDocument(formDataObj);

      if (action === 'delete') {
        setWrittenDoc(null);
        Alert.alert("Success", "Document deleted successfully");
      } else {
        setWrittenDoc(response.url); // Laravel updated URL
        Alert.alert("Success", "Document uploaded successfully");
      }
    } catch (error) {
      Alert.alert("Error", "Action failed on server");
    } finally {
      setUploadingDoc(false);
    }
  };

  const handlePickAndCrop = () => {
    ImagePicker.openPicker({
      width: 1200,
      height: 1600,
      cropping: true,
      freeStyleCropEnabled: true,
      compressImageQuality: 0.8,
    }).then(image => {
      syncDocument(image.path, 'upload');
    }).catch(err => {
      if (err.code !== 'E_PICKER_CANCELLED') {
        Alert.alert('Error', 'Selection failed');
      }
    });
  };

  const confirmDeleteDoc = () => {
    Alert.alert("Delete Document", "Are you sure you want to delete this from the server?", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => syncDocument(null, 'delete') }
    ]);
  };

  // --- Expense Handlers ---

  const handleDeleteExpense = (expenseId) => {
    Alert.alert("Confirm Delete", "Are you sure you want to delete this expense?", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => deleteExpense(expenseId) }
    ]);
  };

  const deleteExpense = async (expenseId) => {
    setDeletingId(expenseId);
    try {
      await apiService.DeletePayment({ payment_id: expenseId });
      setExpenses(prevExpenses => prevExpenses.filter(expense => expense.id !== expenseId));
      Alert.alert("Success", "Expense deleted successfully");
    } catch (error) {
      Alert.alert("Error", "Failed to delete expense");
    } finally {
      setDeletingId(null);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const resetForm = () => {
    setFormData({ type: '', location: '', amount: '', otherType: '' });
    setDropdownOpen(false);
  };

  const handleSubmit = async () => {
    if (!formData.type || !formData.location || !formData.amount) {
      Alert.alert('Error', 'Please fill all required fields');
      return;
    }
    setLoading(true);
    try {
      const payload = {
        payment_type: 'DE',
        amount: formData.amount,
        location: formData.location,
        comment: formData.type === 'Others' ? formData.otherType : formData.type,
        payment_mode: 'CASH',
        payment_status: 'Approved',
        [DataType === 'Main' ? 'transport_id' : 'child_id']: transports.id
      };
      await apiService.AddDriverCash(payload);
      Alert.alert('Success', 'Expense added successfully!');
      setModalVisible(false);
      resetForm();
      fetchExpenses();
    } catch (error) {
      Alert.alert('Error', 'Failed to add expense');
    } finally {
      setLoading(false);
    }
  };

  const getSelectedLabel = () => {
    const selected = expenseTypes.find(item => item.value === formData.type);
    return selected ? selected.label : 'Select Option';
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Summary Card */}
      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>Total Expenses</Text>
        <View style={styles.summaryRow}>
          <Text style={styles.totalAmount}>₹{totalExpenses.toLocaleString()}</Text>
          <View style={{ flexDirection: 'row' }}>
            <TouchableOpacity
              style={[styles.addButton, { backgroundColor: '#555', marginRight: 8 }]}
              onPress={handleOpenDocModal}
            >
              <Text style={styles.addButtonText}>View Written</Text>
            </TouchableOpacity>
            <TouchableOpacity 
  style={[
    styles.addButton,
    { opacity: (transports.checkedBy != null) ? 0.5 : 1 }
  ]} 
  disabled={transports.checkedBy != null}
  onPress={() => setModalVisible(true)}
>
  <Text style={styles.addButtonText}>Add</Text>
</TouchableOpacity>
          </View>
        </View>
      </View>

      {/* --- WRITTEN DOCUMENT MODAL --- */}
      <Modal visible={docModalVisible} transparent animationType="slide" onRequestClose={() => setDocModalVisible(false)}>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Written Expense Image</Text>
            <View style={styles.imageBox}>
              {fetchingDoc ? (
                <ActivityIndicator size="large" color="#006D5B" />
              ) : writtenDoc ? (
                <Image source={{ uri: writtenDoc }} style={styles.fullImage} resizeMode="contain" />
              ) : (
                <Text style={{ color: '#999' }}>No document found on server</Text>
              )}
            </View>

            <View style={styles.modalActions}>
              {uploadingDoc ? (
                <ActivityIndicator color="#006D5B" size="small" />
              ) : (
                <>
                  {!writtenDoc ? (
                    <TouchableOpacity style={[styles.actionButton, styles.submitButton]} onPress={handlePickAndCrop}>
                      <Text style={styles.submitButtonText}>Upload Image</Text>
                    </TouchableOpacity>
                  ) : (
                    <>
                      <TouchableOpacity style={[styles.actionButton, styles.cancelButton]} onPress={handlePickAndCrop}>
                        <Text style={styles.cancelButtonText}>Change</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[styles.actionButton, { backgroundColor: '#FF6B6B' }]} onPress={confirmDeleteDoc}>
                        <Text style={styles.submitButtonText}>Delete</Text>
                      </TouchableOpacity>
                    </>
                  )}
                </>
              )}
            </View>
            <TouchableOpacity style={{ marginTop: 20 }} onPress={() => setDocModalVisible(false)}>
              <Text style={{ color: '#666', fontWeight: 'bold' }}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Expense Modal */}
      <Modal animationType="slide" transparent={true} visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
        <KeyboardAvoidingView style={styles.modalContainer} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <ScrollView style={styles.modalScroll} contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }} keyboardShouldPersistTaps="handled">
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Add New Expense</Text>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Expense Type *</Text>
                <TouchableOpacity style={styles.dropdownButton} onPress={() => setDropdownOpen(!dropdownOpen)}>
                  <Text style={[styles.dropdownButtonText, !formData.type && styles.placeholderText]}>{getSelectedLabel()}</Text>
                  <Text style={styles.dropdownArrow}>▼</Text>
                </TouchableOpacity>
                {dropdownOpen && (
                  <View style={styles.dropdownListWrapper}>
                    <ScrollView nestedScrollEnabled style={styles.dropdownScroll}>
                      {expenseTypes.map((item) => (
                        <TouchableOpacity
                          key={item.value}
                          style={[styles.dropdownOption, formData.type === item.value && styles.dropdownOptionSelected]}
                          onPress={() => { handleInputChange('type', item.value); setDropdownOpen(false); }}
                        >
                          <Text style={[styles.dropdownOptionText, formData.type === item.value && styles.dropdownOptionTextSelected]}>{item.label}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}
              </View>

              {formData.type === 'Others' && (
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Specify Expense Type *</Text>
                  <TextInput style={styles.textInput} placeholder="Enter expense type" value={formData.otherType} onChangeText={(text) => handleInputChange('otherType', text)} />
                </View>
              )}

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Location *</Text>
                <TextInput style={styles.textInput} placeholder="Enter location" value={formData.location} onChangeText={(text) => handleInputChange('location', text)} />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Amount (₹) *</Text>
                <TextInput style={styles.textInput} placeholder="Enter amount" keyboardType="numeric" value={formData.amount} onChangeText={(text) => handleInputChange('amount', text)} />
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity style={[styles.actionButton, styles.cancelButton]} onPress={() => setModalVisible(false)} disabled={loading}>
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.actionButton, styles.submitButton]} onPress={handleSubmit} disabled={loading}>
                  {loading ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.submitButtonText}>Submit</Text>}
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      {/* Expense List */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Expense Details</Text>
        {fetching ? (
          <ActivityIndicator size="large" color="#006D5B" />
        ) : expenses.length === 0 ? (
          <Text style={{ textAlign: 'center', color: '#999', marginTop: 20 }}>No expenses found</Text>
        ) : (
          expenses.map((expense) => (
            <View key={expense.id} style={styles.expenseItem}>
              <View style={styles.expenseHeader}>
                <Text style={styles.expenseCategory}>{expense.category}</Text>
                <Text style={styles.expenseAmount}>{expense.amount}</Text>
              </View>
              <View style={styles.expenseDetails}>
                <View style={styles.expenseInfo}>
                  <Text style={styles.expenseDate}>{expense.date}</Text>
                  <Text style={styles.expenseLocation}>{expense.location}</Text>
                </View>
                <TouchableOpacity
                  style={[styles.deleteBtn, deletingId === expense.id && styles.deleteBtnDisabled]}
                  onPress={() => handleDeleteExpense(expense.id)}
                  disabled={deletingId === expense.id}
                >
                  {deletingId === expense.id ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.deleteBtnText}>Delete</Text>}
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
        <View style={styles.balanceContainer}>
          <Text style={styles.sectionTitle}>Driver Balance</Text>
          <Text style={styles.balanceAmount}>₹{Paymenthistory - totalExpenses}</Text>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5', padding: 16 },
  summaryCard: { backgroundColor: '#fff', padding: 16, borderRadius: 12, marginBottom: 16, elevation: 2 },
  summaryTitle: { fontSize: 16, color: '#666', marginBottom: 8 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  totalAmount: { fontSize: 22, fontWeight: 'bold', color: '#006D5B' },
  addButton: { backgroundColor: '#006D5B', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 6 },
  addButtonText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  section: { backgroundColor: '#fff', padding: 16, borderRadius: 8, elevation: 1 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#006D5B', marginBottom: 12 },
  expenseItem: { padding: 12, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  expenseHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  expenseCategory: { fontSize: 14, fontWeight: '600', color: '#333' },
  expenseAmount: { fontSize: 14, fontWeight: 'bold', color: '#006D5B' },
  expenseDetails: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  expenseInfo: { flex: 1 },
  expenseDate: { fontSize: 12, color: '#666' },
  expenseLocation: { fontSize: 12, color: '#666' },
  deleteBtn: { backgroundColor: '#FF6B6B', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 4, minWidth: 60, alignItems: 'center' },
  deleteBtnDisabled: { backgroundColor: '#FFA8A8' },
  deleteBtnText: { color: '#fff', fontSize: 12, fontWeight: '500' },
  balanceContainer: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#f0f0f0' },
  balanceAmount: { fontSize: 16, fontWeight: 'bold', color: '#006D5B' },
  // Modal Styles
  modalContainer: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center' },
  modalScroll: { flex: 1 },
  modalContent: { backgroundColor: '#fff', borderRadius: 12, padding: 20, margin: 20, elevation: 5, alignItems: 'center' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#006D5B', marginBottom: 20 },
  imageBox: { width: '100%', height: 250, backgroundColor: '#f0f0f0', borderRadius: 10, justifyContent: 'center', alignItems: 'center', overflow: 'hidden', marginBottom: 20 },
  fullImage: { width: '100%', height: '100%' },
  inputGroup: { marginBottom: 16, width: '100%' },
  label: { fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 8 },
  dropdownButton: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12, flexDirection: 'row', justifyContent: 'space-between', width: '100%' },
  dropdownButtonText: { fontSize: 14, color: '#333' },
  placeholderText: { color: '#999' },
  dropdownArrow: { fontSize: 12, color: '#666' },
  dropdownListWrapper: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#ddd', borderRadius: 8, maxHeight: 200, width: '100%', marginTop: 5 },
  dropdownOption: { padding: 12, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  dropdownOptionSelected: { backgroundColor: '#006D5B' },
  dropdownOptionText: { fontSize: 14, color: '#333' },
  dropdownOptionTextSelected: { color: '#fff', fontWeight: '600' },
  textInput: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12, fontSize: 14, width: '100%' },
  modalActions: { flexDirection: 'row', justifyContent: 'space-between', width: '100%' },
  actionButton: { flex: 1, padding: 12, borderRadius: 8, alignItems: 'center', marginHorizontal: 5 },
  cancelButton: { backgroundColor: '#e0e0e0' },
  cancelButtonText: { color: '#666', fontWeight: 'bold' },
  submitButton: { backgroundColor: '#006D5B' },
  submitButtonText: { color: '#fff', fontWeight: 'bold' },
});

export default DriverExpenses;