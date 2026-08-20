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
          <h1 class="text-xl font-bold tracking-tight text-white leading-tight font-sans">SimpleBodyGraph</h1>
          <p class="text-[10px] text-gray-400">Offline-first Tracker</p>
        </div>
      </div>

      <!-- User Info & Sync Controls -->
      <div class="flex items-center gap-3">
        <!-- Logs Database Count Badge -->
        <div 
          class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold bg-gray-900/60 border border-gray-800/80 text-gray-300 select-none"
          title="Total recorded entries in database"
        >
          <Database class="w-3.5 h-3.5 text-violet-400" />
          <span>{{ store.logs.length }} logs</span>
          <!-- Pending Sync warning dot -->
          <span 
            v-if="store.stats.unsyncedCount > 0"
            class="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" 
            title="Logs pending sync"
          ></span>
        </div>

        <!-- 1. LOCAL ONLY UNCONFIGURED STATE -->
        <div 
          v-if="!store.isCloudConfigured"
          class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border border-gray-800/80 bg-gray-900/60 text-gray-400 select-none"
          title="Supabase is not configured. Running offline in browser memory."
        >
          <span class="w-1.5 h-1.5 rounded-full bg-gray-500"></span>
          Local Mode
        </div>

        <!-- 2. SUPABASE ACTIVE CONNECTIVITY STATUS -->
        <template v-else>
          <!-- Online/Offline Badge -->
          <div 
            :class="[
              'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-all duration-300 select-none',
              store.isOnline 
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                : 'bg-amber-500/10 border-amber-500/20 text-amber-400'
            ]"
          >
            <span :class="['w-1.5 h-1.5 rounded-full', store.isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400']"></span>
            {{ store.isOnline ? 'Online' : 'Offline' }}
          </div>

          <!-- Authenticated Info -->
          <div v-if="store.isAuthenticated" class="flex items-center gap-2">
            <!-- User Profile Identity -->
            <div class="hidden md:flex flex-col text-right">
              <span class="text-xs font-semibold text-white leading-none">{{ store.userEmail }}</span>
              <span class="text-[9px] text-violet-400 mt-0.5">Cloud Backup Active</span>
            </div>

            <!-- Sync Error Badge -->
            <button 
              v-if="store.syncError"
              @click="showSyncErrorDetails"
              class="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500/20 text-xs font-semibold cursor-pointer transition-all duration-200"
              :title="'Sync Error: ' + (store.syncError.message || store.syncError)"
            >
              <AlertTriangle class="w-3.5 h-3.5 text-rose-400 animate-pulse" />
              <span class="hidden sm:inline">Sync Error</span>
            </button>

            <!-- Manual Sync button -->
            <button 
              @click="store.triggerSync" 
              :disabled="store.isSyncing || !store.isOnline"
              class="p-2 rounded-xl glass-card text-gray-400 hover:text-white hover:bg-gray-800/50 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 cursor-pointer"
              title="Sync Now"
            >
              <RefreshCw :class="['w-4 h-4', store.isSyncing ? 'animate-spin text-violet-400' : '']" />
            </button>

            <!-- Logout button -->
            <button 
              @click="handleLogout"
              class="p-2 rounded-xl hover:bg-rose-500/10 text-gray-400 hover:text-rose-400 transition-all duration-200 cursor-pointer"
              title="Log Out"
            >
              <LogOut class="w-4 h-4" />
            </button>
          </div>

          <!-- Guest Backup Prompt -->
          <div v-else class="flex items-center">
            <button 
              @click="store.showAuthModal = true"
              class="px-3 py-1.5 rounded-xl bg-violet-600 hover:bg-violet-500 active:bg-violet-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-all duration-200 cursor-pointer shadow-lg shadow-violet-500/10"
            >
              <Cloud class="w-3.5 h-3.5" />
              Backup to Cloud
            </button>
          </div>
        </template>

        <!-- Settings button (Goal Configuration) -->
        <button 
          @click="store.showSettingsModal = true"
          class="p-2 rounded-xl glass-card text-gray-400 hover:text-white hover:bg-gray-800/50 transition-all duration-200 cursor-pointer"
          title="Settings & Goals"
        >
          <Settings class="w-4 h-4" />
        </button>
      </div>
    </div>
  </header>
</template>

<script setup>
import { RefreshCw, LogOut, Cloud, AlertTriangle, Settings, Database } from 'lucide-vue-next';
import { useBodyGraphStore } from '../stores/bodyGraph';
import { useConfirm } from '../composables/useConfirm';
import { useToast } from '../composables/useToast';

const store = useBodyGraphStore();
const { confirm } = useConfirm();
const toast = useToast();

const showSyncErrorDetails = () => {
  if (store.syncError) {
    const errorDetails = typeof store.syncError === 'object'
      ? JSON.stringify(store.syncError, null, 2)
      : store.syncError;
    toast.error(`Erreur de synchronisation :\n${errorDetails}`, 6000);
  }
};

const handleLogout = async () => {
  const confirmed = await confirm({
    title: 'Déconnexion',
    message: 'Êtes-vous sûr de vouloir vous déconnecter ? Vos données cloud restent enregistrées et vous reviendrez au profil Invité.',
    confirmText: 'Se déconnecter',
    cancelText: 'Annuler',
    variant: 'warning'
  });

  if (confirmed) {
    try {
      await store.logout();
      toast.info('Vous êtes maintenant déconnecté.');
    } catch (error) {
      toast.error('Échec de la déconnexion : ' + error.message);
    }
  }
};
</script>
