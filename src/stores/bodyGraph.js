import { defineStore } from 'pinia';
import { Capacitor } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import { supabase, handleAuthCallbackUrl } from '../supabase';
import { 
  getAllLogs, 
  saveLog, 
  deleteLog, 
  syncLogs, 
  migrateGuestLogsInDB,
  getAllMeasurements,
  saveMeasurement,
  deleteMeasurement,
  exportAllData,
  importAllData
} from '../db';

let deepLinksConfigured = false;

export {
  getMondayOfDate,
  getSundayOfMonday,
  calculateMedian,
  getRollingLogsForDate,
  getRollingMedianForDate,
  calculateAge,
  getPreviousWindowEndDate
} from '../utils/dateAndMath';

import {
  calculateAge
} from '../utils/dateAndMath';

import {
  computeLogsWithEstimates,
  computeGroupedMonths,
  computeGroupedWeeks,
  computeRollingStats,
  computePeriodStats
} from '../services/stats/groupingService';

import {
  evaluatePalierAutoValidation
} from '../services/goals/palierService';

import {
  resolveEffectiveLanguage,
  setLanguage,
  currentLanguage
} from '../i18n';


// Default display preferences
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
    showFatPercentChart: false,
    showBiaMuscleChart: true,
    showBiaFatChart: false
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

