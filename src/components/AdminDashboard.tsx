import { useState, useEffect } from "react";
import {
  Check,
  X,
  Trash2,
  MapPin,
  Clock,
  Filter,
  Loader2,
  Edit,
  CheckSquare,
  Square,
  RefreshCw,
  Bell,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { useLocations, Location } from "@/hooks/useLocations";
import { useAuth } from "@/hooks/useAuth";

import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Navigate } from "react-router-dom";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";

type FilterStatus = "all" | "pending" | "approved" | "denied";
type LocationStatus = "pending" | "approved" | "denied";

export function AdminDashboard() {
  const [filter, setFilter] = useState<FilterStatus>("pending");
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [selectedLocations, setSelectedLocations] = useState<Set<string>>(new Set());
  const [newLocationsCount, setNewLocationsCount] = useState(0);
  const [hasNewLocations, setHasNewLocations] = useState(false);

  // pagination
  const [page, setPage] = useState(1);
  const pageSize = 9;

  const { isAdmin, isLoading: authLoading } = useAuth();
  const { 
    locations, 
    isLoading, 
    updateLocationStatus, 
    deleteLocation,
  } = useLocations();

  // Subscribe to real-time updates from Supabase
  useEffect(() => {
    // Subscribe to INSERT events (new locations)
    const insertChannel = supabase
      .channel('locations-insert')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'locations'
        },
        (payload) => {
          const newLocation = payload.new as Location;
          console.log('New location received:', newLocation);
          
          // Only count new pending locations
          if (newLocation.status === 'pending') {
            setHasNewLocations(true);
            setNewLocationsCount(prev => prev + 1);
          }
        }
      )
      .subscribe();

    // Subscribe to UPDATE events (status changes)
    const updateChannel = supabase
      .channel('locations-update')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'locations'
        },
        () => {
          // When a location is updated, we might have new pending locations
          setHasNewLocations(true);
        }
      )
      .subscribe();

    // Cleanup subscriptions
    return () => {
      supabase.removeChannel(insertChannel);
      supabase.removeChannel(updateChannel);
    };
  }, []);

  // Reset new locations when switching to pending filter
  useEffect(() => {
    if (filter === "pending") {
      setHasNewLocations(false);
      setNewLocationsCount(0);
    }
  }, [filter]);

  const changeFilter = (status: FilterStatus) => {
    setFilter(status);
    setPage(1);
  };

  // Refresh function to show new locations
  const handleShowNewLocations = () => {
    // Force a refresh by triggering a state update
    setHasNewLocations(false);
    setNewLocationsCount(0);
    // The useLocations hook will automatically refetch due to Supabase subscription
  };

  // LOADING
  if (authLoading || isLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-600" />
      </div>
    );
  }

  // ADMIN PROTECTION
  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  // FILTERED LOCATIONS
  const filteredLocations = locations.filter((loc) => {
    if (filter === "all") return true;
    return loc.status === filter;
  });

  // PAGINATION
  const totalPages = Math.max(1, Math.ceil(filteredLocations.length / pageSize));
  const startIndex = (page - 1) * pageSize;
  const pagedLocations = filteredLocations.slice(
    startIndex,
    startIndex + pageSize
  );

  // SELECTION HANDLERS
  const toggleSelectAll = () => {
    if (selectedLocations.size === pagedLocations.length) {
      setSelectedLocations(new Set());
    } else {
      const newSelected = new Set(pagedLocations.map(loc => loc.id));
      setSelectedLocations(newSelected);
    }
  };

  const toggleSelectLocation = (id: string) => {
    const newSelected = new Set(selectedLocations);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedLocations(newSelected);
  };

  // INDIVIDUAL ACTIONS
  const handleApprove = async (id: string) => {
    setProcessingId(id);
    await updateLocationStatus(id, "approved");
    setProcessingId(null);
    // Remove from selection if selected
    if (selectedLocations.has(id)) {
      const newSelected = new Set(selectedLocations);
      newSelected.delete(id);
      setSelectedLocations(newSelected);
    }
  };

  const handleDeny = async (id: string) => {
    setProcessingId(id);
    await updateLocationStatus(id, "denied");
    setProcessingId(null);
    // Remove from selection if selected
    if (selectedLocations.has(id)) {
      const newSelected = new Set(selectedLocations);
      newSelected.delete(id);
      setSelectedLocations(newSelected);
    }
  };

  const handleDelete = async (id: string) => {
    setProcessingId(id);
    await deleteLocation(id);
    setProcessingId(null);
    // Remove from selection if selected
    if (selectedLocations.has(id)) {
      const newSelected = new Set(selectedLocations);
      newSelected.delete(id);
      setSelectedLocations(newSelected);
    }
  };

  // EDIT STATUS HANDLER - Only allows changing to approved or denied
  const handleStatusChange = async (id: string, newStatus: "approved" | "denied") => {
    setProcessingId(id);
    await updateLocationStatus(id, newStatus);
    setProcessingId(null);
    // Remove from selection if selected
    if (selectedLocations.has(id)) {
      const newSelected = new Set(selectedLocations);
      newSelected.delete(id);
      setSelectedLocations(newSelected);
    }
  };

  // BULK ACTIONS
  const handleBulkApprove = async () => {
    if (selectedLocations.size === 0) return;
    
    setProcessingId("bulk");
    const promises = Array.from(selectedLocations).map(id => 
      updateLocationStatus(id, "approved")
    );
    
    try {
      await Promise.all(promises);
      setSelectedLocations(new Set());
    } catch (error) {
      console.error("Bulk approve failed:", error);
    } finally {
      setProcessingId(null);
    }
  };

  const handleBulkDeny = async () => {
    if (selectedLocations.size === 0) return;
    
    setProcessingId("bulk");
    const promises = Array.from(selectedLocations).map(id => 
      updateLocationStatus(id, "denied")
    );
    
    try {
      await Promise.all(promises);
      setSelectedLocations(new Set());
    } catch (error) {
      console.error("Bulk deny failed:", error);
    } finally {
      setProcessingId(null);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedLocations.size === 0) return;
    
    setProcessingId("bulk");
    const promises = Array.from(selectedLocations).map(id => 
      deleteLocation(id)
    );
    
    try {
      await Promise.all(promises);
      setSelectedLocations(new Set());
    } catch (error) {
      console.error("Bulk delete failed:", error);
    } finally {
      setProcessingId(null);
    }
  };

  // BUTTON COLOR THEMES (LIKE SCREENSHOT)
  const colors: Record<
    FilterStatus,
    { border: string; text: string; activeBg: string }
  > = {
    all: {
      border: "border-gray-400",
      text: "text-gray-700",
      activeBg: "bg-gray-200",
    },
    pending: {
      border: "border-yellow-400",
      text: "text-yellow-700",
      activeBg: "bg-yellow-300",
    },
    approved: {
      border: "border-green-400",
      text: "text-green-700",
      activeBg: "bg-green-300",
    },
    denied: {
      border: "border-red-400",
      text: "text-red-700",
      activeBg: "bg-red-300",
    },
  };

  return (
    <div className="min-h-screen bg-transparent p-6 space-y-6">
      {/* HEADER */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Location Suggestions
          </h1>
          <p className="text-sm text-gray-500">
            {new Date().toLocaleDateString("en-US", {
              weekday: "short",
              day: "2-digit",
              month: "long",
              year: "numeric",
            })}
          </p>
        </div>

        {/* REAL-TIME NOTIFICATION */}
        {hasNewLocations && filter !== "pending" && (
          <div className="flex items-center gap-2">
            <div className="relative">
              <Bell className="h-5 w-5 text-yellow-500 animate-pulse" />
              <span className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full animate-ping"></span>
            </div>
            <Button
              variant="default"
              onClick={handleShowNewLocations}
              className="bg-yellow-500 hover:bg-yellow-600 text-white"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              {newLocationsCount > 0 ? `${newLocationsCount} new` : 'New'} suggestion{newLocationsCount !== 1 ? 's' : ''}
            </Button>
          </div>
        )}
      </div>

      {/* BULK ACTIONS BAR */}
      {selectedLocations.size > 0 && (
        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={toggleSelectAll}
                className="flex items-center gap-2"
              >
                {selectedLocations.size === pagedLocations.length ? (
                  <CheckSquare className="h-4 w-4" />
                ) : (
                  <Square className="h-4 w-4" />
                )}
                <span className="font-medium">
                  {selectedLocations.size} selected
                </span>
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedLocations(new Set())}
                className="text-gray-500 hover:text-gray-700"
              >
                Clear selection
              </Button>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={handleBulkApprove}
                disabled={processingId === "bulk"}
                className="bg-green-500 hover:bg-green-600 text-white"
              >
                {processingId === "bulk" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Approve Selected
                  </>
                )}
              </Button>
              
              <Button
                size="sm"
                onClick={handleBulkDeny}
                disabled={processingId === "bulk"}
                className="bg-red-500 hover:bg-red-600 text-white"
              >
                <X className="h-4 w-4 mr-2" />
                Deny Selected
              </Button>
              
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    size="sm"
                    variant="destructive"
                    disabled={processingId === "bulk"}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Selected
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Selected Locations</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to delete {selectedLocations.size} location(s)? 
                      This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleBulkDelete}
                      className="bg-red-500 hover:bg-red-600 text-white"
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </div>
      )}

      {/* FILTERS */}
      <div className="flex items-center gap-2">
        <Filter className="h-4 w-4 text-gray-400" />

        <div className="flex gap-3">
          {(["all", "pending", "approved", "denied"] as FilterStatus[]).map(
            (status) => (
              <Button
                key={status}
                size="sm"
                onClick={() => changeFilter(status)}
                className={cn(
                  "capitalize rounded-xl px-6 font-semibold border-2 transition relative",
                  filter === status
                    ? `${colors[status].activeBg} ${colors[status].text} border-transparent`
                    : `bg-white ${colors[status].border} text-gray-700 hover:bg-gray-100`
                )}
              >
                {status}
                {status === "pending" && hasNewLocations && (
                  <span className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full animate-ping"></span>
                )}
                {status === "pending" && newLocationsCount > 0 && (
                  <span className="ml-2 bg-yellow-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {newLocationsCount}
                  </span>
                )}
              </Button>
            )
          )}
        </div>
      </div>

      {/* LOCATIONS LIST */}
      {filteredLocations.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <MapPin className="h-12 w-12 mx-auto mb-3 opacity-40" />
          No {filter !== "all" ? filter : ""} locations found
        </div>
      ) : (
        <div>
          {/* SELECT ALL CHECKBOX FOR CURRENT PAGE */}
          {pagedLocations.length > 0 && (
            <div className="mb-4 flex items-center gap-2">
              <Button
  size="sm"
  onClick={toggleSelectAll}
  className="flex items-center gap-2 bg-white text-muted-foreground border border-gray-300
             hover:bg-primary hover:text-primary-foreground 
             transition-all"
>
  {selectedLocations.size === pagedLocations.length ? (
    <CheckSquare className="h-4 w-4" />
  ) : (
    <Square className="h-4 w-4" />
  )}
  Select All on Page
</Button>
              <span className="text-sm text-gray-500">
                {selectedLocations.size} of {filteredLocations.length} selected
              </span>
            </div>
          )}

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {pagedLocations.map((location) => (
              <LocationCard
                key={location.id}
                location={location}
                isProcessing={processingId === location.id || processingId === "bulk"}
                isSelected={selectedLocations.has(location.id)}
                onSelect={() => toggleSelectLocation(location.id)}
                onApprove={() => handleApprove(location.id)}
                onDeny={() => handleDeny(location.id)}
                onDelete={() => handleDelete(location.id)}
                onStatusChange={(newStatus) => handleStatusChange(location.id, newStatus)}
              />
            ))}
          </div>

          {/* PAGINATION */}
          {filteredLocations.length > pageSize && (
            <div className="flex items-center justify-center gap-4 mt-10">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                Prev
              </Button>

              <span className="text-sm text-gray-500">
                Page {page} of {totalPages}
              </span>

              <Button
                variant="secondary"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                Next
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ---------------- LOCATION CARD ---------------- */

interface LocationCardProps {
  location: Location;
  isProcessing: boolean;
  isSelected: boolean;
  onSelect: () => void;
  onApprove: () => void;
  onDeny: () => void;
  onDelete: () => void;
  onStatusChange: (newStatus: "approved" | "denied") => void;
}

function LocationCard({
  location,
  isProcessing,
  isSelected,
  onSelect,
  onApprove,
  onDeny,
  onDelete,
  onStatusChange,
}: LocationCardProps) {
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <div className={cn(
      "bg-white rounded-2xl border border-gray-200 p-6 shadow-sm transition-all",
      isSelected && "ring-2 ring-blue-500 border-blue-300",
      isProcessing && "opacity-50"
    )}>
      {/* HEADER WITH SELECTION */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={onSelect}
            className={cn(
              "p-0 h-6 w-6",
              isSelected ? "text-blue-600" : "text-gray-400"
            )}
          >
            {isSelected ? (
              <CheckSquare className="h-5 w-5" />
            ) : (
              <Square className="h-5 w-5" />
            )}
          </Button>
          
          <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center">
            <MapPin className="h-5 w-5 text-gray-500" />
          </div>

          <div>
            <h3 className="font-semibold text-gray-800">{location.name}</h3>
            <p className="text-xs text-gray-500 capitalize">
              {location.status}
            </p>
          </div>
        </div>
      </div>

      {/* DESCRIPTION */}
      {location.description && (
        <p className="text-sm text-gray-600 mb-4 line-clamp-2">
          {location.description}
        </p>
      )}

      {/* DATE */}
      <div className="flex items-center gap-2 text-xs text-gray-400 mb-5">
        <Clock className="h-3 w-3" />
        {format(new Date(location.created_at), "MMM d, yyyy")}
      </div>

      {/* ACTION BUTTONS */}
      <div className="space-y-2">
        {/* PENDING LOCATIONS - Approve/Deny buttons */}
        {location.status === "pending" && (
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={onApprove}
              disabled={isProcessing}
              className="flex-1 bg-green-500 hover:bg-green-600 text-white"
            >
              {isProcessing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Check className="h-4 w-4 mr-1" />
                  Approve
                </>
              )}
            </Button>

            <Button
              size="sm"
              onClick={onDeny}
              disabled={isProcessing}
              className="flex-1 bg-red-500 hover:bg-red-600 text-white"
            >
              <X className="h-4 w-4 mr-1" />
              Deny
            </Button>
          </div>
        )}

        {/* APPROVED/DENIED LOCATIONS - Edit Status and Delete buttons side by side */}
        {(location.status === "approved" || location.status === "denied") && (
          <div className="flex gap-2">
            {/* EDIT STATUS DIALOG */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={isProcessing}
                  className="flex-1"
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Status
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Edit Status for "{location.name}"</DialogTitle>
                  <DialogDescription>
                    Change the status of this location submission.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-2 py-4">
                  {/* Only show opposite status option */}
                  {location.status === "approved" ? (
                    <Button
                      variant="outline"
                      className="w-full justify-start bg-red-50 text-red-700 hover:bg-red-100"
                      onClick={() => {
                        onStatusChange("denied");
                        setDialogOpen(false);
                      }}
                      disabled={isProcessing}
                    >
                      <X className="h-4 w-4 mr-2" />
                      Change to Denied
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      className="w-full justify-start bg-green-50 text-green-700 hover:bg-green-100"
                      onClick={() => {
                        onStatusChange("approved");
                        setDialogOpen(false);
                      }}
                      disabled={isProcessing}
                    >
                      <Check className="h-4 w-4 mr-2" />
                      Change to Approved
                    </Button>
                  )}
                </div>
                <DialogFooter>
                  <DialogClose asChild>
                    <Button variant="outline">Cancel</Button>
                  </DialogClose>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* DELETE BUTTON */}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  size="sm"
                  variant="destructive"
                  disabled={isProcessing}
                  className="flex-1"
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Delete
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Location</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete "{location.name}"? This cannot be
                    undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={onDelete}
                    className="bg-red-500 hover:bg-red-600 text-white"
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}

        {/* DELETE BUTTON FOR PENDING (full width) */}
        {location.status === "pending" && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                size="sm"
                variant="destructive"
                disabled={isProcessing}
                className="w-full"
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Location</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete "{location.name}"? This cannot be
                  undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={onDelete}
                  className="bg-red-500 hover:bg-red-600 text-white"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>
    </div>
  );
}