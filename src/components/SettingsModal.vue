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
      ref="modalCardRef"
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-modal-title"
      class="w-full sm:max-w-2xl bg-gray-900 border-t sm:border border-gray-800 rounded-t-3xl sm:rounded-3xl p-5 sm:p-7 relative z-10 shadow-2xl shadow-black max-h-[92vh] flex flex-col transform translate-y-0 transition-all duration-300 animate-fade-in font-sans text-gray-100"
    >
      <!-- Modal Header -->
      <div class="flex items-center justify-between pb-4 border-b border-gray-800/80">
        <h2 id="settings-modal-title" class="text-xl font-bold text-white flex items-center gap-2.5">
          <Settings class="w-5 h-5 text-violet-400" />
          Paramètres & Configuration
        </h2>
        <button 
          @click="closeModal"
          class="p-1.5 rounded-xl bg-gray-800 hover:bg-gray-750 text-gray-400 hover:text-white transition-all duration-200 cursor-pointer"
          aria-label="Fermer la fenêtre"
        >
          <X class="w-5 h-5" />
        </button>
      </div>

      <!-- Settings Sub-Navigation Tabs -->
      <div class="flex items-center gap-1.5 p-1.5 mt-4 mb-5 bg-gray-950/80 border border-gray-800/80 rounded-2xl overflow-x-auto">
        <button
          type="button"
          @click="activeSubTab = 'goals'"
          :class="[
            'flex-1 py-2 px-3 text-xs font-semibold rounded-xl transition-all duration-200 cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap',
            activeSubTab === 'goals'
              ? 'bg-violet-600/25 text-violet-300 border border-violet-500/30 shadow-md shadow-violet-500/10'
              : 'text-gray-400 hover:text-gray-200 hover:bg-gray-900/60 border border-transparent'
          ]"
        >
          <Target class="w-3.5 h-3.5" />
          <span>Objectifs</span>
        </button>

        <button
          type="button"
          @click="activeSubTab = 'profile'"
          :class="[
            'flex-1 py-2 px-3 text-xs font-semibold rounded-xl transition-all duration-200 cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap',
            activeSubTab === 'profile'
              ? 'bg-violet-600/25 text-violet-300 border border-violet-500/30 shadow-md shadow-violet-500/10'
              : 'text-gray-400 hover:text-gray-200 hover:bg-gray-900/60 border border-transparent'
          ]"
        >
          <User class="w-3.5 h-3.5" />
          <span>Profil (BIA)</span>
        </button>

        <button
          type="button"
          @click="activeSubTab = 'devices'"
          :class="[
            'flex-1 py-2 px-3 text-xs font-semibold rounded-xl transition-all duration-200 cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap',
            activeSubTab === 'devices'
              ? 'bg-violet-600/25 text-violet-300 border border-violet-500/30 shadow-md shadow-violet-500/10'
              : 'text-gray-400 hover:text-gray-200 hover:bg-gray-900/60 border border-transparent'
          ]"
        >
          <Scale class="w-3.5 h-3.5" />
          <span>Balances BLE</span>
        </button>

        <button
          type="button"
          @click="activeSubTab = 'data'"
          :class="[
            'flex-1 py-2 px-3 text-xs font-semibold rounded-xl transition-all duration-200 cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap',
            activeSubTab === 'data'
              ? 'bg-violet-600/25 text-violet-300 border border-violet-500/30 shadow-md shadow-violet-500/10'
              : 'text-gray-400 hover:text-gray-200 hover:bg-gray-900/60 border border-transparent'
          ]"
        >
          <Database class="w-3.5 h-3.5" />
          <span>Sauvegarde</span>
        </button>
      </div>

      <!-- Tab Content Area -->
      <div class="flex-1 overflow-y-auto pr-1 space-y-6">

        <!-- ======================================================== -->
        <!-- TAB 1 : GOALS & PALIERS                                  -->
        <!-- ======================================================== -->
        <div v-show="activeSubTab === 'goals'" class="space-y-6 animate-fade-in">
          <form @submit.prevent="handleSaveGoals" class="space-y-6">
            <div class="space-y-4">
              <div class="flex items-center justify-between">
                <div>
                  <span class="text-xs font-bold text-violet-400 uppercase tracking-wider block">Paliers de Progression</span>
                  <p class="text-[11px] text-gray-400">Configurez vos étapes intermédiaires et cibles finales.</p>
                </div>
                <button
                  type="button"
                  @click="addPalier"
                  class="text-xs bg-violet-600/20 hover:bg-violet-600/40 text-violet-300 px-3 py-1.5 rounded-xl font-semibold transition-all duration-200 flex items-center gap-1.5 cursor-pointer border border-violet-500/20"
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
                          'text-[10px] px-2.5 py-1 rounded-lg font-semibold transition-all duration-150 cursor-pointer flex items-center gap-1',
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
                        title="Supprimer ce palier"
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
            <div class="p-3.5 bg-violet-950/30 border border-violet-800/30 rounded-2xl flex gap-2.5 items-start">
              <Info class="w-4 h-4 text-violet-400 mt-0.5 flex-shrink-0" />
              <div class="text-[11px] leading-relaxed text-gray-400">
                <strong class="text-violet-300">💡 Conseil d'utilisation :</strong> Pour profiter pleinement du suivi et des projections de tendance, configurez au moins <span class="text-white font-semibold">2 paliers</span> (un palier intermédiaire et votre objectif final).
              </div>
            </div>

            <!-- Actions -->
            <div class="flex items-center gap-3 pt-2">
              <button 
                type="button"
                @click="clearGoals"
                class="flex-1 py-2.5 px-4 rounded-xl bg-gray-800 hover:bg-gray-750 text-gray-400 hover:text-white transition-all duration-200 text-xs font-semibold cursor-pointer border border-gray-700/30"
              >
                Vider la liste
              </button>
              
              <button 
                type="submit"
                :disabled="goalsLoading"
                class="flex-1 py-2.5 px-4 rounded-xl bg-violet-600 hover:bg-violet-500 active:scale-[0.98] text-white font-semibold text-xs transition-all duration-200 cursor-pointer shadow-lg shadow-violet-500/10 flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {{ goalsLoading ? 'Sauvegarde...' : 'Sauvegarder les Paliers' }}
              </button>
            </div>
          </form>
        </div>

        <!-- ======================================================== -->
        <!-- TAB 2 : BIA PROFILE                                      -->
        <!-- ======================================================== -->
        <div v-show="activeSubTab === 'profile'" class="space-y-6 animate-fade-in">
          <form @submit.prevent="handleSaveProfile" class="space-y-5">
            <div>
              <span class="text-xs font-bold text-violet-400 uppercase tracking-wider block">Profil Corporel (Bio-Impédance BIA)</span>
              <p class="text-[11px] text-gray-400 mt-0.5">Informations requises pour le calcul de votre composition corporelle sur balance connectée.</p>
            </div>

            <!-- Educational Alert -->
            <div class="p-3.5 bg-indigo-950/30 border border-indigo-800/30 rounded-2xl flex gap-3 items-start">
              <Sparkles class="w-4 h-4 text-indigo-400 mt-0.5 flex-shrink-0" />
              <div class="text-[11px] leading-relaxed text-gray-400">
                <strong class="text-indigo-300">ℹ️ Informations optionnelles :</strong> Ces données sont <span class="text-white font-semibold">entièrement facultatives</span> et conservées en local. Elles sont requises uniquement si vous synchronisez une balance Bluetooth afin de calculer précisément votre % de masse grasse et vos impédances 8 électrodes.
              </div>
            </div>

            <!-- Sexe Selection -->
            <div class="space-y-2">
              <label class="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Sexe biologique</label>
              <div class="grid grid-cols-3 gap-2.5">
                <button
                  type="button"
                  @click="profileForm.gender = 'male'"
                  :class="[
                    'py-2.5 px-3 rounded-xl border text-xs font-semibold transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer',
                    profileForm.gender === 'male'
                      ? 'bg-blue-600/20 border-blue-500/50 text-blue-300 shadow-md shadow-blue-500/10'
                      : 'bg-gray-950/60 border-gray-800 text-gray-400 hover:text-gray-200 hover:border-gray-700'
                  ]"
                >
                  <span class="text-sm">👨</span>
                  <span>Homme</span>
                </button>

                <button
                  type="button"
                  @click="profileForm.gender = 'female'"
                  :class="[
                    'py-2.5 px-3 rounded-xl border text-xs font-semibold transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer',
                    profileForm.gender === 'female'
                      ? 'bg-pink-600/20 border-pink-500/50 text-pink-300 shadow-md shadow-pink-500/10'
                      : 'bg-gray-950/60 border-gray-800 text-gray-400 hover:text-gray-200 hover:border-gray-700'
                  ]"
                >
                  <span class="text-sm">👩</span>
                  <span>Femme</span>
                </button>

                <button
                  type="button"
                  @click="profileForm.gender = null"
                  :class="[
                    'py-2.5 px-3 rounded-xl border text-xs font-semibold transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer',
                    profileForm.gender === null
                      ? 'bg-violet-600/20 border-violet-500/50 text-violet-300 shadow-md shadow-violet-500/10'
                      : 'bg-gray-950/60 border-gray-800 text-gray-400 hover:text-gray-200 hover:border-gray-700'
                  ]"
                >
                  <span class="text-sm">⚪</span>
                  <span>Non défini</span>
                </button>
              </div>
            </div>

            <!-- Date of Birth & Live Age calculation -->
            <div class="space-y-2">
              <div class="flex items-center justify-between">
                <label for="profile-birthdate" class="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Date de Naissance</label>
                <span v-if="calculatedAge !== null" class="text-[10px] font-bold text-violet-400 bg-violet-600/15 border border-violet-500/20 px-2 py-0.5 rounded-md">
                  Âge calculé : {{ calculatedAge }} ans
                </span>
              </div>
              <input
                id="profile-birthdate"
                type="date"
                v-model="profileForm.birthDate"
                class="w-full px-3.5 py-2.5 rounded-xl bg-gray-950 border border-gray-800 focus:border-violet-500/50 text-xs text-white"
              />
            </div>

            <!-- Height (cm) -->
            <div class="space-y-2">
              <label for="profile-height" class="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Taille (en cm)</label>
              <div class="relative">
                <input
                  id="profile-height"
                  type="number"
                  min="50"
                  max="250"
                  step="1"
                  placeholder="ex: 175"
                  v-model="profileForm.height"
                  class="w-full pl-3.5 pr-10 py-2.5 rounded-xl bg-gray-950 border border-gray-800 focus:border-violet-500/50 text-xs text-white"
                />
                <span class="absolute inset-y-0 right-3.5 flex items-center text-xs text-gray-500 font-semibold pointer-events-none">
                  cm
                </span>
              </div>
            </div>

            <!-- Submit Profile -->
            <div class="pt-2">
              <button 
                type="submit"
                :disabled="profileLoading"
                class="w-full py-2.5 px-4 rounded-xl bg-violet-600 hover:bg-violet-500 active:scale-[0.98] text-white font-semibold text-xs transition-all duration-200 cursor-pointer shadow-lg shadow-violet-500/10 flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {{ profileLoading ? 'Enregistrement...' : 'Sauvegarder le Profil BIA' }}
              </button>
            </div>
          </form>
        </div>

        <!-- ======================================================== -->
        <!-- TAB 3 : BLUETOOTH SCALES (MODULAR ARCHITECTURE READY)    -->
        <!-- ======================================================== -->
        <div v-show="activeSubTab === 'devices'" class="space-y-5 animate-fade-in">
          <div>
            <span class="text-xs font-bold text-violet-400 uppercase tracking-wider block">Balances Connectées (BLE)</span>
            <p class="text-[11px] text-gray-400 mt-0.5">Gérez vos périphériques de pesée et lancez vos acquisitions directes.</p>
          </div>

          <!-- Feature status badge -->
          <div class="p-4 bg-gray-950/80 border border-gray-800 rounded-2xl space-y-3">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2.5">
                <div class="w-8 h-8 rounded-xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center">
                  <Bluetooth class="w-4 h-4 text-violet-400" />
                </div>
                <div>
                  <h4 class="text-xs font-bold text-white leading-tight">HUAWEI Scale 3 / Scale 3 Pro</h4>
                  <p class="text-[10px] text-gray-400">Pilote autonome validé (HaigeBLE / HAG-B19 / HEM-B19)</p>
                </div>
              </div>
              <span class="text-[9px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold">
                Support Prêt
              </span>
            </div>

            <p class="text-[11px] text-gray-400 leading-relaxed">
              L'architecture modulaire permet l'appairage direct en 1 clic via l'application native Android pour récupérer votre poids, % de masse grasse, rythme cardiaque et impédances 8 électrodes sans manipulation manuelle.
            </p>

            <div class="pt-2 border-t border-gray-900 flex items-center justify-between">
              <span class="text-[10px] text-gray-500 font-medium">Capacitor BLE Plugin</span>
              <span class="text-[10px] text-violet-400 font-semibold">Issue #67 en cours</span>
            </div>
          </div>

          <!-- Extra Device info -->
          <div class="text-center py-6 text-xs text-gray-500 border border-dashed border-gray-800 rounded-2xl space-y-1">
            <Scale class="w-6 h-6 text-gray-600 mx-auto mb-1.5" />
            <p class="font-medium text-gray-400">Prêt pour l'appairage en 1 clic</p>
            <p class="text-[10px] text-gray-600">Le bouton d'association rapide sera disponible dès l'activation du driver BLE.</p>
          </div>
        </div>

        <!-- ======================================================== -->
        <!-- TAB 4 : DATA BACKUP & MIGRATION                          -->
        <!-- ======================================================== -->
        <div v-show="activeSubTab === 'data'" class="space-y-5 animate-fade-in">
          <div>
            <span class="text-xs font-bold text-violet-400 uppercase tracking-wider block">Sauvegarde & Migration</span>
            <p class="text-[11px] text-gray-400 mt-0.5">Exportez ou restaurez vos pesées, mensurations, paliers et profil corporel au format JSON.</p>
          </div>

          <div class="grid grid-cols-2 gap-3 pt-1">
            <button
              type="button"
              @click="handleExport"
              :disabled="exportLoading"
              class="py-3 px-3.5 rounded-2xl bg-gray-950 hover:bg-gray-850 active:scale-[0.98] text-gray-200 hover:text-white transition-all duration-200 text-xs font-semibold cursor-pointer border border-gray-800 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download class="w-4 h-4 text-violet-400" />
              <span>{{ exportLoading ? 'Export...' : 'Exporter (JSON)' }}</span>
            </button>

            <button
              type="button"
              @click="triggerFileInput"
              :disabled="importLoading"
              class="py-3 px-3.5 rounded-2xl bg-gray-950 hover:bg-gray-850 active:scale-[0.98] text-gray-200 hover:text-white transition-all duration-200 text-xs font-semibold cursor-pointer border border-gray-800 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Upload class="w-4 h-4 text-violet-400" />
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

          <div class="p-3.5 bg-gray-950/50 border border-gray-800/60 rounded-2xl">
            <div class="text-[11px] text-gray-400 leading-relaxed flex items-center gap-2">
              <Database class="w-4 h-4 text-gray-500 shrink-0" />
              <span>Le fichier JSON inclut l'intégralité de votre historique : pesées, mensurations, paliers et profil BIA.</span>
            </div>
          </div>
        </div>

      </div>

      <!-- Feedback Messages -->
      <div v-if="errorMsg" class="mt-4 text-xs text-rose-400 font-medium bg-rose-500/10 border border-rose-500/20 p-2.5 rounded-xl">
        {{ errorMsg }}
      </div>
      <div v-if="successMsg" class="mt-4 text-xs text-emerald-400 font-medium bg-emerald-500/10 border border-emerald-500/20 p-2.5 rounded-xl">
        {{ successMsg }}
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { 
  Settings, X, Trash2, Plus, CheckCircle, Info, Download, Upload, 
  Target, User, Scale, Database, Sparkles, Bluetooth 
} from 'lucide-vue-next';
import { useBodyGraphStore, calculateAge } from '../stores/bodyGraph';
import { useModalAccessibility } from '../composables/useModalAccessibility';

