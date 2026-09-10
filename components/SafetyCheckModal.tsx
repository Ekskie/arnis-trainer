import React, { useState } from 'react';
import {
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

export interface SafetyCheckModalProps {
  visible: boolean;
  onDismiss: () => void;
  onConfirm: () => void;
  title?: string;
  strikeName?: string;
}

export function SafetyCheckModal({
  visible,
  onDismiss,
  onConfirm,
  title = 'READY TO TRAIN?',
  strikeName,
}: SafetyCheckModalProps) {
  const [checklist, setChecklist] = useState({
    wholeBody: true,
    space: true,
    stick: true,
    stable: true,
    safeEnv: true,
  });

  const allChecked = checklist.wholeBody && checklist.space && checklist.stick && checklist.stable && checklist.safeEnv;

  const toggleItem = (key: keyof typeof checklist) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setChecklist(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleConfirm = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onConfirm();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          {/* Top header badge */}
          <View style={styles.badgeRow}>
            <View style={styles.badge}>
              <MaterialCommunityIcons name="shield-check" size={14} color="#F59E0B" style={{ marginRight: 4 }} />
              <Text style={styles.badgeText}>SETUP CHECKLIST</Text>
            </View>
            <TouchableOpacity onPress={onDismiss} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close" size={20} color="#94A3B8" />
            </TouchableOpacity>
          </View>

          <Text style={styles.title}>{title}</Text>
          {strikeName && (
            <Text style={styles.subtitle}>Preparing for: <Text style={styles.strikeHighlight}>{strikeName}</Text></Text>
          )}

          <Text style={styles.instruction}>
            Make sure your camera and surroundings are ready for safe training:
          </Text>

          {/* 5-Point Checklist items from Directive 26 */}
          <View style={styles.checklistContainer}>
            <TouchableOpacity
              style={[styles.checkItem, checklist.wholeBody && styles.checkItemActive]}
              onPress={() => toggleItem('wholeBody')}
              activeOpacity={0.8}
            >
              <Ionicons
                name={checklist.wholeBody ? "checkmark-circle" : "ellipse-outline"}
                size={22}
                color={checklist.wholeBody ? "#10B981" : "#64748B"}
                style={styles.checkIcon}
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.checkTitle}>Your whole body is visible</Text>
                <Text style={styles.checkDesc}>From head to feet within the camera frame</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.checkItem, checklist.space && styles.checkItemActive]}
              onPress={() => toggleItem('space')}
              activeOpacity={0.8}
            >
              <Ionicons
                name={checklist.space ? "checkmark-circle" : "ellipse-outline"}
                size={22}
                color={checklist.space ? "#10B981" : "#64748B"}
                style={styles.checkIcon}
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.checkTitle}>You have enough space</Text>
                <Text style={styles.checkDesc}>At least 2 meters clear in all directions</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.checkItem, checklist.stick && styles.checkItemActive]}
              onPress={() => toggleItem('stick')}
              activeOpacity={0.8}
            >
              <Ionicons
                name={checklist.stick ? "checkmark-circle" : "ellipse-outline"}
                size={22}
                color={checklist.stick ? "#10B981" : "#64748B"}
                style={styles.checkIcon}
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.checkTitle}>Your training stick is visible</Text>
                <Text style={styles.checkDesc}>Held firmly in your dominant hand</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.checkItem, checklist.stable && styles.checkItemActive]}
              onPress={() => toggleItem('stable')}
              activeOpacity={0.8}
            >
              <Ionicons
                name={checklist.stable ? "checkmark-circle" : "ellipse-outline"}
                size={22}
                color={checklist.stable ? "#10B981" : "#64748B"}
                style={styles.checkIcon}
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.checkTitle}>The camera is stable</Text>
                <Text style={styles.checkDesc}>Resting securely at chest/eye level</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.checkItem, checklist.safeEnv && styles.checkItemActive]}
              onPress={() => toggleItem('safeEnv')}
              activeOpacity={0.8}
            >
              <Ionicons
                name={checklist.safeEnv ? "checkmark-circle" : "ellipse-outline"}
                size={22}
                color={checklist.safeEnv ? "#10B981" : "#64748B"}
                style={styles.checkIcon}
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.checkTitle}>You are in a safe environment</Text>
                <Text style={styles.checkDesc}>No pets, bystanders, or obstacles nearby</Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Martial Arts Instructor Disclaimer */}
          <View style={styles.disclaimerBox}>
            <Ionicons name="information-circle-outline" size={16} color="#94A3B8" style={{ marginRight: 6 }} />
            <Text style={styles.disclaimerText}>
              AI evaluation provides automated kinematic training feedback and is not a substitute for a qualified, in-person Arnis Guro.
            </Text>
          </View>

          {/* Action button */}
          <TouchableOpacity
            style={[styles.actionBtn, !allChecked && styles.actionBtnDisabled]}
            disabled={!allChecked}
            onPress={handleConfirm}
            activeOpacity={0.85}
          >
            <MaterialCommunityIcons name="sword" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
            <Text style={styles.actionBtnText}>I&apos;M READY — START TRAINING</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 22,
    borderWidth: 1,
    borderColor: '#E5E0D3',
    borderBottomWidth: 5,
    borderBottomColor: '#D5CEBF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  badgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    borderColor: '#FDE68A',
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#B45309',
    letterSpacing: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: '900',
    color: '#1C2721',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: '#4B5852',
    marginBottom: 10,
  },
  strikeHighlight: {
    color: '#15803D',
    fontWeight: '800',
  },
  instruction: {
    fontSize: 12,
    color: '#7D8C84',
    lineHeight: 17,
    marginBottom: 16,
  },
  checklistContainer: {
    gap: 10,
    marginBottom: 16,
  },
  checkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAF8F3',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E5E0D3',
    borderBottomWidth: 3,
    borderBottomColor: '#D5CEBF',
  },
  checkItemActive: {
    backgroundColor: '#F0FDF4',
    borderColor: '#86EFAC',
    borderBottomColor: '#16A34A',
  },
  checkIcon: {
    marginRight: 12,
  },
  checkTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1C2721',
    marginBottom: 2,
  },
  checkDesc: {
    fontSize: 11,
    color: '#6B7280',
  },
  disclaimerBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    borderRadius: 10,
    padding: 10,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  disclaimerText: {
    flex: 1,
    fontSize: 10.5,
    color: '#92400E',
    lineHeight: 15,
  },
  actionBtn: {
    flexDirection: 'row',
    backgroundColor: '#15803D',
    borderRadius: 14,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 4,
    borderBottomColor: '#14532D',
  },
  actionBtnDisabled: {
    backgroundColor: '#D1D5DB',
    borderBottomColor: '#9CA3AF',
  },
  actionBtnText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
});
