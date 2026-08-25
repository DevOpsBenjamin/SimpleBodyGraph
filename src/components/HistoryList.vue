<template>
  <div v-if="store.logs.length === 0" class="glass-card p-10 rounded-3xl text-center flex flex-col items-center justify-center">
    <div class="w-16 h-16 bg-gray-950 rounded-2xl flex items-center justify-center border border-gray-800/60 text-gray-500 mb-4">
      <Calendar class="w-8 h-8" />
    </div>
    <h3 class="text-lg font-semibold text-white mb-1">Aucune pesée</h3>
    <p class="text-sm text-gray-400 max-w-xs mb-6">Vos pesées enregistrées apparaîtront ici.</p>
    <button 
      @click="store.showAddModal = true"
      class="px-4 py-2 bg-violet-600 hover:bg-violet-500 active:bg-violet-700 text-white font-medium rounded-xl transition-all duration-200 flex items-center gap-2 cursor-pointer"
    >
      <Plus class="w-4 h-4" /> Ajouter une pesée
    </button>
  </div>

  <div v-else class="space-y-3 max-w-2xl">
    <div 
      v-for="log in store.logsWithEstimates" 
      :key="log.id"
      class="glass-card hover:bg-gray-900/30 p-4 rounded-2xl flex items-center justify-between transition-all duration-300"
    >
      <!-- Details -->
      <div class="flex items-center gap-4">
        <!-- Date Circle -->
        <div class="flex flex-col items-center justify-center w-12 h-12 rounded-xl bg-gray-900 border border-gray-800 text-center">
          <span class="text-[10px] text-gray-400 uppercase leading-none font-semibold">{{ formatMonth(log.date) }}</span>
          <span class="text-lg font-bold text-white leading-none mt-0.5">{{ formatDay(log.date) }}</span>
        </div>
        
        <!-- Metrics Info -->
        <div class="flex flex-wrap items-center gap-x-5 gap-y-2">
          <div>
            <div class="text-xs text-gray-400">Poids</div>
            <div class="text-sm font-bold text-white flex items-baseline gap-1">
              <span>{{ Number(log.mass).toFixed(2) }} <span class="text-[10px] font-normal text-gray-400">kg</span></span>
            </div>
          </div>
          <div>
            <div class="text-xs text-gray-400">Masse Grasse</div>
            <div class="text-sm font-bold text-amber-400 flex items-baseline gap-1">
              <span>{{ Number(log.fat_mass).toFixed(2) }} <span class="text-[10px] font-normal text-gray-500">kg</span></span>
            </div>
          </div>
          <div>
            <div class="text-xs text-gray-400">% Gras</div>
            <div class="text-sm font-bold text-blue-400 flex items-baseline gap-1">
              <span>{{ Number(log.body_fat).toFixed(1) }} <span class="text-[10px] font-normal text-gray-400">%</span></span>
            </div>
          </div>
          <div>
            <div class="text-xs text-gray-400">Masse Maigre</div>
            <div class="text-sm font-bold text-emerald-400 flex items-baseline gap-1">
              <span>{{ Number(log.lean_mass).toFixed(2) }} <span class="text-[10px] font-normal text-gray-500">kg</span></span>
            </div>
          </div>

          <!-- BIA Badge Button -->
          <button
            v-if="hasBia(log)"
            type="button"
            @click="openBiaModal(log)"
            class="px-2 py-1 rounded-lg bg-violet-600/20 hover:bg-violet-600/30 text-violet-300 border border-violet-500/30 text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-sm"
            title="Voir le rapport clinique BIA"
          >
            <Zap class="w-3 h-3 text-violet-400" />
            <span>BIA</span>
          </button>
        </div>
      </div>

      <!-- Sync Status and Action -->
      <div class="flex items-center gap-3">
        <!-- Sync Icon Indicator -->
        <div :title="log.synced ? 'Synchronisé dans le Cloud' : 'Stocké localement'">
          <CloudCheck v-if="log.synced" class="w-4 h-4 text-emerald-400" />
          <div v-else class="flex items-center justify-center relative">
            <span class="absolute w-3 h-3 rounded-full bg-amber-400/20 animate-ping"></span>
            <CloudLightning class="w-4 h-4 text-amber-400 relative z-10" />
          </div>
        </div>

        <!-- Edit Button -->
        <button 
          @click="store.setEditingLog(log)"
          class="p-2 rounded-xl hover:bg-violet-500/10 text-gray-500 hover:text-violet-400 active:bg-violet-500/20 transition-all duration-200 cursor-pointer"
          title="Modifier"
        >
          <Edit3 class="w-4 h-4" />
        </button>

        <!-- Delete Button -->
        <button 
          @click="handleDelete(log.id)"
          class="p-2 rounded-xl hover:bg-rose-500/10 text-gray-500 hover:text-rose-400 active:bg-rose-500/20 transition-all duration-200 cursor-pointer"
          title="Supprimer"
        >
          <Trash2 class="w-4.5 h-4.5" />
        </button>
      </div>
    </div>

    <!-- BIA Modal for Selected Log -->
    <BiaDetailModal
      :is-open="isBiaModalOpen"
      :title="selectedLogBiaTitle"
      :bia-data="selectedLogBia"
      @close="isBiaModalOpen = false"
    />
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { Calendar, Trash2, Plus, Cloud as CloudCheck, CloudLightning, Edit3, Zap } from 'lucide-vue-next';
import { useBodyGraphStore } from '../stores/bodyGraph';
import { useConfirm } from '../composables/useConfirm';
import { useToast } from '../composables/useToast';
import { defaultBiaEngine } from '../services/bia/biaCalculator';
import BiaDetailModal from './BiaDetailModal.vue';

const store = useBodyGraphStore();
const { confirm } = useConfirm();
const { showToast } = useToast();

const isBiaModalOpen = ref(false);
const selectedLogBia = ref(null);
const selectedLogBiaTitle = ref('');

const hasBia = (log) => {
  return log?.impedances?.r_50k?.length >= 6 && log?.impedances?.r_250k?.length >= 6;
};

const openBiaModal = (log) => {
  const sex = store.profile?.gender === 'female' ? 0 : 1;
  const age = store.userAge || 34;
  const height_cm = store.profile?.height ? Number(store.profile.height) : 175.0;

  selectedLogBia.value = defaultBiaEngine.analyze({
    sex,
    age,
    height_cm,
    weight_kg: Number(log.mass),
    resistances_50k: log.impedances.r_50k,
    resistances_250k: log.impedances.r_250k,
    raw_fat_rate: Number(log.body_fat),
    heart_rate_bpm: log.heart_rate ? Number(log.heart_rate) : null
  });
  selectedLogBiaTitle.value = `Pesée BIA du ${log.date}`;
  isBiaModalOpen.value = true;
};

const formatMonth = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleString('fr-FR', { month: 'short', timeZone: 'UTC' });
};

const formatDay = (dateString) => {
  const date = new Date(dateString);
  return date.getUTCDate();
};

const handleDelete = async (id) => {
  const isConfirmed = await confirm({
    title: 'Supprimer la pesée ?',
    message: 'Êtes-vous sûr de vouloir supprimer cette pesée ? Cette action est irréversible.',
    confirmText: 'Supprimer',
    cancelText: 'Annuler'
  });

  if (isConfirmed) {
    try {
      await store.deleteLogEntry(id);
      showToast('Pesée supprimée avec succès', 'success');
    } catch (err) {
      showToast('Échec de la suppression', 'error');
    }
  }
};
</script>
