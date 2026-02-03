import { useEffect, useRef, useCallback, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Location } from '@/hooks/useLocations';
import { LiveLocation } from '@/hooks/useLiveLocations';
import { MapControls } from './MapControls';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

interface MapViewProps {
  locations: Location[];
  liveLocations: LiveLocation[];
  onMapClick?: (lng: number, lat: number) => void;
  isAddingLocation?: boolean;
  className?: string;
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

  // Keep refs updated
  useEffect(() => {
    onMapClickRef.current = onMapClick;
    isAddingLocationRef.current = isAddingLocation;
  }, [onMapClick, isAddingLocation]);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    const initMap = async () => {
      // Try to get API key from edge function
      let apiKey = '';
      try {
        const { data } = await supabase.functions.invoke('get-maptiler-key');
        if (data?.key) {
          apiKey = data.key;
        }
      } catch (e) {
        console.log('Using fallback map style');
      }
      
      const style = apiKey 
        ? `https://api.maptiler.com/maps/streets-v2-dark/style.json?key=${apiKey}`
        : 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';

      if (!mapContainer.current) return;

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
        
        // Try to add 3D buildings
        if (apiKey) {
          try {
            const layers = map.current?.getStyle().layers;
            const labelLayerId = layers?.find(
              (layer) => layer.type === 'symbol' && layer.layout?.['text-field']
            )?.id;

            if (map.current?.getSource('openmaptiles')) {
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
          } catch (e) {
            console.log('3D buildings not available for this style');
          }
        }
      });

      map.current.on('click', (e) => {
        if (onMapClickRef.current && isAddingLocationRef.current) {
          onMapClickRef.current(e.lngLat.lng, e.lngLat.lat);
        }
      });
    };

    initMap();

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, []);

  // Handle adding location mode cursor
  useEffect(() => {
    if (!map.current) return;
    
    map.current.getCanvas().style.cursor = isAddingLocation ? 'crosshair' : '';
  }, [isAddingLocation]);

  // Update location markers
  useEffect(() => {
    if (!map.current || !isLoaded) return;

    // Clear existing markers
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    // Add new markers
    locations.forEach(location => {
      const el = document.createElement('div');
      el.className = 'location-marker';
      el.innerHTML = `
        <div class="w-8 h-8 rounded-full bg-primary flex items-center justify-center shadow-glow cursor-pointer transition-transform hover:scale-110">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-primary-foreground">
            <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
            <circle cx="12" cy="10" r="3"/>
          </svg>
        </div>
      `;

      el.addEventListener('click', (e) => {
        e.stopPropagation();
        
        // Show popup
        if (popupRef.current) {
          popupRef.current.remove();
        }

        const popupContent = document.createElement('div');
        popupContent.innerHTML = `
          <div class="p-4 min-w-[200px]">
            <h3 class="font-semibold text-foreground text-lg mb-1">${location.name}</h3>
            ${location.description ? `<p class="text-muted-foreground text-sm mb-2">${location.description}</p>` : ''}
            <p class="text-xs text-muted-foreground">
              ${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}
            </p>
          </div>
        `;

        popupRef.current = new maplibregl.Popup({ offset: 25, closeButton: true })
          .setLngLat([location.longitude, location.latitude])
          .setDOMContent(popupContent)
          .addTo(map.current!);
      });

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([location.longitude, location.latitude])
        .addTo(map.current!);

      markersRef.current.push(marker);
    });
  }, [locations, isLoaded]);

  // Update live location markers
  useEffect(() => {
    if (!map.current || !isLoaded) return;

    // Remove markers for users who stopped sharing
    const currentUserIds = new Set(liveLocations.map(l => l.user_id));
    liveMarkersRef.current.forEach((marker, id) => {
      if (!currentUserIds.has(id)) {
        marker.remove();
        liveMarkersRef.current.delete(id);
      }
    });

    // Add or update markers
    liveLocations.forEach(location => {
      const existing = liveMarkersRef.current.get(location.user_id);
      
      if (existing) {
        existing.setLngLat([location.longitude, location.latitude]);
      } else {
        const el = document.createElement('div');
        el.className = 'live-marker';
        el.innerHTML = `
          <div class="relative">
            <div class="absolute inset-0 w-6 h-6 rounded-full bg-primary/50 animate-pulse-ring"></div>
            <div class="w-6 h-6 rounded-full bg-primary border-2 border-background shadow-glow flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="currentColor" class="text-primary-foreground">
                <circle cx="12" cy="12" r="4"/>
              </svg>
            </div>
          </div>
        `;

        const marker = new maplibregl.Marker({ element: el })
          .setLngLat([location.longitude, location.latitude])
          .addTo(map.current!);

        liveMarkersRef.current.set(location.user_id, marker);
      }
    });
  }, [liveLocations, isLoaded]);

  const toggle3D = useCallback(() => {
    if (!map.current) return;
    
    const newIs3D = !is3D;
    setIs3D(newIs3D);

    map.current.easeTo({
      pitch: newIs3D ? 45 : 0,
      bearing: newIs3D ? map.current.getBearing() : 0,
      duration: 1000,
    });
  }, [is3D]);

  const resetView = useCallback(() => {
    if (!map.current) return;

    map.current.flyTo({
      center: [0, 20],
      zoom: 2,
      pitch: is3D ? 45 : 0,
      bearing: 0,
      duration: 2000,
    });
  }, [is3D]);

  const flyTo = useCallback((lng: number, lat: number) => {
    if (!map.current) return;

    map.current.flyTo({
      center: [lng, lat],
      zoom: 15,
      duration: 2000,
    });
  }, []);

  return (
    <div className={cn('relative w-full h-full', className)}>
      <div ref={mapContainer} className="absolute inset-0" />
      
      <MapControls
        is3D={is3D}
        onToggle3D={toggle3D}
        onResetView={resetView}
        className="absolute top-4 left-4 z-10"
      />

      {isAddingLocation && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 fade-in">
          <div className="glass-panel px-4 py-2 rounded-full text-sm font-medium">
            <span className="text-primary">Click on the map</span>
            <span className="text-muted-foreground"> to add a location</span>
          </div>
        </div>
      )}

      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <span className="text-sm text-muted-foreground">Loading map...</span>
          </div>
        </div>
      )}
    </div>
  );
}
