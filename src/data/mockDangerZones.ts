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
  {
    lat: 40.07448,
    lng: -74.08494,
    radius: 220,
    title: "Traffic Closure",
    message: "Reported road closure nearby. Expect delays.",
    severity: "high",
  },
  {
    lat: 40.07566,
    lng: -74.08391,
    radius: 200,
    title: "Blocked Segment",
    message: "Traffic incident marked as closed.",
    severity: "medium",
  },
  {
    lat: 40.07226,
    lng: -74.05618,
    radius: 260,
    title: "Congested Corridor",
    message: "Slowdowns detected along this segment.",
    severity: "medium",
  },
  {
    lat: 40.07112,
    lng: -74.06313,
    radius: 240,
    title: "Incident Cluster",
    message: "Multiple closures reported in this area.",
    severity: "high",
  },
  {
    lat: -33.920687,
    lng: 18.418735,
    radius: 300,
    title: "Geofence Nearby",
    message: "Test danger zone from geofencing data.",
    severity: "low",
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
