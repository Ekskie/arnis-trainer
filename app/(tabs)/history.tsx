import { StrikeRadarChart } from '@/components/StrikeRadarChart';
import { clearHistory, getHistory, getStrikeMasteryStats, MasteryStats, SessionItem } from '@/constants/historyStore';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Dimensions, Image, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Defs, LinearGradient, Path, Stop, Text as SvgText } from 'react-native-svg';
import { WebView } from 'react-native-webview';

const { width } = Dimensions.get('window');

export default function ProgressHistoryScreen() {
  const router = useRouter();
  const [viewTab, setViewTab] = useState<'radar' | 'timeline'>('radar');
  const [historyList, setHistoryList] = useState<SessionItem[]>([]);
  const [masteryStats, setMasteryStats] = useState<MasteryStats>(() => getStrikeMasteryStats([]));
  const [selectedSession, setSelectedSession] = useState<SessionItem | null>(null);
  const [stats, setStats] = useState({
    avgScore: 0,
    bestScore: 0,
    sessionsCount: 0
  });

  // Load history when screen is focused
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
              sessionsCount: count
            });
          } else {
            setStats({ avgScore: 0, bestScore: 0, sessionsCount: 0 });
          }
        }
      });
      return () => {
        isMounted = false;
      };
    }, [])
  );

  const handleClearAll = async () => {
    await clearHistory();
    setHistoryList([]);
    setMasteryStats(getStrikeMasteryStats([]));
    setStats({ avgScore: 0, bestScore: 0, sessionsCount: 0 });
  };

  const getScoreColor = (score: number) => {
    if (score >= 95) return '#10B981'; // Green
    if (score >= 85) return '#3B82F6'; // Blue
    if (score >= 70) return '#F59E0B'; // Orange
    if (score > 0) return '#EF4444'; // Red
    return '#475569';
  };

  // Render SVG Line Chart based on scores
  const renderTrendChart = () => {
    const dataPoints = historyList.slice(0, 4).reverse(); // Last 4 items, chronologically
    if (dataPoints.length === 0) return null;

    const chartWidth = width - 72; // Taking padding into account
    const chartHeight = 130;
    const paddingX = 40;
    const paddingY = 25;

    // Spacing between points
    const spacingX = dataPoints.length > 1
      ? (chartWidth - 2 * paddingX) / (dataPoints.length - 1)
      : 0;

    // Y scaling (map score from 70 to 100)
    const minYVal = 70;
    const maxYVal = 100;

    const points = dataPoints.map((item, index) => {
      const x = paddingX + index * spacingX;
      // Clamp score to range [70, 100] for display
      const clampedScore = Math.max(minYVal, Math.min(maxYVal, item.score));
      const ratio = (clampedScore - minYVal) / (maxYVal - minYVal);
      const y = chartHeight - paddingY - ratio * (chartHeight - 2 * paddingY);
      return { x, y, score: item.score };
    });

    // Generate Path descriptions
    let linePathStr = '';
    let areaPathStr = '';

    if (points.length > 0) {
      linePathStr = `M ${points[0].x} ${points[0].y}`;
      areaPathStr = `M ${points[0].x} ${chartHeight} L ${points[0].x} ${points[0].y}`;

      for (let i = 1; i < points.length; i++) {
        linePathStr += ` L ${points[i].x} ${points[i].y}`;
        areaPathStr += ` L ${points[i].x} ${points[i].y}`;
      }

      areaPathStr += ` L ${points[points.length - 1].x} ${chartHeight} Z`;
    }

    return (
      <View style={styles.chartContainer}>
        <Text style={styles.chartHeading}>Score Trend (last {dataPoints.length})</Text>
        <View style={styles.svgWrapper}>
          <Svg width={chartWidth} height={chartHeight}>
            <Defs>
              <LinearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0%" stopColor="#D24B38" stopOpacity={0.25} />
                <Stop offset="100%" stopColor="#D24B38" stopOpacity={0.0} />
              </LinearGradient>
            </Defs>

            {/* Gradient Area under line */}
            {points.length > 1 && (
              <Path d={areaPathStr} fill="url(#chartGradient)" />
            )}

            {/* Main Trend Line */}
            {points.length > 1 && (
              <Path d={linePathStr} fill="none" stroke="#D24B38" strokeWidth={3} />
            )}

            {/* Data Circles & Score Text */}
            {points.map((p, i) => (
              <React.Fragment key={i}>
                <Circle cx={p.x} cy={p.y} r={5} fill="#D24B38" stroke="#0F1020" strokeWidth={2} />
                <SvgText
                  x={p.x}
                  y={p.y - 12}
                  fill="#FFFFFF"
                  fontSize="12"
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
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.push('/')} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
          <Text style={styles.headerTitle}>Progress & Analytics</Text>
        </TouchableOpacity>
      </View>

      {/* Segmented View Switcher */}
      <View style={styles.viewTabContainer}>
        <TouchableOpacity
          style={[styles.viewTabButton, viewTab === 'radar' && styles.viewTabButtonActive]}
          onPress={() => setViewTab('radar')}
          activeOpacity={0.7}
        >
          <MaterialCommunityIcons
            name="spider-web"
            size={16}
            color={viewTab === 'radar' ? '#FFFFFF' : '#64748B'}
            style={{ marginRight: 6 }}
          />
          <Text style={[styles.viewTabText, viewTab === 'radar' && styles.viewTabTextActive]}>
            12-Strikes Radar
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.viewTabButton, viewTab === 'timeline' && styles.viewTabButtonActive]}
          onPress={() => setViewTab('timeline')}
          activeOpacity={0.7}
        >
          <Ionicons
            name="time-outline"
            size={16}
            color={viewTab === 'timeline' ? '#FFFFFF' : '#64748B'}
            style={{ marginRight: 6 }}
          />
          <Text style={[styles.viewTabText, viewTab === 'timeline' && styles.viewTabTextActive]}>
            Timeline & Sessions
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Statistics Widgets Row */}
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{stats.avgScore}</Text>
            <Text style={styles.statLabel}>Avg Score</Text>
          </View>

          <View style={styles.statBox}>
            <Text style={styles.statValue}>{stats.bestScore}</Text>
            <Text style={styles.statLabel}>Best Score</Text>
          </View>

          <View style={styles.statBox}>
            <Text style={styles.statValue}>{stats.sessionsCount}</Text>
            <Text style={styles.statLabel}>Sessions</Text>
          </View>
        </View>

        {viewTab === 'radar' ? (
          /* RADAR & 12 STRIKES MATRIX VIEW */
          <View>
            <StrikeRadarChart masteryStats={masteryStats} />

            {/* 12 Strikes Full Breakdown List */}
            <Text style={styles.logHeading}>ALL 12 STRIKES BREAKDOWN</Text>
            {masteryStats.strikes.map((st) => (
              <View key={st.id} style={styles.strikeBreakdownCard}>
                <View style={styles.strikeBreakdownLeft}>
                  <View
                    style={[
                      styles.strikeBreakdownNum,
                      { backgroundColor: getScoreColor(st.bestScore) + '22' }
                    ]}
                  >
                    <Text
                      style={[
                        styles.strikeBreakdownNumText,
                        { color: getScoreColor(st.bestScore) }
                      ]}
                    >
                      {st.strikeNumber}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.strikeBreakdownName}>{st.name}</Text>
                    <Text style={styles.strikeBreakdownTarget}>{st.target}</Text>
                  </View>
                </View>

                <View style={styles.strikeBreakdownRight}>
                  <View style={{ alignItems: 'flex-end', marginRight: 10 }}>
                    <Text
                      style={[
                        styles.strikeBreakdownScore,
                        { color: getScoreColor(st.bestScore) }
                      ]}
                    >
                      {st.bestScore > 0 ? `${st.bestScore}%` : 'Unranked'}
                    </Text>
                    <Text style={styles.strikeBreakdownReps}>
                      {st.attempts > 0 ? `${st.attempts} session${st.attempts > 1 ? 's' : ''}` : 'No attempts'}
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={styles.strikeTrainBtn}
                    onPress={() => router.push({ pathname: '/evaluate', params: { strikeId: st.id } })}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="play" size={12} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        ) : (
          /* TIMELINE & REPLAY LOG VIEW */
          <View>
            {/* Dynamic Trend Chart */}
            {historyList.length > 0 && renderTrendChart()}

            {/* Session Log List */}
            <View style={styles.logHeaderRow}>
              <Text style={styles.logHeading}>SESSION HISTORY</Text>
              {historyList.length > 0 && (
                <TouchableOpacity onPress={handleClearAll}>
                  <Text style={styles.clearAllBtn}>Clear all</Text>
                </TouchableOpacity>
              )}
            </View>

            {historyList.length > 0 ? (
              historyList.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={styles.logCard}
                  activeOpacity={0.8}
                  onPress={() => setSelectedSession(item)}
                >
                  <View
                    style={[
                      styles.logScoreCircle,
                      { borderColor: getScoreColor(item.score) }
                    ]}
                  >
                    <Text style={styles.logScoreText}>{item.score}</Text>
                  </View>

                  <View style={styles.logDetails}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                      <Text style={styles.logTitle}>{item.strikeName}</Text>
                      {item.routineId && (
                        <View style={{ backgroundColor: '#8B5CF625', borderColor: '#8B5CF6', borderWidth: 1, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                          <Text style={{ color: '#A78BFA', fontSize: 9, fontWeight: 'bold' }}>ANYO FORM</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.logSubTitle}>{item.description} · {item.date}</Text>
                    <View style={styles.replayBadgeRow}>
                      <Ionicons name="play-circle" size={12} color="#3B82F6" style={{ marginRight: 4 }} />
                      <Text style={styles.replayBadgeText}>View Replay & Snapshot</Text>
                    </View>
                  </View>

                  <Text style={[styles.logGrade, { color: getScoreColor(item.score) }]}>
                    {item.grade.replace('Grade ', '')}
                  </Text>
                </TouchableOpacity>
              ))
            ) : (
              <View style={styles.emptyCard}>
                <Ionicons name="receipt-outline" size={48} color="#475569" style={styles.emptyIcon} />
                <Text style={styles.emptyText}>No session history recorded.</Text>
                <TouchableOpacity style={styles.emptyBtn} onPress={() => router.push('/evaluate')}>
                  <Text style={styles.emptyBtnText}>Start Practice</Text>
                </TouchableOpacity>
              </View>
            )}
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
                <Text style={styles.modalSub}>{selectedSession?.description} · {selectedSession?.date}</Text>
              </View>
              <TouchableOpacity onPress={() => setSelectedSession(null)}>
                <Ionicons name="close-circle" size={26} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 440 }} showsVerticalScrollIndicator={false}>
              {/* Score Header */}
              <View style={styles.replayScoreHeader}>
                <View style={[styles.replayScoreCircle, { borderColor: getScoreColor(selectedSession?.score || 0) }]}>
                  <Text style={styles.replayScoreValue}>{selectedSession?.score || 0}</Text>
                </View>
                <View style={{ flex: 1, marginLeft: 16 }}>
                  <Text style={[styles.replayGradeTitle, { color: getScoreColor(selectedSession?.score || 0) }]}>
                    {selectedSession?.grade}
                  </Text>
                  <Text style={styles.replayGradeDesc}>
                    {selectedSession?.score && selectedSession.score >= 85
                      ? "Excellent pose execution with target angle accuracy."
                      : "Needs minor form adjustments on elbow or wrist posture."}
                  </Text>
                </View>
              </View>

              {/* Saved Video Replay or Posture Screenshot */}
              {selectedSession?.replayVideoBase64 ? (
                <View style={styles.videoReplayContainer}>
                  <Text style={styles.videoReplayHeading}>🎥 RECORDED VIDEO REPLAY</Text>
                  <View style={styles.videoWrapper}>
                    <WebView
                      source={{
                        html: `
                          <!DOCTYPE html>
                          <html>
                          <head>
                            <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
                            <style>
                              body { margin: 0; padding: 0; background: #0b0f19; display: flex; justify-content: center; align-items: center; height: 100vh; overflow: hidden; }
                              video { width: 100%; height: 100%; object-fit: cover; border-radius: 12px; }
                            </style>
                          </head>
                          <body>
                            <video src="${selectedSession.replayVideoBase64}" autoplay loop muted playsinline controls></video>
                          </body>
                          </html>
                        `
                      }}
                      style={{ flex: 1, borderRadius: 12 }}
                      scrollEnabled={false}
                      allowsInlineMediaPlayback={true}
                      mediaPlaybackRequiresUserAction={false}
                    />
                  </View>
                </View>
              ) : selectedSession?.snapshotBase64 ? (
                <View style={styles.snapshotContainer}>
                  <Text style={styles.snapshotHeading}>📸 SAVED GREEN POSTURE SNAPSHOT</Text>
                  <Image
                    source={{ uri: selectedSession.snapshotBase64 }}
                    style={styles.snapshotImage}
                    resizeMode="cover"
                  />
                </View>
              ) : (
                <View style={styles.noSnapshotContainer}>
                  <Ionicons name="film-outline" size={32} color="#64748B" />
                  <Text style={styles.noSnapshotText}>No video recording stored for this session</Text>
                </View>
              )}

              {/* Anyo Sequence Steps Breakdown if Anyo routine */}
              {selectedSession?.anyoSteps && selectedSession.anyoSteps.length > 0 && (
                <View style={{ marginBottom: 16 }}>
                  <Text style={styles.modalSectionTitle}>ANYO STRIKE SEQUENCE EXECUTION</Text>
                  <View style={{ gap: 8 }}>
                    {selectedSession.anyoSteps.map((step, sIdx) => (
                      <View
                        key={step.strikeId + '_' + sIdx}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          backgroundColor: '#0F1020',
                          padding: 10,
                          borderRadius: 10,
                          borderWidth: 1,
                          borderColor: '#1E293B'
                        }}
                      >
                        <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: '#334155', justifyContent: 'center', alignItems: 'center', marginRight: 8 }}>
                          <Text style={{ color: '#FFFFFF', fontSize: 10, fontWeight: 'bold' }}>{sIdx + 1}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: 'bold' }}>{step.strikeName}</Text>
                          <Text style={{ color: '#64748B', fontSize: 10 }}>{(step.durationMs / 1000).toFixed(1)}s pace</Text>
                        </View>
                        <View style={{ backgroundColor: getScoreColor(step.score) + '20', borderColor: getScoreColor(step.score), borderWidth: 1, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 }}>
                          <Text style={{ color: getScoreColor(step.score), fontSize: 11, fontWeight: 'bold' }}>{step.score}% · {step.grade}</Text>
                        </View>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* Joint Breakdown Metrics */}
              <Text style={styles.modalSectionTitle}>POSTURE & ANGLE REPLAY</Text>

              {/* Elbow */}
              <View style={styles.replayMetricCard}>
                <View style={styles.replayMetricRow}>
                  <Text style={styles.replayMetricLabel}>Striking Elbow</Text>
                  <Text style={styles.replayMetricScore}>{selectedSession?.breakdown?.elbow?.score ?? 0}%</Text>
                </View>
                <Text style={styles.replayMetricDetails}>
                  Actual: {selectedSession?.breakdown?.elbow?.actual ?? 0}° · Target: {selectedSession?.breakdown?.elbow?.ideal ?? 0}°
                </Text>
              </View>

              {/* Shoulder */}
              <View style={styles.replayMetricCard}>
                <View style={styles.replayMetricRow}>
                  <Text style={styles.replayMetricLabel}>Striking Shoulder</Text>
                  <Text style={styles.replayMetricScore}>{selectedSession?.breakdown?.shoulder?.score ?? 0}%</Text>
                </View>
                <Text style={styles.replayMetricDetails}>
                  Actual: {selectedSession?.breakdown?.shoulder?.actual ?? 0}° · Target: {selectedSession?.breakdown?.shoulder?.ideal ?? 0}°
                </Text>
              </View>

              {/* Wrist */}
              <View style={styles.replayMetricCard}>
                <View style={styles.replayMetricRow}>
                  <Text style={styles.replayMetricLabel}>Wrist Alignment</Text>
                  <Text style={styles.replayMetricScore}>{selectedSession?.breakdown?.wrist?.score ?? 0}%</Text>
                </View>
                <Text style={styles.replayMetricDetails}>
                  Actual Offset: {selectedSession?.breakdown?.wrist?.actual ?? 0}° · Target: 0° (Straight)
                </Text>
              </View>

              {/* Check Hand (Kalasag) */}
              {selectedSession?.breakdown?.guard && (
                <View style={styles.replayMetricCard}>
                  <View style={styles.replayMetricRow}>
                    <Text style={styles.replayMetricLabel}>Check Hand Defense (Kalasag)</Text>
                    <Text style={styles.replayMetricScore}>{selectedSession.breakdown.guard.score}%</Text>
                  </View>
                  <Text style={styles.replayMetricDetails}>
                    Target: Chest / Solar Plexus Guard
                  </Text>
                </View>
              )}

              {/* Stance & Base Stability (Tindig) / Knee */}
              {selectedSession?.breakdown?.stance ? (
                <View style={styles.replayMetricCard}>
                  <View style={styles.replayMetricRow}>
                    <Text style={styles.replayMetricLabel}>Stance & Base Stability (Tindig)</Text>
                    <Text style={styles.replayMetricScore}>{selectedSession.breakdown.stance.score}%</Text>
                  </View>
                  <Text style={styles.replayMetricDetails}>
                    Actual Knee: {selectedSession.breakdown.stance.actual}° · Target: {selectedSession.breakdown.stance.ideal}°
                  </Text>
                </View>
              ) : selectedSession?.breakdown?.knee ? (
                <View style={styles.replayMetricCard}>
                  <View style={styles.replayMetricRow}>
                    <Text style={styles.replayMetricLabel}>Lead Knee Stance</Text>
                    <Text style={styles.replayMetricScore}>{selectedSession.breakdown.knee.score}%</Text>
                  </View>
                  <Text style={styles.replayMetricDetails}>
                    Actual: {selectedSession.breakdown.knee.actual}° · Target: {selectedSession.breakdown.knee.ideal}°
                  </Text>
                </View>
              ) : null}
            </ScrollView>

            <TouchableOpacity
              style={styles.modalCloseBtn}
              onPress={() => setSelectedSession(null)}
            >
              <Text style={styles.modalCloseBtnText}>Close Replay</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F1020',
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#161930',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginLeft: 8,
  },
  viewTabContainer: {
    flexDirection: 'row',
    backgroundColor: '#161930',
    marginHorizontal: 20,
    marginTop: 12,
    marginBottom: 4,
    borderRadius: 12,
    padding: 4,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  viewTabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
  },
  viewTabButtonActive: {
    backgroundColor: '#D24B38',
  },
  viewTabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  viewTabTextActive: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  strikeBreakdownCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#161930',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1E293B',
    padding: 12,
    marginBottom: 10,
  },
  strikeBreakdownLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  strikeBreakdownNum: {
    width: 28,
    height: 28,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  strikeBreakdownNumText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  strikeBreakdownName: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  strikeBreakdownTarget: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 1,
  },
  strikeBreakdownRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  strikeBreakdownScore: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  strikeBreakdownReps: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 1,
  },
  strikeTrainBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#D24B38',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#161930',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1E293B',
    paddingVertical: 20,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '800',
    color: '#F59E0B',
  },
  statLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
    marginTop: 4,
  },
  chartContainer: {
    backgroundColor: '#161930',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#1E293B',
    padding: 16,
    marginBottom: 25,
  },
  chartHeading: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 16,
    paddingLeft: 4,
  },
  svgWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  logHeading: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#64748B',
    letterSpacing: 1.5,
  },
  clearAllBtn: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#D24B38',
  },
  logCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#161930',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1E293B',
    padding: 16,
    marginBottom: 12,
  },
  logScoreCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 3,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  logScoreText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  logDetails: {
    flex: 1,
    justifyContent: 'center',
  },
  logTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  logSubTitle: {
    fontSize: 12,
    color: '#64748B',
  },
  logGrade: {
    fontSize: 18,
    fontWeight: '900',
    marginRight: 4,
  },
  emptyCard: {
    backgroundColor: '#161930',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1E293B',
    padding: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  emptyIcon: {
    marginBottom: 12,
  },
  emptyText: {
    color: '#64748B',
    fontSize: 14,
    marginBottom: 20,
    textAlign: 'center',
  },
  emptyBtn: {
    backgroundColor: '#D24B38',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
  },
  emptyBtnText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  replayBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  replayBadgeText: {
    color: '#3B82F6',
    fontSize: 11,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    backgroundColor: '#161930',
    borderRadius: 20,
    borderColor: '#1E293B',
    borderWidth: 1,
    padding: 20,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
    paddingBottom: 12,
  },
  modalTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalSub: {
    color: '#64748B',
    fontSize: 12,
    marginTop: 2,
  },
  replayScoreHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F1020',
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  replayScoreCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 3,
    justifyContent: 'center',
    alignItems: 'center',
  },
  replayScoreValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  replayGradeTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  replayGradeDesc: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 2,
  },
  videoReplayContainer: {
    backgroundColor: '#0F1020',
    borderRadius: 14,
    borderColor: '#3B82F650',
    borderWidth: 1,
    padding: 12,
    marginBottom: 16,
    alignItems: 'center',
  },
  videoReplayHeading: {
    color: '#3B82F6',
    fontWeight: 'bold',
    fontSize: 11,
    letterSpacing: 1.0,
    marginBottom: 8,
  },
  videoWrapper: {
    width: '100%',
    height: 210,
    borderRadius: 12,
    overflow: 'hidden',
  },
  snapshotContainer: {
    backgroundColor: '#0F1020',
    borderRadius: 14,
    borderColor: '#10B98150',
    borderWidth: 1,
    padding: 12,
    marginBottom: 16,
    alignItems: 'center',
  },
  snapshotHeading: {
    color: '#10B981',
    fontWeight: 'bold',
    fontSize: 11,
    letterSpacing: 1.0,
    marginBottom: 8,
  },
  snapshotImage: {
    width: '100%',
    height: 180,
    borderRadius: 10,
  },
  noSnapshotContainer: {
    backgroundColor: '#0F1020',
    borderRadius: 14,
    padding: 20,
    marginBottom: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  noSnapshotText: {
    color: '#64748B',
    fontSize: 12,
    marginTop: 6,
  },
  modalSectionTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#64748B',
    letterSpacing: 1.2,
    marginBottom: 10,
  },
  replayMetricCard: {
    backgroundColor: '#0F1020',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  replayMetricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  replayMetricLabel: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  replayMetricScore: {
    color: '#F59E0B',
    fontSize: 14,
    fontWeight: 'bold',
  },
  replayMetricDetails: {
    color: '#94A3B8',
    fontSize: 11,
  },
  modalCloseBtn: {
    backgroundColor: '#D24B38',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 14,
  },
  modalCloseBtnText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 15,
  },
});