const store = useBodyGraphStore();
const modalCardRef = ref(null);

useModalAccessibility({
  isOpen: () => store.showSettingsModal,
  modalRef: modalCardRef,
  onClose: () => closeModal()
});

const activeSubTab = ref('goals'); // 'goals' | 'profile' | 'devices' | 'data'

// State for Goals Form
const paliers = ref([]);
const goalsLoading = ref(false);

// State for Profile Form
const profileForm = ref({
  gender: null,
  birthDate: '',
  height: ''
});
const profileLoading = ref(false);

const calculatedAge = computed(() => {
  return calculateAge(profileForm.value.birthDate);
});

// General Feedback
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

    profileForm.value = {
      gender: store.profile?.gender ?? null,
      birthDate: store.profile?.birthDate ?? '',
      height: store.profile?.height !== null && store.profile?.height !== undefined ? store.profile.height : ''
    };

    errorMsg.value = '';
    successMsg.value = '';
  }
});

const closeModal = () => {
  store.showSettingsModal = false;
};

// Goals Handlers
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

const handleSaveGoals = async () => {
  goalsLoading.value = true;
  errorMsg.value = '';
  successMsg.value = '';

  const formattedPaliers = [];
  for (let i = 0; i < paliers.value.length; i++) {
    const p = paliers.value[i];
    const massVal = p.mass === '' ? null : Number(p.mass);
    const fatVal = p.fat === '' ? null : Number(p.fat);

    if (massVal !== null && (isNaN(massVal) || massVal <= 0)) {
      errorMsg.value = `Palier ${i + 1} : Le poids doit être un nombre positif`;
      goalsLoading.value = false;
      return;
    }
    if (fatVal !== null && (isNaN(fatVal) || fatVal < 0 || fatVal > 100)) {
      errorMsg.value = `Palier ${i + 1} : Le taux de graisse doit être compris entre 0 et 100%`;
      goalsLoading.value = false;
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
      successMsg.value = '';
    }, 2000);
  } catch (error) {
    errorMsg.value = 'Échec de la sauvegarde des paliers : ' + error.message;
  } finally {
    goalsLoading.value = false;
  }
};

