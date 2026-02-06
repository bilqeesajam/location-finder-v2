import { useState } from "react";
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
  ChevronDown
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

// Mock audit log data - In real app, this would come from your backend
const mockAuditLog = [
  {
    id: "1",
    timestamp: new Date(2026, 1, 5, 14, 30), // Feb 5, 2026, 2:30 PM
    action: "APPROVED",
    targetType: "Location",
    targetName: "Trumps House",
    adminId: "admin_001",
    adminName: "Admin 001",
    details: "Approved pending submission",
    ipAddress: "192.168.1.100",
    userAgent: "Chrome/Windows"
  },
  {
    id: "2",
    timestamp: new Date(2026, 1, 5, 12, 15),
    action: "ADDED",
    targetType: "Location",
    targetName: "Trumps House",
    adminId: "user_shigebunz",
    adminName: "Shigebunz",
    details: "Added new location suggestion",
    ipAddress: "192.168.1.150",
    userAgent: "Firefox/Mac"
  },
  {
    id: "3",
    timestamp: new Date(2026, 1, 4, 16, 45),
    action: "REJECTED",
    targetType: "Location",
    targetName: "Talledega Grill",
    adminId: "admin_033",
    adminName: "Admin 033",
    details: "Rejected submission - Invalid address",
    ipAddress: "192.168.1.120",
    userAgent: "Safari/Mac"
  },
  {
    id: "4",
    timestamp: new Date(2026, 1, 4, 11, 20),
    action: "EDITED",
    targetType: "Location",
    targetName: "Life Choices Academy",
    adminId: "admin_033",
    adminName: "Admin 033",
    details: "Updated location details and category",
    ipAddress: "192.168.1.120",
    userAgent: "Safari/Mac"
  },
  {
    id: "5",
    timestamp: new Date(2026, 1, 3, 9, 10),
    action: "APPROVED",
    targetType: "Location",
    targetName: "Zuhayr's House",
    adminId: "admin_044",
    adminName: "Admin 044",
    details: "Approved pending submission",
    ipAddress: "192.168.1.130",
    userAgent: "Chrome/Windows"
  },
  {
    id: "6",
    timestamp: new Date(2026, 1, 3, 8, 45),
    action: "REJECTED",
    targetType: "Location",
    targetName: "White Party",
    adminId: "admin_083",
    adminName: "Admin 083",
    details: "Rejected submission - Inappropriate content",
    ipAddress: "192.168.1.140",
    userAgent: "Edge/Windows"
  },
  {
    id: "7",
    timestamp: new Date(2026, 1, 2, 15, 30),
    action: "DELETED",
    targetType: "Location",
    targetName: "Old Coffee Shop",
    adminId: "admin_001",
    adminName: "Admin 001",
    details: "Deleted duplicate location",
    ipAddress: "192.168.1.100",
    userAgent: "Chrome/Windows"
  },
  {
    id: "8",
    timestamp: new Date(2026, 1, 2, 10, 15),
    action: "USER_ADDED",
    targetType: "User",
    targetName: "newuser@example.com",
    adminId: "admin_001",
    adminName: "Admin 001",
    details: "Added new admin user",
    ipAddress: "192.168.1.100",
    userAgent: "Chrome/Windows"
  },
  {
    id: "9",
    timestamp: new Date(2026, 1, 1, 17, 20),
    action: "USER_MODIFIED",
    targetType: "User",
    targetName: "existinguser@example.com",
    adminId: "admin_033",
    adminName: "Admin 033",
    details: "Updated user permissions",
    ipAddress: "192.168.1.120",
    userAgent: "Safari/Mac"
  },
  {
    id: "10",
    timestamp: new Date(2026, 0, 31, 13, 45),
    action: "SYSTEM",
    targetType: "System",
    targetName: "Backup",
    adminId: "system",
    adminName: "System",
    details: "Automatic weekly backup completed",
    ipAddress: "127.0.0.1",
    userAgent: "System"
  }
];

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
  const [searchQuery, setSearchQuery] = useState("");
  const [filterAction, setFilterAction] = useState<ActionType | "All">("All");
  const [filterTarget, setFilterTarget] = useState<TargetType>("All");
  const [sortBy, setSortBy] = useState<"newest" | "oldest">("newest");

  // Filter and sort audit logs
  const filteredLogs = mockAuditLog
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

  // Get unique actions for filter
  const uniqueActions = Array.from(new Set(mockAuditLog.map(log => log.action)));
  const uniqueTargets = Array.from(new Set(mockAuditLog.map(log => log.targetType)));

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

  return (
    <div className="min-h-screen bg-gray-100 p-6 space-y-6">
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
          className="border-gray-300 hover:bg-gray-50"
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
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by admin, target, or details..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-2">
            {/* Action Filter */}
            <div className="relative">
              <select
                className="appearance-none bg-white border border-gray-300 rounded-lg px-4 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={filterAction}
                onChange={(e) => setFilterAction(e.target.value as ActionType | "All")}
              >
                <option value="All">All Actions</option>
                {uniqueActions.map(action => (
                  <option key={action} value={action}>
                    {action.replace("_", " ")}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            </div>

            {/* Target Type Filter */}
            <div className="relative">
              <select
                className="appearance-none bg-white border border-gray-300 rounded-lg px-4 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={filterTarget}
                onChange={(e) => setFilterTarget(e.target.value as TargetType)}
              >
                <option value="All">All Types</option>
                {uniqueTargets.map(target => (
                  <option key={target} value={target}>{target}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            </div>

            {/* Sort Filter */}
            <div className="relative">
              <select
                className="appearance-none bg-white border border-gray-300 rounded-lg px-4 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as "newest" | "oldest")}
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
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
                }}
                className="text-gray-600 hover:text-gray-900"
              >
                Clear Filters
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* Results Count */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-600">
          Showing <span className="font-medium">{filteredLogs.length}</span> of{" "}
          <span className="font-medium">{mockAuditLog.length}</span> audit logs
        </div>
      </div>

      {/* Audit Log Table */}
      <Card className="bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
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
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-gray-500">
                    <div className="flex flex-col items-center justify-center">
                      <Filter className="h-12 w-12 text-gray-300 mb-3" />
                      <p className="text-gray-600">No audit logs match your filters</p>
                      <p className="text-sm text-gray-500 mt-1">Try adjusting your search or filters</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => {
                  const config = actionConfig[log.action as ActionType] || actionConfig.SYSTEM;
                  const Icon = getActionIcon(log.action as ActionType);
                  const timestamp = formatTimestamp(log.timestamp);
                  
                  return (
                    <tr key={log.id} className="border-b border-gray-100 hover:bg-gray-50 group">
                      {/* Timestamp */}
                      <td className="py-3 px-4">
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-gray-900">{timestamp.date}</span>
                          <span className="text-xs text-gray-500">{timestamp.time}</span>
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
                          <span className="text-xs text-gray-500">{log.targetType}</span>
                        </div>
                      </td>
                      
                      {/* Admin */}
                      <td className="py-3 px-4">
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-gray-900">{log.adminName}</span>
                          <span className="text-xs text-gray-500 font-mono">{log.adminId}</span>
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
                          <span className="text-xs text-gray-500 truncate max-w-[150px]">{log.userAgent}</span>
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

      {/* Legend */}
      <Card className="p-4 bg-white shadow-sm">
        <h3 className="font-medium text-gray-900 mb-3">Action Legend</h3>
        <div className="flex flex-wrap gap-3">
          {Object.entries(actionConfig).map(([action, config]) => {
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
            <Calendar className="h-4 w-4 text-gray-500" />
            Retention Period
          </h3>
          <p className="text-sm text-gray-600">
            Audit logs are retained for 90 days as per company policy. 
            Critical security events are archived permanently.
          </p>
        </Card>

        <Card className="p-4 bg-white shadow-sm">
          <h3 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
            <Shield className="h-4 w-4 text-gray-500" />
            Security Note
          </h3>
          <p className="text-sm text-gray-600">
            This log includes sensitive administrative actions. 
            Access is restricted to authorized personnel only.
          </p>
        </Card>

        <Card className="p-4 bg-white shadow-sm">
          <h3 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
            <Clock className="h-4 w-4 text-gray-500" />
            Real-time Updates
          </h3>
          <p className="text-sm text-gray-600">
            Audit logs are updated in real-time. All administrative actions 
            are logged immediately upon completion.
          </p>
        </Card>
      </div>
    </div>
  );
}