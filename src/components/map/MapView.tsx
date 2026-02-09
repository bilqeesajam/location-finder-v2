import { useEffect, useRef, useCallback, useState, useMemo } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Location } from '@/hooks/useLocations';
import { LiveLocation } from '@/hooks/useLiveLocations';
import { MapControls } from './MapControls';
import { cn } from '@/lib/utils';
import{ mockDangerRoutes, type DangerZone } from '@/data/mockDangerZones';

const DANGER_ZONE_SOURCE_ID = 'danger-zones';
const DANGER_ROUTE_SOURCE_ID = 'danger-routes';
const DANGER_ZONE_FILL_ID = 'danger-zone-fill';
const DANGER_ZONE_OUTLINE_ID = 'danger-zone-outline';
const DANGER_ROUTE_LINE_ID = 'danger-route-line';

function toRad(value: number) {
    return (value * Math.PI) / 180;
}

function circlePolygon(lng: number, lat: number, radiusMeters: number, steps = 64) {
    const coordinates: Array<[number, number]> = [];
    const earthRadius = 6371000;
    const angularDistance = radiusMeters / earthRadius;
    const latRad = toRad(lat);
    const lngRad = toRad(lng);

    for (let i = 0; i <= steps; i++) {
        const bearing = (i / steps) * Math.PI * 2;
        const sinLat = Math.sin(latRad) * Math.cos(angularDistance) + Math.cos(latRad) * Math.sin(angularDistance) * Math.cos(bearing);
        const newLat = Math.asin(sinLat);
        const newLng = lngRad + Math.atan2(
            Math.sin(bearing) * Math.sin(angularDistance) * Math.cos(latRad),
            Math.cos(angularDistance) - Math.sin(latRad) * Math.sin(newLat)
        );

        coordinates.push([newLng * (180 / Math.PI), newLat * (180 / Math.PI)]);
    }

    return coordinates;
}

interface MapViewProps {
    locations: Location[];
    liveLocations: LiveLocation[];
    onMapClick?: (lng: number, lat: number) => void;
    isAddingLocation?: boolean;
    className?: string;
    userLocation?: { lat: number; lng: number };
    dangerZones?: DangerZone[];
}

const MAPTILER_API_KEY = import.meta.env.VITE_MAPTILER_API_KEY as string;

export function MapView({
                            locations,
                            liveLocations,
                            onMapClick,
                            isAddingLocation,
                            className,
                            userLocation,
                            dangerZones = [],
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
    const [showDangerZones, setShowDangerZones] = useState(true);

    // ✅ NEW: clear filters handler (this is the "where would this be")
    const handleClearFilters = useCallback(() => {
        setSelectedServices([]);
    }, []);

    // ---- service matching ----
    const matchesService = (loc: Location, service: string) => {
        const text = (loc.name + ' ' + (loc.description || '')).toLowerCase();

        const keywords: Record<string, string[]> = {
            // ✅ requested types
            clinic: ['clinic', 'medical', 'health', 'doctor', 'hospital', 'er', 'emergency'],
            library: ['library'],
            shelter: ['shelter', 'homeless', 'safe house', 'refuge', 'refugee', 'crisis'],

            // keep your existing ones
            hospitals: ['hospital', 'clinic', 'medical', 'health', 'emergency'],
            police: ['police', 'precinct', 'station'],
            restaurants: ['restaurant', 'cafe', 'café', 'diner', 'bistro', 'eatery'],

            // coming soon
            parks: ['park', 'garden'],
            roads: ['road', 'street', 'rd', 'st'],
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
                    if (s === 'parks' || s === 'roads') return false;
                    return matchesService(l, s);
                })
            );
        }

        const q = searchQuery.trim().toLowerCase();
        if (q) {
            res = res.filter(
                (l) =>
                    l.name.toLowerCase().includes(q) ||
                    (l.description || '').toLowerCase().includes(q)
            );
        }

        return res;
    }, [locations, selectedServices, searchQuery]);

    const toggleService = useCallback((service: string) => {
        setSelectedServices((prev) =>
            prev.includes(service) ? prev.filter((s) => s !== service) : [...prev, service]
        );
    }, []);

    const dangerZonesGeoJson = useMemo(() => {
        const zones: DangerZone[] = userLocation
            ? [
                {
                    lat: userLocation.lat,
                    lng: userLocation.lng,
                    radius: 140,
                    title: 'Live Test Zone',
                    message: 'Live test zone centered on your location.',
                    severity: 'high',
                },
                ...dangerZones,
            ]
            : dangerZones;

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
                    coordinates: [circlePolygon(zone.lng, zone.lat, zone.radius)],
                },
            })),
        };
    }, [userLocation, dangerZones]);

    const dangerRoutesGeoJson = useMemo(() => ({
        type: 'FeatureCollection' as const,
        features: mockDangerRoutes.map((route) => ({
            type: 'Feature' as const,
            properties: {
                id: route.id,
            },
            geometry: {
                type: 'LineString' as const,
                coordinates: route.coordinates,
            },
        })),
    }), []);

    useEffect(() => {
        onMapClickRef.current = onMapClick;
        isAddingLocationRef.current = isAddingLocation;
    }, [onMapClick, isAddingLocation]);

    // ---- MAP INIT ----
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

        map.current.addControl(
            new maplibregl.NavigationControl({ visualizePitch: true }),
            'top-right'
        );

        map.current.addControl(
            new maplibregl.ScaleControl({ maxWidth: 100, unit: 'metric' }),
            'bottom-left'
        );

        map.current.addControl(
            new maplibregl.GeolocateControl({
                positionOptions: { enableHighAccuracy: true },
                trackUserLocation: true,
            }),
            'top-right'
        );

        map.current.on('load', () => {
            setIsLoaded(true);

            if (map.current?.getSource('openmaptiles')) {
                const layers = map.current.getStyle().layers;
                const labelLayerId = layers?.find(
                    (l) => l.type === 'symbol' && l.layout?.['text-field']
                )?.id;

                if (!map.current.getLayer('3d-buildings')) {
                    map.current.addLayer(
                        {
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
                        },
                        labelLayerId
                    );
                }
            }
        });

        map.current.on('click', (e) => {
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
        map.current.getCanvas().style.cursor = isAddingLocation ? 'crosshair' : '';
    }, [isAddingLocation]);

    // ---- LOCATION MARKERS ----
    useEffect(() => {
        if (!map.current || !isLoaded) return;

        markersRef.current.forEach((m) => m.remove());
        markersRef.current = [];

        filteredLocations.forEach((location) => {
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
                const el = document.createElement('div');
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

    // Add mock danger zones + routes
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
                        '#DC2626',
                        'medium',
                        '#EA580C',
                        'low',
                        '#CA8A04',
                        '#DC2626',
                    ],
                    'fill-opacity': 0.72,
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
                        '#DC2626',
                        'medium',
                        '#EA580C',
                        'low',
                        '#CA8A04',
                        '#DC2626',
                    ],
                    'line-width': 2.5,
                    'line-opacity': 1,
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
                    'line-color': '#991B1B',
                    'line-width': 5,
                    'line-opacity': 0.95,
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
                .setHTML(`
          <div class="p-4 min-w-[200px]">
            <h3 class="font-semibold text-lg">${loc.name}</h3>
            ${loc.description ?? ''}
          </div>
        `)
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
                selectedServices={selectedServices}
                onServiceToggle={toggleService}
                onClearFilters={handleClearFilters}  // ✅ NEW
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
