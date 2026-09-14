# ⚔️ PoseFix-Arnis: AI-Powered Philippine Martial Arts Trainer

**PoseFix-Arnis** is a mobile learning and form evaluation application built with **React Native** and **Expo (v54)** designed to teach, analyze, and refine the traditional **12 Strikes of Arnis** (Filipino Martial Arts / Eskrima / Kali).

Combining a **Duolingo-inspired learning philosophy** with on-device computer vision, PoseFix-Arnis guides learners from their very first grip and stance (*Tindig*) to fluid multi-strike combinations (*Anyo*), offering instant biomechanical feedback, synchronized expert video comparisons, and an intelligent virtual coach.

---

## 🌟 Core Product Features

### 1. 🗺️ Duolingo-Inspired Learning Path (*Journey*)
* **Curriculum Progression:** Progressive, bite-sized skill nodes organized into clear thematic chapters:
  * **Level 0: Fundamentals** — Proper Stance (*Tindig*), Check Hand Shield (*Kalasag*), and Grip Basics.
  * **Level 1: Diagonal Temple Cuts** — Strikes 1 & 2 (Left & Right Temple/Neck).
  * **Level 2: Torso & Rib Slices** — Strikes 3 & 4 (Left & Right Flank/Shoulder).
  * **Level 3: Core Thrusts & Crown** — Strikes 5 (Solar Plexus) & 12 (Downward Crown).
  * **Level 4: Anyo Forms & Combos** — Fluid multi-strike sequences with continuous tracking.
* **Tactile Philippine Martial Design System:** Warm bamboo tones, forest green accents, tactile 3D interactive buttons, and encouraging coach feedback animations.
* **Gamification & Mastery:** Earn XP, maintain training streaks, unlock achievements, and advance through traditional Sash Ranks:
  $$\text{White (Novice)} \rightarrow \text{Yellow (Apprentice)} \rightarrow \text{Green (Intermediate)} \rightarrow \text{Blue (Advanced)} \rightarrow \text{Red (Master)} \rightarrow \text{Black (Lakan / Lakambini)}$$

### 2. 🎥 Real-Time On-Device AI Pose & Stick Tracking
* **MediaPipe Pose Landmarker:** Real-time 33-point skeletal landmark detection running within a high-performance, hardware-accelerated `react-native-webview` sandbox.
* **Pixel-Level HSV Stick Tracker:** Advanced color filtering and contour segmentation that tracks training sticks (Rattan, Red, Blue, Green) to verify velocity, impact extension, and weapon trajectory.
* **Spoken Voice Coaching:** Hands-free training via `expo-speech` that provides verbal cues in real-time (*"Extend your elbow"*, *"Raise your check hand"*, *"Good strike!"*).

### 3. 📐 4-Pillar Biomechanical Posture Engine
Evaluates every strike rep across four distinct anatomical dimensions:
1. **Base Stability (*Tindig* Stance):** Verifies lower-body balance and knee flexion within the athletic stability zone ($135^\circ - 165^\circ$).
2. **Strike Trajectory & Slicing Arc:** Tracks dominant striking arm extension and ensures adherence to canonical cutting planes.
3. **Check Hand Shield (*Kalasag*):** Enforces that the non-weapon hand remains defensively posted near the chest/solar plexus.
4. **Impact Wrist Snap (*Pitik*):** Measures wrist-to-forearm snap alignment at the critical contact apex moment.

### 4. 🤺 Coach vs You: Synchronized Video & Snapshot Comparison
* **AlphaPose Ground-Truth Baseline:** Every strike is benchmarked against reference performance data from expert martial artists.
* **Side-by-Side Impact Snapshots:** Automatically isolates the exact millisecond of strike apex and places user posture side-by-side with the expert form.
* **Synchronized Dual-Video Player:** Dual coach/user playback with:
  * **Unified Scrubber & Dual Controls:** Play, pause, restart, and scrub through both videos simultaneously.
  * **🎯 Jump to Impact:** Instant jump button that locks both video players directly to their respective contact apex frames.
  * **Speed Controls:** Slow-motion analysis at $0.25\times$, $0.5\times$, and $1.0\times$ playback speeds.

