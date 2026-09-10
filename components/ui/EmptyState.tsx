import React from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MartialTheme } from '@/constants/theme';
import { PrimaryButton } from './PrimaryButton';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  style?: ViewStyle;
}

export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  style,
}: EmptyStateProps) {
  return (
    <View style={[styles.container, style]}>
      <View style={styles.iconCircle}>
        {icon || <Ionicons name="sparkles-outline" size={28} color={MartialTheme.colors.bamboo} />}
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>

      {actionLabel && onAction && (
        <PrimaryButton
          label={actionLabel}
          onPress={onAction}
          variant="bamboo"
          size="sm"
          style={styles.actionButton}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: MartialTheme.spacing.xl,
    backgroundColor: MartialTheme.colors.card,
    borderRadius: MartialTheme.radii.xl,
    borderWidth: 1,
    borderColor: MartialTheme.colors.cardBorder,
    marginVertical: MartialTheme.spacing.md,
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: MartialTheme.colors.cardElevated,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: MartialTheme.spacing.md,
    borderWidth: 1,
    borderColor: MartialTheme.colors.cardBorderHighlight,
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    color: MartialTheme.colors.text,
    textAlign: 'center',
    marginBottom: 6,
    letterSpacing: 0.2,
  },
  description: {
    fontSize: 13,
    color: MartialTheme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 19,
    maxWidth: 280,
    marginBottom: MartialTheme.spacing.md,
  },
  actionButton: {
    marginTop: 4,
  },
});
