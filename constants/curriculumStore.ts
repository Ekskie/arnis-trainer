import AsyncStorage from '@react-native-async-storage/async-storage';
import { STRIKE_VIDEOS_CATALOG, StrikeVideoItem } from './strikeVideos';

export type LessonStatus = 'not_started' | 'learning' | 'watched' | 'practicing' | 'assessed' | 'mastered';

export interface CurriculumLesson {
  id: string;
  levelId: 'level_0' | 'level_1' | 'level_2' | 'level_3' | 'level_4';
  levelNumber: number;
  lessonNumber: number;
  title: string;
  filipinoTitle?: string;
  subtitle: string;
  badge?: string;
  target?: string;
  trainingTarget?: string; // Friendly training target (e.g. "Left side of the head")
  trajectory?: string;
  purpose?: string;
  mnemonicFormula?: string;
  description: string;
  beginnerSummary?: string;
  durationMinutes: number;
  strikeKey?: string;
  isStrike: boolean;
  coachSteps: string[];
  commonMistakes: string[];
  guroAdvice: string;
  category: 'orientation' | 'fundamentals' | 'strikes' | 'drills' | 'assessment';
  
  // Beginner Pedagogical Breakdown
  whatYouWillLearn?: string[];
  doThis?: string[];
  lookLikeThis?: string;
  feelThis?: string;
  watchOutFor?: string;
  watchFor?: string[];
  filipinoTermNote?: string;
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
    name: 'Getting Started',
    tagline: 'Your first steps in the Filipino martial art',
    badge: 'START HERE',
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
        trainingTarget: 'Cultural & Conceptual Awareness',
        trajectory: 'Weapon Extension Principle',
        purpose: 'Understand how stick movements build spatial control, reflex speed, and self-defense.',
        description: 'Arnis (also known as Eskrima or Kali) is the indigenous martial art of the Philippines, officially declared the National Sport by Republic Act 9850. It emphasizes weapon mastery first, which seamlessly translates into empty-hand self defense.',
        beginnerSummary: 'Arnis is the traditional Philippine martial art of stick and blade. You learn weapon movement first, which makes you fast, alert, and confident.',
        filipinoTermNote: 'Arnis / Eskrima / Kali = Different regional names for Filipino Martial Arts (FMA). Republic Act 9850 declared Arnis our National Sport in 2009.',
        whatYouWillLearn: [
          'Discover the national martial art of the Philippines',
          'Understand the stick as an extension of your arm',
          'Learn the core principles of flow, control, and respect',
        ],
        doThis: [
          'Treat the stick as an extension of your arm, not a baseball bat.',
          'Focus on smooth, continuous flow rather than stiff brute strength.',
          'Breathe rhythmically during every movement.',
          'Respect your practice space and your training weapon.'
        ],
        lookLikeThis: 'A relaxed practitioner moving with natural grace, posture upright, eyes scanning forward.',
        feelThis: 'Loose shoulders, calm breathing, and light feet ready to shift weight.',
        watchOutFor: 'Swinging with tense shoulders like hitting a home run. Arnis is about precision and relaxed speed.',
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
        trainingTarget: 'Weapon Anatomy (Tip, Shaft, Butt)',
        trajectory: 'Tool Orientation',
        purpose: 'Learn how to inspect, handle, and hold your standard 28-inch training stick safely.',
        description: 'The standard Arnis training weapon is a rattan cane (Olis / Yantok), typically 28 inches in length and 3/4 to 1 inch in diameter. Rattan fibers do not splinter into dangerous sharp shards like hardwood, making it the safest training medium.',
        beginnerSummary: 'The rattan stick (Baston) is lightweight and durable. Inspect it before practice and identify its 3 parts: Tip (Dulo), Shaft (Katawan), and Butt (Punyo).',
        filipinoTermNote: 'Baston = Stick. Yantok = Rattan vine. Punyo = The 1-2 inch base extending below your fist.',
        whatYouWillLearn: [
          'Inspect your cane for cracks and splinters before training',
          'Identify the Tip (Dulo), Shaft (Katawan), and Butt (Punyo)',
          'Leave 1-2 inches of stick butt exposed below your grip',
        ],
        doThis: [
          'Inspect your cane for deep cracks before each session.',
          'Leave 1 to 2 inches of stick butt (Punyo) exposed beneath your pinky.',
          'Identify the Dulo (tip) used for pointing and slicing lines.',
          'Wipe your cane dry after sweaty workouts so rattan retains its flexibility.'
        ],
        lookLikeThis: 'Your hand holds the stick firmly with a clear 1-2 inch butt (Punyo) visible beneath your fist.',
        feelThis: 'A balanced, lightweight extension in your hand with zero hand cramping.',
        watchOutFor: 'Choking down to the very edge of the stick with no Punyo showing.',
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
        title: 'Safety Rules & Space',
        filipinoTitle: 'Alituntunin sa Kaligtasan',
        subtitle: 'Essential Precautions for Safe Training',
        trainingTarget: '2-Meter Clear Training Radius',
        trajectory: 'Perimeter Clearance',
        purpose: 'Establish a safe training perimeter and protect your joints with dynamic warmups.',
        description: 'Martial practice demands strict safety etiquette. Always verify your training environment, maintain clear arm extension clearance, and warm up your wrists and shoulders before executing strikes.',
        beginnerSummary: 'Before we learn techniques, let\'s learn how to train safely: clear 2 meters in every direction, warm up your wrists, and hold your weapon securely.',
        filipinoTermNote: 'Otso-otso = Figure-8 warmup wrist circles. Guro = Teacher/Instructor.',
        whatYouWillLearn: [
          'Prepare your 2-meter clear training space',
          'Handle your rattan stick safely without losing grip',
          'Warm up your wrists with circular rotations',
        ],
        doThis: [
          'Clear a 2-meter radius of all furniture, people, and pets.',
          'Check ceiling clearance before practicing overhead strikes.',
          'Do 20 circular wrist rolls in both directions before swinging.',
          'Never release the stick during a swing.'
        ],
        lookLikeThis: 'An open, clutter-free training zone with ample room to step and swing freely.',
        feelThis: 'Warm, relaxed wrists and shoulders with no tight pinching.',
        watchOutFor: 'Skipping your wrist warm-up. Cold wrists can get sore from stopping fast swings.',
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
        trainingTarget: 'Full Body Camera Frame (Head to Toes)',
        trajectory: 'Camera Alignment',
        purpose: 'Position your phone so the AI accurately sees and scores your knees, elbows, and stick.',
        description: 'For PoseFix-Arnis to accurately track all 33 skeletal joints and your stick motion, your phone camera must see your entire body from head to toes with adequate lighting.',
        beginnerSummary: 'Set your phone at chest or waist height, step back 2.5 meters until your whole body from head to shoes is visible, and make sure lights are in front of you.',
        filipinoTermNote: 'Handa sa Camera = Ready on camera. Stand centered in the green bounding box.',
        whatYouWillLearn: [
          'Place your phone at waist or chest height on a stable shelf',
          'Step back 2.5 to 3 meters so head to toes are visible',
          'Face good room lighting for accurate AI pose tracking',
        ],
        doThis: [
          'Set your phone on a shelf or tripod at waist to chest height.',
          'Step back 2.5 to 3 meters so your feet and stick tip stay on screen.',
          'Face a light source so you are not a dark silhouette.',
          'Wear clothes that contrast with your wall background.'
        ],
        lookLikeThis: 'Your whole body centered in the camera frame with head, arms, knees, and feet all visible.',
        feelThis: 'Room to swing without fear of hitting the camera or walls.',
        watchOutFor: 'Placing phone on the floor angled upward, which distorts knee angle measurement.',
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
        title: 'Pugay (Salute of Respect)',
        filipinoTitle: 'Pagpupugay sa Arnis',
        subtitle: 'The Traditional Martial Bow & Etiquette',
        trainingTarget: 'Chest Salute & Respect',
        trajectory: 'Stick across chest at 45° angle',
        purpose: 'Begin and end every Arnis practice with the martial bow of respect and humility.',
        description: 'Every traditional Arnis training begins and ends with Pugay (Salute). Bring stick to left chest, bow head slightly, and return to ready stance.',
        beginnerSummary: 'Pugay is the bow of respect. Bring your stick across to touch your left chest, nod with respect, and return to ready stance.',
        filipinoTermNote: 'Pugay = Salute / Bow. PO = Respectful Filipino honorific. "Pugay Po" honors your art and training partner.',
        whatYouWillLearn: [
          'Learn the traditional Filipino bow of respect (Pugay)',
          'Hold your stick across your chest with open hand check',
          'Begin and end every session with focus and discipline',
        ],
        doThis: [
          'Stand with heels together, feet in a V-shape.',
          'Hold your stick in your right hand, resting across your left chest.',
          'Place your open left hand over your right fist.',
          'Bow your head slightly and say "Pugay Po", then step into ready stance.'
        ],
        lookLikeThis: 'Calm, dignified posture showing respect to the training space and ancestors.',
        feelThis: 'A moment of mental focus and readiness before picking up speed.',
        watchOutFor: 'Slouching or rushing the salute. It sets your mindset for focused training.',
        durationMinutes: 2,
        isStrike: false,
        category: 'orientation',
        coachSteps: [
          'Bring heels together into Attention Stance (Handa sa Pagpupugay).',
          'Place right fist holding stick over left chest at 45 degrees.',
          'Place left open palm flat over right fist.',
          'Bow head slightly forward (15 degrees) with humility, then return to ready.'
        ],
        commonMistakes: [
          'Swinging stick carelessly while attempting to bow.',
          'Looking away or laughing during the formal salute.'
        ],
        guroAdvice: 'Respect is the beginning and end of all martial arts. The bow reminds us that skill must always be paired with discipline.',
      },
    ],
  },
  {
    id: 'level_1',
    levelNumber: 1,
    name: 'Build Your Fundamentals',
    tagline: 'Stance, grip, and the live check hand',
    badge: 'FUNDAMENTALS',
    badgeColor: '#10B981',
    description: 'Master the 4-finger grip, ready stance, live check hand (Kalasag), footwork angles, and the kinetic chain.',
    lessons: [
      {
        id: 'les_1_1',
        levelId: 'level_1',
        levelNumber: 1,
        lessonNumber: 1,
        title: 'Proper Stance (Tindig)',
        filipinoTitle: 'Wastong Tindig at Handa',
        subtitle: 'Ready Stance, Weight Distribution, and Knee Flexion',
        trainingTarget: 'Lower Body Base & Knees',
        trajectory: 'Athletic forward stance',
        purpose: 'Lower your center of gravity so you stay balanced, absorb recoil, and generate hip power.',
        description: 'An athletic ready stance with bent knees anchors your base and drives hip rotation. Never stand stiffly upright with locked knees.',
        beginnerSummary: 'Stand like an athlete: feet shoulder-width apart, one foot slightly forward, and both knees gently bent. This keeps you stable and ready to move.',
        filipinoTermNote: 'Tindig = Stance. Handa = Ready. Forward Stance is called Tindig Paharap.',
        whatYouWillLearn: [
          'Set feet shoulder-width in an athletic base',
          'Bend both knees to stay balanced and absorb force',
          'Keep your spine upright without leaning forward',
        ],
        doThis: [
          'Place feet shoulder-width apart.',
          'Step your dominant foot forward about 1 to 1.5 footsteps.',
          'Bend both knees comfortably (like preparing to jump or catch a ball).',
          'Keep your spine erect and eyes up—do not lean forward past your lead knee.'
        ],
        lookLikeThis: 'An athletic, springy ready position with bent knees and weight evenly balanced.',
        feelThis: 'Your leg muscles gently engaged, feeling grounded and light on your feet.',
        watchOutFor: 'Locking your knees straight (> 170°). Straight knees cause you to lose balance when you swing!',
        durationMinutes: 4,
        isStrike: false,
        category: 'fundamentals',
        coachSteps: [
          'Stand with feet shoulder-width apart.',
          'Step your lead foot forward about 1.5 shoe lengths.',
          'Bend both knees so your weight sits 60% on lead foot, 40% on rear.',
          'Keep your torso upright and core engaged to absorb strike momentum.'
        ],
        commonMistakes: [
          'Locking both knees straight, which ruins balance and power.',
          'Leaning your upper body far forward past your front knee.'
        ],
        guroAdvice: 'Your power comes from the ground up. Sink your stance and let your legs generate the rotational snap.',
      },
      {
        id: 'les_1_2',
        levelId: 'level_1',
        levelNumber: 1,
        lessonNumber: 2,
        title: 'Proper Stick Grip (Hawak)',
        filipinoTitle: 'Tamang Paghawak ng Baston',
        subtitle: 'The 4-Finger Wrap & Punyo Alignment',
        trainingTarget: 'Weapon Grip & Punyo Base',
        trajectory: 'Grip Tension & Wrist Freedom',
        purpose: 'Hold the cane firmly enough that it won’t fly out, but loose enough for rapid wrist snaps.',
        description: 'The standard Arnis grip wraps four fingers around the rattan cane with the thumb locked over the index finger. Crucially, leave 1 to 2 inches of stick butt (Punyo) exposed below your fist.',
        beginnerSummary: 'Wrap your 4 fingers around the stick with your thumb over your index finger. Leave 1-2 inches of stick butt (Punyo) showing at the bottom. Hold it like a bird: firm, but not choking it.',
        filipinoTermNote: 'Hawak = Grip / Hold. Punyo = Butt end of stick used for close-range hooks and blocks.',
        whatYouWillLearn: [
          'Wrap your 4 fingers with thumb over index finger',
          'Leave 1-2 inches of stick butt (Punyo) below your fist',
          'Hold firmly without white-knuckle forearm tension',
        ],
        doThis: [
          'Wrap your four fingers firmly around the baston.',
          'Lock your thumb securely over your index fingernail.',
          'Ensure 1 to 2 inches of the stick butt (Punyo) sticks out below your hand.',
          'Relax your grip while moving; only tighten at the instant of impact.'
        ],
        lookLikeThis: 'A solid, comfortable fist around the cane with a visible 1-inch butt at the bottom.',
        feelThis: 'Your wrist is free to flick up and down without tension in your forearm.',
        watchOutFor: 'Squeezing the stick so hard your white knuckles show. Tension slows down your swings!',
        durationMinutes: 3,
        isStrike: false,
        category: 'fundamentals',
        coachSteps: [
          'Wrap four fingers firmly around the cane.',
          'Lock your thumb securely over your index finger.',
          'Leave 1 to 2 inches of cane extending below your pinky (the Punyo).',
          'Hold with moderate firmness: neither choking the weapon nor holding it loosely.'
        ],
        commonMistakes: [
          'Choking all the way to the butt with no Punyo exposed.',
          'Holding with white-knuckle tension that prevents fast wrist snaps.'
        ],
        guroAdvice: 'Hold the stick like a bird: tight enough that it won’t fly away, but gentle enough that you do not crush it.',
      },
      {
        id: 'les_1_3',
        levelId: 'level_1',
        levelNumber: 1,
        lessonNumber: 3,
        title: 'The Check Hand (Kalasag)',
        filipinoTitle: 'Ang Kamay na Kalasag',
        subtitle: 'The Shield / Live Hand Protecting Your Core',
        trainingTarget: 'Center Chest / Solar Plexus',
        trajectory: 'Glued to chest as a shield',
        purpose: 'Protect your chest and chin with your non-striking hand while the other hand attacks.',
        description: 'In Arnis, the non-weapon hand is called the "live hand" (Kalasag / Shield). It stays glued to your solar plexus/chest to deflect incoming strikes and prepare for disarms.',
        beginnerSummary: 'Your empty hand is your shield! Keep it pinned to your solar plexus or chest. When your right hand strikes, your left hand MUST protect your body. Never let it drop!',
        filipinoTermNote: 'Kalasag = Shield. Often referred to by grandmasters as the "Live Hand" because it never sleeps.',
        whatYouWillLearn: [
          'Keep your non-striking hand glued to your chest',
          'Protect your vitals like a shield while attacking',
          'Prevent your check hand from dropping to your hip',
        ],
        doThis: [
          'Raise your left hand to your center chest (solar plexus).',
          'Keep the palm facing forward or slightly cupped.',
          'Whenever you swing your right hand, keep the left hand glued to your chest.',
          'Think of your left hand as your bodyguard.'
        ],
        lookLikeThis: 'Your left hand resting like a shield over your heart while your right arm executes the cut.',
        feelThis: 'Your core feels protected and compact, ready to guard or counter.',
        watchOutFor: 'Letting your left hand drop to your hip or pocket while swinging. The AI checks this every swing!',
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
        trainingTarget: 'Angular Floor Stepping',
        trajectory: '45° Diagonal Stepping',
        purpose: 'Step off the direct line of incoming attacks so you can strike while evading.',
        description: 'Arnis practitioners do not step in straight predictable lines. We step along the points of an imaginary triangle on the floor, entering or evading strikes while maintaining counter angles.',
        beginnerSummary: 'Instead of stepping straight forward where strikes travel, step 45 degrees to the side along an imaginary triangle on the floor.',
        filipinoTermNote: 'Hakbang = Step. Tatsulok = Triangle. Stepping off the line is called Iwas.',
        whatYouWillLearn: [
          'Step along 45° floor triangle angles off attack lines',
          'Plant your lead foot firmly before delivering a strike',
          'Glide smoothly without crossing your feet over each other',
        ],
        doThis: [
          'Imagine a triangle on the ground pointing forward.',
          'Step 45 degrees to the right, then slide your back foot.',
          'Plant your front foot solidly before swinging.',
          'Stay low and glide smoothly without bobbing up and down.'
        ],
        lookLikeThis: 'Smooth diagonal steps that preserve your wide, balanced stance at all times.',
        feelThis: 'Gliding like an ice skater parallel to the floor.',
        watchOutFor: 'Crossing your feet over each other, which trips your balance instantly.',
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
        title: 'The Kinetic Triad (Kasa · Tudla · Bawi)',
        filipinoTitle: 'Kasa, Tudla, at Bawi',
        subtitle: 'Chamber, Drive, and Recovery Phases',
        trainingTarget: 'The 3 Dynamic Motion Phases',
        trajectory: 'Full Strike Cycle',
        purpose: 'Learn the complete 3-beat rhythm of every Arnis strike so your movement flows continuously.',
        description: 'Every strike consists of 3 continuous phases: Kasa (Chambering/cocking the weapon), Tudla (Accelerating through the target), and Bawi (Instant recovery back to guard).',
        beginnerSummary: 'Every strike has 3 beats: 1. Kasa (cock stick near ear), 2. Tudla (accelerate and slice through target), 3. Bawi (pull right back to chest guard).',
        filipinoTermNote: 'Kasa = Cock / Load. Tudla = Aim & Deliver. Bawi = Recover / Rebound.',
        whatYouWillLearn: [
          'Chamber your stick beside your ear (Kasa)',
          'Accelerate through target line with wrist snap (Tudla)',
          'Return immediately to your chest guard (Bawi)',
        ],
        doThis: [
          'Phase 1 (Kasa): Load the stick by your ear or hip before starting.',
          'Phase 2 (Tudla): Accelerate smoothly through the target line with a wrist snap.',
          'Phase 3 (Bawi): Retract your weapon immediately back into guard position.'
        ],
        lookLikeThis: 'A continuous, rhythmic motion: load, strike, recover—never freezing in place.',
        feelThis: 'A wave of energy: coiled potential, explosive delivery, and snappy return.',
        watchOutFor: 'Freezing after the strike. Freezing leaves you wide open and triggers the AI static penalty!',
        durationMinutes: 4,
        isStrike: false,
        category: 'fundamentals',
        coachSteps: [
          'Kasa (Phase 1): Cock stick near ear/hip, loading potential energy.',
          'Tudla (Phase 2): Drive stick along trajectory, snapping wrist at apex impact.',
          'Bawi (Phase 3): Retract immediately to defensive guard. Never freeze after striking.'
        ],
        commonMistakes: [
          'Freezing at the impact point, which triggers the AI static penalty.',
          'Rushing phase 2 without chambering fully in phase 1.'
        ],
        guroAdvice: 'A strike is not finished until you have returned to guard. The recovery is just as important as the hit.',
      },
    ],
  },
  {
    id: 'level_2',
    levelNumber: 2,
    name: 'Learn The 12 Strikes',
    tagline: 'The canonical striking system of Arnis',
    badge: '12 STRIKES',
    badgeColor: '#D24B38',
    description: 'Master each canonical strike with step-by-step coaching: Understand, Watch, Remember, and Practice.',
    lessons: [
      {
        id: 'strike_1',
        levelId: 'level_2',
        levelNumber: 2,
        lessonNumber: 1,
        title: 'Strike 1 — Left Temple',
        filipinoTitle: 'Pang-una (Kaliwang Sintido)',
        subtitle: 'Diagonal Downward Forehand Slash',
        target: 'Left side of the head',
        trainingTarget: 'Left side of the head',
        trajectory: 'Diagonal downward slash (forehand 45°)',
        purpose: 'Master controlled diagonal striking mechanics, hip rotation, and firm recovery to guard.',
        mnemonicFormula: 'Chamber (Right Ear) → Cut (Diagonal Down) → Snap (Wrist) → Guard (Chest)',
        description: 'Strike 1 is the fundamental opening technique in Arnis. Delivered as a diagonal downward forehand slash starting at your right ear and cutting toward the left side of the head.',
        beginnerSummary: 'Start with your stick beside your right ear. Slice diagonally downward across toward the left side, then snap your wrist and bring your stick right back to guard.',
        filipinoTermNote: 'Sintido = Temple. Pang-una = The First Strike. In class, your guro will often call this simply "Pang-una".',
        doThis: [
          'Chamber your stick beside your right ear at a 45° angle.',
          'Pin your left check hand firmly to your chest.',
          'Step forward slightly and slice diagonally downward across toward the left side.',
          'Snap your wrist firmly at the end of the arc and return to guard.'
        ],
        lookLikeThis: 'A crisp 45-degree diagonal downward slash that stops under control without swinging wildly.',
        feelThis: 'Your hips initiate the motion, while your wrist snaps like cracking a whip at the end.',
        watchOutFor: 'Dropping your left check hand to your waist. Keep it glued to your chest!',
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
        target: 'Right side of the head',
        trainingTarget: 'Right side of the head',
        trajectory: 'Diagonal downward backhand (45°)',
        purpose: 'Develop balanced backhand cutting torque and clean recovery without over-rotating.',
        mnemonicFormula: 'Chamber (Left Shoulder) → Pivot (Hips) → Backhand Cut → Rebound (Guard)',
        description: 'Strike 2 mirrors Strike 1 with a backhand delivery. Chambered across the torso near your left shoulder, slicing diagonally downward toward the right side of the head.',
        beginnerSummary: 'Cross your arm across your chest to chamber the stick near your left shoulder. Slash diagonally downward backhand toward the right side, then snap your wrist and rebound back.',
        filipinoTermNote: 'Pangalawa = The Second Strike. Backhand strikes in Arnis are powered by triceps extension and hip pivot.',
        doThis: [
          'Chamber the stick across your body near your left shoulder.',
          'Keep your left check hand glued to your chest.',
          'Pivot your hips forward and slash diagonally downward backhand.',
          'Snap the wrist at impact point and return weapon to guard.'
        ],
        lookLikeThis: 'A clean backhand diagonal slice where your torso stays balanced and does not over-rotate.',
        feelThis: 'Extension from your triceps and a sharp wrist snap as you open your chest.',
        watchOutFor: 'Spinning your body too far sideways and losing sight of your target.',
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
        target: 'Left side of the body (rib height)',
        trainingTarget: 'Left side of the body (rib height)',
        trajectory: 'Horizontal forehand cut (flat 0° plane)',
        purpose: 'Maintain a flat horizontal cutting plane and engage core oblique torque.',
        mnemonicFormula: 'Cock (Right Hip) → Sink (Knees) → Slice (Horizontal) → Return (Guard)',
        description: 'A flat horizontal forehand slash cutting across mid-body height. Requires sinking your stance slightly to keep the stick parallel to the floor.',
        beginnerSummary: 'Cock your stick horizontally at your right hip, sink your knees a little deeper, and swing horizontally parallel to the floor across the left ribs.',
        filipinoTermNote: 'Pangatlo = The Third Strike. Tagiliran = Flank / Side of the body.',
        doThis: [
          'Cock the stick horizontally at your right hip level.',
          'Sink your knees 2 inches deeper to drop down to rib level.',
          'Slice horizontally parallel to the floor across the target line.',
          'Keep your check hand up protecting your chin and face.'
        ],
        lookLikeThis: 'A flat, level horizontal swing parallel to the ground, delivered from a stable lowered stance.',
        feelThis: 'Your oblique abdominal muscles twisting as your hips turn into the horizontal cut.',
        watchOutFor: 'Swinging at an upward angle like a golf swing. Keep the stick flat!',
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
        target: 'Right side of the body (rib height)',
        trainingTarget: 'Right side of the body (rib height)',
        trajectory: 'Horizontal backhand cut (flat 0° plane)',
        purpose: 'Execute a flat horizontal backhand cut with full arm extension and stable base.',
        mnemonicFormula: 'Cross (Left Hip) → Open Chest → Slice (Right Side) → Snap & Guard',
        description: 'The horizontal backhand counterpart to Strike 3, cutting horizontally across the right side of the body at mid-section height.',
        beginnerSummary: 'Chamber your stick across your stomach at your left hip, then deliver a flat horizontal backhand cut across toward the right side.',
        filipinoTermNote: 'Pang-apat = The Fourth Strike. Mirrors Strike 3 on the backhand side.',
        doThis: [
          'Cock the stick across your body at your left hip level.',
          'Keep your left check hand high guarding your chest.',
          'Drive a level horizontal backhand cut across the right side.',
          'Snap your wrist to complete the cut, then retract to guard.'
        ],
        lookLikeThis: 'A horizontal backhand slice on a straight plane with your front knee solid and stable.',
        feelThis: 'The back of your shoulder and triceps opening up, followed by a snappy wrist finish.',
        watchOutFor: 'Letting your elbow collapse into your own ribs. Keep your arm extended!',
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
        subtitle: 'Linear Center Torso Thrust (Saksak)',
        target: 'Center stomach / torso',
        trainingTarget: 'Center stomach / torso',
        trajectory: 'Straight linear forward thrust',
        purpose: 'Drive a direct linear thrust into the center line with immediate recoil recovery.',
        mnemonicFormula: 'Level (Hip) → Lunge (Lead Foot) → Thrust (Centerline) → Bawi (Snap Back)',
        description: 'Strike 5 shifts from slashing to linear thrusting. The cane tip drives straight forward along the center line directly into the mid-section.',
        beginnerSummary: 'Hold the stick horizontal at hip height. Push the tip straight forward like a spear into the center torso, then snap it right back to guard.',
        filipinoTermNote: 'Saksak = Linear thrust. Pang-lima = The Fifth Strike.',
        doThis: [
          'Hold the stick horizontal at hip level.',
          'Push the tip straight forward along the center line.',
          'Step or lunge forward slightly onto your front foot for reach.',
          'Pull the stick straight back to guard immediately (Bawi).'
        ],
        lookLikeThis: 'A piston-like direct push forward that reaches full extension and snaps right back.',
        feelThis: 'Your back foot pushing power forward through your hip and into the tip of the stick.',
        watchOutFor: 'Swinging in an arc instead of pushing straight forward in a direct laser line.',
        durationMinutes: 5,
        strikeKey: 'strike_5',
        isStrike: true,
        category: 'strikes',
        coachSteps: [
          '1. Hold the weapon horizontal at your right hip, tip pointing forward.',
          '2. Lunge forward onto your lead foot (knee bent 135°-165°).',
          '3. Push the cane tip straight forward into the center torso.',
          '4. Extend your elbow almost straight (151°-168°) at full reach.',
          '5. Bawi: Immediately snap the weapon back along the entry line into ready guard.'
        ],
        commonMistakes: [
          'Swinging the tip in a curve instead of driving a pure straight line.',
          'Leaving the weapon extended after thrusting without snapping back.'
        ],
        guroAdvice: 'A thrust must be like a snake bite: lightning fast in, lightning fast out.',
      },
      {
        id: 'strike_6',
        levelId: 'level_2',
        levelNumber: 2,
        lessonNumber: 6,
        title: 'Strike 6 — Left Chest Thrust',
        filipinoTitle: 'Pang-anim (Saksak sa Kaliwang Dibdib)',
        subtitle: 'Upward Diagonal Forehand Thrust',
        target: 'Upper left chest',
        trainingTarget: 'Upper left chest',
        trajectory: 'Upward diagonal thrust (palm up)',
        purpose: 'Deliver an upward angled thrust with palm facing upward under defensive guard.',
        mnemonicFormula: 'Chamber (Right Hip) → Palm Up → Angle Upward → Retract',
        description: 'An upward diagonal thrust targeting the upper left chest. Delivered with palm facing up so the stick angles naturally beneath an opponent’s guard.',
        beginnerSummary: 'Chamber your stick at your right hip, point the tip upward at a 45° angle with palm up, thrust toward the left chest, and snap back.',
        filipinoTermNote: 'Dibdib = Chest. Pang-anim = The Sixth Strike.',
        doThis: [
          'Chamber the stick near your right hip, tip angled up.',
          'Thrust forward and upward with your palm facing the ceiling.',
          'Keep your left check hand high protecting your chin.',
          'Retract cleanly along the same path back to guard.'
        ],
        lookLikeThis: 'A clean upward poke at chest height with your wrist straight and firm.',
        feelThis: 'A lifting thrust driven by your legs and forearm.',
        watchOutFor: 'Dropping your guard hand below your chin during the thrust.',
        durationMinutes: 5,
        strikeKey: 'strike_6',
        isStrike: true,
        category: 'strikes',
        coachSteps: [
          '1. Chamber near right hip with stick angled upward at 45°.',
          '2. Rotate wrist so palm faces up toward the ceiling.',
          '3. Drive the tip upward into the upper left chest.',
          '4. Keep non-striking hand guarding your chin and neck.',
          '5. Pull the stick back immediately to avoid having your weapon trapped.'
        ],
        commonMistakes: [
          'Dropping check hand to waist level during the high thrust.',
          'Overextending shoulder and losing balance.'
        ],
        guroAdvice: 'Rotate your forearm so your palm faces up on impact to give structural stability.',
      },
      {
        id: 'strike_7',
        levelId: 'level_2',
        levelNumber: 2,
        lessonNumber: 7,
        title: 'Strike 7 — Right Chest Thrust',
        filipinoTitle: 'Pang-pito (Saksak sa Kanang Dibdib)',
        subtitle: 'Upward Diagonal Backhand Thrust',
        target: 'Upper right chest',
        trainingTarget: 'Upper right chest',
        trajectory: 'Upward diagonal backhand thrust',
        purpose: 'Execute an upward backhand thrust maintaining firm wrist tension.',
        mnemonicFormula: 'Cross (Left Shoulder) → Extend (Right Chest) → Lock Wrist → Recover',
        description: 'The backhand counterpart to Strike 6, chambered across the chest and thrusting diagonally upward into the right chest area.',
        beginnerSummary: 'Chamber across your chest near your left shoulder. Thrust the tip diagonally forward and upward toward the right chest, keeping your wrist firm.',
        filipinoTermNote: 'Pang-pito = The Seventh Strike. A backhand thrust requires firm wrist tension so the stick does not wobble.',
        doThis: [
          'Chamber across your body near your left shoulder.',
          'Drive the tip diagonally forward and upward toward the right chest.',
          'Maintain firm wrist tension so the stick does not wobble on contact.',
          'Retract immediately back to ready guard.'
        ],
        lookLikeThis: 'A precise backhand thrust with zero wrist wobble and full torso balance.',
        feelThis: 'Firm alignment between your stick, wrist, and forearm upon reaching reach.',
        watchOutFor: 'Letting your wrist bend backward on impact. Keep your wrist locked straight!',
        durationMinutes: 5,
        strikeKey: 'strike_7',
        isStrike: true,
        category: 'strikes',
        coachSteps: [
          '1. Chamber weapon across chest near left shoulder.',
          '2. Drive the stick tip diagonally upward toward the right chest.',
          '3. Lock wrist straight with forearm to prevent weapon deflection.',
          '4. Keep check hand active covering solar plexus.',
          '5. Snap back to chamber.'
        ],
        commonMistakes: [
          'Allowing wrist to bend backward, absorbing the impact on the joint.',
          'Not extending the striking arm far enough.'
        ],
        guroAdvice: 'Keep your wrist aligned with your forearm like an iron rod to avoid sprains.',
      },
      {
        id: 'strike_8',
        levelId: 'level_2',
        levelNumber: 2,
        lessonNumber: 8,
        title: 'Strike 8 — Left Knee',
        filipinoTitle: 'Pang-walo (Kaliwang Tuhod)',
        subtitle: 'Low Downward Forehand Slash',
        target: 'Left knee height',
        trainingTarget: 'Left knee height',
        trajectory: 'Low downward diagonal slash (forehand)',
        purpose: 'Drop your stance through knee flexion to strike low without bending your back.',
        mnemonicFormula: 'Drop Stance (Tindig) → Keep Back Straight → Slash Low → High Guard',
        description: 'A low diagonal downward forehand slash aimed at knee height. Key principle: drop your level by bending your knees, never by bending at the waist.',
        beginnerSummary: 'Bend your knees deeply to lower your whole body, then deliver a downward diagonal cut at knee height. Keep your head high and back straight!',
        filipinoTermNote: 'Tuhod = Knee. Pang-walo = The Eighth Strike. Low strikes demand deep knee flexion (Tindig).',
        doThis: [
          'Bend your knees deeply to lower your whole body toward the floor.',
          'Keep your spine upright and chest open—never hunch forward.',
          'Deliver a diagonal downward slash at knee height.',
          'Pop back up into your ready stance immediately.'
        ],
        lookLikeThis: 'You sink like an elevator through bent knees, keeping your chest open and eyes forward.',
        feelThis: 'Your leg muscles working hard to support your low, stable base.',
        watchOutFor: 'Bending at the waist and leaning your head forward toward the target. Bend your knees instead!',
        durationMinutes: 5,
        strikeKey: 'strike_8',
        isStrike: true,
        category: 'strikes',
        coachSteps: [
          '1. Chamber weapon high at right ear/shoulder.',
          '2. Bend both knees deeply to drop your entire body down.',
          '3. Keep spine vertical—do NOT bend at the waist.',
          '4. Deliver a low diagonal slash cutting across knee height.',
          '5. Rise back to medium ready stance with Kalasag guard up.'
        ],
        commonMistakes: [
          'Bending at the waist and sticking your head forward where you can get hit.',
          'Looking down at the floor instead of keeping eyes on the target.'
        ],
        guroAdvice: 'Drop down like an elevator (bending knees), never like a crane (bending back).',
      },
      {
        id: 'strike_9',
        levelId: 'level_2',
        levelNumber: 2,
        lessonNumber: 9,
        title: 'Strike 9 — Right Knee',
        filipinoTitle: 'Pang-siyam (Kanang Tuhod)',
        subtitle: 'Low Downward Backhand Slash',
        target: 'Right knee height',
        trainingTarget: 'Right knee height',
        trajectory: 'Low downward backhand slash',
        purpose: 'Deliver a low backhand cut with wrist snap and recover quickly.',
        mnemonicFormula: 'Chamber High Left → Sink Low → Backhand Cut → Rebound High',
        description: 'The low backhand counterpart to Strike 8. Chambered high at the left shoulder and delivered diagonally downward across the right knee level.',
        beginnerSummary: 'Chamber high near your left shoulder. Sink down deeply through your knees, slash diagonally downward backhand at knee height, and recover up.',
        filipinoTermNote: 'Pang-siyam = The Ninth Strike. A low backhand requires hip opening and a quick wrist snap.',
        doThis: [
          'Chamber high on your left side near your shoulder.',
          'Sink deeply through both knees to lower your level.',
          'Deliver a low backhand slash across knee height.',
          'Snap your wrist at the end and pop back into ready guard.'
        ],
        lookLikeThis: 'A fast, whip-like low backhand cut delivered from a balanced, lowered stance.',
        feelThis: 'A low pivot with a sharp wrist whip (Pitik) at the bottom of the cut.',
        watchOutFor: 'Looking down at your shoes. Keep your eyes looking forward at eye level!',
        durationMinutes: 5,
        strikeKey: 'strike_9',
        isStrike: true,
        category: 'strikes',
        coachSteps: [
          '1. Chamber weapon high at left shoulder.',
          '2. Sink hips and knees into a low athletic base.',
          '3. Deliver low backhand slash across knee level.',
          '4. Snap wrist at apex contact point.',
          '5. Recover weapon back to high guard.'
        ],
        commonMistakes: [
          'Looking down at the floor instead of maintaining eye contact.',
          'Standing too tall and reaching with the arm instead of sinking the legs.'
        ],
        guroAdvice: 'Low strikes test your leg conditioning. Stay low and snap your wrist quickly.',
      },
      {
        id: 'strike_10',
        levelId: 'level_2',
        levelNumber: 2,
        lessonNumber: 10,
        title: 'Strike 10 — Left Eye Thrust',
        filipinoTitle: 'Pang-sampu (Saksak sa Kaliwang Mata)',
        subtitle: 'Direct Eye-Level Forehand Thrust',
        target: 'Eye level (left side)',
        trainingTarget: 'Eye level (left side)',
        trajectory: 'Direct horizontal high thrust',
        purpose: 'Deliver a precise eye-level thrust with zero telegraphing and instant retraction.',
        mnemonicFormula: 'Sight Line → Direct Flick → Minimal Windup → Bawi (Snap Back)',
        description: 'A lightning-fast, high-precision thrust delivered directly along the line of sight at eye level, requiring minimal windup.',
        beginnerSummary: 'Raise your stick to eye level. Flick the tip straight forward along your line of sight like a dart, then snap it right back to your chest guard.',
        filipinoTermNote: 'Mata = Eye. Pang-sampu = The Tenth Strike. High thrusts require zero telegraphing.',
        doThis: [
          'Chamber the stick horizontally at eye height.',
          'Flick the tip straight along your line of sight with no big windup.',
          'Keep your left check hand covering your chest and chin.',
          'Snap the stick back instantly into guard (Bawi).'
        ],
        lookLikeThis: 'A quick jab with a stick that shoots forward like an arrow and snaps right back.',
        feelThis: 'Instant acceleration from your wrist with no wasted motion.',
        watchOutFor: 'Pulling the stick far back before thrusting. Don’t telegraph your move!',
        durationMinutes: 5,
        strikeKey: 'strike_10',
        isStrike: true,
        category: 'strikes',
        coachSteps: [
          '1. Chamber stick at eye level with tip pointing forward.',
          '2. Flick directly forward along your line of sight without winding up.',
          '3. Extend elbow fully (161°-179°) at apex impact.',
          '4. Snap wrist at contact point.',
          '5. Instantly retract to chest guard.'
        ],
        commonMistakes: [
          'Pulling weapon backward before thrusting (telegraphing the attack).',
          'Letting non-striking hand drop down.'
        ],
        guroAdvice: 'Speed beats power on high thrusts. Flick the tip directly forward along your line of sight.',
      },
      {
        id: 'strike_11',
        levelId: 'level_2',
        levelNumber: 2,
        lessonNumber: 11,
        title: 'Strike 11 — Right Eye Thrust',
        filipinoTitle: 'Pang-labing-isa (Saksak sa Kanang Mata)',
        subtitle: 'Direct Eye-Level Backhand Thrust',
        target: 'Eye level (right side)',
        trainingTarget: 'Eye level (right side)',
        trajectory: 'Direct horizontal backhand thrust',
        purpose: 'Deliver an eye-level backhand thrust and recover instantly to guard.',
        mnemonicFormula: 'Chamber (Left Eye) → Extend Direct → Lock Wrist → Recover',
        description: 'The backhand counterpart to Strike 10, chambered near the left eye and flicked straight forward into the right eye area.',
        beginnerSummary: 'Chamber near your left eye, extend the tip forward in a straight backhand thrust at eye height, and pull back immediately.',
        filipinoTermNote: 'Pang-labing-isa = The Eleventh Strike. Instant recovery (Bawi) protects you against counters.',
        doThis: [
          'Chamber near your left eye level.',
          'Extend the tip forward in a straight backhand thrust.',
          'Keep your wrist locked straight with the cane.',
          'Bawi: instantly recover back to your primary chest guard.'
        ],
        lookLikeThis: 'A straight laser-like backhand thrust at eye height with instant recovery.',
        feelThis: 'Straight extension through your triceps and wrist.',
        watchOutFor: 'Leaving your stick hanging out after the thrust. Always pull back immediately!',
        durationMinutes: 5,
        strikeKey: 'strike_11',
        isStrike: true,
        category: 'strikes',
        coachSteps: [
          '1. Chamber weapon near left eye level.',
          '2. Drive tip directly forward in a backhand line.',
          '3. Keep wrist aligned with forearm.',
          '4. Retract immediately back into ready guard.'
        ],
        commonMistakes: [
          'Leaving stick extended too long after impact.',
          'Losing balance by leaning your head past your knees.'
        ],
        guroAdvice: 'After any thrust, pull the weapon back instantly to avoid having it deflected.',
      },
      {
        id: 'strike_12',
        levelId: 'level_2',
        levelNumber: 2,
        lessonNumber: 12,
        title: 'Strike 12 — Crown Strike (Tuktok)',
        filipinoTitle: 'Pang-labindalawa (Baston sa Tuktok)',
        subtitle: 'Direct Vertical Downward Cleave',
        target: 'Top of the head (Crown)',
        trainingTarget: 'Top of the head (Crown)',
        trajectory: 'Direct vertical downward cleave (90°)',
        purpose: 'Deliver a centered downward overhead strike and stop under full control at chest level.',
        mnemonicFormula: 'Centerline Chamber → Cleave Downward → Stop at Chest → Guard',
        description: 'The final canonical strike is a vertical downward overhead cleave directly down the center line onto the top of the head.',
        beginnerSummary: 'Raise the stick vertically above your head. Cleave straight down through the center line, stopping under full control at chest height. Do not let it hit the floor!',
        filipinoTermNote: 'Tuktok = Crown / Top of head. Baston sa Tuktok = Stick to the crown.',
        doThis: [
          'Raise the weapon vertically above your head along your center line.',
          'Chamber with your elbow bent to absorb recoil.',
          'Cleave straight down through the center line.',
          'Stop firmly at chest height under full control—do not drop stick to the floor.'
        ],
        lookLikeThis: 'A perfectly vertical downward cut that stops cleanly at chest height with zero wobble.',
        feelThis: 'Both arms and back muscles pulling down simultaneously, then locking firmly in place.',
        watchOutFor: 'Swinging all the way down to your shins and losing control of the weapon. Stop at chest level!',
        durationMinutes: 5,
        strikeKey: 'strike_12',
        isStrike: true,
        category: 'strikes',
        coachSteps: [
          '1. Raise weapon vertically above head on center line.',
          '2. Keep weight centered between feet without leaning.',
          '3. Cleave straight down through center line toward crown.',
          '4. Keep elbow flexed (111°-135°) to absorb impact recoil.',
          '5. Stop weapon firmly at chest level—do not drop cane to the floor.'
        ],
        commonMistakes: [
          'Over-swinging past chest level down to the floor, losing all recovery defense.',
          'Leaning torso forward past knees on the downward cut.'
        ],
        guroAdvice: 'The crown strike requires immense control. A master stops the cane firmly at chest level with authority.',
      },
    ],
  },
  {
    id: 'level_3',
    levelNumber: 3,
    name: 'Build Your Skills',
    tagline: 'Fluid combinations and weaving flow',
    badge: 'SKILLS & FLOW',
    badgeColor: '#8B5CF6',
    description: 'Connect individual strikes into fluid combinations, high-low transitions, and canonical Anyo patterns.',
    lessons: [
      {
        id: 'les_3_1',
        levelId: 'level_3',
        levelNumber: 3,
        lessonNumber: 1,
        title: 'High-Low Temple-Knee Flow',
        filipinoTitle: 'Kombinasyon: Sintido at Tuhod',
        subtitle: 'Strike 1 (Temple) to Strike 9 (Knee) Transition',
        trainingTarget: 'High-to-Low Level Transition',
        trajectory: 'Diagonal High ➔ Low Diagonal',
        purpose: 'Connect high diagonal cuts with low knee strikes in continuous fluid motion.',
        description: 'Practice transitioning between high and low levels: Strike 1 (left temple) rebounding directly into Strike 9 (right knee).',
        beginnerSummary: 'Flow smoothly from a high head strike (Strike 1) directly down into a low knee strike (Strike 9) by sinking your stance.',
        filipinoTermNote: 'Daloy = Flow. Sinawali = Weaving patterns.',
        doThis: [
          'Deliver Strike 1 at head height.',
          'As the cut finishes, sink your knees immediately.',
          'Deliver Strike 9 low across knee height without stopping.',
          'Return to high guard smoothly.'
        ],
        lookLikeThis: 'A continuous two-strike flow: high head cut into deep low knee slash.',
        feelThis: 'Your legs driving the level drop as your weapon flows continuously.',
        watchOutFor: 'Pausing between the two strikes. Let one motion feed into the next!',
        durationMinutes: 6,
        isStrike: false,
        category: 'drills',
        coachSteps: [
          'Execute Strike 1 forehand to temple.',
          'Rebound weapon immediately into high left chamber while sinking knees.',
          'Deliver Strike 9 backhand to knee level.',
          'Pop back to standard Tindig ready guard.'
        ],
        commonMistakes: [
          'Pausing between strikes instead of maintaining continuous circular momentum.',
          'Standing upright on the knee strike.'
        ],
        guroAdvice: 'Smooth is fast. Let the rebound of Strike 1 naturally load the chamber for Strike 9.',
      },
      {
        id: 'les_3_2',
        levelId: 'level_3',
        levelNumber: 3,
        lessonNumber: 2,
        title: 'Horizontal Ribs Cross-Flow',
        filipinoTitle: 'Kombinasyon: Tagiliran',
        subtitle: 'Strike 3 (Left Torso) to Strike 4 (Right Torso)',
        trainingTarget: 'Core Rotation & Obliques',
        trajectory: 'Horizontal Forehand ➔ Horizontal Backhand',
        purpose: 'Master continuous horizontal slicing without dropping the cutting plane.',
        description: 'Seamlessly link Strike 3 (forehand rib) into Strike 4 (backhand rib) with a crisp wrist snap on each contact point.',
        beginnerSummary: 'Slice horizontally across mid-body (Strike 3), then immediately slice backhand (Strike 4) like drawing an infinity symbol with your stick.',
        filipinoTermNote: 'Redonda / Otso-otso = Figure-8 circular striking patterns.',
        doThis: [
          'Deliver Strike 3 horizontally at rib height.',
          'Flip the stick tip over your left shoulder in a tight loop.',
          'Deliver Strike 4 horizontally across the right ribs.',
          'Snap back into ready guard.'
        ],
        lookLikeThis: 'A crisp two-way horizontal slice that stays parallel to the floor both ways.',
        feelThis: 'Torso twisting left, then snapping right like a coiled spring.',
        watchOutFor: 'Letting the stick droop or angle upward on the return cut.',
        durationMinutes: 6,
        isStrike: false,
        category: 'drills',
        coachSteps: [
          'Execute Strike 3 horizontally at rib height.',
          'Loop tip over left shoulder without dropping guard hand.',
          'Drive Strike 4 horizontally across right ribs.',
          'Return to primary chest guard.'
        ],
        commonMistakes: [
          'Dropping weapon plane into an upward slash.',
          'Flailing the check hand during the fast transition.'
        ],
        guroAdvice: 'Think of drawing an infinity symbol (figure-8) with the stick tip.',
      },
      {
        id: 'les_3_3',
        levelId: 'level_3',
        levelNumber: 3,
        lessonNumber: 3,
        title: 'Linear Thrust & Cleave Flow',
        filipinoTitle: 'Kombinasyon: Saksak at Tuktok',
        subtitle: 'Strike 5 (Stomach) to Strike 12 (Crown)',
        trainingTarget: 'Linear into Vertical Transition',
        trajectory: 'Linear Thrust ➔ Vertical Cleave',
        purpose: 'Transition smoothly from a linear forward thrust into a vertical overhead downward cleave.',
        description: 'Connect a direct linear stomach thrust (Strike 5) with a vertical overhead downward cleave (Strike 12).',
        beginnerSummary: 'Thrust forward into the center torso (Strike 5), pull straight up over your head, and cleave straight down (Strike 12).',
        filipinoTermNote: 'Saksak at Tuktok = Thrust and Crown Cleave.',
        doThis: [
          'Deliver Strike 5 linear thrust forward.',
          'Retract along center line and raise stick vertically above head.',
          'Cleave downward in Strike 12, stopping firmly at chest height.',
          'Return to ready stance.'
        ],
        lookLikeThis: 'A direct in-and-out thrust that rises smoothly into an overhead vertical cleave.',
        feelThis: 'Forward momentum shifting instantly into vertical downward power.',
        watchOutFor: 'Dropping your check hand while raising the stick overhead.',
        durationMinutes: 6,
        isStrike: false,
        category: 'drills',
        coachSteps: [
          'Execute Strike 5 linear stomach thrust.',
          'Retract along center line and immediately elevate cane into high vertical chamber.',
          'Cleave downward in Strike 12, stopping firmly at chest level.',
          'Recover to ready stance.'
        ],
        commonMistakes: [
          'Dropping check hand while raising stick overhead.',
          'Over-swinging Strike 12 past chest level.'
        ],
        guroAdvice: 'Use the recoil of the thrust to bounce your weapon up into the overhead chamber.',
      },
      {
        id: 'les_3_4',
        levelId: 'level_3',
        levelNumber: 3,
        lessonNumber: 4,
        title: 'Sinawali Rhythm Introduction',
        filipinoTitle: 'Panimula sa Sinawali',
        subtitle: 'The Weaving Rhythm of Filipino Martial Arts',
        trainingTarget: 'Bilateral Coordination & Flow',
        trajectory: 'Continuous weaving arcs',
        purpose: 'Understand how Arnis strikes weave rhythmically into continuous offensive and defensive combinations.',
        description: 'Sinawali (derived from "sawali", the woven bamboo wall mats of the Philippines) represents the rhythmic weaving patterns that unite all 12 strikes.',
        beginnerSummary: 'Sinawali means "weaving". Learn to swing with a calm, continuous rhythm like weaving bamboo mats.',
        filipinoTermNote: 'Sawali = Woven split-bamboo wall mats. Sinawali = The weaving motion in Arnis.',
        doThis: [
          'Focus on smooth rhythm rather than maximum speed.',
          'Coordinate your breath with every strike cycle.',
          'Keep your check hand active as your rhythmic partner.',
          'Listen to the whoosh of the stick cutting cleanly through the air.'
        ],
        lookLikeThis: 'A calm, continuous flow of strikes that look effortless and rhythmic.',
        feelThis: 'A hypnotic, continuous rhythm with zero muscle tension.',
        watchOutFor: 'Holding your breath or stiffening up when trying to go faster.',
        durationMinutes: 7,
        isStrike: false,
        category: 'drills',
        coachSteps: [
          'Maintain steady 60 BPM rhythm throughout combination repetitions.',
          'Coordinate breathing: exhale on each strike apex.',
          'Keep check hand actively mirrored on every single strike.',
          'Practice moving feet smoothly along triangular footwork lines.'
        ],
        commonMistakes: [
          'Holding breath during combination sequences.',
          'Sacrificing form and angle accuracy for meaningless speed.'
        ],
        guroAdvice: 'Rhythm is the soul of Arnis. When your strikes flow like water, power takes care of itself.',
      },
    ],
  },
  {
    id: 'level_4',
    levelNumber: 4,
    name: 'Final Assessment',
    tagline: 'Formal 12-strikes proficiency evaluation',
    badge: 'ASSESSMENT',
    badgeColor: '#F59E0B',
    description: 'Put all 12 strikes together in sequential order. The AI evaluates your form and consistency across all 4 pillars.',
    lessons: [
      {
        id: 'les_4_1',
        levelId: 'level_4',
        levelNumber: 4,
        lessonNumber: 1,
        title: 'The 12 Strikes Anyo Master Exam',
        filipinoTitle: 'Pagsusulit sa Labindalawang Pagtama',
        subtitle: 'The Complete Canonical Arnis Form',
        trainingTarget: 'Full 12-Strike Sequential Form',
        trajectory: 'Complete 12-Strike Anyo Sequence',
        purpose: 'Execute all 12 strikes in continuous order with proper stance, trajectory, guard, and recovery.',
        description: 'Execute Strikes 1 through 12 continuously in order. The computer vision engine analyzes your form across all 4 pillars to track your complete proficiency.',
        beginnerSummary: 'Perform all 12 strikes in order, one by one. Take your time, focus on keeping your check hand on your chest and your knees bent, and celebrate your progress!',
        filipinoTermNote: 'Anyo = Form / Kata. Pagsusulit = Examination / Assessment.',
        doThis: [
          'Perform Pugay (bow of respect) to start.',
          'Flow through Strikes 1 to 12 at a steady, controlled pace (about 2 seconds per strike).',
          'Keep your left check hand glued to your chest on every strike.',
          'Keep your knees bent in a solid athletic stance throughout.',
          'Conclude with Pugay to complete your assessment.'
        ],
        lookLikeThis: 'A confident, disciplined martial artist executing the complete canonical 12 strikes with poise.',
        feelThis: 'Pride in your discipline and a clear physical understanding of every movement.',
        watchOutFor: 'Rushing just to finish quickly. Quality and control count far more than raw speed.',
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
const STORAGE_KEY_DETAILED = '@arnis_curriculum_detailed_v3';

export interface DetailedLessonRecord {
  status: LessonStatus;
  lastScore?: number;
  attempts: number;
  lastTrainedDate?: string;
}

export async function getAllLessonDetailedStatuses(): Promise<Record<string, DetailedLessonRecord>> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY_DETAILED);
    if (raw) {
      return JSON.parse(raw);
    }
    // Backward compatibility: migrate from completedLessonIds
    const prog = await getCurriculumProgress();
    const migrated: Record<string, DetailedLessonRecord> = {};
    ALL_CURRICULUM_LESSONS.forEach((lesson, index) => {
      if (prog.completedLessonIds.includes(lesson.id)) {
        migrated[lesson.id] = { status: 'mastered', attempts: 1 };
      } else if (index === 0 || prog.completedLessonIds.includes(ALL_CURRICULUM_LESSONS[index - 1]?.id)) {
        migrated[lesson.id] = { status: 'learning', attempts: 0 };
      } else {
        migrated[lesson.id] = { status: 'not_started', attempts: 0 };
      }
    });
    return migrated;
  } catch (e) {
    console.error('Failed to get detailed lesson statuses', e);
    return {};
  }
}

