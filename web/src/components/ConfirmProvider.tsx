"use client";

import { createContext, useContext, useState, useCallback, useRef } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

type ConfirmOptions = {
  title?: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
};

type ConfirmContextValue = {
  confirm: (opts: ConfirmOptions) => Promise<boolean>;
};

const ConfirmContext = createContext<ConfirmContextValue | null>(null);

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error("useConfirm must be used inside <ConfirmProvider>");
  return ctx.confirm;
}

// ─── Dialog UI ────────────────────────────────────────────────────────────────

type DialogState = ConfirmOptions & { resolve: (v: boolean) => void };

function ConfirmDialog({ state, onResult }: { state: DialogState; onResult: (v: boolean) => void }) {
  const { title, message, confirmLabel = "Delete", danger = true } = state;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={() => onResult(false)}
      />

      {/* Card */}
      <div className="relative z-10 w-full max-w-sm rounded-2xl bg-white shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Top accent bar */}
        <div className={`h-1.5 w-full ${danger ? "bg-gradient-to-r from-red-400 to-rose-500" : "bg-gradient-to-r from-indigo-400 to-violet-500"}`} />

        <div className="px-6 pt-5 pb-4">
          <div className="flex items-start gap-4">
            <div className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-xl ${danger ? "bg-red-50" : "bg-indigo-50"}`}>
              {danger ? "⚠️" : "ℹ️"}
            </div>
            <div className="min-w-0">
              <p className="font-bold text-gray-900 text-sm">
                {title ?? (danger ? "Confirm Delete" : "Confirm Action")}
              </p>
              <p className="mt-1 text-sm text-gray-500 leading-relaxed">{message}</p>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-gray-100 bg-gray-50 px-6 py-3">
          <button
            onClick={() => onResult(false)}
            className="rounded-xl border-2 border-gray-200 px-5 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-100 transition-colors"
            autoFocus
          >
            Cancel
          </button>
          <button
            onClick={() => onResult(true)}
            className={`rounded-xl px-5 py-2 text-sm font-bold text-white shadow-sm transition-all hover:shadow-md ${
              danger
                ? "bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700"
                : "bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700"
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [dialogState, setDialogState] = useState<DialogState | null>(null);
  const resolveRef = useRef<((v: boolean) => void) | null>(null);

  const confirm = useCallback((opts: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      resolveRef.current = resolve;
      setDialogState({ ...opts, resolve });
    });
  }, []);

  function handleResult(value: boolean) {
    resolveRef.current?.(value);
    resolveRef.current = null;
    setDialogState(null);
  }

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      {dialogState && <ConfirmDialog state={dialogState} onResult={handleResult} />}
    </ConfirmContext.Provider>
  );
}
