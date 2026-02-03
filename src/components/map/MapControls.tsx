import { Box, Layers, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface MapControlsProps {
  is3D: boolean;
  onToggle3D: () => void;
  onResetView: () => void;
  className?: string;
}

export function MapControls({
  is3D,
  onToggle3D,
  onResetView,
  className,
}: MapControlsProps) {
  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <div className="glass-panel rounded-xl p-1 flex flex-col gap-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggle3D}
              className={cn(
                'h-9 w-9 transition-colors',
                is3D && 'bg-primary/20 text-primary'
              )}
            >
              {is3D ? <Box className="h-4 w-4" /> : <Layers className="h-4 w-4" />}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">
            {is3D ? 'Switch to 2D' : 'Switch to 3D'}
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={onResetView}
              className="h-9 w-9"
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">
            Reset View
          </TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}
