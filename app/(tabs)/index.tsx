import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { getHistory, SessionItem } from '@/constants/historyStore';

const { width } = Dimensions.get('window');

export default function HomeDashboardScreen() {
  const router = useRouter();
  const [lastSession, setLastSession] = useState<SessionItem | null>(null);

  // Fetch the latest session when the dashboard comes into focus
  useFocusEffect(
    React.useCallback(() => {
      let isMounted = true;
      getHistory().then((history) => {
        if (isMounted && history && history.length > 0) {
          setLastSession(history[0]);
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
            <MaterialCommunityIcons name="sword-cross" size={20} color="#FFFFFF" />
          </View>
          <View>
            <Text style={styles.headerTitle}>POSEFIX-ARNIS</Text>
            <Text style={styles.headerSubtitle}>Real-time Arnis Evaluation</Text>
          </View>
        </View>
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
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoContainer: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#D24B38',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
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
    marginBottom: 25,
    borderWidth: 1,
    borderColor: '#1E293B',
    // Gradient mock
    shadowColor: '#D24B38',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 3,
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
