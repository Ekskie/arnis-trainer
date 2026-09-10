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
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { MartialTheme } from '@/constants/theme';
import {
  ALL_CURRICULUM_LESSONS,
  CURRICULUM_DATA,
  CurriculumProgress,
  getCurriculumProgress,
  getStageSummary,
} from '@/constants/curriculumStore';
import { JourneyNode, NodeStatus } from '@/components/journey/JourneyNode';
import { JourneyConnector } from '@/components/journey/JourneyConnector';
import { TactileButton } from '@/components/ui/TactileButton';
import { CoachCharacter } from '@/components/ui/CoachCharacter';

export default function LearnCurriculumScreen() {
  const router = useRouter();

  const [curriculumProgress, setCurriculumProgress] = useState<CurriculumProgress>({
    completedLessonIds: [],
    currentLessonId: 'les_0_1',
    totalLessons: ALL_CURRICULUM_LESSONS.length,
    completedCount: 0,
    progressPercentage: 0,
  });

  const [selectedStageIndex, setSelectedStageIndex] = useState<number>(0);

  // Load progress when screen is focused
  useFocusEffect(
    useCallback(() => {
      let isMounted = true;
      getCurriculumProgress().then((prog) => {
        if (isMounted) {
          setCurriculumProgress(prog);
          // Auto-select the stage of current lesson
          const currentLesson = ALL_CURRICULUM_LESSONS.find(l => l.id === prog.currentLessonId);
          if (currentLesson) {
            setSelectedStageIndex(currentLesson.levelNumber);
          }
        }
      });
      return () => {
        isMounted = false;
      };
    }, [])
  );

  const currentStage = CURRICULUM_DATA[selectedStageIndex] || CURRICULUM_DATA[0];

  const stageSummary = useMemo(() => {
    return getStageSummary(currentStage.levelNumber, curriculumProgress.completedLessonIds);
  }, [currentStage, curriculumProgress.completedLessonIds]);

  const isStageComplete = stageSummary.completed === stageSummary.total && stageSummary.total > 0;

  // Offsets layout pattern for Duolingo-style winding zigzag trail
  const offsetPattern: Array<'center' | 'left' | 'center' | 'right'> = [
    'center',
    'left',
    'center',
    'right',
    'center',
    'left',
    'center',
    'right',
  ];

  const handleNodePress = (lessonId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push(`/lesson/${lessonId}` as any);
  };

  const handleAdvanceToNextStage = () => {
    if (selectedStageIndex < CURRICULUM_DATA.length - 1) {
      setSelectedStageIndex(selectedStageIndex + 1);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      {/* --- HEADER --- */}
      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
          <Text style={styles.headerTag}>YOUR ARNIS JOURNEY</Text>
          <Text style={styles.headerSubtitle}>Learn step by step</Text>
        </View>

        {/* Stage Tabs Switcher */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.stageTabsContainer}
        >
          {CURRICULUM_DATA.map((lvl, idx) => {
            const isSelected = selectedStageIndex === idx;
            const lvlSummary = getStageSummary(lvl.levelNumber, curriculumProgress.completedLessonIds);
            const isFinished = lvlSummary.completed === lvlSummary.total && lvlSummary.total > 0;

            return (
              <TouchableOpacity
                key={lvl.id}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setSelectedStageIndex(idx);
                }}
                style={[
                  styles.stageTab,
                  isSelected && styles.stageTabSelected,
                ]}
                activeOpacity={0.8}
              >
                <Text style={[styles.stageTabText, isSelected && styles.stageTabTextSelected]}>
                  Stage {lvl.levelNumber + 1}
                </Text>
                {isFinished && (
                  <Ionicons
                    name="checkmark-circle"
                    size={14}
                    color={isSelected ? '#15803D' : '#16A34A'}
                    style={{ marginLeft: 4 }}
                  />
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* --- SCROLLING JOURNEY PATH --- */}
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Stage Hero Banner */}
        <View style={styles.stageHeroBanner}>
          <View style={styles.stageHeroContent}>
            <Text style={styles.stageHeroTag}>STAGE {currentStage.levelNumber + 1}</Text>
            <Text style={styles.stageHeroTitle}>{currentStage.name}</Text>
            <Text style={styles.stageHeroTagline}>{currentStage.tagline}</Text>

            {/* Stage Progress Pill */}
            <View style={styles.stageProgressRow}>
              <View style={styles.stageProgressBarTrack}>
                <View
                  style={[
                    styles.stageProgressBarFill,
                    { width: `${stageSummary.percent}%` },
                  ]}
                />
              </View>
              <Text style={styles.stageProgressText}>
                {stageSummary.completed} / {stageSummary.total} complete
              </Text>
            </View>
          </View>

          {/* Coach Mascot cheering at top of stage */}
          <CoachCharacter
            pose={isStageComplete ? 'celebrating' : 'waving'}
            size={74}
            style={styles.stageCoach}
          />
        </View>

        {/* --- WINDING LESSON PATH NODES --- */}
        <View style={styles.pathWrapper}>
          {currentStage.lessons.map((lesson, index) => {
            const isCompleted = curriculumProgress.completedLessonIds.includes(lesson.id);
            const isCurrent = lesson.id === curriculumProgress.currentLessonId;
            const isLocked = !isCompleted && !isCurrent;

            let nodeStatus: NodeStatus = 'locked';
            if (isCompleted) nodeStatus = 'completed';
            else if (isCurrent) nodeStatus = 'current';

            const alignOffset = offsetPattern[index % offsetPattern.length];
            const nextOffset =
              index < currentStage.lessons.length - 1
                ? offsetPattern[(index + 1) % offsetPattern.length]
                : 'center';

            return (
              <React.Fragment key={lesson.id}>
                {/* Connector line from previous node if not first */}
                {index > 0 && (
                  <JourneyConnector
                    startOffset={offsetPattern[(index - 1) % offsetPattern.length]}
                    endOffset={alignOffset}
                    isCompleted={curriculumProgress.completedLessonIds.includes(currentStage.lessons[index - 1].id)}
                  />
                )}

                {/* Lesson Node */}
                <JourneyNode
                  id={lesson.id}
                  number={lesson.lessonNumber}
                  title={lesson.title}
                  status={nodeStatus}
                  durationMinutes={lesson.durationMinutes}
                  alignOffset={alignOffset}
                  onPress={() => handleNodePress(lesson.id)}
                />
              </React.Fragment>
            );
          })}

          {/* Final Stage Milestone Connector */}
          <JourneyConnector
            startOffset={offsetPattern[(currentStage.lessons.length - 1) % offsetPattern.length]}
            endOffset="center"
            isCompleted={isStageComplete}
          />

          {/* Milestone Chest / Trophy Node */}
          <JourneyNode
            id={`milestone_${currentStage.id}`}
            number={99}
            title={isStageComplete ? 'Stage Mastered! 🏆' : 'Stage Milestone'}
            status={isStageComplete ? 'completed' : 'milestone'}
            isMilestone={true}
            alignOffset="center"
            onPress={() => {
              if (isStageComplete && selectedStageIndex < CURRICULUM_DATA.length - 1) {
                handleAdvanceToNextStage();
              }
            }}
          />
        </View>

        {/* Stage Completion Celebration Card */}
        {isStageComplete ? (
          <View style={styles.stageCelebrationCard}>
            <CoachCharacter pose="celebrating" size={88} />
            <Text style={styles.stageCelebrationTitle}>🎉 STAGE COMPLETE!</Text>
            <Text style={styles.stageCelebrationBody}>
              You have mastered all lessons in {currentStage.name}!
            </Text>
            {selectedStageIndex < CURRICULUM_DATA.length - 1 ? (
              <TactileButton
                title={`UNLOCK STAGE ${selectedStageIndex + 2} →`}
                variant="primary"
                size="md"
                onPress={handleAdvanceToNextStage}
                style={{ marginTop: 14 }}
              />
            ) : (
              <Text style={styles.allCompleteText}>
                You have completed the entire Arnis Curriculum! Mabuhay ang Sining ng Arnis! 🇵🇭
              </Text>
            )}
          </View>
        ) : (
          <View style={styles.keepGoingCard}>
            <Ionicons name="sparkles" size={18} color="#D97706" style={{ marginRight: 8 }} />
            <Text style={styles.keepGoingText}>
              Complete {stageSummary.remaining} more lesson{stageSummary.remaining > 1 ? 's' : ''} to unlock the next stage!
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: MartialTheme.colors.background,
  },
  container: {
    flex: 1,
  },
  header: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: MartialTheme.colors.border,
    paddingTop: 10,
    paddingBottom: 6,
  },
  headerTitleRow: {
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  headerTag: {
    fontSize: 18,
    fontWeight: '900',
    color: MartialTheme.colors.text,
    letterSpacing: -0.2,
  },
  headerSubtitle: {
    fontSize: 13,
    color: MartialTheme.colors.textMuted,
    fontWeight: '600',
    marginTop: 2,
  },
  stageTabsContainer: {
    paddingHorizontal: 16,
    gap: 8,
    paddingBottom: 6,
  },
  stageTab: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: MartialTheme.colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: MartialTheme.colors.border,
    flexDirection: 'row',
    alignItems: 'center',
  },
  stageTabSelected: {
    backgroundColor: '#DCFCE7',
    borderColor: '#15803D',
  },
  stageTabText: {
    fontSize: 12,
    fontWeight: '700',
    color: MartialTheme.colors.textSecondary,
  },
  stageTabTextSelected: {
    color: '#15803D',
    fontWeight: '800',
  },
  scrollContent: {
    paddingBottom: 60,
  },
  stageHeroBanner: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: MartialTheme.colors.border,
    borderBottomWidth: 4,
    borderBottomColor: MartialTheme.colors.border3D,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stageHeroContent: {
    flex: 1,
    paddingRight: 10,
  },
  stageHeroTag: {
    fontSize: 11,
    fontWeight: '900',
    color: MartialTheme.colors.bambooDark,
    letterSpacing: 0.8,
  },
  stageHeroTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: MartialTheme.colors.text,
    marginTop: 2,
  },
  stageHeroTagline: {
    fontSize: 12,
    color: MartialTheme.colors.textSecondary,
    marginTop: 4,
    lineHeight: 16,
  },
  stageProgressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    gap: 10,
  },
  stageProgressBarTrack: {
    flex: 1,
    height: 8,
    backgroundColor: '#E5E0D3',
    borderRadius: 4,
    overflow: 'hidden',
  },
  stageProgressBarFill: {
    height: '100%',
    backgroundColor: MartialTheme.colors.primary,
    borderRadius: 4,
  },
  stageProgressText: {
    fontSize: 11,
    fontWeight: '700',
    color: MartialTheme.colors.textSecondary,
  },
  stageCoach: {
    marginLeft: 6,
  },
  pathWrapper: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  stageCelebrationCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 22,
    padding: 22,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#86EFAC',
    borderBottomWidth: 5,
    borderBottomColor: '#16A34A',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 5,
    elevation: 3,
  },
  stageCelebrationTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#15803D',
    marginTop: 8,
  },
  stageCelebrationBody: {
    fontSize: 14,
    color: MartialTheme.colors.textSecondary,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 20,
  },
  allCompleteText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#15803D',
    textAlign: 'center',
    marginTop: 12,
  },
  keepGoingCard: {
    backgroundColor: '#FEF3C7',
    marginHorizontal: 20,
    marginTop: 16,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  keepGoingText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#92400E',
    textAlign: 'center',
  },
});
