<template>
  <div v-if="store.logs.length === 0" class="glass-card p-10 rounded-3xl text-center flex flex-col items-center justify-center">
    <div class="w-16 h-16 bg-gray-950 rounded-2xl flex items-center justify-center border border-gray-800/60 text-gray-500 mb-4">
      <Calendar class="w-8 h-8" />
    </div>
    <h3 class="text-lg font-semibold text-white mb-1">No Entries Yet</h3>
    <p class="text-sm text-gray-400 max-w-xs mb-6">Your logged weight records will show up here.</p>
    <button 
      @click="store.showAddModal = true"
      class="px-4 py-2 bg-violet-600 hover:bg-violet-500 active:bg-violet-700 text-white font-medium rounded-xl transition-all duration-200 flex items-center gap-2 cursor-pointer"
    >
      <Plus class="w-4 h-4" /> Add New Log
    </button>
  </div>

  <div v-else class="space-y-3 max-w-2xl">
    <div 
      v-for="log in store.logs" 
      :key="log.id"
      class="glass-card hover:bg-gray-900/30 p-4 rounded-2xl flex items-center justify-between transition-all duration-300"
    >
      <!-- Details -->
      <div class="flex items-center gap-4">
        <!-- Date Circle -->
        <div class="flex flex-col items-center justify-center w-12 h-12 rounded-xl bg-gray-900 border border-gray-800 text-center">
          <span class="text-[10px] text-gray-400 uppercase leading-none font-semibold">{{ formatMonth(log.date) }}</span>
          <span class="text-lg font-bold text-white leading-none mt-0.5">{{ formatDay(log.date) }}</span>
        </div>
        
        <!-- Metrics Info -->
        <div class="flex items-center gap-5">
          <div>
            <div class="text-xs text-gray-400">Mass</div>
            <div class="text-sm font-bold text-white">{{ Number(log.mass).toFixed(2) }} <span class="text-[10px] font-normal text-gray-400">kg</span></div>
          </div>
          <div>
            <div class="text-xs text-gray-400">Body Fat</div>
            <div class="text-sm font-bold text-white">{{ log.body_fat }} <span class="text-[10px] font-normal text-gray-400">%</span></div>
          </div>
        </div>
      </div>

      <!-- Sync Status and Action -->
      <div class="flex items-center gap-3">
        <!-- Sync Icon Indicator -->
        <div :title="log.synced ? 'Synced to Cloud' : 'Stored locally - pending sync'">
          <CloudCheck v-if="log.synced" class="w-4 h-4 text-emerald-400" />
          <div v-else class="flex items-center justify-center relative">
            <span class="absolute w-3 h-3 rounded-full bg-amber-400/20 animate-ping"></span>
            <CloudLightning class="w-4 h-4 text-amber-400 relative z-10" />
          </div>
        </div>

        <!-- Delete Button -->
        <button 
          @click="handleDelete(log.id)"
          class="p-2 rounded-xl hover:bg-rose-500/10 text-gray-500 hover:text-rose-400 active:bg-rose-500/20 transition-all duration-200 cursor-pointer"
          title="Delete Entry"
        >
          <Trash2 class="w-4.5 h-4.5" />
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { Calendar, Trash2, Plus, Cloud as CloudCheck, CloudLightning } from 'lucide-vue-next';
import { useBodyGraphStore } from '../stores/bodyGraph';

const store = useBodyGraphStore();

// Date formatting helpers
const formatMonth = (dateStr) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleString('en-US', { month: 'short' });
};

const formatDay = (dateStr) => {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  return parts[2] || '';
};

const handleDelete = async (id) => {
  if (confirm('Are you sure you want to delete this log entry?')) {
    try {
      await store.deleteLogEntry(id);
    } catch (error) {
      alert('Failed to delete log entry: ' + error.message);
    }
  }
};
</script>