export async function setLessonPedagogicalStatus(
  lessonId: string,
  status: LessonStatus,
  score?: number
): Promise<void> {
  try {
    const current = await getAllLessonDetailedStatuses();
    const existing = current[lessonId] || { status: 'not_started', attempts: 0 };
    const updatedRecord: DetailedLessonRecord = {
      status,
      lastScore: score !== undefined ? score : existing.lastScore,
      attempts: existing.attempts + 1,
      lastTrainedDate: new Date().toISOString(),
    };
    current[lessonId] = updatedRecord;
    await AsyncStorage.setItem(STORAGE_KEY_DETAILED, JSON.stringify(current));

    // If marked assessed with high score or marked mastered, mark completed in base progress
    if (status === 'mastered' || (score && score >= 85)) {
      await markLessonCompleted(lessonId);
    }
  } catch (e) {
    console.error('Failed to set lesson status', e);
  }
}

export function getStageHumanName(levelNumber: number): string {
  switch (levelNumber) {
    case 0: return 'Getting Started';
    case 1: return 'Build Your Fundamentals';
    case 2: return 'Learn The 12 Strikes';
    case 3: return 'Build Your Skills';
    case 4: return 'Final Assessment';
    default: return 'Getting Started';
  }
}

export function getStageSummary(levelNumber: number, completedLessonIds: string[]) {
  const level = CURRICULUM_DATA.find(l => l.levelNumber === levelNumber) || CURRICULUM_DATA[0];
  const total = level.lessons.length;
  const completed = level.lessons.filter(l => completedLessonIds.includes(l.id)).length;
  const percent = Math.round((completed / Math.max(1, total)) * 100);
  const remaining = Math.max(0, total - completed);

  // Dots representation e.g. "● ● ○ ○ ○"
  const dotsArray: string[] = [];
  for (let i = 0; i < total; i++) {
    dotsArray.push(i < completed ? '●' : '○');
  }
  const dots = dotsArray.join(' ');
  const statusLabel = `${completed} of ${total} lessons complete`;

  return {
    total,
    completed,
    percent,
    remaining,
    name: level.name,
    tagline: level.tagline,
    dots,
    statusLabel,
  };
}

