import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { MartialTheme } from '@/constants/theme';

export type NodeStatus = 'completed' | 'current' | 'locked' | 'milestone';

interface JourneyNodeProps {
  id: string;
  number: number;
  title: string;
  status: NodeStatus;
  durationMinutes?: number;
  onPress: () => void;
  alignOffset?: 'left' | 'center' | 'right';
  isMilestone?: boolean;
}

export function JourneyNode({
  id,
  number,
  title,
  status,
  durationMinutes = 3,
  onPress,
  alignOffset = 'center',
  isMilestone = false,
}: JourneyNodeProps) {
  // Gentle pulse animation for the current active node
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const bounceAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (status === 'current') {
      const pulseLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.06,
            duration: 900,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 900,
            useNativeDriver: true,
          }),
        ])
      );
      const bounceLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(bounceAnim, {
            toValue: -5,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(bounceAnim, {
            toValue: 0,
            duration: 600,
            useNativeDriver: true,
          }),
        ])
      );
      pulseLoop.start();
      bounceLoop.start();

      return () => {
        pulseLoop.stop();
        bounceLoop.stop();
      };
    }
  }, [status]);

  const getAlignmentStyle = (): { alignSelf: 'flex-start' | 'flex-end' | 'center'; marginLeft?: number; marginRight?: number } => {
    switch (alignOffset) {
      case 'left':
        return { alignSelf: 'flex-start', marginLeft: 36 };
      case 'right':
        return { alignSelf: 'flex-end', marginRight: 36 };
      case 'center':
      default:
        return { alignSelf: 'center' };
    }
  };

  const isCompleted = status === 'completed';
  const isCurrent = status === 'current';
  const isLocked = status === 'locked';

  return (
    <View style={[styles.nodeWrapper, getAlignmentStyle()]}>
      {/* Floating "START HERE ✨" badge for current active node */}
      {isCurrent && (
        <Animated.View
          style={[
            styles.floatingBadge,
            { transform: [{ translateY: bounceAnim }] },
          ]}
        >
          <Text style={styles.floatingBadgeText}>START HERE ✨</Text>
          <View style={styles.floatingBadgeArrow} />
        </Animated.View>
      )}

      {/* Circular Node Button */}
      <Animated.View
        style={[
          isCurrent && { transform: [{ scale: pulseAnim }] },
        ]}
      >
        <TouchableOpacity
          activeOpacity={0.85}
          disabled={isLocked}
          onPress={onPress}
          style={[
            styles.circleNode,
            isMilestone && styles.milestoneNode,
            isCompleted && styles.completedNode,
            isCurrent && styles.currentNode,
            isLocked && styles.lockedNode,
          ]}
        >
          {/* Inner Highlight Reflection */}
          <View
            style={[
              styles.innerHighlight,
              (isCompleted || isCurrent || isMilestone) && styles.innerHighlightActive,
            ]}
          />

          {/* Node Icon */}
          {isCompleted ? (
            <Ionicons name="checkmark" size={32} color="#FFFFFF" />
          ) : isCurrent ? (
            <Ionicons name="play" size={28} color="#FFFFFF" style={{ marginLeft: 3 }} />
          ) : isMilestone ? (
            <MaterialCommunityIcons name="trophy" size={30} color="#FFFFFF" />
          ) : (
            <Ionicons name="lock-closed" size={24} color="#9CA3AF" />
          )}
        </TouchableOpacity>
      </Animated.View>

      {/* Lesson Title & Duration */}
      <View style={styles.labelContainer}>
        <Text
          style={[
            styles.lessonTitle,
            isCurrent && styles.currentLessonTitle,
            isLocked && styles.lockedLessonTitle,
          ]}
          numberOfLines={2}
        >
          {title}
        </Text>
        {!isLocked && (
          <Text style={styles.durationTag}>
            {isCompleted ? 'Completed ✓' : `⏱ ${durationMinutes} min`}
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  nodeWrapper: {
    alignItems: 'center',
    marginVertical: 18,
    width: 140,
    zIndex: 10,
  },
  circleNode: {
    width: 74,
    height: 74,
    borderRadius: 37,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 5,
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  innerHighlight: {
    position: 'absolute',
    top: 6,
    left: 14,
    right: 14,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'transparent',
  },
  innerHighlightActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.28)',
  },
  completedNode: {
    backgroundColor: '#16A34A',
    borderBottomColor: '#14532D',
  },
  currentNode: {
    backgroundColor: '#F59E0B',
    borderBottomColor: '#B45309',
    borderWidth: 2,
    borderColor: '#FEF3C7',
  },
  lockedNode: {
    backgroundColor: '#E7E2D6',
    borderBottomColor: '#D5CEBF',
  },
  milestoneNode: {
    width: 82,
    height: 82,
    borderRadius: 41,
    backgroundColor: '#D97706',
    borderBottomColor: '#92400E',
  },
  floatingBadge: {
    backgroundColor: '#15803D',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
    marginBottom: 8,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
  },
  floatingBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  floatingBadgeArrow: {
    position: 'absolute',
    bottom: -5,
    width: 0,
    height: 0,
    borderLeftWidth: 5,
    borderRightWidth: 5,
    borderTopWidth: 5,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#15803D',
  },
  labelContainer: {
    marginTop: 8,
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  lessonTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: MartialTheme.colors.text,
    textAlign: 'center',
    lineHeight: 17,
  },
  currentLessonTitle: {
    color: MartialTheme.colors.primary,
    fontWeight: '900',
  },
  lockedLessonTitle: {
    color: '#9CA3AF',
    fontWeight: '600',
  },
  durationTag: {
    fontSize: 11,
    color: MartialTheme.colors.textMuted,
    fontWeight: '600',
    marginTop: 2,
  },
});
