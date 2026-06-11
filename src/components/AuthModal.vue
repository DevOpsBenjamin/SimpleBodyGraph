<template>
  <div 
    v-if="store.showAuthModal" 
    class="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 transition-all duration-300"
  >
    <!-- Backdrop -->
    <div 
      @click="closeModal" 
      class="absolute inset-0 bg-black/60 backdrop-blur-sm"
    ></div>

    <!-- Modal Card -->
    <div 
      class="w-full sm:max-w-md bg-gray-900 border-t sm:border border-gray-800 rounded-t-3xl sm:rounded-3xl p-6 relative z-10 shadow-2xl shadow-black max-h-[90vh] overflow-y-auto transform translate-y-0 transition-all duration-300"
    >
      <!-- Modal Header -->
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-xl font-bold text-white flex items-center gap-2">
          <Cloud class="w-5 h-5 text-violet-400" />
          Cloud Backup & Sync
        </h2>
        <button 
          @click="closeModal"
          class="p-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white transition-all duration-200 cursor-pointer"
        >
          <X class="w-5 h-5" />
        </button>
      </div>

      <!-- VIEW 1: SIGNUP VERIFICATION NOTICE -->
      <div v-if="signupSuccess" class="text-center py-4 space-y-4 animate-fade-in">
        <div class="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto">
          <CheckCircle2 class="w-6 h-6 text-emerald-400" />
        </div>
        <h3 class="text-lg font-bold text-white">Verification Sent</h3>
        <p class="text-xs text-gray-400 leading-relaxed">
          We have sent a verification link to <strong class="text-violet-300">{{ email }}</strong>. Please check your email inbox and verify to complete setup.
        </p>
        <button 
          @click="signupSuccess = false; showEmailForm = false; store.showAuthModal = false"
          class="w-full py-2.5 px-4 rounded-xl bg-violet-600 hover:bg-violet-500 active:scale-[0.98] text-white font-semibold transition-all duration-200 text-sm cursor-pointer"
        >
          Close
        </button>
      </div>

      <!-- VIEW 2: EMAIL / PASSWORD FORM -->
      <div v-else-if="showEmailForm" class="space-y-4 animate-fade-in pt-2">
        <button 
          @click="showEmailForm = false"
          class="flex items-center gap-1 text-xs font-semibold text-gray-400 hover:text-white transition-colors duration-200 cursor-pointer"
        >
          <ArrowLeft class="w-3.5 h-3.5" /> Back to options
        </button>

        <h3 class="text-sm font-bold text-white mt-1">
          {{ isSignUp ? 'Create Cloud Account' : 'Sign In with Email' }}
        </h3>

        <form @submit.prevent="handleEmailAuth" class="space-y-3">
          <div class="space-y-1">
            <label for="modal-email" class="block text-[9px] font-bold text-gray-400 uppercase tracking-wider">Email</label>
            <div class="relative">
              <span class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500">
                <Mail class="w-4 h-4" />
              </span>
              <input 
                id="modal-email"
                type="email" 
                v-model="email"
                required
                placeholder="you@example.com"
                class="w-full pl-9 pr-4 py-2.5 rounded-xl glass-input text-xs text-white"
              />
            </div>
          </div>

          <div class="space-y-1">
            <label for="modal-password" class="block text-[9px] font-bold text-gray-400 uppercase tracking-wider">Password</label>
            <div class="relative">
              <span class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500">
                <Lock class="w-4 h-4" />
              </span>
              <input 
                id="modal-password"
                type="password" 
                v-model="password"
                required
                placeholder="••••••••"
                minlength="6"
                class="w-full pl-9 pr-4 py-2.5 rounded-xl glass-input text-xs text-white"
              />
            </div>
          </div>

          <button 
            type="submit"
            :disabled="loading"
            class="w-full py-2.5 px-4 rounded-xl bg-violet-600 hover:bg-violet-500 active:scale-[0.98] text-white font-semibold text-xs transition-all duration-200 cursor-pointer shadow-lg shadow-violet-500/10 flex items-center justify-center gap-1.5 mt-2"
          >
            <span v-if="loading" class="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
            <span>{{ isSignUp ? 'Register Account' : 'Login' }}</span>
          </button>
        </form>

        <div class="text-center">
          <button 
            @click="isSignUp = !isSignUp"
            class="text-[11px] font-semibold text-violet-400 hover:text-violet-300 transition-colors duration-200 cursor-pointer"
          >
            {{ isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up" }}
          </button>
        </div>
      </div>

      <!-- VIEW 3: OPTIONS LIST -->
      <div v-else class="space-y-4 pt-2">
        <p class="text-xs text-gray-400 leading-relaxed">
          Link your offline guest logs to a secure profile to backup and sync your body metrics seamlessly across multiple devices.
        </p>

        <!-- Google Auth -->
        <button 
          @click="handleGoogleSignIn"
          :disabled="loading"
          class="w-full py-3 px-4 rounded-xl bg-white hover:bg-gray-100 text-gray-900 font-semibold flex items-center justify-center gap-3 transition-all duration-200 cursor-pointer shadow-lg shadow-black/20 text-sm"
        >
          <!-- Google Icon -->
          <svg class="w-4.5 h-4.5" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
          </svg>
          Link with Google
        </button>

        <!-- Email & Password option -->
        <button 
          @click="showEmailForm = true; isSignUp = false"
          :disabled="loading"
          class="w-full py-3 px-4 rounded-xl bg-gray-800 hover:bg-gray-750 border border-gray-700/50 text-white font-semibold flex items-center justify-center gap-2 transition-all duration-200 cursor-pointer text-sm"
        >
          <Mail class="w-4.5 h-4.5 text-violet-400" />
          Link with Email & Password
        </button>

        <div class="relative flex py-1 items-center">
          <div class="flex-grow border-t border-gray-800/80"></div>
          <span class="flex-shrink mx-3 text-gray-500 text-[10px] uppercase tracking-widest font-bold">Or</span>
          <div class="flex-grow border-t border-gray-800/80"></div>
        </div>

        <!-- Continue as Guest -->
        <button 
          @click="closeModal"
          class="w-full py-2.5 px-4 rounded-xl bg-transparent hover:bg-gray-800/30 border border-dashed border-gray-800 hover:border-gray-750 text-gray-400 hover:text-gray-200 font-medium transition-all duration-200 cursor-pointer text-xs"
        >
          Stay Offline (Continue as Guest)
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { Cloud, X, Mail, Lock, ArrowLeft, CheckCircle2 } from 'lucide-vue-next';
import { useBodyGraphStore } from '../stores/bodyGraph';

const store = useBodyGraphStore();
const loading = ref(false);

// Form views state
const showEmailForm = ref(false);
const isSignUp = ref(false);
const email = ref('');
const password = ref('');
const signupSuccess = ref(false);

const closeModal = () => {
  store.showAuthModal = false;
  showEmailForm.value = false;
  signupSuccess.value = false;
  email.value = '';
  password.value = '';
};

const handleGoogleSignIn = async () => {
  loading.value = true;
  try {
    await store.signInWithGoogle();
    closeModal();
  } catch (error) {
    alert('Failed to initialize Google Sign In: ' + error.message);
  } finally {
    loading.value = false;
  }
};

const handleEmailAuth = async () => {
  loading.value = true;
  try {
    if (isSignUp.value) {
      const data = await store.signUpWithEmail(email.value, password.value);
      if (data && data.session) {
        closeModal();
      } else {
        signupSuccess.value = true;
      }
    } else {
      await store.signInWithEmail(email.value, password.value);
      closeModal();
    }
  } catch (error) {
    alert(`Authentication failed: ${error.message}`);
  } finally {
    loading.value = false;
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
