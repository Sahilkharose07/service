import React, { useState, useEffect } from 'react';
import { View, Text, Image, TouchableOpacity, ScrollView, Alert, ActivityIndicator, Modal, Pressable, Dimensions, SafeAreaView, RefreshControl, TextInput } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import { databases, storage, account } from '../../lib/appwrite';
import { ID, Query } from 'appwrite';
import { useRouter, useLocalSearchParams } from 'expo-router';
import mime from 'mime';
import { Ionicons, MaterialIcons, Feather } from '@expo/vector-icons';
import { styles } from '../../constants/userapp/Userphoto';

const DATABASE_ID = '681c428b00159abb5e8b';
const COLLECTION_ID = 'photo_id';
const NOTIFICATIONS_COLLECTION = 'admin_id';
const BUCKET_ID = 'photo_id';
const { width } = Dimensions.get('window');
const STORAGE_BASE_URL = 'https://fra.cloud.appwrite.io/v1/storage/buckets/photo_id/files';
const PROJECT_ID = '681b300f0018fdc27bdd';

const buildImageUrl = (fileId: string) =>
    `${STORAGE_BASE_URL}/${fileId}/view?project=${PROJECT_ID}&mode=admin`;

type ImagePickerResult = {
    uri: string;
    fileName?: string;
    fileSize?: number;
    type?: string;
};

type PhotoSet = {
    $id: string;
    beforeImageUrl: string;
    afterImageUrl: string;
    notes?: string;
    date: string;
    userEmail: string;
};

