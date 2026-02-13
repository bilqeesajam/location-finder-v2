// Bus routing service - matches user queries to actual bus routes
import { getBusRoute, BusRouteData } from '@/lib/busRoute';

export interface BusRouteMatch {
  route: BusRouteData;
  fromStopIndex: number;
  toStopIndex: number;
  fromStopName: string;
  toStopName: string;
  distanceKm: number;
  estimatedMinutes: number;
  segments: [number, number][];
}

// Known terminus/major stops for fuzzy matching
const ROUTE_KEYWORDS: Record<string, string[]> = {
  'GA0143': ['makhaza', 'site c', 'symphony', 'nyanga', 'philippi', 'athlone', 'salt river', 'woodstock', 'cape town'],
  'GA0003': ['stellenbosch', 'university', 'devon', 'kuilsriver', 'bellville', 'parow', 'maitland', 'observatory', 'cape town'],
  'GA0030': ['delft', 'belhar', 'elsies river', 'goodwood', 'parow', 'maitland', 'woodstock', 'cape town'],
  'GA0077': ['khayelitsha', 'town centre', 'site b', 'nolungile', 'lansdowne', 'ottery', 'wynberg', 'observatory', 'cape town']
};

function fuzzyMatch(text: string, keywords: string[]): boolean {
  const lower = text.toLowerCase().trim();
  return keywords.some(keyword => 
    lower.includes(keyword) || keyword.includes(lower)
  );
}

function calculateDistance(coord1: [number, number], coord2: [number, number]): number {
  const R = 6371; // Earth radius in km
  const lat1 = coord1[1] * Math.PI / 180;
  const lat2 = coord2[1] * Math.PI / 180;
  const dLat = (coord2[1] - coord1[1]) * Math.PI / 180;
  const dLng = (coord2[0] - coord1[0]) * Math.PI / 180;

  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function findClosestStop(
  coord: [number, number],
  stops: { name: string; coordinates: [number, number] }[]
): { index: number; distance: number; name: string } {
  let minDistance = Infinity;
  let closestIndex = 0;
  let closestName = '';

  stops.forEach((stop, index) => {
    const distance = calculateDistance(coord, stop.coordinates);
    if (distance < minDistance) {
      minDistance = distance;
      closestIndex = index;
      closestName = stop.name;
    }
  });

  return { index: closestIndex, distance: minDistance, name: closestName };
}

function calculateRouteDistance(
  coordinates: [number, number][],
  fromIndex: number,
  toIndex: number
): number {
  let totalDistance = 0;
  const start = Math.min(fromIndex, toIndex);
  const end = Math.max(fromIndex, toIndex);

  for (let i = start; i < end; i++) {
    totalDistance += calculateDistance(coordinates[i], coordinates[i + 1]);
  }

  return totalDistance;
}

export async function findBusRoute(
  fromLng: number,
  fromLat: number,
  fromName: string,
  toLng: number,
  toLat: number,
  toName: string
): Promise<BusRouteMatch | null> {
  try {
    console.log('🚌 Bus routing:', { fromName, toName });
    
    const routes = await getBusRoute();
    
    // Try to match based on names first
    let matchedRoute: BusRouteData | null = null;
    
    for (const route of routes) {
      const routeKeywords = ROUTE_KEYWORDS[route.name] || [];
      const fromMatches = fuzzyMatch(fromName, routeKeywords);
      const toMatches = fuzzyMatch(toName, routeKeywords);
      
      console.log(`  Checking ${route.name}:`, { fromMatches, toMatches });
      
      // If both match keywords, this route likely serves the journey
      if (fromMatches && toMatches) {
        matchedRoute = route;
        console.log(`  ✅ Matched by keywords: ${route.name}`);
        break;
      }
    }
    
    // If no keyword match, try coordinate-based matching
    if (!matchedRoute) {
      console.log('  No keyword match, trying coordinate matching...');
      
      for (const route of routes) {
        if (route.route.length === 0) continue; // Skip empty routes
        
        // Check if coordinates are roughly along this route
        const fromClosest = findClosestStop([fromLng, fromLat], route.stops);
        const toClosest = findClosestStop([toLng, toLat], route.stops);
        
        // If both points are within 10km of stops on this route, consider it
        if (fromClosest.distance < 10 && toClosest.distance < 10) {
          matchedRoute = route;
          console.log(`  ✅ Matched by proximity: ${route.name}`);
          break;
        }
      }
    }
    
    if (!matchedRoute || matchedRoute.route.length === 0) {
      console.log('  ❌ No bus route found');
      return null;
    }
    
    // Find closest stops on the matched route
    const fromStop = findClosestStop([fromLng, fromLat], matchedRoute.stops);
    const toStop = findClosestStop([toLng, toLat], matchedRoute.stops);
    
    // Calculate route segment
    const fromRouteIndex = Math.floor((fromStop.index / matchedRoute.stops.length) * matchedRoute.route.length);
    const toRouteIndex = Math.floor((toStop.index / matchedRoute.stops.length) * matchedRoute.route.length);
    
    const startIndex = Math.min(fromRouteIndex, toRouteIndex);
    const endIndex = Math.max(fromRouteIndex, toRouteIndex);
    
    const segments = matchedRoute.route.slice(startIndex, endIndex + 1);
    const distanceKm = calculateRouteDistance(matchedRoute.route, fromRouteIndex, toRouteIndex);
    
    // Bus average speed: ~25 km/h in urban areas + 8 min wait time
    const travelTimeMin = Math.ceil((distanceKm / 25) * 60);
    const waitTimeMin = 8;
    const estimatedMinutes = travelTimeMin + waitTimeMin;
    
    console.log(`  📍 Route found:`, {
      route: matchedRoute.name,
      fromStop: fromStop.name,
      toStop: toStop.name,
      distanceKm: distanceKm.toFixed(1),
      estimatedMinutes
    });
    
    return {
      route: matchedRoute,
      fromStopIndex: fromStop.index,
      toStopIndex: toStop.index,
      fromStopName: fromStop.name,
      toStopName: toStop.name,
      distanceKm: Math.round(distanceKm * 10) / 10,
      estimatedMinutes,
      segments
    };
    
  } catch (error) {
    console.error('Bus routing error:', error);
    return null;
  }
}
