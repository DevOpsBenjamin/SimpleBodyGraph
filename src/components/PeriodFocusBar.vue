<template>
  <div class="flex items-center justify-between glass-card px-3 py-2 sm:p-3 rounded-2xl max-w-sm mx-auto shadow-md border border-gray-800/60">
    <!-- Prev button -->
    <button
      @click="$emit('prev')"
      :disabled="!canPrev"
      class="p-1.5 rounded-xl bg-gray-900/60 hover:bg-gray-800 text-gray-400 hover:text-white disabled:opacity-20 disabled:hover:bg-transparent cursor-pointer transition-all duration-200 active:scale-95"
      :title="'Précédent ' + periodName"
      :aria-label="'Précédent ' + periodName"
    >
      <ChevronLeft class="w-5 h-5 text-violet-400" />
    </button>

    <!-- Current display label -->
    <div class="text-center select-none px-2">
      <div class="text-[10px] text-violet-400 font-bold uppercase tracking-wider">{{ title }}</div>
      <div class="text-xs sm:text-sm font-extrabold text-white leading-tight">{{ label }}</div>
    </div>

    <!-- Next button -->
    <button
      @click="$emit('next')"
      :disabled="!canNext"
      class="p-1.5 rounded-xl bg-gray-900/60 hover:bg-gray-800 text-gray-400 hover:text-white disabled:opacity-20 disabled:hover:bg-transparent cursor-pointer transition-all duration-200 active:scale-95"
      :title="'Suivant ' + periodName"
      :aria-label="'Suivant ' + periodName"
    >
      <ChevronRight class="w-5 h-5 text-violet-400" />
    </button>
  </div>
</template>

<script setup>
import { ChevronLeft, ChevronRight } from 'lucide-vue-next';

defineProps({
  title: {
    type: String,
    required: true
  },
  label: {
    type: String,
    required: true
  },
  periodName: {
    type: String,
    default: 'period'
  },
  canPrev: {
    type: Boolean,
    default: true
  },
  canNext: {
    type: Boolean,
    default: true
  }
});

defineEmits(['prev', 'next']);
</script>
