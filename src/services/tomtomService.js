/**
 * TomTom Safety Service
 * Integrated into location-finder-v2
 */

export const getSafetyIncidents = async (lat, lon) => {
  // Vite projects use VITE_ prefix for environment variables
  const API_KEY = import.meta.env.VITE_TOMTOM_API_KEY;
  
  if (!API_KEY) {
    console.warn("TomTom API Key is missing. Check your .env file.");
    return { isSafe: true, error: "TomTom API Key is missing" };
  }

  // Define the area to check (approx 1km box)
  const offset = 0.01; 
  const bbox = `${lon - offset},${lat - offset},${lon + offset},${lat + offset}`;
  
  const url = `https://api.tomtom.com/traffic/services/5/incidentDetails?key=${API_KEY}&bbox=${bbox}&fields={incidents{type,geometry,properties{events{description}}}}`;

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`TomTom API Status: ${response.status}`);

    const data = await response.json();
    
    // If there are incidents, it's a "Danger Zone"
    const isSafe = !(data.incidents && data.incidents.length > 0);
    
    return {
      isSafe,
      incidentCount: data.incidents ? data.incidents.length : 0,
      data: data.incidents || []
    };
  } catch (error) {
    console.error("Safety Service Error:", error);
    return { isSafe: true, error: "Unable to verify safety" };
  }
};
