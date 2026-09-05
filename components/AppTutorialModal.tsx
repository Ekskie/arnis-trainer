import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Animated,
  Image,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';

const { width, height } = Dimensions.get('window');
const TUTORIAL_STORAGE_KEY = '@arnis_tutorial_seen_v1';

export interface AppTutorialModalProps {
  visible: boolean;
  onClose: () => void;
  onNavigateToPractice?: (strikeId?: string) => void;
}

interface TutorialStep {
  id: string;
  category: string;
  title: string;
  subtitle: string;
  badge: string;
  badgeColor: string;
  iconName: any;
  iconFamily: 'Ionicons' | 'MaterialCommunityIcons';
  content: {
    heading: string;
    summary: string;
    highlights: {
      icon: any;
      iconFamily: 'Ionicons' | 'MaterialCommunityIcons';
      title: string;
      description: string;
      tag?: string;
      tagColor?: string;
    }[];
    demoSpotlight?: {
      title: string;
      caption: string;
      buttonLabel?: string;
      buttonAction?: string;
      type: 'practice_button' | 'score_legend' | 'modes_toggle' | 'visual_cues' | 'radar_chart' | 'overview';
    };
    actionText?: string;
    actionType?: 'practice' | 'lessons' | 'radar' | 'next';
  };
}

