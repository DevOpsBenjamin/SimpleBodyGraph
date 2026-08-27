import { defineStore } from 'pinia';
import { supabase } from '../supabase';
import { setupAuthDeepLinks, signInWithGoogleOAuth } from '../services/authService';
import { useGoalsStore } from './goals';
import { useSettingsStore } from './settings';
import { migrateGuestLogsInDB } from '../db';

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null,
    session: null,
    isGuestMode: false,
    showAuthModal: false
  }),

  getters: {
    showDashboard: (state) => {
      return !!state.user || state.isGuestMode;
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
    }
  },

  actions: {
    async initAuth() {
      const goalsStore = useGoalsStore();
      const settingsStore = useSettingsStore();

      goalsStore.initGoalsFromStorage();
      settingsStore.initSettingsFromStorage();

      if (!supabase) {
        return;
      }

      try {
        await setupAuthDeepLinks(() => {
          this.showAuthModal = false;
        });

        const { data } = await supabase.auth.getSession();
        this.session = data.session;
        this.user = data.session?.user || null;

        if (this.user) {
          goalsStore.loadGoalsFromUserMetadata(this.user);
          settingsStore.loadSettingsFromUserMetadata(this.user);
        }

        supabase.auth.onAuthStateChange(async (event, session) => {
          this.session = session;
          this.user = session?.user || null;

          if (session?.user) {
            goalsStore.loadGoalsFromUserMetadata(session.user);
            settingsStore.loadSettingsFromUserMetadata(session.user);
            await this.migrateGuestLogs(session.user.id);
          } else {
            goalsStore.initGoalsFromStorage();
            settingsStore.initSettingsFromStorage();
          }
        });
      } catch (error) {
        console.error('Auth initialization failed:', error);
      }
    },

    enableGuestMode() {
      this.isGuestMode = true;
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
      return setupAuthDeepLinks(() => {
        this.showAuthModal = false;
      });
    },

    async signInWithGoogle() {
      return signInWithGoogleOAuth();
    },

    async logout() {
      this.isGuestMode = false;
      if (supabase) {
        try {
          const { error } = await supabase.auth.signOut();
          if (error) throw error;
        } catch (error) {
          console.error('Logout failed:', error);
          throw error;
        }
      }
      this.user = null;
      this.session = null;
    },

    async migrateGuestLogs(newUserId) {
      try {
        await migrateGuestLogsInDB(newUserId);
      } catch (error) {
        console.error('Store failed guest log migration:', error);
      }
    }
  }
});
