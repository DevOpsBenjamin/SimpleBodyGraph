<template>
  <header class="sticky top-0 z-30 w-full glass-card border-b border-gray-800/40 px-4 py-3 sm:px-6">
    <div class="max-w-6xl mx-auto flex items-center justify-between">
      <!-- Logo and Title -->
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center shadow-lg shadow-violet-500/10">
          <svg class="w-6 h-6 text-violet-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="20" x2="18" y2="10"></line>
            <line x1="12" y1="20" x2="12" y2="4"></line>
            <line x1="6" y1="20" x2="6" y2="14"></line>
          </svg>
        </div>
        <div class="hidden xs:block">
          <h1 class="text-xl font-bold tracking-tight text-white leading-tight font-sans">{{ $t('header.title') }}</h1>
          <p class="text-[10px] text-gray-400">{{ $t('header.subtitle') }}</p>
        </div>
      </div>

      <!-- User Info & Sync Controls -->
      <div class="flex items-center gap-2 sm:gap-3">
        <!-- Logs Database Count Badge -->
        <div 
          class="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-gray-900/80 border border-gray-800/80 text-gray-300 select-none shadow-xs"
          :title="$t('header.totalLogsTitle')"
        >
          <Database class="w-3.5 h-3.5 text-violet-400 shrink-0" />
          <span>{{ store.logs.length }}</span>
          <span class="hidden sm:inline text-gray-400">{{ $t('header.logs') }}</span>
          <!-- Pending Sync warning dot -->
          <span 
            v-if="store.stats.unsyncedCount > 0"
            class="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" 
            :title="$t('header.pendingSyncTitle')"
          ></span>
        </div>

        <!-- 1. LOCAL ONLY UNCONFIGURED STATE -->
        <div 
          v-if="!store.isCloudConfigured"
          class="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium border border-gray-800/80 bg-gray-900/60 text-gray-400 select-none"
          :title="$t('header.localOnlyTitle')"
        >
          <span class="w-1.5 h-1.5 rounded-full bg-gray-500"></span>
          <span class="hidden xs:inline">{{ $t('header.localOnly') }}</span>
        </div>

        <!-- 2. SUPABASE ACTIVE CONNECTIVITY STATUS -->
        <template v-else>
          <!-- Online/Offline Badge (Compact on mobile) -->
          <div 
            :class="[
              'inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium border transition-all duration-300 select-none',
              store.isOnline 
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                : 'bg-amber-500/10 border-amber-500/20 text-amber-400'
            ]"
            :title="store.isOnline ? $t('header.onlineTitle') : $t('header.offlineTitle')"
          >
            <span :class="['w-1.5 h-1.5 rounded-full', store.isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400']"></span>
            <span class="hidden xs:inline">{{ store.isOnline ? $t('header.online') : $t('header.offline') }}</span>
          </div>

          <!-- Authenticated Info -->
          <div v-if="store.isAuthenticated" class="flex items-center gap-1 sm:gap-2">
            <!-- User Profile Identity (Desktop) -->
            <div class="hidden md:flex flex-col text-right">
              <span class="text-xs font-semibold text-white leading-none">{{ store.userEmail }}</span>
              <span class="text-[9px] text-violet-400 mt-0.5">{{ $t('header.cloudSyncActive') }}</span>
            </div>

            <!-- Sync Error Badge -->
            <button 
              v-if="store.syncError"
              @click="showSyncErrorDetails"
              class="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500/20 text-xs font-semibold cursor-pointer transition-all duration-200"
              :title="$t('header.syncError') + ': ' + (store.syncError.message || store.syncError)"
            >
              <AlertTriangle class="w-3.5 h-3.5 text-rose-400 animate-pulse" />
              <span class="hidden sm:inline">{{ $t('header.syncError') }}</span>
            </button>

            <!-- Manual Sync button -->
            <button 
              @click="store.triggerSync" 
              :disabled="store.isSyncing || !store.isOnline"
              class="p-2 rounded-xl glass-card text-gray-400 hover:text-white hover:bg-gray-800/50 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 cursor-pointer"
              :title="$t('header.syncNow')"
            >
              <RefreshCw :class="['w-4 h-4', store.isSyncing ? 'animate-spin text-violet-400' : '']" />
            </button>

            <!-- Logout button -->
            <button 
              @click="handleLogout"
              class="p-2 rounded-xl hover:bg-rose-500/10 text-gray-400 hover:text-rose-400 transition-all duration-200 cursor-pointer"
              :title="$t('header.logout')"
            >
              <LogOut class="w-4 h-4" />
            </button>
          </div>

          <!-- Guest Backup Prompt -->
          <div v-else class="flex items-center">
            <button 
              @click="store.showAuthModal = true"
              class="px-2.5 sm:px-3 py-1.5 rounded-xl bg-violet-600 hover:bg-violet-500 active:bg-violet-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-all duration-200 cursor-pointer shadow-lg shadow-violet-500/10"
              :title="$t('header.cloudBackupTitle')"
            >
              <Cloud class="w-3.5 h-3.5" />
              <span class="hidden sm:inline">{{ $t('header.cloudBackup') }}</span>
            </button>
          </div>
        </template>
      </div>
    </div>
  </header>
</template>

<script setup>
import { RefreshCw, LogOut, Cloud, AlertTriangle, Database } from 'lucide-vue-next';
import { useBodyGraphStore } from '../stores/bodyGraph';
import { useConfirm } from '../composables/useConfirm';
import { useToast } from '../composables/useToast';
import { useI18n } from '../i18n';

const store = useBodyGraphStore();
const { confirm } = useConfirm();
const toast = useToast();
const { t } = useI18n();

const showSyncErrorDetails = () => {
  if (store.syncError) {
    const errorDetails = typeof store.syncError === 'object'
      ? JSON.stringify(store.syncError, null, 2)
      : store.syncError;
    toast.error(`${t('header.syncErrorPrefix')}${errorDetails}`, 6000);
  }
};

const handleLogout = async () => {
  const confirmed = await confirm({
    title: t('header.logoutConfirmTitle'),
    message: t('header.logoutConfirmMsg'),
    confirmText: t('header.logoutConfirmBtn'),
    cancelText: t('common.cancel'),
    variant: 'warning'
  });

  if (confirmed) {
    try {
      await store.logout();
      toast.info(t('header.logoutSuccess'));
    } catch (error) {
      toast.error(t('header.logoutFailed') + error.message);
    }
  }
};
</script>
