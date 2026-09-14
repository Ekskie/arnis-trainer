import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Dimensions } from 'react-native';
import Svg, { Polygon, Line, Circle, Text as SvgText, Defs, LinearGradient, Stop, G } from 'react-native-svg';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StrikeMasteryItem, MasteryStats } from '@/constants/historyStore';
import { MartialTheme } from '@/constants/theme';

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
    if (score >= 85) return MartialTheme.colors.primary; // Forest Green
    if (score >= 70) return MartialTheme.colors.bambooDark; // Amber Bamboo
    if (score > 0) return '#EF4444'; // Red
    return '#94A3B8'; // Slate
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
            <MaterialCommunityIcons name="spider-web" size={18} color={MartialTheme.colors.primary} />
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
              <Stop offset="0%" stopColor="#15803D" stopOpacity={0.42} />
              <Stop offset="100%" stopColor="#22C55E" stopOpacity={0.10} />
            </LinearGradient>
          </Defs>

          {/* Concentric Grid Polygons */}
          {gridLevels.map((lvl, idx) => (
            <Polygon
              key={`grid-${idx}`}
              points={getGridPolygonPoints(lvl)}
              fill={lvl === 1.0 ? 'rgba(240, 253, 244, 0.45)' : 'none'}
              stroke={lvl === 1.0 ? '#CBD5E1' : '#E2E8F0'}
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
                stroke="#E2E8F0"
                strokeWidth={1}
              />
            );
          })}

          {/* Filled User Data Polygon */}
          {polygonPoints.length > 0 && (
            <Polygon
              points={polygonPoints.join(' ')}
              fill="url(#radarGradient)"
              stroke={MartialTheme.colors.primary}
              strokeWidth={2.5}
            />
          )}

          {/* Grid Scale Markings */}
          <SvgText x={cx + 4} y={cy - radius * 0.5 + 3} fill="#94A3B8" fontSize="8" fontWeight="700">
            50%
          </SvgText>
          <SvgText x={cx + 4} y={cy - radius * 1.0 + 8} fill="#94A3B8" fontSize="8" fontWeight="700">
            100%
          </SvgText>

          {/* Circumference Strike Labels (S1 .. S12) */}
          {masteryStats.strikes.map((s, idx) => {
            const angle = getAngle(idx);
            const labelR = radius + 18;
            const lx = cx + labelR * Math.cos(angle);
            const ly = cy + labelR * Math.sin(angle) + 4;
            const isSelected = s.id === selectedStrikeId;
            const color = isSelected
              ? MartialTheme.colors.primaryDark
              : s.bestScore >= 85
              ? MartialTheme.colors.primary
              : '#64748B';

            return (
              <G key={`label-${idx}`} onPress={() => handleNodePress(s)}>
                <SvgText
                  x={lx}
                  y={ly}
                  fill={color}
                  fontSize={isSelected ? '11.5' : '9.5'}
                  fontWeight={isSelected ? '900' : '600'}
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
                    stroke={MartialTheme.colors.primary}
                    strokeWidth={2}
                    opacity={0.85}
                  />
                )}
                {/* Vertex Center Dot */}
                <Circle
                  cx={pt.x}
                  cy={pt.y}
                  r={isSelected ? 6 : 4}
                  fill={nodeColor}
                  stroke="#FFFFFF"
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
                  {
                    backgroundColor: selectedStrike.isMastered
                      ? MartialTheme.colors.primaryMuted
                      : selectedStrike.bestScore > 0
                      ? MartialTheme.colors.bambooMuted
                      : '#F1F5F9',
                    borderColor: selectedStrike.isMastered
                      ? '#86EFAC'
                      : selectedStrike.bestScore > 0
                      ? '#FDE68A'
                      : '#E2E8F0',
                  }
                ]}
              >
                <Text
                  style={[
                    styles.strikeBadgeText,
                    {
                      color: selectedStrike.isMastered
                        ? MartialTheme.colors.primaryDark
                        : selectedStrike.bestScore > 0
                        ? MartialTheme.colors.bambooDark
                        : MartialTheme.colors.textMuted,
                    }
                  ]}
                >
                  {selectedStrike.strikeNumber}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.detailName}>{selectedStrike.name}</Text>
                <Text style={styles.detailTarget}>{selectedStrike.target}</Text>
              </View>
            </View>

            <View
              style={[
                styles.gradePill,
                {
                  backgroundColor: selectedStrike.isMastered
                    ? MartialTheme.colors.primaryMuted
                    : '#FEF3C7',
                  borderColor: selectedStrike.isMastered ? '#BBF7D0' : '#FDE68A',
                }
              ]}
            >
              <Text
                style={[
                  styles.gradePillText,
                  {
                    color: selectedStrike.isMastered
                      ? MartialTheme.colors.primaryDark
                      : MartialTheme.colors.bambooDark,
                  }
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
          const isMastered = st.isMastered;

          return (
            <TouchableOpacity
              key={`badge-${st.id}`}
              style={[
                styles.selectorPill,
                isSelected && styles.selectorPillActive,
                !isSelected && isMastered && styles.selectorPillMastered,
              ]}
              onPress={() => handleNodePress(st)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.selectorPillText,
                  isSelected
                    ? styles.selectorPillTextActive
                    : isMastered
                    ? styles.selectorPillTextMastered
                    : styles.selectorPillTextDefault,
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
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: MartialTheme.colors.border,
    borderBottomWidth: 4,
    borderBottomColor: MartialTheme.colors.border3D,
    padding: 16,
    marginBottom: 20,
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
    borderRadius: 10,
    backgroundColor: MartialTheme.colors.primaryMuted,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: MartialTheme.colors.text,
    letterSpacing: 0.8,
  },
  rankSubtitle: {
    fontSize: 11,
    fontWeight: '700',
    color: MartialTheme.colors.bambooDark,
    marginTop: 1,
  },
  modeSwitcher: {
    flexDirection: 'row',
    backgroundColor: MartialTheme.colors.background,
    borderRadius: 10,
    padding: 3,
    borderWidth: 1,
    borderColor: MartialTheme.colors.border,
  },
  modeBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 7,
  },
  modeBtnActive: {
    backgroundColor: MartialTheme.colors.primary,
  },
  modeBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: MartialTheme.colors.textMuted,
  },
  modeBtnTextActive: {
    color: '#FFFFFF',
    fontWeight: '900',
  },
  progressSummaryRow: {
    marginBottom: 8,
  },
  progressBarWrapper: {
    height: 6,
    backgroundColor: MartialTheme.colors.backgroundSecondary,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 6,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: MartialTheme.colors.primary,
    borderRadius: 3,
  },
  progressLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressText: {
    fontSize: 11,
    color: MartialTheme.colors.textSecondary,
    fontWeight: '600',
  },
  progressHighlight: {
    fontWeight: '900',
    color: MartialTheme.colors.text,
  },
  chartWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 4,
  },
  detailCard: {
    backgroundColor: MartialTheme.colors.background,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1.5,
    borderColor: MartialTheme.colors.border,
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
    paddingRight: 8,
  },
  strikeBadge: {
    width: 28,
    height: 28,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    borderWidth: 1,
  },
  strikeBadgeText: {
    fontSize: 12,
    fontWeight: '900',
  },
  detailName: {
    fontSize: 13.5,
    fontWeight: '900',
    color: MartialTheme.colors.text,
  },
  detailTarget: {
    fontSize: 11,
    color: MartialTheme.colors.bambooDark,
    fontWeight: '700',
    marginTop: 1,
  },
  gradePill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  gradePillText: {
    fontSize: 10,
    fontWeight: '900',
  },
  detailDesc: {
    fontSize: 12,
    color: MartialTheme.colors.textSecondary,
    marginBottom: 10,
    lineHeight: 16,
    fontWeight: '600',
  },
  metricsRow: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'space-around',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: MartialTheme.colors.border,
    borderBottomWidth: 3,
    borderBottomColor: MartialTheme.colors.border3D,
  },
  metricItem: {
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 9,
    fontWeight: '900',
    color: MartialTheme.colors.textMuted,
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  metricValue: {
    fontSize: 13,
    fontWeight: '900',
    color: MartialTheme.colors.text,
  },
  metricDivider: {
    width: 1,
    height: 22,
    backgroundColor: MartialTheme.colors.border,
  },
  practiceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: MartialTheme.colors.primary,
    borderRadius: 12,
    paddingVertical: 11,
    borderWidth: 1,
    borderColor: MartialTheme.colors.primary,
    borderBottomWidth: 3,
    borderBottomColor: MartialTheme.colors.primaryDark,
  },
  practiceButtonText: {
    color: '#FFFFFF',
    fontSize: 12.5,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  selectorRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
    gap: 4,
  },
  selectorPill: {
    flex: 1,
    height: 24,
    borderRadius: 7,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: MartialTheme.colors.border,
    borderBottomWidth: 2,
    borderBottomColor: MartialTheme.colors.border3D,
  },
  selectorPillActive: {
    backgroundColor: MartialTheme.colors.primary,
    borderColor: MartialTheme.colors.primary,
    borderBottomColor: MartialTheme.colors.primaryDark,
  },
  selectorPillMastered: {
    borderColor: '#BBF7D0',
    backgroundColor: '#F0FDF4',
  },
  selectorPillText: {
    fontSize: 10,
    fontWeight: '900',
  },
  selectorPillTextDefault: {
    color: MartialTheme.colors.textMuted,
  },
  selectorPillTextActive: {
    color: '#FFFFFF',
  },
  selectorPillTextMastered: {
    color: MartialTheme.colors.primaryDark,
  },
});
