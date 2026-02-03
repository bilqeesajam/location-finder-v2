import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Validation helper
function validateCoordinates(data: { latitude?: number; longitude?: number }) {
  const errors: string[] = [];

  if (typeof data.latitude !== 'number' || data.latitude < -90 || data.latitude > 90) {
    errors.push('Invalid latitude (must be between -90 and 90)');
  }
  if (typeof data.longitude !== 'number' || data.longitude < -180 || data.longitude > 180) {
    errors.push('Invalid longitude (must be between -180 and 180)');
  }

  return { valid: errors.length === 0, errors };
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    
    const authHeader = req.headers.get('Authorization');
    
    // Create Supabase client with auth context
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: authHeader ? { Authorization: authHeader } : {} },
    });

    // Get user from token
    let userId: string | null = null;

    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.replace('Bearer ', '');
      const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
      
      if (!claimsError && claimsData?.claims?.sub) {
        userId = claimsData.claims.sub;
      }
    }

    // Handle GET requests - fetch all live locations
    if (req.method === 'GET') {
      // Fetch live locations
      const { data: liveLocData, error: liveLocError } = await supabase
        .from('live_locations')
        .select('*');

      if (liveLocError) {
        console.error('Error fetching live locations:', liveLocError);
        return new Response(
          JSON.stringify({ error: 'Failed to fetch live locations' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Fetch profiles for all users with live locations
      const userIds = [...new Set(liveLocData.map((loc: { user_id: string }) => loc.user_id))];
      
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('user_id, display_name')
        .in('user_id', userIds);

      // Create a map of user_id to profile
      const profileMap = new Map(
        (profilesData || []).map((p: { user_id: string; display_name: string | null }) => [p.user_id, { display_name: p.display_name }])
      );

      // Combine live locations with profiles
      const formatted = liveLocData.map((loc: { user_id: string }) => ({
        ...loc,
        profile: profileMap.get(loc.user_id) || null,
      }));

      return new Response(
        JSON.stringify({ data: formatted }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Handle POST requests - update or delete
    if (req.method === 'POST') {
      if (!userId) {
        return new Response(
          JSON.stringify({ error: 'Authentication required' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const body = await req.json();
      const { action } = body;

      switch (action) {
        case 'update': {
          const { latitude, longitude } = body;
          
          // Server-side validation
          const validation = validateCoordinates({ latitude, longitude });
          if (!validation.valid) {
            return new Response(
              JSON.stringify({ error: validation.errors.join(', ') }),
              { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }

          const { data, error } = await supabase
            .from('live_locations')
            .upsert({
              user_id: userId,
              latitude,
              longitude,
              updated_at: new Date().toISOString(),
            }, {
              onConflict: 'user_id',
            })
            .select()
            .single();

          if (error) {
            console.error('Error updating live location:', error);
            return new Response(
              JSON.stringify({ error: 'Failed to update live location' }),
              { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }

          console.log(`Live location updated for user ${userId}`);
          return new Response(
            JSON.stringify({ data }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        case 'delete': {
          const { error } = await supabase
            .from('live_locations')
            .delete()
            .eq('user_id', userId);

          if (error) {
            console.error('Error deleting live location:', error);
            return new Response(
              JSON.stringify({ error: 'Failed to stop sharing location' }),
              { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }

          console.log(`Live location stopped for user ${userId}`);
          return new Response(
            JSON.stringify({ message: 'Stopped sharing location' }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        default:
          return new Response(
            JSON.stringify({ error: 'Invalid action' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
      }
    }

    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Live locations function error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
