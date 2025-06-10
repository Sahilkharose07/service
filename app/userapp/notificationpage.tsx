import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  RefreshControl,
  Alert,
  Platform,
} from 'react-native';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { databases, account } from '../../lib/appwrite';
import { Query } from 'appwrite';
import * as Haptics from 'expo-haptics';
import { Audio } from 'expo-av';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import styles from '../../constants/userapp/notification';

const DATABASE_ID = '681c428b00159abb5e8b';
const NOTIFICATIONS_COLLECTION = 'note_id';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});


const UserNotificationPage = () => {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [previousCount, setPreviousCount] = useState(0);
  const [userEmail, setUserEmail] = useState('');
  const soundRef = useRef<Audio.Sound | null>(null);
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);

  // Load local sound
  useEffect(() => {
    const loadSound = async () => {
      const { sound } = await Audio.Sound.createAsync(
        require('../../assets/sounds/notification.mp3')
      );
      soundRef.current = sound;
    };
    loadSound();
    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync();
      }
    };
  }, []);

  // Register for push notifications
  useEffect(() => {
    registerForPushNotificationsAsync().then(token => {
      if (token) {
        setExpoPushToken(token);
        console.log('Expo Push Token:', token);
        // You can save this token to your Appwrite user record if needed
      }
    });

    const subscription = Notifications.addNotificationReceivedListener(notification => {
      console.log('Notification received:', notification);
      playNotificationSound();
    });

    return () => {
      subscription.remove();
    };
  }, []);

  // Fetch Appwrite notifications
  const fetchNotifications = async (email: string) => {
    try {
      const res = await databases.listDocuments(DATABASE_ID, NOTIFICATIONS_COLLECTION, [
        Query.equal('userEmail', email),
        Query.orderDesc('createdAt'),
      ]);
      const newNotifications = res.documents.filter(doc => !doc.isRead);
      if (newNotifications.length > previousCount) {
        playNotificationSound();
      }
      setNotifications(newNotifications);
      setPreviousCount(newNotifications.length);
    } catch (error) {
      Alert.alert('Error', 'Failed to fetch notifications');
    } finally {
      setRefreshing(false);
    }
  };

  
  const playNotificationSound = async () => {
    try {
      if (soundRef.current) {
        await soundRef.current.replayAsync();
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.log('Error playing sound', error);
    }
  };

  // Mark a notification as read
  const markAsRead = async (id: string) => {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await databases.updateDocument(DATABASE_ID, NOTIFICATIONS_COLLECTION, id, {
        isRead: true,
      });
      fetchNotifications(userEmail);
    } catch (error) {
      Alert.alert('Error', 'Failed to mark as read');
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    if (userEmail) {
      fetchNotifications(userEmail);
    }
  };

  useEffect(() => {
    const getUserAndFetch = async () => {
      try {
        const user = await account.get();
        setUserEmail(user.email);
        fetchNotifications(user.email);
      } catch (err) {
        Alert.alert('Error', 'Failed to get user data');
      }
    };
    getUserAndFetch();
  }, []);

  const deleteAllNotifications = async () => {
    Alert.alert('Delete All Notifications', 'Are you sure you want to delete all unread notifications?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            const deletePromises = notifications.map(notification =>
              databases.deleteDocument(DATABASE_ID, NOTIFICATIONS_COLLECTION, notification.$id)
            );
            await Promise.all(deletePromises);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            fetchNotifications(userEmail);
          } catch (error) {
            Alert.alert('Error', 'Failed to delete notifications');
          }
        },
      },
    ]);
  };

  const renderItem = ({ item }: { item: any }) => (
    <View style={styles.notificationCard}>
      <View style={styles.notificationHeader}>
        <Ionicons name="notifications" size={20} color="#5E72E4" />
      </View>
      <Text style={styles.description}>{item.description}</Text>
      <View style={styles.footer}>
        <Text style={styles.time}>{new Date(item.$createdAt).toLocaleString()}</Text>
        <TouchableOpacity onPress={() => markAsRead(item.$id)} style={styles.dismissButton}>
          <Text style={styles.close}>Dismiss</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.push('/userapp/home')}>
          <MaterialIcons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        {notifications.length > 0 ? (
          <TouchableOpacity onPress={deleteAllNotifications}>
            <MaterialIcons name="delete" size={24} color="#fff" />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 24 }} />
        )}
      </View>
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#5E72E4" />
        }
      >
        {notifications.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="notifications-off" size={48} color="#ccc" />
            <Text style={styles.noNotificationText}>No new notifications</Text>
          </View>
        ) : (
          <FlatList
            scrollEnabled={false}
            data={notifications}
            keyExtractor={item => item.$id}
            renderItem={renderItem}
            contentContainerStyle={styles.listContainer}
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default UserNotificationPage;

// Helper function
async function registerForPushNotificationsAsync() {
  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') {
      Alert.alert('Permission required', 'Enable notifications in settings.');
      return null;
    }
    const token = await Notifications.getExpoPushTokenAsync();
    return token.data;
  } else {
    Alert.alert('Device error', 'Must use physical device for push notifications.');
    return null;
  }
}
