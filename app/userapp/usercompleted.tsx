import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, SafeAreaView, TouchableOpacity, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialCommunityIcons, MaterialIcons, Feather } from '@expo/vector-icons';
import { databases, account } from '../../lib/appwrite';
import { Query } from 'appwrite';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format, isSameDay } from 'date-fns';
import { styles } from '../../constants/userapp/CompletedServicesScreenuser.styles';

const DATABASE_ID = '681c428b00159abb5e8b';
const COLLECTION_ID = '681d92600018a87c1478';
const BILLS_COLLECTION_ID = 'bill_ID';

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
  completedAt?: string;
  formattedCompletedAt?: string;
};

const CompletedServicesScreenUser = () => {
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
          Query.equal('status', 'completed'),
          Query.equal('serviceboyEmail', email),
          Query.orderDesc('completedAt')
        ]
      );
      const formattedServices = response.documents.map(doc => {
        let formattedCompletedAt = '';
        if (doc.completedAt) {
          formattedCompletedAt = formatToAmPm(doc.completedAt);
        }
        let serviceDateDisplay = '';
        if (doc.serviceDate) {
          const [year, month, day] = doc.serviceDate.split('-');
          serviceDateDisplay = `${day}/${month}/${year}`;
        }
        let serviceTimeDisplay = '';
        if (doc.serviceTime) {
          const [hours, minutes] = doc.serviceTime.split(':');
          const hourNum = parseInt(hours);
          const ampm = hourNum >= 12 ? 'PM' : 'AM';
          const displayHour = hourNum % 12 || 12;
          serviceTimeDisplay = `${displayHour}:${minutes} ${ampm}`;
        }
        return {
          id: doc.$id,
          serviceType: doc.serviceType,
          clientName: doc.clientName,
          address: doc.address,
          phone: doc.phoneNumber,
          amount: doc.billAmount,
          status: doc.status,
          date: serviceDateDisplay,
          serviceBoy: doc.serviceboyName,
          serviceDate: serviceDateDisplay,
          serviceTime: serviceTimeDisplay,
          serviceboyEmail: doc.serviceboyEmail,
          completedAt: doc.completedAt,
          formattedCompletedAt,
        };
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
    if (params.completedService) {
      try {
        const newService = JSON.parse(params.completedService as string);
        if (newService.serviceboyEmail === userEmail) {
          const formattedService = {
            id: newService.id,
            serviceType: newService.serviceType,
            clientName: newService.clientName,
            address: newService.address,
            phone: newService.phone,
            amount: newService.amount,
            status: 'completed',
            date: newService.date || 'Just now',
            serviceBoy: newService.serviceBoy,
            serviceDate: newService.serviceDate || '',
            serviceTime: newService.serviceTime || '',
            serviceboyEmail: newService.serviceboyEmail || '',
            completedAt: newService.completedAt
          };
          setAllServices(prev => [formattedService, ...prev]);
          setServices(prev => {
            if (!dateFilter || (newService.completedAt && isSameDay(new Date(newService.completedAt), dateFilter))) {
              return [formattedService, ...prev];
            }
            return prev;
          });
        }
      } catch (error) {
        console.error('Error parsing completed service:', error);
      }
    }
  }, [params.completedService, userEmail]);

  const formatToAmPm = (isoString: string) => {
    const date = new Date(isoString);
    let hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    const minutesStr = minutes < 10 ? '0' + minutes : minutes;
    const day = date.getDate();
    const month = date.getMonth() + 1;
    const year = date.getFullYear();
    return `${day}/${month}/${year} • ${hours}:${minutesStr} ${ampm}`;
  };

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
      if (!service.completedAt) return false;
      const completedDate = new Date(service.completedAt);
      return isSameDay(completedDate, date);
    });
    setServices(filtered);
  };

  const clearDateFilter = () => {
    setDateFilter(null);
    setServices(allServices);
  };

  const handleCreateBill = (service: Service) => {
    router.push({
      pathname: '/userapp/userbill',
      params: {
        serviceData: JSON.stringify({
          clientName: service.clientName,
          address: service.address,
          phone: service.phone,
          serviceType: service.serviceType,
          amount: service.amount,
          serviceDate: service.serviceDate,
          serviceTime: service.serviceTime,
          serviceBoy: service.serviceBoy
        })
      }
    });
  };

  const handleMoveToPending = async (id: string) => {
    Alert.alert(
      'Move to Pending',
      'Are you sure you want to move this service back to pending?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Move',
          onPress: async () => {
            try {
              await databases.updateDocument(
                DATABASE_ID,
                COLLECTION_ID,
                id,
                { status: 'pending' }
              );
              setAllServices(prev => prev.filter(service => service.id !== id));
              setServices(prev => prev.filter(service => service.id !== id));
              const movedService = allServices.find(service => service.id === id);
              if (movedService) {
                router.push({
                  pathname: '/userapp/userpending',
                  params: {
                    movedService: JSON.stringify({
                      ...movedService,
                      status: 'pending'
                    })
                  }
                });
              }
            } catch (error) {
              console.error('Error moving service:', error);
              Alert.alert('Error', 'Failed to move service to pending');
            }
          }
        }
      ]
    );
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
        <View style={[styles.statusBadge, styles.completedBadge]}>
          <Text style={styles.statusText}>Completed</Text>
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
          <MaterialIcons name="check-circle" size={16} color="#718096" />
          <Text style={styles.dateText}>
            {item.completedAt
              ? `${formatToAmPm(item.completedAt)}`
              : 'Completion time not available'}
          </Text>
        </View>
      </View>
      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={styles.createBillButton}
          onPress={() => handleCreateBill(item)}
        >
          <MaterialCommunityIcons name="file-document" size={20} color="#FFF" />
          <Text style={styles.createBillButtonText}>Create Bill</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.moveToPendingButton}
          onPress={() => handleMoveToPending(item.id)}
        >
          <MaterialIcons name="pending-actions" size={20} color="#FFF" />
          <Text style={styles.moveToPendingButtonText}>Move to Pending</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => router.back()}>
            <Feather name="arrow-left" size={24} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Completed Services</Text>
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
          <MaterialIcons name="check-circle" size={48} color="#A0AEC0" />
          <Text style={styles.emptyText}>
            {dateFilter
              ? `No services completed on ${format(dateFilter, 'MMMM d, yyyy')}`
              : 'No completed services found'
            }
          </Text>
          <Text style={styles.emptySubtext}>You haven't completed any services yet</Text>
        </View>
      )}
    </SafeAreaView>
  );
};

export default CompletedServicesScreenUser;