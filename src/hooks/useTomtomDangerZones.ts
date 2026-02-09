import { useEffect, useState } from "react";
import { getSafetyIncidents } from "@/services/tomtomService";
import type { DangerZone } from "@/data/mockDangerZones";

type TomtomIncident = {
  type?: string;
  geometry?: { coordinates?: number[] };
  point?: { latitude?: number; longitude?: number };
  properties?: { events?: Array<{ description?: string }> };
};

type TomtomResponse = {
  isSafe?: boolean;
  incidentCount?: number;
  data?: TomtomIncident[];
  error?: string;
};

const DEFAULT_RADIUS_METERS = 220;

function extractIncidentCoords(
  incident: TomtomIncident,
  fallback?: { lat: number; lng: number }
) {
  const coords = incident?.geometry?.coordinates;
  if (Array.isArray(coords) && coords.length >= 2) {
    const [lng, lat] = coords;
    if (typeof lat === "number" && typeof lng === "number") {
      return { lat, lng };
    }
  }

  const point = incident?.point;
  if (point && typeof point.latitude === "number" && typeof point.longitude === "number") {
    return { lat: point.latitude, lng: point.longitude };
  }

  return fallback;
}

function getSeverity(incidentCount: number): "high" | "medium" | "low" {
  if (incidentCount >= 3) return "high";
  if (incidentCount === 2) return "medium";
  return "low";
}

export function useTomtomDangerZones(userLocation?: { lat: number; lng: number }) {
  const [dangerZones, setDangerZones] = useState<DangerZone[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userLocation) {
      setDangerZones([]);
      setError(null);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setError(null);

    getSafetyIncidents(userLocation.lat, userLocation.lng)
      .then((result: TomtomResponse) => {
        if (cancelled) return;
        setIsLoading(false);

        if (!result || result.error) {
          setDangerZones([]);
          setError(result?.error ?? "Unable to verify safety");
          return;
        }

        const incidents = Array.isArray(result.data) ? result.data : [];
        const incidentCount = result.incidentCount ?? incidents.length;

        if (result.isSafe || incidents.length === 0) {
          setDangerZones([]);
          return;
        }

        const severity = getSeverity(incidentCount);
        const zones = incidents
          .map((incident, index) => {
            const coords = extractIncidentCoords(incident);
            if (!coords) return null;

            const description = incident?.properties?.events?.[0]?.description;

            return {
              lat: coords.lat,
              lng: coords.lng,
              radius: DEFAULT_RADIUS_METERS,
              title: incident?.type ? `Incident: ${incident.type}` : "Traffic Incident",
              message: description || "Incident reported nearby.",
              severity,
            } satisfies DangerZone;
          })
          .filter((zone): zone is DangerZone => Boolean(zone));

        if (zones.length === 0 && userLocation) {
          const description = incidents[0]?.properties?.events?.[0]?.description;
          zones.push({
            lat: userLocation.lat,
            lng: userLocation.lng,
            radius: DEFAULT_RADIUS_METERS,
            title: "Traffic Incident",
            message: description || "Incident reported nearby.",
            severity,
          });
        }

        setDangerZones(zones);
      })
      .catch((err) => {
        if (cancelled) return;
        setIsLoading(false);
        setDangerZones([]);
        setError(err instanceof Error ? err.message : "Unable to verify safety");
      });

    return () => {
      cancelled = true;
    };
  }, [userLocation?.lat, userLocation?.lng]);

  return { dangerZones, isLoading, error };
}
