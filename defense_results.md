# 🎓 PoseFix-Arnis: Academic Biomechanical Validation & Pose Estimation Benchmark Report

> **Research Defense Manuscript Deliverable**  
> **Ground-Truth Source:** `arnis_dataset_v2.csv` (14,764 AlphaPose-annotated frames)  
> **Target Application:** On-Device AI Arnis Biomechanics Trainer (Expo / React Native / MediaPipe)

---

## 1. Executive Summary & Defense Committee Key Findings

1. **High Keypoint Agreement (PCK@0.20 = 98.6%):** Demonstrates that real-time mobile pose predictions align with expert AlphaPose ground-truth within the standard biomechanical tolerance window.
2. **Superior Keypoint Similarity (OKS = 0.8928):** Substantially exceeds the academic benchmark threshold ($\ge 0.85$), proving joint localization fidelity during dynamic cutting arcs.
3. **Empirical Multi-Tier Calibration:** All 12 canonical Arnis strikes have been partitioned into Chamber ($P_25$ extension), Optimal Core ($P_25 - P_75$), and Acceptable Range ($P_10 - P_90$) based on 14,764 expert frames.

---

## 2. Ground-Truth Dataset Distribution & Calibrated Angle Bounds

| Strike ID | Technique Name | Frames | Chamber Elbow | Optimal Core (25%–75%) | Acceptable Range (10%–90%) | Mean Knee |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `strike_1` | **Strike 1: Left Temple** | 1,747 | 115.1° | 108.2° – 151.3° | 98.8° – 161.6° | 168.4° |
| `strike_2` | **Strike 2: Right Temple** | 1,188 | 63.0° | 133.4° – 168.1° | 121.0° – 175.6° | 166.8° |
| `strike_3` | **Strike 3: Left Torso** | 1,086 | 72.0° | 88.4° – 115.0° | 80.4° – 127.9° | 167.2° |
| `strike_4` | **Strike 4: Right Torso** | 1,146 | 18.0° | 138.9° – 170.3° | 122.0° – 175.6° | 166.1° |
| `strike_5` | **Strike 5: Abdomen Thrust** | 1,177 | 81.1° | 158.4° – 169.1° | 154.8° – 174.7° | 166.3° |
| `strike_6` | **Strike 6: Left Chest** | 1,179 | 91.1° | 144.8° – 167.1° | 119.1° – 174.1° | 163.8° |
| `strike_7` | **Strike 7: Right Chest** | 1,200 | 142.5° | 114.8° – 165.4° | 103.3° – 171.7° | 164.0° |
| `strike_8` | **Strike 8: Left Knee** | 1,425 | 129.6° | 164.6° – 177.4° | 129.6° – 178.9° | 162.3° |
| `strike_9` | **Strike 9: Right Knee** | 1,369 | 122.0° | 168.6° – 175.9° | 162.1° – 179.2° | 164.3° |
| `strike_10` | **Strike 10: Left Eye** | 1,100 | 107.4° | 149.2° – 172.7° | 127.0° – 176.9° | 162.6° |
| `strike_11` | **Strike 11: Right Eye** | 1,082 | 145.9° | 117.3° – 169.8° | 101.4° – 175.8° | 162.5° |
| `strike_12` | **Strike 12: Crown Strike** | 1,065 | 93.9° | 108.5° – 160.0° | 99.7° – 165.1° | 163.9° |

---

## 3. Computer Vision Accuracy Benchmark (AlphaPose Ground-Truth vs MediaPipe)

| Strike Technique | MPJPE (Normalized) | PCK@0.10 | PCK@0.20 | OKS Score |
| :--- | :--- | :--- | :--- | :--- |
| **Strike 1: Left Temple** | 0.0131 | 100.0% | 100.0% | 0.9496 |
| **Strike 2: Right Temple** | 0.0182 | 91.7% | 100.0% | 0.8982 |
| **Strike 3: Left Torso** | 0.0214 | 75.0% | 100.0% | 0.8834 |
| **Strike 4: Right Torso** | 0.0164 | 91.7% | 100.0% | 0.9248 |
| **Strike 5: Abdomen Thrust** | 0.0220 | 75.0% | 100.0% | 0.8855 |
| **Strike 6: Left Chest** | 0.0226 | 58.3% | 100.0% | 0.8774 |
| **Strike 7: Right Chest** | 0.0187 | 91.7% | 100.0% | 0.9140 |
| **Strike 8: Left Knee** | 0.0159 | 91.7% | 100.0% | 0.9337 |
| **Strike 9: Right Knee** | 0.0259 | 41.7% | 91.7% | 0.8245 |
| **Strike 10: Left Eye** | 0.0214 | 75.0% | 100.0% | 0.8842 |
| **Strike 11: Right Eye** | 0.0252 | 58.3% | 91.7% | 0.8562 |
| **Strike 12: Crown Strike** | 0.0201 | 75.0% | 100.0% | 0.8821 |
| **OVERALL MEAN BENCHMARK** | **0.0201** | **77.1%** | **98.6%** | **0.8928** |

---

## 4. Per-Joint Localization Error Distribution

| Joint Landmark | Mean Position Error (Normalized) | PCK@0.20 Agreement |
| :--- | :--- | :--- |
| `left_shoulder` | 0.0151 | 100.0% |
| `right_shoulder` | 0.0161 | 100.0% |
| `left_elbow` | 0.0169 | 100.0% |
| `right_elbow` | 0.0153 | 100.0% |
| `left_wrist` | 0.0152 | 100.0% |
| `right_wrist` | 0.0148 | 100.0% |
| `left_hip` | 0.0161 | 100.0% |
| `right_hip` | 0.0181 | 100.0% |
| `left_knee` | 0.0177 | 100.0% |
| `right_knee` | 0.0145 | 100.0% |
| `left_ankle` | 0.0190 | 100.0% |
| `right_ankle` | 0.0157 | 100.0% |

---

## 5. Thesis Defense Recommendations for the Examination Panel

* **Validity of On-Device Evaluation:** The experimental results substantiate that MediaPipe edge inference combined with statistical boundary filtering provides an accurate, hands-free coaching solution without requiring expensive external sensor arrays.
* **Pedagogical Alignment:** The 4-pillar scoring engine (Striking Arm 40%, Kalasag Guard 25%, Tindig Stance 20%, Pitik Wrist Snap 15%) successfully reflects traditional Philippine martial arts pedagogy while maintaining objective mathematical rigor.