const clearGoals = async () => {
  paliers.value = [];
  await handleSaveGoals();
};

// Profile Handlers
const handleSaveProfile = async () => {
  profileLoading.value = true;
  errorMsg.value = '';
  successMsg.value = '';

  try {
    const hVal = profileForm.value.height === '' ? null : Number(profileForm.value.height);
    if (hVal !== null && (isNaN(hVal) || hVal < 50 || hVal > 250)) {
      errorMsg.value = 'Veuillez saisir une taille valide (entre 50 et 250 cm).';
      profileLoading.value = false;
      return;
    }

    await store.updateProfile({
      gender: profileForm.value.gender,
      birthDate: profileForm.value.birthDate || null,
      height: hVal
    });

    successMsg.value = 'Profil BIA sauvegardé avec succès !';
    setTimeout(() => {
      successMsg.value = '';
    }, 2000);
  } catch (error) {
    errorMsg.value = 'Échec de la sauvegarde du profil : ' + error.message;
  } finally {
    profileLoading.value = false;
  }
};

// Data Export / Import Handlers
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
    successMsg.value = `Export réussi (${totalLogs} pesées, ${totalM} mensurations, profil inclus) !`;
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

      profileForm.value = {
        gender: store.profile?.gender ?? null,
        birthDate: store.profile?.birthDate ?? '',
        height: store.profile?.height !== null && store.profile?.height !== undefined ? store.profile.height : ''
      };
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