import { defineStore } from 'pinia';
import { supabase } from '../supabase';
import { evaluatePalierAutoValidation } from '../services/goals/palierService';
import { useAuthStore } from './auth';

export const useGoalsStore = defineStore('goals', {
  state: () => ({
    targetMass: null,
    targetFat: null,
    paliers: []
  }),

  getters: {
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
    }
  },

  actions: {
    initGoalsFromStorage() {
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
      this.syncSingleGoalsFromActivePalier();
    },

    loadGoalsFromUserMetadata(user) {
      if (!user) {
        this.initGoalsFromStorage();
        return;
      }
      this.targetMass = user.user_metadata?.target_mass ?? null;
      this.targetFat = user.user_metadata?.target_fat ?? null;

      if (user.user_metadata?.paliers) {
        this.paliers = user.user_metadata.paliers;
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
      this.syncSingleGoalsFromActivePalier();
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

      localStorage.setItem('bodygraph_paliers', JSON.stringify(this.paliers));
      if (this.targetMass !== null) {
        localStorage.setItem('bodygraph_target_mass', String(this.targetMass));
      } else {
        localStorage.removeItem('bodygraph_target_mass');
      }
      if (this.targetFat !== null) {
        localStorage.setItem('bodygraph_target_fat', String(this.targetFat));
      } else {
        localStorage.removeItem('bodygraph_target_fat');
      }

      const authStore = useAuthStore();
      if (authStore.user && supabase) {
        try {
          const { data, error } = await supabase.auth.updateUser({
            data: {
              target_mass: this.targetMass,
              target_fat: this.targetFat,
              paliers: this.paliers
            }
          });
          if (error) throw error;
          authStore.user = data.user;
        } catch (error) {
          console.error('Failed to update goals in supabase:', error);
          throw error;
        }
      }
    },

    async updateGoals(mass, fat) {
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

    async checkAndAutoValidatePaliers(logsWithEstimates) {
      const { changed, updatedPaliers } = evaluatePalierAutoValidation(this.paliers, logsWithEstimates);
      if (changed) {
        await this.updatePaliers(updatedPaliers);
      }
    }
  }
});