const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: 'step_about',
    category: 'OVERVIEW',
    title: 'Welcome to PoseFix-Arnis',
    subtitle: 'Real-Time Philippine Martial Arts AI Form Evaluator',
    badge: 'KALI / ARNIS / ESKRIMA',
    badgeColor: '#D24B38',
    iconName: 'sword-cross',
    iconFamily: 'MaterialCommunityIcons',
    content: {
      heading: 'Master the 12 Fundamental Strikes with AI',
      summary:
        'PoseFix-Arnis is an intelligent vision-based training assistant that evaluates your Arnis body posture, arm extensions, strike trajectories, and footwork in real-time right on your mobile camera.',
      highlights: [
        {
          icon: 'body',
          iconFamily: 'Ionicons',
          title: '33-Point MediaPipe & AlphaPose Kinematics',
          description: 'Tracks shoulder, elbow, wrist, and knee joint angles with research-grade accuracy against master references.',
          tag: 'AI Vision',
          tagColor: '#3B82F6',
        },
        {
          icon: 'volume-high',
          iconFamily: 'Ionicons',
          title: 'Real-Time Spoken Voice Coach',
          description: 'Provides instant voice feedback while you strike (e.g. "Extend your elbow higher!", "Lower your stance").',
          tag: 'Voice AI',
          tagColor: '#10B981',
        },
        {
          icon: 'flash',
          iconFamily: 'Ionicons',
          title: 'Weapon Motion Ribbon Trail',
          description: 'Visualizes the dynamic path and slicing arc of your stick or weapon in glowing neon trails.',
          tag: 'Motion FX',
          tagColor: '#F59E0B',
        },
      ],
      demoSpotlight: {
        title: 'Complete Martial Training Suite',
        caption: 'Single strike drills, multi-strike Anyo routine flows, 12-axis spider radar mastery, and frame-by-frame snapshot replays.',
        type: 'overview',
      },
    },
  },
  {
    id: 'step_navigation',
    category: 'NAVIGATION',
    title: 'Navigating the App',
    subtitle: 'Everything You Need for Daily Practice & Mastery',
    badge: 'APP TABS GUIDE',
    badgeColor: '#3B82F6',
    iconName: 'compass-outline',
    iconFamily: 'Ionicons',
    content: {
      heading: '5 Main Training Sections',
      summary:
        'Easily switch between features using the bottom navigation bar or quick-access dashboard cards.',
      highlights: [
        {
          icon: 'home',
          iconFamily: 'Ionicons',
          title: 'Home Dashboard',
          description: 'View your 12-strike spider radar chart, current rank belt/sash, last session grade, and quick actions.',
          tag: 'Home',
          tagColor: '#64748B',
        },
        {
          icon: 'target',
          iconFamily: 'MaterialCommunityIcons',
          title: 'Evaluate & Practice Camera',
          description: 'Launch real-time AI computer vision for Single Strikes (1-12) or Anyo Multi-Strike Combinations.',
          tag: 'Evaluate',
          tagColor: '#D24B38',
        },
        {
          icon: 'bar-chart',
          iconFamily: 'Ionicons',
          title: 'Progress History & Replays',
          description: 'Review historical evaluations, view captured frame snapshots, inspect joint angle variances, or export CSV.',
          tag: 'History',
          tagColor: '#3B82F6',
        },
        {
          icon: 'book',
          iconFamily: 'Ionicons',
          title: '12 Strikes Lessons Guide',
          description: 'Study exact target zones (Temple, Torso, Eye, Crown) and recommended degrees for elbows and shoulders.',
          tag: 'Lessons',
          tagColor: '#F59E0B',
        },
        {
          icon: 'chatbubble-ellipses',
          iconFamily: 'Ionicons',
          title: 'AI Coach Assistant',
          description: 'Chat with your AI Arnis Sensei for personalized correction tips and customized training routines.',
          tag: 'Coach',
          tagColor: '#10B981',
        },
      ],
      demoSpotlight: {
        title: 'How to Choose What to Train',
        caption: 'Pick Single Strike (1-12) to hone one specific technique, or Anyo & Combos to test full choreography.',
        type: 'modes_toggle',
      },
    },
  },
  {
    id: 'step_practice_mode',
    category: 'TRAINING MODES',
    title: 'Form Coach, Practice & Evaluation',
    subtitle: 'Learn How to Train Step-by-Step or Take Graded Tests',
    badge: '3 TRAINING MODES',
    badgeColor: '#10B981',
    iconName: 'play-circle',
    iconFamily: 'Ionicons',
    content: {
      heading: 'How to Choose Your Training Mode',
      summary:
        'PoseFix-Arnis provides three dedicated modes depending on your training goals, from beginner step calibration to graded testing.',
      highlights: [
        {
          icon: 'school',
          iconFamily: 'MaterialCommunityIcons',
          title: '1. Form Coach Mode (⭐ Recommended for Learning)',
          description:
            'Interactive 3-phase guided calibration: 1. Chamber (Kasa) ➔ 2. Strike Apex (Tudla) ➔ 3. Defensive Recovery (Bawi). The system freezes and validates each position with voice cues!',
          tag: 'Step-by-Step',
          tagColor: '#38BDF8',
        },
        {
          icon: 'repeat',
          iconFamily: 'Ionicons',
          title: '2. Practice Mode (Continuous Multi-Joint Feedback)',
          description:
            'Freeform continuous feedback with 4-pillar kinetic meters, laser trajectory path, ghost master silhouette, and voice advice with NO timers. Practice at your own rhythm!',
          tag: 'Freeform Warm-up',
          tagColor: '#10B981',
        },
        {
          icon: 'timer-outline',
          iconFamily: 'Ionicons',
          title: '3. Timed Test Mode (3-Second Exam)',
          description:
            'Triggers an automatic 3-second countdown when you enter camera frame. Evaluates peak strike impact, computes letter grade (A/B/C/D), and saves to History.',
          tag: 'Graded Exam',
          tagColor: '#EF4444',
        },
      ],
      demoSpotlight: {
        title: 'Spotlight: Training Mode Selector',
        caption:
          'To switch: Tap "Evaluate" -> Select "Single Strike" -> Choose "Form Coach", "Practice", or "Timed Test" from the segmented bar!',
        buttonLabel: 'Try Form Coach Now',
        buttonAction: 'practice',
        type: 'practice_button',
      },
    },
  },
  {
    id: 'step_scores_legend',
    category: 'SCORE LEGENDS',
    title: '4-Pillar Kinetic Scoring System',
    subtitle: 'Understand How Technique & Posture Are Evaluated',
    badge: 'RATING CRITERIA',
    badgeColor: '#F59E0B',
    iconName: 'ribbon-outline',
    iconFamily: 'Ionicons',
    content: {
      heading: 'How Your Technique Is Scored (0 - 100%)',
      summary:
        'Your score evaluates the complete martial kinetic chain: striking arm, defensive check hand, stance flexion, and wrist snap.',
      highlights: [
        {
          icon: 'sword',
          iconFamily: 'MaterialCommunityIcons',
          title: 'Striking Arm Trajectory (40%)',
          description: 'Evaluates right elbow & shoulder angles against high-precision AlphaPose dataset standard deviation bounds.',
          tag: '40% Arm',
          tagColor: '#3B82F6',
        },
        {
          icon: 'shield-check',
          iconFamily: 'MaterialCommunityIcons',
          title: 'Check Hand Defense / Kalasag (25%)',
          description: 'Tracks non-striking hand guarding chest/solar plexus to prevent dangerous dropped guard during strikes.',
          tag: '25% Guard',
          tagColor: '#10B981',
        },
        {
          icon: 'human-male-height',
          iconFamily: 'MaterialCommunityIcons',
          title: 'Stance & Base Stability / Tindig (20%)',
          description: 'Calculates lead knee flexion (145°-165° dynamic fighting stance) vs stiff upright standing.',
          tag: '20% Stance',
          tagColor: '#F59E0B',
        },
        {
          icon: 'flash',
          iconFamily: 'MaterialCommunityIcons',
          title: 'Wrist Snap & Power Snap / Pitik (15%)',
          description: 'Evaluates forearm-to-wrist alignment (≤15° straight deviation) ensuring kinetic force transfer at impact.',
          tag: '15% Wrist',
          tagColor: '#8B5CF6',
        },
      ],
      demoSpotlight: {
        title: '4-Pillar Scoring Weights',
        caption:
          'Formula Breakdown:\n• Striking Arm & Elbow Trajectory: 40%\n• Check Hand Kalasag Guard: 25%\n• Stance Tindig Knee Flexion: 20%\n• Wrist Snap Pitik Alignment: 15%',
        type: 'score_legend',
      },
    },
  },
  {
    id: 'step_visual_cues',
    category: 'VISUAL AIDS',
    title: 'Visual Feedback & Motion Guides',
    subtitle: 'Interactive On-Screen Overlays While You Train',
    badge: 'AR VISUALS',
    badgeColor: '#8B5CF6',
    iconName: 'eye-outline',
    iconFamily: 'Ionicons',
    content: {
      heading: 'Real-Time Skeleton & Trajectory Feedback',
      summary:
        'The live camera displays immediate visual cues so you can self-correct your posture on the fly.',
      highlights: [
        {
          icon: 'color-wand-outline',
          iconFamily: 'Ionicons',
          title: 'Color-Coded Skeleton Lines',
          description: 'Joint bones turn Green when within the ideal angular threshold and Red/Yellow when off target.',
          tag: 'Skeleton',
          tagColor: '#10B981',
        },
        {
          icon: 'body-outline',
          iconFamily: 'Ionicons',
          title: 'Pro Ghost Silhouette Guide',
          description: 'A translucent master outline overlay showing the exact target posture to match.',
          tag: 'Ghost Guide',
          tagColor: '#8B5CF6',
        },
        {
          icon: 'sparkles',
          iconFamily: 'Ionicons',
          title: 'Blade Arc Motion Ribbon',
          description: 'Glowing trajectory trail (Fire, Neon, or Cyan) tracking your weapon path to check slicing planes.',
          tag: 'Trajectory',
          tagColor: '#F59E0B',
        },
        {
          icon: 'volume-medium',
          iconFamily: 'Ionicons',
          title: 'Audio Speech Announcements',
          description: 'Hear positive reinforcement or instant verbal fixes without taking your eyes off the target.',
          tag: 'Spoken Coach',
          tagColor: '#3B82F6',
        },
      ],
      demoSpotlight: {
        title: 'Customizable Settings',
        caption: 'Toggle Ghost Guide, Stick Color (Rattan/Red/Blue), Motion Ribbon theme, and Voice Audio in settings!',
        type: 'visual_cues',
      },
    },
  },
  {
    id: 'step_radar_replay',
    category: 'PROGRESS & MASTERY',
    title: 'Spider Radar Chart & AI Replays',
    subtitle: 'Track Your Journey from White Sash to Lakan Master',
    badge: 'ANALYTICS',
    badgeColor: '#EC4899',
    iconName: 'spider-web',
    iconFamily: 'MaterialCommunityIcons',
    content: {
      heading: 'Comprehensive Mastery Metrics',
      summary:
        'Track your strengths and identify weak strikes to achieve balanced mastery across all 12 strikes of Arnis.',
      highlights: [
        {
          icon: 'spider-web',
          iconFamily: 'MaterialCommunityIcons',
          title: '12-Axis Strike Radar Chart',
          description: 'Interactive spider polygon mapping your proficiency in all 12 strikes simultaneously. Tap any node to drill!',
          tag: 'Radar Chart',
          tagColor: '#D24B38',
        },
        {
          icon: 'images-outline',
          iconFamily: 'Ionicons',
          title: 'Historical Snapshot Replays',
          description: 'Every evaluated strike saves a frozen apex frame with calculated joint angles for in-depth review.',
          tag: 'Replays',
          tagColor: '#3B82F6',
        },
        {
          icon: 'chatbubbles-outline',
          iconFamily: 'Ionicons',
          title: 'Personalized AI Coach Assistant',
          description: 'Analyzes all your previous sessions to recommend which strikes need the most attention today.',
          tag: 'AI Coach',
          tagColor: '#10B981',
        },
      ],
      demoSpotlight: {
        title: 'You Are Ready to Train!',
        caption: 'Start in Practice Mode to warm up, explore the 12 strikes lessons, and aim for a 100% Grade A score!',
        buttonLabel: 'Start Practice Mode Now',
        buttonAction: 'practice',
        type: 'radar_chart',
      },
    },
  },
];

