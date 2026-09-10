import React from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
  TextStyle,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { MartialTheme } from '@/constants/theme';

export interface PrimaryButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'bamboo' | 'outline' | 'crimson' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  labelStyle?: TextStyle;
  hapticFeedback?: boolean;
}

export function PrimaryButton({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  icon,
  iconPosition = 'left',
  loading = false,
  disabled = false,
  style,
  labelStyle,
  hapticFeedback = true,
}: PrimaryButtonProps) {
  const handlePress = () => {
    if (disabled || loading) return;
    if (hapticFeedback) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    onPress();
  };

  const variantStyles = {
    primary: {
      button: styles.primaryButton,
      text: styles.primaryText,
    },
    secondary: {
      button: styles.secondaryButton,
      text: styles.secondaryText,
    },
    bamboo: {
      button: styles.bambooButton,
      text: styles.bambooText,
    },
    outline: {
      button: styles.outlineButton,
      text: styles.outlineText,
    },
    crimson: {
      button: styles.crimsonButton,
      text: styles.crimsonText,
    },
    ghost: {
      button: styles.ghostButton,
      text: styles.ghostText,
    },
  }[variant];

  const sizeStyles = {
    sm: {
      button: styles.sizeSm,
      text: styles.textSm,
    },
    md: {
      button: styles.sizeMd,
      text: styles.textMd,
    },
    lg: {
      button: styles.sizeLg,
      text: styles.textLg,
    },
  }[size];

  return (
    <TouchableOpacity
      activeOpacity={0.82}
      onPress={handlePress}
      disabled={disabled || loading}
      style={[
        styles.baseButton,
        variantStyles.button,
        sizeStyles.button,
        disabled && styles.disabledButton,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'outline' || variant === 'ghost' ? MartialTheme.colors.bamboo : '#FFFFFF'}
        />
      ) : (
        <View style={styles.contentRow}>
          {icon && iconPosition === 'left' && <View style={styles.iconLeft}>{icon}</View>}
          <Text
            style={[
              styles.baseText,
              variantStyles.text,
              sizeStyles.text,
              disabled && styles.disabledText,
              labelStyle,
            ]}
          >
            {label}
          </Text>
          {icon && iconPosition === 'right' && <View style={styles.iconRight}>{icon}</View>}
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  baseButton: {
    borderRadius: MartialTheme.radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconLeft: {
    marginRight: 8,
  },
  iconRight: {
    marginLeft: 8,
  },
  baseText: {
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  // Variants
  primaryButton: {
    backgroundColor: MartialTheme.colors.primary,
    shadowColor: MartialTheme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryText: {
    color: '#06281E',
  },
  secondaryButton: {
    backgroundColor: MartialTheme.colors.cardElevated,
    borderWidth: 1,
    borderColor: MartialTheme.colors.cardBorderHighlight,
  },
  secondaryText: {
    color: MartialTheme.colors.text,
  },
  bambooButton: {
    backgroundColor: MartialTheme.colors.bamboo,
    shadowColor: MartialTheme.colors.bamboo,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  bambooText: {
    color: '#2A1F02',
  },
  outlineButton: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: MartialTheme.colors.cardBorderHighlight,
  },
  outlineText: {
    color: MartialTheme.colors.bamboo,
  },
  crimsonButton: {
    backgroundColor: MartialTheme.colors.crimson,
    shadowColor: MartialTheme.colors.crimson,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  crimsonText: {
    color: '#FFFFFF',
  },
  ghostButton: {
    backgroundColor: 'transparent',
  },
  ghostText: {
    color: MartialTheme.colors.textSecondary,
  },
  // Sizes
  sizeSm: {
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  textSm: {
    fontSize: 13,
  },
  sizeMd: {
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  textMd: {
    fontSize: 15,
  },
  sizeLg: {
    paddingVertical: 18,
    paddingHorizontal: 24,
  },
  textLg: {
    fontSize: 16,
  },
  // Disabled
  disabledButton: {
    opacity: 0.45,
  },
  disabledText: {
    color: MartialTheme.colors.textMuted,
  },
});
