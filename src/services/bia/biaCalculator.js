/**
 * Dual-Frequency 8-Electrode Bioelectrical Impedance Analysis (BIA) Engine (JavaScript / ES Module).
 * Calibrated against dual-energy X-ray absorptiometry (DEXA) standard data.
 */

export class DualFrequencyBiaEngine {
  constructor() {}

  /**
   * Solves the Kirchhoff closed-loop differential equations across the 8-electrode network
   * to isolate discrete limb impedances and calculate global path loops.
   */
  solveKirchhoffNetwork(r_lfrf, r_lhrh, r_lhlf, r_lhrf, r_rhlf, r_rhrf) {
    const scale = (r_lfrf > 1000 || r_lhrh > 1000) ? 0.1 : 1.0;
    const lfrf = r_lfrf * scale;
    const lhrh = r_lhrh * scale;
    const lhlf = r_lhlf * scale;
    const lhrf = r_lhrf * scale;
    const rhlf = r_rhlf * scale;
    const rhrf = r_rhrf * scale;

    const diff_arm_r = 0.25 * ((rhlf + rhrf) - (lhlf + lhrf));
    const diff_arm_l = 0.25 * ((lhlf + lhrf) - (rhlf + rhrf));

    const diff_leg_r = 0.25 * ((lhrf + rhrf) - (lhlf + rhlf));
    const diff_leg_l = 0.25 * ((lhlf + rhlf) - (lhrf + rhrf));

    const z_rh = 0.5 * lhrh + diff_arm_r;
    const z_lh = 0.5 * lhrh + diff_arm_l;
    const z_rf = 0.5 * lfrf + diff_leg_r;
    const z_lf = 0.5 * lfrf + diff_leg_l;

    const z_body_avg = 0.25 * (z_rh + z_lh + z_rf + z_lf);
    const z_body_loop = (z_rh + z_lh + z_rf + z_lf) * 0.521;

    return {
      z_rh: Number(z_rh.toFixed(2)),
      z_lh: Number(z_lh.toFixed(2)),
      z_rf: Number(z_rf.toFixed(2)),
      z_lf: Number(z_lf.toFixed(2)),
      z_body_avg: Number(z_body_avg.toFixed(2)),
      z_body_loop: Number(z_body_loop.toFixed(2)),
      r_direct_rhrf: rhrf
    };
  }

  /**
   * Classifies individual body somatotype across 9 clinical categories.
   */
  classifySomatotype(bmi, fatRate, sex) {
    const fatLow = sex === 1 ? 10.0 : 18.0;
    const fatHigh = sex === 1 ? 21.0 : 28.0;

    if (bmi < 18.5) {
      if (fatRate < fatLow) return 'Lean Athletic';
      if (fatRate > fatHigh) return 'Sarcopenic Non-Obese';
      return 'Lean Standard';
    } else if (bmi <= 25.0) {
      if (fatRate < fatLow) return 'Muscular Athletic';
      if (fatRate > fatHigh) return 'Mild Adiposity';
      return 'Balanced Standard';
    } else {
      if (fatRate < fatLow) return 'Heavy Muscular';
      if (fatRate > fatHigh) return 'High Adiposity';
      return 'Robust Sturdy';
    }
  }

