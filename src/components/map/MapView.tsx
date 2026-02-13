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
}

const MAPTILER_API_KEY = import.meta.env.VITE_MAPTILER_API_KEY as string;

const BUS_ICON_ID = "bus-stop";
const BUS_ICON_SVG =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 2h10a2 2 0 0 1 2 2v11a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3V4a2 2 0 0 1 2-2Z"/><path d="M5 12h14"/><path d="M7 6h10"/><circle cx="8.5" cy="16.5" r="1.5"/><circle cx="15.5" cy="16.5" r="1.5"/></svg>`,
  );

// Events
const FLY_EVENT = "findr:flyto";
type FlyDetail = {
  lng: number;
  lat: number;
  label?: string;
  zoom?: number;
  html?: string;
};

const LAYERS_EVENT = "findr:layers";
type LayersDetail = {
  savedPins?: boolean;
  suggestedPins?: boolean;
  busStops?: boolean;
  busRoutes?: boolean;
  livePeople?: boolean;

  // new UI toggles:
  traffic?: boolean;
  transit?: boolean;
  biking?: boolean;
  base?: "satellite" | "terrain";
};

/**
 * ✅ SOUTH AFRICA bounds (approx)
 * [[westLng, southLat], [eastLng, northLat]]
 */
const SOUTH_AFRICA_BOUNDS: maplibregl.LngLatBoundsLike = [
  [16.3, -35.2],
  [33.1, -22.0],
];

// Start in Cape Town
const CT_CENTER: [number, number] = [18.4241, -33.9249];
const CT_ZOOM = 10;

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}
function clampToBounds(
  lng: number,
  lat: number,
  boundsLike: maplibregl.LngLatBoundsLike,
) {
  const b = maplibregl.LngLatBounds.convert(boundsLike);
  return {
    lng: clamp(lng, b.getWest(), b.getEast()),
    lat: clamp(lat, b.getSouth(), b.getNorth()),
  };
}

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

