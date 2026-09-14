import { LOCAL_STRIKE_VIDEOS } from '@/constants/strikeVideos';
import { STRIKE_RULES, StrikeRule } from '@/constants/strikeRules';

export interface CoachStrikeReferenceAngles {
  elbow: number;
  shoulder: number;
  knee: number;
  guard: number;
  wrist?: number;
}

export interface CoachStrikeReferenceItem {
  videoSource: any;
  videoUrl?: string;
  impactSnapshot: any;
  snapshotUrl?: string;
  impactFrame: number;
  impactTime: number;
  angles: CoachStrikeReferenceAngles;
  confidence: number;
  cues: string[];
}

export interface CoachStrikeReference {
  strikeId: string;
  strikeNumber: number;
  name: string;
  filipinoName: string;
  target: string;
  trajectory: string;
  withFootwork: {
    front: CoachStrikeReferenceItem;
  };
  withoutFootwork?: {
    front: CoachStrikeReferenceItem;
  };
}

/**
 * Static asset mapping for the 12 expert coach impact snapshots.
 * Extracted directly from authentic AlphaPose expert demonstration footage.
 */
export const LOCAL_COACH_SNAPSHOTS: Record<string, any> = {
  strike_1: require('@/assets/reference/strike_1_impact.jpg'),
  strike_2: require('@/assets/reference/strike_2_impact.jpg'),
  strike_3: require('@/assets/reference/strike_3_impact.jpg'),
  strike_4: require('@/assets/reference/strike_4_impact.jpg'),
  strike_5: require('@/assets/reference/strike_5_impact.jpg'),
  strike_6: require('@/assets/reference/strike_6_impact.jpg'),
  strike_7: require('@/assets/reference/strike_7_impact.jpg'),
  strike_8: require('@/assets/reference/strike_8_impact.jpg'),
  strike_9: require('@/assets/reference/strike_9_impact.jpg'),
  strike_10: require('@/assets/reference/strike_10_impact.jpg'),
  strike_11: require('@/assets/reference/strike_11_impact.jpg'),
  strike_12: require('@/assets/reference/strike_12_impact.jpg'),
};

/**
 * Centralized Reference Metadata for all 12 strikes of Arnis.
 * Empirical biomechanical angles derived from AlphaPose ground-truth dataset (arnis_dataset_v2.csv).
 */
