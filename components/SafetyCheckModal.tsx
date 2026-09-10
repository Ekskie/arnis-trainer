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
    space: true,
    stick: true,
    pets: true,
    camera: true,
  });

  const allChecked = checklist.space && checklist.stick && checklist.pets && checklist.camera;

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
              <MaterialCommunityIcons name="shield-alert" size={14} color="#F59E0B" style={{ marginRight: 4 }} />
              <Text style={styles.badgeText}>SAFETY FIRST</Text>
            </View>
            <TouchableOpacity onPress={onDismiss} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close" size={20} color="#64748B" />
            </TouchableOpacity>
          </View>

          <Text style={styles.title}>{title}</Text>
          {strikeName && (
            <Text style={styles.subtitle}>Preparing for: <Text style={styles.strikeHighlight}>{strikeName}</Text></Text>
          )}

          <Text style={styles.instruction}>
            Before activating your camera and swinging your weapon, confirm that your training zone is secure:
          </Text>

          {/* Checklist items */}
          <View style={styles.checklistContainer}>
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
                <Text style={styles.checkTitle}>Enough Clearance Space</Text>
                <Text style={styles.checkDesc}>At least 2 meters (6.5 ft) in all directions around you</Text>
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
                <Text style={styles.checkTitle}>Training Stick is Secure</Text>
                <Text style={styles.checkDesc}>Rattan is free of cracks/splinters; firm grip on the handle</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.checkItem, checklist.pets && styles.checkItemActive]}
              onPress={() => toggleItem('pets')}
              activeOpacity={0.8}
            >
              <Ionicons
                name={checklist.pets ? "checkmark-circle" : "ellipse-outline"}
                size={22}
                color={checklist.pets ? "#10B981" : "#64748B"}
                style={styles.checkIcon}
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.checkTitle}>Surroundings Are Clear</Text>
                <Text style={styles.checkDesc}>No people, pets, or fragile objects in striking reach</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.checkItem, checklist.camera && styles.checkItemActive]}
              onPress={() => toggleItem('camera')}
              activeOpacity={0.8}
            >
              <Ionicons
                name={checklist.camera ? "checkmark-circle" : "ellipse-outline"}
                size={22}
                color={checklist.camera ? "#10B981" : "#64748B"}
                style={styles.checkIcon}
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.checkTitle}>Camera Sees Whole Body</Text>
                <Text style={styles.checkDesc}>Phone placed 2.5–3.5m away with clear view head-to-toe</Text>
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
    backgroundColor: 'rgba(5, 7, 15, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#12162B',
    borderRadius: 20,
    padding: 22,
    borderWidth: 1,
    borderColor: '#232A4A',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
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
    backgroundColor: '#F59E0B20',
    borderColor: '#F59E0B50',
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#F59E0B',
    letterSpacing: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: '#94A3B8',
    marginBottom: 10,
  },
  strikeHighlight: {
    color: '#D24B38',
    fontWeight: '700',
  },
  instruction: {
    fontSize: 12,
    color: '#94A3B8',
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
    backgroundColor: '#181E38',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#262F52',
  },
  checkItemActive: {
    backgroundColor: '#152538',
    borderColor: '#10B98150',
  },
  checkIcon: {
    marginRight: 12,
  },
  checkTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  checkDesc: {
    fontSize: 11,
    color: '#94A3B8',
  },
  disclaimerBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0E1122',
    borderRadius: 10,
    padding: 10,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#1C2340',
  },
  disclaimerText: {
    flex: 1,
    fontSize: 10.5,
    color: '#94A3B8',
    lineHeight: 15,
  },
  actionBtn: {
    flexDirection: 'row',
    backgroundColor: '#D24B38',
    borderRadius: 14,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#D24B38',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  actionBtnDisabled: {
    backgroundColor: '#334155',
    shadowOpacity: 0,
  },
  actionBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
});
