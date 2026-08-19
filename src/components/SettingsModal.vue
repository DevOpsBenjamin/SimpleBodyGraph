<template>
  <div 
    v-if="store.showSettingsModal" 
    class="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 transition-all duration-300"
  >
    <!-- Backdrop -->
    <div 
      @click="closeModal" 
      class="absolute inset-0 bg-black/60 backdrop-blur-sm"
    ></div>

    <!-- Modal Card -->
    <div 
      class="w-full sm:max-w-lg bg-gray-900 border-t sm:border border-gray-800 rounded-t-3xl sm:rounded-3xl p-6 relative z-10 shadow-2xl shadow-black max-h-[90vh] overflow-y-auto transform translate-y-0 transition-all duration-300 animate-fade-in font-sans text-gray-100"
    >
      <!-- Modal Header -->
      <div class="flex items-center justify-between mb-6">
        <h2 class="text-xl font-bold text-white flex items-center gap-2">
          <Settings class="w-5 h-5 text-violet-400" />
          Configuration des Paliers
        </h2>
        <button 
          @click="closeModal"
          class="p-1.5 rounded-lg bg-gray-800 hover:bg-gray-750 text-gray-400 hover:text-white transition-all duration-200 cursor-pointer"
        >
          <X class="w-5 h-5" />
        </button>
      </div>

      <!-- Goals Form -->
      <form @submit.prevent="handleSave" class="space-y-6">

        <div class="space-y-4">
          <div class="flex items-center justify-between">
            <span class="text-xs font-bold text-violet-400 uppercase tracking-wider">Liste de vos objectifs</span>
            <button
              type="button"
              @click="addPalier"
              class="text-xs bg-violet-600/20 hover:bg-violet-600/40 text-violet-300 px-3 py-1.5 rounded-lg font-semibold transition-all duration-200 flex items-center gap-1 cursor-pointer"
            >
              <Plus class="w-3.5 h-3.5" /> Ajouter un palier
            </button>
          </div>

          <!-- Paliers list -->
          <div v-if="paliers.length === 0" class="text-center py-8 text-xs text-gray-500 border border-dashed border-gray-800 rounded-2xl">
            Aucun palier configuré. Ajoutez votre premier objectif pour commencer !
          </div>

          <div v-else class="space-y-3">
            <div
              v-for="(palier, index) in paliers"
              :key="palier.id"
              class="bg-gray-950/60 border border-gray-800/80 p-3.5 rounded-2xl relative flex flex-col gap-3 group transition-all duration-200 hover:border-violet-500/20"
            >
              <!-- Palier Header / Actions -->
              <div class="flex items-center justify-between">
                <span class="text-xs font-bold text-gray-300 flex items-center gap-1.5">
                  <span class="w-2 h-2 rounded-full bg-violet-500"></span>
                  Palier {{ index + 1 }}
                </span>
                <div class="flex items-center gap-2">
                  <!-- Manual Toggle Validation -->
                  <button
                    type="button"
                    @click="toggleValidation(index)"
                    :class="[
                      'text-[10px] px-2 py-1 rounded-md font-semibold transition-all duration-150 cursor-pointer flex items-center gap-1',
                      palier.validated
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : 'bg-gray-800 text-gray-400 hover:text-white border border-transparent'
                    ]"
                  >
                    <CheckCircle class="w-3.5 h-3.5" />
                    <span>{{ palier.validated ? 'Validé' : 'Non validé' }}</span>
                  </button>

                  <!-- Delete -->
                  <button
                    type="button"
                    @click="removePalier(index)"
                    class="p-1 rounded-lg hover:bg-rose-500/10 text-gray-500 hover:text-rose-400 transition-colors cursor-pointer"
                  >
                    <Trash2 class="w-4 h-4" />
                  </button>
                </div>
              </div>

              <!-- Inputs -->
              <div class="grid grid-cols-2 gap-3">
                <div class="space-y-1">
                  <label :for="'palier-weight-' + index" class="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">Poids Cible</label>
                  <div class="relative">
                    <input
                      :id="'palier-weight-' + index"
                      type="number"
                      step="0.01"
                      min="0"
                      max="999"
                      v-model="palier.mass"
                      placeholder="ex: 85.0"
                      class="w-full px-3 py-2 rounded-xl bg-gray-900 border border-gray-800 focus:border-violet-500/40 text-xs text-white"
                    />
                    <span class="absolute inset-y-0 right-3 flex items-center text-[10px] text-gray-500 font-medium pointer-events-none">
                      kg
                    </span>
                  </div>
                </div>

                <div class="space-y-1">
                  <label :for="'palier-fat-' + index" class="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">Taux de Fat</label>
                  <div class="relative">
                    <input
                      :id="'palier-fat-' + index"
                      type="number"
                      step="0.1"
                      min="0"
                      max="100"
                      v-model="palier.fat"
                      placeholder="ex: 20.0"
                      class="w-full px-3 py-2 rounded-xl bg-gray-900 border border-gray-800 focus:border-violet-500/40 text-xs text-white"
                    />
                    <span class="absolute inset-y-0 right-3 flex items-center text-[10px] text-gray-500 font-medium pointer-events-none">
                      %
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Tip Note -->
        <div class="p-3 bg-violet-950/30 border border-violet-800/30 rounded-2xl flex gap-2.5 items-start">
          <Info class="w-4 h-4 text-violet-400 mt-0.5 flex-shrink-0" />
          <div class="text-[11px] leading-relaxed text-gray-400">
            <strong class="text-violet-300">💡 Conseil d'utilisation :</strong> Pour profiter pleinement de toutes les fonctionnalités de suivi et de tendance, nous vous recommandons de configurer au moins <span class="text-white font-semibold">2 paliers</span> (un palier intermédiaire en Palier 1, et votre objectif final en Palier 2). Si votre objectif final est encore éloigné, l'ajout de <span class="text-white font-semibold">3 ou 4 paliers</span> intermédiaires est vivement conseillé pour optimiser vos progrès.
          </div>
        </div>

        <!-- Backup & Migration Section -->
        <div class="space-y-3 pt-3 border-t border-gray-800/80">
          <div class="flex items-center justify-between">
            <span class="text-xs font-bold text-violet-400 uppercase tracking-wider">Sauvegarde & Migration</span>
          </div>
          <p class="text-[11px] text-gray-400 leading-relaxed">
            Exportez vos pesées, mensurations et paliers au format JSON pour sauvegarder vos données ou les migrer.
          </p>

          <div class="grid grid-cols-2 gap-3">
            <button
              type="button"
              @click="handleExport"
              :disabled="exportLoading"
              class="py-2.5 px-3 rounded-xl bg-gray-800 hover:bg-gray-750 active:scale-[0.98] text-gray-200 hover:text-white transition-all duration-200 text-xs font-semibold cursor-pointer border border-gray-700/50 flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed font-sans"
            >
              <Download class="w-3.5 h-3.5 text-violet-400" />
              <span>{{ exportLoading ? 'Export...' : 'Exporter (JSON)' }}</span>
            </button>

            <button
              type="button"
              @click="triggerFileInput"
              :disabled="importLoading"
              class="py-2.5 px-3 rounded-xl bg-gray-800 hover:bg-gray-750 active:scale-[0.98] text-gray-200 hover:text-white transition-all duration-200 text-xs font-semibold cursor-pointer border border-gray-700/50 flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed font-sans"
            >
              <Upload class="w-3.5 h-3.5 text-violet-400" />
              <span>{{ importLoading ? 'Import...' : 'Importer (JSON)' }}</span>
            </button>
            <input
              ref="fileInputRef"
              type="file"
              accept=".json,application/json"
              class="hidden"
              @change="handleFileImport"
            />
          </div>
        </div>

        <!-- Feedback Messages -->
        <div v-if="errorMsg" class="text-xs text-rose-400 font-medium bg-rose-500/10 border border-rose-500/20 p-2.5 rounded-xl">
          {{ errorMsg }}
        </div>
        <div v-if="successMsg" class="text-xs text-emerald-400 font-medium bg-emerald-500/10 border border-emerald-500/20 p-2.5 rounded-xl">
          {{ successMsg }}
        </div>

        <!-- Actions -->
        <div class="flex items-center gap-3 pt-2">
          <button 
            type="button"
            @click="clearGoals"
            class="flex-1 py-2.5 px-4 rounded-xl bg-gray-800 hover:bg-gray-750 text-gray-400 hover:text-white transition-all duration-200 text-xs font-semibold cursor-pointer border border-gray-700/30 font-sans"
          >
            Vider la liste
          </button>
          
          <button 
            type="submit"
            :disabled="loading"
            class="flex-1 py-2.5 px-4 rounded-xl bg-violet-600 hover:bg-violet-500 active:scale-[0.98] text-white font-semibold text-xs transition-all duration-200 cursor-pointer shadow-lg shadow-violet-500/10 flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed font-sans"
          >
            {{ loading ? 'Sauvegarde...' : 'Sauvegarder' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue';
import { Settings, X, Trash2, Plus, CheckCircle, Info, Download, Upload } from 'lucide-vue-next';
import { useBodyGraphStore } from '../stores/bodyGraph';

const store = useBodyGraphStore();

const paliers = ref([]);
const loading = ref(false);
const errorMsg = ref('');
const successMsg = ref('');

// Watch store state changes to sync values in inputs
watch(() => store.showSettingsModal, (isOpen) => {
  if (isOpen) {
    paliers.value = store.paliers.map(p => ({
      id: p.id || crypto.randomUUID(),
      mass: p.mass !== null && p.mass !== undefined ? p.mass : '',
      fat: p.fat !== null && p.fat !== undefined ? p.fat : '',
      validated: !!p.validated
    }));
    errorMsg.value = '';
    successMsg.value = '';
  }
});

const closeModal = () => {
  store.showSettingsModal = false;
};

const addPalier = () => {
  paliers.value.push({
    id: crypto.randomUUID(),
    mass: '',
    fat: '',
    validated: false
  });
};

const removePalier = (index) => {
  paliers.value.splice(index, 1);
};

const toggleValidation = (index) => {
  paliers.value[index].validated = !paliers.value[index].validated;
};

const handleSave = async () => {
  loading.value = true;
  errorMsg.value = '';
  successMsg.value = '';

  // Validate the inputs
  const formattedPaliers = [];
  for (let i = 0; i < paliers.value.length; i++) {
    const p = paliers.value[i];
    const massVal = p.mass === '' ? null : Number(p.mass);
    const fatVal = p.fat === '' ? null : Number(p.fat);

    if (massVal !== null && (isNaN(massVal) || massVal <= 0)) {
      errorMsg.value = `Palier ${i + 1} : Le poids doit être un nombre positif`;
      loading.value = false;
      return;
    }
    if (fatVal !== null && (isNaN(fatVal) || fatVal < 0 || fatVal > 100)) {
      errorMsg.value = `Palier ${i + 1} : Le taux de graisse doit être compris entre 0 et 100%`;
      loading.value = false;
      return;
    }

    formattedPaliers.push({
      id: p.id,
      mass: massVal,
      fat: fatVal,
      validated: p.validated
    });
  }

  try {
    await store.updatePaliers(formattedPaliers);
    successMsg.value = 'Objectifs sauvegardés avec succès !';
    setTimeout(() => {
      closeModal();
    }, 800);
  } catch (error) {
    errorMsg.value = 'Échec de la sauvegarde : ' + error.message;
  } finally {
    loading.value = false;
  }
};

const clearGoals = async () => {
  paliers.value = [];
  await handleSave();
};

const fileInputRef = ref(null);
const exportLoading = ref(false);
const importLoading = ref(false);

const handleExport = async () => {
  exportLoading.value = true;
  errorMsg.value = '';
  successMsg.value = '';
  try {
    const data = await store.exportData();
    const totalLogs = data.logs?.length || 0;
    const totalM = data.measurements?.length || 0;
    successMsg.value = `Export réussi (${totalLogs} pesées, ${totalM} mensurations) !`;
  } catch (err) {
    errorMsg.value = "Échec de l'export : " + (err.message || err);
  } finally {
    exportLoading.value = false;
  }
};

const triggerFileInput = () => {
  if (fileInputRef.value) {
    fileInputRef.value.value = '';
    fileInputRef.value.click();
  }
};

const handleFileImport = async (event) => {
  const file = event.target?.files?.[0];
  if (!file) return;

  importLoading.value = true;
  errorMsg.value = '';
  successMsg.value = '';

  const reader = new FileReader();
  reader.onload = async (e) => {
    try {
      const content = e.target.result;
      const res = await store.importData(content);
      successMsg.value = `Import réussi : ${res.importedLogsCount} pesées, ${res.importedMeasurementsCount} mensurations restaurées !`;

      // Update local paliers in modal state
      paliers.value = store.paliers.map(p => ({
        id: p.id || crypto.randomUUID(),
        mass: p.mass !== null && p.mass !== undefined ? p.mass : '',
        fat: p.fat !== null && p.fat !== undefined ? p.fat : '',
        validated: !!p.validated
      }));
    } catch (err) {
      errorMsg.value = "Échec de l'import : " + (err.message || err);
    } finally {
      importLoading.value = false;
    }
  };
  reader.onerror = () => {
    errorMsg.value = 'Erreur lors de la lecture du fichier.';
    importLoading.value = false;
  };
  reader.readAsText(file);
};
</script>

<style scoped>
.animate-fade-in {
  animation: fadeIn 0.2s ease-out forwards;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>