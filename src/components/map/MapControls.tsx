import * as React from "react";
import { Search as SearchIcon, SlidersHorizontal, MapPin, Landmark, Map } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Location } from "@/hooks/useLocations";

interface MapControlsProps {
    is3D: boolean;
    onToggle3D: () => void;
    onResetView: () => void;
    className?: string;

    locations: Location[];
    searchQuery: string;
    onSearchChange: (q: string) => void;
    onSelectLocation: (loc: Location) => void;

    selectedServices: string[];
    onServiceToggle: (service: string) => void;

    onClearFilters: () => void;

    // ✅ NEW: MapTiler geocode select
    onSelectGeocode: (lng: number, lat: number, label: string, zoom?: number) => void;
}

type GeocodeFeature = {
    id?: string;
    place_name?: string;
    text?: string;
    center?: [number, number]; // [lng, lat]
    place_type?: string[];     // e.g. ["address"], ["poi"], ["place"]
    properties?: {
        // sometimes has useful stuff, depends on result
        name?: string;
    };
};

const MAPTILER_API_KEY = import.meta.env.VITE_MAPTILER_API_KEY as string;

function getType(feature: GeocodeFeature): string {
    return feature.place_type?.[0] || "unknown";
}

function pickLabel(feature: GeocodeFeature): string {
    return feature.place_name || feature.text || feature.properties?.name || "Selected place";
}

