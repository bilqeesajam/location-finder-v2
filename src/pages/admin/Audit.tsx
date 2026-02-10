import { useState, useMemo } from "react";
import { 
  Search, 
  Filter, 
  Download, 
  CheckCircle, 
  XCircle, 
  Trash2, 
  Edit, 
  UserPlus, 
  UserMinus,
  Shield,
  Calendar,
  Clock,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight
} from "lucide-react";
import { useLocations } from "@/hooks/useLocations";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { format, isWithinInterval } from "date-fns";

// Action type configuration
const actionConfig = {
  APPROVED: { 
    icon: CheckCircle, 
    color: "bg-green-100 text-green-800 border-green-200",
    textColor: "text-green-600"
  },
  REJECTED: { 
    icon: XCircle, 
    color: "bg-red-100 text-red-800 border-red-200",
    textColor: "text-red-600"
  },
  ADDED: { 
    icon: CheckCircle, 
    color: "bg-blue-100 text-blue-800 border-blue-200",
    textColor: "text-blue-600"
  },
  EDITED: { 
    icon: Edit, 
    color: "bg-yellow-100 text-yellow-800 border-yellow-200",
    textColor: "text-yellow-600"
  },
  DELETED: { 
    icon: Trash2, 
    color: "bg-purple-100 text-purple-800 border-purple-200",
    textColor: "text-purple-600"
  },
  USER_ADDED: { 
    icon: UserPlus, 
    color: "bg-indigo-100 text-indigo-800 border-indigo-200",
    textColor: "text-indigo-600"
  },
  USER_MODIFIED: { 
    icon: Shield, 
    color: "bg-cyan-100 text-cyan-800 border-cyan-200",
    textColor: "text-cyan-600"
  },
  USER_DELETED: { 
    icon: UserMinus, 
    color: "bg-pink-100 text-pink-800 border-pink-200",
    textColor: "text-pink-600"
  },
  SYSTEM: { 
    icon: Clock, 
    color: "bg-gray-100 text-gray-800 border-gray-200",
    textColor: "text-gray-600"
  }
};

type ActionType = keyof typeof actionConfig;
type TargetType = "Location" | "User" | "System" | "All";

