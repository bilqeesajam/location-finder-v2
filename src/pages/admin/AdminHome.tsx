import { Link } from "react-router-dom";
import { 
  MapPin, 
  CheckCircle2, 
  XCircle, 
  ArrowRight, 
  Calendar, 
  Bell, 
  Check, 
  X, 
  Edit, 
  Plus, 
  Clock, 
  Users,
  AlertCircle 
} from "lucide-react";
import { useLocations } from "@/hooks/useLocations";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useEffect, useState, useMemo } from "react";
import { 
  format, 
  subDays, 
  startOfWeek, 
  endOfWeek, 
  startOfMonth, 
  endOfMonth, 
  isWithinInterval 
} from "date-fns";

// Define a local type that includes all the properties we need
interface ActivityItem {
  id: string | number;
  action: 'approved' | 'rejected' | 'added' | 'edited';
  target: string;
  admin: string;
  time: string;
  timestamp: Date;
}

interface NotificationItem {
  id: string | number;
  title: string;
  description: string;
  time: string;
  type: string;
  timestamp: Date;
}

// Update Location interface to include all needed properties
interface Location {
  id: string | number;
  name: string;
  status: 'pending' | 'approved' | 'denied';
  created_at?: string;
  category?: string;
  user_email?: string;
  [key: string]: any; // Allow additional properties
}

// Date range types
type DateRange = 'today' | 'yesterday' | 'lastWeek' | 'lastMonth' | 'all';

// Statistics data from the screenshot
const platformStatistics = {
  activeLocations: 29,
  liveUsers: 55,
  topLocations: [
    {
      name: "Mnr De Beer Software Studios",
      address: "01 Veio Street, Landsdowne"
    },
    {
      name: "Talledega Grill",
      address: "316 Imam Haron Rd, Lansdowne, Cape Town, 7780"
    },
    {
      name: "The Austrian Painter Academy",
      address: "Somewhere in Germany"
    },
    {
      name: "Life Choices Academy",
      address: "314 Imam Haron Rd, Lansdowne, Cape Town, 7780"
    },
    {
      name: "Bad Boy Crockery",
      address: "319 Imam Haron Rd, Lansdowne, Cape Town, 7780"
    }
  ]
};

// Function to get date range
const getDateRange = (range: DateRange): { start: Date; end: Date; label: string } => {
  const today = new Date();
  
  switch (range) {
    case 'today':
      return {
        start: new Date(today.getFullYear(), today.getMonth(), today.getDate()),
        end: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59),
        label: format(today, 'EEE, dd MMMM yyyy')
      };
    
    case 'yesterday':
      const yesterday = subDays(today, 1);
      return {
        start: new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate()),
        end: new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 23, 59, 59),
        label: format(yesterday, 'EEE, dd MMMM yyyy')
      };
    
    case 'lastWeek':
      const weekStart = startOfWeek(subDays(today, 7));
      const weekEnd = endOfWeek(subDays(today, 7));
      return {
        start: weekStart,
        end: weekEnd,
        label: 'Last week'
      };
    
    case 'lastMonth':
      const monthStart = startOfMonth(subDays(today, 30));
      const monthEnd = endOfMonth(subDays(today, 30));
      return {
        start: monthStart,
        end: monthEnd,
        label: 'Last month'
      };
    
    case 'all':
    default:
      return {
        start: new Date(0), // Beginning of time
        end: new Date(), // Now
        label: 'All time'
      };
  }
};

