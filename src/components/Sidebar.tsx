import { useEffect, useMemo, useState } from "react";
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
  X,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useLocations } from "@/hooks/useLocations";
import { useLiveLocations } from "@/hooks/useLiveLocations";
import { cn } from "@/lib/utils";
import { Link, useLocation } from "react-router-dom";

const BG = "#15292F";
const ACCENT = "#009E61";

interface SidebarProps {
  isAddingLocation: boolean;
  onToggleAddLocation: () => void;

  /** Pass this from the parent / map click */
  selectedLocationId?: string | null;
  /** Call this when user clicks a marker or a list item */
  onSelectLocation?: (id: string) => void;
}

export function Sidebar({
  isAddingLocation,
  onToggleAddLocation,
  selectedLocationId,
  onSelectLocation,
}: SidebarProps) {
  const [isOpen, setIsOpen] = useState(false);

  const { user, isAdmin, signOut } = useAuth();
  const { approvedLocations, userLocations } = useLocations();
  const { isSharing, startSharing, stopSharing, othersLocations } =
    useLiveLocations();
  const location = useLocation();

  const handleSignOut = async () => {
    await signOut();
  };

  // Find selected location from REAL data
  const selected = useMemo(() => {
    if (!selectedLocationId) return null;
    return (
      approvedLocations.find((l) => l.id === selectedLocationId) ||
      userLocations.find((l) => l.id === selectedLocationId) ||
      null
    );
  }, [selectedLocationId, approvedLocations, userLocations]);

  // If a location gets selected, auto-open sidebar (like Google Maps)
  useEffect(() => {
    if (selectedLocationId) setIsOpen(true);
  }, [selectedLocationId]);

  return (
    <>
      {/* Mobile toggle */}
      <Button
        variant="ghost"
        size="icon"
        className={cn(
          "fixed top-16 right-5 z-50 md:hidden",
          "rounded-full border border-white/10",
          "backdrop-blur-xl shadow-lg",
        )}
        style={{ background: `${BG}cc` }}
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? (
          <X className="h-5 w-5 text-white" />
        ) : (
          <Menu className="h-5 w-5 text-white" />
        )}
      </Button>

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed right-0 top-0 h-full w-80 z-40 flex flex-col",
          "transition-all duration-300 ease-out",
          // slide + fade + slight scale
          isOpen
            ? "translate-x-0 opacity-100 scale-100"
            : "translate-x-full opacity-0 scale-[0.98] md:translate-x-0 md:opacity-100 md:scale-100",
        )}
        style={{
          background: BG,
          boxShadow: "0 20px 60px rgba(0,0,0,0.35)",
        }}
      >
        {/* Header */}
        <div
          className="p-6 border-b"
          style={{ borderColor: "rgba(255,255,255,0.08)" }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{
                background: `linear-gradient(135deg, ${ACCENT}, ${ACCENT}aa)`,
                boxShadow: `0 0 0 1px ${ACCENT}33, 0 10px 30px rgba(0,0,0,0.35)`,
              }}
            >
              <MapPin className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-lg text-white">MapExplorer</h1>
              <p className="text-xs text-white/60">Interactive 3D Maps</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Selected Location (what you clicked) */}
          {selected && (
            <div
              className="rounded-2xl p-4 border"
              style={{
                background: "rgba(255,255,255,0.04)",
                borderColor: `${ACCENT}33`,
              }}
            >
              <div className="flex items-start gap-3">
                <div
                  className="mt-1 h-2.5 w-2.5 rounded-full"
                  style={{ background: ACCENT }}
                />
                <div className="min-w-0">
                  <p className="text-xs text-white/60 mb-1">Selected</p>
                  <h2 className="text-base font-semibold text-white truncate">
                    {selected.name}
                  </h2>

                  {/* Optional fields if your DB has them */}
                  {(selected as any)?.type && (
                    <p className="text-sm text-white/70 truncate">
                      {(selected as any).type}
                    </p>
                  )}
                  {(selected as any)?.address && (
                    <p className="text-xs text-white/60 mt-2 line-clamp-2">
                      {(selected as any).address}
                    </p>
                  )}

                  <div className="flex items-center gap-2 mt-3">
                    <Button
                      size="sm"
                      className="h-8 px-3 text-white"
                      style={{ background: `${ACCENT}` }}
                      onClick={() => {
                        // optional: you can hook directions here
                      }}
                    >
                      <Navigation className="h-4 w-4 mr-2" />
                      Directions
                    </Button>

                    {(selected as any)?.website && (
                      <a
                        href={(selected as any).website}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center text-sm"
                        style={{ color: ACCENT }}
                      >
                        <ExternalLink className="h-4 w-4 mr-1" />
                        Website
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-2 gap-3">
            <div
              className="rounded-xl p-3 border"
              style={{
                background: "rgba(255,255,255,0.04)",
                borderColor: "rgba(255,255,255,0.08)",
              }}
            >
              <div className="flex items-center gap-2 text-white/60 mb-1">
                <MapPin className="h-3.5 w-3.5" style={{ color: ACCENT }} />
                <span className="text-xs">Locations</span>
              </div>
              <p className="text-2xl font-bold text-white">
                {approvedLocations.length}
              </p>
            </div>

            <div
              className="rounded-xl p-3 border"
              style={{
                background: "rgba(255,255,255,0.04)",
                borderColor: "rgba(255,255,255,0.08)",
              }}
            >
              <div className="flex items-center gap-2 text-white/60 mb-1">
                <Radio className="h-3.5 w-3.5" style={{ color: ACCENT }} />
                <span className="text-xs">Live Users</span>
              </div>
              <p className="text-2xl font-bold text-white">
                {othersLocations.length + (isSharing ? 1 : 0)}
              </p>
            </div>
          </div>

          {/* Actions */}
          {user && (
            <div className="space-y-2">
              <Button
                onClick={onToggleAddLocation}
                className={cn("w-full justify-start gap-3 border")}
                style={{
                  background: isAddingLocation
                    ? ACCENT
                    : "rgba(255,255,255,0.04)",
                  borderColor: isAddingLocation
                    ? `${ACCENT}55`
                    : "rgba(255,255,255,0.08)",
                  color: "white",
                }}
              >
                <Plus className="h-4 w-4" />
                {isAddingLocation ? "Cancel Adding" : "Add Location"}
              </Button>

              <Button
                onClick={isSharing ? stopSharing : startSharing}
                className={cn("w-full justify-start gap-3 border")}
                style={{
                  background: isSharing
                    ? `${ACCENT}`
                    : "rgba(255,255,255,0.04)",
                  borderColor: isSharing
                    ? `${ACCENT}55`
                    : "rgba(255,255,255,0.08)",
                  color: "white",
                }}
              >
                <Navigation
                  className={cn("h-4 w-4", isSharing && "animate-pulse")}
                />
                {isSharing ? "Stop Sharing Location" : "Share Live Location"}
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
                    "w-full justify-between rounded-xl",
                    location.pathname === "/admin" && "bg-white/5",
                  )}
                >
                  <div className="flex items-center gap-3 text-white">
                    <Shield className="h-4 w-4" style={{ color: ACCENT }} />
                    Admin Dashboard
                  </div>
                  <ChevronRight className="h-4 w-4 text-white/60" />
                </Button>
              </Link>
            )}

            {/* Clickable list so sidebar can also select */}
            {user && userLocations.length > 0 && (
              <div className="pt-2">
                <p className="text-xs text-white/60 px-1 mb-2">
                  Your Locations
                </p>
                <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
                  {userLocations.slice(0, 5).map((loc) => {
                    const isSelected = selectedLocationId === loc.id;

                    return (
                      <button
                        key={loc.id}
                        onClick={() => onSelectLocation?.(loc.id)}
                        className={cn(
                          "w-full text-left flex items-center gap-3 px-3 py-2 rounded-xl",
                          "transition-all duration-200",
                          isSelected ? "bg-white/8" : "hover:bg-white/5",
                        )}
                        style={{
                          border: isSelected
                            ? `1px solid ${ACCENT}55`
                            : "1px solid transparent",
                        }}
                      >
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{
                            background: isSelected
                              ? ACCENT
                              : "rgba(255,255,255,0.35)",
                          }}
                        />
                        <span className="text-sm truncate flex-1 text-white">
                          {loc.name}
                        </span>
                        <span
                          className="text-xs px-2 py-0.5 rounded-full capitalize"
                          style={{
                            background: "rgba(255,255,255,0.06)",
                            color:
                              loc.status === "approved"
                                ? ACCENT
                                : "rgba(255,255,255,0.7)",
                            border: `1px solid rgba(255,255,255,0.08)`,
                          }}
                        >
                          {loc.status}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div
          className="p-4 border-t"
          style={{ borderColor: "rgba(255,255,255,0.08)" }}
        >
          {user ? (
            <div className="flex items-center gap-3">
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center"
                style={{ background: `${ACCENT}22` }}
              >
                <Users className="h-4 w-4" style={{ color: ACCENT }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate text-white">
                  {user.email}
                </p>
                <p className="text-xs text-white/60">
                  {isAdmin ? "Administrator" : "User"}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleSignOut}
                className="rounded-full hover:bg-white/10"
              >
                <LogOut className="h-4 w-4 text-white" />
              </Button>
            </div>
          ) : (
            <Link to="/auth" className="block">
              <Button
                className="w-full hover:opacity-90 text-white"
                style={{ background: ACCENT }}
              >
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
