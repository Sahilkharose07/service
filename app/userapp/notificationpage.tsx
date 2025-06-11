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
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);

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
  const registerForPushNotificationsAsync = async (): Promise<string | null> => {
    try {
      if (!Device.isDevice) {
        Alert.alert('Push notifications only work on physical devices.');
        return null;
      }

      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        Alert.alert('Permission for push notifications not granted');
        return null;
      }

      const tokenData = await Notifications.getExpoPushTokenAsync();
      return tokenData.data;
    } catch (error) {
      console.error('Push token registration failed:', error);
      return null;
    }
  };

  // Save token to Appwrite
  const savePushToken = async (email: string, token: string) => {
    try {
      const existing = await databases.listDocuments(DATABASE_ID, NOTIFICATIONS_COLLECTION, [
        Query.equal('userEmail', email),
        Query.equal('expoPushToken', token),
        Query.equal('isDeviceToken', true),
      ]);

      if (existing.documents.length === 0) {
        await databases.createDocument(DATABASE_ID, NOTIFICATIONS_COLLECTION, 'unique()', {
          userEmail: email,
          expoPushToken: token,
          isDeviceToken: true,
          description: 'Device token',
          isRead: true,
        });
        console.log('Token saved in Appwrite');
      }
    } catch (error) {
      console.error('Failed to save token:', error);
    }
  };

  // Init on mount
  useEffect(() => {
    const initialize = async () => {
      try {
        const token = await registerForPushNotificationsAsync();
        if (!token) return;
        setExpoPushToken(token);

        const user = await account.get();
        setUserEmail(user.email);
        await savePushToken(user.email, token);
        await fetchNotifications(user.email);
      } catch (error) {
        Alert.alert('Init error', 'Could not initialize notifications.');
      }
    };

    initialize();

    const subscription = Notifications.addNotificationReceivedListener(notification => {
      console.log('Notification received:', notification);
      playNotificationSound();
    });

    return () => subscription.remove();
  }, []);

  const playNotificationSound = async () => {
    try {
      if (soundRef.current) await soundRef.current.replayAsync();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err) {
      console.error('Sound error:', err);
    }
  };

  const fetchNotifications = async (email: string) => {
    try {
      const res = await databases.listDocuments(DATABASE_ID, NOTIFICATIONS_COLLECTION, [
        Query.equal('userEmail', email),
        Query.equal('isDeviceToken', false),
        Query.orderDesc('$createdAt'),
      ]);
      const newItems = res.documents.filter(doc => !doc.isRead);
      if (newItems.length > previousCount) playNotificationSound();
      setNotifications(newItems);
      setPreviousCount(newItems.length);
    } catch {
      Alert.alert('Error', 'Could not load notifications');
    } finally {
      setRefreshing(false);
    }
  };

  const markAsRead = async (id: string) => {
    try {
      await databases.updateDocument(DATABASE_ID, NOTIFICATIONS_COLLECTION, id, {
        isRead: true,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      fetchNotifications(userEmail);
    } catch {
      Alert.alert('Error', 'Could not mark notification as read');
    }
  };

  const deleteAllNotifications = async () => {
    Alert.alert('Confirm Delete', 'Delete all unread notifications?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            const deletions = notifications.map(n =>
              databases.deleteDocument(DATABASE_ID, NOTIFICATIONS_COLLECTION, n.$id)
            );
            await Promise.all(deletions);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            fetchNotifications(userEmail);
          } catch {
            Alert.alert('Error', 'Failed to delete notifications');
          }
        },
      },
    ]);
  };

  const onRefresh = () => {
    setRefreshing(true);
    if (userEmail) fetchNotifications(userEmail);
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
