import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert, SafeAreaView, KeyboardAvoidingView, Platform } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Feather, MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { databases } from '../lib/appwrite';
import { ID } from 'appwrite';
import DateTimePicker from '@react-native-community/datetimepicker';
import { styles } from '../constants/OrderScreen.styles';

const DATABASE_ID = '681c428b00159abb5e8b';
const COLLECTION_ID = '681d92600018a87c1478';

type FormData = {
  serviceboyName: string;
  serviceboyEmail: string;
  serviceboyContact: string;
  clientName: string;
  phoneNumber: string;
  address: string;
  billAmount: string;
  serviceType: string;
  status: string;
  serviceDate: string;
  serviceTime: string;
  timePeriod: 'AM' | 'PM';
};

const OrderScreen = () => {
  const { applicantName, serviceType, applicantEmail, applicantPhone } = useLocalSearchParams<{
    applicantName: string;
    serviceType: string;
    applicantEmail: string;
    applicantPhone: string;
  }>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const currentTime = new Date();
  const defaultHours = currentTime.getHours() > 12 ? currentTime.getHours() - 12 : currentTime.getHours();
  const defaultMinutes = currentTime.getMinutes();
  const defaultPeriod = currentTime.getHours() >= 12 ? 'PM' : 'AM';

  const formatDateToDMY = (date: Date) => {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const [formData, setFormData] = useState<FormData>({
    serviceboyName: applicantName || '',
    serviceboyEmail: applicantEmail || '',
    serviceboyContact: applicantPhone || '',
    clientName: '',
    phoneNumber: '',
    address: '',
    billAmount: '',
    serviceType: serviceType || '',
    status: 'pending',
    serviceDate: formatDateToDMY(new Date()),
    serviceTime: `${defaultHours}:${defaultMinutes < 10 ? '0' + defaultMinutes : defaultMinutes}`,
    timePeriod: defaultPeriod
  });

  const handleTimeChange = (text: string) => {
    let digits = text.replace(/[^0-9:]/g, '');
    if (digits.length > 2 && !digits.includes(':')) {
      digits = `${digits.substring(0, 2)}:${digits.substring(2)}`;
    }
    if (digits.length > 5) {
      digits = digits.substring(0, 5);
    }
    setFormData(prev => ({
      ...prev,
      serviceTime: digits
    }));
  };

  const handleChange = (name: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleTimePeriodChange = (period: 'AM' | 'PM') => {
    setFormData(prev => ({ ...prev, timePeriod: period }));
  };

  const handleDateChange = (event: any, date?: Date) => {
    setShowDatePicker(false);
    if (date) {
      setSelectedDate(date);
      handleChange('serviceDate', formatDateToDMY(date));
    }
  };

  const validateTime = (time: string) => {
    if (!time.includes(':')) return false;
    const [hoursStr, minutesStr] = time.split(':');
    const hours = parseInt(hoursStr, 10);
    const minutes = parseInt(minutesStr, 10);
    return !isNaN(hours) && !isNaN(minutes) &&
      hours >= 1 && hours <= 12 &&
      minutes >= 0 && minutes <= 59;
  };

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};
    if (!formData.clientName.trim()) {
      newErrors.clientName = 'Client name is required';
    }
    if (!formData.phoneNumber.trim()) {
      newErrors.phoneNumber = 'Phone number is required';
    } else if (!/^\d{10}$/.test(formData.phoneNumber)) {
      newErrors.phoneNumber = 'Invalid phone number (10 digits required)';
    }
    if (!formData.serviceDate) {
      newErrors.serviceDate = 'Service date is required';
    }
    if (!formData.serviceTime || !validateTime(formData.serviceTime)) {
      newErrors.serviceTime = 'Please enter a valid time (HH:MM) between 1:00 and 12:59';
    }
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      Alert.alert('Validation Error', 'Please fill all required fields correctly');
      return;
    }
    const [hoursStr, minutesStr] = formData.serviceTime.split(':');
    let hours = parseInt(hoursStr, 10);
    const minutes = minutesStr;
    if (formData.timePeriod === 'PM' && hours < 12) {
      hours += 12;
    } else if (formData.timePeriod === 'AM' && hours === 12) {
      hours = 0;
    }
    const sortableTime = `${String(hours).padStart(2, '0')}:${minutes}`;
    const [day, month, year] = formData.serviceDate.split('/');
    const sortableDate = `${year}-${month}-${day}`;
    setIsSubmitting(true);
    try {
      const response = await databases.createDocument(
        DATABASE_ID,
        COLLECTION_ID,
        ID.unique(),
        {
          serviceboyName: formData.serviceboyName,
          serviceboyEmail: formData.serviceboyEmail,
          serviceboyContact: formData.serviceboyContact,
          clientName: formData.clientName,
          phoneNumber: formData.phoneNumber,
          address: formData.address,
          billAmount: formData.billAmount,
          serviceType: formData.serviceType,
          status: 'pending',
          serviceDate: sortableDate,
          serviceTime: sortableTime
        }
      );
      Alert.alert('Success', 'Order created successfully!');
      router.push({
        pathname: '/pending',
        params: {
          newService: JSON.stringify({
            id: response.$id,
            serviceType: formData.serviceType,
            clientName: formData.clientName,
            address: formData.address,
            phoneNumber: formData.phoneNumber,
            billAmount: formData.billAmount,
            status: 'pending',
            serviceboyName: formData.serviceboyName,
            serviceboyEmail: formData.serviceboyEmail,
            serviceboyContact: formData.serviceboyContact,
            serviceDate: formData.serviceDate,
            serviceTime: `${formData.serviceTime} ${formData.timePeriod}`,
            createdAt: response.$createdAt
          })
        }
      });
    } catch (error) {
      console.error('Error creating order:', error);
      Alert.alert('Error', 'Failed to create order. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container1}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => router.push('/home')}>
            <Feather name="arrow-left" size={24} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Create Service Order</Text>
        </View>
      </View>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <View style={styles.formContainer}>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Service Information</Text>
              <View style={styles.field}>
                <Text style={styles.label}>Engineer Name</Text>
                <View style={styles.readOnlyContainer}>
                  <Text style={styles.readOnlyText}>{formData.serviceboyName}</Text>
                </View>
              </View>
              <View style={styles.field}>
                <Text style={styles.label}>Email Address</Text>
                <View style={styles.readOnlyContainer}>
                  <Text style={styles.readOnlyText}>{formData.serviceboyEmail}</Text>
                </View>
              </View>
              <View style={styles.field}>
                <Text style={styles.label}>Contact Number</Text>
                <View style={styles.readOnlyContainer}>
                  <Text style={styles.readOnlyText}>{formData.serviceboyContact}</Text>
                </View>
              </View>
              <View style={styles.field}>
                <Text style={styles.label}>Service Type</Text>
                <View style={styles.readOnlyContainer}>
                  <Text style={styles.readOnlyText}>{serviceType}</Text>
                </View>
              </View>
            </View>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Service Schedule</Text>
              <View style={styles.field}>
                <Text style={styles.label}>Service Date <Text style={styles.required}>*</Text></Text>
                <TouchableOpacity
                  style={styles.input}
                  onPress={() => setShowDatePicker(true)}
                >
                  <Text>{formData.serviceDate}</Text>
                </TouchableOpacity>
                {showDatePicker && (
                  <DateTimePicker
                    value={selectedDate}
                    mode="date"
                    display="default"
                    onChange={handleDateChange}
                    minimumDate={new Date()}
                  />
                )}
              </View>
              <View style={styles.field}>
                <Text style={styles.label}>Service Time <Text style={styles.required}>*</Text></Text>
                <View style={styles.timeInputContainer}>
                  <TextInput
                    style={[styles.input, styles.timeInput]}
                    value={formData.serviceTime}
                    onChangeText={handleTimeChange}
                    placeholder="HH:MM"
                    keyboardType="numbers-and-punctuation"
                    maxLength={5}
                  />
                  <View style={styles.timePeriodContainer}>
                    <TouchableOpacity
                      style={[
                        styles.timePeriodButton,
                        formData.timePeriod === 'AM' && styles.timePeriodButtonActive
                      ]}
                      onPress={() => handleTimePeriodChange('AM')}
                    >
                      <Text style={[
                        styles.timePeriodText,
                        formData.timePeriod === 'AM' && styles.timePeriodTextActive
                      ]}>
                        AM
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.timePeriodButton,
                        formData.timePeriod === 'PM' && styles.timePeriodButtonActive
                      ]}
                      onPress={() => handleTimePeriodChange('PM')}
                    >
                      <Text style={[
                        styles.timePeriodText,
                        formData.timePeriod === 'PM' && styles.timePeriodTextActive
                      ]}>
                        PM
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </View>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Customer Details</Text>
              <View style={styles.field}>
                <Text style={styles.label}>
                  Customer Name <Text style={styles.required}>*</Text>
                </Text>
                <TextInput
                  style={styles.input}
                  value={formData.clientName}
                  onChangeText={(text) => handleChange('clientName', text)}
                  placeholder="Enter customer name"
                />
              </View>
              <View style={styles.field}>
                <Text style={styles.label}>Contact Number <Text style={styles.required}>*</Text></Text>
                <View style={styles.inputContainer}>
                  <MaterialIcons name="phone" size={20} color="#6B7280" style={styles.inputIcon} />
                  <TextInput
                    style={styles.inputWithIcon}
                    placeholder="10-digit contact number"
                    value={formData.phoneNumber}
                    onChangeText={(text) => handleChange('phoneNumber', text)}
                    keyboardType="phone-pad"
                    maxLength={10}
                  />
                </View>
              </View>
              <View style={styles.field}>
                <Text style={styles.label}>Service Address</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={formData.address}
                  onChangeText={(text) => handleChange('address', text)}
                  placeholder="Enter Full address"
                  multiline
                  numberOfLines={4}
                />
              </View>
            </View>
            <Text style={styles.sectionTitle}>Billing Information</Text>
            <Text style={styles.label1}>Service Charge</Text>
            <View style={styles.detailRow}>
              <MaterialCommunityIcons name="currency-inr" size={16} color="#6B7280" />
              <TextInput
                style={styles.inputWithIcon}
                value={formData.billAmount?.toString() ?? ''}
                onChangeText={(text) => handleChange('billAmount', text)}
                placeholder="0.00"
                keyboardType="numeric"
              />
            </View>
          </View>
          <TouchableOpacity
            style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={isSubmitting}
          >
            <Text style={styles.submitButtonText}>
              {isSubmitting ? 'Creating...' : 'Create Service Order'}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>

  );
};

export default OrderScreen;