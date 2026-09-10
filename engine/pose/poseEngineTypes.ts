export interface EvaluationConfig {
  strikeId: string;
  mode: 'follow' | 'guided' | 'test';
  stickColor: string;
  motionRibbonEnabled: boolean;
  ribbonTheme: string;
  ghostGuideEnabled: boolean;
  trajectoryGuideEnabled: boolean;
  formCoachMode: boolean;
  autoDetectMode: boolean;
  voiceEnabled: boolean;
}

export type PosePhase = 'chambering' | 'driving' | 'swinging' | 'apex_hit' | 'recovering' | 'idle';

export interface RawPersonPose {
  id: number;
  leftAngle: number | null;
  rightAngle: number | null;
  leftShoulderAngle: number | null;
  rightShoulderAngle: number | null;
  leftKneeAngle: number | null;
  rightKneeAngle: number | null;
  leftWristAngle: number | null;
  rightWristAngle: number | null;
  isLeftGood: boolean;
  isRightGood: boolean;
  isHoldingLeft: boolean;
  isHoldingRight: boolean;
  isPersonVisible: boolean;
  accuracy: number;
  elbowScore: number;
  shoulderScore: number;
  wristScore: number;
  kneeScore: number;
  guardScore: number;
  stanceScore: number;
  torsoScore?: number;
  leadKneeAngle: number;
  normGuardDist?: number;
  isGuardLow?: boolean;
  isStanceHigh?: boolean;
  diagnosticFlags?: string[];
  motionPhase?: PosePhase;
  swingVelocity?: number;
  extDelta?: number;
  isApex?: boolean;
  isStaticHold?: boolean;
  kineticScore?: number;
  trajectory?: {
    arcAngle: number | null;
    arcLength: number;
    peakVelocity: number;
    smoothness: number;
  };
}
