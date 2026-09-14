import React, { useEffect, useRef, useState } from 'react';
import {
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useVideoPlayer, VideoView } from 'expo-video';
import { WebView } from 'react-native-webview';
import * as Haptics from 'expo-haptics';

import { MartialTheme } from '@/constants/theme';
import { CoachStrikeReferenceItem } from '@/constants/referenceStore';
import { StrikeRule } from '@/constants/strikeRules';

export interface ComparisonPlayerProps {
  visible: boolean;
  onClose: () => void;
  strikeRule: StrikeRule;
  coachReference: CoachStrikeReferenceItem;
  userVideoUri?: string | null;
  userImpactTime?: number;
  coachImpactTime?: number;
}

export function ComparisonPlayer({
  visible,
  onClose,
  strikeRule,
  coachReference,
  userVideoUri,
  userImpactTime = 1.45,
  coachImpactTime = 1.47,
}: ComparisonPlayerProps) {
  const userWebRef = useRef<WebView>(null);
  const [isPlaying, setIsPlaying] = useState(true);

  // Native hardware-accelerated coach video player
  const coachPlayer = useVideoPlayer(coachReference.videoSource, (p) => {
    p.loop = true;
    if (visible) {
      try {
        p.play();
      } catch {
        // ignore
      }
    }
  });

  // Pause when dismissed; resume when opened
  useEffect(() => {
    if (!visible && coachPlayer) {
      try {
        coachPlayer.pause();
      } catch {
        // ignore
      }
      userWebRef.current?.injectJavaScript(`
        var v = document.querySelector('video');
        if (v) { v.pause(); }
        true;
      `);
      setIsPlaying(false);
    } else if (visible && coachPlayer) {
      try {
        coachPlayer.play();
      } catch {
        // ignore
      }
      userWebRef.current?.injectJavaScript(`
        var v = document.querySelector('video');
        if (v) { v.play(); }
        true;
      `);
      setIsPlaying(true);
    }
  }, [visible, coachPlayer]);

  // Synchronized Play / Pause
  const togglePlayPause = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    const nextState = !isPlaying;
    setIsPlaying(nextState);

    if (coachPlayer) {
      try {
        if (nextState) {
          coachPlayer.play();
        } else {
          coachPlayer.pause();
        }
      } catch {
        // ignore
      }
    }

    const userAction = nextState ? 'play()' : 'pause()';
    userWebRef.current?.injectJavaScript(`
      var v = document.querySelector('video');
      if (v) { v.${userAction}; }
      true;
    `);
  };

  // Synchronized Jump to Impact Apex
  const jumpToImpact = () => {
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    setIsPlaying(false);

    if (coachPlayer) {
      try {
        coachPlayer.pause();
        coachPlayer.currentTime = coachImpactTime;
      } catch {
        // ignore
      }
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

    if (coachPlayer) {
      try {
        coachPlayer.currentTime = 0;
        coachPlayer.play();
      } catch {
        // ignore
      }
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
        <video id="userVid" src="${userVideoUri || ''}" autoplay loop muted playsinline controls></video>
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

        {/* --- Video Comparison Viewport --- */}
        <View style={styles.viewport}>
          {/* 1. Upper: Coach Video (Native Hardware-Accelerated) */}
          <View style={styles.playerContainer}>
            <View style={styles.playerHeader}>
              <View style={styles.playerTagCoach}>
                <Text style={styles.playerTagCoachText}>COACH (EXPERT)</Text>
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

          {/* 2. Lower: User Recorded Strike Video */}
          <View style={styles.playerContainer}>
            <View style={styles.playerHeader}>
              <View style={styles.playerTagUser}>
                <Text style={styles.playerTagUserText}>YOUR RECORDED STRIKE</Text>
              </View>
              <Text style={styles.playerImpactPill}>Impact @ {userImpactTime.toFixed(2)}s</Text>
            </View>
            <View style={styles.videoWrapper}>
              {userVideoUri ? (
                <WebView
                  ref={userWebRef}
                  originWhitelist={['*']}
                  source={{ html: userVideoHtml }}
                  style={{ flex: 1 }}
                  allowsInlineMediaPlayback={true}
                  mediaPlaybackRequiresUserAction={false}
                />
              ) : (
                <View style={styles.noVideoPlaceholder}>
                  <Ionicons name="videocam-off-outline" size={36} color={MartialTheme.colors.textMuted} />
                  <Text style={styles.noVideoText}>No recorded user video for this session</Text>
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
            style={styles.jumpImpactBtn}
            onPress={jumpToImpact}
            activeOpacity={0.8}
          >
            <Ionicons name="locate" size={17} color="#FFFFFF" style={{ marginRight: 6 }} />
            <Text style={styles.jumpImpactBtnText}>🎯 Jump to Impact</Text>
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
  noVideoPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: MartialTheme.colors.background,
  },
  noVideoText: {
    fontSize: 12,
    fontWeight: '700',
    color: MartialTheme.colors.textMuted,
    marginTop: 8,
  },

  // Control Bar
  controlBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: MartialTheme.colors.border,
    gap: 10,
  },
  controlBtnSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: MartialTheme.colors.background,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: MartialTheme.colors.border,
    borderBottomWidth: 3,
    borderBottomColor: MartialTheme.colors.border3D,
  },
  controlBtnSecondaryText: {
    fontSize: 12,
    fontWeight: '800',
    color: MartialTheme.colors.text,
    marginLeft: 6,
  },
  jumpImpactBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: MartialTheme.colors.bamboo,
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: MartialTheme.colors.bamboo,
    borderBottomWidth: 3.5,
    borderBottomColor: MartialTheme.colors.bambooDark,
  },
  jumpImpactBtnText: {
    fontSize: 12.5,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  controlBtnPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: MartialTheme.colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 11,
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
    marginLeft: 6,
  },
});
