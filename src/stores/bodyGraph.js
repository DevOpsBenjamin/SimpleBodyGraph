import { defineStore } from 'pinia';
import { getAllLogs, saveLog, deleteLog, syncLogs } from '../db';

export const useBodyGraphStore = defineStore('bodyGraph', {
  state: () => ({
    logs: [],
    isOnline: navigator.onLine,
    isSyncing: false,
    activeTab: 'charts',
    showAddModal: false
  }),

  getters: {
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

      // Logs are sorted descending by date (logs[0] is the most recent)
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
    // Load local logs from IndexedDB
    async loadLogs() {
      try {
        this.logs = await getAllLogs();
      } catch (error) {
        console.error('Failed to read logs from IndexedDB in store:', error);
      }
    },

    // Add a new log entry
    async addLog({ mass, bodyFat, date }) {
      const newLog = {
        id: crypto.randomUUID(),
        date,
        mass: Number(mass),
        body_fat: Number(bodyFat),
        synced: false
      };

      try {
        await saveLog(newLog);
        await this.loadLogs();
        this.showAddModal = false;
        
        // Trigger non-blocking cloud sync
        this.triggerSync();
      } catch (error) {
        console.error('Store failed to add log:', error);
        throw error;
      }
    },

    // Delete a log entry
    async deleteLogEntry(id) {
      try {
        await deleteLog(id);
        await this.loadLogs();
        
        // Trigger non-blocking cloud sync
        this.triggerSync();
      } catch (error) {
        console.error('Store failed to delete log:', error);
        throw error;
      }
    },

    // Trigger Supabase Cloud sync process
    async triggerSync() {
      if (!this.isOnline) return;

      this.isSyncing = true;
      try {
        await syncLogs();
        await this.loadLogs();
      } catch (err) {
        console.warn('Store background sync failed:', err);
      } finally {
        this.isSyncing = false;
      }
    },

    // Set online status and trigger sync if returning online
    setOnlineStatus(status) {
      this.isOnline = status;
      if (status) {
        this.triggerSync();
      }
    }
  }
});
