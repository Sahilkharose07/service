import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Alert, SafeAreaView, ScrollView, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons, MaterialIcons, Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { account, databases } from '../../lib/appwrite';
import { Query } from 'appwrite';
import { styles } from '../../constants/userapp/ProfileScreen.styles';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const DATABASE_ID = '681c428b00159abb5e8b';
const COLLECTION_ID = '681c429800281e8a99bd';

const ProfileScreen = () => {
    const [user, setUser] = useState({
        name: '',
        email: '',
        phone: '',
        address: '',
        aadharNo: '',
        panNo: '',
        city: '',
    });
    const [loading, setLoading] = useState(true);
    const insets = useSafeAreaInsets();

    useEffect(() => {
        const fetchUserData = async () => {
            try {
                const currentUser = await account.get();
                const userEmail = currentUser.email;
                const response = await databases.listDocuments(
                    DATABASE_ID,
                    COLLECTION_ID,
                    [Query.equal('email', userEmail)]
                );
                if (response.documents.length > 0) {
                    const userData = response.documents[0];
                    setUser({
                        name: userData.name || '',
                        email: userData.email || userEmail,
                        phone: userData.contactNo || '',
                        address: userData.address || '',
                        aadharNo: userData.aadharNo || '',
                        panNo: userData.panNo || '',
                        city: userData.city || '',
                    });
                }
                setLoading(false);
            } catch (error) {
                console.error('Error fetching user data:', error);
                Alert.alert('Error', 'Failed to load user data');
                setLoading(false);
            }
        };
        fetchUserData();
    }, []);

    const handleLogout = async () => {
        try {
            await account.deleteSession('current');
            Alert.alert('Logged out');
            router.replace('/');
        } catch (error) {
            console.error('Logout Error:', error);
            Alert.alert('Error', (error as Error).message || 'Something went wrong');
        }
    };
    if (loading) {
        return (
            <SafeAreaView style={styles.safeArea}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#5E72E4" />
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.header}>
                <View style={styles.headerLeft}>
                    <TouchableOpacity onPress={() => router.back()}>
                        <Feather name="arrow-left" size={24} color="#FFF" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Engineer Profile</Text>
                </View>
            </View>

            <ScrollView contentContainerStyle={[styles.scrollContainer, { paddingBottom: 150 }]} >
                <View style={styles.profileImageContainer}>
                    <MaterialCommunityIcons
                        name="account-circle"
                        size={120}
                        color="#5E72E4"
                    />
                </View>
                <View style={styles.profileInfoContainer}>
                    <View style={styles.infoCard}>
                        <Text style={styles.name}>{user.name}</Text>
                        <Text style={styles.email}>{user.email}</Text>
                        <View style={styles.infoSection}>
                            <Text style={styles.sectionTitle}>Contact Information</Text>
                            <View style={styles.infoItem}>
                                <MaterialIcons name="phone" size={20} color="#5E72E4" />
                                <Text style={styles.infoText}>Contact Number : {user.phone || 'Not provided'}</Text>
                            </View>
                            <View style={styles.infoItem}>
                                <MaterialIcons name="location-on" size={20} color="#5E72E4" />
                                <Text style={styles.infoText}>Address : {user.address || 'Not provided'}</Text>
                            </View>
                            <View style={styles.infoItem}>
                                <MaterialIcons name="location-city" size={20} color="#5E72E4" />
                                <Text style={styles.infoText}>City : {user.city || 'Not provided'}</Text>
                            </View>
                        </View>
                        <View style={styles.infoSection}>
                            <Text style={styles.sectionTitle}>Document Information</Text>
                            <View style={styles.infoItem}>
                                <MaterialCommunityIcons name="card-account-details" size={20} color="#5E72E4" />
                                <Text style={styles.infoText}>Aadhar No : {user.aadharNo || 'Not provided'}</Text>
                            </View>
                            <View style={styles.infoItem}>
                                <MaterialCommunityIcons name="card-account-details-outline" size={20} color="#5E72E4" />
                                <Text style={styles.infoText}>Pan No : {user.panNo || 'Not provided'}</Text>
                            </View>
                        </View>
                        <TouchableOpacity
                            style={styles.logoutButton}
                            onPress={handleLogout}
                        >
                            <Feather name="log-out" size={20} color="#FFF" />
                            <Text style={styles.logoutButtonText}>Logout</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </ScrollView>

            <View style={[styles.bottomBar, { paddingBottom: insets.bottom || 40 }]}>
                <TouchableOpacity
                    style={[styles.bottomButton, styles.bottomButtonActive]}
                >
                    <View style={[styles.bottomButtonIcon, styles.bottomButtonIconActive]}>
                        <Feather name="user" size={20} color="#FFF" />
                    </View>
                    <Text style={[styles.bottomButtonText, styles.bottomButtonTextActive]}>Profile</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.bottomButton]}
                    onPress={() => router.push('/userapp/home')}
                >
                    <View style={[styles.bottomButtonIcon]}>
                        <Feather name="home" size={20} color="#5E72E4" />
                    </View>
                    <Text style={styles.bottomButtonText}>Home</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={styles.bottomButton}
                    onPress={() => router.push('/userapp/userbill')}
                >
                    <View style={styles.bottomButtonIcon}>
                        <Feather name="file-text" size={20} color="#5E72E4" />
                    </View>
                    <Text style={styles.bottomButtonText}>Bills</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
};

export default ProfileScreen;