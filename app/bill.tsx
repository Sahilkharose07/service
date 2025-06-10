import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Image, Alert, Modal, SafeAreaView, ActivityIndicator, FlatList, KeyboardAvoidingView, Platform } from 'react-native';
import { MaterialCommunityIcons, MaterialIcons, Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Query } from 'appwrite';
import { databases, account } from '../lib/appwrite';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import SignatureScreen from 'react-native-signature-canvas';
import { styles } from '../constants/BillPage.styles';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format, isSameDay } from 'date-fns';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { footerStyles } from '../constants/footer';

const DATABASE_ID = '681c428b00159abb5e8b';
const COLLECTION_ID = 'bill_ID';
const USERS_COLLECTION_ID = '681c429800281e8a99bd';

type Bill = {
  $id: string;
  notes: string;
  billNumber: string;
  serviceType: string;
  serviceBoyName: string;
  customerName: string;
  contactNumber: string;
  address: string;
  serviceCharge: string;
  paymentMethod: string;
  cashGiven: string;
  change: string;
  $createdAt: string;
  signature?: string;
  status: string;
  total: string;
  date: string;
};

type User = {
  id: string;
  name: string;
};

const fieldLabels = {
  serviceType: 'Service Type',
  serviceBoyName: 'Service Engineer Name',
  customerName: 'Customer Name',
  address: 'Address',
  contactNumber: 'Contact Number',
  serviceCharge: 'Service Charge (₹)'
};

