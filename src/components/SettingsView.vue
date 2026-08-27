<template>
  <div class="max-w-4xl w-full mx-auto p-4 sm:p-6 space-y-6 animate-fade-in pb-28">
    <!-- Header Bar with Back Button -->
    <div class="flex items-center justify-between pb-4 border-b border-gray-800/80">
      <div class="flex items-center gap-3">
        <button
          type="button"
          @click="closeSettings"
          class="p-2.5 rounded-xl bg-gray-900/80 border border-gray-800 text-gray-300 hover:text-white hover:border-gray-700 active:scale-95 transition-all duration-200 cursor-pointer flex items-center gap-2 text-xs font-semibold shadow-sm"
          :title="$t('settings.backToDashboard')"
        >
          <ArrowLeft class="w-4 h-4 text-violet-400" />
          <span class="hidden xs:inline">{{ $t('settings.dashboardBtn') }}</span>
        </button>
        <div>
          <h2 class="text-lg sm:text-xl font-extrabold text-white tracking-tight flex items-center gap-2">
            {{ $t('settings.title') }}
          </h2>
          <p class="text-xs text-gray-400">{{ $t('settings.subtitle') }}</p>
        </div>
      </div>

      <div class="flex items-center gap-2">
        <button
          type="button"
          @click="handleManualUpdateCheck"
          :disabled="store.isCheckingForUpdates"
          class="text-[10px] px-2.5 py-1 rounded-xl bg-violet-600/10 hover:bg-violet-600/20 border border-violet-500/20 text-violet-300 font-semibold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          :title="$t('updates.checkUpdates')"
        >
          <RefreshCw class="w-3 h-3 text-violet-400" :class="{ 'animate-spin': store.isCheckingForUpdates }" />
          <span>{{ $t('settings.version') }}</span>
        </button>
      </div>
    </div>

    <!-- Navigation Tabs / Sub-Sections -->
    <div class="grid grid-cols-2 sm:grid-cols-6 gap-2 p-1.5 rounded-2xl bg-gray-900/80 border border-gray-800/80">
      <button
        type="button"
        @click="activeSubTab = 'goals'"
        :class="[
          'py-2.5 px-3 rounded-xl text-xs font-bold transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer',
          activeSubTab === 'goals'
            ? 'bg-violet-600 text-white shadow-lg shadow-violet-600/20'
            : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'
        ]"
      >
        <Target class="w-4 h-4" />
        <span>{{ $t('settings.tabs.goals') }}</span>
      </button>

      <button
        type="button"
        @click="activeSubTab = 'display'"
        :class="[
          'py-2.5 px-3 rounded-xl text-xs font-bold transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer',
          activeSubTab === 'display'
            ? 'bg-violet-600 text-white shadow-lg shadow-violet-600/20'
            : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'
        ]"
      >
        <LayoutGrid class="w-4 h-4" />
        <span>{{ $t('settings.tabs.display') }}</span>
      </button>

      <button
        type="button"
        @click="activeSubTab = 'profile'"
        :class="[
          'py-2.5 px-3 rounded-xl text-xs font-bold transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer',
          activeSubTab === 'profile'
            ? 'bg-violet-600 text-white shadow-lg shadow-violet-600/20'
            : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'
        ]"
      >
        <User class="w-4 h-4" />
        <span>{{ $t('settings.tabs.profile') }}</span>
      </button>

      <button
        type="button"
        @click="activeSubTab = 'devices'"
        :class="[
          'py-2.5 px-3 rounded-xl text-xs font-bold transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer',
          activeSubTab === 'devices'
            ? 'bg-violet-600 text-white shadow-lg shadow-violet-600/20'
            : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'
        ]"
      >
        <Bluetooth class="w-4 h-4" />
        <span>{{ $t('settings.tabs.devices') }}</span>
      </button>

      <button
        type="button"
        @click="activeSubTab = 'language'"
        :class="[
          'py-2.5 px-3 rounded-xl text-xs font-bold transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer',
          activeSubTab === 'language'
            ? 'bg-violet-600 text-white shadow-lg shadow-violet-600/20'
            : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'
        ]"
      >
        <Globe class="w-4 h-4" />
        <span>{{ $t('settings.tabs.language') }}</span>
      </button>

      <button
        type="button"
        @click="activeSubTab = 'data'"
        :class="[
          'py-2.5 px-3 rounded-xl text-xs font-bold transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer',
          activeSubTab === 'data'
            ? 'bg-violet-600 text-white shadow-lg shadow-violet-600/20'
            : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'
        ]"
      >
        <Database class="w-4 h-4" />
        <span>{{ $t('settings.tabs.data') }}</span>
      </button>
    </div>

    <!-- Available APK Update Notification Card -->
    <div
      v-if="store.availableApkUpdate"
      class="p-4 rounded-2xl bg-gradient-to-r from-violet-950/40 via-gray-900/80 to-indigo-950/40 border border-violet-500/30 space-y-2 shadow-lg animate-fade-in"
    >
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div class="flex items-start sm:items-center gap-3">
          <div class="w-8 h-8 rounded-xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center shrink-0 mt-0.5 sm:mt-0">
            <Sparkles class="w-4 h-4 text-violet-400" />
          </div>
          <div>
            <div class="flex items-center gap-2">
              <h4 class="text-xs font-bold text-white">
                {{ $t('updates.newVersionFound', { version: 'v' + store.availableApkUpdate.latestVersion }) }}
              </h4>
              <span class="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-semibold">
                {{ $t('updates.latestRelease') }}
              </span>
            </div>
            <p class="text-[10px] text-gray-400 mt-0.5">
              {{ store.availableApkUpdate.releaseName || 'SimpleBodyGraph' }} ({{ $t('settings.version') }} &rarr; v{{ store.availableApkUpdate.latestVersion }})
            </p>
          </div>
        </div>
        <div class="flex items-center gap-2 self-end sm:self-auto">
          <button
            type="button"
            @click="store.downloadApk()"
            class="py-1.5 px-3 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold shadow-lg shadow-violet-600/20 flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
          >
            <Download class="w-3.5 h-3.5" />
            <span>{{ $t('updates.downloadApkShort') }}</span>
          </button>
        </div>
      </div>
    </div>

    <!-- SUB-TABS CONTENT -->
    <div v-show="activeSubTab === 'goals'">
      <SettingsGoalsTab />
    </div>

    <div v-show="activeSubTab === 'profile'">
      <SettingsProfileTab />
    </div>

    <div v-show="activeSubTab === 'devices'">
      <SettingsDevicesTab />
    </div>

    <div v-show="activeSubTab === 'language'">
      <SettingsLanguageTab />
    </div>

    <div v-show="activeSubTab === 'data'">
      <SettingsDataTab />
    </div>

    <div v-show="activeSubTab === 'display'">
      <SettingsDisplayTab />
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { 
  ArrowLeft, Download, Target, User, Database, Sparkles, Bluetooth, RefreshCw, LayoutGrid, Globe
} from 'lucide-vue-next';
import { useBodyGraphStore } from '../stores/bodyGraph';
import { useI18n } from '../i18n';
import { useToast } from '../composables/useToast';
import SettingsGoalsTab from './SettingsGoalsTab.vue';
import SettingsProfileTab from './SettingsProfileTab.vue';
import SettingsDevicesTab from './SettingsDevicesTab.vue';
import SettingsLanguageTab from './SettingsLanguageTab.vue';
import SettingsDataTab from './SettingsDataTab.vue';
import SettingsDisplayTab from './SettingsDisplayTab.vue';

const store = useBodyGraphStore();
const { t } = useI18n();
const toast = useToast();

const activeSubTab = ref('goals'); // 'goals' | 'display' | 'profile' | 'devices' | 'language' | 'data'

const closeSettings = () => {
  store.activeView = 'dashboard';
};

// Check for updates handler
const handleManualUpdateCheck = async () => {
  const result = await store.checkForApkUpdates({ manual: true });
  if (result && result.hasUpdate) {
    toast.showToast(t('updates.newVersionFound', { version: 'v' + result.latestVersion }), 'info');
  } else if (result && !result.hasUpdate && !result.error) {
    toast.showToast(t('updates.upToDate', { version: 'v' + result.currentVersion }), 'success');
  } else if (result?.error) {
    toast.showToast(t('updates.checkFailed'), 'error');
  }
};
</script>

<style scoped>
.animate-fade-in {
  animation: fadeIn 0.2s ease-out forwards;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(6px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