export function getLessonLearningPoints(lesson: CurriculumLesson): string[] {
  if (lesson.whatYouWillLearn && lesson.whatYouWillLearn.length > 0) {
    return lesson.whatYouWillLearn.slice(0, 3);
  }
  if (lesson.doThis && lesson.doThis.length >= 3) {
    return lesson.doThis.slice(0, 3).map(s => s.replace(/\.$/, ''));
  }
  if (lesson.coachSteps && lesson.coachSteps.length >= 3) {
    return lesson.coachSteps.slice(0, 3).map(s => s.replace(/^\d+\.\s*/, '').replace(/\.$/, ''));
  }
  return [
    'Proper starting position and grip',
    'Controlled execution along target angle',
    'Safe recovery back to guard',
  ];
}

export function getLevelSummary(levelNumber: number, completedLessonIds: string[]) {
  return getStageSummary(levelNumber, completedLessonIds);
}

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

/**
 * Open Reading Access:
 * Anyone can read, learn, and watch ANY lesson at ANY time!
 * Zero knowledge gatekeeping.
 */
export function canReadLesson(_lessonId: string): boolean {
  return true;
}

/**
 * Gated Practice Access:
 * Progressive unlocking for camera practice.
 */
export function canPracticeLesson(lessonId: string, completedLessonIds: string[]): boolean {
  const lessonIndex = ALL_CURRICULUM_LESSONS.findIndex(l => l.id === lessonId);
  if (lessonIndex <= 4) return true; // Level 0 is always open for practice
  if (completedLessonIds.includes(lessonId)) return true;
  const prevLesson = ALL_CURRICULUM_LESSONS[lessonIndex - 1];
  return prevLesson ? completedLessonIds.includes(prevLesson.id) : true;
}

