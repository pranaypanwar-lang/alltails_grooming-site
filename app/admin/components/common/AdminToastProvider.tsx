"use client";

import { createContext, useCallback, useContext, useState } from "react";
import { X } from "lucide-react";

type Toast = { id: string; text: string; ok: boolean };

type ToastContextValue = {
  showToast: (text: string, ok: boolean) => void;
};

const ToastContext = createContext<ToastContextValue>({ showToast: () => {} });

export function useAdminToast() {
  return useContext(ToastContext);
}

export function AdminToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((text: string, ok: boolean) => {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev, { id, text, ok }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-5 right-5 z-[500] flex flex-col gap-2 w-80">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`flex items-center justify-between rounded-[14px] px-4 py-3 text-[13px] font-medium shadow-lg ${
              t.ok ? "bg-[#effaf3] text-[#15803d]" : "bg-[#fff1f2] text-[#be123c]"
            }`}
          >
            <span>{t.text}</span>
            <button type="button" onClick={() => dismiss(t.id)} className="ml-3 shrink-0">
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
