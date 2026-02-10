import { useState } from "react";
import {
  Check,
  X,
  Trash2,
  MapPin,
  Clock,
  Filter,
  Loader2,
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

type FilterStatus = "all" | "pending" | "approved" | "denied";

export function AdminDashboard() {
  const [filter, setFilter] = useState<FilterStatus>("pending");
  const [processingId, setProcessingId] = useState<string | null>(null);

  // pagination
  const [page, setPage] = useState(1);
  const pageSize = 9;

  const { isAdmin, isLoading: authLoading } = useAuth();
  const { locations, isLoading, updateLocationStatus, deleteLocation } =
    useLocations();

  const changeFilter = (status: FilterStatus) => {
    setFilter(status);
    setPage(1);
  };

  // LOADING
  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
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

  // ACTIONS
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
    <div className="min-h-screen p-4 md:p-6 space-y-6">
      {/* HEADER */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Suggestions
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

      {/* FILTERS */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-gray-400" />
          <span className="text-sm text-gray-500">Filter</span>
        </div>

        <div className="flex flex-wrap gap-3">
          {(["all", "pending", "approved", "denied"] as FilterStatus[]).map(
            (status) => (
              <Button
                key={status}
                size="sm"
                onClick={() => changeFilter(status)}
                className={cn(
                  "capitalize rounded-xl px-6 font-semibold border-2 transition w-full sm:w-auto",
                  filter === status
                    ? `${colors[status].activeBg} ${colors[status].text} border-transparent`
                    : `bg-white ${colors[status].border} text-gray-700 hover:bg-gray-100`
                )}
              >
                {status}
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
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
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
    <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
      {/* HEADER */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
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
      {location.status === "pending" && (
        <div className="flex flex-col sm:flex-row gap-2">
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

      {/* DELETE */}
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button
            size="sm"
            variant="ghost"
            className="mt-4 text-red-500 hover:bg-red-50"
          >
            <Trash2 className="h-4 w-4" />
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
  );
}
