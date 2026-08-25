<template>
  <div class="space-y-6">
    <!-- Section 1 : Cartes de Synthèse (Haut de page) -->
    <div class="glass-card p-5 sm:p-6 rounded-3xl space-y-4">
      <div class="flex items-center justify-between pb-3 border-b border-gray-800/80">
        <div>
          <h3 class="text-sm sm:text-base font-bold text-white flex items-center gap-2">
            <LayoutGrid class="w-4 h-4 text-violet-400" />
            Cartes de Synthèse (KPIs Dashboard)
          </h3>
          <p class="text-xs text-gray-400 mt-0.5">
            Choisissez les métriques à afficher dans les cartes en haut du tableau de bord.
          </p>
        </div>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
        <!-- 1. Poids Total -->
        <label class="flex items-center justify-between p-3.5 rounded-2xl bg-gray-950/60 border border-gray-800/80 hover:border-violet-500/30 transition-all cursor-pointer select-none">
          <div class="flex items-center gap-3">
            <div class="w-8 h-8 rounded-xl bg-violet-600/20 text-violet-400 flex items-center justify-center">
              <Scale class="w-4 h-4" />
            </div>
            <div>
              <span class="text-xs font-bold text-white block">Poids Total</span>
              <span class="text-[10px] text-gray-400">Masse globale en kg</span>
            </div>
          </div>
          <input 
            type="checkbox" 
            v-model="localPrefs.cards.mass" 
            @change="savePreferences"
            class="w-4 h-4 rounded text-violet-600 focus:ring-violet-500 focus:ring-offset-gray-900 cursor-pointer accent-violet-600"
          />
        </label>

        <!-- 2. Masse Grasse (kg) -->
        <label class="flex items-center justify-between p-3.5 rounded-2xl bg-gray-950/60 border border-gray-800/80 hover:border-amber-500/30 transition-all cursor-pointer select-none">
          <div class="flex items-center gap-3">
            <div class="w-8 h-8 rounded-xl bg-amber-600/20 text-amber-400 flex items-center justify-center">
              <Flame class="w-4 h-4" />
            </div>
            <div>
              <span class="text-xs font-bold text-white block">Masse Grasse (kg)</span>
              <span class="text-[10px] text-gray-400">Poids du tissu adipeux</span>
            </div>
          </div>
          <input 
            type="checkbox" 
            v-model="localPrefs.cards.fatMass" 
            @change="savePreferences"
            class="w-4 h-4 rounded text-violet-600 focus:ring-violet-500 focus:ring-offset-gray-900 cursor-pointer accent-amber-500"
          />
        </label>

        <!-- 3. % de Masse Grasse -->
        <label class="flex items-center justify-between p-3.5 rounded-2xl bg-gray-950/60 border border-gray-800/80 hover:border-blue-500/30 transition-all cursor-pointer select-none">
          <div class="flex items-center gap-3">
            <div class="w-8 h-8 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center">
              <Percent class="w-4 h-4" />
            </div>
            <div>
              <span class="text-xs font-bold text-white block">% Masse Grasse</span>
              <span class="text-[10px] text-gray-400">Taux d'adiposité en %</span>
            </div>
          </div>
          <input 
            type="checkbox" 
            v-model="localPrefs.cards.bodyFat" 
            @change="savePreferences"
            class="w-4 h-4 rounded text-violet-600 focus:ring-violet-500 focus:ring-offset-gray-900 cursor-pointer accent-blue-500"
          />
        </label>

        <!-- 4. Masse Maigre (kg) -->
        <label class="flex items-center justify-between p-3.5 rounded-2xl bg-gray-950/60 border border-gray-800/80 hover:border-emerald-500/30 transition-all cursor-pointer select-none">
          <div class="flex items-center gap-3">
            <div class="w-8 h-8 rounded-xl bg-emerald-600/20 text-emerald-400 flex items-center justify-center">
              <Dumbbell class="w-4 h-4" />
            </div>
            <div>
              <span class="text-xs font-bold text-white block">Masse Maigre (kg)</span>
              <span class="text-[10px] text-gray-400">Muscles, os, eau et organes</span>
            </div>
          </div>
          <input 
            type="checkbox" 
            v-model="localPrefs.cards.leanMass" 
            @change="savePreferences"
            class="w-4 h-4 rounded text-violet-600 focus:ring-violet-500 focus:ring-offset-gray-900 cursor-pointer accent-emerald-500"
          />
        </label>
      </div>
    </div>

    <!-- Section 2 : Graphiques de Tendance -->
    <div class="glass-card p-5 sm:p-6 rounded-3xl space-y-4">
      <div class="flex items-center justify-between pb-3 border-b border-gray-800/80">
        <div>
          <h3 class="text-sm sm:text-base font-bold text-white flex items-center gap-2">
            <LineChart class="w-4 h-4 text-violet-400" />
            Courbes du Graphique Principal (en kg)
          </h3>
          <p class="text-xs text-gray-400 mt-0.5">
            Sélectionnez les courbes actives par défaut sur le graphique unifié.
          </p>
        </div>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
        <!-- Courbe Poids -->
        <label class="flex items-center justify-between p-3 rounded-2xl bg-gray-950/60 border border-gray-800/80 cursor-pointer select-none">
          <span class="text-xs font-semibold text-gray-200 flex items-center gap-2">
            <span class="w-2.5 h-2.5 rounded-full bg-violet-400"></span>
            Poids Total
          </span>
          <input 
            type="checkbox" 
            v-model="localPrefs.charts.showMass" 
            @change="savePreferences"
            class="w-4 h-4 rounded text-violet-600 accent-violet-600"
          />
        </label>

        <!-- Courbe Masse Grasse (kg) -->
        <label class="flex items-center justify-between p-3 rounded-2xl bg-gray-950/60 border border-gray-800/80 cursor-pointer select-none">
          <span class="text-xs font-semibold text-gray-200 flex items-center gap-2">
            <span class="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
            Masse Grasse
          </span>
          <input 
            type="checkbox" 
            v-model="localPrefs.charts.showFatMass" 
            @change="savePreferences"
            class="w-4 h-4 rounded text-amber-500 accent-amber-500"
          />
        </label>

        <!-- Courbe Masse Maigre (kg) -->
        <label class="flex items-center justify-between p-3 rounded-2xl bg-gray-950/60 border border-gray-800/80 cursor-pointer select-none">
          <span class="text-xs font-semibold text-gray-200 flex items-center gap-2">
            <span class="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
            Masse Maigre
          </span>
          <input 
            type="checkbox" 
            v-model="localPrefs.charts.showLeanMass" 
            @change="savePreferences"
            class="w-4 h-4 rounded text-emerald-500 accent-emerald-500"
          />
        </label>
      </div>

      <!-- Graphiques secondaires optionnels -->
      <div class="pt-3 border-t border-gray-800/60 space-y-3">
        <label class="flex items-center justify-between p-3.5 rounded-2xl bg-gray-950/60 border border-gray-800/80 hover:border-violet-500/30 transition-all cursor-pointer select-none">
          <div>
            <span class="text-xs font-bold text-white block">Graphique Secondaire : % Masse Grasse</span>
            <span class="text-[10px] text-gray-400">Affiche un graphique dédié au pourcentage de graisse</span>
          </div>
          <input 
            type="checkbox" 
            v-model="localPrefs.charts.showFatPercentChart" 
            @change="savePreferences"
            class="w-4 h-4 rounded text-violet-600 accent-violet-600"
          />
        </label>

        <!-- BIA Muscle Segmental -->
        <label class="flex items-center justify-between p-3.5 rounded-2xl bg-gray-950/60 border border-gray-800/80 hover:border-emerald-500/30 transition-all cursor-pointer select-none">
          <div>
            <span class="text-xs font-bold text-white block">Graphique BIA : Muscle Segmentaire (5 zones)</span>
            <span class="text-[10px] text-gray-400">Évolution musculaire détaillée : Tronc, Bras D/G, Jambes D/G</span>
          </div>
          <input 
            type="checkbox" 
            v-model="localPrefs.charts.showBiaMuscleChart" 
            @change="savePreferences"
            class="w-4 h-4 rounded text-emerald-600 accent-emerald-500"
          />
        </label>

        <!-- BIA Fat Segmental -->
        <label class="flex items-center justify-between p-3.5 rounded-2xl bg-gray-950/60 border border-gray-800/80 hover:border-amber-500/30 transition-all cursor-pointer select-none">
          <div>
            <span class="text-xs font-bold text-white block">Graphique BIA : Masse Grasse Segmentaire (5 zones)</span>
            <span class="text-[10px] text-gray-400">Évolution du tissu adipeux par zone anatomique</span>
          </div>
          <input 
            type="checkbox" 
            v-model="localPrefs.charts.showBiaFatChart" 
            @change="savePreferences"
            class="w-4 h-4 rounded text-amber-600 accent-amber-500"
          />
        </label>
      </div>
    </div>
  </div>
