import { useEffect, useRef, useCallback, useState, useMemo } from "react";
import maplibregl from "maplibre-gl";
import type { FeatureCollection, Geometry } from "geojson";
import "maplibre-gl/dist/maplibre-gl.css";
import { Location } from "@/hooks/useLocations";
import { LiveLocation } from "@/hooks/useLiveLocations";
import { MapControls } from "./MapControls";
import { cn } from "@/lib/utils";
import { getBusRoute, type BusRouteData } from "@/lib/busRoute";
import { readCache, writeCache } from "@/lib/localCache";
import { warmupGlobalMapCache } from "@/lib/mapCacheWarmup";

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

// ✅ FlyTo event name (used by sidebar)
const FLY_EVENT = "findr:flyto";
const MAP_VIEW_CACHE_KEY = "map:view";
const MAP_FILTERS_CACHE_KEY = "map:filters";
const MAP_SEARCH_CACHE_KEY = "map:search";
const MAP_3D_CACHE_KEY = "map:is3d";
type FlyDetail = {
  lng: number;
  lat: number;
  label?: string;
  zoom?: number;
  html?: string;
};

type CachedMapView = {
  center: [number, number];
  zoom: number;
  pitch: number;
  bearing: number;
};

type CachedMapFilters = {
  selectedServices: string[];
};

