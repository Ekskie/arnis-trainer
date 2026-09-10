import React from 'react';
import { View, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import Svg, {
  Path,
  Circle,
  Rect,
  G,
  Line,
} from 'react-native-svg';

export type CoachPose = 'waving' | 'stance' | 'celebrating' | 'thinking';

interface CoachCharacterProps {
  pose?: CoachPose;
  size?: number;
  style?: StyleProp<ViewStyle>;
}

// Flat, high-contrast, dependable color palette (No finicky SVG gradients that fail on web)
const COACH_COLORS = {
  skin: '#E2A76F',
  skinShadow: '#C9864E',
  gi: '#1E2923',
  giHighlight: '#2A3C32',
  lapel: '#34463C',
  sash: '#E63946',
  sashKnot: '#C1121F',
  rattan: '#E6AF2E',
  rattanShadow: '#A06914',
  rattanBurn: '#784608',
  hair: '#1A1F1C',
  sunEmblem: '#F59E0B',
  shadow: 'rgba(0,0,0,0.08)',
  cheeks: 'rgba(230, 57, 70, 0.22)',
  shoes: '#2B3630',
  pants: '#131A16',
};

export function CoachCharacter({
  pose = 'waving',
  size = 120,
  style,
}: CoachCharacterProps) {
  const width = size;
  const height = size * 1.15; // Aspect ratio

  return (
    <View style={[styles.container, { width, height }, style]}>
      <Svg viewBox="0 0 100 115" width={width} height={height}>
        {/* --- SHADOW AT FEET --- */}
        <Circle cx="50" cy="110" r="28" fill={COACH_COLORS.shadow} />

        {/* --- CELEBRATION STARS (if celebrating) --- */}
        {pose === 'celebrating' && (
          <G>
            {/* Left Star */}
            <Path
              d="M18 18 L21 26 L29 27 L23 33 L25 41 L18 36 L11 41 L13 33 L7 27 L15 26 Z"
              fill="#F59E0B"
            />
            {/* Right Star */}
            <Path
              d="M82 14 L84 20 L90 21 L85 26 L87 32 L82 28 L77 32 L79 26 L74 21 L80 20 Z"
              fill="#FBBF24"
            />
            {/* Top Sparkle */}
            <Circle cx="50" cy="8" r="3" fill="#F59E0B" />
          </G>
        )}

        {/* --- LEGS / PANTS --- */}
        <G>
          {/* Left Leg */}
          <Rect x="36" y="82" width="10" height="24" rx="4" fill={COACH_COLORS.pants} />
          {/* Right Leg */}
          <Rect x="54" y="82" width="10" height="24" rx="4" fill={COACH_COLORS.pants} />
          {/* Shoes */}
          <Rect x="34" y="102" width="14" height="6" rx="3" fill={COACH_COLORS.shoes} />
          <Rect x="52" y="102" width="14" height="6" rx="3" fill={COACH_COLORS.shoes} />
        </G>

        {/* --- TORSO / MARTIAL GI --- */}
        <G>
          {/* Body Gi */}
          <Path
            d="M32 52 C32 48 38 46 50 46 C62 46 68 48 68 52 L66 84 C66 86 64 88 61 88 L39 88 C36 88 34 86 34 84 Z"
            fill={COACH_COLORS.gi}
          />
          {/* V-Neck Lapel */}
          <Path
            d="M42 46 L50 62 L58 46"
            stroke={COACH_COLORS.lapel}
            strokeWidth="2.8"
            strokeLinecap="round"
            fill="none"
          />
          {/* Chest Crest Sun Emblem */}
          <Circle cx="50" cy="56" r="3.2" fill={COACH_COLORS.sunEmblem} />

          {/* Red Sash / Belt */}
          <Rect x="33" y="74" width="34" height="6" rx="2" fill={COACH_COLORS.sash} />
          {/* Sash knot & tail */}
          <Path
            d="M50 78 L47 88 C47 89 45 90 44 88 L46 76"
            fill={COACH_COLORS.sashKnot}
          />
        </G>

        {/* --- HEAD & FACE --- */}
        <G>
          {/* Ears */}
          <Circle cx="34" cy="29" r="4.5" fill={COACH_COLORS.skin} />
          <Circle cx="66" cy="29" r="4.5" fill={COACH_COLORS.skin} />

          {/* Head Base */}
          <Rect x="35" y="14" width="30" height="30" rx="15" fill={COACH_COLORS.skin} />

          {/* Hair (Clean martial crop) */}
          <Path
            d="M35 24 C35 15 41 12 50 12 C59 12 65 15 65 24 C62 20 57 19 50 19 C43 19 38 20 35 24 Z"
            fill={COACH_COLORS.hair}
          />
          {/* Hair Tuft */}
          <Path d="M47 12 C49 8 52 8 53 12 Z" fill={COACH_COLORS.hair} />

          {/* Eyes */}
          {pose === 'celebrating' ? (
            // Joyful curved eyes ^^
            <G>
              <Path d="M42 27 Q45 24 48 27" stroke="#1C2721" strokeWidth="2.4" strokeLinecap="round" fill="none" />
              <Path d="M52 27 Q55 24 58 27" stroke="#1C2721" strokeWidth="2.4" strokeLinecap="round" fill="none" />
            </G>
          ) : (
            // Friendly open eyes with shine
            <G>
              <Circle cx="44" cy="27" r="2.8" fill="#1C2721" />
              <Circle cx="45" cy="26" r="0.9" fill="#FFFFFF" />
              <Circle cx="56" cy="27" r="2.8" fill="#1C2721" />
              <Circle cx="57" cy="26" r="0.9" fill="#FFFFFF" />
            </G>
          )}

          {/* Eyebrows */}
          <Path d="M41 22 Q44 21 47 22" stroke="#1C2721" strokeWidth="1.8" strokeLinecap="round" fill="none" />
          <Path d="M53 22 Q56 21 59 22" stroke="#1C2721" strokeWidth="1.8" strokeLinecap="round" fill="none" />

          {/* Cheerful Smile */}
          <Path
            d="M45 33 Q50 38 55 33"
            stroke="#9C4427"
            strokeWidth="2.4"
            strokeLinecap="round"
            fill="none"
          />

          {/* Rosy Cheeks */}
          <Circle cx="39" cy="32" r="3" fill={COACH_COLORS.cheeks} />
          <Circle cx="61" cy="32" r="3" fill={COACH_COLORS.cheeks} />
        </G>

        {/* --- ARMS & RATTAN STICK (Based on Pose) --- */}
        {pose === 'waving' && (
          <G>
            {/* Left Arm: Waving High */}
            <Path
              d="M34 52 Q22 42 22 28 C22 25 26 24 28 27 Q33 38 38 52 Z"
              fill={COACH_COLORS.gi}
            />
            {/* Waving Hand */}
            <Circle cx="22" cy="26" r="4.5" fill={COACH_COLORS.skin} />

            {/* Right Arm: Resting with Rattan Stick */}
            <Path
              d="M66 52 Q74 62 72 74 C70 76 66 76 66 72 Q64 62 62 52 Z"
              fill={COACH_COLORS.gi}
            />
            {/* Right Hand holding stick */}
            <Circle cx="72" cy="74" r="4.5" fill={COACH_COLORS.skin} />

            {/* Rattan Stick */}
            <Rect
              x="70"
              y="34"
              width="5"
              height="58"
              rx="2.5"
              fill={COACH_COLORS.rattan}
              transform="rotate(6, 72, 60)"
            />
            {/* Stick Burn Nodes */}
            <Line x1="71" y1="46" x2="76" y2="46" stroke={COACH_COLORS.rattanBurn} strokeWidth="1.6" />
            <Line x1="71" y1="62" x2="76" y2="62" stroke={COACH_COLORS.rattanBurn} strokeWidth="1.6" />
            <Line x1="71" y1="78" x2="76" y2="78" stroke={COACH_COLORS.rattanBurn} strokeWidth="1.6" />
          </G>
        )}

        {pose === 'celebrating' && (
          <G>
            {/* Both Arms Raised High in Victory */}
            <Path
              d="M34 52 Q22 36 20 22 C20 19 24 18 26 21 Q30 36 38 52 Z"
              fill={COACH_COLORS.gi}
            />
            <Circle cx="21" cy="19" r="4.5" fill={COACH_COLORS.skin} />

            <Path
              d="M66 52 Q78 36 80 22 C80 19 76 18 74 21 Q70 36 62 52 Z"
              fill={COACH_COLORS.gi}
            />
            <Circle cx="79" cy="19" r="4.5" fill={COACH_COLORS.skin} />

            {/* Stick Held Horizontally Overhead in Joy */}
            <Rect
              x="12"
              y="12"
              width="76"
              height="5"
              rx="2.5"
              fill={COACH_COLORS.rattan}
            />
            {/* Stick Burn Nodes */}
            <Line x1="30" y1="12" x2="30" y2="17" stroke={COACH_COLORS.rattanBurn} strokeWidth="1.6" />
            <Line x1="50" y1="12" x2="50" y2="17" stroke={COACH_COLORS.rattanBurn} strokeWidth="1.6" />
            <Line x1="70" y1="12" x2="70" y2="17" stroke={COACH_COLORS.rattanBurn} strokeWidth="1.6" />
          </G>
        )}

        {pose === 'stance' && (
          <G>
            {/* Left Check Hand (Kalasag) at Chest */}
            <Path
              d="M34 52 Q42 58 46 62 C48 64 48 68 44 68 Q36 62 32 52 Z"
              fill={COACH_COLORS.gi}
            />
            {/* Shield Fist */}
            <Circle cx="47" cy="63" r="4.5" fill={COACH_COLORS.skin} />

            {/* Right Striking Arm: Chambered at Shoulder */}
            <Path
              d="M66 52 Q76 48 76 38 C76 35 72 34 70 37 Q66 46 62 52 Z"
              fill={COACH_COLORS.gi}
            />
            <Circle cx="74" cy="36" r="4.5" fill={COACH_COLORS.skin} />

            {/* Rattan Stick pointing forward-up at 45 degrees */}
            <Rect
              x="66"
              y="16"
              width="5"
              height="52"
              rx="2.5"
              fill={COACH_COLORS.rattan}
              transform="rotate(28, 74, 36)"
            />
            <Line x1="70" y1="26" x2="75" y2="26" stroke={COACH_COLORS.rattanBurn} strokeWidth="1.6" />
            <Line x1="70" y1="42" x2="75" y2="42" stroke={COACH_COLORS.rattanBurn} strokeWidth="1.6" />
          </G>
        )}

        {pose === 'thinking' && (
          <G>
            {/* Left Hand on Hip */}
            <Path
              d="M34 52 Q26 62 28 72 C28 75 32 75 34 72 Q36 62 38 52 Z"
              fill={COACH_COLORS.gi}
            />
            <Circle cx="30" cy="72" r="4.5" fill={COACH_COLORS.skin} />

            {/* Right Hand Touching Chin Thoughtfully */}
            <Path
              d="M66 52 Q68 44 58 38 C56 36 54 39 56 42 Q62 48 62 52 Z"
              fill={COACH_COLORS.gi}
            />
            <Circle cx="56" cy="38" r="4.5" fill={COACH_COLORS.skin} />

            {/* Stick Tucked Under Left Arm */}
            <Rect
              x="22"
              y="45"
              width="5"
              height="50"
              rx="2.5"
              fill={COACH_COLORS.rattan}
              transform="rotate(-20, 26, 60)"
            />
          </G>
        )}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
