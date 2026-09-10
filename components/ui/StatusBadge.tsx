import React from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { MartialTheme } from '@/constants/theme';
import { LessonStatus } from '@/constants/curriculumStore';

export interface StatusBadgeProps {
  status: LessonStatus;
  score?: number;
  style?: ViewStyle;
  compact?: boolean;
}

export function StatusBadge({ status, score, style, compact = false }: StatusBadgeProps) {
  const getBadgeConfig = () => {
    switch (status) {
      case 'mastered':
        return {
          label: compact ? 'Mastered' : '⭐ Mastered',
          bgColor: 'rgba(16, 185, 129, 0.18)',
          borderColor: 'rgba(16, 185, 129, 0.5)',
          textColor: '#10B981',
          icon: <Ionicons name="star" size={12} color="#10B981" />,
        };
      case 'assessed':
        return {
          label: score ? `🎯 Assessed ${score}%` : '🎯 Assessed',
          bgColor: 'rgba(245, 158, 11, 0.18)',
          borderColor: 'rgba(245, 158, 11, 0.5)',
          textColor: '#F59E0B',
          icon: <MaterialCommunityIcons name="target" size={12} color="#F59E0B" />,
        };
      case 'practicing':
        return {
          label: compact ? 'Practicing' : '🥋 Practicing',
          bgColor: 'rgba(56, 189, 248, 0.16)',
          borderColor: 'rgba(56, 189, 248, 0.45)',
          textColor: '#38BDF8',
          icon: <MaterialCommunityIcons name="karate" size={12} color="#38BDF8" />,
        };
      case 'watched':
        return {
          label: compact ? 'Watched' : '🎥 Watched',
          bgColor: 'rgba(212, 175, 55, 0.16)',
          borderColor: 'rgba(212, 175, 55, 0.45)',
          textColor: MartialTheme.colors.bamboo,
          icon: <Ionicons name="videocam" size={12} color={MartialTheme.colors.bamboo} />,
        };
      case 'learning':
        return {
          label: compact ? 'Learning' : '📖 Learning',
          bgColor: 'rgba(148, 163, 184, 0.15)',
          borderColor: 'rgba(148, 163, 184, 0.35)',
          textColor: '#E2E8F0',
          icon: <Ionicons name="book" size={12} color="#E2E8F0" />,
        };
      case 'not_started':
      default:
        return {
          label: 'Not Started',
          bgColor: 'rgba(100, 116, 139, 0.12)',
          borderColor: 'rgba(100, 116, 139, 0.25)',
          textColor: '#94A3B8',
          icon: <Ionicons name="ellipse-outline" size={11} color="#94A3B8" />,
        };
    }
  };

  const config = getBadgeConfig();

  return (
    <View
      style={[
        styles.badgeContainer,
        {
          backgroundColor: config.bgColor,
          borderColor: config.borderColor,
        },
        compact && styles.compactBadge,
        style,
      ]}
    >
      <View style={styles.iconWrap}>{config.icon}</View>
      <Text style={[styles.badgeText, { color: config.textColor }, compact && styles.compactText]}>
        {config.label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: MartialTheme.radii.full,
    borderWidth: 1,
  },
  compactBadge: {
    paddingVertical: 2,
    paddingHorizontal: 7,
  },
  iconWrap: {
    marginRight: 5,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  compactText: {
    fontSize: 10,
  },
});
