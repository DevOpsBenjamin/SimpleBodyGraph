<template>
  <div class="glass-card p-5 sm:p-6 rounded-2xl space-y-5 border border-gray-800/80">
    <div>
      <h3 class="text-sm font-bold text-violet-400 uppercase tracking-wider flex items-center gap-2">
        <Globe class="w-4 h-4 text-violet-400" />
        {{ $t('settings.languageSection.title') }}
      </h3>
      <p class="text-xs text-gray-400 mt-1">
        {{ $t('settings.languageSection.desc') }}
      </p>
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
      <!-- 1. Automatique (Navigateur) -->
      <button
        type="button"
        @click="selectLanguage(null)"
        :class="[
          'p-4 rounded-2xl border text-left transition-all duration-200 cursor-pointer flex flex-col justify-between gap-3 select-none',
          store.language === null || store.language === 'auto'
            ? 'bg-violet-600/20 border-violet-500/50 shadow-lg shadow-violet-500/10'
            : 'bg-gray-950/60 border-gray-800/80 hover:border-gray-700/80'
        ]"
      >
        <div class="flex items-center justify-between w-full">
          <span class="text-2xl">🌐</span>
          <span
            v-if="store.language === null || store.language === 'auto'"
            class="w-2.5 h-2.5 rounded-full bg-violet-400 animate-pulse"
          ></span>
        </div>
        <div>
          <h4 class="text-xs font-bold text-white">{{ $t('settings.languageSection.autoOption') }}</h4>
          <p class="text-[11px] text-gray-400 mt-0.5">
            {{ detectedBrowserLang === 'en' ? $t('settings.languageSection.autoDetectedEn') : $t('settings.languageSection.autoDetectedFr') }}
          </p>
        </div>
      </button>

      <!-- 2. Français -->
      <button
        type="button"
        @click="selectLanguage('fr')"
        :class="[
          'p-4 rounded-2xl border text-left transition-all duration-200 cursor-pointer flex flex-col justify-between gap-3 select-none',
          store.language === 'fr'
            ? 'bg-violet-600/20 border-violet-500/50 shadow-lg shadow-violet-500/10'
            : 'bg-gray-950/60 border-gray-800/80 hover:border-gray-700/80'
        ]"
      >
        <div class="flex items-center justify-between w-full">
          <span class="text-2xl">🇫🇷</span>
          <span
            v-if="store.language === 'fr'"
            class="w-2.5 h-2.5 rounded-full bg-violet-400 animate-pulse"
          ></span>
        </div>
        <div>
          <h4 class="text-xs font-bold text-white">{{ $t('settings.languageSection.frOption') }}</h4>
          <p class="text-[11px] text-gray-400 mt-0.5">Français (FR)</p>
        </div>
      </button>

      <!-- 3. English -->
      <button
        type="button"
        @click="selectLanguage('en')"
        :class="[
          'p-4 rounded-2xl border text-left transition-all duration-200 cursor-pointer flex flex-col justify-between gap-3 select-none',
          store.language === 'en'
            ? 'bg-violet-600/20 border-violet-500/50 shadow-lg shadow-violet-500/10'
            : 'bg-gray-950/60 border-gray-800/80 hover:border-gray-700/80'
        ]"
      >
        <div class="flex items-center justify-between w-full">
          <span class="text-2xl">🇬🇧</span>
          <span
            v-if="store.language === 'en'"
            class="w-2.5 h-2.5 rounded-full bg-violet-400 animate-pulse"
          ></span>
        </div>
        <div>
          <h4 class="text-xs font-bold text-white">{{ $t('settings.languageSection.enOption') }}</h4>
          <p class="text-[11px] text-gray-400 mt-0.5">English (US / UK)</p>
        </div>
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { Globe } from 'lucide-vue-next';
import { useBodyGraphStore } from '../stores/bodyGraph';
import { useI18n, detectBrowserLanguage } from '../i18n';
import { useToast } from '../composables/useToast';

const store = useBodyGraphStore();
const { t } = useI18n();
const toast = useToast();

const detectedBrowserLang = computed(() => {
  return detectBrowserLanguage();
});

const selectLanguage = async (lang) => {
  await store.updateLanguage(lang);
  toast.showToast(t('settings.languageSection.toastSuccess'), 'success');
};
</script>
