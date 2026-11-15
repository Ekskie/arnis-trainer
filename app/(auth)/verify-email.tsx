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

export default function VerifyEmailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ email?: string; autoResend?: string }>();
  const { verifySignupOtp, resendConfirmationEmail } = useAuth();

  const initialEmail = typeof params.email === 'string' ? params.email.trim() : '';
  const shouldAutoResend = params.autoResend === '1';

  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusBanner, setStatusBanner] = useState<string | null>(null);

  const autoResentRef = useRef(false);
  const { secondsLeft, isCoolingDown, startCooldown } = useResendCooldown(
    shouldAutoResend ? 0 : 60
  );

  useEffect(() => {
    if (shouldAutoResend && initialEmail && !autoResentRef.current) {
      autoResentRef.current = true;
      setResending(true);
      resendConfirmationEmail(initialEmail)
        .then(({ error }) => {
          if (error) {
            setErrorMessage(error.message);
          } else {
            setStatusBanner(`A fresh 6-digit verification code was sent to ${initialEmail}.`);
            startCooldown(60);
          }
        })
        .finally(() => setResending(false));
    }
  }, [shouldAutoResend, initialEmail, resendConfirmationEmail, startCooldown]);

  const handleVerify = async () => {
    const cleanEmail = email.trim();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setErrorMessage('Please enter the email address you registered with.');
      return;
    }
    if (code.length < 6) {
      setErrorMessage('Please enter the complete 6-digit code from your email.');
      return;
    }

    setVerifying(true);
    setErrorMessage(null);
    setStatusBanner(null);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const { error } = await verifySignupOtp(cleanEmail, code);
    setVerifying(false);

    if (error) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setErrorMessage(
        error.message || 'Invalid or expired verification code. Please check and try again.'
      );
      return;
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
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

    const { error } = await resendConfirmationEmail(cleanEmail);
    setResending(false);

    if (error) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Resend Failed', error.message);
      return;
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setCode('');
    setStatusBanner(`A new 6-digit code was sent to ${cleanEmail}.`);
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
            onPress={() => router.replace('/(auth)/login' as any)}
            activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={22} color={MartialTheme.colors.text} />
          </TouchableOpacity>

          <View style={styles.card}>
            {/* Dual-tone top brand bar */}
            <View style={styles.topAccentBar}>
              <View style={styles.topAccentGreen} />
              <View style={styles.topAccentGold} />
            </View>

            <View style={styles.cardBody}>
              {/* Centered double-ring medallion */}
              <View style={styles.medallionOuter}>
                <View style={styles.medallionInner}>
                  <Ionicons name="mail-open-outline" size={26} color="#FFFFFF" />
                </View>
              </View>

              <View style={styles.eyebrowPill}>
                <Text style={styles.eyebrowText}>EMAIL VERIFICATION</Text>
              </View>

              <Text style={styles.title}>Verify Your Email</Text>
              <Text style={styles.subtitle}>
                Enter the 6-digit verification code we sent to your inbox to activate your PoseFix Arnis account.
              </Text>

              {initialEmail ? (
                <View style={styles.emailPill}>
                  <Ionicons name="mail" size={14} color={MartialTheme.colors.primary} />
                  <Text style={styles.emailPillText} numberOfLines={1}>
                    {email}
                  </Text>
                </View>
              ) : (
                <View style={styles.emailFallbackGroup}>
                  <Text style={styles.fieldLabel}>ACCOUNT EMAIL</Text>
                  <View style={styles.emailInputWrapper}>
                    <Ionicons name="mail-outline" size={18} color="#7D8C84" />
                    <TextInput
                      style={styles.emailInput}
                      placeholder="name@example.com"
                      placeholderTextColor="#9CA3AF"
                      autoCapitalize="none"
                      keyboardType="email-address"
                      value={email}
                      onChangeText={setEmail}
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

              {errorMessage && (
                <View style={styles.errorBox}>
                  <Ionicons name="alert-circle" size={18} color={MartialTheme.colors.crimson} />
                  <Text style={styles.errorText}>{errorMessage}</Text>
                </View>
              )}

              <View style={styles.otpSection}>
                <Text style={styles.fieldLabel}>6-DIGIT VERIFICATION CODE</Text>
                <OtpCodeInput
                  value={code}
                  onChange={(next) => {
                    setCode(next);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  hasError={Boolean(errorMessage)}
                  disabled={verifying}
                />
              </View>

              <TouchableOpacity
                style={[
                  styles.submitButton,
                  (verifying || code.length < 6) && styles.submitButtonDisabled,
                ]}
                onPress={handleVerify}
                disabled={verifying || code.length < 6}
                activeOpacity={0.88}>
                {verifying ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <Text style={styles.submitButtonText}>Verify & Enter Dojo</Text>
                    <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
                  </>
                )}
              </TouchableOpacity>

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
                      ? `Resend code in ${secondsLeft}s`
                      : 'Resend 6-digit code'}
                  </Text>
                )}
              </TouchableOpacity>

              <View style={styles.tipBox}>
                <Text style={styles.tipText}>
                  Can’t find it? Check your spam or junk folder, or wait a moment before requesting a new code.
                </Text>
              </View>
            </View>
          </View>

          <TouchableOpacity
            style={styles.footerBackLink}
            onPress={() => router.replace('/(auth)/login' as any)}
            activeOpacity={0.7}>
            <Text style={styles.footerBackText}>Back to Sign In</Text>
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
    backgroundColor: MartialTheme.colors.primaryMuted,
    borderWidth: 2,
    borderColor: '#BBF7D0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  medallionInner: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: MartialTheme.colors.primary,
    borderBottomWidth: 3,
    borderBottomColor: MartialTheme.colors.border3DPrimary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eyebrowPill: {
    backgroundColor: MartialTheme.colors.bambooMuted,
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 9999,
    paddingHorizontal: 14,
    paddingVertical: 5,
    marginBottom: 12,
  },
  eyebrowText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    color: '#B45309',
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
  emailFallbackGroup: {
    width: '100%',
    gap: 6,
    marginBottom: 18,
  },
  emailInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: MartialTheme.colors.background,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: MartialTheme.colors.border,
    paddingHorizontal: 12,
    height: 48,
  },
  emailInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: MartialTheme.colors.text,
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
    marginBottom: 22,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    color: MartialTheme.colors.textSecondary,
    textAlign: 'center',
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
    paddingVertical: 14,
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
  tipBox: {
    width: '100%',
    backgroundColor: MartialTheme.colors.background,
    borderWidth: 1,
    borderColor: MartialTheme.colors.border,
    borderRadius: 12,
    padding: 12,
    marginTop: 4,
  },
  tipText: {
    fontSize: 12,
    lineHeight: 18,
    color: MartialTheme.colors.textSecondary,
    textAlign: 'center',
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
