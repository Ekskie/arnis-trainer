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
import { MartialTheme } from '@/constants/theme';

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
      try {
        p.play();
      } catch {
        // Ignore playback abort on unmount/re-render
      }
    }
  });

  // When current strike changes, replace video source asynchronously in player
  useEffect(() => {
    if (player && videoSource) {
      if (typeof player.replaceAsync === 'function') {
        player.replaceAsync(videoSource).then(() => {
          player.playbackRate = playbackSpeed;
          if (visible) {
            try {
              player.play();
              setIsPlaying(true);
            } catch {
              // ignore
            }
          }
        }).catch(() => {});
      } else {
        try {
          player.replace(videoSource);
          player.playbackRate = playbackSpeed;
          if (visible) {
            player.play();
            setIsPlaying(true);
          }
        } catch {
          // ignore
        }
      }
    }
  }, [currentStrikeId, videoSource, player, visible, playbackSpeed]);

  // When playback speed changes, adjust player
  useEffect(() => {
    if (player) {
      try {
        player.playbackRate = playbackSpeed;
      } catch {
        // ignore
      }
    }
  }, [playbackSpeed, player]);

  // When modal is dismissed, pause the video; resume when opened
  useEffect(() => {
    if (!visible && player) {
      try {
        player.pause();
        setIsPlaying(false);
      } catch {
        // ignore
      }
    } else if (visible && player) {
      try {
        player.play();
        setIsPlaying(true);
      } catch {
        // ignore
      }
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
      try {
        if (isPlaying) {
          player.pause();
          setIsPlaying(false);
        } else {
          player.play();
          setIsPlaying(true);
        }
      } catch {
        // ignore
      }
    }
  };

  const handleStartPractice = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (player) {
      try {
        player.pause();
      } catch {
        // ignore
      }
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
              <Ionicons name="close" size={20} color={MartialTheme.colors.text} />
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
                  <MaterialCommunityIcons name="karate" size={42} color={MartialTheme.colors.bamboo} />
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
                  color={MartialTheme.colors.bambooDark}
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
              <View style={{ width: 1, backgroundColor: MartialTheme.colors.border, marginHorizontal: 12 }} />
              <View style={styles.metaItem}>
                <Text style={styles.metaLabel}>BLADE TRAJECTORY</Text>
                <Text style={styles.metaValue}>{strikeData.trajectory}</Text>
              </View>
            </View>

            {/* Kinetic Checklist Box */}
            <View style={styles.cuesContainer}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                <Ionicons name="checkmark-done-circle" size={18} color={MartialTheme.colors.primary} style={{ marginRight: 6 }} />
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
                ⚠️ <Text style={{ color: '#DC2626', fontWeight: 'bold' }}>Common Fault: </Text>
                {strikeData.commonFault}
              </Text>
              <Text style={styles.adviceText}>
                💡 <Text style={{ color: '#15803D', fontWeight: 'bold' }}>Grandmaster Tip: </Text>
                {strikeData.guroAdvice}
              </Text>
            </View>
          </ScrollView>

          {/* Action Buttons Footer */}
          <View style={styles.footerRow}>
            <TouchableOpacity style={styles.secondaryBtn} onPress={onClose} activeOpacity={0.7}>
              <Text style={styles.secondaryBtnText}>Close</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.practiceBtn} onPress={handleStartPractice} activeOpacity={0.85}>
              <MaterialCommunityIcons name="sword" size={17} color="#FFFFFF" style={{ marginRight: 8 }} />
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
    backgroundColor: 'rgba(28, 37, 33, 0.65)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: MartialTheme.colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: height * 0.90,
    borderWidth: 1,
    borderColor: MartialTheme.colors.border,
    paddingBottom: 24,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 14,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderBottomWidth: 1,
    borderBottomColor: MartialTheme.colors.border,
  },
  badgeNum: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#FEF3C7',
    borderWidth: 1.5,
    borderColor: MartialTheme.colors.bamboo,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  badgeNumText: {
    color: MartialTheme.colors.bambooDark,
    fontWeight: '900',
    fontSize: 14,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: MartialTheme.colors.text,
  },
  headerSub: {
    fontSize: 12,
    color: MartialTheme.colors.bambooDark,
    fontWeight: '700',
    marginTop: 1,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F3EFEA',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: MartialTheme.colors.border,
  },
  switcherContainer: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: MartialTheme.colors.border,
    paddingVertical: 10,
  },
  switcherScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  switcherChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: MartialTheme.colors.background,
    borderWidth: 1.5,
    borderColor: MartialTheme.colors.border,
    borderBottomWidth: 3,
    borderBottomColor: MartialTheme.colors.border3D,
  },
  switcherChipActive: {
    backgroundColor: MartialTheme.colors.primary,
    borderColor: MartialTheme.colors.primary,
    borderBottomColor: MartialTheme.colors.primaryDark,
  },
  switcherChipText: {
    fontSize: 12,
    color: MartialTheme.colors.textMuted,
    fontWeight: '800',
  },
  switcherChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '900',
  },
  bodyScroll: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 16,
  },
  videoPlayerBox: {
    width: '100%',
    height: 220,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: '#000000',
    borderWidth: 1.5,
    borderColor: MartialTheme.colors.border,
    marginBottom: 12,
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
    fontWeight: '800',
    fontSize: 15,
    marginTop: 8,
    marginBottom: 4,
  },
  placeholderSub: {
    color: '#94A3B8',
    fontSize: 12,
    textAlign: 'center',
  },
  speedControlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: MartialTheme.colors.border,
    borderBottomWidth: 3,
    borderBottomColor: MartialTheme.colors.border3D,
  },
  playPauseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  playPauseText: {
    color: MartialTheme.colors.bambooDark,
    fontSize: 12,
    fontWeight: '800',
  },
  speedLabel: {
    fontSize: 10,
    color: MartialTheme.colors.textMuted,
    fontWeight: '800',
    letterSpacing: 0.5,
    alignSelf: 'center',
  },
  speedPillsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  speedPill: {
    backgroundColor: MartialTheme.colors.background,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: MartialTheme.colors.border,
  },
  speedPillActive: {
    backgroundColor: '#FEF3C7',
    borderColor: MartialTheme.colors.bamboo,
  },
  speedPillText: {
    fontSize: 11,
    color: MartialTheme.colors.textMuted,
    fontWeight: '700',
  },
  speedPillTextActive: {
    color: MartialTheme.colors.bambooDark,
    fontWeight: '800',
  },
  metaBanner: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: MartialTheme.colors.border,
    borderBottomWidth: 3,
    borderBottomColor: MartialTheme.colors.border3D,
    marginBottom: 12,
  },
  metaItem: {
    flex: 1,
  },
  metaLabel: {
    fontSize: 10,
    color: MartialTheme.colors.bambooDark,
    fontWeight: '800',
    letterSpacing: 0.6,
    marginBottom: 4,
  },
  metaValue: {
    fontSize: 13,
    color: MartialTheme.colors.text,
    fontWeight: '700',
    lineHeight: 18,
  },
  cuesContainer: {
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: MartialTheme.colors.border,
    borderBottomWidth: 3,
    borderBottomColor: MartialTheme.colors.border3D,
    marginBottom: 12,
  },
  cuesHeading: {
    fontSize: 13,
    fontWeight: '800',
    color: MartialTheme.colors.text,
  },
  cueRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 8,
  },
  cueDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: MartialTheme.colors.primary,
    marginTop: 6,
    marginRight: 10,
  },
  cueText: {
    fontSize: 13,
    color: MartialTheme.colors.text,
    lineHeight: 19,
    flex: 1,
  },
  faultBox: {
    backgroundColor: '#FEF3C7',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#FDE68A',
    marginBottom: 12,
  },
  faultText: {
    fontSize: 12,
    color: '#78350F',
    lineHeight: 18,
    marginBottom: 8,
  },
  adviceText: {
    fontSize: 12,
    color: '#14532D',
    lineHeight: 18,
  },
  footerRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 10,
    gap: 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: MartialTheme.colors.border,
  },
  secondaryBtn: {
    paddingHorizontal: 18,
    paddingVertical: 13,
    borderRadius: 14,
    backgroundColor: MartialTheme.colors.background,
    borderWidth: 1.5,
    borderColor: MartialTheme.colors.border,
    borderBottomWidth: 3,
    borderBottomColor: MartialTheme.colors.border3D,
    justifyContent: 'center',
    alignItems: 'center',
  },
  secondaryBtnText: {
    color: MartialTheme.colors.textMuted,
    fontWeight: '800',
    fontSize: 14,
  },
  practiceBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: MartialTheme.colors.primary,
    paddingVertical: 13,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: MartialTheme.colors.primary,
    borderBottomWidth: 4,
    borderBottomColor: MartialTheme.colors.primaryDark,
  },
  practiceBtnText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 14,
    letterSpacing: 0.3,
  },
});
