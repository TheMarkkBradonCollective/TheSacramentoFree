import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import ConfirmDialog, { type ConfirmDialogVariant } from '../components/ConfirmDialog';

export type ConfirmOptions = {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: ConfirmDialogVariant;
};

export type AlertOptions = {
  title?: string;
  message: string;
  okLabel?: string;
};

type DialogRequest =
  | {
      kind: 'confirm';
      options: ConfirmOptions;
      resolve: (value: boolean) => void;
    }
  | {
      kind: 'alert';
      options: AlertOptions;
      resolve: () => void;
    };

type ConfirmContextValue = {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  alert: (options: AlertOptions) => Promise<void>;
};

const ConfirmContext = createContext<ConfirmContextValue | null>(null);

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [request, setRequest] = useState<DialogRequest | null>(null);

  const confirm = useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      setRequest({ kind: 'confirm', options, resolve });
    });
  }, []);

  const alert = useCallback((options: AlertOptions) => {
    return new Promise<void>((resolve) => {
      setRequest({ kind: 'alert', options, resolve: () => resolve() });
    });
  }, []);

  const value = useMemo(() => ({ confirm, alert }), [confirm, alert]);

  const close = useCallback(() => setRequest(null), []);

  const handleCancel = useCallback(() => {
    if (!request) return;
    if (request.kind === 'confirm') {
      request.resolve(false);
    } else {
      request.resolve();
    }
    close();
  }, [request, close]);

  const handleConfirm = useCallback(() => {
    if (!request) return;
    if (request.kind === 'confirm') {
      request.resolve(true);
    } else {
      request.resolve();
    }
    close();
  }, [request, close]);

  return (
    <ConfirmContext.Provider value={value}>
      {children}
      {request?.kind === 'confirm' ? (
        <ConfirmDialog
          open
          title={request.options.title}
          message={request.options.message}
          confirmLabel={request.options.confirmLabel}
          cancelLabel={request.options.cancelLabel}
          variant={request.options.variant}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
        />
      ) : null}
      {request?.kind === 'alert' ? (
        <ConfirmDialog
          open
          alertOnly
          title={request.options.title}
          message={request.options.message}
          confirmLabel={request.options.okLabel}
          onConfirm={handleConfirm}
          onCancel={handleConfirm}
        />
      ) : null}
    </ConfirmContext.Provider>
  );
}

export function useConfirm(): ConfirmContextValue {
  const ctx = useContext(ConfirmContext);
  if (!ctx) {
    throw new Error('useConfirm must be used within ConfirmProvider');
  }
  return ctx;
}
