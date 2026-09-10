import AsyncStorage from '@react-native-async-storage/async-storage';
import { STRIKE_VIDEOS_CATALOG, StrikeVideoItem } from './strikeVideos';

export interface CurriculumLesson {
  id: string;
  levelId: 'level_0' | 'level_1' | 'level_2' | 'level_3' | 'level_4';
  levelNumber: number;
  lessonNumber: number;
  title: string;
  filipinoTitle?: string;
  subtitle: string;
  target?: string;
  trajectory?: string;
  purpose?: string;
  mnemonicFormula?: string;
  description: string;
  durationMinutes: number;
  strikeKey?: string;
  isStrike: boolean;
  coachSteps: string[];
  commonMistakes: string[];
  guroAdvice: string;
  category: 'orientation' | 'fundamentals' | 'strikes' | 'drills' | 'assessment';
}

export interface CurriculumLevel {
  id: 'level_0' | 'level_1' | 'level_2' | 'level_3' | 'level_4';
  levelNumber: number;
  name: string;
  tagline: string;
  badge: string;
  badgeColor: string;
  description: string;
  lessons: CurriculumLesson[];
}

export interface CurriculumProgress {
  completedLessonIds: string[];
  currentLessonId: string;
  totalLessons: number;
  completedCount: number;
  progressPercentage: number;
  lastTrainedDate?: string;
}

