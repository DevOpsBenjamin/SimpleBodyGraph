<template>
  <div 
    v-if="confirmState.isOpen"
    ref="modalCardRef"
    role="alertdialog"
    aria-modal="true"
    aria-labelledby="confirm-dialog-title"
    aria-describedby="confirm-dialog-desc"
    class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in"
    @click.self="handleCancel"
  >
    <div class="glass-card w-full max-w-sm p-6 rounded-3xl border border-gray-700/60 shadow-2xl relative">
      <!-- Icon Header -->
      <div class="flex items-center gap-3.5 mb-4">
        <div 
          :class="[
            'w-10 h-10 rounded-2xl flex items-center justify-center border',
            confirmState.variant === 'danger' ? 'bg-rose-500/15 border-rose-500/30 text-rose-400' :
            confirmState.variant === 'warning' ? 'bg-amber-500/15 border-amber-500/30 text-amber-400' :
            'bg-violet-500/15 border-violet-500/30 text-violet-400'
          ]"
        >
          <Trash2 v-if="confirmState.variant === 'danger'" class="w-5 h-5" />
          <AlertTriangle v-else-if="confirmState.variant === 'warning'" class="w-5 h-5" />
          <Info v-else class="w-5 h-5" />
        </div>

        <div>
          <h3 id="confirm-dialog-title" class="text-sm font-bold text-white leading-tight">
            {{ confirmState.title }}
          </h3>
        </div>
      </div>

      <!-- Message -->
      <p id="confirm-dialog-desc" class="text-xs text-gray-300 leading-relaxed mb-6 whitespace-pre-line">
        {{ confirmState.message }}
      </p>

      <!-- Action Buttons -->
      <div class="flex items-center gap-3">
        <button
          type="button"
          @click="handleCancel"
          class="flex-1 py-2.5 px-4 rounded-xl bg-gray-800 hover:bg-gray-750 active:scale-[0.98] text-gray-300 hover:text-white font-semibold text-xs border border-gray-700/50 transition-all duration-200 cursor-pointer font-sans"
        >
          {{ confirmState.cancelText }}
        </button>

        <button
          type="button"
          @click="handleConfirm"
          :class="[
            'flex-1 py-2.5 px-4 rounded-xl font-semibold text-xs text-white transition-all duration-200 cursor-pointer active:scale-[0.98] font-sans shadow-lg',
            confirmState.variant === 'danger' ? 'bg-rose-600 hover:bg-rose-500 shadow-rose-600/20' :
            confirmState.variant === 'warning' ? 'bg-amber-600 hover:bg-amber-500 shadow-amber-600/20' :
            'bg-violet-600 hover:bg-violet-500 shadow-violet-600/20'
          ]"
        >
          {{ confirmState.confirmText }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { AlertTriangle, Trash2, Info } from 'lucide-vue-next';
import { useConfirm } from '../composables/useConfirm';
import { useModalAccessibility } from '../composables/useModalAccessibility';

const { confirmState, handleConfirm, handleCancel } = useConfirm();
const modalCardRef = ref(null);

useModalAccessibility({
  isOpen: () => confirmState.isOpen,
  modalRef: modalCardRef,
  onClose: () => handleCancel()
});
</script>

<style scoped>
.animate-fade-in {
  animation: fadeIn 0.15s ease-out forwards;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: scale(0.96);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}
</style>
