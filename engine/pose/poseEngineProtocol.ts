import { EvaluationConfig, RawPersonPose } from './poseEngineTypes';
import { StrikeRule } from '@/constants/strikeRules';

export type OutgoingPoseMessage =
  | { type: 'SET_SESSION'; config: EvaluationConfig }
  | { type: 'SET_TARGET_STRIKE'; strikeId: string; rule?: StrikeRule }
  | { type: 'SET_MODE'; mode: 'follow' | 'guided' | 'test'; formCoach: boolean; autoDetect: boolean }
  | { type: 'START_RECORDING' }
  | { type: 'STOP_RECORDING' }
  | { type: 'SET_FORM_COACH_PHASE'; phase: 'chamber' | 'impact' | 'recovery' }
  | { type: 'RESET' };

export type IncomingPoseMessage =
  | { type: 'STATUS'; message: string }
  | { type: 'READY' }
  | { type: 'ERROR'; message: string }
  | { type: 'POSE_DATA'; persons: RawPersonPose[] }
  | { type: 'AUTO_DETECTED_STRIKE'; strikeId: string; strikeName: string; confidence: number }
  | { type: 'FORM_COACH_STEP_PASSED'; phase: 'chamber' | 'impact' | 'recovery'; score: number }
  | { type: 'SNAPSHOT_CAPTURED'; base64: string }
  | { type: 'VIDEO_REPLAY_CAPTURED'; base64: string };
