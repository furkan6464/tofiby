"use client";

import type { InputHTMLAttributes, TextareaHTMLAttributes } from "react";

export function Field({
  label,
  hint,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm text-muted">{label}</span>
      <input className="w-full px-3 py-2.5" {...props} />
      {hint ? <span className="text-xs text-faint">{hint}</span> : null}
    </label>
  );
}

export function Area({
  label,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm text-muted">{label}</span>
      <textarea className="min-h-24 w-full px-3 py-2.5" {...props} />
    </label>
  );
}
