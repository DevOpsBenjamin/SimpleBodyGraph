import { reactive, readonly } from 'vue';

const state = reactive({
  toasts: []
});

let toastId = 0;

export function useToast() {
  const addToast = (message, type = 'info', duration = 3500) => {
    const id = ++toastId;
    state.toasts.push({
      id,
      message,
      type, // 'success' | 'error' | 'warning' | 'info'
      duration
    });

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }

    return id;
  };

  const removeToast = (id) => {
    const index = state.toasts.findIndex(t => t.id === id);
    if (index !== -1) {
      state.toasts.splice(index, 1);
    }
  };

  return {
    toasts: readonly(state.toasts),
    addToast,
    removeToast,
    success: (msg, duration) => addToast(msg, 'success', duration),
    error: (msg, duration) => addToast(msg, 'error', duration),
    warning: (msg, duration) => addToast(msg, 'warning', duration),
    info: (msg, duration) => addToast(msg, 'info', duration)
  };
}
