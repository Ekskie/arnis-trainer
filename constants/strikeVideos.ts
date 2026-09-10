export interface StrikeVideoItem {
  id: string;
  strikeNumber: number;
  name: string;
  filipinoName: string;
  target: string;
  trajectory: string;
  videoSource?: any;
  videoUrl?: string; // Optional remote HTTPS URL fallback
  keyCues: string[];
  commonFault: string;
  guroAdvice: string;
}

export const LOCAL_STRIKE_VIDEOS: Record<string, any> = {
  strike_1: require('@/assets/videos/strike_1.mp4'),
  strike_2: require('@/assets/videos/strike_2.mp4'),
  strike_3: require('@/assets/videos/strike_3.mp4'),
  strike_4: require('@/assets/videos/strike_4.mp4'),
  strike_5: require('@/assets/videos/strike_5.mp4'),
  strike_6: require('@/assets/videos/strike_6.mp4'),
  strike_7: require('@/assets/videos/strike_7.mp4'),
  strike_8: require('@/assets/videos/strike_8.mp4'),
  strike_9: require('@/assets/videos/strike_9.mp4'),
  strike_10: require('@/assets/videos/strike_10.mp4'),
  strike_11: require('@/assets/videos/strike_11.mp4'),
  strike_12: require('@/assets/videos/strike_12.mp4'),
};

