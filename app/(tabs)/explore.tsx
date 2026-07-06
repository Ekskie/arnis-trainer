import React from 'react';
import { StyleSheet, Text, View, ScrollView } from 'react-native';
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
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>12 Strikes Lessons</Text>
        <Text style={styles.headerSubtitle}>Strike Reference & Angle Guide</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
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
});
