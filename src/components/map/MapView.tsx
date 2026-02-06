import { useEffect, useRef, useCallback, useState, useMemo } from "react";
import maplibregl from "maplibre-gl";
import type { FeatureCollection, Geometry } from "geojson";
import "maplibre-gl/dist/maplibre-gl.css";
import { Location } from "@/hooks/useLocations";
import { LiveLocation } from "@/hooks/useLiveLocations";
import { MapControls } from "./MapControls";
import { cn } from "@/lib/utils";
import { getBusRoute } from "@/lib/busRoute";

interface MapViewProps {
  locations: Location[];
  liveLocations: LiveLocation[];
  onMapClick?: (lng: number, lat: number) => void;
  isAddingLocation?: boolean;
  className?: string;
}

const MAPTILER_API_KEY = import.meta.env.VITE_MAPTILER_API_KEY as string;
const BUS_ICON_ID = "bus-stop";
const BUS_ICON_SVG =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 2h10a2 2 0 0 1 2 2v11a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3V4a2 2 0 0 1 2-2Z"/><path d="M5 12h14"/><path d="M7 6h10"/><circle cx="8.5" cy="16.5" r="1.5"/><circle cx="15.5" cy="16.5" r="1.5"/></svg>`,
  );

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

  // ✅ NEW: clear filters handler (this is the "where would this be")
  const handleClearFilters = useCallback(() => {
    setSelectedServices([]);
  }, []);

  // ---- service matching ----
  const matchesService = (loc: Location, service: string) => {
    const text = (loc.name + " " + (loc.description || "")).toLowerCase();

    const keywords: Record<string, string[]> = {
      // ✅ requested types
      clinic: [
        "clinic",
        "medical",
        "health",
        "doctor",
        "hospital",
        "er",
        "emergency",
      ],
      library: ["library"],
      shelter: [
        "shelter",
        "homeless",
        "safe house",
        "refuge",
        "refugee",
        "crisis",
      ],

      // keep your existing ones
      hospitals: ["hospital", "clinic", "medical", "health", "emergency"],
      police: ["police", "precinct", "station"],
      restaurants: ["restaurant", "cafe", "café", "diner", "bistro", "eatery"],

      // coming soon
      parks: ["park", "garden"],
      roads: ["road", "street", "rd", "st"],
    };

    return (keywords[service] || []).some((k) => text.includes(k));
  };

  // ---- filtering ----
  const filteredLocations = useMemo(() => {
    let res = locations;

    if (selectedServices.length > 0) {
      res = res.filter((l) =>
        selectedServices.some((s) => {
          // keep your “coming soon” exclusion
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

  useEffect(() => {
    onMapClickRef.current = onMapClick;
    isAddingLocationRef.current = isAddingLocation;
  }, [onMapClick, isAddingLocation]);

  // ---- MAP INIT ----
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    const style = MAPTILER_API_KEY
      ? `https://api.maptiler.com/maps/019c1e96-0cd8-7758-8b57-e13f87a1269d/style.json?key=${MAPTILER_API_KEY}`
      : "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style,
      center: [0, 20],
      zoom: 2,
      pitch: 45,
      bearing: 0,
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

    map.current.on("load", () => {
      setIsLoaded(true);

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

  // ---- BUS ROUTE ----
  useEffect(() => {
    if (!map.current || !isLoaded) return;

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
      .then(({ route, stops }) => {
        if (!map.current || isCancelled) return;

        const routeGeojson: FeatureCollection<Geometry> = {
          type: "FeatureCollection",
          features: [
            {
              type: "Feature",
              properties: {},
              geometry: {
                type: "LineString",
                coordinates: route,
              },
            },
          ],
        };

        const stopsGeojson: FeatureCollection<Geometry> = {
          type: "FeatureCollection",
          features: stops.map((coordinates) => ({
            type: "Feature",
            properties: {},
            geometry: {
              type: "Point",
              coordinates,
            },
          })),
        };

        if (!map.current.getSource("bus-route")) {
          map.current.addSource("bus-route", {
            type: "geojson",
            data: routeGeojson,
          });
        } else {
          (
            map.current.getSource("bus-route") as maplibregl.GeoJSONSource
          ).setData(routeGeojson);
        }

        if (!map.current.getLayer("bus-route-line")) {
          map.current.addLayer({
            id: "bus-route-line",
            type: "line",
            source: "bus-route",
            paint: {
              "line-color": "#F97316",
              "line-width": 4,
              "line-opacity": 0.9,
            },
          });
        }

        if (!map.current.getSource("bus-route-stops")) {
          map.current.addSource("bus-route-stops", {
            type: "geojson",
            data: stopsGeojson,
          });
        } else {
          (
            map.current.getSource("bus-route-stops") as maplibregl.GeoJSONSource
          ).setData(stopsGeojson);
        }

        ensureBusIcon().then(() => {
          if (!map.current || isCancelled) return;

          const stopsLayer = map.current.getLayer("bus-route-stops");
          if (stopsLayer && stopsLayer.type !== "symbol") {
            map.current.removeLayer("bus-route-stops");
          }

          if (!map.current.getLayer("bus-route-stops")) {
            map.current.addLayer({
              id: "bus-route-stops",
              type: "symbol",
              source: "bus-route-stops",
              layout: {
                "icon-image": BUS_ICON_ID,
                "icon-size": 1,
                "icon-allow-overlap": true,
              },
              paint: {
                "icon-color": "#fafafa",
                "icon-halo-color": "#0F2A2E",
                "icon-halo-width": 1.5,
              },
            });
          }
        });

        if (route.length > 1) {
          const first = route[0] as [number, number];
          const bounds = route.reduce(
            (b, coord) => b.extend(coord as [number, number]),
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
          console.error("Failed to load bus route", error);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [isLoaded]);

  // ---- LOCATION MARKERS ----
  useEffect(() => {
    if (!map.current || !isLoaded) return;

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    filteredLocations.forEach((location) => {
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
  }, [filteredLocations, isLoaded]);

  // ---- LIVE MARKERS ----
  useEffect(() => {
    if (!map.current || !isLoaded) return;

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
        el.innerHTML = `
          <div class="w-6 h-6 rounded-full bg-primary border-2 border-background animate-pulse"></div>
        `;

        const marker = new maplibregl.Marker({ element: el })
          .setLngLat([loc.longitude, loc.latitude])
          .addTo(map.current!);

        liveMarkersRef.current.set(loc.user_id, marker);
      }
    });
  }, [liveLocations, isLoaded]);

  // ---- SEARCH SELECT HANDLER ----
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
          `
          <div class="p-4 min-w-[200px]">
            <h3 class="font-semibold text-lg">${loc.name}</h3>
            ${loc.description ?? ""}
          </div>
        `,
        )
        .addTo(map.current!);
    }, 600);
  }, []);

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
        selectedServices={selectedServices}
        onServiceToggle={toggleService}
        onClearFilters={handleClearFilters} // ✅ NEW
        onSelectLocation={handleSelectLocation}
      />

      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80">
          <span className="text-sm text-muted-foreground">Loading map…</span>
        </div>
      )}
    </div>
  );
}
