import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Path, Circle, Text as SvgText, Defs, LinearGradient, Stop } from 'react-native-svg';
import { getHistory, clearHistory, SessionItem } from '@/constants/historyStore';

const { width } = Dimensions.get('window');

export default function ProgressHistoryScreen() {
  const router = useRouter();
  const [historyList, setHistoryList] = useState<SessionItem[]>([]);
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
          setHistoryList(history || []);
          if (history && history.length > 0) {
            const count = history.length;
            const sum = history.reduce((acc, curr) => acc + curr.score, 0);
            const best = Math.max(...history.map((h) => h.score));
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
    setStats({ avgScore: 0, bestScore: 0, sessionsCount: 0 });
  };

  const getScoreColor = (score: number) => {
    if (score >= 95) return '#10B981'; // Green
    if (score >= 85) return '#3B82F6'; // Blue
    if (score >= 70) return '#F59E0B'; // Orange
    return '#EF4444'; // Red
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
          <Text style={styles.headerTitle}>Progress History</Text>
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
            <View key={item.id} style={styles.logCard}>
              <View 
                style={[
                  styles.logScoreCircle, 
                  { borderColor: getScoreColor(item.score) }
                ]}
              >
                <Text style={styles.logScoreText}>{item.score}</Text>
              </View>

              <View style={styles.logDetails}>
                <Text style={styles.logTitle}>{item.strikeName}</Text>
                <Text style={styles.logSubTitle}>{item.description} · {item.date}</Text>
              </View>

              <Text style={[styles.logGrade, { color: getScoreColor(item.score) }]}>
                {item.grade.replace('Grade ', '')}
              </Text>
            </View>
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
      </ScrollView>
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
});
