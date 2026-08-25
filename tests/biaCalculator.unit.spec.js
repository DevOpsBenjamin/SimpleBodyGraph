import { describe, it, expect } from 'vitest';
import { DualFrequencyBiaEngine, defaultBiaEngine } from '../src/services/bia/biaCalculator';

describe('DualFrequencyBiaEngine JavaScript implementation', () => {
  it('solves Kirchhoff network accurately for 50kHz', () => {
    const engine = new DualFrequencyBiaEngine();
    const v50 = engine.solveKirchhoffNetwork(349.0, 535.0, 468.3, 457.4, 469.5, 458.3);
    
    expect(v50.z_rh).toBeCloseTo(268.02, 1);
    expect(v50.z_lh).toBeCloseTo(266.98, 1);
    expect(v50.z_rf).toBeCloseTo(168.98, 1);
    expect(v50.z_lf).toBeCloseTo(180.02, 1);
    expect(v50.z_body_avg).toBeCloseTo(221.0, 1);
  });

  it('computes full BIA analysis matching python DEXA benchmark exactly', () => {
    const engine = defaultBiaEngine;
    const res = engine.analyze({
      sex: 1,
      age: 34,
      height_cm: 175.0,
      weight_kg: 104.30,
      resistances_50k: [349.0, 535.0, 468.3, 457.4, 469.5, 458.3],
      resistances_250k: [314.5, 473.1, 414.8, 404.2, 422.3, 410.8],
      raw_fat_rate: 33.2,
      heart_rate_bpm: 87
    });

    expect(res).not.toBeNull();
    expect(res.body_composition.bmi).toBe(34.1);
    expect(res.body_composition.fat_mass_kg).toBe(34.63);
    expect(res.body_composition.fat_free_mass_kg).toBe(69.67);
    expect(res.body_composition.skeletal_muscle_mass_kg).toBe(37.34);
    expect(res.body_composition.skeletal_muscle_index_smi).toBe(10.3);
    expect(res.body_composition.total_water_kg).toBe(50.86);
    expect(res.body_composition.total_water_percent).toBe(48.8);
    expect(res.body_composition.intracellular_water_kg).toBe(31.48);
    expect(res.body_composition.extracellular_water_kg).toBe(19.38);
    expect(res.body_composition.visceral_fat_level).toBe(19);
    expect(res.body_composition.waist_to_hip_ratio_whr).toBe(0.99);
    expect(res.body_composition.bmr_kcal).toBe(1875);
    expect(res.body_composition.metabolic_body_age).toBe(43); // 34 + (34.1 - 25.0) = 43.1 -> 43
    expect(res.body_composition.somatotype).toBe('High Adiposity');

    // Segmental
    expect(res.segmental_analysis.muscle_mass.trunk_kg).toBe(5.8);
    expect(res.segmental_analysis.muscle_mass.right_arm_kg).toBe(3.9);
    expect(res.segmental_analysis.muscle_mass.left_arm_kg).toBe(3.8);
    expect(res.segmental_analysis.muscle_mass.right_leg_kg).toBe(12.3);
    expect(res.segmental_analysis.muscle_mass.left_leg_kg).toBe(11.5);

    expect(res.segmental_analysis.fat_mass.trunk_kg).toBe(21.0);
    expect(res.segmental_analysis.fat_mass.right_arm_kg).toBe(2.3);
    expect(res.segmental_analysis.fat_mass.left_arm_kg).toBe(2.2);
    expect(res.segmental_analysis.fat_mass.right_leg_kg).toBe(4.4);
    expect(res.segmental_analysis.fat_mass.left_leg_kg).toBe(4.8);
  });
});
