<template>
  <div class="glass-card p-5 sm:p-6 rounded-2xl space-y-5 border border-gray-800/80">
    <div class="flex items-center justify-between">
      <div>
        <h3 class="text-sm font-bold text-violet-400 uppercase tracking-wider">{{ $t('settings.profileSection.title') }}</h3>
        <p class="text-xs text-gray-400 mt-1">{{ $t('settings.profileSection.desc') }}</p>
      </div>
      <span
        :class="[
          'text-[10px] px-2.5 py-1 rounded-xl font-bold border select-none',
          isProfileActive
            ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
            : 'bg-gray-800/60 border-gray-700 text-gray-400'
        ]"
      >
        {{ isProfileActive ? $t('settings.profileSection.activeBadge') : $t('settings.profileSection.inactiveBadge') }}
      </span>
    </div>

    <!-- Educational Alert -->
    <div class="p-4 bg-indigo-950/30 border border-indigo-800/30 rounded-2xl flex gap-3 items-start">
      <Sparkles class="w-5 h-5 text-indigo-400 mt-0.5 flex-shrink-0" />
      <div class="text-xs leading-relaxed text-gray-300">
        <strong class="text-indigo-300">{{ $t('settings.profileSection.ruleNotice') }}</strong> {{ $t('settings.profileSection.ruleDesc') }}
      </div>
    </div>

    <!-- Feedback banner if any error -->
    <div v-if="errorMsg" class="text-xs text-rose-400 font-medium bg-rose-500/10 border border-rose-500/20 p-3 rounded-xl flex items-center gap-2">
      <AlertTriangle class="w-4 h-4 shrink-0 text-rose-400" />
      <span>{{ errorMsg }}</span>
    </div>

    <form @submit.prevent="handleSaveProfile" class="space-y-5">
      <!-- Gender Selection -->
      <div class="space-y-2">
        <label class="block text-xs font-bold text-gray-400 uppercase tracking-wider">
          {{ $t('settings.profileSection.genderLabel') }} <span class="text-rose-400">*</span>
        </label>
        <div class="grid grid-cols-2 gap-3">
          <button
            type="button"
            @click="profileForm.gender = 'male'"
            :class="[
              'py-3 px-3 rounded-xl border text-xs font-semibold transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer',
              profileForm.gender === 'male'
                ? 'bg-blue-600/20 border-blue-500/50 text-blue-300 shadow-md shadow-blue-500/10'
                : 'bg-gray-950/60 border-gray-800 text-gray-400 hover:text-gray-200 hover:border-gray-700'
            ]"
          >
            <span class="text-base">👨</span>
            <span>{{ $t('settings.profileSection.male') }}</span>
          </button>

          <button
            type="button"
            @click="profileForm.gender = 'female'"
            :class="[
              'py-3 px-3 rounded-xl border text-xs font-semibold transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer',
              profileForm.gender === 'female'
                ? 'bg-pink-600/20 border-pink-500/50 text-pink-300 shadow-md shadow-pink-500/10'
                : 'bg-gray-950/60 border-gray-800 text-gray-400 hover:text-gray-200 hover:border-gray-700'
            ]"
          >
            <span class="text-base">👩</span>
            <span>{{ $t('settings.profileSection.female') }}</span>
          </button>
        </div>
      </div>

      <!-- Birthdate & Age -->
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div class="space-y-2">
          <div class="flex items-center justify-between">
            <label for="profile-birthdate" class="block text-xs font-bold text-gray-400 uppercase tracking-wider">
              {{ $t('settings.profileSection.birthdateLabel') }} <span class="text-rose-400">*</span>
            </label>
            <span v-if="calculatedAge !== null" class="text-xs font-bold text-violet-400 bg-violet-600/15 border border-violet-500/20 px-2.5 py-0.5 rounded-lg">
              {{ $t('settings.profileSection.ageYears', { age: calculatedAge }) }}
            </span>
          </div>
          <input
            id="profile-birthdate"
            type="date"
            required
            v-model="profileForm.birthDate"
            class="w-full px-3.5 py-2.5 rounded-xl bg-gray-950 border border-gray-800 focus:border-violet-500/50 text-xs text-white"
          />
        </div>

        <!-- Height (cm) -->
        <div class="space-y-2">
          <label for="profile-height" class="block text-xs font-bold text-gray-400 uppercase tracking-wider">
            {{ $t('settings.profileSection.heightLabel') }} <span class="text-rose-400">*</span>
          </label>
          <div class="relative">
            <input
              id="profile-height"
              type="number"
              min="50"
              max="250"
              step="1"
              required
              :placeholder="$t('settings.profileSection.heightPlaceholder')"
              v-model="profileForm.height"
              class="w-full pl-3.5 pr-10 py-2.5 rounded-xl bg-gray-950 border border-gray-800 focus:border-violet-500/50 text-xs text-white"
            />
            <span class="absolute inset-y-0 right-3.5 flex items-center text-xs text-gray-500 font-semibold pointer-events-none">
              cm
            </span>
          </div>
        </div>
      </div>

      <div class="flex flex-col sm:flex-row gap-3 pt-2">
        <button
          type="button"
          v-if="isProfileActive || profileForm.gender || profileForm.birthDate || profileForm.height"
          @click="handleResetProfile"
          :disabled="profileLoading"
          class="py-3 px-4 rounded-xl bg-gray-900 hover:bg-rose-500/10 hover:text-rose-400 hover:border-rose-500/30 text-gray-400 border border-gray-800 text-xs font-semibold transition-all duration-200 cursor-pointer flex items-center justify-center gap-1.5"
        >
          <Trash2 class="w-4 h-4" />
          <span>{{ $t('settings.profileSection.resetBtn') }}</span>
        </button>

        <button
          type="submit"
          :disabled="profileLoading || !isProfileComplete"
          :class="[
            'flex-1 py-3 px-4 rounded-xl font-semibold text-xs transition-all duration-200 flex items-center justify-center gap-1.5 cursor-pointer',
            isProfileComplete
              ? 'bg-violet-600 hover:bg-violet-500 active:scale-[0.98] text-white shadow-lg shadow-violet-500/20'
              : 'bg-gray-800/80 text-gray-500 cursor-not-allowed border border-gray-700/50'
          ]"
        >
          {{ profileLoading ? $t('settings.profileSection.savingBtn') : $t('settings.profileSection.saveBtn') }}
        </button>
      </div>
    </form>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { Sparkles, Trash2, AlertTriangle } from 'lucide-vue-next';
