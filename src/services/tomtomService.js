export const getSafetyIncidents = async (lat, lon) => {
  // Use the mandatory VITE_ prefix for client-side environment variables
  const API_KEY = import.meta.env.VITE_TOMTOM_API_KEY;

  if (!API_KEY) {
    console.error("VITE_TOMTOM_API_KEY is missing in .env");
    return { isSafe: true, error: "API Key Missing", data: [] };
  }

  // Create a bounding box (~2km area) around the center point
  // 0.02 degrees is roughly 2.2km
  const offset = 0.02;
  const minLon = lon - offset;
  const minLat = lat - offset;
  const maxLon = lon + offset;
  const maxLat = lat + offset;
  const bbox = `${minLon},${minLat},${maxLon},${maxLat}`;

  // This string matches EXACTLY what your MapView.tsx useEffect is looking for:
  // 1. geometry.coordinates
  // 2. properties.events[0].description
  const fields = "{incidents{type,geometry{type,coordinates},properties{iconCategory,events{description}}}}";

  const params = new URLSearchParams({
    key: API_KEY,
    bbox: bbox,
    fields: fields,
    language: "en-GB",
    t: "-1", // Required for real-time incident data
  });

  const url = `https://api.tomtom.com/traffic/services/5/incidentDetails?${params.toString()}`;

  try {
    const response = await fetch(url);

    if (!response.ok) {
      const errorJson = await response.json();
      console.error("TomTom API Error Response:", errorJson);
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    // Your MapView expects an object with a 'data' array
    const incidents = data.incidents || [];

    return {
      isSafe: incidents.length === 0,
      incidentCount: incidents.length,
      data: incidents // This maps to your 'result.data' in MapView.tsx
    };
  } catch (error) {
    console.error("Safety Service Fetch Error:", error);
    // Return safe defaults so the map doesn't crash
    return {
      isSafe: true,
      incidentCount: 0,
      data: [],
      error: error.message
    };
  }
};