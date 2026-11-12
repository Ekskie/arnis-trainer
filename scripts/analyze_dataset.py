"""
Arnis AlphaPose Dataset Dynamic Motion Calibration & Rule Generator
Zero-dependency pure Python implementation (compatible with any Python 3.7+ runtime).
Computes optimal core (25th-75th percentile) and acceptable range (10th-90th percentile)
for all 12 canonical Arnis strikes.
Supports both arnis_dataset_v2.csv (14,764 frames) and arnis_expert_clean.csv (22,713 frames).
"""

import os
import sys
import csv
import math
from collections import defaultdict

def percentile(vals, p):
    """Compute p-th percentile of a list of floats (0 <= p <= 100)"""
    if not vals:
        return 0.0
    s_vals = sorted(vals)
    k = (len(s_vals) - 1) * (p / 100.0)
    f = math.floor(k)
    c = math.ceil(k)
    if f == c:
        return s_vals[int(k)]
    d0 = s_vals[int(f)] * (c - k)
    d1 = s_vals[int(c)] * (k - f)
    return d0 + d1

def analyze_dataset(file_path="arnis_dataset_v2.csv"):
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    if not os.path.isabs(file_path):
        resolved_path = os.path.join(base_dir, file_path)
        if os.path.exists(resolved_path):
            file_path = resolved_path

    print("=" * 104)
    print("      ARNIS ALPHAPOSE DATASET DYNAMIC MOTION CALIBRATION & RULE GENERATOR")
    print(f"      Dataset File: {os.path.basename(file_path)}")
    print("=" * 104)

    if not os.path.exists(file_path):
        print(f"Error: Dataset file not found at: {file_path}")
        return

    strike_names = {
        "strike_1": "Strike 1: Left Temple",
        "strike_2": "Strike 2: Right Temple",
        "strike_3": "Strike 3: Left Torso",
        "strike_4": "Strike 4: Right Torso",
        "strike_5": "Strike 5: Abdomen Thrust",
        "strike_6": "Strike 6: Left Chest",
        "strike_7": "Strike 7: Right Chest",
        "strike_8": "Strike 8: Left Knee",
        "strike_9": "Strike 9: Right Knee",
        "strike_10": "Strike 10: Left Eye",
        "strike_11": "Strike 11: Right Eye",
        "strike_12": "Strike 12: Crown Strike"
    }

    # Load dataset
    data_by_strike = defaultdict(list)
    total_rows = 0

    with open(file_path, mode='r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            # Filter QC decision if present in clean dataset
            if row.get('QC_Decision') and row.get('QC_Decision') != 'keep':
                continue

            strike = row.get('Strike_Type') or row.get('Strike')
            if not strike:
                continue

            strike = strike.strip().lower().replace(' ', '_')
            if not strike.startswith('strike_'):
                continue

            parsed_row = {}
            for col, val in row.items():
                if col in ['Frame_ID', 'Video_Name', 'Camera_Angle', 'Camera', 'Strike_Type', 'Strike', 'QC_Decision']:
                    parsed_row[col] = val
                else:
                    try:
                        parsed_row[col] = float(val) if val and val.strip() else None
                    except (ValueError, TypeError):
                        parsed_row[col] = None

            data_by_strike[strike].append(parsed_row)
            total_rows += 1

    print(f"Loaded {total_rows} frames across {len(data_by_strike)} strikes.\n")

    calibrated_rules = {}

    print(f"{'Strike':<10} | {'Chamber':<9} | {'Optimal Core (25%-75%)':<24} | {'Acceptable (10%-90%)':<22} | {'Shld':<6} | {'Knee':<6}")
    print("-" * 104)

    sorted_strikes = sorted(data_by_strike.keys(), key=lambda x: int(x.split('_')[1]))

    for strike in sorted_strikes:
        rows = data_by_strike[strike]

        videos = defaultdict(list)
        for r in rows:
            if r.get('R_Elbow_Angle') is not None and r.get('Dist_R_Wrist_Shoulder') is not None:
                vid_name = r.get('Video_Name') or 'default'
                videos[vid_name].append(r)

        apex_r_elbs = []
        apex_l_elbs = []
        apex_r_shlds = []
        apex_knees = []
        chamber_r_elbs = []
        chamber_dists = []
        apex_dists = []

        for vid_name, v_rows in videos.items():
            if len(v_rows) < 3:
                continue

            # Apex frame = max wrist-shoulder extension
            dists = [r['Dist_R_Wrist_Shoulder'] for r in v_rows]
            max_dist = max(dists)
            apex_idx = dists.index(max_dist)
            apex_r = v_rows[apex_idx]

            # Chamber frame = min wrist-shoulder extension before or at apex
            pre_dists = dists[:apex_idx + 1] if apex_idx > 0 else dists[:1]
            min_dist = min(pre_dists)
            chamber_idx = dists.index(min_dist)
            chamber_r = v_rows[chamber_idx]

            apex_r_elbs.append(apex_r['R_Elbow_Angle'])
            if apex_r.get('L_Elbow_Angle') is not None:
                apex_l_elbs.append(apex_r['L_Elbow_Angle'])
            if apex_r.get('R_Shoulder_Angle') is not None:
                apex_r_shlds.append(apex_r['R_Shoulder_Angle'])

            r_k = apex_r.get('R_Knee_Angle') if apex_r.get('R_Knee_Angle') is not None else 180.0
            l_k = apex_r.get('L_Knee_Angle') if apex_r.get('L_Knee_Angle') is not None else 180.0
            apex_knees.append(min(r_k, l_k))

            chamber_r_elbs.append(chamber_r['R_Elbow_Angle'])
            chamber_dists.append(chamber_r['Dist_R_Wrist_Shoulder'])
            apex_dists.append(apex_r['Dist_R_Wrist_Shoulder'])

        # Multi-tier bounds
        r_min = round(float(percentile(apex_r_elbs, 10)), 1)
        r_opt_min = round(float(percentile(apex_r_elbs, 25)), 1)
        r_opt_max = round(float(percentile(apex_r_elbs, 75)), 1)
        r_max = round(float(percentile(apex_r_elbs, 90)), 1)

        l_min = round(float(percentile(apex_l_elbs, 10)), 1) if apex_l_elbs else 30.0
        l_max = round(float(percentile(apex_l_elbs, 90)), 1) if apex_l_elbs else 150.0

        shld_avg = round(float(sum(apex_r_shlds) / len(apex_r_shlds)), 1) if apex_r_shlds else 60.0
        knee_avg = round(float(sum(apex_knees) / len(apex_knees)), 1) if apex_knees else 165.0
        chamber_elb_avg = round(float(sum(chamber_r_elbs) / len(chamber_r_elbs)), 1) if chamber_r_elbs else 70.0
        ext_delta_avg = round(float(sum(apex_dists) / len(apex_dists) - sum(chamber_dists) / len(chamber_dists)), 1) if apex_dists and chamber_dists else 30.0

        calibrated_rules[strike] = {
            "id": strike,
            "name": strike_names.get(strike, strike),
            "chamber_elb": chamber_elb_avg,
            "right_min": r_min,
            "optimal_min": r_opt_min,
            "optimal_max": r_opt_max,
            "right_max": r_max,
            "left_min": l_min,
            "left_max": l_max,
            "ideal_shoulder": shld_avg,
            "ideal_knee": knee_avg,
            "ext_delta": ext_delta_avg
        }

        print(f"{strike:<10} | {chamber_elb_avg:5.1f}°   | {r_opt_min:5.1f}° to {r_opt_max:5.1f}°       | {r_min:5.1f}° to {r_max:5.1f}°   | {shld_avg:5.1f}° | {knee_avg:5.1f}°")

    print("=" * 104)
    print("\nCopy-Pasteable TS Config for constants/strikeRules.ts:\n")
    print("export const CALIBRATED_STRIKE_RULES = {")
    for strike in sorted_strikes:
        rule = calibrated_rules[strike]
        print(f"  \"{strike}\": {{ "
              f"id: \"{strike}\", "
              f"name: \"{rule['name']}\", "
              f"chamber_elb: {rule['chamber_elb']}, "
              f"right_min: {rule['right_min']}, "
              f"optimal_min: {rule['optimal_min']}, "
              f"optimal_max: {rule['optimal_max']}, "
              f"right_max: {rule['right_max']}, "
              f"left_min: {rule['left_min']}, left_max: {rule['left_max']}, "
              f"ideal_shoulder: {rule['ideal_shoulder']}, ideal_knee: {rule['ideal_knee']}, "
              f"ext_delta: {rule['ext_delta']} }},")
    print("};")

if __name__ == "__main__":
    target_csv = sys.argv[1] if len(sys.argv) > 1 else "arnis_dataset_v2.csv"
    analyze_dataset(target_csv)
