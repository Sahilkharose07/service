import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert, Modal, SafeAreaView, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { MaterialIcons, Feather } from '@expo/vector-icons';
import { ID, Query } from 'appwrite';
import { account, databases } from '../lib/appwrite';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { styles } from '../constants/UserDetailsForm.styles';
import { footerStyles } from '../constants/footer';

const DATABASE_ID = '681c428b00159abb5e8b';
const COLLECTION_ID = '681c429800281e8a99bd';

type User = {
  $id?: string;
  name: string;
  address: string;
  contactNo: string;
  aadharNo: string;
  panNo: string;
  city: string;
  $createdAt?: string;
  email: string;
};

const fieldLabels = {
  name: 'Engineer Name',
  contactNo: 'Contact Number',
  email: 'Email Address',
  address: 'Address',
  panNo: 'PAN Number',
  aadharNo: 'Aadhar Number',
  city: 'City',
};

const UserDetailsForm = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    contactNo: '',
    email: '',
    aadharNo: '',
    panNo: '',
    city: '',
  });
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [submittedUsers, setSubmittedUsers] = useState<User[]>([]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isUserDetailVisible, setIsUserDetailVisible] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const user = await account.get();
      console.log('Authenticated as:', user.email);
      const response = await databases.listDocuments(
        DATABASE_ID,
        COLLECTION_ID,
        [Query.orderDesc('$createdAt')]
      );
      setSubmittedUsers(response.documents as unknown as User[]);
    } catch (error: unknown) {
      console.error('Error fetching engineers:', error);
      if (error instanceof Error && 'code' in error && error.code === 401) {
        Alert.alert(
          'Session Expired',
          'Please log in again',
          [{ text: 'OK', onPress: () => router.replace('/') }]
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

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

  const validateForm = () => {
    let valid = true;
    const newErrors: { [key: string]: string } = {};
    if (!formData.name.trim()) {
      newErrors.name = 'Engineer Name is required';
      valid = false;
    }
    if (!formData.address.trim()) {
      newErrors.address = 'Address is required';
      valid = false;
    }
    if (!formData.contactNo.trim()) {
      newErrors.contactNo = 'Contact number is required';
      valid = false;
    } else if (!/^[0-9]{10}$/.test(formData.contactNo)) {
      newErrors.contactNo = 'Invalid contact number (10 digits required)';
      valid = false;
    }
    if (!formData.email.trim()) {
      newErrors.email = 'Email Address is required';
      valid = false;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email address';
      valid = false;
    }
    if (!formData.aadharNo.trim()) {
      newErrors.aadharNo = 'Aadhar number is required';
      valid = false;
    } else if (!/^[0-9]{12}$/.test(formData.aadharNo)) {
      newErrors.aadharNo = 'Invalid Aadhar number (12 digits required)';
      valid = false;
    }
    if (!formData.panNo.trim()) {
      newErrors.panNo = 'PAN number is required';
      valid = false;
    } else if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(formData.panNo)) {
      newErrors.panNo = 'Invalid PAN number (format: ABCDE1234F)';
      valid = false;
    }
    if (!formData.city.trim()) {
      newErrors.city = 'City is required';
      valid = false;
    }
    setErrors(newErrors);
    return valid;
  };

  const cleanDocumentData = (doc: any) => {
    const { $id, $collectionId, $databaseId, $createdAt, $updatedAt, $permissions, ...cleanData } = doc;
    return cleanData;
  };

  const handleSubmit = async () => {
    if (validateForm()) {
      try {
        if (editingIndex !== null) {
          const userId = submittedUsers[editingIndex].$id;
          if (!userId) {
            throw new Error('User ID is missing for update.');
          }
          const updateData = {
            name: formData.name,
            address: formData.address,
            contactNo: formData.contactNo,
            email: formData.email,
            aadharNo: formData.aadharNo,
            panNo: formData.panNo,
            city: formData.city,
          };
          await databases.updateDocument(
            DATABASE_ID,
            COLLECTION_ID,
            userId as string,
            updateData
          );
          const updatedUsers = [...submittedUsers];
          updatedUsers[editingIndex] = {
            ...updatedUsers[editingIndex],
            ...updateData
          };
          setSubmittedUsers(updatedUsers);
          setEditingIndex(null);
        } else {
          const response = await databases.createDocument(
            DATABASE_ID,
            COLLECTION_ID,
            ID.unique(),
            formData
          );
          setSubmittedUsers(prevUsers => [response as unknown as User, ...prevUsers]);
        }
        Alert.alert('Success', 'Engineer details saved successfully!');
        resetForm();
        setIsFormVisible(false);
      } catch (error: unknown) {
        console.error('Error saving engineer:', error);
        Alert.alert(
          'Error',
          error instanceof Error ? error.message : 'Failed to save engineer details'
        );
      }
    }
  };

  const handleChange = (name: string, value: string) => {
    if (name === 'panNo') {
      value = value.toUpperCase();
    }
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleDeleteUser = async (index: number) => {
    Alert.alert(
      "Confirm Delete",
      "Are you sure you want to delete this engineer?",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Delete",
          onPress: async () => {
            try {
              const userId = submittedUsers[index].$id;
              if (!userId) {
                throw new Error('User ID is missing for deletion.');
              }
              await databases.deleteDocument(
                DATABASE_ID,
                COLLECTION_ID,
                userId
              );
              setSubmittedUsers(prevUsers =>
                prevUsers.filter(user => user.$id !== userId)
              );
              if (editingIndex === index) {
                setEditingIndex(null);
                resetForm();
              }
              Alert.alert('Success', 'Engineer deleted successfully');
            } catch (error) {
              console.error('Error deleting engineer:', error);
              Alert.alert('Error', (error as Error).message || 'Failed to delete engineer');
            }
          }
        }
      ]
    );
  };

  const resetForm = () => {
    setFormData({
      name: '',
      address: '',
      contactNo: '',
      email: '',
      aadharNo: '',
      panNo: '',
      city: '',
    });
    setErrors({});
  };

  const toggleFormVisibility = () => {
    setIsFormVisible(!isFormVisible);
    if (!isFormVisible) {
      resetForm();
      setEditingIndex(null);
    }
  };

  const showUserDetails = (user: User) => {
    setSelectedUser(user);
    setIsUserDetailVisible(true);
  };

  const closeUserDetails = () => {
    setIsUserDetailVisible(false);
    setSelectedUser(null);
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#5E72E4" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => router.push('/home')}>
            <Feather name="arrow-left" size={24} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Engineer Management</Text>
        </View>
        <View style={styles.headerCount}>
          <Text style={styles.headerCountText}>{submittedUsers.length}</Text>
        </View>
      </View>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={[styles.scrollContainer, { paddingBottom: insets.bottom + 120 }]} keyboardShouldPersistTaps="handled">
          {isFormVisible ? (
            <View style={styles.formContainer}>
              <Text style={styles.sectionTitle}>
                {editingIndex !== null ? 'Update Engineer' : 'Create Engineer'}
              </Text>

              {Object.entries(formData).map(([key, value]) => {
                const currentValue = value || '';
                const label = fieldLabels[key as keyof typeof fieldLabels] || key;
                return (
                  <View key={key} style={styles.formGroup}>
                    <Text style={styles.inputLabel}>{label}</Text>
                    <TextInput
                      placeholder={`Enter ${label.toLowerCase()}`}
                      style={[
                        styles.input,
                        key === 'address' && styles.textArea,
                        errors[key] && styles.inputError
                      ]}
                      value={currentValue}
                      onChangeText={(text) => handleChange(key, text)}
                      keyboardType={
                        key === 'contactNo' || key === 'aadharNo' ? 'numeric' :
                          key === 'email' ? 'email-address' : 'default'
                      }
                      multiline={key === 'address'}
                      numberOfLines={key === 'address' ? 3 : 1}
                      maxLength={
                        key === 'panNo' ? 10 :
                          key === 'aadharNo' ? 12 :
                            key === 'contactNo' ? 10 : undefined
                      }
                      autoCapitalize={key === 'panNo' ? 'characters' : 'words'}
                    />
                    {errors[key] && <Text style={styles.errorText}>{errors[key]}</Text>}
                  </View>
                );
              })}
              <View style={styles.buttonRow}>
                <TouchableOpacity
                  style={[styles.actionButton, styles.submitButton]}
                  onPress={handleSubmit}
                >
                  <Text style={styles.actionButtonText}>
                    {editingIndex !== null ? 'Update Engineer' : 'Create Engineer'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={styles.usersContainer}>
              {submittedUsers.length === 0 ? (
                <View style={styles.emptyState}>
                  <MaterialIcons name="engineering" size={48} color="#A0AEC0" />
                  <Text style={styles.emptyText}>No engineers added yet</Text>
                  <Text style={styles.emptySubtext}>Tap the + button to add a new engineer</Text>
                </View>
              ) : (
                submittedUsers.map((user, index) => (
                  <TouchableOpacity
                    key={user.$id}
                    style={styles.userCard}
                    onPress={() => showUserDetails(user)}
                  >
                    <View style={styles.userHeader}>
                      <View style={styles.userAvatar}>
                        <MaterialIcons name="engineering" size={24} color="#5E72E4" />
                      </View>
                      <View style={styles.userInfo}>
                        <Text style={styles.userName}>{user.name}</Text>
                        <Text style={styles.userContact}>{user.contactNo}</Text>
                      </View>
                    </View>
                    <View style={styles.userFooter}>
                      <Text style={styles.userEmail}>{user.email}</Text>
                      <Text style={styles.userDate}>
                        {new Date(user.$createdAt || '').toLocaleDateString()}
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
        visible={isUserDetailVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={closeUserDetails}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            {selectedUser && (
              <>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Engineer Details</Text>
                  <TouchableOpacity onPress={closeUserDetails}>
                    <Feather name="x" size={24} color="#718096" />
                  </TouchableOpacity>
                </View>
                <ScrollView style={styles.modalContent}>
                  <View style={styles.detailSection}>
                    <Text style={styles.detailSectionTitle}>Basic Information</Text>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Name :</Text>
                      <Text style={styles.detailValue}>{selectedUser.name}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Contact Number :</Text>
                      <Text style={styles.detailValue}>{selectedUser.contactNo}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Email Address :</Text>
                      <Text style={styles.detailValue}>{selectedUser.email}</Text>
                    </View>
                  </View>

                  <View style={styles.detailSection}>
                    <Text style={styles.detailSectionTitle}>Address Details</Text>
                    <View style={styles.detailRow1}>
                      <Text style={styles.detailLabel}>Address :</Text>
                      <Text style={styles.detailValue}>{selectedUser.address}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>City :</Text>
                      <Text style={styles.detailValue}>{selectedUser.city}</Text>
                    </View>
                  </View>

                  <View style={styles.detailSection}>
                    <Text style={styles.detailSectionTitle}>Document Details</Text>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Aadhar Number :</Text>
                      <Text style={styles.detailValue}>{selectedUser.aadharNo}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>PAN Number :</Text>
                      <Text style={styles.detailValue}>{selectedUser.panNo}</Text>
                    </View>
                  </View>

                  <View style={styles.detailSection}>
                    <Text style={styles.detailSectionTitle}>Additional Information</Text>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Engineer Joined Date :</Text>
                      <Text style={styles.detailValue}>
                        {selectedUser.$createdAt ? formatToAmPm(selectedUser.$createdAt) : 'N/A'}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.modalActions}>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.editButton]}
                      onPress={() => {
                        setFormData(cleanDocumentData(selectedUser));
                        const index = submittedUsers.findIndex(u => u.$id === selectedUser.$id);
                        if (index !== -1) {
                          setEditingIndex(index);
                        }
                        setIsFormVisible(true);
                        closeUserDetails();
                      }}
                    >
                      <Feather name="edit" size={18} color="#FFF" />
                      <Text style={styles.actionButtonText}>Update</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.deleteButton]}
                      onPress={() => {
                        handleDeleteUser(submittedUsers.findIndex(u => u.$id === selectedUser.$id));
                        closeUserDetails();
                      }}
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
          style={[footerStyles.bottomButton, footerStyles.bottomButtonActive]}
          onPress={() => router.push('/user')}
        >
          <View style={[footerStyles.bottomButtonIcon, footerStyles.bottomButtonIconActive]}>
            <MaterialIcons name="person" size={20} color="#FFF" />
          </View>
          <Text style={[footerStyles.bottomButtonText, footerStyles.bottomButtonTextActive]}>Users</Text>
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
          style={footerStyles.bottomButton}
          onPress={() => router.push('/bill')}
        >
          <View style={footerStyles.bottomButtonIcon}>
            <Feather name="file-text" size={20} color="#5E72E4" />
          </View>
          <Text style={footerStyles.bottomButtonText}>Bills</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

export default UserDetailsForm;