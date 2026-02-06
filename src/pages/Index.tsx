import { useState, useCallback } from 'react';
import { MapView } from '@/components/map/MapView';
import { Sidebar } from '@/components/Sidebar';
import { AddLocationForm } from '@/components/map/AddLocationForm';
import { useLocations } from '@/hooks/useLocations';
import { useLiveLocations } from '@/hooks/useLiveLocations';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { useDangerAlerts } from '@/hooks/useDangerAlerts';
import { DangerAlertPopup } from '@/components/DangerAlertPopup';
import { DangerSeverityPopup } from '@/components/DangerSeverityPopup';
import { useTomTomSafetyZones } from '@/hooks/useTomTomSafetyZones';
import { mockDangerZones } from '@/data/mockDangerZones';

export default function Index() {
  const [isAddingLocation, setIsAddingLocation] = useState(false);
  const [clickedCoords, setClickedCoords] = useState<{ lng: number; lat: number } | null>(null);

  const { user } = useAuth();
  const { approvedLocations } = useLocations();
  const { othersLocations, myLocation, isSharing } = useLiveLocations();

  const userLocation = myLocation
    ? { lat: myLocation.latitude, lng: myLocation.longitude }
    : undefined;

  const { zones: tomTomZones } = useTomTomSafetyZones(userLocation);
  const combinedDangerZones = [...mockDangerZones, ...tomTomZones];

  const {
    alertStatus,
    alertZone,
    shouldShow,
    riskLevel,
    riskZone,
    shouldShowRisk,
    dismiss,
    dismissRisk,
  } = useDangerAlerts(userLocation, tomTomZones);

  const handleToggleAddLocation = useCallback(() => {
    if (!user) {
      toast.error('Please sign in to add locations');
      return;
    }
    setIsAddingLocation(!isAddingLocation);
    setClickedCoords(null);
  }, [user, isAddingLocation]);

  const handleMapClick = useCallback((lng: number, lat: number) => {
    if (isAddingLocation && user) {
      setClickedCoords({ lng, lat });
    }
  }, [isAddingLocation, user]);

  const handleFormClose = useCallback(() => {
    setClickedCoords(null);
  }, []);

  const handleFormSuccess = useCallback(() => {
    setClickedCoords(null);
    setIsAddingLocation(false);
  }, []);

  // Combine live locations
  const allLiveLocations = isSharing && myLocation 
    ? [...othersLocations, myLocation]
    : othersLocations;

  return (
    <div className="h-screen w-screen overflow-hidden bg-background">
      {/* Map */}
      <div className="absolute inset-0 md:right-80">
        <MapView
          locations={approvedLocations}
          liveLocations={allLiveLocations}
          onMapClick={handleMapClick}
          isAddingLocation={isAddingLocation}
          userLocation={userLocation}
          dangerZones={combinedDangerZones}
        />
      </div>

      {shouldShowRisk && riskZone && (
        <DangerSeverityPopup
          level={riskLevel as 'low' | 'medium' | 'high'}
          offsetBottom={shouldShow ? 110 : 16}
          onDismiss={dismissRisk}
        />
      )}

      {shouldShow && alertZone && (
        <DangerAlertPopup
          status={alertStatus as 'warning' | 'danger'}
          title={alertZone.title}
          message={alertZone.message}
          onDismiss={dismiss}
        />
      )}

      {/* Sidebar */}
      <Sidebar
        isAddingLocation={isAddingLocation}
        onToggleAddLocation={handleToggleAddLocation}
      />

      {/* Add Location Form Modal */}
      {clickedCoords && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <AddLocationForm
            latitude={clickedCoords.lat}
            longitude={clickedCoords.lng}
            onClose={handleFormClose}
            onSuccess={handleFormSuccess}
          />
        </div>
      )}
    </div>
  );
}