</template>

<script setup>
import { reactive, watch } from 'vue';
import { LayoutGrid, Scale, Flame, Percent, Dumbbell, LineChart } from 'lucide-vue-next';
import { useBodyGraphStore } from '../stores/bodyGraph';
import { useToast } from '../composables/useToast';

const store = useBodyGraphStore();
const toast = useToast();

const localPrefs = reactive({
  cards: {
    mass: store.displayPreferences.cards.mass,
    fatMass: store.displayPreferences.cards.fatMass,
    bodyFat: store.displayPreferences.cards.bodyFat,
    leanMass: store.displayPreferences.cards.leanMass
  },
  charts: {
    showMass: store.displayPreferences.charts.showMass,
    showFatMass: store.displayPreferences.charts.showFatMass,
    showLeanMass: store.displayPreferences.charts.showLeanMass,
    showFatPercentChart: store.displayPreferences.charts.showFatPercentChart,
    showBiaMuscleChart: store.displayPreferences.charts.showBiaMuscleChart,
    showBiaFatChart: store.displayPreferences.charts.showBiaFatChart
  }
});

watch(() => store.displayPreferences, (newPrefs) => {
  localPrefs.cards = { ...newPrefs.cards };
  localPrefs.charts = { ...newPrefs.charts };
}, { deep: true });

const savePreferences = async () => {
  try {
    await store.updateDisplayPreferences(localPrefs);
    toast.showToast('Préférences d\'affichage enregistrées', 'success');
  } catch (err) {
    toast.showToast('Erreur lors de l\'enregistrement des préférences', 'error');
  }
};
</script>
