import React, { useState, useEffect, useCallback } from 'react';
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
} from 'react-native';
// Correct Import for Zoom functionality
import ImageViewer from 'react-native-image-zoom-viewer';

const { width } = Dimensions.get('window');
import { apiService, IMAGE_URL } from '../services/ApiServices';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
    widthPercentageToDP as wp,
    heightPercentageToDP as hp,
} from 'react-native-responsive-screen';

const Transactions = ({ route }) => {
    const transport_id = route?.params?.transport_id || null;
    const vehicle = route?.params?.vehicle || null;
    const DataType = route?.params?.DataType || null;
    const [activeSection, setActiveSection] = useState('driver');
    const [modalVisible, setModalVisible] = useState(false);
    const [selectedImage, setSelectedImage] = useState('');
    const [imageLoading, setImageLoading] = useState(false);
    const [VehicleNumber, setVehicleNumber] = useState();
    const [TransportDetails, setTransportDetails] = useState('');
    const [UserType, setUserType] = useState('');
    const [transactionData, setTransactions] = useState({
        driver: [],
        company: [],
        account: [],
    });
    const [loading, setLoading] = useState(false);

    const paymentTypeMap = {
        driver: 'DC',
        company: 'ADVC',
        account: 'ADVACBC',
    };

    const fetchTransactions = useCallback(async (payment_type, section) => {
        try {
            setLoading(true);
            const result = await apiService.AllTransactions({
                transport_id: transport_id.id,
                type: DataType,
                payment_type: payment_type,
            });

            if (result?.payments) {
                setTransactions((prev) => ({
                    ...prev,
                    [section]: result.payments.map((p) => ({
                        id: p.id.toString(),
                        amount: p.amount,
                        date: new Date(p.created_at).toLocaleString(),
                        paymentMode: p.payment_mode,
                        paymentStatus: p.payment_status,
                        location: p.location,
                        reason: p.comment,
                        upiId: p.upi_id,
                        payment_type: payment_type,
                        bankDetails: p.bank_name
                            ? {
                                accountHolder: p.account_holder_name,
                                accountNo: p.account_number,
                                ifsc: p.ifsc_code,
                            }
                            : null,
                        qrCode: p.qr_code_picture,
                        image: p.payment_success_picture || p.payment_raise_picture,
                        isApproved: p.payment_status === 'Approved' || p.payment_status === 'Success',
                    })),
                }));
            }
        } catch (error) {
            console.error('Error fetching transactions:', error);
        } finally {
            setLoading(false);
        }
    }, [transport_id, DataType]);

    const updatePaymentStatus = async (id, targetStatus, successMessage, failureMessage) => {
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
                                fetchTransactions(paymentTypeMap.driver, 'driver');
                                fetchTransactions(paymentTypeMap.company, 'company');
                                fetchTransactions(paymentTypeMap.account, 'account');
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

    const handleDelete = async (paymentId) => {
        Alert.alert(
            'Confirm Delete',
            'Are you sure you want to delete this transaction?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            setLoading(true);
                            const formData = { payment_id: paymentId };
                            const response = await apiService.DeletePayment(formData);

                            if (response?.status || response?.success) {
                                Alert.alert('Success', 'Transaction deleted successfully.');
                                fetchTransactions(paymentTypeMap.driver, 'driver');
                                fetchTransactions(paymentTypeMap.company, 'company');
                                fetchTransactions(paymentTypeMap.account, 'account');
                            } else {
                                Alert.alert('Error', response?.message || 'Failed to delete transaction.');
                            }
                        } catch (error) {
                            console.error('Delete error:', error);
                            Alert.alert('Error', 'Something went wrong. Please try again.');
                        } finally {
                            setLoading(false);
                        }
                    }
                }
            ]
        );
    };

    const handleApprove = (item) => {
        if (item.paymentStatus === 'Pending') {
            updatePaymentStatus(item.id, 'Approved', 'Transaction approved successfully!', 'Failed to approve transaction.');
        } else if (item.paymentStatus === 'Approved') {
            updatePaymentStatus(item.id, 'Success', 'Transaction marked as Success!', 'Failed to mark transaction as success.');
        }
    };

    useEffect(() => {
        const checkLogin = async () => {
            try {
                const userData = await AsyncStorage.getItem('userData');
                if (userData) {
                    const parsed = JSON.parse(userData);
                    setUserType(parsed.user_type);
                }
            } catch (e) {
                console.error('Error reading AsyncStorage:', e);
            }
        };
        checkLogin();
        setTransportDetails(transport_id);
        setVehicleNumber(vehicle.vehicle_number);
        fetchTransactions(paymentTypeMap.driver, 'driver');
        fetchTransactions(paymentTypeMap.company, 'company');
        fetchTransactions(paymentTypeMap.account, 'account');
    }, [route, transport_id, fetchTransactions]);

    const transportDetails = {
        source: TransportDetails.source,
        destination: TransportDetails.destination,
        vehicleNo: VehicleNumber,
    };

    const SectionButton = ({ title, section }) => (
        <TouchableOpacity
            style={[styles.sectionButton, activeSection === section && styles.sectionButtonActive]}
            onPress={() => setActiveSection(section)}
        >
            <Text style={[styles.sectionButtonText, activeSection === section && styles.sectionButtonTextActive]}>
                {title}
            </Text>
        </TouchableOpacity>
    );

    const openImageModal = (imageUri) => {
        setSelectedImage(imageUri);
        setModalVisible(true);
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'Success': return '#4CAF50';
            case 'Approved': return '#0EA5E9';
            case 'Pending': return '#FF9800';
            case 'Failed': return '#F44336';
            default: return '#666';
        }
    };

    const getPaymentModeColor = (mode) => {
        switch (mode) {
            case 'Cash': return '#2196F3';
            case 'UPI': return '#9C27B0';
            case 'Bank': return '#FF5722';
            case 'QR': return '#F59E0B';
            default: return '#666';
        }
    };
