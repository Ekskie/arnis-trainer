import React, { useState, useEffect } from 'react';
import {
  Dimensions,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useVideoPlayer, VideoView } from 'expo-video';
import * as Haptics from 'expo-haptics';
import Svg, { Circle, Defs, Line, LinearGradient, Marker, Path, Rect, Stop, Text as SvgText } from 'react-native-svg';
import { CurriculumLesson } from '@/constants/curriculumStore';
import { LOCAL_STRIKE_VIDEOS, STRIKE_VIDEOS_CATALOG } from '@/constants/strikeVideos';

const { width } = Dimensions.get('window');

export interface TechniqueLessonModalProps {
  visible: boolean;
  lesson: CurriculumLesson | null;
  onClose: () => void;
  onStartMode: (mode: 'follow' | 'guided' | 'test', strikeId: string) => void;
  bestScore?: number;
  grade?: string;
}

export function TechniqueLessonModal({
  visible,
  lesson,
  onClose,
  onStartMode,
  bestScore = 0,
  grade = 'Unranked',
}: TechniqueLessonModalProps) {
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);

  const strikeKey = lesson?.strikeKey || 'strike_1';
  const videoSource = LOCAL_STRIKE_VIDEOS[strikeKey] || null;

  const player = useVideoPlayer(videoSource, (p) => {
    p.loop = true;
    p.playbackRate = playbackSpeed;
    if (visible) p.play();
  });

  useEffect(() => {
    if (player && videoSource) {
      if (typeof player.replaceAsync === 'function') {
        player.replaceAsync(videoSource).then(() => {
          player.playbackRate = playbackSpeed;
          if (visible) player.play();
        }).catch(() => {});
      } else {
        player.replace(videoSource);
        player.playbackRate = playbackSpeed;
        if (visible) player.play();
      }
    }
  }, [strikeKey, videoSource, player, visible]);

  useEffect(() => {
    if (player) {
      player.playbackRate = playbackSpeed;
    }
  }, [playbackSpeed, player]);

  useEffect(() => {
    if (!visible && player) {
      player.pause();
      setIsPlaying(false);
    } else if (visible && player) {
      player.play();
      setIsPlaying(true);
    }
  }, [visible, player]);

  if (!lesson) return null;

  const handleSpeedToggle = (speed: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPlaybackSpeed(speed);
  };

  const handleLaunchPractice = (mode: 'follow' | 'guided' | 'test') => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onClose();
    onStartMode(mode, strikeKey);
  };

  // Render SVG Anatomical Target Diagram
  const renderTargetDiagram = () => {
    const isHead = ['strike_1', 'strike_2', 'strike_12'].includes(strikeKey);
    const isTorso = ['strike_3', 'strike_4', 'strike_5', 'strike_6', 'strike_7'].includes(strikeKey);
    const isKnee = ['strike_8', 'strike_9'].includes(strikeKey);
    const isEye = ['strike_10', 'strike_11'].includes(strikeKey);

    return (
      <View style={styles.diagramContainer}>
        <View style={styles.diagramSvgWrapper}>
          <Svg width="180" height="200" viewBox="0 0 180 200">
            <Defs>
              <LinearGradient id="targetGlow" x1="0%" y1="0%" x2="100%" y2="100%">
                <Stop offset="0%" stopColor="#EF4444" stopOpacity="1" />
                <Stop offset="100%" stopColor="#D24B38" stopOpacity="0.8" />
              </LinearGradient>
              <Marker id="arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <Path d="M 0 0 L 10 5 L 0 10 z" fill="#EF4444" />
              </Marker>
            </Defs>

            {/* Human Silhouette Blueprint */}
            {/* Head */}
            <Circle cx="90" cy="30" r="18" fill="#1E2648" stroke="#334155" strokeWidth="2" />
            {/* Eyes */}
            <Circle cx="84" cy="28" r="2" fill="#64748B" />
            <Circle cx="96" cy="28" r="2" fill="#64748B" />

            {/* Torso */}
            <Path d="M 72 50 L 108 50 L 102 110 L 78 110 Z" fill="#18203D" stroke="#334155" strokeWidth="2" />

            {/* Left Arm (Mirrored perspective) */}
            <Path d="M 72 52 L 52 80 L 62 100" stroke="#334155" strokeWidth="6" strokeLinecap="round" fill="none" />
            {/* Right Arm */}
            <Path d="M 108 52 L 128 80 L 118 100" stroke="#334155" strokeWidth="6" strokeLinecap="round" fill="none" />

            {/* Legs & Knees */}
            <Path d="M 80 110 L 74 150 L 70 190" stroke="#334155" strokeWidth="7" strokeLinecap="round" fill="none" />
            <Path d="M 100 110 L 106 150 L 110 190" stroke="#334155" strokeWidth="7" strokeLinecap="round" fill="none" />

            {/* Highlight Target based on Strike */}
            {isHead && strikeKey === 'strike_1' && (
              <>
                <Circle cx="76" cy="26" r="7" fill="url(#targetGlow)" stroke="#FFFFFF" strokeWidth="1.5" />
                <Line x1="130" y1="10" x2="84" y2="24" stroke="#EF4444" strokeWidth="3" strokeDasharray="4,2" markerEnd="url(#arrow)" />
                <SvgText x="135" y="16" fill="#F87171" fontSize="10" fontWeight="bold">STRIKE 1 ➔</SvgText>
              </>
            )}

            {isHead && strikeKey === 'strike_2' && (
              <>
                <Circle cx="104" cy="26" r="7" fill="url(#targetGlow)" stroke="#FFFFFF" strokeWidth="1.5" />
                <Line x1="50" y1="10" x2="96" y2="24" stroke="#EF4444" strokeWidth="3" strokeDasharray="4,2" markerEnd="url(#arrow)" />
                <SvgText x="15" y="16" fill="#F87171" fontSize="10" fontWeight="bold">STRIKE 2 ➔</SvgText>
              </>
            )}

            {isHead && strikeKey === 'strike_12' && (
              <>
                <Circle cx="90" cy="14" r="7" fill="url(#targetGlow)" stroke="#FFFFFF" strokeWidth="1.5" />
                <Line x1="90" y1="-5" x2="90" y2="8" stroke="#EF4444" strokeWidth="3.5" markerEnd="url(#arrow)" />
                <SvgText x="96" y="8" fill="#F87171" fontSize="10" fontWeight="bold">CROWN ⬇</SvgText>
              </>
            )}

            {isTorso && strikeKey === 'strike_3' && (
              <>
                <Circle cx="76" cy="85" r="7" fill="url(#targetGlow)" stroke="#FFFFFF" strokeWidth="1.5" />
                <Line x1="135" y1="85" x2="84" y2="85" stroke="#EF4444" strokeWidth="3" markerEnd="url(#arrow)" />
              </>
            )}

            {isTorso && strikeKey === 'strike_4' && (
              <>
                <Circle cx="104" cy="85" r="7" fill="url(#targetGlow)" stroke="#FFFFFF" strokeWidth="1.5" />
                <Line x1="45" y1="85" x2="96" y2="85" stroke="#EF4444" strokeWidth="3" markerEnd="url(#arrow)" />
              </>
            )}

            {isTorso && strikeKey === 'strike_5' && (
              <>
                <Circle cx="90" cy="90" r="8" fill="url(#targetGlow)" stroke="#FFFFFF" strokeWidth="1.5" />
                <Circle cx="90" cy="90" r="14" stroke="#EF4444" strokeWidth="1.5" strokeDasharray="3,3" fill="none" />
              </>
            )}

            {isTorso && (strikeKey === 'strike_6' || strikeKey === 'strike_7') && (
              <>
                <Circle cx={strikeKey === 'strike_6' ? 80 : 100} cy="65" r="7" fill="url(#targetGlow)" stroke="#FFFFFF" strokeWidth="1.5" />
                <Line x1={strikeKey === 'strike_6' ? 95 : 85} y1="90" x2={strikeKey === 'strike_6' ? 82 : 98} y2="70" stroke="#EF4444" strokeWidth="3" markerEnd="url(#arrow)" />
              </>
            )}

            {isKnee && (
              <>
                <Circle cx={strikeKey === 'strike_8' ? 74 : 106} cy="150" r="7" fill="url(#targetGlow)" stroke="#FFFFFF" strokeWidth="1.5" />
                <Line x1={strikeKey === 'strike_8' ? 120 : 60} y1="120" x2={strikeKey === 'strike_8' ? 82 : 98} y2="145" stroke="#EF4444" strokeWidth="3" markerEnd="url(#arrow)" />
              </>
            )}

            {isEye && (
              <>
                <Circle cx={strikeKey === 'strike_10' ? 84 : 96} cy="28" r="5" fill="url(#targetGlow)" stroke="#FFFFFF" strokeWidth="1.5" />
                <Line x1="90" y1="5" x2={strikeKey === 'strike_10' ? 85 : 95} y2="23" stroke="#EF4444" strokeWidth="2.5" markerEnd="url(#arrow)" />
              </>
            )}
          </Svg>
        </View>

        <View style={styles.diagramDetails}>
          <Text style={styles.targetLabel}>🎯 ANATOMICAL TARGET:</Text>
          <Text style={styles.targetValue}>{lesson.target || 'Full Body Engagement'}</Text>

          <Text style={styles.trajLabel}>⚔️ STRIKE TRAJECTORY:</Text>
          <Text style={styles.trajValue}>{lesson.trajectory || 'Dynamic martial kinetic path'}</Text>

          <View style={styles.ruleBadge}>
            <Ionicons name="sparkles" size={12} color="#F59E0B" style={{ marginRight: 4 }} />
            <Text style={styles.ruleBadgeText}>Target → Direction → Control → Return</Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header Bar */}
        <View style={styles.topBar}>
          <TouchableOpacity onPress={onClose} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
            <Text style={styles.backBtnText}>Course</Text>
          </TouchableOpacity>

          <View style={styles.headerTitleWrap}>
            <Text style={styles.headerTag}>{lesson.category?.toUpperCase() || 'LESSON'}</Text>
            <Text style={styles.headerTitleText} numberOfLines={1}>{lesson.title}</Text>
          </View>

          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Ionicons name="close-circle" size={26} color="#64748B" />
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          {/* SECTION 1: WHAT IS IT & WHY? */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeaderRow}>
              <View style={styles.stepNumCircle}>
                <Text style={styles.stepNumText}>1</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.sectionHeading}>WHAT IS IT & WHY DO WE LEARN THIS?</Text>
                <Text style={styles.sectionSubHeading}>{lesson.filipinoTitle || lesson.subtitle}</Text>
              </View>
            </View>

            <Text style={styles.bodyText}>{lesson.description}</Text>

            {lesson.purpose && (
              <View style={styles.purposeBox}>
                <Ionicons name="compass-outline" size={16} color="#38BDF8" style={{ marginRight: 6 }} />
                <Text style={styles.purposeText}>
                  <Text style={{ fontWeight: '800', color: '#38BDF8' }}>Core Martial Purpose: </Text>
                  {lesson.purpose}
                </Text>
              </View>
            )}
          </View>

          {/* SECTION 2: VIDEO DEMONSTRATION */}
          {lesson.isStrike && videoSource && (
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeaderRow}>
                <View style={styles.stepNumCircle}>
                  <Text style={styles.stepNumText}>2</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.sectionHeading}>VIDEO DEMONSTRATION</Text>
                  <Text style={styles.sectionSubHeading}>Master Reference Technique at 60 FPS</Text>
                </View>
              </View>

              <View style={styles.videoPlayerContainer}>
                <VideoView
                  player={player}
                  style={styles.videoPlayer}
                  allowsFullscreen={false}
                  allowsPictureInPicture={false}
                />

                {/* Speed Controls Overlay Bar */}
                <View style={styles.speedControlBar}>
                  <Text style={styles.speedLabel}>SPEED:</Text>
                  {[0.5, 0.75, 1.0].map((spd) => (
                    <TouchableOpacity
                      key={spd}
                      style={[styles.speedBtn, playbackSpeed === spd && styles.speedBtnActive]}
                      onPress={() => handleSpeedToggle(spd)}
                    >
                      <Text style={[styles.speedBtnText, playbackSpeed === spd && styles.speedBtnTextActive]}>
                        {spd}x
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>
          )}

          {/* SECTION 3: TARGET & DIAGRAM */}
          {lesson.isStrike && (
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeaderRow}>
                <View style={styles.stepNumCircle}>
                  <Text style={styles.stepNumText}>3</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.sectionHeading}>TARGET & TRAJECTORY</Text>
                  <Text style={styles.sectionSubHeading}>Where and How the Strike Travels</Text>
                </View>
              </View>

              {renderTargetDiagram()}
            </View>
          )}

          {/* SECTION 4: HOW TO DO IT (COACH STEPS) */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeaderRow}>
              <View style={styles.stepNumCircle}>
                <Text style={styles.stepNumText}>{lesson.isStrike ? '4' : '2'}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.sectionHeading}>HOW TO DO IT</Text>
                <Text style={styles.sectionSubHeading}>Step-by-Step Human Coach Guide</Text>
              </View>
            </View>

            <View style={styles.stepsList}>
              {lesson.coachSteps.map((step, idx) => (
                <View key={idx} style={styles.stepItemRow}>
                  <View style={styles.stepItemBadge}>
                    <Text style={styles.stepItemBadgeText}>{idx + 1}</Text>
                  </View>
                  <Text style={styles.stepItemText}>{step.replace(/^\d+\.\s*/, '')}</Text>
                </View>
              ))}
            </View>

            {lesson.guroAdvice && (
              <View style={styles.adviceBox}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                  <MaterialCommunityIcons name="karate" size={16} color="#F59E0B" style={{ marginRight: 6 }} />
                  <Text style={styles.adviceTitle}>Guro&apos;s Pro Tip</Text>
                </View>
                <Text style={styles.adviceText}>{lesson.guroAdvice}</Text>
              </View>
            )}
          </View>

          {/* SECTION 5: COMMON MISTAKES TO AVOID */}
          {lesson.commonMistakes && lesson.commonMistakes.length > 0 && (
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeaderRow}>
                <View style={[styles.stepNumCircle, { backgroundColor: '#EF444420', borderColor: '#EF4444' }]}>
                  <Text style={[styles.stepNumText, { color: '#EF4444' }]}>⚠</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.sectionHeading, { color: '#F87171' }]}>COMMON MISTAKES TO AVOID</Text>
                  <Text style={styles.sectionSubHeading}>Watch Out for These Frequent Flaws</Text>
                </View>
              </View>

              <View style={styles.mistakesList}>
                {lesson.commonMistakes.map((mistake, mIdx) => (
                  <View key={mIdx} style={styles.mistakeItem}>
                    <Ionicons name="warning-outline" size={16} color="#EF4444" style={{ marginRight: 8, marginTop: 2 }} />
                    <Text style={styles.mistakeText}>{mistake}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* SECTION 6: TRY IT — 3 PROGRESSIVE MODES */}
          <View style={[styles.sectionCard, styles.tryItCard]}>
            <View style={styles.sectionHeaderRow}>
              <View style={[styles.stepNumCircle, { backgroundColor: '#10B98120', borderColor: '#10B981' }]}>
                <Ionicons name="play" size={14} color="#10B981" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.sectionHeading, { color: '#34D399' }]}>TRY IT YOURSELF</Text>
                <Text style={styles.sectionSubHeading}>Choose Your Training Mode with AI Camera</Text>
              </View>
            </View>

            {/* Past best score status */}
            {bestScore > 0 && (
              <View style={styles.pastScoreStrip}>
                <Ionicons name="trophy" size={16} color="#F59E0B" style={{ marginRight: 8 }} />
                <Text style={styles.pastScoreText}>
                  Personal Best: <Text style={{ fontWeight: '900', color: '#FFFFFF' }}>{bestScore}%</Text> ({grade})
                </Text>
              </View>
            )}

            {/* 3 Action Buttons */}
            <View style={styles.actionModesContainer}>
              {/* Mode 1: Follow Me */}
              <TouchableOpacity
                style={styles.modeOptionBtn}
                onPress={() => handleLaunchPractice('follow')}
                activeOpacity={0.85}
              >
                <View style={[styles.modeIconCircle, { backgroundColor: '#10B98120' }]}>
                  <Ionicons name="eye" size={20} color="#10B981" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.modeOptionTitle}>🟢 Mode 1 — Follow Me</Text>
                  <Text style={styles.modeOptionDesc}>Mirror the master instructor side-by-side on camera</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#64748B" />
              </TouchableOpacity>

              {/* Mode 2: Guided Practice */}
              <TouchableOpacity
                style={styles.modeOptionBtn}
                onPress={() => handleLaunchPractice('guided')}
                activeOpacity={0.85}
              >
                <View style={[styles.modeIconCircle, { backgroundColor: '#F59E0B20' }]}>
                  <Ionicons name="mic" size={20} color="#F59E0B" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.modeOptionTitle}>🟡 Mode 2 — Guided Practice</Text>
                  <Text style={styles.modeOptionDesc}>Real-time spoken coaching & live visual checkmarks</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#64748B" />
              </TouchableOpacity>

              {/* Mode 3: Test Yourself */}
              <TouchableOpacity
                style={[styles.modeOptionBtn, styles.modeOptionBtnPrimary]}
                onPress={() => handleLaunchPractice('test')}
                activeOpacity={0.85}
              >
                <View style={[styles.modeIconCircle, { backgroundColor: '#EF444420' }]}>
                  <MaterialCommunityIcons name="target" size={20} color="#EF4444" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.modeOptionTitle, { color: '#FFFFFF' }]}>🔴 Mode 3 — Test Yourself</Text>
                  <Text style={[styles.modeOptionDesc, { color: '#CBD5E1' }]}>3-2-1 countdown, clean view, AI scored apex check</Text>
                </View>
                <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B0D1B',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1A213D',
    backgroundColor: '#0F1326',
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    marginLeft: 2,
  },
  headerTitleWrap: {
    alignItems: 'center',
    maxWidth: width * 0.5,
  },
  headerTag: {
    fontSize: 9,
    fontWeight: '900',
    color: '#D24B38',
    letterSpacing: 1.2,
  },
  headerTitleText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  closeBtn: {
    padding: 4,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
    gap: 16,
  },
  sectionCard: {
    backgroundColor: '#131830',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: '#20284A',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  stepNumCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#3B82F620',
    borderWidth: 1.5,
    borderColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  stepNumText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#3B82F6',
  },
  sectionHeading: {
    fontSize: 12,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.8,
  },
  sectionSubHeading: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 1,
  },
  bodyText: {
    fontSize: 13,
    color: '#E2E8F0',
    lineHeight: 19,
    marginBottom: 12,
  },
  purposeBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#0E172A',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  purposeText: {
    flex: 1,
    fontSize: 12,
    color: '#CBD5E1',
    lineHeight: 16,
  },
  videoPlayerContainer: {
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#000000',
    borderWidth: 1,
    borderColor: '#252F54',
  },
  videoPlayer: {
    width: '100%',
    height: 220,
  },
  speedControlBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    backgroundColor: '#0F1326',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  speedLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748B',
    marginRight: 4,
  },
  speedBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#1C2340',
  },
  speedBtnActive: {
    backgroundColor: '#D24B38',
  },
  speedBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
  },
  speedBtnTextActive: {
    color: '#FFFFFF',
  },
  diagramContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0E1328',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#1F274B',
  },
  diagramSvgWrapper: {
    width: 130,
    alignItems: 'center',
    justifyContent: 'center',
  },
  diagramDetails: {
    flex: 1,
    paddingLeft: 10,
  },
  targetLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#EF4444',
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  targetValue: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 10,
  },
  trajLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#38BDF8',
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  trajValue: {
    fontSize: 12,
    color: '#E2E8F0',
    marginBottom: 10,
  },
  ruleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F59E0B15',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#F59E0B30',
  },
  ruleBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#F59E0B',
  },
  stepsList: {
    gap: 8,
    marginBottom: 14,
  },
  stepItemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  stepItemBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#1E2548',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    marginTop: 1,
  },
  stepItemBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#D24B38',
  },
  stepItemText: {
    flex: 1,
    fontSize: 12.5,
    color: '#E2E8F0',
    lineHeight: 18,
  },
  adviceBox: {
    backgroundColor: '#171E3C',
    borderRadius: 12,
    padding: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#F59E0B',
  },
  adviceTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#F59E0B',
  },
  adviceText: {
    fontSize: 12,
    color: '#CBD5E1',
    lineHeight: 16,
  },
  mistakesList: {
    gap: 8,
  },
  mistakeItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#1A1424',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#EF444430',
  },
  mistakeText: {
    flex: 1,
    fontSize: 12,
    color: '#FCA5A5',
    lineHeight: 16,
  },
  tryItCard: {
    borderColor: '#10B98150',
  },
  pastScoreStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#12252A',
    borderRadius: 10,
    padding: 10,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#10B98140',
  },
  pastScoreText: {
    fontSize: 12,
    color: '#A7F3D0',
  },
  actionModesContainer: {
    gap: 10,
  },
  modeOptionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#181F3D',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#263158',
  },
  modeOptionBtnPrimary: {
    backgroundColor: '#D24B38',
    borderColor: '#FF6B57',
  },
  modeIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  modeOptionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  modeOptionDesc: {
    fontSize: 11,
    color: '#94A3B8',
  },
});