### 5. 💬 Contextual Virtual Coach Assistant
* **Always-Accessible Mentorship:** Contextual coach drawer accessible across Journey, Practice, and Progress tabs.
* **Instant Diagnostic Review (*"Why did I get this score?"*):** Automatically generates plain-English feedback on what the learner did well and provides **one specific correction** to focus on next.
* **Biomechanical Explanations:** Ask the Coach about specific strike angles, history, safety guidelines, and warm-up routines.

### 6. 📊 Radar Analytics & Historical Progress
* **12-Axis Radar Mastery Chart:** Dynamic polygon visualizer displaying mastery across all 12 strikes with toggleable Best vs Average modes.
* **Historical Timeline:** Session logs storing grade, score, 4-pillar breakdowns, recorded video replays, and impact snapshots.

---

## 📐 The 12 Strikes Biomechanical Matrix

The evaluation engine checks skeletal joint configurations against statistical boundaries derived from expert dataset recordings:

| # | Strike Name | Target Area | Canonical Right Elbow Range | Kalasag Shield Guard |
| :--- | :--- | :--- | :--- | :--- |
| **1** | Strike 1: Left Temple | Left Temple / Side of Neck | $92.3^\circ - 150.8^\circ$ | Pinned to chest |
| **2** | Strike 2: Right Temple | Right Temple / Side of Neck | $76.0^\circ - 148.5^\circ$ | Pinned to chest |
| **3** | Strike 3: Left Torso | Left Ribs / Flank / Shoulder | $72.6^\circ - 113.7^\circ$ | Guarding solar plexus |
| **4** | Strike 4: Right Torso | Right Ribs / Flank / Shoulder | $27.9^\circ - 139.2^\circ$ | Guarding solar plexus |
| **5** | Strike 5: Abdomen Thrust | Solar Plexus / Abdomen | $155.7^\circ - 169.2^\circ$ | Chest guard position |
| **6** | Strike 6: Left Chest | Left Upper Chest / Shoulder | $93.2^\circ - 155.2^\circ$ | Pinned to chest |
| **7** | Strike 7: Right Chest | Right Upper Chest / Shoulder | $96.3^\circ - 168.4^\circ$ | Pinned to chest |
| **8** | Strike 8: Left Knee | Left Knee Joint / Lower Leg | $128.4^\circ - 174.1^\circ$ | High shield defense |
| **9** | Strike 9: Right Knee | Right Knee Joint / Lower Leg | $109.2^\circ - 171.9^\circ$ | High shield defense |
| **10** | Strike 10: Left Eye | Left Eye / Face Thrust | $112.7^\circ - 153.0^\circ$ | Tight chest guard |
| **11** | Strike 11: Right Eye | Right Eye / Face Thrust | $101.6^\circ - 168.3^\circ$ | Tight chest guard |
| **12** | Strike 12: Crown | Skull Crown (Direct Overhead) | $90.0^\circ - 130.2^\circ$ | Centerline defense |

---

## 🏗️ Architecture & Project Structure

PoseFix-Arnis follows a modular architecture separating route definitions, session state management, AI inference, and reusable design components:

