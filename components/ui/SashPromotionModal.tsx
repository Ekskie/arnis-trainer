import React, { useEffect } from 'react';
import {
  Modal,
  StyleSheet,
  Text,
  View,
  Dimensions,
} from 'react-native';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { MartialTheme } from '@/constants/theme';
import { SashRankInfo } from '@/constants/gamificationStore';
import { CoachCharacter } from '@/components/ui/CoachCharacter';
import { TactileButton } from '@/components/ui/TactileButton';

const { width } = Dimensions.get('window');

export interface SashPromotionModalProps {
  visible: boolean;
  onClose: () => void;
  newRank: SashRankInfo;
  currentLevel: number;
}

export function SashPromotionModal({
  visible,
  onClose,
  newRank,
  currentLevel,
}: SashPromotionModalProps) {
  useEffect(() => {
    if (visible) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          {/* Top Tag */}
          <View style={styles.tagBadge}>
            <Ionicons name="sparkles" size={14} color="#D97706" style={{ marginRight: 4 }} />
            <Text style={styles.tagBadgeText}>SASH RANK PROMOTION</Text>
          </View>

          {/* Coach Mascot Celebrating */}
          <View style={styles.coachContainer}>
            <CoachCharacter pose="celebrating" size={110} />
          </View>

          {/* Congratulations Title */}
          <Text style={styles.titleText}>PAGBATI! 🇵🇭</Text>
          <Text style={styles.subtitleText}>
            You have earned a new rank in traditional Arnis!
          </Text>

          {/* Sash Belt Display */}
          <View
            style={[
              styles.sashBanner,
              {
                backgroundColor: newRank.sashColor,
                borderColor: newRank.borderColor,
              },
            ]}
          >
            <MaterialCommunityIcons
              name="sword-cross"
              size={22}
              color={newRank.textColor}
              style={{ marginRight: 10 }}
            />
            <View>
              <Text style={[styles.sashRankShort, { color: newRank.textColor }]}>
                {newRank.shortName.toUpperCase()}
              </Text>
              <Text style={[styles.sashRankTitle, { color: newRank.textColor }]}>
                {newRank.title}
              </Text>
            </View>
            <View style={styles.levelPill}>
              <Text style={styles.levelPillText}>Lvl {currentLevel}</Text>
            </View>
          </View>

          {/* Encouragement description */}
          <Text style={styles.descriptionText}>
            Your consistency, stance discipline, and striking mechanics continue to sharpen. Wear your {newRank.shortName} with martial honor!
          </Text>

          {/* Dismiss Button */}
          <TactileButton
            title="CLAIM SASH & CONTINUE ⚔️"
            variant="primary"
            size="lg"
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              onClose();
            }}
            style={{ width: '100%', marginTop: 18 }}
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.78)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 26,
    paddingBottom: 22,
    alignItems: 'center',
    width: Math.min(width - 36, 380),
    borderWidth: 2,
    borderColor: '#FEF08A',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  tagBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FDE68A',
    marginBottom: 10,
  },
  tagBadgeText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#B45309',
    letterSpacing: 0.8,
  },
  coachContainer: {
    marginVertical: 4,
  },
  titleText: {
    fontSize: 24,
    fontWeight: '900',
    color: MartialTheme.colors.text,
    letterSpacing: -0.3,
    marginTop: 4,
  },
  subtitleText: {
    fontSize: 13,
    color: MartialTheme.colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 14,
  },
  sashBanner: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
    marginBottom: 14,
  },
  sashRankShort: {
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  sashRankTitle: {
    fontSize: 12,
    fontWeight: '600',
    opacity: 0.9,
  },
  levelPill: {
    marginLeft: 'auto',
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 10,
  },
  levelPillText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  descriptionText: {
    fontSize: 13,
    color: MartialTheme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 19,
    paddingHorizontal: 6,
  },
});
