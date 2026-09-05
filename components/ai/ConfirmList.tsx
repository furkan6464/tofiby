"use client";

import type { ReactNode } from "react";
import { t } from "@/lib/i18n";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";

export function ConfirmList({
  open,
  title,
  hint,
  children,
  canConfirm,
  busy,
  error,
  confirmLabel,
  onClose,
  onConfirm,
  layer,
}: {
  open: boolean;
  title: string;
  hint: string;
  children: ReactNode;
  canConfirm: boolean;
  busy?: boolean;
  error?: string;
  confirmLabel?: string;
  onClose: () => void;
  onConfirm: () => void;
  layer?: string;
}) {
  return (
    <Modal open={open} onClose={onClose} title={title} wide layer={layer}>
      <p className="mb-3 text-sm text-muted">{hint}</p>
      <div className="max-h-72 space-y-2 overflow-y-auto">{children}</div>
      {error ? <p className="mt-3 text-xs text-pink">{error}</p> : null}
      <div className="mt-4 flex gap-2">
        <Button tone="ghost" className="flex-1" type="button" onClick={onClose}>
          {t("ai.reject")}
        </Button>
        <Button className="flex-1" type="button" disabled={busy || !canConfirm} onClick={onConfirm}>
          {confirmLabel ?? t("ai.confirm")}
        </Button>
      </div>
    </Modal>
  );
}
