import * as React from "react";
import {
  MapPin,
  Clock3,
  Star,
  Menu,
  X,
  Layers,
  Check,
  Mountain,
  Bus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useLocations } from "@/hooks/useLocations";
import type { Location } from "@/hooks/useLocations";

const BG = "#15292F";
const ACCENT = "#009E61";

export type SuggestedPlace = {
  id: string;
  name: string;
  category?: string;
  rating?: number;
  distanceKm?: number;
  statusLine?: string;
  imageUrl?: string;
  latitude: number;
  longitude: number;
};

interface SidebarProps {
  suggested?: SuggestedPlace[];
  maxSuggested?: number;
}

const FLY_EVENT = "findr:flyto";
const LAYERS_EVENT = "findr:layers";

/* ---------- helpers ---------- */

function uniqById<T extends { id: string }>(items: T[]) {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const i of items) {
    if (seen.has(i.id)) continue;
    seen.add(i.id);
    out.push(i);
  }
  return out;
}

function toSuggestedPlace(loc: Location): SuggestedPlace {
  return {
    id: loc.id,
    name: loc.name,
    category: "Saved location",
    statusLine: "Saved in Findr",
    latitude: loc.latitude,
    longitude: loc.longitude,
  };
}

function clampNum(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

/* ---------- component ---------- */

export function Sidebar({ suggested, maxSuggested = 12 }: SidebarProps) {
  // Suggested panel closed on load
  const [open, setOpen] = React.useState(false);

  const { approvedLocations, userLocations } = useLocations();

  const dbPlaces = React.useMemo(() => {
    const merged = uniqById([
      ...(approvedLocations ?? []),
      ...(userLocations ?? []),
    ]);
    return merged.map(toSuggestedPlace);
  }, [approvedLocations, userLocations]);

  const allPlaces: SuggestedPlace[] = React.useMemo(() => {
    return uniqById([...(dbPlaces ?? []), ...((suggested ?? []) as any[])]);
  }, [dbPlaces, suggested]);

  const suggestedList = React.useMemo(() => {
    return allPlaces.slice(0, clampNum(maxSuggested, 1, 100));
  }, [allPlaces, maxSuggested]);

  const flyToPlace = React.useCallback((p: SuggestedPlace) => {
    window.dispatchEvent(
      new CustomEvent(FLY_EVENT, {
        detail: { lng: p.longitude, lat: p.latitude, label: p.name, zoom: 16 },
      }),
    );
    if (window.innerWidth < 768) setOpen(false);
  }, []);

  /* ---------- Layers (ONLY terrain + transit) ---------- */

  const [layersOpen, setLayersOpen] = React.useState(false);

  // base: only terrain exists now (kept for future wiring if you want)
  const [base] = React.useState<"terrain">("terrain");

  // transit toggle (this is the only tile toggle now)
  const [uiTiles, setUiTiles] = React.useState({
    transit: false,
  });

  // overlays MapView uses
  const [layerState, setLayerState] = React.useState({
    savedPins: true,
    suggestedPins: true,
    busStops: true,
    busRoutes: true,
    livePeople: true,
  });

  const toggleLayer = (key: keyof typeof layerState) =>
    setLayerState((s) => ({ ...s, [key]: !s[key] }));

  // broadcast to MapView
  React.useEffect(() => {
    window.dispatchEvent(
      new CustomEvent(LAYERS_EVENT, {
        detail: {
          ...layerState,
          base, // still sent (terrain)
          transit: uiTiles.transit,
        },
      }),
    );
  }, [layerState, base, uiTiles.transit]);

  // close on ESC
  React.useEffect(() => {
    if (!layersOpen) return;
    const onKey = (e: KeyboardEvent) =>
      e.key === "Escape" && setLayersOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [layersOpen]);

  return (
    <>
      {/* Suggested toggle button */}
      <button
        className={cn(
          "fixed left-4 top-4 z-50",
          "h-11 w-11 rounded-full border backdrop-blur-xl shadow-lg",
          "grid place-items-center transition hover:scale-[1.02] active:scale-[0.98]",
          open ? "md:hidden" : "md:grid",
        )}
        style={{
          background: `${BG}cc`,
          borderColor: "rgba(255,255,255,0.12)",
        }}
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Close sidebar" : "Open sidebar"}
      >
        {open ? (
          <X className="h-5 w-5 text-white" />
        ) : (
          <Menu className="h-5 w-5 text-white" />
        )}
      </button>

      {/* Backdrop on mobile for suggested */}
      <div
        className={cn(
          "fixed inset-0 z-40 md:hidden transition-opacity",
          open
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none",
        )}
        style={{ background: "rgba(0,0,0,0.35)" }}
        onClick={() => setOpen(false)}
      />

      {/* Suggested Places panel */}
      <aside
        className={cn(
          "fixed z-50 md:z-40",
          "left-4 top-4",
          "flex flex-col gap-4",
          "transition-transform duration-300 ease-out",
          open ? "translate-x-0" : "-translate-x-[110%]",
        )}
        style={{
          width: "clamp(280px, 28vw, 360px)",
          maxHeight: "calc(100vh - 2rem)",
        }}
      >
        <GlassCard className="flex flex-col min-h-0">
          <div className="px-5 pt-5 pb-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className="relative h-10 w-10 rounded-2xl overflow-hidden">
                  <div
                    className="absolute inset-0"
                    style={{
                      background: `radial-gradient(circle at 30% 30%, ${ACCENT} 0%, rgba(0,0,0,0) 55%), ${BG}`,
                    }}
                  />
                  <div className="absolute inset-0 grid place-items-center">
                    <MapPin className="h-5 w-5 text-white" />
                  </div>
                </div>
                <div className="leading-tight">
                  <div className="text-white font-semibold">Findr</div>
                  <div className="text-white/55 text-xs -mt-0.5">
                    Suggested Places
                  </div>
                </div>
              </div>

              <button
                className={cn(
                  "hidden md:grid",
                  "h-10 w-10 rounded-2xl border place-items-center",
                  "transition hover:bg-white/5 active:scale-[0.98]",
                )}
                style={{ borderColor: "rgba(255,255,255,0.10)" }}
                onClick={() => setOpen(false)}
                aria-label="Collapse sidebar"
                title="Collapse"
              >
                <X className="h-5 w-5 text-white" />
              </button>
            </div>
          </div>

          <div className="px-4 pb-4 min-h-0">
            <div
              className="space-y-3 overflow-y-auto pr-1 scrollbar-hide"
              style={{ maxHeight: "min(52vh, 420px)" }}
            >
              {suggestedList.map((p, idx) => (
                <button
                  key={p.id}
                  onClick={() => flyToPlace(p)}
                  className={cn(
                    "w-full text-left rounded-2xl px-3 py-3",
                    "transition hover:bg-white/5 active:scale-[0.99]",
                  )}
                >
                  <div className="flex gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="text-white text-sm font-semibold truncate">
                        {p.name}
                      </div>

                      {p.category && (
                        <div className="text-white/55 text-xs truncate mt-0.5">
                          {p.category}
                        </div>
                      )}

                      <div className="flex items-center gap-2 mt-1">
                        {typeof p.rating === "number" && (
                          <div className="flex items-center gap-1 text-xs text-white/65">
                            <Star
                              className="h-3 w-3"
                              style={{ color: ACCENT }}
                            />
                            <span>{p.rating.toFixed(1)}</span>
                          </div>
                        )}
                        {typeof p.distanceKm === "number" && (
                          <div className="text-xs text-white/55">
                            {p.distanceKm.toFixed(1)} km
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 mt-1">
                        <Clock3 className="h-3.5 w-3.5 text-white/45" />
                        <div className="text-xs" style={{ color: ACCENT }}>
                          {p.statusLine ?? ""}
                        </div>
                      </div>
                    </div>

                    <div
                      className="h-12 w-12 rounded-2xl border shrink-0 overflow-hidden"
                      style={{
                        borderColor: "rgba(255,255,255,0.10)",
                        background: p.imageUrl
                          ? undefined
                          : idx % 2 === 0
                            ? "rgba(255,255,255,0.06)"
                            : "rgba(0,0,0,0.18)",
                      }}
                    >
                      {p.imageUrl ? (
                        <img
                          src={p.imageUrl}
                          alt={p.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="h-full w-full grid place-items-center">
                          <div
                            className="h-6 w-6 rounded-full"
                            style={{
                              background: `${ACCENT}26`,
                              border: `1px solid ${ACCENT}33`,
                            }}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </GlassCard>
      </aside>

      {/* ✅ Layers button LEFT + 20px higher */}
      <div className="fixed z-50 left-4 bottom-[calc(1rem+20px)]">
        <div className="relative">
          <button
            onClick={() => setLayersOpen((v) => !v)}
            className={cn(
              "h-12 w-12 rounded-2xl border shadow-[0_20px_60px_rgba(0,0,0,0.35)] backdrop-blur-xl",
              "grid place-items-center transition hover:scale-[1.02] active:scale-[0.98]",
            )}
            style={{
              background: `${BG}e6`,
              borderColor: "rgba(255,255,255,0.10)",
            }}
            aria-label="Layers"
            title="Layers"
          >
            <Layers className="h-5 w-5" style={{ color: ACCENT }} />
          </button>

          {/* click-away */}
          {layersOpen && (
            <div
              className="fixed inset-0 z-40"
              onClick={() => setLayersOpen(false)}
            />
          )}

          {/* ✅ Popup NEXT to button + SAME COLOR + scrollable */}
          {layersOpen && (
            <div
              className={cn(
                "absolute left-[60px] bottom-0 z-50",
                "w-[360px] max-w-[calc(100vw-88px)]",
                "rounded-[22px] border overflow-hidden",
                "shadow-[0_22px_70px_rgba(0,0,0,0.45)] backdrop-blur-xl",
              )}
              style={{
                background: `${BG}e6`,
                borderColor: "rgba(255,255,255,0.10)",
                maxHeight: "min(72vh, 520px)",
              }}
            >
              <div className="px-4 pt-4 pb-3 flex items-center justify-between">
                <div className="leading-tight">
                  <div className="text-white font-semibold text-sm">
                    Map type
                  </div>
                  <div className="text-white/55 text-xs -mt-0.5">
                    Terrain + Transit + overlays
                  </div>
                </div>

                <button
                  className={cn(
                    "h-9 w-9 rounded-2xl border grid place-items-center",
                    "transition hover:bg-white/5 active:scale-[0.98]",
                  )}
                  style={{ borderColor: "rgba(255,255,255,0.10)" }}
                  onClick={() => setLayersOpen(false)}
                  aria-label="Close layers"
                  title="Close"
                >
                  <X className="h-4 w-4 text-white" />
                </button>
              </div>

              {/* scroll body */}
              <div
                className="px-4 pb-4 overflow-y-auto scrollbar-hide"
                style={{ maxHeight: "min(72vh, 520px)" }}
              >
                {/* Terrain (always selected) */}
                <div className="grid grid-cols-2 gap-2">
                  <BigBaseTile
                    label="Terrain"
                    active
                    onClick={() => {
                      /* terrain is always on */
                    }}
                    icon={<Mountain className="h-5 w-5 text-white/90" />}
                    subtitle="Default"
                  />

                  {/* Transit toggle */}
                  <BigBaseTile
                    label="Transit"
                    active={uiTiles.transit}
                    onClick={() =>
                      setUiTiles((s) => ({ ...s, transit: !s.transit }))
                    }
                    icon={<Bus className="h-5 w-5 text-white/90" />}
                    subtitle={uiTiles.transit ? "On" : "Off"}
                  />
                </div>

                {/* Overlays */}
                <div className="mt-4">
                  <div className="text-white/70 text-xs font-medium mb-2">
                    Overlays
                  </div>
                  <div className="space-y-2">
                    <LayerToggle
                      label="Saved pins"
                      enabled={layerState.savedPins}
                      onClick={() => toggleLayer("savedPins")}
                    />
                    <LayerToggle
                      label="Suggested pins"
                      enabled={layerState.suggestedPins}
                      onClick={() => toggleLayer("suggestedPins")}
                    />
                    <LayerToggle
                      label="Bus stops"
                      enabled={layerState.busStops}
                      onClick={() => toggleLayer("busStops")}
                    />
                    <LayerToggle
                      label="Bus routes"
                      enabled={layerState.busRoutes}
                      onClick={() => toggleLayer("busRoutes")}
                    />
                    <LayerToggle
                      label="Live people"
                      enabled={layerState.livePeople}
                      onClick={() => toggleLayer("livePeople")}
                    />
                  </div>

                  <button
                    className="mt-3 w-full rounded-2xl border px-3 py-2 flex items-center justify-between hover:bg-white/5 transition"
                    style={{ borderColor: "rgba(255,255,255,0.10)" }}
                    onClick={() => setLayersOpen(false)}
                  >
                    <span className="text-white/80 text-sm">Done</span>
                    <span className="text-white/45 text-xs">Close</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

/* ---------- UI pieces ---------- */

function GlassCard({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "rounded-[28px] border shadow-[0_30px_80px_rgba(0,0,0,0.38)] backdrop-blur-xl overflow-hidden",
        className,
      )}
      style={{
        background: `${BG}e6`,
        borderColor: "rgba(255,255,255,0.10)",
      }}
    >
      {children}
    </div>
  );
}

function BigBaseTile({
  label,
  icon,
  active,
  onClick,
  subtitle,
}: {
  label: string;
  icon: React.ReactNode;
  active: boolean;
  onClick: () => void;
  subtitle?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-2xl border px-3 py-3 text-left transition hover:bg-white/5",
      )}
      style={{
        borderColor: active ? `${ACCENT}66` : "rgba(255,255,255,0.10)",
        boxShadow: active ? `0 0 0 1px ${ACCENT}55 inset` : undefined,
      }}
    >
      <div className="flex items-center gap-2">
        <div
          className="h-10 w-10 rounded-2xl grid place-items-center border"
          style={{
            borderColor: "rgba(255,255,255,0.10)",
            background: "rgba(0,0,0,0.20)",
          }}
        >
          {icon}
        </div>
        <div>
          <div className="text-white text-sm font-semibold">{label}</div>
          <div className="text-white/55 text-xs -mt-0.5">
            {subtitle ?? (active ? "Selected" : "Tap to select")}
          </div>
        </div>
      </div>
    </button>
  );
}

function LayerToggle({
  label,
  enabled,
  onClick,
}: {
  label: string;
  enabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full rounded-2xl border px-3 py-2",
        "flex items-center justify-between",
        "transition hover:bg-white/5 active:scale-[0.99]",
      )}
      style={{
        borderColor: "rgba(255,255,255,0.10)",
        background: enabled ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.14)",
      }}
    >
      <div className="text-sm text-white/90">{label}</div>
      <div
        className={cn(
          "h-8 w-8 rounded-xl grid place-items-center border",
          enabled ? "" : "opacity-70",
        )}
        style={{
          borderColor: enabled ? `${ACCENT}55` : "rgba(255,255,255,0.12)",
          color: enabled ? ACCENT : "rgba(255,255,255,0.55)",
        }}
      >
        {enabled ? (
          <Check className="h-4 w-4" />
        ) : (
          <span className="text-xs">—</span>
        )}
      </div>
    </button>
  );
}
