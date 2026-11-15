import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { MartialTheme } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { OtpCodeInput } from '@/components/ui/OtpCodeInput';
import { useResendCooldown } from '@/hooks/useResendCooldown';

export default function ResetPasswordScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ email?: string }>();
  const {
    resetPasswordForEmail,
    beginPasswordRecovery,
    cancelPasswordRecovery,
    verifyRecoveryAndUpdatePassword,
  } = useAuth();

  const initialEmail = typeof params.email === 'string' ? params.email.trim() : '';

  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [otpVerified, setOtpVerified] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusBanner, setStatusBanner] = useState<string | null>(null);

  const succeededRef = useRef(false);
  const { secondsLeft, isCoolingDown, startCooldown } = useResendCooldown(60);

  useEffect(() => {
    beginPasswordRecovery();
    return () => {
      if (!succeededRef.current) {
        cancelPasswordRecovery();
      }
    };
    // Run only on mount/unmount to hold recovery lock cleanly
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCancel = async () => {
    await cancelPasswordRecovery();
    router.replace('/(auth)/login' as any);
  };

  const handleSubmit = async () => {
    const cleanEmail = email.trim();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setErrorMessage('Please enter your account email address.');
      return;
    }
    if (!otpVerified && code.length < 6) {
      setErrorMessage('Please enter the 6-digit reset code from your email.');
      return;
    }
    if (newPassword.length < 6) {
      setErrorMessage('New password must be at least 6 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMessage('Passwords do not match. Please re-check.');
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);
    setStatusBanner(null);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const { error, otpVerified: didVerifyOtp } = await verifyRecoveryAndUpdatePassword(
      cleanEmail,
      code,
      newPassword,
      otpVerified
    );

    setSubmitting(false);
    if (didVerifyOtp) {
      setOtpVerified(true);
    }

    if (error) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setErrorMessage(error.message || 'Unable to reset password. Please check your code and try again.');
      return;
    }

    succeededRef.current = true;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert('Password Updated', 'Your password has been reset and you are now signed in.');
  };

  const handleResend = async () => {
    const cleanEmail = email.trim();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setErrorMessage('Please enter a valid email address first.');
      return;
    }

    setResending(true);
    setErrorMessage(null);
    setStatusBanner(null);

    const { error } = await resetPasswordForEmail(cleanEmail);
    setResending(false);

    if (error) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Resend Failed', error.message);
      return;
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setCode('');
    setStatusBanner(`A new 6-digit reset code was sent to ${cleanEmail}.`);
    startCooldown(60);
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled">
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleCancel}
            activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={22} color={MartialTheme.colors.text} />
          </TouchableOpacity>

          <View style={styles.card}>
            <View style={styles.topAccentBar}>
              <View style={styles.topAccentGreen} />
              <View style={styles.topAccentGold} />
            </View>

            <View style={styles.cardBody}>
              <View style={styles.medallionOuter}>
                <View style={styles.medallionInner}>
                  <Ionicons name="key-outline" size={26} color="#FFFFFF" />
                </View>
              </View>

              <View style={styles.eyebrowPill}>
                <Text style={styles.eyebrowText}>PASSWORD RESET</Text>
              </View>

              <Text style={styles.title}>Reset Your Password</Text>
              <Text style={styles.subtitle}>
                Enter the 6-digit code sent to your inbox and choose a new password for your account.
              </Text>

              {initialEmail ? (
                <View style={styles.emailPill}>
                  <Ionicons name="mail" size={14} color={MartialTheme.colors.primary} />
                  <Text style={styles.emailPillText} numberOfLines={1}>
                    {email}
                  </Text>
                </View>
              ) : (
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>ACCOUNT EMAIL</Text>
                  <View style={styles.inputWrapper}>
                    <Ionicons name="mail-outline" size={18} color="#7D8C84" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="name@example.com"
                      placeholderTextColor="#9CA3AF"
                      autoCapitalize="none"
                      keyboardType="email-address"
                      value={email}
                      onChangeText={setEmail}
                      editable={!otpVerified}
                    />
                  </View>
                </View>
              )}

              {statusBanner && (
                <View style={styles.statusBanner}>
                  <Ionicons name="checkmark-circle" size={16} color={MartialTheme.colors.primary} />
                  <Text style={styles.statusBannerText}>{statusBanner}</Text>
                </View>
              )}

              {otpVerified && (
                <View style={styles.statusBanner}>
                  <Ionicons name="shield-checkmark" size={16} color={MartialTheme.colors.primary} />
                  <Text style={styles.statusBannerText}>
                    Reset code verified. Enter your new password below to finish.
                  </Text>
                </View>
              )}

              {errorMessage && (
                <View style={styles.errorBox}>
                  <Ionicons name="alert-circle" size={18} color={MartialTheme.colors.crimson} />
                  <Text style={styles.errorText}>{errorMessage}</Text>
                </View>
              )}

              {!otpVerified && (
                <View style={styles.otpSection}>
                  <Text style={styles.otpLabel}>6-DIGIT RESET CODE</Text>
                  <OtpCodeInput
                    value={code}
                    onChange={(next) => {
                      setCode(next);
                      if (errorMessage) setErrorMessage(null);
                    }}
                    hasError={Boolean(errorMessage) && !otpVerified}
                    disabled={submitting}
                  />
                </View>
              )}

              <View style={styles.form}>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>NEW PASSWORD</Text>
                  <View style={styles.inputWrapper}>
                    <Ionicons name="lock-closed-outline" size={18} color="#7D8C84" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="Minimum 6 characters"
                      placeholderTextColor="#9CA3AF"
                      secureTextEntry={!showNewPassword}
                      value={newPassword}
                      onChangeText={setNewPassword}
                    />
                    <TouchableOpacity
                      style={styles.eyeButton}
                      onPress={() => setShowNewPassword((prev) => !prev)}>
                      <Ionicons
                        name={showNewPassword ? 'eye-off-outline' : 'eye-outline'}
                        size={20}
                        color="#7D8C84"
                      />
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>CONFIRM NEW PASSWORD</Text>
                  <View style={styles.inputWrapper}>
                    <Ionicons name="shield-checkmark-outline" size={18} color="#7D8C84" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="Re-enter your new password"
                      placeholderTextColor="#9CA3AF"
                      secureTextEntry={!showConfirmPassword}
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                    />
                    <TouchableOpacity
                      style={styles.eyeButton}
                      onPress={() => setShowConfirmPassword((prev) => !prev)}>
                      <Ionicons
                        name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                        size={20}
                        color="#7D8C84"
                      />
                    </TouchableOpacity>
                  </View>
                </View>

                <TouchableOpacity
                  style={[
                    styles.submitButton,
                    (submitting || (!otpVerified && code.length < 6)) && styles.submitButtonDisabled,
                  ]}
                  onPress={handleSubmit}
                  disabled={submitting || (!otpVerified && code.length < 6)}
                  activeOpacity={0.88}>
                  {submitting ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <>
                      <Text style={styles.submitButtonText}>Reset Password & Sign In</Text>
                      <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
                    </>
                  )}
                </TouchableOpacity>
              </View>

              {!otpVerified && (
                <TouchableOpacity
                  style={styles.resendBtn}
                  onPress={handleResend}
                  disabled={resending || isCoolingDown}
                  activeOpacity={0.75}>
                  {resending ? (
                    <ActivityIndicator size="small" color={MartialTheme.colors.primary} />
                  ) : (
                    <Text
                      style={[
                        styles.resendBtnText,
                        isCoolingDown && styles.resendBtnTextMuted,
                      ]}>
                      {isCoolingDown
                        ? `Resend reset code in ${secondsLeft}s`
                        : 'Resend 6-digit code'}
                    </Text>
                  )}
                </TouchableOpacity>
              )}
            </View>
          </View>

          <TouchableOpacity
            style={styles.footerBackLink}
            onPress={handleCancel}
            activeOpacity={0.7}>
            <Text style={styles.footerBackText}>Cancel & Back to Sign In</Text>
          </TouchableOpacity>
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
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 36,
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
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: MartialTheme.colors.cardBorder,
    borderBottomWidth: 4,
    borderBottomColor: MartialTheme.colors.border3D,
    overflow: 'hidden',
  },
  topAccentBar: {
    flexDirection: 'row',
    height: 6,
    width: '100%',
  },
  topAccentGreen: {
    flex: 0.72,
    backgroundColor: MartialTheme.colors.primary,
  },
  topAccentGold: {
    flex: 0.28,
    backgroundColor: MartialTheme.colors.bamboo,
  },
  cardBody: {
    paddingHorizontal: 22,
    paddingTop: 28,
    paddingBottom: 24,
    alignItems: 'center',
  },
  medallionOuter: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: MartialTheme.colors.flameMuted,
    borderWidth: 2,
    borderColor: '#FED7AA',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  medallionInner: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: MartialTheme.colors.flame,
    borderBottomWidth: 3,
    borderBottomColor: MartialTheme.colors.flameDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eyebrowPill: {
    backgroundColor: MartialTheme.colors.flameMuted,
    borderWidth: 1,
    borderColor: '#FED7AA',
    borderRadius: 9999,
    paddingHorizontal: 14,
    paddingVertical: 5,
    marginBottom: 12,
  },
  eyebrowText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    color: MartialTheme.colors.flameDark,
  },
  title: {
    fontSize: 25,
    fontWeight: '900',
    color: MartialTheme.colors.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: MartialTheme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 16,
  },
  emailPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 9999,
    paddingHorizontal: 14,
    paddingVertical: 7,
    marginBottom: 20,
    maxWidth: '100%',
  },
  emailPillText: {
    fontSize: 13,
    fontWeight: '800',
    color: MartialTheme.colors.primaryDark,
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    width: '100%',
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  statusBannerText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: MartialTheme.colors.primaryDark,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    width: '100%',
    backgroundColor: MartialTheme.colors.crimsonMuted,
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: MartialTheme.colors.crimson,
  },
  otpSection: {
    width: '100%',
    gap: 10,
    marginBottom: 20,
  },
  otpLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    color: MartialTheme.colors.textSecondary,
    textAlign: 'center',
  },
  form: {
    width: '100%',
    gap: 14,
  },
  inputGroup: {
    width: '100%',
    gap: 6,
    marginBottom: 2,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    color: MartialTheme.colors.textSecondary,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: MartialTheme.colors.background,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: MartialTheme.colors.border,
    paddingHorizontal: 14,
    height: 50,
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
    width: '100%',
    height: 54,
    borderRadius: 14,
    backgroundColor: MartialTheme.colors.primary,
    borderBottomWidth: 4,
    borderBottomColor: MartialTheme.colors.border3DPrimary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 4,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  resendBtn: {
    paddingTop: 14,
    paddingBottom: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resendBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: MartialTheme.colors.primary,
  },
  resendBtnTextMuted: {
    color: MartialTheme.colors.textMuted,
  },
  footerBackLink: {
    alignSelf: 'center',
    paddingVertical: 18,
  },
  footerBackText: {
    fontSize: 14,
    fontWeight: '800',
    color: MartialTheme.colors.primary,
  },
});
