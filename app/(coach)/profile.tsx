import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';

import { MartialTheme } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';

export default function CoachProfileScreen() {
  const router = useRouter();
  const { profile, signOut, deleteAccount, isConfigured, updateProfile, updatePassword, updateEmail } = useAuth();

  // Avatar upload state
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Edit Profile Modal state
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editName, setEditName] = useState(profile?.display_name || '');
  const [editRank, setEditRank] = useState(profile?.rank_sash || '');
  const [editExp, setEditExp] = useState(profile?.experience_years ? String(profile.experience_years) : '');
  const [editBio, setEditBio] = useState(profile?.bio || '');
  const [savingProfile, setSavingProfile] = useState(false);

  // Password Modal state
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  // Email Modal state
  const [emailModalVisible, setEmailModalVisible] = useState(false);
  const [newEmail, setNewEmail] = useState(profile?.email || '');
  const [savingEmail, setSavingEmail] = useState(false);

  // Handle Avatar Selection & Upload
  const handlePickAvatar = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission Needed', 'Please allow gallery access to upload your profile photo.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
        base64: true,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        setUploadingAvatar(true);

        const avatarDataUri = asset.base64
          ? `data:image/jpeg;base64,${asset.base64}`
          : asset.uri;

        const { error } = await updateProfile({ avatar_url: avatarDataUri });
        setUploadingAvatar(false);

        if (error) {
          Alert.alert('Upload Failed', error.message || 'Could not update profile picture.');
        } else {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
      }
    } catch (err: any) {
      setUploadingAvatar(false);
      Alert.alert('Error', err?.message || 'Failed to select image.');
    }
  };

  // Open Edit Profile Modal
  const openEditProfile = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setEditName(profile?.display_name || '');
    setEditRank(profile?.rank_sash || 'Certified Master Instructor');
    setEditExp(profile?.experience_years ? String(profile.experience_years) : '');
    setEditBio(profile?.bio || '');
    setEditModalVisible(true);
  };

  // Save Profile Edits
  const handleSaveProfile = async () => {
    if (!editName.trim()) {
      Alert.alert('Required', 'Please enter your martial callsign or name.');
      return;
    }

    setSavingProfile(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const { error } = await updateProfile({
      display_name: editName.trim(),
      rank_sash: editRank.trim() || 'Certified Master Instructor',
      experience_years: editExp ? parseInt(editExp, 10) || 0 : 0,
      bio: editBio.trim(),
    });

    setSavingProfile(false);

    if (error) {
      Alert.alert('Update Failed', error.message);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setEditModalVisible(false);
    }
  };

  // Save Password Change
  const handleSavePassword = async () => {
    if (newPassword.length < 6) {
      Alert.alert('Invalid Password', 'New password must be at least 6 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Mismatch', 'Passwords do not match. Please re-check.');
      return;
    }

    setSavingPassword(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const { error } = await updatePassword(newPassword);
    setSavingPassword(false);

    if (error) {
      Alert.alert('Password Update Failed', error.message);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setPasswordModalVisible(false);
      setNewPassword('');
      setConfirmPassword('');
      Alert.alert('Success', 'Your coach account password has been updated.');
    }
  };

  // Save Email Change
  const handleSaveEmail = async () => {
    if (!newEmail.trim() || !newEmail.includes('@')) {
      Alert.alert('Invalid Email', 'Please enter a valid email address.');
      return;
    }

    setSavingEmail(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const { error } = await updateEmail(newEmail.trim());
    setSavingEmail(false);

    if (error) {
      Alert.alert('Email Update Failed', error.message);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setEmailModalVisible(false);
      Alert.alert('Success', 'Account email address has been updated.');
    }
  };

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to log out of your coach account?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            await signOut();
          },
        },
      ]
    );
  };

  // Delete Coach Account State & 2-Step Confirmation
  const [deletingAccount, setDeletingAccount] = useState(false);

  const handleDeleteAccount = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Alert.alert(
      'Delete Coach Account',
      'Are you sure you want to delete your coach account? This action is permanent and will remove all student mentorship connections, feedback, and academy credentials.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Continue',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Final Confirmation',
              'This cannot be undone. All your mentorship links, direct chats, and coach profiles will be permanently erased. Proceed with deleting your account?',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Permanently Delete',
                  style: 'destructive',
                  onPress: async () => {
                    try {
                      setDeletingAccount(true);
                      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                      const { error } = await deleteAccount();
                      if (error) {
                        Alert.alert('Notice', 'Account removed from device.');
                      }
                      router.replace('/(auth)/welcome' as any);
                    } catch (e: any) {
                      Alert.alert('Error', e?.message || 'Failed to delete coach account');
                    } finally {
                      setDeletingAccount(false);
                    }
                  },
                },
              ]
            );
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Guro Profile</Text>
        <Text style={styles.headerSubtitle}>Coach Account & Academy Credentials</Text>
      </View>

      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        {/* Profile Header Card */}
        <View style={styles.profileCard}>
          <TouchableOpacity
            style={styles.avatarContainer}
            onPress={handlePickAvatar}
            disabled={uploadingAvatar}
            activeOpacity={0.8}>
            {profile?.avatar_url ? (
              <Image source={{ uri: profile.avatar_url }} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatarLarge}>
                <MaterialCommunityIcons name="shield-account" size={44} color="#D97706" />
              </View>
            )}

            <View style={styles.avatarCameraBadge}>
              {uploadingAvatar ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Ionicons name="camera" size={14} color="#FFFFFF" />
              )}
            </View>
          </TouchableOpacity>

          <Text style={styles.coachName}>{profile?.display_name || 'Guro Instructor'}</Text>
          <View style={styles.sashBadge}>
            <Text style={styles.sashBadgeText}>
              {profile?.rank_sash || 'Certified Master Instructor'}
            </Text>
          </View>

          {profile?.experience_years ? (
            <View style={styles.expPill}>
              <Ionicons name="ribbon-outline" size={12} color="#B45309" />
              <Text style={styles.expPillText}>{profile.experience_years} Years Experience</Text>
            </View>
          ) : null}

          <Text style={styles.coachEmail}>{profile?.email || 'coach@arnis.ph'}</Text>

          {profile?.bio ? (
            <View style={styles.bioBox}>
              <Text style={styles.bioTitle}>INSTRUCTOR CREDENTIALS & BIO</Text>
              <Text style={styles.bioText}>{profile.bio}</Text>
            </View>
          ) : (
            <View style={styles.emptyBioBox}>
              <Text style={styles.emptyBioText}>No credentials or bio added yet.</Text>
            </View>
          )}

          {/* Edit Profile Button */}
          <TouchableOpacity
            style={styles.editProfileBtn}
            onPress={openEditProfile}
            activeOpacity={0.85}>
            <Ionicons name="create-outline" size={16} color="#FFFFFF" />
            <Text style={styles.editProfileBtnText}>Edit Credentials & Bio</Text>
          </TouchableOpacity>
        </View>

        {/* Account Settings & Security Section */}
        <View style={styles.cardSection}>
          <Text style={styles.sectionHeader}>ACCOUNT SETTINGS & SECURITY</Text>

          {/* Change Email */}
          <TouchableOpacity
            style={styles.settingItem}
            onPress={() => {
              setNewEmail(profile?.email || '');
              setEmailModalVisible(true);
            }}
            activeOpacity={0.7}>
            <View style={styles.settingIconBox}>
              <Ionicons name="mail-outline" size={18} color="#D97706" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.settingTitle}>Email Address</Text>
              <Text style={styles.settingSubtitle} numberOfLines={1}>
                {profile?.email || 'Tap to update'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
          </TouchableOpacity>

          {/* Change Password */}
          <TouchableOpacity
            style={styles.settingItem}
            onPress={() => {
              setNewPassword('');
              setConfirmPassword('');
              setPasswordModalVisible(true);
            }}
            activeOpacity={0.7}>
            <View style={styles.settingIconBox}>
              <Ionicons name="lock-closed-outline" size={18} color="#D97706" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.settingTitle}>Password & Security</Text>
              <Text style={styles.settingSubtitle}>Change account login password</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
          </TouchableOpacity>
        </View>

        {/* Cloud Connection Status */}
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Ionicons
              name={isConfigured ? 'cloud-done' : 'cloud-offline'}
              size={20}
              color={isConfigured ? '#15803D' : '#D97706'}
            />
            <View style={{ flex: 1 }}>
              <Text style={styles.infoTitle}>
                {isConfigured ? 'Supabase Cloud Connected' : 'Local Dev Environment'}
              </Text>
              <Text style={styles.infoSubtitle}>
                {isConfigured
                  ? 'Real-time database, cloud storage, and instant messaging active'
                  : 'Add EXPO_PUBLIC_SUPABASE_URL and KEY in .env for production sync'}
              </Text>
            </View>
          </View>
        </View>

        {/* Martial Principles */}
        <View style={styles.cardSection}>
          <Text style={styles.sectionHeader}>ARMY OF ONE • GURO ETHICS</Text>
          <View style={styles.codeItem}>
            <Ionicons name="shield-outline" size={18} color="#15803D" />
            <Text style={styles.codeText}>Pang-unawa (Empathy in Coaching)</Text>
          </View>
          <View style={styles.codeItem}>
            <Ionicons name="flash-outline" size={18} color="#D97706" />
            <Text style={styles.codeText}>Bilis at Katiyakan (Speed with Precision)</Text>
          </View>
          <View style={styles.codeItem}>
            <Ionicons name="heart-outline" size={18} color="#DC2626" />
            <Text style={styles.codeText}>Kalasag ng Espiritu (Protection of Spirit)</Text>
          </View>
        </View>

        {/* Sign Out Button */}
        <TouchableOpacity
          style={styles.signOutBtn}
          onPress={handleSignOut}
          activeOpacity={0.85}>
          <Ionicons name="log-out-outline" size={18} color="#DC2626" />
          <Text style={styles.signOutBtnText}>Log Out from Coach Account</Text>
        </TouchableOpacity>

        {/* Danger Zone: Delete Coach Account */}
        <View style={styles.dangerZone}>
          <TouchableOpacity
            style={styles.deleteAccountBtn}
            onPress={handleDeleteAccount}
            disabled={deletingAccount}
            activeOpacity={0.8}>
            {deletingAccount ? (
              <ActivityIndicator size="small" color="#B91C1C" />
            ) : (
              <>
                <Ionicons name="trash-outline" size={16} color="#B91C1C" />
                <Text style={styles.deleteAccountBtnText}>Delete Coach Account Permanently</Text>
              </>
            )}
          </TouchableOpacity>
          <Text style={styles.dangerZoneNote}>
            Irreversible. Purges your coach credentials, mentorship requests, and all student direct chats.
          </Text>
        </View>
      </ScrollView>

      {/* --- MODAL 1: EDIT CREDENTIALS & BIO --- */}
      <Modal
        visible={editModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setEditModalVisible(false)}>
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Coach Credentials</Text>
              <TouchableOpacity
                onPress={() => setEditModalVisible(false)}
                style={styles.modalCloseBtn}>
                <Ionicons name="close" size={20} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 420 }}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>FULL NAME / CALLSIGN</Text>
                <TextInput
                  style={styles.modalInput}
                  value={editName}
                  onChangeText={setEditName}
                  placeholder="Guro Name"
                  placeholderTextColor="#9CA3AF"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>MARTIAL SASH / RANK TITLE</Text>
                <TextInput
                  style={styles.modalInput}
                  value={editRank}
                  onChangeText={setEditRank}
                  placeholder="e.g. Lakan Tatlo (3rd Dan) / Master Guro"
                  placeholderTextColor="#9CA3AF"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>YEARS OF EXPERIENCE</Text>
                <TextInput
                  style={styles.modalInput}
                  value={editExp}
                  onChangeText={setEditExp}
                  keyboardType="numeric"
                  placeholder="e.g. 15"
                  placeholderTextColor="#9CA3AF"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>CREDENTIALS & BIO</Text>
                <TextInput
                  style={[styles.modalInput, styles.modalInputBio]}
                  value={editBio}
                  onChangeText={setEditBio}
                  multiline
                  numberOfLines={4}
                  placeholder="Describe your Arnis federation certification, teaching lineage, specialties (Anyo, Solo Baston, Sinawali, Kalasag)..."
                  placeholderTextColor="#9CA3AF"
                />
              </View>
            </ScrollView>

            <View style={styles.modalActionsRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setEditModalVisible(false)}
                activeOpacity={0.7}>
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalSaveBtn}
                onPress={handleSaveProfile}
                disabled={savingProfile}
                activeOpacity={0.85}>
                {savingProfile ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalSaveBtnText}>Save Changes</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* --- MODAL 2: CHANGE PASSWORD --- */}
      <Modal
        visible={passwordModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setPasswordModalVisible(false)}>
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Change Password</Text>
              <TouchableOpacity
                onPress={() => setPasswordModalVisible(false)}
                style={styles.modalCloseBtn}>
                <Ionicons name="close" size={20} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>NEW PASSWORD (MIN 6 CHARACTERS)</Text>
              <TextInput
                style={styles.modalInput}
                secureTextEntry
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder="Enter new password"
                placeholderTextColor="#9CA3AF"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>CONFIRM NEW PASSWORD</Text>
              <TextInput
                style={styles.modalInput}
                secureTextEntry
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Re-type new password"
                placeholderTextColor="#9CA3AF"
              />
            </View>

            <View style={styles.modalActionsRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setPasswordModalVisible(false)}
                activeOpacity={0.7}>
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalSaveBtn, { backgroundColor: '#D97706' }]}
                onPress={handleSavePassword}
                disabled={savingPassword}
                activeOpacity={0.85}>
                {savingPassword ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalSaveBtnText}>Update Password</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* --- MODAL 3: CHANGE EMAIL --- */}
      <Modal
        visible={emailModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setEmailModalVisible(false)}>
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Update Email Address</Text>
              <TouchableOpacity
                onPress={() => setEmailModalVisible(false)}
                style={styles.modalCloseBtn}>
                <Ionicons name="close" size={20} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>NEW EMAIL ADDRESS</Text>
              <TextInput
                style={styles.modalInput}
                keyboardType="email-address"
                autoCapitalize="none"
                value={newEmail}
                onChangeText={setNewEmail}
                placeholder="guro@example.com"
                placeholderTextColor="#9CA3AF"
              />
            </View>

            <View style={styles.modalActionsRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setEmailModalVisible(false)}
                activeOpacity={0.7}>
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalSaveBtn, { backgroundColor: '#D97706' }]}
                onPress={handleSaveEmail}
                disabled={savingEmail}
                activeOpacity={0.85}>
                {savingEmail ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalSaveBtnText}>Save Email</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: MartialTheme.colors.background,
  },
  header: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: MartialTheme.colors.border,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: MartialTheme.colors.text,
  },
  headerSubtitle: {
    fontSize: 12,
    color: MartialTheme.colors.textSecondary,
    marginTop: 2,
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 120,
    gap: 16,
  },
  profileCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: MartialTheme.colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 12,
  },
  avatarLarge: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2.5,
    borderColor: '#FDE68A',
  },
  avatarImage: {
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 2.5,
    borderColor: '#D97706',
  },
  avatarCameraBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#D97706',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  coachName: {
    fontSize: 20,
    fontWeight: '900',
    color: MartialTheme.colors.text,
    marginBottom: 6,
  },
  sashBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 6,
  },
  sashBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#92400E',
  },
  expPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 4,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#FEF3C7',
  },
  expPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#92400E',
  },
  coachEmail: {
    fontSize: 13,
    color: MartialTheme.colors.textSecondary,
    marginBottom: 14,
  },
  bioBox: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 14,
    width: '100%',
    borderWidth: 1,
    borderColor: MartialTheme.colors.border,
    marginBottom: 14,
  },
  emptyBioBox: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 12,
    width: '100%',
    borderWidth: 1,
    borderColor: MartialTheme.colors.border,
    marginBottom: 14,
    alignItems: 'center',
  },
  emptyBioText: {
    fontSize: 12,
    color: MartialTheme.colors.textSecondary,
    fontStyle: 'italic',
  },
  bioTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: MartialTheme.colors.textSecondary,
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  bioText: {
    fontSize: 13,
    color: MartialTheme.colors.text,
    lineHeight: 18,
  },
  editProfileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#D97706',
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 12,
    gap: 6,
    width: '100%',
  },
  editProfileBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  cardSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: MartialTheme.colors.border,
    gap: 10,
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '800',
    color: MartialTheme.colors.textSecondary,
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: MartialTheme.colors.border,
  },
  settingIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: MartialTheme.colors.text,
  },
  settingSubtitle: {
    fontSize: 11,
    color: MartialTheme.colors.textSecondary,
    marginTop: 1,
  },
  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: MartialTheme.colors.border,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  infoTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: MartialTheme.colors.text,
  },
  infoSubtitle: {
    fontSize: 11,
    color: MartialTheme.colors.textSecondary,
    marginTop: 2,
    lineHeight: 15,
  },
  codeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#F9FAFB',
    padding: 10,
    borderRadius: 8,
  },
  codeText: {
    fontSize: 13,
    fontWeight: '700',
    color: MartialTheme.colors.text,
  },
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEE2E2',
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#FECACA',
    gap: 8,
    marginTop: 8,
  },
  signOutBtnText: {
    color: '#DC2626',
    fontSize: 14,
    fontWeight: '800',
  },
  dangerZone: {
    marginTop: 12,
    marginBottom: 8,
    alignItems: 'center',
    gap: 6,
  },
  deleteAccountBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: '#FFF1F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    gap: 8,
    width: '100%',
  },
  deleteAccountBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#B91C1C',
  },
  dangerZoneNote: {
    fontSize: 11,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 15,
    paddingHorizontal: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 22,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    gap: 14,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: MartialTheme.colors.text,
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputGroup: {
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 10.5,
    fontWeight: '800',
    color: MartialTheme.colors.textSecondary,
    letterSpacing: 0.6,
    marginBottom: 4,
  },
  modalInput: {
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: MartialTheme.colors.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: MartialTheme.colors.text,
  },
  modalInputBio: {
    height: 90,
    textAlignVertical: 'top',
  },
  modalActionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#4B5563',
  },
  modalSaveBtn: {
    flex: 1.5,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#D97706',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSaveBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