export const ARNIS_REFERENCE_DATA: Record<string, CoachStrikeReference> = {
  strike_1: {
    strikeId: 'strike_1',
    strikeNumber: 1,
    name: 'Strike 1: Left Temple',
    filipinoName: 'Pang-una (Kaliwang Sintido)',
    target: 'Left Temple / Neck / Carotid Artery',
    trajectory: 'Diagonal Downward Slash (Forehand)',
    withFootwork: {
      front: {
        videoSource: LOCAL_STRIKE_VIDEOS.strike_1,
        impactSnapshot: LOCAL_COACH_SNAPSHOTS.strike_1,
        impactFrame: 44,
        impactTime: 1.47,
        angles: {
          elbow: 124.0,
          shoulder: 106.0,
          knee: 174.4,
          guard: 65.0,
          wrist: 88.0,
        },
        confidence: 0.94,
        cues: [
          'Chamber weapon at right ear at 45° angle',
          'Keep Kalasag check hand pinned firmly to solar plexus',
          'Deliver diagonal slash cutting across opponent temple',
          'Snap wrist (Pitik) at apex and stop at opposite hip',
        ],
      },
    },
  },
  strike_2: {
    strikeId: 'strike_2',
    strikeNumber: 2,
    name: 'Strike 2: Right Temple',
    filipinoName: 'Pangalawa (Kanan Sintido)',
    target: 'Right Temple / Neck / Clavicle',
    trajectory: 'Diagonal Downward Slash (Backhand)',
    withFootwork: {
      front: {
        videoSource: LOCAL_STRIKE_VIDEOS.strike_2,
        impactSnapshot: LOCAL_COACH_SNAPSHOTS.strike_2,
        impactFrame: 38,
        impactTime: 1.27,
        angles: {
          elbow: 157.6,
          shoulder: 131.2,
          knee: 176.5,
          guard: 75.0,
          wrist: 85.0,
        },
        confidence: 0.93,
        cues: [
          'Chamber across torso near left shoulder',
          'Check hand remains high shielding chest',
          'Drive through target with diagonal backhand release',
          'Smoothly rebound back into chamber',
        ],
      },
    },
  },
  strike_3: {
    strikeId: 'strike_3',
    strikeNumber: 3,
    name: 'Strike 3: Left Torso',
    filipinoName: 'Pangatlo (Kaliwang Tagiliran)',
    target: 'Left Floating Ribs / Kidney / Flank',
    trajectory: 'Horizontal Forehand Slash',
    withFootwork: {
      front: {
        videoSource: LOCAL_STRIKE_VIDEOS.strike_3,
        impactSnapshot: LOCAL_COACH_SNAPSHOTS.strike_3,
        impactFrame: 41,
        impactTime: 1.37,
        angles: {
          elbow: 114.0,
          shoulder: 98.8,
          knee: 170.9,
          guard: 75.0,
          wrist: 86.0,
        },
        confidence: 0.92,
        cues: [
          'Level hip-high slicing horizontal trajectory',
          'Torso pivots to transfer core rotation into the strike',
          'Maintain live hand guard ready to deflect counters',
        ],
      },
    },
  },
  strike_4: {
    strikeId: 'strike_4',
    strikeNumber: 4,
    name: 'Strike 4: Right Torso',
    filipinoName: 'Pang-apat (Kanang Tagiliran)',
    target: 'Right Floating Ribs / Kidney / Flank',
    trajectory: 'Horizontal Backhand Slash',
    withFootwork: {
      front: {
        videoSource: LOCAL_STRIKE_VIDEOS.strike_4,
        impactSnapshot: LOCAL_COACH_SNAPSHOTS.strike_4,
        impactFrame: 104,
        impactTime: 3.47,
        angles: {
          elbow: 124.7,
          shoulder: 49.4,
          knee: 176.5,
          guard: 80.0,
          wrist: 84.0,
        },
        confidence: 0.91,
        cues: [
          'Chamber across chest at waist height',
          'Slice horizontally through the right ribs',
          'Control deceleration to avoid over-twisting',
        ],
      },
    },
  },
  strike_5: {
    strikeId: 'strike_5',
    strikeNumber: 5,
    name: 'Strike 5: Abdomen Thrust',
    filipinoName: 'Panlimang Saksak (Tiyan / Pusod)',
    target: 'Solar Plexus / Navel / Abdomen',
    trajectory: 'Linear Centerline Thrust (Saksak)',
    withFootwork: {
      front: {
        videoSource: LOCAL_STRIKE_VIDEOS.strike_5,
        impactSnapshot: LOCAL_COACH_SNAPSHOTS.strike_5,
        impactFrame: 116,
        impactTime: 3.87,
        angles: {
          elbow: 167.2,
          shoulder: 16.0,
          knee: 176.6,
          guard: 60.0,
          wrist: 90.0,
        },
        confidence: 0.95,
        cues: [
          'Linear thrust straight down the centerline',
          'Keep weapon parallel to floor at contact apex',
          'Immediately retract (Bawi) back to Tindig stance',
        ],
      },
    },
  },
  strike_6: {
    strikeId: 'strike_6',
    strikeNumber: 6,
    name: 'Strike 6: Left Chest',
    filipinoName: 'Pang-anim (Kaliwang Dibdib)',
    target: 'Left Pectoral / Lung / Armpit',
    trajectory: 'High Forehand Thrust (Palm Up)',
    withFootwork: {
      front: {
        videoSource: LOCAL_STRIKE_VIDEOS.strike_6,
        impactSnapshot: LOCAL_COACH_SNAPSHOTS.strike_6,
        impactFrame: 13,
        impactTime: 0.43,
        angles: {
          elbow: 173.8,
          shoulder: 28.6,
          knee: 169.3,
          guard: 65.0,
          wrist: 89.0,
        },
        confidence: 0.93,
        cues: [
          'Palm-up high chest thrust',
          'Target the upper thoracic quadrant',
          'Shield face with non-striking Kalasag arm',
        ],
      },
    },
  },
  strike_7: {
    strikeId: 'strike_7',
    strikeNumber: 7,
    name: 'Strike 7: Right Chest',
    filipinoName: 'Pampito (Kanang Dibdib)',
    target: 'Right Pectoral / Heart Area',
    trajectory: 'High Backhand Thrust (Palm Down)',
    withFootwork: {
      front: {
        videoSource: LOCAL_STRIKE_VIDEOS.strike_7,
        impactSnapshot: LOCAL_COACH_SNAPSHOTS.strike_7,
        impactFrame: 49,
        impactTime: 1.63,
        angles: {
          elbow: 156.3,
          shoulder: 25.2,
          knee: 175.4,
          guard: 70.0,
          wrist: 87.0,
        },
        confidence: 0.92,
        cues: [
          'Palm-down inverted high thrust',
          'Drive point through opponent right chest',
          'Snap wrist firmly at the apex',
        ],
      },
    },
  },
  strike_8: {
    strikeId: 'strike_8',
    strikeNumber: 8,
    name: 'Strike 8: Left Knee',
    filipinoName: 'Pangwalo (Kaliwang Tuhod)',
    target: 'Left Knee Joint / Lower Shin',
    trajectory: 'Low Diagonal Downward Slash (Forehand)',
    withFootwork: {
      front: {
        videoSource: LOCAL_STRIKE_VIDEOS.strike_8,
        impactSnapshot: LOCAL_COACH_SNAPSHOTS.strike_8,
        impactFrame: 79,
        impactTime: 2.63,
        angles: {
          elbow: 178.1,
          shoulder: 16.2,
          knee: 174.8,
          guard: 70.0,
          wrist: 88.0,
        },
        confidence: 0.94,
        cues: [
          'Lower your center of gravity by bending knees, not waist',
          'Cut downward through the joint line',
          'Keep head high and Kalasag guard shielding chest',
        ],
      },
    },
  },
  strike_9: {
    strikeId: 'strike_9',
    strikeNumber: 9,
    name: 'Strike 9: Right Knee',
    filipinoName: 'Pangsiyam (Kanang Tuhod)',
    target: 'Right Knee Joint / Lower Shin',
    trajectory: 'Low Diagonal Downward Slash (Backhand)',
    withFootwork: {
      front: {
        videoSource: LOCAL_STRIKE_VIDEOS.strike_9,
        impactSnapshot: LOCAL_COACH_SNAPSHOTS.strike_9,
        impactFrame: 98,
        impactTime: 3.27,
        angles: {
          elbow: 174.1,
          shoulder: 1.6,
          knee: 180.0,
          guard: 75.0,
          wrist: 86.0,
        },
        confidence: 0.93,
        cues: [
          'Sink into low athletic stance (Tindig)',
          'Deliver diagonal backhand cut across right knee',
          'Recoil swiftly to ready chamber',
        ],
      },
    },
  },
  strike_10: {
    strikeId: 'strike_10',
    strikeNumber: 10,
    name: 'Strike 10: Left Eye',
    filipinoName: 'Pansampu (Kaliwang Mata)',
    target: 'Left Eye / Temple / Facial Nerve',
    trajectory: 'High Forward Thrust (Palm Up)',
    withFootwork: {
      front: {
        videoSource: LOCAL_STRIKE_VIDEOS.strike_10,
        impactSnapshot: LOCAL_COACH_SNAPSHOTS.strike_10,
        impactFrame: 3,
        impactTime: 0.10,
        angles: {
          elbow: 176.6,
          shoulder: 28.9,
          knee: 178.0,
          guard: 65.0,
          wrist: 92.0,
        },
        confidence: 0.91,
        cues: [
          'High lightning-fast eye thrust',
          'Weapon aligns directly with sight line',
          'Snap and recover instantly without dropping guard',
        ],
      },
    },
  },
  strike_11: {
    strikeId: 'strike_11',
    strikeNumber: 11,
    name: 'Strike 11: Right Eye',
    filipinoName: 'Panlabing-isa (Kanang Mata)',
    target: 'Right Eye / Temple / Facial Nerve',
    trajectory: 'High Forward Thrust (Palm Down)',
    withFootwork: {
      front: {
        videoSource: LOCAL_STRIKE_VIDEOS.strike_11,
        impactSnapshot: LOCAL_COACH_SNAPSHOTS.strike_11,
        impactFrame: 29,
        impactTime: 0.97,
        angles: {
          elbow: 176.0,
          shoulder: 34.0,
          knee: 168.8,
          guard: 70.0,
          wrist: 91.0,
        },
        confidence: 0.92,
        cues: [
          'High inverted palm-down facial thrust',
          'Linear trajectory straight to ocular cavity',
          'Lock wrist on impact point and recoil',
        ],
      },
    },
  },
  strike_12: {
    strikeId: 'strike_12',
    strikeNumber: 12,
    name: 'Strike 12: Crown Strike',
    filipinoName: 'Panlabindalawa (Bumbunan / Tuktok)',
    target: 'Crown of the Head / Skull Apex',
    trajectory: 'Vertical Downward Strike (Bumbunan)',
    withFootwork: {
      front: {
        videoSource: LOCAL_STRIKE_VIDEOS.strike_12,
        impactSnapshot: LOCAL_COACH_SNAPSHOTS.strike_12,
        impactFrame: 43,
        impactTime: 1.43,
        angles: {
          elbow: 123.1,
          shoulder: 164.7,
          knee: 178.5,
          guard: 75.0,
          wrist: 90.0,
        },
        confidence: 0.96,
        cues: [
          'Chamber high above head along the sagittal plane',
          'Chop straight down through the center of opponent crown',
          'Squeeze grip firmly at apex contact',
          'Stop at forehead height to protect fingers',
        ],
      },
    },
  },
};

/**
 * Access canonical coach reference data for a given strike and footwork mode.
 */
export function getCoachReference(
  strikeId: string,
  footworkMode: 'withFootwork' | 'withoutFootwork' = 'withFootwork',
  view: 'front' = 'front'
): CoachStrikeReferenceItem {
  const normId = strikeId.startsWith('strike_') ? strikeId : `strike_${strikeId}`;
  const ref = ARNIS_REFERENCE_DATA[normId] || ARNIS_REFERENCE_DATA.strike_1;

  if (footworkMode === 'withoutFootwork' && ref.withoutFootwork?.[view]) {
    return ref.withoutFootwork[view];
  }
  return ref.withFootwork[view];
}

/**
 * Access the full strike reference container.
 */
export function getStrikeReference(strikeId: string): CoachStrikeReference {
  const normId = strikeId.startsWith('strike_') ? strikeId : `strike_${strikeId}`;
  return ARNIS_REFERENCE_DATA[normId] || ARNIS_REFERENCE_DATA.strike_1;
}
