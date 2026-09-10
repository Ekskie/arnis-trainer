import { getHistory, SessionItem } from '@/constants/historyStore';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface Message {
  id: string;
  sender: 'user' | 'coach';
  text: string;
  time: string;
}

// Comprehensive Arnis Biomechanics & Cultural Knowledge Base
const STRIKE_KNOWLEDGE: Record<string, { name: string; target: string; elbowRange: string; chamber: string; tip: string }> = {
  "1": { name: "Strike 1: Left Temple (Pang-una)", target: "Left Temple / Neck", elbowRange: "110.9° - 156.8°", chamber: "Right ear chamber with stick angled back 45°", tip: "Slash diagonally downward from your right ear across the opponent's left temple. Keep your Kalasag (check hand) pinned to your chest to block counter-strikes." },
  "2": { name: "Strike 2: Right Temple (Pangalawa)", target: "Right Temple / Neck", elbowRange: "132.3° - 175.3°", chamber: "Left shoulder chamber across chest", tip: "Diagonal downward backhand strike targeting the right temple. Pivot your hips forward and snap your wrist at the apex." },
  "3": { name: "Strike 3: Left Torso (Pangatlo)", target: "Left Ribs / Torso", elbowRange: "87.2° - 114.0°", chamber: "Right side chamber at hip level", tip: "Horizontal forehand slash cutting through the ribs. Lower your center of gravity by bending both knees into a solid forward stance." },
  "4": { name: "Strike 4: Right Torso (Pang-apat)", target: "Right Ribs / Torso", elbowRange: "121.1° - 165.8°", chamber: "Left side chamber across torso", tip: "Horizontal backhand cut to the right ribs. Rotate your torso into the cut while keeping your check hand high to guard against incoming counters." },
  "5": { name: "Strike 5: Abdomen Thrust (Pang-lima)", target: "Solar Plexus / Navel", elbowRange: "151.1° - 168.4°", chamber: "Hip level with stick horizontal", tip: "Linear thrust driving forward directly into the core. Keep your elbow almost straight (155°-168°) and lunge slightly forward to maximize penetration depth." },
  "6": { name: "Strike 6: Left Chest Thrust (Pang-anim)", target: "Left Upper Chest / Clavicle", elbowRange: "158.0° - 178.8°", chamber: "Right chest chamber angled upward", tip: "High upward thrust targeting the left chest or heart area. Palm facing upward at impact with the check hand protecting your chin." },
  "7": { name: "Strike 7: Right Chest Thrust (Pang-pito)", target: "Right Upper Chest / Clavicle", elbowRange: "149.2° - 172.1°", chamber: "Left shoulder chamber", tip: "Backhand diagonal thrust targeting the right chest. Maintain firm wrist tension so the weapon does not buckle on impact." },
  "8": { name: "Strike 8: Left Knee (Pang-walo)", target: "Left Knee / Lower Thigh", elbowRange: "165.5° - 178.0°", chamber: "High right chamber", tip: "Low downward diagonal slash targeting the lead knee. Drop your stance deeply into a low forward stance to reach the target without bending your spine forward." },
  "9": { name: "Strike 9: Right Knee (Pang-siyam)", target: "Right Knee / Lower Thigh", elbowRange: "170.3° - 176.3°", chamber: "High left chamber", tip: "Low backhand strike targeting the opponent's right knee. Drive the cut through with wrist snap (Pitik) and recover swiftly to avoid counter-head strikes." },
  "10": { name: "Strike 10: Left Eye Thrust (Pang-sampu)", target: "Left Eye / Facial Nerve", elbowRange: "161.9° - 179.1°", chamber: "Ear level, horizontal alignment", tip: "Precise eye-level thrust. Requires minimal chambering telegraphing; flick directly forward along the line of sight." },
  "11": { name: "Strike 11: Right Eye Thrust (Pang-labing-isa)", target: "Right Eye / Face Thrust", elbowRange: "151.9° - 178.9°", chamber: "Left eye level", tip: "Backhand eye thrust. Keep the wrist straight and immediately pull back into Kalasag guard after delivery (Bawi phase)." },
  "12": { name: "Strike 12: Crown Strike (Baston sa Tuktok)", target: "Crown of the Skull", elbowRange: "111.1° - 135.0°", chamber: "Direct vertical overhead chamber", tip: "Vertical downward cleave directly into the skull crown. Keep your weight centered and do not lean past your knees. Elbow must remain flexed (111°-135°) to absorb recoil." }
};

