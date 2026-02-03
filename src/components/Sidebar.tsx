import { useState } from 'react';
import { 
  MapPin, 
  Users, 
  LogIn, 
  LogOut, 
  Plus, 
  Shield, 
  Navigation,
  ChevronRight,
  Radio,
  Menu,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useLocations } from '@/hooks/useLocations';
import { useLiveLocations } from '@/hooks/useLiveLocations';
import { cn } from '@/lib/utils';
import { Link, useLocation } from 'react-router-dom';

interface SidebarProps {
  isAddingLocation: boolean;
  onToggleAddLocation: () => void;
}

export function Sidebar({ isAddingLocation, onToggleAddLocation }: SidebarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { user, isAdmin, signOut } = useAuth();
  const { approvedLocations, userLocations } = useLocations();
  const { isSharing, startSharing, stopSharing, othersLocations } = useLiveLocations();
  const location = useLocation();

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <>
      {/* Mobile toggle */}
      <Button
        variant="ghost"
        size="icon"
        className="fixed top-4 right-4 z-50 md:hidden glass-panel"
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </Button>

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed right-0 top-0 h-full w-80 glass-panel z-40 flex flex-col transition-transform duration-300',
          'md:translate-x-0',
          isOpen ? 'translate-x-0' : 'translate-x-full md:translate-x-0'
        )}
      >
        {/* Header */}
        <div className="p-6 border-b border-border/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-primary flex items-center justify-center shadow-glow">
              <MapPin className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-bold text-lg">MapExplorer</h1>
              <p className="text-xs text-muted-foreground">Interactive 3D Maps</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Stats */}
          <div className="grid grid-cols-2 gap-3">
            <div className="glass-panel rounded-xl p-3 bg-secondary/30">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <MapPin className="h-3.5 w-3.5" />
                <span className="text-xs">Locations</span>
              </div>
              <p className="text-2xl font-bold">{approvedLocations.length}</p>
            </div>
            <div className="glass-panel rounded-xl p-3 bg-secondary/30">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Radio className="h-3.5 w-3.5" />
                <span className="text-xs">Live Users</span>
              </div>
              <p className="text-2xl font-bold">{othersLocations.length + (isSharing ? 1 : 0)}</p>
            </div>
          </div>

          {/* Actions */}
          {user && (
            <div className="space-y-2">
              <Button
                onClick={onToggleAddLocation}
                variant={isAddingLocation ? 'default' : 'secondary'}
                className={cn(
                  'w-full justify-start gap-3',
                  isAddingLocation && 'bg-gradient-primary'
                )}
              >
                <Plus className="h-4 w-4" />
                {isAddingLocation ? 'Cancel Adding' : 'Add Location'}
              </Button>

              <Button
                onClick={isSharing ? stopSharing : startSharing}
                variant={isSharing ? 'default' : 'secondary'}
                className={cn(
                  'w-full justify-start gap-3',
                  isSharing && 'bg-success hover:bg-success/90'
                )}
              >
                <Navigation className={cn('h-4 w-4', isSharing && 'animate-pulse')} />
                {isSharing ? 'Stop Sharing Location' : 'Share Live Location'}
              </Button>
            </div>
          )}

          {/* Navigation */}
          <div className="space-y-1">
            {isAdmin && (
              <Link to="/admin">
                <Button
                  variant="ghost"
                  className={cn(
                    'w-full justify-between',
                    location.pathname === '/admin' && 'bg-secondary'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <Shield className="h-4 w-4 text-warning" />
                    Admin Dashboard
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </Button>
              </Link>
            )}

            {user && userLocations.length > 0 && (
              <div className="pt-4">
                <p className="text-xs text-muted-foreground px-3 mb-2">Your Locations</p>
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {userLocations.slice(0, 5).map((loc) => (
                    <div
                      key={loc.id}
                      className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-secondary/50 transition-colors"
                    >
                      <div
                        className={cn(
                          'w-2 h-2 rounded-full',
                          loc.status === 'approved' && 'bg-success',
                          loc.status === 'pending' && 'bg-warning',
                          loc.status === 'denied' && 'bg-destructive'
                        )}
                      />
                      <span className="text-sm truncate flex-1">{loc.name}</span>
                      <span
                        className={cn(
                          'text-xs px-2 py-0.5 rounded-full capitalize',
                          loc.status === 'approved' && 'status-approved',
                          loc.status === 'pending' && 'status-pending',
                          loc.status === 'denied' && 'status-denied'
                        )}
                      >
                        {loc.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border/50">
          {user ? (
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center">
                <Users className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{user.email}</p>
                <p className="text-xs text-muted-foreground">
                  {isAdmin ? 'Administrator' : 'User'}
                </p>
              </div>
              <Button variant="ghost" size="icon" onClick={handleSignOut}>
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <Link to="/auth" className="block">
              <Button className="w-full bg-gradient-primary hover:opacity-90">
                <LogIn className="h-4 w-4 mr-2" />
                Sign In
              </Button>
            </Link>
          )}
        </div>
      </aside>
    </>
  );
}