// Function to generate dynamic recent activity from real suggestions
const generateRecentActivity = (locations: Location[], dateRange: { start: Date; end: Date }): ActivityItem[] => {
  if (!locations.length) return [];
  
  const activities: ActivityItem[] = [];
  
  locations.forEach((location, index) => {
    const createdDate = location.created_at ? new Date(location.created_at) : new Date();
    
    // Check if location is within date range
    if (!isWithinInterval(createdDate, { start: dateRange.start, end: dateRange.end })) {
      return;
    }
    
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - createdDate.getTime()) / (1000 * 60 * 60));
    
    let action: 'approved' | 'rejected' | 'added' | 'edited' = 'added';
    let admin = 'User';
    
    if (location.status === 'approved') {
      action = 'approved';
      admin = 'Admin 001';
    } else if (location.status === 'denied') {
      action = 'rejected';
      admin = 'Admin 033';
    } else if (location.status === 'pending') {
      action = 'added';
      admin = location.user_email?.split('@')[0] || 'User';
    }
    
    // Format time
    let timeText = 'Just now';
    if (diffInHours === 1) timeText = '1 hour ago';
    if (diffInHours > 1 && diffInHours < 24) timeText = `${diffInHours} hours ago`;
    if (diffInHours >= 24) timeText = `${Math.floor(diffInHours / 24)} days ago`;
    
    activities.push({
      action,
      target: location.name || `Suggestion ${index + 1}`,
      admin,
      time: timeText,
      timestamp: createdDate,
      id: location.id || index
    });
  });
  
  // Sort by most recent first
  return activities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()).slice(0, 7);
};

// Function to generate notifications from pending suggestions
const generateNotifications = (locations: Location[], dateRange: { start: Date; end: Date }): NotificationItem[] => {
  const pendingLocations = locations.filter(l => l.status === 'pending');
  
  const notifications: NotificationItem[] = [];
  
  pendingLocations.forEach((location, index) => {
    const createdDate = location.created_at ? new Date(location.created_at) : new Date();
    
    // Check if location is within date range
    if (!isWithinInterval(createdDate, { start: dateRange.start, end: dateRange.end })) {
      return;
    }
    
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - createdDate.getTime()) / (1000 * 60 * 60));
    
    let timeText = 'Just now';
    if (diffInHours === 1) timeText = '1 hour ago';
    if (diffInHours > 1 && diffInHours < 24) timeText = `${diffInHours} hours ago`;
    if (diffInHours >= 24) timeText = `${Math.floor(diffInHours / 24)} days ago`;
    
    notifications.push({
      id: location.id || index,
      title: 'New submission pending review',
      description: `"${location.name || 'Unnamed suggestion'}" requires your approval`,
      time: timeText,
      type: 'pending',
      timestamp: createdDate
    });
  });
  
  return notifications.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()).slice(0, 3);
};

