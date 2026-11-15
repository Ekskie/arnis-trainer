import React, { useRef, useState } from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { MartialTheme } from '@/constants/theme';

export interface OtpCodeInputProps {
  value: string;
  onChange: (code: string) => void;
  length?: number;
  accentColor?: string;
  hasError?: boolean;
  disabled?: boolean;
  autoFocus?: boolean;
}

/**
 * 6-digit segmented OTP input backed by a single overlay TextInput for reliable
 * paste, backspace, and OS one-time-code autofill across Android and iOS.
 */
export function OtpCodeInput({
  value,
  onChange,
  length = 6,
  accentColor = MartialTheme.colors.primary,
  hasError = false,
  disabled = false,
  autoFocus = true,
}: OtpCodeInputProps) {
  const inputRef = useRef<TextInput>(null);
  const [isFocused, setIsFocused] = useState(false);

  const sanitized = value.replace(/\D/g, '').slice(0, length);
  const activeIndex = Math.min(sanitized.length, length - 1);

  const handleChangeText = (text: string) => {
    const digitsOnly = text.replace(/\D/g, '').slice(0, length);
    onChange(digitsOnly);
  };

  const autofillProps = Platform.select<{
    textContentType?: 'oneTimeCode';
    autoComplete?: 'sms-otp' | 'one-time-code';
  }>({
    ios: { textContentType: 'oneTimeCode' },
    android: { autoComplete: 'sms-otp' },
    default: { autoComplete: 'one-time-code' },
  });

  return (
    <Pressable
      style={styles.wrapper}
      onPress={() => {
        if (!disabled) {
          inputRef.current?.focus();
        }
      }}>
      <View style={styles.row} pointerEvents="none">
        {Array.from({ length }).map((_, idx) => {
          const digit = sanitized[idx] || '';
          const isActive = isFocused && !disabled && idx === activeIndex;
          const isFilled = Boolean(digit);

          return (
            <View
              key={idx}
              style={[
                styles.cell,
                isFilled && styles.cellFilled,
                isActive && {
                  borderColor: accentColor,
                  borderBottomColor: accentColor,
                  backgroundColor: '#FFFFFF',
                },
                hasError && styles.cellError,
                disabled && styles.cellDisabled,
              ]}>
              <Text
                style={[
                  styles.digit,
                  hasError && styles.digitError,
                  !isFilled && styles.digitPlaceholder,
                ]}>
                {digit || (isActive ? '|' : '')}
              </Text>
            </View>
          );
        })}
      </View>

      <TextInput
        ref={inputRef}
        value={sanitized}
        onChangeText={handleChangeText}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        keyboardType="number-pad"
        maxLength={length}
        autoFocus={autoFocus}
        editable={!disabled}
        caretHidden
        selectionColor="transparent"
        contextMenuHidden={false}
        style={styles.hiddenOverlayInput}
        accessibilityLabel="Verification code"
        {...autofillProps}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'relative',
    width: '100%',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  cell: {
    flex: 1,
    maxWidth: 52,
    height: 58,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: MartialTheme.colors.cardBorder,
    borderBottomWidth: 4,
    borderBottomColor: MartialTheme.colors.border3D,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellFilled: {
    backgroundColor: '#FFFFFF',
    borderColor: MartialTheme.colors.cardBorderHighlight,
  },
  cellError: {
    backgroundColor: MartialTheme.colors.crimsonMuted,
    borderColor: MartialTheme.colors.crimson,
    borderBottomColor: MartialTheme.colors.crimsonDark,
  },
  cellDisabled: {
    opacity: 0.65,
  },
  digit: {
    fontSize: 24,
    fontWeight: '900',
    color: MartialTheme.colors.text,
  },
  digitPlaceholder: {
    color: MartialTheme.colors.textMuted,
    fontWeight: '400',
  },
  digitError: {
    color: MartialTheme.colors.crimsonDark,
  },
  hiddenOverlayInput: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.015,
    fontSize: 24,
    color: 'transparent',
  },
});
