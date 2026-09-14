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
import Svg, { Circle, Path, Text as SvgText } from 'react-native-svg';
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
} from '@/constants/historyStore';
import { getGamificationStats } from '@/constants/gamificationStore';

const { width } = Dimensions.get('window');

export default function ProgressHistoryScreen() {
  const router = useRouter();
  const [showAdvancedAnalytics, setShowAdvancedAnalytics] = useState(false);
  const [historyList, setHistoryList] = useState<SessionItem[]>([]);
  const [masteryStats, setMasteryStats] = useState<MasteryStats>(() => getStrikeMasteryStats([]));
  const [streakDays, setStreakDays] = useState(1);
  const [selectedSession, setSelectedSession] = useState<SessionItem | null>(null);
  const [whySession, setWhySession] = useState<SessionItem | null>(null);

  const [stats, setStats] = useState({
    avgScore: 0,
    bestScore: 0,
    sessionsCount: 0,
  });

  // Calculate 4-pillar averages across recorded sessions
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

  // Load history & gamification data whenever screen gains focus
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

      getGamificationStats().then((g) => {
        if (isMounted) {
          setStreakDays(g.streakDays || 1);
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
    if (score >= 85) return MartialTheme.colors.primary;
    if (score >= 70) return MartialTheme.colors.bamboo;
    return '#EF4444';
  };

  // Derive Current Focus strike
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
    if (!currentFocusStrike) return 'Practice regularly to build martial discipline!';
    if (currentFocusStrike.attempts === 0) {
      return `Start Strike ${currentFocusStrike.strikeNumber} to lock in the proper chamber and slicing angle.`;
    }
    if (currentFocusStrike.bestScore < 70) {
      return `Pin your Kalasag guard hand to your chest and keep your diagonal path consistent.`;
    }
    if (currentFocusStrike.bestScore < 85) {
      return `You're close to mastery! Concentrate on sharp wrist snap (Pitik) at the impact zone.`;
    }
    return 'Master level technique! Practice your rhythm and flow.';
  }, [currentFocusStrike]);

  // Group practice history by recency (TODAY, YESTERDAY, EARLIER)
  const timelineGroups = useMemo(() => {
    const today: SessionItem[] = [];
    const yesterday: SessionItem[] = [];
    const earlier: SessionItem[] = [];

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const yesterdayStart = todayStart - 86400000;

    historyList.forEach((item) => {
      const ts = parseInt(item.id.replace('session_', ''), 10);
      if (!isNaN(ts)) {
        if (ts >= todayStart) {
          today.push(item);
        } else if (ts >= yesterdayStart) {
          yesterday.push(item);
        } else {
          earlier.push(item);
        }
      } else {
        today.push(item);
      }
    });

    return [
      { title: 'TODAY', items: today },
      { title: 'YESTERDAY', items: yesterday },
      { title: 'EARLIER', items: earlier },
    ].filter((g) => g.items.length > 0);
  }, [historyList]);

  // Reset history handler
  const handleClearAll = () => {
    Alert.alert(
      'Reset Practice History',
      'Are you sure you want to clear your recorded session history?',
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

  // SVG Trend Line Chart
  const renderTrendChart = () => {
    const dataPoints = historyList.slice(0, 6).reverse();
    if (dataPoints.length === 0) return null;

    const chartWidth = width - 72;
    const chartHeight = 120;
    const paddingX = 36;
    const paddingY = 24;

    const spacingX =
      dataPoints.length > 1 ? (chartWidth - 2 * paddingX) / (dataPoints.length - 1) : 0;

    const minYVal = 50;
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
        <Text style={styles.chartHeading}>PERFORMANCE TRAJECTORY</Text>
        <View style={styles.svgWrapper}>
          <Svg width={chartWidth} height={chartHeight}>
            {/* Guide line at 85% (Mastery threshold) */}
            <Path
              d={`M ${paddingX - 10} ${chartHeight - paddingY - 0.7 * (chartHeight - 2 * paddingY)} L ${chartWidth - paddingX + 10} ${chartHeight - paddingY - 0.7 * (chartHeight - 2 * paddingY)}`}
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

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>YOUR PROGRESS</Text>
          <Text style={styles.headerSubtitle}>Keep advancing your martial path</Text>
        </View>
        <View style={styles.streakPill}>
          <Text style={styles.streakPillText}>🔥 {streakDays}d</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* --- 1. OVERALL PROGRESS HERO --- */}
        <View style={styles.progressHeroCard}>
          <View style={styles.progressHeroTopRow}>
            <View style={{ flex: 1, paddingRight: 10 }}>
              <Text style={styles.progressSuperTag}>OVERALL MASTERY</Text>
              <Text style={styles.progressHeroCount}>
                {masteryStats.masteredCount} of 12 strikes mastered
              </Text>

              {/* Rank Sash Badge */}
              <View style={styles.rankPill}>
                <View
                  style={[
                    styles.sashDot,
                    { backgroundColor: getRankSashColor(masteryStats.rankTitle) },
                  ]}
                />
                <Text style={styles.rankPillText} numberOfLines={1}>
                  {masteryStats.rankTitle}
                </Text>
              </View>
            </View>

            <CoachCharacter
              pose={masteryStats.masteredCount >= 3 ? 'celebrating' : 'stance'}
              size={85}
            />
          </View>

          {/* Progress Bar */}
          <View style={{ marginTop: 14 }}>
            <ProgressBar
              progress={Math.round((masteryStats.masteredCount / 12) * 100)}
              showPercentage={true}
              color={MartialTheme.colors.primary}
              height={10}
            />
          </View>

          {/* Coach Quote */}
          <View style={styles.heroCoachQuoteBox}>
            <Text style={styles.heroCoachQuoteText}>
              {masteryStats.masteredCount >= 6
                ? '"You\'re becoming a true martial artist!"'
                : '"You\'re getting stronger with every session!"'}
            </Text>
          </View>
        </View>

        {/* --- 2. CURRENT FOCUS CARD --- */}
        {currentFocusStrike && (
          <View style={styles.focusHeroCard}>
            <View style={styles.focusHeaderRow}>
              <View style={styles.focusBadge}>
                <Ionicons name="sparkles" size={13} color="#B45309" style={{ marginRight: 5 }} />
                <Text style={styles.focusBadgeText}>CURRENT FOCUS</Text>
              </View>
              {currentFocusStrike.bestScore > 0 && (
                <View style={styles.focusScorePill}>
                  <Text style={styles.focusScorePillText}>
                    {currentFocusStrike.bestScore}%
                  </Text>
                </View>
              )}
            </View>

            <Text style={styles.focusStrikeTitle}>
              Strike {currentFocusStrike.strikeNumber} — {currentFocusStrike.name}
            </Text>
            <Text style={styles.focusStrikeTarget}>{currentFocusStrike.target}</Text>

            {/* Stars */}
            <View style={styles.focusStarsRow}>
              {[1, 2, 3, 4, 5].map((s) => (
                <Ionicons
                  key={s}
                  name={s <= getStarCount(currentFocusStrike.bestScore) ? 'star' : 'star-outline'}
                  size={17}
                  color={s <= getStarCount(currentFocusStrike.bestScore) ? MartialTheme.colors.bamboo : '#D1D5DB'}
                  style={{ marginRight: 3 }}
                />
              ))}
            </View>

            {/* Coach Speech Bubble */}
            <View style={styles.focusCoachBubble}>
              <Text style={styles.focusCoachBubbleLabel}>COACH SAYS</Text>
              <Text style={styles.focusCoachBubbleText}>{`"${coachFocusAdvice}"`}</Text>
            </View>

            {/* Dominant CTA Button */}
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

        {/* --- 3. 12 STRIKES GAME PROGRESSION GRID --- */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeaderRow}>
            <View>
              <Text style={styles.sectionTitle}>THE 12 STRIKES</Text>
              <Text style={styles.sectionSub}>Tap any technique to practice</Text>
            </View>
            <View style={styles.masteryCounterBadge}>
              <Text style={styles.masteryCounterText}>
                {masteryStats.masteredCount}/12 Mastered
              </Text>
            </View>
          </View>

          {/* Compact 3-column game progression grid */}
          <View style={styles.masteryGrid}>
            {masteryStats.strikes.map((st) => {
              const isFocus = st.id === currentFocusStrike?.id;
              const isPracticed = st.attempts > 0;
              const isMastered = st.isMastered;

              return (
                <TouchableOpacity
                  key={st.id}
                  style={[
                    styles.gridNode,
                    isFocus && styles.gridNodeFocus,
                    isMastered && styles.gridNodeMastered,
                  ]}
                  activeOpacity={0.75}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    router.push({
                      pathname: '/evaluate',
                      params: { strikeId: st.id, mode: 'guided' },
                    });
                  }}
                >
                  {/* Status Circle Badge */}
                  <View
                    style={[
                      styles.nodeCircle,
                      isMastered && styles.nodeCircleMastered,
                      !isMastered && isPracticed && styles.nodeCirclePracticed,
                      isFocus && styles.nodeCircleFocus,
                    ]}
                  >
                    {isMastered ? (
                      <Ionicons name="checkmark" size={18} color="#FFFFFF" />
                    ) : isPracticed ? (
                      <Ionicons name="star" size={16} color={MartialTheme.colors.bambooDark} />
                    ) : (
                      <Text style={styles.nodeCircleNeutralText}>{st.strikeNumber}</Text>
                    )}
                  </View>

                  <Text style={styles.nodeTitle} numberOfLines={1}>
                    Strike {st.strikeNumber}
                  </Text>
                  <Text style={styles.nodeTarget} numberOfLines={1}>
                    {st.target.split('/')[0].trim()}
                  </Text>

                  {/* Score or Status indicator */}
                  {isMastered ? (
                    <Text style={styles.nodeScoreMastered}>Mastered ✓</Text>
                  ) : isPracticed ? (
                    <Text style={styles.nodeScorePracticed}>{st.bestScore}%</Text>
                  ) : (
                    <Text style={styles.nodeScoreNeutral}>○ Not tried</Text>
                  )}

                  {isFocus && (
                    <View style={styles.focusBadgeSmall}>
                      <Text style={styles.focusBadgeSmallText}>FOCUS</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* --- 4. MILESTONES & ACHIEVEMENTS --- */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>ACHIEVEMENTS</Text>
          <Text style={styles.sectionSub}>Milestones on your journey to mastery</Text>

          <View style={styles.achievementsCard}>
            {[
              {
                id: 'a1',
                emoji: '🏅',
                title: 'First Practice',
                desc: 'Completed your first evaluation rep',
                completed: historyList.length > 0,
              },
              {
                id: 'a2',
                emoji: '🔥',
                title: '3-Day Streak',
                desc: 'Trained 3 days in a row',
                completed: streakDays >= 3,
              },
              {
                id: 'a3',
                emoji: '⭐',
                title: '3 Strikes Mastered',
                desc: 'Scored 85%+ on at least 3 strikes',
                completed: masteryStats.masteredCount >= 3,
              },
              {
                id: 'a4',
                emoji: '🥋',
                title: 'First Anyo',
                desc: 'Completed a multi-strike combination',
                completed: historyList.some((h) => !!h.routineId),
              },
              {
                id: 'a5',
                emoji: '🏆',
                title: '6 Strikes Mastered',
                desc: 'Reached Intermediate Green Sash rank',
                completed: masteryStats.masteredCount >= 6,
              },
              {
                id: 'a6',
                emoji: '👑',
                title: 'All 12 Mastered',
                desc: 'Achieved Black Belt / Lakan precision',
                completed: masteryStats.masteredCount >= 12,
              },
            ].map((ach) => (
              <View
                key={ach.id}
                style={[
                  styles.achievementRow,
                  ach.completed && styles.achievementRowEarned,
                ]}
              >
                <View
                  style={[
                    styles.achievementEmojiBox,
                    ach.completed && styles.achievementEmojiBoxEarned,
                  ]}
                >
                  <Text style={styles.achievementEmoji}>{ach.emoji}</Text>
                </View>

                <View style={{ flex: 1, paddingRight: 8 }}>
                  <Text
                    style={[
                      styles.achievementTitle,
                      ach.completed && styles.achievementTitleEarned,
                    ]}
                  >
                    {ach.title}
                  </Text>
                  <Text style={styles.achievementDesc}>{ach.desc}</Text>
                </View>

                {ach.completed ? (
                  <View style={styles.achievementEarnedTag}>
                    <Ionicons name="checkmark-circle" size={14} color="#15803D" style={{ marginRight: 4 }} />
                    <Text style={styles.achievementEarnedText}>Earned</Text>
                  </View>
                ) : (
                  <Ionicons name="lock-closed-outline" size={16} color="#9CA3AF" />
                )}
              </View>
            ))}
          </View>
        </View>

        {/* --- 5. PRACTICE HISTORY TIMELINE --- */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeaderRow}>
            <View>
              <Text style={styles.sectionTitle}>PRACTICE HISTORY</Text>
              <Text style={styles.sectionSub}>Recent sessions & progress</Text>
            </View>
            {historyList.length > 0 && (
              <TouchableOpacity onPress={handleClearAll} activeOpacity={0.7}>
                <Text style={styles.resetHistoryText}>Reset History</Text>
              </TouchableOpacity>
            )}
          </View>

          {timelineGroups.length === 0 ? (
            <View style={styles.emptyHistoryCard}>
              <CoachCharacter pose="stance" size={75} />
              <Text style={styles.emptyHistoryTitle}>No Practice Sessions Yet</Text>
              <Text style={styles.emptyHistorySub}>
                Start your first practice session to see your progress and track improvement here!
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
          ) : (
            timelineGroups.map((group) => (
              <View key={group.title} style={{ marginBottom: 14 }}>
                <Text style={styles.timelineGroupHeader}>{group.title}</Text>

                <View style={styles.timelineGroupCard}>
                  {group.items.map((item, idx) => {
                    const olderAttempt = historyList.find(
                      (s, i) => s.strikeId === item.strikeId && i > historyList.indexOf(item)
                    );
                    const delta = olderAttempt ? item.score - olderAttempt.score : null;

                    return (
                      <TouchableOpacity
                        key={item.id}
                        style={[
                          styles.sessionRow,
                          idx < group.items.length - 1 && styles.sessionRowBorder,
                        ]}
                        activeOpacity={0.75}
                        onPress={() => setSelectedSession(item)}
                      >
                        <View
                          style={[
                            styles.sessionScoreCircle,
                            { borderColor: getScoreColor(item.score) },
                          ]}
                        >
                          <Text style={[styles.sessionScoreText, { color: getScoreColor(item.score) }]}>
                            {item.score}%
                          </Text>
                        </View>

                        <View style={{ flex: 1, paddingRight: 8 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Text style={styles.sessionStrikeName}>{item.strikeName}</Text>
                            {item.routineId && (
                              <View style={styles.anyoTag}>
                                <Text style={styles.anyoTagText}>ANYO</Text>
                              </View>
                            )}
                          </View>

                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 }}>
                            <Text style={styles.sessionDateText}>{item.date.split('·')[1]?.trim() || item.date}</Text>
                            {delta !== null && delta > 0 && (
                              <Text style={styles.sessionDeltaPositive}>↑ +{delta}</Text>
                            )}
                          </View>
                        </View>

                        <TouchableOpacity
                          style={styles.whyBtnSmall}
                          onPress={(e) => {
                            e.stopPropagation();
                            setWhySession(item);
                          }}
                          activeOpacity={0.8}
                        >
                          <Text style={styles.whyBtnSmallText}>Why?</Text>
                        </TouchableOpacity>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            ))
          )}
        </View>

        {/* --- 6. COLLAPSIBLE ADVANCED ANALYTICS --- */}
        <TouchableOpacity
          style={styles.analyticsAccordionBtn}
          activeOpacity={0.8}
          onPress={() => setShowAdvancedAnalytics(!showAdvancedAnalytics)}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
            <MaterialCommunityIcons
              name="chart-bell-curve-cumulative"
              size={20}
              color={MartialTheme.colors.bambooDark}
              style={{ marginRight: 8 }}
            />
            <View style={{ flex: 1 }}>
              <Text style={styles.analyticsAccordionTitle}>
                {showAdvancedAnalytics ? 'Hide Detailed Analysis' : 'Detailed Biomechanical Analysis'}
              </Text>
              <Text style={styles.analyticsAccordionSub}>
                12-Axis Radar, Kinetic Pillars & Motor Diagnostics
              </Text>
            </View>
          </View>
          <Ionicons
            name={showAdvancedAnalytics ? 'chevron-up' : 'chevron-down'}
            size={18}
            color={MartialTheme.colors.textMuted}
          />
        </TouchableOpacity>

        {showAdvancedAnalytics && (
          <View style={styles.analyticsContent}>
            {/* Quick Stats Grid */}
            <View style={styles.statsRow}>
              <View style={styles.statBox}>
                <Text style={styles.statVal}>{stats.avgScore}%</Text>
                <Text style={styles.statLbl}>AVG SCORE</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statBox}>
                <Text style={[styles.statVal, { color: getScoreColor(stats.bestScore) }]}>
                  {stats.bestScore}%
                </Text>
                <Text style={styles.statLbl}>BEST SCORE</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statBox}>
                <Text style={styles.statVal}>{stats.sessionsCount}</Text>
                <Text style={styles.statLbl}>SESSIONS</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statBox}>
                <Text style={[styles.statVal, { color: MartialTheme.colors.primary }]}>
                  {masteryStats.strikes.filter((s) => s.attempts > 0).length}/12
                </Text>
                <Text style={styles.statLbl}>ATTEMPTED</Text>
              </View>
            </View>

            {/* Performance Trend SVG Chart */}
            {historyList.length > 0 && renderTrendChart()}

            {/* 12-Axis Radar Chart */}
            <StrikeRadarChart
              masteryStats={masteryStats}
              onSelectStrike={(st) => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push({
                  pathname: '/evaluate',
                  params: { strikeId: st.id, mode: 'guided' },
                });
              }}
            />

            {/* 4-Pillar Kinetic Averages */}
            <Text style={styles.pillarSectionHeading}>4-PILLAR KINETIC POSTURE</Text>
            <Text style={styles.pillarSectionSub}>
              Average motor precision across all recorded repetitions
            </Text>

            {/* Stance & Tindig */}
            <View style={styles.pillarCard}>
              <View style={styles.pillarCardHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <MaterialCommunityIcons name="human-male-height" size={17} color="#F59E0B" style={{ marginRight: 6 }} />
                  <Text style={styles.pillarCardTitle}>Stance & Base Stability (Tindig)</Text>
                </View>
                <Text style={[styles.pillarCardScore, { color: getScoreColor(pillarAverages.stance) }]}>
                  {pillarAverages.stance}%
                </Text>
              </View>
              <View style={styles.pillarCardTrack}>
                <View style={[styles.pillarCardFill, { width: `${pillarAverages.stance}%`, backgroundColor: getScoreColor(pillarAverages.stance) }]} />
              </View>
            </View>

            {/* Striking Arm Trajectory */}
            <View style={styles.pillarCard}>
              <View style={styles.pillarCardHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <MaterialCommunityIcons name="sword" size={17} color="#3B82F6" style={{ marginRight: 6 }} />
                  <Text style={styles.pillarCardTitle}>Strike Trajectory & Slicing Path</Text>
                </View>
                <Text style={[styles.pillarCardScore, { color: getScoreColor(pillarAverages.elbow) }]}>
                  {pillarAverages.elbow}%
                </Text>
              </View>
              <View style={styles.pillarCardTrack}>
                <View style={[styles.pillarCardFill, { width: `${pillarAverages.elbow}%`, backgroundColor: getScoreColor(pillarAverages.elbow) }]} />
              </View>
            </View>

            {/* Kalasag Guard Hand */}
            <View style={styles.pillarCard}>
              <View style={styles.pillarCardHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <MaterialCommunityIcons name="shield-check" size={17} color="#10B981" style={{ marginRight: 6 }} />
                  <Text style={styles.pillarCardTitle}>Check Hand Defense (Kalasag)</Text>
                </View>
                <Text style={[styles.pillarCardScore, { color: getScoreColor(pillarAverages.guard) }]}>
                  {pillarAverages.guard}%
                </Text>
              </View>
              <View style={styles.pillarCardTrack}>
                <View style={[styles.pillarCardFill, { width: `${pillarAverages.guard}%`, backgroundColor: getScoreColor(pillarAverages.guard) }]} />
              </View>
            </View>

            {/* Wrist Snap Pitik */}
            <View style={styles.pillarCard}>
              <View style={styles.pillarCardHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <MaterialCommunityIcons name="flash" size={17} color="#8B5CF6" style={{ marginRight: 6 }} />
                  <Text style={styles.pillarCardTitle}>Wrist Snap & Alignment (Pitik)</Text>
                </View>
                <Text style={[styles.pillarCardScore, { color: getScoreColor(pillarAverages.wrist) }]}>
                  {pillarAverages.wrist}%
                </Text>
              </View>
              <View style={styles.pillarCardTrack}>
                <View style={[styles.pillarCardFill, { width: `${pillarAverages.wrist}%`, backgroundColor: getScoreColor(pillarAverages.wrist) }]} />
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      {/* --- SESSION REPLAY MODAL --- */}
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
                    {selectedSession?.score || 0}%
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

              {/* Video Replay if available */}
              {selectedSession?.replayVideoBase64 && (
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
                              <style>body { margin: 0; background: #000; display: flex; align-items: center; justify-content: center; height: 100vh; } video { width: 100%; height: 100%; object-fit: contain; }</style>
                            </head>
                            <body><video src="${selectedSession.replayVideoBase64}" autoplay loop muted playsinline controls></video></body>
                          </html>
                        `,
                      }}
                      style={{ flex: 1 }}
                    />
                  </View>
                </View>
              )}

              {/* Snapshot if available */}
              {selectedSession?.snapshotBase64 && !selectedSession?.replayVideoBase64 && (
                <View style={styles.videoReplayContainer}>
                  <Text style={styles.videoReplayHeading}>IMPACT ZONE SNAPSHOT</Text>
                  <Image source={{ uri: selectedSession.snapshotBase64 }} style={styles.snapshotImg} resizeMode="contain" />
                </View>
              )}

              {/* Why button */}
              <TouchableOpacity
                style={styles.modalWhyBtn}
                onPress={() => {
                  const s = selectedSession;
                  setSelectedSession(null);
                  setWhySession(s);
                }}
                activeOpacity={0.8}
              >
                <Ionicons name="help-circle" size={16} color="#0284C7" style={{ marginRight: 6 }} />
                <Text style={styles.modalWhyBtnText}>Why did I get this score? (Diagnosis)</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* --- WHY FAILED MODAL --- */}
      {whySession && (
        <WhyFailedModal
          visible={!!whySession}
          onClose={() => setWhySession(null)}
          overallScore={whySession.score}
          grade={whySession.grade}
          strikeName={whySession.strikeName}
          strikeId={whySession.strikeId}
          breakdown={{
            directionScore: whySession.breakdown?.elbow?.score || whySession.score,
            bodyScore: whySession.breakdown?.stance?.score || 80,
            guardScore: whySession.breakdown?.guard?.score || 80,
            wristScore: whySession.breakdown?.wrist?.score || 85,
          }}
          onPracticeLesson={() => {
            const sid = whySession.strikeId;
            setWhySession(null);
            router.push({
              pathname: '/evaluate',
              params: { strikeId: sid, mode: 'guided' },
            });
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: MartialTheme.colors.border,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: MartialTheme.colors.text,
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    fontSize: 12,
    color: MartialTheme.colors.textMuted,
    fontWeight: '600',
    marginTop: 2,
  },
  streakPill: {
    backgroundColor: MartialTheme.colors.flameMuted,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#FED7AA',
  },
  streakPillText: {
    fontSize: 12,
    fontWeight: '900',
    color: MartialTheme.colors.flame,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },

  // PROGRESS HERO CARD
  progressHeroCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 18,
    borderWidth: 1.5,
    borderColor: MartialTheme.colors.border,
    borderBottomWidth: 4,
    borderBottomColor: MartialTheme.colors.border3D,
    marginBottom: 16,
  },
  progressHeroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  progressSuperTag: {
    fontSize: 10,
    fontWeight: '900',
    color: MartialTheme.colors.bambooDark,
    letterSpacing: 1,
  },
  progressHeroCount: {
    fontSize: 18,
    fontWeight: '900',
    color: MartialTheme.colors.text,
    marginTop: 2,
  },
  rankPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: MartialTheme.colors.background,
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    marginTop: 6,
    borderWidth: 1,
    borderColor: MartialTheme.colors.border,
  },
  sashDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  rankPillText: {
    fontSize: 11,
    fontWeight: '800',
    color: MartialTheme.colors.text,
  },
  heroCoachQuoteBox: {
    marginTop: 12,
    backgroundColor: MartialTheme.colors.background,
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: MartialTheme.colors.border,
  },
  heroCoachQuoteText: {
    fontSize: 12,
    fontStyle: 'italic',
    color: MartialTheme.colors.textSecondary,
    fontWeight: '600',
    textAlign: 'center',
  },

  // CURRENT FOCUS HERO CARD
  focusHeroCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 18,
    borderWidth: 1.5,
    borderColor: '#FDE68A',
    borderBottomWidth: 4,
    borderBottomColor: MartialTheme.colors.bamboo,
    marginBottom: 20,
  },
  focusHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  focusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  focusBadgeText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#B45309',
    letterSpacing: 0.5,
  },
  focusScorePill: {
    backgroundColor: MartialTheme.colors.bambooMuted,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  focusScorePillText: {
    fontSize: 11,
    fontWeight: '800',
    color: MartialTheme.colors.bambooDark,
  },
  focusStrikeTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: MartialTheme.colors.text,
    marginTop: 2,
  },
  focusStrikeTarget: {
    fontSize: 12,
    color: MartialTheme.colors.textMuted,
    fontWeight: '600',
    marginTop: 2,
  },
  focusStarsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 6,
  },
  focusCoachBubble: {
    backgroundColor: MartialTheme.colors.background,
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: MartialTheme.colors.border,
    marginBottom: 8,
  },
  focusCoachBubbleLabel: {
    fontSize: 8.5,
    fontWeight: '900',
    color: MartialTheme.colors.bambooDark,
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  focusCoachBubbleText: {
    fontSize: 12,
    color: MartialTheme.colors.text,
    lineHeight: 16,
    fontWeight: '600',
  },

  // SECTION CONTAINERS
  sectionContainer: {
    marginBottom: 20,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '900',
    color: MartialTheme.colors.textSecondary,
    letterSpacing: 1,
  },
  sectionSub: {
    fontSize: 11,
    fontWeight: '600',
    color: MartialTheme.colors.textMuted,
    marginTop: 1,
  },
  masteryCounterBadge: {
    backgroundColor: MartialTheme.colors.primaryMuted,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  masteryCounterText: {
    fontSize: 11,
    fontWeight: '900',
    color: MartialTheme.colors.primaryDark,
  },

  // 12 STRIKES GAME GRID
  masteryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  gridNode: {
    width: (width - 48) / 3,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 10,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: MartialTheme.colors.border,
    borderBottomWidth: 3,
    borderBottomColor: MartialTheme.colors.border3D,
    position: 'relative',
  },
  gridNodeMastered: {
    borderColor: '#BBF7D0',
  },
  gridNodeFocus: {
    borderColor: MartialTheme.colors.primary,
    backgroundColor: '#F0FDF4',
  },
  nodeCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: MartialTheme.colors.background,
    borderWidth: 1.5,
    borderColor: MartialTheme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  nodeCircleMastered: {
    backgroundColor: MartialTheme.colors.primary,
    borderColor: MartialTheme.colors.primaryDark,
  },
  nodeCirclePracticed: {
    backgroundColor: '#FEF3C7',
    borderColor: '#FDE68A',
  },
  nodeCircleFocus: {
    borderColor: MartialTheme.colors.primary,
  },
  nodeCircleNeutralText: {
    fontSize: 13,
    fontWeight: '800',
    color: MartialTheme.colors.textMuted,
  },
  nodeTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: MartialTheme.colors.text,
    textAlign: 'center',
  },
  nodeTarget: {
    fontSize: 9.5,
    color: MartialTheme.colors.textMuted,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 1,
  },
  nodeScoreMastered: {
    fontSize: 10,
    fontWeight: '900',
    color: MartialTheme.colors.primary,
    marginTop: 4,
  },
  nodeScorePracticed: {
    fontSize: 10,
    fontWeight: '900',
    color: MartialTheme.colors.bambooDark,
    marginTop: 4,
  },
  nodeScoreNeutral: {
    fontSize: 9.5,
    fontWeight: '600',
    color: MartialTheme.colors.textMuted,
    marginTop: 4,
  },
  focusBadgeSmall: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: MartialTheme.colors.primary,
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  focusBadgeSmallText: {
    fontSize: 7.5,
    fontWeight: '900',
    color: '#FFFFFF',
  },

  // ACHIEVEMENTS
  achievementsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 12,
    borderWidth: 1.5,
    borderColor: MartialTheme.colors.border,
    borderBottomWidth: 3,
    borderBottomColor: MartialTheme.colors.border3D,
    gap: 8,
  },
  achievementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: 12,
  },
  achievementRowEarned: {
    backgroundColor: '#F7FDF9',
  },
  achievementEmojiBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: MartialTheme.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  achievementEmojiBoxEarned: {
    backgroundColor: '#DCFCE7',
  },
  achievementEmoji: {
    fontSize: 18,
  },
  achievementTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: MartialTheme.colors.textMuted,
  },
  achievementTitleEarned: {
    color: MartialTheme.colors.text,
  },
  achievementDesc: {
    fontSize: 10.5,
    color: MartialTheme.colors.textMuted,
    marginTop: 1,
  },
  achievementEarnedTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: MartialTheme.colors.primaryMuted,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 8,
  },
  achievementEarnedText: {
    fontSize: 10,
    fontWeight: '900',
    color: MartialTheme.colors.primaryDark,
  },

  // TIMELINE
  resetHistoryText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#EF4444',
  },
  emptyHistoryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: MartialTheme.colors.border,
  },
  emptyHistoryTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: MartialTheme.colors.text,
    marginTop: 10,
  },
  emptyHistorySub: {
    fontSize: 12,
    color: MartialTheme.colors.textMuted,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 18,
  },
  timelineGroupHeader: {
    fontSize: 10.5,
    fontWeight: '900',
    color: MartialTheme.colors.textSecondary,
    letterSpacing: 1,
    marginBottom: 6,
    paddingHorizontal: 4,
  },
  timelineGroupCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: MartialTheme.colors.border,
    borderBottomWidth: 3,
    borderBottomColor: MartialTheme.colors.border3D,
    overflow: 'hidden',
  },
  sessionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  sessionRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: MartialTheme.colors.border,
  },
  sessionScoreCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: MartialTheme.colors.background,
    marginRight: 12,
  },
  sessionScoreText: {
    fontSize: 13,
    fontWeight: '900',
  },
  sessionStrikeName: {
    fontSize: 13.5,
    fontWeight: '800',
    color: MartialTheme.colors.text,
  },
  anyoTag: {
    backgroundColor: '#F3E8FF',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  anyoTagText: {
    fontSize: 8.5,
    fontWeight: '900',
    color: '#8B5CF6',
  },
  sessionDateText: {
    fontSize: 11,
    color: MartialTheme.colors.textMuted,
    fontWeight: '600',
  },
  sessionDeltaPositive: {
    fontSize: 11,
    fontWeight: '900',
    color: '#15803D',
  },
  whyBtnSmall: {
    backgroundColor: '#F0F9FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  whyBtnSmallText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0284C7',
  },

  // ADVANCED ANALYTICS ACCORDION
  analyticsAccordionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1.5,
    borderColor: MartialTheme.colors.border,
    borderBottomWidth: 3,
    borderBottomColor: MartialTheme.colors.border3D,
    marginBottom: 16,
  },
  analyticsAccordionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: MartialTheme.colors.text,
  },
  analyticsAccordionSub: {
    fontSize: 10.5,
    color: MartialTheme.colors.textMuted,
    marginTop: 2,
  },
  analyticsContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1.5,
    borderColor: MartialTheme.colors.border,
    borderBottomWidth: 3,
    borderBottomColor: MartialTheme.colors.border3D,
    marginBottom: 20,
    gap: 12,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: MartialTheme.colors.background,
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: MartialTheme.colors.border,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statVal: {
    fontSize: 16,
    fontWeight: '900',
    color: MartialTheme.colors.text,
  },
  statLbl: {
    fontSize: 8,
    fontWeight: '800',
    color: MartialTheme.colors.textMuted,
    letterSpacing: 0.5,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    backgroundColor: MartialTheme.colors.border,
    marginVertical: 2,
  },
  chartContainer: {
    marginVertical: 8,
  },
  chartHeading: {
    fontSize: 9.5,
    fontWeight: '900',
    color: MartialTheme.colors.textSecondary,
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  svgWrapper: {
    backgroundColor: MartialTheme.colors.background,
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: MartialTheme.colors.border,
    alignItems: 'center',
  },
  pillarSectionHeading: {
    fontSize: 10.5,
    fontWeight: '900',
    color: MartialTheme.colors.bambooDark,
    letterSpacing: 0.8,
    marginTop: 8,
  },
  pillarSectionSub: {
    fontSize: 10.5,
    color: MartialTheme.colors.textMuted,
    marginBottom: 4,
  },
  pillarCard: {
    backgroundColor: MartialTheme.colors.background,
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: MartialTheme.colors.border,
    gap: 4,
  },
  pillarCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pillarCardTitle: {
    fontSize: 11.5,
    fontWeight: '800',
    color: MartialTheme.colors.text,
  },
  pillarCardScore: {
    fontSize: 12,
    fontWeight: '900',
  },
  pillarCardTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: '#E5E7EB',
    overflow: 'hidden',
  },
  pillarCardFill: {
    height: '100%',
    borderRadius: 3,
  },

  // MODAL OVERLAY
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 36,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: MartialTheme.colors.text,
  },
  modalSub: {
    fontSize: 12,
    color: MartialTheme.colors.textMuted,
    marginTop: 2,
  },
  replayScoreHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  replayScoreCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 2.5,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: MartialTheme.colors.background,
  },
  replayScoreValue: {
    fontSize: 15,
    fontWeight: '900',
  },
  replayGradeTitle: {
    fontSize: 16,
    fontWeight: '900',
  },
  replayGradeDesc: {
    fontSize: 12,
    color: MartialTheme.colors.textMuted,
  },
  videoReplayContainer: {
    marginBottom: 14,
  },
  videoReplayHeading: {
    fontSize: 10,
    fontWeight: '900',
    color: MartialTheme.colors.textSecondary,
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  videoWrapper: {
    height: 200,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  snapshotImg: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    backgroundColor: '#000',
  },
  modalWhyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    backgroundColor: '#F0F9FF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BAE6FD',
    marginTop: 10,
  },
  modalWhyBtnText: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#0284C7',
  },
});
