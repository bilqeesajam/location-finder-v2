import { useState, useRef, useCallback, useEffect } from 'react';
import maplibregl from 'maplibre-gl';

interface UseMapOptions {
  container: string;
  center?: [number, number];
  zoom?: number;
  pitch?: number;
  bearing?: number;
  is3D?: boolean;
}

// MapTiler API Key
const MAPTILER_API_KEY = '4wu3rv7xXgID64RMlznr';

export function useMap(options: UseMapOptions) {
  const [map, setMap] = useState<maplibregl.Map | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [is3D, setIs3D] = useState(options.is3D ?? true);
  const mapRef = useRef<maplibregl.Map | null>(null);

  const initializeMap = useCallback(() => {
    if (mapRef.current) return;

    const style = `https://api.maptiler.com/maps/streets-v2-dark/style.json?key=${MAPTILER_API_KEY}`;

    const newMap = new maplibregl.Map({
      container: options.container,
      style,
      center: options.center ?? [0, 20],
      zoom: options.zoom ?? 2,
      pitch: options.is3D ? (options.pitch ?? 45) : 0,
      bearing: options.bearing ?? 0,
      maxPitch: 85,
    });

    // Add navigation controls
    newMap.addControl(
      new maplibregl.NavigationControl({
        visualizePitch: true,
      }),
      'top-right'
    );

    // Add scale
    newMap.addControl(
      new maplibregl.ScaleControl({
        maxWidth: 100,
        unit: 'metric',
      }),
      'bottom-left'
    );

    // Add geolocation control
    newMap.addControl(
      new maplibregl.GeolocateControl({
        positionOptions: {
          enableHighAccuracy: true,
        },
        trackUserLocation: true,
      }),
      'top-right'
    );

    newMap.on('load', () => {
      setIsLoaded(true);

      // Add 3D buildings layer if MapTiler style
      if (options.is3D) {
        add3DBuildings(newMap);
      }
    });

    mapRef.current = newMap;
    setMap(newMap);

    return () => {
      newMap.remove();
      mapRef.current = null;
    };
  }, [options]);

  const add3DBuildings = (mapInstance: maplibregl.Map) => {
    // Check if the layer source exists
    if (!mapInstance.getSource('openmaptiles')) return;

    const layers = mapInstance.getStyle().layers;
    const labelLayerId = layers?.find(
      (layer) => layer.type === 'symbol' && layer.layout?.['text-field']
    )?.id;

    if (mapInstance.getLayer('3d-buildings')) return;

    mapInstance.addLayer(
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
  };

  const toggle3D = useCallback(() => {
    if (!mapRef.current) return;

    const newIs3D = !is3D;
    setIs3D(newIs3D);

    mapRef.current.easeTo({
      pitch: newIs3D ? 45 : 0,
      bearing: newIs3D ? mapRef.current.getBearing() : 0,
      duration: 1000,
    });
  }, [is3D]);

  const flyTo = useCallback((lng: number, lat: number, zoom?: number) => {
    if (!mapRef.current) return;

    mapRef.current.flyTo({
      center: [lng, lat],
      zoom: zoom ?? 15,
      duration: 2000,
      essential: true,
    });
  }, []);

  const resetView = useCallback(() => {
    if (!mapRef.current) return;

    mapRef.current.flyTo({
      center: options.center ?? [0, 20],
      zoom: options.zoom ?? 2,
      pitch: is3D ? 45 : 0,
      bearing: 0,
      duration: 2000,
    });
  }, [options.center, options.zoom, is3D]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  return {
    map,
    mapRef,
    isLoaded,
    is3D,
    initializeMap,
    toggle3D,
    flyTo,
    resetView,
  };
}
