import React, { useCallback, useState } from 'react';
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
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';

import { MartialTheme } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { useNotifications } from '@/contexts/NotificationContext';
import {
  getGamificationStats,
  GamificationStats,
  getSashRankByLevel,
} from '@/constants/gamificationStore';
import {
  CurriculumProgress,
  getCurriculumProgress,
} from '@/constants/curriculumStore';
import { getHistory } from '@/constants/historyStore';
import CoachSharedDataModal from '@/components/CoachSharedDataModal';
import AppPrivacyAboutModal from '@/components/AppPrivacyAboutModal';
import EmailChangeModal from '@/components/auth/EmailChangeModal';

export default function StudentProfileScreen() {
  const router = useRouter();
  const { user, profile, signOut, deleteAccount, isConfigured, updateProfile, updatePassword } =
    useAuth();
  const { unreadCount } = useNotifications();

  // Gamification & curriculum stats
  const [gamification, setGamification] = useState<GamificationStats>({
    streakDays: 0,
    lastTrainedDate: '',
    totalXp: 0,
    level: 1,
  });
  const [curriculumProgress, setCurriculumProgress] = useState<CurriculumProgress>({
    completedLessonIds: [],
    currentLessonId: 'les_0_1',
    totalLessons: 27,
    completedCount: 0,
    progressPercentage: 0,
  });

  const [privacyModalVisible, setPrivacyModalVisible] = useState(false);
  const [sharedVideosCount, setSharedVideosCount] = useState<number>(0);

  const loadSharingStats = useCallback(async () => {
    try {
      const items = await getHistory(user?.id);
      setSharedVideosCount(items.filter((s) => s.isSharedWithCoach).length);
    } catch (e) {
      console.warn('[Profile] Failed to load sharing stats:', e);
    }
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => {
      getGamificationStats(user?.id).then(setGamification);
      getCurriculumProgress(user?.id).then(setCurriculumProgress);
      loadSharingStats();
    }, [user?.id, loadSharingStats])
  );

  const sashInfo = getSashRankByLevel(gamification.level);

  // Avatar upload state
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Edit Profile Modal state
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editName, setEditName] = useState(profile?.display_name || '');
  const [editBio, setEditBio] = useState(profile?.bio || '');
  const [savingProfile, setSavingProfile] = useState(false);

  // Password Modal state
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  // Email Modal state
  const [emailModalVisible, setEmailModalVisible] = useState(false);

  // Handle Avatar Selection & Upload
  const handlePickAvatar = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          'Permission Needed',
          'Please allow camera roll access to update your profile photo.'
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.4,
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
    setEditBio(profile?.bio || '');
    setEditModalVisible(true);
  };

  // Save Profile Edits
  const handleSaveProfile = async () => {
    if (!editName.trim()) {
      Alert.alert('Required', 'Please enter your warrior name or callsign.');
      return;
    }

    setSavingProfile(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const { error } = await updateProfile({
      display_name: editName.trim(),
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
    if (!user) {
      Alert.alert(
        'Sign In Required',
        'Please sign in or create an account to configure password credentials.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Sign In / Register', onPress: () => router.push('/(auth)/login' as any) },
        ]
      );
      return;
    }
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
      Alert.alert('Success', 'Your student account password has been updated.');
    }
  };

  // Sign Out or Sign In
  const handleSignOut = () => {
    if (!user) {
      router.push('/(auth)/login' as any);
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Alert.alert('Log Out', 'Are you sure you want to log out of your student account?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log Out',
        style: 'destructive',
        onPress: async () => {
          await signOut();
        },
      },
    ]);
  };

  // Delete Account or Reset Local Guest Data
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [aboutModalVisible, setAboutModalVisible] = useState(false);

  const handleDeleteAccount = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    if (!user) {
      Alert.alert(
        'Reset Guest Data',
        'Are you sure you want to clear your local strike evaluations, streak, and progress on this device?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Clear Data',
            style: 'destructive',
            onPress: async () => {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              setGamification({ streakDays: 0, lastTrainedDate: '', totalXp: 0, level: 1 });
              Alert.alert('Data Cleared', 'Local guest training statistics have been reset.');
            },
          },
        ]
      );
      return;
    }
    Alert.alert(
      'Delete Account',
      'Are you sure you want to delete your account? This action is permanent and will remove all your practice history, sash progress, and coach messages.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Continue',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Final Confirmation',
              'This cannot be undone. All your strikes, videos, and badges will be permanently erased. Proceed with deleting your account?',
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
                        Alert.alert(
                          'Deletion Failed',
                          error.message || 'Could not delete your account. Please verify your connection and try again.'
                        );
                        return;
                      }
                      router.replace('/(auth)/welcome' as any);
                    } catch (e: any) {
                      Alert.alert('Error', e?.message || 'Failed to delete account');
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
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* Top Header */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>STUDENT PROFILE</Text>
          <Text style={styles.headerSubtitle}>Manage your warrior identity & account</Text>
        </View>

        <View style={styles.cloudBadge}>
          <View
            style={[
              styles.cloudDot,
              { backgroundColor: isConfigured ? '#22C55E' : '#9CA3AF' },
            ]}
          />
          <Text style={styles.cloudText}>{isConfigured ? 'Cloud Sync' : 'Offline'}</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        {/* Profile Card Hero */}
        <View style={styles.heroCard}>
          <View style={styles.avatarRow}>
            {/* Avatar with Camera Overlay */}
            <TouchableOpacity
              style={styles.avatarWrapper}
              onPress={handlePickAvatar}
              disabled={uploadingAvatar}
              activeOpacity={0.8}>
              {profile?.avatar_url ? (
                <Image source={{ uri: profile.avatar_url }} style={styles.avatarImage} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Ionicons name="person" size={44} color="#15803D" />
                </View>
              )}

              {/* Camera Icon Overlay */}
              <View style={styles.cameraIconBadge}>
                {uploadingAvatar ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Ionicons name="camera" size={14} color="#FFFFFF" />
                )}
              </View>
            </TouchableOpacity>

            {/* Profile Info */}
            <View style={{ flex: 1 }}>
              <Text style={styles.displayName}>
                {profile?.display_name || 'Arnis Student'}
              </Text>
              <View
                style={[
                  styles.sashPill,
                  {
                    backgroundColor: sashInfo.sashColor,
                    borderColor: sashInfo.borderColor,
                  },
                ]}>
                <MaterialCommunityIcons
                  name="sword-cross"
                  size={12}
                  color={sashInfo.textColor}
                />
                <Text style={[styles.sashPillText, { color: sashInfo.textColor }]}>
                  {sashInfo.shortName}
                </Text>
              </View>
              <Text style={styles.emailText}>{profile?.email || 'No email registered'}</Text>
            </View>
          </View>

          {/* Student Bio */}
          <View style={styles.bioBox}>
            <Text style={styles.bioLabel}>WARRIOR ASPIRATION & BIO</Text>
            <Text style={styles.bioText}>
              {profile?.bio ||
                'No personal bio added yet. Tap "Edit Profile" below to introduce yourself to coaches and share your martial goals.'}
            </Text>
          </View>

          {/* Edit Profile Button */}
          <TouchableOpacity
            style={styles.editProfileBtn}
            onPress={openEditProfile}
            activeOpacity={0.8}>
            <Ionicons name="create-outline" size={16} color={MartialTheme.colors.primary} />
            <Text style={styles.editProfileBtnText}>Edit Profile & Bio</Text>
          </TouchableOpacity>
        </View>

        {/* Training Stats Bar */}
        <View style={styles.statsCard}>
          <View style={styles.statBox}>
            <Text style={styles.statEmoji}>🔥</Text>
            <Text style={styles.statVal}>{gamification.streakDays}</Text>
            <Text style={styles.statLabel}>Day Streak</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={styles.statEmoji}>⭐</Text>
            <Text style={styles.statVal}>{gamification.totalXp}</Text>
            <Text style={styles.statLabel}>Total XP</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={styles.statEmoji}>🥋</Text>
            <Text style={styles.statVal}>{curriculumProgress.completedCount}</Text>
            <Text style={styles.statLabel}>Lessons Done</Text>
          </View>
        </View>

        {/* Guest Practitioner Banner (Invite to Sign In & Cloud Sync) */}
        {!user && (
          <View style={styles.guestBannerCard}>
            <View style={styles.guestBannerHeader}>
              <View style={styles.guestBannerIconCircle}>
                <Ionicons name="cloud-offline-outline" size={20} color="#D97706" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.guestBannerTitle}>Guest Training Profile</Text>
                <Text style={styles.guestBannerText}>
                  Your practice sessions, streaks, and scores are stored on this device. Sign in or create an account to back up your progress to the cloud and connect with certified Guro coaches.
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.guestSignInBtn}
              onPress={() => router.push('/(auth)/login' as any)}
              activeOpacity={0.85}>
              <Text style={styles.guestSignInBtnText}>Sign In / Create Account 🥋</Text>
              <Ionicons name="arrow-forward" size={15} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        )}

        {/* Account & Security Section */}
        <Text style={styles.sectionHeader}>ACCOUNT & SECURITY</Text>

        <View style={styles.settingsGroup}>
          {/* Change Password */}
          <TouchableOpacity
            style={styles.settingsRow}
            onPress={() => {
              if (!user) {
                Alert.alert(
                  'Sign In Required',
                  'Please sign in or create an account to configure security credentials.',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Sign In / Register', onPress: () => router.push('/(auth)/login' as any) },
                  ]
                );
                return;
              }
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setNewPassword('');
              setConfirmPassword('');
              setPasswordModalVisible(true);
            }}
            activeOpacity={0.7}>
            <View style={[styles.settingsIconBox, { backgroundColor: '#EEF2FF' }]}>
              <Ionicons name="key-outline" size={18} color="#4F46E5" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.settingsTitle}>Change Password</Text>
              <Text style={styles.settingsSubtitle}>
                {user ? 'Update your account login security' : 'Sign in required to configure password'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
          </TouchableOpacity>

          <View style={styles.settingsRowDivider} />

          {/* Change Email */}
          <TouchableOpacity
            style={styles.settingsRow}
            onPress={() => {
              if (!user) {
                Alert.alert(
                  'Sign In Required',
                  'Please sign in or create an account to configure email credentials.',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Sign In / Register', onPress: () => router.push('/(auth)/login' as any) },
                  ]
                );
                return;
              }
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setEmailModalVisible(true);
            }}
            activeOpacity={0.7}>
            <View style={[styles.settingsIconBox, { backgroundColor: '#F0FDF4' }]}>
              <Ionicons name="mail-outline" size={18} color="#15803D" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.settingsTitle}>Update Email Address</Text>
              <Text style={styles.settingsSubtitle}>
                {user ? (profile?.email || 'Configure email') : 'Sign in required to link email'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
          </TouchableOpacity>

          <View style={styles.settingsRowDivider} />

          {/* Coach Hub Connection Shortcut */}
          <TouchableOpacity
            style={styles.settingsRow}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push('/coach-hub' as any);
            }}
            activeOpacity={0.7}>
            <View style={[styles.settingsIconBox, { backgroundColor: '#FEF3C7' }]}>
              <Ionicons name="chatbubbles-outline" size={18} color="#D97706" />
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={styles.settingsTitle}>Coach Hub & Mentorship</Text>
                {unreadCount > 0 && (
                  <View style={styles.unreadSettingsBadge}>
                    <Text style={styles.unreadSettingsBadgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
                  </View>
                )}
              </View>
              <Text style={[styles.settingsSubtitle, unreadCount > 0 && styles.settingsSubtitleUnread]}>
                {unreadCount > 0
                  ? `${unreadCount} unread message${unreadCount > 1 ? 's' : ''}`
                  : 'Manage coach connection or request advice'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
          </TouchableOpacity>

          <View style={styles.settingsRowDivider} />

          {/* Coach Shared Data & Privacy */}
          <TouchableOpacity
            style={styles.settingsRow}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setPrivacyModalVisible(true);
            }}
            activeOpacity={0.7}>
            <View style={[styles.settingsIconBox, { backgroundColor: '#DCFCE7' }]}>
              <Ionicons name="shield-checkmark-outline" size={18} color="#15803D" />
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={styles.settingsTitle}>Coach Shared Data & Privacy</Text>
                {sharedVideosCount > 0 && (
                  <View style={styles.sharedCounterBadge}>
                    <Text style={styles.sharedCounterBadgeText}>{sharedVideosCount} SHARED</Text>
                  </View>
                )}
              </View>
              <Text style={styles.settingsSubtitle}>
                {sharedVideosCount > 0
                  ? `${sharedVideosCount} practice recording${sharedVideosCount > 1 ? 's' : ''} shared with coach`
                  : 'Manage recordings & telemetry visibility'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
          </TouchableOpacity>

          <View style={styles.settingsRowDivider} />

          {/* About & Privacy Notice */}
          <TouchableOpacity
            style={styles.settingsRow}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setAboutModalVisible(true);
            }}
            activeOpacity={0.7}>
            <View style={[styles.settingsIconBox, { backgroundColor: '#F3F4F6' }]}>
              <Ionicons name="information-circle-outline" size={18} color="#374151" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.settingsTitle}>About & Privacy Notice</Text>
              <Text style={styles.settingsSubtitle}>App version, AI camera privacy & safety info</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
          </TouchableOpacity>
        </View>

        {/* Sign In or Log Out Button */}
        <TouchableOpacity
          style={[styles.signOutBtn, !user && styles.signInPromptBtn]}
          onPress={handleSignOut}
          activeOpacity={0.8}>
          <Ionicons
            name={user ? 'log-out-outline' : 'log-in-outline'}
            size={18}
            color={user ? '#DC2626' : MartialTheme.colors.primary}
          />
          <Text style={[styles.signOutBtnText, !user && styles.signInPromptBtnText]}>
            {user ? 'Log Out from Account' : 'Sign In to Account'}
          </Text>
        </TouchableOpacity>

        {/* Danger Zone: Delete Account or Reset Local Data */}
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
                <Text style={styles.deleteAccountBtnText}>
                  {user ? 'Delete Account Permanently' : 'Reset Local Training Data'}
                </Text>
              </>
            )}
          </TouchableOpacity>
          <Text style={styles.dangerZoneNote}>
            {user
              ? 'Irreversible. Purges your profile, practice sessions, sash rank, and chat history.'
              : 'Clears cached streak and local practice evaluations from this device.'}
          </Text>
        </View>
      </ScrollView>

      {/* ================= EDIT PROFILE MODAL ================= */}
      <Modal
        visible={editModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setEditModalVisible(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Student Profile</Text>
              <TouchableOpacity
                onPress={() => setEditModalVisible(false)}
                activeOpacity={0.7}>
                <Ionicons name="close" size={24} color={MartialTheme.colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalLabel}>WARRIOR CALLSIGN / DISPLAY NAME</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="e.g. Juan Dela Cruz"
                placeholderTextColor="#9CA3AF"
                value={editName}
                onChangeText={setEditName}
                maxLength={40}
              />

              <Text style={styles.modalLabel}>PERSONAL BIO & MARTIAL GOALS</Text>
              <TextInput
                style={[styles.modalInput, styles.modalTextArea]}
                placeholder="Describe your training goals, current belt/sash, or what you want to master in Arnis..."
                placeholderTextColor="#9CA3AF"
                value={editBio}
                onChangeText={setEditBio}
                multiline
                numberOfLines={4}
                maxLength={300}
              />

              <TouchableOpacity
                style={[styles.modalSaveBtn, savingProfile && styles.btnDisabled]}
                onPress={handleSaveProfile}
                disabled={savingProfile}
                activeOpacity={0.85}>
                {savingProfile ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
                    <Text style={styles.modalSaveBtnText}>Save Profile</Text>
                  </>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ================= CHANGE PASSWORD MODAL ================= */}
      <Modal
        visible={passwordModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setPasswordModalVisible(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Change Password</Text>
              <TouchableOpacity
                onPress={() => setPasswordModalVisible(false)}
                activeOpacity={0.7}>
                <Ionicons name="close" size={24} color={MartialTheme.colors.text} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalLabel}>NEW PASSWORD (MIN. 6 CHARACTERS)</Text>
            <View style={styles.passwordInputWrapper}>
              <TextInput
                style={styles.passwordInput}
                placeholder="Enter new secure password"
                placeholderTextColor="#9CA3AF"
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                style={styles.eyeBtn}>
                <Ionicons
                  name={showPassword ? 'eye-off' : 'eye'}
                  size={18}
                  color="#6B7280"
                />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalLabel}>CONFIRM NEW PASSWORD</Text>
            <View style={styles.passwordInputWrapper}>
              <TextInput
                style={styles.passwordInput}
                placeholder="Re-type new password"
                placeholderTextColor="#9CA3AF"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showPassword}
              />
            </View>

            <TouchableOpacity
              style={[styles.modalSaveBtn, savingPassword && styles.btnDisabled]}
              onPress={handleSavePassword}
              disabled={savingPassword}
              activeOpacity={0.85}>
              {savingPassword ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="shield-checkmark" size={18} color="#FFFFFF" />
                  <Text style={styles.modalSaveBtnText}>Update Password</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ================= CHANGE EMAIL MODAL ================= */}
      <EmailChangeModal
        visible={emailModalVisible}
        onClose={() => setEmailModalVisible(false)}
        currentEmail={user?.email || profile?.email || ''}
        placeholder="e.g. warrior@arnis.ph"
        accentColor={MartialTheme.colors.primary}
        accentBorderColor={MartialTheme.colors.border3DPrimary}
      />

      {/* Coach Shared Data & Privacy Modal */}
      <CoachSharedDataModal
        visible={privacyModalVisible}
        onClose={() => setPrivacyModalVisible(false)}
        onSessionsUpdated={loadSharingStats}
      />

      {/* About & Privacy Notice Modal */}
      <AppPrivacyAboutModal
        visible={aboutModalVisible}
        onClose={() => setAboutModalVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: MartialTheme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: MartialTheme.colors.border,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: MartialTheme.colors.text,
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    fontSize: 12,
    color: MartialTheme.colors.textSecondary,
    marginTop: 1,
  },
  cloudBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 6,
  },
  cloudDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  cloudText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4B5563',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 120,
    gap: 16,
  },
  heroCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1.5,
    borderColor: MartialTheme.colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
    gap: 14,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  avatarWrapper: {
    position: 'relative',
  },
  avatarImage: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 2,
    borderColor: MartialTheme.colors.primary,
  },
  avatarPlaceholder: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#BBF7D0',
  },
  cameraIconBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: MartialTheme.colors.primary,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  displayName: {
    fontSize: 18,
    fontWeight: '900',
    color: MartialTheme.colors.text,
    marginBottom: 4,
  },
  sashPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    gap: 4,
    marginBottom: 4,
  },
  sashPillText: {
    fontSize: 11,
    fontWeight: '800',
  },
  emailText: {
    fontSize: 12,
    color: MartialTheme.colors.textSecondary,
  },
  bioBox: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: MartialTheme.colors.border,
  },
  bioLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: MartialTheme.colors.textSecondary,
    letterSpacing: 0.5,
    marginBottom: 4,
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
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: MartialTheme.colors.primary,
    backgroundColor: MartialTheme.colors.primaryMuted,
    gap: 6,
  },
  editProfileBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: MartialTheme.colors.primary,
  },
  statsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: MartialTheme.colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  statEmoji: {
    fontSize: 16,
  },
  statVal: {
    fontSize: 16,
    fontWeight: '900',
    color: MartialTheme.colors.text,
  },
  statLabel: {
    fontSize: 11,
    color: MartialTheme.colors.textSecondary,
    fontWeight: '600',
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: MartialTheme.colors.border,
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '800',
    color: MartialTheme.colors.textSecondary,
    letterSpacing: 0.8,
    marginTop: 6,
    marginBottom: -4,
  },
  settingsGroup: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: MartialTheme.colors.border,
    overflow: 'hidden',
  },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  settingsIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingsTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: MartialTheme.colors.text,
  },
  settingsSubtitle: {
    fontSize: 12,
    color: MartialTheme.colors.textSecondary,
    marginTop: 1,
  },
  settingsSubtitleUnread: {
    color: '#D97706',
    fontWeight: '700',
  },
  unreadSettingsBadge: {
    backgroundColor: '#DC2626',
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadSettingsBadgeText: {
    color: '#FFFFFF',
    fontSize: 9.5,
    fontWeight: '900',
  },
  sharedCounterBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#86EFAC',
  },
  sharedCounterBadgeText: {
    color: '#15803D',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.4,
  },
  settingsRowDivider: {
    height: 1,
    backgroundColor: MartialTheme.colors.border,
    marginLeft: 64,
  },
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: '#FEF2F2',
    borderWidth: 1.5,
    borderColor: '#FECDD3',
    gap: 8,
    marginTop: 8,
  },
  signOutBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#DC2626',
  },
  signInPromptBtn: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
  },
  signInPromptBtnText: {
    color: MartialTheme.colors.primary,
  },
  guestBannerCard: {
    backgroundColor: '#FEF3C7',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1.5,
    borderColor: '#FDE68A',
    gap: 12,
  },
  guestBannerHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  guestBannerIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FDE68A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  guestBannerTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#92400E',
    marginBottom: 2,
  },
  guestBannerText: {
    fontSize: 12,
    color: '#78350F',
    lineHeight: 17,
  },
  guestSignInBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: MartialTheme.colors.primary,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  guestSignInBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
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
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: MartialTheme.colors.text,
  },
  modalLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: MartialTheme.colors.textSecondary,
    letterSpacing: 0.5,
    marginTop: 12,
    marginBottom: 6,
  },
  modalInput: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 14,
    color: MartialTheme.colors.text,
    borderWidth: 1,
    borderColor: MartialTheme.colors.border,
  },
  modalTextArea: {
    height: 90,
    textAlignVertical: 'top',
  },
  passwordInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: MartialTheme.colors.border,
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 14,
    color: MartialTheme.colors.text,
  },
  eyeBtn: {
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  modalSaveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: MartialTheme.colors.primary,
    paddingVertical: 14,
    borderRadius: 14,
    gap: 8,
    marginTop: 20,
    borderBottomWidth: 3,
    borderBottomColor: MartialTheme.colors.primaryDark,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  modalSaveBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
});
