import { useEffect, useRef, useCallback, useState, useMemo } from "react";
import maplibregl from "maplibre-gl";
import type { FeatureCollection, Geometry } from "geojson";
import "maplibre-gl/dist/maplibre-gl.css";
import { Location } from "@/hooks/useLocations";
import { LiveLocation } from "@/hooks/useLiveLocations";
import { MapControls } from "./MapControls";
import { cn } from "@/lib/utils";
import { getBusRoute, type BusRouteData } from "@/lib/busRoute";

interface MapViewProps {
  locations: Location[];
  liveLocations: LiveLocation[];
  onMapClick?: (lng: number, lat: number) => void;
  isAddingLocation?: boolean;
  className?: string;
import { useEffect, useRef, useCallback, useState, useMemo } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Location } from '@/hooks/useLocations';
import { LiveLocation } from '@/hooks/useLiveLocations';
import { MapControls } from './MapControls';
import { cn } from '@/lib/utils';
import { getSafetyIncidents } from '@/services/tomtomService';
import { DangerAlertPopup } from '@/components/DangerAlertPopup';
import { DangerSeverityPopup } from '@/components/DangerSeverityPopup';

const DANGER_ZONE_SOURCE_ID = 'danger-zones';
const DANGER_ROUTE_SOURCE_ID = 'danger-routes';
const DANGER_ZONE_FILL_ID = 'danger-zone-fill';
const DANGER_ZONE_OUTLINE_ID = 'danger-zone-outline';
const DANGER_ROUTE_LINE_ID = 'danger-route-line';

type DangerZone = {
    id: string;
    title: string;
    severity?: 'low' | 'medium' | 'high';
    lat: number;
    lng: number;
    radius: number;
};

type RiskLevel = 'safe' | 'low' | 'medium' | 'high';

function toRad(value: number) {
    return (value * Math.PI) / 180;
}

function squarePolygon(lng: number, lat: number, radiusMeters: number) {
    const earthRadius = 6371000;
    const latRad = toRad(lat);
    const angularDistance = radiusMeters / earthRadius;
    const deltaLat = angularDistance;
    const deltaLng = angularDistance / Math.cos(latRad);

    const latDeg = lat;
    const lngDeg = lng;
    const dLatDeg = (deltaLat * 180) / Math.PI;
    const dLngDeg = (deltaLng * 180) / Math.PI;

    return [
        [lngDeg - dLngDeg, latDeg - dLatDeg],
        [lngDeg + dLngDeg, latDeg - dLatDeg],
        [lngDeg + dLngDeg, latDeg + dLatDeg],
        [lngDeg - dLngDeg, latDeg + dLatDeg],
        [lngDeg - dLngDeg, latDeg - dLatDeg],
    ];
}

interface MapViewProps {
    locations: Location[];
    liveLocations: LiveLocation[];
    onMapClick?: (lng: number, lat: number) => void;
    isAddingLocation?: boolean;
    className?: string;
    userLocation?: { lat: number; lng: number };
}

const MAPTILER_API_KEY = import.meta.env.VITE_MAPTILER_API_KEY as string;
const BUS_ICON_ID = "bus-stop";
const BUS_ICON_SVG =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 2h10a2 2 0 0 1 2 2v11a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3V4a2 2 0 0 1 2-2Z"/><path d="M5 12h14"/><path d="M7 6h10"/><circle cx="8.5" cy="16.5" r="1.5"/><circle cx="15.5" cy="16.5" r="1.5"/></svg>`,
  );

function locationsToGeoJSON(
  locations: Location[],
): GeoJSON.FeatureCollection<GeoJSON.Point> {
  return {
    type: "FeatureCollection",
    features: locations.map((loc) => ({
      type: "Feature",
      properties: {
        id: loc.id,
        name: loc.name,
        description: loc.description,
      },
      geometry: {
        type: "Point",
        coordinates: [loc.longitude, loc.latitude],
      },
    })),
  };
}