export const CURRICULUM_DATA: CurriculumLevel[] = [
  {
    id: 'level_0',
    levelNumber: 0,
    name: 'Level 0 — Orientation',
    tagline: 'Zero-Knowledge Welcome & Safety Protocols',
    badge: 'ORIENTATION',
    badgeColor: '#6366F1',
    description: 'Learn the cultural legacy, your rattan equipment, safe practice boundaries, and core Arnis terminology.',
    lessons: [
      {
        id: 'les_0_1',
        levelId: 'level_0',
        levelNumber: 0,
        lessonNumber: 1,
        title: 'What is Arnis?',
        filipinoTitle: 'Pambansang Sining ng Pilipinas',
        subtitle: 'The National Martial Art & Sport of the Philippines',
        description: 'Arnis (also known as Eskrima or Kali) is the indigenous martial art of the Philippines, officially declared the National Sport by Republic Act 9850. It emphasizes weapon mastery first, which seamlessly translates into empty-hand self defense.',
        durationMinutes: 3,
        isStrike: false,
        category: 'orientation',
        coachSteps: [
          'Understand that Arnis is an ancient Filipino blade-and-stick martial art.',
          'Weapon training teaches spatial awareness, perimeter control, and reflex speed.',
          'Skills learned with the rattan stick directly transfer to empty-hand blocking, striking, and disarms.',
          'Focus on discipline, respect for your training partner, and fluid flow rather than brute strength.'
        ],
        commonMistakes: [
          'Treating Arnis as a baseball bat swing instead of a precise blade art.',
          'Rushing with muscle tension instead of relaxed, continuous kinetic motion.'
        ],
        guroAdvice: 'In Arnis, the stick is simply an extension of the arm, and the blade is an extension of the spirit. Breathe, relax, and flow.',
      },
      {
        id: 'les_0_2',
        levelId: 'level_0',
        levelNumber: 0,
        lessonNumber: 2,
        title: 'The Rattan Stick (Baston)',
        filipinoTitle: 'Ang Baston at Bahagi Nito',
        subtitle: 'Anatomy, Dimensions, and Material Selection',
        description: 'The standard Arnis training weapon is a rattan cane (Olis / Yantok), typically 28 inches in length and 3/4 to 1 inch in diameter. Rattan fibers do not splinter into dangerous sharp shards like hardwood, making it the safest training medium.',
        durationMinutes: 3,
        isStrike: false,
        category: 'orientation',
        coachSteps: [
          'Inspect your stick before every practice: ensure it has no deep fractures or splinters.',
          'Identify the Tip (Dulo) — used for linear thrusts (Saksak) and slicing paths.',
          'Identify the Shaft (Katawan) — used for blocking and diagonal slashes.',
          'Identify the Butt (Punyo) — the protruding base used for close-quarters hooking and disarms.'
        ],
        commonMistakes: [
          'Using broken or splintered rattan that could cause hand cuts.',
          'Using heavy metallic bars or brittle wood for beginner velocity training.'
        ],
        guroAdvice: 'Your stick is your primary training tool. Treat it with care and inspect the rattan nodes before swinging.',
      },
      {
        id: 'les_0_3',
        levelId: 'level_0',
        levelNumber: 0,
        lessonNumber: 3,
        title: 'Safety Rules & Equipment',
        filipinoTitle: 'Alituntunin sa Kaligtasan',
        subtitle: 'Essential Precautions for Safe Training',
        description: 'Martial practice demands strict safety etiquette. Always verify your training environment, maintain clear arm extension clearance, and warm up your wrists and shoulders before executing strikes.',
        durationMinutes: 3,
        isStrike: false,
        category: 'orientation',
        coachSteps: [
          'Verify a minimum clearance radius of 2 meters (6.5 feet) around yourself in all directions.',
          'Confirm no pets, spectators, or fragile household objects are in your striking sphere.',
          'Warm up your wrists with circular rotations (Otso-otso) and dynamic shoulder sweeps.',
          'Always remember: AI evaluation provides kinematic training feedback, not a substitute for an in-person certified Guro.'
        ],
        commonMistakes: [
          'Swinging full power indoors without checking ceiling height or furniture clearance.',
          'Skipping wrist warm-ups, risking tendinitis or joint strain from rapid deceleration.'
        ],
        guroAdvice: 'Control is the highest form of martial mastery. A master can stop a full-speed strike one millimeter before the target.',
      },
      {
        id: 'les_0_4',
        levelId: 'level_0',
        levelNumber: 0,
        lessonNumber: 4,
        title: 'Training Space & Camera Setup',
        filipinoTitle: 'Paghahanda ng Lugar at Camera',
        subtitle: 'Optimal Positioning for Computer Vision Pose Tracking',
        description: 'For PoseFix-Arnis to accurately track all 33 skeletal joints and your stick motion, your phone camera must see your entire body from head to toes with adequate lighting.',
        durationMinutes: 2,
        isStrike: false,
        category: 'orientation',
        coachSteps: [
          'Place your phone at waist-to-chest height on a stable surface, tripod, or shelf.',
          'Step back 2.5 to 3.5 meters until your whole body is visible in the frame.',
          'Ensure front lighting: avoid standing directly in front of bright windows (backlighting).',
          'Wear contrasting clothes to the room background for optimal joint landmark segmentation.'
        ],
        commonMistakes: [
          'Placing phone on the floor pointing upward, distorting limb angle calculations.',
          'Standing too close so hands or knees are cropped out of the frame.'
        ],
        guroAdvice: 'Good camera framing ensures the AI accurately scores your knee flexion, elbow extension, and guard position.',
      },
      {
        id: 'les_0_5',
        levelId: 'level_0',
        levelNumber: 0,
        lessonNumber: 5,
        title: 'Basic Filipino Martial Arts Terminology',
        filipinoTitle: 'Talasalitaan ng Arnis',
        subtitle: 'The Vocabulary of Masters & Practitioners',
        description: 'Familiarize yourself with authentic Tagalog and Cebuano martial terms used throughout lessons and voice coaching.',
        durationMinutes: 3,
        isStrike: false,
        category: 'orientation',
        coachSteps: [
          'Guro (Teacher / Master) — The instructor guiding your technique.',
          'Pugay (Salute / Bow) — Sign of respect given before and after entering the training floor.',
          'Handa (Ready) — The centered ready stance preparing for combat.',
          'Kalasag (Shield / Check Hand) — The live, non-striking hand guarding your chest.',
          'Pitik (Wrist Snap) — Concussive whipping motion delivered at the apex of strikes.'
        ],
        commonMistakes: [
          'Ignoring the cultural heritage and treating Arnis as mere mechanical motion.'
        ],
        guroAdvice: 'Speaking the terminology connects you to over five centuries of Philippine warrior tradition.',
      },
    ],
  },
  {
    id: 'level_1',
    levelNumber: 1,
    name: 'Level 1 — Fundamentals',
    tagline: 'Grip, Stance, Guard & Footwork Foundations',
    badge: 'FUNDAMENTALS',
    badgeColor: '#10B981',
    description: 'Master the non-negotiable physical pillars: how to hold the weapon, how to stand, how to protect your core, and how to glide.',
    lessons: [
      {
        id: 'les_1_1',
        levelId: 'level_1',
        levelNumber: 1,
        lessonNumber: 1,
        title: 'Proper Stance (Tindig)',
        filipinoTitle: 'Wastong Tindig at Handa',
        subtitle: 'Balance, Low Center of Gravity, and Spring Leverage',
        description: 'Your stance is your foundation. Standing tall like a statue makes you vulnerable to takedowns and ruins strike power. A deep, athletic knee bend (135°-165°) anchors your base and drives explosive hip rotation.',
        durationMinutes: 4,
        isStrike: false,
        category: 'fundamentals',
        coachSteps: [
          'Step your dominant right foot forward, angled roughly 45° toward your target.',
          'Place rear left foot back roughly shoulder-width and a half apart.',
          'Bend BOTH knees into an athletic crouch (ideal knee angle: 135° to 165°).',
          'Keep 60% of your body weight on your lead foot and 40% on your rear foot.',
          'Keep your spine erect and chest open—never lean your head forward past your lead knee.'
        ],
        commonMistakes: [
          'Standing with straight, locked knees (the AI will flag HIGH_STANCE).',
          'Bending at the waist instead of bending at the knees.',
          'Placing feet in a straight tightrope line, losing lateral balance.'
        ],
        guroAdvice: 'Think of your legs as coiled springs. Power starts in the floor, travels through the knees and hips, and explodes out the stick tip.',
      },
      {
        id: 'les_1_2',
        levelId: 'level_1',
        levelNumber: 1,
        lessonNumber: 2,
        title: 'The Basic Grip & Punyo',
        filipinoTitle: 'Hawak at ang Gamit ng Punyo',
        subtitle: 'Weapon Retention and Disarm Prevention',
        description: 'Never grip your Arnis stick at the absolute bottom rim! You must always leave 1.5 to 2 inches of exposed rattan protruding beneath your little finger. This exposed base is the Punyo.',
        durationMinutes: 4,
        isStrike: false,
        category: 'fundamentals',
        coachSteps: [
          'Place the stick across the base of your fingers with palm open.',
          'Leave exactly 1.5 to 2 inches (two finger widths) of wood below your pinky finger.',
          'Wrap your fingers around the shaft, clamping your thumb firmly over your index fingernail.',
          'Hold with relaxed firm tension (like holding a bird: not so tight you crush it, not so loose it flies away).',
          'Tighten grip to 100% only at the exact instant of strike impact.'
        ],
        commonMistakes: [
          'Holding the very bottom of the stick, losing the Punyo and making disarms easy.',
          'Extending the thumb straight along the stick shaft (can break the thumb upon weapon clash).'
        ],
        guroAdvice: 'The Punyo is not excess wood—it is an auxiliary hammer for close-range strikes, chokes, and strip disarms.',
      },
      {
        id: 'les_1_3',
        levelId: 'level_1',
        levelNumber: 1,
        lessonNumber: 3,
        title: 'The Check Hand (Kalasag)',
        filipinoTitle: 'Ang Kamay na Buhay (Live Hand)',
        subtitle: 'Your Living Shield and Counter-Defense',
        description: 'In Filipino Martial Arts, the non-weapon hand is called the "Live Hand" (Kalasag / Kamay na Buhay). It must never hang loosely by your hip or pocket. Keep it pinned to your chest or solar plexus.',
        durationMinutes: 4,
        isStrike: false,
        category: 'fundamentals',
        coachSteps: [
          'Raise your left (non-striking) hand to your chest/solar plexus level.',
          'Keep the palm open or lightly cupped, ready to check incoming weapons.',
          'When swinging the weapon with your right hand, keep the left hand glued to your chest.',
          'In application, the live hand parries the opponent’s stick, checks their elbow, and locks disarms.'
        ],
        commonMistakes: [
          'Dropping the check hand down to the waist or hip during swings (AI flags GUARD_LOW).',
          'Flailing the check hand behind the back, leaving the entire chest exposed to counter-thrusts.'
        ],
        guroAdvice: 'The hand with the stick attacks; the hand without the stick keeps you alive. Never drop your shield!',
      },
      {
        id: 'les_1_4',
        levelId: 'level_1',
        levelNumber: 1,
        lessonNumber: 4,
        title: 'Footwork & Triangulation (Hakbang)',
        filipinoTitle: 'Tatsulok na Paghakbang',
        subtitle: 'Moving Off the Centerline of Attack',
        description: 'Arnis practitioners do not step in straight predictable lines. We step along the points of an imaginary triangle on the floor, entering or evading strikes while maintaining counter angles.',
        durationMinutes: 5,
        isStrike: false,
        category: 'fundamentals',
        coachSteps: [
          'Imagine a triangle on the ground with the apex pointing toward your opponent.',
          'Forward Triangle (Paharap): Step off-line 45° to the right, then slide your rear foot.',
          'Reverse Triangle (Paurong): Step back 45° to clear the path of an incoming slash.',
          'Always step and plant your lead foot before delivering the full apex strike.',
          'Maintain a low center of gravity throughout each step-and-slide motion.'
        ],
        commonMistakes: [
          'Crossing your feet while moving, which instantly destroys your balance.',
          'Bobbing up and down while stepping instead of gliding smoothly parallel to the ground.'
        ],
        guroAdvice: 'Whoever controls the angle of footwork controls the fight. Never stand directly in front of the blade line.',
      },
      {
        id: 'les_1_5',
        levelId: 'level_1',
        levelNumber: 1,
        lessonNumber: 5,
        title: 'Combat Ranges (Largo, Medio, Corto)',
        filipinoTitle: 'Mga Distansya sa Labanan',
        subtitle: 'Long, Medium, and Close-Quarters Mechanics',
        description: 'Arnis categorizes engagement into three distinct combat ranges: Largo Mano (Long Range), Medio (Medium Range), and Corto (Close Quarters).',
        durationMinutes: 4,
        isStrike: false,
        category: 'fundamentals',
        coachSteps: [
          'Largo Mano (Long): Only weapons can reach. Target the opponent’s weapon hand or lead knee.',
          'Medio Mano (Medium): Weapons reach the torso and head. Primary range for the 12 strikes.',
          'Corto Mano (Close): Body-to-body distance. Punyo strikes, elbow locks, and disarms dominate.',
          'Our AI curriculum trains your Medio and Largo mechanics across the 12 strikes.'
        ],
        commonMistakes: [
          'Using close-range swing arcs when standing at long range, swinging uselessly at air.',
          'Forgetting to check the opponent’s forearm when collapsing into close range.'
        ],
        guroAdvice: 'Defang the snake: at long range, strike the opponent’s hand that holds the weapon, not their head.',
      },
    ],
  },
  {
    id: 'level_2',
    levelNumber: 2,
    name: 'Level 2 — The 12 Strikes',
    tagline: 'Canonical Strikes 1 through 12',
    badge: '12 STRIKES',
    badgeColor: '#D24B38',
    description: 'Learn each strike with consistent step-by-step coaching: What & Why, Video Demo, Body Diagram, Coach Steps, and AI Testing.',
    lessons: [
      {
        id: 'strike_1',
        levelId: 'level_2',
        levelNumber: 2,
        lessonNumber: 1,
        title: 'Strike 1 — Left Temple',
        filipinoTitle: 'Pang-una (Kaliwang Sintido)',
        subtitle: 'Diagonal Downward Forehand Slash',
        target: 'Left Temple / Neck / Carotid Artery',
        trajectory: 'Diagonal Downward Slash (Forehand 45°)',
        purpose: 'Master controlled diagonal striking mechanics, hip rotation, and firm recovery to guard.',
        mnemonicFormula: 'Target (Temple) → Direction (Diagonal Down) → Control (Wrist Snap) → Return (Chest Guard)',
        description: 'Strike 1 is the quintessential opening attack in Arnis. Delivered as a diagonal downward forehand slash targeting the opponent’s left temple or neck.',
        durationMinutes: 5,
        strikeKey: 'strike_1',
        isStrike: true,
        category: 'strikes',
        coachSteps: [
          '1. Start in your ready stance (Tindig) with knees bent.',
          '2. Raise your stick beside your right ear at a 45° angle.',
          '3. Keep your left check hand (Kalasag) pressed flat against your chest.',
          '4. Step forward and swing diagonally downward across toward the left temple.',
          '5. Snap your wrist (Pitik) at apex and smoothly return weapon to chest guard.'
        ],
        commonMistakes: [
          'Dropping your left check hand to your hip or pocket during the swing.',
          'Overextending the elbow into a wide baseball swing that loses recovery control.'
        ],
        guroAdvice: 'Power comes from hip rotation and the final wrist snap, not by tensing your shoulder.',
      },
      {
        id: 'strike_2',
        levelId: 'level_2',
        levelNumber: 2,
        lessonNumber: 2,
        title: 'Strike 2 — Right Temple',
        filipinoTitle: 'Pangalawa (Kanan Sintido)',
        subtitle: 'Diagonal Downward Backhand Slash',
        target: 'Right Temple / Neck / Clavicle',
        trajectory: 'Diagonal Downward Slash (Backhand 45°)',
        purpose: 'Develop powerful backhand cutting torque and balanced recovery without over-rotating the torso.',
        mnemonicFormula: 'Chamber (Left Ear) → Pivot (Hips Forward) → Cut (Right Temple) → Rebound (Right Chamber)',
        description: 'Strike 2 mirrors Strike 1 with a backhand delivery. Chambered across the torso at the left shoulder and slashing diagonally downward through the right temple.',
        durationMinutes: 5,
        strikeKey: 'strike_2',
        isStrike: true,
        category: 'strikes',
        coachSteps: [
          '1. Chamber the stick across your body near your left shoulder/ear.',
          '2. Keep left check hand firmly pinned to your solar plexus.',
          '3. Pivot your hips forward and deliver a diagonal downward backhand slash.',
          '4. Snap the wrist right at the contact point for concussive impact.',
          '5. Rebound the weapon smoothly back to your right shoulder chamber.'
        ],
        commonMistakes: [
          'Over-rotating your torso past 45°, losing sight of the target.',
          'Pushing with the shoulder instead of whipping with the wrist.'
        ],
        guroAdvice: 'Snap the wrist right at contact point to turn a slow push into a concussive strike.',
      },
      {
        id: 'strike_3',
        levelId: 'level_2',
        levelNumber: 2,
        lessonNumber: 3,
        title: 'Strike 3 — Left Torso',
        filipinoTitle: 'Pangatlo (Kaliwang Tagiliran)',
        subtitle: 'Horizontal Forehand Rib Cut',
        target: 'Left Floating Ribs / Kidney / Flank',
        trajectory: 'Horizontal Forehand Cut (Flat 0° Plane)',
        purpose: 'Maintain a flat horizontal cutting plane and engage oblique core torque.',
        mnemonicFormula: 'Cock (Right Hip) → Sink (Lead Knee) → Slice (Horizontal Ribs) → Circle (High Guard)',
        description: 'A horizontal forehand slash cutting through the opponent’s left ribs. Requires lowering your stance to drive beneath their arm guard.',
        durationMinutes: 5,
        strikeKey: 'strike_3',
        isStrike: true,
        category: 'strikes',
        coachSteps: [
          '1. Cock the stick horizontally at your right hip level.',
          '2. Sink your weight 2 inches deeper into your lead knee (135°-165°).',
          '3. Slice horizontally parallel to the floor cutting through the floating ribs.',
          '4. Keep your check hand active protecting your head and chin.',
          '5. Circle the stick tip back into your primary chest guard.'
        ],
        commonMistakes: [
          'Swinging at an upward diagonal instead of maintaining a flat horizontal plane.',
          'Standing too upright and cutting at shoulder level rather than rib level.'
        ],
        guroAdvice: 'Engage your core and twist from the obliques for maximum lever arm torque.',
      },
      {
        id: 'strike_4',
        levelId: 'level_2',
        levelNumber: 2,
        lessonNumber: 4,
        title: 'Strike 4 — Right Torso',
        filipinoTitle: 'Pang-apat (Kanan Tagiliran)',
        subtitle: 'Horizontal Backhand Rib Cut',
        target: 'Right Floating Ribs / Elbow Joint',
        trajectory: 'Horizontal Backhand Cut (Flat 0° Plane)',
        purpose: 'Execute a flat horizontal backhand cut with full elbow extension and stable base.',
        mnemonicFormula: 'Cross Chamber (Left Hip) → Open Chest → Slice (Right Ribs) → Snap & Guard',
        description: 'The horizontal backhand counterpart to Strike 3, cutting horizontally across the opponent’s right flank or exposed elbow joint.',
        durationMinutes: 5,
        strikeKey: 'strike_4',
        isStrike: true,
        category: 'strikes',
        coachSteps: [
          '1. Cock the stick across your torso at your left hip level.',
          '2. Maintain your active left check hand at chest height.',
          '3. Drive a horizontal backhand cut across the right ribs.',
          '4. Keep your striking elbow extending between 121° and 165° at apex.',
          '5. Snap the wrist to complete the cut and retract to dominant side.'
        ],
        commonMistakes: [
          'Allowing your elbow to collapse inwards against your own ribs on release.',
          'Leaning backwards away from the strike.'
        ],
        guroAdvice: 'Keep your lead knee stable to absorb weapon recoil without leaning backward.',
      },
      {
        id: 'strike_5',
        levelId: 'level_2',
        levelNumber: 2,
        lessonNumber: 5,
        title: 'Strike 5 — Abdomen Thrust',
        filipinoTitle: 'Pang-lima (Saksak sa Tiyan)',
        subtitle: 'Linear Core Stomach Thrust (Saksak)',
        target: 'Solar Plexus / Navel / Abdomen',
        trajectory: 'Linear Forward Thrust (Direct Line)',
        purpose: 'Train explosive linear penetration followed by lightning-fast weapon retraction (Bawi).',
        mnemonicFormula: 'Chamber (Waist Level) → Lunge (Core Thrust) → Lock Arm (155°-168°) → Instant Retract',
        description: 'A direct, piercing linear thrust to the core. Unlike slashes, thrusts have no arc—they travel along the straightest vector between you and the target.',
        durationMinutes: 5,
        strikeKey: 'strike_5',
        isStrike: true,
        category: 'strikes',
        coachSteps: [
          '1. Stick tip points forward at waist height, Punyo close to your right hip.',
          '2. Lunge forward with a linear thrust driving straight into the solar plexus.',
          '3. Extend your arm nearly straight (151° - 168°).',
          '4. Instantly retract (Bawi) along the exact same entry line back to guard.',
          '5. Never leave the weapon hanging out where it can be stripped.'
        ],
        commonMistakes: [
          'Leaving the thrust extended too long, inviting an immediate weapon grab (Agaw).',
          'Dropping the check hand when pushing forward.'
        ],
        guroAdvice: 'The retraction (Bawi) in Strike 5 must be just as fast as the forward thrust.',
      },
      {
        id: 'strike_6',
        levelId: 'level_2',
        levelNumber: 2,
        lessonNumber: 6,
        title: 'Strike 6 — Left Chest Thrust',
        filipinoTitle: 'Pang-anim (Saksak sa Kaliwang Dibdib)',
        subtitle: 'Upward Forehand Clavicle Thrust',
        target: 'Left Upper Chest / Clavicle / Heart Area',
        trajectory: 'Upward Linear Thrust (Forehand Angle)',
        purpose: 'Learn upward penetrating mechanics with palm facing upward for wrist support.',
        mnemonicFormula: 'Palm Up Chamber → Shield Chin → Upward Thrust → High Guard Retract',
        description: 'An upward-angled forehand thrust targeting the opponent’s left upper chest, subclavian vessel, or heart pocket.',
        durationMinutes: 5,
        strikeKey: 'strike_6',
        isStrike: true,
        category: 'strikes',
        coachSteps: [
          '1. Chamber weapon at right chest height with palm facing upward.',
          '2. Left check hand shields your chin and throat.',
          '3. Drive an upward-angled thrust into the left pectoral/clavicle.',
          '4. Elbow extends to near lockout (158° - 179°).',
          '5. Retract quickly back to chest level.'
        ],
        commonMistakes: [
          'Thrusting with palm facing downward, reducing forward wrist support.',
          'Dropping your check hand away from your chin.'
        ],
        guroAdvice: 'Keep thumb pointing forward along the stick shaft to lock the wrist joint upon contact.',
      },
      {
        id: 'strike_7',
        levelId: 'level_2',
        levelNumber: 2,
        lessonNumber: 7,
        title: 'Strike 7 — Right Chest Thrust',
        filipinoTitle: 'Pang-pito (Saksak sa Kanang Dibdib)',
        subtitle: 'Upward Backhand Chest Thrust',
        target: 'Right Upper Chest / Subclavian Region',
        trajectory: 'Upward Linear Thrust (Backhand Angle)',
        purpose: 'Master backhand upward thrusting mechanics with hip drive and firm wrist alignment.',
        mnemonicFormula: 'Shoulder Chamber → Palm Down/In → Drive Thrust → Clean Retract',
        description: 'The backhand counterpart to Strike 6, targeting the right upper chest with inward palm rotation.',
        durationMinutes: 5,
        strikeKey: 'strike_7',
        isStrike: true,
        category: 'strikes',
        coachSteps: [
          '1. Chamber weapon at left shoulder height with palm facing downward across body.',
          '2. Rotate hips smoothly forward into the thrust.',
          '3. Target right upper chest / subclavian nerve junction.',
          '4. Snap straight into apex and recover immediately to center guard.',
          '5. Keep spine upright—do not lean past your knees.'
        ],
        commonMistakes: [
          'Dropping shoulder level, exposing the neck to counter-cuts.',
          'Overbalancing forward past your lead knee.'
        ],
        guroAdvice: 'Align your forearm with the stick shaft so kinetic recoil travels into your athletic frame.',
      },
      {
        id: 'strike_8',
        levelId: 'level_2',
        levelNumber: 2,
        lessonNumber: 8,
        title: 'Strike 8 — Left Knee Cut',
        filipinoTitle: 'Pang-walo (Kaliwang Tuhod)',
        subtitle: 'Low Downward Diagonal Forehand Cut',
        target: 'Left Knee Joint / Lower Thigh',
        trajectory: 'Low Downward Diagonal Slash (Forehand)',
        purpose: 'Learn level-change mechanics: dropping hips by bending knees rather than bending the spine.',
        mnemonicFormula: 'High Ear Chamber → Drop Hips (Tindig) → Cut Knee → Rise to Guard',
        description: 'A low diagonal slash targeting the lead knee. The fundamental lesson is dropping your center of mass with your legs while keeping your head upright and guarded.',
        durationMinutes: 5,
        strikeKey: 'strike_8',
        isStrike: true,
        category: 'strikes',
        coachSteps: [
          '1. Chamber high beside your right ear.',
          '2. Lower entire body by bending knees (Tindig) — DO NOT bend forward at the waist!',
          '3. Slash downward diagonally targeting the lead knee.',
          '4. Keep your left check hand high shielding your head from counter-attacks.',
          '5. Recover weapon rapidly back up to chest height.'
        ],
        commonMistakes: [
          'Bending forward at the waist with straight legs, leaving your head completely unguarded.',
          'Looking down at the floor instead of watching your opponent’s eyes.'
        ],
        guroAdvice: 'Knee strikes require sinking your stance: drop your hips to protect your head.',
      },
      {
        id: 'strike_9',
        levelId: 'level_2',
        levelNumber: 2,
        lessonNumber: 9,
        title: 'Strike 9 — Right Knee Cut',
        filipinoTitle: 'Pang-siyam (Kanang Tuhod)',
        subtitle: 'Low Downward Diagonal Backhand Cut',
        target: 'Right Knee Joint / Lower Leg',
        trajectory: 'Low Downward Diagonal Slash (Backhand)',
        purpose: 'Execute low backhand cuts with deep knee flexion and high recovery speed.',
        mnemonicFormula: 'Left High Chamber → Deep Knee Sink → Low Backhand Cut → Rebound High',
        description: 'A low backhand downward diagonal cut targeting the opponent’s right knee or lower leg.',
        durationMinutes: 5,
        strikeKey: 'strike_9',
        isStrike: true,
        category: 'strikes',
        coachSteps: [
          '1. Chamber across body near your left shoulder.',
          '2. Sink center of gravity deeply with bent knees.',
          '3. Deliver diagonal backhand cut targeting right knee joint.',
          '4. Stop the strike cleanly at knee height with firm grip tension.',
          '5. Follow through and elevate back into high ready guard stance.'
        ],
        commonMistakes: [
          'Allowing weapon to bounce off the floor or overshoot behind your legs.',
          'Pausing at the bottom of the low strike where you can be countered from above.'
        ],
        guroAdvice: 'Strike low, recover high. The instant the knee cut finishes, your check hand must shield your face.',
      },
      {
        id: 'strike_10',
        levelId: 'level_2',
        levelNumber: 2,
        lessonNumber: 10,
        title: 'Strike 10 — Left Eye Thrust',
        filipinoTitle: 'Pang-sampu (Saksak sa Kaliwang Mata)',
        subtitle: 'Direct Eye-Level High Forehand Thrust',
        target: 'Left Eye / Facial Nerve / Temple',
        trajectory: 'Direct Eye-Level Thrust (Forehand)',
        purpose: 'Eliminate telegraphing: flick directly along sightline with zero wind-up.',
        mnemonicFormula: 'Sightline Chamber → Snake-Bite Flick → Direct Eye Target → Instant Pullback',
        description: 'A surgical eye-level thrust. Because the facial nerves are sensitive, speed and zero telegraphing replace brute strength.',
        durationMinutes: 5,
        strikeKey: 'strike_10',
        isStrike: true,
        category: 'strikes',
        coachSteps: [
          '1. Chamber at ear level directly along your eye sightline.',
          '2. Minimal wind-up to avoid telegraphing attack to opponent.',
          '3. Flick stick tip directly forward like an arrow targeting eye socket.',
          '4. Full forward extension (161° - 179°).',
          '5. Immediate linear retraction back into high chest guard.'
        ],
        commonMistakes: [
          'Telegraphing by pulling stick backwards before thrusting.',
          'Dropping check hand below chest level.'
        ],
        guroAdvice: 'Treat Strike 10 like a snake bite—no wind-up, just sudden forward venom and immediate withdrawal.',
      },
      {
        id: 'strike_11',
        levelId: 'level_2',
        levelNumber: 2,
        lessonNumber: 11,
        title: 'Strike 11 — Right Eye Thrust',
        filipinoTitle: 'Pang-labing-isa (Saksak sa Kanang Mata)',
        subtitle: 'Direct Eye-Level High Backhand Thrust',
        target: 'Right Eye / Facial Nerve / Temple',
        trajectory: 'Direct Eye-Level Thrust (Backhand)',
        purpose: 'Develop rigid backhand wrist alignment and surgical high-line accuracy.',
        mnemonicFormula: 'Bridge of Nose Alignment → Locked Wrist → Lightning Backhand Thrust → Clean Guard',
        description: 'The backhand counterpart to Strike 10, delivering a lightning eye-level thrust across the bridge of the nose.',
        durationMinutes: 5,
        strikeKey: 'strike_11',
        isStrike: true,
        category: 'strikes',
        coachSteps: [
          '1. Chamber weapon at left eye level across bridge of nose.',
          '2. Keep striking wrist locked straight with forearm.',
          '3. Deliver precise backhand thrust directly to right eye socket.',
          '4. Squeeze pinky and ring fingers firmly right as weapon reaches apex extension.',
          '5. Pull straight back into ready defensive guard.'
        ],
        commonMistakes: [
          'Wrist buckling or bending upward on release, dissipating thrust penetration.',
          'Leaning head forward toward the target.'
        ],
        guroAdvice: 'Squeeze pinky and ring fingers firmly right as the weapon reaches apex extension to lock the joint.',
      },
      {
        id: 'strike_12',
        levelId: 'level_2',
        levelNumber: 2,
        lessonNumber: 12,
        title: 'Strike 12 — Crown Strike',
        filipinoTitle: 'Pang-labing-dalawa (Baston sa Tuktok)',
        subtitle: 'Vertical Overhead Downward Strike',
        target: 'Crown of the Skull / Sagittal Suture',
        trajectory: 'Vertical Overhead Downward Cleave (90°)',
        purpose: 'Master vertical centerline chopping mechanics while keeping striking elbow flexed to absorb recoil.',
        mnemonicFormula: 'Centerline Raise → Centered Base → Vertical Downward Cleave → Flexed Recoil Stop',
        description: 'The grand finale of the 12 strikes: an overhead vertical downward chop dividing the opponent’s skull along the sagittal suture.',
        durationMinutes: 5,
        strikeKey: 'strike_12',
        isStrike: true,
        category: 'strikes',
        coachSteps: [
          '1. Raise weapon straight overhead along your spine centerline.',
          '2. Keep knees bent and weight centered equally between both feet.',
          '3. Chop straight down vertically into skull crown.',
          '4. Keep striking elbow flexed at 111°-135° to absorb violent impact recoil.',
          '5. Stop cleanly at chin level and return to ready guard stance.'
        ],
        commonMistakes: [
          'Over-extending elbow to 180°, damaging elbow joint on hard impact recoil.',
          'Swinging so hard the stick hits your own knee or floor.'
        ],
        guroAdvice: 'Never lock your elbow straight at impact—slight flexion absorbs violent recoil and protects your joints.',
      },
    ],
  },
  {
    id: 'level_3',
    levelNumber: 3,
    name: 'Level 3 — Practice & Anyo Drills',
    tagline: 'Flow Drills, Combinations, and Anyo Forms',
    badge: 'FLOW & DRILLS',
    badgeColor: '#F59E0B',
    description: 'Transition from isolated strikes to fluid multi-strike combinations and traditional Anyo movement routines.',
    lessons: [
      {
        id: 'les_3_1',
        levelId: 'level_3',
        levelNumber: 3,
        lessonNumber: 1,
        title: 'Redonda Cross & Crown (1 → 2 → 12)',
        filipinoTitle: 'Redonda Krus at Tuktok',
        subtitle: 'Temple Cross Combo Transitioning Overhead',
        description: 'Chain Strike 1 (Left Temple), Strike 2 (Right Temple), and finish with Strike 12 (Crown). Focus on smooth rebounding rather than pausing.',
        durationMinutes: 6,
        isStrike: false,
        category: 'drills',
        coachSteps: [
          'Execute Strike 1 diagonally downward.',
          'Allow weapon rebound to feed smoothly into Strike 2 backhand.',
          'From Strike 2 follow-through, raise stick vertically overhead into Strike 12.',
          'Keep check hand guarding chest throughout all 3 transitions.'
        ],
        commonMistakes: [
          'Freezing into static pauses between strikes instead of maintaining kinetic flow.'
        ],
        guroAdvice: 'Flow like water, strike like thunder. Let the rebound of one strike fuel the chamber of the next.',
      },
      {
        id: 'les_3_2',
        levelId: 'level_3',
        levelNumber: 3,
        lessonNumber: 2,
        title: 'Torso Slice & Core Thrust (3 → 4 → 5)',
        filipinoTitle: 'Hiwa sa Tagiliran at Saksak',
        subtitle: 'Midline Flank Slices Leading to Explosive Thrust',
        description: 'Clear the left flank with Strike 3, clear the right flank with Strike 4, and penetrate the opening with a linear Strike 5 thrust.',
        durationMinutes: 6,
        isStrike: false,
        category: 'drills',
        coachSteps: [
          'Strike 3 horizontal forehand through ribs.',
          'Strike 4 horizontal backhand clearing opposite flank.',
          'Instantly align weapon tip with solar plexus for Strike 5 thrust.',
          'Snap back into ready defensive guard.'
        ],
        commonMistakes: [
          'Letting the stick tip droop toward the floor during transitions.'
        ],
        guroAdvice: 'Slashes create openings; thrusts end encounters.',
      },
      {
        id: 'les_3_3',
        levelId: 'level_3',
        levelNumber: 3,
        lessonNumber: 3,
        title: 'Low-High Level Change (8 → 9 → 12)',
        filipinoTitle: 'Mababang Tuhod Paakyat sa Tuktok',
        subtitle: 'Forcing Guard Low, Then Striking High',
        description: 'Force your opponent to drop their guard with low knee strikes (8 and 9), then suddenly elevate to cleave the crown (12).',
        durationMinutes: 6,
        isStrike: false,
        category: 'drills',
        coachSteps: [
          'Drop stance deeply for Strike 8 left knee cut.',
          'Maintain low level for Strike 9 right knee cut.',
          'Explode upward using leg power to drive Strike 12 down onto the skull.'
        ],
        commonMistakes: [
          'Rising up too early before Strike 9 finishes.'
        ],
        guroAdvice: 'Level change is a master tactic. Threaten the legs to open the head.',
      },
      {
        id: 'les_3_4',
        levelId: 'level_3',
        levelNumber: 3,
        lessonNumber: 4,
        title: 'Random Strike Reaction Drill',
        filipinoTitle: 'Bilis ng Tugon',
        subtitle: 'Freeflow AI Audio Cue Reaction Training',
        description: 'Test your reflexes! The AI calls out random strike numbers, and you must chamber, deliver, and recover within 1.5 seconds.',
        durationMinutes: 8,
        isStrike: false,
        category: 'drills',
        coachSteps: [
          'Listen for the coach command (e.g. "Strike 4!").',
          'Chamber immediately without hesitation.',
          'Execute along proper trajectory plane.',
          'Recover to guard before the next command.'
        ],
        commonMistakes: [
          'Second-guessing chamber side under time pressure.'
        ],
        guroAdvice: 'Repetition turns conscious thought into subconscious reflex muscle memory.',
      },
    ],
  },
  {
    id: 'level_4',
    levelNumber: 4,
    name: 'Level 4 — Assessment & Mastery',
    tagline: 'Comprehensive 12 Strikes Anyo Exam',
    badge: 'EXAM & MASTERY',
    badgeColor: '#EC4899',
    description: 'Execute all 12 strikes in seamless succession. The AI evaluates posture, angle precision, guard hand, and cadence.',
    lessons: [
      {
        id: 'les_4_1',
        levelId: 'level_4',
        levelNumber: 4,
        lessonNumber: 1,
        title: 'The 12 Strikes Anyo Master Exam',
        filipinoTitle: 'Pagsusulit sa Labindalawang Pagtama',
        subtitle: 'The Complete Canonical Arnis Master Form',
        description: 'Execute Strikes 1 through 12 continuously in order. The computer vision engine analyzes your 5-pillar kinetic score across all frames to award your official sash ranking.',
        durationMinutes: 10,
        isStrike: false,
        category: 'assessment',
        coachSteps: [
          'Pugay (Salute) to camera to initiate exam mode.',
          'Flow through Strikes 1 to 12 at steady, controlled cadence (approx 1.5s per strike).',
          'Keep Kalasag check hand active on every single repetition.',
          'Maintain bent-knee Tindig stance throughout the entire routine.'
        ],
        commonMistakes: [
          'Rushing through strikes with sloppy limb extension just to finish quickly.',
          'Letting check hand droop on later strikes due to shoulder fatigue.'
        ],
        guroAdvice: 'This is your graduation form. Precision, poise, and spirit. Show the ancestors your discipline.',
      },
    ],
  },
];

