import React from "react";
import type { AlertStatus } from "@/hooks/useDangerAlerts";

type DangerAlertPopupProps = {
  status: Exclude<AlertStatus, "safe">;
  title: string;
  message: string;
  onDismiss: () => void;
  offsetBottom?: number;
};

export function DangerAlertPopup({
  status,
  title,
  message,
  onDismiss,
  offsetBottom = 16,
}: DangerAlertPopupProps) {
  const isDanger = status === "danger";

  return (
    <>
      <style>
        {`
          .danger-alert-popup {
            position: fixed;
            left: 50%;
            top: 42%;
            transform: translate(-50%, -50%);
            z-index: 50;
            max-width: 320px;
            border-radius: 12px;
            padding: 12px 14px;
            box-shadow: 0 12px 30px rgba(0,0,0,0.25);
          }

          @media (min-width: 768px) {
            .danger-alert-popup {
              left: 16px;
              top: auto;
              bottom: var(--danger-alert-bottom, 16px);
              transform: none;
            }
          }
        `}
      </style>
      <div
        role="alert"
        aria-live="polite"
        className="danger-alert-popup"
        style={{
          background: isDanger ? "#fee2e2" : "#fef3c7",
          border: `1px solid ${isDanger ? "#ef4444" : "#f59e0b"}`,
          color: "#111827",
          ["--danger-alert-bottom" as string]: `${offsetBottom}px`,
        }}
      >
      <div
        style={{
          display: "inline-block",
          fontSize: 11,
          fontWeight: 700,
          padding: "2px 6px",
          borderRadius: 999,
          background: isDanger ? "#ef4444" : "#f59e0b",
          color: "#fff",
          marginBottom: 6,
        }}
      >
        {isDanger ? "DANGER" : "WARNING"}
      </div>

      <div style={{ fontWeight: 700, marginBottom: 4 }}>{title}</div>
      <div style={{ fontSize: 14, lineHeight: 1.4, marginBottom: 10 }}>
        {message}
      </div>

      <button
        onClick={onDismiss}
        style={{
          fontSize: 12,
          padding: "4px 8px",
          borderRadius: 6,
          border: "1px solid #d1d5db",
          background: "#fff",
          cursor: "pointer",
        }}
      >
        Dismiss
      </button>
      </div>
    </>
  );
}