const renderEmptyComponent = () => (
        <View style={styles.noDataContainer}>
            <Text style={styles.noDataEmoji}>📭</Text>
            <Text style={styles.noDataTitle}>No Transactions Found</Text>
            <Text style={styles.noDataSubtitle}>
                There are no records available for {activeSection} section.
            </Text>
        </View>
    );
    const renderTransactionCard = ({ item, index }) => {
        let approveButtonText = item.paymentStatus === 'Pending' ? 'APPROVE' : 'MARK SUCCESS';
        const showActionButton = UserType === 'Admin' && (item.paymentStatus === 'Pending' || item.paymentStatus === 'Approved');

        return (
            <View style={styles.cardContainer}>
                <View style={styles.card}>
                    <View style={styles.mainRow}>
                        <View style={styles.amountColumn}>
                            <Text style={styles.amount}>₹{item.amount}</Text>
                        </View>
                        <View style={styles.statusColumn}>
                            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.paymentStatus) }]}>
                                <Text style={styles.statusText}>{item.paymentStatus}</Text>
                            </View>
                        </View>
                        <View style={styles.dateColumn}>
                            <Text style={styles.dateText}>{item.date}</Text>
                        </View>
                        <View style={styles.modeColumn}>
                            <View style={[styles.modeBadge, { backgroundColor: getPaymentModeColor(item.paymentMode) }]}>
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

                    {item.paymentMode === 'BANK' && item.bankDetails && (
                        <>
                            <View style={styles.rowDivider} />
                            <View style={styles.paymentDetailsRow}>
                                <Text style={styles.paymentDetailLabel}>Bank Details:</Text>
                                <View style={styles.bankDetails}>
                                    <Text style={styles.bankText}>A/C: {item.bankDetails.accountNo}</Text>
                                    <Text style={styles.bankText}>IFSC: {item.bankDetails.ifsc}</Text>
                                </View>
                            </View>
                        </>
                    )}

                    <View style={styles.cardFooter}>
                        {(item.payment_type === 'ADVC' || item.paymentMode === 'QR') ? (
                            <TouchableOpacity
                                style={styles.imageButton}
                                onPress={() => openImageModal(IMAGE_URL + (item.image || item.qrCode))}
                            >
                                <Text style={styles.imageButtonText}>{item.payment_type === 'ADVC' ? 'DOCUMENT' : 'VIEW QR'}</Text>
                            </TouchableOpacity>
                        ) : <View style={{ flex: 1 }} />}

                        {item.paymentStatus === 'Pending' && (
                            <TouchableOpacity
                                style={[styles.deleteButton, showActionButton && { marginRight: 8 }]}
                                onPress={() => handleDelete(item.id)}
                            >
                                <Text style={styles.deleteButtonText}>DELETE</Text>
                            </TouchableOpacity>
                        )}

                        {showActionButton && (
                            <TouchableOpacity
                                style={styles.approveButton}
                                onPress={() => handleApprove(item)}
                                disabled={loading}
                            >
                                <Text style={styles.approveButtonText}>{approveButtonText}</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View style={styles.routeInfo}>
                    <View style={styles.locationRow}>
                        <View style={styles.locationDot} />
                        <Text style={styles.locationText} numberOfLines={1}>{transportDetails.source}</Text>
                    </View>
                    <View style={styles.verticalLine} />
                    <View style={styles.locationRow}>
                        <View style={[styles.locationDot, styles.destinationDot]} />
                        <Text style={styles.locationText} numberOfLines={1}>{transportDetails.destination}</Text>
                    </View>
                </View>
                <View style={styles.vehicleInfo}>
                    <Text style={styles.vehicleLabel}>Vehicle No:</Text>
                    <Text style={styles.vehicleNumber}>{transportDetails.vehicleNo}</Text>
                </View>
            </View>

            <View style={styles.sectionTabs}>
                <SectionButton title="Driver Cash" section="driver" />
                <SectionButton title="Company" section="company" />
                <SectionButton title="Account" section="account" />
            </View>

            {loading ? (
                <ActivityIndicator size="large" color="#006D5B" style={{ marginTop: 20 }} />
            ) : (
                <FlatList
                    data={transactionData[activeSection]}
                    keyExtractor={(item) => item.id}
                    ListEmptyComponent={renderEmptyComponent}
                    renderItem={renderTransactionCard}
                />
            )}

            {/* CORRECTED ZOOM MODAL */}
            <Modal visible={modalVisible} transparent={true} onRequestClose={() => setModalVisible(false)}>
                <ImageViewer
                    imageUrls={[{ url: selectedImage }]}
                    onCancel={() => setModalVisible(false)}
                    onClick={() => setModalVisible(false)} // Close on click for better UX
                    enableSwipeDown={true}
                    renderHeader={() => (
                        <TouchableOpacity 
                            style={styles.closeButtonAbsolute} 
                            onPress={() => setModalVisible(false)}
                        >
                            <Text style={styles.closeButtonText}>✕ CLOSE</Text>
                        </TouchableOpacity>
                    )}
                    loadingRender={() => <ActivityIndicator color="#FFF" size="large" />}
                />
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    // ... Keeping all your existing styles identical ...
    container: { flex: 1, backgroundColor: '#F8FAFC' },
    header: { backgroundColor: '#006D5B', paddingHorizontal: 16, paddingTop: 10, paddingBottom: 16 },
    routeInfo: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
    locationRow: { flex: 1, flexDirection: 'row', alignItems: 'center' },
    locationDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#10B981', marginRight: 10 },
    destinationDot: { backgroundColor: '#EF4444' },
    verticalLine: { width: 2, height: 32, backgroundColor: '#E0E7FF', marginHorizontal: 12 },
    locationText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF', flex: 1 },
    vehicleInfo: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, alignSelf: 'flex-start' },
    vehicleLabel: { fontSize: 13, color: '#E0E7FF', marginRight: 6, fontWeight: '600' },
    vehicleNumber: { fontSize: 15, fontWeight: 'bold', color: '#FFFFFF' },
    sectionTabs: { flexDirection: 'row', marginHorizontal: 16, marginTop: -10, backgroundColor: '#FFFFFF', borderRadius: 12, padding: 6, elevation: 4, bottom: 10 },
    sectionButton: { flex: 1, paddingVertical: 14, alignItems: 'center', borderRadius: 10 },
    sectionButtonActive: { backgroundColor: '#006D5B' },
    sectionButtonText: { fontSize: 13, fontWeight: '700', color: '#64748B' },
    sectionButtonTextActive: { color: '#FFFFFF', fontWeight: 'bold' },
    cardContainer: { marginHorizontal: 16, marginBottom: 12 },
    card: { backgroundColor: '#FFFFFF', padding: 16, borderRadius: 12, elevation: 3, borderLeftWidth: 4, borderLeftColor: '#006D5B' },
    mainRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4 },
    amountColumn: { flex: 1, alignItems: 'center' },
    statusColumn: { flex: 1, alignItems: 'center' },
    dateColumn: { flex: 1.5, alignItems: 'center' },
    modeColumn: { flex: 1, alignItems: 'center' },
    amount: { fontSize: wp('4%'), fontWeight: 'bold', color: '#1E293B' },
    dateText: { fontSize: wp('3%'), color: '#64748B', fontWeight: '600', textAlign: 'center' },
    statusBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
    statusText: { fontSize: wp('2%'), fontWeight: 'bold', color: '#FFFFFF' },
    modeBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
    modeText: { fontSize: 10, fontWeight: 'bold', color: '#FFFFFF' },
    rowDivider: { height: 1, backgroundColor: '#E2E8F0', marginVertical: 10 },
    detailsRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 4 },
    detailSection: { flex: 1 },
    detailLabel: { fontSize: 11, color: '#64748B', marginBottom: 4, fontWeight: '600' },
    detailValue: { fontSize: 13, color: '#1E293B', fontWeight: '600' },
    paymentDetailsRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 4 },
    paymentDetailLabel: { fontSize: 11, color: '#64748B', fontWeight: 'bold', marginRight: 8 },
    bankDetails: { flex: 1 },
    bankText: { fontSize: 11, color: '#1E293B', fontWeight: '600', marginBottom: 2 },
    cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
    imageButton: { backgroundColor: '#F1F5F9', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, flex: 1, marginRight: 8, alignItems: 'center' },
    imageButtonText: { fontSize: wp('2.5%'), fontWeight: 'bold', color: '#006D5B' },
    deleteButton: { backgroundColor: '#EF4444', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8, flex: 1, alignItems: 'center' },
    deleteButtonText: { fontSize: wp('2.5%'), fontWeight: 'bold', color: '#FFFFFF' },
    approveButton: { backgroundColor: '#006D5B', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8, flex: 1, marginLeft: 8, alignItems: 'center' },
    approveButtonText: { fontSize: wp('2.5%'), fontWeight: 'bold', color: '#FFFFFF' },
    noDataContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 100 },
    noDataEmoji: { fontSize: 50, marginBottom: 10 },
    noDataTitle: { fontSize: 18, fontWeight: 'bold', color: '#1E293B' },
    noDataSubtitle: { fontSize: 14, color: '#64748B', textAlign: 'center', marginTop: 5 },
    // Header for the Zoom Viewer
    closeButtonAbsolute: {
        position: 'absolute',
        top: 50,
        right: 20,
        zIndex: 99,
        backgroundColor: 'rgba(0,0,0,0.5)',
        padding: 10,
        borderRadius: 5
    },
    closeButtonText: {
        color: 'white',
        fontWeight: 'bold'
    }
});

export default Transactions;