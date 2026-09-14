import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';

import { MartialTheme } from '@/constants/theme';
import { getHistory, SessionItem } from '@/constants/historyStore';
import { ALL_CURRICULUM_LESSONS } from '@/constants/curriculumStore';
import { getStrikeRule } from '@/constants/strikeRules';
import { CoachCharacter } from '@/components/ui/CoachCharacter';

interface Message {
  id: string;
  sender: 'user' | 'coach';
  text: string;
  time: string;
}

/**
 * Generate semantic coach response reusing centralized STRIKE_RULES and curriculum data
 */
function generateSemanticCoachResponse(
  query: string,
  userSessions: SessionItem[],
  activeWeakness?: string,
  activeStrikeId?: string
): string {
  const q = query.toLowerCase().trim();

  // 1. Contextual weakness / score troubleshooting
  if (
    q.includes('weakness') ||
    q.includes('fix this') ||
    q.includes('why did i get') ||
    q.includes('why was my score') ||
    q.includes('improve my score') ||
    q.includes('what am i doing wrong')
  ) {
    if (activeWeakness) {
      return (
        `🎯 **HOW TO CORRECT THIS FORM FAULT**\n\n` +
        `**Diagnosed Focus:**\n"${activeWeakness}"\n\n` +
        `**Coach's 3-Step Correction Protocol:**\n` +
        `1. **Lock Your Kalasag Shield:** Keep your non-striking fist pinned firmly to your chest/solar plexus. Don't let it drift downward as you swing.\n` +
        `2. **Check Your Angle & Reach:** Make sure your slicing arm cuts along the canonical diagonal or horizontal plane without dropping.\n` +
        `3. **Snap Through the Apex:** Deliver a crisp wrist snap (*Pitik*) at the impact apex, then immediately recover back to guard.\n\n` +
        `When you're ready, tap the practice button below to try again!`
      );
    }

    if (userSessions.length === 0) {
      return (
        `📉 **WHY LOW SCORES HAPPEN & HOW TO FIX THEM**\n\n` +
        `1. **Keep Moving:** The evaluator grades dynamic strikes! Don't freeze in place.\n` +
        `2. **Guard Hand (Kalasag):** 25% of your score is your shield hand! Keep it pinned to your chest.\n` +
        `3. **Athletic Stance (Tindig):** Bend your lead knee at an athletic angle (135°-165°).\n` +
        `4. **Camera Framing:** Make sure your entire body (head to feet) is visible in the frame.`
      );
    }
  }

  // 2. Performance Analysis Intent
  if (
    q.includes('analyze') ||
    q.includes('performance') ||
    q.includes('history') ||
    q.includes('progress') ||
    q.includes('stats')
  ) {
    if (userSessions.length === 0) {
      return (
        `📊 **PERFORMANCE ANALYSIS**\n\n` +
        `You haven't recorded any practice sessions yet! Go to the **Practice** tab, choose a strike, and finish a rep to start tracking your accuracy.`
      );
    }
    const count = userSessions.length;
    const avgScore = Math.round(userSessions.reduce((a, b) => a + b.score, 0) / count);
    const bestScore = Math.max(...userSessions.map((s) => s.score));

    let totalElbow = 0, totalGuard = 0, totalStance = 0, totalWrist = 0;
    userSessions.forEach((s) => {
      totalElbow += s.breakdown?.elbow?.score || s.score;
      totalGuard += s.breakdown?.guard?.score || 80;
      totalStance += s.breakdown?.stance?.score || s.breakdown?.knee?.score || 80;
      totalWrist += s.breakdown?.wrist?.score || 85;
    });

    const avgElbow = Math.round(totalElbow / count);
    const avgGuard = Math.round(totalGuard / count);
    const avgStance = Math.round(totalStance / count);
    const avgWrist = Math.round(totalWrist / count);

    let weakestPillar = 'Striking Arm Path';
    let minPillarVal = avgElbow;
    if (avgGuard < minPillarVal) { weakestPillar = 'Kalasag Check Hand Guard'; minPillarVal = avgGuard; }
    if (avgStance < minPillarVal) { weakestPillar = 'Tindig Stance Stability'; minPillarVal = avgStance; }
    if (avgWrist < minPillarVal) { weakestPillar = 'Pitik Wrist Snap'; minPillarVal = avgWrist; }

    return (
      `📊 **YOUR PERFORMANCE SUMMARY**\n\n` +
      `• **Total Practice Sessions:** ${count}\n` +
      `• **Overall Average Score:** ${avgScore}%\n` +
      `• **Personal Best Score:** ${bestScore}%\n\n` +
      `**4-Pillar Alignment Breakdown:**\n` +
      `• ⚔️ Strike Trajectory: ${avgElbow}%\n` +
      `• 🛡️ Kalasag Guard Hand: ${avgGuard}%\n` +
      `• 🦵 Tindig Stance Base: ${avgStance}%\n` +
      `• ⚡ Pitik Wrist Snap: ${avgWrist}%\n\n` +
      `💡 **Recommended Focus:** Work on your **${weakestPillar}** (${minPillarVal}% avg) in your next session!`
    );
  }

  // 3. Lowest / Weakest Strike Intent
  if (
    q.includes('weakest') ||
    q.includes('lowest') ||
    q.includes('struggling') ||
    q.includes('worst') ||
    q.includes('what should i practice today') ||
    q.includes('show me what to focus on')
  ) {
    if (userSessions.length === 0) {
      return (
        `🎯 **START WITH STRIKE 1**\n\n` +
        `Since you haven't recorded any sessions yet, start with **Strike 1 (Left Temple)**. It teaches the foundational 45° diagonal downward slicing path and Kalasag guard!`
      );
    }

    const strikeScores: Record<string, number[]> = {};
    userSessions.forEach((item) => {
      if (!strikeScores[item.strikeName]) strikeScores[item.strikeName] = [];
      strikeScores[item.strikeName].push(item.score);
    });

    let lowestStrike = '';
    let lowestAvg = 100;
    Object.keys(strikeScores).forEach((name) => {
      const avg = Math.round(strikeScores[name].reduce((a, b) => a + b, 0) / strikeScores[name].length);
      if (avg < lowestAvg) {
        lowestAvg = avg;
        lowestStrike = name;
      }
    });

    return (
      `🎯 **FOCUS AREA: ${lowestStrike.toUpperCase() || 'STRIKE 3'}** (Avg ${lowestAvg}%)\n\n` +
      `Here is how to master this technique:\n\n` +
      `1. **Chamber (Kasa):** Load the stick deliberately before swinging. Don't rush into the slice.\n` +
      `2. **Check Hand Shield:** Keep your non-striking hand locked at your solar plexus.\n` +
      `3. **Snap & Recover (Bawi):** Cut through the target and immediately return to your ready guard.`
    );
  }

  // 4. How to hold the stick / grip
  if (q.includes('hold') || q.includes('grip') || q.includes('punyo') || q.includes('hawak')) {
    return (
      `🎋 **HOW TO HOLD THE ARNIS STICK (HAWAK & PUNYO)**\n\n` +
      `• **The 4-Finger Wrap:** Wrap your four fingers firmly around the baston, locking your thumb securely over your index finger.\n` +
      `• **Leave 1–2 Inches (The Punyo):** Leave 1 to 2 inches of stick butt extending beneath your pinky. This is the *Punyo*, used for close-range butt strikes, hooking, and disarming!\n` +
      `• **Grip Tension:** Hold with relaxed firmness (like holding a bird—neither crushing it nor letting it fly away). Relax until the moment of impact, then tighten and snap (*Pitik*)!`
    );
  }

  // 5. Difference between Strike 1 and Strike 2
  if (q.includes('difference') && (q.includes('1') || q.includes('2') || q.includes('temple'))) {
    return (
      `⚔️ **STRIKE 1 VS. STRIKE 2 (FOREHAND VS. BACKHAND)**\n\n` +
      `• **Strike 1 (Forehand Left Temple Cut):**\n` +
      `  - Starts at your right ear/shoulder chamber.\n` +
      `  - Slices diagonally downward across to the opponent's left temple.\n` +
      `  - Driven by chest and core rotation.\n\n` +
      `• **Strike 2 (Backhand Right Temple Cut):**\n` +
      `  - Starts crossed over at your left shoulder chamber.\n` +
      `  - Slices diagonally downward to the opponent's right temple.\n` +
      `  - Driven by triceps extension, hip opening, and backhand wrist snap.\n\n` +
      `🛡️ **Both Require:** Kalasag check hand firmly shielding your chest!`
    );
  }

  // 6. Explain like a beginner
  if (q.includes('beginner') || q.includes('simple') || q.includes('explain this simply') || q.includes('start')) {
    return (
      `🥋 **ARNIS IN 3 SIMPLE RULES FOR BEGINNERS**\n\n` +
      `1. **The Stick is Your Arm's Extension:** Don't swing like a baseball bat. Rotate your hips and lead with your elbow.\n` +
      `2. **Guard Your Core (Kalasag):** Your empty hand is your shield! Keep it pinned to your solar plexus. If it drops, you are open to counters.\n` +
      `3. **The 3-Beat Rhythm:** Kasa (chamber near ear) ➔ Tudla (slice smoothly through target) ➔ Bawi (recover right back to ready guard).`
    );
  }

  // 7. Individual Strike Queries (Reusing centralized STRIKE_RULES)
  for (let i = 1; i <= 12; i++) {
    const numStr = i.toString();
    const strikeKey = `strike_${numStr}`;
    if (
      q.includes(`strike ${numStr}`) ||
      q.includes(`strike${numStr}`) ||
      (q.includes(numStr) && (q.includes('strike') || q.includes('technique')))
    ) {
      const rule = getStrikeRule(strikeKey);
      if (rule) {
        return (
          `⚔️ **STRIKE ${rule.strikeNumber} — ${rule.target.split('/')[0].trim().toUpperCase()}**\n\n` +
          `• **Target Area:** ${rule.target}\n` +
          `• **Target Description:** ${rule.desc}\n` +
          `• **Calibrated Elbow Range:** ${rule.right_min}° - ${rule.right_max}°\n` +
          `• **Defensive Guard:** ${rule.guard_label}\n\n` +
          `🥋 **Coach's Tip:**\n${rule.coachTip}\n\n` +
          `⚠️ **Common Mistake:**\n${rule.commonMistake}`
        );
      }
    }
  }

  // 8. Target Area Keywords (Temple, Torso, Eye, Knee, Crown)
  if (q.includes('crown') || q.includes('overhead') || q.includes('tuktok')) {
    const rule = getStrikeRule('strike_12');
    return `⚔️ **STRIKE 12: CROWN STRIKE**\n\nTarget: ${rule.target}\n\n${rule.coachTip}\n\n⚠️ ${rule.commonMistake}`;
  }
  if (q.includes('temple')) {
    const r1 = getStrikeRule('strike_1');
    const r2 = getStrikeRule('strike_2');
    return (
      `⚔️ **TEMPLE STRIKES (STRIKES 1 & 2)**\n\n` +
      `• **Strike 1 (Left Temple):** ${r1.desc} (Elbow: ${r1.right_min}° - ${r1.right_max}°).\n` +
      `• **Strike 2 (Right Temple):** ${r2.desc} (Elbow: ${r2.right_min}° - ${r2.right_max}°).\n\n` +
      `Keep your Kalasag guard pinned to your chest on both strikes!`
    );
  }
  if (q.includes('torso') || q.includes('ribs')) {
    const r3 = getStrikeRule('strike_3');
    const r4 = getStrikeRule('strike_4');
    return (
      `⚔️ **TORSO & RIB STRIKES (STRIKES 3 & 4)**\n\n` +
      `• **Strike 3 (Left Torso):** ${r3.desc}.\n` +
      `• **Strike 4 (Right Torso):** ${r4.desc}.\n\n` +
      `Lower your center of gravity by bending both knees into a solid forward stance.`
    );
  }
  if (q.includes('knee') || q.includes('low strike')) {
    const r8 = getStrikeRule('strike_8');
    const r9 = getStrikeRule('strike_9');
    return (
      `⚔️ **LOW KNEE STRIKES (STRIKES 8 & 9)**\n\n` +
      `• **Strike 8 (Left Knee):** ${r8.desc}.\n` +
      `• **Strike 9 (Right Knee):** ${r9.desc}.\n\n` +
      `⚠️ **Important:** Do not bend at your waist! Drop down by bending your knees (Tindig) to keep your head protected.`
    );
  }
  if (q.includes('eye') || q.includes('thrust')) {
    const r5 = getStrikeRule('strike_5');
    const r10 = getStrikeRule('strike_10');
    return (
      `⚔️ **THRUSTING TECHNIQUES (STRIKES 5, 10, 11)**\n\n` +
      `• **Strike 5 (Solar Plexus):** ${r5?.desc || 'Direct core thrust'}.\n` +
      `• **Strikes 10 & 11 (Eyes):** ${r10?.desc || 'High facial nerve thrusts'}.\n\n` +
      `Deliver with linear acceleration and immediately pull back into Kalasag guard (*Bawi*).`
    );
  }

  // 9. Biomechanical Pillars: Kalasag & Tindig
  if (q.includes('kalasag') || q.includes('guard') || q.includes('check hand') || q.includes('shield')) {
    return (
      `🛡️ **THE KALASAG (CHECK HAND) PILLAR**\n\n` +
      `In authentic Filipino Martial Arts, your weapon hand strikes while your live hand (*Kalasag*) protects your life.\n\n` +
      `• **Target Position:** Center of chest / solar plexus.\n` +
      `• **Purpose:** Parries counter-attacks and checks the opponent's weapon arm.\n` +
      `• **In the Evaluator:** 25% of your score depends on keeping your check hand high. If it drops, points are deducted!`
    );
  }

  if (q.includes('stance') || q.includes('tindig') || q.includes('knee bend') || q.includes('legs')) {
    return (
      `🦵 **THE TINDIG (MARTIAL BASE & STANCE) PILLAR**\n\n` +
      `Striking power travels from the ground up through your kinetic chain.\n\n` +
      `• **Ideal Lead Knee Flexion:** Between **135° and 165°** (athletic forward fighting stance).\n` +
      `• **Center of Gravity:** Lowered and balanced between both feet.\n` +
      `• **Common Mistake:** Standing stiffly with locked knees reduces stability score!`
    );
  }

  // 10. Fallback with guidance
  if (activeStrikeId) {
    const rule = getStrikeRule(activeStrikeId);
    return (
      `🥋 **GUIDANCE FOR ${rule.name.toUpperCase()}**\n\n` +
      `• **Target:** ${rule.target}\n` +
      `• **Key Tip:** ${rule.coachTip}\n` +
      `• **Guard:** ${rule.guard_label}\n\n` +
      `What would you like to refine? Ask about grip, chamber, stance, or timing!`
    );
  }

  return (
    `🥋 **ARNIS COACH AT YOUR SERVICE**\n\n` +
    `I can guide your technique, explain any strike, or help you understand your evaluation scores.\n\n` +
    `• Ask about any strike (e.g., *"How do I practice Strike 3?"*)\n` +
    `• Ask about form (**Kalasag** guard, **Tindig** stance, **Pitik** wrist snap)\n` +
    `• Ask how to improve your score\n\n` +
    `What would you like to work on?`
  );
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
  return matches.filter((v, idx, arr) => arr.findIndex((t) => t.strikeKey === v.strikeKey) === idx).slice(0, 2);
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
          return <View key={lineIdx} style={{ height: 4 }} />;
        }

        const isHeader = /^[📊🎯⚔️🛡️⚡🥋🔬📐🇵🇭🎋🦵💡⚠️•\-]/.test(trimmed);
        const parts = line.split(/(\*\*.*?\*\*)/g);

        return (
          <Text
            key={lineIdx}
            style={[
              styles.bubbleText,
              isHeader && styles.headerLineText,
            ]}
          >
            {parts.map((part, partIdx) => {
              if (part.startsWith('**') && part.endsWith('**')) {
                const boldContent = part.slice(2, -2);
                return (
                  <Text key={partIdx} style={styles.boldSpan}>
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
  const params = useLocalSearchParams<{
    strikeId?: string;
    strikeName?: string;
    recentScore?: string;
    weakness?: string;
    lessonId?: string;
    query?: string;
    source?: string;
  }>();
  const scrollViewRef = useRef<ScrollView>(null);

  const [userSessions, setUserSessions] = useState<SessionItem[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([
    'Explain this simply',
    'How can I improve?',
    'What am I doing wrong?',
    'How should I practice?',
    "What's my weakest strike?",
  ]);

  // Keep refs to avoid recreating callbacks or triggering effect cascades
  const userSessionsRef = useRef<SessionItem[]>(userSessions);
  userSessionsRef.current = userSessions;

  const paramsRef = useRef(params);
  paramsRef.current = params;

  const initializedContextKeyRef = useRef<string>('');

  const formatTime = () => {
    const now = new Date();
    return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
  };

  const handleSendMessage = useCallback((text: string) => {
    if (!text.trim()) return;
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    const userMsg: Message = {
      id: 'msg_user_' + Date.now(),
      sender: 'user',
      text: text,
      time: formatTime(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    scrollViewRef.current?.scrollToEnd({ animated: true });

    setIsTyping(true);
    setTimeout(() => {
      const responseText = generateSemanticCoachResponse(
        text,
        userSessionsRef.current,
        paramsRef.current.weakness,
        paramsRef.current.strikeId
      );

      const coachMsg: Message = {
        id: 'msg_coach_' + Date.now(),
        sender: 'coach',
        text: responseText,
        time: formatTime(),
      };

      setIsTyping(false);
      setMessages((prev) => [...prev, coachMsg]);

      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }, 500);
  }, []);

  // Refresh practice history whenever screen is focused (safe empty dependency array)
  useFocusEffect(
    useCallback(() => {
      let isMounted = true;
      getHistory().then((history) => {
        if (!isMounted) return;
        const list = history || [];
        setUserSessions(list);
        userSessionsRef.current = list;
      });
      return () => {
        isMounted = false;
      };
    }, [])
  );

  // Initialize contextual coach greeting on mount or when context params change
  useEffect(() => {
    let isMounted = true;
    const contextKey = `${params.source || ''}_${params.lessonId || ''}_${params.strikeId || ''}_${params.recentScore || ''}_${params.weakness || ''}_${params.query || ''}`;

    if (initializedContextKeyRef.current === contextKey) {
      return;
    }
    initializedContextKeyRef.current = contextKey;

    getHistory().then((history) => {
      if (!isMounted) return;
      const list = history || [];
      setUserSessions(list);
      userSessionsRef.current = list;

      // CASE 1: Arrived from a Lesson
      if (params.lessonId) {
        const lesson = ALL_CURRICULUM_LESSONS.find((l) => l.id === params.lessonId);
        if (lesson) {
          const lessonMsg =
            `Mabuhay! I see you are learning **${lesson.title}** (${lesson.subtitle}).\n\n` +
            `🥋 **Lesson Focus:** ${lesson.beginnerSummary || lesson.description}\n\n` +
            `What questions do you have about this technique?`;

          setMessages([
            {
              id: 'msg_lesson_' + Date.now(),
              sender: 'coach',
              text: lessonMsg,
              time: formatTime(),
            },
          ]);

          setSuggestions([
            'Explain this simply',
            'Why is this important?',
            'What should I remember?',
            "I'm ready to practice",
          ]);

          if (params.query) {
            setTimeout(() => {
              handleSendMessage(params.query!);
            }, 400);
          }
          return;
        }
      }

      // CASE 2: Arrived from Practice Result (with recentScore and weakness)
      if (params.recentScore || (params.source === 'result' && params.strikeId)) {
        const rule = getStrikeRule(params.strikeId || 'strike_1');
        const strikeTitle = params.strikeName || rule.name;
        const score = params.recentScore || '75';
        const weaknessText = params.weakness || 'arm extension and recovery';

        const resultMsg =
          `I saw your **${strikeTitle}** attempt. You scored **${score}%**.\n\n` +
          `🎯 **Main Area to Improve:**\n"${weaknessText}"\n\n` +
          `Want to work on that together?`;

        setMessages([
          {
            id: 'msg_result_' + Date.now(),
            sender: 'coach',
            text: resultMsg,
            time: formatTime(),
          },
        ]);

        setSuggestions([
          'Why did I get this score?',
          'How do I fix this?',
          'What should I practice next?',
          'Try again',
        ]);

        if (params.query) {
          setTimeout(() => {
            handleSendMessage(params.query!);
          }, 400);
        }
        return;
      }

      // CASE 3: Arrived from Practice Selection / In-Practice
      if (params.strikeId) {
        const rule = getStrikeRule(params.strikeId);
        const strikeTitle = params.strikeName || rule.name;

        const practiceMsg =
          `Ready to practice **${strikeTitle}** (${rule.target})!\n\n` +
          `💡 **Key Form Focus:** ${rule.coachTip}\n\n` +
          `Ask me anything about chambering, guard hand, or strike path!`;

        setMessages([
          {
            id: 'msg_practice_' + Date.now(),
            sender: 'coach',
            text: practiceMsg,
            time: formatTime(),
          },
        ]);

        setSuggestions([
          'Help me with this strike',
          'What should I focus on?',
          'Why is my form wrong?',
          'How can I improve?',
        ]);

        if (params.query) {
          setTimeout(() => {
            handleSendMessage(params.query!);
          }, 400);
        }
        return;
      }

      // CASE 4: Default / General Overview
      let overviewMsg =
        'Mabuhay! I am your Arnis Coach. Ask me any question about the 12 strikes, Kalasag guard, stance, or how to improve your score!';

      if (list.length > 0) {
        const count = list.length;
        const avgScore = Math.round(list.reduce((a, b) => a + b.score, 0) / count);
        overviewMsg =
          `Mabuhay! I reviewed your ${count} practice sessions (Overall Average: ${avgScore}%).\n\n` +
          `Tap a question below or ask me how to refine your Kalasag guard, stance, or strike trajectory!`;
      }

      setMessages([
        {
          id: 'msg_welcome',
          sender: 'coach',
          text: overviewMsg,
          time: formatTime(),
        },
      ]);

      setSuggestions([
        'Explain this simply',
        'How can I improve?',
        'What am I doing wrong?',
        'How should I practice?',
        "What's my weakest strike?",
        'Show me what to focus on',
      ]);
    });

    return () => {
      isMounted = false;
    };
  }, [
    params.lessonId,
    params.strikeId,
    params.strikeName,
    params.recentScore,
    params.weakness,
    params.source,
    params.query,
    handleSendMessage,
  ]);

  const handleResetChat = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    setMessages([
      {
        id: 'msg_reset_' + Date.now(),
        sender: 'coach',
        text: 'Mabuhay! How can I help you with your Arnis training today?',
        time: formatTime(),
      },
    ]);
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
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="chevron-back" size={24} color={MartialTheme.colors.text} />
          </TouchableOpacity>

          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>🥋 Arnis Coach</Text>
            <Text style={styles.headerSubtitle}>Your training companion</Text>
          </View>

          <TouchableOpacity
            style={styles.refreshBtn}
            onPress={handleResetChat}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="refresh" size={18} color={MartialTheme.colors.textMuted} />
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
                item.sender === 'user' ? styles.userRow : styles.coachRow,
              ]}
            >
              {item.sender === 'coach' && (
                <View style={styles.avatarContainer}>
                  <CoachCharacter pose="thinking" size={36} />
                </View>
              )}

              {item.sender === 'user' ? (
                <View style={[styles.bubble, styles.userBubble]}>
                  <Text style={styles.userBubbleText}>{item.text}</Text>
                  <Text style={styles.userBubbleTime}>{item.time}</Text>
                </View>
              ) : (
                <View style={styles.coachBubbleWrapper}>
                  <View style={[styles.bubble, styles.coachBubble]}>
                    <FormattedMessageText text={item.text} isUser={false} />
                    <Text style={styles.bubbleTime}>{item.time}</Text>
                  </View>

                  {/* Direct Practice Action Chips */}
                  {(() => {
                    const referenced = extractReferencedStrikes(item.text);
                    if (referenced.length === 0) return null;
                    return (
                      <View style={styles.actionChipsRow}>
                        {referenced.map((s) => (
                          <TouchableOpacity
                            key={s.strikeKey}
                            style={styles.actionChipBtn}
                            activeOpacity={0.75}
                            onPress={() => {
                              if (Platform.OS !== 'web') {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                              }
                              router.push({
                                pathname: '/evaluate',
                                params: { strikeId: s.strikeKey, mode: 'guided' },
                              });
                            }}
                          >
                            <MaterialCommunityIcons name="sword" size={14} color={MartialTheme.colors.primaryDark} style={{ marginRight: 6 }} />
                            <Text style={styles.actionChipText}>Practice {s.strikeName} Now</Text>
                            <Ionicons name="arrow-forward" size={13} color={MartialTheme.colors.primaryDark} style={{ marginLeft: 4 }} />
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
                <CoachCharacter pose="thinking" size={36} />
              </View>
              <View style={[styles.bubble, styles.coachBubble, styles.typingBubble]}>
                <Text style={styles.typingText}>Coach is thinking...</Text>
              </View>
            </View>
          )}
        </ScrollView>

        {/* Contextual Suggestions Carousel */}
        <View style={styles.suggestionsContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.suggestionsScroll}
          >
            {suggestions.map((item, idx) => (
              <TouchableOpacity
                key={idx}
                style={styles.suggestionChip}
                onPress={() => handleSendMessage(item)}
                activeOpacity={0.75}
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
            placeholder="Ask your coach anything..."
            placeholderTextColor={MartialTheme.colors.textMuted}
            value={inputText}
            onChangeText={setInputText}
            onSubmitEditing={() => handleSendMessage(inputText)}
          />
          <TouchableOpacity
            style={styles.sendButton}
            onPress={() => handleSendMessage(inputText)}
            activeOpacity={0.8}
          >
            <Ionicons name="send" size={16} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: MartialTheme.colors.background,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: MartialTheme.colors.border,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: {
    marginRight: 10,
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: MartialTheme.colors.text,
  },
  headerSubtitle: {
    fontSize: 11.5,
    color: MartialTheme.colors.primaryDark,
    fontWeight: '700',
    marginTop: 1,
  },
  refreshBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: MartialTheme.colors.background,
    borderWidth: 1,
    borderColor: MartialTheme.colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  keyboardContainer: {
    flex: 1,
  },
  chatContent: {
    padding: 16,
    paddingBottom: 16,
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
    width: 36,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    marginTop: 2,
  },
  bubble: {
    borderRadius: 18,
    paddingHorizontal: 15,
    paddingVertical: 12,
  },
  userBubble: {
    backgroundColor: MartialTheme.colors.primary,
    borderBottomRightRadius: 4,
    maxWidth: '85%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  userBubbleText: {
    color: '#FFFFFF',
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
  },
  userBubbleTime: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 9.5,
    alignSelf: 'flex-end',
    marginTop: 4,
  },
  coachBubble: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: MartialTheme.colors.border,
    borderBottomWidth: 3,
    borderBottomColor: MartialTheme.colors.border3D,
    borderTopLeftRadius: 4,
  },
  formattedTextContainer: {
    gap: 3,
  },
  bubbleText: {
    color: MartialTheme.colors.text,
    fontSize: 13.5,
    lineHeight: 20,
  },
  headerLineText: {
    color: MartialTheme.colors.text,
    fontWeight: '800',
    fontSize: 13.5,
  },
  boldSpan: {
    fontWeight: '900',
    color: MartialTheme.colors.primaryDark,
  },
  bubbleTime: {
    color: MartialTheme.colors.textMuted,
    fontSize: 9.5,
    alignSelf: 'flex-end',
    marginTop: 6,
  },
  typingBubble: {
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  typingText: {
    color: MartialTheme.colors.textMuted,
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
    backgroundColor: MartialTheme.colors.primaryMuted,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
  },
  actionChipText: {
    color: MartialTheme.colors.primaryDark,
    fontSize: 12,
    fontWeight: '800',
  },
  suggestionsContainer: {
    borderTopWidth: 1,
    borderTopColor: MartialTheme.colors.border,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
  },
  suggestionsScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  suggestionChip: {
    backgroundColor: MartialTheme.colors.background,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: MartialTheme.colors.border,
    paddingHorizontal: 13,
    paddingVertical: 7,
    justifyContent: 'center',
  },
  suggestionChipText: {
    color: MartialTheme.colors.text,
    fontSize: 12,
    fontWeight: '700',
  },
  inputBar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: MartialTheme.colors.border,
    gap: 10,
    alignItems: 'center',
  },
  textInput: {
    flex: 1,
    backgroundColor: MartialTheme.colors.background,
    borderWidth: 1,
    borderColor: MartialTheme.colors.border,
    borderRadius: 20,
    paddingHorizontal: 16,
    height: 42,
    color: MartialTheme.colors.text,
    fontSize: 13.5,
  },
  sendButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: MartialTheme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
