import React from "react";
import type { RiskLevel } from "@/hooks/useDangerAlerts";

type DangerSeverityPopupProps = {
  level: Exclude<RiskLevel, "safe">;
  offsetBottom?: number;
  onDismiss?: () => void;
};

const severityStyles: Record<
  Exclude<RiskLevel, "safe">,
  { label: string; bg: string; border: string; pill: string; icon: "alert" | "info" }
> = {
  high: {
    label: "HIGH RISK",
    bg: "#fee2e2",
    border: "#ef4444",
    pill: "#ef4444",
    icon: "alert",
  },
  medium: {
    label: "MEDIUM RISK",
    bg: "#ffedd5",
    border: "#f97316",
    pill: "#f97316",
    icon: "alert",
  },
  low: {
    label: "LOW RISK",
    bg: "#fef9c3",
    border: "#facc15",
    pill: "#facc15",
    icon: "info",
  },
};

function AlertIcon({ color }: { color: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 3 2.5 20.5a1 1 0 0 0 .88 1.5h17.24a1 1 0 0 0 .88-1.5L12 3z"
        stroke={color}
        strokeWidth="2"
        fill="none"
      />
      <path d="M12 9v5" stroke={color} strokeWidth="2" />
      <circle cx="12" cy="17.5" r="1" fill={color} />
    </svg>
  );
}

function InfoIcon({ color }: { color: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke={color} strokeWidth="2" />
      <path d="M12 10v6" stroke={color} strokeWidth="2" />
      <circle cx="12" cy="7.5" r="1" fill={color} />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 3 5 6v6c0 4.5 3.3 7.8 7 9 3.7-1.2 7-4.5 7-9V6l-7-3z"
        stroke="#2563eb"
        strokeWidth="2"
        fill="none"
      />
    </svg>
  );
}

export function DangerSeverityPopup({
  level,
  offsetBottom = 16,
  onDismiss,
}: DangerSeverityPopupProps) {
  return (
    <div
      role="alert"
      aria-live="polite"
      style={{
        position: "absolute",
        left: 16,
        bottom: offsetBottom,
        zIndex: 50,
        maxWidth: 320,
        borderRadius: 12,
        padding: "14px 16px",
        boxShadow: "0 12px 30px rgba(0,0,0,0.25)",
        background: "#fff",
        border: "1px solid #e5e7eb",
        color: "#111827",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <ShieldIcon />
        <div style={{ fontWeight: 700 }}>Safety Information</div>
      </div>

      <div style={{ display: "grid", gap: 10 }}>
        {(["high", "medium", "low"] as const).map((key) => {
          const style = severityStyles[key];
          const isActive = key === level;
          const Icon = style.icon === "alert" ? AlertIcon : InfoIcon;
          return (
            <div key={key} style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 10,
                  background: style.bg,
                  border: `1px solid ${style.border}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <div
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: 999,
                    background: style.pill,
                  }}
                />
              </div>
              <Icon color={style.pill} />
              <div style={{ fontWeight: isActive ? 700 : 500 }}>
                {style.label
                  .replace(" RISK", "")
                  .replace("HIGH", "High")
                  .replace("MEDIUM", "Medium")
                  .replace("LOW", "Low")}{" "}
                Risk
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ fontSize: 12, color: "#6b7280", marginTop: 12 }}>
        Shaded areas indicate regions with elevated safety concerns. Use caution when
        traveling through these zones.
      </div>

      {onDismiss && (
        <button
          onClick={onDismiss}
          style={{
            marginTop: 10,
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
      )}
    </div>
  );
}
