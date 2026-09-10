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
  getLessonStatus,
} from '@/constants/curriculumStore';
import {
  getHistory,
  getStrikeMasteryStats,
  MasteryStats,
} from '@/constants/historyStore';

export default function LearnCurriculumScreen() {
  const router = useRouter();

  const [viewMode, setViewMode] = useState<'path' | 'all'>('path');
  const [activeLevelFilter, setActiveLevelFilter] = useState<string>('all');
  const [expandedLevels, setExpandedLevels] = useState<Record<string, boolean>>({
    level_0: true,
    level_1: false,
    level_2: false,
    level_3: false,
    level_4: false,
  });

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
        if (isMounted) {
          setCurriculumProgress(prog);
          // Auto-expand the level containing the current active lesson
          const currentLesson = ALL_CURRICULUM_LESSONS.find(l => l.id === prog.currentLessonId);
          if (currentLesson) {
            setExpandedLevels(prev => ({
              ...prev,
              [currentLesson.levelId]: true,
            }));
          }
        }
      });

      getHistory().then((history) => {
        if (isMounted) setMasteryStats(getStrikeMasteryStats(history || []));
      });

      return () => {
        isMounted = false;
      };
    }, [])
  );

  // Open any lesson immediately for reading — zero gatekeeping on knowledge!
  const handleSelectLesson = (lesson: CurriculumLesson) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedLesson(lesson);
    setShowLessonModal(true);
  };

  const handleStartMode = (mode: 'follow' | 'guided' | 'test', strikeId: string) => {
    setShowLessonModal(false);
    router.push({
      pathname: '/evaluate',
      params: { strikeId, mode },
    });
  };

  const toggleLevelExpansion = (levelId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setExpandedLevels(prev => ({
      ...prev,
      [levelId]: !prev[levelId],
    }));
  };

  // Filter levels or show all
  const displayedLevels: CurriculumLevel[] = useMemo(() => {
    if (viewMode === 'path') {
      return CURRICULUM_DATA;
    }
    if (activeLevelFilter === 'all') return CURRICULUM_DATA;
    return CURRICULUM_DATA.filter(lvl => lvl.id === activeLevelFilter);
  }, [viewMode, activeLevelFilter]);

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerSub}>ACADEMY CURRICULUM</Text>
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

        {/* VIEW MODE SEGMENTED CONTROL: YOUR PATH VS ALL LESSONS */}
        <View style={styles.viewModeSwitcher}>
          <TouchableOpacity
            style={[styles.viewModeBtn, viewMode === 'path' && styles.viewModeBtnActive]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setViewMode('path');
            }}
            activeOpacity={0.8}
          >
            <Ionicons
              name="navigate-circle"
              size={16}
              color={viewMode === 'path' ? '#FFFFFF' : '#64748B'}
              style={{ marginRight: 6 }}
            />
            <Text style={[styles.viewModeBtnText, viewMode === 'path' && styles.viewModeBtnTextActive]}>
              Your Guided Path
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.viewModeBtn, viewMode === 'all' && styles.viewModeBtnActive]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setViewMode('all');
            }}
            activeOpacity={0.8}
          >
            <Ionicons
              name="grid-outline"
              size={15}
              color={viewMode === 'all' ? '#FFFFFF' : '#64748B'}
              style={{ marginRight: 6 }}
            />
            <Text style={[styles.viewModeBtnText, viewMode === 'all' && styles.viewModeBtnTextActive]}>
              All Lessons (27)
            </Text>
          </TouchableOpacity>
        </View>

        {/* HORIZONTAL LEVEL FILTER CHIPS (Visible in 'all' mode) */}
        {viewMode === 'all' && (
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
                All (27)
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
                    L{lvl.levelNumber}: {lvl.name.split('—')[1]?.trim() || lvl.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}

        {/* Open Reading Philosophy Callout */}
        <View style={styles.openReadingTip}>
          <Ionicons name="sparkles" size={14} color="#38BDF8" style={{ marginRight: 6 }} />
          <Text style={styles.openReadingTipText}>
            Tap any lesson anytime to read instructions and watch video demos!
          </Text>
        </View>

        {/* CURRICULUM LEVELS LIST */}
        {displayedLevels.map((lvl) => {
          const completedInLevel = lvl.lessons.filter(l => curriculumProgress.completedLessonIds.includes(l.id)).length;
          const isLevelExpanded = viewMode === 'all' || expandedLevels[lvl.id] !== false;
          const isAllCompleted = completedInLevel === lvl.lessons.length && lvl.lessons.length > 0;

          return (
            <View key={lvl.id} style={styles.levelSection}>
              {/* Level Section Header */}
              <TouchableOpacity
                style={styles.levelHeader}
                onPress={() => toggleLevelExpansion(lvl.id)}
                activeOpacity={0.8}
              >
                <View style={[styles.levelBadge, { backgroundColor: lvl.badgeColor + '20', borderColor: lvl.badgeColor + '50' }]}>
                  <Text style={[styles.levelBadgeText, { color: lvl.badgeColor }]}>{lvl.badge}</Text>
                </View>

                <View style={{ flex: 1, marginHorizontal: 8 }}>
                  <Text style={styles.levelTitle}>{lvl.name}</Text>
                  <Text style={styles.levelTagline}>{lvl.tagline}</Text>
                </View>

                <View style={styles.levelHeaderRight}>
                  <Text style={[styles.levelProgressCount, isAllCompleted && { color: '#10B981', fontWeight: 'bold' }]}>
                    {completedInLevel}/{lvl.lessons.length}
                  </Text>
                  <Ionicons
                    name={isLevelExpanded ? 'chevron-up' : 'chevron-down'}
                    size={16}
                    color="#64748B"
                    style={{ marginLeft: 6 }}
                  />
                </View>
              </TouchableOpacity>

              {/* Lessons in this level (Collapsible in Guided Path) */}
              {isLevelExpanded && (
                <View style={styles.lessonsList}>
                  {lvl.lessons.map((lesson) => {
                    const isCompleted = curriculumProgress.completedLessonIds.includes(lesson.id);
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
                          isMastered && styles.lessonCardMastered,
                        ]}
                        activeOpacity={0.75}
                        onPress={() => handleSelectLesson(lesson)}
                      >
                        {/* Status Icon */}
                        <View
                          style={[
                            styles.statusIconCircle,
                            isMastered && styles.statusMastered,
                            !isMastered && styles.statusUnlocked,
                          ]}
                        >
                          {isMastered ? (
                            <Ionicons name="checkmark" size={14} color="#10B981" />
                          ) : (
                            <Text style={styles.lessonOrderNum}>{lesson.lessonNumber}</Text>
                          )}
                        </View>

                        {/* Lesson Details */}
                        <View style={styles.lessonInfoWrap}>
                          <View style={styles.lessonTitleRow}>
                            <Text style={styles.lessonTitleText} numberOfLines={1}>
                              {lesson.title}
                            </Text>
                            {isMastered && (
                              <View style={styles.masteredBadge}>
                                <Text style={styles.masteredBadgeText}>MASTERED</Text>
                              </View>
                            )}
                          </View>

                          <Text style={styles.lessonSubtitleText} numberOfLines={1}>
                            {lesson.beginnerSummary || lesson.subtitle}
                          </Text>

                          {/* Pills: Target & Duration */}
                          <View style={styles.lessonPillsRow}>
                            <View style={styles.targetPill}>
                              <Ionicons name="locate" size={10} color="#38BDF8" style={{ marginRight: 3 }} />
                              <Text style={styles.targetPillText}>
                                {lesson.trainingTarget || lesson.target || 'Fundamentals'}
                              </Text>
                            </View>

                            <View style={styles.durationPill}>
                              <Ionicons name="time-outline" size={10} color="#94A3B8" style={{ marginRight: 3 }} />
                              <Text style={styles.durationPillText}>{lesson.durationMinutes} min</Text>
                            </View>

                            {hasAttempts && strikeStat && (
                              <View style={styles.scorePill}>
                                <Text style={styles.scorePillText}>Best: {strikeStat.bestScore}%</Text>
                              </View>
                            )}
                          </View>
                        </View>

                        {/* Right Arrow Action */}
                        <View style={styles.lessonActionArrow}>
                          <Ionicons name="chevron-forward" size={16} color="#64748B" />
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>

      {/* Technique Lesson Modal (Sequential 4-Step Wizard) */}
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

      {/* Video Demonstration Modal */}
      <StrikeVideoModal
        visible={showVideoCatalogModal}
        initialStrikeId={catalogStrikeId}
        onClose={() => setShowVideoCatalogModal(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F1020',
  },
  header: {
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#161930',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0F1020',
  },
  headerSub: {
    fontSize: 10,
    fontWeight: '900',
    color: '#D24B38',
    letterSpacing: 1.2,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 2,
  },
  headerVideoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F59E0B15',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#F59E0B40',
  },
  headerVideoBtnText: {
    color: '#F59E0B',
    fontSize: 12,
    fontWeight: 'bold',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },

  // Progress Banner Card
  progressCard: {
    backgroundColor: '#161930',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  progressTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  progressCardTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: 'bold',
  },
  progressCardSub: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 2,
  },
  percentageBadge: {
    backgroundColor: '#38BDF820',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#38BDF850',
  },
  percentageBadgeText: {
    color: '#38BDF8',
    fontSize: 13,
    fontWeight: 'bold',
  },
  progressBarTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: '#0F1020',
    overflow: 'hidden',
    marginBottom: 10,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
    backgroundColor: '#10B981',
  },
  progressBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rankText: {
    color: '#94A3B8',
    fontSize: 12,
  },

  // View Mode Switcher
  viewModeSwitcher: {
    flexDirection: 'row',
    backgroundColor: '#161930',
    borderRadius: 12,
    padding: 4,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  viewModeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    borderRadius: 8,
  },
  viewModeBtnActive: {
    backgroundColor: '#D24B38',
  },
  viewModeBtnText: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '700',
  },
  viewModeBtnTextActive: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },

  // Level Filters
  levelFilterScroll: {
    paddingBottom: 10,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#161930',
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  filterChipActive: {
    backgroundColor: '#D24B3825',
    borderColor: '#D24B38',
  },
  filterChipText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },

  // Open Reading Callout
  openReadingTip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#38BDF810',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#38BDF825',
  },
  openReadingTipText: {
    color: '#94A3B8',
    fontSize: 11.5,
    flex: 1,
  },

  // Level Sections
  levelSection: {
    marginBottom: 16,
  },
  levelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#161930',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#1E293B',
    marginBottom: 8,
  },
  levelBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  levelBadgeText: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  levelTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  levelTagline: {
    color: '#64748B',
    fontSize: 11,
    marginTop: 1,
  },
  levelHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  levelProgressCount: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '700',
  },

  // Lessons List
  lessonsList: {
    gap: 8,
    paddingLeft: 4,
  },
  lessonCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#121426',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#1E2540',
  },
  lessonCardMastered: {
    borderColor: '#10B98140',
    backgroundColor: '#10B98108',
  },
  statusIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  statusMastered: {
    backgroundColor: '#10B98125',
    borderWidth: 1,
    borderColor: '#10B981',
  },
  statusUnlocked: {
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
  },
  lessonOrderNum: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: 'bold',
  },
  lessonInfoWrap: {
    flex: 1,
  },
  lessonTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  lessonTitleText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    flex: 1,
  },
  masteredBadge: {
    backgroundColor: '#10B98120',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 6,
  },
  masteredBadgeText: {
    color: '#10B981',
    fontSize: 8,
    fontWeight: '900',
  },
  lessonSubtitleText: {
    color: '#94A3B8',
    fontSize: 11.5,
    marginBottom: 6,
  },
  lessonPillsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  targetPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#38BDF815',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 4,
  },
  targetPillText: {
    color: '#38BDF8',
    fontSize: 10,
    fontWeight: '600',
  },
  durationPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 4,
  },
  durationPillText: {
    color: '#94A3B8',
    fontSize: 10,
  },
  scorePill: {
    backgroundColor: '#F59E0B15',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  scorePillText: {
    color: '#F59E0B',
    fontSize: 10,
    fontWeight: '700',
  },
  lessonActionArrow: {
    paddingLeft: 8,
  },
});
