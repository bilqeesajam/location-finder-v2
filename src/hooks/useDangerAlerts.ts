import { useEffect, useState } from "react";
import { mockDangerZones, type DangerZone } from "@/data/mockDangerZones";

export type AlertStatus = "safe" | "warning" | "danger";
export type RiskLevel = "safe" | "low" | "medium" | "high";

const WARNING_BUFFER_METERS = 200;
const LOW_BUFFER_METERS = 400;
const TEST_ZONE_RADIUS_METERS = 120;

function toRad(value: number) {
  return (value * Math.PI) / 180;
}

function distanceMeters(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371000;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;

  return 2 * R * Math.asin(Math.sqrt(h));
}

export function useDangerAlerts(
  userLocation?: { lat: number; lng: number },
  extraZones: DangerZone[] = []
) {
  const [alertStatus, setAlertStatus] = useState<AlertStatus>("safe");
  const [alertZone, setAlertZone] = useState<DangerZone | null>(null);
  const [dismissedStatus, setDismissedStatus] = useState<AlertStatus | null>(null);
  const [dismissedRiskLevel, setDismissedRiskLevel] = useState<RiskLevel | null>(null);
  const [riskLevel, setRiskLevel] = useState<RiskLevel>("safe");
  const [riskZone, setRiskZone] = useState<DangerZone | null>(null);

  useEffect(() => {
    if (!userLocation) return;

    const zones: DangerZone[] = [
      {
        lat: userLocation.lat,
        lng: userLocation.lng,
        radius: TEST_ZONE_RADIUS_METERS,
        title: "Test Danger Zone",
        message: "You are inside a test zone centered on your live location.",
        severity: "high",
      },
      ...mockDangerZones,
      ...extraZones,
    ];

    let nextStatus: AlertStatus = "safe";
    let nextZone: DangerZone | null = null;
    let closestZone: DangerZone | null = null;
    let closestDistance = Number.POSITIVE_INFINITY;

    for (const zone of zones) {
      const d = distanceMeters(userLocation, zone);

      if (d < closestDistance) {
        closestDistance = d;
        closestZone = zone;
      }

      if (d <= zone.radius) {
        nextStatus = "danger";
        nextZone = zone;
        break;
      }

      if (d <= zone.radius + WARNING_BUFFER_METERS) {
        nextStatus = "warning";
        nextZone = zone;
      }
    }

    setAlertStatus(nextStatus);
    setAlertZone(nextZone);

    let nextRiskLevel: RiskLevel = "safe";
    let nextRiskZone: DangerZone | null = null;

    if (closestZone) {
      if (closestDistance <= closestZone.radius) {
        nextRiskLevel = "high";
      } else if (closestDistance <= closestZone.radius + WARNING_BUFFER_METERS) {
        nextRiskLevel = "medium";
      } else if (closestDistance <= closestZone.radius + LOW_BUFFER_METERS) {
        nextRiskLevel = "low";
      }

      if (nextRiskLevel !== "safe") {
        nextRiskZone = closestZone;
      }
    }

    setRiskLevel(nextRiskLevel);
    setRiskZone(nextRiskZone);
  }, [userLocation, extraZones]);

  useEffect(() => {
    if (alertStatus === "safe") {
      setDismissedStatus(null);
      return;
    }
    if (dismissedStatus && dismissedStatus !== alertStatus) {
      setDismissedStatus(null);
    }
  }, [alertStatus, dismissedStatus]);

  useEffect(() => {
    if (riskLevel === "safe") {
      setDismissedRiskLevel(null);
      return;
    }
    if (dismissedRiskLevel && dismissedRiskLevel !== riskLevel) {
      setDismissedRiskLevel(null);
    }
  }, [riskLevel, dismissedRiskLevel]);

  const shouldShow = alertStatus !== "safe" && dismissedStatus !== alertStatus;
  const shouldShowRisk = riskLevel !== "safe" && dismissedRiskLevel !== riskLevel;

  return {
    alertStatus,
    alertZone,
    shouldShow,
    riskLevel,
    riskZone,
    shouldShowRisk,
    dismiss: () => setDismissedStatus(alertStatus),
    dismissRisk: () => setDismissedRiskLevel(riskLevel),
  };
}
