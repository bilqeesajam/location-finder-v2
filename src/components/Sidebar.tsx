import * as React from "react";
import {
  Search,
  Bus,
  PersonStanding,
  Car,
  ArrowUpDown,
  MapPin,
  Clock3,
  Star,
  Menu,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useLocations } from "@/hooks/useLocations";
import type { Location } from "@/hooks/useLocations";

const BG = "#15292F";
const ACCENT = "#009E61";

type TransportMode = "drive" | "walk" | "transit";

export type SuggestedPlace = {
  id: string;
  name: string;
  category?: string;
  rating?: number;
  distanceKm?: number;
  statusLine?: string;
  imageUrl?: string;

  // required for flyTo + routing
  latitude: number;
  longitude: number;
};

type RouteItem = {
  id: string;
  title: string;
  subtitle?: string;
  timeMin: number;
  distanceKm: number;
  isFastest?: boolean;
  severity?: "ok" | "warn" | "bad";
};

interface SidebarProps {
  /** “places on the map” (geocode / nearby results etc). DB places will show first. */
  suggested?: SuggestedPlace[];
  defaultMode?: TransportMode;
  maxSuggested?: number;
}

const FLY_EVENT = "findr:flyto";

// Walking realism (OSRM walk can be optimistic) — adjust if needed
const WALK_REALISM = 1.18; // 👈 change if walk still too fast (1.10–1.35)

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

async function fetchOsrmRoute(
  profile: "driving" | "walking",
  from: { lng: number; lat: number },
  to: { lng: number; lat: number },
) {
  const url =
    `https://router.project-osrm.org/route/v1/${profile}` +
    `/${from.lng},${from.lat};${to.lng},${to.lat}` +
    `?overview=false&alternatives=true&steps=false`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`OSRM error ${res.status}`);
  const data = await res.json();
  if (!data?.routes?.length) throw new Error("No route found");
  return data.routes as Array<{ duration: number; distance: number }>;
}

function toMin(sec: number) {
  // ✅ ceil so we never underestimate
  return Math.max(1, Math.ceil(sec / 60));
}

function toKm(m: number) {
  return Math.max(0.1, Math.round((m / 1000) * 10) / 10);
}

function estimateTransitSeconds(drivingSeconds: number) {
  // Better-than-nothing bus estimate without real timetables
  const waitBuffer = 6 * 60;
  const slowerFactor = 1.45;
  return drivingSeconds * slowerFactor + waitBuffer;
}

