import { useState, useEffect } from "react";
import { 
  BarChart3, 
  PieChart, 
  TrendingUp, 
  Users, 
  MapPin, 
  Calendar,
  Download,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Table,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { useLocations } from "@/hooks/useLocations";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  format, 
  subDays, 
  startOfDay, 
  endOfDay, 
  isWithinInterval,
  eachDayOfInterval,
  parseISO,
  isValid,
  isSameDay,
  isToday
} from "date-fns";

// Simple chart components
const BarChart = ({ data, labels, height = 200 }: { data: number[], labels: string[], height?: number }) => {
  const maxValue = Math.max(...data, 1);
  
  return (
    <div className="w-full" style={{ height: `${height}px` }}>
      <div className="flex items-end justify-between h-full pt-4">
        {data.map((value, index) => (
          <div key={index} className="flex flex-col items-center flex-1">
            <div 
              className="w-3/4 bg-blue-500 rounded-t hover:bg-blue-600 transition-colors"
              style={{ height: `${(value / maxValue) * 100}%` }}
              title={`${labels[index]}: ${value}`}
            />
            <div className="text-xs text-gray-500 mt-2 truncate w-full text-center">
              {labels[index]}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

interface PieChartData {
  label: string;
  value: number;
  color: string;
}

const PieChartDisplay = ({ data }: { data: PieChartData[] }) => {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  
  if (total === 0) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="text-center text-gray-500">
          No data available
        </div>
      </div>
    );
  }
  
  return (
    <div className="flex items-center justify-center">
      <div className="relative w-40 h-40">
        <div 
          className="w-full h-full rounded-full"
          style={{
            background: `conic-gradient(${data.map((item, index) => 
              `${item.color} 0% ${(item.value / total) * 100}%`
            ).join(', ')})`
          }}
        />
      </div>
      <div className="ml-6 space-y-2">
        {data.map((item, index) => (
          <div key={index} className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: item.color }} />
            <span className="text-sm text-gray-700">{item.label}</span>
            <span className="text-sm font-medium text-gray-900">
              {item.value} ({Math.round((item.value / total) * 100)}%)
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

// Hourly Table Component
const HourlyTable = ({ data }: { data: number[] }) => {
  const [showAll, setShowAll] = useState(false);
  const [currentHour] = useState(new Date().getHours());
  
  // Get hour label
  const getHourLabel = (hour: number) => {
    const hour12 = hour % 12 || 12;
    const ampm = hour < 12 ? 'AM' : 'PM';
    return `${hour12} ${ampm}`;
  };

  // Get data for current and previous 2 hours
  const getRecentHoursData = () => {
    const recentHours = [];
    for (let i = 0; i < 3; i++) {
      const hour = currentHour - i;
      if (hour >= 0) {
        recentHours.push({
          hour,
          label: getHourLabel(hour),
          value: data[hour] || 0,
          isCurrent: i === 0
        });
      }
    }
    return recentHours.reverse(); // Show in chronological order
  };

  // Get all hours data grouped by AM/PM
  const getAllHoursData = () => {
    const hours = Array.from({ length: 24 }, (_, i) => i);
    const amHours = hours.filter(hour => hour < 12).map(hour => ({
      hour,
      label: getHourLabel(hour),
      value: data[hour] || 0,
      isCurrent: hour === currentHour
    }));
    const pmHours = hours.filter(hour => hour >= 12).map(hour => ({
      hour,
      label: getHourLabel(hour),
      value: data[hour] || 0,
      isCurrent: hour === currentHour
    }));
    return { amHours, pmHours };
  };

  const recentHours = getRecentHoursData();
  const { amHours, pmHours } = getAllHoursData();

  return (
    <div className="space-y-4">
      {/* Recent Hours (Always Visible) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-medium text-gray-900">Recent Hours</h4>
          <Badge variant="outline" className="text-xs bg-primary-100">
            Last 3 hours
          </Badge>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {recentHours.map(({ hour, label, value, isCurrent }) => (
            <div 
              key={hour} 
              className={`p-3 rounded-lg border ${isCurrent ? 'border-blue-300 bg-blue-50' : 'border-gray-200 bg-gray-50'}`}
            >
              <div className="flex flex-col space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-900">{label}</span>
                  {isCurrent && (
                    <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5">
                      Now
                    </Badge>
                  )}
                </div>
                <div className="flex items-end justify-between">
                  <span className="text-2xl font-bold text-gray-900">{value}</span>
                  <span className="text-xs text-gray-500">submissions</span>
                </div>
                {value > 0 && (
                  <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-blue-500"
                      style={{ 
                        width: `${Math.min((value / Math.max(...data, 1)) * 100, 100)}%` 
                      }}
                    />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Always Visible Show All Hours Button */}
      <div className="pt-4 border-t">
        <Button
          variant="outline"
          onClick={() => setShowAll(!showAll)}
          className="w-full flex items-center justify-center py-3 border-gray-300 hover:bg-gray-50"
        >
          {showAll ? (
            <>
              <ChevronUp className="h-4 w-4 mr-2" />
              <span className="font-medium">Show Less</span>
            </>
          ) : (
            <>
              <ChevronDown className="h-4 w-4 mr-2" />
              <span className="font-medium">Show All Hours</span>
            </>
          )}
        </Button>
      </div>

      {/* Expandable Full Table */}
      {showAll && (
        <div className="space-y-4 pt-4 border-t">
          {/* AM Hours Table */}
          <div>
            <div className="mb-2 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <h5 className="text-sm font-medium text-gray-900">AM Hours (12:00 AM - 11:59 AM)</h5>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-3 font-medium text-gray-700">Time</th>
                    <th className="text-left py-2 px-3 font-medium text-gray-700">Submissions</th>
                    <th className="text-left py-2 px-3 font-medium text-gray-700">Progress</th>
                  </tr>
                </thead>
                <tbody>
                  {amHours.map(({ hour, label, value, isCurrent }) => (
                    <tr key={hour} className={`border-b hover:bg-gray-50 ${isCurrent ? 'bg-blue-50' : ''}`}>
                      <td className="py-2 px-3">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900">{label}</span>
                          {isCurrent && (
                            <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-800">
                              Now
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className="py-2 px-3">
                        <span className="font-bold text-gray-900">{value}</span>
                        <span className="text-gray-500 text-xs ml-1">submissions</span>
                      </td>
                      <td className="py-2 px-3">
                        <div className="flex items-center gap-3">
                          <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-green-500"
                              style={{ 
                                width: `${Math.min((value / Math.max(...data, 1)) * 100, 100)}%` 
                              }}
                            />
                          </div>
                          <span className="text-xs text-gray-600 min-w-8">
                            {Math.min((value / Math.max(...data, 1)) * 100, 100).toFixed(0)}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-50">
                    <td colSpan={3} className="py-3 px-3">
                      <div className="flex justify-between items-center">
                        <span className="font-medium text-gray-900">Total AM Submissions</span>
                        <span className="font-bold text-gray-900">
                          {amHours.reduce((sum, { value }) => sum + value, 0)}
                        </span>
                      </div>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* PM Hours Table */}
          <div>
            <div className="mb-2 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-orange-500" />
              <h5 className="text-sm font-medium text-gray-900">PM Hours (12:00 PM - 11:59 PM)</h5>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-3 font-medium text-gray-700">Time</th>
                    <th className="text-left py-2 px-3 font-medium text-gray-700">Submissions</th>
                    <th className="text-left py-2 px-3 font-medium text-gray-700">Progress</th>
                  </tr>
                </thead>
                <tbody>
                  {pmHours.map(({ hour, label, value, isCurrent }) => (
                    <tr key={hour} className={`border-b hover:bg-gray-50 ${isCurrent ? 'bg-blue-50' : ''}`}>
                      <td className="py-2 px-3">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900">{label}</span>
                          {isCurrent && (
                            <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-800">
                              Now
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className="py-2 px-3">
                        <span className="font-bold text-gray-900">{value}</span>
                        <span className="text-gray-500 text-xs ml-1">submissions</span>
                      </td>
                      <td className="py-2 px-3">
                        <div className="flex items-center gap-3">
                          <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-orange-500"
                              style={{ 
                                width: `${Math.min((value / Math.max(...data, 1)) * 100, 100)}%` 
                              }}
                            />
                          </div>
                          <span className="text-xs text-gray-600 min-w-8">
                            {Math.min((value / Math.max(...data, 1)) * 100, 100).toFixed(0)}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-50">
                    <td colSpan={3} className="py-3 px-3">
                      <div className="flex justify-between items-center">
                        <span className="font-medium text-gray-900">Total PM Submissions</span>
                        <span className="font-bold text-gray-900">
                          {pmHours.reduce((sum, { value }) => sum + value, 0)}
                        </span>
                      </div>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Today's Total Summary */}
          <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
            <div className="flex justify-between items-center">
              <div>
                <h4 className="font-bold text-gray-900 text-lg">Today's Total</h4>
                <p className="text-sm text-gray-600">All hours combined</p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-gray-900">
                  {data.reduce((sum, val) => sum + val, 0)}
                </div>
                <p className="text-sm text-gray-600">submissions</p>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-blue-200">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="text-center p-2 bg-white rounded">
                  <div className="text-xs text-gray-500">Peak Hour</div>
                  <div className="font-medium text-gray-900">
                    {(() => {
                      const maxIndex = data.indexOf(Math.max(...data));
                      return getHourLabel(maxIndex);
                    })()}
                  </div>
                </div>
                <div className="text-center p-2 bg-white rounded">
                  <div className="text-xs text-gray-500">Peak Submissions</div>
                  <div className="font-medium text-gray-900">{Math.max(...data)}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Time period types
type TimePeriod = "today" | "7d" | "30d" | "90d" | "all";

interface AnalyticsData {
  totalCount: number;
  pendingCount: number;
  approvedCount: number;
  deniedCount: number;
  approvalRate: number;
  rejectionRate: number;
  avgProcessingTime: string;
  dailySubmissions: number[];
  dayLabels: string[];
  hourlySubmissions: number[];
  hourLabels: string[];
  categories: Record<string, number>;
  topSubmitters: [string, number][];
  mostRecent: Date | null;
  periodStart: Date;
  periodEnd: Date;
}

// Helper function to safely parse dates
const safeParseDate = (dateString: string): Date | null => {
  if (!dateString) return null;
  
  try {
    // Try parsing as ISO
    const isoDate = parseISO(dateString);
    if (isValid(isoDate)) return isoDate;
    
    // Try parsing as regular date
    const date = new Date(dateString);
    if (isValid(date)) return date;
    
    return null;
  } catch {
    return null;
  }
};

// Default analytics data
const defaultAnalyticsData: AnalyticsData = {
  totalCount: 0,
  pendingCount: 0,
  approvedCount: 0,
  deniedCount: 0,
  approvalRate: 0,
  rejectionRate: 0,
  avgProcessingTime: "N/A",
  dailySubmissions: [],
  dayLabels: [],
  hourlySubmissions: [],
  hourLabels: [],
  categories: {},
  topSubmitters: [],
  mostRecent: null,
  periodStart: new Date(),
  periodEnd: new Date()
};

export default function AnalyticsPage() {
  const { locations, isLoading } = useLocations();
  const [timePeriod, setTimePeriod] = useState<TimePeriod>("today");
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData>(defaultAnalyticsData);

  // Calculate analytics data with proper date handling
  useEffect(() => {
    if (isLoading) {
      setAnalyticsData(defaultAnalyticsData);
      return;
    }

    const now = new Date();
    let startDate: Date;
    const endDate: Date = endOfDay(now);
    
    switch (timePeriod) {
      case "today":
        startDate = startOfDay(now);
        break;
      case "7d":
        startDate = startOfDay(subDays(now, 7));
        break;
      case "30d":
        startDate = startOfDay(subDays(now, 30));
        break;
      case "90d":
        startDate = startOfDay(subDays(now, 90));
        break;
      case "all":
        startDate = new Date(0); // Beginning of time
        break;
      default:
        startDate = startOfDay(now);
    }

    // Parse location dates properly
    const validLocations = locations.filter(location => {
      const date = safeParseDate(location.created_at);
      return date !== null;
    });

    // Filter locations by time period with proper date comparison
    const filteredLocations = validLocations.filter(location => {
      const createdDate = safeParseDate(location.created_at);
      if (!createdDate) return false;
      
      if (timePeriod === "today") {
        // For today, check if it's the same day
        return isToday(createdDate);
      }
      
      return isWithinInterval(createdDate, { start: startDate, end: endDate });
    });

    // Status breakdown
    const pendingCount = filteredLocations.filter(l => l.status === "pending").length;
    const approvedCount = filteredLocations.filter(l => l.status === "approved").length;
    const deniedCount = filteredLocations.filter(l => l.status === "denied").length;
    const totalCount = filteredLocations.length;

    // Daily submissions for chart - only for time periods > 1 day
    let dailySubmissions: number[] = [];
    let dayLabels: string[] = [];
    let hourlySubmissions: number[] = [];
    let hourLabels: string[] = [];
    
    if (timePeriod !== "today") {
      const days = eachDayOfInterval({ start: startDate, end: now });
      dailySubmissions = days.map(day => {
        const count = filteredLocations.filter(location => {
          const createdDate = safeParseDate(location.created_at);
          if (!createdDate) return false;
          return isSameDay(createdDate, day);
        }).length;
        return count;
      });
      
      // Format labels based on time period
      if (timePeriod === "7d") {
        dayLabels = days.map(day => format(day, 'EEE'));
      } else if (timePeriod === "30d") {
        dayLabels = days.map((day, index) => index % 3 === 0 ? format(day, 'MMM d') : '');
      } else {
        dayLabels = days.map((day, index) => index % 7 === 0 ? format(day, 'MMM d') : '');
      }
    } else {
      // For today, show hourly breakdown
      const hours = Array.from({ length: 24 }, (_, i) => i);
      hourlySubmissions = hours.map(hour => {
        return filteredLocations.filter(location => {
          const createdDate = safeParseDate(location.created_at);
          if (!createdDate) return false;
          return createdDate.getHours() === hour;
        }).length;
      });
      
      // Ensure we always have 24 data points
      if (hourlySubmissions.length < 24) {
        hourlySubmissions = Array.from({ length: 24 }, (_, i) => hourlySubmissions[i] || 0);
      }
      
      // Create hour labels (not used in table but kept for consistency)
      hourLabels = hours.map(hour => {
        const hour12 = hour % 12 || 12;
        const ampm = hour < 12 ? 'AM' : 'PM';
        return `${hour12}${ampm}`;
      });
    }

    // Category breakdown (if available)
    const categories: Record<string, number> = {};
    filteredLocations.forEach(location => {
      const category = (location as any).category || "Uncategorized";
      categories[category] = (categories[category] || 0) + 1;
    });

    // Top submitters
    const submitters: Record<string, number> = {};
    filteredLocations.forEach(location => {
      const email = (location as any).user_email || "anonymous";
      submitters[email] = (submitters[email] || 0) + 1;
    });
    const topSubmitters = Object.entries(submitters)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5) as [string, number][];

    // Calculate approval rate
    const approvalRate = totalCount > 0 ? Math.round((approvedCount / totalCount) * 100) : 0;
    const rejectionRate = totalCount > 0 ? Math.round((deniedCount / totalCount) * 100) : 0;

    // Calculate average processing time (mock data)
    let avgProcessingTime = "N/A";
    if (approvedCount > 0) {
      avgProcessingTime = "1.5 days";
    }

    // Find most recent submission
    let mostRecent: Date | null = null;
    if (validLocations.length > 0) {
      mostRecent = validLocations.reduce((latest: Date | null, location) => {
        const createdDate = safeParseDate(location.created_at);
        if (!createdDate) return latest;
        if (!latest || createdDate > latest) return createdDate;
        return latest;
      }, null);
    }

    setAnalyticsData({
      totalCount,
      pendingCount,
      approvedCount,
      deniedCount,
      approvalRate,
      rejectionRate,
      avgProcessingTime,
      dailySubmissions,
      dayLabels,
      hourlySubmissions,
      hourLabels,
      categories,
      topSubmitters,
      mostRecent,
      periodStart: startDate,
      periodEnd: endDate
    });
  }, [locations, timePeriod, isLoading]);

  // Export function
  const handleExport = () => {
    alert("Export feature would generate PDF/CSV report");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Clock className="h-12 w-12 text-gray-400 animate-pulse mx-auto mb-4" />
            <p className="text-gray-600">Loading analytics data...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h1>
          <p className="text-gray-500 text-sm">
            Real-time insights about location submissions and platform activity
          </p>
          <p className="text-xs text-blue-600 mt-1">
            Data for {timePeriod === "today" ? "today" : `selected period`} • Last updated: {format(new Date(), 'h:mm a')}
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          {/* Time period filter */}
          <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg border border-gray-200">
            <Calendar className="h-4 w-4 text-gray-500" />
            <select
              className="bg-transparent text-gray-700 border-none focus:outline-none focus:ring-0 cursor-pointer text-sm"
              value={timePeriod}
              onChange={(e) => setTimePeriod(e.target.value as TimePeriod)}
            >
              <option value="today">Today</option>
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
              <option value="all">All time</option>
            </select>
          </div>
          
          <Button 
            onClick={handleExport}
            variant="outline"
            className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-md text-sm"
          >
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Submissions */}
        <Card className="p-6 bg-white shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm text-gray-500">Total Submissions</p>
              <p className="text-3xl font-bold text-gray-900">
                {analyticsData.totalCount}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {timePeriod === "today" ? "Today" : "This period"}
              </p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-blue-100 flex items-center justify-center">
              <MapPin className="h-6 w-6 text-blue-600" />
            </div>
          </div>
          {analyticsData.totalCount > 0 && (
            <div className="flex items-center text-sm text-green-600">
              <TrendingUp className="h-4 w-4 mr-1" />
              <span>Active period</span>
            </div>
          )}
        </Card>

        {/* Approval Rate */}
        <Card className="p-6 bg-white shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm text-gray-500">Approval Rate</p>
              <p className="text-3xl font-bold text-gray-900">
                {analyticsData.approvalRate}%
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {analyticsData.approvedCount} approved
              </p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-green-100 flex items-center justify-center">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </Card>

        {/* Pending Review */}
        <Card className="p-6 bg-white shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm text-gray-500">Pending Review</p>
              <p className="text-3xl font-bold text-gray-900">
                {analyticsData.pendingCount}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Awaiting action
              </p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-yellow-100 flex items-center justify-center">
              <AlertCircle className="h-6 w-6 text-yellow-600" />
            </div>
          </div>
        </Card>

        {/* Rejection Rate */}
        <Card className="p-6 bg-white shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm text-gray-500">Rejection Rate</p>
              <p className="text-3xl font-bold text-gray-900">
                {analyticsData.rejectionRate}%
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {analyticsData.deniedCount} rejected
              </p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-red-100 flex items-center justify-center">
              <XCircle className="h-6 w-6 text-red-600" />
            </div>
          </div>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily/Hourly Submissions Chart */}
        <Card className="p-6 bg-white shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-semibold text-gray-900">
                {timePeriod === "today" ? "Hourly Submissions" : "Daily Submissions"}
              </h3>
              <p className="text-sm text-gray-500">
                {timePeriod === "today" 
                  ? "Number of submissions per hour today" 
                  : "Number of submissions per day"}
              </p>
            </div>
            {timePeriod === "today" ? (
              <Table className="h-5 w-5 text-gray-400" />
            ) : (
              <BarChart3 className="h-5 w-5 text-gray-400" />
            )}
          </div>
          {timePeriod === "today" ? (
            analyticsData.totalCount > 0 ? (
              <div className="space-y-4">
                <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="text-sm font-medium text-blue-700">Current hour:</span>
                      <span className="text-sm text-blue-600 ml-2">
                        {(() => {
                          const hour = new Date().getHours();
                          const hour12 = hour % 12 || 12;
                          const ampm = hour < 12 ? 'AM' : 'PM';
                          return `${hour12} ${ampm}`;
                        })()}
                      </span>
                    </div>
                    <Badge variant="outline" className="bg-primary">
                      {analyticsData.hourlySubmissions[new Date().getHours()] || 0} submissions
                    </Badge>
                  </div>
                </div>
                <HourlyTable data={analyticsData.hourlySubmissions} />
              </div>
            ) : (
              <div className="h-48 flex items-center justify-center text-gray-500">
                <div className="text-center">
                  <Clock className="h-12 w-12 text-gray-300 mx-auto mb-2" />
                  <p>No submissions today yet</p>
                  <p className="text-xs mt-1">Check back later for hourly data</p>
                </div>
              </div>
            )
          ) : (
            analyticsData.totalCount > 0 ? (
              <BarChart 
                data={analyticsData.dailySubmissions} 
                labels={analyticsData.dayLabels}
                height={200}
              />
            ) : (
              <div className="h-48 flex items-center justify-center text-gray-500">
                No submission data for this period
              </div>
            )
          )}
        </Card>

        {/* Status Distribution */}
        <Card className="p-6 bg-white shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-semibold text-gray-900">Status Distribution</h3>
              <p className="text-sm text-gray-500">Breakdown by submission status</p>
            </div>
            <PieChart className="h-5 w-5 text-gray-400" />
          </div>
          {analyticsData.totalCount > 0 ? (
            <PieChartDisplay 
              data={[
                { label: "Approved", value: analyticsData.approvedCount, color: "#10b981" },
                { label: "Pending", value: analyticsData.pendingCount, color: "#f59e0b" },
                { label: "Rejected", value: analyticsData.deniedCount, color: "#ef4444" }
              ]}
            />
          ) : (
            <div className="h-48 flex items-center justify-center text-gray-500">
              No status data available
            </div>
          )}
        </Card>
      </div>

      {/* Additional Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Breakdown */}
        <Card className="p-6 bg-white shadow-sm">
          <h3 className="font-semibold text-gray-900 mb-6">Category Breakdown</h3>
          <div className="space-y-4">
            {Object.keys(analyticsData.categories).length > 0 ? (
              (() => {
                const categoryEntries = Object.entries(analyticsData.categories);
                const sortedCategories = categoryEntries.sort((a, b) => b[1] - a[1]).slice(0, 8);
                const maxValue = Math.max(...sortedCategories.map(([_, count]) => count), 1);
                
                return sortedCategories.map(([category, count], index) => (
                  <div key={category} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-md bg-blue-100 flex items-center justify-center">
                        <span className="text-sm font-medium text-blue-600">{index + 1}</span>
                      </div>
                      <span className="text-sm text-gray-700">{category}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-sm font-medium text-gray-900">{count}</span>
                      <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-blue-500"
                          style={{ 
                            width: `${(count / maxValue) * 100}%` 
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ));
              })()
            ) : (
              <div className="text-center py-8 text-gray-500">
                No category data available
              </div>
            )}
          </div>
        </Card>

        {/* Top Submitters */}
        <Card className="p-6 bg-white shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-semibold text-gray-900">Top Submitters</h3>
            <Users className="h-5 w-5 text-gray-400" />
          </div>
          <div className="space-y-4">
            {analyticsData.topSubmitters.length > 0 ? (
              analyticsData.topSubmitters.map(([email, count], index) => (
                <div key={email} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
                      <span className="text-sm font-medium text-purple-600">
                        {email.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {email.split('@')[0] || 'Anonymous'}
                      </p>
                      <p className="text-xs text-gray-500 truncate max-w-[200px]">{email}</p>
                    </div>
                  </div>
                  <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                    {count} submissions
                  </Badge>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                No submitter data available
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Performance Metrics */}
      <Card className="p-6 bg-white shadow-sm">
        <h3 className="font-semibold text-gray-900 mb-6">Performance Metrics</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-gray-900 mb-2">
              {analyticsData.avgProcessingTime}
            </div>
            <p className="text-sm text-gray-600">Avg. Processing Time</p>
          </div>
          
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-gray-900 mb-2">
              {analyticsData.mostRecent
                ? format(analyticsData.mostRecent, 'MMM d, h:mm a')
                : "N/A"
              }
            </div>
            <p className="text-sm text-gray-600">Last Submission</p>
          </div>
          
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-gray-900 mb-2">
              {timePeriod === "today" 
                ? analyticsData.totalCount
                : timePeriod === "7d" && analyticsData.totalCount > 0
                  ? Math.round(analyticsData.totalCount / 7)
                  : timePeriod === "30d" && analyticsData.totalCount > 0
                  ? Math.round(analyticsData.totalCount / 30)
                  : timePeriod === "90d" && analyticsData.totalCount > 0
                  ? Math.round(analyticsData.totalCount / 90)
                  : analyticsData.totalCount
              }
            </div>
            <p className="text-sm text-gray-600">
              {timePeriod === "today" ? "Today's Total" : "Avg. Daily Submissions"}
            </p>
          </div>
        </div>
      </Card>

      {/* Summary */}
      <Card className="p-6 bg-white shadow-sm">
        <h3 className="font-semibold text-gray-900 mb-4">Period Summary</h3>
        <div className="space-y-3 text-gray-700">
          {analyticsData.totalCount > 0 ? (
            <>
              <p>
                During the <span className="font-medium text-blue-600">
                  {timePeriod === "today" ? "today" : timePeriod === "7d" ? "last 7 days" : 
                   timePeriod === "30d" ? "last 30 days" : timePeriod === "90d" ? "last 90 days" : "all time"}
                </span>, there were{" "}
                <span className="font-medium text-blue-600">{analyticsData.totalCount}</span>{" "}
                total location submissions.
              </p>
              <p>
                <span className="font-medium text-green-600">{analyticsData.approvalRate}%</span>{" "}
                of submissions were approved ({analyticsData.approvedCount} locations), while{" "}
                <span className="font-medium text-red-600">{analyticsData.rejectionRate}%</span>{" "}
                were rejected ({analyticsData.deniedCount} locations).
              </p>
              <p>
                Currently, there are{" "}
                <span className="font-medium text-yellow-600">{analyticsData.pendingCount}</span>{" "}
                submissions pending review.
              </p>
              {analyticsData.topSubmitters[0] && (
                <p>
                  The most active submitter was{" "}
                  <span className="font-medium text-purple-600">
                    {analyticsData.topSubmitters[0][0].split('@')[0]}
                  </span>{" "}
                  with {analyticsData.topSubmitters[0][1]} submissions.
                </p>
              )}
            </>
          ) : (
            <p className="text-gray-500">No data available for the selected period.</p>
          )}
        </div>
      </Card>
    </div>
  );
}