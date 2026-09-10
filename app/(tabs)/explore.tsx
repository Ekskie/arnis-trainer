import React, { useState, useCallback, useMemo } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { TechniqueLessonModal } from '@/components/TechniqueLessonModal';
import { StrikeVideoModal } from '@/components/StrikeVideoModal';
import {
  ALL_CURRICULUM_LESSONS,
  CURRICULUM_DATA,
  CurriculumLesson,
  CurriculumLevel,
  CurriculumProgress,
  getCurriculumProgress,
  isLessonUnlocked,
  markLessonCompleted,
} from '@/constants/curriculumStore';
import {
  getHistory,
  getStrikeMasteryStats,
  MasteryStats,
} from '@/constants/historyStore';

export default function LearnCurriculumScreen() {
  const router = useRouter();

  const [activeLevelFilter, setActiveLevelFilter] = useState<string>('all');
  const [curriculumProgress, setCurriculumProgress] = useState<CurriculumProgress>({
    completedLessonIds: [],
    currentLessonId: 'les_0_1',
    totalLessons: ALL_CURRICULUM_LESSONS.length,
    completedCount: 0,
    progressPercentage: 0,
  });
  const [masteryStats, setMasteryStats] = useState<MasteryStats>(() => getStrikeMasteryStats([]));

  // Modal states
  const [selectedLesson, setSelectedLesson] = useState<CurriculumLesson | null>(null);
  const [showLessonModal, setShowLessonModal] = useState(false);
  const [showVideoCatalogModal, setShowVideoCatalogModal] = useState(false);
  const [catalogStrikeId, setCatalogStrikeId] = useState('strike_1');

  // Load progress and mastery on screen focus
  useFocusEffect(
    useCallback(() => {
      let isMounted = true;

      getCurriculumProgress().then((prog) => {
        if (isMounted) setCurriculumProgress(prog);
      });

      getHistory().then((history) => {
        if (isMounted) setMasteryStats(getStrikeMasteryStats(history || []));
      });

      return () => {
        isMounted = false;
      };
    }, [])
  );

  const handleSelectLesson = (lesson: CurriculumLesson, isUnlocked: boolean) => {
    if (!isUnlocked) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedLesson(lesson);
    setShowLessonModal(true);
  };

  const handleStartMode = (mode: 'follow' | 'guided' | 'test', strikeId: string) => {
    setShowLessonModal(false);
    // Also mark lesson completed if it was an orientation/fundamental, or let AI score complete it
    router.push({
      pathname: '/evaluate',
      params: { strikeId, mode },
    });
  };

  // Filter levels or show all
  const displayedLevels: CurriculumLevel[] = useMemo(() => {
    if (activeLevelFilter === 'all') return CURRICULUM_DATA;
    return CURRICULUM_DATA.filter(lvl => lvl.id === activeLevelFilter);
  }, [activeLevelFilter]);

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerSub}>ARNIS CURRICULUM</Text>
          <Text style={styles.headerTitle}>Beginner Learning Path</Text>
        </View>

        <TouchableOpacity
          style={styles.headerVideoBtn}
          activeOpacity={0.8}
          onPress={() => {
            setCatalogStrikeId('strike_1');
            setShowVideoCatalogModal(true);
          }}
        >
          <MaterialCommunityIcons name="video-vintage" size={16} color="#F59E0B" style={{ marginRight: 4 }} />
          <Text style={styles.headerVideoBtnText}>Videos</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* COURSE PROGRESS BANNER */}
        <View style={styles.progressCard}>
          <View style={styles.progressTopRow}>
            <View>
              <Text style={styles.progressCardTitle}>Course Completion</Text>
              <Text style={styles.progressCardSub}>
                {curriculumProgress.completedCount} of {curriculumProgress.totalLessons} Lessons Completed
              </Text>
            </View>
            <View style={styles.percentageBadge}>
              <Text style={styles.percentageBadgeText}>
                {curriculumProgress.progressPercentage}%
              </Text>
            </View>
          </View>

          {/* Progress Bar */}
          <View style={styles.progressBarTrack}>
            <View
              style={[
                styles.progressBarFill,
                { width: `${Math.max(4, curriculumProgress.progressPercentage)}%` },
              ]}
            />
          </View>

          <View style={styles.progressBottomRow}>
            <Text style={styles.rankText}>
              Current Belt / Sash: <Text style={{ color: '#F59E0B', fontWeight: '800' }}>{masteryStats.rankTitle}</Text>
            </Text>
          </View>
        </View>

        {/* HORIZONTAL LEVEL FILTER CHIPS */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.levelFilterScroll}
        >
          <TouchableOpacity
            style={[styles.filterChip, activeLevelFilter === 'all' && styles.filterChipActive]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setActiveLevelFilter('all');
            }}
          >
            <Text style={[styles.filterChipText, activeLevelFilter === 'all' && styles.filterChipTextActive]}>
              All Levels (27)
            </Text>
          </TouchableOpacity>

          {CURRICULUM_DATA.map((lvl) => {
            const isActive = activeLevelFilter === lvl.id;
            return (
              <TouchableOpacity
                key={lvl.id}
                style={[styles.filterChip, isActive && styles.filterChipActive]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setActiveLevelFilter(lvl.id);
                }}
              >
                <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>
                  L{lvl.levelNumber}: {lvl.name.split('—')[1]?.trim() || lvl.name} ({lvl.lessons.length})
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* CURRICULUM LEVELS LIST */}
        {displayedLevels.map((lvl) => {
          const completedInLevel = lvl.lessons.filter(l => curriculumProgress.completedLessonIds.includes(l.id)).length;
          return (
            <View key={lvl.id} style={styles.levelSection}>
              {/* Level Section Header */}
              <View style={styles.levelHeader}>
                <View style={[styles.levelBadge, { backgroundColor: lvl.badgeColor + '20', borderColor: lvl.badgeColor + '50' }]}>
                  <Text style={[styles.levelBadgeText, { color: lvl.badgeColor }]}>{lvl.badge}</Text>
                </View>

                <View style={{ flex: 1, marginHorizontal: 8 }}>
                  <Text style={styles.levelTitle}>{lvl.name}</Text>
                  <Text style={styles.levelTagline}>{lvl.tagline}</Text>
                </View>

                <Text style={styles.levelProgressCount}>
                  {completedInLevel}/{lvl.lessons.length}
                </Text>
              </View>

              {/* Lessons in this level */}
              <View style={styles.lessonsList}>
                {lvl.lessons.map((lesson) => {
                  const isCompleted = curriculumProgress.completedLessonIds.includes(lesson.id);
                  const isUnlocked = isLessonUnlocked(lesson.id, curriculumProgress.completedLessonIds);

                  // If strike, check AI mastery score
                  const strikeStat = lesson.strikeKey
                    ? masteryStats.strikes.find(s => s.id === lesson.strikeKey)
                    : null;
                  const isMastered = isCompleted || (strikeStat && strikeStat.isMastered);
                  const hasAttempts = strikeStat && strikeStat.attempts > 0;

                  return (
                    <TouchableOpacity
                      key={lesson.id}
                      style={[
                        styles.lessonCard,
                        !isUnlocked && styles.lessonCardLocked,
                        isMastered && styles.lessonCardMastered,
                      ]}
                      activeOpacity={isUnlocked ? 0.75 : 1}
                      onPress={() => handleSelectLesson(lesson, isUnlocked)}
                    >
                      {/* Left Status Icon */}
                      <View
                        style={[
                          styles.statusIconCircle,
                          isMastered && styles.statusMastered,
                          !isMastered && isUnlocked && styles.statusUnlocked,
                          !isUnlocked && styles.statusLocked,
                        ]}
                      >
                        {isMastered ? (
                          <Ionicons name="checkmark" size={16} color="#10B981" />
                        ) : isUnlocked ? (
                          <MaterialCommunityIcons name="lock-open-variant" size={14} color="#F59E0B" />
                        ) : (
                          <Ionicons name="lock-closed" size={13} color="#64748B" />
                        )}
                      </View>

                      {/* Lesson Details */}
                      <View style={{ flex: 1, marginRight: 10 }}>
                        <View style={styles.lessonMetaRow}>
                          <Text style={styles.lessonNumTag}>
                            {lesson.isStrike ? `STRIKE ${lesson.lessonNumber}` : `LESSON ${lesson.lessonNumber}`}
                          </Text>
                          {lesson.target && (
                            <Text style={styles.targetPill} numberOfLines={1}>
                              {lesson.target.split('/')[0].trim()}
                            </Text>
                          )}
                        </View>

                        <Text style={[styles.lessonTitle, !isUnlocked && styles.textMuted]} numberOfLines={1}>
                          {lesson.title}
                        </Text>
                        <Text style={styles.lessonSubtitle} numberOfLines={1}>
                          {lesson.filipinoTitle || lesson.subtitle}
                        </Text>
                      </View>

                      {/* Right Status Pill */}
                      <View style={{ alignItems: 'flex-end' }}>
                        {isMastered ? (
                          <View style={styles.pillMastered}>
                            <Text style={styles.pillMasteredText}>Mastered</Text>
                          </View>
                        ) : isUnlocked ? (
                          <View style={styles.pillPractice}>
                            <Text style={styles.pillPracticeText}>
                              {hasAttempts ? `${strikeStat?.bestScore}%` : 'Practice'}
                            </Text>
                          </View>
                        ) : (
                          <View style={styles.pillLocked}>
                            <Text style={styles.pillLockedText}>Locked</Text>
                          </View>
                        )}
                        <Ionicons
                          name="chevron-forward"
                          size={16}
                          color={isUnlocked ? '#94A3B8' : '#475569'}
                          style={{ marginTop: 4 }}
                        />
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          );
        })}
      </ScrollView>

      {/* TECHNIQUE LESSON PEDAGOGY MODAL */}
      <TechniqueLessonModal
        visible={showLessonModal}
        lesson={selectedLesson}
        onClose={() => setShowLessonModal(false)}
        onStartMode={handleStartMode}
        bestScore={
          masteryStats.strikes.find(s => s.id === selectedLesson?.strikeKey)?.bestScore || 0
        }
        grade={
          masteryStats.strikes.find(s => s.id === selectedLesson?.strikeKey)?.grade || 'Unranked'
        }
      />

      {/* VIDEO DEMONSTRATION CATALOG MODAL */}
      <StrikeVideoModal
        visible={showVideoCatalogModal}
        initialStrikeId={catalogStrikeId}
        onClose={() => setShowVideoCatalogModal(false)}
        onPracticeStrike={(strikeId) => {
          setShowVideoCatalogModal(false);
          router.push({
            pathname: '/evaluate',
            params: { strikeId },
          });
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0C16',
  },
  header: {
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#161930',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0A0C16',
  },
  headerSub: {
    fontSize: 10,
    fontWeight: '900',
    color: '#D24B38',
    letterSpacing: 1.2,
  },
  headerTitle: {
    fontSize: 19,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  headerVideoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F59E0B20',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#F59E0B50',
  },
  headerVideoBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#F59E0B',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },

  // PROGRESS CARD
  progressCard: {
    backgroundColor: '#131830',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#20284A',
    marginBottom: 16,
  },
  progressTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  progressCardTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  progressCardSub: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  percentageBadge: {
    backgroundColor: '#D24B38',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  percentageBadgeText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  progressBarTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: '#0C1022',
    overflow: 'hidden',
    marginBottom: 10,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
    backgroundColor: '#D24B38',
  },
  progressBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  rankText: {
    fontSize: 11,
    color: '#94A3B8',
  },

  // LEVEL FILTER CHIPS
  levelFilterScroll: {
    gap: 8,
    paddingBottom: 16,
  },
  filterChip: {
    backgroundColor: '#161B36',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: '#222B52',
  },
  filterChipActive: {
    backgroundColor: '#D24B38',
    borderColor: '#FF6B57',
  },
  filterChipText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#94A3B8',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },

  // LEVEL SECTION
  levelSection: {
    marginBottom: 22,
  },
  levelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    paddingHorizontal: 2,
  },
  levelBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  levelBadgeText: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  levelTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  levelTagline: {
    fontSize: 10.5,
    color: '#94A3B8',
  },
  levelProgressCount: {
    fontSize: 12,
    fontWeight: '800',
    color: '#64748B',
  },

  // LESSONS LIST
  lessonsList: {
    gap: 8,
  },
  lessonCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#141A34',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#212A50',
  },
  lessonCardLocked: {
    backgroundColor: '#0F1326',
    borderColor: '#19203C',
    opacity: 0.65,
  },
  lessonCardMastered: {
    borderColor: '#10B98140',
  },
  statusIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  statusMastered: {
    backgroundColor: '#10B98125',
  },
  statusUnlocked: {
    backgroundColor: '#F59E0B20',
  },
  statusLocked: {
    backgroundColor: '#1E2544',
  },
  lessonMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  lessonNumTag: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#D24B38',
    letterSpacing: 0.5,
  },
  targetPill: {
    fontSize: 9.5,
    color: '#64748B',
    backgroundColor: '#1A213D',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  lessonTitle: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  lessonSubtitle: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 1,
  },
  textMuted: {
    color: '#64748B',
  },

  // RIGHT STATUS PILLS
  pillMastered: {
    backgroundColor: '#10B98120',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#10B98150',
  },
  pillMasteredText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#10B981',
  },
  pillPractice: {
    backgroundColor: '#F59E0B20',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#F59E0B50',
  },
  pillPracticeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#F59E0B',
  },
  pillLocked: {
    backgroundColor: '#1E2544',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  pillLockedText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
  },
});
