export type DangerZone = {
  lat: number;
  lng: number;
  radius: number; // meters
  title: string;
  message: string;
  severity?: "high" | "medium" | "low";
};

export type DangerRoute = {
  id: string;
  coordinates: Array<[number, number]>; // [lng, lat]
};

// Mock data (replace with API later)
export const mockDangerZones: DangerZone[] = [
  {
    lat: 40.758,
    lng: -73.9855,
    radius: 250,
    title: "Crowded Area",
    message: "High activity reported nearby. Stay alert.",
    severity: "high",
  },
  {
    lat: 40.7484,
    lng: -73.9857,
    radius: 180,
    title: "Construction Zone",
    message: "Restricted access. Avoid entering.",
    severity: "medium",
  },
];

// Fake routes/roads near the zones for visual emphasis
export const mockDangerRoutes: DangerRoute[] = [
  {
    id: "route-1",
    coordinates: [
      [-73.9902, 40.7596],
      [-73.9875, 40.7587],
      [-73.9847, 40.7579],
      [-73.9829, 40.7572],
    ],
  },
  {
    id: "route-2",
    coordinates: [
      [-73.9892, 40.7497],
      [-73.9868, 40.7489],
      [-73.9842, 40.7481],
      [-73.9816, 40.7474],
    ],
  },
];
