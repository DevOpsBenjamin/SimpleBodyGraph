<template>
  <div 
    v-if="store.showAuthModal" 
    class="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 transition-all duration-300"
  >
    <!-- Backdrop -->
    <div 
      @click="store.showAuthModal = false" 
      class="absolute inset-0 bg-black/60 backdrop-blur-sm"
    ></div>

    <!-- Modal Card -->
    <div 
      class="w-full sm:max-w-md bg-gray-900 border-t sm:border border-gray-800 rounded-t-3xl sm:rounded-3xl p-6 relative z-10 shadow-2xl shadow-black max-h-[90vh] overflow-y-auto transform translate-y-0 transition-transform duration-300"
    >
      <!-- Modal Header -->
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-xl font-bold text-white flex items-center gap-2">
          <Cloud class="w-5 h-5 text-violet-400" />
          Cloud Backup & Sync
        </h2>
        <button 
          @click="store.showAuthModal = false"
          class="p-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white transition-all duration-200 cursor-pointer"
        >
          <X class="w-5 h-5" />
        </button>
      </div>

      <p class="text-sm text-gray-400 mb-6 leading-relaxed">
        Choose how you would like to sync and backup your weight progress. You can start completely offline as a Guest, or sync securely to the Cloud.
      </p>

      <!-- Options List -->
      <div class="space-y-4">
        <!-- Google Auth -->
        <button 
          @click="handleGoogleSignIn"
          class="w-full py-3.5 px-4 rounded-xl bg-white hover:bg-gray-100 text-gray-900 font-semibold flex items-center justify-center gap-3 transition-all duration-200 cursor-pointer shadow-lg shadow-black/20"
        >
          <!-- Google Icon -->
          <svg class="w-5 h-5" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
          </svg>
          Sign In with Google
        </button>

        <!-- Anonymous Sign In -->
        <button 
          @click="handleAnonymousSignIn"
          class="w-full py-3.5 px-4 rounded-xl bg-gray-800 hover:bg-gray-750 border border-gray-700/50 text-white font-semibold flex items-center justify-center gap-3 transition-all duration-200 cursor-pointer"
        >
          <UserPlus class="w-5 h-5 text-violet-400" />
          Create Anonymous Cloud Backup
        </button>

        <div class="relative flex py-2 items-center">
          <div class="flex-grow border-t border-gray-800/80"></div>
          <span class="flex-shrink mx-4 text-gray-500 text-xs uppercase tracking-widest font-semibold">Or</span>
          <div class="flex-grow border-t border-gray-800/80"></div>
        </div>

        <!-- Guest Offline mode -->
        <button 
          @click="store.showAuthModal = false"
          class="w-full py-3 px-4 rounded-xl bg-transparent hover:bg-gray-800/30 border border-dashed border-gray-800 hover:border-gray-750 text-gray-400 hover:text-gray-200 font-medium transition-all duration-200 cursor-pointer text-sm"
        >
          Continue as Guest (Local Offline Only)
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { Cloud, X, UserPlus } from 'lucide-vue-next';
import { useBodyGraphStore } from '../stores/bodyGraph';

const store = useBodyGraphStore();

const handleGoogleSignIn = async () => {
  try {
    await store.signInWithGoogle();
  } catch (error) {
    alert('Failed to initialize Google Sign In: ' + error.message);
  }
};

const handleAnonymousSignIn = async () => {
  try {
    await store.signInAnonymously();
    store.showAuthModal = false;
  } catch (error) {
    alert('Failed to create Anonymous account: ' + error.message);
  }
};
</script>
