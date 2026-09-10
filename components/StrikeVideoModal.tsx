import React, { useEffect, useState } from 'react';
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
import { LOCAL_STRIKE_VIDEOS, STRIKE_VIDEOS_CATALOG, StrikeVideoItem } from '@/constants/strikeVideos';

const { height } = Dimensions.get('window');

export interface StrikeVideoModalProps {
  visible: boolean;
  initialStrikeId?: string;
  onClose: () => void;
  onPracticeStrike?: (strikeId: string) => void;
}

export function StrikeVideoModal({
  visible,
  initialStrikeId = 'strike_1',
  onClose,
  onPracticeStrike,
}: StrikeVideoModalProps) {
  const [currentStrikeId, setCurrentStrikeId] = useState<string>(initialStrikeId);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);

  // Sync initialStrikeId whenever modal becomes visible
  useEffect(() => {
    if (visible && initialStrikeId) {
      setCurrentStrikeId(initialStrikeId);
      setIsPlaying(true);
    }
  }, [visible, initialStrikeId]);

  const strikeData: StrikeVideoItem = STRIKE_VIDEOS_CATALOG[currentStrikeId] || STRIKE_VIDEOS_CATALOG['strike_1'];
  const videoSource = LOCAL_STRIKE_VIDEOS[currentStrikeId] || strikeData.videoSource || null;

  const player = useVideoPlayer(videoSource, (p) => {
    p.loop = true;
    p.playbackRate = playbackSpeed;
    if (visible) {
      p.play();
    }
  });

  // When current strike changes, replace video source asynchronously in player
  useEffect(() => {
    if (player && videoSource) {
      if (typeof player.replaceAsync === 'function') {
        player.replaceAsync(videoSource).then(() => {
          player.playbackRate = playbackSpeed;
          if (visible) {
            player.play();
            setIsPlaying(true);
          }
        }).catch(() => {});
      } else {
        player.replace(videoSource);
        player.playbackRate = playbackSpeed;
        if (visible) {
          player.play();
          setIsPlaying(true);
        }
      }
    }
  }, [currentStrikeId, videoSource, player, visible, playbackSpeed]);

  // When playback speed changes, adjust player
  useEffect(() => {
    if (player) {
      player.playbackRate = playbackSpeed;
    }
  }, [playbackSpeed, player]);

  // When modal is dismissed, pause the video; resume when opened
  useEffect(() => {
    if (!visible && player) {
      player.pause();
      setIsPlaying(false);
    } else if (visible && player) {
      player.play();
      setIsPlaying(true);
    }
  }, [visible, player]);

  const handleSelectStrike = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCurrentStrikeId(id);
  };

  const handleSpeedChange = (speed: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPlaybackSpeed(speed);
  };

  const togglePlayPause = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (player) {
      if (isPlaying) {
        player.pause();
        setIsPlaying(false);
      } else {
        player.play();
        setIsPlaying(true);
      }
    }
  };

  const handleStartPractice = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (player) {
      player.pause();
    }
    onClose();
    if (onPracticeStrike) {
      onPracticeStrike(currentStrikeId);
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
        <View style={styles.modalCard}>
          {/* Header */}
          <View style={styles.headerRow}>
            <View style={styles.badgeNum}>
              <Text style={styles.badgeNumText}>S{strikeData.strikeNumber}</Text>
            </View>
            <View style={{ flex: 1, marginRight: 8 }}>
              <Text style={styles.headerTitle}>{strikeData.name}</Text>
              <Text style={styles.headerSub}>{strikeData.filipinoName}</Text>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.7}>
              <Ionicons name="close" size={20} color="#94A3B8" />
            </TouchableOpacity>
          </View>

          {/* 12-Strike Quick Switcher Strip */}
          <View style={styles.switcherContainer}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.switcherScroll}
            >
              {Object.values(STRIKE_VIDEOS_CATALOG).map((item) => {
                const isActive = item.id === currentStrikeId;
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={[styles.switcherChip, isActive && styles.switcherChipActive]}
                    onPress={() => handleSelectStrike(item.id)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.switcherChipText, isActive && styles.switcherChipTextActive]}>
                      S{item.strikeNumber}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* Main Scrollable Content */}
          <ScrollView
            style={styles.bodyScroll}
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            {/* Native Video Player Box */}
            <View style={styles.videoPlayerBox}>
              {videoSource ? (
                <VideoView
                  player={player}
                  style={styles.nativeVideo}
                  fullscreenOptions={{ enable: true }}
                  allowsPictureInPicture
                  contentFit="contain"
                  nativeControls
                />
              ) : (
                <View style={styles.placeholderBox}>
                  <MaterialCommunityIcons name="karate" size={42} color="#F59E0B" />
                  <Text style={styles.placeholderTitle}>Demonstration Video Ready</Text>
                  <Text style={styles.placeholderSub}>
                    Place your video into: assets/videos/{strikeData.id}.mp4
                  </Text>
                </View>
              )}
            </View>

            {/* Speed & Playback Control Strip */}
            <View style={styles.speedControlRow}>
              <TouchableOpacity
                style={styles.playPauseBtn}
                onPress={togglePlayPause}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={isPlaying ? "pause" : "play"}
                  size={14}
                  color="#F59E0B"
                  style={{ marginRight: 5 }}
                />
                <Text style={styles.playPauseText}>{isPlaying ? "Pause" : "Play"}</Text>
              </TouchableOpacity>

              <View style={styles.speedPillsRow}>
                <Text style={styles.speedLabel}>SPEED:</Text>
                {[0.5, 0.75, 1.0].map((spd) => (
                  <TouchableOpacity
                    key={spd}
                    style={[styles.speedPill, playbackSpeed === spd && styles.speedPillActive]}
                    onPress={() => handleSpeedChange(spd)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.speedPillText, playbackSpeed === spd && styles.speedPillTextActive]}>
                      {spd === 0.5 ? '0.5× Slow' : `${spd}×`}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Tactical Target & Trajectory Banner */}
            <View style={styles.metaBanner}>
              <View style={styles.metaItem}>
                <Text style={styles.metaLabel}>TARGET ZONE</Text>
                <Text style={styles.metaValue}>{strikeData.target}</Text>
              </View>
              <View style={{ width: 1, backgroundColor: '#334155', marginHorizontal: 10 }} />
              <View style={styles.metaItem}>
                <Text style={styles.metaLabel}>BLADE TRAJECTORY</Text>
                <Text style={styles.metaValue}>{strikeData.trajectory}</Text>
              </View>
            </View>

            {/* Kinetic Checklist Box */}
            <View style={styles.cuesContainer}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                <Ionicons name="checkmark-done-circle" size={16} color="#10B981" style={{ marginRight: 6 }} />
                <Text style={styles.cuesHeading}>Execution Kinetic Checklist</Text>
              </View>
              {strikeData.keyCues.map((cue, index) => (
                <View key={index} style={styles.cueRow}>
                  <View style={styles.cueDot} />
                  <Text style={styles.cueText}>{cue}</Text>
                </View>
              ))}
            </View>

            {/* Guro Advice & Fault Card */}
            <View style={styles.faultBox}>
              <Text style={styles.faultText}>
                ⚠️ <Text style={{ color: '#EF4444', fontWeight: 'bold' }}>Common Fault: </Text>
                {strikeData.commonFault}
              </Text>
              <Text style={styles.adviceText}>
                💡 <Text style={{ color: '#10B981', fontWeight: 'bold' }}>Grandmaster Tip: </Text>
                {strikeData.guroAdvice}
              </Text>
            </View>
          </ScrollView>

          {/* Action Buttons Footer */}
          <View style={styles.footerRow}>
            <TouchableOpacity style={styles.secondaryBtn} onPress={onClose} activeOpacity={0.7}>
              <Text style={styles.secondaryBtnText}>Close</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.practiceBtn} onPress={handleStartPractice} activeOpacity={0.8}>
              <MaterialCommunityIcons name="sword" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.practiceBtnText}>Practice Strike {strikeData.strikeNumber} with AI</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(5, 7, 15, 0.85)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#0A0C16',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: height * 0.90,
    borderWidth: 1,
    borderColor: '#1E293B',
    paddingBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 20,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#161930',
  },
  badgeNum: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: '#D24B3825',
    borderWidth: 1,
    borderColor: '#D24B38',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  badgeNumText: {
    color: '#D24B38',
    fontWeight: 'bold',
    fontSize: 13,
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  headerSub: {
    fontSize: 11.5,
    color: '#F59E0B',
    fontWeight: '600',
    marginTop: 1,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#161930',
    justifyContent: 'center',
    alignItems: 'center',
  },
  switcherContainer: {
    backgroundColor: '#0E1122',
    borderBottomWidth: 1,
    borderBottomColor: '#161930',
    paddingVertical: 8,
  },
  switcherScroll: {
    paddingHorizontal: 14,
    gap: 6,
  },
  switcherChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#161930',
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  switcherChipActive: {
    backgroundColor: '#D24B38',
    borderColor: '#D24B38',
  },
  switcherChipText: {
    fontSize: 11.5,
    color: '#94A3B8',
    fontWeight: '600',
  },
  switcherChipTextActive: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  bodyScroll: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
  },
  videoPlayerBox: {
    width: '100%',
    height: 220,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#000000',
    borderWidth: 1,
    borderColor: '#1E293B',
    marginBottom: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  nativeVideo: {
    width: '100%',
    height: '100%',
  },
  placeholderBox: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderTitle: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
    marginTop: 8,
    marginBottom: 4,
  },
  placeholderSub: {
    color: '#94A3B8',
    fontSize: 11.5,
    textAlign: 'center',
  },
  speedControlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#161930',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  playPauseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F1020',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#F59E0B50',
  },
  playPauseText: {
    color: '#F59E0B',
    fontSize: 11,
    fontWeight: 'bold',
  },
  speedLabel: {
    fontSize: 10,
    color: '#94A3B8',
    fontWeight: 'bold',
    letterSpacing: 0.5,
    alignSelf: 'center',
  },
  speedPillsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  speedPill: {
    backgroundColor: '#0F1020',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#334155',
  },
  speedPillActive: {
    backgroundColor: '#F59E0B25',
    borderColor: '#F59E0B',
  },
  speedPillText: {
    fontSize: 10.5,
    color: '#94A3B8',
    fontWeight: 'bold',
  },
  speedPillTextActive: {
    color: '#F59E0B',
  },
  metaBanner: {
    flexDirection: 'row',
    backgroundColor: '#161930',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1E293B',
    marginBottom: 12,
  },
  metaItem: {
    flex: 1,
  },
  metaLabel: {
    fontSize: 9,
    color: '#64748B',
    fontWeight: 'bold',
    letterSpacing: 0.5,
    marginBottom: 3,
  },
  metaValue: {
    fontSize: 12,
    color: '#E2E8F0',
    fontWeight: '600',
  },
  cuesContainer: {
    backgroundColor: '#161930',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1E293B',
    marginBottom: 12,
  },
  cuesHeading: {
    fontSize: 12.5,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  cueRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 6,
  },
  cueDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
    marginTop: 6,
    marginRight: 8,
  },
  cueText: {
    fontSize: 12,
    color: '#CBD5E1',
    lineHeight: 18,
    flex: 1,
  },
  faultBox: {
    backgroundColor: '#1E1B18',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#F59E0B30',
    marginBottom: 10,
  },
  faultText: {
    fontSize: 11.5,
    color: '#E2E8F0',
    lineHeight: 17,
    marginBottom: 6,
  },
  adviceText: {
    fontSize: 11.5,
    color: '#E2E8F0',
    lineHeight: 17,
  },
  footerRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 8,
    gap: 10,
  },
  secondaryBtn: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#161930',
    borderWidth: 1,
    borderColor: '#1E293B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  secondaryBtnText: {
    color: '#94A3B8',
    fontWeight: 'bold',
    fontSize: 13,
  },
  practiceBtn: {
    flex: 1,
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
});
