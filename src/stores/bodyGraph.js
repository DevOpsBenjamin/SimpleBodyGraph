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

// Helper to find the Monday (YYYY-MM-DD) of a given date
export function getMondayOfDate(dateStr) {
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
export function calculateMedian(arr) {
  if (!arr || arr.length === 0) return 0;
  const sorted = [...arr].filter(v => v !== null && v !== undefined && !isNaN(v)).sort((a, b) => a - b);
  if (sorted.length === 0) return 0;
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 
    ? sorted[mid] 
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

// Helper to get logs falling into a specific date range [refDate - days + 1, refDate]
export function getRollingLogsForDate(logs, refDateStr, days = 7) {
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

// Helper to calculate age in years from birthDate (YYYY-MM-DD)
export function calculateAge(birthDateStr) {
  if (!birthDateStr) return null;
  const birth = new Date(birthDateStr);
  if (isNaN(birth.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age >= 0 ? age : null;
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
    profile: {
      gender: null,    // 'male' | 'female' | null
      birthDate: null, // 'YYYY-MM-DD' | null
      height: null     // number in cm | null
    },
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
      let logsToUse = this.logsWithEstimates;
      if (logsToUse.length === 0) return [];

      // Filter by start and end years if they are set
      if (this.startYear !== null && this.endYear !== null) {
        logsToUse = logsToUse.filter(log => {
          const yr = new Date(log.date).getFullYear();
          return yr >= this.startYear && yr <= this.endYear;
        });
      }

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
      let logsToUse = this.logsWithEstimates;
      if (logsToUse.length === 0) return [];

      // Filter by start and end years if they are set
      if (this.startYear !== null && this.endYear !== null) {
        logsToUse = logsToUse.filter(log => {
          const yr = new Date(log.date).getFullYear();
          return yr >= this.startYear && yr <= this.endYear;
        });
      }

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

      const currentWindowLogs = getRollingLogsForDate(currentLogs, latestDateStr, 7);
      const prevWindowLogs = getRollingLogsForDate(currentLogs, prevWindowEndDateStr, 7);

      const rollingMedianMass = currentWindowLogs.length > 0 ? calculateMedian(currentWindowLogs.map(l => Number(l.mass))) : null;
      const rollingMedianFat = currentWindowLogs.length > 0 ? calculateMedian(currentWindowLogs.map(l => Number(l.body_fat))) : null;
      const rollingMedianLeanMass = currentWindowLogs.length > 0 ? calculateMedian(currentWindowLogs.map(l => Number(l.lean_mass))) : null;
      const rollingMedianFatMass = (rollingMedianMass !== null && rollingMedianFat !== null)
        ? rollingMedianMass * (rollingMedianFat / 100)
        : null;

      const prevRollingMedianMass = prevWindowLogs.length > 0 ? calculateMedian(prevWindowLogs.map(l => Number(l.mass))) : null;
      const prevRollingMedianFat = prevWindowLogs.length > 0 ? calculateMedian(prevWindowLogs.map(l => Number(l.body_fat))) : null;
      const prevRollingMedianLeanMass = prevWindowLogs.length > 0 ? calculateMedian(prevWindowLogs.map(l => Number(l.lean_mass))) : null;
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

      // Sync to Supabase user_metadata if logged in
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
      if (this.paliers.length < 2) return;

      const p1 = this.paliers[0];
      const p2 = this.paliers[1];
      const isWeightGain = Number(p2.mass) >= Number(p1.mass);
      const isFatGain = Number(p2.fat) >= Number(p1.fat);

      // Compute unfiltered weeks with at least 4 logs
      const logsToUse = this.logsWithEstimates;
      const groups = {};
      for (const log of logsToUse) {
        const mon = getMondayOfDate(log.date);
        if (!groups[mon]) {
          groups[mon] = [];
        }
        groups[mon].push(log);
      }

      const validWeeks = [];
      for (const [mon, weekLogs] of Object.entries(groups)) {
        if (weekLogs.length >= 4) {
          const masses = weekLogs.map(l => Number(l.mass));
          const fats = weekLogs.map(l => Number(l.body_fat));
          const medianMass = calculateMedian(masses);
          const medianFat = calculateMedian(fats);

          validWeeks.push({
            monday: mon,
            medianMass,
            medianFat
          });
        }
      }

      if (validWeeks.length === 0) return;

      let changed = false;
      const updatedPaliers = this.paliers.map((palier) => {
        if (palier.validated) return palier; // already validated

        const targetMass = Number(palier.mass);
        const targetFat = Number(palier.fat);

        const passed = validWeeks.some(week => {
          const wMass = Number(week.medianMass);
          const wFat = Number(week.medianFat);

          const massPassed = isWeightGain ? (wMass >= targetMass) : (wMass <= targetMass);
          const fatPassed = isFatGain ? (wFat >= targetFat) : (wFat <= targetFat);

          return massPassed && fatPassed;
        });

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
      const data = await exportAllData(this.currentUserId, this.paliers, this.profile);
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