// Best-effort: toggle existing style layers by matching ids
function setMatchingLayersVisibility(
  map: maplibregl.Map,
  patterns: RegExp[],
  visible: boolean,
) {
  const style = map.getStyle();
  const layers = style?.layers ?? [];
  for (const l of layers) {
    if (!l?.id) continue;
    if (patterns.some((r) => r.test(l.id))) {
      if (map.getLayer(l.id)) {
        map.setLayoutProperty(l.id, "visibility", visible ? "visible" : "none");
      }
    }
  }
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
  const [currentZoom, setCurrentZoom] = useState(CT_ZOOM);

  // ✅ all toggles from sidebar
  const [layers, setLayers] = useState<Required<LayersDetail>>({
    savedPins: true,
    suggestedPins: true,
    busStops: true,
    busRoutes: true,
    livePeople: true,

    traffic: false,
    transit: false,
    biking: false,
    base: "terrain",
  });

  const flyTo = useCallback(
    (
      lng: number,
      lat: number,
      label?: string,
      zoom?: number,
      html?: string,
    ) => {
      if (!map.current) return;
      const clamped = clampToBounds(lng, lat, SOUTH_AFRICA_BOUNDS);

      map.current.flyTo({
        center: [clamped.lng, clamped.lat],
        zoom: zoom ?? 15,
        duration: 1200,
        essential: true,
      });

      setTimeout(() => {
        popupRef.current?.remove();
        popupRef.current = new maplibregl.Popup({ offset: 25 })
          .setLngLat([clamped.lng, clamped.lat])
          .setHTML(
            html ??
              `<div class="p-4 min-w-[220px]">
              <h3 class="font-semibold text-lg">${label ?? "Location"}</h3>
              <p class="text-xs text-muted-foreground mt-1">${clamped.lat.toFixed(5)}, ${clamped.lng.toFixed(5)}</p>
            </div>`,
          )
          .addTo(map.current!);
      }, 450);
    },
    [],
  );

  // fly events
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

  // layers events
  useEffect(() => {
    const handler = (ev: Event) => {
      const e = ev as CustomEvent<LayersDetail>;
      if (!e.detail) return;

      setLayers((prev) => ({
        savedPins: e.detail.savedPins ?? prev.savedPins,
        suggestedPins: e.detail.suggestedPins ?? prev.suggestedPins,
        busStops: e.detail.busStops ?? prev.busStops,
        busRoutes: e.detail.busRoutes ?? prev.busRoutes,
        livePeople: e.detail.livePeople ?? prev.livePeople,

        traffic: e.detail.traffic ?? prev.traffic,
        transit: e.detail.transit ?? prev.transit,
        biking: e.detail.biking ?? prev.biking,
        base: e.detail.base ?? prev.base,
      }));
    };

    window.addEventListener(LAYERS_EVENT, handler as EventListener);
    return () =>
      window.removeEventListener(LAYERS_EVENT, handler as EventListener);
  }, []);

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

  // init map
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    const terrainStyle = MAPTILER_API_KEY
      ? `https://api.maptiler.com/maps/019c4c3d-7d0d-7f17-8117-945aa1848fdb/style.json?key=${MAPTILER_API_KEY}`
      : "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: terrainStyle,
      center: CT_CENTER,
      zoom: CT_ZOOM,
      pitch: 45,
      maxPitch: 85,

      // ✅ South Africa only
      maxBounds: SOUTH_AFRICA_BOUNDS,
      renderWorldCopies: false,

      // ✅ prevent zooming out to the world (minZoom roughly shows whole SA)
      minZoom: 4.8,
      maxZoom: 18,
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
    });

    map.current.on("click", (e) => {
      if (onMapClickRef.current && isAddingLocationRef.current) {
        const c = clampToBounds(
          e.lngLat.lng,
          e.lngLat.lat,
          SOUTH_AFRICA_BOUNDS,
        );
        onMapClickRef.current(c.lng, c.lat);
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

  /* ---------- Make “Traffic / Transit / Biking” buttons actually toggle stuff ---------- */

  useEffect(() => {
    if (!map.current || !isLoaded) return;

    // Best effort matches for common style ids
    // (These depend on the map style you’re using.)
    setMatchingLayersVisibility(
      map.current,
      [/traffic/i, /congestion/i],
      layers.traffic,
    );
    setMatchingLayersVisibility(
      map.current,
      [/bicycle/i, /bike/i, /cycling/i],
      layers.biking,
    );

    // Transit “rail / train” best effort:
    // 1) show/hide any existing rail layers
    setMatchingLayersVisibility(
      map.current,
      [/rail/i, /railway/i, /subway/i, /tram/i, /transit/i],
      layers.transit,
    );

    // 2) add our own rail overlay if OpenMapTiles transportation exists
    const railLayerId = "findr-rail-overlay";
    const hasOpenMapTiles = !!map.current.getSource("openmaptiles");

    if (layers.transit && hasOpenMapTiles) {
      if (!map.current.getLayer(railLayerId)) {
        // Try to draw rail lines from OpenMapTiles transportation layer
        try {
          map.current.addLayer({
            id: railLayerId,
            type: "line",
            source: "openmaptiles",
            "source-layer": "transportation",
            filter: [
              "any",
              ["==", ["get", "class"], "rail"],
              ["==", ["get", "class"], "railway"],
              ["==", ["get", "class"], "subway"],
              ["==", ["get", "class"], "tram"],
            ],
            paint: {
              "line-color": "#ffffff",
              "line-width": 2.5,
              "line-opacity": 0.85,
            },
          } as any);
        } catch {
          // If the style doesn't have that source-layer, nothing to do.
        }
      } else {
        map.current.setLayoutProperty(railLayerId, "visibility", "visible");
      }
    } else {
      if (map.current.getLayer(railLayerId)) {
        map.current.setLayoutProperty(railLayerId, "visibility", "none");
      }
    }
  }, [layers.traffic, layers.transit, layers.biking, isLoaded]);

  /* ---------- saved pins (markers + clusters) ---------- */

  useEffect(() => {
    if (!map.current || !isLoaded) return;

    if (map.current.getLayer("clusters")) {
      map.current.setLayoutProperty(
        "clusters",
        "visibility",
        layers.savedPins ? "visible" : "none",
      );
    }
    if (map.current.getLayer("cluster-count")) {
      map.current.setLayoutProperty(
        "cluster-count",
        "visibility",
        layers.savedPins ? "visible" : "none",
      );
    }

    const source = map.current.getSource(
      "locations-src",
    ) as maplibregl.GeoJSONSource;
    if (source) source.setData(locationsToGeoJSON(filteredLocations));

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    if (!layers.savedPins) return;

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
  }, [filteredLocations, isLoaded, mapMoveTick, flyTo, layers.savedPins]);

  /* ---------- BUS ROUTE (uses your existing getBusRoute) ---------- */

  useEffect(() => {
    if (!map.current || !isLoaded) return;

    const showBusRoute =
      selectedServices.includes("bus") && layers.busRoutes === true;

    if (!showBusRoute) {
      for (let i = 0; i < 10; i++) {
        if (map.current.getLayer(`bus-route-line-${i}`))
          map.current.setLayoutProperty(
            `bus-route-line-${i}`,
            "visibility",
            "none",
          );
        if (map.current.getLayer(`bus-route-label-${i}`))
          map.current.setLayoutProperty(
            `bus-route-label-${i}`,
            "visibility",
            "none",
          );
        if (map.current.getLayer(`bus-route-stops-${i}`))
          map.current.setLayoutProperty(
            `bus-route-stops-${i}`,
            "visibility",
            "none",
          );
      }
      return;
    }

    let isCancelled = false;

    const ensureBusIcon = () =>
      new Promise<void>((resolve) => {
        if (!map.current || map.current.hasImage(BUS_ICON_ID)) return resolve();
        const img = new Image(24, 24);
        img.onload = () => {
          if (!map.current || map.current.hasImage(BUS_ICON_ID))
            return resolve();
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

          if (!map.current!.getSource(sourceId))
            map.current!.addSource(sourceId, {
              type: "geojson",
              data: routeGeojson,
            });
          else
            (
              map.current!.getSource(sourceId) as maplibregl.GeoJSONSource
            ).setData(routeGeojson);

          if (!map.current!.getLayer(lineLayerId)) {
            map.current!.addLayer({
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
            map.current!.setPaintProperty(
              lineLayerId,
              "line-color",
              routeData.color,
            );
            map.current!.setLayoutProperty(
              lineLayerId,
              "visibility",
              "visible",
            );
          }

          if (!map.current!.getLayer(labelLayerId)) {
            map.current!.addLayer({
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
            map.current!.setLayoutProperty(
              labelLayerId,
              "visibility",
              "visible",
            );
          }

          if (!map.current!.getSource(stopsSourceId))
            map.current!.addSource(stopsSourceId, {
              type: "geojson",
              data: stopsGeojson,
            });
          else
            (
              map.current!.getSource(stopsSourceId) as maplibregl.GeoJSONSource
            ).setData(stopsGeojson);

          ensureBusIcon().then(() => {
            if (!map.current || isCancelled) return;

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
            }

            map.current.setLayoutProperty(
              stopsLayerId,
              "visibility",
              layers.busStops ? "visible" : "none",
            );
          });
        });
      })
      .catch((error) => console.error("Failed to load bus routes", error));

    return () => {
      isCancelled = true;
    };
  }, [isLoaded, selectedServices, layers.busRoutes, layers.busStops]);

  /* ---------- Live people ---------- */

  useEffect(() => {
    if (!map.current || !isLoaded) return;

    if (!layers.livePeople) {
      liveMarkersRef.current.forEach((marker) => marker.remove());
      liveMarkersRef.current.clear();
      return;
    }

    // keep your zoom rule
    if (currentZoom < 6) {
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
  }, [liveLocations, isLoaded, currentZoom, layers.livePeople]);

  const handleSelectLocation = useCallback(
    (loc: Location) => {
      flyTo(
        loc.longitude,
        loc.latitude,
        loc.name,
        15,
        `<div class="p-4 min-w-[200px]">
          <h3 class="font-semibold text-lg">${loc.name}</h3>
          ${loc.description ?? ""}
        </div>`,
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

  return (
    <div className={cn("fixed inset-0 w-screen h-screen", className)}>
      <div ref={mapContainer} className="absolute inset-0" />

      <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center">
        <div className="pointer-events-auto">
          <MapControls
            is3D={is3D}
            onToggle3D={() => setIs3D((v) => !v)}
            onResetView={() =>
              map.current?.fitBounds(SOUTH_AFRICA_BOUNDS, {
                padding: 40,
                duration: 900,
                pitch: 0,
              })
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
