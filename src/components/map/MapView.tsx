import { useEffect, useRef, useCallback, useState, useMemo } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Location } from '@/hooks/useLocations';
import { LiveLocation } from '@/hooks/useLiveLocations';
import { MapControls } from './MapControls';
import { cn } from '@/lib/utils';

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
    const liveMarkersRef = useRef<Map<string, maplibregl.Marker>>(new Map());
    const pointMarkersRef = useRef<maplibregl.Marker[]>([]);
    
    const onMapClickRef = useRef(onMapClick);
    const isAddingLocationRef = useRef(isAddingLocation);

    const [isLoaded, setIsLoaded] = useState(false);
    const [is3D, setIs3D] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedServices, setSelectedServices] = useState<string[]>([]);
    const [mapMoveTick, setMapMoveTick] = useState(0);
    const [currentZoom, setCurrentZoom] = useState(1.8);

    const handleClearFilters = useCallback(() => setSelectedServices([]), []);

    const matchesService = (loc: Location, service: string) => {
        const text = (loc.name + ' ' + (loc.description || '')).toLowerCase();
        const keywords: Record<string, string[]> = {
            clinic: ['clinic', 'medical', 'health', 'doctor', 'hospital', 'er', 'emergency'],
            library: ['library'],
            shelter: ['shelter', 'homeless', 'safe house', 'refuge', 'refugee', 'crisis'],
            hospitals: ['hospital', 'clinic', 'medical', 'health', 'emergency'],
            police: ['police', 'precinct', 'station'],
            restaurants: ['restaurant', 'cafe', 'café', 'diner', 'bistro', 'eatery'],
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
            prev.includes(service) ? prev.filter((s) => s !== service) : [...prev, service]
        );
    }, []);

    const handleSelectLocation = useCallback((loc: Location) => {
        if (!map.current) return;
        map.current.flyTo({ center: [loc.longitude, loc.latitude], zoom: 14, pitch: 45 });
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
            : 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';

        map.current = new maplibregl.Map({
            container: mapContainer.current,
            style,
            center: [15, 10],
            zoom: 1.8,
            pitch: 45,
            maxPitch: 85,
        });

        map.current.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'top-right');
        map.current.addControl(new maplibregl.GeolocateControl({ positionOptions: { enableHighAccuracy: true }, trackUserLocation: true }), 'top-right');

        map.current.on('moveend', () => {
            setMapMoveTick(t => t + 1);
            setCurrentZoom(map.current?.getZoom() || 1.8);
        });

        map.current.on('load', () => {
            setIsLoaded(true);
            map.current!.addSource('locations', {
                type: 'geojson',
                data: locationsToGeoJSON(filteredLocations),
                cluster: true,
                clusterMaxZoom: 14,
                clusterRadius: 50,
            });

            map.current!.addLayer({
                id: 'clusters',
                type: 'circle',
                source: 'locations',
                filter: ['has', 'point_count'],
                paint: {
                    'circle-color': '#2dd4bf',
                    'circle-radius': ['step', ['get', 'point_count'], 20, 10, 25, 30, 30],
                },
            });

            map.current!.addLayer({
                id: 'cluster-count',
                type: 'symbol',
                source: 'locations',
                filter: ['has', 'point_count'],
                layout: { 
                    'text-field': '{point_count_abbreviated}', 
                    'text-size': 14,
                    'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
                },
                paint: { 'text-color': '#ffffff' }
            });

            map.current!.on('click', 'clusters', async (e) => {
                const features = map.current!.queryRenderedFeatures(e.point, { layers: ['clusters'] });
                const clusterId = features[0].properties.cluster_id;
                const source = map.current!.getSource('locations') as maplibregl.GeoJSONSource;
                const expansionZoom = await source.getClusterExpansionZoom(clusterId);
                map.current!.easeTo({ center: (features[0].geometry as any).coordinates, zoom: expansionZoom });
            });
        });

        return () => map.current?.remove();
    }, []);

    // ---- STATIC MARKER LOGIC ----
    useEffect(() => {
        if (!map.current || !isLoaded) return;

        const source = map.current.getSource('locations') as maplibregl.GeoJSONSource;
        if (source) source.setData(locationsToGeoJSON(filteredLocations));

        pointMarkersRef.current.forEach(m => m.remove());
        pointMarkersRef.current = [];

        filteredLocations.forEach(loc => {
            const pixel = map.current!.project([loc.longitude, loc.latitude]);
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

            // Popup logic exactly as before
            el.onclick = (e) => {
                e.stopPropagation();
                new maplibregl.Popup({ offset: 15, closeButton: false })
                    .setLngLat([loc.longitude, loc.latitude])
                    .setHTML(`<div class="p-3 bg-slate-900 text-white rounded-lg"><strong>${loc.name}</strong><p class="text-xs mt-1 text-slate-300">${loc.description || ''}</p></div>`)
                    .addTo(map.current!);
            };

            const marker = new maplibregl.Marker({ element: el })
                .setLngLat([loc.longitude, loc.latitude])
                .addTo(map.current!);
            
            pointMarkersRef.current.push(marker);
        });
    }, [filteredLocations, isLoaded, mapMoveTick]);

    // ---- LIVE LOCATIONS LOGIC ----
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
                // Styling exactly as before
                el.innerHTML = `<div class="w-6 h-6 rounded-full bg-primary border-2 border-background animate-pulse"></div>`;
                const marker = new maplibregl.Marker({ element: el })
                    .setLngLat([loc.longitude, loc.latitude])
                    .addTo(map.current!);
                liveMarkersRef.current.set(loc.user_id, marker);
            }
        });
    }, [liveLocations, isLoaded, currentZoom]);

    return (
        <div className={cn('relative w-full h-full bg-[#020617]', className)}>
            <div ref={mapContainer} className="absolute inset-0" />
            <MapControls
                is3D={is3D}
                onToggle3D={() => {
                    setIs3D(!is3D);
                    map.current?.easeTo({ pitch: !is3D ? 45 : 0 });
                }}
                onResetView={() => map.current?.flyTo({ center: [15, 10], zoom: 1.8, pitch: 45 })}
                locations={locations}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                selectedServices={selectedServices}
                onServiceToggle={toggleService}
                onClearFilters={handleClearFilters}
                onSelectLocation={handleSelectLocation}
            />
        </div>
    );
}