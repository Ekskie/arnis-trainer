import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MartialTheme } from '@/constants/theme';

export interface SectionHeaderProps {
  label?: string; // Uppercase tag e.g. "LEVEL 0 ORIENTATION"
  title: string;  // Main heading e.g. "Today's Training"
  actionText?: string;
  onAction?: () => void;
  style?: ViewStyle;
}

export function SectionHeader({
  label,
  title,
  actionText,
  onAction,
  style,
}: SectionHeaderProps) {
  return (
    <View style={[styles.container, style]}>
      <View style={styles.titleColumn}>
        {label && <Text style={styles.label}>{label}</Text>}
        <Text style={styles.title}>{title}</Text>
      </View>

      {actionText && onAction && (
        <TouchableOpacity
          onPress={onAction}
          activeOpacity={0.75}
          style={styles.actionBtn}
        >
          <Text style={styles.actionText}>{actionText}</Text>
          <Ionicons name="arrow-forward" size={13} color={MartialTheme.colors.bamboo} style={{ marginLeft: 3 }} />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginBottom: MartialTheme.spacing.md,
    marginTop: MartialTheme.spacing.sm,
  },
  titleColumn: {
    flex: 1,
  },
  label: {
    fontSize: 11,
    fontWeight: '800',
    color: MartialTheme.colors.bamboo,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: MartialTheme.colors.text,
    letterSpacing: 0.2,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 2,
    paddingLeft: 8,
  },
  actionText: {
    fontSize: 13,
    fontWeight: '700',
    color: MartialTheme.colors.bamboo,
  },
});
