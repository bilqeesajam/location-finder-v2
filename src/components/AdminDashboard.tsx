import { useState } from "react";
import {
  Check,
  X,
  Trash2,
  MapPin,
  Clock,
  ArrowLeft,
  Filter,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocations, Location } from "@/hooks/useLocations";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Link, Navigate } from "react-router-dom";
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
import { Sidebar } from "./ui/sidebar";

type FilterStatus = "all" | "pending" | "approved" | "denied";

export function AdminDashboard() {
  const [filter, setFilter] = useState<FilterStatus>("pending");
  const [processingId, setProcessingId] = useState<string | null>(null);

  /**
   * ============================
   * PAGINATION STATE (TEST ENTRY POINT)
   * ============================
   * - `page` controls the current page number
   * - `pageSize` controls how many location cards appear per page
   *
   * TESTING NOTES:
   * - Verify that only `pageSize` number of cards appear at a time
   * - Verify page starts at 1 by default
   */
  const [page, setPage] = useState(1);
  const pageSize = 9;

  const { isAdmin, isLoading: authLoading } = useAuth();
  const { locations, isLoading, updateLocationStatus, deleteLocation } =
    useLocations();

  /**
   * FILTER CHANGE HANDLER
   *
   * TESTING NOTES:
   * - When switching between filters (All / Pending / Approved / Denied),
   *   pagination should RESET back to page 1.
   */
  const changeFilter = (status: FilterStatus) => {
    setFilter(status);
    setPage(1);
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  /**
   * FILTERED DATASET
   *
   * TESTING NOTES:
   * - Pagination operates on THIS filtered list
   * - Ensure pagination count updates correctly per filter
   */
  const filteredLocations = locations.filter((loc) => {
    if (filter === "all") return true;
    return loc.status === filter;
  });

  /**
   * ============================
   * PAGINATION CALCULATIONS
   * ============================
   *
   * TESTING NOTES:
   * - `totalPages` should update dynamically based on dataset size
   * - Verify total pages calculation when:
   *   - Adding new locations
   *   - Deleting locations
   *   - Switching filters
   */
  const totalPages = Math.max(
    1,
    Math.ceil(filteredLocations.length / pageSize),
  );

  /**
   * Determines which slice of data to show for the current page
   *
   * TESTING NOTES:
   * - Page 1 should show items 0 → pageSize
   * - Page 2 should show items pageSize → pageSize * 2
   */
  const startIndex = (page - 1) * pageSize;
  const pagedLocations = filteredLocations.slice(
    startIndex,
    startIndex + pageSize,
  );

  const handleApprove = async (id: string) => {
    setProcessingId(id);
    await updateLocationStatus(id, "approved");
    setProcessingId(null);
  };

  const handleDeny = async (id: string) => {
    setProcessingId(id);
    await updateLocationStatus(id, "denied");
    setProcessingId(null);
  };

  const handleDelete = async (id: string) => {
    setProcessingId(id);
    await deleteLocation(id);
    setProcessingId(null);
  };

  const pendingCount = locations.filter((l) => l.status === "pending").length;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="glass-panel border-b border-border/50 sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="font-bold text-xl">Admin Dashboard</h1>
              <p className="text-sm text-muted-foreground">
                Manage location submissions
              </p>
            </div>
          </div>

          {pendingCount > 0 && (
            <div className="px-3 py-1 rounded-full bg-warning/20 text-warning text-sm font-medium">
              {pendingCount} pending
            </div>
          )}
        </div>
      </header>

      {/* Filters */}
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center gap-2 mb-6">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <div className="flex gap-2">
            {(["all", "pending", "approved", "denied"] as FilterStatus[]).map(
              (status) => (
                <Button
                  key={status}
                  variant={filter === status ? "default" : "secondary"}
                  size="sm"
                  onClick={() => changeFilter(status)}
                  className={cn(
                    "capitalize",
                    filter === status && "bg-gradient-primary",
                  )}
                >
                  {status}
                </Button>
              ),
            )}
          </div>
        </div>

        {/* Locations List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filteredLocations.length === 0 ? (
          <div className="text-center py-12">
            <MapPin className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
            <p className="text-muted-foreground">
              No {filter !== "all" ? filter : ""} locations found
            </p>
          </div>
        ) : (
          <div>
            {/* PAGINATED GRID (TEST TARGET) */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {pagedLocations.map((location) => (
                <LocationCard
                  key={location.id}
                  location={location}
                  isProcessing={processingId === location.id}
                  onApprove={() => handleApprove(location.id)}
                  onDeny={() => handleDeny(location.id)}
                  onDelete={() => handleDelete(location.id)}
                />
              ))}
            </div>

            {/* PAGINATION CONTROLS */}
            {filteredLocations.length > pageSize && (
              <div className="flex items-center justify-center gap-3 mt-8">
                {/* TESTING NOTES:
                    - "Prev" should be disabled on page 1
                    - Clicking "Prev" should move back one page */}
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  Prev
                </Button>

                {/* TESTING NOTES:
                    - Page indicator should always reflect current page correctly */}
                <span className="text-sm text-muted-foreground">
                  Page {page} of {totalPages}
                </span>

                {/* TESTING NOTES:
                    - "Next" should be disabled on the last page
                    - Clicking "Next" should advance one page */}
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() =>
                    setPage((p) => Math.min(totalPages, p + 1))
                  }
                  disabled={page === totalPages}
                >
                  Next
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

interface LocationCardProps {
  location: Location;
  isProcessing: boolean;
  onApprove: () => void;
  onDeny: () => void;
  onDelete: () => void;
}

function LocationCard({
  location,
  isProcessing,
  onApprove,
  onDeny,
  onDelete,
}: LocationCardProps) {
  return (
    <div className="glass-panel rounded-xl p-5 fade-in">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
            <MapPin className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold">{location.name}</h3>
            <span
              className={cn(
                "text-xs px-2 py-0.5 rounded-full capitalize",
                location.status === "approved" && "status-approved",
                location.status === "pending" && "status-pending",
                location.status === "denied" && "status-denied",
              )}
            >
              {location.status}
            </span>
          </div>
        </div>
      </div>

      {location.description && (
        <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
          {location.description}
        </p>
      )}

      <div className="flex items-center gap-4 text-xs text-muted-foreground mb-4">
        <span className="font-mono">
          {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
        </span>
        <span className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {format(new Date(location.created_at), "MMM d, yyyy")}
        </span>
      </div>

      <div className="flex gap-2">
        {location.status === "pending" && (
          <>
            <Button
              size="sm"
              onClick={onApprove}
              disabled={isProcessing}
              className="flex-1 bg-success hover:bg-success/90"
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
              variant="destructive"
              onClick={onDeny}
              disabled={isProcessing}
              className="flex-1"
            >
              <X className="h-4 w-4 mr-1" />
              Deny
            </Button>
          </>
        )}

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              size="sm"
              variant="ghost"
              disabled={isProcessing}
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent className="glass-panel">
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Location</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete "{location.name}"? This action
                cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={onDelete}
                className="bg-destructive hover:bg-destructive/90"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
