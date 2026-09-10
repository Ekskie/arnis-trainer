import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  ViewStyle,
  TextStyle,
  StyleProp,
  ActivityIndicator,
} from 'react-native';
import { MartialTheme } from '@/constants/theme';

export type TactileButtonVariant = 'primary' | 'bamboo' | 'flame' | 'secondary' | 'outline';

interface TactileButtonProps {
  title: string;
  onPress: () => void;
  variant?: TactileButtonVariant;
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  fullWidth?: boolean;
}

export function TactileButton({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  icon,
  disabled = false,
  loading = false,
  style,
  textStyle,
  fullWidth = true,
}: TactileButtonProps) {
  const [isPressed, setIsPressed] = useState(false);

  const getVariantStyles = () => {
    switch (variant) {
      case 'bamboo':
        return {
          backgroundColor: MartialTheme.colors.bamboo,
          borderBottomColor: MartialTheme.colors.bambooDark,
          textColor: '#FFFFFF',
        };
      case 'flame':
        return {
          backgroundColor: MartialTheme.colors.flame,
          borderBottomColor: MartialTheme.colors.flameDark,
          textColor: '#FFFFFF',
        };
      case 'secondary':
        return {
          backgroundColor: MartialTheme.colors.backgroundSecondary,
          borderBottomColor: MartialTheme.colors.border3D,
          textColor: MartialTheme.colors.text,
        };
      case 'outline':
        return {
          backgroundColor: '#FFFFFF',
          borderBottomColor: MartialTheme.colors.border3D,
          borderColor: MartialTheme.colors.border,
          borderWidth: 2,
          textColor: MartialTheme.colors.primary,
        };
      case 'primary':
      default:
        return {
          backgroundColor: MartialTheme.colors.primary,
          borderBottomColor: MartialTheme.colors.primaryDark,
          textColor: '#FFFFFF',
        };
    }
  };

  const vConfig = getVariantStyles();

  const getSizeStyles = () => {
    switch (size) {
      case 'sm':
        return {
          paddingVertical: 10,
          paddingHorizontal: 16,
          fontSize: 13,
          bottomBorder: 3,
        };
      case 'lg':
        return {
          paddingVertical: 16,
          paddingHorizontal: 24,
          fontSize: 17,
          bottomBorder: 5,
        };
      case 'md':
      default:
        return {
          paddingVertical: 14,
          paddingHorizontal: 20,
          fontSize: 15,
          bottomBorder: 4,
        };
    }
  };

  const sConfig = getSizeStyles();

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      disabled={disabled || loading}
      onPressIn={() => setIsPressed(true)}
      onPressOut={() => setIsPressed(false)}
      onPress={onPress}
      style={[
        styles.baseButton,
        fullWidth && { width: '100%' },
        {
          backgroundColor: disabled ? '#D1D5DB' : vConfig.backgroundColor,
          borderBottomWidth: disabled ? 2 : sConfig.bottomBorder,
          borderBottomColor: disabled ? '#9CA3AF' : vConfig.borderBottomColor,
          paddingVertical: sConfig.paddingVertical,
          paddingHorizontal: sConfig.paddingHorizontal,
          transform: [{ translateY: isPressed && !disabled ? 2 : 0 }],
        },
        vConfig.borderColor ? { borderColor: vConfig.borderColor, borderWidth: 2 } : null,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={vConfig.textColor} size="small" />
      ) : (
        <>
          {icon && <>{icon}</>}
          <Text
            style={[
              styles.buttonText,
              {
                color: disabled ? '#6B7280' : vConfig.textColor,
                fontSize: sConfig.fontSize,
                marginLeft: icon ? 8 : 0,
              },
              textStyle,
            ]}
          >
            {title}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  baseButton: {
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  buttonText: {
    fontWeight: '800',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
});
