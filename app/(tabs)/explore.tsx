import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface StrikeInfo {
  id: string;
  name: string;
  target: string;
  desc: string;
  rightRange: string;
  leftRange: string;
}

const STRIKES_DATA: StrikeInfo[] = [
  { id: "1", name: "Strike 1", target: "Left Temple / Neck", desc: "A diagonal downward strike aimed at the left temple, ear, or side of the neck of the opponent.", rightRange: "92.3° - 150.8°", leftRange: "55.2° - 155.9°" },
  { id: "2", name: "Strike 2", target: "Right Temple / Neck", desc: "A diagonal downward strike aimed at the right temple, ear, or side of the neck of the opponent.", rightRange: "76.0° - 148.5°", leftRange: "33.0° - 65.3°" },
  { id: "3", name: "Strike 3", target: "Left Torso / Shoulder", desc: "A horizontal strike targeting the left side of the torso, including the arm, ribs, or flank.", rightRange: "72.6° - 113.7°", leftRange: "41.8° - 99.5°" },
  { id: "4", name: "Strike 4", target: "Right Torso / Shoulder", desc: "A horizontal strike targeting the right side of the torso, including the arm, ribs, or flank.", rightRange: "27.9° - 139.2°", leftRange: "29.6° - 61.0°" },
  { id: "5", name: "Strike 5", target: "Abdomen / Solar Plexus", desc: "A direct thrust or stab targeting the center of the abdomen (solar plexus or belly area).", rightRange: "155.7° - 169.2°", leftRange: "40.4° - 81.2°" },
  { id: "6", name: "Strike 6", target: "Left Chest / Shoulder Thrust", desc: "A high-angle thrust targeting the left side of the upper chest or shoulder pocket.", rightRange: "93.2° - 155.2°", leftRange: "80.4° - 107.2°" },
  { id: "7", name: "Strike 7", target: "Right Chest / Shoulder Thrust", desc: "A high-angle thrust targeting the right side of the upper chest or shoulder pocket.", rightRange: "96.3° - 168.4°", leftRange: "50.7° - 118.8°" },
  { id: "8", name: "Strike 8", target: "Left Knee / Leg", desc: "A downward diagonal strike targeting the left knee joint or lower leg of the opponent.", rightRange: "128.4° - 174.1°", leftRange: "27.7° - 98.2°" },
  { id: "9", name: "Strike 9", target: "Right Knee / Leg", desc: "A downward diagonal strike targeting the right knee joint or lower leg of the opponent.", rightRange: "109.2° - 171.9°", leftRange: "41.1° - 123.3°" },
  { id: "10", name: "Strike 10", target: "Left Eye / Face Thrust", desc: "A precise thrusting strike targeting the left eye, cheek, or side of the face.", rightRange: "112.7° - 153.0°", leftRange: "53.1° - 116.6°" },
  { id: "11", name: "Strike 11", target: "Right Eye / Face Thrust", desc: "A precise thrusting strike targeting the right eye, cheek, or side of the face.", rightRange: "101.6° - 168.3°", leftRange: "48.2° - 133.7°" },
  { id: "12", name: "Strike 12", target: "Crown of the Head", desc: "A vertical overhead strike targeting the top (crown) of the opponent's skull.", rightRange: "90.0° - 130.2°", leftRange: "45.0° - 114.5°" }
];

