import React from 'react';
import {
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { MartialTheme } from '@/constants/theme';
import { CurriculumLesson } from '@/constants/curriculumStore';
import { TactileButton } from '@/components/ui/TactileButton';

export interface JourneyPrerequisiteSheetProps {
  visible: boolean;
  onClose: () => void;
  lesson: CurriculumLesson | null;
  stageName: string;
  stageLevel: number;
  prerequisiteNames: string[];
  onStartTestOut: (strikeId: string, lessonId: string) => void;
}

export function JourneyPrerequisiteSheet({
  visible,
  onClose,
  lesson,
  stageName,
  stageLevel,
  prerequisiteNames,
  onStartTestOut,
}: JourneyPrerequisiteSheetProps) {
  if (!lesson) return null;

  const handleTestOut = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    onClose();
    const strikeKey = lesson.strikeKey || 'strike_1';
    onStartTestOut(strikeKey, lesson.id);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={onClose}
        />
        <View style={styles.sheetContainer}>
          {/* Grab Bar */}
          <View style={styles.grabBar} />

          {/* Header */}
          <View style={styles.headerRow}>
            <View style={styles.lockBadge}>
              <Ionicons name="lock-closed" size={20} color="#D97706" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.stageTag}>
                STAGE {stageLevel + 1} • {stageName.toUpperCase()}
              </Text>
              <Text style={styles.lessonTitle}>{lesson.title}</Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeBtn}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="close" size={22} color={MartialTheme.colors.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Description */}
          <Text style={styles.lessonDesc}>{lesson.description}</Text>

          {/* Prerequisites Section */}
          <View style={styles.prereqBox}>
            <View style={styles.prereqHeaderRow}>
              <MaterialCommunityIcons name="clipboard-check-outline" size={18} color="#4B5563" />
              <Text style={styles.prereqHeading}>PREREQUISITE LESSONS</Text>
            </View>
            <Text style={styles.prereqSub}>
              Complete previous lessons to unlock this technique naturally:
            </Text>
            {prerequisiteNames.length > 0 ? (
              prerequisiteNames.slice(0, 3).map((name, idx) => (
                <View key={idx} style={styles.prereqItem}>
                  <Ionicons name="ellipse-outline" size={14} color="#9CA3AF" style={{ marginRight: 8 }} />
                  <Text style={styles.prereqItemText} numberOfLines={1}>{name}</Text>
                </View>
              ))
            ) : (
              <View style={styles.prereqItem}>
                <Ionicons name="ellipse-outline" size={14} color="#9CA3AF" style={{ marginRight: 8 }} />
                <Text style={styles.prereqItemText}>Prior fundamental lessons in current stage</Text>
              </View>
            )}
          </View>

          {/* Test-Out Fast Track Callout */}
          <View style={styles.testOutCard}>
            <View style={styles.testOutHeaderRow}>
              <MaterialCommunityIcons name="lightning-bolt" size={20} color="#D97706" />
              <Text style={styles.testOutTitle}>FAST-TRACK TEST OUT</Text>
            </View>
            <Text style={styles.testOutDesc}>
              Already familiar with this technique? Prove your form in the AI camera evaluation test. Score 80%+ to unlock immediately!
            </Text>
            <TactileButton
              title="TEST-OUT CHALLENGE (80%+ TO UNLOCK) ⚔️"
              variant="primary"
              size="md"
              icon={<Ionicons name="flash" size={16} color="#FFFFFF" />}
              onPress={handleTestOut}
              style={{ width: '100%', marginTop: 8 }}
            />
          </View>

          {/* Dismiss button */}
          <TouchableOpacity
            style={styles.cancelBtn}
            onPress={onClose}
            activeOpacity={0.7}
          >
            <Text style={styles.cancelBtnText}>Back to Journey Map</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  backdrop: {
    flex: 1,
  },
  sheetContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 10,
  },
  grabBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D1D5DB',
    alignSelf: 'center',
    marginBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  lockBadge: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  stageTag: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#D97706',
    letterSpacing: 0.6,
  },
  lessonTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: MartialTheme.colors.text,
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
  },
  lessonDesc: {
    fontSize: 13.5,
    color: MartialTheme.colors.textSecondary,
    lineHeight: 19,
    marginBottom: 14,
  },
  prereqBox: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 14,
  },
  prereqHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  prereqHeading: {
    fontSize: 11,
    fontWeight: '800',
    color: '#4B5563',
    letterSpacing: 0.6,
    marginLeft: 6,
  },
  prereqSub: {
    fontSize: 12,
    color: MartialTheme.colors.textMuted,
    marginBottom: 8,
  },
  prereqItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 3,
  },
  prereqItemText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: MartialTheme.colors.text,
    flex: 1,
  },
  testOutCard: {
    backgroundColor: '#FFFBEB',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1.5,
    borderColor: '#FDE68A',
    marginBottom: 14,
  },
  testOutHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  testOutTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#B45309',
    letterSpacing: 0.6,
    marginLeft: 6,
  },
  testOutDesc: {
    fontSize: 12.5,
    color: '#92400E',
    lineHeight: 18,
    marginBottom: 6,
  },
  cancelBtn: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: MartialTheme.colors.textMuted,
  },
});
