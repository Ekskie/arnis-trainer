import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
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
import * as Haptics from 'expo-haptics';
import { MartialTheme } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { UserRole } from '@/services/supabase';

export default function RegisterScreen() {
  const router = useRouter();
  const { signUp } = useAuth();

  const [role, setRole] = useState<UserRole>('student');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [bio, setBio] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleRegister = async () => {
    if (!displayName.trim()) {
      setErrorMessage('Please enter your full name or martial callsign.');
      return;
    }
    if (!email.trim()) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }
    if (password.length < 6) {
      setErrorMessage('Password must be at least 6 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match. Please re-check.');
      return;
    }

    setLoading(true);
    setErrorMessage(null);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const { error } = await signUp(
      email,
      password,
      displayName,
      role,
      role === 'coach' ? (bio.trim() || 'Guro / Certified Arnis Instructor') : undefined
    );

    setLoading(false);

    if (error) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setErrorMessage(error.message || 'Failed to create account. Please try again.');
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      // Navigation is automatically handled by RootLayout based on role!
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled">
          {/* Header */}
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={24} color={MartialTheme.colors.text} />
          </TouchableOpacity>

          <View style={styles.header}>
            <Text style={styles.title}>Join the Academy</Text>
            <Text style={styles.subtitle}>Select your martial role and create your training account.</Text>
          </View>

          {/* Role Selector Cards */}
          <Text style={styles.sectionHeader}>SELECT YOUR ROLE</Text>
          <View style={styles.roleGrid}>
            <TouchableOpacity
              style={[
                styles.roleCard,
                role === 'student' && styles.roleCardSelected,
              ]}
              onPress={() => {
                Haptics.selectionAsync();
                setRole('student');
              }}
              activeOpacity={0.85}>
              <View
                style={[
                  styles.roleIconCircle,
                  role === 'student' && { backgroundColor: '#DCFCE7' },
                ]}>
                <Ionicons
                  name="person"
                  size={24}
                  color={role === 'student' ? MartialTheme.colors.primary : '#6B7280'}
                />
              </View>
              <Text style={[styles.roleTitle, role === 'student' && styles.roleTitleSelected]}>
                Student
              </Text>
              <Text style={styles.roleDescription}>
                Practice strikes, advance through sash ranks, and receive direct coaching.
              </Text>
              {role === 'student' && (
                <View style={styles.selectedBadge}>
                  <Ionicons name="checkmark-circle" size={16} color={MartialTheme.colors.primary} />
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.roleCard,
                role === 'coach' && styles.roleCardSelectedCoach,
              ]}
              onPress={() => {
                Haptics.selectionAsync();
                setRole('coach');
              }}
              activeOpacity={0.85}>
              <View
                style={[
                  styles.roleIconCircle,
                  role === 'coach' && { backgroundColor: '#FEF3C7' },
                ]}>
                <MaterialCommunityIcons
                  name="shield-sword"
                  size={24}
                  color={role === 'coach' ? '#D97706' : '#6B7280'}
                />
              </View>
              <Text style={[styles.roleTitle, role === 'coach' && styles.roleTitleSelectedCoach]}>
                Coach / Guro
              </Text>
              <Text style={styles.roleDescription}>
                Review student strike forms, monitor journeys, and guide trainees directly.
              </Text>
              {role === 'coach' && (
                <View style={styles.selectedBadge}>
                  <Ionicons name="checkmark-circle" size={16} color="#D97706" />
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* Error Banner */}
          {errorMessage && (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={18} color="#DC2626" />
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          )}

          {/* Form Fields */}
          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>FULL NAME OR MARTIAL CALLSIGN</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="person-outline" size={20} color="#7D8C84" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder={role === 'coach' ? 'e.g., Guro Manuel Roxas' : 'e.g., Juan Dela Cruz'}
                  placeholderTextColor="#9CA3AF"
                  value={displayName}
                  onChangeText={setDisplayName}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>EMAIL ADDRESS</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="mail-outline" size={20} color="#7D8C84" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="name@example.com"
                  placeholderTextColor="#9CA3AF"
                  autoCapitalize="none"
                  keyboardType="email-address"
                  value={email}
                  onChangeText={setEmail}
                />
              </View>
            </View>

            {role === 'coach' && (
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>COACH CREDENTIALS / BIO</Text>
                <View style={[styles.inputWrapper, { height: 72, alignItems: 'flex-start', paddingTop: 10 }]}>
                  <Ionicons name="ribbon-outline" size={20} color="#7D8C84" style={styles.inputIcon} />
                  <TextInput
                    style={[styles.input, { height: 50, textAlignVertical: 'top' }]}
                    placeholder="e.g., 2nd Dan Black Belt, Modern Arnis Specialist"
                    placeholderTextColor="#9CA3AF"
                    multiline
                    value={bio}
                    onChangeText={setBio}
                  />
                </View>
              </View>
            )}

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>PASSWORD</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="lock-closed-outline" size={20} color="#7D8C84" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="At least 6 characters"
                  placeholderTextColor="#9CA3AF"
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={setPassword}
                />
                <TouchableOpacity
                  style={styles.eyeButton}
                  onPress={() => setShowPassword(!showPassword)}>
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color="#7D8C84"
                  />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>CONFIRM PASSWORD</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="checkmark-done-outline" size={20} color="#7D8C84" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Repeat your password"
                  placeholderTextColor="#9CA3AF"
                  secureTextEntry={!showPassword}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                />
              </View>
            </View>

            <TouchableOpacity
              style={[
                styles.submitButton,
                role === 'coach' && styles.submitButtonCoach,
                loading && styles.submitButtonDisabled,
              ]}
              onPress={handleRegister}
              disabled={loading}
              activeOpacity={0.88}>
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Text style={styles.submitButtonText}>
                    {role === 'coach' ? 'Register as Coach' : 'Register as Student'}
                  </Text>
                  <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Login Link */}
          <View style={styles.footerRow}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => router.push('/(auth)/login' as any)}>
              <Text style={styles.loginLink}>Sign In</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: MartialTheme.colors.background,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 40,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: MartialTheme.colors.border,
    marginBottom: 16,
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: MartialTheme.colors.text,
    letterSpacing: 0.3,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: MartialTheme.colors.textSecondary,
    lineHeight: 20,
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '800',
    color: MartialTheme.colors.textSecondary,
    letterSpacing: 1,
    marginBottom: 10,
  },
  roleGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  roleCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 2,
    borderColor: MartialTheme.colors.border,
    position: 'relative',
  },
  roleCardSelected: {
    borderColor: MartialTheme.colors.primary,
    backgroundColor: '#F0FDF4',
  },
  roleCardSelectedCoach: {
    borderColor: '#D97706',
    backgroundColor: '#FFFBEB',
  },
  roleIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  roleTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: MartialTheme.colors.text,
    marginBottom: 4,
  },
  roleTitleSelected: {
    color: MartialTheme.colors.primary,
  },
  roleTitleSelectedCoach: {
    color: '#D97706',
  },
  roleDescription: {
    fontSize: 11,
    color: MartialTheme.colors.textSecondary,
    lineHeight: 15,
  },
  selectedBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FECACA',
    marginBottom: 16,
    gap: 8,
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    color: '#DC2626',
    fontWeight: '600',
  },
  form: {
    gap: 14,
  },
  inputGroup: {
    gap: 6,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: MartialTheme.colors.textSecondary,
    letterSpacing: 0.8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: MartialTheme.colors.border,
    paddingHorizontal: 14,
    height: 52,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: MartialTheme.colors.text,
    fontWeight: '600',
  },
  eyeButton: {
    padding: 6,
  },
  submitButton: {
    backgroundColor: MartialTheme.colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 54,
    borderRadius: 14,
    borderBottomWidth: 4,
    borderBottomColor: MartialTheme.colors.primaryDark,
    marginTop: 8,
    gap: 8,
  },
  submitButtonCoach: {
    backgroundColor: '#D97706',
    borderBottomColor: '#B45309',
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
  },
  footerText: {
    fontSize: 14,
    color: MartialTheme.colors.textSecondary,
  },
  loginLink: {
    fontSize: 14,
    fontWeight: '800',
    color: MartialTheme.colors.primary,
  },
});