function clampNum(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

/* ---------- component ---------- */

export function Sidebar({
  suggested,
  defaultMode = "drive",
  maxSuggested = 12,
}: SidebarProps) {
  const [mode, setMode] = React.useState<TransportMode>(defaultMode);
  const [fromQuery, setFromQuery] = React.useState("");
  const [toQuery, setToQuery] = React.useState("");
  const [fromPlace, setFromPlace] = React.useState<SuggestedPlace | null>(null);
  const [toPlace, setToPlace] = React.useState<SuggestedPlace | null>(null);
  const directionsRef = React.useRef<HTMLDivElement>(null);

  // Collapsible: open on desktop by default
  const [open, setOpen] = React.useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    return window.innerWidth >= 768;
  });

  // ✅ don't force-open on desktop resize (respects user collapsing)
  React.useEffect(() => {
    const onResize = () => {
      // Only auto-close when going to mobile; don't auto-open on desktop
      if (window.innerWidth < 768) setOpen(false);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Listen for direction button clicks
  React.useEffect(() => {
    const handleShowDirections = () => {
      setOpen(true);
      // Scroll to directions after sidebar opens
      setTimeout(() => {
        directionsRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }, 100);
    };
    window.addEventListener("findr:show-directions", handleShowDirections);
    return () =>
      window.removeEventListener("findr:show-directions", handleShowDirections);
  }, []);

  // DB locations (saved)
  const { approvedLocations, userLocations } = useLocations();

  const dbPlaces = React.useMemo(() => {
    const merged = uniqById([
      ...(approvedLocations ?? []),
      ...(userLocations ?? []),
    ]);
    return merged.map(toSuggestedPlace);
  }, [approvedLocations, userLocations]);

  // ✅ DB FIRST, then map places
  const allPlaces: SuggestedPlace[] = React.useMemo(() => {
    return uniqById([
      ...(dbPlaces ?? []),
      ...((suggested ?? []) as SuggestedPlace[]),
    ]);
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

  // Autocomplete
  const fromMatches = React.useMemo(() => {
    const q = fromQuery.trim().toLowerCase();
    if (!q) return allPlaces.slice(0, 40);
    return allPlaces
      .filter((p) => p.name.toLowerCase().includes(q))
      .slice(0, 60);
  }, [fromQuery, allPlaces]);

  const toMatches = React.useMemo(() => {
    const q = toQuery.trim().toLowerCase();
    if (!q) return allPlaces.slice(0, 40);
    return allPlaces
      .filter((p) => p.name.toLowerCase().includes(q))
      .slice(0, 60);
  }, [toQuery, allPlaces]);

  // Routes state
  const [fastest, setFastest] = React.useState<RouteItem | null>(null);
  const [alternatives, setAlternatives] = React.useState<RouteItem[]>([]);
  const [loadingRoutes, setLoadingRoutes] = React.useState(false);
  const [routeError, setRouteError] = React.useState<string | null>(null);

  // Compute routes on (from,to,mode)
  React.useEffect(() => {
    const run = async () => {
      if (!fromPlace || !toPlace) return;

      setLoadingRoutes(true);
      setRouteError(null);

      try {
        const from = { lng: fromPlace.longitude, lat: fromPlace.latitude };
        const to = { lng: toPlace.longitude, lat: toPlace.latitude };

        const [driveRoutes, walkRoutesRaw] = await Promise.all([
          fetchOsrmRoute("driving", from, to),
          fetchOsrmRoute("walking", from, to),
        ]);

        // ✅ realistic walking
        const walkRoutes = walkRoutesRaw.map((r) => ({
          ...r,
          duration: r.duration * WALK_REALISM,
        }));

        let chosen: Array<{ duration: number; distance: number }> = [];
        let title = "";
        let subtitle0 = "Fastest option";
        let subtitle1 = "Alternative";

        if (mode === "walk") {
          chosen = walkRoutes;
          title = "Walking route";
        } else if (mode === "transit") {
          chosen = driveRoutes.map((r) => ({
            duration: estimateTransitSeconds(r.duration),
            distance: r.distance,
          }));
          title = "Bus / transit estimate";
          subtitle0 = "Estimate (no timetable yet)";
          subtitle1 = "Alternative estimate";
        } else {
          chosen = driveRoutes;
          title = "Driving route";
        }

        const items: RouteItem[] = chosen.slice(0, 2).map((r, idx) => ({
          id: `${mode}-${idx}`,
          title,
          subtitle: idx === 0 ? subtitle0 : subtitle1,
          timeMin: toMin(r.duration),
          distanceKm: toKm(r.distance),
          isFastest: idx === 0,
          severity: idx === 0 ? "ok" : "warn",
        }));

        setFastest(items[0] ?? null);
        setAlternatives(items.slice(1));

        flyToPlace(toPlace);
      } catch (err: any) {
        setFastest(null);
        setAlternatives([]);
        setRouteError(err?.message ?? "Failed to compute route");
      } finally {
        setLoadingRoutes(false);
      }
    };

    run();
  }, [fromPlace, toPlace, mode, flyToPlace]);

  const swap = React.useCallback(() => {
    const oldFrom = fromPlace;
    const oldTo = toPlace;
    const oldFromQ = fromQuery;
    const oldToQ = toQuery;

    setFromPlace(oldTo);
    setToPlace(oldFrom);
    setFromQuery(oldTo ? oldTo.name : oldToQ);
    setToQuery(oldFrom ? oldFrom.name : oldFromQ);
  }, [fromPlace, toPlace, fromQuery, toQuery]);

  return (
    <>
      {/* ✅ Toggle button:
          - Mobile: always visible (open/close)
          - Desktop: visible ONLY when sidebar is collapsed (so you can re-open)
      */}
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

      {/* Backdrop on mobile */}
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

      {/* Sidebar column */}
      <aside
        className={cn(
          "fixed z-50 md:z-40",
          "left-4 top-4",
          "flex flex-col gap-4",
          "transition-transform duration-300 ease-out",
          // ✅ collapses on desktop too
          open ? "translate-x-0" : "-translate-x-[110%]",
        )}
        style={{
          width: "clamp(280px, 28vw, 360px)",
          maxHeight: "calc(100vh - 2rem)",
        }}
      >
        {/* TOP: Suggested Places */}
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

              {/* ✅ Collapse button on top of suggested card */}
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

          {/* Scrollable list */}
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

        {/* BOTTOM: Directions */}
        <GlassCard ref={directionsRef} className="flex flex-col min-h-0">
          {/* Transport Mode Buttons */}
          <div
            className="px-4 pt-4 pb-3 border-b"
            style={{ borderColor: "rgba(255,255,255,0.08)" }}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 flex-1">
                <TransportModeButton
                  active={mode === "drive"}
                  onClick={() => setMode("drive")}
                  icon={<Car className="h-5 w-5" />}
                />
                <TransportModeButton
                  active={mode === "walk"}
                  onClick={() => setMode("walk")}
                  icon={<PersonStanding className="h-5 w-5" />}
                />
                <TransportModeButton
                  active={mode === "transit"}
                  onClick={() => setMode("transit")}
                  icon={<Bus className="h-5 w-5" />}
                />
              </div>
            </div>
          </div>

          {/* Input Fields */}
          <div className="px-4 pt-4 pb-3">
            <div className="flex gap-2">
              {/* Swap Button */}
              <button
                onClick={swap}
                className="h-[44px] w-[44px] shrink-0 rounded-xl border grid place-items-center transition hover:bg-white/5"
                style={{ borderColor: "rgba(255,255,255,0.12)" }}
                title="Swap locations"
              >
                <ArrowUpDown className="h-4 w-4 text-white/70" />
              </button>

              {/* Input Fields Column */}
              <div className="flex-1 space-y-2">
                {/* Starting Point */}
                <DirectionInputRow
                  icon={<Search className="h-4 w-4 text-white/60" />}
                  placeholder="Choose starting point, or click on the map..."
                  value={fromQuery}
                  onChange={(v) => {
                    setFromQuery(v);
                    setFromPlace(null);
                  }}
                  options={fromMatches}
                  onPick={(p) => {
                    setFromPlace(p);
                    setFromQuery(p.name);
                    flyToPlace(p);
                  }}
                />

                {/* Destination */}
                <DirectionInputRow
                  icon={<MapPin className="h-4 w-4 text-white/60" />}
                  placeholder="Choose destination..."
                  value={toQuery}
                  onChange={(v) => {
                    setToQuery(v);
                    setToPlace(null);
                  }}
                  options={toMatches}
                  onPick={(p) => {
                    setToPlace(p);
                    setToQuery(p.name);
                    flyToPlace(p);
                  }}
                />
              </div>
            </div>
          </div>

          {/* Routes Display */}
          {(fromPlace || toPlace) && (
            <div className="px-4 pb-4 min-h-0">
              <div
                className="overflow-y-auto pr-1 scrollbar-hide space-y-3"
                style={{ maxHeight: "40vh" }}
              >
                {!fromPlace || !toPlace ? (
                  <div className="text-xs text-white/50 px-2">
                    Select both locations to calculate route
                  </div>
                ) : loadingRoutes ? (
                  <div className="text-xs text-white/50 px-2">
                    Calculating route…
                  </div>
                ) : routeError ? (
                  <div className="text-xs text-red-300 px-2">{routeError}</div>
                ) : (
                  <>
                    {fastest && <RouteCard item={fastest} accent={ACCENT} />}
                    {alternatives.map((r) => (
                      <RouteCard key={r.id} item={r} accent={ACCENT} />
                    ))}

                    {mode === "transit" && (
                      <div className="text-[10px] text-white/40 px-2 mt-2">
                        Transit times are estimates without real-time data
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )}
        </GlassCard>
      </aside>
    </>
  );
}

/* ---------- UI pieces ---------- */

const GlassCard = React.forwardRef<
  HTMLDivElement,
  {
    className?: string;
    children: React.ReactNode;
  }
>(({ className, children }, ref) => {
  return (
    <div
      ref={ref}
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
});

GlassCard.displayName = "GlassCard";

function TransportModeButton({
  active,
  onClick,
  icon,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "h-11 px-4 rounded-xl flex items-center justify-center transition-all",
        active
          ? "bg-white/10 text-white"
          : "text-white/60 hover:text-white/90 hover:bg-white/5",
      )}
      style={{
        borderBottom: active ? `2px solid ${ACCENT}` : "2px solid transparent",
      }}
    >
      {icon}
    </button>
  );
}

function DirectionInputRow({
  icon,
  placeholder,
  value,
  onChange,
  options,
  onPick,
}: {
  icon: React.ReactNode;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  options: SuggestedPlace[];
  onPick: (p: SuggestedPlace) => void;
}) {
  const [open, setOpen] = React.useState(false);

  return (
    <div className="relative">
      <div
        className="h-[44px] rounded-xl border px-3 flex items-center gap-3 bg-black/10"
        style={{
          borderColor: "rgba(255,255,255,0.12)",
        }}
      >
        <div className="shrink-0 text-white/60">{icon}</div>
        <input
          className="w-full bg-transparent outline-none text-sm text-white placeholder:text-white/40"
          placeholder={placeholder}
          value={value}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 140)}
          onChange={(e) => {
            onChange(e.target.value);
            setOpen(true);
          }}
        />
      </div>

      {/* Dropdown */}
      {open && options.length > 0 && (
        <div
          className="absolute left-0 right-0 mt-2 rounded-xl border overflow-hidden z-50 shadow-xl"
          style={{
            borderColor: "rgba(255,255,255,0.12)",
            background: `${BG}f8`,
          }}
        >
          <div className="max-h-[300px] overflow-y-auto">
            {options.map((p) => (
              <button
                key={p.id}
                className="w-full text-left px-3 py-2.5 text-sm text-white/90 hover:bg-white/8 transition-colors"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onPick(p);
                  setOpen(false);
                }}
              >
                <div className="font-medium truncate">{p.name}</div>
                {p.category && (
                  <div className="text-xs text-white/50 truncate mt-0.5">
                    {p.category}
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ModeBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "h-11 w-11 rounded-2xl border grid place-items-center transition",
        "hover:bg-white/5",
      )}
      style={{
        borderColor: active ? `${ACCENT}55` : "rgba(255,255,255,0.10)",
        background: active ? "rgba(255,255,255,0.06)" : "transparent",
        color: active ? ACCENT : "rgba(255,255,255,0.80)",
      }}
    >
      {children}
    </button>
  );
}

function RouteCard({ item, accent }: { item: RouteItem; accent: string }) {
  const color =
    item.severity === "bad"
      ? "rgba(255,80,80,0.95)"
      : item.severity === "warn"
        ? "rgba(255,200,0,0.95)"
        : accent;

  return (
    <div
      className="rounded-xl border p-3 bg-black/10"
      style={{
        borderColor: "rgba(255,255,255,0.12)",
      }}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="text-sm text-white font-medium">{item.title}</div>
          {item.subtitle && (
            <div className="text-xs text-white/50 mt-0.5">{item.subtitle}</div>
          )}
        </div>

        <div className="text-right shrink-0">
          <div className="text-base font-bold" style={{ color }}>
            {item.timeMin} min
          </div>
          <div className="text-xs text-white/50">{item.distanceKm} km</div>
        </div>
      </div>
    </div>
  );
}

function AutocompleteRow({
  icon,
  placeholder,
  value,
  onChange,
  options,
  onPick,
}: {
  icon: React.ReactNode;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  options: SuggestedPlace[];
  onPick: (p: SuggestedPlace) => void;
}) {
  const [open, setOpen] = React.useState(false);

  return (
    <div className="relative">
      <div
        className="h-[42px] rounded-2xl border px-3 flex items-center gap-2"
        style={{
          borderColor: "rgba(255,255,255,0.10)",
          background: "rgba(0,0,0,0.18)",
        }}
      >
        <div className="shrink-0">{icon}</div>
        <input
          className="w-full bg-transparent outline-none text-sm text-white placeholder:text-white/35"
          placeholder={placeholder}
          value={value}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 140)}
          onChange={(e) => {
            onChange(e.target.value);
            setOpen(true);
          }}
        />
      </div>

      {/* Dropdown */}
      {open && options.length > 0 && (
        <div
          className="absolute left-0 right-0 mt-2 rounded-2xl border overflow-hidden z-50"
          style={{
            borderColor: "rgba(255,255,255,0.10)",
            background: `${BG}f2`,
          }}
        >
          <div className="max-h-[420px] overflow-y-auto">
            {options.map((p) => (
              <button
                key={p.id}
                className="w-full text-left px-3 py-2 text-sm text-white/90 hover:bg-white/5"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onPick(p);
                  setOpen(false);
                }}
              >
                <div className="font-medium truncate">{p.name}</div>
                {p.category && (
                  <div className="text-xs text-white/55 truncate">
                    {p.category}
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
