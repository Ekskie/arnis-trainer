import React, { useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { MartialTheme } from '@/constants/theme';
import { ALL_CURRICULUM_LESSONS, CurriculumLesson } from '@/constants/curriculumStore';
import { STRIKE_RULES } from '@/constants/strikeRules';

export default function CoachDrillsScreen() {
  const router = useRouter();
  const [filterLevel, setFilterLevel] = useState<number | null>(null);

  const filteredLessons = filterLevel !== null
    ? ALL_CURRICULUM_LESSONS.filter((l) => l.levelNumber === filterLevel)
    : ALL_CURRICULUM_LESSONS;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <View style={styles.crestCircle}>
            <MaterialCommunityIcons name="sword" size={24} color="#D97706" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Curriculum & Technique Catalog</Text>
            <Text style={styles.headerSubtitle}>Canonical Angles, Biomechanics & Drill References</Text>
          </View>
        </View>

        {/* Level Filter Chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          <TouchableOpacity
            style={[styles.filterChip, filterLevel === null && styles.filterChipActive]}
            onPress={() => {
              Haptics.selectionAsync();
              setFilterLevel(null);
            }}>
            <Text style={[styles.filterChipText, filterLevel === null && styles.filterChipTextActive]}>
              All ({ALL_CURRICULUM_LESSONS.length})
            </Text>
          </TouchableOpacity>

          {[0, 1, 2, 3, 4].map((lvl) => (
            <TouchableOpacity
              key={lvl}
              style={[styles.filterChip, filterLevel === lvl && styles.filterChipActive]}
              onPress={() => {
                Haptics.selectionAsync();
                setFilterLevel(lvl);
              }}>
              <Text style={[styles.filterChipText, filterLevel === lvl && styles.filterChipTextActive]}>
                Level {lvl}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        {/* Quick Strike Rules Reference Section */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionCardHeader}>
            <MaterialCommunityIcons name="shield-sword" size={20} color="#D97706" />
            <Text style={styles.sectionCardTitle}>CANONICAL 12 STRIKES MATRIX</Text>
          </View>
          <Text style={styles.sectionCardDesc}>
            Standard Philippine Arnis angles calibrated for the automated AI pose engine:
          </Text>

          <View style={styles.strikeGrid}>
            {Object.values(STRIKE_RULES).slice(0, 12).map((rule, idx) => (
              <View key={rule.id} style={styles.strikeCard}>
                <View style={styles.strikeIndexCircle}>
                  <Text style={styles.strikeIndexText}>#{idx + 1}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.strikeName}>{rule.name}</Text>
                  <Text style={styles.strikeAngleText}>
                    Elbow: {rule.chamber_elb}° · Shoulder: {rule.ideal_shoulder}°
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Detailed Curriculum Lessons Section */}
        <Text style={styles.lessonsSectionHeader}>LESSON DRILL BLUEPRINTS</Text>
        {filteredLessons.map((lesson) => (
          <TouchableOpacity
            key={lesson.id}
            style={styles.lessonCard}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push(`/lesson/${lesson.id}` as any);
            }}
            activeOpacity={0.85}>
            <View style={styles.lessonHeader}>
              <View style={styles.levelTag}>
                <Text style={styles.levelTagText}>LEVEL {lesson.levelNumber}</Text>
              </View>
              <Text style={styles.lessonDuration}>⏱ {lesson.durationMinutes} min</Text>
            </View>

            <Text style={styles.lessonTitle}>{lesson.title}</Text>
            {lesson.filipinoTitle && (
              <Text style={styles.lessonFilipinoTitle}>{`"${lesson.filipinoTitle}"`}</Text>
            )}
            <Text style={styles.lessonDesc} numberOfLines={2}>
              {lesson.beginnerSummary || lesson.description}
            </Text>

            <View style={styles.lessonFooterRow}>
              <View style={styles.tagBadge}>
                <Text style={styles.tagBadgeText}>
                  {lesson.isStrike ? 'Striking Drill' : 'Orientation & Stance'}
                </Text>
              </View>
              <View style={styles.previewLinkRow}>
                <Text style={styles.previewLinkText}>Preview Drill</Text>
                <Ionicons name="arrow-forward" size={14} color="#D97706" />
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: MartialTheme.colors.background,
  },
  header: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: MartialTheme.colors.border,
    gap: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  crestCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: MartialTheme.colors.text,
  },
  headerSubtitle: {
    fontSize: 11,
    color: MartialTheme.colors.textSecondary,
  },
  filterRow: {
    gap: 8,
    paddingTop: 4,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: MartialTheme.colors.border,
  },
  filterChipActive: {
    backgroundColor: '#D97706',
    borderColor: '#B45309',
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4B5563',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
    gap: 16,
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1.5,
    borderColor: MartialTheme.colors.border,
    gap: 8,
  },
  sectionCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionCardTitle: {
    fontSize: 12,
    fontWeight: '900',
    color: '#D97706',
    letterSpacing: 0.5,
  },
  sectionCardDesc: {
    fontSize: 12,
    color: MartialTheme.colors.textSecondary,
    lineHeight: 17,
    marginBottom: 6,
  },
  strikeGrid: {
    gap: 8,
  },
  strikeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    padding: 10,
    borderRadius: 10,
    gap: 10,
  },
  strikeIndexCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  strikeIndexText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#92400E',
  },
  strikeName: {
    fontSize: 13,
    fontWeight: '800',
    color: MartialTheme.colors.text,
  },
  strikeAngleText: {
    fontSize: 11,
    color: MartialTheme.colors.textSecondary,
  },
  lessonsSectionHeader: {
    fontSize: 11,
    fontWeight: '800',
    color: MartialTheme.colors.textSecondary,
    letterSpacing: 0.8,
    marginTop: 4,
  },
  lessonCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1.5,
    borderColor: MartialTheme.colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 2,
    gap: 8,
  },
  lessonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  levelTag: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  levelTagText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#92400E',
  },
  lessonDuration: {
    fontSize: 11,
    color: MartialTheme.colors.textSecondary,
    fontWeight: '600',
  },
  lessonTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: MartialTheme.colors.text,
  },
  lessonFilipinoTitle: {
    fontSize: 12,
    color: '#D97706',
    fontStyle: 'italic',
    fontWeight: '600',
  },
  lessonDesc: {
    fontSize: 12,
    color: MartialTheme.colors.textSecondary,
    lineHeight: 17,
  },
  lessonFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  tagBadge: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  tagBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#4B5563',
  },
  previewLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  previewLinkText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#D97706',
  },
});
