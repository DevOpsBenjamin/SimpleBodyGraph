<template>
  <div 
    class="fixed top-4 right-4 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-3 sm:px-0"
    aria-live="polite"
    aria-atomic="true"
  >
    <div
      v-for="toast in toasts"
      :key="toast.id"
      :class="[
        'pointer-events-auto flex items-start gap-3 p-3.5 rounded-2xl border shadow-xl backdrop-blur-xl transition-all duration-300 animate-slide-in',
        toast.type === 'success' ? 'bg-gray-900/95 border-emerald-500/30 text-emerald-300 shadow-emerald-500/10' :
        toast.type === 'error' ? 'bg-gray-900/95 border-rose-500/30 text-rose-300 shadow-rose-500/10' :
        toast.type === 'warning' ? 'bg-gray-900/95 border-amber-500/30 text-amber-300 shadow-amber-500/10' :
        'bg-gray-900/95 border-violet-500/30 text-violet-300 shadow-violet-500/10'
      ]"
    >
      <CheckCircle2 v-if="toast.type === 'success'" class="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />
      <AlertCircle v-else-if="toast.type === 'error'" class="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
      <AlertTriangle v-else-if="toast.type === 'warning'" class="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
      <Info v-else class="w-4 h-4 shrink-0 mt-0.5 text-violet-400" />

      <div class="flex-1 min-w-0">
        <p class="text-xs text-gray-200 leading-relaxed break-words whitespace-pre-line font-medium">
          {{ toast.message }}
        </p>
      </div>

      <button
        type="button"
        @click="removeToast(toast.id)"
        class="shrink-0 text-gray-500 hover:text-gray-300 p-0.5 rounded-lg transition-colors cursor-pointer"
        :aria-label="$t('common.close')"
      >
        <X class="w-3.5 h-3.5" />
      </button>
    </div>
  </div>
</template>

<script setup>
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-vue-next';
import { useToast } from '../composables/useToast';

const { toasts, removeToast } = useToast();
</script>

<style scoped>
.animate-slide-in {
  animation: slideIn 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(-8px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}
</style>