export const useBodyGraphStore = defineStore('bodyGraph', {
  state: () => ({
    logs: [],
    measurements: [],
    user: null,
    session: null,
    isOnline: navigator.onLine,
    isSyncing: false,
    activeView: 'dashboard', // 'dashboard' | 'settings'
    activeTab: 'monthly',
    showAddModal: false,
    showAddMeasurementModal: false,
    showLiveWeighInModal: false,
    showAuthModal: false,
    showSettingsModal: false,
    initialized: false,
    syncError: null,
    isGuestMode: false,
    targetMass: null,
    targetFat: null,
    paliers: [],
    profile: {
      gender: null,    // 'male' | 'female' | null
      birthDate: null, // 'YYYY-MM-DD' | null
      height: null     // number in cm | null
    },
    pairedDevices: [], // [{ id, deviceId, name, type, mac, pairedAt }]
    startYear: null,
    endYear: null,
    
    // Index of the month in the groupedMonths list (0 is the newest month)
    selectedMonthIndex: 0,
    // Index of the week in the groupedWeeks list (0 is the newest week)
    selectedWeekIndex: 0,
    // Active log record being edited, null if creating a new one
    editingLog: null,
    editingMeasurement: null,

    // Language preference ('fr' | 'en' | null for auto-detect from browser)
    language: null,

    // Display and visibility preferences (Cards & Charts & BIA Segments)
    displayPreferences: JSON.parse(JSON.stringify(DEFAULT_DISPLAY_PREFERENCES))
  }),

  getters: {
    effectiveLanguage(state) {
      return resolveEffectiveLanguage(state.language);
    },
    userAge(state) {
      return calculateAge(state.profile.birthDate);
    },

    availableYears(state) {
      if (state.logs.length === 0) return [];
      const yearsSet = new Set();
      for (const log of state.logs) {
        if (log.date) {
          const yr = new Date(log.date).getFullYear();
          if (!isNaN(yr)) {
            yearsSet.add(yr);
          }
        }
      }
      return Array.from(yearsSet).sort((a, b) => b - a);
    },
    showDashboard: (state) => {
      return !!state.user || state.isGuestMode;
    },

    isCloudConfigured: () => {
      return !!supabase;
    },

    currentUserId: (state) => {
      return state.user?.id || 'guest';
    },

    isAuthenticated: (state) => {
      return !!state.user;
    },

    userEmail: (state) => {
      if (state.user) {
        if (state.user.is_anonymous) {
          return 'Anonymous Cloud Profile';
        }
        return state.user.email;
      }
      return 'Guest Profile';
    },

    logsWithEstimates: (state) => {
      return computeLogsWithEstimates(state.logs);
    },

    groupedMonths(state) {
      return computeGroupedMonths(this.logsWithEstimates, state.startYear, state.endYear);
    },

    groupedWeeks(state) {
      return computeGroupedWeeks(this.logsWithEstimates, state.startYear, state.endYear);
    },

    sortedMeasurements: (state) => {
      return [...state.measurements].sort((a, b) => b.date.localeCompare(a.date));
    },

    // Gets currently selected active month
    activeMonth() {
      const months = this.groupedMonths;
      if (months.length === 0) return null;
      const safeIndex = Math.max(0, Math.min(this.selectedMonthIndex, months.length - 1));
      return months[safeIndex];
    },

    // Gets currently selected active week
    activeWeek() {
      const weeks = this.groupedWeeks;
      if (weeks.length === 0) return null;
      const safeIndex = Math.max(0, Math.min(this.selectedWeekIndex, weeks.length - 1));
      return weeks[safeIndex];
    },

    targetLeanMass: (state) => {
      return (state.targetMass !== null && state.targetFat !== null)
        ? state.targetMass - (state.targetMass * (state.targetFat / 100))
        : null;
    },

    targetFatMass: (state) => {
      return (state.targetMass !== null && state.targetFat !== null)
        ? state.targetMass * (state.targetFat / 100)
        : null;
    },

    paliersSorted(state) {
      return [...state.paliers];
    },

    activePalier() {
      const paliers = this.paliersSorted;
      if (paliers.length === 0) return null;
      return paliers.find(p => !p.validated) || null;
    },

    stats() {
      return computeRollingStats(this.logsWithEstimates);
    },

    periodStats() {
      return computePeriodStats({
        activeTab: this.activeTab,
        groupedMonths: this.groupedMonths,
        groupedWeeks: this.groupedWeeks,
        activeMonth: this.activeMonth,
        activeWeek: this.activeWeek,
        selectedMonthIndex: this.selectedMonthIndex,
        selectedWeekIndex: this.selectedWeekIndex,
        stats: this.stats
      });
    }
  },

  actions: {
    // Select log entry to trigger editing mode
    setEditingLog(log) {
      this.editingLog = log;
      this.showAddModal = true;
    },

    setEditingMeasurement(measurement) {
      this.editingMeasurement = measurement;
      this.showAddMeasurementModal = true;
    },

    // Navigation actions for months list
    goToPreviousMonth() {
      const maxIndex = this.groupedMonths.length - 1;
      if (this.selectedMonthIndex < maxIndex) {
        this.selectedMonthIndex++;
      }
    },

    goToNextMonth() {
      if (this.selectedMonthIndex > 0) {
        this.selectedMonthIndex--;
      }
    },

    // Navigation actions for weeks list
    goToPreviousWeek() {
      const maxIndex = this.groupedWeeks.length - 1;
      if (this.selectedWeekIndex < maxIndex) {
        this.selectedWeekIndex++;
      }
    },

    goToNextWeek() {
      if (this.selectedWeekIndex > 0) {
        this.selectedWeekIndex--;
      }
    },

    // Initialize Auth Session & listeners
    async initAuth() {
      // Load local goals & profile first (guest / fallback)
      this.targetMass = localStorage.getItem('bodygraph_target_mass') ? Number(localStorage.getItem('bodygraph_target_mass')) : null;
      this.targetFat = localStorage.getItem('bodygraph_target_fat') ? Number(localStorage.getItem('bodygraph_target_fat')) : null;

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

      const savedPaliers = localStorage.getItem('bodygraph_paliers');
      if (savedPaliers) {
        try {
          this.paliers = JSON.parse(savedPaliers);
        } catch (e) {
          this.paliers = [];
        }
      } else {
        // Fallback or migration for single goal to multiple paliers
        if (this.targetMass !== null || this.targetFat !== null) {
          this.paliers = [{
            id: crypto.randomUUID(),
            mass: this.targetMass,
            fat: this.targetFat,
            validated: false
          }];
        } else {
          this.paliers = [];
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

      if (!supabase) {
        await this.loadLogs();
        this.initialized = true;
        this.syncSingleGoalsFromActivePalier();
        return;
      }

      try {
        await this.setupAuthDeepLinks();
        const { data } = await supabase.auth.getSession();
        this.session = data.session;
        this.user = data.session?.user || null;
        
        if (this.user) {
          if (this.user.user_metadata?.language) {
            this.language = this.user.user_metadata.language;
            setLanguage(this.language);
            localStorage.setItem('bodygraph_language', this.language);
          }
          this.targetMass = this.user.user_metadata?.target_mass || null;
          this.targetFat = this.user.user_metadata?.target_fat || null;
          if (this.user.user_metadata?.profile) {
            this.profile = {
              gender: this.user.user_metadata.profile.gender ?? null,
              birthDate: this.user.user_metadata.profile.birthDate ?? null,
              height: this.user.user_metadata.profile.height ? Number(this.user.user_metadata.profile.height) : null
            };
            localStorage.setItem('bodygraph_profile', JSON.stringify(this.profile));
          } else if (this.profile.gender || this.profile.birthDate || this.profile.height) {
            // Upload local guest profile to cloud on initial session discovery
            await supabase.auth.updateUser({ data: { profile: this.profile } });
          }

          if (this.user.user_metadata?.paired_devices) {
            this.pairedDevices = this.user.user_metadata.paired_devices;
            localStorage.setItem('bodygraph_devices', JSON.stringify(this.pairedDevices));
          } else if (this.pairedDevices.length > 0) {
            await supabase.auth.updateUser({ data: { paired_devices: this.pairedDevices } });
          }

          if (this.user.user_metadata?.paliers) {
            this.paliers = this.user.user_metadata.paliers;
            localStorage.setItem('bodygraph_paliers', JSON.stringify(this.paliers));
          } else if (this.targetMass !== null || this.targetFat !== null) {
            this.paliers = [{
              id: crypto.randomUUID(),
              mass: this.targetMass,
              fat: this.targetFat,
              validated: false
            }];
          } else {
            this.paliers = [];
          }
        }
        
        await this.loadLogs();

        supabase.auth.onAuthStateChange(async (event, session) => {
          this.session = session;
          this.user = session?.user || null;
          
          if (session?.user) {
            if (session.user.user_metadata?.language) {
              this.language = session.user.user_metadata.language;
              setLanguage(this.language);
              localStorage.setItem('bodygraph_language', this.language);
            }
            this.targetMass = session.user.user_metadata?.target_mass || null;
            this.targetFat = session.user.user_metadata?.target_fat || null;
            if (session.user.user_metadata?.profile) {
              this.profile = {
                gender: session.user.user_metadata.profile.gender ?? null,
                birthDate: session.user.user_metadata.profile.birthDate ?? null,
                height: session.user.user_metadata.profile.height ? Number(session.user.user_metadata.profile.height) : null
              };
              localStorage.setItem('bodygraph_profile', JSON.stringify(this.profile));
            } else if (this.profile.gender || this.profile.birthDate || this.profile.height) {
              await supabase.auth.updateUser({ data: { profile: this.profile } });
            }

            if (session.user.user_metadata?.paired_devices) {
              this.pairedDevices = session.user.user_metadata.paired_devices;
              localStorage.setItem('bodygraph_devices', JSON.stringify(this.pairedDevices));
            } else if (this.pairedDevices.length > 0) {
              await supabase.auth.updateUser({ data: { paired_devices: this.pairedDevices } });
            }

            if (session.user.user_metadata?.paliers) {
              this.paliers = session.user.user_metadata.paliers;
              localStorage.setItem('bodygraph_paliers', JSON.stringify(this.paliers));
            } else if (this.targetMass !== null || this.targetFat !== null) {
              this.paliers = [{
                id: crypto.randomUUID(),
                mass: this.targetMass,
                fat: this.targetFat,
                validated: false
              }];
            } else {
              this.paliers = [];
            }
            await this.migrateGuestLogs(session.user.id);
          } else {
            // Revert to local goals & profile
            this.targetMass = localStorage.getItem('bodygraph_target_mass') ? Number(localStorage.getItem('bodygraph_target_mass')) : null;
            this.targetFat = localStorage.getItem('bodygraph_target_fat') ? Number(localStorage.getItem('bodygraph_target_fat')) : null;
            const savedP = localStorage.getItem('bodygraph_profile');
            if (savedP) {
              try {
                const parsed = JSON.parse(savedP);
                this.profile = {
                  gender: parsed?.gender ?? null,
                  birthDate: parsed?.birthDate ?? null,
                  height: parsed?.height ? Number(parsed.height) : null
                };
              } catch (e) {
                this.profile = { gender: null, birthDate: null, height: null };
              }
            } else {
              this.profile = { gender: null, birthDate: null, height: null };
            }
            const savedD = localStorage.getItem('bodygraph_devices');
            if (savedD) {
              try {
                this.pairedDevices = JSON.parse(savedD);
              } catch (e) {
                this.pairedDevices = [];
              }
            } else {
              this.pairedDevices = [];
            }
            const saved = localStorage.getItem('bodygraph_paliers');
            if (saved) {
              try {
                this.paliers = JSON.parse(saved);
              } catch (e) {
                this.paliers = [];
              }
            } else if (this.targetMass !== null || this.targetFat !== null) {
              this.paliers = [{
                id: crypto.randomUUID(),
                mass: this.targetMass,
                fat: this.targetFat,
                validated: false
              }];
            } else {
              this.paliers = [];
            }
          }
          
          this.syncSingleGoalsFromActivePalier();
          await this.loadLogs();
          this.triggerSync();
        });

      } catch (error) {
        console.error('Auth initialization failed:', error);
        await this.loadLogs();
      } finally {
        this.initialized = true;
        this.syncSingleGoalsFromActivePalier();
      }
    },

    enableGuestMode() {
      this.isGuestMode = true;
      this.loadLogs();
    },

    syncSingleGoalsFromActivePalier() {
      const active = this.activePalier;
      if (active) {
        this.targetMass = active.mass !== null ? Number(active.mass) : null;
        this.targetFat = active.fat !== null ? Number(active.fat) : null;
      } else {
        this.targetMass = null;
        this.targetFat = null;
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

      // Offline-first persistence
      localStorage.setItem('bodygraph_display_preferences', JSON.stringify(this.displayPreferences));

      // Cloud sync if authenticated
      if (supabase && this.user) {
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

      if (supabase && this.user) {
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

      // Always save to localStorage (offline-first)
      localStorage.setItem('bodygraph_profile', JSON.stringify(this.profile));

      if (this.user && supabase) {
        try {
          const { data, error } = await supabase.auth.updateUser({
            data: {
              profile: this.profile
            }
          });
          if (error) throw error;
          this.user = data.user;
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

      if (this.user && supabase) {
        try {
          const { data, error } = await supabase.auth.updateUser({
            data: {
              paired_devices: this.pairedDevices
            }
          });
          if (error) throw error;
          this.user = data.user;
        } catch (err) {
          console.warn('Failed to sync paired devices to supabase:', err);
        }
      }
      return newDevice;
    },

    async removePairedDevice(deviceId) {
      this.pairedDevices = this.pairedDevices.filter(d => d.deviceId !== deviceId && d.id !== deviceId);
      localStorage.setItem('bodygraph_devices', JSON.stringify(this.pairedDevices));

      if (this.user && supabase) {
        try {
          const { data, error } = await supabase.auth.updateUser({
            data: {
              paired_devices: this.pairedDevices
            }
          });
          if (error) throw error;
          this.user = data.user;
        } catch (err) {
          console.warn('Failed to sync paired devices removal to supabase:', err);
        }
      }
    },

    async updatePaliers(paliersList) {
      this.paliers = paliersList;
      this.syncSingleGoalsFromActivePalier();

      // Always persist to localStorage
      localStorage.setItem('bodygraph_paliers', JSON.stringify(this.paliers));
      if (this.targetMass !== null) {
        localStorage.setItem('bodygraph_target_mass', this.targetMass);
      } else {
        localStorage.removeItem('bodygraph_target_mass');
      }
      if (this.targetFat !== null) {
        localStorage.setItem('bodygraph_target_fat', this.targetFat);
      } else {
        localStorage.removeItem('bodygraph_target_fat');
      }

      // Sync to Supabase if logged in
      if (this.user && supabase) {
        try {
          const { data, error } = await supabase.auth.updateUser({
            data: {
              target_mass: this.targetMass,
              target_fat: this.targetFat,
              paliers: this.paliers
            }
          });
          if (error) throw error;
          this.user = data.user;
        } catch (error) {
          console.error('Failed to update goals in supabase:', error);
          throw error;
        }
      }
    },

    async updateGoals(mass, fat) {
      // Legacy support, also creates or updates first palier
      this.targetMass = mass ? Number(mass) : null;
      this.targetFat = fat ? Number(fat) : null;

      if (this.paliers.length > 0) {
        const active = this.paliers[0];
        active.mass = this.targetMass;
        active.fat = this.targetFat;
      } else {
        this.paliers = [{
          id: crypto.randomUUID(),
          mass: this.targetMass,
          fat: this.targetFat,
          validated: false
        }];
      }

      await this.updatePaliers(this.paliers);
    },

    async signInWithEmail(email, password) {
      if (!supabase) return;
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password
        });
        if (error) throw error;
        return data;
      } catch (error) {
        console.error('Email sign in failed:', error);
        throw error;
      }
    },

    async signUpWithEmail(email, password) {
      if (!supabase) return;
      try {
        const { data, error } = await supabase.auth.signUp({
          email,
          password
        });
        if (error) throw error;
        return data;
      } catch (error) {
        console.error('Email sign up failed:', error);
        throw error;
      }
    },

    async setupAuthDeepLinks() {
      if (!Capacitor.isNativePlatform() || !supabase) return;

      try {
        // Cold start deep link check
        const launchUrl = await CapApp.getLaunchUrl();
        if (launchUrl?.url && launchUrl.url.includes('auth-callback')) {
          if (Capacitor.isPluginAvailable('Browser')) {
            await Browser.close().catch(() => {});
          }
          await handleAuthCallbackUrl(launchUrl.url);
          this.showAuthModal = false;
        }

        if (!deepLinksConfigured) {
          deepLinksConfigured = true;
          // Warm / background start deep link listener
          CapApp.addListener('appUrlOpen', async ({ url }) => {
            if (url && url.includes('auth-callback')) {
              if (Capacitor.isPluginAvailable('Browser')) {
                await Browser.close().catch(() => {});
              }
              try {
                await handleAuthCallbackUrl(url);
                this.showAuthModal = false;
              } catch (err) {
                console.error('Deep link auth callback failed:', err);
              }
            }
          });
        }
      } catch (e) {
        console.warn('Failed to setup native auth deep links:', e);
      }
    },

    async signInWithGoogle() {
      if (!supabase) return;
      try {
        const isNative = Capacitor.isNativePlatform();
        const redirectTo = isNative
          ? 'com.devopsbenjamin.simplebodygraph://auth-callback'
          : window.location.origin;

        const { data, error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo,
            skipBrowserRedirect: isNative
          }
        });
        if (error) throw error;

        if (isNative && data?.url) {
          if (Capacitor.isPluginAvailable('Browser')) {
            try {
              await Browser.open({ url: data.url, windowName: '_self' });
            } catch (browserErr) {
              console.warn('Browser.open failed, falling back to window.open:', browserErr);
              window.open(data.url, '_system');
            }
          } else {
            console.warn('Capacitor Browser plugin not compiled into native APK, falling back to window.open');
            window.open(data.url, '_system');
          }
        }
        return data;
      } catch (error) {
        console.error('Google OAuth failed:', error);
        throw error;
      }
    },

    async logout() {
      this.isGuestMode = false;
      this.targetMass = localStorage.getItem('bodygraph_target_mass') ? Number(localStorage.getItem('bodygraph_target_mass')) : null;
      this.targetFat = localStorage.getItem('bodygraph_target_fat') ? Number(localStorage.getItem('bodygraph_target_fat')) : null;
      if (!supabase) {
        this.user = null;
        this.session = null;
        this.activeTab = 'monthly';
        this.selectedMonthIndex = 0;
        this.selectedWeekIndex = 0;
        this.editingLog = null;
        await this.loadLogs();
        return;
      }
      try {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
        
        this.user = null;
        this.session = null;
        this.activeTab = 'monthly';
        this.selectedMonthIndex = 0;
        this.selectedWeekIndex = 0;
        this.editingLog = null;
        this.editingMeasurement = null;
        
        await this.loadLogs();
      } catch (error) {
        console.error('Logout failed:', error);
        throw error;
      }
    },

    updateYearsAndClamps() {
      // Initialize start and end years if not set or if they are no longer in availableYears
      const years = this.availableYears;
      if (years.length > 0) {
        if (this.startYear === null || !years.includes(this.startYear)) {
          this.startYear = years[years.length - 1]; // Oldest year
        }
        if (this.endYear === null || !years.includes(this.endYear)) {
          this.endYear = years[0]; // Newest year
        }
      }

      // Cleanly clamp selected indices after loading logs to keep bounds valid
      const maxMonthIndex = this.groupedMonths.length - 1;
      if (this.selectedMonthIndex > maxMonthIndex) {
        this.selectedMonthIndex = Math.max(0, maxMonthIndex);
      }

      const maxIndex = this.groupedWeeks.length - 1;
      if (this.selectedWeekIndex > maxIndex) {
        this.selectedWeekIndex = Math.max(0, maxIndex);
      }
    },

    async loadLogs() {
      try {
        this.logs = await getAllLogs(this.currentUserId);
        this.measurements = await getAllMeasurements(this.currentUserId);
        this.updateYearsAndClamps();
      } catch (error) {
        console.error('Store failed to load logs/measurements:', error);
      }
    },

    // Save or update a log entry
    async checkAndAutoValidatePaliers() {
      const { changed, updatedPaliers } = evaluatePalierAutoValidation(this.paliers, this.logsWithEstimates);
      if (changed) {
        await this.updatePaliers(updatedPaliers);
      }
    },

    async saveLogEntry({ id, mass, bodyFat, date, measuredAt, heartRate, impedances, scaleDeviceId }) {
      const log = {
        id: id || crypto.randomUUID(),
        date,
        mass: Number(mass),
        body_fat: bodyFat !== null && bodyFat !== undefined && bodyFat !== '' ? Number(bodyFat) : 0,
        measured_at: measuredAt || null,
        heart_rate: heartRate || null,
        impedances: impedances || null,
        scale_device_id: scaleDeviceId || null,
        synced: false
      };

      try {
        await saveLog(log, this.currentUserId);

        // Optimistically update logs in-memory
        const logWithUserId = { ...log, user_id: this.currentUserId };
        const existingIndex = this.logs.findIndex(l => l.id === log.id);
        if (existingIndex !== -1) {
          this.logs[existingIndex] = logWithUserId;
        } else {
          this.logs.push(logWithUserId);
        }

        // Sort descending by date
        this.logs.sort((a, b) => b.date.localeCompare(a.date));

        this.updateYearsAndClamps();
        await this.checkAndAutoValidatePaliers();

        this.showAddModal = false;
        this.editingLog = null;
        this.triggerSync();
      } catch (error) {
        console.error('Store failed to save log:', error);
        throw error;
      }
    },

    async deleteLogEntry(id) {
      try {
        await deleteLog(id, this.currentUserId);

        // Optimistically delete in-memory
        this.logs = this.logs.filter(l => l.id !== id);

        this.updateYearsAndClamps();
        this.triggerSync();
      } catch (error) {
        console.error('Store failed to delete log:', error);
        throw error;
      }
    },

    async saveMeasurementEntry(measurementData) {
      const log = {
        id: measurementData.id || crypto.randomUUID(),
        date: measurementData.date,
        waist: measurementData.waist ? Number(measurementData.waist) : null,
        chest: measurementData.chest ? Number(measurementData.chest) : null,
        arms: measurementData.arms ? Number(measurementData.arms) : null,
        thighs: measurementData.thighs ? Number(measurementData.thighs) : null,
        synced: false
      };

      try {
        await saveMeasurement(log, this.currentUserId);

        // Optimistically update measurements in-memory
        const logWithUserId = { ...log, user_id: this.currentUserId };
        const existingIndex = this.measurements.findIndex(m => m.id === log.id);
        if (existingIndex !== -1) {
          this.measurements[existingIndex] = logWithUserId;
        } else {
          this.measurements.push(logWithUserId);
        }

        // Sort descending by date
        this.measurements.sort((a, b) => b.date.localeCompare(a.date));

        this.updateYearsAndClamps();

        this.showAddMeasurementModal = false;
        this.editingMeasurement = null;
        this.triggerSync();
      } catch (error) {
        console.error('Store failed to save measurement:', error);
        throw error;
      }
    },

    async deleteMeasurementEntry(id) {
      try {
        await deleteMeasurement(id, this.currentUserId);

        // Optimistically delete in-memory
        this.measurements = this.measurements.filter(m => m.id !== id);

        this.updateYearsAndClamps();
        this.triggerSync();
      } catch (error) {
        console.error('Store failed to delete measurement:', error);
        throw error;
      }
    },

    async migrateGuestLogs(newUserId) {
      try {
        await migrateGuestLogsInDB(newUserId);
      } catch (error) {
        console.error('Store failed guest log migration:', error);
      }
    },

    async triggerSync() {
      if (this.currentUserId === 'guest' || !this.isOnline) return;

      this.isSyncing = true;
      this.syncError = null;
      try {
        const result = await syncLogs(this.currentUserId);
        if (result && !result.success) {
          this.syncError = result.error || 'Unknown sync error';
          console.warn('Store background sync failed:', this.syncError);
        }
        await this.loadLogs();
      } catch (err) {
        this.syncError = err.message || err;
        console.warn('Store background sync failed:', err);
      } finally {
        this.isSyncing = false;
      }
    },

    async exportData() {
      const data = await exportAllData(this.currentUserId, this.paliers, this.profile, this.displayPreferences, this.language);
      const jsonStr = JSON.stringify(data, null, 2);
      if (typeof window !== 'undefined' && typeof document !== 'undefined') {
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const dateStr = new Date().toISOString().split('T')[0];
        const a = document.createElement('a');
        a.href = url;
        a.download = `simplebodygraph_backup_${dateStr}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
      return data;
    },

    async importData(jsonContent) {
      let parsed;
      if (typeof jsonContent === 'string') {
        try {
          parsed = JSON.parse(jsonContent);
        } catch (err) {
          throw new Error("Le fichier sélectionné n'est pas un JSON valide.");
        }
      } else {
        parsed = jsonContent;
      }

      const result = await importAllData(parsed, this.currentUserId);

      if (result.paliers && Array.isArray(result.paliers) && result.paliers.length > 0) {
        await this.updatePaliers(result.paliers);
      }

      if (result.profile && typeof result.profile === 'object') {
        await this.updateProfile(result.profile);
      }

      if (result.displayPreferences && typeof result.displayPreferences === 'object') {
        await this.updateDisplayPreferences(result.displayPreferences);
      }

      if (result.language) {
        await this.updateLanguage(result.language);
      }

      await this.loadLogs();
      await this.checkAndAutoValidatePaliers();
      this.triggerSync();

      return result;
    },

    setOnlineStatus(status) {
      this.isOnline = status;
      if (status) {
        this.triggerSync();
      }
    }
  }
});
