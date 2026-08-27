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
              {{ $t('bia.reportModalTitle') }}
              <span class="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-violet-600/20 text-violet-300 border border-violet-500/30">
                {{ $t('bia.electrodes8') }}
              </span>
            </h2>
            <p class="text-xs text-gray-400">
              {{ title || $t('bia.dexaAnalysisSubtitle') }} · {{ $t('bia.profileSummary', { gender: biaData.profile?.sex === 'Male' ? $t('bia.male') : $t('bia.female'), age: biaData.profile?.age, height: biaData.profile?.height_cm }) }}
            </p>
          </div>
        </div>
        <button 
          type="button" 
          @click="emit('close')"
          class="p-2 rounded-xl bg-gray-900 border border-gray-800 text-gray-400 hover:text-white transition-colors cursor-pointer"
          :aria-label="$t('common.close')"
        >
          <X class="w-5 h-5" />
        </button>
      </div>

      <!-- 1. Scores & Morphologie Card -->
      <div class="grid grid-cols-3 gap-2.5 sm:gap-3">
        <div class="glass-card-violet p-3.5 rounded-2xl text-center">
          <span class="text-[10px] uppercase font-bold text-violet-300/80 tracking-wider block">{{ $t('bia.healthScore') }}</span>
          <span class="text-xl sm:text-2xl font-black text-white">{{ biaData.body_composition?.health_body_score }}</span>
          <span class="text-[10px] text-gray-400 block">/ 100</span>
        </div>
        <div class="glass-card-amber p-3.5 rounded-2xl text-center">
          <span class="text-[10px] uppercase font-bold text-amber-300/80 tracking-wider block">{{ $t('bia.metabolicAge') }}</span>
          <span class="text-xl sm:text-2xl font-black text-white">{{ biaData.body_composition?.metabolic_body_age }}</span>
          <span class="text-[10px] text-gray-400 block">{{ $t('common.years') }} ({{ $t('bia.actualAge', { age: biaData.profile?.age }) }})</span>
        </div>
        <div class="glass-card-emerald p-3.5 rounded-2xl text-center">
          <span class="text-[10px] uppercase font-bold text-emerald-300/80 tracking-wider block">{{ $t('bia.somatotype') }}</span>
          <span class="text-xs sm:text-sm font-black text-white mt-1 block truncate">{{ biaData.body_composition?.somatotype }}</span>
          <span class="text-[10px] text-emerald-400/80 block">{{ $t('bia.bmi', { bmi: biaData.body_composition?.bmi }) }}</span>
        </div>
      </div>

      <!-- 2. Compartiments Masse Corporelle -->
      <div class="glass-card p-4 sm:p-5 rounded-2xl space-y-3 border border-gray-800">
        <h3 class="text-xs font-bold text-violet-400 uppercase tracking-wider flex items-center gap-2">
          <Scale class="w-4 h-4" />
          {{ $t('bia.globalCompositionTitle') }}
        </h3>
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
          <div class="p-2.5 rounded-xl bg-gray-950/60 border border-gray-800/80">
            <span class="text-[10px] text-gray-400 block">{{ $t('bia.totalWeight') }}</span>
            <span class="text-base font-bold text-white">{{ biaData.body_composition?.weight_kg }} {{ $t('common.kg') }}</span>
          </div>
          <div class="p-2.5 rounded-xl bg-gray-950/60 border border-gray-800/80">
            <span class="text-[10px] text-amber-400 block">{{ $t('bia.fatMass') }}</span>
            <span class="text-base font-bold text-amber-300">{{ biaData.body_composition?.fat_mass_kg }} {{ $t('common.kg') }} <span class="text-[10px] font-normal">({{ biaData.body_composition?.body_fat_percent }}%)</span></span>
          </div>
          <div class="p-2.5 rounded-xl bg-gray-950/60 border border-gray-800/80">
            <span class="text-[10px] text-emerald-400 block">{{ $t('bia.fatFreeMass') }}</span>
            <span class="text-base font-bold text-emerald-300">{{ biaData.body_composition?.fat_free_mass_kg }} {{ $t('common.kg') }}</span>
          </div>
          <div class="p-2.5 rounded-xl bg-gray-950/60 border border-gray-800/80">
            <span class="text-[10px] text-violet-400 block">{{ $t('bia.skeletalMuscleMass') }}</span>
            <span class="text-base font-bold text-violet-300">{{ biaData.body_composition?.skeletal_muscle_mass_kg }} {{ $t('common.kg') }} <span class="text-[10px] font-normal">({{ $t('bia.smiLabel', { smi: biaData.body_composition?.skeletal_muscle_index_smi }) }})</span></span>
          </div>
        </div>
      </div>

      <!-- 3. Analyse Segmentaire Anatomique (5 zones) -->
      <div class="glass-card p-4 sm:p-5 rounded-2xl space-y-3 border border-gray-800">
        <h3 class="text-xs font-bold text-violet-400 uppercase tracking-wider flex items-center gap-2">
          <Activity class="w-4 h-4" />
          {{ $t('bia.segmentalDistributionTitle') }}
        </h3>
        
        <div class="space-y-2.5">
          <!-- Tronc -->
          <div class="p-3 rounded-xl bg-gray-950/70 border border-gray-800/90 flex items-center justify-between">
            <span class="text-xs font-bold text-gray-200">🫁 {{ $t('bia.trunk') }}</span>
            <div class="flex items-center gap-4 text-xs">
              <span class="text-emerald-400">{{ $t('bia.muscleFull') }}: <strong>{{ biaData.segmental_analysis?.muscle_mass?.trunk_kg }} {{ $t('common.kg') }}</strong></span>
              <span class="text-amber-400">{{ $t('bia.fatFull') }}: <strong>{{ biaData.segmental_analysis?.fat_mass?.trunk_kg }} {{ $t('common.kg') }}</strong></span>
            </div>
          </div>

          <!-- Bras -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div class="p-3 rounded-xl bg-gray-950/70 border border-gray-800/90 flex items-center justify-between">
              <span class="text-xs font-bold text-gray-200">💪 {{ $t('bia.rightArm') }}</span>
              <div class="flex items-center gap-3 text-xs">
                <span class="text-emerald-400">{{ $t('bia.muscleAbbr') }}: <strong>{{ biaData.segmental_analysis?.muscle_mass?.right_arm_kg }} {{ $t('common.kg') }}</strong></span>
                <span class="text-amber-400">{{ $t('bia.fatAbbr') }}: <strong>{{ biaData.segmental_analysis?.fat_mass?.right_arm_kg }} {{ $t('common.kg') }}</strong></span>
              </div>
            </div>
            <div class="p-3 rounded-xl bg-gray-950/70 border border-gray-800/90 flex items-center justify-between">
              <span class="text-xs font-bold text-gray-200">💪 {{ $t('bia.leftArm') }}</span>
              <div class="flex items-center gap-3 text-xs">
                <span class="text-emerald-400">{{ $t('bia.muscleAbbr') }}: <strong>{{ biaData.segmental_analysis?.muscle_mass?.left_arm_kg }} {{ $t('common.kg') }}</strong></span>
                <span class="text-amber-400">{{ $t('bia.fatAbbr') }}: <strong>{{ biaData.segmental_analysis?.fat_mass?.left_arm_kg }} {{ $t('common.kg') }}</strong></span>
              </div>
            </div>
          </div>

          <!-- Jambes -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div class="p-3 rounded-xl bg-gray-950/70 border border-gray-800/90 flex items-center justify-between">
              <span class="text-xs font-bold text-gray-200">🦵 {{ $t('bia.rightLeg') }}</span>
              <div class="flex items-center gap-3 text-xs">
                <span class="text-emerald-400">{{ $t('bia.muscleAbbr') }}: <strong>{{ biaData.segmental_analysis?.muscle_mass?.right_leg_kg }} {{ $t('common.kg') }}</strong></span>
                <span class="text-amber-400">{{ $t('bia.fatAbbr') }}: <strong>{{ biaData.segmental_analysis?.fat_mass?.right_leg_kg }} {{ $t('common.kg') }}</strong></span>
              </div>
            </div>
            <div class="p-3 rounded-xl bg-gray-950/70 border border-gray-800/90 flex items-center justify-between">
              <span class="text-xs font-bold text-gray-200">🦵 {{ $t('bia.leftLeg') }}</span>
              <div class="flex items-center gap-3 text-xs">
                <span class="text-emerald-400">{{ $t('bia.muscleAbbr') }}: <strong>{{ biaData.segmental_analysis?.muscle_mass?.left_leg_kg }} {{ $t('common.kg') }}</strong></span>
                <span class="text-amber-400">{{ $t('bia.fatAbbr') }}: <strong>{{ biaData.segmental_analysis?.fat_mass?.left_leg_kg }} {{ $t('common.kg') }}</strong></span>
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
            {{ $t('bia.waterCompartmentsTitle') }}
          </h4>
          <div class="text-xs text-gray-300 space-y-1.5 pt-1">
            <div class="flex justify-between">
              <span class="text-gray-400">{{ $t('bia.tbw') }}</span>
              <span class="font-bold text-white">{{ biaData.body_composition?.total_water_kg }} {{ $t('common.kg') }} ({{ biaData.body_composition?.total_water_percent }}%)</span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-400">{{ $t('bia.icw') }}</span>
              <span class="font-bold text-white">{{ biaData.body_composition?.intracellular_water_kg }} {{ $t('common.kg') }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-400">{{ $t('bia.ecw') }}</span>
              <span class="font-bold text-white">{{ biaData.body_composition?.extracellular_water_kg }} {{ $t('common.kg') }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-400">{{ $t('bia.ecwTbwRatio') }}</span>
              <span class="font-bold text-blue-400">{{ biaData.body_composition?.ecw_tbw_ratio }}</span>
            </div>
          </div>
        </div>

        <!-- Santé Métabolique -->
        <div class="glass-card p-4 rounded-2xl space-y-2 border border-gray-800">
          <h4 class="text-xs font-bold text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
            <Heart class="w-3.5 h-3.5" />
            {{ $t('bia.healthMetabolismTitle') }}
          </h4>
          <div class="text-xs text-gray-300 space-y-1.5 pt-1">
            <div class="flex justify-between">
              <span class="text-gray-400">{{ $t('bia.vfl') }}</span>
              <span class="font-bold text-amber-400">{{ $t('bia.vflLevel', { level: biaData.body_composition?.visceral_fat_level }) }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-400">{{ $t('bia.whr') }}</span>
              <span class="font-bold text-white">{{ biaData.body_composition?.waist_to_hip_ratio_whr }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-400">{{ $t('bia.bmr') }}</span>
              <span class="font-bold text-white">{{ $t('bia.bmrUnit', { calories: biaData.body_composition?.bmr_kcal }) }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-400">{{ $t('bia.mineralsProteins') }}</span>
              <span class="font-bold text-white">{{ biaData.body_composition?.bone_mineral_salt_kg }} {{ $t('common.kg') }} / {{ biaData.body_composition?.protein_mass_kg }} {{ $t('common.kg') }}</span>
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
        {{ $t('bia.closeReportBtn') }}
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