export function AppTutorialModal({
  visible,
  onClose,
  onNavigateToPractice,
}: AppTutorialModalProps) {
  const router = useRouter();
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  // Reset to first step when opened
  useEffect(() => {
    if (visible) {
      setCurrentStepIndex(0);
    }
  }, [visible]);

  const currentStep = TUTORIAL_STEPS[currentStepIndex];
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === TUTORIAL_STEPS.length - 1;

  const handleNext = () => {
    if (isLastStep) {
      handleCompleteTutorial();
    } else {
      setCurrentStepIndex((prev) => Math.min(prev + 1, TUTORIAL_STEPS.length - 1));
    }
  };

  const handlePrev = () => {
    setCurrentStepIndex((prev) => Math.max(prev - 1, 0));
  };

  const handleJumpToStep = (index: number) => {
    setCurrentStepIndex(index);
  };

  const handleCompleteTutorial = async () => {
    try {
      await AsyncStorage.setItem(TUTORIAL_STORAGE_KEY, 'true');
    } catch (e) {
      console.warn('Could not save tutorial preference', e);
    }
    onClose();
  };

  const handleActionClick = (actionType?: string) => {
    handleCompleteTutorial();
    if (actionType === 'practice') {
      if (onNavigateToPractice) {
        onNavigateToPractice('strike_1');
      } else {
        router.push({
          pathname: '/evaluate',
          params: { strikeId: 'strike_1' },
        });
      }
    } else if (actionType === 'lessons') {
      router.push('/explore');
    } else if (actionType === 'radar') {
      router.push('/');
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Header Bar */}
          <View style={styles.headerBar}>
            <View style={styles.headerTitleGroup}>
              <View style={[styles.headerIconContainer, { backgroundColor: currentStep.badgeColor + '25' }]}>
                {currentStep.iconFamily === 'MaterialCommunityIcons' ? (
                  <MaterialCommunityIcons name={currentStep.iconName} size={20} color={currentStep.badgeColor} />
                ) : (
                  <Ionicons name={currentStep.iconName} size={20} color={currentStep.badgeColor} />
                )}
              </View>
              <View>
                <Text style={styles.headerAppTitle}>POSEFIX-ARNIS GUIDE</Text>
                <Text style={styles.headerStepCounter}>
                  Step {currentStepIndex + 1} of {TUTORIAL_STEPS.length}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.closeIconButton}
              onPress={handleCompleteTutorial}
              activeOpacity={0.7}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close" size={22} color="#94A3B8" />
            </TouchableOpacity>
          </View>

          {/* Quick Jump Category Tabs */}
          <View style={styles.categoryTabsWrapper}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoryTabsContainer}
            >
              {TUTORIAL_STEPS.map((step, idx) => {
                const isActive = idx === currentStepIndex;
                return (
                  <TouchableOpacity
                    key={step.id}
                    style={[
                      styles.categoryTab,
                      isActive && { backgroundColor: step.badgeColor + '25', borderColor: step.badgeColor },
                    ]}
                    onPress={() => handleJumpToStep(idx)}
                  >
                    <Text
                      style={[
                        styles.categoryTabText,
                        isActive && { color: step.badgeColor, fontWeight: '700' },
                      ]}
                    >
                      {step.category}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* Main Scrollable Content */}
          <ScrollView
            style={styles.scrollArea}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={true}
          >
            {/* Step Header Banner */}
            <View style={styles.stepBanner}>
              <View style={[styles.badgePill, { backgroundColor: currentStep.badgeColor + '20', borderColor: currentStep.badgeColor + '40' }]}>
                <Text style={[styles.badgePillText, { color: currentStep.badgeColor }]}>
                  {currentStep.badge}
                </Text>
              </View>
              <Text style={styles.stepTitle}>{currentStep.title}</Text>
              <Text style={styles.stepSubtitle}>{currentStep.subtitle}</Text>
            </View>

            {/* Summary Box */}
            <View style={styles.summaryBox}>
              <Ionicons name="information-circle" size={20} color="#3B82F6" style={{ marginTop: 2, marginRight: 10 }} />
              <View style={{ flex: 1 }}>
                <Text style={styles.summaryHeading}>{currentStep.content.heading}</Text>
                <Text style={styles.summaryText}>{currentStep.content.summary}</Text>
              </View>
            </View>

            {/* Interactive Spotlight Card (Highlighting specific buttons or features) */}
            {currentStep.content.demoSpotlight && (
              <View style={styles.spotlightCard}>
                <View style={styles.spotlightHeader}>
                  <View style={styles.spotlightBadge}>
                    <Ionicons name="sparkles" size={14} color="#F59E0B" style={{ marginRight: 4 }} />
                    <Text style={styles.spotlightBadgeText}>FEATURE HIGHLIGHT</Text>
                  </View>
                  <Text style={styles.spotlightTitle}>{currentStep.content.demoSpotlight.title}</Text>
                </View>

                {/* Specific UI Mockups per type */}
                {currentStep.content.demoSpotlight.type === 'practice_button' && (
                  <View style={styles.mockPracticeContainer}>
                    <Text style={styles.mockInstructionText}>
                      🎯 On the Evaluate Screen, toggle this button:
                    </Text>
                    <View style={styles.mockSegmentedControl}>
                      <View style={[styles.mockOptionBtn, styles.mockOptionBtnActive]}>
                        <Ionicons name="play" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                        <Text style={styles.mockOptionBtnTextActive}>Practice Mode</Text>
                        <View style={styles.mockGlowingPulse} />
                      </View>
                      <View style={styles.mockOptionBtn}>
                        <Ionicons name="timer-outline" size={16} color="#64748B" style={{ marginRight: 6 }} />
                        <Text style={styles.mockOptionBtnText}>Evaluate Mode</Text>
                      </View>
                    </View>
                    <View style={styles.mockLiveIndicator}>
                      <View style={styles.mockLiveDot} />
                      <Text style={styles.mockLiveText}>
                        Gives continuous live posture accuracy + spoken voice cues
                      </Text>
                    </View>
                  </View>
                )}

                {currentStep.content.demoSpotlight.type === 'score_legend' && (
                  <View style={styles.mockLegendContainer}>
                    <View style={styles.legendRow}>
                      <View style={[styles.legendPill, { backgroundColor: '#10B98125', borderColor: '#10B981' }]}>
                        <Text style={[styles.legendPillText, { color: '#10B981' }]}>95 - 100%</Text>
                      </View>
                      <Text style={styles.legendRowDesc}>Grade A (Master Form)</Text>
                    </View>
                    <View style={styles.legendRow}>
                      <View style={[styles.legendPill, { backgroundColor: '#3B82F625', borderColor: '#3B82F6' }]}>
                        <Text style={[styles.legendPillText, { color: '#3B82F6' }]}>85 - 94%</Text>
                      </View>
                      <Text style={styles.legendRowDesc}>Grade B (Advanced Technique)</Text>
                    </View>
                    <View style={styles.legendRow}>
                      <View style={[styles.legendPill, { backgroundColor: '#F59E0B25', borderColor: '#F59E0B' }]}>
                        <Text style={[styles.legendPillText, { color: '#F59E0B' }]}>70 - 84%</Text>
                      </View>
                      <Text style={styles.legendRowDesc}>Grade C (Intermediate)</Text>
                    </View>
                    <View style={styles.legendRow}>
                      <View style={[styles.legendPill, { backgroundColor: '#EF444425', borderColor: '#EF4444' }]}>
                        <Text style={[styles.legendPillText, { color: '#EF4444' }]}>&lt; 70%</Text>
                      </View>
                      <Text style={styles.legendRowDesc}>Grade D/F (Needs Correction)</Text>
                    </View>
                  </View>
                )}

                {currentStep.content.demoSpotlight.type === 'modes_toggle' && (
                  <View style={styles.mockModesContainer}>
                    <View style={styles.mockModeCard}>
                      <MaterialCommunityIcons name="target" size={24} color="#D24B38" />
                      <Text style={styles.mockModeCardTitle}>Single Strike Mode</Text>
                      <Text style={styles.mockModeCardSub}>Isolate and drill any of the 12 strikes</Text>
                    </View>
                    <View style={styles.mockModeCard}>
                      <MaterialCommunityIcons name="sword-cross" size={24} color="#8B5CF6" />
                      <Text style={styles.mockModeCardTitle}>Anyo & Combos</Text>
                      <Text style={styles.mockModeCardSub}>Chained multi-strike continuous routines</Text>
                    </View>
                  </View>
                )}

                {currentStep.content.demoSpotlight.type === 'visual_cues' && (
                  <View style={styles.mockVisualGrid}>
                    <View style={styles.mockVisualItem}>
                      <Ionicons name="color-filter" size={20} color="#10B981" />
                      <Text style={styles.mockVisualItemTitle}>Skeleton Lines</Text>
                      <Text style={styles.mockVisualItemSub}>Green = Correct, Red = Off</Text>
                    </View>
                    <View style={styles.mockVisualItem}>
                      <Ionicons name="body" size={20} color="#8B5CF6" />
                      <Text style={styles.mockVisualItemTitle}>Ghost Silhouette</Text>
                      <Text style={styles.mockVisualItemSub}>Pro master guide outline</Text>
                    </View>
                    <View style={styles.mockVisualItem}>
                      <Ionicons name="flame" size={20} color="#F59E0B" />
                      <Text style={styles.mockVisualItemTitle}>Motion Ribbon</Text>
                      <Text style={styles.mockVisualItemSub}>Visualized blade arc trail</Text>
                    </View>
                    <View style={styles.mockVisualItem}>
                      <Ionicons name="mic" size={20} color="#3B82F6" />
                      <Text style={styles.mockVisualItemTitle}>Voice Feedback</Text>
                      <Text style={styles.mockVisualItemSub}>Spoken real-time cues</Text>
                    </View>
                  </View>
                )}

                {currentStep.content.demoSpotlight.type === 'radar_chart' && (
                  <View style={styles.mockRadarHighlight}>
                    <MaterialCommunityIcons name="spider-web" size={40} color="#D24B38" />
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={styles.mockRadarTitle}>12-Strike Spider Polygon</Text>
                      <Text style={styles.mockRadarDesc}>
                        Displays your balance across all angles. Tap any point on Home to practice immediately!
                      </Text>
                    </View>
                  </View>
                )}

                {currentStep.content.demoSpotlight.type === 'overview' && (
                  <View style={styles.mockOverviewHighlight}>
                    <Image
                      source={require('@/assets/images/favicon.png')}
                      style={{ width: 48, height: 48, borderRadius: 12 }}
                      resizeMode="contain"
                    />
                    <View style={{ flex: 1, marginLeft: 14 }}>
                      <Text style={styles.mockRadarTitle}>PoseFix-Arnis Engine</Text>
                      <Text style={styles.mockRadarDesc}>
                        Comprehensive 4-pillar kinetic posture evaluator & authentic Philippine martial arts training suite.
                      </Text>
                    </View>
                  </View>
                )}

                {/* Caption */}
                <Text style={styles.spotlightCaption}>{currentStep.content.demoSpotlight.caption}</Text>

                {/* Dedicated Action Button in Spotlight if provided */}
                {currentStep.content.demoSpotlight.buttonLabel && (
                  <TouchableOpacity
                    style={styles.spotlightActionBtn}
                    activeOpacity={0.8}
                    onPress={() => handleActionClick(currentStep.content.demoSpotlight?.buttonAction)}
                  >
                    <MaterialCommunityIcons name="play-circle" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                    <Text style={styles.spotlightActionBtnText}>
                      {currentStep.content.demoSpotlight.buttonLabel}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {/* Step Key Highlights List */}
            <Text style={styles.sectionHeader}>KEY TAKEAWAYS</Text>
            {currentStep.content.highlights.map((item, index) => (
              <View key={index} style={styles.highlightItem}>
                <View style={styles.highlightIconBox}>
                  {item.iconFamily === 'MaterialCommunityIcons' ? (
                    <MaterialCommunityIcons name={item.icon} size={20} color="#D24B38" />
                  ) : (
                    <Ionicons name={item.icon} size={20} color="#D24B38" />
                  )}
                </View>
                <View style={styles.highlightContent}>
                  <View style={styles.highlightTitleRow}>
                    <Text style={styles.highlightTitle}>{item.title}</Text>
                    {item.tag && (
                      <View style={[styles.highlightTag, { backgroundColor: (item.tagColor || '#64748B') + '25' }]}>
                        <Text style={[styles.highlightTagText, { color: item.tagColor || '#64748B' }]}>
                          {item.tag}
                        </Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.highlightDesc}>{item.description}</Text>
                </View>
              </View>
            ))}
          </ScrollView>

          {/* Footer Controls & Navigation */}
          <View style={styles.footerBar}>
            {/* Step Dots */}
            <View style={styles.dotsContainer}>
              {TUTORIAL_STEPS.map((_, i) => (
                <TouchableOpacity
                  key={i}
                  onPress={() => handleJumpToStep(i)}
                  style={[
                    styles.dot,
                    i === currentStepIndex && styles.dotActive,
                    i === currentStepIndex && { backgroundColor: currentStep.badgeColor },
                  ]}
                />
              ))}
            </View>

            {/* Navigation Buttons */}
            <View style={styles.buttonRow}>
              {!isFirstStep ? (
                <TouchableOpacity
                  style={styles.backButton}
                  onPress={handlePrev}
                  activeOpacity={0.7}
                >
                  <Ionicons name="arrow-back" size={16} color="#94A3B8" style={{ marginRight: 4 }} />
                  <Text style={styles.backButtonText}>Back</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={styles.skipButton}
                  onPress={handleCompleteTutorial}
                  activeOpacity={0.7}
                >
                  <Text style={styles.skipButtonText}>Skip Tour</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={[
                  styles.nextButton,
                  isLastStep && styles.finishButton,
                  { backgroundColor: isLastStep ? '#10B981' : '#D24B38' },
                ]}
                onPress={handleNext}
                activeOpacity={0.8}
              >
                <Text style={styles.nextButtonText}>
                  {isLastStep ? 'Get Started' : 'Next Step'}
                </Text>
                <Ionicons
                  name={isLastStep ? 'checkmark-circle' : 'arrow-forward'}
                  size={16}
                  color="#FFFFFF"
                  style={{ marginLeft: 6 }}
                />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(5, 7, 15, 0.92)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 14,
  },
  modalContent: {
    width: '100%',
    height: Math.min(height * 0.84, 680),
    maxHeight: '92%',
    backgroundColor: '#0F1020',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#1E293B',
    overflow: 'hidden',
    flexDirection: 'column',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  headerBar: {
    flexShrink: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#161930',
    backgroundColor: '#0D0E1C',
  },
  headerTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerAppTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 1.2,
  },
  headerStepCounter: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
    fontWeight: '500',
  },
  closeIconButton: {
    padding: 6,
    borderRadius: 20,
    backgroundColor: '#161930',
  },
  categoryTabsWrapper: {
    height: 46,
    flexShrink: 0,
    backgroundColor: '#0A0C16',
    borderBottomWidth: 1,
    borderBottomColor: '#161930',
  },
  categoryTabsContainer: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    alignItems: 'center',
    gap: 8,
  },
  categoryTab: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#161930',
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  categoryTabText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#94A3B8',
    letterSpacing: 0.5,
  },
  scrollArea: {
    flex: 1,
    width: '100%',
  },
  scrollContent: {
    padding: 18,
    paddingBottom: 30,
    flexGrow: 1,
  },
  stepBanner: {
    marginBottom: 16,
  },
  badgePill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 8,
  },
  badgePillText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.1,
  },
  stepTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  stepSubtitle: {
    fontSize: 13,
    color: '#94A3B8',
    lineHeight: 18,
  },
  summaryBox: {
    flexDirection: 'row',
    backgroundColor: '#161930',
    borderRadius: 14,
    padding: 14,
    marginBottom: 20,
    borderLeftWidth: 3,
    borderLeftColor: '#3B82F6',
  },
  summaryHeading: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  summaryText: {
    fontSize: 12,
    color: '#CBD5E1',
    lineHeight: 18,
  },
  spotlightCard: {
    backgroundColor: '#13162D',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#2A3352',
  },
  spotlightHeader: {
    marginBottom: 12,
  },
  spotlightBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#F59E0B20',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginBottom: 6,
  },
  spotlightBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#F59E0B',
    letterSpacing: 1,
  },
  spotlightTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  mockPracticeContainer: {
    backgroundColor: '#0B0D18',
    borderRadius: 12,
    padding: 12,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  mockInstructionText: {
    fontSize: 11,
    color: '#94A3B8',
    marginBottom: 8,
    fontWeight: '500',
  },
  mockSegmentedControl: {
    flexDirection: 'row',
    backgroundColor: '#161930',
    borderRadius: 10,
    padding: 4,
    position: 'relative',
  },
  mockOptionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
  },
  mockOptionBtnActive: {
    backgroundColor: '#D24B38',
    shadowColor: '#D24B38',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 4,
  },
  mockOptionBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  mockOptionBtnTextActive: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  mockGlowingPulse: {
    position: 'absolute',
    top: -2,
    left: -2,
    right: -2,
    bottom: -2,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#F59E0B',
  },
  mockLiveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    paddingHorizontal: 4,
  },
  mockLiveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
    marginRight: 8,
  },
  mockLiveText: {
    fontSize: 11,
    color: '#10B981',
    fontWeight: '500',
    flex: 1,
  },
  mockLegendContainer: {
    backgroundColor: '#0B0D18',
    borderRadius: 12,
    padding: 12,
    gap: 8,
    marginVertical: 8,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendPill: {
    width: 85,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: 'center',
    marginRight: 10,
  },
  legendPillText: {
    fontSize: 11,
    fontWeight: '800',
  },
  legendRowDesc: {
    fontSize: 12,
    color: '#CBD5E1',
    fontWeight: '500',
  },
  mockModesContainer: {
    flexDirection: 'row',
    gap: 10,
    marginVertical: 8,
  },
  mockModeCard: {
    flex: 1,
    backgroundColor: '#0B0D18',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  mockModeCardTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 6,
    marginBottom: 2,
    textAlign: 'center',
  },
  mockModeCardSub: {
    fontSize: 10,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 14,
  },
  mockVisualGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginVertical: 8,
  },
  mockVisualItem: {
    width: '48%',
    backgroundColor: '#0B0D18',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  mockVisualItemTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 4,
  },
  mockVisualItemSub: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 1,
  },
  mockRadarHighlight: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0B0D18',
    borderRadius: 12,
    padding: 12,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  mockOverviewHighlight: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0B0D18',
    borderRadius: 12,
    padding: 12,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: '#D24B3840',
  },
  mockRadarTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  mockRadarDesc: {
    fontSize: 11,
    color: '#94A3B8',
    lineHeight: 16,
  },
  spotlightCaption: {
    fontSize: 11,
    color: '#94A3B8',
    lineHeight: 17,
    marginTop: 8,
  },
  spotlightActionBtn: {
    flexDirection: 'row',
    backgroundColor: '#D24B38',
    borderRadius: 10,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  spotlightActionBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 1.2,
    marginBottom: 12,
  },
  highlightItem: {
    flexDirection: 'row',
    backgroundColor: '#161930',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  highlightIconBox: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: '#D24B3815',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  highlightContent: {
    flex: 1,
  },
  highlightTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
    flexWrap: 'wrap',
  },
  highlightTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
    flex: 1,
  },
  highlightTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 6,
  },
  highlightTagText: {
    fontSize: 9,
    fontWeight: '700',
  },
  highlightDesc: {
    fontSize: 11,
    color: '#94A3B8',
    lineHeight: 16,
  },
  footerBar: {
    flexShrink: 0,
    paddingHorizontal: 18,
    paddingVertical: 14,
    backgroundColor: '#0D0E1C',
    borderTopWidth: 1,
    borderTopColor: '#161930',
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginBottom: 14,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#334155',
  },
  dotActive: {
    width: 20,
    height: 6,
    borderRadius: 3,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  skipButton: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  skipButtonText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '600',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: '#161930',
  },
  backButtonText: {
    fontSize: 13,
    color: '#CBD5E1',
    fontWeight: '600',
  },
  nextButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 44,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  finishButton: {
    shadowColor: '#10B981',
    shadowOpacity: 0.4,
  },
  nextButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
