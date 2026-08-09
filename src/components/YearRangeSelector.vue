<template>
  <div class="glass-card p-4 rounded-3xl max-w-2xl mx-auto shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4 border border-gray-800/40">
    <div class="flex items-center gap-3">
      <div class="p-2 rounded-xl bg-violet-600/10 border border-violet-500/15">
        <Calendar class="w-5 h-5 text-violet-400" />
      </div>
      <div>
        <h4 class="text-sm font-bold text-white">Date Range Filter</h4>
        <p class="text-xs text-gray-400">Select continuous range of years to display</p>
      </div>
    </div>

    <div class="flex items-center gap-3 w-full sm:w-auto">
      <div class="flex-1 sm:flex-initial flex flex-col gap-1">
        <label class="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Start Year</label>
        <select
          v-model="store.startYear"
          class="bg-gray-950 border border-gray-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-violet-500 cursor-pointer min-w-[90px]"
        >
          <option v-for="yr in store.availableYears.slice().reverse()" :key="yr" :value="yr">{{ yr }}</option>
        </select>
      </div>

      <div class="text-gray-600 mt-4 font-bold">→</div>

      <div class="flex-1 sm:flex-initial flex flex-col gap-1">
        <label class="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">End Year</label>
        <select
          v-model="store.endYear"
          class="bg-gray-950 border border-gray-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-violet-500 cursor-pointer min-w-[90px]"
        >
          <option v-for="yr in store.availableYears" :key="yr" :value="yr" :disabled="yr < store.startYear">{{ yr }}</option>
        </select>
      </div>
    </div>
  </div>
</template>

<script setup>
import { Calendar } from 'lucide-vue-next';
import { useBodyGraphStore } from '../stores/bodyGraph';

const store = useBodyGraphStore();
</script>
