<template>
  <div class="glass-card p-5 sm:p-6 rounded-2xl space-y-5 border border-gray-800/80">
    <div>
      <h3 class="text-sm font-bold text-violet-400 uppercase tracking-wider">{{ $t('settings.dataSection.title') }}</h3>
      <p class="text-xs text-gray-400 mt-1">{{ $t('settings.dataSection.desc') }}</p>
    </div>

    <!-- Feedback banner if any error -->
    <div v-if="errorMsg" class="text-xs text-rose-400 font-medium bg-rose-500/10 border border-rose-500/20 p-3 rounded-xl flex items-center gap-2">
      <AlertTriangle class="w-4 h-4 shrink-0 text-rose-400" />
      <span>{{ errorMsg }}</span>
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
      <button
        type="button"
        @click="handleExport"
        :disabled="exportLoading"
        class="py-3.5 px-4 rounded-2xl bg-gray-950 hover:bg-gray-900 active:scale-[0.98] text-gray-200 hover:text-white transition-all duration-200 text-xs font-semibold cursor-pointer border border-gray-800 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
      >
        <Download class="w-4 h-4 text-violet-400" />
        <span>{{ exportLoading ? $t('settings.dataSection.exportingBtn') : $t('settings.dataSection.exportBtn') }}</span>
      </button>

      <button
        type="button"
        @click="triggerFileInput"
        :disabled="importLoading"
        class="py-3.5 px-4 rounded-2xl bg-gray-950 hover:bg-gray-900 active:scale-[0.98] text-gray-200 hover:text-white transition-all duration-200 text-xs font-semibold cursor-pointer border border-gray-800 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
      >
        <Upload class="w-4 h-4 text-violet-400" />
        <span>{{ importLoading ? $t('settings.dataSection.restoringBtn') : $t('settings.dataSection.restoreBtn') }}</span>
      </button>
      <input
        ref="fileInputRef"
        type="file"
        accept=".json,application/json"
        class="hidden"
        @change="handleFileImport"
      />
    </div>

    <div class="p-4 bg-gray-950/60 border border-gray-800/80 rounded-2xl flex items-start gap-3">
      <Database class="w-5 h-5 text-violet-400 shrink-0 mt-0.5" />
      <div class="text-xs text-gray-300 leading-relaxed">
        {{ $t('settings.dataSection.jsonNotice') }}
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { Download, Upload, Database, AlertTriangle } from 'lucide-vue-next';
import { useBodyGraphStore } from '../stores/bodyGraph';
import { useI18n } from '../i18n';
import { useToast } from '../composables/useToast';

const store = useBodyGraphStore();
const { t } = useI18n();
const toast = useToast();

const fileInputRef = ref(null);
const exportLoading = ref(false);
const importLoading = ref(false);
const errorMsg = ref('');

const handleExport = async () => {
  exportLoading.value = true;
  errorMsg.value = '';
  try {
    await store.exportData();
    toast.showToast(t('settings.dataSection.exportSuccess'), 'success');
  } catch (err) {
    errorMsg.value = t('settings.dataSection.exportFailed') + (err.message || err);
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

  const reader = new FileReader();
  reader.onload = async (e) => {
    try {
      const content = e.target.result;
      await store.importData(content);
      toast.showToast(t('settings.dataSection.importSuccess'), 'success');
    } catch (err) {
      errorMsg.value = t('settings.dataSection.importFailed') + (err.message || err);
    } finally {
      importLoading.value = false;
    }
  };
  reader.onerror = () => {
    errorMsg.value = t('settings.dataSection.invalidJsonError');
    importLoading.value = false;
  };
  reader.readAsText(file);
};
</script>
