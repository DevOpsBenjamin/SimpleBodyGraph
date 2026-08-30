import { defineStore } from 'pinia';
import { supabase } from '../supabase';
import { checkGitHubRelease, openApkDownload } from '../services/updateService';
import { resolveEffectiveLanguage, setLanguage } from '../i18n';
import { calculateAge } from '../utils/dateAndMath';
import { useAuthStore } from './auth';

export const DEFAULT_DISPLAY_PREFERENCES = {
  cards: {
    mass: true,
    fatMass: true,
    bodyFat: true,
    leanMass: true
  },
  charts: {
    showMass: true,
    showFatMass: true,
    showLeanMass: false,
    showFatPercentChart: true,
    showBiaMuscleChart: true,
    showBiaFatChart: false,
    showBiaRecalculatedChart: true
  },
  segmentalColors: {
    muscle: {
      total: '#a78bfa',
      trunk: '#fbbf24',
      rightArm: '#22d3ee',
      leftArm: '#38bdf8',
      rightLeg: '#34d399',
      leftLeg: '#a3e635'
    },
    fat: {
      total: '#c084fc',
      trunk: '#f59e0b',
      rightArm: '#06b6d4',
      leftArm: '#0ea5e9',
      rightLeg: '#10b981',
      leftLeg: '#84cc16'
    }
  },
  segmentalVisibility: {
    muscle: {
      total: true,
      trunk: true,
      rightArm: true,
      leftArm: true,
      rightLeg: true,
      leftLeg: true
    },
    fat: {
      total: true,
      trunk: true,
      rightArm: true,
      leftArm: true,
      rightLeg: true,
      leftLeg: true
    }
  }
};

