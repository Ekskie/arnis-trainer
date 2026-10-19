import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Image,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useVideoPlayer, VideoView } from 'expo-video';
import { WebView } from 'react-native-webview';
import * as Haptics from 'expo-haptics';

import { MartialTheme } from '@/constants/theme';
import { CoachStrikeReferenceItem } from '@/constants/referenceStore';
import { StrikeRule } from '@/constants/strikeRules';
import { getRecentSessionVideos } from '@/services/videoCacheManager';

export interface ComparisonPlayerProps {
  visible: boolean;
  onClose: () => void;
  strikeRule: StrikeRule;
  coachReference: CoachStrikeReferenceItem;
  userVideoUri?: string | null;
  userSnapshotUri?: string | null;
  userImpactTime?: number;
  coachImpactTime?: number;
}

export function ComparisonPlayer({
  visible,
  onClose,
  strikeRule,
  coachReference,
  userVideoUri,
  userSnapshotUri,
  userImpactTime = 1.45,
  coachImpactTime = 1.47,
}: ComparisonPlayerProps) {
  const userWebRef = useRef<WebView>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);
  const [effectiveUserVideo, setEffectiveUserVideo] = useState<string | null>(userVideoUri || null);
  const [currentTimeProgress, setCurrentTimeProgress] = useState(0.4); // 0.0 to 1.0 progress for scrub slider
  const totalVideoDuration = 3.5; // Canonical duration estimate

  // Look up recent session video from videoCacheManager if not passed directly
  useEffect(() => {
    if (userVideoUri) {
      setEffectiveUserVideo(userVideoUri);
    } else if (visible) {
      getRecentSessionVideos().then((recent) => {
        if (recent && recent.length > 0) {
          setEffectiveUserVideo(recent[0]);
        }
      });
    }
  }, [userVideoUri, visible]);

  // Native hardware-accelerated coach video player
  const coachPlayer = useVideoPlayer(coachReference.videoSource, (p) => {
    p.loop = true;
    p.playbackRate = playbackSpeed;
    if (visible) {
      try {
        p.play();
      } catch {
        // ignore
      }
    }
  });

  // Source object for user video if available as file URI or bundle
  const userVideoSource = useMemo(() => {
    if (!effectiveUserVideo) return null;
    if (effectiveUserVideo.startsWith('data:video')) {
      // WebView fallback for raw base64 data URLs
      return null;
    }
    return { uri: effectiveUserVideo };
  }, [effectiveUserVideo]);

  const userPlayer = useVideoPlayer(userVideoSource, (p) => {
    p.loop = true;
    p.playbackRate = playbackSpeed;
    if (visible) {
      try {
        p.play();
      } catch {
        // ignore
      }
    }
  });

  // Synchronize playback speed
  useEffect(() => {
    if (coachPlayer) {
      try {
        coachPlayer.playbackRate = playbackSpeed;
      } catch {}
    }
    if (userPlayer) {
      try {
        userPlayer.playbackRate = playbackSpeed;
      } catch {}
    }
    userWebRef.current?.injectJavaScript(`
      var v = document.querySelector('video');
      if (v) { v.playbackRate = ${playbackSpeed}; }
      true;
    `);
  }, [playbackSpeed, coachPlayer, userPlayer]);

  // Synchronized playback timeline progress tracker
  useEffect(() => {
    if (!visible || !isPlaying) return;
    const interval = setInterval(() => {
      if (coachPlayer) {
        try {
          const dur = coachPlayer.duration > 0 ? coachPlayer.duration : totalVideoDuration;
          const cur = coachPlayer.currentTime;
          if (dur > 0 && typeof cur === 'number') {
            const progress = Math.max(0, Math.min(1, cur / dur));
            setCurrentTimeProgress(progress);
          }
        } catch {}
      }
    }, 100);
    return () => clearInterval(interval);
  }, [visible, isPlaying, coachPlayer]);

  // Pause when dismissed; resume when opened
  useEffect(() => {
    if (!visible) {
      if (coachPlayer) {
        try {
          coachPlayer.pause();
        } catch {}
      }
      if (userPlayer) {
        try {
          userPlayer.pause();
        } catch {}
      }
      userWebRef.current?.injectJavaScript(`
        var v = document.querySelector('video');
        if (v) { v.pause(); }
        true;
      `);
      setIsPlaying(false);
    } else {
      if (coachPlayer) {
        try {
          coachPlayer.play();
        } catch {}
      }
      if (userPlayer) {
        try {
          userPlayer.play();
        } catch {}
      }
      userWebRef.current?.injectJavaScript(`
        var v = document.querySelector('video');
        if (v) { v.play(); }
        true;
      `);
      setIsPlaying(true);
    }
    return () => {
      if (coachPlayer) {
        try {
          coachPlayer.pause();
        } catch {}
      }
      if (userPlayer) {
        try {
          userPlayer.pause();
        } catch {}
      }
    };
  }, [visible, coachPlayer, userPlayer]);

  // Synchronized Play / Pause
  const togglePlayPause = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    const nextState = !isPlaying;
    setIsPlaying(nextState);

    if (coachPlayer) {
      try {
        if (nextState) coachPlayer.play();
        else coachPlayer.pause();
      } catch {}
    }

    if (userPlayer) {
      try {
        if (nextState) userPlayer.play();
        else userPlayer.pause();
      } catch {}
    }

    const userAction = nextState ? 'play()' : 'pause()';
    userWebRef.current?.injectJavaScript(`
      var v = document.querySelector('video');
      if (v) { v.${userAction}; }
      true;
    `);
  };

  // Synchronized 0.5x Slow-Motion Toggle
  const toggleSpeed = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    const nextSpeed = playbackSpeed === 1.0 ? 0.5 : 1.0;
    setPlaybackSpeed(nextSpeed);
  };

  // Synchronized Jump to Impact Apex
  const jumpToImpact = () => {
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    setIsPlaying(false);
    setCurrentTimeProgress(coachImpactTime / totalVideoDuration);

    if (coachPlayer) {
      try {
        coachPlayer.pause();
        coachPlayer.currentTime = coachImpactTime;
      } catch {}
    }

    if (userPlayer) {
      try {
        userPlayer.pause();
        userPlayer.currentTime = userImpactTime;
      } catch {}
    }

    userWebRef.current?.injectJavaScript(`
      var v = document.querySelector('video');
      if (v) {
        v.pause();
        v.currentTime = ${userImpactTime};
      }
      true;
    `);
  };

  // Synchronized Restart from Beginning
  const restartBoth = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setIsPlaying(true);
    setCurrentTimeProgress(0);

    if (coachPlayer) {
      try {
        coachPlayer.currentTime = 0;
        coachPlayer.play();
      } catch {}
    }

    if (userPlayer) {
      try {
        userPlayer.currentTime = 0;
        userPlayer.play();
      } catch {}
    }

    userWebRef.current?.injectJavaScript(`
      var v = document.querySelector('video');
      if (v) {
        v.currentTime = 0;
        v.play();
      }
      true;
    `);
  };

  // Interactive Scrub Handler
  const handleScrub = (ratio: number) => {
    const clampedRatio = Math.max(0, Math.min(1, ratio));
    setCurrentTimeProgress(clampedRatio);
    const targetTime = clampedRatio * totalVideoDuration;

    if (coachPlayer) {
      try {
        coachPlayer.currentTime = targetTime;
      } catch {}
    }

    if (userPlayer) {
      try {
        userPlayer.currentTime = targetTime;
      } catch {}
    }

    userWebRef.current?.injectJavaScript(`
      var v = document.querySelector('video');
      if (v) { v.currentTime = ${targetTime}; }
      true;
    `);
  };

  const userVideoHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <style>
          body { margin: 0; background: #000; display: flex; align-items: center; justify-content: center; height: 100vh; overflow: hidden; }
          video { width: 100%; height: 100%; object-fit: contain; }
        </style>
      </head>
      <body>
        <video id="userVid" src="${effectiveUserVideo || ''}" autoplay loop muted playsinline controls></video>
      </body>
    </html>
  `;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.container}>
        {/* Top Header */}
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <View style={styles.badgeRow}>
              <Text style={styles.headerSuper}>COACH VS YOU</Text>
              <View style={styles.syncBadge}>
                <Text style={styles.syncBadgeText}>SYNCHRONIZED REVIEW</Text>
              </View>
            </View>
            <Text style={styles.headerTitle}>{strikeRule.name}</Text>
          </View>

          <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
            <Ionicons name="close" size={24} color={MartialTheme.colors.text} />
          </TouchableOpacity>
        </View>

        {/* --- Synchronized Scrub Timeline Slider --- */}
        <View style={styles.scrubberContainer}>
          <View style={styles.scrubHeaderRow}>
            <Text style={styles.scrubLabel}>SYNCHRONIZED TIMELINE</Text>
            <Text style={styles.scrubTimeText}>
              {(currentTimeProgress * totalVideoDuration).toFixed(2)}s / {totalVideoDuration.toFixed(1)}s
            </Text>
          </View>
          <TouchableOpacity
            style={styles.scrubTrack}
            activeOpacity={0.9}
            onPress={(e) => {
              const { locationX } = e.nativeEvent;
              // Assuming 340px width approximate track
              const ratio = Math.max(0, Math.min(1, locationX / 320));
              handleScrub(ratio);
            }}
          >
            <View style={[styles.scrubFill, { width: `${Math.round(currentTimeProgress * 100)}%` }]} />
            <View
              style={[
                styles.scrubImpactMarker,
                { left: `${Math.round((coachImpactTime / totalVideoDuration) * 100)}%` },
              ]}
            >
              <View style={styles.scrubImpactDot} />
            </View>
          </TouchableOpacity>
        </View>

        {/* --- Video Comparison Viewport --- */}
        <View style={styles.viewport}>
          {/* 1. Upper: Coach Video (Native Hardware-Accelerated) */}
          <View style={styles.playerContainer}>
            <View style={styles.playerHeader}>
              <View style={styles.playerTagCoach}>
                <Text style={styles.playerTagCoachText}>COACH (EXPERT FORM)</Text>
              </View>
              <Text style={styles.playerImpactPill}>Impact @ {coachImpactTime.toFixed(2)}s</Text>
            </View>
            <View style={styles.videoWrapper}>
              <VideoView
                player={coachPlayer}
                style={{ width: '100%', height: '100%' }}
                contentFit="contain"
                allowsPictureInPicture={false}
              />
            </View>
          </View>

          {/* 2. Lower: User Recorded Strike Video (or Apex Snapshot Fallback) */}
          <View style={styles.playerContainer}>
            <View style={styles.playerHeader}>
              <View style={styles.playerTagUser}>
                <Text style={styles.playerTagUserText}>YOUR TECHNIQUE</Text>
              </View>
              <Text style={styles.playerImpactPill}>
                {effectiveUserVideo ? `Impact @ ${userImpactTime.toFixed(2)}s` : 'Apex Snapshot'}
              </Text>
            </View>
            <View style={styles.videoWrapper}>
              {userVideoSource ? (
                <VideoView
                  player={userPlayer}
                  style={{ width: '100%', height: '100%' }}
                  contentFit="contain"
                  allowsPictureInPicture={false}
                />
              ) : effectiveUserVideo && effectiveUserVideo.startsWith('data:video') ? (
                <WebView
                  ref={userWebRef}
                  originWhitelist={['*']}
                  source={{ html: userVideoHtml }}
                  style={{ flex: 1 }}
                  allowsInlineMediaPlayback={true}
                  mediaPlaybackRequiresUserAction={false}
                />
              ) : userSnapshotUri ? (
                <View style={styles.snapshotFallbackWrapper}>
                  <Image
                    source={{ uri: userSnapshotUri }}
                    style={styles.snapshotFallbackImage}
                    resizeMode="contain"
                  />
                  <View style={styles.snapshotFallbackTag}>
                    <Ionicons name="camera" size={12} color="#FFFFFF" style={{ marginRight: 4 }} />
                    <Text style={styles.snapshotFallbackTagText}>Apex Impact Snapshot</Text>
                  </View>
                </View>
              ) : (
                <View style={styles.noVideoPlaceholder}>
                  <Ionicons name="videocam-off-outline" size={36} color={MartialTheme.colors.textMuted} />
                  <Text style={styles.noVideoText}>No recorded user video for this session</Text>
                  <Text style={styles.noVideoSub}>Complete a camera evaluation drill to review your replay</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* --- Synchronized Control Bar --- */}
        <View style={styles.controlBar}>
          <TouchableOpacity
            style={styles.controlBtnSecondary}
            onPress={restartBoth}
            activeOpacity={0.75}
          >
            <Ionicons name="refresh" size={17} color={MartialTheme.colors.text} />
            <Text style={styles.controlBtnSecondaryText}>Restart</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.speedToggleBtn, playbackSpeed === 0.5 && styles.speedToggleBtnActive]}
            onPress={toggleSpeed}
            activeOpacity={0.75}
          >
            <MaterialCommunityIcons
              name="speedometer"
              size={16}
              color={playbackSpeed === 0.5 ? MartialTheme.colors.bambooDark : MartialTheme.colors.text}
              style={{ marginRight: 4 }}
            />
            <Text
              style={[
                styles.speedToggleText,
                playbackSpeed === 0.5 && styles.speedToggleTextActive,
              ]}
            >
              {playbackSpeed === 0.5 ? '0.5× Slow' : '1.0× Speed'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.jumpImpactBtn}
            onPress={jumpToImpact}
            activeOpacity={0.8}
          >
            <Ionicons name="locate" size={16} color="#FFFFFF" style={{ marginRight: 5 }} />
            <Text style={styles.jumpImpactBtnText}>Apex Impact</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.controlBtnPrimary}
            onPress={togglePlayPause}
            activeOpacity={0.75}
          >
            <Ionicons name={isPlaying ? 'pause' : 'play'} size={17} color="#FFFFFF" />
            <Text style={styles.controlBtnPrimaryText}>{isPlaying ? 'Pause' : 'Play'}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: MartialTheme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: MartialTheme.colors.border,
    backgroundColor: '#FFFFFF',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 3,
  },
  headerSuper: {
    fontSize: 10,
    fontWeight: '900',
    color: MartialTheme.colors.bambooDark,
    letterSpacing: 0.8,
  },
  syncBadge: {
    backgroundColor: MartialTheme.colors.bambooMuted,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  syncBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#92400E',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: MartialTheme.colors.text,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F3EFE6',
    borderWidth: 1,
    borderColor: MartialTheme.colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Scrubber
  scrubberContainer: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: MartialTheme.colors.border,
  },
  scrubHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  scrubLabel: {
    fontSize: 9.5,
    fontWeight: '900',
    color: MartialTheme.colors.textMuted,
    letterSpacing: 0.6,
  },
  scrubTimeText: {
    fontSize: 11,
    fontWeight: '800',
    color: MartialTheme.colors.text,
  },
  scrubTrack: {
    height: 10,
    backgroundColor: '#E2E8F0',
    borderRadius: 5,
    position: 'relative',
    overflow: 'hidden',
  },
  scrubFill: {
    height: '100%',
    backgroundColor: MartialTheme.colors.primary,
    borderRadius: 5,
  },
  scrubImpactMarker: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 14,
    marginLeft: -7,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrubImpactDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#F59E0B',
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },

  // Viewport
  viewport: {
    flex: 1,
    padding: 14,
    gap: 12,
  },
  playerContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: MartialTheme.colors.border,
    borderBottomWidth: 3.5,
    borderBottomColor: MartialTheme.colors.border3D,
  },
  playerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  playerTagCoach: {
    backgroundColor: MartialTheme.colors.primaryMuted,
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  playerTagCoachText: {
    fontSize: 10,
    fontWeight: '900',
    color: MartialTheme.colors.primaryDark,
    letterSpacing: 0.5,
  },
  playerTagUser: {
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  playerTagUserText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#1E40AF',
    letterSpacing: 0.5,
  },
  playerImpactPill: {
    fontSize: 10,
    fontWeight: '700',
    color: MartialTheme.colors.textSecondary,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  videoWrapper: {
    flex: 1,
    backgroundColor: '#000000',
  },
  snapshotFallbackWrapper: {
    flex: 1,
    position: 'relative',
    backgroundColor: '#0F172A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  snapshotFallbackImage: {
    width: '100%',
    height: '100%',
  },
  snapshotFallbackTag: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  snapshotFallbackTagText: {
    fontSize: 10,
    color: '#FFFFFF',
    fontWeight: '800',
  },
  noVideoPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: MartialTheme.colors.background,
    padding: 16,
  },
  noVideoText: {
    fontSize: 13,
    fontWeight: '800',
    color: MartialTheme.colors.textSecondary,
    marginTop: 8,
    textAlign: 'center',
  },
  noVideoSub: {
    fontSize: 11,
    color: MartialTheme.colors.textMuted,
    marginTop: 4,
    textAlign: 'center',
  },

  // Control Bar
  controlBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: MartialTheme.colors.border,
    gap: 8,
  },
  controlBtnSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: MartialTheme.colors.background,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: MartialTheme.colors.border,
    borderBottomWidth: 3,
    borderBottomColor: MartialTheme.colors.border3D,
  },
  controlBtnSecondaryText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: MartialTheme.colors.text,
    marginLeft: 4,
  },
  speedToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: MartialTheme.colors.background,
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: MartialTheme.colors.border,
    borderBottomWidth: 3,
    borderBottomColor: MartialTheme.colors.border3D,
  },
  speedToggleBtnActive: {
    backgroundColor: '#FEF3C7',
    borderColor: MartialTheme.colors.bamboo,
  },
  speedToggleText: {
    fontSize: 11,
    fontWeight: '800',
    color: MartialTheme.colors.text,
  },
  speedToggleTextActive: {
    color: MartialTheme.colors.bambooDark,
  },
  jumpImpactBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: MartialTheme.colors.bamboo,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: MartialTheme.colors.bamboo,
    borderBottomWidth: 3.5,
    borderBottomColor: MartialTheme.colors.bambooDark,
  },
  jumpImpactBtnText: {
    fontSize: 11.5,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  controlBtnPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: MartialTheme.colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: MartialTheme.colors.primary,
    borderBottomWidth: 3.5,
    borderBottomColor: MartialTheme.colors.primaryDark,
  },
  controlBtnPrimaryText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#FFFFFF',
    marginLeft: 5,
  },
});