```text
arnis-trainer/
├── app/                              # Navigation layer (Expo Router)
│   ├── (tabs)/
│   │   ├── _layout.tsx               # 4-tab bottom navigation with custom icons
│   │   ├── index.tsx                 # Home / Dashboard screen
│   │   ├── journey.tsx               # Duolingo-style learning path & chapters
│   │   ├── evaluate.tsx              # Practice route container (thin wrapper)
│   │   ├── history.tsx               # Progress, 12-axis radar & timeline
│   │   └── chat.tsx                  # Dedicated AI Coach chat view
│   └── _layout.tsx                   # Global app shell & provider setup
│
├── components/                       # UI Component Library
│   ├── comparison/
│   │   ├── CoachVsYou.tsx            # Side-by-side snapshot & biomechanical audit
│   │   └── ComparisonPlayer.tsx      # Dual synchronized video comparison player
│   ├── journey/
│   │   ├── JourneyNode.tsx           # Interactive 3D skill node on learning path
│   │   └── AnyoRoutineCard.tsx       # Multi-strike combo routine card
│   ├── practice/
│   │   ├── PracticeHomeScreen.tsx    # Strike picker, calibration & camera prep
│   │   ├── PracticeLive.tsx          # Real-time evaluation viewport & HUD
│   │   └── PracticeResult.tsx        # Post-practice score, rewards & coaching
│   ├── ui/
│   │   ├── CoachCharacter.tsx        # Responsive SVG martial arts avatar
│   │   ├── TactileButton.tsx         # Duolingo-style 3D pressed button
│   │   └── ProgressBar.tsx           # Rounded XP & mastery progress bar
│   ├── StrikeRadarChart.tsx          # 12-axis SVG interactive polygon radar
│   ├── WhyFailedModal.tsx            # Form diagnostic modal ("One Thing to Fix")
│   └── AppTutorialModal.tsx          # Guided step-by-step app onboarding
│
├── constants/                        # Configuration & Data Stores
│   ├── curriculum.ts                 # Learning path chapters, units & lesson nodes
│   ├── gamificationStore.ts          # XP, streak tracking & sash ranking engine
│   ├── historyStore.ts               # Local persistence for practice sessions
│   ├── referenceStore.ts             # Expert video references & impact apex metadata
│   ├── strikeRules.ts                # 12 strikes anatomical rules & angle bounds
│   ├── poseEngineHtml.ts             # Web-based MediaPipe + Canvas pose detection
│   └── theme.ts                      # MartialTheme color palette, typography & tokens
│
├── hooks/
│   └── usePracticeSession.ts         # Centralized state machine for practice sessions
│
├── engine/
│   └── evaluation/
│       ├── postureScorer.ts          # 4-pillar biomechanical scoring calculations
│       └── evaluationTypes.ts        # TypeScript definitions for pose evaluation
│
├── assets/                           # Media, coach videos & reference snapshots
├── app.json                          # Expo configuration
├── package.json                      # Dependencies & npm scripts
└── tsconfig.json                     # Strict TypeScript configuration
```

---

## 🛠️ Technology Stack

* **Core Framework:** [React Native](https://reactnative.dev/) (0.81.5) with [Expo](https://expo.dev/) (SDK 54)
* **File-Based Routing:** [Expo Router](https://docs.expo.dev/router/introduction/)
* **AI Computer Vision Engine:** [MediaPipe Pose Landmarker](https://developers.google.com/mediapipe/solutions/vision/pose_landmarker) inside `react-native-webview`
* **Video & Camera Playback:** `expo-camera`, `expo-video`, and HTML5 Canvas video pipeline
* **Audio & Speech:** [Expo Speech](https://docs.expo.dev/versions/latest/sdk/speech/) Text-to-Speech
* **Haptics:** `expo-haptics` tactile feedback
* **Vector Graphics:** Custom SVG geometric renderings with `react-native-svg`
* **Persistence:** `@react-native-async-storage/async-storage`

---

## 🚀 Getting Started

### Prerequisites
* **Node.js** (v18.x or higher)
* **npm** or **yarn**
* **Expo Go** application on your mobile device (iOS/Android) or configured local emulators (Android Studio / Xcode)

### Installation

1. Clone the repository and navigate into the app directory:
   ```bash
   git clone https://github.com/Ekskie/arnis-trainer.git
   cd arnis-trainer
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the Expo development server:
   ```bash
   npx expo start --clear
   ```

4. Launch the application:
   * **Physical Device:** Open the **Expo Go** app and scan the QR code printed in the terminal.
   * **Android Emulator:** Press `a` in the terminal.
   * **iOS Simulator:** Press `i` in the terminal.

---

## 🛡️ License

This project is proprietary and developed for martial arts education and biomechanical research. All rights reserved.
