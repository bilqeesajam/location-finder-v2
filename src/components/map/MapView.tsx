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

function locationsToGeoJSON(locations: Location[]): GeoJSON.FeatureCollection<GeoJSON.Point> {
    return {
        type: 'FeatureCollection',
        features: locations.map((loc) => ({
            type: 'Feature',
            properties: { 
                id: loc.id, 
                name: loc.name, 
                description: loc.description 
            },
            geometry: { 
                type: 'Point', 
                coordinates: [loc.longitude, loc.latitude] 
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
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedServices, setSelectedServices] = useState<string[]>([]);
    const [mapMoveTick, setMapMoveTick] = useState(0); 
    const [currentZoom, setCurrentZoom] = useState(2); // Track zoom for live markers

    const matchesService = (loc: Location, service: string) => {
        const text = (loc.name + ' ' + (loc.description || '')).toLowerCase();
        const keywords: Record<string, string[]> = {
            hospitals: ['hospital', 'clinic', 'medical', 'health', 'emergency'],
            police: ['police', 'precinct', 'station'],
            library: ['library'],
            restaurants: ['restaurant', 'cafe', 'café', 'diner', 'bistro', 'eatery'],
            clinic: ['clinic'],
            shelter: ['shelter'],
            parks: ['park', 'garden'],
            roads: ['road', 'street', 'rd', 'st'],
        };
        return (keywords[service] || []).some((k) => text.includes(k));
    };

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

        map.current.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'top-right');
        map.current.addControl(new maplibregl.ScaleControl({ maxWidth: 100, unit: 'metric' }), 'bottom-left');
        map.current.addControl(new maplibregl.GeolocateControl({ positionOptions: { enableHighAccuracy: true }, trackUserLocation: true }), 'top-right');

        map.current.on('moveend', () => {
            setMapMoveTick(t => t + 1);
            if (map.current) setCurrentZoom(map.current.getZoom());
        });

    map.current.on("load", () => {
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

        const source = map.current.getSource('locations-src') as maplibregl.GeoJSONSource;
        if (source) source.setData(locationsToGeoJSON(filteredLocations));

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

        filteredLocations.forEach((location) => {
            const pixel = map.current!.project([location.longitude, location.latitude]);
            const features = map.current!.queryRenderedFeatures(pixel, { layers: ['clusters'] });
            if (features.length > 0) return;

            const el = document.createElement('div');
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
                    .setHTML(`
                        <div class="p-4 min-w-[200px]">
                            <h3 class="font-semibold text-lg">${location.name}</h3>
                            ${location.description ?? ''}
                        </div>
                    `)
                    .addTo(map.current!);
            };

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([location.longitude, location.latitude])
        .addTo(map.current!);

            markersRef.current.push(marker);
        });
    }, [filteredLocations, isLoaded, mapMoveTick]);

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
                const el = document.createElement('div');
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
}
