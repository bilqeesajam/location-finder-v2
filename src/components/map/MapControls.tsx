import * as React from "react";
import { Search as SearchIcon, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Popover,
    PopoverTrigger,
    PopoverContent,
} from "@/components/ui/popover";
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
    onSelectGeocode: (lng: number, lat: number, label: string, zoom?: number) => void;
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
                            }: MapControlsProps) {
    const [isLocked, setIsLocked] = React.useState(false);

    const results = React.useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        if (!q || isLocked) return [];
        return locations.filter(
            (l) =>
                l.name.toLowerCase().includes(q) ||
                (l.description || "").toLowerCase().includes(q)
        );
    }, [locations, searchQuery, isLocked]);

    const handlePickLocation = (loc: Location) => {
        onSearchChange(loc.name);
        setIsLocked(true);
        onSelectLocation(loc);
    };

    const handleUnlock = () => {
        setIsLocked(false);
        onSearchChange("");
    };

    const filterItems = [
        { key: "clinic", label: "Clinic" },
        { key: "library", label: "Library" },
        { key: "shelter", label: "Shelter" },
        { key: "hospitals", label: "Hospitals" },
        { key: "police", label: "Police" },
        { key: "restaurants", label: "Restaurants" },
        { key: "bus", label: "Bus" },
    ];

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
                        aria-label="Search locations"
                        value={searchQuery}
                        onChange={(e) => {
                            if (isLocked) return;
                            onSearchChange(e.target.value);
                        }}
                        placeholder="Search"
                        readOnly={isLocked}
                        className="
              h-12
              pl-12
              pr-4
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

                    {searchQuery.trim() && !isLocked && (
                        <div className="absolute left-0 right-0 mt-2 bg-popover rounded-xl shadow-lg overflow-hidden">
                            {results.length === 0 ? (
                                <div className="p-3 text-sm text-muted-foreground">
                                    No results
                                </div>
                            ) : (
                                results.slice(0, 6).map((r) => (
                                    <button
                                        key={r.id}
                                        onClick={() => handlePickLocation(r)}
                                        className="w-full text-left px-4 py-3 hover:bg-accent/40"
                                    >
                                        <div className="font-semibold">{r.name}</div>
                                        {r.description && (
                                            <div className="text-xs text-muted-foreground truncate">
                                                {r.description}
                                            </div>
                                        )}
                                    </button>
                                ))
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

                    {/* ✅ themed popover */}
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

                            {/* ✅ themed filter chips */}
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

                            <div className="text-sm font-medium mt-2 text-white/90">
                                Coming Soon
                            </div>

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