export const useSettingsStore = defineStore('settings', {
  state: () => ({
    profile: {
      gender: null,
      birthDate: null,
      height: null
    },
    pairedDevices: [],
    displayPreferences: JSON.parse(JSON.stringify(DEFAULT_DISPLAY_PREFERENCES)),
    language: null,

    // App updates & GitHub Releases
    availableApkUpdate: null,
    isCheckingForUpdates: false,
    apkUpdateDismissed: false
  }),

  getters: {
    effectiveLanguage(state) {
      return resolveEffectiveLanguage(state.language);
    },
    userAge(state) {
      return calculateAge(state.profile.birthDate);
    },
    isCloudConfigured: () => {
      return !!supabase;
    }
  },

  actions: {
    initSettingsFromStorage() {
      const savedProfile = localStorage.getItem('bodygraph_profile');
      if (savedProfile) {
        try {
          const parsed = JSON.parse(savedProfile);
          this.profile = {
            gender: parsed?.gender ?? null,
            birthDate: parsed?.birthDate ?? null,
            height: parsed?.height ? Number(parsed.height) : null
          };
        } catch (e) {
          this.profile = { gender: null, birthDate: null, height: null };
        }
      }

      const savedDevices = localStorage.getItem('bodygraph_devices');
      if (savedDevices) {
        try {
          this.pairedDevices = JSON.parse(savedDevices);
        } catch (e) {
          this.pairedDevices = [];
        }
      }

      const savedLang = localStorage.getItem('bodygraph_language');
      if (savedLang === 'fr' || savedLang === 'en') {
        this.language = savedLang;
      } else {
        this.language = null;
      }
      setLanguage(this.language);

      const savedDisplayPrefs = localStorage.getItem('bodygraph_display_preferences');
      if (savedDisplayPrefs) {
        try {
          const parsed = JSON.parse(savedDisplayPrefs);
          this.displayPreferences = {
            cards: { ...DEFAULT_DISPLAY_PREFERENCES.cards, ...(parsed?.cards || {}) },
            charts: { ...DEFAULT_DISPLAY_PREFERENCES.charts, ...(parsed?.charts || {}) },
            segmentalColors: {
              muscle: { ...DEFAULT_DISPLAY_PREFERENCES.segmentalColors.muscle, ...(parsed?.segmentalColors?.muscle || {}) },
              fat: { ...DEFAULT_DISPLAY_PREFERENCES.segmentalColors.fat, ...(parsed?.segmentalColors?.fat || {}) }
            },
            segmentalVisibility: {
              muscle: { ...DEFAULT_DISPLAY_PREFERENCES.segmentalVisibility.muscle, ...(parsed?.segmentalVisibility?.muscle || {}) },
              fat: { ...DEFAULT_DISPLAY_PREFERENCES.segmentalVisibility.fat, ...(parsed?.segmentalVisibility?.fat || {}) }
            }
          };
        } catch (e) {
          console.warn('Failed to parse saved display preferences:', e);
        }
      }
    },

    loadSettingsFromUserMetadata(user) {
      if (!user) {
        this.initSettingsFromStorage();
        return;
      }

      if (user.user_metadata?.language) {
        this.language = user.user_metadata.language;
        setLanguage(this.language);
        localStorage.setItem('bodygraph_language', this.language);
      }

      if (user.user_metadata?.profile) {
        this.profile = {
          gender: user.user_metadata.profile.gender ?? null,
          birthDate: user.user_metadata.profile.birthDate ?? null,
          height: user.user_metadata.profile.height ? Number(user.user_metadata.profile.height) : null
        };
        localStorage.setItem('bodygraph_profile', JSON.stringify(this.profile));
      }

      if (user.user_metadata?.paired_devices) {
        this.pairedDevices = user.user_metadata.paired_devices;
        localStorage.setItem('bodygraph_devices', JSON.stringify(this.pairedDevices));
      }
    },

    async updateDisplayPreferences(newPrefs) {
      this.displayPreferences = {
        cards: { ...this.displayPreferences.cards, ...(newPrefs?.cards || {}) },
        charts: { ...this.displayPreferences.charts, ...(newPrefs?.charts || {}) },
        segmentalColors: {
          muscle: { ...this.displayPreferences.segmentalColors?.muscle, ...(newPrefs?.segmentalColors?.muscle || {}) },
          fat: { ...this.displayPreferences.segmentalColors?.fat, ...(newPrefs?.segmentalColors?.fat || {}) }
        },
        segmentalVisibility: {
          muscle: { ...this.displayPreferences.segmentalVisibility?.muscle, ...(newPrefs?.segmentalVisibility?.muscle || {}) },
          fat: { ...this.displayPreferences.segmentalVisibility?.fat, ...(newPrefs?.segmentalVisibility?.fat || {}) }
        }
      };

      localStorage.setItem('bodygraph_display_preferences', JSON.stringify(this.displayPreferences));

      const authStore = useAuthStore();
      if (supabase && authStore.user) {
        try {
          await supabase.auth.updateUser({
            data: { display_preferences: this.displayPreferences }
          });
        } catch (error) {
          console.warn('Failed to sync display preferences to cloud:', error);
        }
      }
    },

    async updateLanguage(lang) {
      this.language = (lang === 'fr' || lang === 'en') ? lang : null;
      setLanguage(this.language);

      if (this.language) {
        localStorage.setItem('bodygraph_language', this.language);
      } else {
        localStorage.removeItem('bodygraph_language');
      }

      const authStore = useAuthStore();
      if (supabase && authStore.user) {
        try {
          await supabase.auth.updateUser({
            data: { language: this.language }
          });
        } catch (error) {
          console.warn('Failed to sync language preference to cloud:', error);
        }
      }
    },

    async updateProfile(profileData) {
      this.profile = {
        gender: profileData?.gender ?? null,
        birthDate: profileData?.birthDate ?? null,
        height: profileData?.height !== null && profileData?.height !== undefined && profileData?.height !== ''
          ? Number(profileData.height)
          : null
      };

      localStorage.setItem('bodygraph_profile', JSON.stringify(this.profile));

      const authStore = useAuthStore();
      if (authStore.user && supabase) {
        try {
          const { data, error } = await supabase.auth.updateUser({
            data: {
              profile: this.profile
            }
          });
          if (error) throw error;
          authStore.user = data.user;
        } catch (error) {
          console.error('Failed to update profile in supabase:', error);
          throw error;
        }
      }
    },

    async savePairedDevice(device) {
      const existingIndex = this.pairedDevices.findIndex(d => d.deviceId === device.deviceId);
      const newDevice = {
        id: device.id || crypto.randomUUID(),
        deviceId: device.deviceId,
        name: device.name || 'Balance Bluetooth',
        type: device.type || 'huawei_scale_3',
        mac: device.mac || device.deviceId,
        pairedAt: device.pairedAt || new Date().toISOString()
      };

      if (existingIndex !== -1) {
        this.pairedDevices[existingIndex] = newDevice;
      } else {
        this.pairedDevices.push(newDevice);
      }

      localStorage.setItem('bodygraph_devices', JSON.stringify(this.pairedDevices));

      const authStore = useAuthStore();
      if (authStore.user && supabase) {
        try {
          const { data, error } = await supabase.auth.updateUser({
            data: {
              paired_devices: this.pairedDevices
            }
          });
          if (error) throw error;
          authStore.user = data.user;
        } catch (err) {
          console.warn('Failed to sync paired devices to supabase:', err);
        }
      }
      return newDevice;
    },

    async removePairedDevice(deviceId) {
      this.pairedDevices = this.pairedDevices.filter(d => d.deviceId !== deviceId && d.id !== deviceId);
      localStorage.setItem('bodygraph_devices', JSON.stringify(this.pairedDevices));

      const authStore = useAuthStore();
      if (authStore.user && supabase) {
        try {
          const { data, error } = await supabase.auth.updateUser({
            data: {
              paired_devices: this.pairedDevices
            }
          });
          if (error) throw error;
          authStore.user = data.user;
        } catch (err) {
          console.warn('Failed to sync paired devices removal to supabase:', err);
        }
      }
    },

    async checkForApkUpdates(options = {}) {
      if (typeof navigator !== 'undefined' && navigator.onLine === false) {
        return null;
      }
      this.isCheckingForUpdates = true;
      try {
        const result = await checkGitHubRelease(options);
        if (result && result.hasUpdate) {
          this.availableApkUpdate = result;
          this.apkUpdateDismissed = false;
        } else {
          this.availableApkUpdate = null;
        }
        return result;
      } catch (err) {
        console.debug('[Store] checkGitHubRelease error:', err);
        return null;
      } finally {
        this.isCheckingForUpdates = false;
      }
    },

    dismissApkUpdate() {
      this.apkUpdateDismissed = true;
    },

    downloadApk(url) {
      openApkDownload(url || this.availableApkUpdate?.apkUrl);
    }
  }
});