function generateSemanticCoachResponse(query: string, userSessions: SessionItem[]): string {
  const q = query.toLowerCase().trim();

  // 1. Performance Analysis Intent
  if (q.includes("analyze") || q.includes("performance") || q.includes("history") || q.includes("stats") || q.includes("progress")) {
    if (userSessions.length === 0) {
      return "📊 **PERFORMANCE ANALYSIS**\n\nYou haven't recorded any evaluation sessions yet! Head over to the **Evaluate** tab, select a strike, and complete a 3-second test to start tracking your kinetic accuracy.";
    }
    const count = userSessions.length;
    const avgScore = Math.round(userSessions.reduce((a, b) => a + b.score, 0) / count);
    const bestScore = Math.max(...userSessions.map(s => s.score));

    // Find pillar averages
    let totalElbow = 0, totalGuard = 0, totalStance = 0, totalWrist = 0;
    userSessions.forEach(s => {
      totalElbow += (s.breakdown?.elbow?.score || s.score);
      totalGuard += (s.breakdown?.guard?.score || 80);
      totalStance += (s.breakdown?.stance?.score || s.breakdown?.knee?.score || 80);
      totalWrist += (s.breakdown?.wrist?.score || 85);
    });

    const avgElbow = Math.round(totalElbow / count);
    const avgGuard = Math.round(totalGuard / count);
    const avgStance = Math.round(totalStance / count);
    const avgWrist = Math.round(totalWrist / count);

    let weakestPillar = "Striking Arm Extension";
    let minPillarVal = avgElbow;
    if (avgGuard < minPillarVal) { weakestPillar = "Kalasag Check Hand Guard"; minPillarVal = avgGuard; }
    if (avgStance < minPillarVal) { weakestPillar = "Tindig Knee Bend & Base"; minPillarVal = avgStance; }
    if (avgWrist < minPillarVal) { weakestPillar = "Pitik Wrist Alignment"; minPillarVal = avgWrist; }

    return `📊 **ACADEMIC PERFORMANCE TELEMETRY**\n\n` +
      `• **Total Completed Sessions:** ${count}\n` +
      `• **Overall Composite Accuracy:** ${avgScore}%\n` +
      `• **Personal Best Execution:** ${bestScore}%\n\n` +
      `**4-Pillar Biomechanical Breakdown:**\n` +
      `• ⚔️ Striking Arm Mechanics: ${avgElbow}%\n` +
      `• 🛡️ Kalasag Guard Hand: ${avgGuard}%\n` +
      `• 🦵 Tindig Stance Stability: ${avgStance}%\n` +
      `• ⚡ Pitik Wrist Snap: ${avgWrist}%\n\n` +
      `💡 **Primary Prescription:** Focus on drilling your **${weakestPillar}** (${minPillarVal}% avg). Check the Evaluate tab to isolate this motion!`;
  }

  // 2. Lowest / Weakest Strike Diagnosis Intent
  if (q.includes("lowest") || q.includes("fix my") || q.includes("weakest") || q.includes("struggling") || q.includes("worst") || q.includes("low score") || q.includes("why did i fail")) {
    if (userSessions.length === 0) {
      return "📉 **WHY LOW SCORES HAPPEN & HOW TO FIX THEM**\n\n" +
        "1. **Did you freeze?** The system evaluates dynamic strikes! Freezing in place triggers the *STATIC_HOLD* penalty.\n" +
        "2. **Check Hand Dropping?** 25% of your score comes from *Kalasag* (check hand). Keep your non-striking fist pinned to your solar plexus.\n" +
        "3. **Stiff Knees?** Standing upright reduces *Tindig* (stance) points. Bend your lead knee into an active forward stance.\n" +
        "4. **Camera Framing:** Make sure your entire body (head to toes) is visible in the frame (stand 2 to 2.5m back).\n\n" +
        "Complete a test in the Evaluate tab to see your exact 4-pillar breakdown!";
    }
    const strikeScores: Record<string, number[]> = {};
    userSessions.forEach(item => {
      if (!strikeScores[item.strikeName]) strikeScores[item.strikeName] = [];
      strikeScores[item.strikeName].push(item.score);
    });

    let lowestStrike = '';
    let lowestAvg = 100;
    Object.keys(strikeScores).forEach(name => {
      const avg = Math.round(strikeScores[name].reduce((a, b) => a + b, 0) / strikeScores[name].length);
      if (avg < lowestAvg) {
        lowestAvg = avg;
        lowestStrike = name;
      }
    });

    return `🎯 **DIAGNOSTIC PRESCRIPTION FOR ${lowestStrike.toUpperCase()}** (Avg ${lowestAvg}%)\n\n` +
      `Based on your movement patterns, here is your 3-step corrective protocol:\n\n` +
      `1. **Kasa (Chambering Phase):** Ensure you load the weapon fully before launching the swing. Don't rush the acceleration.\n` +
      `2. **Kalasag Guard:** Keep your non-striking hand locked at solar plexus level throughout the stroke.\n` +
      `3. **Pitik Snap at Apex:** Accelerate through the target arc and snap the wrist firmly upon reaching the apex impact zone.\n\n` +
      `💡 Avoid standing still—the system requires dynamic acceleration to register apex impact!`;
  }

  // 2b. How to hold the stick / grip
  if (q.includes("hold") || q.includes("grip") || q.includes("punyo") || q.includes("hand position")) {
    return `🎋 **HOW TO HOLD THE ARNIS STICK (HAWAK & PUNYO)**\n\n` +
      `• **The 4-Finger Wrap:** Wrap your four fingers firmly around the baston, locking your thumb securely over your index finger.\n` +
      `• **Leave 1–2 Inches (The Punyo):** Leave 1 to 2 inches of stick butt extending beneath your pinky. This is the *Punyo*, used for close-range butt strikes, hooking, and disarming!\n` +
      `• **Grip Tension:** Hold with moderate firmness (like holding a bird—neither crushing it nor letting it drop). Relax until the moment of impact, then tighten and snap (*Pitik*)!`;
  }

  // 2c. Difference between Strike 1 and Strike 2
  if (q.includes("difference") && (q.includes("1") || q.includes("2") || q.includes("temple"))) {
    return `⚔️ **STRIKE 1 VS. STRIKE 2: FOREHAND VS. BACKHAND**\n\n` +
      `• **Strike 1 (Forehand Temple Cut):**\n` +
      `  - Starts at your right ear/shoulder chamber.\n` +
      `  - Slices diagonally downward to the opponent's left temple.\n` +
      `  - Uses powerful chest and core rotation.\n\n` +
      `• **Strike 2 (Backhand Temple Cut):**\n` +
      `  - Starts crossed over at your left shoulder chamber.\n` +
      `  - Slices diagonally downward to the opponent's right temple.\n` +
      `  - Driven by triceps extension, hip opening, and backhand wrist snap.\n\n` +
      `🛡️ **Both Require:** Kalasag check hand firmly shielding your chest!`;
  }

  // 2d. Explain like a beginner
  if (q.includes("beginner") || q.includes("simple") || q.includes("explain this like") || q.includes("start")) {
    return `🥋 **ARNIS IN 3 SIMPLE RULES FOR BEGINNERS**\n\n` +
      `Welcome to Arnis (Philippine National Martial Art)! Here is all you need to remember:\n\n` +
      `1. **The Stick is Your Arm's Extension:** Don't swing like a baseball bat. Rotate your hips and lead with your elbow.\n` +
      `2. **Guard Your Core (Kalasag):** Your empty hand is your shield! Keep it pinned to your solar plexus. If it drops, you get hit in combat.\n` +
      `3. **The 3-Beat Rhythm:** Kasa (cock weapon by ear) ➔ Tudla (accelerate and slice through target) ➔ Bawi (recover right back to defensive guard).\n\n` +
      `Check out **Level 0 (Orientation)** and **Level 1 (Fundamentals)** in the Learn tab!`;
  }

  // 3. Individual Strike Specific Inquiries (Strike 1 to 12)
  for (let i = 1; i <= 12; i++) {
    const numStr = i.toString();
    const strikeKey = "strike " + numStr;
    const strikeKeyAlt = "strike" + numStr;
    if (q.includes(strikeKey) || q.includes(strikeKeyAlt) || (q.includes(numStr) && (q.includes("strike") || q.includes("technique")))) {
      const info = STRIKE_KNOWLEDGE[numStr];
      if (info) {
        return `⚔️ **${info.name.toUpperCase()}**\n\n` +
          `• **Target Anatomical Area:** ${info.target}\n` +
          `• **Calibrated Elbow Range:** ${info.elbowRange}\n` +
          `• **Chamber Position (Kasa):** ${info.chamber}\n\n` +
          `🥋 **Grandmaster Coaching Tip:**\n${info.tip}`;
      }
    }
  }

  // 4. Target Area Keywords (Temple, Torso, Eye, Knee, Crown, Thrust)
  if (q.includes("crown") || q.includes("overhead") || q.includes("tuktok")) {
    const info = STRIKE_KNOWLEDGE["12"];
    return `⚔️ **STRIKE 12: CROWN STRIKE (BASTON SA TUKTOK)**\n\nTarget: ${info.target} | Elbow: ${info.elbowRange}\n\n${info.tip}`;
  }
  if (q.includes("temple")) {
    return `⚔️ **TEMPLE STRIKES (STRIKES 1 & 2)**\n\n• **Strike 1 (Left Temple):** Forehand diagonal downward slice (Elbow 110.9° - 156.8°).\n• **Strike 2 (Right Temple):** Backhand diagonal downward slice (Elbow 132.3° - 175.3°).\n\nBoth strikes target the carotid artery and temples. Keep your Kalasag guard up to shield against counter-cuts!`;
  }
  if (q.includes("torso") || q.includes("ribs")) {
    return `⚔️ **TORSO & RIB STRIKES (STRIKES 3 & 4)**\n\n• **Strike 3 (Left Torso):** Horizontal forehand slice cutting through the floating ribs (Elbow 87.2° - 114.0°).\n• **Strike 4 (Right Torso):** Horizontal backhand slash to right flank (Elbow 121.1° - 165.8°).\n\nSink your stance by bending the knees to drop your cutting plane into the opponent's core.`;
  }
  if (q.includes("knee") || q.includes("low strike")) {
    return `⚔️ **LOW KNEE CUTS (STRIKES 8 & 9)**\n\n• **Strike 8 (Left Knee):** Low diagonal downward forehand (Elbow 165.5° - 178.0°).\n• **Strike 9 (Right Knee):** Low diagonal backhand (Elbow 170.3° - 176.3°).\n\n⚠️ **Common Fault:** Do not bend at the waist! Drop down through knee flexion (Tindig) to keep your head high and protected.`;
  }
  if (q.includes("eye") || q.includes("thrust to eye")) {
    return `⚔️ **EYE-LEVEL THRUSTS (STRIKES 10 & 11)**\n\n• **Strike 10 (Left Eye Thrust):** High direct forehand thrust (Elbow 161.9° - 179.1°).\n• **Strike 11 (Right Eye Thrust):** High backhand thrust (Elbow 151.9° - 178.9°).\n\nThese are lightning thrusts targeting facial nerve clusters. Deliver with minimal wind-up and immediate retraction (Bawi).`;
  }

  // 5. Biomechanical Pillar: Check Hand (Kalasag)
  if (q.includes("kalasag") || q.includes("guard") || q.includes("check hand") || q.includes("left hand") || q.includes("shield")) {
    return `🛡️ **THE KALASAG (CHECK HAND) PILLAR**\n\n` +
      `In authentic Filipino Martial Arts (FMA), the weapon hand delivers the cut while the "live hand" (Kalasag) ensures your survival.\n\n` +
      `• **Target Position:** Center of chest / solar plexus (normalized distance $\\le 0.45$ of torso length).\n` +
      `• **Tactical Purpose:** Deflect counter-strikes, parry opponent blades, check the enemy's weapon arm, and prevent disarms.\n` +
      `• **System Evaluation:** If your non-striking hand drops below hip level or extends aimlessly, the system flags **GUARD_LOW** and deducts points from the 25% Guard Pillar!`;
  }

  // 6. Biomechanical Pillar: Stance (Tindig)
  if (q.includes("stance") || q.includes("tindig") || q.includes("knees") || q.includes("legs") || q.includes("footwork")) {
    return `🦵 **THE TINDIG (MARTIAL BASE & STANCE) PILLAR**\n\n` +
      `A powerful strike is born from the ground up through the kinetic chain.\n\n` +
      `• **Ideal Lead Knee Flexion:** Between **135° and 165°** (forward fighting stance).\n` +
      `• **Center of Mass:** Lowered and balanced between both feet to absorb recoil and transfer kinetic torque.\n` +
      `• **System Warning:** Standing upright with locked knees (> 170°) triggers the **STANCE_HIGH** penalty, reducing stance stability score!`;
  }

  // 7. Kinetic Chain & Anti-Static Gaming: Kasa, Tudla, Bawi
  if (q.includes("kasa") || q.includes("tudla") || q.includes("bawi") || q.includes("kinetic") || q.includes("phases") || q.includes("sequence") || q.includes("static")) {
    return `⚡ **THE ARNIS KINETIC CHAIN: KASA · TUDLA · BAWI**\n\n` +
      `Our evaluator does not grade static mannequin poses—it tracks the full dynamic kinetic chain:\n\n` +
      `1. **KASA (Chambering):** Weapon is cocked by the ear or hip; potential energy stored ($v < 0.12$).\n` +
      `2. **TUDLA (Drive & Apex):** Arm and weapon accelerate along the trajectory arc ($v > 0.18$) culminating in a high-velocity apex hit.\n` +
      `3. **BAWI (Recovery):** Instant retraction back into ready defensive guard.\n\n` +
      `⚠️ **Anti-Static Detection:** Freezing in place without swinging triggers the **STATIC_HOLD_DETECTED** penalty. You must execute the full strike motion!`;
  }

  // 8. Wrist Snap & Alignment (Pitik / Abaniko)
  if (q.includes("wrist") || q.includes("pitik") || q.includes("abaniko") || q.includes("snap") || q.includes("power")) {
    return `⚡ **WRIST MECHANICS: PITIK & ALIGNMENT**\n\n` +
      `In Arnis, the final 30% of striking power comes from the wrist snap (*Pitik*):\n\n` +
      `• **Alignment Criterion:** Wrist deviation relative to forearm vector should be **under 15°** at apex impact.\n` +
      `• **Weak Wrist Danger:** Letting your wrist sag or bend backwards triggers the **WRIST_WEAK** flag and causes severe kinetic energy dissipation (and wrist injury in real combat).\n` +
      `• **Abaniko (Fan Strike):** Rapid wrist-driven oscillating slashes used for unpredictable angle transitions.`;
  }

  // 9. Stick Tracking & Color Engine
  if (q.includes("stick") || q.includes("baston") || q.includes("tracking") || q.includes("ribbon") || q.includes("color")) {
    return `🎋 **THE SCALE-ADAPTIVE STICK TRACKING ENGINE**\n\n` +
      `• **Dynamic Reach:** Calibrates detection distance dynamically based on your screen-space forearm length ($1.65\\times$ forearm), adapting perfectly whether you stand 1 meter or 3 meters away.\n` +
      `• **Motion-Blur Compensation:** During high-speed swings (>400°/s), kinematic forearm projection seamlessly maintains the stick tip trajectory.\n` +
      `• **Motion Ribbon:** Color-coded velocity trail (Yellow = Cruising, Orange = Acceleration, Bright Red/Crimson = High-Velocity Apex Strike).\n` +
      `• **Color Modes:** Supports Traditional Rattan, Red, Blue, Green, and Auto-Detect.`;
  }

  // 10. Academic / Thesis / Architecture: AlphaPose vs MediaPipe
  if (q.includes("alphapose") || q.includes("mediapipe") || q.includes("architecture") || q.includes("ground truth") || q.includes("dataset")) {
    return `🔬 **SYSTEM ARCHITECTURE: ALPHAPOSE VS. MEDIAPIPE**\n\n` +
      `• **AlphaPose (Offline Research Baseline):** Processed expert reference video footage offline to extract ground-truth 2D skeletal coordinates and populate **arnis_dataset_v2.csv** (14,766 frames across all 12 strikes).\n` +
      `• **MediaPipe Tasks-Vision (Edge Runtime):** Runs on-device inside the sandboxed WebView canvas at 30+ FPS, providing 33 3D landmarks with depth perception without requiring a cloud GPU server.\n` +
      `• **3D Metric Normalization:** Torso-scaled coordinate alignment ensures angles remain invariant to camera height, tilt, and perspective foreshortening.`;
  }

  // 11. Academic Metrics: PCK, MPJPE, OKS
  if (q.includes("metric") || q.includes("pck") || q.includes("mpjpe") || q.includes("oks") || q.includes("validation") || q.includes("formula")) {
    return `📐 **SCIENTIFIC VALIDATION METRICS**\n\n` +
      `• **PCK@0.2 (Percentage of Correct Keypoints):** Keypoint is deemed accurate if euclidean distance to ground truth is $\\le 0.2\\times$ torso scale. PoseFix achieves **>94% PCK** on key striking joints.\n` +
      `• **MPJPE (Mean Per Joint Position Error):** Average pixel/normalized distance deviation across all 12 joints between prediction and ground truth.\n` +
      `• **OKS (Object Keypoint Similarity):** COCO-standard scale-normalized similarity score (exceeding 0.88 indicates exceptional model agreement).`;
  }

  // 12. Philippine Cultural Heritage & Republic Act 9850
  if (q.includes("ra 9850") || q.includes("republic act") || q.includes("national sport") || q.includes("culture") || q.includes("fma") || q.includes("kali") || q.includes("eskrima")) {
    return `🇵🇭 **REPUBLIC ACT 9850 & ARNIS HERITAGE**\n\n` +
      `Signed in 2009, **Republic Act No. 9850** declared Arnis as the **National Martial Art and Sport of the Philippines**.\n\n` +
      `Known historically as *Eskrima* and *Kali*, the art emphasizes weapon-first mastery before empty-hand combat (*Kamayan/Panantukan*). The 12 strikes form the foundational canon taught across Philippine educational and athletic curriculums. PoseFix-Arnis was engineered to preserve, standardize, and democratize access to authentic FMA coaching!`;
  }

  // Default Fallback with Adaptive Guidance
  return `🥋 **AI GRANDMASTER COACH**\n\n` +
    `I can analyze your performance or explain any technical aspect of Arnis:\n\n` +
    `• **Specific Strikes:** Ask about any strike (e.g., *"How do I execute Strike 5?"* or *"Strike 12 form"*)\n` +
    `• **Biomechanical Pillars:** Ask about **Kalasag** (check hand), **Tindig** (stance), or **Pitik** (wrist snap)\n` +
    `• **Kinetic Execution:** Learn how **Kasa · Tudla · Bawi** works and how to avoid the static hold penalty\n` +
    `• **Research Metrics:** Ask about **AlphaPose vs MediaPipe** or our **PCK & MPJPE** validation benchmarks\n\n` +
    `What would you like to drill today?`;
}