// Flat list of all lessons
export const ALL_CURRICULUM_LESSONS: CurriculumLesson[] = CURRICULUM_DATA.flatMap(lvl => lvl.lessons);

const STORAGE_KEY_PROGRESS = '@arnis_curriculum_progress_v2';

export async function getCurriculumProgress(): Promise<CurriculumProgress> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY_PROGRESS);
    const completedLessonIds: string[] = raw ? JSON.parse(raw) : [];

    const totalLessons = ALL_CURRICULUM_LESSONS.length;
    const completedCount = completedLessonIds.length;
    const progressPercentage = Math.round((completedCount / Math.max(1, totalLessons)) * 100);

    // Determine the next lesson to learn
    const nextLesson = ALL_CURRICULUM_LESSONS.find(l => !completedLessonIds.includes(l.id)) || ALL_CURRICULUM_LESSONS[0];

    return {
      completedLessonIds,
      currentLessonId: nextLesson.id,
      totalLessons,
      completedCount,
      progressPercentage,
    };
  } catch (e) {
    console.error('Failed to read curriculum progress', e);
    return {
      completedLessonIds: [],
      currentLessonId: ALL_CURRICULUM_LESSONS[0].id,
      totalLessons: ALL_CURRICULUM_LESSONS.length,
      completedCount: 0,
      progressPercentage: 0,
    };
  }
}

