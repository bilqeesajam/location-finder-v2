// Utility to parse bus route and stops from GeoJSON

import busRoutesUrl from '@/data/bus_routes.geojson?url';

export interface BusStop {
  name: string;
  coordinates: [number, number];
}

export interface BusRouteData {
  id: string;
  name: string;
  description: string;
  route: [number, number][];
  stops: BusStop[];
  color: string;
}

const routeColors = [
  '#c56b25', // Orange
  '#c56b25', // Orange
  '#c56b25', // Orange
  '#c56b25', // Orange
];

// Function to find the closest waypoint index to a target coordinate
function findClosestWaypointIndex(
  coordinates: [number, number][],
  targetLng: number,
  targetLat: number
): number {
  let closestIndex = 0;
  let minDistance = Infinity;

  coordinates.forEach((coord, index) => {
    const distance = Math.sqrt(
      Math.pow(coord[0] - targetLng, 2) + Math.pow(coord[1] - targetLat, 2)
    );
    if (distance < minDistance) {
      minDistance = distance;
      closestIndex = index;
    }
  });

  return closestIndex;
}

// Identify real bus stops along each route
function identifyBusStops(
  routeName: string,
  coordinates: [number, number][]
): BusStop[] {
  const stops: BusStop[] = [];

  // Define known locations for each route
  if (routeName === 'GA0143') {
    // Makhaza to Cape Town route
    stops.push(
      { name: 'Makhaza Station', coordinates: coordinates[0] },
      { name: 'Site C', coordinates: coordinates[findClosestWaypointIndex(coordinates, 18.698, -34.051)] },
      { name: 'Symphony Way', coordinates: coordinates[findClosestWaypointIndex(coordinates, 18.69, -34.045)] },
      { name: 'N2 Mew Way', coordinates: coordinates[findClosestWaypointIndex(coordinates, 18.685, -34.043)] },
      { name: 'Nyanga Junction', coordinates: coordinates[findClosestWaypointIndex(coordinates, 18.68, -34.037)] },
      { name: 'Philippi', coordinates: coordinates[findClosestWaypointIndex(coordinates, 18.51, -33.98)] },
      { name: 'Athlone', coordinates: coordinates[findClosestWaypointIndex(coordinates, 18.51, -33.96)] },
      { name: 'Maitland', coordinates: coordinates[findClosestWaypointIndex(coordinates, 18.485, -33.945)] },
      { name: 'Observatory Junction', coordinates: coordinates[findClosestWaypointIndex(coordinates, 18.46, -33.94)] },
      { name: 'Salt River Station', coordinates: coordinates[findClosestWaypointIndex(coordinates, 18.445, -33.932)] },
      { name: 'Woodstock Station', coordinates: coordinates[findClosestWaypointIndex(coordinates, 18.438, -33.931)] },
      { name: 'District Six', coordinates: coordinates[findClosestWaypointIndex(coordinates, 18.435, -33.930)] },
      { name: 'Foreshore', coordinates: coordinates[findClosestWaypointIndex(coordinates, 18.427, -33.922)] },
      { name: 'CTICC', coordinates: coordinates[findClosestWaypointIndex(coordinates, 18.425, -33.918)] },
      { name: 'Cape Town Station', coordinates: coordinates[coordinates.length - 1] }
    );
  } else if (routeName === 'GA0003') {
    // Stellenbosch to Cape Town route
    stops.push(
      { name: 'Stellenbosch Town Centre', coordinates: coordinates[0] },
      { name: 'Stellenbosch University', coordinates: coordinates[findClosestWaypointIndex(coordinates, 18.852, -33.919)] },
      { name: 'Devon Valley', coordinates: coordinates[findClosestWaypointIndex(coordinates, 18.854, -33.928)] },
      { name: 'Kuilsriver', coordinates: coordinates[findClosestWaypointIndex(coordinates, 18.81, -33.95)] },
      { name: 'Bellville', coordinates: coordinates[findClosestWaypointIndex(coordinates, 18.65, -33.90)] },
      { name: 'Parow', coordinates: coordinates[findClosestWaypointIndex(coordinates, 18.58, -33.91)] },
      { name: 'Maitland', coordinates: coordinates[findClosestWaypointIndex(coordinates, 18.50, -33.94)] },
      { name: 'Observatory', coordinates: coordinates[findClosestWaypointIndex(coordinates, 18.46, -33.94)] },
      { name: 'Salt River Station', coordinates: coordinates[findClosestWaypointIndex(coordinates, 18.445, -33.932)] },
      { name: 'Woodstock Exchange', coordinates: coordinates[findClosestWaypointIndex(coordinates, 18.438, -33.931)] },
      { name: 'District Six', coordinates: coordinates[findClosestWaypointIndex(coordinates, 18.435, -33.930)] },
      { name: 'Foreshore', coordinates: coordinates[findClosestWaypointIndex(coordinates, 18.427, -33.922)] },
      { name: 'CTICC', coordinates: coordinates[findClosestWaypointIndex(coordinates, 18.425, -33.918)] },
      { name: 'Cape Town Station', coordinates: coordinates[coordinates.length - 1] }
    );
  } else if (routeName === 'GA0030') {
    // Delft to Cape Town route
    stops.push(
      { name: 'Delft Station', coordinates: coordinates[0] },
      { name: 'Delft South', coordinates: coordinates[findClosestWaypointIndex(coordinates, 18.646, -33.96)] },
      { name: 'Belhar', coordinates: coordinates[findClosestWaypointIndex(coordinates, 18.643, -33.975)] },
      { name: 'Elsies River', coordinates: coordinates[findClosestWaypointIndex(coordinates, 18.59, -33.94)] },
      { name: 'Goodwood', coordinates: coordinates[findClosestWaypointIndex(coordinates, 18.55, -33.93)] },
      { name: 'Parow', coordinates: coordinates[findClosestWaypointIndex(coordinates, 18.50, -33.93)] },
      { name: 'Maitland', coordinates: coordinates[findClosestWaypointIndex(coordinates, 18.47, -33.93)] },
      { name: 'Observatory', coordinates: coordinates[findClosestWaypointIndex(coordinates, 18.46, -33.94)] },
      { name: 'Salt River Station', coordinates: coordinates[findClosestWaypointIndex(coordinates, 18.445, -33.932)] },
      { name: 'Woodstock Station', coordinates: coordinates[findClosestWaypointIndex(coordinates, 18.438, -33.931)] },
      { name: 'District Six', coordinates: coordinates[findClosestWaypointIndex(coordinates, 18.435, -33.930)] },
      { name: 'Foreshore', coordinates: coordinates[findClosestWaypointIndex(coordinates, 18.427, -33.922)] },
      { name: 'CTICC', coordinates: coordinates[findClosestWaypointIndex(coordinates, 18.425, -33.918)] },
      { name: 'Cape Town Station', coordinates: coordinates[coordinates.length - 1] }
    );
  } else if (routeName === 'GA0077') {
    // Town Centre to Cape Town route
    stops.push(
      { name: 'Khayelitsha Town Centre', coordinates: coordinates[0] },
      { name: 'Site B', coordinates: coordinates[findClosestWaypointIndex(coordinates, 18.616, -34.051)] },
      { name: 'Nolungile', coordinates: coordinates[findClosestWaypointIndex(coordinates, 18.602, -34.066)] },
      { name: 'Lansdowne Road', coordinates: coordinates[findClosestWaypointIndex(coordinates, 18.54, -33.99)] },
      { name: 'Ottery', coordinates: coordinates[findClosestWaypointIndex(coordinates, 18.49, -33.95)] },
      { name: 'Wynberg', coordinates: coordinates[findClosestWaypointIndex(coordinates, 18.47, -33.98)] },
      { name: 'Maitland', coordinates: coordinates[findClosestWaypointIndex(coordinates, 18.47, -33.93)] },
      { name: 'Observatory', coordinates: coordinates[findClosestWaypointIndex(coordinates, 18.46, -33.94)] },
      { name: 'Salt River Station', coordinates: coordinates[findClosestWaypointIndex(coordinates, 18.445, -33.932)] },
      { name: 'Woodstock Station', coordinates: coordinates[findClosestWaypointIndex(coordinates, 18.438, -33.931)] },
      { name: 'District Six', coordinates: coordinates[findClosestWaypointIndex(coordinates, 18.435, -33.930)] },
      { name: 'Foreshore', coordinates: coordinates[findClosestWaypointIndex(coordinates, 18.427, -33.922)] },
      { name: 'CTICC', coordinates: coordinates[findClosestWaypointIndex(coordinates, 18.425, -33.918)] },
      { name: 'Cape Town Station', coordinates: coordinates[coordinates.length - 1] }
    );
  } else {
    // Default: create stops at regular intervals with generic names
    const numStops = 8;
    const interval = Math.floor(coordinates.length / numStops);
    for (let i = 0; i < numStops; i++) {
      const index = i * interval;
      stops.push({
        name: `Stop ${i + 1}`,
        coordinates: coordinates[Math.min(index, coordinates.length - 1)]
      });
    }
  }

  return stops;
}

export function getBusRoute() {
  // Fetch the GeoJSON at runtime
  return fetch(busRoutesUrl)
    .then((res) => res.json())
    .then((busRoutes) => {
      // Load ALL routes with their metadata
      const routes: BusRouteData[] = busRoutes.features.map((feature: any, index: number) => {
        const coordinates = feature.geometry.coordinates;
        const routeName = feature.properties?.name || `Route ${index + 1}`;
        
        return {
          id: feature.id || `route-${index}`,
          name: routeName,
          description: feature.properties?.description || '',
          route: coordinates,
          stops: identifyBusStops(routeName, coordinates),
          color: routeColors[index % routeColors.length],
        };
      });

      return routes;
    });
}
