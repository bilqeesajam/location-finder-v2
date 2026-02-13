import { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import mockRoutes from '../../data/mockRoutes.json';

interface TransitMapProps {
  apiKey: string;
}

export default function TransitMap({ apiKey }: TransitMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);

  useEffect(() => {
    if (!mapContainer.current || !apiKey) return;

    // Initialize MapTiler map
    map.current = new maplibregl.Map({
      container: mapContainer.current,
    //   style: `https://api.maptiler.com/maps/streets-v2/style.json?key=${apiKey}`,
      center: [24.6282, -25.9241],
      zoom: 13,
    });

    map.current.on('load', () => {
      if (!map.current) return;

      // Add GeoJSON source for transit routes
      map.current.addSource('transit-routes', {
        type: 'geojson',
        data: mockRoutes as GeoJSON.FeatureCollection<GeoJSON.LineString>,
      });

      // Add bus route layer
      map.current.addLayer({
        id: 'bus-routes',
        type: 'line',
        source: 'transit-routes',
        filter: ['==', ['get', 'type'], 'bus'],
        paint: {
          'line-color': '#ef4444',
          'line-width': 3,
          'line-opacity': 0.8,
        },
        layout: {
          'line-join': 'round',
          'line-cap': 'round',
        },
      });

      // Add train route layer
      map.current.addLayer({
        id: 'train-routes',
        type: 'line',
        source: 'transit-routes',
        filter: ['==', ['get', 'type'], 'train'],
        paint: {
          'line-color': '#ef4444',
          'line-width': 4,
          'line-opacity': 0.8,
          'line-dasharray': [2, 2],
        },
        layout: {
          'line-join': 'round',
          'line-cap': 'round',
        },
      });
    });

    return () => {
      map.current?.remove();
    };
  }, [apiKey]);

  return (
    <div
      ref={mapContainer}
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
      }}
    />
  );
}
