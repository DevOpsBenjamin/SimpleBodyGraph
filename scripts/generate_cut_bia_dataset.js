import fs from 'fs';
import path from 'path';

// Generate 100 days of data starting 2026-04-01 to 2026-07-09
const startDate = new Date('2026-04-01T07:30:00.000Z');
const totalDays = 100;

const logs = [];
const measurements = [];

// Seed pseudo-random generator for reproducible realistic variance
function pseudoRandom(seed) {
  const x = Math.sin(seed++) * 10000;
  return x - Math.floor(x);
}

for (let i = 0; i < totalDays; i++) {
  const currentDate = new Date(startDate);
  currentDate.setUTCDate(startDate.getUTCDate() + i);
  const dateStr = currentDate.toISOString().split('T')[0];
  
  // Progress from 0 to 1
  const progress = i / (totalDays - 1);
  
  // Trend: 85.0 kg down to 74.9 kg
  const baseMass = 85.0 - (10.1 * progress);
  // Natural daily variance: +/- 0.35 kg
  const noiseMass = (pseudoRandom(i * 13 + 7) - 0.5) * 0.7;
  const mass = Number((baseMass + noiseMass).toFixed(2));
  
  // Trend: 20.0% fat down to 11.9% fat
  const baseFat = 20.0 - (8.1 * progress);
  // Natural daily variance: +/- 0.25%
  const noiseFat = (pseudoRandom(i * 17 + 3) - 0.5) * 0.5;
  const bodyFat = Number((baseFat + noiseFat).toFixed(1));
  
  // Realistic BIA Resistances based on mass and fat changes
  // As fat mass decreases and intracellular/extracellular water ratio improves:
  // Base 50kHz: ~480-530 ohms, modulated by fat
  const rFactor = 1.0 + (bodyFat - 15.0) * 0.008; // slightly higher resistance with higher fat
  const noiseR = (pseudoRandom(i * 29 + 11) - 0.5) * 6;
  
  const r_lfrf_50 = Math.round((490 * rFactor) + noiseR);
  const r_lhrh_50 = Math.round((560 * rFactor) + noiseR * 1.1);
  const r_lhlf_50 = Math.round((515 * rFactor) + noiseR * 0.9);
  const r_lhrf_50 = Math.round((525 * rFactor) + noiseR * 1.0);
  const r_rhlf_50 = Math.round((522 * rFactor) + noiseR * 0.95);
  const r_rhrf_50 = Math.round((512 * rFactor) + noiseR * 0.9);
  
  const r_50k = [r_lfrf_50, r_lhrh_50, r_lhlf_50, r_lhrf_50, r_rhlf_50, r_rhrf_50];
  const r_250k = r_50k.map(v => Math.round(v * 0.875 + (pseudoRandom(i * 37 + v) - 0.5) * 4));
  
  const heartRate = Math.round(68 + (pseudoRandom(i * 41) * 12));
  
  logs.push({
    id: `log-cut-${String(i + 1).padStart(3, '0')}`,
    date: dateStr,
    mass,
    body_fat: bodyFat,
    measured_at: `${dateStr}T07:${String(15 + Math.floor(pseudoRandom(i) * 30)).padStart(2, '0')}:00Z`,
    heart_rate: heartRate,
    scale_device_id: 'HUAWEI-SCALE-3-PRO-CUT',
    impedances: {
      r_50k,
      r_250k
    },
    user_id: 'guest',
    synced: true
  });
  
  // Record tape measurement roughly every 14 days
  if (i % 14 === 0 || i === totalDays - 1) {
    const waist = Number((88.0 - (12.0 * progress) + (pseudoRandom(i * 43) - 0.5) * 0.4).toFixed(1));
    const chest = Number((104.0 - (2.5 * progress) + (pseudoRandom(i * 47) - 0.5) * 0.3).toFixed(1));
    const arms = Number((37.5 - (0.5 * progress) + (pseudoRandom(i * 53) - 0.5) * 0.2).toFixed(1));
    const thighs = Number((59.0 - (3.5 * progress) + (pseudoRandom(i * 59) - 0.5) * 0.3).toFixed(1));
    
    measurements.push({
      id: `meas-cut-${String(measurements.length + 1).padStart(3, '0')}`,
      date: dateStr,
      waist,
      chest,
      arms,
      thighs,
      user_id: 'guest',
      synced: true
    });
  }
}

const mockDataset = {
  profile: {
    gender: 'male',
    birthDate: '2002-05-14',
    height: 178
  },
  paliers: [
    { id: 'palier-1', mass: 82.0, fat: 18.0, validated: true },
    { id: 'palier-2', mass: 79.0, fat: 15.0, validated: true },
    { id: 'palier-3', mass: 75.0, fat: 12.0, validated: true },
    { id: 'palier-4', mass: 73.0, fat: 10.0, validated: false }
  ],
  displayPreferences: {
    cards: { mass: true, fatMass: true, bodyFat: true, leanMass: true },
    charts: {
      showMass: true,
      showFatMass: true,
      showLeanMass: true,
      showFatPercentChart: true,
      showBiaMuscleChart: true,
      showBiaFatChart: true
    },
    segmentalColors: {
      muscle: {
        total: '#a78bfa',
        trunk: '#fbbf24',
        rightArm: '#22d3ee',
        leftArm: '#38bdf8',
        rightLeg: '#34d399',
        leftLeg: '#a3e635'
      },
      fat: {
        total: '#c084fc',
        trunk: '#f59e0b',
        rightArm: '#06b6d4',
        leftArm: '#0ea5e9',
        rightLeg: '#10b981',
        leftLeg: '#84cc16'
      }
    },
    segmentalVisibility: {
      muscle: { total: true, trunk: true, rightArm: true, leftArm: true, rightLeg: true, leftLeg: true },
      fat: { total: true, trunk: true, rightArm: true, leftArm: true, rightLeg: true, leftLeg: true }
    }
  },
  logs,
  measurements
};

const outputPath1 = path.join(process.cwd(), 'tests', 'fixtures', 'bia_mock_dataset.local.json');
const outputPath2 = path.join(process.cwd(), 'tests', 'fixtures', 'bia_cut_85to75_dataset.json');

fs.writeFileSync(outputPath1, JSON.stringify(mockDataset, null, 2));
fs.writeFileSync(outputPath2, JSON.stringify(mockDataset, null, 2));

console.log(`Generated ${logs.length} logs and ${measurements.length} measurements from 85kg (20% fat) to 75kg (12% fat).`);
