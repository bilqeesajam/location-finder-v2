import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { cache, cacheKeys, cacheTTL } from '@/lib/cache';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export interface LiveLocation {
  id: string;
  user_id: string;
  latitude: number;
  longitude: number;
  updated_at: string;
}

export function useLiveLocations() {
  const [liveLocations, setLiveLocations] = useState<LiveLocation[]>([]);
  const [isSharing, setIsSharing] = useState(false);
  const { user } = useAuth();
  const watchIdRef = useRef<number | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Fetch live locations directly from database with caching
  const fetchLiveLocations = useCallback(async () => {
    const cacheKey = cacheKeys.allLiveLocations();
    
    // Check cache first
    const cachedLocations = cache.get<LiveLocation[]>(cacheKey);
    if (cachedLocations) {
      console.log('Cache hit for live locations');
      setLiveLocations(cachedLocations);
      return;
    }

    const { data, error } = await supabase
      .from('live_locations')
      .select('*');

    if (error) {
      console.error('Error fetching live locations:', error);
    } else {
      const locationData = data as LiveLocation[] || [];
      setLiveLocations(locationData);
      // Cache live locations for 30 seconds (real-time data)
      cache.set(cacheKey, locationData, cacheTTL.VERY_SHORT);
    }
  }, []);

  // Subscribe to realtime updates
  useEffect(() => {
    fetchLiveLocations();

    channelRef.current = supabase
      .channel('live-locations')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'live_locations',
        },
        () => {
          // Invalidate cache on realtime updates
          cache.deleteByPattern('live_locations:.*');
          fetchLiveLocations();
        }
      )
      .subscribe();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [fetchLiveLocations]);

  // Update user's live location
  const updateMyLocation = useCallback(async (latitude: number, longitude: number) => {
    if (!user) return;

    const { error } = await supabase
      .from('live_locations')
      .upsert({
        user_id: user.id,
        latitude,
        longitude,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id',
      });

    if (error) {
      console.error('Error updating location:', error);
    } else {
      // Invalidate cache after update
      cache.deleteByPattern('live_locations:.*');
    }
  }, [user]);

  // Start sharing location
  const startSharing = useCallback(() => {
    if (!user) {
      toast.error('You must be logged in to share your location');
      return;
    }

    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser');
      return;
    }

    setIsSharing(true);
    toast.success('Started sharing your location');

    // Get initial position
    navigator.geolocation.getCurrentPosition(
      (position) => {
        updateMyLocation(position.coords.latitude, position.coords.longitude);
      },
      (error) => {
        console.error('Geolocation error:', error);
        toast.error('Failed to get your location');
        setIsSharing(false);
      },
      { enableHighAccuracy: true }
    );

    // Watch for position changes
    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        updateMyLocation(position.coords.latitude, position.coords.longitude);
      },
      (error) => {
        console.error('Geolocation watch error:', error);
      },
      { enableHighAccuracy: true, maximumAge: 5000 }
    );
  }, [user, updateMyLocation]);

  // Stop sharing location
  const stopSharing = useCallback(async () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }

    if (user) {
      const { error } = await supabase
        .from('live_locations')
        .delete()
        .eq('user_id', user.id);

      if (error) {
        console.error('Error stopping location sharing:', error);
      }
    }

    setIsSharing(false);
    toast.success('Stopped sharing your location');
  }, [user]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  // Filter out current user's location
  const othersLocations = liveLocations.filter(l => l.user_id !== user?.id);
  const myLocation = liveLocations.find(l => l.user_id === user?.id);

  return {
    liveLocations,
    othersLocations,
    myLocation,
    isSharing,
    startSharing,
    stopSharing,
  };
}