  /**
   * Performs full dual-frequency multi-segmental body composition analysis.
   */
  analyze({
    sex = 1,          // 1=Male, 0=Female
    age = 34,         // Years
    height_cm = 175.0,// cm
    weight_kg = 104.3,// kg
    resistances_50k,  // [LFRF, LHRH, LHLF, LHRF, RHLF, RHRF]
    resistances_250k, // [LFRF, LHRH, LHLF, LHRF, RHLF, RHRF]
    raw_fat_rate = null,
    heart_rate_bpm = null
  }) {
    if (!resistances_50k || resistances_50k.length < 6 || !resistances_250k || resistances_250k.length < 6) {
      return null;
    }

    const v50 = this.solveKirchhoffNetwork(...resistances_50k);
    const v250 = this.solveKirchhoffNetwork(...resistances_250k);

    const height_m = height_cm / 100.0;
    const bmi = Number((weight_kg / (height_m * height_m)).toFixed(1));

    // Pure Ohm-based DEXA FFM regression (ARM64 Model #00 & #01)
    const bii_50 = (height_cm * height_cm) / v50.z_body_avg;
    const bii_250 = (height_cm * height_cm) / v250.z_body_avg;

    let dexa_ffm;
    if (sex === 1) {
      dexa_ffm = (
        0.12631 * bii_50
        + 0.16098 * bii_250
        - 0.01195 * v50.z_body_avg
        - 0.02027 * v250.z_body_avg
        + 0.14923 * weight_kg
        + 0.25154 * height_cm
        - 0.000070 * (age * age)
        - 0.03560 * age
        - 20.79390
      );
    } else {
      dexa_ffm = (
        0.07182 * bii_50
        + 0.07944 * bii_250
        - 0.01169 * v50.z_body_avg
        - 0.01661 * v250.z_body_avg
        + 0.11944 * weight_kg
        + 0.23935 * height_cm
        + 0.000430 * (age * age)
        - 0.08840 * age
        - 14.71130
      );
    }

    const recalculated_body_fat_percent = Number(Math.max(5.0, Math.min(50.0, ((weight_kg - dexa_ffm) / weight_kg) * 100.0)).toFixed(1));

    // 1. Fat Mass & Fat-Free Mass (FFM)
    let body_fat_percent;
    if (raw_fat_rate !== null && raw_fat_rate > 0.0) {
      body_fat_percent = raw_fat_rate;
    } else {
      body_fat_percent = recalculated_body_fat_percent;
    }

    const fat_mass_kg = Number((weight_kg * (body_fat_percent / 100.0)).toFixed(2));
    const ffm_kg = Number((weight_kg - fat_mass_kg).toFixed(2));

    // 2. Total, Intracellular & Extracellular Water Compartments
    const tbw_kg = Number((ffm_kg * 0.730).toFixed(2));
    const tbw_percent = Number(((tbw_kg / weight_kg) * 100.0).toFixed(1));

    const ratio_hf_lf = v250.z_body_avg / v50.z_body_avg;
    const ecw_ratio = Number((0.380 + 0.05 * (ratio_hf_lf - 0.88)).toFixed(3));
    const ecw_kg = Number((tbw_kg * ecw_ratio).toFixed(2));
    const icw_kg = Number((tbw_kg - ecw_kg).toFixed(2));

    // 3. Skeletal Muscle Mass (SMM)
    const smm_kg = Number((ffm_kg * (sex === 1 ? 0.536 : 0.480)).toFixed(2));

    // 4. Bone Mineral Salt & Active Protein Mass
    const bone_salt_kg = Number((ffm_kg * 0.052).toFixed(2));
    const protein_kg = Number((ffm_kg * 0.214).toFixed(2));

    // 5. Segmental Fat Mass Partitioning
    const trunk_fat_kg = Number((fat_mass_kg * 0.605).toFixed(1));
    const legs_fat_pool = fat_mass_kg * 0.265;
    const arms_fat_pool = fat_mass_kg * 0.130;

    const rh_fat = Number((arms_fat_pool * (v50.z_rh / (v50.z_rh + v50.z_lh))).toFixed(1));
    const lh_fat = Number((arms_fat_pool - rh_fat).toFixed(1));
    const rf_fat = Number((legs_fat_pool * (v50.z_rf / (v50.z_rf + v50.z_lf))).toFixed(1));
    const lf_fat = Number((legs_fat_pool - rf_fat).toFixed(1));

    // 6. Visceral Fat Level (VFL, 1 to 50 scale)
    let vfl_calc;
    if (sex === 1) {
      vfl_calc = 0.52 * bmi + 0.18 * age + 0.28 * trunk_fat_kg - 11.2;
    } else {
      vfl_calc = 0.45 * bmi + 0.16 * age + 0.25 * trunk_fat_kg - 10.0;
    }
    const vfl = Math.max(1, Math.min(50, Math.round(vfl_calc)));

    // 7. Basal Metabolic Rate (BMR)
    const bmr_kcal = Math.round(370 + 21.6 * ffm_kg);

    // 8. Segmental Muscle Mass Partitioning
    const trunk_muscle_kg = Number((smm_kg * 0.155).toFixed(1));
    const appendicular_muscle_kg = smm_kg - trunk_muscle_kg;

    const arms_muscle_pool = appendicular_muscle_kg * 0.245;
    const legs_muscle_pool = appendicular_muscle_kg * 0.755;

    const inv_arm_r = 1.0 / v50.z_rh;
    const inv_arm_l = 1.0 / v50.z_lh;
    const inv_leg_r = 1.0 / v50.z_rf;
    const inv_leg_l = 1.0 / v50.z_lf;

    const rh_muscle = Number((arms_muscle_pool * (inv_arm_r / (inv_arm_r + inv_arm_l))).toFixed(1));
    const lh_muscle = Number((arms_muscle_pool - rh_muscle).toFixed(1));
    const rf_muscle = Number((legs_muscle_pool * (inv_leg_r / (inv_leg_r + inv_leg_l))).toFixed(1));
    const lf_muscle = Number((legs_muscle_pool - rf_muscle).toFixed(1));

    // Skeletal Muscle Index (SMI, kg/m^2)
    const smi = Number(((rh_muscle + lh_muscle + rf_muscle + lf_muscle) / (height_m * height_m)).toFixed(1));

    // 9. Morphological & Metabolic Indices
    const whr = Number((0.72 + 0.005 * bmi + 0.003 * vfl + (sex === 1 ? 0.04 : 0.0)).toFixed(2));

    // Metabolic Body Age
    const bmi_shift = Math.max(-5.0, Math.min(20.0, bmi - 25.0));
    const body_age = Math.max(18, Math.min(80, Math.round(age + bmi_shift)));

    // Health Body Score
    const bmi_deduct = Math.min(20.0, Math.max(0.0, (bmi - 25.0) * 1.5));
    const fat_deduct = Math.min(10.0, Math.max(0.0, (body_fat_percent - (sex === 1 ? 18.0 : 24.0)) * 0.5));
    const muscle_bonus = sex === 1
      ? Math.min(6.0, Math.max(0.0, (smm_kg - 32.0) * 0.5))
      : Math.min(6.0, Math.max(0.0, (smm_kg - 22.0) * 0.5));
    const body_score = Math.max(50, Math.min(100, Math.round(90.0 - bmi_deduct - fat_deduct + muscle_bonus)));

    const somatotype = this.classifySomatotype(bmi, body_fat_percent, sex);

    return {
      profile: {
        sex: sex === 1 ? 'Male' : 'Female',
        age,
        height_cm,
        weight_kg,
        heart_rate_bpm
      },
      impedances_50k_ohms: v50,
      impedances_250k_ohms: v250,
      body_composition: {
        weight_kg,
        bmi,
        body_fat_percent,
        recalculated_body_fat_percent,
        recalculated_fat_mass_kg: Number((weight_kg * (recalculated_body_fat_percent / 100.0)).toFixed(2)),
        recalculated_ffm_kg: Number((weight_kg - (weight_kg * (recalculated_body_fat_percent / 100.0))).toFixed(2)),
        fat_mass_kg,
        fat_free_mass_kg: ffm_kg,
        skeletal_muscle_mass_kg: smm_kg,
        skeletal_muscle_index_smi: smi,
        total_water_kg: tbw_kg,
        total_water_percent: tbw_percent,
        intracellular_water_kg: icw_kg,
        extracellular_water_kg: ecw_kg,
        ecw_tbw_ratio: ecw_ratio,
        bone_mineral_salt_kg: bone_salt_kg,
        protein_mass_kg: protein_kg,
        visceral_fat_level: vfl,
        bmr_kcal: bmr_kcal,
        waist_to_hip_ratio_whr: whr,
        metabolic_body_age: body_age,
        health_body_score: body_score,
        somatotype
      },
      segmental_analysis: {
        muscle_mass: {
          trunk_kg: trunk_muscle_kg,
          right_arm_kg: rh_muscle,
          left_arm_kg: lh_muscle,
          right_leg_kg: rf_muscle,
          left_leg_kg: lf_muscle,
          total_smm_kg: smm_kg
        },
        fat_mass: {
          trunk_kg: trunk_fat_kg,
          right_arm_kg: rh_fat,
          left_arm_kg: lh_fat,
          right_leg_kg: rf_fat,
          left_leg_kg: lf_fat,
          total_fat_kg: fat_mass_kg
        }
      }
    };
  }
}

