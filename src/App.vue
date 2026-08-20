<template>
  <div class="min-h-screen bg-gray-950 text-gray-100 flex flex-col font-sans relative overflow-x-hidden">
    <!-- Neon Ambient Glows -->
    <div class="absolute top-0 left-1/4 -translate-x-1/2 w-[500px] h-[500px] bg-violet-600/10 rounded-full blur-[120px] pointer-events-none animate-pulse-slow"></div>
    <div class="absolute bottom-10 right-1/4 translate-x-1/2 w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none"></div>

    <!-- Android APK Download Banner -->
    <div
      v-if="isAndroid && !apkBannerDismissed"
      class="fixed top-0 left-0 right-0 z-50 flex items-center gap-3 px-4 py-3 bg-gray-900/95 border-b border-violet-500/30 backdrop-blur-md"
    >
      <span class="text-xl">📱</span>
      <div class="flex-1 min-w-0">
        <p class="text-xs font-semibold text-white leading-tight">Une app native est disponible !</p>
        <p class="text-[10px] text-gray-400">Installe l'APK pour une meilleure expérience</p>
      </div>
      <a
        href="https://devopsbenjamin.github.io/SimpleBodyGraph/"
        class="shrink-0 text-xs font-bold px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white transition-colors"
      >
        Télécharger
      </a>
      <button
        @click="apkBannerDismissed = true"
        class="shrink-0 text-gray-500 hover:text-gray-300 transition-colors cursor-pointer"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
      </button>
    </div>


    <!-- 1. AUTH INITIALIZATION LOADING SCREEN -->
    <div v-if="!store.initialized" class="flex-grow flex flex-col items-center justify-center p-4 relative z-10 animate-pulse">
      <div class="w-12 h-12 rounded-xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center shadow-lg shadow-violet-500/10">
        <svg class="w-6 h-6 text-violet-400 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <line x1="12" y1="2" x2="12" y2="6"></line>
          <line x1="12" y1="18" x2="12" y2="22"></line>
          <line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line>
          <line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line>
          <line x1="2" y1="12" x2="6" y2="12"></line>
          <line x1="18" y1="12" x2="22" y2="12"></line>
          <line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line>
          <line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line>
        </svg>
      </div>
    </div>

    <!-- 2. ONBOARDING SCREEN -->
    <OnboardingScreen v-else-if="!store.showDashboard" />

    <!-- 3. MAIN DASHBOARD APPLICATION -->
    <template v-else>
      <!-- Header component -->
      <HeaderSection />

      <!-- Main Content -->
      <main class="flex-grow max-w-6xl w-full mx-auto p-4 sm:p-6 pb-24 z-10">
        
        <!-- Stats summary cards -->
        <StatsOverview />

        <!-- Tab navigation controller -->
        <section class="mb-6">
          <div class="flex p-1 rounded-xl bg-gray-900/80 border border-gray-800/60 max-w-md">
            <button 
              @click="store.activeTab = 'monthly'"
              :class="[
                'flex-1 py-2 text-xs font-semibold rounded-lg transition-all duration-300 cursor-pointer',
                store.activeTab === 'monthly'
                  ? 'bg-violet-600/20 text-violet-300 border border-violet-500/20 shadow-md' 
                  : 'text-gray-400 hover:text-gray-200'
              ]"
            >
              Tendance (Mensuel)
            </button>
            <button 
              @click="store.activeTab = 'weekly'"
              :class="[
                'flex-1 py-2 text-xs font-semibold rounded-lg transition-all duration-300 cursor-pointer',
                store.activeTab === 'weekly'
                  ? 'bg-violet-600/20 text-violet-300 border border-violet-500/20 shadow-md' 
                  : 'text-gray-400 hover:text-gray-200'
              ]"
            >
              Tendance (Semaine)
            </button>
            <button 
              @click="store.activeTab = 'history'"
              :class="[
                'flex-1 py-2 text-xs font-semibold rounded-lg transition-all duration-300 cursor-pointer',
                store.activeTab === 'history' 
                  ? 'bg-violet-600/20 text-violet-300 border border-violet-500/20 shadow-md' 
                  : 'text-gray-400 hover:text-gray-200'
              ]"
            >
              Logs History
            </button>
            <button
              @click="store.activeTab = 'measurements'"
              :class="[
                'flex-1 py-2 text-xs font-semibold rounded-lg transition-all duration-300 cursor-pointer',
                store.activeTab === 'measurements'
                  ? 'bg-violet-600/20 text-violet-300 border border-violet-500/20 shadow-md'
                  : 'text-gray-400 hover:text-gray-200'
              ]"
            >
              Measurements
            </button>
          </div>
        </section>

        <!-- Tabs content panel -->
        <section>
          <!-- Charts view -->
          <ProgressCharts v-show="store.activeTab === 'monthly' || store.activeTab === 'weekly'" />

          <!-- History entries list -->
          <HistoryList v-show="store.activeTab === 'history'" />

          <!-- Measurements view -->
          <MeasurementsView v-show="store.activeTab === 'measurements'" />
        </section>
      </main>

      <!-- FAB Buttons -->
      <div class="fixed bottom-6 right-6 z-20 flex flex-col gap-3">
        <button
          v-if="store.activeTab === 'measurements'"
          @click="store.showAddMeasurementModal = true"
          class="w-14 h-14 rounded-full bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white flex items-center justify-center shadow-lg shadow-indigo-600/30 hover:scale-105 transition-all duration-300 select-none cursor-pointer"
          title="Add Measurement"
        >
          <Plus class="w-8 h-8" />
        </button>
        <button 
          v-else
          @click="store.showAddModal = true"
          class="w-14 h-14 rounded-full bg-violet-600 hover:bg-violet-500 active:bg-violet-700 text-white flex items-center justify-center shadow-lg shadow-violet-600/30 hover:scale-105 transition-all duration-300 select-none cursor-pointer"
          title="Add Log Entry"
        >
          <Plus class="w-8 h-8" />
        </button>
      </div>

      <!-- Modal Form overlays -->
      <LogForm />
      <MeasurementForm />

      <!-- Auth modal overlay -->
      <AuthModal />

      <!-- Settings modal overlay -->
      <SettingsModal />
    </template>

    <!-- Global Modals and Notifications -->
    <ConfirmModal />
    <ToastContainer />
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue';
import { Plus } from 'lucide-vue-next';
import { useBodyGraphStore } from './stores/bodyGraph';

// Import subcomponents
import OnboardingScreen from './components/OnboardingScreen.vue';
import HeaderSection from './components/HeaderSection.vue';
import StatsOverview from './components/StatsOverview.vue';
import ProgressCharts from './components/ProgressCharts.vue';
import HistoryList from './components/HistoryList.vue';
import LogForm from './components/LogForm.vue';
import MeasurementForm from './components/MeasurementForm.vue';
import MeasurementsView from './components/MeasurementsView.vue';
import AuthModal from './components/AuthModal.vue';
import SettingsModal from './components/SettingsModal.vue';
import ConfirmModal from './components/ConfirmModal.vue';
import ToastContainer from './components/ToastContainer.vue';

const store = useBodyGraphStore();

// Android APK banner — only shown on Android browsers (not inside the Capacitor app)
const isAndroid = /android/i.test(navigator.userAgent) && !window.Capacitor;
const apkBannerDismissed = ref(false);

onMounted(async () => {
  // Initialize user session and load appropriate IndexedDB profile
  await store.initAuth();

  // Attach online/offline check triggers
  window.addEventListener('online', () => {
    store.setOnlineStatus(true);
  });
  
  window.addEventListener('offline', () => {
    store.setOnlineStatus(false);
  });
});
</script>
