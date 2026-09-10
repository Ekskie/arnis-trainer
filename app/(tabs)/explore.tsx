import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getHistory, getStrikeMasteryStats, MasteryStats } from '@/constants/historyStore';
import { StrikeVideoModal } from '@/components/StrikeVideoModal';

interface StrikeLesson {
  id: string;
  strikeKey: string;
  name: string;
  filipinoName: string;
  target: string;
  trajectory: string;
  rightRange: string;
  leftRange: string;
  chamberStep: string;
  impactStep: string;
  recoveryStep: string;
  commonMistake: string;
  guroTip: string;
}

const STRIKES_ACADEMY_DATA: StrikeLesson[] = [
  {
    id: "1",
    strikeKey: "strike_1",
    name: "Strike 1: Left Temple",
    filipinoName: "Pang-una (Kaliwang Sintido)",
    target: "Left Temple / Neck / Carotid Artery",
    trajectory: "Diagonal Downward Slash (Forehand)",
    rightRange: "110.9° - 156.8°",
    leftRange: "25.7° - 94.2°",
    chamberStep: "Bring the stick up beside your right ear at a 45° angle, elbow bent. Place your left check hand (Kalasag) flat against your chest.",
    impactStep: "Step forward with your right foot and slash diagonally downward across the opponent's left temple, like drawing a seatbelt across your chest.",
    recoveryStep: "Stop the swing at your left hip without letting the stick fly wildly. Snap your wrist (Pitik) and immediately return to ready guard stance.",
    commonMistake: "Dropping the left check hand to the hip, leaving the chest exposed to counter-cuts.",
    guroTip: "Power comes from hip rotation and the final wrist snap—not by tensing your shoulder."
  },
  {
    id: "2",
    strikeKey: "strike_2",
    name: "Strike 2: Right Temple",
    filipinoName: "Pangalawa (Kanan Sintido)",
    target: "Right Temple / Neck / Clavicle",
    trajectory: "Diagonal Downward Slash (Backhand)",
    rightRange: "132.3° - 175.3°",
    leftRange: "21.8° - 149.0°",
    chamberStep: "Chamber the stick across your body near your left shoulder/ear. Left check hand stays glued to your solar plexus.",
    impactStep: "Pivot your hips forward and deliver a diagonal downward backhand slash targeting the opponent's right temple.",
    recoveryStep: "Allow the weapon to clear the impact zone and rebound smoothly back to your right shoulder chamber.",
    commonMistake: "Over-rotating the torso past 45°, losing sight of the opponent and compromising balance.",
    guroTip: "Snap the wrist right at the point of contact to turn a slow push into a concussive strike."
  },
  {
    id: "3",
    strikeKey: "strike_3",
    name: "Strike 3: Left Torso",
    filipinoName: "Pangatlo (Kaliwang Tagiliran)",
    target: "Left Floating Ribs / Kidney / Flank",
    trajectory: "Horizontal Forehand Cut",
    rightRange: "87.2° - 114.0°",
    leftRange: "3.7° - 127.7°",
    chamberStep: "Cock the stick horizontally at right hip level. Keep both knees bent into a low, stable forward stance (Tindig).",
    impactStep: "Slice horizontally parallel to the floor cutting straight through the left floating ribs. Push through with hip torque.",
    recoveryStep: "Follow through to the left flank, then lift the stick tip and circle back to your primary chest guard.",
    commonMistake: "Swinging at an upward angle instead of keeping the blade plane perfectly horizontal.",
    guroTip: "Sink your weight 2 inches deeper into your lead knee to get beneath the opponent's guard."
  },
  {
    id: "4",
    strikeKey: "strike_4",
    name: "Strike 4: Right Torso",
    filipinoName: "Pang-apat (Kanan Tagiliran)",
    target: "Right Floating Ribs / Elbow Joint",
    trajectory: "Horizontal Backhand Cut",
    rightRange: "121.1° - 165.8°",
    leftRange: "23.5° - 84.2°",
    chamberStep: "Cock the stick across your torso at your left hip. Maintain your left hand active at chest level.",
    impactStep: "Drive a horizontal backhand cut across the right ribs. Open your chest as the stick delivers force.",
    recoveryStep: "Snap the wrist to complete the cut, then retract the stick back to your dominant side.",
    commonMistake: "Allowing the elbow to collapse inwards against your own ribs on release.",
    guroTip: "Keep your striking arm extending firmly between 121° and 165° for maximum lever arm leverage."
  },
  {
    id: "5",
    strikeKey: "strike_5",
    name: "Strike 5: Abdomen Thrust",
    filipinoName: "Pang-lima (Saksak sa Tiyan)",
    target: "Solar Plexus / Navel / Abdomen",
    trajectory: "Linear Forward Thrust (Saksak)",
    rightRange: "151.1° - 168.4°",
    leftRange: "22.0° - 69.1°",
    chamberStep: "Chamber the stick tip pointing straight forward at waist height, weapon butt (Punyo) close to your right hip.",
    impactStep: "Lunge forward with a linear thrust driving the stick tip horizontally into the solar plexus. Arm extends nearly straight (155°-168°).",
    recoveryStep: "Instantly pull the stick straight back along the same entry line to prevent the opponent from grabbing your weapon.",
    commonMistake: "Leaving the thrust extended too long, making your arm vulnerable to a disarm (Agaw).",
    guroTip: "The retraction (Bawi) in Strike 5 must be just as fast as the forward thrust."
  },
  {
    id: "6",
    strikeKey: "strike_6",
    name: "Strike 6: Left Chest Thrust",
    filipinoName: "Pang-anim (Saksak sa Kaliwang Dibdib)",
    target: "Left Upper Chest / Clavicle / Heart Area",
    trajectory: "Upward Linear Thrust (Forehand)",
    rightRange: "158.0° - 178.8°",
    leftRange: "55.6° - 100.2°",
    chamberStep: "Chamber the weapon at right chest height with palm facing upward. Left hand shields your chin.",
    impactStep: "Drive an upward-angled thrust into the left pectoral muscle or clavicle. Elbow extends to near lockout (158°-179°).",
    recoveryStep: "Retract quickly back to chest level, ready to parry or check incoming attacks.",
    commonMistake: "Thrusting with the palm facing down, which reduces forward wrist support.",
    guroTip: "Keep your thumb pointing forward along the stick shaft to lock your wrist in place."
  },
  {
    id: "7",
    strikeKey: "strike_7",
    name: "Strike 7: Right Chest Thrust",
    filipinoName: "Pang-pito (Saksak sa Kanang Dibdib)",
    target: "Right Upper Chest / Subclavian Region",
    trajectory: "Upward Linear Thrust (Backhand)",
    rightRange: "149.2° - 172.1°",
    leftRange: "69.4° - 172.3°",
    chamberStep: "Chamber near left shoulder with palm facing inward/downward across your body.",
    impactStep: "Drive a backhand thrust into the right chest pocket. Push through with your legs and hips.",
    recoveryStep: "Retract the weapon along the same trajectory line back into high chest guard.",
    commonMistake: "Leaning your head forward past your lead knee, giving away your balance.",
    guroTip: "Keep your spine upright—reach with arm extension and knee bend, not torso lean."
  },
  {
    id: "8",
    strikeKey: "strike_8",
    name: "Strike 8: Left Knee Cut",
    filipinoName: "Pang-walo (Kaliwang Tuhod)",
    target: "Left Knee Joint / Lower Thigh",
    trajectory: "Low Downward Diagonal Cut",
    rightRange: "165.5° - 178.0°",
    leftRange: "25.1° - 97.8°",
    chamberStep: "High right chamber by your ear. Keep your eyes up—never look down at the floor!",
    impactStep: "Drop your entire center of gravity by bending both knees into a deep fighting stance and slice downward to the left knee.",
    recoveryStep: "Snap the wrist through the knee joint and rise back up to ready stance, pulling the stick to center.",
    commonMistake: "Bending forward at the waist with straight legs, leaving your head completely unguarded.",
    guroTip: "Always lower your level using your leg muscles (Tindig), keeping your head protected behind your guard."
  },
  {
    id: "9",
    strikeKey: "strike_9",
    name: "Strike 9: Right Knee Cut",
    filipinoName: "Pang-siyam (Kanang Tuhod)",
    target: "Right Knee Joint / Lower Thigh",
    trajectory: "Low Downward Diagonal Cut (Backhand)",
    rightRange: "170.3° - 176.3°",
    leftRange: "37.5° - 66.8°",
    chamberStep: "High left chamber across your head. Deep knee flexion prepared.",
    impactStep: "Deliver a low backhand downward diagonal cut targeting the opponent's right knee. Elbow extends to ~173°.",
    recoveryStep: "Rebound the stick tip off the low target and elevate back into high chest chamber.",
    commonMistake: "Pausing at the bottom of the low strike where you can be countered from above.",
    guroTip: "Strike low, recover high. The instant the knee cut finishes, your check hand must shield your face."
  },
  {
    id: "10",
    strikeKey: "strike_10",
    name: "Strike 10: Left Eye Thrust",
    filipinoName: "Pang-sampu (Saksak sa Kaliwang Mata)",
    target: "Left Eye / Facial Nerve / Temple",
    trajectory: "Eye-Level Direct Thrust (Forehand)",
    rightRange: "161.9° - 179.1°",
    leftRange: "39.2° - 84.2°",
    chamberStep: "Weapon held horizontal at eye level by right ear. Minimal windup to avoid telegraphing.",
    impactStep: "Flick the stick straight forward like an arrow directly at the opponent's left eye. Fast, piercing extension.",
    recoveryStep: "Snap the stick back instantly into high ready position.",
    commonMistake: "Pulling the stick far back before thrusting, which gives away the attack.",
    guroTip: "Treat Strike 10 like a snake bite—no wind-up, just sudden forward venom and immediate withdrawal."
  },
  {
    id: "11",
    strikeKey: "strike_11",
    name: "Strike 11: Right Eye Thrust",
    filipinoName: "Pang-labing-isa (Saksak sa Kanang Mata)",
    target: "Right Eye / Face / Cheekbone",
    trajectory: "Eye-Level Direct Thrust (Backhand)",
    rightRange: "151.9° - 178.9°",
    leftRange: "88.2° - 169.8°",
    chamberStep: "Weapon horizontal at left eye height. Palm facing down.",
    impactStep: "Drive a lightning backhand thrust straight at the right eye. Full extension (152°-179°).",
    recoveryStep: "Snap back cleanly to defensive center guard.",
    commonMistake: "Letting the wrist wobble or bend upward at full extension.",
    guroTip: "Lock your wrist forearm line straight to transfer direct penetrative force."
  },
  {
    id: "12",
    strikeKey: "strike_12",
    name: "Strike 12: Crown Strike",
    filipinoName: "Pang-labing-dalawa (Baston sa Tuktok)",
    target: "Crown of the Skull / Top of Head",
    trajectory: "Vertical Downward Cleave",
    rightRange: "111.1° - 135.0°",
    leftRange: "24.3° - 118.3°",
    chamberStep: "Raise the weapon vertically directly above the center of your skull. Weight evenly centered between feet.",
    impactStep: "Chop straight down vertically into the top of the opponent's skull. Keep striking elbow flexed at 111°-135°.",
    recoveryStep: "Do not let the stick hit your own knee! Stop the strike at chin/chest level and return to ready guard.",
    commonMistake: "Over-extending the elbow to 180°, which makes you overbalance forward and damages your elbow joint on impact.",
    guroTip: "Keep your elbow slightly bent (111°-135°) at impact—this absorbs the violent shockwave of hitting a hard target."
  }
];

