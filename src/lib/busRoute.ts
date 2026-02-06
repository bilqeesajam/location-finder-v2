// Utility to parse bus route and stops from GeoJSON

import busRoutesUrl from '@/data/bus_routes.geojson?url';

export function getBusRoute() {
  // Fetch the GeoJSON at runtime
  // NOTE: This returns a Promise!
  return fetch(busRoutesUrl)
    .then((res) => res.json())
    .then((busRoutes) => {
      const feature = busRoutes.features[0];
      const coordinates = feature.geometry.coordinates;
      // For demo: treat every Nth point as a stop (or use real stops if available)
      const stops = coordinates.filter((_, i) => i % 10 === 0 || i === coordinates.length - 1);
      return { route: coordinates, stops };
    });
}