export async function markLessonCompleted(lessonId: string): Promise<CurriculumProgress> {
  try {
    const current = await getCurriculumProgress();
    if (!current.completedLessonIds.includes(lessonId)) {
      const updatedIds = [...current.completedLessonIds, lessonId];
      await AsyncStorage.setItem(STORAGE_KEY_PROGRESS, JSON.stringify(updatedIds));
      return await getCurriculumProgress();
    }
    return current;
  } catch (e) {
    console.error('Failed to mark lesson completed', e);
    return await getCurriculumProgress();
  }
}

export function isLessonUnlocked(lessonId: string, completedLessonIds: string[]): boolean {
  // First 3 lessons in Level 0 are always unlocked
  const lessonIndex = ALL_CURRICULUM_LESSONS.findIndex(l => l.id === lessonId);
  if (lessonIndex <= 1) return true; // first 2 are always open

  // A lesson is unlocked if the previous lesson is completed, or if it has already been completed
  if (completedLessonIds.includes(lessonId)) return true;
  const prevLesson = ALL_CURRICULUM_LESSONS[lessonIndex - 1];
  if (!prevLesson) return true;
  return completedLessonIds.includes(prevLesson.id);
}

export async function resetCurriculumProgress(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY_PROGRESS);
  } catch (e) {
    console.error('Failed to reset curriculum progress', e);
  }
}