/**
 * Gated Testing Access:
 * Available once practice is reached.
 */
export function canTestLesson(lessonId: string, completedLessonIds: string[]): boolean {
  return canPracticeLesson(lessonId, completedLessonIds);
}

/**
 * Backward-compatible unlock check
 */
export function isLessonUnlocked(lessonId: string, completedLessonIds: string[]): boolean {
  return canPracticeLesson(lessonId, completedLessonIds);
}

/**
 * Determine a lesson's pedagogical status:
 * not_started | learning | watched | practicing | assessed | mastered
 */
export function getLessonStatus(
  lessonId: string,
  completedLessonIds: string[],
  score = 0
): LessonStatus {
  if (score >= 85 || completedLessonIds.includes(lessonId)) {
    return 'mastered';
  }
  if (score > 0) {
    return 'assessed';
  }
  const lessonIndex = ALL_CURRICULUM_LESSONS.findIndex(l => l.id === lessonId);
  const isUnlocked = lessonIndex <= 4 || (lessonIndex > 0 && completedLessonIds.includes(ALL_CURRICULUM_LESSONS[lessonIndex - 1]?.id));
  if (isUnlocked) {
    return 'practicing';
  }
  return 'not_started';
}

export async function resetCurriculumProgress(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY_PROGRESS);
    await AsyncStorage.removeItem(STORAGE_KEY_DETAILED);
  } catch (e) {
    console.error('Failed to reset curriculum progress', e);
  }
}
