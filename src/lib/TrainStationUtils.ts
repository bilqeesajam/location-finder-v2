import mockRoutes from '../data/mockRoutes.json';
import trainSchedules from '../data/trainSchedules.json';

export interface TrainDeparture {
  departure: string;
}

export interface trainStationUtils {
  name: string;
  departures: string[];
}

/**
 * Checks if a location is a train station by matching against mockRoutes
 */
export const isTrainStation = (locationName: string): boolean => {
  return mockRoutes.features.some(
    feature =>
      feature.geometry.type === 'Point' &&
      feature.properties?.station_name === locationName
  );
};

/**
 * Gets train departures for a specific station
 */
export const getTrainDepartures = (stationName: string): string[] => {
  const station = trainSchedules[stationName as keyof typeof trainSchedules];
  if (station && 'departures' in station) {
    return (station as any).departures as string[];
  }
  return [];
};

/**
 * Gets all available train stations
 */
export const getTrainStations = (): trainStationUtils[] => {
  return Object.entries(trainSchedules).map(([_, station]) => {
    const st = station as any;
    return {
      name: st.station_name,
      departures: st.departures || [],
    };
  });
};

/**
 * Checks if a departure status indicates a delay
 */
export const isDelayed = (status: string): boolean => {
  return status.toLowerCase().includes('delayed');
};

/**
 * Gets the next departure from a station (based on time)
 */
export const getNextDeparture = (
  stationName: string
): string | null => {
  const departures = getTrainDepartures(stationName);
  if (departures.length === 0) return null;

  const now = new Date();
  const currentHours = now.getHours();
  const currentMinutes = now.getMinutes();

  for (const departure of departures) {
    const [depHours, depMinutes] = departure
      .split(':')
      .map(Number);
    if (depHours > currentHours || (depHours === currentHours && depMinutes >= currentMinutes)) {
      return departure;
    }
  }

  // Return first departure of the day if all have passed
  return departures[0];
};
