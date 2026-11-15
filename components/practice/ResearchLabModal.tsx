import React, { useEffect, useState } from 'react';
import {
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import {
  getExpertReference,
  listRegisteredExpertStrikeIds,
  unregisterExpertReference,
} from '@/engine/reference/referenceLoader';
import { CoordinateConvention, MovementSegmentationMode } from '@/engine/reference/referenceTypes';
import { EXPERIMENTAL_DTW_MAX_OFFSET_AT_50 } from '@/engine/reference/trajectoryMatcher';
import {
  getLocalResearchDirectories,
  loadAndRegisterReferenceJsonText,
  loadReferenceFromLocalFile,
  ResearchModeConfig,
} from '@/services/researchStorageService';
import {
  getSavedPublicDirectoryUri,
  requestPublicDirectoryPermission,
} from '@/services/mediaStorageService';

export interface ResearchLabModalProps {
  visible: boolean;
  onClose: () => void;
  strikeId: string;
  strikeName: string;
  config: ResearchModeConfig;
  onUpdateConfig: (next: ResearchModeConfig) => void;
  isManualCapturing: boolean;
  manualCapturedFrameCount: number;
  lastSavedCaptureUri: string | null;
  onToggleManualCapture?: () => void;
  onExportLastCapture?: () => void;
}

export function ResearchLabModal({
  visible,
  onClose,
  strikeId,
  strikeName,
  config,
  onUpdateConfig,
  isManualCapturing,
  manualCapturedFrameCount,
  lastSavedCaptureUri,
  onToggleManualCapture,
  onExportLastCapture,
}: ResearchLabModalProps) {
  const [jsonInput, setJsonInput] = useState('');
  const [filePathInput, setFilePathInput] = useState(`${strikeId}.json`);
  const [loadFeedback, setLoadFeedback] = useState<string | null>(null);
  const [registeredIds, setRegisteredIds] = useState<string[]>([]);
  const [publicDirUri, setPublicDirUri] = useState<string | null>(null);
  const [startFrameText, setStartFrameText] = useState(
    config.explicitStartFrame !== null ? String(config.explicitStartFrame) : ''
  );
  const [endFrameText, setEndFrameText] = useState(
    config.explicitEndFrame !== null ? String(config.explicitEndFrame) : ''
  );
  const [dtwOffsetText, setDtwOffsetText] = useState(String(config.dtwMaxOffset));

  const refreshRegistry = () => {
    setRegisteredIds(listRegisteredExpertStrikeIds());
  };

  useEffect(() => {
    if (visible) {
      refreshRegistry();
      getSavedPublicDirectoryUri()
        .then(setPublicDirUri)
        .catch(() => setPublicDirUri(null));
      setFilePathInput(`${strikeId}.json`);
      setStartFrameText(
        config.explicitStartFrame !== null ? String(config.explicitStartFrame) : ''
      );
      setEndFrameText(config.explicitEndFrame !== null ? String(config.explicitEndFrame) : '');
      setDtwOffsetText(String(config.dtwMaxOffset));
    }
  }, [visible, strikeId, config.explicitStartFrame, config.explicitEndFrame, config.dtwMaxOffset]);

  const activeRef = getExpertReference(strikeId);
  const dirs = getLocalResearchDirectories();

  const handleToggleEnabled = (val: boolean) => {
    onUpdateConfig({
      ...config,
      enabled: val,
      consentGranted: val ? config.consentGranted : false,
      consentedAt: val && config.consentGranted ? config.consentedAt : null,
    });
  };

  const handleToggleConsent = (val: boolean) => {
    onUpdateConfig({
      ...config,
      enabled: val ? true : config.enabled,
      consentGranted: val,
      consentedAt: val ? config.consentedAt ?? new Date().toISOString() : null,
    });
  };

  const handleSetConvention = (conv: CoordinateConvention) => {
    onUpdateConfig({
      ...config,
      poseCoordinateConvention: conv,
    });
  };

  const handleSetSegmentationMode = (mode: MovementSegmentationMode) => {
    onUpdateConfig({
      ...config,
      segmentationMode: mode,
    });
  };

  const handleApplyNumericSettings = () => {
    const startNum = startFrameText.trim() ? Number.parseInt(startFrameText.trim(), 10) : null;
    const endNum = endFrameText.trim() ? Number.parseInt(endFrameText.trim(), 10) : null;
    const offsetNum = dtwOffsetText.trim()
      ? Number.parseInt(dtwOffsetText.trim(), 10)
      : EXPERIMENTAL_DTW_MAX_OFFSET_AT_50;

    onUpdateConfig({
      ...config,
      explicitStartFrame: Number.isFinite(startNum) ? startNum : null,
      explicitEndFrame: Number.isFinite(endNum) ? endNum : null,
      dtwMaxOffset:
        Number.isFinite(offsetNum) && offsetNum >= 0
          ? offsetNum
          : EXPERIMENTAL_DTW_MAX_OFFSET_AT_50,
    });
  };

  const handleImportJsonText = async () => {
    if (!jsonInput.trim()) {
      setLoadFeedback('Paste an exported v1.0.0 AlphaPose JSON payload first.');
      return;
    }
    const { validation, savedUri } = await loadAndRegisterReferenceJsonText(jsonInput, true);
    if (!validation.valid || !validation.value) {
      setLoadFeedback(`Schema rejected:\n${validation.errors.slice(0, 5).join('\n')}`);
      return;
    }
    refreshRegistry();
    setLoadFeedback(
      `Loaded ${validation.value.strikeId} (${validation.value.provenance.demoCount} demos, ` +
        `${validation.value.normalization.coordinateConvention})` +
        (savedUri ? `\nCached locally: ${savedUri}` : '')
    );
    setJsonInput('');
  };

  const handleImportLocalFile = async () => {
    const { validation, savedUri } = await loadReferenceFromLocalFile(filePathInput, true);
    if (!validation.valid || !validation.value) {
      setLoadFeedback(`Load failed:\n${validation.errors.slice(0, 5).join('\n')}`);
      return;
    }
    refreshRegistry();
    setLoadFeedback(
      `Loaded from file: ${validation.value.strikeId} (${validation.value.normalization.coordinateConvention})` +
        (savedUri ? `\nSaved in: ${savedUri}` : '')
    );
  };

  const handleClearActiveReference = () => {
    unregisterExpertReference(strikeId);
    refreshRegistry();
    setLoadFeedback(`Cleared in-memory reference for ${strikeId}.`);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.headerRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
              <MaterialCommunityIcons name="flask-outline" size={20} color="#38BDF8" />
              <Text style={styles.title}>Research Shadow Lab (Non-Grading)</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color="#E2E8F0" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
            <View style={styles.noticeBox}>
              <Text style={styles.noticeText}>
                Isolated from official grades, XP, pass/fail decisions, coach uploads, and
                curriculum progress. All captures stay local on device unless you manually export
                them.
              </Text>
            </View>

            {/* 1. Mode & Explicit Consent */}
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>1. Mode & Explicit Local Capture Consent</Text>
              <View style={styles.switchRow}>
                <View style={{ flex: 1, paddingRight: 10 }}>
                  <Text style={styles.rowLabel}>Enable Research Testing Mode</Text>
                  <Text style={styles.rowSub}>
                    Target strike: {strikeId} ({strikeName})
                  </Text>
                </View>
                <Switch value={config.enabled} onValueChange={handleToggleEnabled} />
              </View>

              <View style={[styles.switchRow, { marginTop: 10 }]}>
                <View style={{ flex: 1, paddingRight: 10 }}>
                  <Text style={styles.rowLabel}>Consent to Local Raw 2D Pose Capture</Text>
                  <Text style={styles.rowSub}>
                    Required before recording or exporting raw landmarks, timestamps, V2 normalized
                    data, and shadow reports. Never uploaded to any server.
                  </Text>
                </View>
                <Switch value={config.consentGranted} onValueChange={handleToggleConsent} />
              </View>
              {config.consentGranted && config.consentedAt && (
                <Text style={styles.metaText}>Consented at: {config.consentedAt}</Text>
              )}
            </View>

            {/* 2. Mirroring & Coordinate Convention */}
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>2. Preview vs. Pose Coordinate Conventions</Text>
              <Text style={styles.metaText}>
                • Live Preview: mirrored_selfie_display (flipped visually on canvas){'\n'}
                • Raw Bridge Frames: raw_unmirrored_normalized ([0..1] sensor coordinates){'\n'}
                • Snapshot Export: unmirrored_image_2d (viewer coordinates)
              </Text>
              <Text style={[styles.rowLabel, { marginTop: 8, marginBottom: 6 }]}>
                Normalized V2 Coordinate Convention (when no ref overrides):
              </Text>
              <View style={styles.pillRow}>
                {(
                  [
                    { id: 'unmirrored_image_2d', label: 'unmirrored_image_2d (Colab AlphaPose)' },
                    { id: 'anatomical_mirrored_2d', label: 'anatomical_mirrored_2d' },
                  ] as const
                ).map((item) => {
                  const selected = config.poseCoordinateConvention === item.id;
                  return (
                    <TouchableOpacity
                      key={item.id}
                      style={[styles.pill, selected && styles.pillActive]}
                      onPress={() => handleSetConvention(item.id)}
                    >
                      <Text style={[styles.pillText, selected && styles.pillTextActive]}>
                        {item.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* 3. Movement Window & Experimental DTW */}
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>3. Segmentation & Experimental DTW</Text>
              <View style={styles.pillRow}>
                {(
                  [
                    { id: 'full_captured', label: 'Full Sequence (Default)' },
                    { id: 'explicit_frame_range', label: 'Explicit Frame Range' },
                    { id: 'speed_threshold_experimental', label: 'Speed Threshold (Exp.)' },
                  ] as const
                ).map((item) => {
                  const selected = config.segmentationMode === item.id;
                  return (
                    <TouchableOpacity
                      key={item.id}
                      style={[styles.pill, selected && styles.pillActive]}
                      onPress={() => handleSetSegmentationMode(item.id)}
                    >
                      <Text style={[styles.pillText, selected && styles.pillTextActive]}>
                        {item.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {config.segmentationMode === 'explicit_frame_range' && (
                <View style={styles.inlineInputsRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.inputLabel}>Start Frame</Text>
                    <TextInput
                      style={styles.textInput}
                      value={startFrameText}
                      onChangeText={setStartFrameText}
                      keyboardType="numeric"
                      placeholder="0"
                      placeholderTextColor="#64748B"
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.inputLabel}>End Frame</Text>
                    <TextInput
                      style={styles.textInput}
                      value={endFrameText}
                      onChangeText={setEndFrameText}
                      keyboardType="numeric"
                      placeholder="last"
                      placeholderTextColor="#64748B"
                    />
                  </View>
                </View>
              )}

              <View style={styles.inlineInputsRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>
                    Constrained DTW Max Offset (experimental; default 4 @ 50 pts)
                  </Text>
                  <TextInput
                    style={styles.textInput}
                    value={dtwOffsetText}
                    onChangeText={setDtwOffsetText}
                    keyboardType="numeric"
                    placeholder="4"
                    placeholderTextColor="#64748B"
                  />
                </View>
                <TouchableOpacity style={styles.smallActionBtn} onPress={handleApplyNumericSettings}>
                  <Text style={styles.smallActionBtnText}>Apply</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* 4. Manual Research Capture Control */}
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>4. Continuous Local Capture (Bypass Layer A Cutoff)</Text>
              <Text style={styles.rowSub}>
                Captures full MediaPipe pose frames + timestamps in Practice mode without waiting
                for Layer A velocity/apex early finish.
              </Text>
              <View style={[styles.pillRow, { marginTop: 10 }]}>
                <TouchableOpacity
                  style={[
                    styles.actionBtn,
                    isManualCapturing ? styles.stopBtn : styles.startBtn,
                    (!config.enabled || !config.consentGranted) && styles.disabledBtn,
                  ]}
                  disabled={!config.enabled || !config.consentGranted}
                  onPress={() => {
                    onToggleManualCapture?.();
                    onClose();
                  }}
                >
                  <Text style={styles.actionBtnText}>
                    {isManualCapturing
                      ? `Stop Capture (${manualCapturedFrameCount} frames)`
                      : 'Start Live Research Capture'}
                  </Text>
                </TouchableOpacity>

                {lastSavedCaptureUri && config.consentGranted && (
                  <TouchableOpacity
                    style={styles.secondaryBtn}
                    onPress={() => {
                      onExportLastCapture?.();
                    }}
                  >
                    <Text style={styles.secondaryBtnText}>Export Last JSON</Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={styles.secondaryBtn}
                  onPress={async () => {
                    const selected = await requestPublicDirectoryPermission(true);
                    if (selected) {
                      setPublicDirUri(selected);
                      Alert.alert(
                        'Save Folder Updated',
                        'Research captures and practice files will now be created in your selected phone folder.'
                      );
                    }
                  }}
                >
                  <Text style={styles.secondaryBtnText}>
                    {publicDirUri ? 'Change Phone Save Folder' : 'Select Phone Save Folder'}
                  </Text>
                </TouchableOpacity>
              </View>
              <Text style={[styles.metaText, { marginTop: 6 }]}>
                Phone Save Folder (Downloads/Documents):{' '}
                {publicDirUri ? 'Connected ✓' : 'Not set — will ask once when saving/exporting'}
              </Text>
              {dirs.capturesDir && (
                <Text style={[styles.metaText, { marginTop: 4 }]}>
                  Internal captures folder: {dirs.capturesDir}
                </Text>
              )}
            </View>

            {/* 5. Load Real Reference JSON */}
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>5. Load Validated v1.0.0 Reference JSON</Text>
              <Text style={styles.metaText}>
                Active for {strikeId}:{' '}
                {activeRef
                  ? `${activeRef.provenance.cleanedDatasetVersion} (${activeRef.provenance.demoCount} demos, ${activeRef.normalization.coordinateConvention})`
                  : 'None loaded'}
                {'\n'}Registered in session: {registeredIds.length > 0 ? registeredIds.join(', ') : 'None'}
              </Text>

              <Text style={[styles.inputLabel, { marginTop: 8 }]}>
                Load from local file URI or filename in research/references/:
              </Text>
              <View style={styles.inlineInputsRow}>
                <TextInput
                  style={[styles.textInput, { flex: 1 }]}
                  value={filePathInput}
                  onChangeText={setFilePathInput}
                  placeholder="strike_1.json or file:///..."
                  placeholderTextColor="#64748B"
                  autoCapitalize="none"
                />
                <TouchableOpacity style={styles.smallActionBtn} onPress={handleImportLocalFile}>
                  <Text style={styles.smallActionBtnText}>Load File</Text>
                </TouchableOpacity>
              </View>

              <Text style={[styles.inputLabel, { marginTop: 8 }]}>Or paste reference JSON:</Text>
              <TextInput
                style={[styles.textInput, { minHeight: 72, textAlignVertical: 'top' }]}
                value={jsonInput}
                onChangeText={setJsonInput}
                multiline
                placeholder='{"schemaVersion":"1.0.0","strikeId":"strike_1",...}'
                placeholderTextColor="#64748B"
                autoCapitalize="none"
              />
              <View style={[styles.pillRow, { marginTop: 8 }]}>
                <TouchableOpacity style={styles.smallActionBtn} onPress={handleImportJsonText}>
                  <Text style={styles.smallActionBtnText}>Validate & Register JSON</Text>
                </TouchableOpacity>
                {activeRef && (
                  <TouchableOpacity
                    style={[styles.smallActionBtn, { backgroundColor: '#7F1D1D' }]}
                    onPress={() => {
                      Alert.alert('Clear Reference', `Remove loaded test reference for ${strikeId}?`, [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Clear', style: 'destructive', onPress: handleClearActiveReference },
                      ]);
                    }}
                  >
                    <Text style={styles.smallActionBtnText}>Clear Active Ref</Text>
                  </TouchableOpacity>
                )}
              </View>

              {loadFeedback && <Text style={styles.feedbackText}>{loadFeedback}</Text>}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(2, 6, 23, 0.82)',
    justifyContent: 'flex-end',
  },
  sheet: {
    maxHeight: '88%',
    backgroundColor: '#0F172A',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderColor: '#334155',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  title: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: '800',
  },
  closeBtn: {
    padding: 6,
    borderRadius: 14,
    backgroundColor: '#1E293B',
  },
  noticeBox: {
    backgroundColor: '#172554',
    borderColor: '#38BDF8',
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
  },
  noticeText: {
    color: '#BAE6FD',
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '600',
  },
  card: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  sectionTitle: {
    color: '#38BDF8',
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 8,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowLabel: {
    color: '#F1F5F9',
    fontSize: 13,
    fontWeight: '700',
  },
  rowSub: {
    color: '#94A3B8',
    fontSize: 11,
    lineHeight: 15,
    marginTop: 2,
  },
  metaText: {
    color: '#CBD5E1',
    fontSize: 11,
    lineHeight: 16,
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#475569',
  },
  pillActive: {
    backgroundColor: '#0284C7',
    borderColor: '#38BDF8',
  },
  pillText: {
    color: '#CBD5E1',
    fontSize: 11,
    fontWeight: '600',
  },
  pillTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  inlineInputsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    marginTop: 8,
  },
  inputLabel: {
    color: '#94A3B8',
    fontSize: 11,
    marginBottom: 4,
  },
  textInput: {
    backgroundColor: '#0F172A',
    color: '#F8FAFC',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#475569',
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 12,
  },
  smallActionBtn: {
    backgroundColor: '#0284C7',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  smallActionBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  actionBtn: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 8,
  },
  startBtn: {
    backgroundColor: '#059669',
  },
  stopBtn: {
    backgroundColor: '#DC2626',
  },
  disabledBtn: {
    opacity: 0.45,
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  secondaryBtn: {
    backgroundColor: '#334155',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 8,
  },
  secondaryBtnText: {
    color: '#E2E8F0',
    fontSize: 12,
    fontWeight: '700',
  },
  feedbackText: {
    color: '#FDE68A',
    fontSize: 11,
    marginTop: 8,
    lineHeight: 16,
  },
});
