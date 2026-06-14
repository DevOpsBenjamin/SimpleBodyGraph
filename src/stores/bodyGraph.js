import { defineStore } from 'pinia';
import { supabase } from '../supabase';
import { 
  getAllLogs, 
  saveLog, 
  deleteLog, 
  syncLogs, 
  migrateGuestLogsInDB 
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

// Helper to calculate estimated values for sick logs using linear interpolation from surrounding healthy logs
function getEstimatedLogValues(log, allLogs) {
  if (!log.is_sick) {
    return {
      mass: Number(log.mass),
      body_fat: Number(log.body_fat)
    };
  }

  // Filter and sort healthy logs ascending by date
  const healthyLogs = allLogs
    .filter(l => !l.is_sick)
    .sort((a, b) => a.date.localeCompare(b.date));

  if (healthyLogs.length === 0) {
    return {
      mass: Number(log.mass),
      body_fat: Number(log.body_fat)
    };
  }

  // Find closest older (date < log.date) and newer (date > log.date) healthy logs relative to sick log's date
  let prevHealthy = null;
  let nextHealthy = null;

  for (const hLog of healthyLogs) {
    if (hLog.date < log.date) {
      prevHealthy = hLog;
    } else if (hLog.date > log.date && !nextHealthy) {
      nextHealthy = hLog;
    }
  }

  if (prevHealthy && nextHealthy) {
    const tPrev = new Date(prevHealthy.date).getTime();
    const tNext = new Date(nextHealthy.date).getTime();
    const tCurrent = new Date(log.date).getTime();

    if (tNext === tPrev) {
      return { mass: Number(prevHealthy.mass), body_fat: Number(prevHealthy.body_fat) };
    }

    const f = (tCurrent - tPrev) / (tNext - tPrev);
    return {
      mass: Number(prevHealthy.mass) + f * (Number(nextHealthy.mass) - Number(prevHealthy.mass)),
      body_fat: Number(prevHealthy.body_fat) + f * (Number(nextHealthy.body_fat) - Number(prevHealthy.body_fat))
    };
  } else if (prevHealthy) {
    return { mass: Number(prevHealthy.mass), body_fat: Number(prevHealthy.body_fat) };
  } else if (nextHealthy) {
    return { mass: Number(nextHealthy.mass), body_fat: Number(nextHealthy.body_fat) };
  } else {
    return { mass: Number(log.mass), body_fat: Number(log.body_fat) };
  }
}

export const useBodyGraphStore = defineStore('bodyGraph', {
  state: () => ({
    logs: [],
    user: null,
    session: null,
    isOnline: navigator.onLine,
    isSyncing: false,
    activeTab: 'daily',
    showAddModal: false,
    showAuthModal: false,
    showSettingsModal: false,
    initialized: false,
    syncError: null,
    isGuestMode: false,
    targetMass: null,
    targetFat: null,
    
    // Index of the week in the groupedWeeks list (0 is the newest week)
    selectedWeekIndex: 0,
    // Active log record being edited, null if creating a new one
    editingLog: null
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
        const estimates = getEstimatedLogValues(log, state.logs);
        return {
          ...log,
          estimated_mass: estimates.mass,
          estimated_body_fat: estimates.body_fat
        };
      });
    },

    // Groups logs into weeks (Monday to Sunday) and computes stats
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
        
        // Weighted Averages
        let totalWeight = 0;
        let weightedMassSum = 0;
        let weightedFatSum = 0;
        let hasSickLogs = false;

        for (const l of weekLogs) {
          const w = l.is_sick ? 0.25 : 1.0;
          totalWeight += w;
          weightedMassSum += Number(l.mass) * w;
          weightedFatSum += Number(l.body_fat) * w;
          if (l.is_sick) {
            hasSickLogs = true;
          }
        }

        const avgMass = totalWeight > 0 ? weightedMassSum / totalWeight : 0;
        const avgFat = totalWeight > 0 ? weightedFatSum / totalWeight : 0;

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
          avgMass,
          avgFat,
          hasSickLogs
        });
      }

      // Sort weeks descending (latest week first)
      weeks.sort((a, b) => b.monday.localeCompare(a.monday));
      return weeks;
    },

    // Gets currently selected active week
    activeWeek() {
      const weeks = this.groupedWeeks;
      if (weeks.length === 0) return null;

      // Bound checking without side effects
      const safeIndex = Math.max(0, Math.min(this.selectedWeekIndex, weeks.length - 1));
      return weeks[safeIndex];
    },

    stats() {
      const currentLogs = this.logsWithEstimates;
      const count = currentLogs.length;

      if (count === 0) {
        return {
          currentMass: null,
          currentFat: null,
          massChange: 0,
          fatChange: 0,
          unsyncedCount: 0,
          currentIsSick: false,
          currentEstimatedMass: null,
          currentEstimatedFat: null
        };
      }

      const currentEntry = currentLogs[0];
      const prevEntry = currentLogs[1] || null;

      const unsyncedCount = currentLogs.filter(log => !log.synced).length;

      return {
        currentMass: Number(currentEntry.mass),
        currentFat: Number(currentEntry.body_fat),
        massChange: prevEntry ? Number(currentEntry.mass) - Number(prevEntry.mass) : 0,
        fatChange: prevEntry ? Number(currentEntry.body_fat) - Number(prevEntry.body_fat) : 0,
        unsyncedCount,
        currentIsSick: !!currentEntry.is_sick,
        currentEstimatedMass: Number(currentEntry.estimated_mass),
        currentEstimatedFat: Number(currentEntry.estimated_body_fat)
      };
    }
  },

  actions: {
    // Select log entry to trigger editing mode
    setEditingLog(log) {
      this.editingLog = log;
      this.showAddModal = true;
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

      if (!supabase) {
        await this.loadLogs();
        this.initialized = true;
        return;
      }

      try {
        const { data } = await supabase.auth.getSession();
        this.session = data.session;
        this.user = data.session?.user || null;
        
        if (this.user) {
          this.targetMass = this.user.user_metadata?.target_mass || null;
          this.targetFat = this.user.user_metadata?.target_fat || null;
        }
        
        await this.loadLogs();

        supabase.auth.onAuthStateChange(async (event, session) => {
          this.session = session;
          this.user = session?.user || null;
          
          if (session?.user) {
            this.targetMass = session.user.user_metadata?.target_mass || null;
            this.targetFat = session.user.user_metadata?.target_fat || null;
            await this.migrateGuestLogs(session.user.id);
          } else {
            // Revert to local goals
            this.targetMass = localStorage.getItem('bodygraph_target_mass') ? Number(localStorage.getItem('bodygraph_target_mass')) : null;
            this.targetFat = localStorage.getItem('bodygraph_target_fat') ? Number(localStorage.getItem('bodygraph_target_fat')) : null;
          }
          
          await this.loadLogs();
          this.triggerSync();
        });

      } catch (error) {
        console.error('Auth initialization failed:', error);
        await this.loadLogs();
      } finally {
        this.initialized = true;
      }
    },

    enableGuestMode() {
      this.isGuestMode = true;
      this.loadLogs();
    },

    async updateGoals(mass, fat) {
      this.targetMass = mass ? Number(mass) : null;
      this.targetFat = fat ? Number(fat) : null;

      if (this.user && supabase) {
        try {
          const { data, error } = await supabase.auth.updateUser({
            data: {
              target_mass: this.targetMass,
              target_fat: this.targetFat
            }
          });
          if (error) throw error;
          this.user = data.user;
        } catch (error) {
          console.error('Failed to update goals in supabase:', error);
          throw error;
        }
      } else {
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
        this.activeTab = 'daily';
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
        this.activeTab = 'daily';
        this.selectedWeekIndex = 0;
        this.editingLog = null;
        
        await this.loadLogs();
      } catch (error) {
        console.error('Logout failed:', error);
        throw error;
      }
    },

    async loadLogs() {
      try {
        this.logs = await getAllLogs(this.currentUserId);
        
        // Cleanly clamp selectedWeekIndex after loading logs to keep bounds valid
        const maxIndex = this.groupedWeeks.length - 1;
        if (this.selectedWeekIndex > maxIndex) {
          this.selectedWeekIndex = Math.max(0, maxIndex);
        }
      } catch (error) {
        console.error('Store failed to load logs:', error);
      }
    },

    // Save or update a log entry
    async saveLogEntry({ id, mass, bodyFat, date, isSick }) {
      const log = {
        id: id || crypto.randomUUID(),
        date,
        mass: Number(mass),
        body_fat: Number(bodyFat),
        is_sick: !!isSick,
        synced: false
      };

      try {
        await saveLog(log, this.currentUserId);
        await this.loadLogs();
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