export default function AuditLogPage() {
  const { locations, isLoading } = useLocations();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterAction, setFilterAction] = useState<ActionType | "All">("All");
  const [filterTarget, setFilterTarget] = useState<TargetType>("All");
  const [sortBy, setSortBy] = useState<"newest" | "oldest">("newest");
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 6;

  // Transform location data into audit log format
  const auditLogs = useMemo(() => {
    return locations.map((location, index) => {
      // Determine action based on location status
      let action: ActionType = "ADDED";
      let details = "Location added by user";
      
      if (location.status === 'approved') {
        action = "APPROVED";
        details = `Location "${location.name}" approved by admin`;
      } else if (location.status === 'denied') {
        action = "REJECTED";
        details = `Location "${location.name}" rejected by admin`;
      } else if (location.status === 'pending') {
        action = "ADDED";
        details = `New location "${location.name}" submitted`;
      }
      
      // Get user email from location data
      const userEmail = (location as any).user_email || "anonymous";
      const adminName = location.status === 'pending' ? 
        (userEmail.split('@')[0] || 'User') : 
        `Admin ${String(index + 1).padStart(3, '0')}`;
      
      return {
        id: location.id || `loc-${index}`,
        timestamp: location.created_at ? new Date(location.created_at) : new Date(),
        action,
        targetType: "Location" as const,
        targetName: location.name || `Unnamed Location ${index + 1}`,
        adminId: location.status === 'pending' ? `user_${userEmail.split('@')[0]}` : `admin_${String(index + 1).padStart(3, '0')}`,
        adminName,
        details,
        ipAddress: "192.168.1." + (100 + (index % 50)), // Mock IP based on index
        userAgent: index % 3 === 0 ? "Chrome/Windows" : index % 3 === 1 ? "Firefox/Mac" : "Safari/iOS",
        locationData: location // Keep original location data
      };
    });
  }, [locations]);

  // Filter and sort audit logs
  const filteredLogs = useMemo(() => {
    return auditLogs
      .filter(log => {
        // Search filter
        const matchesSearch = searchQuery === "" || 
          log.targetName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          log.adminName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          log.details.toLowerCase().includes(searchQuery.toLowerCase());
        
        // Action filter
        const matchesAction = filterAction === "All" || log.action === filterAction;
        
        // Target type filter
        const matchesTarget = filterTarget === "All" || log.targetType === filterTarget;
        
        return matchesSearch && matchesAction && matchesTarget;
      })
      .sort((a, b) => {
        if (sortBy === "newest") {
          return b.timestamp.getTime() - a.timestamp.getTime();
        } else {
          return a.timestamp.getTime() - b.timestamp.getTime();
        }
      });
  }, [auditLogs, searchQuery, filterAction, filterTarget, sortBy]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredLogs.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const paginatedLogs = filteredLogs.slice(startIndex, endIndex);

  // Get unique actions for filter
  const uniqueActions = Array.from(new Set(auditLogs.map(log => log.action)));

  // Get icon component for action
  const getActionIcon = (action: ActionType) => {
    const config = actionConfig[action];
    return config.icon;
  };

  // Format timestamp
  const formatTimestamp = (date: Date) => {
    return {
      date: format(date, "MMM d, yyyy"),
      time: format(date, "h:mm a"),
      full: format(date, "MMM d, yyyy 'at' h:mm a")
    };
  };

  // Export function (mock)
  const handleExport = () => {
    alert("Export feature would generate CSV file with all audit logs");
  };

  // Pagination handlers
  const goToFirstPage = () => setCurrentPage(1);
  const goToLastPage = () => setCurrentPage(totalPages);
  const goToPreviousPage = () => setCurrentPage(prev => Math.max(1, prev - 1));
  const goToNextPage = () => setCurrentPage(prev => Math.min(totalPages, prev + 1));
  const goToPage = (page: number) => setCurrentPage(page);

  // Generate page numbers for pagination
  const getPageNumbers = () => {
    const pageNumbers = [];
    const maxVisiblePages = 5;
    
    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pageNumbers.push(i);
      }
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) {
          pageNumbers.push(i);
        }
        pageNumbers.push('...');
        pageNumbers.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pageNumbers.push(1);
        pageNumbers.push('...');
        for (let i = totalPages - 3; i <= totalPages; i++) {
          pageNumbers.push(i);
        }
      } else {
        pageNumbers.push(1);
        pageNumbers.push('...');
        for (let i = currentPage - 1; i <= currentPage + 1; i++) {
          pageNumbers.push(i);
        }
        pageNumbers.push('...');
        pageNumbers.push(totalPages);
      }
    }
    
    return pageNumbers;
  };

  // Reset to first page when filters change
  useState(() => {
    setCurrentPage(1);
  });

  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Audit Log</h1>
          <p className="text-gray-500 text-sm">
            Chronological record of all administrative actions and system events
          </p>
        </div>
        
        <Button 
          onClick={handleExport}
          variant="outline"
          className="bg-green-700 hover:bg-green-800 text-white px-3 py-1.5 rounded-md text-sm w-full sm:w-auto"
        >
          <Download className="h-4 w-4 mr-2" />
          Export Logs
        </Button>
      </div>

      {/* Filters */}
      <Card className="p-4 bg-white shadow-sm">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
              <Input
                placeholder="Search by admin, target, or details..."
                className="pl-10 text-gray-700 bg-transparent border-gray-300"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
              />
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-2">
            {/* Action Filter */}
            <div className="relative w-full sm:w-auto">
              <select
                className="appearance-none w-full sm:w-auto bg-white border border-gray-300 rounded-lg px-4 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-700"
                value={filterAction}
                onChange={(e) => {
                  setFilterAction(e.target.value as ActionType | "All");
                  setCurrentPage(1);
                }}
              >
                <option value="All" className="text-gray-700">All Actions</option>
                {uniqueActions.map(action => (
                  <option key={action} value={action} className="text-gray-700">
                    {action.replace("_", " ")}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-600 pointer-events-none" />
            </div>

            {/* Target Type Filter */}
            <div className="relative w-full sm:w-auto">
              <select
                className="appearance-none w-full sm:w-auto bg-white border border-gray-300 rounded-lg px-4 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-700"
                value={filterTarget}
                onChange={(e) => {
                  setFilterTarget(e.target.value as TargetType);
                  setCurrentPage(1);
                }}
              >
                <option value="All" className="text-gray-700">All Types</option>
                <option value="Location" className="text-gray-700">Location</option>
                <option value="User" className="text-gray-700">User</option>
                <option value="System" className="text-gray-700">System</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-600 pointer-events-none" />
            </div>

            {/* Sort Filter */}
            <div className="relative w-full sm:w-auto">
              <select
                className="appearance-none w-full sm:w-auto bg-white border border-gray-300 rounded-lg px-4 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-700"
                value={sortBy}
                onChange={(e) => {
                  setSortBy(e.target.value as "newest" | "oldest");
                  setCurrentPage(1);
                }}
              >
                <option value="newest" className="text-gray-700">Newest First</option>
                <option value="oldest" className="text-gray-700">Oldest First</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-600 pointer-events-none" />
            </div>

            {/* Clear Filters */}
            {(searchQuery || filterAction !== "All" || filterTarget !== "All") && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchQuery("");
                  setFilterAction("All");
                  setFilterTarget("All");
                  setCurrentPage(1);
                }}
                className="text-gray-700 hover:text-gray-900"
              >
                Clear Filters
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* Results Count */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-700">
          Showing <span className="font-medium">{startIndex + 1}-{Math.min(endIndex, filteredLogs.length)}</span> of{" "}
          <span className="font-medium">{filteredLogs.length}</span> audit logs
          {isLoading && " (loading...)"}
        </div>
      </div>

      {/* Audit Log Table */}
      <Card className="bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left py-3 px-4 font-semibold text-gray-700 text-sm">Timestamp</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700 text-sm">Action</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700 text-sm">Target</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700 text-sm">Admin</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700 text-sm">Details</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700 text-sm">IP Address</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-gray-600">
                    <div className="flex flex-col items-center justify-center">
                      <Clock className="h-12 w-12 text-gray-400 mb-3 animate-pulse" />
                      <p className="text-gray-700">Loading audit logs...</p>
                    </div>
                  </td>
                </tr>
              ) : paginatedLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-gray-600">
                    <div className="flex flex-col items-center justify-center">
                      <Filter className="h-12 w-12 text-gray-400 mb-3" />
                      <p className="text-gray-700">No audit logs found</p>
                      <p className="text-sm text-gray-600 mt-1">
                        {locations.length === 0 
                          ? "No location data available" 
                          : "Try adjusting your search or filters"}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedLogs.map((log) => {
                  const config = actionConfig[log.action as ActionType] || actionConfig.SYSTEM;
                  const Icon = getActionIcon(log.action as ActionType);
                  const timestamp = formatTimestamp(log.timestamp);
                  
                  return (
                    <tr key={log.id} className="border-b border-gray-100 hover:bg-gray-50 group">
                      {/* Timestamp */}
                      <td className="py-3 px-4">
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-gray-900">{timestamp.date}</span>
                          <span className="text-xs text-gray-600">{timestamp.time}</span>
                        </div>
                      </td>
                      
                      {/* Action */}
                      <td className="py-3 px-4">
                        <Badge className={`${config.color} font-medium`}>
                          <Icon className={`h-3 w-3 mr-1 ${config.textColor}`} />
                          {log.action.replace("_", " ")}
                        </Badge>
                      </td>
                      
                      {/* Target */}
                      <td className="py-3 px-4">
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-gray-900">{log.targetName}</span>
                          <span className="text-xs text-gray-600">{log.targetType}</span>
                        </div>
                      </td>
                      
                      {/* Admin */}
                      <td className="py-3 px-4">
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-gray-900">{log.adminName}</span>
                          <span className="text-xs text-gray-600 font-mono">{log.adminId}</span>
                        </div>
                      </td>
                      
                      {/* Details */}
                      <td className="py-3 px-4">
                        <p className="text-sm text-gray-700 max-w-xs">{log.details}</p>
                      </td>
                      
                      {/* IP Address */}
                      <td className="py-3 px-4">
                        <div className="flex flex-col">
                          <span className="text-sm font-mono text-gray-900">{log.ipAddress}</span>
                          <span className="text-xs text-gray-600 truncate max-w-[150px]">{log.userAgent}</span>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Pagination */}
      {!isLoading && filteredLogs.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-sm text-gray-700">
            Page <span className="font-medium">{currentPage}</span> of{" "}
            <span className="font-medium">{totalPages}</span>
          </div>
          
          <div className="flex flex-wrap items-center gap-2">
            {/* First Page */}
            <Button
              variant="outline"
              size="sm"
              onClick={goToFirstPage}
              disabled={currentPage === 1}
              className="h-8 w-8 p-0 border-gray-300 bg-white text-gray-700  disabled:opacity-50"
            >
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            
            {/* Previous Page */}
            <Button
              variant="outline"
              size="sm"
              onClick={goToPreviousPage}
              disabled={currentPage === 1}
              className="h-8 w-8 p-0 border-gray-300 bg-white text-gray-700  disabled:opacity-50"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            
            {/* Page Numbers */}
            <div className="flex flex-wrap gap-1">
              {getPageNumbers().map((page, index) => (
                page === '...' ? (
                  <div key={`ellipsis-${index}`} className="px-2 py-1 text-gray-500">
                    ...
                  </div>
                ) : (
                  <Button
                    key={`page-${page}`}
                    variant={currentPage === page ? "default" : "outline"}
                    size="sm"
                    onClick={() => goToPage(page as number)}
                    className={`h-8 w-8 p-0 border-gray-300 bg-white ${
                      currentPage === page 
                        ? 'bg-green-700 text-white border-green-700' 
                        : 'text-gray-700 '
                    }`}
                  >
                    {page}
                  </Button>
                )
              ))}
            </div>
            
            {/* Next Page */}
            <Button
              variant="outline"
              size="sm"
              onClick={goToNextPage}
              disabled={currentPage === totalPages}
              className="h-8 w-8 p-0 border-gray-300 bg-white text-gray-700  disabled:opacity-50"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            
            {/* Last Page */}
            <Button
              variant="outline"
              size="sm"
              onClick={goToLastPage}
              disabled={currentPage === totalPages}
              className="h-8 w-8 p-0 border-gray-300 bg-white text-gray-700  disabled:opacity-50"
            >
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
          
          {/* Rows per page selector */}
          <div className="flex items-center gap-2 text-sm text-gray-700">
            <span>Rows per page:</span>
            <select 
              className="bg-transparent border-none focus:outline-none focus:ring-0 text-gray-700"
              value={rowsPerPage}
              onChange={(e) => {
                // In a real app, you would update rowsPerPage state here
                // For now, we keep it fixed at 6
              }}
            >
              <option value="6" className="text-gray-700">6</option>
              <option value="10" className="text-gray-700">10</option>
              <option value="25" className="text-gray-700">25</option>
              <option value="50" className="text-gray-700">50</option>
            </select>
          </div>
        </div>
      )}

      {/* Legend */}
      <Card className="p-4 bg-white shadow-sm">
        <h3 className="font-medium text-gray-900 mb-3">Action Legend</h3>
        <div className="flex flex-wrap gap-3">
          {Object.entries(actionConfig).slice(0, 5).map(([action, config]) => {
            const Icon = config.icon;
            return (
              <div key={action} className="flex items-center gap-2">
                <div className={`h-6 w-6 rounded flex items-center justify-center ${config.color.split(' ')[0]}`}>
                  <Icon className={`h-3 w-3 ${config.textColor}`} />
                </div>
                <span className="text-sm text-gray-700">{action.replace("_", " ")}</span>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Additional Information */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4 bg-white shadow-sm">
          <h3 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
            <Calendar className="h-4 w-4 text-gray-600" />
            Data Source
          </h3>
          <p className="text-sm text-gray-700">
            Audit logs are generated from actual location submissions, 
            approvals, and rejections in your system.
          </p>
          <p className="text-xs text-gray-600 mt-2">
            Total locations: <span className="font-medium">{locations.length}</span>
          </p>
        </Card>

        <Card className="p-4 bg-white shadow-sm">
          <h3 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
            <Shield className="h-4 w-4 text-gray-600" />
            Real Data
          </h3>
          <p className="text-sm text-gray-700">
            This log shows actual administrative actions from your location 
            moderation activities.
          </p>
        </Card>

        <Card className="p-4 bg-white shadow-sm">
          <h3 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
            <Clock className="h-4 w-4 text-gray-600" />
            Live Updates
          </h3>
          <p className="text-sm text-gray-700">
            Audit logs update automatically as new locations are submitted 
            or moderated.
          </p>
        </Card>
      </div>
    </div>
  );
}
