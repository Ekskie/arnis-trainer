import React from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';
import { MartialTheme } from '@/constants/theme';

export interface ProgressBarProps {
  progress: number; // 0 to 100
  label?: string;
  subLabel?: string;
  color?: string;
  trackColor?: string;
  height?: number;
  style?: ViewStyle;
  showPercentage?: boolean;
}

export function ProgressBar({
  progress,
  label,
  subLabel,
  color = MartialTheme.colors.primary,
  trackColor = MartialTheme.colors.cardElevated,
  height = 8,
  style,
  showPercentage = false,
}: ProgressBarProps) {
  const clampedProgress = Math.max(0, Math.min(100, Math.round(progress)));

  return (
    <View style={[styles.container, style]}>
      {(label || showPercentage || subLabel) && (
        <View style={styles.headerRow}>
          {label && <Text style={styles.label}>{label}</Text>}
          {subLabel && <Text style={styles.subLabel}>{subLabel}</Text>}
          {showPercentage && <Text style={styles.percentText}>{clampedProgress}%</Text>}
        </View>
      )}

      <View style={[styles.track, { height, backgroundColor: trackColor }]}>
        <View
          style={[
            styles.fill,
            {
              width: `${clampedProgress}%`,
              backgroundColor: color,
              height,
            },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: MartialTheme.colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  subLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: MartialTheme.colors.bamboo,
  },
  percentText: {
    fontSize: 12,
    fontWeight: '800',
    color: MartialTheme.colors.text,
  },
  track: {
    width: '100%',
    borderRadius: MartialTheme.radii.full,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  fill: {
    borderRadius: MartialTheme.radii.full,
  },
});