function locationsToGeoJSON(
  locations: Location[],
): GeoJSON.FeatureCollection<GeoJSON.Point> {
  return {
    type: "FeatureCollection",
    features: locations.map((loc) => ({
      type: "Feature",
      properties: { id: loc.id, name: loc.name, description: loc.description },
      geometry: { type: "Point", coordinates: [loc.longitude, loc.latitude] },
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
  const [is3D, setIs3D] = useState(() => readCache<boolean>(MAP_3D_CACHE_KEY) ?? true);
  const [searchQuery, setSearchQuery] = useState(() => readCache<string>(MAP_SEARCH_CACHE_KEY) ?? "");
  const [selectedServices, setSelectedServices] = useState<string[]>(
    () => readCache<CachedMapFilters>(MAP_FILTERS_CACHE_KEY)?.selectedServices ?? [],
  );
  const [mapMoveTick, setMapMoveTick] = useState(0);
  const [currentZoom, setCurrentZoom] = useState(2);
  const cachedMapViewRef = useRef<CachedMapView | null>(readCache<CachedMapView>(MAP_VIEW_CACHE_KEY));
  const hasStartedWarmupRef = useRef(false);

  // ✅ Single FlyTo helper used by BOTH map clicks + sidebar clicks
  const flyTo = useCallback(
    (
      lng: number,
      lat: number,
      label?: string,
      zoom?: number,
      html?: string,
    ) => {
      if (!map.current) return;

      map.current.flyTo({
        center: [lng, lat],
        zoom: zoom ?? 15,
        duration: 1200,
        essential: true,
      });

      // show popup after movement starts
      setTimeout(() => {
        popupRef.current?.remove();
        popupRef.current = new maplibregl.Popup({ offset: 25 })
          .setLngLat([lng, lat])
          .setHTML(
            html ??
              `<div class="p-4 min-w-[220px]">
                <h3 class="font-semibold text-lg">${label ?? "Location"}</h3>
                <p class="text-xs text-muted-foreground mt-1">${lat.toFixed(5)}, ${lng.toFixed(5)}</p>
              </div>`,
          )
          .addTo(map.current!);
      }, 450);
    },
    [],
  );

  // ✅ Listen for sidebar fly events
  useEffect(() => {
    const handler = (ev: Event) => {
      const e = ev as CustomEvent<FlyDetail>;
      if (!e.detail) return;
      flyTo(
        e.detail.lng,
        e.detail.lat,
        e.detail.label,
        e.detail.zoom,
        e.detail.html,
      );
    };

    window.addEventListener(FLY_EVENT, handler as EventListener);
    return () =>
      window.removeEventListener(FLY_EVENT, handler as EventListener);
  }, [flyTo]);

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
      // NOTE: bus is handled separately in your bus route effect
    };
    return (keywords[service] || []).some((k) => text.includes(k));
  };

  const filteredLocations = useMemo(() => {
    let res = locations;
    if (selectedServices.length > 0) {
      res = res.filter((l) =>
        selectedServices.some((s) => {
          if (s === "parks" || s === "roads" || s === "bus") return false;
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
    writeCache<boolean>(MAP_3D_CACHE_KEY, is3D);
  }, [is3D]);

  useEffect(() => {
    writeCache<string>(MAP_SEARCH_CACHE_KEY, searchQuery);
  }, [searchQuery]);

  useEffect(() => {
    writeCache<CachedMapFilters>(MAP_FILTERS_CACHE_KEY, { selectedServices });
  }, [selectedServices]);

  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    const style = MAPTILER_API_KEY
      ? `https://api.maptiler.com/maps/019c4c3d-7d0d-7f17-8117-945aa1848fdb/style.json?key=${MAPTILER_API_KEY}`
      : "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";

    const cachedMapView = cachedMapViewRef.current;

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style,
      center: cachedMapView?.center ?? [0, 20],
      zoom: cachedMapView?.zoom ?? 2,
      pitch: cachedMapView?.pitch ?? 45,
      bearing: cachedMapView?.bearing ?? 0,
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
      if (!map.current) return;

      setCurrentZoom(map.current.getZoom());
      writeCache<CachedMapView>(MAP_VIEW_CACHE_KEY, {
        center: [map.current.getCenter().lng, map.current.getCenter().lat],
        zoom: map.current.getZoom(),
        pitch: map.current.getPitch(),
        bearing: map.current.getBearing(),
      });
    });

    map.current.on("load", () => {
      setIsLoaded(true);

      map.current!.addSource("locations-src", {
        type: "geojson",
        data: locationsToGeoJSON([]),
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

    map.current.easeTo({
      pitch: is3D ? 45 : 0,
      duration: 500,
    });
  }, [is3D]);

  useEffect(() => {
    if (!isLoaded || hasStartedWarmupRef.current || !MAPTILER_API_KEY) return;
    hasStartedWarmupRef.current = true;

    const warmupZoom = Number(import.meta.env.VITE_MAP_OFFLINE_MAX_ZOOM ?? 8);
    const warmupBatchSize = Number(import.meta.env.VITE_MAP_OFFLINE_BATCH_SIZE ?? 20);
    const warmupEstimatedReqPerSec = Number(import.meta.env.VITE_MAP_OFFLINE_EST_REQ_PER_SEC ?? 50);
    const styleUrl = `https://api.maptiler.com/maps/019c4c3d-7d0d-7f17-8117-945aa1848fdb/style.json?key=${MAPTILER_API_KEY}`;

    warmupGlobalMapCache(
      styleUrl,
      Number.isFinite(warmupZoom) ? warmupZoom : 8,
      Number.isFinite(warmupBatchSize) ? warmupBatchSize : 20,
      Number.isFinite(warmupEstimatedReqPerSec) ? warmupEstimatedReqPerSec : 50,
    ).catch((error) => {
      console.error("Map cache warmup failed", error);
    });
  }, [isLoaded]);

  useEffect(() => {
    if (!map.current) return;
    map.current.getCanvas().style.cursor = isAddingLocation ? "crosshair" : "";
  }, [isAddingLocation]);

  // markers (DB saved locations) — ✅ now flyTo on click
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

        // ✅ Fly to the clicked DB pin + popup
        flyTo(
          location.longitude,
          location.latitude,
          location.name,
          15,
          `<div class="p-4 min-w-[200px]">
            <h3 class="font-semibold text-lg">${location.name}</h3>
            ${location.description ?? ""}
          </div>`,
        );
      };

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([location.longitude, location.latitude])
        .addTo(map.current!);

      markersRef.current.push(marker);
    });
  }, [filteredLocations, isLoaded, mapMoveTick, flyTo]);

  // ---- BUS ROUTE ---- (your code unchanged)
  useEffect(() => {
    if (!map.current || !isLoaded) return;

    const showBusRoute = selectedServices.includes("bus");

    if (!showBusRoute) {
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

        routes.forEach((routeData, index) => {
          const sourceId = `bus-route-${index}`;
          const stopsSourceId = `bus-route-stops-${index}`;
          const lineLayerId = `bus-route-line-${index}`;
          const labelLayerId = `bus-route-label-${index}`;
          const stopsLayerId = `bus-route-stops-${index}`;

          const routeGeojson: FeatureCollection<Geometry> = {
            type: "FeatureCollection",
            features: [
              {
                type: "Feature",
                properties: { name: routeData.name },
                geometry: { type: "LineString", coordinates: routeData.route },
              },
            ],
          };

          const stopsGeojson: FeatureCollection<Geometry> = {
            type: "FeatureCollection",
            features: routeData.stops.map((stop) => ({
              type: "Feature",
              properties: { name: stop.name },
              geometry: { type: "Point", coordinates: stop.coordinates },
            })),
          };

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
      })
      .catch((error) => console.error("Failed to load bus routes", error));

    return () => {
      isCancelled = true;
    };
  }, [isLoaded, selectedServices]);

  // Live Locations with Zoom awareness
  useEffect(() => {
    if (!map.current || !isLoaded) return;

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

  const handleSelectLocation = useCallback(
    (loc: Location) => {
      flyTo(
        loc.longitude,
        loc.latitude,
        loc.name,
        15,
        `
        <div class="p-4 min-w-[200px]">
          <h3 class="font-semibold text-lg">${loc.name}</h3>
          ${loc.description ?? ""}
        </div>
      `,
      );
    },
    [flyTo],
  );

  const handleSelectGeocode = useCallback(
    (lng: number, lat: number, label: string, zoom?: number) => {
      flyTo(lng, lat, label, zoom ?? 15);
    },
    [flyTo],
  );

  // ✅ full screen map + centered MapControls (from your last request)
  return (
    <div className={cn("fixed inset-0 w-screen h-screen", className)}>
      <div ref={mapContainer} className="absolute inset-0" />

      <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center">
        <div className="pointer-events-auto">
          <MapControls
            is3D={is3D}
            onToggle3D={() => setIs3D((v) => !v)}
            onResetView={() => {
              if (!map.current) return;
              map.current.flyTo({ center: [0, 20], zoom: 2, pitch: 0, bearing: 0 });
              writeCache<CachedMapView>(MAP_VIEW_CACHE_KEY, {
                center: [0, 20],
                zoom: 2,
                pitch: 0,
                bearing: 0,
              });
            }}
            locations={locations}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            onSelectLocation={handleSelectLocation}
            selectedServices={selectedServices}
            onServiceToggle={toggleService}
            onClearFilters={handleClearFilters}
            onSelectGeocode={handleSelectGeocode}
          />
        </div>
      </div>

      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80">
          <span className="text-sm text-muted-foreground">Loading map…</span>
        </div>
      )}
    </div>
  );
}