type StrikeCategory = 'all' | 'head' | 'torso' | 'knees' | 'eyes';

interface CategoryFilterItem {
  id: StrikeCategory;
  label: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  count: number;
}

const CATEGORIES: CategoryFilterItem[] = [
  { id: 'all', label: 'All', icon: 'sword-cross', count: 12 },
  { id: 'head', label: 'Head & Crown', icon: 'shield-account', count: 3 },
  { id: 'torso', label: 'Torso & Thrusts', icon: 'shield-sword', count: 5 },
  { id: 'knees', label: 'Low Knees', icon: 'run-fast', count: 2 },
  { id: 'eyes', label: 'Face & Eyes', icon: 'eye-outline', count: 2 },
];

export default function StrikeGuideScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'academy' | 'fundamentals' | 'pipeline'>('academy');
  const [expandedStrikeId, setExpandedStrikeId] = useState<string | null>("1");
  const [masteryStats, setMasteryStats] = useState<MasteryStats>(() => getStrikeMasteryStats([]));
  const [categoryFilter, setCategoryFilter] = useState<StrikeCategory>('all');

  useFocusEffect(
    useCallback(() => {
      let isMounted = true;
      getHistory().then((history) => {
        if (isMounted && history) {
          setMasteryStats(getStrikeMasteryStats(history));
        }
      });
      return () => {
        isMounted = false;
      };
    }, [])
  );

  const toggleExpand = (id: string) => {
    setExpandedStrikeId(prev => prev === id ? null : id);
  };

  // Video Demonstration Guide Modal State
  const [videoModalVisible, setVideoModalVisible] = useState(false);
  const [videoModalStrikeId, setVideoModalStrikeId] = useState('strike_1');

  const openVideoGuide = (strikeId?: string) => {
    setVideoModalStrikeId(strikeId || 'strike_1');
    setVideoModalVisible(true);
  };

  const navigateToPractice = (strikeKey: string) => {
    router.push({
      pathname: '/evaluate',
      params: { strikeId: strikeKey }
    });
  };

  const filteredStrikes = STRIKES_ACADEMY_DATA.filter((strike) => {
    if (categoryFilter === 'head') return ['1', '2', '12'].includes(strike.id);
    if (categoryFilter === 'torso') return ['3', '4', '5', '6', '7'].includes(strike.id);
    if (categoryFilter === 'knees') return ['8', '9'].includes(strike.id);
    if (categoryFilter === 'eyes') return ['10', '11'].includes(strike.id);
    return true;
  });

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Arnis Academy & Mechanics</Text>
        <Text style={styles.headerSubtitle}>From Fundamentals to Mastery</Text>
      </View>

      {/* 3 Segmented Navigation Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'academy' && styles.tabButtonActive]}
          onPress={() => setActiveTab('academy')}
        >
          <MaterialCommunityIcons name="school" size={15} color={activeTab === 'academy' ? '#FFFFFF' : '#64748B'} style={{ marginRight: 5 }} />
          <Text style={[styles.tabText, activeTab === 'academy' && styles.tabTextActive]}>12 Strikes</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'fundamentals' && styles.tabButtonActive]}
          onPress={() => setActiveTab('fundamentals')}
        >
          <Ionicons name="body" size={15} color={activeTab === 'fundamentals' ? '#FFFFFF' : '#64748B'} style={{ marginRight: 5 }} />
          <Text style={[styles.tabText, activeTab === 'fundamentals' && styles.tabTextActive]}>Arnis 101</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'pipeline' && styles.tabButtonActive]}
          onPress={() => setActiveTab('pipeline')}
        >
          <MaterialCommunityIcons name="pipe" size={15} color={activeTab === 'pipeline' ? '#FFFFFF' : '#64748B'} style={{ marginRight: 5 }} />
          <Text style={[styles.tabText, activeTab === 'pipeline' && styles.tabTextActive]}>AI Pipeline</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* ======================================================== */}
        {/* TAB 1: 12 STRIKES ACADEMY (STEP-BY-STEP TEACHING CARDS) */}
        {/* ======================================================== */}
        {activeTab === 'academy' && (
          <>
            {/* 12 Strikes Video Guide Banner */}
            <TouchableOpacity
              style={styles.videoGuideAcademyBanner}
              activeOpacity={0.85}
              onPress={() => openVideoGuide()}
            >
              <View style={styles.videoGuideBannerIconWrap}>
                <MaterialCommunityIcons name="play-circle" size={24} color="#F59E0B" />
              </View>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={styles.videoGuideBannerTitle}>12 Strikes Video Demonstration Guide</Text>
                <Text style={styles.videoGuideBannerSub}>
                  Watch slow-motion video breakdowns & Filipino kinetic cues for Strikes 1 - 12
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#F59E0B" />
            </TouchableOpacity>

            <View style={styles.academyBanner}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <MaterialCommunityIcons name="sword-cross" size={18} color="#F59E0B" style={{ marginRight: 8 }} />
                  <Text style={styles.academyBannerHeading}>The 12 Canonical Strikes</Text>
                </View>
                <View style={styles.masteredCountBadge}>
                  <MaterialCommunityIcons name="star-circle" size={12} color="#10B981" style={{ marginRight: 3 }} />
                  <Text style={styles.masteredCountText}>{masteryStats.masteredCount}/12 Mastered</Text>
                </View>
              </View>
              <Text style={styles.academyBannerBody}>
                Filter by target area, study the 3-phase kinetic cycle (<Text style={{ color: '#10B981', fontWeight: 'bold' }}>Kasa</Text> ➔ <Text style={{ color: '#F59E0B', fontWeight: 'bold' }}>Tudla</Text> ➔ <Text style={{ color: '#38BDF8', fontWeight: 'bold' }}>Bawi</Text>), and jump into AI camera evaluation.
              </Text>
            </View>

            {/* Target Category Filter Chips */}
            <View style={styles.filterWrapper}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.categoryScroll}
              >
                {CATEGORIES.map((cat) => {
                  const isActive = categoryFilter === cat.id;
                  return (
                    <TouchableOpacity
                      key={cat.id}
                      style={[styles.categoryChip, isActive && styles.categoryChipActive]}
                      onPress={() => setCategoryFilter(cat.id)}
                      activeOpacity={0.7}
                    >
                      <MaterialCommunityIcons
                        name={cat.icon}
                        size={13}
                        color={isActive ? '#FFFFFF' : '#94A3B8'}
                        style={{ marginRight: 5 }}
                      />
                      <Text style={[styles.categoryChipText, isActive && styles.categoryChipTextActive]}>
                        {cat.label} ({cat.count})
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {filteredStrikes.map((item) => {
              const isExpanded = expandedStrikeId === item.id;
              const strikeStat = masteryStats.strikes.find((s) => s.id === item.strikeKey);
              const bestScore = strikeStat?.bestScore || 0;
              const isMastered = !!strikeStat?.isMastered;
              const attempts = strikeStat?.attempts || 0;
              const badgeColor = isMastered ? '#10B981' : attempts > 0 ? '#F59E0B' : '#D24B38';

              return (
                <View key={item.id} style={[styles.lessonCard, isExpanded && styles.lessonCardExpanded]}>
                  {/* Card Header (Accordion Toggle) */}
                  <TouchableOpacity
                    style={styles.lessonHeader}
                    activeOpacity={0.7}
                    onPress={() => toggleExpand(item.id)}
                  >
                    <View style={[styles.lessonNumBadge, { borderColor: badgeColor, backgroundColor: `${badgeColor}18` }]}>
                      <Text style={[styles.lessonNumText, { color: badgeColor }]}>S{item.id}</Text>
                    </View>

                    <View style={{ flex: 1, marginRight: 6 }}>
                      <Text style={styles.lessonTitle}>{item.name}</Text>
                      <Text style={styles.lessonFilipino}>{item.filipinoName}</Text>
                    </View>

                    <View style={{ alignItems: 'flex-end', marginRight: 8 }}>
                      <Text style={styles.targetBadge}>{item.target.split('/')[0].trim()}</Text>
                      {attempts > 0 ? (
                        <View style={[styles.masteryPill, isMastered ? styles.masteryPillDone : styles.masteryPillProgress]}>
                          <MaterialCommunityIcons
                            name={isMastered ? "shield-check" : "lightning-bolt"}
                            size={10}
                            color={isMastered ? "#10B981" : "#F59E0B"}
                            style={{ marginRight: 3 }}
                          />
                          <Text style={[styles.masteryPillText, { color: isMastered ? '#10B981' : '#F59E0B' }]}>
                            {bestScore}% · {strikeStat?.grade || 'Ranked'}
                          </Text>
                        </View>
                      ) : (
                        <View style={[styles.masteryPill, styles.masteryPillUntrained]}>
                          <Text style={[styles.masteryPillText, { color: '#64748B' }]}>Untrained</Text>
                        </View>
                      )}
                    </View>

                    <Ionicons
                      name={isExpanded ? "chevron-up-circle" : "chevron-down-circle"}
                      size={20}
                      color={isExpanded ? "#F59E0B" : "#64748B"}
                    />
                  </TouchableOpacity>

                  {/* Expanded Teaching Content */}
                  {isExpanded && (
                    <View style={styles.lessonBody}>
                      {/* Trajectory Banner */}
                      <View style={styles.trajBanner}>
                        <Ionicons name="git-commit-outline" size={14} color="#38BDF8" style={{ marginRight: 6 }} />
                        <Text style={styles.trajText}>Trajectory: <Text style={{ color: '#FFFFFF', fontWeight: 'bold' }}>{item.trajectory}</Text></Text>
                      </View>

                      {/* Personal Best / Training Status (if practiced) */}
                      {attempts > 0 && (
                        <View style={styles.personalRecordStrip}>
                          <MaterialCommunityIcons name="trophy-award" size={14} color="#F59E0B" style={{ marginRight: 6 }} />
                          <Text style={styles.personalRecordText}>
                            Personal Best: <Text style={{ color: '#FFFFFF', fontWeight: 'bold' }}>{bestScore}%</Text> ({strikeStat?.grade}) · <Text style={{ color: '#94A3B8' }}>{attempts} attempt{attempts === 1 ? '' : 's'}</Text>
                          </Text>
                        </View>
                      )}

                      {/* 3 Step Phase Teaching Box */}
                      <View style={styles.phasesContainer}>
                        {/* Step 1: Kasa */}
                        <View style={styles.phaseItem}>
                          <View style={[styles.phaseDot, { backgroundColor: '#10B981' }]}>
                            <Text style={styles.phaseDotNum}>1</Text>
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={[styles.phaseTitle, { color: '#10B981' }]}>KASA (Chamber / Cocking)</Text>
                            <Text style={styles.phaseDesc}>{item.chamberStep}</Text>
                          </View>
                        </View>

                        {/* Step 2: Tudla */}
                        <View style={styles.phaseItem}>
                          <View style={[styles.phaseDot, { backgroundColor: '#F59E0B' }]}>
                            <Text style={styles.phaseDotNum}>2</Text>
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={[styles.phaseTitle, { color: '#F59E0B' }]}>TUDLA (Target Delivery & Slicing)</Text>
                            <Text style={styles.phaseDesc}>{item.impactStep}</Text>
                          </View>
                        </View>

                        {/* Step 3: Bawi */}
                        <View style={styles.phaseItem}>
                          <View style={[styles.phaseDot, { backgroundColor: '#38BDF8' }]}>
                            <Text style={styles.phaseDotNum}>3</Text>
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={[styles.phaseTitle, { color: '#38BDF8' }]}>BAWI (Recovery to Guard)</Text>
                            <Text style={styles.phaseDesc}>{item.recoveryStep}</Text>
                          </View>
                        </View>
                      </View>

                      {/* Calibrated Target Angle Window */}
                      <View style={styles.angleWindowBox}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.angleWinLabel}>STRIKING ELBOW TARGET</Text>
                          <Text style={styles.angleWinVal}>{item.rightRange}</Text>
                        </View>
                        <View style={{ width: 1, backgroundColor: '#334155' }} />
                        <View style={{ flex: 1, paddingLeft: 12 }}>
                          <Text style={styles.angleWinLabel}>CHECK HAND GUARD</Text>
                          <Text style={styles.angleWinVal}>Solar Plexus</Text>
                        </View>
                      </View>

                      {/* Guro Advice & Warning */}
                      <View style={styles.guroBox}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                          <Ionicons name="bulb-outline" size={14} color="#F59E0B" style={{ marginRight: 5 }} />
                          <Text style={styles.guroTitle}>Grandmaster Tip & Common Fault</Text>
                        </View>
                        <Text style={styles.guroText}>• <Text style={{ color: '#EF4444', fontWeight: 'bold' }}>Avoid:</Text> {item.commonMistake}</Text>
                        <Text style={styles.guroText}>• <Text style={{ color: '#10B981', fontWeight: 'bold' }}>Mastery:</Text> {item.guroTip}</Text>
                      </View>

                      {/* Action Buttons Row: Video Demo + Practice */}
                      <View style={styles.cardActionsRow}>
                        <TouchableOpacity
                          style={styles.cardVideoBtn}
                          activeOpacity={0.8}
                          onPress={() => openVideoGuide(item.strikeKey)}
                        >
                          <MaterialCommunityIcons name="play-circle" size={16} color="#F59E0B" style={{ marginRight: 6 }} />
                          <Text style={styles.cardVideoBtnText}>Watch Demo</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.practiceBtnFlex}
                          activeOpacity={0.8}
                          onPress={() => navigateToPractice(item.strikeKey)}
                        >
                          <MaterialCommunityIcons name="sword" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                          <Text style={styles.practiceBtnText}>Practice Strike {item.id}</Text>
                          <Ionicons name="arrow-forward" size={14} color="#FFFFFF" style={{ marginLeft: 6 }} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}
                </View>
              );
            })}
          </>
        )}

        {/* ======================================================== */}
        {/* TAB 2: ARNIS 101 - BEGINNER FUNDAMENTALS                  */}
        {/* ======================================================== */}
        {activeTab === 'fundamentals' && (
          <View style={styles.fundamentalsContainer}>
            <View style={styles.academyBanner}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                <Ionicons name="school" size={18} color="#10B981" style={{ marginRight: 8 }} />
                <Text style={styles.academyBannerHeading}>Arnis 101: Zero-Knowledge Foundations</Text>
              </View>
              <Text style={styles.academyBannerBody}>
                Before swinging a weapon, every student must master the three pillars of Filipino Martial Arts (FMA): **The Grip (Hawak)**, **The Stance (Tindig)**, and **The Live Hand (Kalasag)**.
              </Text>
            </View>

            {/* Pillar 1: Grip */}
            <View style={styles.fundCard}>
              <View style={styles.fundHeaderRow}>
                <View style={[styles.fundIconCircle, { backgroundColor: '#3B82F620', borderColor: '#3B82F6' }]}>
                  <MaterialCommunityIcons name="hand-back-right" size={20} color="#3B82F6" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fundTitle}>1. Proper Grip (Hawak at Punyo)</Text>
                  <Text style={styles.fundSubtitle}>Weapon Retention & Disarm Resistance</Text>
                </View>
              </View>
              <Text style={styles.fundBody}>
                • **Leave 1.5 to 2 Inches at the Base:** Do NOT hold the stick at the very bottom edge! Leave two inches of exposed wood protruding past your pinky. This exposed base is called the **Punyo (Butt)**.
              </Text>
              <Text style={styles.fundBody}>
                • **Why Punyo Matters:** In authentic Arnis, the punyo is used for hooking the opponent&apos;s neck, executing close-quarters elbow-strikes, and locking disarms (*Agaw*).
              </Text>
              <Text style={styles.fundBody}>
                • **Firm Thumb Lock:** Wrap all four fingers around the shaft, with your thumb clamping down securely across your index fingernail. Never place your thumb along the length of the shaft.
              </Text>
            </View>

            {/* Pillar 2: Stance */}
            <View style={styles.fundCard}>
              <View style={styles.fundHeaderRow}>
                <View style={[styles.fundIconCircle, { backgroundColor: '#F59E0B20', borderColor: '#F59E0B' }]}>
                  <MaterialCommunityIcons name="human-male" size={20} color="#F59E0B" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fundTitle}>2. Fighting Stance (Tindig / Paa)</Text>
                  <Text style={styles.fundSubtitle}>Balance, Mobility, & Spring Leverage</Text>
                </View>
              </View>
              <Text style={styles.fundBody}>
                • **Forward Fighting Stance (Handa):** Place your dominant foot forward pointed at a 45° angle towards the target. Rear foot is back for triangulation balance.
              </Text>
              <Text style={styles.fundBody}>
                • **Bend Both Knees (135° - 165°):** Never stand upright like a statue! Bending your knees lowers your center of mass, absorbs strike recoil, and powers your hip rotation.
              </Text>
              <Text style={styles.fundBody}>
                • **60/40 Weight Distribution:** Keep 60% of your weight distributed on your lead foot to allow explosive lunges and sudden evasions.
              </Text>
            </View>

            {/* Pillar 3: Kalasag Guard */}
            <View style={styles.fundCard}>
              <View style={styles.fundHeaderRow}>
                <View style={[styles.fundIconCircle, { backgroundColor: '#10B98120', borderColor: '#10B981' }]}>
                  <MaterialCommunityIcons name="shield-check" size={20} color="#10B981" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fundTitle}>3. The Check Hand (Kalasag / Kamay)</Text>
                  <Text style={styles.fundSubtitle}>{'The Non-Striking "Live Hand" Defense'}</Text>
                </View>
              </View>
              <Text style={styles.fundBody}>
                • **Chest Level Placement:** Your non-weapon hand must NEVER hang loosely at your side or waist. Keep your open palm flat or hovering right in front of your solar plexus.
              </Text>
              <Text style={styles.fundBody}>
                • **Survival Purpose:** In Filipino blade warfare, an unprotected torso invites an instant fatal counter. The check hand parries incoming cuts, controls the opponent&apos;s weapon arm, and detects close-range grabs.
              </Text>
              <Text style={styles.fundBody}>
                • **AI Scoring Rule:** If your check hand drops below hip level during any strike, our computer vision engine flags **GUARD_LOW** and deducts from your 25% Guard Pillar!
              </Text>
            </View>

            {/* Pillar 4: Kasa, Tudla, Bawi */}
            <View style={styles.fundCard}>
              <View style={styles.fundHeaderRow}>
                <View style={[styles.fundIconCircle, { backgroundColor: '#EC489920', borderColor: '#EC4899' }]}>
                  <MaterialCommunityIcons name="lightning-bolt" size={20} color="#EC4899" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fundTitle}>4. The Kinetic Cycle: Kasa · Tudla · Bawi</Text>
                  <Text style={styles.fundSubtitle}>Dynamic Sequencing vs. Static Freezing</Text>
                </View>
              </View>
              <Text style={styles.fundBody}>
                • **Phase 1: Kasa (Chamber):** Load potential energy by cocking the weapon smoothly behind your ear or shoulder without telegraphing.
              </Text>
              <Text style={styles.fundBody}>
                • **Phase 2: Tudla (Drive & Impact):** Accelerate along the designated angle arc. Squeeze your grip and snap your wrist (*Pitik*) right upon target impact.
              </Text>
              <Text style={styles.fundBody}>
                • **Phase 3: Bawi (Recovery):** Immediately pull the weapon back into defensive guard. Never let the stick swing wildly behind your back!
              </Text>
            </View>
          </View>
        )}

        {/* ======================================================== */}
        {/* TAB 3: PIPELINE & SCORING ARCHITECTURE                   */}
        {/* ======================================================== */}
        {activeTab === 'pipeline' && (
          <View style={styles.pipelineContainer}>
            <Text style={styles.pipelineIntro}>
              Technical architecture detailing how expert reference footage is extracted via 2D AlphaPose ground truth and processed in real-time using 3D MediaPipe Pose.
            </Text>

            {/* STEP 1 */}
            <View style={styles.stepCard}>
              <View style={styles.stepHeader}>
                <View style={[styles.stepNumBadge, { backgroundColor: '#3B82F620', borderColor: '#3B82F6' }]}>
                  <Text style={[styles.stepNumText, { color: '#3B82F6' }]}>STAGE 1</Text>
                </View>
                <Text style={styles.stepTitle}>Expert Video & AlphaPose (2D Baseline)</Text>
              </View>
              <Text style={styles.stepDesc}>
                High-fidelity reference footage of an Arnis master executing the 12 strikes is ingested. Offline inference via **AlphaPose (2D)** processes 14,764 frames into raw keypoint baselines (`arnis_dataset_v2.csv`) with maximum spatial precision.
              </Text>
            </View>

            <View style={styles.arrowDown}>
              <Ionicons name="arrow-down-circle" size={24} color="#64748B" />
            </View>

            {/* STEP 2 */}
            <View style={styles.stepCard}>
              <View style={styles.stepHeader}>
                <View style={[styles.stepNumBadge, { backgroundColor: '#F59E0B20', borderColor: '#F59E0B' }]}>
                  <Text style={[styles.stepNumText, { color: '#F59E0B' }]}>STAGE 2</Text>
                </View>
                <Text style={styles.stepTitle}>Data Calibration & 3D Depth Metric Normalization</Text>
              </View>
              <Text style={styles.stepDesc}>
                Joint-to-joint vectors are computed into normalized coordinate spaces. Standard deviation percentiles (10% to 90%) define the exact angle ranges, calibrated with torso scale normalization to ensure camera angle and distance invariance.
              </Text>
            </View>

            <View style={styles.arrowDown}>
              <Ionicons name="arrow-down-circle" size={24} color="#64748B" />
            </View>

            {/* STEP 3 */}
            <View style={styles.stepCard}>
              <View style={styles.stepHeader}>
                <View style={[styles.stepNumBadge, { backgroundColor: '#10B98120', borderColor: '#10B981' }]}>
                  <Text style={[styles.stepNumText, { color: '#10B981' }]}>STAGE 3</Text>
                </View>
                <Text style={styles.stepTitle}>MediaPipe (3D Pose) & Scale-Adaptive Stick Engine</Text>
              </View>
              <Text style={styles.stepDesc}>
                On-device inference (30+ FPS) tracking 33 skeletal landmarks. Search reach dynamically scales based on forearm length (1.65×) with kinematic forearm projection fallback during lightning-fast slashes (&gt;400°/s) to counter motion blur.
              </Text>
            </View>

            <View style={styles.arrowDown}>
              <Ionicons name="arrow-down-circle" size={24} color="#64748B" />
            </View>

            {/* STEP 4 */}
            <View style={styles.stepCard}>
              <View style={styles.stepHeader}>
                <View style={[styles.stepNumBadge, { backgroundColor: '#EC489920', borderColor: '#EC4899' }]}>
                  <Text style={[styles.stepNumText, { color: '#EC4899' }]}>STAGE 4</Text>
                </View>
                <Text style={styles.stepTitle}>5-Pillar Biomechanical Kinetic Scoring</Text>
              </View>

              <View style={styles.formulaBox}>
                <Text style={styles.formulaText}>
                  Score = (0.35 × Arm) + (0.25 × Kalasag) + (0.20 × Stance) + (0.10 × Wrist) + (0.10 × Kinetic Flow)
                </Text>
              </View>

              <View style={styles.weightList}>
                <View style={styles.weightItem}>
                  <Text style={[styles.weightPct, { color: '#3B82F6' }]}>35%</Text>
                  <Text style={styles.weightLabel}>Striking Arm & Elbow Angle Trajectory</Text>
                </View>
                <View style={styles.weightItem}>
                  <Text style={[styles.weightPct, { color: '#10B981' }]}>25%</Text>
                  <Text style={styles.weightLabel}>Check Hand Defense (Kalasag Chest Guard)</Text>
                </View>
                <View style={styles.weightItem}>
                  <Text style={[styles.weightPct, { color: '#F59E0B' }]}>20%</Text>
                  <Text style={styles.weightLabel}>Stance & Base Stability (Tindig 135°-165°)</Text>
                </View>
                <View style={styles.weightItem}>
                  <Text style={[styles.weightPct, { color: '#8B5CF6' }]}>10%</Text>
                  <Text style={styles.weightLabel}>Wrist Snap (Pitik) & Alignment (&lt;15°)</Text>
                </View>
                <View style={styles.weightItem}>
                  <Text style={[styles.weightPct, { color: '#EC4899' }]}>10%</Text>
                  <Text style={styles.weightLabel}>Kinetic Sequence Flow (Anti-Static Gaming)</Text>
                </View>
              </View>
            </View>

            {/* DEFENSE SUMMARY CARD */}
            <View style={styles.defenseCard}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                <Ionicons name="school-outline" size={20} color="#F59E0B" style={{ marginRight: 8 }} />
                <Text style={styles.defenseCardTitle}>Defense Panel Validation (14,764 Frames)</Text>
              </View>
              <Text style={styles.defenseCardBody}>
                • **Validation Benchmark (`validate_pose.py`):** Achieves **98.6% PCK@0.20** across all 12 key joint clusters and a normalized **MPJPE error of 0.0201**.\n
                • **Object Keypoint Similarity (OKS):** Achieves **0.7905**, verifying strong empirical alignment between offline AlphaPose ground truth and online MediaPipe edge tracking.\n
                • **Anti-Static Gaming Engine:** Prevents students from faking high accuracy by freezing into static poses.
              </Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* 12-Strike Video Demonstration Guide Modal */}
      <StrikeVideoModal
        visible={videoModalVisible}
        initialStrikeId={videoModalStrikeId}
        onClose={() => setVideoModalVisible(false)}
        onPracticeStrike={(strikeId: string) => {
          setVideoModalVisible(false);
          navigateToPractice(strikeId);
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0C16',
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#161930',
  },
  headerTitle: {
    fontSize: 19,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: 11,
    color: '#F59E0B',
    fontWeight: 'bold',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginTop: 2,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#161930',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
    borderRadius: 12,
    padding: 4,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    borderRadius: 8,
  },
  tabButtonActive: {
    backgroundColor: '#D24B38',
  },
  tabText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#64748B',
  },
  tabTextActive: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  academyBanner: {
    backgroundColor: '#161930',
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  academyBannerHeading: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  academyBannerBody: {
    fontSize: 12.5,
    color: '#94A3B8',
    lineHeight: 18,
  },
  masteredCountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10B98118',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#10B98140',
  },
  masteredCountText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#10B981',
  },
  filterWrapper: {
    marginBottom: 14,
  },
  categoryScroll: {
    gap: 8,
    paddingRight: 16,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#161930',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  categoryChipActive: {
    backgroundColor: '#D24B38',
    borderColor: '#D24B38',
  },
  categoryChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94A3B8',
  },
  categoryChipTextActive: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  lessonCard: {
    backgroundColor: '#161930',
    borderRadius: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#1E293B',
    overflow: 'hidden',
  },
  lessonCardExpanded: {
    borderColor: '#F59E0B70',
    backgroundColor: '#141829',
  },
  lessonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
  },
  lessonNumBadge: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: '#D24B3820',
    borderWidth: 1.5,
    borderColor: '#D24B38',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  lessonNumText: {
    color: '#D24B38',
    fontWeight: 'bold',
    fontSize: 13,
  },
  lessonTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  lessonFilipino: {
    fontSize: 11.5,
    color: '#38BDF8',
    fontWeight: '500',
    marginTop: 1,
  },
  targetBadge: {
    fontSize: 10,
    color: '#F59E0B',
    fontWeight: 'bold',
    backgroundColor: '#F59E0B15',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#F59E0B40',
  },
  masteryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 3,
  },
  masteryPillDone: {
    backgroundColor: '#10B98118',
    borderWidth: 1,
    borderColor: '#10B98140',
  },
  masteryPillProgress: {
    backgroundColor: '#F59E0B18',
    borderWidth: 1,
    borderColor: '#F59E0B40',
  },
  masteryPillUntrained: {
    backgroundColor: '#1E293B50',
    borderWidth: 1,
    borderColor: '#33415540',
  },
  masteryPillText: {
    fontSize: 9.5,
    fontWeight: 'bold',
  },
  personalRecordStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F59E0B12',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#F59E0B30',
  },
  personalRecordText: {
    fontSize: 11.5,
    color: '#E2E8F0',
  },
  lessonBody: {
    paddingHorizontal: 14,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
    paddingTop: 12,
  },
  trajBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#38BDF830',
  },
  trajText: {
    fontSize: 12,
    color: '#94A3B8',
  },
  phasesContainer: {
    gap: 10,
    marginBottom: 12,
  },
  phaseItem: {
    flexDirection: 'row',
    backgroundColor: '#0F172A',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  phaseDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    marginTop: 2,
  },
  phaseDotNum: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 11,
  },
  phaseTitle: {
    fontSize: 11.5,
    fontWeight: 'bold',
    marginBottom: 3,
  },
  phaseDesc: {
    fontSize: 12,
    color: '#CBD5E1',
    lineHeight: 17,
  },
  angleWindowBox: {
    flexDirection: 'row',
    backgroundColor: '#0F172A',
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  angleWinLabel: {
    fontSize: 8.5,
    color: '#64748B',
    fontWeight: 'bold',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  angleWinVal: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#F59E0B',
  },
  guroBox: {
    backgroundColor: '#1E1B18',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#F59E0B40',
    marginBottom: 12,
  },
  guroTitle: {
    fontSize: 11,
    color: '#F59E0B',
    fontWeight: 'bold',
  },
  guroText: {
    fontSize: 11.5,
    color: '#CBD5E1',
    lineHeight: 16,
    marginTop: 2,
  },
  practiceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#D24B38',
    paddingVertical: 12,
    borderRadius: 10,
    shadowColor: '#D24B38',
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  practiceBtnText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 13,
  },
  fundamentalsContainer: {
    gap: 12,
  },
  fundCard: {
    backgroundColor: '#161930',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  fundHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  fundIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  fundTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  fundSubtitle: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 1,
  },
  fundBody: {
    fontSize: 12.5,
    color: '#CBD5E1',
    lineHeight: 18,
    marginBottom: 6,
  },
  pipelineContainer: {
    gap: 8,
  },
  pipelineIntro: {
    color: '#94A3B8',
    fontSize: 12.5,
    lineHeight: 18,
    marginBottom: 14,
    backgroundColor: '#161930',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  stepCard: {
    backgroundColor: '#161930',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  stepNumBadge: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    marginRight: 8,
  },
  stepNumText: {
    fontSize: 9.5,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  stepTitle: {
    fontSize: 13.5,
    fontWeight: 'bold',
    color: '#FFFFFF',
    flex: 1,
  },
  stepDesc: {
    fontSize: 12,
    color: '#94A3B8',
    lineHeight: 17,
  },
  arrowDown: {
    alignItems: 'center',
    marginVertical: 2,
  },
  formulaBox: {
    backgroundColor: '#0F1020',
    borderRadius: 8,
    padding: 10,
    marginTop: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#EC489950',
    alignItems: 'center',
  },
  formulaText: {
    color: '#EC4899',
    fontWeight: 'bold',
    fontSize: 11,
    textAlign: 'center',
  },
  weightList: {
    gap: 6,
  },
  weightItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F1020',
    padding: 8,
    borderRadius: 8,
  },
  weightPct: {
    width: 36,
    fontWeight: 'bold',
    fontSize: 12.5,
  },
  weightLabel: {
    color: '#CBD5E1',
    fontSize: 11.5,
    flex: 1,
  },
  defenseCard: {
    backgroundColor: '#1E293B',
    borderRadius: 14,
    padding: 14,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#F59E0B50',
  },
  defenseCardTitle: {
    color: '#F59E0B',
    fontSize: 13,
    fontWeight: 'bold',
  },
  defenseCardBody: {
    color: '#CBD5E1',
    fontSize: 11.5,
    lineHeight: 17,
  },
  videoGuideAcademyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#161930',
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1.5,
    borderColor: '#F59E0B60',
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  videoGuideBannerIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#F59E0B15',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  videoGuideBannerTitle: {
    color: '#F59E0B',
    fontSize: 13.5,
    fontWeight: '700',
    marginBottom: 3,
  },
  videoGuideBannerSub: {
    color: '#94A3B8',
    fontSize: 11.5,
    lineHeight: 16,
  },
  cardActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  cardVideoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1E293B',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#F59E0B60',
  },
  cardVideoBtnText: {
    color: '#F59E0B',
    fontSize: 13,
    fontWeight: 'bold',
  },
  practiceBtnFlex: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#D24B38',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
});
