import React from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { MartialTheme } from '@/constants/theme';
import { SashRankInfo } from '@/constants/gamificationStore';

interface LessonProgressBarProps {
  currentStep: number;
  totalSteps: number;
  onClose: () => void;
  sashInfo?: SashRankInfo;
}

export function LessonProgressBar({
  currentStep,
  totalSteps,
  onClose,
  sashInfo,
}: LessonProgressBarProps) {
  const percent = Math.min(100, Math.max(0, (currentStep / Math.max(1, totalSteps)) * 100));

  return (
    <View style={styles.container}>
      {/* Close button */}
      <TouchableOpacity
        onPress={onClose}
        style={styles.closeButton}
        activeOpacity={0.7}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Ionicons name="close" size={24} color={MartialTheme.colors.textSecondary} />
      </TouchableOpacity>

      {/* Progress Track */}
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${percent}%` }]}>
          {/* Top highlight line for 3D feel */}
          <View style={styles.fillHighlight} />
        </View>
      </View>

      {/* Sash Rank Badge (Replaces Hearts) */}
      {sashInfo ? (
        <View
          style={[
            styles.sashBadge,
            {
              backgroundColor: sashInfo.sashColor,
              borderColor: sashInfo.borderColor,
            },
          ]}
        >
          <MaterialCommunityIcons name="sword-cross" size={12} color={sashInfo.textColor} />
          <Text style={[styles.sashBadgeText, { color: sashInfo.textColor }]}>
            {sashInfo.shortName}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  closeButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  track: {
    flex: 1,
    height: 14,
    backgroundColor: '#E5E0D3',
    borderRadius: 9999,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    backgroundColor: MartialTheme.colors.primary,
    borderRadius: 9999,
    position: 'relative',
  },
  fillHighlight: {
    position: 'absolute',
    top: 2,
    left: 4,
    right: 4,
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.35)',
    borderRadius: 2,
  },
  sashBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  sashBadgeText: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
});
