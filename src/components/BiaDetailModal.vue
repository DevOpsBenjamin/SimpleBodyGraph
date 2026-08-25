<template>
  <Teleport to="body">
    <div 
      v-if="isOpen && biaData"
      class="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-gray-950/80 backdrop-blur-md animate-fade-in overflow-y-auto"
      @click.self="emit('close')"
    >
    <div class="glass-card w-full max-w-2xl max-h-[90vh] overflow-y-auto p-5 sm:p-6 rounded-3xl border border-violet-500/20 shadow-2xl space-y-6 my-auto">
      <!-- Header Bar -->
      <div class="flex items-center justify-between pb-4 border-b border-gray-800">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-2xl bg-gradient-to-tr from-violet-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-violet-500/20">
            <Zap class="w-5 h-5" />
          </div>
          <div>
            <h2 class="text-base sm:text-lg font-black text-white tracking-tight flex items-center gap-2">
              Rapport Clinique BIA
              <span class="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-violet-600/20 text-violet-300 border border-violet-500/30">
                8 Électrodes
              </span>
            </h2>
            <p class="text-xs text-gray-400">
              {{ title || 'Analyse multi-fréquence DEXA' }} · {{ biaData.profile?.sex === 'Male' ? 'Homme' : 'Femme' }}, {{ biaData.profile?.age }} ans, {{ biaData.profile?.height_cm }} cm
            </p>
          </div>
        </div>
        <button 
          type="button" 
          @click="emit('close')"
          class="p-2 rounded-xl bg-gray-900 border border-gray-800 text-gray-400 hover:text-white transition-colors cursor-pointer"
        >
          <X class="w-5 h-5" />
        </button>
      </div>

      <!-- 1. Scores & Morphologie Card -->
      <div class="grid grid-cols-3 gap-2.5 sm:gap-3">
        <div class="glass-card-violet p-3.5 rounded-2xl text-center">
          <span class="text-[10px] uppercase font-bold text-violet-300/80 tracking-wider block">Score Santé</span>
          <span class="text-xl sm:text-2xl font-black text-white">{{ biaData.body_composition?.health_body_score }}</span>
          <span class="text-[10px] text-gray-400 block">/ 100</span>
        </div>
        <div class="glass-card-amber p-3.5 rounded-2xl text-center">
          <span class="text-[10px] uppercase font-bold text-amber-300/80 tracking-wider block">Âge Métabolique</span>
          <span class="text-xl sm:text-2xl font-black text-white">{{ biaData.body_composition?.metabolic_body_age }}</span>
          <span class="text-[10px] text-gray-400 block">ans (réel: {{ biaData.profile?.age }})</span>
        </div>
        <div class="glass-card-emerald p-3.5 rounded-2xl text-center">
          <span class="text-[10px] uppercase font-bold text-emerald-300/80 tracking-wider block">Somatotype</span>
          <span class="text-xs sm:text-sm font-black text-white mt-1 block truncate">{{ biaData.body_composition?.somatotype }}</span>
          <span class="text-[10px] text-emerald-400/80 block">IMC {{ biaData.body_composition?.bmi }}</span>
        </div>
      </div>

      <!-- 2. Compartiments Masse Corporelle -->
      <div class="glass-card p-4 sm:p-5 rounded-2xl space-y-3 border border-gray-800">
        <h3 class="text-xs font-bold text-violet-400 uppercase tracking-wider flex items-center gap-2">
          <Scale class="w-4 h-4" />
          Composition Globale (Calibration DEXA)
        </h3>
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
          <div class="p-2.5 rounded-xl bg-gray-950/60 border border-gray-800/80">
            <span class="text-[10px] text-gray-400 block">Poids Total</span>
            <span class="text-base font-bold text-white">{{ biaData.body_composition?.weight_kg }} kg</span>
          </div>
          <div class="p-2.5 rounded-xl bg-gray-950/60 border border-gray-800/80">
            <span class="text-[10px] text-amber-400 block">Masse Grasse</span>
            <span class="text-base font-bold text-amber-300">{{ biaData.body_composition?.fat_mass_kg }} kg <span class="text-[10px] font-normal">({{ biaData.body_composition?.body_fat_percent }}%)</span></span>
          </div>
          <div class="p-2.5 rounded-xl bg-gray-950/60 border border-gray-800/80">
            <span class="text-[10px] text-emerald-400 block">Masse Maigre (FFM)</span>
            <span class="text-base font-bold text-emerald-300">{{ biaData.body_composition?.fat_free_mass_kg }} kg</span>
          </div>
          <div class="p-2.5 rounded-xl bg-gray-950/60 border border-gray-800/80">
            <span class="text-[10px] text-violet-400 block">Muscle Squelettique (SMM)</span>
            <span class="text-base font-bold text-violet-300">{{ biaData.body_composition?.skeletal_muscle_mass_kg }} kg <span class="text-[10px] font-normal">(SMI: {{ biaData.body_composition?.skeletal_muscle_index_smi }})</span></span>
          </div>
        </div>
      </div>

      <!-- 3. Analyse Segmentaire Anatomique (5 zones) -->
      <div class="glass-card p-4 sm:p-5 rounded-2xl space-y-3 border border-gray-800">
        <h3 class="text-xs font-bold text-violet-400 uppercase tracking-wider flex items-center gap-2">
          <Activity class="w-4 h-4" />
          Répartition Segmentaire Anatomique (5 zones)
        </h3>
        
        <div class="space-y-2.5">
          <!-- Tronc -->
          <div class="p-3 rounded-xl bg-gray-950/70 border border-gray-800/90 flex items-center justify-between">
            <span class="text-xs font-bold text-gray-200">🫁 Tronc</span>
            <div class="flex items-center gap-4 text-xs">
              <span class="text-emerald-400">Muscle: <strong>{{ biaData.segmental_analysis?.muscle_mass?.trunk_kg }} kg</strong></span>
              <span class="text-amber-400">Gras: <strong>{{ biaData.segmental_analysis?.fat_mass?.trunk_kg }} kg</strong></span>
            </div>
          </div>

          <!-- Bras -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div class="p-3 rounded-xl bg-gray-950/70 border border-gray-800/90 flex items-center justify-between">
              <span class="text-xs font-bold text-gray-200">💪 Bras Droit</span>
              <div class="flex items-center gap-3 text-xs">
                <span class="text-emerald-400">M: <strong>{{ biaData.segmental_analysis?.muscle_mass?.right_arm_kg }} kg</strong></span>
                <span class="text-amber-400">G: <strong>{{ biaData.segmental_analysis?.fat_mass?.right_arm_kg }} kg</strong></span>
              </div>
            </div>
            <div class="p-3 rounded-xl bg-gray-950/70 border border-gray-800/90 flex items-center justify-between">
              <span class="text-xs font-bold text-gray-200">💪 Bras Gauche</span>
              <div class="flex items-center gap-3 text-xs">
                <span class="text-emerald-400">M: <strong>{{ biaData.segmental_analysis?.muscle_mass?.left_arm_kg }} kg</strong></span>
                <span class="text-amber-400">G: <strong>{{ biaData.segmental_analysis?.fat_mass?.left_arm_kg }} kg</strong></span>
              </div>
            </div>
          </div>

          <!-- Jambes -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div class="p-3 rounded-xl bg-gray-950/70 border border-gray-800/90 flex items-center justify-between">
              <span class="text-xs font-bold text-gray-200">🦵 Jambe Droite</span>
              <div class="flex items-center gap-3 text-xs">
                <span class="text-emerald-400">M: <strong>{{ biaData.segmental_analysis?.muscle_mass?.right_leg_kg }} kg</strong></span>
                <span class="text-amber-400">G: <strong>{{ biaData.segmental_analysis?.fat_mass?.right_leg_kg }} kg</strong></span>
              </div>
            </div>
            <div class="p-3 rounded-xl bg-gray-950/70 border border-gray-800/90 flex items-center justify-between">
              <span class="text-xs font-bold text-gray-200">🦵 Jambe Gauche</span>
              <div class="flex items-center gap-3 text-xs">
                <span class="text-emerald-400">M: <strong>{{ biaData.segmental_analysis?.muscle_mass?.left_leg_kg }} kg</strong></span>
                <span class="text-amber-400">G: <strong>{{ biaData.segmental_analysis?.fat_mass?.left_leg_kg }} kg</strong></span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 4. Compartiments Hydriques & Santé Métabolique -->
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <!-- Fluides -->
        <div class="glass-card p-4 rounded-2xl space-y-2 border border-gray-800">
          <h4 class="text-xs font-bold text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
            <Droplets class="w-3.5 h-3.5" />
            Compartiments Hydriques
          </h4>
          <div class="text-xs text-gray-300 space-y-1.5 pt-1">
            <div class="flex justify-between">
              <span class="text-gray-400">Eau Totale (TBW) :</span>
              <span class="font-bold text-white">{{ biaData.body_composition?.total_water_kg }} kg ({{ biaData.body_composition?.total_water_percent }}%)</span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-400">Eau Intracellulaire (ICW) :</span>
              <span class="font-bold text-white">{{ biaData.body_composition?.intracellular_water_kg }} kg</span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-400">Eau Extracellulaire (ECW) :</span>
              <span class="font-bold text-white">{{ biaData.body_composition?.extracellular_water_kg }} kg</span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-400">Ratio ECW / TBW :</span>
              <span class="font-bold text-blue-400">{{ biaData.body_composition?.ecw_tbw_ratio }}</span>
            </div>
          </div>
        </div>

        <!-- Santé Métabolique -->
        <div class="glass-card p-4 rounded-2xl space-y-2 border border-gray-800">
          <h4 class="text-xs font-bold text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
            <Heart class="w-3.5 h-3.5" />
            Santé & Métabolisme
          </h4>
          <div class="text-xs text-gray-300 space-y-1.5 pt-1">
            <div class="flex justify-between">
              <span class="text-gray-400">Graisse Viscérale (VFL) :</span>
              <span class="font-bold text-amber-400">Niveau {{ biaData.body_composition?.visceral_fat_level }} / 50</span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-400">Ratio Taille/Hanches (WHR) :</span>
              <span class="font-bold text-white">{{ biaData.body_composition?.waist_to_hip_ratio_whr }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-400">Métabolisme Basal (BMR) :</span>
              <span class="font-bold text-white">{{ biaData.body_composition?.bmr_kcal }} kcal/jour</span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-400">Minéraux / Protéines :</span>
              <span class="font-bold text-white">{{ biaData.body_composition?.bone_mineral_salt_kg }} kg / {{ biaData.body_composition?.protein_mass_kg }} kg</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Close Button -->
      <button
        type="button"
        @click="emit('close')"
        class="w-full py-3 rounded-2xl bg-gray-900 hover:bg-gray-800 text-gray-200 font-bold text-xs cursor-pointer border border-gray-800 transition-colors"
      >
        Fermer le rapport
      </button>
    </div>
  </div>
  </Teleport>
</template>

<script setup>
import { Zap, X, Scale, Activity, Droplets, Heart } from 'lucide-vue-next';

defineProps({
  isOpen: {
    type: Boolean,
    default: false
  },
  title: {
    type: String,
    default: ''
  },
  biaData: {
    type: Object,
    default: null
  }
});

const emit = defineEmits(['close']);
</script>
