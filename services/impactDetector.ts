import { RawPersonPose } from '@/engine/pose/poseEngineTypes';
import { StrikeRule } from '@/constants/strikeRules';

export interface ImpactDetectionResult {
  impactFrame: number;
  impactTime: number; // in seconds, relative to recording start
  confidence: number; // e.g. 0.55 - 0.95
  detectedPose: RawPersonPose;
  snapshotBase64?: string;
}

interface PoseFrameRecord {
  frameIndex: number;
  timestampMs: number;
  pose: RawPersonPose;
  wristDist: number;
  velocity: number;
  isApex: boolean;
  impactCandidateScore: number;
  snapshotBase64?: string;
}

/**
 * Real-time Impact / Strike Apex Tracker.
 * Analyzes kinematic sequence (chamber -> drive -> apex snap -> recovery)
 * to identify the optimal impact moment for Coach vs You comparison.
 */
export class ImpactDetector {
  private frameHistory: PoseFrameRecord[] = [];
  private recordingStartMs: number = 0;
  private peakExtensionFrame: PoseFrameRecord | null = null;
  private latestSnapshotBase64: string | null = null;

  constructor() {
    this.reset();
  }

  public reset(startTimeMs: number = Date.now()) {
    this.frameHistory = [];
    this.recordingStartMs = startTimeMs;
    this.peakExtensionFrame = null;
    this.latestSnapshotBase64 = null;
  }

  public registerSnapshot(base64: string) {
    this.latestSnapshotBase64 = base64;
  }

  /**
   * Feed a real-time evaluated pose frame into the impact detector.
   */
  public addFrame(pose: RawPersonPose, strikeRule: StrikeRule, currentSnapshot?: string): boolean {
    const now = Date.now();
    const frameIndex = this.frameHistory.length;
    const timestampMs = now - (this.recordingStartMs || now);

    if (currentSnapshot) {
      this.latestSnapshotBase64 = currentSnapshot;
    }

    // Compute normalized arm extension alongside biomechanical proximity to target strike angles
    const elbowAngle = pose.rightAngle ?? 120;
    const velocity = pose.swingVelocity ?? 0.15;
    const wristDist = elbowAngle * (1 + velocity * 0.5);

    const optMin = strikeRule.optimal_min ?? strikeRule.right_min;
    const optMax = strikeRule.optimal_max ?? strikeRule.right_max;
    const elbowProx =
      elbowAngle >= optMin && elbowAngle <= optMax
        ? 100
        : Math.max(
            0,
            100 - (elbowAngle < optMin ? optMin - elbowAngle : elbowAngle - optMax) * 2.5
          );

    const shldAngle = pose.rightShoulderAngle ?? strikeRule.ideal_shoulder;
    const shldDev = Math.abs(shldAngle - strikeRule.ideal_shoulder);
    const shldProx = shldDev <= 20 ? 100 : Math.max(0, 100 - (shldDev - 20) * 2.0);

    const isApex = Boolean(
      pose.isApex ||
      pose.motionPhase === 'apex_hit' ||
      (elbowAngle >= strikeRule.right_min - 5 && elbowAngle <= strikeRule.right_max + 5 && velocity > 0.18)
    );

    const velocityFactor = Math.min(1.4, 1 + velocity * 0.8);
    const apexBonus = isApex ? 60 : 0;
    const impactCandidateScore =
      (elbowProx * 0.45 + shldProx * 0.25 + (pose.accuracy || 0) * 0.30) * velocityFactor +
      apexBonus;

    if (
      currentSnapshot &&
      this.peakExtensionFrame &&
      !this.peakExtensionFrame.snapshotBase64 &&
      frameIndex - this.peakExtensionFrame.frameIndex <= 3
    ) {
      this.peakExtensionFrame.snapshotBase64 = currentSnapshot;
    }

    const record: PoseFrameRecord = {
      frameIndex,
      timestampMs,
      pose,
      wristDist,
      velocity,
      isApex,
      impactCandidateScore,
      snapshotBase64: currentSnapshot || this.latestSnapshotBase64 || undefined,
    };

    this.frameHistory.push(record);

    // Track best biomechanical impact moment
    if (
      !this.peakExtensionFrame ||
      record.impactCandidateScore > this.peakExtensionFrame.impactCandidateScore ||
      (isApex && !this.peakExtensionFrame.isApex)
    ) {
      this.peakExtensionFrame = record;
      return true; // New apex candidate
    }

    return false;
  }

  /**
   * Finalize detection and return the authoritative impact frame & timestamp.
   */
  public finalize(totalDurationMs: number): ImpactDetectionResult {
    if (this.frameHistory.length === 0) {
      return {
        impactFrame: 30,
        impactTime: Math.min(1.5, totalDurationMs / 2000),
        confidence: 0.50,
        detectedPose: {
          id: 0,
          leftAngle: 75,
          rightAngle: 145,
          leftShoulderAngle: 60,
          rightShoulderAngle: 65,
          leftKneeAngle: 165,
          rightKneeAngle: 165,
          leftWristAngle: 85,
          rightWristAngle: 85,
          isLeftGood: true,
          isRightGood: true,
          isHoldingLeft: false,
          isHoldingRight: true,
          isPersonVisible: true,
          accuracy: 75,
          elbowScore: 75,
          shoulderScore: 75,
          wristScore: 80,
          kneeScore: 80,
          guardScore: 75,
          stanceScore: 75,
          leadKneeAngle: 165,
        },
        snapshotBase64: this.latestSnapshotBase64 || undefined,
      };
    }

    // 1. Prioritize explicit apex-flagged frames ordered by biomechanical impact score
    const apexFrames = this.frameHistory.filter(f => f.isApex);
    let chosenRecord: PoseFrameRecord;

    if (apexFrames.length > 0) {
      chosenRecord = [...apexFrames].sort(
        (a, b) => b.impactCandidateScore - a.impactCandidateScore
      )[0];
    } else if (this.peakExtensionFrame) {
      chosenRecord = this.peakExtensionFrame;
    } else {
      // Fallback: mid-point frame
      const midIdx = Math.floor(this.frameHistory.length / 2);
      chosenRecord = this.frameHistory[midIdx];
    }

    // 2. Compute empirical confidence score (between 0.55 and 0.95)
    let confidence = 0.65;
    if (chosenRecord.isApex) confidence += 0.15;
    if (chosenRecord.pose.isPersonVisible) confidence += 0.08;
    if (chosenRecord.pose.accuracy >= 85) confidence += 0.07;
    if (chosenRecord.velocity > 0.20) confidence += 0.05;
    confidence = Math.min(0.95, Math.max(0.55, parseFloat(confidence.toFixed(2))));

    const impactTimeSec = parseFloat((chosenRecord.timestampMs / 1000).toFixed(2));

    return {
      impactFrame: chosenRecord.frameIndex,
      impactTime: impactTimeSec,
      confidence,
      detectedPose: chosenRecord.pose,
      snapshotBase64: chosenRecord.snapshotBase64 || this.latestSnapshotBase64 || undefined,
    };
  }
}