export default function AdminHome() {
  const { locations, isLoading } = useLocations();
  const [dateRange, setDateRange] = useState<DateRange>('today');
  const [selectedDateRange, setSelectedDateRange] = useState(getDateRange('today'));
  const [showMobileActivity, setShowMobileActivity] = useState(false);
  const [showMobileNotifications, setShowMobileNotifications] = useState(false);

  // Update selected date range when dateRange changes
  useEffect(() => {
    setSelectedDateRange(getDateRange(dateRange));
  }, [dateRange]);

  // Filter locations based on selected date range
  const filteredLocations = useMemo(() => {
    return locations.filter(location => {
      const createdDate = location.created_at ? new Date(location.created_at) : new Date();
      return isWithinInterval(createdDate, { 
        start: selectedDateRange.start, 
        end: selectedDateRange.end 
      });
    });
  }, [locations, selectedDateRange]);

  // Calculate stats from filtered locations
  const pendingCount = filteredLocations.filter((l) => l.status === "pending").length;
  const approvedCount = filteredLocations.filter((l) => l.status === "approved").length;
  const deniedCount = filteredLocations.filter((l) => l.status === "denied").length;

  // Get only 6 recent filtered locations for the table
  const recentLocations = filteredLocations.slice(0, 6);
  
  // Generate dynamic recent activity from filtered data
  const recentActivity = generateRecentActivity(filteredLocations, selectedDateRange);
  
  // Generate notifications from filtered pending suggestions
  const notifications = generateNotifications(filteredLocations, selectedDateRange);

  // Function to get icon based on action
  const getActionIcon = (action: string) => {
    switch (action) {
      case 'approved':
        return <Check className="h-3.5 w-3.5 text-green-500" />;
      case 'rejected':
        return <X className="h-3.5 w-3.5 text-red-500" />;
      case 'edited':
        return <Edit className="h-3.5 w-3.5 text-blue-500" />;
      case 'added':
        return <Plus className="h-3.5 w-3.5 text-yellow-500" />;
      default:
        return <Plus className="h-3.5 w-3.5 text-gray-500" />;
    }
  };

  // Function to get background color based on action
  const getActionBgColor = (action: string) => {
    switch (action) {
      case 'approved':
        return 'bg-green-50 border-l-4 border-green-400';
      case 'rejected':
        return 'bg-red-50 border-l-4 border-red-400';
      case 'edited':
        return 'bg-blue-50 border-l-4 border-blue-400';
      case 'added':
        return 'bg-yellow-50 border-l-4 border-yellow-400';
      default:
        return 'bg-gray-50 border-l-4 border-gray-400';
    }
  };

  // Safe getter functions to handle optional properties
  const getCategory = (location: Location): string => {
    return location.category || "Uncategorized";
  };

  const getUserEmail = (location: Location): string => {
    return location.user_email || "anonymous";
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-6">
      <div className="flex flex-col xl:flex-row gap-6">
        {/* MAIN CONTENT AREA (Left - 70% width) */}
        <div className="w-full lg:w-[70%] space-y-6">
          {/* Mobile Date Selector */}
          <div className="lg:hidden">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 bg-white p-3 rounded-xl shadow-sm border border-gray-200">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-gray-500" />
                <span className="text-sm text-gray-700 font-medium">{selectedDateRange.label}</span>
              </div>
              <select
                className="bg-transparent text-gray-500 border-none focus:outline-none focus:ring-0 cursor-pointer text-xs w-full sm:w-auto"
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value as DateRange)}
              >
                <option value="today">Today</option>
                <option value="yesterday">Yesterday</option>
                <option value="lastWeek">Last week</option>
                <option value="lastMonth">Last month</option>
                <option value="all">All time</option>
              </select>
            </div>
          </div>

          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Welcome Back, Admin 001</h1>
            </div>
          </div>

          {/* Stats Cards Section */}
          <div>
            {/* Mobile Quick Panels */}
            <div className="lg:hidden mb-3">
              <div className="flex items-center gap-3">
                {/* Recent Activity Button */}
                <div className="relative">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-10 w-10 rounded-xl border-gray-300 bg-gray-100 text-gray-700 hover:bg-green-50 hover:border-green-400 group"
                    onClick={() => {
                      setShowMobileActivity((v) => !v);
                      setShowMobileNotifications(false);
                    }}
                    aria-label="Toggle recent activity"
                  >
                    <Clock className="h-4 w-4 text-gray-700 group-hover:text-green-600" />
                  </Button>
                  {showMobileActivity && (
                    <Card className="relative absolute z-20 mt-2 w-[290px] sm:w-[360px] bg-white shadow-lg rounded-xl p-3 border border-gray-200">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute top-2 right-2 h-6 w-6 text-gray-700 bg-gray-100 hover:bg-gray-200"
                        onClick={() => setShowMobileActivity(false)}
                        aria-label="Close recent activity"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                      <div className="flex items-center justify-between mb-2 pr-8">
                        <h3 className="font-medium text-gray-900 text-sm">Recent Activity</h3>
                      </div>
                      <div className="space-y-2 max-h-[240px] overflow-y-auto pr-1">
                        {isLoading ? (
                          <div className="text-center py-4 text-gray-500 text-sm">
                            Loading activity...
                          </div>
                        ) : recentActivity.length > 0 ? (
                          recentActivity.map((activity) => (
                            <div
                              key={activity.id}
                              className={`flex items-start gap-2 p-2 rounded-lg ${getActionBgColor(activity.action)}`}
                            >
                              <div className="mt-0.5">
                                {getActionIcon(activity.action)}
                              </div>
                              <div className="flex-1">
                                <p className="text-xs text-gray-700 leading-tight">
                                  <span className="font-medium">{activity.admin}</span>{" "}
                                  {activity.action}{" "}
                                  <span className="font-medium">{activity.target}</span>
                                </p>
                                <div className="flex items-center gap-1 mt-1">
                                  <Clock className="h-2.5 w-2.5 text-gray-400" />
                                  <span className="text-xs text-gray-400">{activity.time}</span>
                                </div>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="text-center py-4 text-gray-500 text-sm">
                            No activity for {selectedDateRange.label.toLowerCase()}
                          </div>
                        )}
                      </div>
                    </Card>
                  )}
                </div>

                {/* Notifications Button */}
                <div className="relative">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-10 w-10 rounded-xl border-gray-300 bg-gray-100 text-gray-700 hover:bg-green-50 hover:border-green-400 relative group"
                    onClick={() => {
                      setShowMobileNotifications((v) => !v);
                      setShowMobileActivity(false);
                    }}
                    aria-label="Toggle notifications"
                  >
                    <Bell className="h-4 w-4 text-gray-700 group-hover:text-green-600" />
                    <span className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                      {notifications.length}
                    </span>
                  </Button>
                </div>
              </div>
            </div>

            {/* Mobile Notifications Pop-up */}
            {showMobileNotifications && (
              <div className="lg:hidden">
                <Card className="relative fixed z-30 top-24 left-4 right-4 sm:left-auto sm:right-4 sm:w-[360px] bg-white shadow-lg rounded-xl p-3 border border-gray-200">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2 h-6 w-6 text-gray-700 bg-gray-100 hover:bg-gray-200"
                    onClick={() => setShowMobileNotifications(false)}
                    aria-label="Close notifications"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                  <div className="flex items-center justify-between mb-2 pr-8">
                    <h3 className="font-medium text-gray-900 text-sm">Notifications</h3>
                  </div>
                  <div className="space-y-2 max-h-[240px] overflow-y-auto">
                    {isLoading ? (
                      <div className="text-center py-4 text-gray-500 text-sm">
                        Loading notifications...
                      </div>
                    ) : notifications.length > 0 ? (
                      notifications.map((notification) => (
                        <div key={notification.id} className="p-2 bg-yellow-50 rounded-lg border border-yellow-100">
                          <div className="flex items-start gap-2">
                            <AlertCircle className="h-3.5 w-3.5 text-yellow-500 mt-0.5" />
                            <div className="flex-1">
                              <p className="text-xs font-medium text-gray-900">{notification.title}</p>
                              <p className="text-xs text-gray-600 mt-0.5">{notification.description}</p>
                              <div className="flex items-center gap-1 mt-1">
                                <Clock className="h-2.5 w-2.5 text-gray-400" />
                                <span className="text-xs text-gray-400">{notification.time}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-4 text-gray-500 text-sm">
                        No notifications for {selectedDateRange.label.toLowerCase()}
                      </div>
                    )}
                  </div>
                </Card>
              </div>
            )}

            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-800">Overview</h2>
                <p className="text-xs text-gray-500">
                  Quick snapshot of location submissions.
                  <span className="ml-2 text-blue-600 font-medium">
                    ({selectedDateRange.label})
                  </span>
                </p>
              </div>

              <Button asChild className="bg-green-700 hover:bg-green-800 text-white px-3 py-1.5 rounded-md text-sm w-full sm:w-auto">
                <Link to="/admin/suggestions" className="flex items-center gap-1">
                  Go to Suggestions <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
            </div>

            {/* Stats Cards */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Card className="p-4 bg-white shadow-sm rounded-xl border-2 border-yellow-400">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-500">Pending</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {isLoading ? "…" : pendingCount}
                    </p>
                  </div>
                  <div className="h-10 w-10 rounded-xl bg-yellow-400 flex items-center justify-center">
                    <MapPin className="h-5 w-5 text-white" />
                  </div>
                </div>
              </Card>

              <Card className="p-4 bg-white shadow-sm rounded-xl border-2 border-green-400">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-500">Approved</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {isLoading ? "…" : approvedCount}
                    </p>
                  </div>
                  <div className="h-10 w-10 rounded-xl bg-green-400 flex items-center justify-center">
                    <CheckCircle2 className="h-5 w-5 text-white" />
                  </div>
                </div>
              </Card>

              <Card className="p-4 bg-white shadow-sm rounded-xl border-2 border-red-400">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-500">Rejected</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {isLoading ? "…" : deniedCount}
                    </p>
                  </div>
                  <div className="h-10 w-10 rounded-xl bg-red-400 flex items-center justify-center">
                    <XCircle className="h-5 w-5 text-white" />
                  </div>
                </div>
              </Card>
            </div>
          </div>

          {/* Suggestions Overview Table */}
          <Card className="bg-white shadow-sm rounded-xl p-4 overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
              <h3 className="font-semibold text-gray-900">Suggestions Overview</h3>
              <Button asChild size="sm" className="bg-green-700 hover:bg-green-800 text-white px-3 py-1.5 rounded-md text-sm w-full sm:w-auto">
                <Link to="/admin/suggestions" className="flex items-center gap-1">
                  View all <ArrowRight className="h-3 w-3 ml-1" />
                </Link>
              </Button>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px]">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 px-3 font-medium text-gray-700 text-xs">Suggestion</th>
                    <th className="text-left py-2 px-3 font-medium text-gray-700 text-xs">Category</th>
                    <th className="text-left py-2 px-3 font-medium text-gray-700 text-xs">Submitted By</th>
                    <th className="text-left py-2 px-3 font-medium text-gray-700 text-xs">Date</th>
                    <th className="text-left py-2 px-3 font-medium text-gray-700 text-xs">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr>
                      <td colSpan={5} className="py-3 text-center text-gray-500 text-sm">
                        Loading suggestions...
                      </td>
                    </tr>
                  ) : recentLocations.length > 0 ? (
                    recentLocations.map((location, index) => (
                      <tr key={location.id || index} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-2 px-3 text-gray-900 font-medium text-sm truncate max-w-[150px]">
                          {location.name || "Unnamed"}
                        </td>
                        <td className="py-2 px-3 text-gray-600 text-sm">
                          {getCategory(location)}
                        </td>
                        <td className="py-2 px-3 text-gray-600 text-sm truncate max-w-[120px]">
                          {getUserEmail(location)}
                        </td>
                        <td className="py-2 px-3 text-gray-600 text-sm">
                          {location.created_at ? new Date(location.created_at).toLocaleDateString() : "N/A"}
                        </td>
                        <td className="py-2 px-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            location.status === 'approved' ? 'bg-green-100 text-green-800' :
                            location.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                            location.status === 'denied' ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {location.status || "pending"}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="py-4 text-center text-gray-500 text-sm">
                        No suggestions found for {selectedDateRange.label.toLowerCase()}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Tip Card */}
          <Card className="p-4 bg-white shadow-sm rounded-xl">
            <p className="text-xs text-gray-500">
              Tip: Review pending submissions in <b>Suggestions</b>. Analytics and
              audit log will be added once backend support is confirmed.
            </p>
          </Card>
        </div>

        {/* RIGHT SIDEBAR (30% width) */}
        <div className="hidden lg:block w-full lg:w-[30%] space-y-4">
          {/* Date selector DIRECTLY ABOVE Recent Activity */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 bg-white p-3 rounded-xl shadow-sm border border-gray-200">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-gray-500" />
              <span className="text-sm text-gray-700 font-medium">{selectedDateRange.label}</span>
            </div>
            <select 
              className="bg-transparent text-gray-500 border-none focus:outline-none focus:ring-0 cursor-pointer text-xs w-full sm:w-auto"
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value as DateRange)}
            >
              <option value="today">Today</option>
              <option value="yesterday">Yesterday</option>
              <option value="lastWeek">Last week</option>
              <option value="lastMonth">Last month</option>
              <option value="all">All time</option>
            </select>
          </div>

          {/* Recent Activity with data from filtered suggestions */}
          <Card className="bg-white shadow-sm rounded-xl p-3">
            <h3 className="font-medium text-gray-900 mb-2 text-sm">Recent Activity</h3>
            <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
              {isLoading ? (
                <div className="text-center py-4 text-gray-500 text-sm">
                  Loading activity...
                </div>
              ) : recentActivity.length > 0 ? (
                recentActivity.map((activity) => (
                  <div 
                    key={activity.id} 
                    className={`flex items-start gap-2 p-2 rounded-lg ${getActionBgColor(activity.action)}`}
                  >
                    <div className="mt-0.5">
                      {getActionIcon(activity.action)}
                    </div>
                    <div className="flex-1">
                      <p className="text-xs text-gray-700 leading-tight">
                        <span className="font-medium">{activity.admin}</span>{' '}
                        {activity.action}{' '}
                        <span className="font-medium">{activity.target}</span>
                      </p>
                      <div className="flex items-center gap-1 mt-1">
                        <Clock className="h-2.5 w-2.5 text-gray-400" />
                        <span className="text-xs text-gray-400">{activity.time}</span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-4 text-gray-500 text-sm">
                  No activity for {selectedDateRange.label.toLowerCase()}
                </div>
              )}
            </div>
          </Card>

          {/* Statistics Section (Replaced Notifications) */}
          <Card className="bg-white shadow-sm rounded-xl p-3">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-medium text-gray-900 text-sm">Platform Statistics</h3>
              <span className="text-xs bg-blue-500 text-white px-1.5 py-0.5 rounded-full">
                Live
              </span>
            </div>
            
            {/* Scrollable container with same max-height as recent activity */}
            <div className="space-y-4 max-h-[220px] overflow-y-auto pr-1">
              {/* Active Locations Stat */}
              <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-600">Active Locations</p>
                    <p className="text-2xl font-bold text-gray-900">{platformStatistics.activeLocations}</p>
                  </div>
                  <div className="h-10 w-10 rounded-xl bg-blue-500 flex items-center justify-center">
                    <MapPin className="h-5 w-5 text-white" />
                  </div>
                </div>
              </div>

              {/* Live Users Stat */}
              <div className="p-3 bg-green-50 rounded-lg border border-green-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-600">Live Users</p>
                    <p className="text-2xl font-bold text-gray-900">{platformStatistics.liveUsers}</p>
                  </div>
                  <div className="h-10 w-10 rounded-xl bg-green-500 flex items-center justify-center">
                    <Users className="h-5 w-5 text-white" />
                  </div>
                </div>
              </div>

              {/* Top Locations Section */}
              <div>
                <h4 className="text-xs font-medium text-gray-700 mb-2">Top Locations</h4>
                <div className="space-y-2">
                  {platformStatistics.topLocations.map((location, index) => (
                    <div key={index} className="flex items-start gap-2 p-2 bg-gray-50 rounded-lg">
                      <div className="h-5 w-5 rounded-md bg-blue-100 text-blue-600 text-xs font-bold flex items-center justify-center">
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <p className="text-xs font-medium text-gray-900 truncate">{location.name}</p>
                        <p className="text-xs text-gray-500 truncate">{location.address}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
