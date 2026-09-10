import React, { useMemo, useState } from 'react';
import {
  Alert,
  Dimensions,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Svg, { Circle, Defs, LinearGradient, Path, Stop, Text as SvgText } from 'react-native-svg';
import { WebView } from 'react-native-webview';

import { MartialTheme } from '@/constants/theme';
import { CoachCharacter } from '@/components/ui/CoachCharacter';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { TactileButton } from '@/components/ui/TactileButton';
import { StrikeRadarChart } from '@/components/StrikeRadarChart';
import { WhyFailedModal } from '@/components/WhyFailedModal';
import {
  clearHistory,
  getHistory,
  getStrikeMasteryStats,
  MasteryStats,
  SessionItem,
  STRIKES_CATALOG,
} from '@/constants/historyStore';
import { CURRICULUM_DATA, getCurriculumProgress, getStageSummary } from '@/constants/curriculumStore';

const { width } = Dimensions.get('window');

export default function ProgressHistoryScreen() {
  const router = useRouter();
  const [showDetailedRadar, setShowDetailedRadar] = useState(false);
  const [historyList, setHistoryList] = useState<SessionItem[]>([]);
  const [masteryStats, setMasteryStats] = useState<MasteryStats>(() => getStrikeMasteryStats([]));
  const [selectedSession, setSelectedSession] = useState<SessionItem | null>(null);
  const [whySession, setWhySession] = useState<SessionItem | null>(null);
  const [selectedRadarStrikeId, setSelectedRadarStrikeId] = useState<string | null>(null);
  const [timelineFilter, setTimelineFilter] = useState<'all' | 'single' | 'anyo' | 'mastered'>('all');
  const [completedLessonIds, setCompletedLessonIds] = useState<string[]>([]);
  const [stats, setStats] = useState({
    avgScore: 0,
    bestScore: 0,
    sessionsCount: 0,
  });

  // Calculate 4-pillar averages across all recorded sessions
  const pillarAverages = useMemo(() => {
    if (historyList.length === 0) {
      return { stance: 82, elbow: 85, guard: 88, wrist: 86 };
    }
    let totalStance = 0;
    let totalElbow = 0;
    let totalGuard = 0;
    let totalWrist = 0;
    const count = historyList.length;

    historyList.forEach((s) => {
      totalStance += s.breakdown?.stance?.score ?? s.breakdown?.knee?.score ?? 80;
      totalElbow += s.breakdown?.elbow?.score ?? s.score;
      totalGuard += s.breakdown?.guard?.score ?? 80;
      totalWrist += s.breakdown?.wrist?.score ?? 85;
    });

    return {
      stance: Math.round(totalStance / count),
      elbow: Math.round(totalElbow / count),
      guard: Math.round(totalGuard / count),
      wrist: Math.round(totalWrist / count),
    };
  }, [historyList]);

  // Load history whenever screen gains focus
  useFocusEffect(
    React.useCallback(() => {
      let isMounted = true;
      getHistory().then((history) => {
        if (isMounted) {
          const list = history || [];
          setHistoryList(list);
          setMasteryStats(getStrikeMasteryStats(list));
          if (list.length > 0) {
            const count = list.length;
            const sum = list.reduce((acc, curr) => acc + curr.score, 0);
            const best = Math.max(...list.map((h) => h.score));
            setStats({
              avgScore: Math.round(sum / count),
              bestScore: best,
              sessionsCount: count,
            });
          } else {
            setStats({ avgScore: 0, bestScore: 0, sessionsCount: 0 });
          }
        }
      });

      getCurriculumProgress().then((prog) => {
        if (isMounted) {
          setCompletedLessonIds(prog.completedLessonIds);
        }
      });

      return () => {
        isMounted = false;
      };
    }, [])
  );

  const getStarCount = (bestScore: number) => {
    if (bestScore >= 95) return 5;
    if (bestScore >= 85) return 4;
    if (bestScore >= 70) return 3;
    if (bestScore >= 50) return 2;
    if (bestScore > 0) return 1;
    return 0;
  };

  const getRankSashColor = (rankTitle: string) => {
    const lower = rankTitle.toLowerCase();
    if (lower.includes('master') || lower.includes('black')) return '#D4AF37';
    if (lower.includes('senior') || lower.includes('brown')) return '#A16207';
    if (lower.includes('adept') || lower.includes('blue')) return '#3B82F6';
    if (lower.includes('intermediate') || lower.includes('green')) return '#10B981';
    if (lower.includes('apprentice') || lower.includes('yellow')) return '#F59E0B';
    return '#E2E8F0';
  };

  const getScoreColor = (score: number) => {
    if (score >= 95) return '#10B981'; // Green
    if (score >= 85) return '#3B82F6'; // Blue
    if (score >= 70) return '#F59E0B'; // Orange
    if (score > 0) return '#EF4444'; // Red
    return '#64748B';
  };

  // Derive the Current Focus strike (weakest attempted or next unattempted)
  const currentFocusStrike = useMemo(() => {
    const unmastered = masteryStats.strikes.filter((s) => !s.isMastered && s.attempts > 0);
    if (unmastered.length > 0) {
      return [...unmastered].sort((a, b) => a.bestScore - b.bestScore)[0];
    }
    const unattempted = masteryStats.strikes.filter((s) => s.attempts === 0);
    if (unattempted.length > 0) {
      return unattempted[0];
    }
    return [...masteryStats.strikes].sort((a, b) => a.avgScore - b.avgScore)[0] || masteryStats.strikes[0];
  }, [masteryStats]);

  const coachFocusAdvice = useMemo(() => {
    if (!currentFocusStrike) return 'Practice regularly to build martial discipline and muscle memory!';
    if (currentFocusStrike.attempts === 0) {
      return `Start with Strike ${currentFocusStrike.strikeNumber} to lock in the proper chamber angle and strike trajectory.`;
    }
    if (currentFocusStrike.bestScore < 70) {
      return `Focus on keeping your Kalasag check hand pinned firmly to your chest and maintain a 45° diagonal slice.`;
    }
    if (currentFocusStrike.bestScore < 85) {
      return `You're close to mastery! Concentrate on sharp wrist lock (Pitik) at the impact zone.`;
    }
    return 'Technique mastered! Keep up your repetition to maintain muscle memory.';
  }, [currentFocusStrike]);

  // Chronological list sorted newest first for the timeline
  const sortedSessions = useMemo(() => {
    return [...historyList].reverse();
  }, [historyList]);

  // Handle Clear History with confirmation
  const handleClearAll = () => {
    Alert.alert(
      'Reset Practice History',
      'Are you sure you want to clear your recorded session history? Your curriculum progress will remain intact.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset History',
          style: 'destructive',
          onPress: async () => {
            await clearHistory();
            setHistoryList([]);
            setMasteryStats(getStrikeMasteryStats([]));
            setStats({ avgScore: 0, bestScore: 0, sessionsCount: 0 });
          },
        },
      ]
    );
  };

  // Render SVG Line Chart based on scores
  const renderTrendChart = () => {
    const dataPoints = historyList.slice(-6); // Last 6 items
    if (dataPoints.length === 0) return null;

    const chartWidth = width - 72;
    const chartHeight = 120;
    const paddingX = 36;
    const paddingY = 24;

    const spacingX =
      dataPoints.length > 1 ? (chartWidth - 2 * paddingX) / (dataPoints.length - 1) : 0;

    const minYVal = 60;
    const maxYVal = 100;

    const points = dataPoints.map((item, index) => {
      const x = paddingX + index * spacingX;
      const clampedScore = Math.max(minYVal, Math.min(maxYVal, item.score));
      const ratio = (clampedScore - minYVal) / (maxYVal - minYVal);
      const y = chartHeight - paddingY - ratio * (chartHeight - 2 * paddingY);
      return { x, y, score: item.score };
    });

    const linePathStr = points.reduce((acc, p, i) => {
      return i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`;
    }, '');

    return (
      <View style={styles.chartContainer}>
        <Text style={styles.chartHeading}>PERFORMANCE TRAJECTORY (LAST SESSIONS)</Text>
        <View style={styles.svgWrapper}>
          <Svg width={chartWidth} height={chartHeight}>
            {/* Guide line at 85% (Mastery threshold) */}
            <Path
              d={`M ${paddingX - 10} ${chartHeight - paddingY - 0.625 * (chartHeight - 2 * paddingY)} L ${chartWidth - paddingX + 10} ${chartHeight - paddingY - 0.625 * (chartHeight - 2 * paddingY)}`}
              stroke="#BBF7D0"
              strokeWidth={1}
              strokeDasharray="4,4"
            />
            {points.length > 1 && (
              <Path d={linePathStr} fill="none" stroke={MartialTheme.colors.primary} strokeWidth={3} />
            )}
            {points.map((p, i) => (
              <React.Fragment key={i}>
                <Circle cx={p.x} cy={p.y} r={5} fill={MartialTheme.colors.primary} stroke="#FFFFFF" strokeWidth={2} />
                <SvgText
                  x={p.x}
                  y={p.y - 10}
                  fill={MartialTheme.colors.text}
                  fontSize="11"
                  fontWeight="bold"
                  textAnchor="middle"
                >
                  {p.score}
                </SvgText>
              </React.Fragment>
            ))}
          </Svg>
        </View>
      </View>
    );
  };

  const attemptedCount = masteryStats.strikes.filter((s) => s.attempts > 0).length;

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.push('/')} style={styles.backButton}>
          <Ionicons name="chevron-back" size={22} color={MartialTheme.colors.text} />
          <Text style={styles.headerTitle}>Your Progress</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* 1. HERO PROGRESS CARD */}
        <View style={styles.masterySummaryCard}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flex: 1, paddingRight: 8 }}>
              <Text style={styles.progressSuperTag}>LOOK HOW FAR YOU'VE COME</Text>
              <Text style={styles.progressHeroText}>
                {masteryStats.masteredCount} of 12 Techniques Mastered
              </Text>
              <View style={[styles.rankPill, { marginTop: 6 }]}>
                <View
                  style={[
                    styles.sashColorDot,
                    { backgroundColor: getRankSashColor(masteryStats.rankTitle) },
                  ]}
                />
                <Text style={styles.rankPillText} numberOfLines={1}>
                  {masteryStats.rankTitle}
                </Text>
              </View>
            </View>
            <CoachCharacter pose={masteryStats.masteredCount >= 3 ? 'celebrating' : 'stance'} size={85} />
          </View>

          {/* Mastery Progress Bar */}
          <View style={{ marginTop: 14 }}>
            <ProgressBar
              progress={masteryStats.overallMastery}
              showPercentage={true}
              color={MartialTheme.colors.primary}
              height={10}
            />
          </View>
        </View>

        {/* 2. CURRENT FOCUS CARD */}
        {currentFocusStrike && (
          <View style={styles.focusHeroCard}>
            <View style={styles.focusHeroHeaderRow}>
              <View style={styles.focusBadge}>
                <Ionicons name="sparkles" size={13} color="#B45309" style={{ marginRight: 5 }} />
                <Text style={styles.focusBadgeText}>CURRENT FOCUS</Text>
              </View>
              <View style={styles.focusScorePill}>
                <Text style={styles.focusScorePillText}>
                  {currentFocusStrike.bestScore > 0 ? `${currentFocusStrike.bestScore}%` : 'Not Attempted'}
                </Text>
              </View>
            </View>

            <Text style={styles.focusStrikeTitle}>
              Strike {currentFocusStrike.strikeNumber} — {currentFocusStrike.name}
            </Text>
            <Text style={styles.focusStrikeTarget}>Target: {currentFocusStrike.target}</Text>

            {/* Stars */}
            <View style={{ flexDirection: 'row', gap: 4, marginVertical: 8 }}>
              {[1, 2, 3, 4, 5].map((s) => (
                <Ionicons
                  key={s}
                  name={s <= getStarCount(currentFocusStrike.bestScore) ? 'star' : 'star-outline'}
                  size={16}
                  color={s <= getStarCount(currentFocusStrike.bestScore) ? '#F59E0B' : '#D1D5DB'}
                />
              ))}
            </View>

            {/* Coach Speech Bubble */}
            <View style={styles.focusCoachBubble}>
              <Text style={styles.focusCoachBubbleLabel}>COACH'S ADVICE</Text>
              <Text style={styles.focusCoachBubbleText}>"{coachFocusAdvice}"</Text>
            </View>

            {/* Action Button */}
            <TactileButton
              title={`PRACTICE STRIKE ${currentFocusStrike.strikeNumber}`}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                router.push({
                  pathname: '/evaluate',
                  params: { strikeId: currentFocusStrike.id, mode: 'guided' },
                });
              }}
              variant="primary"
              size="md"
              icon={<Ionicons name="play" size={16} color="#FFFFFF" />}
              style={{ width: '100%', marginTop: 6 }}
            />
          </View>
        )}

        {/* 3. YOUR STRIKES (12 CANONICAL TECHNIQUES) */}
        <View style={{ marginTop: 20, marginBottom: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <View>
              <Text style={styles.sectionHeaderTitle}>YOUR STRIKES</Text>
              <Text style={styles.sectionHeaderSub}>The 12 Canonical Arnis Strikes</Text>
            </View>
            <View style={styles.masteryCounterBadge}>
              <Text style={styles.masteryCounterText}>
                {masteryStats.masteredCount}/12 Mastered
              </Text>
            </View>
          </View>

          {masteryStats.strikes.map((st) => {
            const stars = getStarCount(st.bestScore);
            return (
              <View key={st.id} style={styles.strikeRowCard}>
                <View style={styles.strikeRowLeft}>
                  <View
                    style={[
                      styles.strikeNumberCircle,
                      {
                        backgroundColor: st.isMastered
                          ? '#DCFCE7'
                          : st.bestScore > 0
                          ? '#FEF3C7'
                          : '#F3F4F6',
                        borderColor: st.isMastered
                          ? '#86EFAC'
                          : st.bestScore > 0
                          ? '#FDE68A'
                          : '#E5E7EB',
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.strikeNumberText,
                        {
                          color: st.isMastered
                            ? '#15803D'
                            : st.bestScore > 0
                            ? '#B45309'
                            : '#6B7280',
                        },
                      ]}
                    >
                      {st.strikeNumber}
                    </Text>
                  </View>

                  <View style={{ flex: 1, paddingRight: 8 }}>
                    <Text style={styles.strikeRowName}>{st.name}</Text>
                    <Text style={styles.strikeRowTarget}>{st.target}</Text>
                    <View style={{ flexDirection: 'row', gap: 3, marginTop: 4 }}>
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Ionicons
                          key={s}
                          name={s <= stars ? 'star' : 'star-outline'}
                          size={12}
                          color={s <= stars ? '#F59E0B' : '#E5E7EB'}
                        />
                      ))}
                    </View>
                  </View>
                </View>

                <View style={styles.strikeRowRight}>
                  {st.bestScore > 0 && (
                    <Text
                      style={[
                        styles.strikeRowScore,
                        { color: getScoreColor(st.bestScore) },
                      ]}
                    >
                      {st.bestScore}%
                    </Text>
                  )}

                  {st.isMastered ? (
                    <View style={styles.masteredBadge}>
                      <Ionicons name="checkmark-circle" size={14} color="#15803D" style={{ marginRight: 4 }} />
                      <Text style={styles.masteredBadgeText}>MASTERED</Text>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={styles.practiceStrikeBtn}
                      activeOpacity={0.8}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        router.push({
                          pathname: '/evaluate',
                          params: { strikeId: st.id, mode: 'guided' },
                        });
                      }}
                    >
                      <Ionicons name="play" size={12} color="#FFFFFF" style={{ marginRight: 4 }} />
                      <Text style={styles.practiceStrikeBtnText}>PRACTICE</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          })}
        </View>

        {/* 4. LEARNING MILESTONES */}
        <View style={styles.milestonesCard}>
          <Text style={styles.milestonesTag}>MILESTONES</Text>
          <Text style={styles.milestonesTitle}>Purok Training Achievements</Text>

          <View style={{ gap: 10, marginTop: 12 }}>
            {[
              {
                id: 'm1',
                title: 'First Repetition Completed',
                desc: 'Complete your first camera evaluation',
                completed: historyList.length > 0,
                icon: 'trophy',
              },
              {
                id: 'm2',
                title: '3 Canonical Strikes Mastered',
                desc: 'Score 85%+ on at least 3 distinct strikes',
                completed: masteryStats.masteredCount >= 3,
                icon: 'ribbon',
              },
              {
                id: 'm3',
                title: 'Anyo Kata Combination',
                desc: 'Successfully complete a multi-strike Anyo routine',
                completed: historyList.some((h) => !!h.routineId),
                icon: 'sword-cross',
              },
              {
                id: 'm4',
                title: 'Intermediate Belt Promotion',
                desc: 'Master at least 6 canonical strikes (Green Sash)',
                completed: masteryStats.masteredCount >= 6,
                icon: 'medal',
              },
              {
                id: 'm5',
                title: 'Lakan / Master Practitioner',
                desc: 'Master all 12 strikes with high motor precision',
                completed: masteryStats.masteredCount >= 12,
                icon: 'crown',
              },
            ].map((m) => (
              <View key={m.id} style={styles.milestoneRow}>
                <View
                  style={[
                    styles.milestoneIconBox,
                    m.completed && styles.milestoneIconBoxComplete,
                  ]}
                >
                  <Ionicons
                    name={m.completed ? 'checkmark' : 'lock-closed'}
                    size={14}
                    color={m.completed ? '#FFFFFF' : '#9CA3AF'}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text
                    style={[
                      styles.milestoneRowTitle,
                      m.completed && { color: MartialTheme.colors.text },
                    ]}
                  >
                    {m.title}
                  </Text>
                  <Text style={styles.milestoneRowDesc}>{m.desc}</Text>
                </View>
                {m.completed && (
                  <Text style={styles.milestoneCompleteTag}>Earned ✓</Text>
                )}
              </View>
            ))}
          </View>
        </View>

        {/* 5. RECENT PRACTICE TIMELINE */}
        <View style={{ marginTop: 14 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <View>
              <Text style={styles.sectionHeaderTitle}>PRACTICE TIMELINE</Text>
              <Text style={styles.sectionHeaderSub}>Recent sessions & continuous improvement</Text>
            </View>
            {historyList.length > 0 && (
              <TouchableOpacity onPress={handleClearAll}>
                <Text style={styles.clearAllBtn}>Reset History</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Filter Chips */}
          {historyList.length > 0 && (
            <View style={styles.filterChipsRow}>
              {[
                { id: 'all', label: `All (${historyList.length})` },
                { id: 'single', label: `Strikes (${historyList.filter((h) => !h.routineId).length})` },
                { id: 'anyo', label: `Anyo (${historyList.filter((h) => !!h.routineId).length})` },
                { id: 'mastered', label: `Mastered (${historyList.filter((h) => h.score >= 85).length})` },
              ].map((filter) => (
                <TouchableOpacity
                  key={filter.id}
                  style={[
                    styles.filterChip,
                    timelineFilter === filter.id && styles.filterChipActive,
                  ]}
                  onPress={() => setTimelineFilter(filter.id as any)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      timelineFilter === filter.id && styles.filterChipTextActive,
                    ]}
                  >
                    {filter.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Session Cards or Encouraging Empty State */}
          {(() => {
            const filteredList = sortedSessions.filter((item) => {
              if (timelineFilter === 'single') return !item.routineId;
              if (timelineFilter === 'anyo') return !!item.routineId;
              if (timelineFilter === 'mastered') return item.score >= 85;
              return true;
            });

            if (filteredList.length === 0) {
              return (
                <View style={styles.emptyCard}>
                  <CoachCharacter pose="stance" size={80} />
                  <Text style={styles.emptyTitle}>No Practice Sessions Yet</Text>
                  <Text style={styles.emptySubtitle}>
                    {historyList.length === 0
                      ? 'Complete your first practice session to see your progress and track improvement here!'
                      : 'No recorded sessions match the selected filter.'}
                  </Text>
                  <TactileButton
                    title="START FIRST PRACTICE"
                    onPress={() => router.push('/evaluate')}
                    variant="primary"
                    size="md"
                    icon={<Ionicons name="play" size={16} color="#FFFFFF" />}
                    style={{ marginTop: 12 }}
                  />
                </View>
              );
            }

            return filteredList.map((item, idx) => {
              // Compare with earlier attempt of the same strike
              const olderAttempt = sortedSessions.slice(idx + 1).find((s) => s.strikeId === item.strikeId);
              const delta = olderAttempt ? item.score - olderAttempt.score : null;

              return (
                <TouchableOpacity
                  key={item.id}
                  style={styles.logCard}
                  activeOpacity={0.8}
                  onPress={() => setSelectedSession(item)}
                >
                  <View
                    style={[
                      styles.logScoreCircle,
                      { borderColor: getScoreColor(item.score) },
                    ]}
                  >
                    <Text style={[styles.logScoreText, { color: getScoreColor(item.score) }]}>
                      {item.score}%
                    </Text>
                  </View>

                  <View style={styles.logDetails}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                      <Text style={styles.logTitle}>{item.strikeName}</Text>
                      {item.routineId && (
                        <View style={styles.anyoBadge}>
                          <Text style={styles.anyoBadgeText}>ANYO FORM</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.logSubTitle}>{item.date}</Text>

                    {/* Improvement Delta Badge */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 6 }}>
                      {delta !== null ? (
                        delta > 0 ? (
                          <View style={styles.deltaPositiveBadge}>
                            <Text style={styles.deltaPositiveText}>↑ +{delta} since last time</Text>
                          </View>
                        ) : delta === 0 ? (
                          <View style={styles.deltaNeutralBadge}>
                            <Text style={styles.deltaNeutralText}>= Same as last</Text>
                          </View>
                        ) : (
                          <View style={styles.deltaNegativeBadge}>
                            <Text style={styles.deltaNegativeText}>↓ {Math.abs(delta)} from last</Text>
                          </View>
                        )
                      ) : (
                        <View style={styles.deltaFirstBadge}>
                          <Text style={styles.deltaFirstText}>First Attempt ⭐</Text>
                        </View>
                      )}
                    </View>
                  </View>

                  <View style={{ alignItems: 'flex-end', gap: 6 }}>
                    <Text style={[styles.logGrade, { color: getScoreColor(item.score) }]}>
                      {item.grade.replace('Grade ', '')}
                    </Text>
                    <TouchableOpacity
                      style={styles.whySmallBtn}
                      onPress={(e) => {
                        e.stopPropagation();
                        setWhySession(item);
                      }}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="help-circle" size={11} color="#0284C7" style={{ marginRight: 2 }} />
                      <Text style={styles.whySmallBtnText}>Why?</Text>
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              );
            });
          })()}
        </View>

        {/* 6. COLLAPSIBLE DETAILED BIOMECHANICAL ANALYSIS */}
        <TouchableOpacity
          style={styles.accordionHeaderBtn}
          activeOpacity={0.8}
          onPress={() => setShowDetailedRadar(!showDetailedRadar)}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
            <MaterialCommunityIcons
              name="chart-bell-curve-cumulative"
              size={18}
              color={MartialTheme.colors.bambooDark}
              style={{ marginRight: 8 }}
            />
            <View style={{ flex: 1 }}>
              <Text style={styles.accordionHeaderBtnText}>
                {showDetailedRadar ? 'Hide Detailed Analysis' : 'Detailed Biomechanical Analysis'}
              </Text>
              <Text style={styles.accordionHeaderSubText}>
                12-Axis Radar, Kinetic Pillars & Motor Diagnostics
              </Text>
            </View>
          </View>
          <Ionicons
            name={showDetailedRadar ? 'chevron-up' : 'chevron-down'}
            size={18}
            color={MartialTheme.colors.textMuted}
          />
        </TouchableOpacity>

        {showDetailedRadar && (
          <View style={styles.detailedAccordionContent}>
            {/* Quick Stats Grid */}
            <View style={styles.statsGrid}>
              <View style={styles.statMetricItem}>
                <Text style={styles.statMetricValue}>{stats.avgScore}%</Text>
                <Text style={styles.statMetricLabel}>AVG SCORE</Text>
              </View>
              <View style={styles.statMetricDivider} />
              <View style={styles.statMetricItem}>
                <Text style={[styles.statMetricValue, { color: getScoreColor(stats.bestScore) }]}>
                  {stats.bestScore}%
                </Text>
                <Text style={styles.statMetricLabel}>BEST SCORE</Text>
              </View>
              <View style={styles.statMetricDivider} />
              <View style={styles.statMetricItem}>
                <Text style={styles.statMetricValue}>{stats.sessionsCount}</Text>
                <Text style={styles.statMetricLabel}>SESSIONS</Text>
              </View>
              <View style={styles.statMetricDivider} />
              <View style={styles.statMetricItem}>
                <Text style={[styles.statMetricValue, { color: MartialTheme.colors.bambooDark }]}>
                  {attemptedCount}/12
                </Text>
                <Text style={styles.statMetricLabel}>ATTEMPTED</Text>
              </View>
            </View>

            {/* Score Trend Line Chart */}
            {historyList.length > 0 && renderTrendChart()}

            {/* 12-Axis Radar Chart */}
            <StrikeRadarChart
              masteryStats={masteryStats}
              onSelectStrike={(st) => setSelectedRadarStrikeId(st.id)}
            />

            {/* 4-Pillar Kinetic Averages */}
            <Text style={styles.breakdownSectionHeading}>4-PILLAR KINETIC ALIGNMENT</Text>
            <Text style={styles.breakdownSectionSub}>
              Motor precision averaged across all recorded repetitions
            </Text>

            {/* Stance & Tindig */}
            <View style={styles.pillarCard}>
              <View style={styles.pillarHeaderRow}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <MaterialCommunityIcons name="human-male-height" size={18} color="#F59E0B" style={{ marginRight: 8 }} />
                  <Text style={styles.pillarTitle}>Stance & Base Stability (Tindig)</Text>
                </View>
                <Text style={[styles.pillarScoreText, { color: getScoreColor(pillarAverages.stance) }]}>
                  {pillarAverages.stance}%
                </Text>
              </View>
              <View style={styles.pillarProgressBarTrack}>
                <View style={[styles.pillarProgressBarFill, { width: `${pillarAverages.stance}%`, backgroundColor: getScoreColor(pillarAverages.stance) }]} />
              </View>
              <Text style={styles.pillarDesc}>Lower body base, knee flexion (135°-165°), and core athletic posture</Text>
            </View>

            {/* Striking Arm Trajectory */}
            <View style={styles.pillarCard}>
              <View style={styles.pillarHeaderRow}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <MaterialCommunityIcons name="sword" size={18} color="#3B82F6" style={{ marginRight: 8 }} />
                  <Text style={styles.pillarTitle}>Strike Trajectory & Slicing Path</Text>
                </View>
                <Text style={[styles.pillarScoreText, { color: getScoreColor(pillarAverages.elbow) }]}>
                  {pillarAverages.elbow}%
                </Text>
              </View>
              <View style={styles.pillarProgressBarTrack}>
                <View style={[styles.pillarProgressBarFill, { width: `${pillarAverages.elbow}%`, backgroundColor: getScoreColor(pillarAverages.elbow) }]} />
              </View>
              <Text style={styles.pillarDesc}>Lead elbow angle following canonical 45° diagonal and horizontal planes</Text>
            </View>

            {/* Kalasag Guard Hand */}
            <View style={styles.pillarCard}>
              <View style={styles.pillarHeaderRow}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <MaterialCommunityIcons name="shield-check" size={18} color="#10B981" style={{ marginRight: 8 }} />
                  <Text style={styles.pillarTitle}>Check Hand Defense (Kalasag)</Text>
                </View>
                <Text style={[styles.pillarScoreText, { color: getScoreColor(pillarAverages.guard) }]}>
                  {pillarAverages.guard}%
                </Text>
              </View>
              <View style={styles.pillarProgressBarTrack}>
                <View style={[styles.pillarProgressBarFill, { width: `${pillarAverages.guard}%`, backgroundColor: getScoreColor(pillarAverages.guard) }]} />
              </View>
              <Text style={styles.pillarDesc}>Shield hand pinned to chest to guard against incoming counter-strikes</Text>
            </View>

            {/* Wrist Snap Pitik */}
            <View style={styles.pillarCard}>
              <View style={styles.pillarHeaderRow}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <MaterialCommunityIcons name="flash" size={18} color="#8B5CF6" style={{ marginRight: 8 }} />
                  <Text style={styles.pillarTitle}>Wrist Snap & Alignment (Pitik)</Text>
                </View>
                <Text style={[styles.pillarScoreText, { color: getScoreColor(pillarAverages.wrist) }]}>
                  {pillarAverages.wrist}%
                </Text>
              </View>
              <View style={styles.pillarProgressBarTrack}>
                <View style={[styles.pillarProgressBarFill, { width: `${pillarAverages.wrist}%`, backgroundColor: getScoreColor(pillarAverages.wrist) }]} />
              </View>
              <Text style={styles.pillarDesc}>Sharp wrist snap at the impact zone with straight alignment (≤ 15° offset)</Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Session Replay Modal */}
      <Modal
        visible={!!selectedSession}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setSelectedSession(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>{selectedSession?.strikeName}</Text>
                <Text style={styles.modalSub}>
                  {selectedSession?.description} · {selectedSession?.date}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setSelectedSession(null)} style={{ padding: 4 }}>
                <Ionicons name="close" size={22} color={MartialTheme.colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 420 }}>
              {/* Score Header */}
              <View style={styles.replayScoreHeader}>
                <View
                  style={[
                    styles.replayScoreCircle,
                    { borderColor: getScoreColor(selectedSession?.score || 0) },
                  ]}
                >
                  <Text style={[styles.replayScoreValue, { color: getScoreColor(selectedSession?.score || 0) }]}>
                    {selectedSession?.score || 0}
                  </Text>
                </View>
                <View style={{ marginLeft: 14 }}>
                  <Text style={[styles.replayGradeTitle, { color: getScoreColor(selectedSession?.score || 0) }]}>
                    {selectedSession?.grade}
                  </Text>
                  <Text style={styles.replayGradeDesc}>
                    {selectedSession?.score && selectedSession.score >= 85
                      ? 'Mastered Repetition ✓'
                      : 'Developing Repetition'}
                  </Text>
                </View>
              </View>

              {/* Video Replay (if available) */}
              {selectedSession?.replayVideoBase64 ? (
                <View style={styles.videoReplayContainer}>
                  <Text style={styles.videoReplayHeading}>SESSION MOTION REPLAY</Text>
                  <View style={styles.videoWrapper}>
                    <WebView
                      originWhitelist={['*']}
                      source={{
                        html: `
                          <!DOCTYPE html>
                          <html>
                            <head>
                              <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
                              <style>
                                body { margin: 0; background-color: #000; display: flex; align-items: center; justify-content: center; height: 100vh; }
                                video { width: 100%; height: 100%; object-fit: contain; }
                              </style>
                            </head>
                            <body>
                              <video src="${selectedSession.replayVideoBase64}" autoplay loop muted playsinline controls></video>
                            </body>
                          </html>
                        `,
                      }}
                      style={{ flex: 1 }}
                    />
                  </View>
                </View>
              ) : selectedSession?.snapshotBase64 ? (
                <View style={styles.snapshotContainer}>
                  <Text style={styles.snapshotHeading}>IMPACT ZONE SNAPSHOT</Text>
                  <Image
                    source={{ uri: selectedSession.snapshotBase64 }}
                    style={styles.snapshotImage}
                    resizeMode="contain"
                  />
                </View>
              ) : null}

              {/* Diagnostic Button */}
              <TouchableOpacity
                style={styles.whyModalBtn}
                onPress={() => setWhySession(selectedSession)}
                activeOpacity={0.8}
              >
                <Ionicons name="help-circle" size={16} color="#0284C7" style={{ marginRight: 6 }} />
                <Text style={styles.whyModalBtnText}>
                  Why Did I Get {selectedSession?.score}%? (Diagnosis)
                </Text>
              </TouchableOpacity>
            </ScrollView>

            <TouchableOpacity
              style={styles.modalCloseBtn}
              onPress={() => setSelectedSession(null)}
              activeOpacity={0.85}
            >
              <Text style={styles.modalCloseBtnText}>Close Replay</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Why Did I Fail / Diagnostic Modal */}
      {whySession && (
        <WhyFailedModal
          visible={!!whySession}
          onClose={() => setWhySession(null)}
          overallScore={whySession.score}
          grade={whySession.grade}
          strikeName={whySession.strikeName}
          strikeId={whySession.strikeId}
          breakdown={{
            elbowScore: whySession.breakdown?.elbow?.score,
            bodyScore: whySession.breakdown?.stance?.score || whySession.breakdown?.knee?.score,
            guardScore: whySession.breakdown?.guard?.score,
            wristScore: whySession.breakdown?.wrist?.score,
          }}
          onPracticeLesson={(lessonId) => {
            setWhySession(null);
            setSelectedSession(null);
            router.push({ pathname: '/evaluate', params: { strikeId: lessonId, mode: 'guided' } });
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: MartialTheme.colors.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: MartialTheme.colors.border,
    backgroundColor: '#FFFFFF',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: MartialTheme.colors.text,
    marginLeft: 8,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },

  // 1. HERO PROGRESS CARD
  masterySummaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: MartialTheme.colors.border,
    borderBottomWidth: 4,
    borderBottomColor: MartialTheme.colors.border3D,
  },
  progressSuperTag: {
    fontSize: 10,
    fontWeight: '900',
    color: MartialTheme.colors.bambooDark,
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  progressHeroText: {
    fontSize: 18,
    fontWeight: '900',
    color: MartialTheme.colors.text,
    letterSpacing: -0.2,
  },
  rankPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#FDE68A',
    alignSelf: 'flex-start',
  },
  sashColorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  rankPillText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#B45309',
    letterSpacing: 0.3,
  },

  // 2. CURRENT FOCUS HERO CARD
  focusHeroCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: MartialTheme.colors.border,
    borderBottomWidth: 4,
    borderBottomColor: MartialTheme.colors.border3D,
  },
  focusHeroHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  focusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  focusBadgeText: {
    fontSize: 10.5,
    fontWeight: '900',
    color: '#B45309',
    letterSpacing: 0.8,
  },
  focusScorePill: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  focusScorePillText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B',
  },
  focusStrikeTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: MartialTheme.colors.text,
    marginTop: 2,
  },
  focusStrikeTarget: {
    fontSize: 12,
    color: MartialTheme.colors.textSecondary,
    marginTop: 2,
  },
  focusCoachBubble: {
    backgroundColor: '#FAF8F3',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E0D3',
    marginVertical: 10,
  },
  focusCoachBubbleLabel: {
    fontSize: 9.5,
    fontWeight: '900',
    color: MartialTheme.colors.primary,
    letterSpacing: 1,
    marginBottom: 4,
  },
  focusCoachBubbleText: {
    fontSize: 12.5,
    color: MartialTheme.colors.text,
    lineHeight: 17,
    fontWeight: '500',
  },

  // 3. YOUR STRIKES
  sectionHeaderTitle: {
    fontSize: 12,
    fontWeight: '900',
    color: '#64748B',
    letterSpacing: 1.2,
  },
  sectionHeaderSub: {
    fontSize: 11,
    color: MartialTheme.colors.textMuted,
    marginTop: 1,
  },
  masteryCounterBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  masteryCounterText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#15803D',
  },
  strikeRowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: MartialTheme.colors.border,
    borderBottomWidth: 3,
    borderBottomColor: MartialTheme.colors.border3D,
    padding: 12,
    marginBottom: 8,
  },
  strikeRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  strikeNumberCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  strikeNumberText: {
    fontSize: 13,
    fontWeight: '900',
  },
  strikeRowName: {
    fontSize: 13.5,
    fontWeight: '800',
    color: MartialTheme.colors.text,
  },
  strikeRowTarget: {
    fontSize: 11,
    color: MartialTheme.colors.textSecondary,
    marginTop: 1,
  },
  strikeRowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  strikeRowScore: {
    fontSize: 13,
    fontWeight: '900',
  },
  masteredBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#86EFAC',
  },
  masteredBadgeText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#15803D',
    letterSpacing: 0.5,
  },
  practiceStrikeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: MartialTheme.colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderBottomWidth: 2,
    borderBottomColor: MartialTheme.colors.primaryDark,
  },
  practiceStrikeBtnText: {
    fontSize: 10.5,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },

  // 4. MILESTONES
  milestonesCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: MartialTheme.colors.border,
    borderBottomWidth: 4,
    borderBottomColor: MartialTheme.colors.border3D,
    marginTop: 14,
    marginBottom: 16,
  },
  milestonesTag: {
    fontSize: 10,
    fontWeight: '900',
    color: MartialTheme.colors.bambooDark,
    letterSpacing: 1.2,
  },
  milestonesTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: MartialTheme.colors.text,
    marginTop: 2,
    marginBottom: 4,
  },
  milestoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: MartialTheme.colors.divider,
    gap: 12,
  },
  milestoneIconBox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  milestoneIconBoxComplete: {
    backgroundColor: '#16A34A',
  },
  milestoneRowTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: MartialTheme.colors.textMuted,
  },
  milestoneRowDesc: {
    fontSize: 11,
    color: MartialTheme.colors.textSecondary,
    marginTop: 1,
  },
  milestoneCompleteTag: {
    fontSize: 11,
    fontWeight: '800',
    color: '#16A34A',
  },

  // 5. PRACTICE TIMELINE
  clearAllBtn: {
    fontSize: 12,
    fontWeight: '700',
    color: MartialTheme.colors.textMuted,
  },
  filterChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: MartialTheme.colors.border,
  },
  filterChipActive: {
    backgroundColor: '#FEF3C7',
    borderColor: '#FDE68A',
  },
  filterChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: MartialTheme.colors.textSecondary,
  },
  filterChipTextActive: {
    color: '#B45309',
    fontWeight: '800',
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: MartialTheme.colors.border,
    borderBottomWidth: 3,
    borderBottomColor: MartialTheme.colors.border3D,
    padding: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 10,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: MartialTheme.colors.text,
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 12.5,
    color: MartialTheme.colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 18,
  },
  logCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: MartialTheme.colors.border,
    borderBottomWidth: 3,
    borderBottomColor: MartialTheme.colors.border3D,
    padding: 14,
    marginBottom: 10,
  },
  logScoreCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 3,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  logScoreText: {
    fontSize: 14,
    fontWeight: '900',
  },
  logDetails: {
    flex: 1,
    justifyContent: 'center',
  },
  logTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: MartialTheme.colors.text,
  },
  anyoBadge: {
    backgroundColor: '#EDE9FE',
    borderColor: '#DDD6FE',
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  anyoBadgeText: {
    color: '#7C3AED',
    fontSize: 9,
    fontWeight: '900',
  },
  logSubTitle: {
    fontSize: 11,
    color: MartialTheme.colors.textMuted,
    marginTop: 1,
  },
  deltaPositiveBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  deltaPositiveText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#15803D',
  },
  deltaNeutralBadge: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  deltaNeutralText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#6B7280',
  },
  deltaNegativeBadge: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  deltaNegativeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#B91C1C',
  },
  deltaFirstBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  deltaFirstText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#B45309',
  },
  logGrade: {
    fontSize: 18,
    fontWeight: '900',
    marginRight: 2,
  },
  whySmallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  whySmallBtnText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#0284C7',
  },

  // 6. DETAILED ANALYSIS ACCORDION
  accordionHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginTop: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: MartialTheme.colors.border,
    borderBottomWidth: 3,
    borderBottomColor: MartialTheme.colors.border3D,
  },
  accordionHeaderBtnText: {
    fontSize: 14,
    fontWeight: '900',
    color: MartialTheme.colors.text,
  },
  accordionHeaderSubText: {
    fontSize: 11,
    color: MartialTheme.colors.textSecondary,
    marginTop: 1,
  },
  detailedAccordionContent: {
    marginTop: 6,
    marginBottom: 20,
  },
  statsGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: MartialTheme.colors.border,
    borderBottomWidth: 3,
    borderBottomColor: MartialTheme.colors.border3D,
    marginBottom: 14,
  },
  statMetricItem: {
    flex: 1,
    alignItems: 'center',
  },
  statMetricValue: {
    fontSize: 17,
    fontWeight: '900',
    color: MartialTheme.colors.text,
    marginBottom: 2,
  },
  statMetricLabel: {
    fontSize: 8.5,
    fontWeight: '800',
    color: MartialTheme.colors.textMuted,
    letterSpacing: 0.8,
  },
  statMetricDivider: {
    width: 1,
    height: 24,
    backgroundColor: MartialTheme.colors.border,
  },
  chartContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: MartialTheme.colors.border,
    borderBottomWidth: 3,
    borderBottomColor: MartialTheme.colors.border3D,
    padding: 16,
    marginBottom: 16,
  },
  chartHeading: {
    fontSize: 11,
    fontWeight: '900',
    color: '#64748B',
    letterSpacing: 1,
    marginBottom: 14,
  },
  svgWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  breakdownSectionHeading: {
    fontSize: 11,
    fontWeight: '900',
    color: '#64748B',
    letterSpacing: 1.2,
    marginTop: 18,
    marginBottom: 2,
  },
  breakdownSectionSub: {
    fontSize: 11.5,
    color: MartialTheme.colors.textMuted,
    marginBottom: 12,
  },
  pillarCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: MartialTheme.colors.border,
    borderBottomWidth: 3,
    borderBottomColor: MartialTheme.colors.border3D,
  },
  pillarHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  pillarTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: MartialTheme.colors.text,
  },
  pillarScoreText: {
    fontSize: 14,
    fontWeight: '900',
  },
  pillarProgressBarTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: '#E5E7EB',
    overflow: 'hidden',
    marginBottom: 6,
  },
  pillarProgressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  pillarDesc: {
    fontSize: 11,
    color: MartialTheme.colors.textSecondary,
    lineHeight: 15,
  },

  // MODAL
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    borderColor: MartialTheme.colors.border,
    borderWidth: 1,
    borderBottomWidth: 4,
    borderBottomColor: MartialTheme.colors.border3D,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: MartialTheme.colors.border,
    paddingBottom: 10,
  },
  modalTitle: {
    color: MartialTheme.colors.text,
    fontSize: 17,
    fontWeight: '900',
  },
  modalSub: {
    color: MartialTheme.colors.textMuted,
    fontSize: 11.5,
    marginTop: 2,
  },
  replayScoreHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAF8F3',
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E5E0D3',
  },
  replayScoreCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 3,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  replayScoreValue: {
    fontSize: 17,
    fontWeight: '900',
  },
  replayGradeTitle: {
    fontSize: 16,
    fontWeight: '900',
  },
  replayGradeDesc: {
    color: MartialTheme.colors.textSecondary,
    fontSize: 11.5,
    marginTop: 2,
  },
  videoReplayContainer: {
    backgroundColor: '#FAF8F3',
    borderRadius: 14,
    borderColor: '#E5E0D3',
    borderWidth: 1,
    padding: 12,
    marginBottom: 14,
    alignItems: 'center',
  },
  videoReplayHeading: {
    color: MartialTheme.colors.primary,
    fontWeight: '900',
    fontSize: 11,
    letterSpacing: 1.0,
    marginBottom: 8,
  },
  videoWrapper: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    overflow: 'hidden',
  },
  snapshotContainer: {
    backgroundColor: '#FAF8F3',
    borderRadius: 14,
    borderColor: '#E5E0D3',
    borderWidth: 1,
    padding: 12,
    marginBottom: 14,
    alignItems: 'center',
  },
  snapshotHeading: {
    color: MartialTheme.colors.primary,
    fontWeight: '900',
    fontSize: 11,
    letterSpacing: 1.0,
    marginBottom: 8,
  },
  snapshotImage: {
    width: '100%',
    height: 180,
    borderRadius: 10,
  },
  whyModalBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E0F2FE',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#BAE6FD',
    marginVertical: 8,
  },
  whyModalBtnText: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#0284C7',
  },
  modalCloseBtn: {
    backgroundColor: MartialTheme.colors.primary,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 12,
    borderBottomWidth: 3,
    borderBottomColor: MartialTheme.colors.primaryDark,
  },
  modalCloseBtnText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 14,
    letterSpacing: 0.5,
  },
});
