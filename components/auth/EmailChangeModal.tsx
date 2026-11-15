import React, { useEffect, useState } from 'react';
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
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { MartialTheme } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { OtpCodeInput } from '@/components/ui/OtpCodeInput';
import { useResendCooldown } from '@/hooks/useResendCooldown';

export interface EmailChangeModalProps {
  visible: boolean;
  onClose: () => void;
  currentEmail: string;
  placeholder?: string;
  accentColor?: string;
  accentBorderColor?: string;
}

type EmailStep = 'enter-email' | 'verify-otp';
type TargetInbox = 'new' | 'current';

/**
 * Shared profile modal for initiating and verifying email changes via 6-digit OTP.
 * Automatically adapts to Supabase single-email or Secure Email Change (two-step) flows.
 */
export default function EmailChangeModal({
  visible,
  onClose,
  currentEmail,
  placeholder = 'e.g. warrior@arnis.ph',
  accentColor = MartialTheme.colors.primary,
  accentBorderColor = MartialTheme.colors.border3DPrimary,
}: EmailChangeModalProps) {
  const { updateEmail, verifyEmailChangeOtp } = useAuth();

  const [step, setStep] = useState<EmailStep>('enter-email');
  const [newEmailInput, setNewEmailInput] = useState(currentEmail);
  const [activeCurrentEmail, setActiveCurrentEmail] = useState(currentEmail);
  const [pendingNewEmail, setPendingNewEmail] = useState('');
  const [targetInbox, setTargetInbox] = useState<TargetInbox>('new');
  const [verifiedInboxes, setVerifiedInboxes] = useState<TargetInbox[]>([]);

  const [code, setCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  const { secondsLeft, isCoolingDown, startCooldown } = useResendCooldown(0);

  useEffect(() => {
    if (visible) {
      setStep('enter-email');
      setNewEmailInput(currentEmail);
      setActiveCurrentEmail(currentEmail);
      setPendingNewEmail('');
      setTargetInbox('new');
      setVerifiedInboxes([]);
      setCode('');
      setSubmitting(false);
      setResending(false);
      setErrorMessage(null);
      setInfoMessage(null);
    }
  }, [visible, currentEmail]);

  const targetEmailAddress =
    targetInbox === 'new' ? pendingNewEmail : activeCurrentEmail;

  const handleRequestEmailChange = async () => {
    const cleanNew = newEmailInput.trim();
    if (!cleanNew || !cleanNew.includes('@')) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }
    if (cleanNew.toLowerCase() === currentEmail.trim().toLowerCase()) {
      setErrorMessage('Please enter a different email address than your current one.');
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);
    setInfoMessage(null);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const { error, currentEmail: resolvedCurrent, pendingNewEmail: resolvedPending } =
      await updateEmail(cleanNew);
    setSubmitting(false);

    if (error) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setErrorMessage(error.message);
      return;
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    if (!resolvedPending) {
      onClose();
      Alert.alert('Email Updated', `Your account email has been updated to ${cleanNew}.`);
      return;
    }

    setActiveCurrentEmail(resolvedCurrent || currentEmail);
    setPendingNewEmail(resolvedPending);
    setVerifiedInboxes([]);
    setTargetInbox('new');
    setCode('');
    setStep('verify-otp');
    setInfoMessage(`We sent a 6-digit confirmation code to ${resolvedPending}.`);
    startCooldown(60);
  };

  const handleVerifyCode = async () => {
    if (code.length < 6) {
      setErrorMessage('Please enter the complete 6-digit code.');
      return;
    }
    if (!targetEmailAddress) {
      setErrorMessage('Missing target email address. Please restart email change.');
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);
    setInfoMessage(null);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const { error, completed, currentEmail: updatedCurrent, pendingNewEmail: remainingPending } =
      await verifyEmailChangeOtp(targetEmailAddress, code);
    setSubmitting(false);

    if (error) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setErrorMessage(error.message || 'Invalid or expired code. Please try again.');
      return;
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    if (completed) {
      onClose();
      Alert.alert(
        'Email Updated',
        `Your account email has been verified and updated to ${updatedCurrent || pendingNewEmail}.`
      );
      return;
    }

    // Secure Email Change requires confirming both current and new email addresses
    const nextVerified = [...verifiedInboxes, targetInbox];
    setVerifiedInboxes(nextVerified);
    const nextInbox: TargetInbox = targetInbox === 'new' ? 'current' : 'new';
    const nextEmail = nextInbox === 'new' ? remainingPending || pendingNewEmail : updatedCurrent || activeCurrentEmail;

    setTargetInbox(nextInbox);
    setCode('');
    setInfoMessage(
      `First email confirmed! Secure Email Change is enabled—now enter the 6-digit code sent to ${nextEmail}.`
    );
  };

  const handleResend = async () => {
    if (!pendingNewEmail) return;
    setResending(true);
    setErrorMessage(null);
    const { error } = await updateEmail(pendingNewEmail);
    setResending(false);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setCode('');
    setInfoMessage('A fresh 6-digit code has been sent.');
    startCooldown(60);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.modalOverlay}>
        <View style={styles.modalSheet}>
          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {step === 'enter-email' ? 'Update Email Address' : 'Verify Email Change'}
              </Text>
              <TouchableOpacity onPress={onClose} activeOpacity={0.7}>
                <Ionicons name="close" size={24} color={MartialTheme.colors.text} />
              </TouchableOpacity>
            </View>

            {errorMessage && (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle" size={16} color={MartialTheme.colors.crimson} />
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            )}

            {infoMessage && (
              <View style={styles.infoBox}>
                <Ionicons name="checkmark-circle" size={16} color={MartialTheme.colors.primary} />
                <Text style={styles.infoText}>{infoMessage}</Text>
              </View>
            )}

            {step === 'enter-email' ? (
              <>
                <Text style={styles.helperDesc}>
                  We will send a 6-digit confirmation code to verify your new email address inside the app.
                </Text>

                <Text style={styles.modalLabel}>NEW EMAIL ADDRESS</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder={placeholder}
                  placeholderTextColor="#9CA3AF"
                  value={newEmailInput}
                  onChangeText={(text) => {
                    setNewEmailInput(text);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />

                <TouchableOpacity
                  style={[
                    styles.modalSaveBtn,
                    { backgroundColor: accentColor, borderBottomColor: accentBorderColor },
                    submitting && styles.btnDisabled,
                  ]}
                  onPress={handleRequestEmailChange}
                  disabled={submitting}
                  activeOpacity={0.85}>
                  {submitting ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Ionicons name="mail" size={18} color="#FFFFFF" />
                      <Text style={styles.modalSaveBtnText}>Send Verification Code</Text>
                    </>
                  )}
                </TouchableOpacity>
              </>
            ) : (
              <>
                <View style={styles.targetEmailPill}>
                  <Ionicons name="mail-open-outline" size={15} color={accentColor} />
                  <Text style={styles.targetEmailText} numberOfLines={1}>
                    {targetEmailAddress}
                  </Text>
                </View>

                {activeCurrentEmail &&
                  activeCurrentEmail.toLowerCase() !== pendingNewEmail.toLowerCase() &&
                  verifiedInboxes.length === 0 && (
                    <View style={styles.inboxSwitcher}>
                      <TouchableOpacity
                        style={[
                          styles.inboxChip,
                          targetInbox === 'new' && { borderColor: accentColor, backgroundColor: '#FAF8F3' },
                        ]}
                        onPress={() => {
                          setTargetInbox('new');
                          setCode('');
                          setErrorMessage(null);
                        }}>
                        <Text
                          style={[
                            styles.inboxChipText,
                            targetInbox === 'new' && { color: accentColor },
                          ]}>
                          New Email Code
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.inboxChip,
                          targetInbox === 'current' && { borderColor: accentColor, backgroundColor: '#FAF8F3' },
                        ]}
                        onPress={() => {
                          setTargetInbox('current');
                          setCode('');
                          setErrorMessage(null);
                        }}>
                        <Text
                          style={[
                            styles.inboxChipText,
                            targetInbox === 'current' && { color: accentColor },
                          ]}>
                          Current Email Code
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}

                <Text style={styles.otpLabel}>ENTER 6-DIGIT VERIFICATION CODE</Text>
                <OtpCodeInput
                  value={code}
                  onChange={(next) => {
                    setCode(next);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  accentColor={accentColor}
                  hasError={Boolean(errorMessage)}
                  disabled={submitting}
                />

                <TouchableOpacity
                  style={[
                    styles.modalSaveBtn,
                    { backgroundColor: accentColor, borderBottomColor: accentBorderColor, marginTop: 18 },
                    (submitting || code.length < 6) && styles.btnDisabled,
                  ]}
                  onPress={handleVerifyCode}
                  disabled={submitting || code.length < 6}
                  activeOpacity={0.85}>
                  {submitting ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
                      <Text style={styles.modalSaveBtnText}>Confirm Email Code</Text>
                    </>
                  )}
                </TouchableOpacity>

                <View style={styles.secondaryActionsRow}>
                  <TouchableOpacity
                    onPress={() => {
                      setStep('enter-email');
                      setCode('');
                      setErrorMessage(null);
                      setInfoMessage(null);
                    }}
                    disabled={submitting}>
                    <Text style={styles.secondaryLinkText}>Change Email</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={handleResend}
                    disabled={resending || isCoolingDown}>
                    {resending ? (
                      <ActivityIndicator size="small" color={accentColor} />
                    ) : (
                      <Text
                        style={[
                          styles.secondaryLinkText,
                          { color: isCoolingDown ? MartialTheme.colors.textMuted : accentColor },
                        ]}>
                        {isCoolingDown ? `Resend in ${secondsLeft}s` : 'Resend Code'}
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              </>
            )}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 22,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    maxHeight: '88%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 19,
    fontWeight: '900',
    color: MartialTheme.colors.text,
  },
  helperDesc: {
    fontSize: 13,
    lineHeight: 19,
    color: MartialTheme.colors.textSecondary,
    marginBottom: 14,
  },
  modalLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    color: MartialTheme.colors.textSecondary,
    marginBottom: 6,
  },
  modalInput: {
    backgroundColor: MartialTheme.colors.background,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: MartialTheme.colors.border,
    paddingHorizontal: 14,
    height: 48,
    fontSize: 15,
    fontWeight: '600',
    color: MartialTheme.colors.text,
    marginBottom: 18,
  },
  modalSaveBtn: {
    height: 52,
    borderRadius: 14,
    borderBottomWidth: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  modalSaveBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  btnDisabled: {
    opacity: 0.6,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: MartialTheme.colors.crimsonMuted,
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 12,
    padding: 11,
    marginBottom: 12,
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: MartialTheme.colors.crimson,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 12,
    padding: 11,
    marginBottom: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: MartialTheme.colors.primaryDark,
  },
  targetEmailPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    gap: 6,
    backgroundColor: MartialTheme.colors.background,
    borderWidth: 1,
    borderColor: MartialTheme.colors.border,
    borderRadius: 9999,
    paddingHorizontal: 14,
    paddingVertical: 7,
    marginBottom: 14,
    maxWidth: '100%',
  },
  targetEmailText: {
    fontSize: 13,
    fontWeight: '800',
    color: MartialTheme.colors.text,
  },
  inboxSwitcher: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  inboxChip: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: MartialTheme.colors.border,
    alignItems: 'center',
  },
  inboxChipText: {
    fontSize: 12,
    fontWeight: '800',
    color: MartialTheme.colors.textSecondary,
  },
  otpLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    color: MartialTheme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: 10,
  },
  secondaryActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 14,
    paddingHorizontal: 4,
  },
  secondaryLinkText: {
    fontSize: 13,
    fontWeight: '800',
    color: MartialTheme.colors.textSecondary,
  },
});
