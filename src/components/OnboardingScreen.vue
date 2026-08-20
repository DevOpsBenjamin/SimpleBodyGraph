<template>
  <div class="min-h-screen bg-gray-950 text-gray-100 flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans">
    <!-- Glowing background accents -->
    <div class="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[450px] h-[450px] bg-violet-600/15 rounded-full blur-[100px] pointer-events-none animate-pulse-slow"></div>
    <div class="absolute bottom-10 right-10 w-[300px] h-[300px] bg-indigo-600/10 rounded-full blur-[90px] pointer-events-none"></div>

    <!-- Main Card -->
    <div class="w-full max-w-md glass-card rounded-3xl p-6 sm:p-8 relative z-10 shadow-2xl border border-gray-800/80 max-h-[90vh] overflow-y-auto transform transition-all duration-300">
      
      <!-- VIEW 1: EMAIL CONFIRMATION INSTRUCTIONS (after signup if confirmation is required) -->
      <div v-if="signupSuccess" class="text-center py-6 animate-fade-in">
        <div class="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 class="w-8 h-8 text-emerald-400" />
        </div>
        <h2 class="text-xl font-bold text-white mb-2">Check Your Email</h2>
        <p class="text-sm text-gray-400 leading-relaxed mb-6">
          We have sent a verification link to <strong class="text-violet-300">{{ email }}</strong>. Please check your inbox and click the link to confirm your account.
        </p>
        <button 
          @click="signupSuccess = false; showEmailForm = false"
          class="w-full py-3 px-4 rounded-xl bg-violet-600 hover:bg-violet-500 active:scale-[0.98] text-white font-semibold transition-all duration-200 cursor-pointer shadow-lg shadow-violet-500/10"
        >
          Return to Login
        </button>
      </div>

      <!-- VIEW 2: EMAIL / PASSWORD FORM -->
      <div v-else-if="showEmailForm" class="space-y-6 animate-fade-in">
        <!-- Back Button -->
        <button 
          @click="showEmailForm = false"
          class="flex items-center gap-1.5 text-xs font-semibold text-gray-400 hover:text-white transition-colors duration-200 cursor-pointer"
        >
          <ArrowLeft class="w-4 h-4" /> Back to options
        </button>

        <!-- Form Title -->
        <div>
          <h2 class="text-2xl font-black tracking-tight text-white leading-tight">
            {{ isSignUp ? 'Create Account' : 'Sign In' }}
          </h2>
          <p class="text-xs text-gray-400 mt-1">
            {{ isSignUp ? 'Create a secure cloud profile to sync your data' : 'Sign in to access your sync settings' }}
          </p>
        </div>

        <!-- Form Fields -->
        <form @submit.prevent="handleEmailAuth" class="space-y-4">
          <div class="space-y-1">
            <label for="email" class="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Email Address</label>
            <div class="relative">
              <span class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500">
                <Mail class="w-4 h-4" />
              </span>
              <input 
                id="email"
                type="email" 
                v-model="email"
                required
                placeholder="you@example.com"
                class="w-full pl-10 pr-4 py-3 rounded-xl glass-input text-sm text-white"
              />
            </div>
          </div>

          <div class="space-y-1">
            <label for="password" class="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Password</label>
            <div class="relative">
              <span class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500">
                <Lock class="w-4 h-4" />
              </span>
              <input 
                id="password"
                type="password" 
                v-model="password"
                required
                placeholder="••••••••"
                minlength="6"
                class="w-full pl-10 pr-4 py-3 rounded-xl glass-input text-sm text-white"
              />
            </div>
          </div>

          <!-- Submit Button -->
          <button 
            type="submit"
            :disabled="loading"
            class="w-full py-3 px-4 rounded-xl bg-violet-600 hover:bg-violet-500 active:scale-[0.98] text-white font-semibold transition-all duration-200 cursor-pointer shadow-lg shadow-violet-500/10 flex items-center justify-center gap-2 mt-4 disabled:opacity-50"
          >
            <span v-if="loading" class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
            <span>{{ isSignUp ? 'Create Account' : 'Sign In' }}</span>
          </button>
        </form>

        <!-- Toggle Sign In / Sign Up links -->
        <div class="text-center pt-2">
          <button 
            @click="isSignUp = !isSignUp"
            class="text-xs font-semibold text-violet-400 hover:text-violet-300 transition-colors duration-200 cursor-pointer"
          >
            {{ isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up" }}
          </button>
        </div>
      </div>

      <!-- VIEW 3: MAIN ONBOARDING OPTIONS -->
      <div v-else class="space-y-6">
        
        <!-- Brand Logo / Header -->
        <div class="flex flex-col items-center text-center">
          <div class="w-16 h-16 rounded-2xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center shadow-xl shadow-violet-500/10 mb-4 animate-bounce-slow">
            <svg class="w-10 h-10 text-violet-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="20" x2="18" y2="10"></line>
              <line x1="12" y1="20" x2="12" y2="4"></line>
              <line x1="6" y1="20" x2="6" y2="14"></line>
            </svg>
          </div>
          <h1 class="text-3xl font-black tracking-tight text-white font-sans bg-clip-text bg-gradient-to-r from-white via-gray-100 to-gray-300">
            SimpleBodyGraph
          </h1>
          <p class="text-xs text-violet-400 font-semibold tracking-widest uppercase mt-1">
            Offline-First Progress Tracker
          </p>
          <p class="text-sm text-gray-400 mt-3 leading-relaxed max-w-xs">
            Log your daily body mass & fat percentage, view beautiful progress charts, and copy weekly averages for your Hevy workouts.
          </p>
        </div>

        <!-- Action Pathways -->
        <div class="space-y-4">
          
          <!-- Option 1: Google OAuth (Primary Cloud option) -->
          <button 
            @click="handleGoogleSignIn"
            :disabled="loading"
            class="w-full py-3.5 px-4 rounded-2xl bg-white hover:bg-gray-100 active:scale-[0.98] text-gray-900 font-bold flex items-center justify-center gap-3 transition-all duration-200 cursor-pointer shadow-lg shadow-white/5 disabled:opacity-50 disabled:cursor-not-allowed group"
          >
            <!-- Google Icon -->
            <svg class="w-5 h-5 transition-transform group-hover:scale-110" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
            </svg>
            {{ loadingGoogle ? 'Connecting...' : 'Sign In with Google' }}
          </button>

          <!-- Option 2: Email & Password (Replacing Anonymous Backup) -->
          <button 
            @click="showEmailForm = true; isSignUp = false"
            :disabled="loading"
            class="w-full p-4 rounded-2xl bg-gray-900/80 hover:bg-gray-850 active:scale-[0.98] border border-gray-800 hover:border-violet-500/30 text-left transition-all duration-200 cursor-pointer flex items-center justify-between group disabled:opacity-50"
          >
            <div class="flex items-center gap-3">
              <div class="p-2.5 rounded-xl bg-violet-600/10 border border-violet-500/20 text-violet-400 group-hover:bg-violet-600/20 transition-all duration-200">
                <Mail class="w-5 h-5" />
              </div>
              <div>
                <div class="text-sm font-bold text-white leading-tight">Email & Password</div>
                <div class="text-[11px] text-gray-400 mt-0.5">Sign in or register a new profile</div>
              </div>
            </div>
            <ArrowRight class="w-4 h-4 text-gray-500 group-hover:text-violet-400 group-hover:translate-x-0.5 transition-all duration-200" />
          </button>

          <!-- Separator -->
          <div class="relative flex py-2 items-center">
            <div class="flex-grow border-t border-gray-900"></div>
            <span class="flex-shrink mx-4 text-gray-600 text-[10px] uppercase tracking-widest font-bold">Or</span>
            <div class="flex-grow border-t border-gray-900"></div>
          </div>

          <!-- Option 3: Continue as Guest -->
          <button 
            @click="handleGuestMode"
            :disabled="loading"
            class="w-full p-4 rounded-2xl bg-transparent hover:bg-gray-900/30 active:scale-[0.98] border border-dashed border-gray-800/80 hover:border-gray-700/80 text-left transition-all duration-200 cursor-pointer flex items-center justify-between group disabled:opacity-50"
          >
            <div class="flex items-center gap-3">
              <div class="p-2.5 rounded-xl bg-gray-800/40 border border-gray-750 text-gray-400 group-hover:bg-gray-800/60 group-hover:text-gray-300 transition-all duration-200">
                <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </div>
              <div>
                <div class="text-sm font-bold text-gray-300 leading-tight">Continue as Guest</div>
                <div class="text-[11px] text-gray-500 mt-0.5">Local Offline-First Mode only</div>
              </div>
            </div>
            <ArrowRight class="w-4 h-4 text-gray-650 group-hover:text-gray-400 group-hover:translate-x-0.5 transition-all duration-200" />
          </button>

        </div>

        <!-- Security / Footer reassurance info -->
        <div class="mt-8 flex items-center justify-center gap-2 text-[10px] text-gray-500">
          <ShieldCheck class="w-4 h-4 text-emerald-500/70" />
          <span>Local data can be linked to the cloud at any time.</span>
        </div>
        
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { Mail, Lock, ArrowLeft, ShieldCheck, CheckCircle2, ArrowRight } from 'lucide-vue-next';
import { useBodyGraphStore } from '../stores/bodyGraph';
import { useToast } from '../composables/useToast';

const store = useBodyGraphStore();
const toast = useToast();
const loading = ref(false);
const loadingGoogle = ref(false);

// Email auth state
const showEmailForm = ref(false);
const isSignUp = ref(false);
const email = ref('');
const password = ref('');
const signupSuccess = ref(false);

const handleGoogleSignIn = async () => {
  loading.value = true;
  loadingGoogle.value = true;
  try {
    await store.signInWithGoogle();
  } catch (error) {
    toast.error("Échec de l'initialisation Google Sign In : " + error.message);
  } finally {
    loading.value = false;
    loadingGoogle.value = false;
  }
};

const handleEmailAuth = async () => {
  loading.value = true;
  try {
    if (isSignUp.value) {
      const data = await store.signUpWithEmail(email.value, password.value);
      
      // If Supabase returns session immediately (email confirmation disabled)
      if (data && data.session) {
        // Redirection happens automatically via Pinia showDashboard getter
      } else {
        // Otherwise wait for confirmation
        signupSuccess.value = true;
      }
    } else {
      await store.signInWithEmail(email.value, password.value);
    }
  } catch (error) {
    toast.error(`Échec de l'authentification : ${error.message}`);
  } finally {
    loading.value = false;
  }
};

const handleGuestMode = () => {
  store.enableGuestMode();
};
</script>

<style scoped>
.animate-pulse-slow {
  animation: pulse 6s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

.animate-bounce-slow {
  animation: bounceSlow 3s ease-in-out infinite;
}

@keyframes bounceSlow {
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-6px);
  }
}

.animate-fade-in {
  animation: fadeIn 0.25s ease-out forwards;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
