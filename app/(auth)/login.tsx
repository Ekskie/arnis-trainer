import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { MartialTheme } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';

export default function LoginScreen() {
  const router = useRouter();
  const { signIn, resetPasswordForEmail } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [needsConfirmation, setNeedsConfirmation] = useState(false);

  // Forgot password modal state
  const [resetModalVisible, setResetModalVisible] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetSending, setResetSending] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      setErrorMessage('Please enter both your email and password.');
      return;
    }

    setLoading(true);
    setErrorMessage(null);
    setNeedsConfirmation(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const { error } = await signIn(email, password);
    setLoading(false);

    if (error) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      const msg = error.message || 'Failed to sign in. Please check your credentials.';
      if (msg.toLowerCase().includes('email not confirmed')) {
        setNeedsConfirmation(true);
        setErrorMessage('Your email address is not verified yet. Enter your 6-digit verification code to finish setting up your account.');
      } else {
        setErrorMessage(msg);
      }
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      // Navigation is automatically handled by RootLayout based on auth state and role!
    }
  };

  const handleOpenEmailVerification = () => {
    if (!email.trim()) return;
    router.push({
      pathname: '/(auth)/verify-email' as any,
      params: { email: email.trim(), autoResend: '1' },
    });
  };

  const handleSendPasswordReset = async () => {
    if (!resetEmail.trim()) {
      Alert.alert('Email Required', 'Please enter the email address associated with your account.');
      return;
    }
    setResetSending(true);
    const { error } = await resetPasswordForEmail(resetEmail);
    setResetSending(false);
    if (error) {
      Alert.alert('Reset Failed', error.message);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setResetModalVisible(false);
      router.push({
        pathname: '/(auth)/reset-password' as any,
        params: { email: resetEmail.trim() },
      });
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
            <Text style={styles.title}>Welcome Back</Text>
            <Text style={styles.subtitle}>Sign in to continue your Arnis journey and training sessions.</Text>
          </View>

          {/* Error Banner */}
          {errorMessage && (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={18} color="#DC2626" />
              <View style={{ flex: 1, gap: 6 }}>
                <Text style={styles.errorText}>{errorMessage}</Text>
                {needsConfirmation && (
                  <TouchableOpacity onPress={handleOpenEmailVerification} disabled={loading}>
                    <Text style={styles.resendLinkText}>Verify Email with 6-Digit Code</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}

          {/* Form */}
          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>EMAIL ADDRESS</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="mail-outline" size={20} color="#7D8C84" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Enter your email"
                  placeholderTextColor="#9CA3AF"
                  autoCapitalize="none"
                  keyboardType="email-address"
                  value={email}
                  onChangeText={setEmail}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>PASSWORD</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="lock-closed-outline" size={20} color="#7D8C84" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Enter your password"
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

            <TouchableOpacity
              style={styles.forgotPasswordBtn}
              onPress={() => {
                setResetEmail(email.trim());
                setResetModalVisible(true);
              }}>
              <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.submitButton, loading && styles.submitButtonDisabled]}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.88}>
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Text style={styles.submitButtonText}>Sign In</Text>
                  <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Register Prompt */}
          <View style={styles.footerRow}>
            <Text style={styles.footerText}>{"Don't have an account yet? "}</Text>
            <TouchableOpacity onPress={() => router.push('/(auth)/register' as any)}>
              <Text style={styles.registerLink}>Register</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Forgot Password Modal */}
      <Modal
        visible={resetModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setResetModalVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Reset Password</Text>
            <Text style={styles.modalDesc}>
              Enter the email linked to your account and we will send a 6-digit password reset code.
            </Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="mail-outline" size={20} color="#7D8C84" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="name@example.com"
                placeholderTextColor="#9CA3AF"
                autoCapitalize="none"
                keyboardType="email-address"
                value={resetEmail}
                onChangeText={setResetEmail}
              />
            </View>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setResetModalVisible(false)}
                disabled={resetSending}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSendBtn, resetSending && styles.submitButtonDisabled]}
                onPress={handleSendPasswordReset}
                disabled={resetSending}>
                {resetSending ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalSendText}>Send Reset Code</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    marginBottom: 20,
  },
  header: {
    marginBottom: 24,
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
    gap: 16,
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
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  resendLinkText: {
    fontSize: 12,
    fontWeight: '800',
    color: MartialTheme.colors.primaryDark,
    textDecorationLine: 'underline',
  },
  forgotPasswordBtn: {
    alignSelf: 'flex-end',
    paddingVertical: 2,
  },
  forgotPasswordText: {
    fontSize: 13,
    fontWeight: '700',
    color: MartialTheme.colors.primary,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 20,
    gap: 14,
  },
  modalTitle: {
    fontSize: 19,
    fontWeight: '900',
    color: MartialTheme.colors.text,
  },
  modalDesc: {
    fontSize: 13,
    color: MartialTheme.colors.textSecondary,
    lineHeight: 19,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 4,
  },
  modalCancelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
  },
  modalCancelText: {
    fontSize: 13,
    fontWeight: '700',
    color: MartialTheme.colors.textSecondary,
  },
  modalSendBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: MartialTheme.colors.primary,
    minWidth: 120,
    alignItems: 'center',
  },
  modalSendText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 28,
  },
  footerText: {
    fontSize: 14,
    color: MartialTheme.colors.textSecondary,
  },
  registerLink: {
    fontSize: 14,
    fontWeight: '800',
    color: MartialTheme.colors.primary,
  },
});