function extractReferencedStrikes(text: string): { strikeKey: string; strikeName: string }[] {
  const matches: { strikeKey: string; strikeName: string }[] = [];
  for (let i = 1; i <= 12; i++) {
    const regex = new RegExp(`\\b(strike\\s*${i})\\b`, 'i');
    if (regex.test(text)) {
      matches.push({
        strikeKey: `strike_${i}`,
        strikeName: `Strike ${i}`,
      });
    }
  }
  return matches.filter((v, idx, arr) => arr.findIndex(t => t.strikeKey === v.strikeKey) === idx).slice(0, 2);
}

function FormattedMessageText({ text, isUser }: { text: string; isUser: boolean }) {
  if (isUser) {
    return <Text style={styles.userBubbleText}>{text}</Text>;
  }

  const lines = text.split('\n');

  return (
    <View style={styles.formattedTextContainer}>
      {lines.map((line, lineIdx) => {
        const trimmed = line.trim();
        if (!trimmed) {
          return <View key={lineIdx} style={{ height: 6 }} />;
        }

        const isHeader = /^[📊🎯⚔️🛡️⚡🥋🔬📐🇵🇭🎋🦵]/.test(line);
        const isBullet = line.startsWith('• ') || line.startsWith('- ');
        const parts = line.split(/(\*\*.*?\*\*)/g);

        return (
          <Text
            key={lineIdx}
            style={[
              styles.bubbleText,
              isHeader && styles.headerLineText,
              isBullet && styles.bulletLineText,
            ]}
          >
            {parts.map((part, partIdx) => {
              if (part.startsWith('**') && part.endsWith('**')) {
                const boldContent = part.slice(2, -2);
                return (
                  <Text
                    key={partIdx}
                    style={[
                      styles.boldSpan,
                      isHeader && { color: '#F59E0B' },
                    ]}
                  >
                    {boldContent}
                  </Text>
                );
              }
              return <Text key={partIdx}>{part}</Text>;
            })}
          </Text>
        );
      })}
    </View>
  );
}

