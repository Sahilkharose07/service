import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, SafeAreaView, TouchableOpacity, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialCommunityIcons, MaterialIcons, Feather } from '@expo/vector-icons';
import { databases, account } from '../../lib/appwrite';
import { ID, Query } from 'appwrite';
import { styles } from '../../constants/userapp/PendingServicesScreenuser.styles';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format, isSameDay } from 'date-fns';
import { Linking } from 'react-native';

const DATABASE_ID = '681c428b00159abb5e8b';
const COLLECTION_ID = '681d92600018a87c1478';
const NOTIFICATIONS_COLLECTION_ID = 'admin_id';

type Service = {
  id: string;
  serviceType: string;
  clientName: string;
  address: string;
  phone: string;
  amount: string;
  status: string;
  date: string;
  serviceBoy: string;
  serviceDate: string;
  serviceTime: string;
  serviceboyEmail: string;
  serviceboyContact: string;
  sortDate: string;
  sortTime: string;
};

const PendingServicesScreenUser = () => {
  const [services, setServices] = useState<Service[]>([]);
  const [allServices, setAllServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState('');
  const [dateFilter, setDateFilter] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const params = useLocalSearchParams();
  const router = useRouter();

  const fetchServices = async () => {
    try {
      const currentUser = await account.get();
      const email = currentUser.email;
      setUserEmail(email);
      const response = await databases.listDocuments(
        DATABASE_ID,
        COLLECTION_ID,
        [
          Query.equal('status', 'pending'),
          Query.equal('serviceboyEmail', email),
          Query.orderAsc('serviceDate'),
          Query.orderAsc('serviceTime')
        ]
      );
      const formattedServices = response.documents.map(doc => {
        const [year, month, day] = doc.serviceDate.split('-');
        const displayDate = `${day}/${month}/${year}`;
        const [hours, minutes] = doc.serviceTime.split(':');
        const hourNum = parseInt(hours);
        const ampm = hourNum >= 12 ? 'PM' : 'AM';
        const displayHour = hourNum % 12 || 12;
        const displayTime = `${displayHour}:${minutes} ${ampm}`;
        return {
          id: doc.$id,
          serviceType: doc.serviceType,
          clientName: doc.clientName,
          address: doc.address,
          phone: doc.phoneNumber,
          amount: doc.billAmount,
          status: doc.status,
          date: new Date(doc.$createdAt).toLocaleString(),
          serviceBoy: doc.serviceboyName,
          serviceDate: displayDate,
          serviceTime: displayTime,
          serviceboyEmail: doc.serviceboyEmail,
          serviceboyContact: doc.serviceboyContact,
          sortDate: doc.serviceDate,
          sortTime: doc.serviceTime
        };
      });
      formattedServices.sort((a, b) => {
        if (a.sortDate !== b.sortDate) {
          return a.sortDate.localeCompare(b.sortDate);
        }
        return a.sortTime.localeCompare(b.sortTime);
      });
      setAllServices(formattedServices);
      setServices(formattedServices);
    } catch (error) {
      console.error('Error fetching services:', error);
      Alert.alert('Error', 'Failed to load services');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServices();
    if (params.newService) {
      try {
        const newService = JSON.parse(params.newService as string);
        if (newService.serviceboyEmail === userEmail) {
          const formattedService = {
            id: newService.id,
            serviceType: newService.serviceType,
            clientName: newService.clientName,
            address: newService.address,
            phone: newService.phoneNumber,
            amount: `₹${newService.billAmount || '0'}`,
            status: 'pending',
            date: 'Just now',
            serviceBoy: newService.serviceboyName,
            serviceDate: newService.serviceDate ?
              newService.serviceDate.split('-').reverse().join('/') : '',
            serviceTime: newService.serviceTime || '',
            serviceboyEmail: newService.serviceboyEmail || '',
            serviceboyContact: newService.serviceboyContact || '',
            sortDate: newService.serviceDate || '',
            sortTime: newService.serviceTime || ''
          };
          setAllServices(prev => [formattedService, ...prev]);
          setServices(prev => {
            if (!dateFilter || isSameDay(new Date(newService.serviceDate.split('-').join('/')), dateFilter)) {
              return [formattedService, ...prev];
            }
            return prev;
          });
        }
      } catch (error) {
        console.error('Error parsing new service:', error);
      }
    }
  }, [params.newService, userEmail]);

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (event.type === 'dismissed') {
      return;
    }
    if (selectedDate) {
      setDateFilter(selectedDate);
      filterByDate(selectedDate);
    }
  };

  const filterByDate = (date: Date) => {
    const filtered = allServices.filter(service => {
      const [day, month, year] = service.serviceDate.split('/');
      const serviceDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      return isSameDay(serviceDate, date);
    });
    setServices(filtered);
  };

  const clearDateFilter = () => {
    setDateFilter(null);
    setServices(allServices);
  };

  const createNotification = async (description: string, userEmail: string) => {
    try {
      await databases.createDocument(
        DATABASE_ID,
        NOTIFICATIONS_COLLECTION_ID,
        ID.unique(),
        {
          description,
          IsRead: false,
          userEmail,
        }
      );
      console.log('Notification created successfully');
    } catch (error) {
      console.error('Notification creation failed:', error);
      throw error;
    }
  };

  const handleComplete = async (id: string) => {
    Alert.alert(
      'Complete Service',
      'Are you sure this service is completed?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Complete',
          onPress: async () => {
            try {
              await databases.updateDocument(
                DATABASE_ID,
                COLLECTION_ID,
                id,
                { status: 'completed' }
              );
              const completedService = services.find(service => service.id === id);
              if (!completedService) return;
              try {
                await createNotification(
                  `Service completed\n Engineer : ${completedService.serviceBoy}\n Service : ${completedService.serviceType}\n Customer : ${completedService.clientName}\n Date : ${completedService.serviceDate} at ${completedService.serviceTime}`,
                  completedService.serviceboyEmail
                );
              } catch (notificationError) {
                console.warn('Notification failed (service still completed):', notificationError);
              }
              setServices(prev => prev.filter(service => service.id !== id));
              setAllServices(prev => prev.filter(service => service.id !== id));
              router.push({
                pathname: '/userapp/usercompleted',
                params: {
                  completedService: JSON.stringify(completedService)
                }
              });
            } catch (error) {
              console.error('Error completing service:', error);
              Alert.alert('Error', 'Failed to complete service');
            }
          }
        }
      ]
    );
  };

  const sendManualWhatsAppNotification = (service: Service) => {
    const message = `Dear ${service.clientName},\n\n` +
      `Your ${service.serviceType} service is scheduled for:\n` +
      `📅 Date: ${service.serviceDate}\n` +
      `⏰ Time: ${service.serviceTime}\n\n` +
      `Service Provider Details:\n` +
      `👨‍🔧 Name: ${service.serviceBoy}\n` +
      `📞 Contact: ${service.serviceboyContact}\n\n` +
      `Service Amount: ₹${service.amount}\n\n` +
      `Please be ready for the service. For any queries, contact us.\n\n` +
      `Thank you for choosing our service!`;
    const phone = service.phone.replace(/\D/g, '');
    const url = `whatsapp://send?phone=${phone}&text=${encodeURIComponent(message)}`;
    Linking.canOpenURL(url).then(supported => {
      if (supported) {
        Linking.openURL(url);
      } else {
        Alert.alert('Error', 'WhatsApp is not installed');
      }
    });
  };

  const renderServiceItem = ({ item }: { item: Service }) => (
    <View style={styles.serviceCard}>
      <View style={styles.serviceHeader}>
        <View style={styles.serviceTypeContainer}>
          <MaterialCommunityIcons
            name="tools"
            size={20}
            color="#5E72E4"
            style={styles.serviceIcon}
          />
          <Text style={styles.serviceType}>{item.serviceType}</Text>
        </View>
        <View style={styles.serviceActions}>
          <TouchableOpacity
            onPress={() => router.push({
              pathname: '/userapp/PhotoComparisonPage',
              params: {
                notes: `Service : ${item.serviceType}\n Customer : ${item.clientName}\n Date : ${item.serviceDate} at ${item.serviceTime}`
              }
            })}
          >
            <MaterialIcons name="photo-camera" size={24} color="#5E72E4" />
          </TouchableOpacity>
          <View style={[styles.statusBadge, styles.pendingBadge]}>
            <Text style={styles.statusText}>Pending</Text>
          </View>
        </View>
      </View>
      <View style={styles.serviceDetails}>
        <View style={styles.detailRow}>
          <MaterialIcons name="person" size={18} color="#718096" />
          <Text style={styles.detailText}>{item.clientName}</Text>
        </View>
        <View style={styles.detailRow}>
          <MaterialIcons name="location-on" size={18} color="#718096" />
          <Text style={styles.detailText}>
            {item.address}
          </Text>
        </View>
        <View style={styles.detailRow}>
          <MaterialIcons name="phone" size={18} color="#718096" />
          <Text style={styles.detailText}>{item.phone}</Text>
        </View>
        <View style={styles.detailRow}>
          <MaterialCommunityIcons name="currency-inr" size={18} color="#718096" />
          <Text style={styles.detailText}>
            {isNaN(Number(item.amount)) ? '0' : Number(item.amount).toLocaleString('en-IN')}
          </Text>
        </View>
      </View>
      <View style={styles.serviceFooter}>
        <View style={styles.dateContainer}>
          <MaterialIcons name="access-time" size={16} color="#718096" />
          <Text style={styles.dateText}>
            {item.serviceDate} • {item.serviceTime}
          </Text>
        </View>
      </View>
      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={styles.completeButton}
          onPress={() => handleComplete(item.id)}
        >
          <MaterialIcons name="check-circle" size={20} color="#FFF" />
          <Text style={styles.completeButtonText}>Complete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => router.push('/userapp/home')}>
            <Feather name="arrow-left" size={24} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Pending Services</Text>
        </View>
        <View style={styles.headerCount}>
          <Text style={styles.headerCountText}>{services.length}</Text>
        </View>
      </View>
      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => setShowDatePicker(true)}
        >
          <Feather name="calendar" size={18} color="#5E72E4" />
          <Text style={styles.filterButtonText}>
            {dateFilter ? format(dateFilter, 'dd MMM yyyy') : 'Filter by date'}
          </Text>
        </TouchableOpacity>
        {dateFilter && (
          <TouchableOpacity
            style={styles.clearFilterButton}
            onPress={clearDateFilter}
          >
            <Feather name="x" size={16} color="#5E72E4" />
            <Text style={styles.clearFilterText}>Clear</Text>
          </TouchableOpacity>
        )}
      </View>
      {showDatePicker && (
        <DateTimePicker
          value={dateFilter || new Date()}
          mode="date"
          display="default"
          onChange={handleDateChange}
        />
      )}
      {services.length > 0 ? (
        <FlatList
          data={services}
          renderItem={renderServiceItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <View style={styles.emptyState}>
          <MaterialIcons name="pending-actions" size={48} color="#A0AEC0" />
          <Text style={styles.emptyText}>
            {dateFilter
              ? `No pending services on ${format(dateFilter, 'MMMM d, yyyy')}`
              : 'No pending services assigned to you'
            }
          </Text>
          <Text style={styles.emptySubtext}>All your assigned services are completed</Text>
        </View>
      )}
    </SafeAreaView>
  );
};

export default PendingServicesScreenUser;