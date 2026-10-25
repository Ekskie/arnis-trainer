import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { MartialTheme } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';

export default function WelcomeScreen() {
  const router = useRouter();
  const { isConfigured } = useAuth();

  const handleRegister = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push('/(auth)/register' as any);
  };

  const handleLogin = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/(auth)/login' as any);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Top Filipino Martial Arts Crest */}
        <View style={styles.heroSection}>
          <View style={styles.crestCircle}>
            <MaterialCommunityIcons name="sword-cross" size={48} color={MartialTheme.colors.primary} />
          </View>
          <View style={styles.badgeRow}>
            <Text style={styles.badgeText}>ESKRIMA • KALI • ARNIS</Text>
          </View>
          <Text style={styles.title}>ARNIS TRAINER</Text>
          <Text style={styles.subtitle}>
            Master canonical 12 strikes, track your martial journey, and train directly under certified Guro coaches.
          </Text>

          {!isConfigured && (
            <View style={styles.configNotice}>
              <Ionicons name="information-circle-outline" size={18} color="#92400E" />
              <Text style={styles.configNoticeText}>
                Supabase credentials pending in .env (offline dev mode active)
              </Text>
            </View>
          )}
        </View>

        {/* Feature Highlights */}
        <View style={styles.featureList}>
          <View style={styles.featureItem}>
            <View style={[styles.featureIcon, { backgroundColor: '#DCFCE7' }]}>
              <Ionicons name="body" size={20} color="#15803D" />
            </View>
            <View style={styles.featureTextContainer}>
              <Text style={styles.featureTitle}>AI Pose Analysis</Text>
              <Text style={styles.featureDesc}>Real-time joint angle and impact timing calibration</Text>
            </View>
          </View>

          <View style={styles.featureItem}>
            <View style={[styles.featureIcon, { backgroundColor: '#FEF3C7' }]}>
              <Ionicons name="school" size={20} color="#D97706" />
            </View>
            <View style={styles.featureTextContainer}>
              <Text style={styles.featureTitle}>Guro Mentorship</Text>
              <Text style={styles.featureDesc}>Connect with certified coaches for personalized guidance</Text>
            </View>
          </View>

          <View style={styles.featureItem}>
            <View style={[styles.featureIcon, { backgroundColor: '#FFEDD5' }]}>
              <Ionicons name="trophy" size={20} color="#EA580C" />
            </View>
            <View style={styles.featureTextContainer}>
              <Text style={styles.featureTitle}>Belt & Sash Journey</Text>
              <Text style={styles.featureDesc}>Advance through ranks from White Sash to Master Lakan</Text>
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleRegister}
            activeOpacity={0.88}>
            <Text style={styles.primaryButtonText}>Begin Journey (Register)</Text>
            <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={handleLogin}
            activeOpacity={0.88}>
            <Text style={styles.secondaryButtonText}>I Already Have an Account</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: MartialTheme.colors.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingVertical: 20,
    justifyContent: 'space-between',
  },
  heroSection: {
    alignItems: 'center',
    marginTop: Platform.OS === 'ios' ? 20 : 10,
  },
  crestCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: MartialTheme.colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
    marginBottom: 16,
  },
  badgeRow: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#92400E',
    letterSpacing: 1,
  },
  title: {
    fontSize: 30,
    fontWeight: '900',
    color: MartialTheme.colors.text,
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: MartialTheme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 21,
    paddingHorizontal: 16,
  },
  configNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FDE68A',
    marginTop: 12,
    gap: 6,
  },
  configNoticeText: {
    fontSize: 11,
    color: '#92400E',
    fontWeight: '600',
  },
  featureList: {
    gap: 14,
    marginVertical: 12,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: MartialTheme.colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  featureIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  featureTextContainer: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: MartialTheme.colors.text,
    marginBottom: 2,
  },
  featureDesc: {
    fontSize: 12,
    color: MartialTheme.colors.textSecondary,
  },
  buttonContainer: {
    gap: 12,
    marginBottom: 10,
  },
  primaryButton: {
    backgroundColor: MartialTheme.colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 14,
    borderBottomWidth: 4,
    borderBottomColor: MartialTheme.colors.primaryDark,
    gap: 8,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  secondaryButton: {
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: MartialTheme.colors.border,
    borderBottomWidth: 3,
    borderBottomColor: MartialTheme.colors.border3D,
  },
  secondaryButtonText: {
    color: MartialTheme.colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
});
