import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Validation helpers
function validateLocation(data: { name?: string; description?: string; latitude?: number; longitude?: number }) {
  const errors: string[] = [];

  if (!data.name || data.name.trim().length < 1) {
    errors.push('Name is required');
  }
  if (data.name && data.name.length > 100) {
    errors.push('Name must be less than 100 characters');
  }
  if (data.description && data.description.length > 500) {
    errors.push('Description must be less than 500 characters');
  }
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

    // Get user from token if provided
    let userId: string | null = null;
    let isAdmin = false;

    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.replace('Bearer ', '');
      const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
      
      if (!claimsError && claimsData?.claims?.sub) {
        userId = claimsData.claims.sub;
        
        // Check admin role
        const { data: roleData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', userId)
          .eq('role', 'admin')
          .maybeSingle();
        
        isAdmin = !!roleData;
      }
    }

    // Handle GET requests - fetch locations
    if (req.method === 'GET') {
      const url = new URL(req.url);
      const id = url.searchParams.get('id');

      if (id) {
        // Get single location
        const { data, error } = await supabase
          .from('locations')
          .select('*')
          .eq('id', id)
          .single();

        if (error) {
          console.error('Error fetching location:', error);
          return new Response(
            JSON.stringify({ error: 'Location not found' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        return new Response(
          JSON.stringify({ data }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get all locations (RLS handles access control)
      const { data, error } = await supabase
        .from('locations')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching locations:', error);
        return new Response(
          JSON.stringify({ error: 'Failed to fetch locations' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ data }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Handle POST requests - create, update, delete
    if (req.method === 'POST') {
      const body = await req.json();
      const { action } = body;

      switch (action) {
        case 'create': {
          if (!userId) {
            return new Response(
              JSON.stringify({ error: 'Authentication required' }),
              { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }

          const { name, description, latitude, longitude } = body;
          
          // Server-side validation
          const validation = validateLocation({ name, description, latitude, longitude });
          if (!validation.valid) {
            return new Response(
              JSON.stringify({ error: validation.errors.join(', ') }),
              { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }

          const { data, error } = await supabase
            .from('locations')
            .insert({
              name: name.trim(),
              description: description?.trim() || null,
              latitude,
              longitude,
              created_by: userId,
            })
            .select()
            .single();

          if (error) {
            console.error('Error creating location:', error);
            return new Response(
              JSON.stringify({ error: 'Failed to create location' }),
              { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }

          console.log(`Location created: ${data.id} by user ${userId}`);
          return new Response(
            JSON.stringify({ data, message: 'Location submitted for approval' }),
            { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        case 'updateStatus': {
          if (!userId) {
            return new Response(
              JSON.stringify({ error: 'Authentication required' }),
              { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }

          if (!isAdmin) {
            return new Response(
              JSON.stringify({ error: 'Admin access required' }),
              { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }

          const { id, status } = body;

          if (!id || !['approved', 'denied'].includes(status)) {
            return new Response(
              JSON.stringify({ error: 'Invalid request: id and valid status required' }),
              { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }

          const { data, error } = await supabase
            .from('locations')
            .update({ status })
            .eq('id', id)
            .select()
            .single();

          if (error) {
            console.error('Error updating location status:', error);
            return new Response(
              JSON.stringify({ error: 'Failed to update location status' }),
              { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }

          console.log(`Location ${id} status updated to ${status} by admin ${userId}`);
          return new Response(
            JSON.stringify({ data, message: `Location ${status}` }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        case 'delete': {
          if (!userId) {
            return new Response(
              JSON.stringify({ error: 'Authentication required' }),
              { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }

          if (!isAdmin) {
            return new Response(
              JSON.stringify({ error: 'Admin access required' }),
              { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }

          const { id } = body;

          if (!id) {
            return new Response(
              JSON.stringify({ error: 'Location ID required' }),
              { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }

          const { error } = await supabase
            .from('locations')
            .delete()
            .eq('id', id);

          if (error) {
            console.error('Error deleting location:', error);
            return new Response(
              JSON.stringify({ error: 'Failed to delete location' }),
              { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }

          console.log(`Location ${id} deleted by admin ${userId}`);
          return new Response(
            JSON.stringify({ message: 'Location deleted' }),
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
    console.error('Locations function error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
