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
import Svg, { Circle, Defs, Line, LinearGradient, Marker, Path, Stop, Text as SvgText } from 'react-native-svg';
import {
  CurriculumLesson,
  markLessonCompleted,
  setLessonPedagogicalStatus,
} from '@/constants/curriculumStore';
import { LOCAL_STRIKE_VIDEOS } from '@/constants/strikeVideos';
import { MartialTheme } from '@/constants/theme';
import { PrimaryButton } from '@/components/ui/PrimaryButton';

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
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);
  const [showFilipinoTerm, setShowFilipinoTerm] = useState<boolean>(false);
  const [showTechnicalDetails, setShowTechnicalDetails] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);

  // Reset to step 1 and record 'learning' status when opening a new lesson
  useEffect(() => {
    if (visible && lesson) {
      setCurrentStep(1);
      setShowFilipinoTerm(false);
      setShowTechnicalDetails(false);
      setLessonPedagogicalStatus(lesson.id, 'learning').catch(() => {});
    }
  }, [visible, lesson?.id]);

  const strikeKey = lesson?.strikeKey || 'strike_1';
  const videoSource = LOCAL_STRIKE_VIDEOS[strikeKey] || null;

  const player = useVideoPlayer(videoSource, (p) => {
    p.loop = true;
    p.playbackRate = playbackSpeed;
    if (visible && currentStep === 2) p.play();
  });

  useEffect(() => {
    if (player && videoSource) {
      if (typeof player.replaceAsync === 'function') {
        player.replaceAsync(videoSource).then(() => {
          player.playbackRate = playbackSpeed;
          if (visible && currentStep === 2) player.play();
        }).catch(() => {});
      } else {
        player.replace(videoSource);
        player.playbackRate = playbackSpeed;
        if (visible && currentStep === 2) player.play();
      }
    }
  }, [strikeKey, videoSource, player, visible, currentStep]);

  useEffect(() => {
    if (player) {
      player.playbackRate = playbackSpeed;
    }
  }, [playbackSpeed, player]);

  useEffect(() => {
    if (!visible && player) {
      player.pause();
      setIsPlaying(false);
    } else if (visible && player && currentStep === 2) {
      player.play();
      setIsPlaying(true);
    } else if (player && currentStep !== 2) {
      player.pause();
      setIsPlaying(false);
    }
  }, [visible, player, currentStep]);

  if (!lesson) return null;

  const handleSpeedToggle = (speed: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPlaybackSpeed(speed);
  };

  const handlePlayPause = () => {
    if (!player) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (isPlaying) {
      player.pause();
      setIsPlaying(false);
    } else {
      player.play();
      setIsPlaying(true);
    }
  };

  const goToStep = (step: 1 | 2 | 3 | 4) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCurrentStep(step);
    if (step >= 2 && lesson) {
      setLessonPedagogicalStatus(lesson.id, 'watched').catch(() => {});
    }
  };

  const handleCompleteOrientationLesson = async () => {
    if (!lesson) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await setLessonPedagogicalStatus(lesson.id, 'mastered');
    await markLessonCompleted(lesson.id);
    onClose();
  };

  const handleLaunchPractice = (mode: 'follow' | 'guided' | 'test') => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (lesson) {
      setLessonPedagogicalStatus(lesson.id, 'practicing').catch(() => {});
    }
    onClose();
    onStartMode(mode, strikeKey);
  };

  // Render SVG Target Diagram
  const renderTargetDiagram = () => {
    const isHead = ['strike_1', 'strike_2', 'strike_12'].includes(strikeKey);
    const isTorso = ['strike_3', 'strike_4', 'strike_5', 'strike_6', 'strike_7'].includes(strikeKey);
    const isKnee = ['strike_8', 'strike_9'].includes(strikeKey);
    const isEye = ['strike_10', 'strike_11'].includes(strikeKey);

    return (
      <View style={styles.diagramContainer}>
        <View style={styles.diagramSvgWrapper}>
          <Svg width="160" height="180" viewBox="0 0 180 200">
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
            <Circle cx="90" cy="30" r="18" fill="#1E2648" stroke="#334155" strokeWidth="2" />
            <Circle cx="84" cy="28" r="2" fill="#64748B" />
            <Circle cx="96" cy="28" r="2" fill="#64748B" />

            {/* Torso */}
            <Path d="M 72 50 L 108 50 L 102 110 L 78 110 Z" fill="#18203D" stroke="#334155" strokeWidth="2" />

            {/* Arms */}
            <Path d="M 72 52 L 52 80 L 62 100" stroke="#334155" strokeWidth="6" strokeLinecap="round" fill="none" />
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
          <Text style={styles.targetLabel}>🎯 TRAINING TARGET</Text>
          <Text style={styles.targetValue}>{lesson.trainingTarget || lesson.target || 'General Movement'}</Text>

          <Text style={styles.trajLabel}>⚔️ DIRECTION</Text>
          <Text style={styles.trajValue}>{lesson.trajectory || 'Controlled martial line'}</Text>
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

        {/* SEQUENTIAL STEP PROGRESS INDICATOR */}
        <View style={styles.stepProgressContainer}>
          {[
            { num: 1, label: 'Understand', icon: 'bulb-outline' },
            { num: 2, label: 'Watch', icon: 'play-circle-outline' },
            { num: 3, label: 'Remember', icon: 'bookmark-outline' },
            { num: 4, label: 'Practice', icon: 'barbell-outline' },
          ].map((s) => {
            const isActive = currentStep === s.num;
            const isPassed = currentStep > s.num;
            return (
              <TouchableOpacity
                key={s.num}
                style={[
                  styles.stepTabItem,
                  isActive && styles.stepTabItemActive,
                  isPassed && styles.stepTabItemPassed,
                ]}
                onPress={() => goToStep(s.num as any)}
                activeOpacity={0.8}
              >
                <View
                  style={[
                    styles.stepBadge,
                    isActive && styles.stepBadgeActive,
                    isPassed && styles.stepBadgePassed,
                  ]}
                >
                  {isPassed ? (
                    <Ionicons name="checkmark" size={12} color="#10B981" />
                  ) : (
                    <Text style={[styles.stepBadgeText, isActive && styles.stepBadgeTextActive]}>
                      {s.num}
                    </Text>
                  )}
                </View>
                <Text style={[styles.stepTabLabel, isActive && styles.stepTabLabelActive]}>
                  {s.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* STEP CONTENT BODY */}
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          {/* ============================================================ */}
          {/* STEP 1: UNDERSTAND (What are you learning?) */}
          {/* ============================================================ */}
          {currentStep === 1 && (
            <View style={styles.stepCard}>
              <View style={styles.stepHeaderRow}>
                <View style={styles.stepIconBox}>
                  <Ionicons name="compass" size={22} color="#38BDF8" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.stepSectionPre}>STEP 1 OF 4</Text>
                  <Text style={styles.stepSectionHeading}>WHAT ARE YOU LEARNING?</Text>
                </View>
              </View>

              {/* Beginner Summary Box */}
              <View style={styles.beginnerSummaryCard}>
                <Text style={styles.beginnerSummaryHeading}>IN SIMPLE TERMS</Text>
                <Text style={styles.beginnerSummaryText}>
                  {lesson.beginnerSummary || lesson.description}
                </Text>
              </View>

              {/* Target & Trajectory Box */}
              {renderTargetDiagram()}

              {/* Core Martial Purpose */}
              {lesson.purpose && (
                <View style={styles.purposeBox}>
                  <Ionicons name="shield-checkmark" size={16} color="#38BDF8" style={{ marginRight: 6 }} />
                  <Text style={styles.purposeText}>
                    <Text style={{ fontWeight: '800', color: '#38BDF8' }}>Why we do this: </Text>
                    {lesson.purpose}
                  </Text>
                </View>
              )}

              {/* Filipino Terminology Educational Toggle */}
              {lesson.filipinoTitle && (
                <View style={styles.filipinoTermBox}>
                  <TouchableOpacity
                    style={styles.filipinoTermToggle}
                    onPress={() => setShowFilipinoTerm(!showFilipinoTerm)}
                    activeOpacity={0.8}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <MaterialCommunityIcons name="translate" size={16} color="#F59E0B" style={{ marginRight: 6 }} />
                      <Text style={styles.filipinoTermToggleText}>
                        Filipino Term: <Text style={{ color: '#FFFFFF', fontWeight: 'bold' }}>{lesson.filipinoTitle}</Text>
                      </Text>
                    </View>
                    <Ionicons
                      name={showFilipinoTerm ? 'chevron-up' : 'chevron-down'}
                      size={16}
                      color="#94A3B8"
                    />
                  </TouchableOpacity>

                  {showFilipinoTerm && (
                    <View style={styles.filipinoTermContent}>
                      <Text style={styles.filipinoTermExplanation}>
                        {lesson.filipinoTermNote ||
                          `In Filipino Martial Arts, instructors often use traditional Tagalog terms. "${lesson.filipinoTitle}" connects your practice to centuries of cultural heritage.`}
                      </Text>
                    </View>
                  )}
                </View>
              )}

              {/* Collapsible Technical Details for Advanced Users */}
              {(lesson.target || lesson.trajectory || lesson.mnemonicFormula) && (
                <View style={styles.technicalToggleBox}>
                  <TouchableOpacity
                    style={styles.technicalToggleBtn}
                    onPress={() => setShowTechnicalDetails(!showTechnicalDetails)}
                    activeOpacity={0.8}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Ionicons name="construct-outline" size={15} color={MartialTheme.colors.bamboo} style={{ marginRight: 6 }} />
                      <Text style={styles.technicalToggleText}>Technical Details & Metrics</Text>
                    </View>
                    <Ionicons
                      name={showTechnicalDetails ? 'chevron-up' : 'chevron-down'}
                      size={16}
                      color={MartialTheme.colors.bamboo}
                    />
                  </TouchableOpacity>

                  {showTechnicalDetails && (
                    <View style={styles.technicalDetailsContent}>
                      {lesson.target && (
                        <Text style={styles.techLine}>
                          <Text style={styles.techLabel}>Anatomical Reference: </Text>
                          {lesson.target}
                        </Text>
                      )}
                      {lesson.trajectory && (
                        <Text style={styles.techLine}>
                          <Text style={styles.techLabel}>Trajectory Mechanics: </Text>
                          {lesson.trajectory}
                        </Text>
                      )}
                      {lesson.mnemonicFormula && (
                        <Text style={styles.techLine}>
                          <Text style={styles.techLabel}>Movement Formula: </Text>
                          {lesson.mnemonicFormula}
                        </Text>
                      )}
                    </View>
                  )}
                </View>
              )}

              {/* Step 1 Primary CTA */}
              <TouchableOpacity
                style={styles.nextStepBtn}
                onPress={() => goToStep(2)}
                activeOpacity={0.85}
              >
                <Text style={styles.nextStepBtnText}>NEXT: WATCH INSTRUCTOR</Text>
                <Ionicons name="arrow-forward" size={18} color="#FFFFFF" style={{ marginLeft: 6 }} />
              </TouchableOpacity>
            </View>
          )}

          {/* ============================================================ */}
          {/* STEP 2: WATCH (How it looks at 60 FPS) */}
          {/* ============================================================ */}
          {currentStep === 2 && (
            <View style={styles.stepCard}>
              <View style={styles.stepHeaderRow}>
                <View style={[styles.stepIconBox, { backgroundColor: '#F59E0B20' }]}>
                  <Ionicons name="videocam" size={22} color="#F59E0B" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.stepSectionPre}>STEP 2 OF 4</Text>
                  <Text style={styles.stepSectionHeading}>HOW IT LOOKS</Text>
                </View>
              </View>

              {lesson.isStrike && videoSource ? (
                <View style={styles.videoPlayerContainer}>
                  <VideoView
                    player={player}
                    style={styles.videoPlayer}
                    allowsFullscreen={false}
                    allowsPictureInPicture={false}
                  />

                  {/* Play / Pause & Speed Controls Overlay */}
                  <View style={styles.videoControlsOverlay}>
                    <TouchableOpacity
                      style={styles.playPauseBtn}
                      onPress={handlePlayPause}
                      activeOpacity={0.8}
                    >
                      <Ionicons
                        name={isPlaying ? 'pause' : 'play'}
                        size={16}
                        color="#FFFFFF"
                      />
                    </TouchableOpacity>

                    <View style={styles.speedButtonGroup}>
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
              ) : (
                <View style={styles.noVideoCard}>
                  <MaterialCommunityIcons name="image-filter-frames" size={40} color="#64748B" />
                  <Text style={styles.noVideoTitle}>Orientation Lesson</Text>
                  <Text style={styles.noVideoSub}>
                    This foundational lesson focuses on principles and posture. Proceed to Step 3 to review what to remember!
                  </Text>
                </View>
              )}

              {/* What to Watch For checklist */}
              <View style={styles.watchForCard}>
                <Text style={styles.watchForHeading}>👀 TRY TO NOTICE 3 THINGS</Text>
                <View style={styles.watchForItem}>
                  <Text style={styles.watchForNum}>①</Text>
                  <Text style={styles.watchForText}>
                    <Text style={{ fontWeight: 'bold', color: '#FFFFFF' }}>Starting position: </Text>
                    Notice how the weapon is cocked before the swing starts.
                  </Text>
                </View>
                <View style={styles.watchForItem}>
                  <Text style={styles.watchForNum}>②</Text>
                  <Text style={styles.watchForText}>
                    <Text style={{ fontWeight: 'bold', color: '#FFFFFF' }}>Direction: </Text>
                    Observe the clean path traveling straight through the target zone.
                  </Text>
                </View>
                <View style={styles.watchForItem}>
                  <Text style={styles.watchForNum}>③</Text>
                  <Text style={styles.watchForText}>
                    <Text style={{ fontWeight: 'bold', color: '#FFFFFF' }}>Ending position: </Text>
                    Watch how the weapon recovers instantly back to a protective chest guard.
                  </Text>
                </View>
              </View>

              {/* Navigation Buttons */}
              <View style={styles.stepNavRow}>
                <TouchableOpacity
                  style={styles.prevStepBtn}
                  onPress={() => goToStep(1)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="arrow-back" size={16} color="#94A3B8" style={{ marginRight: 4 }} />
                  <Text style={styles.prevStepBtnText}>Back</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.nextStepBtnFlex}
                  onPress={() => goToStep(3)}
                  activeOpacity={0.85}
                >
                  <Text style={styles.nextStepBtnText}>NEXT: 3 KEY POINTS</Text>
                  <Ionicons name="arrow-forward" size={18} color="#FFFFFF" style={{ marginLeft: 6 }} />
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* ============================================================ */}
          {/* STEP 3: REMEMBER (Do This / Look Like This / Feel This) */}
          {/* ============================================================ */}
          {currentStep === 3 && (
            <View style={styles.stepCard}>
              <View style={styles.stepHeaderRow}>
                <View style={[styles.stepIconBox, { backgroundColor: '#10B98120' }]}>
                  <Ionicons name="bookmark" size={22} color="#10B981" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.stepSectionPre}>STEP 3 OF 4</Text>
                  <Text style={styles.stepSectionHeading}>REMEMBER 3 THINGS</Text>
                </View>
              </View>

              {/* 1. DO THIS */}
              <View style={styles.cueCard}>
                <View style={styles.cueCardHeader}>
                  <Ionicons name="checkmark-circle" size={18} color="#10B981" style={{ marginRight: 6 }} />
                  <Text style={styles.cueCardTitle}>DO THIS</Text>
                </View>
                <View style={styles.cueList}>
                  {(lesson.doThis || lesson.coachSteps.slice(0, 4)).map((item, idx) => (
                    <View key={idx} style={styles.cueListItem}>
                      <View style={styles.cueBullet} />
                      <Text style={styles.cueText}>{item.replace(/^\d+\.\s*/, '')}</Text>
                    </View>
                  ))}
                </View>
              </View>

              {/* 2. LOOK LIKE THIS & FEEL THIS */}
              {lesson.lookLikeThis && (
                <View style={[styles.cueCard, { borderColor: '#38BDF840' }]}>
                  <View style={styles.cueCardHeader}>
                    <Ionicons name="eye-outline" size={18} color="#38BDF8" style={{ marginRight: 6 }} />
                    <Text style={[styles.cueCardTitle, { color: '#38BDF8' }]}>LOOK LIKE THIS</Text>
                  </View>
                  <Text style={styles.cueBodyText}>{lesson.lookLikeThis}</Text>
                </View>
              )}

              {lesson.feelThis && (
                <View style={[styles.cueCard, { borderColor: '#8B5CF640' }]}>
                  <View style={styles.cueCardHeader}>
                    <Ionicons name="fitness-outline" size={18} color="#A78BFA" style={{ marginRight: 6 }} />
                    <Text style={[styles.cueCardTitle, { color: '#A78BFA' }]}>FEEL THIS</Text>
                  </View>
                  <Text style={styles.cueBodyText}>{lesson.feelThis}</Text>
                </View>
              )}

              {/* 3. WATCH OUT FOR THIS (Single Key Mistake) */}
              <View style={[styles.cueCard, styles.watchOutCard]}>
                <View style={styles.cueCardHeader}>
                  <Ionicons name="warning-outline" size={18} color="#EF4444" style={{ marginRight: 6 }} />
                  <Text style={[styles.cueCardTitle, { color: '#EF4444' }]}>WATCH OUT FOR THIS</Text>
                </View>
                <Text style={styles.watchOutText}>
                  {lesson.watchOutFor || (lesson.commonMistakes && lesson.commonMistakes[0]) || 'Dropping your non-striking hand to your waist. Keep it glued to your chest!'}
                </Text>
              </View>

              {/* Guro's Pro Tip */}
              {lesson.guroAdvice && (
                <View style={styles.guroTipBox}>
                  <MaterialCommunityIcons name="karate" size={18} color="#F59E0B" style={{ marginRight: 6 }} />
                  <Text style={styles.guroTipText}>
                    <Text style={{ fontWeight: 'bold', color: '#F59E0B' }}>Coach Tip: </Text>
                    {lesson.guroAdvice}
                  </Text>
                </View>
              )}

              {/* Navigation Buttons */}
              <View style={styles.stepNavRow}>
                <TouchableOpacity
                  style={styles.prevStepBtn}
                  onPress={() => goToStep(2)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="arrow-back" size={16} color="#94A3B8" style={{ marginRight: 4 }} />
                  <Text style={styles.prevStepBtnText}>Back</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.nextStepBtnFlex}
                  onPress={() => goToStep(4)}
                  activeOpacity={0.85}
                >
                  <Text style={styles.nextStepBtnText}>NEXT: YOUR TURN TO PRACTICE</Text>
                  <Ionicons name="arrow-forward" size={18} color="#FFFFFF" style={{ marginLeft: 6 }} />
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* ============================================================ */}
          {/* STEP 4: YOUR TURN (Choose Practice Mode) */}
          {/* ============================================================ */}
          {currentStep === 4 && (
            <View style={styles.stepCard}>
              <View style={styles.stepHeaderRow}>
                <View style={[styles.stepIconBox, { backgroundColor: '#EF444420' }]}>
                  <Ionicons name="trophy" size={22} color="#EF4444" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.stepSectionPre}>STEP 4 OF 4</Text>
                  <Text style={styles.stepSectionHeading}>YOUR TURN</Text>
                </View>
              </View>

              {bestScore > 0 && (
                <View style={styles.pastScoreStrip}>
                  <Ionicons name="ribbon" size={16} color={MartialTheme.colors.bamboo} style={{ marginRight: 8 }} />
                  <Text style={styles.pastScoreText}>
                    Personal Best: <Text style={{ fontWeight: '900', color: '#FFFFFF' }}>{bestScore}%</Text> ({grade})
                  </Text>
                </View>
              )}

              {!lesson.isStrike ? (
                <View style={styles.orientationCompleteCard}>
                  <MaterialCommunityIcons name="check-decagram" size={54} color={MartialTheme.colors.bamboo} style={{ marginBottom: 12 }} />
                  <Text style={styles.orientationCompleteTitle}>Lesson Concepts Understood!</Text>
                  <Text style={styles.orientationCompleteDesc}>
                    You have reviewed the foundational principles, equipment essentials, and terminology for this topic. Mark this lesson completed to advance your curriculum path.
                  </Text>
                  <PrimaryButton
                    label="COMPLETE LESSON & ADVANCE"
                    onPress={handleCompleteOrientationLesson}
                    variant="bamboo"
                    size="lg"
                    icon={<Ionicons name="checkmark-done" size={20} color="#2A1F02" />}
                    style={{ width: '100%', marginBottom: 12 }}
                  />
                  <PrimaryButton
                    label="PRACTICE STANCE ON CAMERA"
                    onPress={() => handleLaunchPractice('guided')}
                    variant="outline"
                    size="md"
                    icon={<MaterialCommunityIcons name="camera" size={16} color={MartialTheme.colors.bamboo} />}
                    style={{ width: '100%' }}
                  />
                </View>
              ) : (
                <>
                  <Text style={styles.chooseModePrompt}>
                    Choose how you want to practice with the AI camera:
                  </Text>

                  {/* Mode 1: Follow Me (RECOMMENDED FOR FIRST TIME) */}
                  <TouchableOpacity
                    style={[styles.modeCard, styles.modeCardRecommended]}
                    onPress={() => handleLaunchPractice('follow')}
                    activeOpacity={0.85}
                  >
                    <View style={styles.modeCardHeader}>
                      <View style={[styles.modeBadge, { backgroundColor: 'rgba(16, 185, 129, 0.15)', borderColor: MartialTheme.colors.primary }]}>
                        <Text style={[styles.modeBadgeText, { color: MartialTheme.colors.primary }]}>RECOMMENDED FIRST</Text>
                      </View>
                      <Ionicons name="arrow-forward-circle" size={24} color={MartialTheme.colors.primary} />
                    </View>

                    <View style={styles.modeCardBody}>
                      <Text style={styles.modeCardTitle}>🟢 Mode 1 — Follow Me</Text>
                      <Text style={styles.modeCardDesc}>
                        Mirror the master instructor side-by-side with video overlay right on your camera. No scoring pressure!
                      </Text>
                    </View>
                  </TouchableOpacity>

                  {/* Mode 2: Guided Practice */}
                  <TouchableOpacity
                    style={styles.modeCard}
                    onPress={() => handleLaunchPractice('guided')}
                    activeOpacity={0.85}
                  >
                    <View style={styles.modeCardHeader}>
                      <View style={[styles.modeBadge, { backgroundColor: 'rgba(212, 175, 55, 0.15)', borderColor: MartialTheme.colors.bamboo }]}>
                        <Text style={[styles.modeBadgeText, { color: MartialTheme.colors.bamboo }]}>ALREADY PRACTICED?</Text>
                      </View>
                      <Ionicons name="arrow-forward-circle" size={24} color={MartialTheme.colors.bamboo} />
                    </View>

                    <View style={styles.modeCardBody}>
                      <Text style={styles.modeCardTitle}>🟡 Mode 2 — Guided Practice</Text>
                      <Text style={styles.modeCardDesc}>
                        Real-time spoken coaching & live visual checkmarks for your stance, elbow angle, and guard hand.
                      </Text>
                    </View>
                  </TouchableOpacity>

                  {/* Mode 3: Test Yourself */}
                  <TouchableOpacity
                    style={[styles.modeCard, styles.modeCardTest]}
                    onPress={() => handleLaunchPractice('test')}
                    activeOpacity={0.85}
                  >
                    <View style={styles.modeCardHeader}>
                      <View style={[styles.modeBadge, { backgroundColor: 'rgba(210, 75, 56, 0.15)', borderColor: MartialTheme.colors.crimson }]}>
                        <Text style={[styles.modeBadgeText, { color: MartialTheme.colors.crimson }]}>READY TO TEST?</Text>
                      </View>
                      <Ionicons name="arrow-forward-circle" size={24} color={MartialTheme.colors.crimson} />
                    </View>

                    <View style={styles.modeCardBody}>
                      <Text style={[styles.modeCardTitle, { color: '#FFFFFF' }]}>🔴 Mode 3 — Test Yourself</Text>
                      <Text style={styles.modeCardDesc}>
                        Test your technique with a 3-2-1 countdown, dynamic apex capture, and 4-pillar scoring.
                      </Text>
                    </View>
                  </TouchableOpacity>
                </>
              )}

              {/* Navigation Back */}
              <TouchableOpacity
                style={styles.reviewLessonBtn}
                onPress={() => goToStep(1)}
                activeOpacity={0.8}
              >
                <Ionicons name="book-outline" size={16} color="#94A3B8" style={{ marginRight: 6 }} />
                <Text style={styles.reviewLessonBtnText}>Review Lesson Details</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F1020',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
    backgroundColor: '#0F1020',
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 2,
  },
  headerTitleWrap: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 10,
  },
  headerTag: {
    fontSize: 9,
    fontWeight: '900',
    color: '#D24B38',
    letterSpacing: 1.2,
  },
  headerTitleText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: 'bold',
  },
  closeBtn: {
    padding: 2,
  },

  // Step Progress Tabs
  stepProgressContainer: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#161930',
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  stepTabItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 4,
    borderRadius: 8,
    marginHorizontal: 2,
  },
  stepTabItemActive: {
    backgroundColor: '#38BDF815',
    borderWidth: 1,
    borderColor: '#38BDF850',
  },
  stepTabItemPassed: {
    opacity: 0.85,
  },
  stepBadge: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 4,
  },
  stepBadgeActive: {
    backgroundColor: '#38BDF8',
  },
  stepBadgePassed: {
    backgroundColor: '#10B98120',
    borderWidth: 1,
    borderColor: '#10B981',
  },
  stepBadgeText: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: 'bold',
  },
  stepBadgeTextActive: {
    color: '#0F1020',
  },
  stepTabLabel: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '600',
  },
  stepTabLabelActive: {
    color: '#38BDF8',
    fontWeight: 'bold',
  },

  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },

  // Main Step Card
  stepCard: {
    backgroundColor: '#161930',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  stepHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  stepIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#38BDF820',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  stepSectionPre: {
    color: '#38BDF8',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
  },
  stepSectionHeading: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },

  // Beginner Summary Card
  beginnerSummaryCard: {
    backgroundColor: '#0F1020',
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#38BDF830',
  },
  beginnerSummaryHeading: {
    color: '#38BDF8',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
    marginBottom: 6,
  },
  beginnerSummaryText: {
    color: '#E2E8F0',
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '500',
  },

  // Diagram Container
  diagramContainer: {
    flexDirection: 'row',
    backgroundColor: '#0F1020',
    borderRadius: 14,
    padding: 10,
    marginBottom: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  diagramSvgWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  diagramDetails: {
    flex: 1,
    marginLeft: 10,
  },
  targetLabel: {
    color: '#F59E0B',
    fontSize: 10,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  targetValue: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 10,
  },
  trajLabel: {
    color: '#EF4444',
    fontSize: 10,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  trajValue: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 16,
  },

  // Purpose Box
  purposeBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#38BDF815',
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#38BDF830',
  },
  purposeText: {
    flex: 1,
    color: '#CBD5E1',
    fontSize: 13,
    lineHeight: 19,
  },

  // Filipino Term Toggle
  filipinoTermBox: {
    backgroundColor: '#0F1020',
    borderRadius: 10,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#1E293B',
    overflow: 'hidden',
  },
  filipinoTermToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
  },
  filipinoTermToggleText: {
    color: '#94A3B8',
    fontSize: 12,
  },
  filipinoTermContent: {
    paddingHorizontal: 12,
    paddingBottom: 12,
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
    paddingTop: 8,
  },
  filipinoTermExplanation: {
    color: '#CBD5E1',
    fontSize: 12,
    lineHeight: 18,
  },

  // Step 1 CTA
  nextStepBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#D24B38',
    borderRadius: 12,
    paddingVertical: 14,
    marginTop: 6,
  },
  nextStepBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },

  // Step 2 Video Styles
  videoPlayerContainer: {
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#000000',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  videoPlayer: {
    width: '100%',
    height: 220,
  },
  videoControlsOverlay: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#0F1020',
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
  },
  playPauseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#D24B38',
    alignItems: 'center',
    justifyContent: 'center',
  },
  speedButtonGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  speedBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: '#1E293B',
    marginLeft: 6,
  },
  speedBtnActive: {
    backgroundColor: '#D24B38',
  },
  speedBtnText: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: 'bold',
  },
  speedBtnTextActive: {
    color: '#FFFFFF',
  },

  noVideoCard: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
    backgroundColor: '#0F1020',
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  noVideoTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: 'bold',
    marginTop: 10,
  },
  noVideoSub: {
    color: '#94A3B8',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 18,
  },

  watchForCard: {
    backgroundColor: '#0F1020',
    borderRadius: 12,
    padding: 14,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  watchForHeading: {
    color: '#F59E0B',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1,
    marginBottom: 10,
  },
  watchForItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  watchForNum: {
    color: '#F59E0B',
    fontSize: 14,
    fontWeight: 'bold',
    marginRight: 6,
  },
  watchForText: {
    flex: 1,
    color: '#CBD5E1',
    fontSize: 13,
    lineHeight: 19,
  },

  // Step 3 Remember Cards
  cueCard: {
    backgroundColor: '#0F1020',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#10B98140',
  },
  cueCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  cueCardTitle: {
    color: '#10B981',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1,
  },
  cueList: {
    marginTop: 2,
  },
  cueListItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  cueBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
    marginTop: 6,
    marginRight: 8,
  },
  cueText: {
    flex: 1,
    color: '#E2E8F0',
    fontSize: 13,
    lineHeight: 19,
  },
  cueBodyText: {
    color: '#E2E8F0',
    fontSize: 13,
    lineHeight: 19,
  },

  watchOutCard: {
    borderColor: '#EF444440',
    backgroundColor: '#EF444408',
  },
  watchOutText: {
    color: '#FCA5A5',
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '500',
  },

  guroTipBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F59E0B15',
    borderRadius: 10,
    padding: 12,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#F59E0B30',
  },
  guroTipText: {
    flex: 1,
    color: '#FEF3C7',
    fontSize: 12,
    lineHeight: 18,
  },

  // Step 4 Your Turn Cards
  chooseModePrompt: {
    color: '#94A3B8',
    fontSize: 13,
    marginBottom: 14,
  },
  pastScoreStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F59E0B20',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#F59E0B50',
  },
  pastScoreText: {
    color: '#F59E0B',
    fontSize: 12,
    fontWeight: 'bold',
  },
  modeCard: {
    backgroundColor: '#0F1020',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  modeCardRecommended: {
    borderColor: '#10B98160',
    backgroundColor: '#10B98108',
  },
  modeCardTest: {
    borderColor: '#EF444460',
    backgroundColor: '#EF444408',
  },
  modeCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  modeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  modeBadgeText: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  modeCardBody: {
    marginTop: 2,
  },
  modeCardTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  modeCardDesc: {
    color: '#94A3B8',
    fontSize: 12,
    lineHeight: 18,
  },
  reviewLessonBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginTop: 4,
  },
  reviewLessonBtnText: {
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '600',
  },

  // Shared Bottom Navigation Rows
  stepNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  prevStepBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#1E293B',
    marginRight: 10,
  },
  prevStepBtnText: {
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '600',
  },
  nextStepBtnFlex: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#D24B38',
    borderRadius: 12,
    paddingVertical: 14,
  },

  // Collapsible Technical Breakdown
  technicalToggleBox: {
    marginBottom: 16,
    borderRadius: 10,
    backgroundColor: '#1E293B40',
    borderWidth: 1,
    borderColor: '#33415550',
    overflow: 'hidden',
  },
  technicalToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  technicalToggleText: {
    fontSize: 12,
    fontWeight: '700',
    color: MartialTheme.colors.bamboo,
  },
  technicalDetailsContent: {
    paddingHorizontal: 12,
    paddingBottom: 10,
    gap: 4,
  },
  techLine: {
    fontSize: 12,
    color: '#CBD5E1',
    lineHeight: 18,
  },
  techLabel: {
    fontWeight: '700',
    color: MartialTheme.colors.bamboo,
  },

  // Orientation Lesson Completion Card
  orientationCompleteCard: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#131F1B',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#233730',
    marginVertical: 12,
  },
  orientationCompleteTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 8,
    textAlign: 'center',
  },
  orientationCompleteDesc: {
    fontSize: 13,
    color: '#9CA3AF',
    lineHeight: 19,
    textAlign: 'center',
    marginBottom: 20,
  },
});
