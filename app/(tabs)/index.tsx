import { StrikeRadarChart } from '@/components/StrikeRadarChart';
import { AppTutorialModal } from '@/components/AppTutorialModal';
import { getHistory, getStrikeMasteryStats, MasteryStats, SessionItem } from '@/constants/historyStore';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Dimensions, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');
const TUTORIAL_STORAGE_KEY = '@arnis_tutorial_seen_v1';

export default function HomeDashboardScreen() {
  const router = useRouter();
  const [lastSession, setLastSession] = useState<SessionItem | null>(null);
  const [masteryStats, setMasteryStats] = useState<MasteryStats>(() => getStrikeMasteryStats([]));
  const [showTutorialModal, setShowTutorialModal] = useState(false);

  // Check if first-time user to automatically prompt the interactive tutorial
  useEffect(() => {
    AsyncStorage.getItem(TUTORIAL_STORAGE_KEY).then((seen) => {
      if (!seen) {
        // Small delay to ensure smooth layout render before popping tutorial
        const timer = setTimeout(() => {
          setShowTutorialModal(true);
        }, 600);
        return () => clearTimeout(timer);
      }
    });
  }, []);

  // Fetch the latest session and mastery stats when the dashboard comes into focus
  useFocusEffect(
    React.useCallback(() => {
      let isMounted = true;
      getHistory().then((history) => {
        if (isMounted && history) {
          if (history.length > 0) {
            setLastSession(history[0]);
          } else {
            setLastSession(null);
          }
          setMasteryStats(getStrikeMasteryStats(history));
        }
      });
      return () => {
        isMounted = false;
      };
    }, [])
  );

  const getScoreColor = (score: number) => {
    if (score >= 95) return '#10B981'; // Green
    if (score >= 85) return '#3B82F6'; // Blue
    if (score >= 70) return '#F59E0B'; // Orange
    return '#EF4444'; // Red
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTitleContainer}>
          <View style={styles.logoContainer}>
            <Image
              source={require('@/assets/images/favicon.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </View>
          <View>
            <Text style={styles.headerTitle}>POSEFIX-ARNIS</Text>
            <Text style={styles.headerSubtitle}>Real-time Arnis Evaluation</Text>
          </View>
        </View>

        {/* Tutorial / Help Demo Trigger Button */}
        <TouchableOpacity
          style={styles.headerTutorialBtn}
          activeOpacity={0.8}
          onPress={() => setShowTutorialModal(true)}
        >
          <Ionicons name="help-circle" size={16} color="#F59E0B" style={{ marginRight: 5 }} />
          <Text style={styles.headerTutorialBtnText}>Tutorial Demo</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Welcome Banner Card */}
        <View style={styles.welcomeCard}>
          <Text style={styles.welcomeLabel}>WELCOME</Text>
          <Text style={styles.welcomeTitle}>POSEFIX-ARNIS</Text>
          <Text style={styles.welcomeSubtitle}>Real-time 12 Strikes Evaluation</Text>

          <View style={styles.welcomeButtonsContainer}>
            <TouchableOpacity
              style={styles.primaryButton}
              activeOpacity={0.8}
              onPress={() => router.push('/evaluate')}
            >
              <MaterialCommunityIcons name="target" size={18} color="#FFFFFF" style={styles.buttonIcon} />
              <Text style={styles.primaryButtonText}>Start Camera</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryButton}
              activeOpacity={0.8}
              onPress={() => router.push('/explore')}
            >
              <Ionicons name="book" size={16} color="#F59E0B" style={styles.buttonIcon} />
              <Text style={styles.secondaryButtonText}>12 Strikes</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Interactive App Demo Tutorial Banner */}
        <TouchableOpacity
          style={styles.demoTourCard}
          activeOpacity={0.85}
          onPress={() => setShowTutorialModal(true)}
        >
          <View style={styles.demoTourLeft}>
            <View style={styles.demoTourIconBox}>
              <Ionicons name="sparkles" size={20} color="#F59E0B" />
            </View>
            <View style={{ flex: 1 }}>
              <View style={styles.demoTourTagRow}>
                <Text style={styles.demoTourTag}>GUIDED WALKTHROUGH</Text>
              </View>
              <Text style={styles.demoTourTitle}>App Demo & Practice Guide</Text>
              <Text style={styles.demoTourSub}>
                Learn Practice Mode, score formulas & live visual cues
              </Text>
            </View>
          </View>
          <View style={styles.demoTourBtn}>
            <Text style={styles.demoTourBtnText}>Take Tour</Text>
            <Ionicons name="arrow-forward" size={14} color="#FFFFFF" />
          </View>
        </TouchableOpacity>

        {/* 12 Strikes Mastery Radar Chart */}
        <StrikeRadarChart masteryStats={masteryStats} />

        {/* Last Session Section */}
        <Text style={styles.sectionHeading}>LAST SESSION</Text>
        {lastSession ? (
          <View style={styles.lastSessionCard}>
            <View
              style={[
                styles.scoreCircle,
                { borderColor: getScoreColor(lastSession.score) }
              ]}
            >
              <Text style={styles.scoreText}>{lastSession.score}</Text>
            </View>

            <View style={styles.sessionDetails}>
              <Text style={styles.sessionTitle}>{lastSession.strikeName}</Text>
              <Text style={styles.sessionSub}>{lastSession.description} · {lastSession.date.split(' · ')[0]}</Text>
              <View style={[styles.gradePill, { backgroundColor: getScoreColor(lastSession.score) + '20' }]}>
                <Text style={[styles.gradeText, { color: getScoreColor(lastSession.score) }]}>
                  {lastSession.grade}
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#475569" />
          </View>
        ) : (
          <View style={styles.emptySessionCard}>
            <Text style={styles.emptyText}>No evaluations recorded yet.</Text>
            <TouchableOpacity onPress={() => router.push('/evaluate')}>
              <Text style={styles.emptyLink}>Perform your first strike check</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Quick Access Section */}
        <Text style={styles.sectionHeading}>QUICK ACCESS</Text>
        <View style={styles.grid}>
          <TouchableOpacity
            style={styles.gridItem}
            activeOpacity={0.7}
            onPress={() => router.push('/history')}
          >
            <Ionicons name="bar-chart" size={24} color="#3B82F6" style={styles.gridIcon} />
            <Text style={styles.gridText}>Progress History</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.gridItem}
            activeOpacity={0.7}
            onPress={() => router.push('/chat')}
          >
            <Ionicons name="chatbubble-ellipses" size={24} color="#10B981" style={styles.gridIcon} />
            <Text style={styles.gridText}>Coach Assistant</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.gridItem}
            activeOpacity={0.7}
            onPress={() => router.push('/explore')}
          >
            <Ionicons name="book" size={24} color="#F59E0B" style={styles.gridIcon} />
            <Text style={styles.gridText}>12 Strikes Lessons</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.gridItem}
            activeOpacity={0.7}
            onPress={() => router.push('/evaluate')}
          >
            <MaterialCommunityIcons name="target" size={26} color="#EF4444" style={styles.gridIcon} />
            <Text style={styles.gridText}>New Evaluation</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Interactive App Demo Tutorial Walkthrough Modal */}
      <AppTutorialModal
        visible={showTutorialModal}
        onClose={() => setShowTutorialModal(false)}
        onNavigateToPractice={(strikeId) => {
          router.push({
            pathname: '/evaluate',
            params: { strikeId: strikeId || 'strike_1' },
          });
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F1020', // Sleek dark storyboard background
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#161930',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTutorialBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#334155',
  },
  headerTutorialBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#F59E0B',
    letterSpacing: 0.4,
  },
  logoContainer: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#1E293B',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#334155',
    overflow: 'hidden',
  },
  logoImage: {
    width: 32,
    height: 32,
    borderRadius: 6,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    letterSpacing: 1.2,
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  welcomeCard: {
    borderRadius: 16,
    backgroundColor: '#161930', // Card background from storyboard
    padding: 24,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#1E293B',
    shadowColor: '#D24B38',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 3,
  },
  demoTourCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#13162D',
    borderRadius: 16,
    padding: 16,
    marginBottom: 25,
    borderWidth: 1,
    borderColor: '#2A3352',
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  demoTourLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  demoTourIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#F59E0B20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#F59E0B40',
  },
  demoTourTagRow: {
    marginBottom: 2,
  },
  demoTourTag: {
    fontSize: 9,
    fontWeight: '800',
    color: '#F59E0B',
    letterSpacing: 1,
  },
  demoTourTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  demoTourSub: {
    fontSize: 11,
    color: '#94A3B8',
    lineHeight: 15,
  },
  demoTourBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D24B38',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 4,
  },
  demoTourBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  welcomeLabel: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#F59E0B',
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  welcomeSubtitle: {
    fontSize: 14,
    color: '#94A3B8',
    marginBottom: 20,
  },
  welcomeButtonsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  primaryButton: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#D24B38',
    borderRadius: 10,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonIcon: {
    marginRight: 6,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  secondaryButton: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#1E293B',
    borderRadius: 10,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  secondaryButtonText: {
    color: '#F59E0B',
    fontWeight: 'bold',
    fontSize: 14,
  },
  sectionHeading: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#64748B',
    letterSpacing: 1.5,
    marginBottom: 12,
  },
  lastSessionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#161930',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1E293B',
    marginBottom: 25,
  },
  emptySessionCard: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#161930',
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: '#1E293B',
    marginBottom: 25,
  },
  emptyText: {
    color: '#64748B',
    fontSize: 14,
    marginBottom: 8,
  },
  emptyLink: {
    color: '#D24B38',
    fontWeight: 'bold',
    fontSize: 14,
  },
  scoreCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 4,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  scoreText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  sessionDetails: {
    flex: 1,
    justifyContent: 'center',
  },
  sessionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  sessionSub: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 6,
  },
  gradePill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  gradeText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  gridItem: {
    width: (width - 52) / 2, // 2 column layout taking screen width into account
    backgroundColor: '#161930',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1E293B',
    padding: 20,
    alignItems: 'center',
  },
  gridIcon: {
    marginBottom: 10,
  },
  gridText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
});

