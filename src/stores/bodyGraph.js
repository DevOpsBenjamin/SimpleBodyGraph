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
  // Adjust difference: Sunday is 0, Monday is 1... We want to find Monday.
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

export const useBodyGraphStore = defineStore('bodyGraph', {
  state: () => ({
    logs: [],
    user: null,
    session: null,
    isOnline: navigator.onLine,
    isSyncing: false,
    activeTab: 'charts',
    showAddModal: false,
    showAuthModal: false,
    
    // Sub-tab configuration inside dashboard ('daily' or 'weekly')
    dashboardMode: 'daily',
    // Index of the week in the groupedWeeks list (0 is the newest week)
    selectedWeekIndex: 0
  }),

  getters: {
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

    // Groups logs into weeks (Monday to Sunday) and computes stats
    groupedWeeks: (state) => {
      if (state.logs.length === 0) return [];

      const groups = {};

      for (const log of state.logs) {
        const mon = getMondayOfDate(log.date);
        if (!groups[mon]) {
          groups[mon] = [];
        }
        groups[mon].push(log);
      }

      const weeks = [];
      for (const [mon, weekLogs] of Object.entries(groups)) {
        const sun = getSundayOfMonday(mon);
        
        // Averages
        const sumMass = weekLogs.reduce((sum, l) => sum + Number(l.mass), 0);
        const sumFat = weekLogs.reduce((sum, l) => sum + Number(l.body_fat), 0);
        const avgMass = sumMass / weekLogs.length;
        const avgFat = sumFat / weekLogs.length;

        // Label format: "Jun 8 - Jun 14"
        const monDate = new Date(mon);
        const sunDate = new Date(sun);
        const label = `${monDate.toLocaleString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })} - ${sunDate.toLocaleString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })}`;

        weeks.push({
          id: mon,
          monday: mon,
          sunday: sun,
          label,
          logs: weekLogs, // Entries are already sorted descending by date
          avgMass,
          avgFat
        });
      }

      // Sort weeks descending (latest week first)
      weeks.sort((a, b) => b.monday.localeCompare(a.monday));
      return weeks;
    },

    // Gets currently selected active week
    activeWeek: (state) => {
      const weeks = state.groupedWeeks;
      if (weeks.length === 0) return null;

      // Bound checking
      if (state.selectedWeekIndex < 0) {
        state.selectedWeekIndex = 0;
      }
      if (state.selectedWeekIndex >= weeks.length) {
        state.selectedWeekIndex = weeks.length - 1;
      }

      return weeks[state.selectedWeekIndex];
    },

    stats: (state) => {
      const currentLogs = state.logs;
      const count = currentLogs.length;

      if (count === 0) {
        return {
          currentMass: null,
          currentFat: null,
          massChange: 0,
          fatChange: 0,
          unsyncedCount: 0
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
        unsyncedCount
      };
    }
  },

  actions: {
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
      if (!supabase) {
        await this.loadLogs();
        return;
      }

      try {
        const { data } = await supabase.auth.getSession();
        this.session = data.session;
        this.user = data.session?.user || null;
        
        await this.loadLogs();

        supabase.auth.onAuthStateChange(async (event, session) => {
          this.session = session;
          this.user = session?.user || null;
          
          if (session?.user) {
            await this.migrateGuestLogs(session.user.id);
          }
          
          await this.loadLogs();
          this.triggerSync();
        });

      } catch (error) {
        console.error('Auth initialization failed:', error);
        await this.loadLogs();
      }
    },

    async signInAnonymously() {
      if (!supabase) return;
      try {
        const { data, error } = await supabase.auth.signInAnonymously();
        if (error) throw error;
        return data;
      } catch (error) {
        console.error('Anonymous sign in failed:', error);
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
      if (!supabase) return;
      try {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
        
        this.user = null;
        this.session = null;
        this.activeTab = 'charts';
        this.selectedWeekIndex = 0;
        
        await this.loadLogs();
      } catch (error) {
        console.error('Logout failed:', error);
        throw error;
      }
    },

    async loadLogs() {
      try {
        this.logs = await getAllLogs(this.currentUserId);
      } catch (error) {
        console.error('Store failed to load logs:', error);
      }
    },

    async addLog({ mass, bodyFat, date }) {
      const newLog = {
        id: crypto.randomUUID(),
        date,
        mass: Number(mass),
        body_fat: Number(bodyFat),
        synced: false
      };

      try {
        await saveLog(newLog, this.currentUserId);
        await this.loadLogs();
        this.showAddModal = false;
        
        // Reset view to current active week
        this.selectedWeekIndex = 0;
        
        this.triggerSync();
      } catch (error) {
        console.error('Store failed to add log:', error);
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
      try {
        await syncLogs(this.currentUserId);
        await this.loadLogs();
      } catch (err) {
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