import { useBodyGraphStore, calculateAge } from '../stores/bodyGraph';
import { useI18n } from '../i18n';
import { useToast } from '../composables/useToast';

const store = useBodyGraphStore();
const { t } = useI18n();
const toast = useToast();

const profileForm = ref({
  gender: null,
  birthDate: '',
  height: ''
});
const profileLoading = ref(false);
const errorMsg = ref('');

const loadProfile = () => {
  profileForm.value = {
    gender: store.profile?.gender ?? null,
    birthDate: store.profile?.birthDate ?? '',
    height: store.profile?.height !== null && store.profile?.height !== undefined ? store.profile.height : ''
  };
};

onMounted(() => {
  loadProfile();
});

watch(() => store.profile, () => {
  loadProfile();
}, { deep: true });

const calculatedAge = computed(() => {
  return calculateAge(profileForm.value.birthDate);
});

const isProfileComplete = computed(() => {
  const h = Number(profileForm.value.height);
  return (
    (profileForm.value.gender === 'male' || profileForm.value.gender === 'female') &&
    !!profileForm.value.birthDate &&
    calculatedAge.value !== null &&
    calculatedAge.value >= 5 &&
    calculatedAge.value <= 120 &&
    !isNaN(h) &&
    h >= 50 &&
    h <= 250
  );
});

const isProfileActive = computed(() => {
  return (
    (store.profile?.gender === 'male' || store.profile?.gender === 'female') &&
    !!store.profile?.birthDate &&
    store.profile?.height !== null &&
    store.profile?.height !== undefined
  );
});

const handleSaveProfile = async () => {
  profileLoading.value = true;
  errorMsg.value = '';

  try {
    if (!profileForm.value.gender || (profileForm.value.gender !== 'male' && profileForm.value.gender !== 'female')) {
      errorMsg.value = t('settings.profileSection.genderLabel');
      profileLoading.value = false;
      return;
    }

    if (!profileForm.value.birthDate || calculatedAge.value === null || calculatedAge.value < 5 || calculatedAge.value > 120) {
      errorMsg.value = t('settings.profileSection.birthdateLabel');
      profileLoading.value = false;
      return;
    }

    const hVal = Number(profileForm.value.height);
    if (!profileForm.value.height || isNaN(hVal) || hVal < 50 || hVal > 250) {
      errorMsg.value = t('settings.profileSection.heightLabel');
      profileLoading.value = false;
      return;
    }

    await store.updateProfile({
      gender: profileForm.value.gender,
      birthDate: profileForm.value.birthDate,
      height: hVal
    });

    toast.showToast(t('settings.profileSection.saveSuccess'), 'success');
  } catch (error) {
    errorMsg.value = t('settings.profileSection.saveFailed') + error.message;
  } finally {
    profileLoading.value = false;
  }
};

const handleResetProfile = async () => {
  profileLoading.value = true;
  errorMsg.value = '';

  try {
    profileForm.value = {
      gender: null,
      birthDate: '',
      height: ''
    };
    await store.updateProfile({
      gender: null,
      birthDate: null,
      height: null
    });
    toast.showToast(t('settings.profileSection.resetSuccess'), 'success');
  } catch (error) {
    errorMsg.value = t('settings.profileSection.saveFailed') + error.message;
  } finally {
    profileLoading.value = false;
  }
};
</script>
