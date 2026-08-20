import { watch, onMounted, onUnmounted, nextTick } from 'vue';

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])'
].join(', ');

export function useModalAccessibility({
  isOpen,
  modalRef,
  initialFocusRef = null,
  onClose = () => {}
}) {
  let previouslyFocusedElement = null;

  const getFocusableElements = () => {
    if (!modalRef.value) return [];
    return Array.from(modalRef.value.querySelectorAll(FOCUSABLE_SELECTOR)).filter(
      el => !el.hasAttribute('disabled') && (el.offsetWidth > 0 || el.offsetHeight > 0 || el.getClientRects().length > 0)
    );
  };

  const handleKeyDown = (e) => {
    const open = typeof isOpen === 'function' ? isOpen() : isOpen.value;
    if (!open || !modalRef.value) return;

    // 1. Escape key handling
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      onClose();
      return;
    }

    // 2. Focus trapping on Tab / Shift+Tab
    if (e.key === 'Tab') {
      const focusables = getFocusableElements();
      if (focusables.length === 0) {
        e.preventDefault();
        return;
      }

      const firstElement = focusables[0];
      const lastElement = focusables[focusables.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === firstElement || !modalRef.value.contains(document.activeElement)) {
          e.preventDefault();
          lastElement.focus();
        }
      } else {
        if (document.activeElement === lastElement || !modalRef.value.contains(document.activeElement)) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    }
  };

  const focusFirstElement = async () => {
    await nextTick();
    if (!modalRef.value) return;

    if (initialFocusRef && initialFocusRef.value && typeof initialFocusRef.value.focus === 'function') {
      initialFocusRef.value.focus();
      return;
    }

    const focusables = getFocusableElements();
    if (focusables.length > 0) {
      const firstInput = focusables.find(el => ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName));
      if (firstInput) {
        firstInput.focus();
      } else {
        focusables[0].focus();
      }
    } else {
      modalRef.value.focus?.();
    }
  };

  watch(
    () => (typeof isOpen === 'function' ? isOpen() : isOpen.value),
    (open) => {
      if (open) {
        if (typeof document !== 'undefined') {
          previouslyFocusedElement = document.activeElement;
        }
        focusFirstElement();
      } else {
        if (previouslyFocusedElement && typeof previouslyFocusedElement.focus === 'function') {
          previouslyFocusedElement.focus();
        }
        previouslyFocusedElement = null;
      }
    },
    { immediate: true }
  );

  onMounted(() => {
    if (typeof window !== 'undefined') {
      window.addEventListener('keydown', handleKeyDown);
    }
  });

  onUnmounted(() => {
    if (typeof window !== 'undefined') {
      window.removeEventListener('keydown', handleKeyDown);
    }
    if (previouslyFocusedElement && typeof previouslyFocusedElement.focus === 'function') {
      previouslyFocusedElement.focus();
    }
  });

  return {
    focusFirstElement,
    getFocusableElements,
    handleKeyDown
  };
}
