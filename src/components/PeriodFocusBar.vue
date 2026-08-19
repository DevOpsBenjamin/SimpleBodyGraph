<template>
  <div class="flex items-center justify-between glass-card p-3 rounded-2xl max-w-sm mx-auto shadow-md">
    <!-- Prev button -->
    <button
      @click="$emit('prev')"
      :disabled="!canPrev"
      class="p-1.5 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-white disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer transition-colors duration-200"
      :title="'Previous ' + periodName"
    >
      <ChevronLeft class="w-5 h-5" />
    </button>

    <!-- Current display label -->
    <div class="text-center select-none">
      <div class="text-xs text-violet-400 font-semibold uppercase tracking-wider">{{ title }}</div>
      <div class="text-sm font-bold text-white mt-0.5">{{ label }}</div>
    </div>

    <!-- Next button -->
    <button
      @click="$emit('next')"
      :disabled="!canNext"
      class="p-1.5 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-white disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer transition-colors duration-200"
      :title="'Next ' + periodName"
    >
      <ChevronRight class="w-5 h-5" />
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