export function MapView({
  locations,
  liveLocations,
  onMapClick,
  isAddingLocation,
  className,
}: MapViewProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const liveMarkersRef = useRef<Map<string, maplibregl.Marker>>(new Map());
  const popupRef = useRef<maplibregl.Popup | null>(null);
  const onMapClickRef = useRef(onMapClick);
  const isAddingLocationRef = useRef(isAddingLocation);

  const [isLoaded, setIsLoaded] = useState(false);
  const [is3D, setIs3D] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [mapMoveTick, setMapMoveTick] = useState(0);
  const [currentZoom, setCurrentZoom] = useState(2); // Track zoom for live markers

  const matchesService = (loc: Location, service: string) => {
    const text = (loc.name + " " + (loc.description || "")).toLowerCase();
    const keywords: Record<string, string[]> = {
      hospitals: ["hospital", "clinic", "medical", "health", "emergency"],
      police: ["police", "precinct", "station"],
      library: ["library"],
      restaurants: ["restaurant", "cafe", "café", "diner", "bistro", "eatery"],
      clinic: ["clinic"],
      shelter: ["shelter"],
      parks: ["park", "garden"],
      roads: ["road", "street", "rd", "st"],
    const mapContainer = useRef<HTMLDivElement>(null);
    const map = useRef<maplibregl.Map | null>(null);
    const markersRef = useRef<maplibregl.Marker[]>([]);
    const liveMarkersRef = useRef<Map<string, maplibregl.Marker>>(new Map());
    const popupRef = useRef<maplibregl.Popup | null>(null);
    const onMapClickRef = useRef(onMapClick);
    const isAddingLocationRef = useRef(isAddingLocation);

    const [isLoaded, setIsLoaded] = useState(false);
    const [is3D, setIs3D] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedServices, setSelectedServices] = useState<string[]>([]);
    const [mapMoveTick, setMapMoveTick] = useState(0); 
    const [currentZoom, setCurrentZoom] = useState(2); // Track zoom for live markers
    const [showDangerZones, setShowDangerZones] = useState(true);
    const [tomtomZones, setTomtomZones] = useState<DangerZone[]>([]);
    const [showDangerAlert, setShowDangerAlert] = useState(true);
    const [showSeverityPopup, setShowSeverityPopup] = useState(true);
    const [tomtomIncidentCount, setTomtomIncidentCount] = useState(0);
    const [tomtomError, setTomtomError] = useState<string | null>(null);
    const tomtomRequestIdRef = useRef(0);
    const CLUSTER_DISTANCE_METERS = 300;

    const matchesService = (loc: Location, service: string) => {
        const text = (loc.name + ' ' + (loc.description || '')).toLowerCase();
        const keywords: Record<string, string[]> = {
            clinic: ['clinic', 'medical', 'health', 'doctor', 'hospital', 'er', 'emergency'],
            library: ['library'],
            shelter: ['shelter', 'homeless', 'safe house', 'refuge', 'refugee', 'crisis'],
            hospitals: ['hospital', 'clinic', 'medical', 'health', 'emergency'],
            police: ['police', 'precinct', 'station'],
            restaurants: ['restaurant', 'cafe', 'diner', 'bistro', 'eatery'],
            parks: ['park', 'garden'],
            roads: ['road', 'street', 'rd', 'st'],
        };
        return (keywords[service] || []).some((k) => text.includes(k));
    };
    return (keywords[service] || []).some((k) => text.includes(k));
  };

  const filteredLocations = useMemo(() => {
    let res = locations;
    if (selectedServices.length > 0) {
      res = res.filter((l) =>
        selectedServices.some((s) => {
          if (s === "parks" || s === "roads") return false;
          return matchesService(l, s);
        }),
      );
    }
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      res = res.filter(
        (l) =>
          l.name.toLowerCase().includes(q) ||
          (l.description || "").toLowerCase().includes(q),
      );
    }
    return res;
  }, [locations, selectedServices, searchQuery]);

  const toggleService = useCallback((service: string) => {
    setSelectedServices((prev) =>
      prev.includes(service)
        ? prev.filter((s) => s !== service)
        : [...prev, service],
    );
  }, []);

  const handleClearFilters = useCallback(() => setSelectedServices([]), []);

  useEffect(() => {
    onMapClickRef.current = onMapClick;
    isAddingLocationRef.current = isAddingLocation;
  }, [onMapClick, isAddingLocation]);

  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    const style = MAPTILER_API_KEY
      ? `https://api.maptiler.com/maps/019c2dbf-3685-7ef2-9655-ad8c0b268d0e/style.json?key=${MAPTILER_API_KEY}`
      : "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style,
      center: [0, 20],
      zoom: 2,
      pitch: 45,
      maxPitch: 85,
    });

    map.current.addControl(
      new maplibregl.NavigationControl({ visualizePitch: true }),
      "top-right",
    );
    map.current.addControl(
      new maplibregl.ScaleControl({ maxWidth: 100, unit: "metric" }),
      "bottom-left",
    );
    map.current.addControl(
      new maplibregl.GeolocateControl({
        positionOptions: { enableHighAccuracy: true },
        trackUserLocation: true,
      }),
      "top-right",
    );

    map.current.on("moveend", () => {
      setMapMoveTick((t) => t + 1);
      if (map.current) setCurrentZoom(map.current.getZoom());
    });

    map.current.on("load", () => {
      setIsLoaded(true);

      map.current!.addSource("locations-src", {
        type: "geojson",
        data: locationsToGeoJSON(filteredLocations),
        cluster: true,
        clusterMaxZoom: 14,
        clusterRadius: 50,
      });

      map.current!.addLayer({
        id: "clusters",
        type: "circle",
        source: "locations-src",
        filter: ["has", "point_count"],
        paint: {
          "circle-color": "#2dd4bf",
          "circle-radius": ["step", ["get", "point_count"], 20, 10, 25, 30, 30],
        },
      });

      map.current!.addLayer({
        id: "cluster-count",
        type: "symbol",
        source: "locations-src",
        filter: ["has", "point_count"],
        layout: {
          "text-field": "{point_count_abbreviated}",
          "text-font": ["Arial Unicode MS Bold", "Open Sans Bold"],
          "text-size": 14,
        },
        paint: { "text-color": "#ffffff" },
      });

      map.current!.on("click", "clusters", async (e) => {
        if (isAddingLocationRef.current) return;
        const features = map.current!.queryRenderedFeatures(e.point, {
          layers: ["clusters"],
    const filteredLocations = useMemo(() => {
        let res = locations;
        if (selectedServices.length > 0) {
            res = res.filter((l) =>
                selectedServices.some((s) => {
                    if (s === 'parks' || s === 'roads') return false;
                    return matchesService(l, s);
                })
            );
        }
        const q = searchQuery.trim().toLowerCase();
        if (q) {
            res = res.filter(l => l.name.toLowerCase().includes(q) || (l.description || '').toLowerCase().includes(q));
        }
        return res;
    }, [locations, selectedServices, searchQuery]);

    const toggleService = useCallback((service: string) => {
        setSelectedServices((prev) =>
            prev.includes(service) ? prev.filter((s) => s !== service) : [...prev, service]
        );
    }, []);

    const handleClearFilters = useCallback(() => setSelectedServices([]), []);

    const dangerZonesGeoJson = useMemo(() => {
        const zones: DangerZone[] = tomtomZones;

        return {
            type: 'FeatureCollection' as const,
            features: zones.map((zone) => ({
                type: 'Feature' as const,
                properties: {
                    title: zone.title,
                    severity: zone.severity ?? 'high',
                },
                geometry: {
                    type: 'Polygon' as const,
                    coordinates: [squarePolygon(zone.lng, zone.lat, zone.radius)],
                },
            })),
        };
    }, [tomtomZones]);

    const dangerRoutesGeoJson = useMemo(() => ({
        type: 'FeatureCollection' as const,
        features: [] as GeoJSON.Feature<GeoJSON.LineString>[],
    }), []);

    const riskLevel: RiskLevel = useMemo(() => {
        const count = tomtomZones.length;
        if (count >= 5) return 'high';
        if (count >= 2) return 'medium';
        if (count >= 1) return 'low';
        return 'safe';
    }, [tomtomZones.length]);

    useEffect(() => {
        onMapClickRef.current = onMapClick;
        isAddingLocationRef.current = isAddingLocation;
    }, [onMapClick, isAddingLocation]);

    useEffect(() => {
        if (!mapContainer.current || map.current) return;

        const style = MAPTILER_API_KEY
            ? `https://api.maptiler.com/maps/019c1e96-0cd8-7758-8b57-e13f87a1269d/style.json?key=${MAPTILER_API_KEY}`
            : 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';

        map.current = new maplibregl.Map({
            container: mapContainer.current,
            style,
            center: [0, 20],
            zoom: 2,
            pitch: 45,
            bearing: 0,
            maxPitch: 85,
        });

        map.current.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'top-right');
        map.current.addControl(new maplibregl.ScaleControl({ maxWidth: 100, unit: 'metric' }), 'bottom-left');
        map.current.addControl(new maplibregl.GeolocateControl({ positionOptions: { enableHighAccuracy: true }, trackUserLocation: true }), 'top-right');

        map.current.on('moveend', () => {
            setMapMoveTick(t => t + 1);
            if (map.current) setCurrentZoom(map.current.getZoom());
        });

        map.current.on('load', () => {
            setIsLoaded(true);

            map.current!.addSource('locations-src', {
                type: 'geojson',
                data: locationsToGeoJSON(filteredLocations),
                cluster: true,
                clusterMaxZoom: 14,
                clusterRadius: 50,
            });

            map.current!.addLayer({
                id: 'clusters',
                type: 'circle',
                source: 'locations-src',
                filter: ['has', 'point_count'],
                paint: {
                    'circle-color': '#2dd4bf',
                    'circle-radius': ['step', ['get', 'point_count'], 20, 10, 25, 30, 30],
                },
            });

            map.current!.addLayer({
                id: 'cluster-count',
                type: 'symbol',
                source: 'locations-src',
                filter: ['has', 'point_count'],
                layout: {
                    'text-field': '{point_count_abbreviated}',
                    'text-font': ['Arial Unicode MS Bold', 'Open Sans Bold'],
                    'text-size': 14,
                },
                paint: { 'text-color': '#ffffff' }
            });

            map.current!.on('click', 'clusters', async (e) => {
                if (isAddingLocationRef.current) return;
                const features = map.current!.queryRenderedFeatures(e.point, { layers: ['clusters'] });
                const clusterId = features[0].properties.cluster_id;
                const source = map.current!.getSource('locations-src') as maplibregl.GeoJSONSource;
                const zoom = await source.getClusterExpansionZoom(clusterId);
                map.current!.easeTo({ center: (features[0].geometry as any).coordinates, zoom });
            });

            if (map.current?.getSource('openmaptiles')) {
                const layers = map.current.getStyle().layers;
                const labelLayerId = layers?.find((l) => l.type === 'symbol' && l.layout?.['text-field'])?.id;
                if (!map.current.getLayer('3d-buildings')) {
                    map.current.addLayer({
                        id: '3d-buildings',
                        source: 'openmaptiles',
                        'source-layer': 'building',
                        type: 'fill-extrusion',
                        minzoom: 14,
                        paint: {
                            'fill-extrusion-color': 'hsl(222, 30%, 20%)',
                            'fill-extrusion-height': ['get', 'render_height'],
                            'fill-extrusion-base': ['get', 'render_min_height'],
                            'fill-extrusion-opacity': 0.7,
                        },
                    }, labelLayerId);
                }
            }
        });
        const clusterId = features[0].properties.cluster_id;
        const source = map.current!.getSource(
          "locations-src",
        ) as maplibregl.GeoJSONSource;
        const zoom = await source.getClusterExpansionZoom(clusterId);
        map.current!.easeTo({
          center: (features[0].geometry as any).coordinates,
          zoom,
        });
      });

      if (map.current?.getSource("openmaptiles")) {
        const layers = map.current.getStyle().layers;
        const labelLayerId = layers?.find(
          (l) => l.type === "symbol" && l.layout?.["text-field"],
        )?.id;
        if (!map.current.getLayer("3d-buildings")) {
          map.current.addLayer(
            {
              id: "3d-buildings",
              source: "openmaptiles",
              "source-layer": "building",
              type: "fill-extrusion",
              minzoom: 14,
              paint: {
                "fill-extrusion-color": "hsl(222, 30%, 20%)",
                "fill-extrusion-height": ["get", "render_height"],
                "fill-extrusion-base": ["get", "render_min_height"],
                "fill-extrusion-opacity": 0.7,
              },
            },
            labelLayerId,
          );
        }
      }
    });

    map.current.on("click", (e) => {
      if (onMapClickRef.current && isAddingLocationRef.current) {
        onMapClickRef.current(e.lngLat.lng, e.lngLat.lat);
      }
    });

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, []);

  useEffect(() => {
    if (!map.current) return;
    map.current.getCanvas().style.cursor = isAddingLocation ? "crosshair" : "";
  }, [isAddingLocation]);

  useEffect(() => {
    if (!map.current || !isLoaded) return;

    const source = map.current.getSource(
      "locations-src",
    ) as maplibregl.GeoJSONSource;
    if (source) source.setData(locationsToGeoJSON(filteredLocations));

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    filteredLocations.forEach((location) => {
      const pixel = map.current!.project([
        location.longitude,
        location.latitude,
      ]);
      const features = map.current!.queryRenderedFeatures(pixel, {
        layers: ["clusters"],
      });
      if (features.length > 0) return;

      const el = document.createElement("div");
      el.innerHTML = `
                <div class="w-8 h-8 rounded-full bg-primary flex items-center justify-center shadow-glow cursor-pointer hover:scale-110 transition-transform">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-primary-foreground">
                    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
                    <circle cx="12" cy="10" r="3"/>
                  </svg>
                </div>
            `;

      el.onclick = (e) => {
        if (isAddingLocationRef.current) return;
        e.stopPropagation();
        popupRef.current?.remove();
        popupRef.current = new maplibregl.Popup({ offset: 25 })
          .setLngLat([location.longitude, location.latitude])
          .setHTML(
            `
                        <div class="p-4 min-w-[200px]">
                            <h3 class="font-semibold text-lg">${location.name}</h3>
                            ${location.description ?? ""}
                        </div>
                    `,
          )
          .addTo(map.current!);
      };

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([location.longitude, location.latitude])
        .addTo(map.current!);

      markersRef.current.push(marker);
    });
  }, [filteredLocations, isLoaded, mapMoveTick]);

  // ---- BUS ROUTE ----
  useEffect(() => {
    if (!map.current || !isLoaded) return;

    const showBusRoute = selectedServices.includes("bus");

    if (!showBusRoute) {
      // Hide all route layers
      for (let i = 0; i < 10; i++) {
        if (map.current.getLayer(`bus-route-line-${i}`)) {
          map.current.setLayoutProperty(
            `bus-route-line-${i}`,
            "visibility",
            "none",
          );
        }
        if (map.current.getLayer(`bus-route-label-${i}`)) {
          map.current.setLayoutProperty(
            `bus-route-label-${i}`,
            "visibility",
            "none",
          );
        }
        if (map.current.getLayer(`bus-route-stops-${i}`)) {
          map.current.setLayoutProperty(
            `bus-route-stops-${i}`,
            "visibility",
            "none",
          );
        }
      }
      return;
    }

    let isCancelled = false;

    const ensureBusIcon = () =>
      new Promise<void>((resolve) => {
        if (!map.current || map.current.hasImage(BUS_ICON_ID)) {
          resolve();
          return;
        }

        const img = new Image(24, 24);
        img.onload = () => {
          if (!map.current || map.current.hasImage(BUS_ICON_ID)) {
            resolve();
            return;
          }

          map.current.addImage(BUS_ICON_ID, img, { sdf: true });
          resolve();
        };
        img.onerror = () => resolve();
        img.src = BUS_ICON_SVG;
      });

    getBusRoute()
      .then((routes: BusRouteData[]) => {
        if (!map.current || isCancelled) return;

        // Process each route
        routes.forEach((routeData, index) => {
          const sourceId = `bus-route-${index}`;
          const stopsSourceId = `bus-route-stops-${index}`;
          const lineLayerId = `bus-route-line-${index}`;
          const labelLayerId = `bus-route-label-${index}`;
          const stopsLayerId = `bus-route-stops-${index}`;

          // Route line GeoJSON
          const routeGeojson: FeatureCollection<Geometry> = {
            type: "FeatureCollection",
            features: [
              {
                type: "Feature",
                properties: { name: routeData.name },
                geometry: {
                  type: "LineString",
                  coordinates: routeData.route,
                },
              },
            ],
          };

          // Stops GeoJSON
          const stopsGeojson: FeatureCollection<Geometry> = {
            type: "FeatureCollection",
            features: routeData.stops.map((stop) => ({
              type: "Feature",
              properties: { name: stop.name },
              geometry: {
                type: "Point",
                coordinates: stop.coordinates,
              },
            })),
          };

          // Add/update source for route line
          if (!map.current.getSource(sourceId)) {
            map.current.addSource(sourceId, {
              type: "geojson",
              data: routeGeojson,
            });
          } else {
            (
              map.current.getSource(sourceId) as maplibregl.GeoJSONSource
            ).setData(routeGeojson);
          }

          // Add/update route line layer
          if (!map.current.getLayer(lineLayerId)) {
            map.current.addLayer({
              id: lineLayerId,
              type: "line",
              source: sourceId,
              paint: {
                "line-color": routeData.color,
                "line-width": 4,
                "line-opacity": 0.8,
              },
            });
          } else {
            map.current.setPaintProperty(
              lineLayerId,
              "line-color",
              routeData.color,
            );
            map.current.setLayoutProperty(lineLayerId, "visibility", "visible");
          }

          // Add label for route (on the line)
          if (!map.current.getLayer(labelLayerId)) {
            map.current.addLayer({
              id: labelLayerId,
              type: "symbol",
              source: sourceId,
              layout: {
                "text-field": ["get", "name"],
                "text-size": 12,
                "text-font": ["Open Sans Semibold"],
                "symbol-placement": "line",
                "text-rotation-alignment": "map",
                "text-pitch-alignment": "viewport",
              },
              paint: {
                "text-color": "#ffffff",
                "text-halo-color": routeData.color,
                "text-halo-width": 2,
              },
            });
          } else {
            map.current.setLayoutProperty(
              labelLayerId,
              "visibility",
              "visible",
            );
          }

          // Add/update source for stops
          if (!map.current.getSource(stopsSourceId)) {
            map.current.addSource(stopsSourceId, {
              type: "geojson",
              data: stopsGeojson,
            });
          } else {
            (
              map.current.getSource(stopsSourceId) as maplibregl.GeoJSONSource
            ).setData(stopsGeojson);
          }
          // Add/update stops layer
          ensureBusIcon().then(() => {
            if (!map.current || isCancelled) return;

            const stopsLayer = map.current.getLayer(stopsLayerId);
            if (stopsLayer && stopsLayer.type !== "symbol") {
              map.current.removeLayer(stopsLayerId);
            }

            if (!map.current.getLayer(stopsLayerId)) {
              map.current.addLayer({
                id: stopsLayerId,
                type: "symbol",
                source: stopsSourceId,
                layout: {
                  "icon-image": BUS_ICON_ID,
                  "icon-size": 1,
                  "icon-allow-overlap": true,
                  "text-field": ["get", "name"],
                  "text-size": 11,
                  "text-offset": [0, 1.5],
                  "text-anchor": "top",
                  "text-font": ["Open Sans Regular"],
                },
                paint: {
                  "icon-color": routeData.color,
                  "icon-halo-color": "#0F2A2E",
                  "icon-halo-width": 1.5,
                  "text-color": "#ffffff",
                  "text-halo-color": "#0F2A2E",
                  "text-halo-width": 2,
                },
              });
            } else {
              map.current.setLayoutProperty(
                stopsLayerId,
                "visibility",
                "visible",
              );
            }
          });
        });

        // Fit bounds to all routes
        if (routes.length > 0 && routes[0].route.length > 1) {
          let allCoords: [number, number][] = [];
          routes.forEach((route) => {
            allCoords = allCoords.concat(route.route);
          });

          const first = allCoords[0];
          const bounds = allCoords.reduce(
            (b, coord) => b.extend(coord),
            new maplibregl.LngLatBounds(first, first),
          );

          map.current.fitBounds(bounds, {
            padding: 40,
            duration: 1200,
          });
        }
      })
      .catch((error) => {
        if (!isCancelled) {
          console.error("Failed to load bus routes", error);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [isLoaded, selectedServices]);

  // Live Locations Logic with Zoom Awareness
  useEffect(() => {
    if (!map.current || !isLoaded) return;

    // Hide live markers if zoomed out too far to keep clusters clean
    if (currentZoom < 4) {
      liveMarkersRef.current.forEach((marker) => marker.remove());
      liveMarkersRef.current.clear();
      return;
    }

    const ids = new Set(liveLocations.map((l) => l.user_id));
    liveMarkersRef.current.forEach((marker, id) => {
      if (!ids.has(id)) {
        marker.remove();
        liveMarkersRef.current.delete(id);
      }
    });

    liveLocations.forEach((loc) => {
      const existing = liveMarkersRef.current.get(loc.user_id);
      if (existing) {
        existing.setLngLat([loc.longitude, loc.latitude]);
      } else {
        const el = document.createElement("div");
        el.innerHTML = `<div class="w-6 h-6 rounded-full bg-primary border-2 border-background animate-pulse"></div>`;
        const marker = new maplibregl.Marker({ element: el })
          .setLngLat([loc.longitude, loc.latitude])
          .addTo(map.current!);
        liveMarkersRef.current.set(loc.user_id, marker);
      }
    });
  }, [liveLocations, isLoaded, currentZoom]);

  const handleSelectLocation = useCallback((loc: Location) => {
    if (!map.current) return;
    map.current.flyTo({
      center: [loc.longitude, loc.latitude],
      zoom: 15,
      duration: 1800,
      essential: true,
    });
    setTimeout(() => {
      popupRef.current?.remove();
      popupRef.current = new maplibregl.Popup({ offset: 25 })
        .setLngLat([loc.longitude, loc.latitude])
        .setHTML(
          `<div class="p-4 min-w-[200px]"><h3 class="font-semibold text-lg">${loc.name}</h3>${loc.description ?? ""}</div>`,
        )
        .addTo(map.current!);
    }, 600);
  }, []);

  const handleSelectGeocode = useCallback(
    (lng: number, lat: number, label: string, zoom?: number) => {
      if (!map.current) return;
      map.current.flyTo({
        center: [lng, lat],
        zoom: zoom ?? 15,
        duration: 1800,
        essential: true,
      });
      setTimeout(() => {
        popupRef.current?.remove();
        popupRef.current = new maplibregl.Popup({ offset: 25 })
          .setLngLat([lng, lat])
          .setHTML(
            `<div class="p-4 min-w-[220px]"><h3 class="font-semibold text-lg">${label}</h3><p class="text-xs text-muted-foreground mt-1">${lat.toFixed(5)}, ${lng.toFixed(5)}</p></div>`,
          )
          .addTo(map.current!);
      }, 600);
    },
    [],
  );

  return (
    <div className={cn("relative w-full h-full", className)}>
      <div ref={mapContainer} className="absolute inset-0" />
      <MapControls
        is3D={is3D}
        onToggle3D={() => setIs3D((v) => !v)}
        onResetView={() =>
          map.current?.flyTo({ center: [0, 20], zoom: 2, pitch: 0 })
        }
        locations={locations}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onSelectLocation={handleSelectLocation}
        selectedServices={selectedServices}
        onServiceToggle={toggleService}
        onClearFilters={handleClearFilters}
        onSelectGeocode={handleSelectGeocode}
      />
      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80">
          <span className="text-sm text-muted-foreground">Loading map…</span>
        </div>
      )}
    </div>
  );
    }, [liveLocations, isLoaded, currentZoom]);

    useEffect(() => {
        if (!map.current || !isLoaded) return;

        const center = map.current.getCenter();
        const requestId = tomtomRequestIdRef.current + 1;
        tomtomRequestIdRef.current = requestId;

        const timer = setTimeout(async () => {
            const result = await getSafetyIncidents(center.lat, center.lng);
            if (tomtomRequestIdRef.current !== requestId) return;

            if (!result || result.error || !Array.isArray(result.data)) {
                setTomtomZones([]);
                setTomtomIncidentCount(result?.incidentCount ?? 0);
                setTomtomError(result?.error ?? null);
                return;
            }

            const incidents = result.data.map((incident: any, index: number) => {
                const coords = incident?.geometry?.coordinates;
                let lng = center.lng;
                let lat = center.lat;

                if (Array.isArray(coords)) {
                    if (typeof coords[0] === 'number' && typeof coords[1] === 'number') {
                        lng = coords[0];
                        lat = coords[1];
                    } else if (Array.isArray(coords[0]) && typeof coords[0][0] === 'number') {
                        lng = coords[0][0];
                        lat = coords[0][1];
                    }
                }

                const title =
                    incident?.properties?.events?.[0]?.description ||
                    incident?.properties?.description ||
                    'Incident';

                return {
                    id: incident?.id?.toString() ?? `tomtom-${index}`,
                    title,
                    lat,
                    lng,
                };
            });

            const toMeters = (a: number, b: number, latBase: number) => {
                const dLat = (a - b) * 111320;
                return Math.abs(dLat);
            };

            const distanceMeters = (aLat: number, aLng: number, bLat: number, bLng: number) => {
                const dLat = (aLat - bLat) * 111320;
                const dLng = (aLng - bLng) * (111320 * Math.cos((aLat * Math.PI) / 180));
                return Math.sqrt(dLat * dLat + dLng * dLng);
            };

            const clusters: Array<{ lat: number; lng: number; titles: string[]; count: number }> = [];

            incidents.forEach((incident) => {
                let assigned = false;
                for (const cluster of clusters) {
                    if (distanceMeters(incident.lat, incident.lng, cluster.lat, cluster.lng) <= CLUSTER_DISTANCE_METERS) {
                        const total = cluster.count + 1;
                        cluster.lat = (cluster.lat * cluster.count + incident.lat) / total;
                        cluster.lng = (cluster.lng * cluster.count + incident.lng) / total;
                        cluster.count = total;
                        cluster.titles.push(incident.title);
                        assigned = true;
                        break;
                    }
                }
                if (!assigned) {
                    clusters.push({
                        lat: incident.lat,
                        lng: incident.lng,
                        count: 1,
                        titles: [incident.title],
                    });
                }
            });

            const zones: DangerZone[] = clusters.map((cluster, index) => {
                const severity: DangerZone['severity'] =
                    cluster.count >= 5 ? 'high' : cluster.count >= 3 ? 'medium' : 'low';
                const radius = Math.min(260, 140 + cluster.count * 20);
                return {
                    id: `cluster-${index}`,
                    title: cluster.titles[0] ?? 'Incident',
                    severity,
                    lat: cluster.lat,
                    lng: cluster.lng,
                    radius,
                };
            });

            setTomtomZones(zones);
            setTomtomIncidentCount(result?.incidentCount ?? incidents.length);
            setTomtomError(null);
        }, 400);

        return () => clearTimeout(timer);
    }, [mapMoveTick, isLoaded]);

    useEffect(() => {
        if (tomtomZones.length > 0) {
            setShowDangerAlert(true);
            setShowSeverityPopup(true);
        }
    }, [tomtomZones.length]);

    useEffect(() => {
        if (!map.current || !isLoaded) return;

        const mapInstance = map.current;

        if (!mapInstance.getSource(DANGER_ZONE_SOURCE_ID)) {
            mapInstance.addSource(DANGER_ZONE_SOURCE_ID, {
                type: 'geojson',
                data: dangerZonesGeoJson,
            });

            mapInstance.addLayer({
                id: DANGER_ZONE_FILL_ID,
                type: 'fill',
                source: DANGER_ZONE_SOURCE_ID,
                paint: {
                    'fill-color': [
                        'match',
                        ['get', 'severity'],
                        'high',
                        '#EF4444',
                        'medium',
                        '#F97316',
                        'low',
                        '#FACC15',
                        '#EF4444',
                    ],
                    'fill-opacity': 0.35,
                },
                layout: {
                    visibility: showDangerZones ? 'visible' : 'none',
                },
            });

            mapInstance.addLayer({
                id: DANGER_ZONE_OUTLINE_ID,
                type: 'line',
                source: DANGER_ZONE_SOURCE_ID,
                paint: {
                    'line-color': [
                        'match',
                        ['get', 'severity'],
                        'high',
                        '#EF4444',
                        'medium',
                        '#F97316',
                        'low',
                        '#FACC15',
                        '#EF4444',
                    ],
                    'line-width': 2.5,
                    'line-opacity': 0.35,
                },
                layout: {
                    visibility: showDangerZones ? 'visible' : 'none',
                },
            });
        } else {
            const source = mapInstance.getSource(DANGER_ZONE_SOURCE_ID) as maplibregl.GeoJSONSource;
            source.setData(dangerZonesGeoJson);
        }

        if (!mapInstance.getSource(DANGER_ROUTE_SOURCE_ID)) {
            mapInstance.addSource(DANGER_ROUTE_SOURCE_ID, {
                type: 'geojson',
                data: dangerRoutesGeoJson,
            });

            mapInstance.addLayer({
                id: DANGER_ROUTE_LINE_ID,
                type: 'line',
                source: DANGER_ROUTE_SOURCE_ID,
                paint: {
                    'line-color': '#B91C1C',
                    'line-width': 5,
                    'line-opacity': 1,
                },
                layout: {
                    visibility: showDangerZones ? 'visible' : 'none',
                },
            });
        }
    }, [dangerZonesGeoJson, dangerRoutesGeoJson, isLoaded, showDangerZones]);

    useEffect(() => {
        if (!map.current || !isLoaded) return;

        const visibility = showDangerZones ? 'visible' : 'none';
        if (map.current.getLayer(DANGER_ZONE_FILL_ID)) {
            map.current.setLayoutProperty(DANGER_ZONE_FILL_ID, 'visibility', visibility);
        }
        if (map.current.getLayer(DANGER_ZONE_OUTLINE_ID)) {
            map.current.setLayoutProperty(DANGER_ZONE_OUTLINE_ID, 'visibility', visibility);
        }
        if (map.current.getLayer(DANGER_ROUTE_LINE_ID)) {
            map.current.setLayoutProperty(DANGER_ROUTE_LINE_ID, 'visibility', visibility);
        }
    }, [showDangerZones, isLoaded]);

    const handleSelectLocation = useCallback((loc: Location) => {
        if (!map.current) return;
        map.current.flyTo({ center: [loc.longitude, loc.latitude], zoom: 15, duration: 1800, essential: true });
        setTimeout(() => {
            popupRef.current?.remove();
            popupRef.current = new maplibregl.Popup({ offset: 25 })
                .setLngLat([loc.longitude, loc.latitude])
                .setHTML(`<div class="p-4 min-w-[200px]"><h3 class="font-semibold text-lg">${loc.name}</h3>${loc.description ?? ''}</div>`)
                .addTo(map.current!);
        }, 600);
    }, []);

    const handleSelectGeocode = useCallback((lng: number, lat: number, label: string, zoom?: number) => {
        if (!map.current) return;
        map.current.flyTo({ center: [lng, lat], zoom: zoom ?? 15, duration: 1800, essential: true });
        setTimeout(() => {
            popupRef.current?.remove();
            popupRef.current = new maplibregl.Popup({ offset: 25 })
                .setLngLat([lng, lat])
                .setHTML(`<div class="p-4 min-w-[220px]"><h3 class="font-semibold text-lg">${label}</h3><p class="text-xs text-muted-foreground mt-1">${lat.toFixed(5)}, ${lng.toFixed(5)}</p></div>`)
                .addTo(map.current!);
        }, 600);
    }, []);

    return (
        <div className={cn('relative w-full h-full', className)}>
            <div ref={mapContainer} className="absolute inset-0" />
            <MapControls
                is3D={is3D}
                onToggle3D={() => setIs3D((v) => !v)}
                onResetView={() => map.current?.flyTo({ center: [0, 20], zoom: 2, pitch: 0 })}
                showDangerZones={showDangerZones}
                onToggleDangerZones={() => setShowDangerZones((prev) => !prev)}
                locations={locations}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                onSelectLocation={handleSelectLocation}
                selectedServices={selectedServices}
                onServiceToggle={toggleService}
                onClearFilters={handleClearFilters}
                onSelectGeocode={handleSelectGeocode}
            />
            <div className="absolute left-4 top-4 z-20 rounded-lg bg-black/70 text-white text-xs px-3 py-2 space-y-1">
                <div className="font-semibold">TomTom Debug</div>
                <div>Incidents: {tomtomIncidentCount}</div>
                <div>Zones: {tomtomZones.length}</div>
                <div>Risk: {riskLevel}</div>
                <div>Show Zones: {showDangerZones ? 'on' : 'off'}</div>
                <div>API Key: {import.meta.env.VITE_TOMTOM_API_KEY ? 'set' : 'missing'}</div>
                {tomtomError && <div className="text-red-200">Error: {tomtomError}</div>}
                <div className="pt-1 flex gap-1">
                    <button
                        className="px-2 py-1 rounded bg-white/10 hover:bg-white/20"
                        onClick={() => map.current?.flyTo({ center: [-73.9855, 40.758], zoom: 13 })}
                    >
                        NYC
                    </button>
                    <button
                        className="px-2 py-1 rounded bg-white/10 hover:bg-white/20"
                        onClick={() => map.current?.flyTo({ center: [-118.2437, 34.0522], zoom: 13 })}
                    >
                        LA
                    </button>
                    <button
                        className="px-2 py-1 rounded bg-white/10 hover:bg-white/20"
                        onClick={() => map.current?.flyTo({ center: [-0.1276, 51.5072], zoom: 13 })}
                    >
                        London
                    </button>
                </div>
            </div>
            {tomtomZones.length > 0 && showDangerAlert && (
                <DangerAlertPopup
                    status="danger"
                    title="Danger Nearby"
                    message={`${tomtomZones.length} incident${tomtomZones.length === 1 ? '' : 's'} reported near this area.`}
                    onDismiss={() => setShowDangerAlert(false)}
                    offsetBottom={16}
                />
            )}
            {tomtomZones.length > 0 && riskLevel !== 'safe' && showSeverityPopup && (
                <DangerSeverityPopup
                    level={riskLevel}
                    onDismiss={() => setShowSeverityPopup(false)}
                    offsetBottom={88}
                />
            )}
            {!isLoaded && (
                <div className="absolute inset-0 flex items-center justify-center bg-background/80">
                    <span className="text-sm text-muted-foreground">Loading map...</span>
                </div>
            )}
        </div>
    );
}
