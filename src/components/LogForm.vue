<template>
  <div 
    v-if="store.showAddModal" 
    class="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 transition-all duration-300"
  >
    <!-- Backdrop -->
    <div 
      @click="store.showAddModal = false" 
      class="absolute inset-0 bg-black/60 backdrop-blur-sm"
    ></div>

    <!-- Modal Card -->
    <div 
      class="w-full sm:max-w-md bg-gray-900 border-t sm:border border-gray-800 rounded-t-3xl sm:rounded-3xl p-6 relative z-10 shadow-2xl shadow-black max-h-[90vh] overflow-y-auto transform translate-y-0 transition-transform duration-300"
    >
      <!-- Modal Header -->
      <div class="flex items-center justify-between mb-6">
        <h2 class="text-xl font-bold text-white flex items-center gap-2">
          <svg class="w-5 h-5 text-violet-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 20h9"></path>
            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
          </svg>
          Log Body Metrics
        </h2>
        <button 
          @click="store.showAddModal = false"
          class="p-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white transition-all duration-200 cursor-pointer"
        >
          <X class="w-5 h-5" />
        </button>
      </div>

      <!-- Form fields -->
      <form @submit.prevent="handleSubmit" class="space-y-5">
        <!-- Date Field -->
        <div class="space-y-1.5">
          <label for="log-date" class="block text-xs font-semibold text-gray-400 uppercase tracking-wider">Date</label>
          <input 
            id="log-date"
            type="date" 
            v-model="form.date"
            required
            class="w-full px-4 py-3 rounded-xl glass-input text-sm text-white"
          />
        </div>

        <!-- Grid: Mass and Body Fat -->
        <div class="grid grid-cols-2 gap-4">
          <!-- Mass Input -->
          <div class="space-y-1.5">
            <label for="log-mass" class="block text-xs font-semibold text-gray-400 uppercase tracking-wider">Mass (kg)</label>
            <input 
              id="log-mass"
              type="number" 
              v-model.number="form.mass"
              placeholder="e.g. 78.5"
              step="0.1"
              min="20"
              max="300"
              required
              class="w-full px-4 py-3 rounded-xl glass-input text-sm text-white"
            />
          </div>

          <!-- Body Fat Input -->
          <div class="space-y-1.5">
            <label for="log-fat" class="block text-xs font-semibold text-gray-400 uppercase tracking-wider">Body Fat (%)</label>
            <input 
              id="log-fat"
              type="number" 
              v-model.number="form.body_fat"
              placeholder="e.g. 14.2"
              step="0.1"
              min="1"
              max="70"
              required
              class="w-full px-4 py-3 rounded-xl glass-input text-sm text-white"
            />
          </div>
        </div>

        <!-- Submit Button -->
        <div class="pt-4 flex gap-3">
          <button 
            type="button" 
            @click="store.showAddModal = false"
            class="flex-1 py-3 text-sm font-semibold rounded-xl bg-gray-800 hover:bg-gray-750 text-gray-300 hover:text-white transition-all duration-200 border border-gray-700/50 cursor-pointer"
          >
            Cancel
          </button>
          <button 
            type="submit"
            class="flex-1 py-3 text-sm font-semibold rounded-xl bg-violet-600 hover:bg-violet-500 active:bg-violet-700 text-white shadow-lg shadow-violet-600/20 hover:shadow-violet-600/30 transition-all duration-200 cursor-pointer"
          >
            Save Entry
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { reactive, watch } from 'vue';
import { X } from 'lucide-vue-next';
import { useBodyGraphStore } from '../stores/bodyGraph';

const store = useBodyGraphStore();

const form = reactive({
  date: '',
  mass: '',
  body_fat: ''
});

const prefillForm = () => {
  form.date = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD local format
  
  if (store.logs.length > 0) {
    form.mass = Number(store.logs[0].mass);
    form.body_fat = Number(store.logs[0].body_fat);
  } else {
    form.mass = '';
    form.body_fat = '';
  }
};

// Listen to modal opening to update initial values
watch(() => store.showAddModal, (newVal) => {
  if (newVal) {
    prefillForm();
  }
}, { immediate: true });

const handleSubmit = async () => {
  try {
    await store.addLog({
      mass: form.mass,
      bodyFat: form.body_fat,
      date: form.date
    });
  } catch (error) {
    alert('Failed to save log entry: ' + error.message);
  }
};
</script>