export function MapControls({
                                is3D,
                                onToggle3D,
                                onResetView,
                                className,
                                locations,
                                searchQuery,
                                onSearchChange,
                                onSelectLocation,
                                selectedServices,
                                onServiceToggle,
                                onClearFilters,
                                onSelectGeocode,
                            }: MapControlsProps) {
    const [isLocked, setIsLocked] = React.useState(false);

    const [geoResults, setGeoResults] = React.useState<GeocodeFeature[]>([]);
    const [geoLoading, setGeoLoading] = React.useState(false);

    // local (your DB) results
    const localResults = React.useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        if (!q || isLocked) return [];
        return locations.filter(
            (l) =>
                l.name.toLowerCase().includes(q) ||
                (l.description || "").toLowerCase().includes(q)
        );
    }, [locations, searchQuery, isLocked]);

    // MapTiler geocode results (addresses + attractions + fallback places)
    React.useEffect(() => {
        const q = searchQuery.trim();
        if (!q || isLocked) {
            setGeoResults([]);
            setGeoLoading(false);
            return;
        }
        if (!MAPTILER_API_KEY) {
            setGeoResults([]);
            setGeoLoading(false);
            return;
        }

        const controller = new AbortController();

        const run = window.setTimeout(async () => {
            try {
                setGeoLoading(true);

                const base =
                    `https://api.maptiler.com/geocoding/${encodeURIComponent(q)}.json` +
                    `?key=${MAPTILER_API_KEY}` +
                    `&autocomplete=true` +
                    `&limit=8`;

                // 1) addresses + POIs (attractions)
                const urlPrimary = base + `&types=address,poi`;
                const res1 = await fetch(urlPrimary, { signal: controller.signal });
                if (!res1.ok) throw new Error(`Geocoding failed: ${res1.status}`);
                const data1 = await res1.json();
                let features: GeocodeFeature[] = Array.isArray(data1?.features) ? data1.features : [];

                // 2) fallback: broader places so "New York" still returns something
                if (features.length === 0) {
                    const urlFallback = base + `&types=poi,address,street,neighborhood,place,locality,region,country`;
                    const res2 = await fetch(urlFallback, { signal: controller.signal });
                    if (res2.ok) {
                        const data2 = await res2.json();
                        features = Array.isArray(data2?.features) ? data2.features : [];
                    }
                }

                setGeoResults(features);
            } catch (e) {
                if ((e as any)?.name !== "AbortError") setGeoResults([]);
            } finally {
                setGeoLoading(false);
            }
        }, 250);

        return () => {
            controller.abort();
            window.clearTimeout(run);
        };
    }, [searchQuery, isLocked]);

    const handlePickLocation = (loc: Location) => {
        onSearchChange(loc.name);
        setIsLocked(true);
        onSelectLocation(loc);
    };

    const handlePickGeocode = (f: GeocodeFeature) => {
        const label = pickLabel(f);
        const c = f.center;
        if (!c || c.length !== 2) return;

        const t = getType(f);

        // Zoom defaults: address/poi closer; place/city wider
        const zoom =
            t === "address" ? 16 :
                t === "poi" ? 16 :
                    t === "street" ? 15 :
                        t === "neighborhood" ? 14 :
                            t === "place" || t === "locality" ? 12 :
                                t === "region" ? 8 :
                                    t === "country" ? 5 :
                                        13;

        onSearchChange(label);
        setIsLocked(true);
        onSelectGeocode(c[0], c[1], label, zoom);
    };

    const handleUnlock = () => {
        setIsLocked(false);
        onSearchChange("");
        setGeoResults([]);
    };

    const filterItems = [
        { key: "clinic", label: "Clinic" },
        { key: "library", label: "Library" },
        { key: "shelter", label: "Shelter" },
        { key: "hospitals", label: "Hospitals" },
        { key: "police", label: "Police" },
        { key: "restaurants", label: "Restaurants" },
    ];

    // Group geocode results: addresses, attractions (poi), other places
    const grouped = React.useMemo(() => {
        const addresses: GeocodeFeature[] = [];
        const pois: GeocodeFeature[] = [];
        const places: GeocodeFeature[] = [];

        for (const f of geoResults) {
            const t = getType(f);
            if (t === "address") addresses.push(f);
            else if (t === "poi") pois.push(f);
            else places.push(f);
        }

        return { addresses, pois, places };
    }, [geoResults]);

    const showDropdown = searchQuery.trim() && !isLocked;

    return (
        <div
            className={cn(
                "absolute top-4 left-1/2 -translate-x-1/2 z-20 pointer-events-auto",
                className
            )}
        >
            <div className="flex items-center gap-3">
                {/* SEARCH */}
                <div className="relative w-[350px]">
                    <SearchIcon
                        strokeWidth={1.5}
                        className="absolute left-4 top-1/2 -translate-y-1/2 h-[16px] w-[16px] text-white/90 pointer-events-none z-10 scale-x-[-1]"
                    />

                    <Input
                        aria-label="Search places"
                        value={searchQuery}
                        onChange={(e) => {
                            if (isLocked) return;
                            onSearchChange(e.target.value);
                        }}
                        placeholder="Search address or attraction"
                        readOnly={isLocked}
                        className="
              h-12
              pl-12
              pr-14
              rounded-[20px]
              bg-[#0F2A2E]/90
              text-white
              placeholder:text-[13px]
              placeholder-font-medium
              placeholder:text-slate-300
              border-none
              shadow-lg
              backdrop-blur-md
              focus-visible:ring-0
            "
                    />

                    {isLocked && (
                        <button
                            onClick={handleUnlock}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-white/80 hover:text-white"
                        >
                            Clear
                        </button>
                    )}

                    {showDropdown && (
                        <div className="absolute left-0 right-0 mt-2 bg-popover rounded-xl shadow-lg overflow-hidden">
                            {/* Saved locations first */}
                            {localResults.slice(0, 6).map((r) => (
                                <button
                                    key={`local-${r.id}`}
                                    onClick={() => handlePickLocation(r)}
                                    className="w-full text-left px-4 py-3 hover:bg-accent/40"
                                >
                                    <div className="font-semibold">{r.name}</div>
                                    {r.description && (
                                        <div className="text-xs text-muted-foreground truncate">
                                            {r.description}
                                        </div>
                                    )}
                                    <div className="text-[11px] text-muted-foreground mt-1">
                                        Saved location
                                    </div>
                                </button>
                            ))}

                            {(localResults.length > 0 || geoResults.length > 0) && (
                                <div className="h-px bg-border/50" />
                            )}

                            {geoLoading && (
                                <div className="p-3 text-sm text-muted-foreground">
                                    Searching addresses & attractions…
                                </div>
                            )}

                            {!geoLoading && geoResults.length === 0 && localResults.length === 0 && (
                                <div className="p-3 text-sm text-muted-foreground">No results</div>
                            )}

                            {!geoLoading && geoResults.length > 0 && (
                                <div className="py-2">
                                    {grouped.addresses.length > 0 && (
                                        <div className="px-4 pt-2 pb-1 text-[11px] uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                                            <MapPin className="h-3 w-3" /> Addresses
                                        </div>
                                    )}
                                    {grouped.addresses.slice(0, 5).map((f, idx) => (
                                        <button
                                            key={`addr-${f.id || idx}`}
                                            onClick={() => handlePickGeocode(f)}
                                            className="w-full text-left px-4 py-3 hover:bg-accent/40"
                                        >
                                            <div className="font-semibold">{pickLabel(f)}</div>
                                            <div className="text-[11px] text-muted-foreground mt-1">
                                                Address
                                            </div>
                                        </button>
                                    ))}

                                    {grouped.pois.length > 0 && (
                                        <div className="px-4 pt-2 pb-1 text-[11px] uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                                            <Landmark className="h-3 w-3" /> Attractions
                                        </div>
                                    )}
                                    {grouped.pois.slice(0, 5).map((f, idx) => (
                                        <button
                                            key={`poi-${f.id || idx}`}
                                            onClick={() => handlePickGeocode(f)}
                                            className="w-full text-left px-4 py-3 hover:bg-accent/40"
                                        >
                                            <div className="font-semibold">{pickLabel(f)}</div>
                                            <div className="text-[11px] text-muted-foreground mt-1">
                                                Attraction / POI
                                            </div>
                                        </button>
                                    ))}

                                    {grouped.places.length > 0 && (
                                        <div className="px-4 pt-2 pb-1 text-[11px] uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                                            <Map className="h-3 w-3" /> Places
                                        </div>
                                    )}
                                    {grouped.places.slice(0, 6).map((f, idx) => (
                                        <button
                                            key={`place-${f.id || idx}`}
                                            onClick={() => handlePickGeocode(f)}
                                            className="w-full text-left px-4 py-3 hover:bg-accent/40"
                                        >
                                            <div className="font-semibold">{pickLabel(f)}</div>
                                            <div className="text-[11px] text-muted-foreground mt-1">
                                                {getType(f)}
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* FILTER BUTTON */}
                <Popover>
                    <PopoverTrigger asChild>
                        <Button
                            className="
                h-11 w-11
                rounded-[19px]
                bg-[#009E61]
                text-white
                shadow-lg
                hover:bg-[#00B36D]
              "
                        >
                            <SlidersHorizontal strokeWidth={1.5} className="h-[16px] w-[16px]" />
                        </Button>
                    </PopoverTrigger>

                    <PopoverContent
                        align="end"
                        className="bg-[#15292F] text-white border border-white/10 shadow-xl"
                    >
                        <div className="flex flex-col gap-3 min-w-[220px]">
                            <div className="flex items-center justify-between gap-3">
                                <div className="text-sm font-medium text-white">Services</div>

                                <button
                                    onClick={onClearFilters}
                                    disabled={selectedServices.length === 0}
                                    className={cn(
                                        "text-xs underline underline-offset-2",
                                        selectedServices.length === 0
                                            ? "text-white/40 cursor-not-allowed"
                                            : "text-[#009E61] hover:text-[#00B36D]"
                                    )}
                                >
                                    Clear filters
                                </button>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                {filterItems.map((item) => {
                                    const active = selectedServices.includes(item.key);
                                    return (
                                        <button
                                            key={item.key}
                                            onClick={() => onServiceToggle(item.key)}
                                            className={cn(
                                                "px-3 py-1 rounded-md text-sm text-center transition-colors",
                                                active
                                                    ? "bg-[#009E61] text-white"
                                                    : "bg-[#0F2A2E] text-white/90 hover:bg-[#0F2A2E]/80",
                                                "border border-white/10"
                                            )}
                                        >
                                            {item.label}
                                        </button>
                                    );
                                })}
                            </div>

                            <div className="text-sm font-medium mt-2 text-white/90">Coming Soon</div>

                            <div className="flex gap-2">
                                {[
                                    { key: "parks", label: "Parks" },
                                    { key: "roads", label: "Roads" },
                                ].map((item) => (
                                    <button
                                        key={item.key}
                                        disabled
                                        className="px-3 py-1 rounded-md text-sm bg-white/10 text-white/50 border border-white/10 opacity-60 cursor-not-allowed"
                                    >
                                        {item.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </PopoverContent>
                </Popover>
            </div>
        </div>
    );
}