export const STRIKE_VIDEOS_CATALOG: Record<string, StrikeVideoItem> = {
  "strike_1": {
    id: "strike_1",
    strikeNumber: 1,
    name: "Strike 1: Left Temple",
    filipinoName: "Pang-una (Kaliwang Sintido)",
    target: "Left Temple / Neck / Carotid Artery",
    trajectory: "Diagonal Downward Slash (Forehand)",
    videoSource: LOCAL_STRIKE_VIDEOS.strike_1,
    keyCues: [
      "Chamber weapon at right ear level at 45° angle",
      "Left check hand (Kalasag) pressed firmly against chest",
      "Slash diagonally downward across the left temple",
      "Snap the wrist (Pitik) at apex and stop at left hip before recovering"
    ],
    commonFault: "Dropping the left check hand down to hip level during swing.",
    guroAdvice: "Power comes from hip rotation and the final wrist snap, not shoulder tension."
  },
  "strike_2": {
    id: "strike_2",
    strikeNumber: 2,
    name: "Strike 2: Right Temple",
    filipinoName: "Pangalawa (Kanan Sintido)",
    target: "Right Temple / Neck / Clavicle",
    trajectory: "Diagonal Downward Slash (Backhand)",
    videoSource: LOCAL_STRIKE_VIDEOS.strike_2,
    keyCues: [
      "Chamber weapon across torso near left shoulder",
      "Left check hand remains pinned to solar plexus",
      "Pivot hips forward and deliver diagonal backhand cut",
      "Smoothly rebound weapon back into dominant shoulder chamber"
    ],
    commonFault: "Over-rotating the torso past 45°, losing balance and sight of opponent.",
    guroAdvice: "Snap the wrist right at contact point to turn a push into a concussive strike."
  },
  "strike_3": {
    id: "strike_3",
    strikeNumber: 3,
    name: "Strike 3: Left Torso",
    filipinoName: "Pangatlo (Kaliwang Tagiliran)",
    target: "Left Floating Ribs / Kidney / Flank",
    trajectory: "Horizontal Forehand Cut",
    videoSource: LOCAL_STRIKE_VIDEOS.strike_3,
    keyCues: [
      "Cock weapon horizontally at right hip level",
      "Sink weight 2 inches deeper into lead knee (135°-165°)",
      "Slice horizontally parallel to floor through floating ribs",
      "Circle stick tip back into primary chest guard"
    ],
    commonFault: "Swinging at an upward diagonal instead of maintaining a flat horizontal plane.",
    guroAdvice: "Engage your core and twist from the obliques for maximum lever arm torque."
  },
  "strike_4": {
    id: "strike_4",
    strikeNumber: 4,
    name: "Strike 4: Right Torso",
    filipinoName: "Pang-apat (Kanan Tagiliran)",
    target: "Right Floating Ribs / Elbow Joint",
    trajectory: "Horizontal Backhand Cut",
    videoSource: LOCAL_STRIKE_VIDEOS.strike_4,
    keyCues: [
      "Cock weapon across torso at left hip level",
      "Maintain active left check hand at chest height",
      "Drive a horizontal backhand cut across the right ribs",
      "Keep elbow extended between 121° and 165° at apex"
    ],
    commonFault: "Allowing elbow to collapse inwards against your own ribs on release.",
    guroAdvice: "Keep lead knee stable to absorb weapon recoil without leaning backward."
  },
  "strike_5": {
    id: "strike_5",
    strikeNumber: 5,
    name: "Strike 5: Abdomen Thrust",
    filipinoName: "Pang-lima (Saksak sa Tiyan)",
    target: "Solar Plexus / Navel / Abdomen",
    trajectory: "Linear Forward Thrust (Saksak)",
    videoSource: LOCAL_STRIKE_VIDEOS.strike_5,
    keyCues: [
      "Stick tip points forward at waist height, Punyo close to hip",
      "Lunge forward with linear thrust driving into core",
      "Arm extends nearly straight (151°-168°)",
      "Instant retraction (Bawi) along the exact same entry line"
    ],
    commonFault: "Leaving thrust extended too long, inviting an immediate weapon grab or disarm.",
    guroAdvice: "The retraction in Strike 5 must be just as fast as the forward thrust."
  },
  "strike_6": {
    id: "strike_6",
    strikeNumber: 6,
    name: "Strike 6: Left Chest Thrust",
    filipinoName: "Pang-anim (Saksak sa Kaliwang Dibdib)",
    target: "Left Upper Chest / Clavicle / Heart Area",
    trajectory: "Upward Linear Thrust (Forehand)",
    videoSource: LOCAL_STRIKE_VIDEOS.strike_6,
    keyCues: [
      "Chamber weapon at right chest height with palm facing upward",
      "Left check hand protects your chin and throat",
      "Drive upward-angled thrust into left pectoral/clavicle",
      "Elbow extends to near lockout (158°-179°)"
    ],
    commonFault: "Thrusting with palm facing down, which reduces forward wrist support.",
    guroAdvice: "Keep thumb pointing forward along the stick shaft to lock the wrist joint."
  },
  "strike_7": {
    id: "strike_7",
    strikeNumber: 7,
    name: "Strike 7: Right Chest Thrust",
    filipinoName: "Pang-pito (Saksak sa Kanang Dibdib)",
    target: "Right Upper Chest / Subclavian Region",
    trajectory: "Upward Linear Thrust (Backhand)",
    videoSource: LOCAL_STRIKE_VIDEOS.strike_7,
    keyCues: [
      "Chamber weapon at left shoulder height with palm facing downward",
      "Rotate hips smoothly forward into the thrust",
      "Target right upper chest / subclavian nerve junction",
      "Snap straight into apex and recover immediately to center"
    ],
    commonFault: "Dropping shoulder level, which exposes the neck to counter-cuts.",
    guroAdvice: "Align your forearm with the stick shaft so kinetic recoil travels into your frame."
  },
  "strike_8": {
    id: "strike_8",
    strikeNumber: 8,
    name: "Strike 8: Left Knee",
    filipinoName: "Pang-walo (Kaliwang Tuhod)",
    target: "Left Knee Joint / Lower Thigh",
    trajectory: "Downward Diagonal Slash (Forehand)",
    videoSource: LOCAL_STRIKE_VIDEOS.strike_8,
    keyCues: [
      "Chamber high beside right ear",
      "Lower entire body by bending knees (Tindig)—DO NOT bend at the spine!",
      "Slash downward diagonally targeting the lead knee",
      "Recover weapon rapidly back to chest height"
    ],
    commonFault: "Bending forward at the waist with straight legs, compromising head defense.",
    guroAdvice: "Knee strikes require sinking your stance: drop your hips to protect your head."
  },
  "strike_9": {
    id: "strike_9",
    strikeNumber: 9,
    name: "Strike 9: Right Knee",
    filipinoName: "Pang-siyam (Kanang Tuhod)",
    target: "Right Knee Joint / Lower Leg",
    trajectory: "Downward Diagonal Slash (Backhand)",
    videoSource: LOCAL_STRIKE_VIDEOS.strike_9,
    keyCues: [
      "Chamber across body near left shoulder",
      "Sink center of gravity deeply with bent knees",
      "Deliver diagonal backhand cut targeting right knee joint",
      "Follow through and return to ready guard stance"
    ],
    commonFault: "Allowing weapon to bounce off the floor or overshoot behind your legs.",
    guroAdvice: "Stop the strike cleanly at knee height with firm grip tension."
  },
  "strike_10": {
    id: "strike_10",
    strikeNumber: 10,
    name: "Strike 10: Left Eye Thrust",
    filipinoName: "Pang-sampu (Saksak sa Kaliwang Mata)",
    target: "Left Eye / Facial Nerve / Temple",
    trajectory: "Direct High Thrust (Forehand)",
    videoSource: LOCAL_STRIKE_VIDEOS.strike_10,
    keyCues: [
      "Chamber at ear level along eye sightline",
      "Minimal wind-up to avoid telegraphing attack",
      "Flick stick tip directly forward targeting eye socket",
      "Immediate linear retraction back to chest guard"
    ],
    commonFault: "Telegraphing with large wind-up or dropping check hand below chest.",
    guroAdvice: "Speed and precision outweigh raw muscle force on facial nerve targets."
  },
  "strike_11": {
    id: "strike_11",
    strikeNumber: 11,
    name: "Strike 11: Right Eye Thrust",
    filipinoName: "Pang-labing-isa (Saksak sa Kanang Mata)",
    target: "Right Eye / Facial Nerve / Temple",
    trajectory: "Direct High Thrust (Backhand)",
    videoSource: LOCAL_STRIKE_VIDEOS.strike_11,
    keyCues: [
      "Chamber weapon at left eye level across bridge of nose",
      "Keep striking wrist locked straight with forearm",
      "Deliver precise backhand thrust to right eye socket",
      "Pull straight back into ready defensive guard"
    ],
    commonFault: "Wrist buckling on release, which dissipates thrust penetration.",
    guroAdvice: "Squeeze pinky and ring fingers firmly right as the weapon reaches apex extension."
  },
  "strike_12": {
    id: "strike_12",
    strikeNumber: 12,
    name: "Strike 12: Crown Strike",
    filipinoName: "Pang-labindalawa (Baston sa Tuktok)",
    target: "Crown of the Skull / Sagittal Suture",
    trajectory: "Vertical Overhead Downward Strike",
    videoSource: LOCAL_STRIKE_VIDEOS.strike_12,
    keyCues: [
      "Raise weapon straight overhead along spine centerline",
      "Keep knees bent and weight centered between both feet",
      "Chop straight down vertically into skull crown",
      "Keep striking elbow flexed at 111°-135° to absorb recoil"
    ],
    commonFault: "Over-extending elbow to 180°, damaging elbow joint on hard impact.",
    guroAdvice: "Never lock your elbow straight at impact—slight flexion absorbs violent recoil."
  }
};
