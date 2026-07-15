import csv
import numpy as np

# Column definitions in arnis_dataset_v2.csv
# Strike_Type,Camera_Angle,Video_Name,Frame_ID,R_Elbow_Angle,L_Elbow_Angle,R_Shoulder_Angle,L_Shoulder_Angle,R_Wrist_Angle,L_Wrist_Angle,R_Hip_Angle,L_Hip_Angle,R_Knee_Angle,L_Knee_Angle,Torso_Lean,Head_Dir_X,Head_Dir_Y,Dist_Wrists,Dist_R_Wrist_Shoulder,Dist_L_Wrist_Shoulder

def analyze_dataset(file_path):
    print("=" * 80)
    print("            ARNIS ALPHAPOSE DATASET CALIBRATION & STATISTICAL ANALYSIS")
    print("=" * 80)
    
    # Load dataset
    data_by_strike = {}
    with open(file_path, mode='r') as f:
        reader = csv.DictReader(f)
        for row in reader:
            strike = row['Strike_Type']
            if not strike:
                continue
                
            if strike not in data_by_strike:
                data_by_strike[strike] = []
            
            # Parse values, handle blanks
            parsed_row = {}
            for col, val in row.items():
                if col in ['Frame_ID', 'Video_Name', 'Camera_Angle', 'Strike_Type']:
                    parsed_row[col] = val
                else:
                    parsed_row[col] = float(val) if val and val.strip() else None
            data_by_strike[strike].append(parsed_row)
            
    print(f"Loaded {sum(len(v) for v in data_by_strike.values())} rows across {len(data_by_strike)} strikes.\n")
    
    calibrated_rules = {}
    
    print(f"{'Strike Type':<12} | {'R_Elbow Range (Active)':<24} | {'L_Elbow Range (Active)':<24} | {'Active Stance Knee':<18}")
    print("-" * 88)
    
    for strike in sorted(data_by_strike.keys(), key=lambda x: int(x.split('_')[1])):
        rows = data_by_strike[strike]
        
        # Filter rows to only those with valid right elbow, left elbow, and right wrist extension distance
        valid_rows = [r for r in rows if r['R_Elbow_Angle'] is not None 
                      and r['L_Elbow_Angle'] is not None 
                      and r['Dist_R_Wrist_Shoulder'] is not None]
        
        if not valid_rows:
            continue
            
        # Isolate the "Active Impact/Extension" frames:
        # We look at frames where the stick hand (R_Wrist) is extended further from the shoulder.
        # This is where the strike actually connects. Let's take the top 25% of wrist extension distances.
        extensions = [r['Dist_R_Wrist_Shoulder'] for r in valid_rows]
        threshold_dist = np.percentile(extensions, 75)
        
        active_rows = [r for r in valid_rows if r['Dist_R_Wrist_Shoulder'] >= threshold_dist]
        
        # Calculate statistical ranges (10th to 90th percentile to avoid outliers)
        r_elbow_active = [r['R_Elbow_Angle'] for r in active_rows]
        l_elbow_active = [r['L_Elbow_Angle'] for r in active_rows]
        
        r_el_min, r_el_max = np.percentile(r_elbow_active, 10), np.percentile(r_elbow_active, 90)
        l_el_min, l_el_max = np.percentile(l_elbow_active, 10), np.percentile(l_elbow_active, 90)
        
        # Shoulder and knee stats during active strike
        r_shoulders = [r['R_Shoulder_Angle'] for r in active_rows if r['R_Shoulder_Angle'] is not None]
        l_shoulders = [r['L_Shoulder_Angle'] for r in active_rows if r['L_Shoulder_Angle'] is not None]
        r_knees = [r['R_Knee_Angle'] for r in active_rows if r['R_Knee_Angle'] is not None]
        l_knees = [r['L_Knee_Angle'] for r in active_rows if r['L_Knee_Angle'] is not None]
        
        mean_r_shoulder = np.mean(r_shoulders) if r_shoulders else 90.0
        mean_l_shoulder = np.mean(l_shoulders) if l_shoulders else 90.0
        
        # Active Stance Lead Knee (the knee that bends more)
        mean_r_knee = np.mean(r_knees) if r_knees else 150.0
        mean_l_knee = np.mean(l_knees) if l_knees else 150.0
        lead_knee_val = min(mean_r_knee, mean_l_knee)
        
        # Save calibrated rules
        calibrated_rules[strike] = {
            "id": strike,
            "right_min": round(r_el_min, 1),
            "right_max": round(r_el_max, 1),
            "left_min": round(l_el_min, 1),
            "left_max": round(l_el_max, 1),
            "ideal_r_shoulder": round(mean_r_shoulder, 1),
            "ideal_l_shoulder": round(mean_l_shoulder, 1),
            "ideal_knee_bend": round(lead_knee_val, 1)
        }
        
        print(f"{strike:<12} | {r_el_min:5.1f}° to {r_el_max:5.1f}° | {l_el_min:5.1f}° to {l_el_max:5.1f}° | {lead_knee_val:5.1f}°")

    print("=" * 88)
    print("\nCopy-Pasteable React Native TypeScript configuration for evaluate.tsx:")
    print("=" * 80)
    print("export const CALIBRATED_STRIKE_RULES = {")
    for strike in sorted(calibrated_rules.keys(), key=lambda x: int(x.split('_')[1])):
        rule = calibrated_rules[strike]
        print(f"  \"{strike}\": {{ "
              f"id: \"{strike}\", "
              f"right_min: {rule['right_min']}, right_max: {rule['right_max']}, "
              f"left_min: {rule['left_min']}, left_max: {rule['left_max']}, "
              f"ideal_shoulder: {rule['ideal_r_shoulder']}, ideal_knee: {rule['ideal_knee_bend']} }},")
    print("};")
    print("=" * 80)

if __name__ == "__main__":
    analyze_dataset("arnis_dataset_v2.csv")
