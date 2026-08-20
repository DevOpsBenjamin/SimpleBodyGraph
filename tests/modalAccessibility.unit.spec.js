import { describe, it, expect, vi, afterEach } from 'vitest';
import { ref } from 'vue';
import { useModalAccessibility } from '../src/composables/useModalAccessibility';

describe('useModalAccessibility composable', () => {
  const originalDocument = globalThis.document;

  afterEach(() => {
    globalThis.document = originalDocument;
  });

  it('calls onClose when Escape key is pressed', () => {
    const isOpen = ref(true);
    const modalRef = ref({
      querySelectorAll: () => [],
      contains: () => true
    });
    const onClose = vi.fn();

    const { handleKeyDown } = useModalAccessibility({
      isOpen,
      modalRef,
      onClose
    });

    let defaultPrevented = false;
    let propagationStopped = false;
    const event = {
      key: 'Escape',
      preventDefault: () => { defaultPrevented = true; },
      stopPropagation: () => { propagationStopped = true; }
    };
    handleKeyDown(event);

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(defaultPrevented).toBe(true);
    expect(propagationStopped).toBe(true);
  });

  it('does not call onClose if modal is closed', () => {
    const isOpen = ref(false);
    const modalRef = ref({
      querySelectorAll: () => []
    });
    const onClose = vi.fn();

    const { handleKeyDown } = useModalAccessibility({
      isOpen,
      modalRef,
      onClose
    });

    let defaultPrevented = false;
    const event = {
      key: 'Escape',
      preventDefault: () => { defaultPrevented = true; },
      stopPropagation: () => {}
    };
    handleKeyDown(event);

    expect(onClose).not.toHaveBeenCalled();
    expect(defaultPrevented).toBe(false);
  });

  it('traps focus forward on Tab at the last focusable element', () => {
    const firstEl = { focus: vi.fn(), hasAttribute: () => false, offsetWidth: 10 };
    const lastEl = { focus: vi.fn(), hasAttribute: () => false, offsetWidth: 10 };
    const isOpen = ref(true);
    const modalRef = ref({
      querySelectorAll: () => [firstEl, lastEl],
      contains: (el) => el === lastEl
    });
    const onClose = vi.fn();

    globalThis.document = { activeElement: lastEl };

    const { handleKeyDown } = useModalAccessibility({
      isOpen,
      modalRef,
      onClose
    });

    let defaultPrevented = false;
    const event = {
      key: 'Tab',
      shiftKey: false,
      preventDefault: () => { defaultPrevented = true; }
    };
    handleKeyDown(event);

    expect(defaultPrevented).toBe(true);
    expect(firstEl.focus).toHaveBeenCalledTimes(1);
  });

  it('traps focus backward on Shift+Tab at the first focusable element', () => {
    const firstEl = { focus: vi.fn(), hasAttribute: () => false, offsetWidth: 10 };
    const lastEl = { focus: vi.fn(), hasAttribute: () => false, offsetWidth: 10 };
    const isOpen = ref(true);
    const modalRef = ref({
      querySelectorAll: () => [firstEl, lastEl],
      contains: (el) => el === firstEl
    });
    const onClose = vi.fn();

    globalThis.document = { activeElement: firstEl };

    const { handleKeyDown } = useModalAccessibility({
      isOpen,
      modalRef,
      onClose
    });

    let defaultPrevented = false;
    const event = {
      key: 'Tab',
      shiftKey: true,
      preventDefault: () => { defaultPrevented = true; }
    };
    handleKeyDown(event);

    expect(defaultPrevented).toBe(true);
    expect(lastEl.focus).toHaveBeenCalledTimes(1);
  });
});