const PhotoComparisonPage = () => {
    const [beforeImage, setBeforeImage] = useState<ImagePickerResult | null>(null);
    const [afterImage, setAfterImage] = useState<ImagePickerResult | null>(null);
    const { notes: initialNotes } = useLocalSearchParams();
    const [notes, setNotes] = useState(Array.isArray(initialNotes) ? initialNotes.join('\n') : initialNotes || '');
    const [photoSets, setPhotoSets] = useState<PhotoSet[]>([]);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [previewVisible, setPreviewVisible] = useState(false);
    const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
    const [userEmail, setUserEmail] = useState('');
    const [userName, setUserName] = useState('');
    const [refreshing, setRefreshing] = useState(false);
    const router = useRouter();

    const parseNotes = (notes: string) => {
        if (!notes) return { userName: '', userNotes: '' };
        const [userName, ...rest] = notes.split('\n');
        return {
            userName: userName?.trim() || '',
            userNotes: rest.join('\n').trim(),
        };
    };

    useEffect(() => {
        const checkAuth = async () => {
            setIsLoading(true);
            try {
                const user = await account.get();
                setIsAuthenticated(!!user?.$id);
                setUserEmail(user.email);
                setUserName(user.name);
                if (!notes.startsWith(user.name)) {
                    setNotes(`${user.name}\n${notes}`);
                }
            } catch (error) {
                setIsAuthenticated(false);
            } finally {
                setIsLoading(false);
            }
        };
        checkAuth();
    }, []);

    useEffect(() => {
        if (isAuthenticated) fetchPhotoSets();
    }, [isAuthenticated]);

    const fetchPhotoSets = async () => {
        setIsLoading(true);
        try {
            const response = await databases.listDocuments(DATABASE_ID, COLLECTION_ID, [
                Query.equal('userEmail', userEmail),
                Query.orderDesc('date'),
                Query.limit(20),
            ]);
            const safeDocs: PhotoSet[] = response.documents.map((doc: any) => ({
                $id: doc.$id,
                beforeImageUrl: doc.beforeImageUrl,
                afterImageUrl: doc.afterImageUrl,
                notes: doc.notes,
                date: doc.date,
                userEmail: doc.userEmail,
            }));
            setPhotoSets(safeDocs);
        } catch (error) {
            Alert.alert('Error', 'Failed to load photos.');
        } finally {
            setIsLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        fetchPhotoSets();
    };

    const takePhoto = async (setImage: (image: ImagePickerResult | null) => void) => {
        if (!isAuthenticated) {
            Alert.alert('Login Required', 'Please log in to upload photos');
            router.push('/login');
            return;
        }
        const cameraPermission = await ImagePicker.requestCameraPermissionsAsync();
        if (!cameraPermission.granted) {
            Alert.alert('Permission Denied', 'Camera access is required');
            return;
        }
        const result = await ImagePicker.launchCameraAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            quality: 0.8,
            allowsEditing: false,
            aspect: [4, 3],
        });
        if (!result.canceled && result.assets.length > 0) {
            const asset = result.assets[0];
            setImage({
                uri: asset.uri,
                fileName: asset.fileName ?? `photo_${Date.now()}.jpg`,
                fileSize: asset.fileSize ?? 0,
                type: asset.type ?? 'image/jpeg',
            });
        }
    };

    const uploadImageToStorage = async (image: ImagePickerResult): Promise<string> => {
        try {
            const uri = image.uri;
            const name = image.fileName ?? `photo_${Date.now()}.jpg`;
            const type = mime.getType(uri) || 'image/jpeg';
            const file = {
                uri,
                name,
                type,
                size: image.fileSize ?? 0,
            };
            const uploadedFile = await storage.createFile(
                BUCKET_ID,
                ID.unique(),
                file
            );
            if (!uploadedFile || !uploadedFile.$id) {
                throw new Error('File upload returned an invalid response');
            }
            return uploadedFile.$id;
        } catch (error) {
            throw new Error('Failed to upload image. Check Appwrite settings.');
        }
    };

    const createNotification = async (description: string, relatedDocumentId: string) => {
        const notifId = ID.unique();

        try {
            await databases.createDocument(DATABASE_ID, NOTIFICATIONS_COLLECTION, notifId, {
                description,
                IsRead: false,
                createAt: new Date().toISOString(),
                userEmail,
            });
            console.log('Notification created successfully:', notifId);
        } catch (error: any) {
            console.error('Failed to create notification:', {
                message: error.message,
                code: error.code,
                type: error.type,
                response: error.response
            });
        }
    };

    const handleSubmit = async () => {
        if (!isAuthenticated) {
            Alert.alert('Login Required', 'Please log in first.');
            router.push('/login');
            return;
        }
        if (!beforeImage && !afterImage) {
            Alert.alert('Missing Image', 'Take at least one photo.');
            return;
        }
        setIsUploading(true);
        try {
            const notesWithName = userName ? `${userName}\n${notes}` : notes;
            const { userName: parsedUserName, userNotes } = parseNotes(notesWithName);
            if (beforeImage && !afterImage) {
                const beforeFileId = await uploadImageToStorage(beforeImage);
                const docId = ID.unique();
                await databases.createDocument(DATABASE_ID, COLLECTION_ID, docId, {
                    beforeImageUrl: beforeFileId,
                    afterImageUrl: '',
                    notes: notesWithName,
                    date: new Date().toISOString(),
                    userEmail: userEmail,
                });
            } else if (afterImage && !beforeImage) {
                const afterFileId = await uploadImageToStorage(afterImage);
                const latest = await databases.listDocuments(DATABASE_ID, COLLECTION_ID, [
                    Query.orderDesc('date'),
                    Query.equal('afterImageUrl', ''),
                    Query.equal('userEmail', userEmail),
                    Query.limit(1),
                ]);
                if (latest.documents.length === 0) {
                    throw new Error('No matching before image found');
                }
                const docId = latest.documents[0].$id;
                await databases.updateDocument(DATABASE_ID, COLLECTION_ID, docId, {
                    afterImageUrl: afterFileId,
                    notes: notesWithName,
                    userEmail: userEmail,
                });
                await createNotification(
                    `\Photo Notification\n ${userNotes || 'No notes provided'}`,
                    docId
                );
            } else {
                const [beforeFileId, afterFileId] = await Promise.all([
                    uploadImageToStorage(beforeImage!),
                    uploadImageToStorage(afterImage!),
                ]);
                const docId = ID.unique();
                await databases.createDocument(DATABASE_ID, COLLECTION_ID, docId, {
                    beforeImageUrl: beforeFileId,
                    afterImageUrl: afterFileId,
                    notes: notesWithName,
                    date: new Date().toISOString(),
                    userEmail: userEmail,
                });
                await createNotification(
                    `\nNotes:\n ${userNotes || 'No notes provided'}`,
                    docId
                );
            }

            Alert.alert('Success', 'Photo saved.');
            setBeforeImage(null);
            setAfterImage(null);
            setNotes(userName ? `${userName}\n` : '');
            fetchPhotoSets();
        } catch (error) {
            Alert.alert('Error', error instanceof Error ? error.message : 'Upload failed');
        } finally {
            setIsUploading(false);
        }
    };

    const openPreview = (imageUrl: string) => {
        setPreviewImageUrl(imageUrl);
        setPreviewVisible(true);
    };

    const closePreview = () => {
        setPreviewVisible(false);
        setPreviewImageUrl(null);
    };

    const deletePhotoSet = async (photoSet: PhotoSet) => {
        setIsLoading(true);
        try {
            const deletePromises = [];
            if (photoSet.beforeImageUrl) {
                deletePromises.push(storage.deleteFile(BUCKET_ID, photoSet.beforeImageUrl));
            }
            if (photoSet.afterImageUrl) {
                deletePromises.push(storage.deleteFile(BUCKET_ID, photoSet.afterImageUrl));
            }
            await Promise.all(deletePromises);
            await databases.deleteDocument(DATABASE_ID, COLLECTION_ID, photoSet.$id);
            Alert.alert('Deleted', 'Photo set deleted successfully.');
            fetchPhotoSets();
        } catch (error) {
            Alert.alert('Error', 'Failed to delete photo set.');
        } finally {
            setIsLoading(false);
        }
    };

    const saveBothImages = async (item: PhotoSet) => {
        setIsLoading(true);
        try {
            const { status } = await MediaLibrary.requestPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert(
                    'Permission Needed',
                    'Allow access to save images to your gallery.',
                );
                setIsLoading(false);
                return;
            }
            const saveToGallery = async (fileId: string | undefined) => {
                if (!fileId) return null;
                try {
                    const uri = buildImageUrl(fileId);
                    const filename = `photo_${Date.now()}.jpg`;
                    const localPath = `${FileSystem.cacheDirectory}${filename}`;

                    await FileSystem.downloadAsync(uri, localPath);

                    const asset = await MediaLibrary.createAssetAsync(localPath);
                    return asset;
                } catch (error) {
                    console.error('Save failed:', error);
                    return null;
                }
            };
            await Promise.all([
                saveToGallery(item.beforeImageUrl),
                saveToGallery(item.afterImageUrl),
            ]);
            Alert.alert('Success', 'Images saved to your gallery!');
            fetchPhotoSets();
        } catch (error) {
            console.error('Operation failed:', error);
            Alert.alert('Error', 'Failed to save images. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading && !refreshing) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#5E72E4" />
            </View>
        );
    }

    if (!isAuthenticated) {
        return (
            <View style={styles.authContainer}>
                <Text style={styles.authText}>Please log in to access this feature</Text>
                <TouchableOpacity
                    style={styles.loginButton}
                    onPress={() => router.push('/login')}
                >
                    <Text style={styles.loginButtonText}>Go to Login</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <View style={styles.headerLeft}>
                    <TouchableOpacity onPress={() => router.back()}>
                        <Feather name="arrow-left" size={24} color="#FFF" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Click Photos</Text>
                </View>
            </View>

            <ScrollView
                contentContainerStyle={styles.scrollContainer}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        colors={['#5E72E4']}
                        tintColor={'#5E72E4'}
                    />
                }
                keyboardShouldPersistTaps="handled"
            >
                <View style={styles.section}>
                    <View style={styles.photoButtonsContainer}>
                        <TouchableOpacity
                            style={[styles.photoButton, beforeImage && styles.photoButtonActive]}
                            onPress={() => takePhoto(setBeforeImage)}
                        >
                            <MaterialIcons
                                name="photo-camera"
                                size={24}
                                color={beforeImage ? "#FFF" : "#5E72E4"}
                            />
                            <Text style={[styles.photoButtonText, beforeImage && styles.photoButtonTextActive]}>
                                Before
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.photoButton, afterImage && styles.photoButtonActive]}
                            onPress={() => takePhoto(setAfterImage)}
                        >
                            <MaterialIcons
                                name="photo-camera"
                                size={24}
                                color={afterImage ? "#FFF" : "#5E72E4"}
                            />
                            <Text style={[styles.photoButtonText, afterImage && styles.photoButtonTextActive]}>
                                After
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {beforeImage || afterImage ? (
                        <View style={styles.previewContainer}>
                            {beforeImage && (
                                <View style={styles.imagePreviewWrapper}>
                                    <Text style={styles.previewLabel}>Before</Text>
                                    <Image
                                        source={{ uri: beforeImage.uri }}
                                        style={styles.imagePreview}
                                    />
                                    <TouchableOpacity
                                        style={styles.clearButton}
                                        onPress={() => setBeforeImage(null)}
                                    >
                                        <Ionicons name="close" size={20} color="#FFF" />
                                    </TouchableOpacity>
                                </View>
                            )}
                            {afterImage && (
                                <View style={styles.imagePreviewWrapper}>
                                    <Text style={styles.previewLabel}>After</Text>
                                    <Image
                                        source={{ uri: afterImage.uri }}
                                        style={styles.imagePreview}
                                    />
                                    <TouchableOpacity
                                        style={styles.clearButton}
                                        onPress={() => setAfterImage(null)}
                                    >
                                        <Ionicons name="close" size={20} color="#FFF" />
                                    </TouchableOpacity>
                                </View>
                            )}
                        </View>
                    ) : (
                        <Text style={styles.instructionText}>
                            Take at least one photo to get started
                        </Text>
                    )}
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Photos Details</Text>
                    <TextInput
                        value={notes}
                        style={styles.notesInput}
                        multiline
                        editable={false}
                        selectTextOnFocus={false}
                        textAlignVertical="top"
                    />
                </View>

                <TouchableOpacity
                    style={[
                        styles.submitButton,
                        (isUploading || (!beforeImage && !afterImage)) && styles.submitButtonDisabled
                    ]}
                    onPress={handleSubmit}
                    disabled={isUploading || (!beforeImage && !afterImage)}
                >
                    {isUploading ? (
                        <ActivityIndicator color="#FFF" />
                    ) : (
                        <>
                            <MaterialIcons name="save" size={20} color="#FFF" />
                            <Text style={styles.submitButtonText}>Save Photo</Text>
                        </>
                    )}
                </TouchableOpacity>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Your History</Text>
                    {photoSets.length === 0 ? (
                        <View style={styles.emptyState}>
                            <MaterialIcons name="photo-library" size={48} color="#CBD5E0" />
                            <Text style={styles.emptyText}>No photos yet</Text>
                        </View>
                    ) : (
                        photoSets.map((item) => (
                            <View key={item.$id} style={styles.photoCard}>
                                <View style={styles.cardHeader}>
                                    <View style={styles.dateBadge}>
                                        <MaterialIcons name="date-range" size={16} color="#FFF" />
                                        <Text style={styles.dateText}>
                                            {new Date(item.date).toLocaleDateString('en-US', {
                                                year: 'numeric',
                                                month: 'short',
                                                day: 'numeric',
                                                hour: '2-digit',
                                                minute: '2-digit'
                                            })}
                                        </Text>
                                    </View>
                                </View>

                                <View style={styles.photoGrid}>
                                    <View style={styles.photoContainer}>
                                        <Text style={styles.photoLabel}>Before</Text>
                                        {item.beforeImageUrl ? (
                                            <TouchableOpacity
                                                onPress={() => openPreview(buildImageUrl(item.beforeImageUrl))}
                                                activeOpacity={0.8}
                                            >
                                                <Image
                                                    source={{ uri: buildImageUrl(item.beforeImageUrl) }}
                                                    style={styles.photoImage}
                                                />
                                            </TouchableOpacity>
                                        ) : (
                                            <View style={styles.placeholder}>
                                                <MaterialIcons name="image-not-supported" size={32} color="#A0AEC0" />
                                                <Text style={styles.placeholderText}>No image</Text>
                                            </View>
                                        )}
                                    </View>
                                    <View style={styles.photoContainer}>
                                        <Text style={styles.photoLabel}>After</Text>
                                        {item.afterImageUrl ? (
                                            <TouchableOpacity
                                                onPress={() => openPreview(buildImageUrl(item.afterImageUrl))}
                                                activeOpacity={0.8}
                                            >
                                                <Image
                                                    source={{ uri: buildImageUrl(item.afterImageUrl) }}
                                                    style={styles.photoImage}
                                                />
                                            </TouchableOpacity>
                                        ) : (
                                            <View style={styles.placeholder}>
                                                <MaterialIcons name="image-not-supported" size={32} color="#A0AEC0" />
                                                <Text style={styles.placeholderText}>No image</Text>
                                            </View>
                                        )}
                                    </View>
                                </View>

                                {item.notes && (
                                    <View style={styles.notesContainer}>
                                        <Text style={styles.notesText}>
                                            {parseNotes(item.notes).userNotes || 'No notes provided'}
                                        </Text>
                                    </View>
                                )}

                                <View style={styles.actionButtonsContainer}>
                                    <TouchableOpacity
                                        style={[styles.actionButton, styles.saveButton]}
                                        onPress={() => saveBothImages(item)}
                                        disabled={isLoading}
                                    >
                                        <MaterialIcons name="save-alt" size={20} color="#FFF" />
                                        <Text style={styles.actionButtonText}>Save to Gallery</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[styles.actionButton, styles.deleteButton]}
                                        onPress={() =>
                                            Alert.alert('Confirm Delete', 'Are you sure?', [
                                                { text: 'Cancel', style: 'cancel' },
                                                {
                                                    text: 'Delete',
                                                    style: 'destructive',
                                                    onPress: () => deletePhotoSet(item),
                                                },
                                            ])
                                        }
                                        disabled={isLoading}
                                    >
                                        <MaterialIcons name="delete" size={20} color="#FFF" />
                                        <Text style={styles.actionButtonText}>Delete</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        ))
                    )}
                </View>
            </ScrollView>

            <Modal visible={previewVisible} transparent animationType="fade">
                <Pressable style={styles.modalBackground} onPress={closePreview}>
                    {previewImageUrl && (
                        <Image
                            source={{ uri: previewImageUrl }}
                            style={styles.fullImage}
                            resizeMode="contain"
                        />
                    )}
                    <TouchableOpacity style={styles.closeButton} onPress={closePreview}>
                        <Ionicons name="close" size={28} color="#fff" />
                    </TouchableOpacity>
                </Pressable>
            </Modal>
        </SafeAreaView>
    );
};

export default PhotoComparisonPage;