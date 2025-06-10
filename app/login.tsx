import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState, useEffect } from 'react';
import { ActivityIndicator, Alert, Image, KeyboardAvoidingView, Modal, Platform, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Query } from 'appwrite';
import { account, databases } from '../lib/appwrite';
import { styles } from '../constants/LoginScreen.styles';
import { Linking } from 'react-native';
import { useLocalSearchParams } from 'expo-router';

const DATABASE_ID = '681c428b00159abb5e8b';
const COLLECTION_ID = '681c429800281e8a99bd';

const LoginScreen = () => {
    const params = useLocalSearchParams();
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [username, setUsername] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [forgotModalVisible, setForgotModalVisible] = useState(false);
    const [resetModalVisible, setResetModalVisible] = useState(false);
    const [forgotEmail, setForgotEmail] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [resetConfirmPassword, setResetConfirmPassword] = useState('');
    const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;
    const passwordRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    const [resetUserId, setResetUserId] = useState('');
    const [resetSecret, setResetSecret] = useState('');
    const [resetSuccess, setResetSuccess] = useState(false);
    const [isCheckingSession, setIsCheckingSession] = useState(true);

    const resetFields = () => {
        setEmail('');
        setPassword('');
        setConfirmPassword('');
        setUsername('');
        setForgotEmail('');
        setNewPassword('');
        setResetConfirmPassword('');
    };

    useEffect(() => {
        const checkSession = async () => {
            try {
                const user = await account.get();
                if (user) {
                    router.replace(user.labels?.includes('admin') ? '/home' : '/userapp/home');
                }
            } finally {
                setIsCheckingSession(false);
            }
        };
        checkSession();
    }, []);

    useEffect(() => {
        if (params?.resetPassword === 'true' && params.userId && params.secret) {
            setResetModalVisible(true);
            setResetUserId(params.userId as string);
            setResetSecret(params.secret as string);
        }
    }, [params]);

    useEffect(() => {
        const handleDeepLink = (event: { url: string }) => {
            const url = event.url;
            console.log('Deep link URL:', url);
            if (url.includes('cloud.appwrite.io/v1/recovery')) {
                const params = new URLSearchParams(url.split('?')[1]);
                if (params.get('package') === 'com.markwatson.service_vale') {
                    const userId = params.get('userId');
                    const secret = params.get('secret');
                    if (userId && secret) {
                        router.navigate({
                            pathname: '/reset-password',
                            params: { userId, secret }
                        });
                    }
                }
            }
        };
        const subscription = Linking.addEventListener('url', handleDeepLink);
        Linking.getInitialURL().then(url => {
            if (url) handleDeepLink({ url });
        });
        return () => subscription.remove();
    }, []);

    if (isCheckingSession) {
        return (
            <View style={{ flex: 1, justifyContent: 'center' }}>
                <ActivityIndicator size="large" />
            </View>
        );
    }

    const handleLogin = async () => {
        if (email === '' || password === '') {
            Alert.alert('Error', 'Please fill in all fields');
        } else if (!emailRegex.test(email)) {
            Alert.alert('Error', 'Please enter a valid email');
        } else if (!passwordRegex.test(password)) {
            Alert.alert('Error', 'Password must contain an uppercase letter, number, and special character');
        } else {
            try {
                await account.createEmailPasswordSession(email, password);
                const user = await account.get();
                const isAdmin = user.labels?.includes('admin');
                Alert.alert('Success', `Welcome`);
                resetFields();
                if (isAdmin) {
                    router.replace('/home');
                } else {
                    router.replace('/userapp/home');
                }
            } catch (error: any) {
                Alert.alert('Login Error', error?.message || 'An unknown error occurred');
            }
        }
    };

    const handleRegister = async () => {
        if (!username || !email || !password || !confirmPassword) {
            Alert.alert('Error', 'Please fill in all fields');
        } else if (!emailRegex.test(email)) {
            Alert.alert('Error', 'Please enter a valid email');
        } else if (!passwordRegex.test(password)) {
            Alert.alert('Error', 'Password must contain an uppercase letter, number, and special character');
        } else if (password !== confirmPassword) {
            Alert.alert('Error', 'Passwords do not match');
        } else {
            try {
                await account.create('unique()', email, password, username);
                Alert.alert('Success', 'Account created successfully. Please log in.');
                resetFields();
                setIsLogin(true);
                const response = await databases.listDocuments(
                    DATABASE_ID,
                    COLLECTION_ID,
                    [Query.equal('email', email)]
                );
                if (response.documents.length === 0) {
                    await account.deleteSession('current');
                    Alert.alert('Access Denied', 'You are not authorized to access this system');
                    return;
                }
            } catch (error) {
                Alert.alert('Registration Error', error instanceof Error ? error.message : 'An unknown error occurred');
            }
        }
    };

    const handleForgotPassword = () => {
        setForgotModalVisible(true);
    };

    const handleSendOTP = async () => {
        try {
            const resetUrl = `https://cloud.appwrite.io/v1/recovery?package=com.markwatson.service_vale`;

            await account.createRecovery(forgotEmail, resetUrl);
            Alert.alert('Email Sent', 'Check your email for reset instructions');
            setForgotEmail('');
            setForgotModalVisible(false);
        } catch (error: any) {
            console.error('Recovery Error:', error);
            Alert.alert('Error', error?.message || 'Failed to send recovery email');
        }
    };

    const handleResetPassword = async () => {
        if (!newPassword || !resetConfirmPassword) {
            Alert.alert('Error', 'Please fill in all fields');
            return;
        }
        if (newPassword !== resetConfirmPassword) {
            Alert.alert('Error', 'Passwords do not match');
            return;
        }
        if (!passwordRegex.test(newPassword)) {
            Alert.alert('Error', 'Password must contain an uppercase letter, number, and special character');
            return;
        }
        try {
            if (!resetUserId || !resetSecret) {
                throw new Error('Invalid reset credentials');
            }
            await account.updateRecovery(resetUserId, resetSecret, newPassword);
            Alert.alert(
                'Success',
                'Your password has been reset successfully',
                [
                    {
                        text: 'OK',
                        onPress: () => {
                            resetFields();
                            setResetUserId('');
                            setResetSecret('');
                            setResetModalVisible(false);
                            setResetSuccess(true);
                        }
                    }
                ]
            );
        } catch (error: any) {
            console.error('Password Reset Error:', error);
            Alert.alert('Error', error?.message || 'Failed to reset password');
        }
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ flex: 1 }}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 0}
        >
            <ScrollView
                contentContainerStyle={[styles.container]}
                keyboardShouldPersistTaps="handled"
                automaticallyAdjustContentInsets={true}
            >
                <View style={styles.brandContainer}>
                    <Image
                        source={require('../assets/images/logo.jpg')}
                        style={styles.logo}
                        resizeMode="contain"
                    />
                </View>

                <Modal transparent animationType="fade" visible={forgotModalVisible}>
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalCard}>
                            <Text style={styles.modalTitle}>Forgot Password</Text>
                            <Text style={styles.modalSubtitle}>Enter your email to receive a recovery link</Text>
                            <TextInput
                                style={styles.modalInput}
                                placeholder="Enter your email"
                                placeholderTextColor="#999"
                                value={forgotEmail}
                                onChangeText={setForgotEmail}
                                keyboardType="email-address"
                                autoCapitalize="none"
                            />
                            <View style={styles.modalButtonGroup}>
                                <TouchableOpacity
                                    style={[styles.modalButton, styles.secondaryButton]}
                                    onPress={() => setForgotModalVisible(false)}
                                >
                                    <Text style={styles.secondaryButtonText}>Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.modalButton, styles.primaryButton]}
                                    onPress={handleSendOTP}
                                >
                                    <Text style={styles.primaryButtonText}>Send OTP</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </Modal>

                <Modal transparent animationType="fade" visible={resetModalVisible}>
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalCard}>
                            <Text style={styles.modalTitle}>Reset Password</Text>
                            <View style={styles.passwordInputContainer}>
                                <TextInput
                                    style={styles.modalInput}
                                    placeholder="New Password"
                                    placeholderTextColor="#999"
                                    value={newPassword}
                                    onChangeText={setNewPassword}
                                    secureTextEntry={!showNewPassword}
                                />
                                <TouchableOpacity
                                    style={styles.eyeIcon}
                                    onPress={() => setShowNewPassword(!showNewPassword)}
                                >
                                    <Ionicons
                                        name={showNewPassword ? 'eye' : 'eye-off'}
                                        size={20}
                                        color="#888"
                                    />
                                </TouchableOpacity>
                            </View>
                            <TextInput
                                style={styles.modalInput}
                                placeholder="Confirm Password"
                                placeholderTextColor="#999"
                                value={resetConfirmPassword}
                                onChangeText={setResetConfirmPassword}
                                secureTextEntry={true}
                            />
                            <View style={styles.modalButtonGroup}>
                                <TouchableOpacity
                                    style={[styles.modalButton, styles.secondaryButton]}
                                    onPress={() => setResetModalVisible(false)}
                                >
                                    <Text style={styles.secondaryButtonText}>Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.modalButton, styles.primaryButton]}
                                    onPress={handleResetPassword}
                                >
                                    <Text style={styles.primaryButtonText}>Update Password</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </Modal>

                <View style={styles.authCard}>
                    <Text style={styles.authTitle}>
                        {isLogin ? 'Sign In as an admin or engineer' : 'Create Account'}
                    </Text>
                    {!isLogin && (
                        <View style={styles.inputContainer}>
                            <Text style={styles.inputLabel}>Username</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Enter your username"
                                placeholderTextColor="#999"
                                value={username}
                                onChangeText={setUsername}
                            />
                        </View>
                    )}

                    <View style={styles.inputContainer}>
                        <Text style={styles.inputLabel}>Email Address</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Enter your email"
                            placeholderTextColor="#999"
                            value={email}
                            onChangeText={setEmail}
                            keyboardType="email-address"
                            autoCapitalize="none"
                        />
                    </View>

                    <View style={styles.inputContainer}>
                        <Text style={styles.inputLabel}>Password</Text>
                        <View style={styles.passwordInputContainer}>
                            <TextInput
                                style={styles.passwordInput}
                                placeholder="Enter your password"
                                placeholderTextColor="#999"
                                value={password}
                                onChangeText={setPassword}
                                secureTextEntry={!showPassword}
                            />
                            <TouchableOpacity
                                style={styles.eyeIcon}
                                onPress={() => setShowPassword(!showPassword)}
                            >
                                <Ionicons
                                    name={showPassword ? 'eye' : 'eye-off'}
                                    size={20}
                                    color="#888"
                                />
                            </TouchableOpacity>
                        </View>
                    </View>

                    {!isLogin && (
                        <View style={styles.inputContainer}>
                            <Text style={styles.inputLabel}>Confirm Password</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Confirm your password"
                                placeholderTextColor="#999"
                                value={confirmPassword}
                                onChangeText={setConfirmPassword}
                                secureTextEntry={true}
                            />
                        </View>
                    )}

                    {isLogin && (
                        <TouchableOpacity
                            style={styles.forgotPasswordButton}
                            onPress={handleForgotPassword}
                        >
                            <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
                        </TouchableOpacity>
                    )}

                    <TouchableOpacity
                        style={styles.authButton}
                        onPress={isLogin ? handleLogin : handleRegister}
                    >
                        <Text style={styles.authButtonText}>
                            {isLogin ? 'Sign In' : 'Sign Up'}
                        </Text>
                    </TouchableOpacity>

                    <View style={styles.authFooter}>
                        <Text style={styles.authFooterText}>
                            {isLogin ? "Don't have an account?" : "Already have an account?"}
                        </Text>
                        <TouchableOpacity
                            onPress={() => {
                                setIsLogin(!isLogin);
                                resetFields();
                            }}
                        >
                            <Text style={styles.authFooterLink}>
                                {isLogin ? 'Sign Up' : 'Sign In'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
};

export default LoginScreen;