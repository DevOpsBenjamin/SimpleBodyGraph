<template>
  <div class="min-h-screen bg-gray-950 text-gray-100 flex flex-col font-sans relative overflow-x-hidden">
    <!-- Neon Ambient Glows -->
    <div class="absolute top-0 left-1/4 -translate-x-1/2 w-[500px] h-[500px] bg-violet-600/10 rounded-full blur-[120px] pointer-events-none animate-pulse-slow"></div>
    <div class="absolute bottom-10 right-1/4 translate-x-1/2 w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none"></div>

    <!-- New Release APK Update Notification Banner -->
    <div
      v-if="store.availableApkUpdate && !store.apkUpdateDismissed"
      class="fixed top-0 left-0 right-0 z-50 flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-violet-950/95 via-gray-900/95 to-indigo-950/95 border-b border-violet-500/40 backdrop-blur-md shadow-2xl"
    >
      <div class="w-7 h-7 rounded-xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center shrink-0">
        <Sparkles class="w-3.5 h-3.5 text-violet-400" />
      </div>
      <div class="flex-1 min-w-0">
        <p class="text-xs font-bold text-white leading-tight">
          {{ $t('updates.newVersionFound', { version: 'v' + store.availableApkUpdate.latestVersion }) }}
        </p>
        <p class="text-[10px] text-gray-400 truncate">
          {{ store.availableApkUpdate.releaseName || $t('updates.available') }}
        </p>
      </div>
      <button
        @click="store.downloadApk()"
        class="shrink-0 text-xs font-bold px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white transition-colors cursor-pointer flex items-center gap-1.5 shadow-lg shadow-violet-500/20"
      >
        <Download class="w-3.5 h-3.5" />
        <span>{{ $t('updates.downloadApkShort') }}</span>
      </button>
      <button
        @click="store.dismissApkUpdate()"
        class="shrink-0 text-gray-500 hover:text-gray-300 transition-colors cursor-pointer"
        :aria-label="$t('common.close')"
      >
        <X class="w-4 h-4" />
      </button>
    </div>

    <!-- Android APK Download Banner -->
    <div
      v-else-if="isAndroid && !apkBannerDismissed"
      class="fixed top-0 left-0 right-0 z-50 flex items-center gap-3 px-4 py-3 bg-gray-900/95 border-b border-violet-500/30 backdrop-blur-md"
    >
      <span class="text-xl">📱</span>
      <div class="flex-1 min-w-0">
        <p class="text-xs font-semibold text-white leading-tight">{{ $t('apkBanner.title') }}</p>
        <p class="text-[10px] text-gray-400">{{ $t('apkBanner.subtitle') }}</p>
      </div>
      <a
        href="https://devopsbenjamin.github.io/SimpleBodyGraph/"
        class="shrink-0 text-xs font-bold px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white transition-colors"
      >
        {{ $t('apkBanner.download') }}
      </a>
      <button
        @click="apkBannerDismissed = true"
        class="shrink-0 text-gray-500 hover:text-gray-300 transition-colors cursor-pointer"
        :aria-label="$t('common.close')"
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

    <!-- 3. MAIN APPLICATION (DASHBOARD OR SETTINGS) -->
    <template v-else>
      <!-- Header component -->
      <HeaderSection />

      <!-- Desktop Tab navigation controller (hidden on mobile, visible on both dashboard and settings) -->
      <section class="max-w-6xl w-full mx-auto px-4 sm:px-6 pt-4 hidden sm:block z-10">
        <div class="flex p-1.5 rounded-2xl bg-gray-900/80 border border-gray-800/80 max-w-xl shadow-inner">
          <button 
            @click="store.activeView = 'dashboard'; store.activeTab = 'monthly'"
            :class="[
              'flex-1 py-2 px-3 text-xs font-bold rounded-xl transition-all duration-200 cursor-pointer flex items-center justify-center gap-1.5',
              store.activeView === 'dashboard' && store.activeTab === 'monthly'
                ? 'bg-violet-600 text-white shadow-lg shadow-violet-600/30 scale-[1.02]' 
                : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'
            ]"
            :title="$t('nav.monthlyTitle')"
            :aria-label="$t('nav.monthly')"
          >
            <TrendingUp class="w-3.5 h-3.5" />
            <span>{{ $t('nav.monthly') }}</span>
          </button>
          <button 
            @click="store.activeView = 'dashboard'; store.activeTab = 'weekly'"
            :class="[
              'flex-1 py-2 px-3 text-xs font-bold rounded-xl transition-all duration-200 cursor-pointer flex items-center justify-center gap-1.5',
              store.activeView === 'dashboard' && store.activeTab === 'weekly'
                ? 'bg-violet-600 text-white shadow-lg shadow-violet-600/30 scale-[1.02]' 
                : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'
            ]"
            :title="$t('nav.weeklyTitle')"
            :aria-label="$t('nav.weekly')"
          >
            <CalendarDays class="w-3.5 h-3.5" />
            <span>{{ $t('nav.weekly') }}</span>
          </button>
          <button 
            @click="store.activeView = 'dashboard'; store.activeTab = 'history'"
            :class="[
              'flex-1 py-2 px-3 text-xs font-bold rounded-xl transition-all duration-200 cursor-pointer flex items-center justify-center gap-1.5',
              store.activeView === 'dashboard' && store.activeTab === 'history' 
                ? 'bg-violet-600 text-white shadow-lg shadow-violet-600/30 scale-[1.02]' 
                : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'
            ]"
            :title="$t('nav.historyTitle')"
            :aria-label="$t('nav.history')"
          >
            <History class="w-3.5 h-3.5" />
            <span>{{ $t('nav.history') }}</span>
          </button>
          <button
            @click="store.activeView = 'dashboard'; store.activeTab = 'measurements'"
            :class="[
              'flex-1 py-2 px-3 text-xs font-bold rounded-xl transition-all duration-200 cursor-pointer flex items-center justify-center gap-1.5',
              store.activeView === 'dashboard' && store.activeTab === 'measurements'
                ? 'bg-violet-600 text-white shadow-lg shadow-violet-600/30 scale-[1.02]' 
                : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'
            ]"
            :title="$t('nav.measurementsTitle')"
            :aria-label="$t('nav.measurements')"
          >
            <Ruler class="w-3.5 h-3.5" />
            <span>{{ $t('nav.measurements') }}</span>
          </button>
          <button
            @click="store.activeView = 'settings'"
            :class="[
              'flex-1 py-2 px-3 text-xs font-bold rounded-xl transition-all duration-200 cursor-pointer flex items-center justify-center gap-1.5',
              store.activeView === 'settings'
                ? 'bg-violet-600 text-white shadow-lg shadow-violet-600/30 scale-[1.02]' 
                : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'
            ]"
            :title="$t('nav.settingsTitle')"
            :aria-label="$t('nav.settings')"
          >
            <Settings class="w-3.5 h-3.5" />
            <span>{{ $t('nav.settings') }}</span>
          </button>
        </div>
      </section>

      <!-- Settings Full Page View -->
      <SettingsView v-if="store.activeView === 'settings'" />

      <!-- Dashboard View -->
      <template v-else>
        <!-- Main Content -->
        <main class="flex-grow max-w-6xl w-full mx-auto p-4 sm:p-6 pb-28 z-10">
          
          <!-- Stats summary cards (Displayed only on Monthly and Weekly trend views) -->
          <StatsOverview v-if="store.activeTab === 'monthly' || store.activeTab === 'weekly'" />

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

        <!-- Backdrop when Speed Dial is open -->
        <div 
          v-if="showQuickActions"
          @click="showQuickActions = false"
          class="fixed inset-0 z-30 bg-black/60 backdrop-blur-xs transition-opacity duration-200"
        ></div>

        <!-- Unified Smart FAB & Speed-Dial -->
        <div class="fixed bottom-20 right-4 sm:bottom-6 sm:right-6 z-35 flex flex-col items-end gap-3">
          <!-- Expanded Options (Speed Dial) -->
          <div 
            v-if="showQuickActions"
            class="flex flex-col items-end gap-2.5 mb-1 animate-fade-in"
          >
            <!-- 1. Live BLE Scale Weigh-In (if paired devices exist) -->
            <button
              v-if="store.pairedDevices.length > 0"
              @click="store.showLiveWeighInModal = true; showQuickActions = false"
              class="flex items-center gap-2.5 group cursor-pointer"
              :title="$t('fab.bleWeighInTitle')"
            >
              <span class="px-2.5 py-1 rounded-xl bg-gray-900/90 border border-gray-800 text-xs font-semibold text-gray-200 shadow-lg group-hover:text-white transition-colors">
                {{ $t('fab.liveBleWeighIn') }}
              </span>
              <div class="w-12 h-12 rounded-full bg-violet-600 hover:bg-violet-500 text-white flex items-center justify-center shadow-lg shadow-violet-600/30 transition-transform group-hover:scale-105 active:scale-95 relative">
                <Scale class="w-5 h-5" />
                <span class="absolute top-0 right-0 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-gray-950 flex items-center justify-center">
                  <Bluetooth class="w-2 h-2 text-white" />
                </span>
              </div>
            </button>

            <!-- 2. Tape Measurements -->
            <button
              @click="store.showAddMeasurementModal = true; showQuickActions = false"
              class="flex items-center gap-2.5 group cursor-pointer"
              :title="$t('fab.addMeasurementTitle')"
              :aria-label="$t('fab.addMeasurementTitle')"
            >
              <span class="px-2.5 py-1 rounded-xl bg-gray-900/90 border border-gray-800 text-xs font-semibold text-gray-200 shadow-lg group-hover:text-white transition-colors">
                {{ $t('fab.newMeasurements') }}
              </span>
              <div class="w-12 h-12 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center shadow-lg shadow-indigo-600/30 transition-transform group-hover:scale-105 active:scale-95">
                <Ruler class="w-5 h-5" />
              </div>
            </button>

            <!-- 3. Manual Weigh-In Entry -->
            <button
              @click="store.showAddModal = true; showQuickActions = false"
              class="flex items-center gap-2.5 group cursor-pointer"
              :title="$t('fab.addLogTitle')"
              :aria-label="$t('fab.addLogTitle')"
            >
              <span class="px-2.5 py-1 rounded-xl bg-gray-900/90 border border-gray-800 text-xs font-semibold text-gray-200 shadow-lg group-hover:text-white transition-colors">
                {{ $t('fab.manualWeighIn') }}
              </span>
              <div class="w-12 h-12 rounded-full bg-violet-600 hover:bg-violet-500 text-white flex items-center justify-center shadow-lg shadow-violet-600/30 transition-transform group-hover:scale-105 active:scale-95">
                <Plus class="w-5 h-5" />
              </div>
            </button>
          </div>

          <!-- Main FAB Button -->
          <button 
            @click="handleMainFabClick"
            :class="[
              'w-14 h-14 rounded-full flex items-center justify-center shadow-2xl transition-all duration-200 select-none cursor-pointer active:scale-95',
              showQuickActions
                ? 'bg-gray-800 text-gray-200 border border-gray-700 shadow-black rotate-45'
                : store.activeTab === 'measurements'
                  ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/40 hover:scale-105'
                  : 'bg-violet-600 hover:bg-violet-500 text-white shadow-violet-600/40 hover:scale-105'
            ]"
            :title="store.activeTab === 'measurements' ? $t('fab.addMeasurementTitle') : $t('fab.addLogTitle')"
            :aria-label="store.activeTab === 'measurements' ? $t('fab.addMeasurementTitle') : $t('fab.addLogTitle')"
          >
            <Plus class="w-7 h-7 transition-transform duration-200" />
          </button>
        </div>
      </template>

      <!-- Mobile Bottom Navigation Bar (Always visible on mobile) -->
      <nav 
        class="fixed bottom-0 left-0 right-0 z-40 bg-gray-950/90 backdrop-blur-xl border-t border-gray-800/80 px-2 py-1.5 sm:hidden flex items-center justify-around shadow-2xl shadow-black"
        :aria-label="$t('nav.mobileNavigation')"
      >
        <button
          @click="store.activeView = 'dashboard'; store.activeTab = 'monthly'"
          :class="[
            'flex flex-col items-center gap-0.5 py-1 px-1.5 rounded-xl transition-all duration-200 cursor-pointer min-w-[54px]',
            store.activeView === 'dashboard' && store.activeTab === 'monthly'
              ? 'text-violet-400 font-bold scale-105'
              : 'text-gray-400 hover:text-gray-200'
          ]"
          :aria-label="$t('nav.monthly')"
        >
          <TrendingUp class="w-5 h-5" />
          <span class="text-[10px] tracking-tight">{{ $t('nav.monthly') }}</span>
          <span v-if="store.activeView === 'dashboard' && store.activeTab === 'monthly'" class="w-1 h-1 rounded-full bg-violet-400"></span>
        </button>

        <button
          @click="store.activeView = 'dashboard'; store.activeTab = 'weekly'"
          :class="[
            'flex flex-col items-center gap-0.5 py-1 px-1.5 rounded-xl transition-all duration-200 cursor-pointer min-w-[54px]',
            store.activeView === 'dashboard' && store.activeTab === 'weekly'
              ? 'text-violet-400 font-bold scale-105'
              : 'text-gray-400 hover:text-gray-200'
          ]"
          :aria-label="$t('nav.weekly')"
        >
          <CalendarDays class="w-5 h-5" />
          <span class="text-[10px] tracking-tight">{{ $t('nav.weekly') }}</span>
          <span v-if="store.activeView === 'dashboard' && store.activeTab === 'weekly'" class="w-1 h-1 rounded-full bg-violet-400"></span>
        </button>

        <button
          @click="store.activeView = 'dashboard'; store.activeTab = 'history'"
          :class="[
            'flex flex-col items-center gap-0.5 py-1 px-1.5 rounded-xl transition-all duration-200 cursor-pointer min-w-[54px]',
            store.activeView === 'dashboard' && store.activeTab === 'history'
              ? 'text-violet-400 font-bold scale-105'
              : 'text-gray-400 hover:text-gray-200'
          ]"
          :aria-label="$t('nav.history')"
        >
          <History class="w-5 h-5" />
          <span class="text-[10px] tracking-tight">{{ $t('nav.history') }}</span>
          <span v-if="store.activeView === 'dashboard' && store.activeTab === 'history'" class="w-1 h-1 rounded-full bg-violet-400"></span>
        </button>

        <button
          @click="store.activeView = 'dashboard'; store.activeTab = 'measurements'"
          :class="[
            'flex flex-col items-center gap-0.5 py-1 px-1.5 rounded-xl transition-all duration-200 cursor-pointer min-w-[54px]',
            store.activeView === 'dashboard' && store.activeTab === 'measurements'
              ? 'text-violet-400 font-bold scale-105'
              : 'text-gray-400 hover:text-gray-200'
          ]"
          :aria-label="$t('nav.measurements')"
        >
          <Ruler class="w-5 h-5" />
          <span class="text-[10px] tracking-tight">{{ $t('nav.measurements') }}</span>
          <span v-if="store.activeView === 'dashboard' && store.activeTab === 'measurements'" class="w-1 h-1 rounded-full bg-violet-400"></span>
        </button>

        <button
          @click="store.activeView = 'settings'"
          :class="[
            'flex flex-col items-center gap-0.5 py-1 px-1.5 rounded-xl transition-all duration-200 cursor-pointer min-w-[54px]',
            store.activeView === 'settings'
              ? 'text-violet-400 font-bold scale-105'
              : 'text-gray-400 hover:text-gray-200'
          ]"
          :title="$t('nav.settingsTitle')"
          :aria-label="$t('nav.settings')"
        >
          <Settings class="w-5 h-5" />
          <span class="text-[10px] tracking-tight">{{ $t('nav.settings') }}</span>
          <span v-if="store.activeView === 'settings'" class="w-1 h-1 rounded-full bg-violet-400"></span>
        </button>
      </nav>

      <!-- Modal Form overlays -->
      <LogForm />
      <MeasurementForm />
      <ScaleWeighInModal />

      <!-- Auth modal overlay -->
      <AuthModal />
    </template>

    <!-- Global Modals and Notifications -->
    <ConfirmModal />
    <ToastContainer />
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue';
import { Plus, Scale, Bluetooth, TrendingUp, CalendarDays, History, Ruler, Settings, Sparkles, Download, X } from 'lucide-vue-next';
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
import SettingsView from './components/SettingsView.vue';
import ScaleWeighInModal from './components/ScaleWeighInModal.vue';
import AuthModal from './components/AuthModal.vue';
import ConfirmModal from './components/ConfirmModal.vue';
import ToastContainer from './components/ToastContainer.vue';
const store = useBodyGraphStore();

// Quick Actions Speed-Dial State
const showQuickActions = ref(false);

const handleMainFabClick = () => {
  if (showQuickActions.value) {
    showQuickActions.value = false;
    return;
  }

  // If user has paired BLE scales, open the speed dial menu for choices
  if (store.pairedDevices.length > 0) {
    showQuickActions.value = true;
    return;
  }

  // Otherwise direct 1-tap action based on active tab
  if (store.activeTab === 'measurements') {
    store.showAddMeasurementModal = true;
  } else {
    store.showAddModal = true;
  }
};

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
