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
  deleteMeasurement
} from '../db';

// Helper to find the Monday (YYYY-MM-DD) of a given date
function getMondayOfDate(dateStr) {
  const dateObj = new Date(dateStr);
  const day = dateObj.getDay();
  const diff = dateObj.getDate() - day + (day === 0 ? -6 : 1);
  const mondayObj = new Date(dateObj.setDate(diff));
  
  const yyyy = mondayObj.getFullYear();
  const mm = String(mondayObj.getMonth() + 1).padStart(2, '0');
  const dd = String(mondayObj.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

// Helper to find Sunday of a given Monday (YYYY-MM-DD)
function getSundayOfMonday(mondayStr) {
  const mondayObj = new Date(mondayStr);
  const sundayObj = new Date(mondayObj.setDate(mondayObj.getDate() + 6));
  
  const yyyy = sundayObj.getFullYear();
  const mm = String(sundayObj.getMonth() + 1).padStart(2, '0');
  const dd = String(sundayObj.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

// Helper to calculate median of a numeric array
function calculateMedian(arr) {
  if (!arr || arr.length === 0) return 0;
  const sorted = [...arr].filter(v => v !== null && v !== undefined && !isNaN(v)).sort((a, b) => a - b);
  if (sorted.length === 0) return 0;
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 
    ? sorted[mid] 
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

// Helper to get logs falling into a specific date range [refDate - days + 1, refDate]
function getRollingLogsForDate(logs, refDateStr, days = 7) {
  const refDate = new Date(refDateStr);
  const startDate = new Date(refDate);
  startDate.setDate(startDate.getDate() - (days - 1));
  
  const startStr = startDate.toISOString().split('T')[0];
  const endStr = refDate.toISOString().split('T')[0];
  
  return logs.filter(log => log.date >= startStr && log.date <= endStr);
}

// Helper to calculate rolling median for a given reference date and field
function getRollingMedianForDate(logs, refDateStr, field, days = 7) {
  const windowLogs = getRollingLogsForDate(logs, refDateStr, days);
  if (windowLogs.length === 0) return null;
  const values = windowLogs.map(l => Number(l[field]));
  return calculateMedian(values);
}

// Helper to get previous window end date (refDate offset by offsetDays)
function getPreviousWindowEndDate(refDateStr, offsetDays = 7) {
  const refDate = new Date(refDateStr);
  const prevDate = new Date(refDate);
  prevDate.setDate(prevDate.getDate() - offsetDays);
  return prevDate.toISOString().split('T')[0];
}

export const useBodyGraphStore = defineStore('bodyGraph', {
  state: () => ({
    logs: [],
    measurements: [],
    user: null,
    session: null,
    isOnline: navigator.onLine,
    isSyncing: false,
    activeTab: 'monthly',
    showAddModal: false,
    showAddMeasurementModal: false,
    showAuthModal: false,
    showSettingsModal: false,
    initialized: false,
    syncError: null,
    isGuestMode: false,
    targetMass: null,
    targetFat: null,
    paliers: [],
    
    // Index of the month in the groupedMonths list (0 is the newest month)
    selectedMonthIndex: 0,
    // Index of the week in the groupedWeeks list (0 is the newest week)
    selectedWeekIndex: 0,
    // Active log record being edited, null if creating a new one
    editingLog: null,
    editingMeasurement: null
  }),

  getters: {
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
      return state.logs.map(log => {
        const mass = Number(log.mass);
        const body_fat = Number(log.body_fat);
        const fat_mass = mass * (body_fat / 100);
        const lean_mass = mass - fat_mass;

        return {
          ...log,
          fat_mass,
          lean_mass
        };
      });
    },

    // Groups logs into weeks (Monday to Sunday) and computes stats
    // Groups logs into months and computes true median stats based on all raw logs
    groupedMonths() {
      const logsToUse = this.logsWithEstimates;
      if (logsToUse.length === 0) return [];

      const groups = {};

      for (const log of logsToUse) {
        // e.g., '2025-06'
        const monthKey = log.date.substring(0, 7);
        if (!groups[monthKey]) {
          groups[monthKey] = [];
        }
        groups[monthKey].push(log);
      }

      const months = [];
      for (const [monthKey, monthLogs] of Object.entries(groups)) {
        const masses = monthLogs.map(l => Number(l.mass));
        const fats = monthLogs.map(l => Number(l.body_fat));

        const medianMass = calculateMedian(masses);
        const medianFat = calculateMedian(fats);
        const medianFatMass = medianMass * (medianFat / 100);
        const medianLeanMass = medianMass - medianFatMass;

        const avgMass = masses.length > 0 ? masses.reduce((sum, val) => sum + val, 0) / masses.length : 0;
        const avgFat = fats.length > 0 ? fats.reduce((sum, val) => sum + val, 0) / fats.length : 0;
        const avgFatMass = avgMass * (avgFat / 100);
        const avgLeanMass = avgMass - avgFatMass;

        // Create a date object for the first day of the month for time scale plotting
        const startDateStr = `${monthKey}-01`;
        const dateObj = new Date(startDateStr);
        const label = dateObj.toLocaleString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });

        months.push({
          id: monthKey,
          startDate: startDateStr,
          label,
          logs: monthLogs,
          medianMass,
          medianFat,
          medianFatMass,
          medianLeanMass,
          avgMass,
          avgFat,
          avgFatMass,
          avgLeanMass
        });
      }

      // Sort months descending (latest month first)
      months.sort((a, b) => b.id.localeCompare(a.id));
      return months;
    },

    groupedWeeks() {
      const logsToUse = this.logsWithEstimates;
      if (logsToUse.length === 0) return [];

      const groups = {};

      for (const log of logsToUse) {
        const mon = getMondayOfDate(log.date);
        if (!groups[mon]) {
          groups[mon] = [];
        }
        groups[mon].push(log);
      }

      const weeks = [];
      for (const [mon, weekLogs] of Object.entries(groups)) {
        const sun = getSundayOfMonday(mon);
        
        const masses = weekLogs.map(l => Number(l.mass));
        const fats = weekLogs.map(l => Number(l.body_fat));

        const medianMass = calculateMedian(masses);
        const medianFat = calculateMedian(fats);
        const medianFatMass = medianMass * (medianFat / 100);
        const medianLeanMass = medianMass - medianFatMass;

        // Calculate true averages for comparison on weekly charts
        const avgMass = masses.length > 0 ? masses.reduce((sum, val) => sum + val, 0) / masses.length : 0;
        const avgFat = fats.length > 0 ? fats.reduce((sum, val) => sum + val, 0) / fats.length : 0;
        const avgFatMass = avgMass * (avgFat / 100);
        const avgLeanMass = avgMass - avgFatMass;

        // Label format: "Jun 8 - Jun 14"
        const monDate = new Date(mon);
        const sunDate = new Date(sun);
        const label = `${monDate.toLocaleString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })} - ${sunDate.toLocaleString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })}`;

        weeks.push({
          id: mon,
          monday: mon,
          sunday: sun,
          label,
          logs: weekLogs,
          medianMass,
          medianFat,
          medianFatMass,
          medianLeanMass,
          avgMass,
          avgFat,
          avgFatMass,
          avgLeanMass
        });
      }

      // Sort weeks descending (latest week first)
      weeks.sort((a, b) => b.monday.localeCompare(a.monday));
      return weeks;
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

      // Bound checking without side effects
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
      // Sort paliers in logical order depending on whether the user wants to lose or gain weight
      // Or just standard numeric order of their mass targets.
      // Let's sort them ascending by mass (poids) target, but we'll also preserve manual order if needed.
      // Let's return the list sorted ascending by mass to make the math of "which is next" predictable,
      // or we can sort them by targetMass ascending if the trend is generally ascending, or descending.
      // To be completely safe and predictable, let's keep the user's manual ordering of paliers,
      // but we'll sort them by targetMass ascending if none is specified or just return them as-is.
      return [...state.paliers];
    },

    activePalier() {
      const paliers = this.paliersSorted;
      if (paliers.length === 0) return null;
      // The active palier is the first one that is NOT validated
      const active = paliers.find(p => !p.validated);
      return active || null;
    },

    stats() {
      const currentLogs = this.logsWithEstimates;
      const count = currentLogs.length;

      if (count === 0) {
        return {
          currentMass: null,
          currentFat: null,
          currentFatMass: null,
          currentLeanMass: null,
          massChange: 0,
          fatChange: 0,
          fatMassChange: 0,
          leanMassChange: 0,
          rollingMedianMass: null,
          rollingMedianFat: null,
          rollingMedianLeanMass: null,
          rollingMedianFatMass: null,
          rollingMedianMassChange: 0,
          rollingMedianFatChange: 0,
          rollingMedianLeanMassChange: 0,
          rollingMedianFatMassChange: 0,
          unsyncedCount: 0
        };
      }

      const currentEntry = currentLogs[0];
      const prevEntry = currentLogs[1] || null;

      const unsyncedCount = currentLogs.filter(log => !log.synced).length;

      // Calculate rolling medians
      const latestDateStr = currentEntry.date;
      const prevWindowEndDateStr = getPreviousWindowEndDate(latestDateStr, 7);

      const rollingMedianMass = getRollingMedianForDate(currentLogs, latestDateStr, 'mass', 7);
      const rollingMedianFat = getRollingMedianForDate(currentLogs, latestDateStr, 'body_fat', 7);
      const rollingMedianLeanMass = getRollingMedianForDate(currentLogs, latestDateStr, 'lean_mass', 7);
      const rollingMedianFatMass = (rollingMedianMass !== null && rollingMedianFat !== null)
        ? rollingMedianMass * (rollingMedianFat / 100)
        : null;

      const prevRollingMedianMass = getRollingMedianForDate(currentLogs, prevWindowEndDateStr, 'mass', 7);
      const prevRollingMedianFat = getRollingMedianForDate(currentLogs, prevWindowEndDateStr, 'body_fat', 7);
      const prevRollingMedianLeanMass = getRollingMedianForDate(currentLogs, prevWindowEndDateStr, 'lean_mass', 7);
      const prevRollingMedianFatMass = (prevRollingMedianMass !== null && prevRollingMedianFat !== null)
        ? prevRollingMedianMass * (prevRollingMedianFat / 100)
        : null;

      const rollingMedianMassChange = (rollingMedianMass !== null && prevRollingMedianMass !== null)
        ? rollingMedianMass - prevRollingMedianMass
        : 0;

      const rollingMedianFatChange = (rollingMedianFat !== null && prevRollingMedianFat !== null)
        ? rollingMedianFat - prevRollingMedianFat
        : 0;

      const rollingMedianLeanMassChange = (rollingMedianLeanMass !== null && prevRollingMedianLeanMass !== null)
        ? rollingMedianLeanMass - prevRollingMedianLeanMass
        : 0;

      const rollingMedianFatMassChange = (rollingMedianFatMass !== null && prevRollingMedianFatMass !== null)
        ? rollingMedianFatMass - prevRollingMedianFatMass
        : 0;

      return {
        currentMass: Number(currentEntry.mass),
        currentFat: Number(currentEntry.body_fat),
        currentFatMass: Number(currentEntry.fat_mass),
        currentLeanMass: Number(currentEntry.lean_mass),
        massChange: prevEntry ? Number(currentEntry.mass) - Number(prevEntry.mass) : 0,
        fatChange: prevEntry ? Number(currentEntry.body_fat) - Number(prevEntry.body_fat) : 0,
        fatMassChange: prevEntry ? Number(currentEntry.fat_mass) - Number(prevEntry.fat_mass) : 0,
        leanMassChange: prevEntry ? Number(currentEntry.lean_mass) - Number(prevEntry.lean_mass) : 0,
        rollingMedianMass,
        rollingMedianFat,
        rollingMedianLeanMass,
        rollingMedianFatMass,
        rollingMedianMassChange,
        rollingMedianFatChange,
        rollingMedianLeanMassChange,
        rollingMedianFatMassChange,
        unsyncedCount
      };
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
      // Load local goals first (guest / fallback)
      this.targetMass = localStorage.getItem('bodygraph_target_mass') ? Number(localStorage.getItem('bodygraph_target_mass')) : null;
      this.targetFat = localStorage.getItem('bodygraph_target_fat') ? Number(localStorage.getItem('bodygraph_target_fat')) : null;

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

      if (!supabase) {
        await this.loadLogs();
        this.initialized = true;
        this.syncSingleGoalsFromActivePalier();
        return;
      }

      try {
        const { data } = await supabase.auth.getSession();
        this.session = data.session;
        this.user = data.session?.user || null;
        
        if (this.user) {
          this.targetMass = this.user.user_metadata?.target_mass || null;
          this.targetFat = this.user.user_metadata?.target_fat || null;
          if (this.user.user_metadata?.paliers) {
            this.paliers = this.user.user_metadata.paliers;
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
            this.targetMass = session.user.user_metadata?.target_mass || null;
            this.targetFat = session.user.user_metadata?.target_fat || null;
            if (session.user.user_metadata?.paliers) {
              this.paliers = session.user.user_metadata.paliers;
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
            // Revert to local goals
            this.targetMass = localStorage.getItem('bodygraph_target_mass') ? Number(localStorage.getItem('bodygraph_target_mass')) : null;
            this.targetFat = localStorage.getItem('bodygraph_target_fat') ? Number(localStorage.getItem('bodygraph_target_fat')) : null;
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

    async updatePaliers(paliersList) {
      this.paliers = paliersList;
      this.syncSingleGoalsFromActivePalier();

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
      } else {
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

    async signInWithGoogle() {
      if (!supabase) return;
      try {
        const { data, error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: window.location.origin
          }
        });
        if (error) throw error;
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

    async loadLogs() {
      try {
        this.logs = await getAllLogs(this.currentUserId);
        this.measurements = await getAllMeasurements(this.currentUserId);
        
        // Cleanly clamp selected indices after loading logs to keep bounds valid
        const maxMonthIndex = this.groupedMonths.length - 1;
        if (this.selectedMonthIndex > maxMonthIndex) {
          this.selectedMonthIndex = Math.max(0, maxMonthIndex);
        }

        const maxIndex = this.groupedWeeks.length - 1;
        if (this.selectedWeekIndex > maxIndex) {
          this.selectedWeekIndex = Math.max(0, maxIndex);
        }
      } catch (error) {
        console.error('Store failed to load logs/measurements:', error);
      }
    },

    // Save or update a log entry
    async checkAndAutoValidatePaliers() {
      // Automatic validation of paliers based on 7d rolling median mass
      const rollingMedian = this.stats.rollingMedianMass;
      if (!rollingMedian || this.paliers.length === 0) return;

      let changed = false;
      const updatedPaliers = this.paliers.map((palier, index) => {
        if (palier.validated) return palier; // already validated

        // To know whether we are in weight gain or loss trend:
        // We look at the general trend direction of the paliers or just compare
        // with previous paliers / initial weight.
        // Let's determine direction: if palier targets are lower than starting/current weight
        // it's a loss, if higher it's a gain.
        // Even simpler: we can compare the palier target to the current 7d rolling median.
        // But the user specifies:
        // "si els palier descende perte de masse c quand on passe en dessous du palier en cour
        // quand les palier montre prise de masse on considere un palier passer quand on est au dessus"
        // Let's compute overall list direction or compare each palier relative to current/previous targets.
        // Let's check if the palier mass target is smaller than previous palier's target (or first palier's target).
        // Let's define direction per palier or list-wide.
        // List-wide direction: compare last palier with first palier, or first palier with current weight.
        // Let's look at the sequence of paliers:
        // If we have index > 0, compare with index - 1. If index == 0, compare with first recorded log mass.
        let isPrise = false;
        if (index > 0) {
          isPrise = Number(palier.mass) > Number(this.paliers[index - 1].mass);
        } else {
          const firstLog = this.logsWithEstimates[this.logsWithEstimates.length - 1];
          const startMass = firstLog ? Number(firstLog.mass) : rollingMedian;
          isPrise = Number(palier.mass) > startMass;
        }

        const target = Number(palier.mass);
        const passed = isPrise ? (rollingMedian >= target) : (rollingMedian <= target);

        if (passed) {
          changed = true;
          return { ...palier, validated: true };
        }
        return palier;
      });

      if (changed) {
        await this.updatePaliers(updatedPaliers);
      }
    },

    async saveLogEntry({ id, mass, bodyFat, date }) {
      const log = {
        id: id || crypto.randomUUID(),
        date,
        mass: Number(mass),
        body_fat: Number(bodyFat),
        synced: false
      };

      try {
        await saveLog(log, this.currentUserId);
        await this.loadLogs();
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
        await this.loadLogs();
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
        await this.loadLogs();
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
        await this.loadLogs();
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

    setOnlineStatus(status) {
      this.isOnline = status;
      if (status) {
        this.triggerSync();
      }
    }
  }
});
