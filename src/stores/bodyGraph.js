import { defineStore } from 'pinia';
import { supabase } from '../supabase';
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

import { useAuthStore } from './auth';
import { useGoalsStore } from './goals';
import { useSettingsStore, DEFAULT_DISPLAY_PREFERENCES } from './settings';

export { DEFAULT_DISPLAY_PREFERENCES };

export const useBodyGraphStore = defineStore('bodyGraph', {
  state: () => ({
    logs: [],
    measurements: [],
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    isSyncing: false,
    activeView: 'dashboard', // 'dashboard' | 'settings'
    activeTab: 'monthly',
    showAddModal: false,
    showAddMeasurementModal: false,
    showLiveWeighInModal: false,
    showSettingsModal: false,
    initialized: false,
    syncError: null,
    startYear: null,
    endYear: null,
    
    // Index of the month in the groupedMonths list (0 is the newest month)
    selectedMonthIndex: 0,
    // Index of the week in the groupedWeeks list (0 is the newest week)
    selectedWeekIndex: 0,
    // Active log record being edited, null if creating a new one
    editingLog: null,
    editingMeasurement: null
  }),

  getters: {
    // Delegated auth getters for backward compatibility
    user() {
      return useAuthStore().user;
    },
    session() {
      return useAuthStore().session;
    },
    isGuestMode() {
      return useAuthStore().isGuestMode;
    },
    showAuthModal() {
      return useAuthStore().showAuthModal;
    },
    effectiveLanguage() {
      return useSettingsStore().effectiveLanguage;
    },
    language() {
      return useSettingsStore().language;
    },
    userAge() {
      return useSettingsStore().userAge;
    },
    profile() {
      return useSettingsStore().profile;
    },
    pairedDevices() {
      return useSettingsStore().pairedDevices;
    },
    displayPreferences() {
      return useSettingsStore().displayPreferences;
    },
    availableApkUpdate() {
      return useSettingsStore().availableApkUpdate;
    },
    isCheckingForUpdates() {
      return useSettingsStore().isCheckingForUpdates;
    },
    apkUpdateDismissed() {
      return useSettingsStore().apkUpdateDismissed;
    },

    // Delegated goals getters
    targetMass() {
      return useGoalsStore().targetMass;
    },
    targetFat() {
      return useGoalsStore().targetFat;
    },
    paliers() {
      return useGoalsStore().paliers;
    },
    targetLeanMass() {
      return useGoalsStore().targetLeanMass;
    },
    targetFatMass() {
      return useGoalsStore().targetFatMass;
    },
    paliersSorted() {
      return useGoalsStore().paliersSorted;
    },
    activePalier() {
      return useGoalsStore().activePalier;
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

    showDashboard() {
      return useAuthStore().showDashboard;
    },

    isCloudConfigured() {
      return useSettingsStore().isCloudConfigured;
    },

    currentUserId() {
      return useAuthStore().currentUserId;
    },

    isAuthenticated() {
      return useAuthStore().isAuthenticated;
    },

    userEmail() {
      return useAuthStore().userEmail;
    },

    logsWithEstimates(state) {
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
    setShowAuthModal(val) {
      useAuthStore().showAuthModal = val;
    },

    setEditingLog(log) {
      this.editingLog = log;
      this.showAddModal = true;
    },

    setEditingMeasurement(measurement) {
      this.editingMeasurement = measurement;
      this.showAddMeasurementModal = true;
    },

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

    async initAuth() {
      const authStore = useAuthStore();
      await authStore.initAuth();
      await this.loadLogs();
      this.initialized = true;

      // Subscribe to auth state changes to reload logs if user changes
      if (supabase) {
        supabase.auth.onAuthStateChange(async () => {
          await this.loadLogs();
          this.triggerSync();
        });
      }

      this.checkForApkUpdates();
    },

    async enableGuestMode() {
      const authStore = useAuthStore();
      authStore.enableGuestMode();
      await this.loadLogs();
    },

    syncSingleGoalsFromActivePalier() {
      useGoalsStore().syncSingleGoalsFromActivePalier();
    },

    async updateDisplayPreferences(newPrefs) {
      await useSettingsStore().updateDisplayPreferences(newPrefs);
    },

    async updateLanguage(lang) {
      await useSettingsStore().updateLanguage(lang);
    },

    async updateProfile(profileData) {
      await useSettingsStore().updateProfile(profileData);
    },

    async savePairedDevice(device) {
      return await useSettingsStore().savePairedDevice(device);
    },

    async removePairedDevice(deviceId) {
      await useSettingsStore().removePairedDevice(deviceId);
    },

    async updatePaliers(paliersList) {
      await useGoalsStore().updatePaliers(paliersList);
    },

    async updateGoals(mass, fat) {
      await useGoalsStore().updateGoals(mass, fat);
    },

    async signInWithEmail(email, password) {
      return await useAuthStore().signInWithEmail(email, password);
    },

    async signUpWithEmail(email, password) {
      return await useAuthStore().signUpWithEmail(email, password);
    },

    async setupAuthDeepLinks() {
      return await useAuthStore().setupAuthDeepLinks();
    },

    async signInWithGoogle() {
      return await useAuthStore().signInWithGoogle();
    },

    async logout() {
      const authStore = useAuthStore();
      await authStore.logout();
      this.activeTab = 'monthly';
      this.selectedMonthIndex = 0;
      this.selectedWeekIndex = 0;
      this.editingLog = null;
      this.editingMeasurement = null;
      await this.loadLogs();
    },

    updateYearsAndClamps() {
      const years = this.availableYears;
      if (years.length > 0) {
        if (this.startYear === null || !years.includes(this.startYear)) {
          this.startYear = years[years.length - 1];
        }
        if (this.endYear === null || !years.includes(this.endYear)) {
          this.endYear = years[0];
        }
      }

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
      const authStore = useAuthStore();
      try {
        this.logs = await getAllLogs(authStore.currentUserId);
        this.measurements = await getAllMeasurements(authStore.currentUserId);
        this.updateYearsAndClamps();
      } catch (error) {
        console.error('Store failed to load logs/measurements:', error);
      }
    },

    async checkAndAutoValidatePaliers() {
      const goalsStore = useGoalsStore();
      await goalsStore.checkAndAutoValidatePaliers(this.logsWithEstimates);
    },

    async saveLogEntry({ id, mass, bodyFat, date, measuredAt, heartRate, impedances, scaleDeviceId }) {
      const authStore = useAuthStore();
      const cleanImpedances = impedances ? JSON.parse(JSON.stringify(impedances)) : null;
      const log = {
        id: id || crypto.randomUUID(),
        date,
        mass: Number(mass),
        body_fat: bodyFat !== null && bodyFat !== undefined && bodyFat !== '' ? Number(bodyFat) : 0,
        measured_at: measuredAt || null,
        heart_rate: heartRate ? Number(heartRate) : null,
        impedances: cleanImpedances,
        scale_device_id: scaleDeviceId || null,
        synced: false
      };

      try {
        await saveLog(log, authStore.currentUserId);

        const logWithUserId = { ...log, user_id: authStore.currentUserId };
        const existingIndex = this.logs.findIndex(l => l.id === log.id);
        if (existingIndex !== -1) {
          this.logs[existingIndex] = logWithUserId;
        } else {
          this.logs.push(logWithUserId);
        }

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
      const authStore = useAuthStore();
      try {
        await deleteLog(id, authStore.currentUserId);

        this.logs = this.logs.filter(l => l.id !== id);

        this.updateYearsAndClamps();
        this.triggerSync();
      } catch (error) {
        console.error('Store failed to delete log:', error);
        throw error;
      }
    },

    async saveMeasurementEntry(measurementData) {
      const authStore = useAuthStore();
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
        await saveMeasurement(log, authStore.currentUserId);

        const logWithUserId = { ...log, user_id: authStore.currentUserId };
        const existingIndex = this.measurements.findIndex(m => m.id === log.id);
        if (existingIndex !== -1) {
          this.measurements[existingIndex] = logWithUserId;
        } else {
          this.measurements.push(logWithUserId);
        }

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
      const authStore = useAuthStore();
      try {
        await deleteMeasurement(id, authStore.currentUserId);

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
      const authStore = useAuthStore();
      if (authStore.currentUserId === 'guest' || !this.isOnline) return;

      this.isSyncing = true;
      this.syncError = null;
      try {
        const result = await syncLogs(authStore.currentUserId);
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
      const authStore = useAuthStore();
      const goalsStore = useGoalsStore();
      const settingsStore = useSettingsStore();

      const data = await exportAllData(
        authStore.currentUserId,
        goalsStore.paliers,
        settingsStore.profile,
        settingsStore.displayPreferences,
        settingsStore.language
      );
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

      const authStore = useAuthStore();
      const goalsStore = useGoalsStore();
      const settingsStore = useSettingsStore();

      const result = await importAllData(parsed, authStore.currentUserId);

      if (result.paliers && Array.isArray(result.paliers) && result.paliers.length > 0) {
        await goalsStore.updatePaliers(result.paliers);
      }

      if (result.profile && typeof result.profile === 'object') {
        await settingsStore.updateProfile(result.profile);
      }

      if (result.displayPreferences && typeof result.displayPreferences === 'object') {
        await settingsStore.updateDisplayPreferences(result.displayPreferences);
      }

      if (result.language) {
        await settingsStore.updateLanguage(result.language);
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
        this.checkForApkUpdates();
      }
    },

    async checkForApkUpdates(options = {}) {
      return await useSettingsStore().checkForApkUpdates(options);
    },

    dismissApkUpdate() {
      useSettingsStore().dismissApkUpdate();
    },

    downloadApk(url) {
      useSettingsStore().downloadApk(url);
    }
  }
});
