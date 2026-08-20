<template>
  <div
    v-if="store.showAddMeasurementModal"
    class="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 transition-all duration-300"
  >
    <!-- Backdrop -->
    <div
      @click="closeModal"
      class="absolute inset-0 bg-black/60 backdrop-blur-sm"
    ></div>

    <!-- Modal Card -->
    <div
      class="w-full sm:max-w-md bg-gray-900 border-t sm:border border-gray-800 rounded-t-3xl sm:rounded-3xl p-6 relative z-10 shadow-2xl shadow-black max-h-[90vh] overflow-y-auto transform translate-y-0 transition-transform duration-300"
    >
      <!-- Modal Header -->
      <div class="flex items-center justify-between mb-6">
        <h2 class="text-xl font-bold text-white flex items-center gap-2">
          <svg class="w-5 h-5 text-indigo-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21.54 15H17a2 2 0 0 0-2 2v4.54"></path>
            <path d="M7 3.34V5a3 3 0 0 0 3 3h0a2 2 0 0 1 2 2v0a2 2 0 0 0 2 2h0a2 2 0 0 1 2 2v0a2 2 0 0 0 2 2h0a2 2 0 0 1 2 2v0a2 2 0 0 0 2 2h.46"></path>
            <path d="M11 21.95V18a2 2 0 0 0-2-2h0a2 2 0 0 1-2-2v0a2 2 0 0 0-2-2h0a2 2 0 0 1-2-2v0a2 2 0 0 0-2-2h0a2 2 0 0 1-2-2V2.05"></path>
            <circle cx="12" cy="12" r="10"></circle>
          </svg>
          {{ store.editingMeasurement ? 'Edit Measurements' : 'Log Measurements' }}
        </h2>
        <button
          @click="closeModal"
          class="p-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white transition-all duration-200 cursor-pointer"
        >
          <X class="w-5 h-5" />
        </button>
      </div>

      <!-- Form fields -->
      <form @submit.prevent="handleSubmit" class="space-y-5">
        <!-- Date Field -->
        <div class="space-y-1.5">
          <label for="meas-date" class="block text-xs font-semibold text-gray-400 uppercase tracking-wider">Date</label>
          <input
            id="meas-date"
            type="date"
            v-model="form.date"
            required
            class="w-full px-4 py-3 rounded-xl glass-input text-sm text-white"
          />
        </div>

        <!-- Grid: Measurements -->
        <div class="grid grid-cols-2 gap-4">
          <!-- Waist Input -->
          <div class="space-y-1.5">
            <label for="meas-waist" class="block text-xs font-semibold text-gray-400 uppercase tracking-wider">Waist (cm)</label>
            <input
              id="meas-waist"
              type="number"
              v-model.number="form.waist"
              placeholder="e.g. 85.0"
              step="0.1"
              min="20"
              max="200"
              class="w-full px-4 py-3 rounded-xl glass-input text-sm text-white"
            />
          </div>

          <!-- Chest Input -->
          <div class="space-y-1.5">
            <label for="meas-chest" class="block text-xs font-semibold text-gray-400 uppercase tracking-wider">Chest (cm)</label>
            <input
              id="meas-chest"
              type="number"
              v-model.number="form.chest"
              placeholder="e.g. 100.5"
              step="0.1"
              min="20"
              max="200"
              class="w-full px-4 py-3 rounded-xl glass-input text-sm text-white"
            />
          </div>

          <!-- Arms Input -->
          <div class="space-y-1.5">
            <label for="meas-arms" class="block text-xs font-semibold text-gray-400 uppercase tracking-wider">Arms (cm)</label>
            <input
              id="meas-arms"
              type="number"
              v-model.number="form.arms"
              placeholder="e.g. 35.0"
              step="0.1"
              min="10"
              max="100"
              class="w-full px-4 py-3 rounded-xl glass-input text-sm text-white"
            />
          </div>

          <!-- Thighs Input -->
          <div class="space-y-1.5">
            <label for="meas-thighs" class="block text-xs font-semibold text-gray-400 uppercase tracking-wider">Thighs (cm)</label>
            <input
              id="meas-thighs"
              type="number"
              v-model.number="form.thighs"
              placeholder="e.g. 60.0"
              step="0.1"
              min="20"
              max="120"
              class="w-full px-4 py-3 rounded-xl glass-input text-sm text-white"
            />
          </div>
        </div>



        <!-- Submit Button -->
        <div class="pt-4 flex gap-3">
          <button
            type="button"
            @click="closeModal"
            class="flex-1 py-3 text-sm font-semibold rounded-xl bg-gray-800 hover:bg-gray-750 text-gray-300 hover:text-white transition-all duration-200 border border-gray-700/50 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            class="flex-1 py-3 text-sm font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white shadow-lg shadow-indigo-600/20 hover:shadow-indigo-600/30 transition-all duration-200 cursor-pointer"
          >
            Save Measurements
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
import { useToast } from '../composables/useToast';

const store = useBodyGraphStore();
const toast = useToast();

const form = reactive({
  date: '',
  waist: '',
  chest: '',
  arms: '',
  thighs: ''
});

const prefillForm = () => {
  if (store.editingMeasurement) {
    form.date = store.editingMeasurement.date;
    form.waist = store.editingMeasurement.waist ? Number(store.editingMeasurement.waist) : '';
    form.chest = store.editingMeasurement.chest ? Number(store.editingMeasurement.chest) : '';
    form.arms = store.editingMeasurement.arms ? Number(store.editingMeasurement.arms) : '';
    form.thighs = store.editingMeasurement.thighs ? Number(store.editingMeasurement.thighs) : '';
  } else {
    form.date = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD local format
    form.waist = '';
    form.chest = '';
    form.arms = '';
    form.thighs = '';

    // Optionally prefill from most recent measurement
    if (store.measurements.length > 0) {
       const recent = store.sortedMeasurements[0];
       form.waist = recent.waist ? Number(recent.waist) : '';
       form.chest = recent.chest ? Number(recent.chest) : '';
       form.arms = recent.arms ? Number(recent.arms) : '';
       form.thighs = recent.thighs ? Number(recent.thighs) : '';
    }
  }
};

const closeModal = () => {
  store.showAddMeasurementModal = false;
  store.editingMeasurement = null;
};

// Listen to modal opening to update initial values
watch(() => store.showAddMeasurementModal, (newVal) => {
  if (newVal) {
    prefillForm();
  }
}, { immediate: true });

const handleSubmit = async () => {
  if (!form.waist && !form.chest && !form.arms && !form.thighs) {
    toast.warning('Veuillez renseigner au moins une mesure.');
    return;
  }
  try {
    await store.saveMeasurementEntry({
      id: store.editingMeasurement?.id || null,
      date: form.date,
      waist: form.waist,
      chest: form.chest,
      arms: form.arms,
      thighs: form.thighs
    });
    toast.success('Mensurations enregistrées avec succès.');
  } catch (error) {
    toast.error("Échec de l'enregistrement : " + error.message);
  }
};
</script>