export default function StrikeGuideScreen() {
  const [activeTab, setActiveTab] = useState<'strikes' | 'pipeline'>('strikes');

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Knowledge Base & Architecture</Text>
        <Text style={styles.headerSubtitle}>Strike Reference & System Pipeline</Text>
      </View>

      {/* Segmented Control Tab Bar */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'strikes' && styles.tabButtonActive]}
          onPress={() => setActiveTab('strikes')}
        >
          <Ionicons name="book-outline" size={16} color={activeTab === 'strikes' ? '#FFFFFF' : '#64748B'} style={{ marginRight: 6 }} />
          <Text style={[styles.tabText, activeTab === 'strikes' && styles.tabTextActive]}>12 Strikes Guide</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'pipeline' && styles.tabButtonActive]}
          onPress={() => setActiveTab('pipeline')}
        >
          <MaterialCommunityIcons name="pipe" size={16} color={activeTab === 'pipeline' ? '#FFFFFF' : '#64748B'} style={{ marginRight: 6 }} />
          <Text style={[styles.tabText, activeTab === 'pipeline' && styles.tabTextActive]}>Pipeline & Scoring</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {activeTab === 'strikes' ? (
          <>
            <Text style={styles.infoIntro}>
              Use this guide to inspect the target joint angle ranges extracted during training. Practice matching these configurations in the pose evaluator!
            </Text>

            {STRIKES_DATA.map((strike) => (
              <View key={strike.id} style={styles.strikeCard}>
                <View style={styles.cardHeader}>
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{strike.id}</Text>
                  </View>
                  <View style={styles.headerTextGroup}>
                    <Text style={styles.strikeTitle}>{strike.name}</Text>
                    <Text style={styles.strikeTarget}>{strike.target}</Text>
                  </View>
                </View>

                <Text style={styles.strikeDesc}>{strike.desc}</Text>

                {/* Target Ranges Grid */}
                <View style={styles.rangesGrid}>
                  <View style={styles.rangeBox}>
                    <Text style={styles.rangeLabel}>RIGHT ELBOW RANGE</Text>
                    <Text style={styles.rangeVal}>{strike.rightRange}</Text>
                  </View>
                  <View style={styles.rangeBox}>
                    <Text style={styles.rangeLabel}>LEFT ELBOW RANGE</Text>
                    <Text style={styles.rangeVal}>{strike.leftRange}</Text>
                  </View>
                </View>
              </View>
            ))}
          </>
        ) : (
          /* PIPELINE & SCORING ARCHITECTURE VISUALIZER */
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
                High-fidelity reference footage of an Arnis master executing the 12 strikes is ingested. Offline inference via **AlphaPose (2D)** generates raw keypoint baselines (`alphapose-results.json`) with maximum spatial precision.
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
                <Text style={styles.stepTitle}>Data Calibration & Standard Deviation Bounds</Text>
              </View>
              <Text style={styles.stepDesc}>
                Joint-to-joint vectors are computed into tabular format (`arnis_dataset_v2.csv`). Standard deviation upper & lower limits establish the exact elbow and stance boundaries for all 12 strikes.
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
                <Text style={styles.stepTitle}>MediaPipe (3D Pose) & HSV Stick Tracking</Text>
              </View>
              <Text style={styles.stepDesc}>
                In-app real-time inference (30+ FPS) powered by **MediaPipe Pose (3D)** with spatial depth estimation ($x, y, z$). Pixel-level HSV color filtering isolates and tracks Rattan, Red, Blue, or Green training sticks.
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
                <Text style={styles.stepTitle}>4-Pillar Kinetic Biomechanical Scoring</Text>
              </View>

              <View style={styles.formulaBox}>
                <Text style={styles.formulaText}>
                  Score = (0.40 × Striking Arm) + (0.25 × Kalasag Guard) + (0.20 × Tindig Stance) + (0.15 × Pitik Wrist)
                </Text>
              </View>

              <View style={styles.weightList}>
                <View style={styles.weightItem}>
                  <Text style={[styles.weightPct, { color: '#3B82F6' }]}>40%</Text>
                  <Text style={styles.weightLabel}>Striking Arm & Elbow Angle Trajectory</Text>
                </View>
                <View style={styles.weightItem}>
                  <Text style={[styles.weightPct, { color: '#10B981' }]}>25%</Text>
                  <Text style={styles.weightLabel}>Check Hand Defense (Kalasag Chest Guard)</Text>
                </View>
                <View style={styles.weightItem}>
                  <Text style={[styles.weightPct, { color: '#F59E0B' }]}>20%</Text>
                  <Text style={styles.weightLabel}>Stance & Base Stability (Tindig 145°-165°)</Text>
                </View>
                <View style={styles.weightItem}>
                  <Text style={[styles.weightPct, { color: '#8B5CF6' }]}>15%</Text>
                  <Text style={styles.weightLabel}>Wrist Snap (Pitik) & Torso Core Rotation</Text>
                </View>
              </View>
            </View>

            {/* DEFENSE SUMMARY CARD */}
            <View style={styles.defenseCard}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                <Ionicons name="school-outline" size={20} color="#F59E0B" style={{ marginRight: 8 }} />
                <Text style={styles.defenseCardTitle}>Defense Panel Justification (2D vs 3D)</Text>
              </View>
              <Text style={styles.defenseCardBody}>
                • **AlphaPose (2D)** is used for offline ground truth generation because of its maximum spatial precision on high-res expert video.\n
                • **MediaPipe (3D)** is used for mobile app live tracking to provide 30+ FPS edge performance with 3D landmark depth tolerance.\n
                • **Cross-Validation (`validate_pose.py`)**: Evaluated via PCK & MPJPE metrics, confirming **&lt;5% error margin** between MediaPipe live inference and AlphaPose baseline.
              </Text>
            </View>
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
  headerTitle: {
    fontSize: 18,
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
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  infoIntro: {
    color: '#94A3B8',
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 20,
    backgroundColor: '#161930',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  strikeCard: {
    backgroundColor: '#161930',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  badge: {
    width: 32,
    height: 32,
    borderRadius: 6,
    backgroundColor: '#D24B3820',
    borderWidth: 1,
    borderColor: '#D24B38',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  badgeText: {
    color: '#D24B38',
    fontWeight: 'bold',
    fontSize: 14,
  },
  headerTextGroup: {
    flex: 1,
  },
  strikeTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  strikeTarget: {
    fontSize: 12,
    color: '#38BDF8',
    fontWeight: '500',
    marginTop: 1,
  },
  strikeDesc: {
    fontSize: 13,
    color: '#94A3B8',
    lineHeight: 20,
    marginBottom: 14,
  },
  rangesGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  rangeBox: {
    flex: 1,
    backgroundColor: '#0A0C16',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  rangeLabel: {
    fontSize: 8,
    color: '#64748B',
    fontWeight: 'bold',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  rangeVal: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#F59E0B',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#161930',
    marginHorizontal: 20,
    marginTop: 15,
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
    paddingVertical: 10,
    borderRadius: 8,
  },
  tabButtonActive: {
    backgroundColor: '#D24B38',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  tabTextActive: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  pipelineContainer: {
    gap: 8,
  },
  pipelineIntro: {
    color: '#94A3B8',
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 16,
    backgroundColor: '#161930',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  stepCard: {
    backgroundColor: '#161930',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  stepNumBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    marginRight: 10,
  },
  stepNumText: {
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  stepTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFFFFF',
    flex: 1,
  },
  stepDesc: {
    fontSize: 13,
    color: '#94A3B8',
    lineHeight: 19,
  },
  arrowDown: {
    alignItems: 'center',
    marginVertical: 4,
  },
  formulaBox: {
    backgroundColor: '#0F1020',
    borderRadius: 10,
    padding: 12,
    marginTop: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#EC489950',
    alignItems: 'center',
  },
  formulaText: {
    color: '#EC4899',
    fontWeight: 'bold',
    fontSize: 12,
  },
  weightList: {
    gap: 8,
  },
  weightItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F1020',
    padding: 8,
    borderRadius: 8,
  },
  weightPct: {
    width: 40,
    fontWeight: 'bold',
    fontSize: 13,
  },
  weightLabel: {
    color: '#CBD5E1',
    fontSize: 12,
    flex: 1,
  },
  defenseCard: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 16,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#F59E0B50',
  },
  defenseCardTitle: {
    color: '#F59E0B',
    fontSize: 14,
    fontWeight: 'bold',
  },
  defenseCardBody: {
    color: '#CBD5E1',
    fontSize: 12,
    lineHeight: 18,
  },
});
