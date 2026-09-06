import type { ReactNode } from "react";

export function DeviceFrame({
  children,
  compact = false,
}: {
  children: ReactNode;
  compact?: boolean;
}) {
  return (
    <div className={`device-frame ${compact ? "is-compact" : ""}`}>
      <div className="device-frame-chrome">
        <span className="device-frame-dots">
          <i />
          <i />
          <i />
        </span>
        <span className="device-frame-url">tofiby.com</span>
      </div>
      <div className="device-frame-body">{children}</div>
    </div>
  );
}
