"use client";

import { useCallback, useState } from "react";

type ConfirmTone = "default" | "warning" | "danger" | "success";

type Config<TPayload> = {
  title: string;
  getSubtitle?: (payload: TPayload | null) => string | undefined;
  tone?: ConfirmTone;
  getMessage?: (payload: TPayload | null) => string | undefined;
  reasonLabel?: string;
  reasonPlaceholder?: string;
  requireReason?: boolean;
  confirmLabel?: string;
  cancelLabel?: string;
};

type State<TPayload> = {
  isOpen: boolean;
  payload: TPayload | null;
  reason: string;
  isSubmitting: boolean;
};

export function useAdminConfirmAction<TPayload>(config: Config<TPayload>) {
  const [state, setState] = useState<State<TPayload>>({
    isOpen: false,
    payload: null,
    reason: "",
    isSubmitting: false,
  });

  const open = useCallback((payload: TPayload, reason = "") => {
    setState({ isOpen: true, payload, reason, isSubmitting: false });
  }, []);

  const close = useCallback(() => {
    setState({ isOpen: false, payload: null, reason: "", isSubmitting: false });
  }, []);

  const setReason = useCallback((reason: string) => {
    setState((prev) => ({ ...prev, reason }));
  }, []);

  const setSubmitting = useCallback((isSubmitting: boolean) => {
    setState((prev) => ({ ...prev, isSubmitting }));
  }, []);

  const modalProps = {
    isOpen: state.isOpen,
    title: config.title,
    subtitle: config.getSubtitle?.(state.payload),
    tone: config.tone ?? ("default" as ConfirmTone),
    message: config.getMessage?.(state.payload),
    reasonLabel: config.reasonLabel,
    reasonPlaceholder: config.reasonPlaceholder,
    reason: state.reason,
    requireReason: config.requireReason ?? false,
    confirmLabel: config.confirmLabel ?? "Confirm",
    cancelLabel: config.cancelLabel ?? "Cancel",
    isSubmitting: state.isSubmitting,
    onClose: close,
    onReasonChange: config.reasonLabel !== undefined || config.requireReason ? setReason : undefined,
  };

  return { state, open, close, setReason, setSubmitting, modalProps };
}
