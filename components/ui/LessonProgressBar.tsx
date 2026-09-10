import React from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MartialTheme } from '@/constants/theme';

interface LessonProgressBarProps {
  currentStep: number;
  totalSteps: number;
  onClose: () => void;
  hearts?: number;
}

export function LessonProgressBar({
  currentStep,
  totalSteps,
  onClose,
  hearts = 5,
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

      {/* Hearts / Lives indicator */}
      <View style={styles.heartContainer}>
        <Ionicons name="heart" size={18} color={MartialTheme.colors.heartRed} />
        <Text style={styles.heartText}>{hearts}</Text>
      </View>
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
  heartContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  heartText: {
    fontSize: 14,
    fontWeight: '800',
    color: MartialTheme.colors.heartRed,
  },
});