const BillPage = () => {
  const params = useLocalSearchParams();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [form, setForm] = useState({
    serviceType: '',
    serviceBoyName: '',
    customerName: '',
    address: '',
    contactNumber: '',
    serviceCharge: '',
  });
  const [bills, setBills] = useState<Bill[]>([]);
  const [allBills, setAllBills] = useState<Bill[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [cashGiven, setCashGiven] = useState('');
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [notes, setNotes] = useState('');
  const [isBillDetailVisible, setIsBillDetailVisible] = useState(false);
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null);
  const [signature, setSignature] = useState<string | null>(null);
  const [isSignatureVisible, setIsSignatureVisible] = useState(false);
  const [serviceBoys, setServiceBoys] = useState<User[]>([]);
  const [selectedServiceBoy, setSelectedServiceBoy] = useState<string | null>(null);
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [dateFilter, setDateFilter] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [filterType, setFilterType] = useState<'serviceBoy' | 'date'>('serviceBoy');

  useEffect(() => {
    fetchBills();
    fetchServiceBoys();
    if (params.serviceData) {
      try {
        const serviceData = JSON.parse(params.serviceData as string);
        setForm({
          serviceType: serviceData.serviceType || '',
          serviceBoyName: serviceData.serviceBoy || '',
          customerName: serviceData.clientName || '',
          address: serviceData.address || '',
          contactNumber: serviceData.phone || '',
          serviceCharge: serviceData.serviceCharge || '',

        });
        setIsFormVisible(true);
      } catch (error) {
        console.error('Error parsing service data:', error);
      }
    }
  }, [params.serviceData]);

  const formatToAmPm = (dateString: string) => {
    const date = new Date(dateString);
    const day = date.getDate();
    const month = date.getMonth() + 1;
    const year = date.getFullYear();
    let hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    const minutesStr = minutes < 10 ? '0' + minutes : minutes;
    return `${day}/${month}/${year} • ${hours}:${minutesStr} ${ampm}`;
  };

  const fetchServiceBoys = async () => {
    try {
      const response = await databases.listDocuments(
        DATABASE_ID,
        USERS_COLLECTION_ID
      );
      const boys = response.documents.map(doc => ({
        id: doc.$id,
        name: doc.name
      }));
      setServiceBoys(boys);
    } catch (error) {
      console.error('Error fetching service boys:', error);
    }
  };

  const fetchBills = async () => {
    setIsLoading(true);
    try {
      const response = await databases.listDocuments(
        DATABASE_ID,
        COLLECTION_ID,
        [Query.orderDesc('$createdAt')]
      );
      const formattedBills = response.documents as unknown as Bill[];
      setAllBills(formattedBills);
      setBills(formattedBills);
    } catch (error) {
      console.error('Error fetching bills:', error);
      Alert.alert('Error', 'Failed to fetch bills');
    } finally {
      setIsLoading(false);
    }
  };

  const countBillsByServiceBoy = () => {
    const counts: Record<string, number> = { 'All Service Engineers': allBills.length };
    serviceBoys.forEach(boy => {
      counts[boy.name] = allBills.filter(bill => bill.serviceBoyName === boy.name).length;
    });
    return counts;
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (event.type === 'dismissed') {
      return;
    }
    if (selectedDate) {
      setDateFilter(selectedDate);
      applyFilters(selectedServiceBoy, selectedDate);
    }
  };

  const applyFilters = (serviceBoy: string | null, date: Date | null) => {
    let filtered = allBills;
    if (serviceBoy) {
      filtered = filtered.filter(bill => bill.serviceBoyName === serviceBoy);
    }
    if (date) {
      filtered = filtered.filter(bill => {
        const billDate = new Date(bill.$createdAt);
        return isSameDay(billDate, date);
      });
    }
    setBills(filtered);
  };

  const filterServices = (serviceBoyName: string | null) => {
    setSelectedServiceBoy(serviceBoyName);
    applyFilters(serviceBoyName, dateFilter);
    setFilterModalVisible(false);
  };

  const clearDateFilter = () => {
    setDateFilter(null);
    applyFilters(selectedServiceBoy, null);
  };

  const clearServiceBoyFilter = () => {
    setSelectedServiceBoy(null);
    applyFilters(null, dateFilter);
  };

  const generateBillNumber = () => {
    const today = new Date();
    const dateStr = `${today.getFullYear()}${(today.getMonth() + 1).toString().padStart(2, '0')}${today.getDate().toString().padStart(2, '0')}`;
    const randomStr = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `BILL-${dateStr}-${randomStr}`;
  };

  const validateForm = () => {
    if (!form.serviceType.trim()) {
      Alert.alert('Error', 'Service type is required');
      return false;
    }
    if (!form.serviceBoyName.trim()) {
      Alert.alert('Error', 'Service provider name is required');
      return false;
    }
    if (!form.customerName.trim()) {
      Alert.alert('Error', 'Customer name is required');
      return false;
    }
    if (!form.address.trim()) {
      Alert.alert('Error', 'Address is required');
      return false;
    }
    if (!form.contactNumber.trim() || !/^\d{10}$/.test(form.contactNumber)) {
      Alert.alert('Error', 'Valid 10-digit contact number is required');
      return false;
    }
    if (!form.serviceCharge.trim() || isNaN(parseFloat(form.serviceCharge))) {
      Alert.alert('Error', 'Valid service charge is required');
      return false;
    }
    if (paymentMethod === 'cash' && (!cashGiven.trim() || isNaN(parseFloat(cashGiven)))) {
      Alert.alert('Error', 'Valid cash amount is required');
      return false;
    }
    return true;
  };

  const handleSubmitBill = async () => {
    if (!validateForm()) return;
    if (!signature) {
      Alert.alert('Error', 'Customer signature is required');
      return;
    }
    const billNumber = generateBillNumber();
    const billData = {
      ...form,
      paymentMethod,
      total: calculateTotal(),
      cashGiven: paymentMethod === 'cash' ? cashGiven : null,
      change: paymentMethod === 'cash' ? calculateChange() : null,
      date: new Date().toISOString(),
      billNumber,
      status: 'paid',
      notes: notes.trim() || null,
      signature: signature
    };
    try {
      await databases.createDocument(
        DATABASE_ID,
        COLLECTION_ID,
        billNumber,
        billData
      );
      Alert.alert('Success', 'Bill saved successfully!');
      fetchBills();
      setIsFormVisible(false);
      resetForm();
      setSignature(null);
    } catch (error) {
      console.error('Error saving bill:', error);
      Alert.alert('Error', 'Failed to save bill');
    }
  };

  const generateBillHtml = (bill: Bill) => {
    return `
     <html>
            <head>
              <style>
                html, body {
                  margin: 0;
                  padding: 0;
                  font-family: 'Arial', sans-serif;
                  font-size: 14px;
                  color: #333;
                  height: 100%;
                  box-sizing: border-box;
                  background-color: #f9f9f9;
                }
                body {
                  display: flex;
                  flex-direction: column;
                  padding: 30px;
                  max-width: 800px;
                  margin: 0 auto;
                  background: white;
                  box-shadow: 0 0 20px rgba(0,0,0,0.1);
                }
                .header {
                  display: flex;
                  justify-content: space-between;
                  align-items: center;
                  margin-bottom: 25px;
                  padding-bottom: 20px;
                  border-bottom: 2px solid #007bff;
                }
                .logo-container {
                  display: flex;
                  align-items: center;
                }
                .logo {
                  width: 70px;
                  height: auto;
                  margin-right: 15px;
                }
                .company-info {
                  text-align: left;
                }
                .company-name {
                  font-size: 24px;
                  font-weight: bold;
                  color: #007bff;
                  margin: 0;
                }
                .company-tagline {
                  font-size: 12px;
                  color: #666;
                  margin: 3px 0 0;
                }
                .invoice-info {
                  text-align: right;
                }
                .invoice-title {
                  font-size: 28px;
                  font-weight: bold;
                  color: #2c3e50;
                  margin: 0 0 5px;
                }
                .invoice-details {
                  font-size: 13px;
                  color: #555;
                }
                .section {
                  margin-bottom: 25px;
                  padding: 15px;
                  background: #f5f9ff;
                  border-radius: 5px;
                  box-shadow: 0 2px 5px rgba(0,0,0,0.05);
                }
                .section-title {
                  font-size: 18px;
                  font-weight: bold;
                  margin-bottom: 15px;
                  color: #2c3e50;
                  padding-bottom: 5px;
                  border-bottom: 1px solid #ddd;
                }
                .row {
                  display: flex;
                  margin-bottom: 8px;
                }
                .label {
                  font-weight: bold;
                  min-width: 150px;
                  color: #555;
                }
                .value {
                  flex: 1;
                }
                .highlight {
                  color: #007bff;
                  font-weight: bold;
                }
                .payment-details {
                  background: #e8f4ff;
                }
                .total-row {
                  font-size: 16px;
                  font-weight: bold;
                  margin-top: 10px;
                  padding-top: 10px;
                  border-top: 1px dashed #ccc;
                }
                .notes-section {
                  background: #fff8e6;
                  font-style: italic;
                }
                .signature-section {
                  margin-top: 30px;
                  text-align: center;
                  padding: 20px 0;
                  border-top: 2px dashed #007bff;
                }
                .signature-title {
                  font-weight: bold;
                  margin-bottom: 15px;
                  color: #555;
                }
                .signature-image {
                  max-width: 250px;
                  height: 80px;
                  margin: 0 auto;
                }
                .footer {
                  text-align: center;
                  margin-top: 30px;
                  font-size: 12px;
                  color: #888;
                  padding-top: 15px;
                  border-top: 1px solid #eee;
                }
                .thank-you {
                  font-size: 16px;
                  color: #007bff;
                  margin-bottom: 10px;
                  font-weight: bold;
                }
                .contact-info {
                  margin-top: 5px;
                }
              </style>
            </head>
            <body>
              <div class="header">
                <div class="logo-container">
                  <img src="https://servicevale.com/wp-content/uploads/2024/07/Untitled-design-20-1.png" class="logo" alt="Service Vale Logo" />
                  <div class="company-info">
                    <h1 class="company-name">Service Vale</h1>
                    <p class="company-tagline">Quality Service Solutions</p>
                  </div>
                </div>
                <div class="invoice-info">
                  <h2 class="invoice-title">INVOICE</h2>
                  <div class="invoice-details">
                    <div><strong>Bill No : </strong> ${bill.billNumber}</div>
                    <div><strong>Date : </strong> ${new Date(bill.$createdAt).toLocaleDateString()}</div>
                  </div>
                </div>
              </div>
              <div class="section">
                <div class="section-title">Customer Details</div>
                <div class="row">
                  <span class="label">Customer Name : </span>
                  <span class="value">${bill.customerName}</span>
                </div>
                <div class="row">
                  <span class="label">Contact Number : </span>
                  <span class="value">${bill.contactNumber}</span>
                </div>
                <div class="row">
                  <span class="label">Address : </span>
                  <span class="value">${bill.address}</span>
                </div>
              </div>       
              <div class="section">
                <div class="section-title">Service Details</div>
                <div class="row">
                  <span class="label">Service Type : </span>
                  <span class="value">${bill.serviceType}</span>
                </div>
                <div class="row">
                  <span class="label">Engineer Name : </span>
                  <span class="value">${bill.serviceBoyName}</span>
                </div>
                <div class="row total-row">
                  <span class="label">Service Charge : </span>
                  <span class="value highlight">₹${bill.serviceCharge}</span>
                </div>
              </div>       
              <div class="section payment-details">
                <div class="section-title">Payment Details</div>
                <div class="row">
                  <span class="label">Payment Method : </span>
                  <span class="value highlight">${bill.paymentMethod.toUpperCase()}</span>
                </div>
                ${bill.paymentMethod === 'cash' ? `
                <div class="row">
                  <span class="label">Amount Received : </span>
                  <span class="value">₹${bill.cashGiven}</span>
                </div>
                <div class="row">
                  <span class="label">Change Returned : </span>
                  <span class="value">₹${bill.change}</span>
                </div>
                ` : ''}
              </div>       
              ${bill.notes ? `
                <div class="section notes-section">
                  <div class="section-title">Notes</div>
                  <p>${bill.notes}</p>
                </div>
              ` : ''}       
              ${bill?.signature ? `
                <div class="signature-section">
                  <div class="signature-title">Customer Signature</div>
                  <img src="data:image/png;base64,${bill.signature}" class="signature-image" />
                </div>
              ` : ''}       
              <div class="footer">
                <div class="thank-you">Thank You For Your Business!</div>
                <div class="contact-info">
                  <strong>Contact : </strong> +91 635 320 2602 | 
                  <strong>Email : </strong> info@servicevale.com
                </div>
                <div class="address">
                  <strong>Address : </strong> Chowk Bazar Nanpura, Khatkiwad Basir, Jhinga Gali Me
                </div>
              </div>
            </body>
          </html>
    `;
  };

  const handleShareViaWhatsApp = async () => {
    if (!selectedBill) return;
    try {
      const htmlContent = generateBillHtml(selectedBill);
      const { uri } = await Print.printToFileAsync({
        html: htmlContent,
        width: 595,
        height: 842,
      });
      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: 'Share Bill via WhatsApp',
        UTI: 'net.whatsapp.pdf'
      });
    } catch (error) {
      console.error('Error sharing via WhatsApp:', error);
      Alert.alert('Error', 'Failed to share bill');
    }
  };

  const handlePrint = async () => {
    if (!selectedBill) return;
    try {
      const htmlContent = generateBillHtml(selectedBill);
      await Print.printAsync({ html: htmlContent });
    } catch (error) {
      console.error('Error printing:', error);
      Alert.alert('Print Failed', 'Unable to generate PDF');
    }
  };

  const resetForm = () => {
    setForm({
      serviceType: '',
      serviceBoyName: '',
      customerName: '',
      address: '',
      contactNumber: '',
      serviceCharge: '',
    });
    setPaymentMethod('cash');
    setCashGiven('');
    setNotes('');
  };

  const handleChange = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const calculateTotal = () => {
    const charge = parseFloat(form.serviceCharge) || 0;
    return charge.toFixed(2);
  };

  const calculateChange = () => {
    const total = parseFloat(calculateTotal()) || 0;
    const given = parseFloat(cashGiven) || 0;
    return given > total ? (given - total).toFixed(2) : '0.00';
  };

  const toggleFormVisibility = () => {
    setIsFormVisible(!isFormVisible);
    if (!isFormVisible) {
      resetForm();
    }
  };

  const showBillDetails = (bill: Bill) => {
    setSelectedBill(bill);
    setIsBillDetailVisible(true);
  };

  const closeBillDetails = () => {
    setIsBillDetailVisible(false);
    setSelectedBill(null);
  };

  const handleSignature = (signatureData: string) => {
    const base64Data = signatureData.replace('data:image/png;base64,', '');
    setSignature(base64Data);
    setIsSignatureVisible(false);
  };

  const handleDeleteBill = async (id: string) => {
    Alert.alert(
      'Delete Bill',
      'Are you sure you want to delete this bill?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          onPress: async () => {
            try {
              await databases.deleteDocument(DATABASE_ID, COLLECTION_ID, id);
              setBills(prev => prev.filter(bill => bill.$id !== id));
              setAllBills(prev => prev.filter(bill => bill.$id !== id));
              closeBillDetails();
              Alert.alert('Success', 'Bill deleted successfully');
            } catch (error) {
              console.error('Error deleting bill:', error);
              Alert.alert('Error', 'Failed to delete bill');
            }
          }
        }
      ]
    );
  };

  const handleLogout = async () => {
    try {
      await account.deleteSession('current');
      router.replace('/');
    } catch (error) {
      console.error('Logout error:', error);
      Alert.alert('Error', 'Failed to logout');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => router.push('/home')}>
            <Feather name="arrow-left" size={24} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Bill Management</Text>
        </View>
        <View style={styles.headerCount}>
          <Text style={styles.headerCountText}>{bills.length}</Text>
        </View>
      </View>

      {!isFormVisible ? (<View style={styles.filterContainer}>
        <TouchableOpacity
          style={[styles.filterButton, selectedServiceBoy && styles.activeFilter]}
          onPress={() => {
            setFilterType('serviceBoy');
            setFilterModalVisible(true);
          }}
        >
          <Feather name="user" size={18} color={selectedServiceBoy ? "#FFF" : "#5E72E4"} />
          <Text style={[styles.filterButtonText, selectedServiceBoy && styles.activeFilterText]}>
            {selectedServiceBoy ? selectedServiceBoy : 'Filter by Engineer'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, dateFilter && styles.activeFilter]}
          onPress={() => setShowDatePicker(true)}
        >
          <Feather name="calendar" size={18} color={dateFilter ? "#FFF" : "#5E72E4"} />
          <Text style={[styles.filterButtonText, dateFilter && styles.activeFilterText]}>
            {dateFilter ? format(dateFilter, 'dd MMM yyyy') : 'Filter by date'}
          </Text>
        </TouchableOpacity>
      </View>
      ) : null}

      {(selectedServiceBoy || dateFilter) && (
        <View style={styles.activeFiltersContainer}>
          {selectedServiceBoy && (
            <View style={styles.filterChip}>
              <Text style={styles.filterChipText}>{selectedServiceBoy}</Text>
              <TouchableOpacity onPress={clearServiceBoyFilter}>
                <Feather name="x" size={16} color="#FFF" />
              </TouchableOpacity>
            </View>
          )}
          {dateFilter && (
            <View style={styles.filterChip}>
              <Text style={styles.filterChipText}>{format(dateFilter, 'dd MMM yyyy')}</Text>
              <TouchableOpacity onPress={clearDateFilter}>
                <Feather name="x" size={16} color="#FFF" />
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      {showDatePicker && (
        <DateTimePicker
          value={dateFilter || new Date()}
          mode="date"
          display="default"
          onChange={handleDateChange}
        />
      )}

      <Modal
        animationType="slide"
        transparent={true}
        visible={filterModalVisible}
        onRequestClose={() => setFilterModalVisible(false)}
      >
        <View style={styles.modalContainer1}>
          <View style={styles.modalContent1}>
            <Text style={styles.modalTitle1}>Select Service Engineer</Text>
            <FlatList
              style={{ maxHeight: '90%' }}
              contentContainerStyle={styles.scrollContent}
              data={[{ id: 'all', name: 'All Service Engineers' }, ...serviceBoys]}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.serviceCard}
                  onPress={() => filterServices(item.name === 'All Service Engineers' ? null : item.name)}
                >
                  <View style={styles.serviceHeader}>
                    <Text style={styles.serviceType}>{item.name}</Text>
                    <View style={[styles.statusBadge, styles.pendingBadge]}>
                      <Text style={styles.statusText}>
                        {countBillsByServiceBoy()[item.name] || 0} Bills
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              )}
              showsVerticalScrollIndicator={true}
            />
            <TouchableOpacity
              style={styles.modalCloseButton1}
              onPress={() => setFilterModalVisible(false)}
            >
              <Text style={styles.modalCloseButtonText1}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={[styles.scrollContainer, { paddingBottom: 150 }]} keyboardShouldPersistTaps="handled">
          {isFormVisible ? (
            <View style={styles.formContainer}>
              <Text style={styles.sectionTitle}>Service Details</Text>
              {Object.entries(form).map(([key, value]) => (
                <View key={key} style={styles.formGroup}>
                  <Text style={styles.inputLabel}>{fieldLabels[key as keyof typeof fieldLabels]}</Text>
                  <TextInput
                    placeholder={`Enter ${fieldLabels[key as keyof typeof fieldLabels].toLowerCase()}`}
                    style={styles.input}
                    keyboardType={key === 'contactNumber' || key === 'serviceCharge' ? 'numeric' : 'default'}
                    value={value}
                    onChangeText={(text) => handleChange(key, text)}
                    editable={true}
                    maxLength={key === 'contactNumber' ? 10 : undefined}
                  />
                </View>
              ))}

              <Text style={styles.sectionTitle}>Additional Notes (Optional)</Text>
              <TextInput
                placeholder="Enter any additional notes"
                style={[styles.input, styles.textArea]}
                value={notes}
                onChangeText={setNotes}
                multiline
                numberOfLines={4}
                maxLength={500}
              />

              <View style={styles.paymentSummary}>
                <View style={[styles.summaryRow, styles.totalRow]}>
                  <Text style={styles.summaryLabel}>Total Amount :</Text>
                  <Text style={styles.summaryValue}>₹{calculateTotal()}</Text>
                </View>
              </View>

              <Text style={styles.sectionTitle}>Payment Method</Text>
              <View style={styles.paymentMethodContainer}>
                <TouchableOpacity
                  style={[styles.methodButton, paymentMethod === 'cash' && styles.methodButtonActive]}
                  onPress={() => setPaymentMethod('cash')}
                >
                  <MaterialCommunityIcons
                    name="cash"
                    size={20}
                    color={paymentMethod === 'cash' ? '#FFF' : '#5E72E4'}
                  />
                  <Text style={[styles.methodText, paymentMethod === 'cash' && styles.methodTextActive]}>
                    Cash
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.methodButton, paymentMethod === 'upi' && styles.methodButtonActive]}
                  onPress={() => setPaymentMethod('upi')}
                >
                  <MaterialCommunityIcons
                    name="bank-transfer"
                    size={20}
                    color={paymentMethod === 'upi' ? '#FFF' : '#5E72E4'}
                  />
                  <Text style={[styles.methodText, paymentMethod === 'upi' && styles.methodTextActive]}>
                    UPI
                  </Text>
                </TouchableOpacity>
              </View>

              {paymentMethod === 'cash' && (
                <View style={styles.cashPaymentContainer}>
                  <Text style={styles.sectionTitle}>Cash Payment</Text>
                  <TextInput
                    placeholder="Amount Given by Customer"
                    style={styles.input}
                    keyboardType="numeric"
                    value={cashGiven}
                    onChangeText={setCashGiven}
                  />
                  <View style={styles.changeContainer}>
                    <Text style={styles.changeLabel}>Change Return by Engineer :</Text>
                    <Text style={styles.changeValue}>₹{calculateChange()}</Text>
                  </View>
                </View>
              )}

              {signature ? (
                <View style={styles.signatureContainer}>
                  <Text style={styles.signatureLabel}>Customer Signature:</Text>
                  <Image
                    source={{ uri: `data:image/png;base64,${signature}` }}
                    style={styles.signatureImage}
                  />
                  <TouchableOpacity
                    style={styles.changeSignatureButton}
                    onPress={() => setIsSignatureVisible(true)}
                  >
                    <Text style={styles.changeSignatureText}>Change Signature</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.addSignatureButton}
                  onPress={() => setIsSignatureVisible(true)}
                >
                  <Feather name="edit" size={18} color="#5E72E4" />
                  <Text style={styles.addSignatureText}>Add Customer Signature</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={styles.submitButton} onPress={handleSubmitBill}>
                <Text style={styles.submitText}>Submit Bill</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.billsListContainer}>
              {isLoading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color="#5E72E4" />
                </View>
              ) : bills.length === 0 ? (
                <View style={styles.emptyState}>
                  <MaterialCommunityIcons name="file-document-outline" size={48} color="#A0AEC0" />
                  <Text style={styles.emptyText}>
                    {dateFilter
                      ? `No bills on ${format(dateFilter, 'MMMM d, yyyy')}`
                      : 'No bills found'
                    }
                  </Text>
                  <Text style={styles.emptySubtext}>You haven't created any bills yet</Text>
                </View>
              ) : (
                bills.map((bill) => (
                  <TouchableOpacity
                    key={bill.$id}
                    style={styles.billCard}
                    onPress={() => showBillDetails(bill)}
                  >
                    <View style={styles.billHeader}>
                      <View>
                        <Text style={styles.billCustomer}>{bill.customerName}</Text>
                        <Text style={styles.billService}>{bill.serviceType}</Text>
                        <Text style={styles.billNumber}>{bill.billNumber}</Text>
                      </View>
                      <View style={styles.billAmountContainer}>
                        <Text style={styles.billAmount}>₹{bill.total}</Text>
                      </View>
                    </View>
                    <View style={styles.billDateContainer}>
                      <MaterialCommunityIcons name="calendar" size={14} color="#718096" />
                      <Text style={styles.billDate}>
                        {formatToAmPm(bill.date)}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))
              )}
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal
        visible={isBillDetailVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={closeBillDetails}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            {selectedBill && (
              <>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Bill Information</Text>
                  <TouchableOpacity onPress={closeBillDetails}>
                    <Feather name="x" size={24} color="#718096" />
                  </TouchableOpacity>
                </View>
                <ScrollView style={styles.modalContent}>
                  <View style={styles.detailSection}>
                    <Text style={styles.detailSectionTitle}>Bill Details</Text>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Bill Number :</Text>
                      <Text style={styles.detailValue}>{selectedBill.billNumber}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Date :</Text>
                      <Text style={styles.detailValue}>
                        {formatToAmPm(selectedBill.$createdAt || '')}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.detailSection}>
                    <Text style={styles.detailSectionTitle}>Customer Details</Text>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Name :</Text>
                      <Text style={styles.detailValue}>{selectedBill.customerName}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Contact :</Text>
                      <Text style={styles.detailValue}>{selectedBill.contactNumber}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Address :</Text>
                      <Text style={styles.detailValue}>{selectedBill.address}</Text>
                    </View>
                  </View>

                  <View style={styles.detailSection}>
                    <Text style={styles.detailSectionTitle}>Service Details</Text>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Service Type :</Text>
                      <Text style={styles.detailValue}>{selectedBill.serviceType}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Service Engineer :</Text>
                      <Text style={styles.detailValue}>{selectedBill.serviceBoyName}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Service Charge :</Text>
                      <Text style={styles.detailValue}>₹{selectedBill.serviceCharge}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Service Commission :</Text>
                      <Text style={styles.detailValue}>
                        ₹{(parseFloat(selectedBill.serviceCharge) * 0.25).toFixed(2)}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.detailSection}>
                    <Text style={styles.detailSectionTitle}>Payment Details</Text>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Payment Method :</Text>
                      <Text style={styles.detailValue}>{selectedBill.paymentMethod.toUpperCase()}</Text>
                    </View>
                    {selectedBill.paymentMethod === 'cash' && (
                      <>
                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>Cash Received :</Text>
                          <Text style={styles.detailValue}>₹{selectedBill.cashGiven}</Text>
                        </View>
                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>Change Returned :</Text>
                          <Text style={styles.detailValue}>₹{selectedBill.change}</Text>
                        </View>
                      </>
                    )}
                  </View>

                  {selectedBill.notes && (
                    <View style={styles.detailSection}>
                      <Text style={styles.detailSectionTitle}>Additional Notes</Text>
                      <Text style={styles.notesText}>{selectedBill.notes}</Text>
                    </View>
                  )}

                  {selectedBill?.signature && (
                    <View style={styles.detailSection}>
                      <Text style={styles.detailSectionTitle}>Customer Signature</Text>
                      <Image
                        source={{ uri: `data:image/png;base64,${selectedBill.signature}` }}
                        style={styles.signatureImage}
                      />
                    </View>
                  )}

                  <View style={styles.modalActions}>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.printButton]}
                      onPress={handlePrint}
                    >
                      <Feather name="printer" size={18} color="#FFF" />
                      <Text style={styles.actionButtonText}>Print</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.whatsappButton]}
                      onPress={handleShareViaWhatsApp}
                    >
                      <Feather name="share-2" size={18} color="#FFF" />
                      <Text style={styles.actionButtonText}>Share</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.deleteButton]}
                      onPress={() => handleDeleteBill(selectedBill.$id)}
                    >
                      <Feather name="trash-2" size={18} color="#FFF" />
                      <Text style={styles.actionButtonText}>Delete</Text>
                    </TouchableOpacity>
                  </View>
                </ScrollView>
              </>
            )}
          </View>
        </View>
      </Modal>

      <Modal
        animationType="slide"
        transparent={true}
        visible={isSignatureVisible}
        onRequestClose={() => setIsSignatureVisible(false)}
      >
        <View style={styles.signatureModalContainer}>
          <View style={styles.signatureModalContent}>
            <View style={styles.signatureModalHeader}>
              <Text style={styles.signatureModalTitle}>Customer Signature</Text>
              <TouchableOpacity onPress={() => setIsSignatureVisible(false)}>
                <Feather name="x" size={24} color="#718096" />
              </TouchableOpacity>
            </View>
            <View style={styles.signatureCanvasContainer}>
              <SignatureScreen
                onOK={handleSignature}
                onEmpty={() => Alert.alert('Error', 'Please provide a signature')}
                descriptionText=""
                clearText="Clear"
                confirmText="Save"
                webStyle={`
                  .m-signature-pad {
                    box-shadow: none;
                    border: none;
                    margin: 0;
                    padding: 0;
                    height: 100%;
                  }
                  .m-signature-pad--body {
                    border: none;
                    height: calc(100% - 60px);
                  }
                  .m-signature-pad--footer {
                    height: 60px;
                    margin: 0;
                    padding: 10px;
                    background: white;
                  }
                  body, html {
                    background-color: #fff;
                    margin: 0;
                    padding: 0;
                    height: 100%;
                  }
                  canvas {
                    background-color: #fff;
                  }
                `}
              />
            </View>
          </View>
        </View>
      </Modal>

      <TouchableOpacity
        style={styles.fab}
        onPress={toggleFormVisibility}
      >
        <Feather name={isFormVisible ? 'x' : 'plus'} size={24} color="#FFF" />
      </TouchableOpacity>

      <View style={[footerStyles.bottomBar, { paddingBottom: insets.bottom || 20, marginTop: 40 }]}>
        <TouchableOpacity
          style={footerStyles.bottomButton}
          onPress={() => router.push('/service')}
        >
          <View style={footerStyles.bottomButtonIcon}>
            <MaterialIcons name="car-repair" size={20} color="#5E72E4" />
          </View>
          <Text style={footerStyles.bottomButtonText}>Service</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={footerStyles.bottomButton}
          onPress={() => router.push('/user')}
        >
          <View style={footerStyles.bottomButtonIcon}>
            <MaterialIcons name="person" size={20} color="#5E72E4" />
          </View>
          <Text style={footerStyles.bottomButtonText}>Users</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[footerStyles.bottomButton]}
          onPress={() => router.push('/home')}
        >
          <View style={[footerStyles.bottomButtonIcon]}>
            <Feather name="home" size={20} color="#5E72E4" />
          </View>
          <Text style={[footerStyles.bottomButtonText]}>Home</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={footerStyles.bottomButton}
          onPress={() => router.push('/userphotos')}
        >
          <View style={footerStyles.bottomButtonIcon}>
            <MaterialIcons name="photo-library" size={20} color="#5E72E4" />
          </View>
          <Text style={footerStyles.bottomButtonText}>Photos</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[footerStyles.bottomButton, footerStyles.bottomButtonActive]}
          onPress={() => router.push('/bill')}
        >
          <View style={[footerStyles.bottomButtonIcon, footerStyles.bottomButtonIconActive]}>
            <Feather name="file-text" size={20} color="#FFF" />
          </View>
          <Text style={[footerStyles.bottomButtonText, footerStyles.bottomButtonTextActive]}>Bills</Text>
        </TouchableOpacity>
      </View>

    </SafeAreaView>
  );
};

export default BillPage;