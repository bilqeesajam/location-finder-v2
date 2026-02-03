import { Location } from '@/hooks/useLocations';
import { MapPin, Clock } from 'lucide-react';
import { format } from 'date-fns';

interface LocationPopupProps {
  location: Location;
}

export function LocationPopup({ location }: LocationPopupProps) {
  return (
    <div className="p-4 min-w-[220px] max-w-[300px]">
      <h3 className="font-semibold text-foreground text-lg mb-1 flex items-center gap-2">
        <MapPin className="h-4 w-4 text-primary" />
        {location.name}
      </h3>
      
      {location.description && (
        <p className="text-muted-foreground text-sm mb-3 leading-relaxed">
          {location.description}
        </p>
      )}
      
      <div className="flex flex-col gap-1 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <span className="font-mono">
            {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <Clock className="h-3 w-3" />
          <span>{format(new Date(location.created_at), 'MMM d, yyyy')}</span>
        </div>
      </div>
    </div>
  );
}
