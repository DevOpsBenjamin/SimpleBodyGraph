import { reactive, readonly } from 'vue';

const state = reactive({
  isOpen: false,
  title: '',
  message: '',
  confirmText: 'Confirmer',
  cancelText: 'Annuler',
  variant: 'danger', // 'danger' | 'warning' | 'info'
  resolve: null
});

export function useConfirm() {
  const confirm = ({
    title = 'Confirmation',
    message = 'Êtes-vous sûr de vouloir continuer ?',
    confirmText = 'Confirmer',
    cancelText = 'Annuler',
    variant = 'danger'
  } = {}) => {
    return new Promise((resolve) => {
      state.title = title;
      state.message = message;
      state.confirmText = confirmText;
      state.cancelText = cancelText;
      state.variant = variant;
      state.resolve = resolve;
      state.isOpen = true;
    });
  };

  const handleConfirm = () => {
    state.isOpen = false;
    if (typeof state.resolve === 'function') {
      state.resolve(true);
      state.resolve = null;
    }
  };

  const handleCancel = () => {
    state.isOpen = false;
    if (typeof state.resolve === 'function') {
      state.resolve(false);
      state.resolve = null;
    }
  };

  return {
    confirmState: readonly(state),
    confirm,
    handleConfirm,
    handleCancel
  };
}