export default function CoachChatScreen() {
  const router = useRouter();
  const scrollViewRef = useRef<ScrollView>(null);

  const [userSessions, setUserSessions] = useState<SessionItem[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([
    "🎯 What does Strike 3 target?",
    "📉 Why am I getting a low score?",
    "🎋 How do I hold the stick?",
    "⚔️ Difference between Strike 1 and Strike 2?",
    "🐣 Explain this like I'm a beginner",
    "📊 Analyze my performance history",
    "🛡️ Why is Kalasag guard so important?",
    "⚡ Explain Kasa, Tudla, and Bawi",
    "🦵 What is proper Tindig stance?",
    "🔬 Why AlphaPose vs MediaPipe?",
  ]);

  const formatTime = () => {
    const now = new Date();
    return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
  };

  const buildInitialGreeting = (history: SessionItem[] | null) => {
    let initialGreeting = "Mabuhay! I am your AI Virtual Grandmaster Coach. Complete an Evaluate session to receive real-time kinematic diagnostics!";

    if (history && history.length > 0) {
      const count = history.length;
      const avgScore = Math.round(history.reduce((a, b) => a + b.score, 0) / count);

      const strikeScores: Record<string, number[]> = {};
      history.forEach(item => {
        if (!strikeScores[item.strikeName]) strikeScores[item.strikeName] = [];
        strikeScores[item.strikeName].push(item.score);
      });

      let lowestStrike = '';
      let lowestAvg = 100;
      let highestStrike = '';
      let highestAvg = 0;

      Object.keys(strikeScores).forEach(name => {
        const avg = Math.round(strikeScores[name].reduce((a, b) => a + b, 0) / strikeScores[name].length);
        if (avg < lowestAvg) {
          lowestAvg = avg;
          lowestStrike = name;
        }
        if (avg > highestAvg) {
          highestAvg = avg;
          highestStrike = name;
        }
      });

      initialGreeting = `Mabuhay! I analyzed your ${count} practice sessions (Overall Average: ${avgScore}%).\n\n` +
        `• ⚔️ Mastered Strike: ${highestStrike || 'Strike 1'} (${highestAvg}% avg)\n` +
        `• 🎯 Focus Area: ${lowestStrike || 'Strike 3'} (${lowestAvg}% avg)\n\n` +
        `Tap a question below or ask me how to refine your Kalasag guard, stance, or strike trajectory!`;
    }
    return initialGreeting;
  };

  // Load history and initialize personalized coach message
  useFocusEffect(
    useCallback(() => {
      let isMounted = true;
      getHistory().then((history) => {
        if (!isMounted) return;
        const list = history || [];
        setUserSessions(list);

        const initialGreeting = buildInitialGreeting(list);

        if (list.length > 0) {
          const strikeScores: Record<string, number[]> = {};
          list.forEach(item => {
            if (!strikeScores[item.strikeName]) strikeScores[item.strikeName] = [];
            strikeScores[item.strikeName].push(item.score);
          });

          let lowestStrike = '';
          let lowestAvg = 100;
          Object.keys(strikeScores).forEach(name => {
            const avg = Math.round(strikeScores[name].reduce((a, b) => a + b, 0) / strikeScores[name].length);
            if (avg < lowestAvg) {
              lowestAvg = avg;
              lowestStrike = name;
            }
          });

          setSuggestions([
            `🎯 How do I fix my ${lowestStrike || 'Strike 3'}?`,
            "📉 Why am I getting a low score?",
            "🎋 How do I hold the stick?",
            "⚔️ Difference between Strike 1 and Strike 2?",
            "🐣 Explain this like I'm a beginner",
            "📊 Analyze my performance history",
            "🛡️ Why is Kalasag guard so important?",
            "⚡ Explain Kasa, Tudla, and Bawi",
            "🦵 What is proper Tindig stance?",
          ]);
        }

        setMessages([
          {
            id: 'msg_welcome',
            sender: 'coach',
            text: initialGreeting,
            time: formatTime()
          }
        ]);
      });

      return () => {
        isMounted = false;
      };
    }, [])
  );

  const handleResetChat = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const greeting = buildInitialGreeting(userSessions);
    setMessages([
      {
        id: 'msg_welcome_' + Date.now(),
        sender: 'coach',
        text: greeting,
        time: formatTime()
      }
    ]);
  };

  const handleSendMessage = (text: string) => {
    if (!text.trim()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const userMsg: Message = {
      id: 'msg_user_' + Date.now(),
      sender: 'user',
      text: text,
      time: formatTime()
    };

    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    scrollViewRef.current?.scrollToEnd({ animated: true });

    // Trigger semantic coach response
    setIsTyping(true);
    setTimeout(() => {
      const responseText = generateSemanticCoachResponse(text, userSessions);

      const coachMsg: Message = {
        id: 'msg_coach_' + Date.now(),
        sender: 'coach',
        text: responseText,
        time: formatTime()
      };

      setIsTyping(false);
      setMessages(prev => [...prev, coachMsg]);

      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }, 600);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity
            onPress={() => {
              if (router.canGoBack()) {
                router.back();
              } else {
                router.push('/');
              }
            }}
            style={styles.backBtn}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>🥋 Ask Coach</Text>
            <Text style={styles.headerSubtitle}>Virtual Arnis Mentor & Kinematics</Text>
          </View>
          <TouchableOpacity
            style={styles.refreshBtn}
            onPress={handleResetChat}
            activeOpacity={0.7}
          >
            <Ionicons name="refresh" size={16} color="#94A3B8" />
          </TouchableOpacity>
        </View>
      </View>

      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          ref={scrollViewRef}
          contentContainerStyle={styles.chatContent}
          showsVerticalScrollIndicator={false}
        >
          {messages.map((item) => (
            <View
              key={item.id}
              style={[
                styles.messageRow,
                item.sender === 'user' ? styles.userRow : styles.coachRow
              ]}
            >
              {item.sender === 'coach' && (
                <View style={styles.avatarContainer}>
                  <MaterialCommunityIcons name="sword" size={15} color="#FFFFFF" />
                </View>
              )}

              {item.sender === 'user' ? (
                <View style={[styles.bubble, styles.userBubble]}>
                  <Text style={styles.userBubbleText}>{item.text}</Text>
                  <Text style={[styles.bubbleTime, { color: '#FFFFFF80' }]}>{item.time}</Text>
                </View>
              ) : (
                <View style={styles.coachBubbleWrapper}>
                  <View style={[styles.bubble, styles.coachBubble]}>
                    <FormattedMessageText text={item.text} isUser={false} />
                    <Text style={styles.bubbleTime}>{item.time}</Text>
                  </View>

                  {/* Direct Action Chips */}
                  {(() => {
                    const referenced = extractReferencedStrikes(item.text);
                    if (referenced.length === 0) return null;
                    return (
                      <View style={styles.actionChipsRow}>
                        {referenced.map((s) => (
                          <TouchableOpacity
                            key={s.strikeKey}
                            style={styles.actionChipBtn}
                            activeOpacity={0.7}
                            onPress={() => {
                              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                              router.push({
                                pathname: '/evaluate',
                                params: { strikeId: s.strikeKey }
                              });
                            }}
                          >
                            <MaterialCommunityIcons name="sword" size={13} color="#F59E0B" style={{ marginRight: 5 }} />
                            <Text style={styles.actionChipText}>Practice {s.strikeName} Now</Text>
                            <Ionicons name="arrow-forward" size={12} color="#F59E0B" style={{ marginLeft: 4 }} />
                          </TouchableOpacity>
                        ))}
                      </View>
                    );
                  })()}
                </View>
              )}
            </View>
          ))}

          {isTyping && (
            <View style={[styles.messageRow, styles.coachRow]}>
              <View style={styles.avatarContainer}>
                <MaterialCommunityIcons name="sword" size={15} color="#FFFFFF" />
              </View>
              <View style={[styles.bubble, styles.coachBubble, styles.typingBubble]}>
                <Text style={styles.typingText}>Coach is analyzing kinematics...</Text>
              </View>
            </View>
          )}
        </ScrollView>

        {/* Suggestions Row */}
        <View style={styles.suggestionsContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.suggestionsScroll}>
            {suggestions.map((item, idx) => (
              <TouchableOpacity
                key={idx}
                style={styles.suggestionChip}
                onPress={() => handleSendMessage(item)}
                activeOpacity={0.7}
              >
                <Text style={styles.suggestionChipText}>{item}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Input Bar */}
        <View style={styles.inputBar}>
          <TextInput
            style={styles.textInput}
            placeholder="Ask about strikes, guard, stance, metrics..."
            placeholderTextColor="#64748B"
            value={inputText}
            onChangeText={setInputText}
            onSubmitEditing={() => handleSendMessage(inputText)}
          />
          <TouchableOpacity
            style={styles.sendButton}
            onPress={() => handleSendMessage(inputText)}
            activeOpacity={0.8}
          >
            <Ionicons name="send" size={17} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0C16',
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#161930',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: {
    marginRight: 10,
    padding: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 19,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: 11,
    color: '#F59E0B',
    fontWeight: 'bold',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginTop: 2,
  },
  refreshBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#161930',
    borderWidth: 1,
    borderColor: '#1E293B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  keyboardContainer: {
    flex: 1,
  },
  chatContent: {
    padding: 16,
    paddingBottom: 10,
  },
  messageRow: {
    flexDirection: 'row',
    marginBottom: 16,
    alignItems: 'flex-start',
    maxWidth: '92%',
  },
  userRow: {
    alignSelf: 'flex-end',
    justifyContent: 'flex-end',
  },
  coachRow: {
    alignSelf: 'flex-start',
    justifyContent: 'flex-start',
  },
  coachBubbleWrapper: {
    flex: 1,
  },
  avatarContainer: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#D24B38',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    marginTop: 2,
  },
  bubble: {
    borderRadius: 16,
    paddingHorizontal: 15,
    paddingVertical: 12,
  },
  userBubble: {
    backgroundColor: '#D24B38',
    borderBottomRightRadius: 4,
    maxWidth: '85%',
  },
  userBubbleText: {
    color: '#FFFFFF',
    fontSize: 14,
    lineHeight: 20,
  },
  coachBubble: {
    backgroundColor: '#161930',
    borderWidth: 1,
    borderColor: '#1E293B',
    borderTopLeftRadius: 4,
  },
  formattedTextContainer: {
    gap: 2,
  },
  bubbleText: {
    color: '#CBD5E1',
    fontSize: 13.5,
    lineHeight: 20,
  },
  headerLineText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
    marginBottom: 2,
  },
  bulletLineText: {
    paddingLeft: 4,
  },
  boldSpan: {
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  bubbleTime: {
    color: '#64748B',
    fontSize: 10,
    alignSelf: 'flex-end',
    marginTop: 6,
  },
  typingBubble: {
    paddingVertical: 10,
  },
  typingText: {
    color: '#64748B',
    fontSize: 12.5,
    fontStyle: 'italic',
  },
  actionChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
    marginLeft: 2,
  },
  actionChipBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F59E0B15',
    borderWidth: 1,
    borderColor: '#F59E0B50',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  actionChipText: {
    color: '#F59E0B',
    fontSize: 11.5,
    fontWeight: 'bold',
  },
  suggestionsContainer: {
    borderTopWidth: 1,
    borderTopColor: '#161930',
    paddingVertical: 10,
    backgroundColor: '#0A0C16',
  },
  suggestionsScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  suggestionChip: {
    backgroundColor: '#161930',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#1E293B',
    paddingHorizontal: 13,
    paddingVertical: 7,
    justifyContent: 'center',
  },
  suggestionChipText: {
    color: '#E2E8F0',
    fontSize: 12,
    fontWeight: '500',
  },
  inputBar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#0A0C16',
    borderTopWidth: 1,
    borderTopColor: '#161930',
    gap: 10,
    alignItems: 'center',
  },
  textInput: {
    flex: 1,
    backgroundColor: '#161930',
    borderWidth: 1,
    borderColor: '#1E293B',
    borderRadius: 20,
    paddingHorizontal: 16,
    height: 42,
    color: '#FFFFFF',
    fontSize: 13.5,
  },
  sendButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#D24B38',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
