import csv
import numpy as np
from collections import defaultdict

def analyze_dataset(file_path):
    print("=" * 88)
    print("      ARNIS ALPHAPOSE DATASET DYNAMIC MOTION CALIBRATION & RULE GENERATOR")
    print("=" * 88)
    
    # Load dataset
    data_by_strike = defaultdict(list)
    with open(file_path, mode='r') as f:
        reader = csv.DictReader(f)
        for row in reader:
            strike = row['Strike_Type']
            if not strike:
                continue
                
            parsed_row = {}
            for col, val in row.items():
                if col in ['Frame_ID', 'Video_Name', 'Camera_Angle', 'Strike_Type']:
                    parsed_row[col] = val
                else:
                    parsed_row[col] = float(val) if val and val.strip() else None
            data_by_strike[strike].append(parsed_row)
            
    print(f"Loaded {sum(len(v) for v in data_by_strike.values())} rows across {len(data_by_strike)} strikes.\n")
    
    calibrated_rules = {}
    
    print(f"{'Strike':<10} | {'Chamber Elb':<12} | {'Apex R_Elbow Range':<22} | {'Apex L_Elbow Range':<22} | {'Shld':<7} | {'Ext Delta':<9}")
    print("-" * 96)
    
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
        "strike_12": "Strike 12: Crown"
    }

    for strike in sorted(data_by_strike.keys(), key=lambda x: int(x.split('_')[1])):
        rows = data_by_strike[strike]
        
        # Group by Video_Name to identify frame sequence trajectories
        videos = defaultdict(list)
        for r in rows:
            if r['R_Elbow_Angle'] is not None and r['Dist_R_Wrist_Shoulder'] is not None:
                videos[r['Video_Name']].append(r)
                
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
            apex_idx = np.argmax(dists)
            apex_r = v_rows[apex_idx]
            
            # Chamber frame = min wrist-shoulder extension before or at apex
            chamber_idx = np.argmin(dists[:apex_idx+1]) if apex_idx > 0 else 0
            chamber_r = v_rows[chamber_idx]
            
            apex_r_elbs.append(apex_r['R_Elbow_Angle'])
            if apex_r['L_Elbow_Angle'] is not None:
                apex_l_elbs.append(apex_r['L_Elbow_Angle'])
            if apex_r['R_Shoulder_Angle'] is not None:
                apex_r_shlds.append(apex_r['R_Shoulder_Angle'])
                
            r_k = apex_r['R_Knee_Angle'] if apex_r['R_Knee_Angle'] is not None else 180.0
            l_k = apex_r['L_Knee_Angle'] if apex_r['L_Knee_Angle'] is not None else 180.0
            apex_knees.append(min(r_k, l_k))
            
            chamber_r_elbs.append(chamber_r['R_Elbow_Angle'])
            chamber_dists.append(chamber_r['Dist_R_Wrist_Shoulder'])
            apex_dists.append(apex_r['Dist_R_Wrist_Shoulder'])
            
        r_min = round(float(np.percentile(apex_r_elbs, 10)), 1)
        r_max = round(float(np.percentile(apex_r_elbs, 90)), 1)
        l_min = round(float(np.percentile(apex_l_elbs, 10)), 1) if apex_l_elbs else 30.0
        l_max = round(float(np.percentile(apex_l_elbs, 90)), 1) if apex_l_elbs else 150.0
        shld_avg = round(float(np.mean(apex_r_shlds)), 1) if apex_r_shlds else 60.0
        knee_avg = round(float(np.mean(apex_knees)), 1) if apex_knees else 165.0
        chamber_elb_avg = round(float(np.mean(chamber_r_elbs)), 1) if chamber_r_elbs else 70.0
        ext_delta_avg = round(float(np.mean(apex_dists) - np.mean(chamber_dists)), 1) if apex_dists else 30.0

        calibrated_rules[strike] = {
            "id": strike,
            "name": strike_names.get(strike, strike),
            "chamber_elb": chamber_elb_avg,
            "right_min": r_min,
            "right_max": r_max,
            "left_min": l_min,
            "left_max": l_max,
            "ideal_shoulder": shld_avg,
            "ideal_knee": knee_avg,
            "ext_delta": ext_delta_avg
        }
        
        print(f"{strike:<10} | {chamber_elb_avg:5.1f}°       | {r_min:5.1f}° to {r_max:5.1f}° | {l_min:5.1f}° to {l_max:5.1f}° | {shld_avg:5.1f}° | {ext_delta_avg:5.1f}")

    print("=" * 96)
    print("\nCopy-Pasteable TS Config for poseEngineHtml.ts & evaluate.tsx:\n")
    print("export const STRIKE_RULES = {")
    for strike in sorted(calibrated_rules.keys(), key=lambda x: int(x.split('_')[1])):
        rule = calibrated_rules[strike]
        print(f"  \"{strike}\": {{ "
              f"id: \"{strike}\", "
              f"name: \"{rule['name']}\", "
              f"chamber_elb: {rule['chamber_elb']}, "
              f"right_min: {rule['right_min']}, right_max: {rule['right_max']}, "
              f"left_min: {rule['left_min']}, left_max: {rule['left_max']}, "
              f"ideal_shoulder: {rule['ideal_shoulder']}, ideal_knee: {rule['ideal_knee']}, "
              f"ext_delta: {rule['ext_delta']} }},")
    print("};")

if __name__ == "__main__":
    analyze_dataset("arnis_dataset_v2.csv")
