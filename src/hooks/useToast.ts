import { createContext, useContext, useState, useCallback, useRef } from 'react';
import type { ReactNode } from 'react';
import React from 'react';

// ─── Tipos ──────────────────────────────────────────────────────────────────

export type ToastTipo = 'exito' | 'error' | 'info';

export interface ToastMensaje {
  id: number;
  texto: string;
  tipo: ToastTipo;
  icono?: string;
}

export interface ConfirmOpciones {
  titulo: string;
  descripcion?: string;
  textoConfirmar?: string;
  textoCancelar?: string;
  peligroso?: boolean;
}

interface ToastContextType {
  toasts: ToastMensaje[];
  toast: (texto: string, tipo?: ToastTipo, icono?: string) => void;
  confirmar: (opciones: ConfirmOpciones) => Promise<boolean>;
  confirmState: ConfirmOpciones | null;
  resolveConfirm: ((value: boolean) => void) | null;
}

const ToastContext = createContext<ToastContextType | null>(null);

// ─── Provider ───────────────────────────────────────────────────────────────

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastMensaje[]>([]);
  const [confirmState, setConfirmState] = useState<ConfirmOpciones | null>(null);
  const resolveRef = useRef<((value: boolean) => void) | null>(null);
  const idCounter = useRef(0);

  const toast = useCallback((texto: string, tipo: ToastTipo = 'exito', icono?: string) => {
    const id = ++idCounter.current;
    setToasts(prev => [...prev, { id, texto, tipo, icono }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  }, []);

  const confirmar = useCallback((opciones: ConfirmOpciones): Promise<boolean> => {
    return new Promise((resolve) => {
      setConfirmState(opciones);
      resolveRef.current = resolve;
    });
  }, []);

  const handleResolve = useCallback((value: boolean) => {
    if (resolveRef.current) {
      resolveRef.current(value);
      resolveRef.current = null;
    }
    setConfirmState(null);
  }, []);

  const value: ToastContextType = {
    toasts,
    toast,
    confirmar,
    confirmState,
    resolveConfirm: handleResolve as any,
  };

  return React.createElement(ToastContext.Provider, { value },
    children,
    // Toast overlay
    toasts.length > 0 && React.createElement('div', {
      className: 'fixed top-0 left-0 right-0 z-[999] flex flex-col items-center gap-2 pt-4 pointer-events-none',
      style: { paddingTop: 'max(env(safe-area-inset-top, 0px), 16px)' },
    },
      toasts.map(t => React.createElement('div', {
        key: t.id,
        className: `pointer-events-auto px-5 py-3 rounded-2xl shadow-xl font-bold text-sm flex items-center gap-2.5 toast-enter ${
          t.tipo === 'exito' ? 'bg-green-600 text-white' :
          t.tipo === 'error' ? 'bg-red-600 text-white' :
          'bg-stone-800 text-white'
        }`,
      },
        t.icono && React.createElement('span', { className: 'text-lg' }, t.icono),
        React.createElement('span', null, t.texto),
      )),
    ),
    // Confirm modal
    confirmState && React.createElement('div', {
      className: 'fixed inset-0 bg-black/60 z-[998] flex items-end sm:items-center justify-center p-4',
    },
      React.createElement('div', {
        className: 'bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl slide-up space-y-4',
      },
        React.createElement('div', { className: 'text-center' },
          React.createElement('span', { className: 'text-4xl block mb-3' },
            confirmState.peligroso ? '⚠️' : '🤔'
          ),
          React.createElement('p', { className: 'font-bold text-stone-800 text-base leading-snug' },
            confirmState.titulo
          ),
          confirmState.descripcion && React.createElement('p', {
            className: 'text-stone-400 text-sm mt-1',
          }, confirmState.descripcion),
        ),
        React.createElement('div', { className: 'grid grid-cols-2 gap-3' },
          React.createElement('button', {
            onClick: () => handleResolve(false),
            className: 'py-3.5 bg-stone-100 text-stone-700 font-bold rounded-2xl text-sm active:scale-95 transition-all',
          }, confirmState.textoCancelar || 'Cancelar'),
          React.createElement('button', {
            onClick: () => handleResolve(true),
            className: `py-3.5 font-bold rounded-2xl text-sm active:scale-95 transition-all ${
              confirmState.peligroso
                ? 'bg-red-600 text-white'
                : 'bg-amber-700 text-white'
            }`,
          }, confirmState.textoConfirmar || 'Confirmar'),
        ),
      ),
    ),
  );
}

// ─── Hook ───────────────────────────────────────────────────────────────────

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast debe usarse dentro de un ToastProvider');
  return { toast: ctx.toast, confirmar: ctx.confirmar };
}
