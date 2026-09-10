import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View, ViewStyle } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { MartialTheme } from '@/constants/theme';

export interface CoachMessageProps {
  title?: string;
  message: string;
  type?: 'tip' | 'correction' | 'success' | 'note';
  actionLabel?: string;
  onAction?: () => void;
  style?: ViewStyle;
}

export function CoachMessage({
  title,
  message,
  type = 'note',
  actionLabel,
  onAction,
  style,
}: CoachMessageProps) {
  const getTypeConfig = () => {
    switch (type) {
      case 'success':
        return {
          defaultTitle: 'Nicely done',
          icon: <Ionicons name="checkmark-circle" size={18} color="#10B981" />,
          borderColor: 'rgba(16, 185, 129, 0.35)',
          bgColor: 'rgba(16, 185, 129, 0.08)',
          titleColor: '#10B981',
        };
      case 'correction':
        return {
          defaultTitle: 'One Thing to Improve',
          icon: <Ionicons name="alert-circle" size={18} color="#F59E0B" />,
          borderColor: 'rgba(245, 158, 11, 0.35)',
          bgColor: 'rgba(245, 158, 11, 0.08)',
          titleColor: '#F59E0B',
        };
      case 'tip':
        return {
          defaultTitle: 'Coach Advice',
          icon: <MaterialCommunityIcons name="karate" size={18} color={MartialTheme.colors.bamboo} />,
          borderColor: 'rgba(212, 175, 55, 0.35)',
          bgColor: 'rgba(212, 175, 55, 0.08)',
          titleColor: MartialTheme.colors.bamboo,
        };
      case 'note':
      default:
        return {
          defaultTitle: 'Training Note',
          icon: <Ionicons name="bulb-outline" size={18} color="#38BDF8" />,
          borderColor: 'rgba(56, 189, 248, 0.35)',
          bgColor: 'rgba(56, 189, 248, 0.08)',
          titleColor: '#38BDF8',
        };
    }
  };

  const config = getTypeConfig();

  return (
    <View
      style={[
        styles.container,
        {
          borderColor: config.borderColor,
          backgroundColor: config.bgColor,
        },
        style,
      ]}
    >
      <View style={styles.headerRow}>
        <View style={styles.iconWrap}>{config.icon}</View>
        <Text style={[styles.title, { color: config.titleColor }]}>
          {title || config.defaultTitle}
        </Text>
      </View>
      <Text style={styles.messageText}>{message}</Text>

      {actionLabel && onAction && (
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={onAction}
          activeOpacity={0.8}
        >
          <Text style={[styles.actionBtnText, { color: config.titleColor }]}>
            {actionLabel}
          </Text>
          <Ionicons name="arrow-forward" size={13} color={config.titleColor} style={{ marginLeft: 4 }} />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: MartialTheme.radii.lg,
    borderWidth: 1,
    padding: MartialTheme.spacing.md,
    marginVertical: MartialTheme.spacing.xs,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  iconWrap: {
    marginRight: 8,
  },
  title: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
    color: MartialTheme.colors.text,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    alignSelf: 'flex-start',
  },
  actionBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
});
