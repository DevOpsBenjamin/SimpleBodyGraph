import { describe, it, expect, vi } from 'vitest';
import { useConfirm } from '../src/composables/useConfirm';
import { useToast } from '../src/composables/useToast';

describe('useConfirm composable', () => {
  it('opens confirmation modal and resolves true on handleConfirm', async () => {
    const { confirm, confirmState, handleConfirm } = useConfirm();

    expect(confirmState.isOpen).toBe(false);

    const promise = confirm({
      title: 'Supprimer',
      message: 'Confirmez-vous ?',
      confirmText: 'Oui',
      cancelText: 'Non',
      variant: 'danger'
    });

    expect(confirmState.isOpen).toBe(true);
    expect(confirmState.title).toBe('Supprimer');
    expect(confirmState.message).toBe('Confirmez-vous ?');
    expect(confirmState.confirmText).toBe('Oui');
    expect(confirmState.cancelText).toBe('Non');
    expect(confirmState.variant).toBe('danger');

    handleConfirm();

    const result = await promise;
    expect(result).toBe(true);
    expect(confirmState.isOpen).toBe(false);
  });

  it('opens confirmation modal and resolves false on handleCancel', async () => {
    const { confirm, confirmState, handleCancel } = useConfirm();

    const promise = confirm({
      title: 'Annuler action',
      message: 'Êtes-vous sûr ?'
    });

    expect(confirmState.isOpen).toBe(true);

    handleCancel();

    const result = await promise;
    expect(result).toBe(false);
    expect(confirmState.isOpen).toBe(false);
  });
});

describe('useToast composable', () => {
  it('adds and removes toasts correctly', () => {
    const toast = useToast();

    const id = toast.success('Succès test', 0);
    expect(toast.toasts.length).toBeGreaterThan(0);
    const added = toast.toasts.find(t => t.id === id);
    expect(added).toBeDefined();
    expect(added.message).toBe('Succès test');
    expect(added.type).toBe('success');

    toast.removeToast(id);
    expect(toast.toasts.find(t => t.id === id)).toBeUndefined();
  });

  it('supports error, warning, and info helper methods', () => {
    const toast = useToast();

    const idErr = toast.error('Erreur test', 0);
    const idWarn = toast.warning('Attention test', 0);
    const idInfo = toast.info('Info test', 0);

    expect(toast.toasts.find(t => t.id === idErr)?.type).toBe('error');
    expect(toast.toasts.find(t => t.id === idWarn)?.type).toBe('warning');
    expect(toast.toasts.find(t => t.id === idInfo)?.type).toBe('info');

    toast.removeToast(idErr);
    toast.removeToast(idWarn);
    toast.removeToast(idInfo);
  });
});
