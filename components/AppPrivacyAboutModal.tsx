import React from 'react';
import {
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Constants from 'expo-constants';
import { Ionicons } from '@expo/vector-icons';
import { MartialTheme } from '@/constants/theme';

interface AppPrivacyAboutModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function AppPrivacyAboutModal({
  visible,
  onClose,
}: AppPrivacyAboutModalProps) {
  const appVersion = Constants.expoConfig?.version || '1.0.0';
  const appName = Constants.expoConfig?.name || 'PoseFix Arnis';

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>About & Privacy Notice</Text>
            <Text style={styles.headerSubtitle}>
              {appName} · Version {appVersion}
            </Text>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
            <Ionicons name="close" size={22} color={MartialTheme.colors.text} />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.heroCard}>
            <View style={styles.heroIcon}>
              <Image
                source={require('@/assets/images/Logo.jpg')}
                style={styles.heroLogo}
                resizeMode="contain"
              />
            </View>
            <Text style={styles.heroTitle}>{appName}</Text>
            <Text style={styles.heroDesc}>
              Filipino Martial Arts training companion featuring real-time biomechanical strike evaluation, structured curriculum modules, and Guro mentorship.
            </Text>
          </View>

          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Ionicons name="videocam-outline" size={18} color={MartialTheme.colors.primary} />
              <Text style={styles.sectionTitle}>Camera & On-Device AI Processing</Text>
            </View>
            <Text style={styles.sectionBody}>
              Live camera frames are processed directly on your device inside the pose engine to compute skeletal landmarks and strike angles. The lightweight MediaPipe model downloads over HTTPS on initial load and requires internet connectivity when first initializing or after clearing app cache.
            </Text>
          </View>

          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Ionicons name="shield-checkmark-outline" size={18} color="#15803D" />
              <Text style={styles.sectionTitle}>Data & Coach Sharing Privacy</Text>
            </View>
            <Text style={styles.sectionBody}>
              Your account profile, practice metrics, and direct messages sync over encrypted TLS to Supabase. Impact snapshots and strike recordings are saved in private authenticated storage buckets; practice videos are only accessible to an accepted Guro coach when sharing is enabled in Coach Shared Data & Privacy.
            </Text>
          </View>

          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Ionicons name="trash-outline" size={18} color="#DC2626" />
              <Text style={styles.sectionTitle}>Account & Data Deletion</Text>
            </View>
            <Text style={styles.sectionBody}>
              You may permanently delete your account from the Profile tab at any time. Deleting your account removes your authentication record, profile, practice sessions, stored snapshots/videos, mentorship links, and direct messages.
            </Text>
          </View>

          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Ionicons name="warning-outline" size={18} color="#D97706" />
              <Text style={styles.sectionTitle}>Training Safety Notice</Text>
            </View>
            <Text style={styles.sectionBody}>
              Always practice Arnis strikes in a clear open space away from people, pets, and fragile objects. Use a padded or lightweight training baston and warm up properly before rapid strike drills.
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
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
  },
  headerSubtitle: {
    fontSize: 12,
    color: MartialTheme.colors.textSecondary,
    fontWeight: '600',
    marginTop: 2,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: MartialTheme.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: MartialTheme.colors.border,
  },
  scrollContent: {
    padding: 20,
    gap: 14,
    paddingBottom: 36,
  },
  heroCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: MartialTheme.colors.border,
    gap: 8,
  },
  heroIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: MartialTheme.colors.border,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroLogo: {
    width: 52,
    height: 52,
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: MartialTheme.colors.text,
  },
  heroDesc: {
    fontSize: 13,
    color: MartialTheme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 19,
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: MartialTheme.colors.border,
    gap: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: MartialTheme.colors.text,
  },
  sectionBody: {
    fontSize: 13,
    color: MartialTheme.colors.textSecondary,
    lineHeight: 20,
  },
});
