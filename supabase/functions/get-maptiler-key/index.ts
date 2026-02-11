import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  getCacheValue,
  setCacheValue,
  cacheKeys,
} from "../lib/redis.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Try to get from cache first
    const cachedKey = await getCacheValue('maptiler:key');
    if (cachedKey) {
      console.log('Using cached MapTiler key');
      return new Response(
        JSON.stringify({ key: cachedKey }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const maptilerKey = Deno.env.get('MAPTILER_API_KEY');
    
    if (!maptilerKey) {
      console.error('MAPTILER_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'MapTiler API key not configured' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Cache the key for 24 hours
    await setCacheValue('maptiler:key', maptilerKey, 86400);

    return new Response(
      JSON.stringify({ key: maptilerKey }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
