import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Dimensions } from 'react-native';
import Svg, { Polygon, Line, Circle, Text as SvgText, Defs, LinearGradient, Stop, G } from 'react-native-svg';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StrikeMasteryItem, MasteryStats } from '@/constants/historyStore';

const { width } = Dimensions.get('window');

interface StrikeRadarChartProps {
  masteryStats: MasteryStats;
  onSelectStrike?: (strike: StrikeMasteryItem) => void;
  showDetailsCard?: boolean;
  compact?: boolean;
}

export function StrikeRadarChart({
  masteryStats,
  onSelectStrike,
  showDetailsCard = true,
  compact = false
}: StrikeRadarChartProps) {
  const router = useRouter();
  const [scoreMode, setScoreMode] = useState<'best' | 'avg'>('best');
  const [selectedStrikeId, setSelectedStrikeId] = useState<string>('strike_1');

  const chartSize = Math.min(width - 48, 330);
  const cx = chartSize / 2;
  const cy = chartSize / 2;
  const radius = chartSize / 2 - 32;

  const numAxes = 12;
  const gridLevels = [0.25, 0.5, 0.75, 1.0];

  const getScoreColor = (score: number) => {
    if (score >= 95) return '#10B981'; // Green
    if (score >= 85) return '#3B82F6'; // Blue
    if (score >= 70) return '#F59E0B'; // Orange
    if (score > 0) return '#EF4444'; // Red
    return '#475569'; // Muted Slate
  };

  const getAngle = (index: number) => {
    return -Math.PI / 2 + (index * (2 * Math.PI)) / numAxes;
  };

  // Generate regular 12-sided polygon vertices for concentric grid lines
  const getGridPolygonPoints = (levelRatio: number) => {
    const points: string[] = [];
    for (let i = 0; i < numAxes; i++) {
      const angle = getAngle(i);
      const r = radius * levelRatio;
      const x = cx + r * Math.cos(angle);
      const y = cy + r * Math.sin(angle);
      points.push(`${x.toFixed(1)},${y.toFixed(1)}`);
    }
    return points.join(' ');
  };

  // Calculate coordinates for user's actual data polygon
  const dataPoints: { x: number; y: number; score: number; strike: StrikeMasteryItem; angle: number }[] = [];
  const polygonPoints: string[] = [];

  masteryStats.strikes.forEach((strike, i) => {
    const angle = getAngle(i);
    const scoreVal = scoreMode === 'best' ? strike.bestScore : strike.avgScore;
    // Scale: minimum radius of 6px if 0 score so it's centered, up to 100%
    const normalizedRatio = scoreVal > 0 ? Math.max(0.1, scoreVal / 100) : 0.05;
    const r = radius * normalizedRatio;
    const x = cx + r * Math.cos(angle);
    const y = cy + r * Math.sin(angle);

    dataPoints.push({ x, y, score: scoreVal, strike, angle });
    polygonPoints.push(`${x.toFixed(1)},${y.toFixed(1)}`);
  });

  const selectedStrike =
    masteryStats.strikes.find((s) => s.id === selectedStrikeId) || masteryStats.strikes[0];

  const handleNodePress = (strike: StrikeMasteryItem) => {
    setSelectedStrikeId(strike.id);
    if (onSelectStrike) {
      onSelectStrike(strike);
    }
  };

  const handlePracticeStrike = (strikeId: string) => {
    router.push({
      pathname: '/evaluate',
      params: { strikeId }
    });
  };

  return (
    <View style={styles.cardContainer}>
      {/* Header & Ranking Badge */}
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <View style={styles.titleIconBadge}>
            <MaterialCommunityIcons name="spider-web" size={18} color="#D24B38" />
          </View>
          <View>
            <Text style={styles.cardTitle}>12 STRIKES MASTERY</Text>
            <Text style={styles.rankSubtitle}>{masteryStats.rankTitle}</Text>
          </View>
        </View>

        {/* Best / Avg Mode Switcher */}
        <View style={styles.modeSwitcher}>
          <TouchableOpacity
            style={[styles.modeBtn, scoreMode === 'best' && styles.modeBtnActive]}
            onPress={() => setScoreMode('best')}
            activeOpacity={0.7}
          >
            <Text style={[styles.modeBtnText, scoreMode === 'best' && styles.modeBtnTextActive]}>
              Best
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modeBtn, scoreMode === 'avg' && styles.modeBtnActive]}
            onPress={() => setScoreMode('avg')}
            activeOpacity={0.7}
          >
            <Text style={[styles.modeBtnText, scoreMode === 'avg' && styles.modeBtnTextActive]}>
              Avg
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Progress Summary Pill */}
      <View style={styles.progressSummaryRow}>
        <View style={styles.progressBarWrapper}>
          <View style={[styles.progressBarFill, { width: `${masteryStats.overallMastery}%` }]} />
        </View>
        <View style={styles.progressLabelRow}>
          <Text style={styles.progressText}>
            Mastery: <Text style={styles.progressHighlight}>{masteryStats.overallMastery}%</Text>
          </Text>
          <Text style={styles.progressText}>
            <Text style={styles.progressHighlight}>{masteryStats.masteredCount}</Text> / 12 Mastered
          </Text>
        </View>
      </View>

      {/* SVG Spider Chart */}
      <View style={styles.chartWrapper}>
        <Svg width={chartSize} height={chartSize}>
          <Defs>
            <LinearGradient id="radarGradient" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor="#D24B38" stopOpacity={0.45} />
              <Stop offset="100%" stopColor="#D24B38" stopOpacity={0.12} />
            </LinearGradient>
          </Defs>

          {/* Concentric Grid Polygons */}
          {gridLevels.map((lvl, idx) => (
            <Polygon
              key={`grid-${idx}`}
              points={getGridPolygonPoints(lvl)}
              fill={lvl === 1.0 ? 'rgba(22, 25, 48, 0.4)' : 'none'}
              stroke={lvl === 1.0 ? '#2A2F4D' : '#1A1F36'}
              strokeWidth={lvl === 1.0 ? 1.5 : 1}
              strokeDasharray={lvl < 1.0 ? '3, 3' : undefined}
            />
          ))}

          {/* Radial Spokes */}
          {masteryStats.strikes.map((_, idx) => {
            const angle = getAngle(idx);
            const x2 = cx + radius * Math.cos(angle);
            const y2 = cy + radius * Math.sin(angle);
            return (
              <Line
                key={`spoke-${idx}`}
                x1={cx}
                y1={cy}
                x2={x2}
                y2={y2}
                stroke="#1A1F36"
                strokeWidth={1}
              />
            );
          })}

          {/* Filled User Data Polygon */}
          {polygonPoints.length > 0 && (
            <Polygon
              points={polygonPoints.join(' ')}
              fill="url(#radarGradient)"
              stroke="#D24B38"
              strokeWidth={2.2}
            />
          )}

          {/* Grid Scale Markings */}
          <SvgText x={cx + 4} y={cy - radius * 0.5 + 3} fill="#4B5563" fontSize="8" fontWeight="600">
            50%
          </SvgText>
          <SvgText x={cx + 4} y={cy - radius * 1.0 + 8} fill="#4B5563" fontSize="8" fontWeight="600">
            100%
          </SvgText>

          {/* Circumference Strike Labels (S1 .. S12) */}
          {masteryStats.strikes.map((s, idx) => {
            const angle = getAngle(idx);
            const labelR = radius + 18;
            const lx = cx + labelR * Math.cos(angle);
            const ly = cy + labelR * Math.sin(angle) + 4;
            const isSelected = s.id === selectedStrikeId;
            const color = isSelected ? '#FFFFFF' : s.bestScore >= 85 ? '#10B981' : '#64748B';

            return (
              <G key={`label-${idx}`} onPress={() => handleNodePress(s)}>
                <SvgText
                  x={lx}
                  y={ly}
                  fill={color}
                  fontSize={isSelected ? '11' : '9.5'}
                  fontWeight={isSelected ? 'bold' : '600'}
                  textAnchor="middle"
                >
                  {`S${s.strikeNumber}`}
                </SvgText>
              </G>
            );
          })}

          {/* Vertex Node Points */}
          {dataPoints.map((pt) => {
            const isSelected = pt.strike.id === selectedStrikeId;
            const nodeColor = getScoreColor(pt.score);

            return (
              <G key={`node-${pt.strike.id}`} onPress={() => handleNodePress(pt.strike)}>
                {/* Active Selection Glow Ring */}
                {isSelected && (
                  <Circle
                    cx={pt.x}
                    cy={pt.y}
                    r={10}
                    fill="none"
                    stroke="#FFFFFF"
                    strokeWidth={1.5}
                    opacity={0.8}
                  />
                )}
                {/* Vertex Center Dot */}
                <Circle
                  cx={pt.x}
                  cy={pt.y}
                  r={isSelected ? 6 : 4}
                  fill={nodeColor}
                  stroke="#0F1020"
                  strokeWidth={1.5}
                />
              </G>
            );
          })}
        </Svg>
      </View>

      {/* Interactive Selected Strike Details Card */}
      {showDetailsCard && selectedStrike && (
        <View style={styles.detailCard}>
          <View style={styles.detailHeader}>
            <View style={styles.detailTitleGroup}>
              <View
                style={[
                  styles.strikeBadge,
                  { backgroundColor: getScoreColor(selectedStrike.bestScore) + '25' }
                ]}
              >
                <Text
                  style={[
                    styles.strikeBadgeText,
                    { color: getScoreColor(selectedStrike.bestScore) }
                  ]}
                >
                  {selectedStrike.strikeNumber}
                </Text>
              </View>
              <View>
                <Text style={styles.detailName}>{selectedStrike.name}</Text>
                <Text style={styles.detailTarget}>{selectedStrike.target}</Text>
              </View>
            </View>

            <View
              style={[
                styles.gradePill,
                { backgroundColor: getScoreColor(selectedStrike.bestScore) + '20' }
              ]}
            >
              <Text
                style={[
                  styles.gradePillText,
                  { color: getScoreColor(selectedStrike.bestScore) }
                ]}
              >
                {selectedStrike.grade}
              </Text>
            </View>
          </View>

          <Text style={styles.detailDesc}>{selectedStrike.description}</Text>

          {/* Stats Metrics Row */}
          <View style={styles.metricsRow}>
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>BEST SCORE</Text>
              <Text
                style={[
                  styles.metricValue,
                  { color: getScoreColor(selectedStrike.bestScore) }
                ]}
              >
                {selectedStrike.bestScore > 0 ? `${selectedStrike.bestScore}%` : '—'}
              </Text>
            </View>
            <View style={styles.metricDivider} />
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>AVG SCORE</Text>
              <Text style={styles.metricValue}>
                {selectedStrike.avgScore > 0 ? `${selectedStrike.avgScore}%` : '—'}
              </Text>
            </View>
            <View style={styles.metricDivider} />
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>SESSIONS</Text>
              <Text style={styles.metricValue}>{selectedStrike.attempts}</Text>
            </View>
          </View>

          {/* Quick Practice Action Button */}
          <TouchableOpacity
            style={styles.practiceButton}
            onPress={() => handlePracticeStrike(selectedStrike.id)}
            activeOpacity={0.8}
          >
            <MaterialCommunityIcons name="target" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
            <Text style={styles.practiceButtonText}>
              Practice {selectedStrike.name} Now
            </Text>
            <Ionicons name="arrow-forward" size={16} color="#FFFFFF" style={{ marginLeft: 4 }} />
          </TouchableOpacity>
        </View>
      )}

      {/* Quick Strike Selector Badges Row */}
      <View style={styles.selectorRow}>
        {masteryStats.strikes.map((st) => {
          const isSelected = st.id === selectedStrikeId;
          const score = scoreMode === 'best' ? st.bestScore : st.avgScore;
          const color = getScoreColor(score);

          return (
            <TouchableOpacity
              key={`badge-${st.id}`}
              style={[
                styles.selectorPill,
                isSelected && styles.selectorPillActive,
                { borderColor: isSelected ? '#FFFFFF' : color + '40' }
              ]}
              onPress={() => handleNodePress(st)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.selectorPillText,
                  { color: isSelected ? '#FFFFFF' : color }
                ]}
              >
                {st.strikeNumber}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: '#161930',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1E293B',
    padding: 18,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  titleIconBadge: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(210, 75, 56, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 1.1,
  },
  rankSubtitle: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 1,
  },
  modeSwitcher: {
    flexDirection: 'row',
    backgroundColor: '#0F1020',
    borderRadius: 8,
    padding: 2,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  modeBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  modeBtnActive: {
    backgroundColor: '#D24B38',
  },
  modeBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  modeBtnTextActive: {
    color: '#FFFFFF',
  },
  progressSummaryRow: {
    marginBottom: 8,
  },
  progressBarWrapper: {
    height: 5,
    backgroundColor: '#0F1020',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 6,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#D24B38',
    borderRadius: 3,
  },
  progressLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressText: {
    fontSize: 11,
    color: '#94A3B8',
  },
  progressHighlight: {
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  chartWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 4,
  },
  detailCard: {
    backgroundColor: '#0F1020',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#1E293B',
    marginTop: 8,
    marginBottom: 12,
  },
  detailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  detailTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  strikeBadge: {
    width: 26,
    height: 26,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  strikeBadgeText: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  detailName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  detailTarget: {
    fontSize: 11,
    color: '#F59E0B',
    marginTop: 1,
  },
  gradePill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  gradePillText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  detailDesc: {
    fontSize: 12,
    color: '#94A3B8',
    marginBottom: 10,
    lineHeight: 16,
  },
  metricsRow: {
    flexDirection: 'row',
    backgroundColor: '#161930',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'space-around',
    marginBottom: 10,
  },
  metricItem: {
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#64748B',
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  metricValue: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  metricDivider: {
    width: 1,
    height: 20,
    backgroundColor: '#1E293B',
  },
  practiceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#D24B38',
    borderRadius: 8,
    paddingVertical: 9,
  },
  practiceButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  selectorRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  selectorPill: {
    width: 22,
    height: 22,
    borderRadius: 6,
    backgroundColor: '#0F1020',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  selectorPillActive: {
    backgroundColor: '#D24B38',
  },
  selectorPillText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
});