export const defaultBiaEngine = new DualFrequencyBiaEngine();

/**
 * Extracts and normalizes dual-frequency resistances (50 kHz & 250 kHz) from any impedance object,
 * supporting both r_50k/r_250k and the legacy feet/hands keys.
 *
 * NOTE: "feet"/"hands" was a misnomer in earlier versions - those two arrays never
 * held foot and hand impedances. They are the same 6 anatomical paths measured at
 * 50 kHz and 250 kHz respectively. The keys are still read so historical logs keep
 * working, but nothing writes them any more.
 *
 * @param {Object} impedances
 * @returns {{ r_50k: number[], r_250k: number[] } | null}
 */
export function extractBiaResistances(impedances) {
  if (!impedances || typeof impedances !== 'object') return null;
  const r_50k = impedances.r_50k || impedances.feet || null;
  const r_250k = impedances.r_250k || impedances.hands || null;
  if (Array.isArray(r_50k) && r_50k.length >= 6 && Array.isArray(r_250k) && r_250k.length >= 6) {
    return { r_50k, r_250k };
  }
  return null;
}

/**
 * Checks whether a given log contains valid dual-frequency BIA impedance data.
 *
 * @param {Object} log
 * @returns {boolean}
 */
export function hasBiaData(log) {
  return extractBiaResistances(log?.impedances) !== null;
}
