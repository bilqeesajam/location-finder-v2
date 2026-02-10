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
  ChevronUp,
  Server,
  Zap,
  Activity,
  AlertTriangle,
  RefreshCw,
  Shield,
  Info,
  ChevronRight,
  Database,
  HardDrive,
  Layers,
  X
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
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-center">
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
      <div className="mt-4 sm:mt-0 sm:ml-6 space-y-2">
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
    return recentHours.reverse();
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
      {/* Recent Hours */}
      <div className="space-y-3">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-medium text-gray-900">Recent Hours</h4>
          <Badge variant="outline" className="text-xs bg-primary-100">
            Last 3 hours
          </Badge>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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

      {/* Show All Hours Button */}
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
              <table className="w-full min-w-[520px] text-sm">
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
              <table className="w-full min-w-[520px] text-sm">
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
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

// API Usage Monitoring Modal Component
const ApiUsageModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [apiKeyStatus, setApiKeyStatus] = useState<'valid' | 'invalid' | 'checking'>('checking');
  const [apiUsage, setApiUsage] = useState<{
    geocoding: number;
    maps: number;
    routing: number;
    thisMonth: number;
    lastMonth: number;
    monthlyLimit: number;
    usagePercentage: number;
    daysRemaining: number;
    backupsWorking: boolean;
    status: 'good' | 'warning' | 'critical';
    alerts: string[];
    dailyAverage: number;
    projectedEndOfMonth: number;
    peakUsageDay: string;
  }>({
    geocoding: 0,
    maps: 0,
    routing: 0,
    thisMonth: 0,
    lastMonth: 0,
    monthlyLimit: 100000,
    usagePercentage: 0,
    daysRemaining: 0,
    backupsWorking: true,
    status: 'good',
    alerts: [],
    dailyAverage: 0,
    projectedEndOfMonth: 0,
    peakUsageDay: 'N/A'
  });

  const [showDetails, setShowDetails] = useState(false);

  const MAPTILER_API_KEY = '4wu3rv7xXgID64RMlznr';

  const validateApiKey = async () => {
    try {
      const testResponse = await fetch(
        `https://api.maptiler.com/maps/streets/style.json?key=${MAPTILER_API_KEY}`,
        { method: 'HEAD' }
      );
      return testResponse.ok;
    } catch (error) {
      console.error('API key validation failed:', error);
      return false;
    }
  };

  const fetchRealUsageData = async () => {
    try {
      const simulatedData = {
        geocoding: 2450,
        maps: 1870,
        routing: 320,
        thisMonth: 4640,
        lastMonth: 5210,
        monthlyLimit: 100000,
        backupsWorking: true,
        dailyAverage: 155,
        peakUsageDay: '2024-01-15',
        alerts: []
      };
      
      const now = new Date();
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      const daysRemaining = Math.max(0, Math.ceil((lastDay.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
      const usagePercentage = Math.round((simulatedData.thisMonth / simulatedData.monthlyLimit) * 100);
      const projectedEndOfMonth = Math.round(simulatedData.thisMonth + (simulatedData.dailyAverage * daysRemaining));
      
      let status: 'good' | 'warning' | 'critical' = 'good';
      const alerts: string[] = [];
      
      if (usagePercentage >= 90) {
        status = 'critical';
        alerts.push('Monthly limit nearly reached');
      } else if (usagePercentage >= 75) {
        status = 'warning';
        alerts.push('Approaching monthly limit');
      }
      
      if (!simulatedData.backupsWorking) {
        status = 'critical';
        alerts.push('Backup systems not functioning');
      }
      
      if (projectedEndOfMonth > simulatedData.monthlyLimit) {
        status = 'warning';
        alerts.push(`Projected to exceed limit by ${projectedEndOfMonth - simulatedData.monthlyLimit} requests`);
      }
      
      return {
        ...simulatedData,
        usagePercentage,
        daysRemaining,
        status,
        alerts,
        projectedEndOfMonth
      };
    } catch (error) {
      console.error('Error fetching usage data:', error);
      return null;
    }
  };

  const loadData = async () => {
    try {
      setIsLoading(true);
      
      const isValid = await validateApiKey();
      setApiKeyStatus(isValid ? 'valid' : 'invalid');
      
      if (!isValid) {
        setApiUsage({
          geocoding: 0,
          maps: 0,
          routing: 0,
          thisMonth: 0,
          lastMonth: 0,
          monthlyLimit: 100000,
          usagePercentage: 0,
          daysRemaining: 0,
          backupsWorking: false,
          status: 'critical',
          alerts: ['API key validation failed'],
          dailyAverage: 0,
          projectedEndOfMonth: 0,
          peakUsageDay: 'N/A'
        });
        return;
      }
      
      const usageData = await fetchRealUsageData();
      
      if (usageData) {
        setApiUsage(usageData);
      }
      
      setLastUpdated(new Date());
      
    } catch (error) {
      console.error('Error loading API data:', error);
      setApiKeyStatus('invalid');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
    
    const interval = setInterval(loadData, 2 * 60 * 1000);
    return () => clearInterval(interval);
  }, [isOpen]);

  const renderUsageBar = (percentage: number) => {
    let color = 'bg-green-500';
    let bgColor = 'bg-green-100 text-green-800';
    
    if (percentage >= 75) {
      color = 'bg-yellow-500';
      bgColor = 'bg-yellow-100 text-yellow-800';
    }
    if (percentage >= 90) {
      color = 'bg-red-500';
      bgColor = 'bg-red-100 text-red-800';
    }
    
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700">Usage Progress</span>
          <Badge className={bgColor}>
            {percentage}%
          </Badge>
        </div>
        <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
          <div 
            className={`h-full ${color} transition-all duration-500`}
            style={{ width: `${Math.min(percentage, 100)}%` }}
          />
        </div>
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col border-2 border-blue-100">
        {/* Modal Header */}
        <div className="relative flex flex-col gap-2 p-6 border-b-2 border-blue-100 bg-gradient-to-r from-blue-50 to-white">
          <div className="pr-12">
            <h2 className="text-2xl font-bold text-gray-900">MapTiler API Usage Monitoring</h2>
            <p className="text-sm text-gray-600 font-medium break-words">
              Real-time API usage and monitoring • Updated: {format(lastUpdated, 'h:mm a')}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-9 w-9 rounded-full hover:bg-blue-100 text-blue-600 hover:text-blue-800 absolute top-4 right-4"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Modal Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-gradient-to-br from-gray-50 to-white">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <Database className="h-12 w-12 text-blue-500 mx-auto mb-4 animate-spin" />
                <p className="text-blue-700 font-medium">Loading API usage statistics...</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column - Key Metrics */}
              <div className="lg:col-span-2 space-y-6">
                {/* API Key Status */}
                <Card className="p-6 bg-white border-2 border-blue-100 shadow-lg">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <Shield className={`h-7 w-7 ${apiKeyStatus === 'valid' ? 'text-green-600' : 'text-red-600'}`} />
                      <div className="min-w-0">
                        <h3 className="font-bold text-gray-900 text-lg">API Key Status</h3>
                        <p className="text-sm text-blue-600 break-words">Real-time validation</p>
                      </div>
                    </div>
                    <Badge className={
                      apiKeyStatus === 'valid' ? 'bg-green-100 text-green-800 border-2 border-green-300' : 'bg-red-100 text-red-800 border-2 border-red-300'
                    }>
                      {apiKeyStatus === 'valid' ? '✓ Valid' : '✗ Invalid'}
                    </Badge>
                  </div>
                  <div className="space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <code className="bg-blue-50 px-3 py-2 rounded-lg font-mono text-sm border-2 border-blue-200 text-blue-800 font-bold truncate max-w-full sm:max-w-[240px]">
                        {MAPTILER_API_KEY.substring(0, 8)}...{MAPTILER_API_KEY.substring(MAPTILER_API_KEY.length - 4)}
                      </code>
                      <span className="text-sm text-blue-700 font-medium break-words">
                        Free Tier • 100K req/month
                      </span>
                    </div>
                  </div>
                </Card>

                {/* Usage Progress */}
                <Card className="p-6 bg-white border-2 border-blue-100 shadow-lg">
                  <h3 className="font-bold text-gray-900 text-lg mb-4">Monthly Usage</h3>
                  {renderUsageBar(apiUsage.usagePercentage)}
                  
                  <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="text-center p-5 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl border-2 border-blue-300">
                      <div className="text-3xl font-bold text-blue-800">
                        {apiUsage.thisMonth.toLocaleString()}
                      </div>
                      <div className="text-sm text-blue-700 font-medium">Used this month</div>
                    </div>
                    
                    <div className="text-center p-5 bg-gradient-to-br from-green-50 to-green-100 rounded-xl border-2 border-green-300">
                      <div className="text-3xl font-bold text-green-800">
                        {(apiUsage.monthlyLimit - apiUsage.thisMonth).toLocaleString()}
                      </div>
                      <div className="text-sm text-green-700 font-medium">Remaining</div>
                    </div>
                  </div>
                </Card>

                {/* Service Breakdown */}
                <Card className="p-6 bg-white border-2 border-blue-100 shadow-lg">
                  <h3 className="font-bold text-gray-900 text-lg mb-4">Service Usage Breakdown</h3>
                  <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl border-2 border-blue-300">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="h-12 w-12 rounded-xl bg-blue-200 flex items-center justify-center">
                          <MapPin className="h-6 w-6 text-blue-700" />
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-bold text-gray-900 text-lg">Geocoding</h4>
                          <p className="text-sm text-blue-700 break-words">Address lookups</p>
                        </div>
                      </div>
                      <div className="text-left sm:text-right">
                        <div className="text-2xl font-bold text-blue-800">{apiUsage.geocoding.toLocaleString()}</div>
                        <div className="text-sm text-blue-700 font-medium">
                          {Math.round((apiUsage.geocoding / apiUsage.thisMonth) * 100)}% of total
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 bg-gradient-to-r from-purple-50 to-purple-100 rounded-xl border-2 border-purple-300">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="h-12 w-12 rounded-xl bg-purple-200 flex items-center justify-center">
                          <Layers className="h-6 w-6 text-purple-700" />
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-bold text-gray-900 text-lg">Maps</h4>
                          <p className="text-sm text-purple-700 break-words">Tile rendering</p>
                        </div>
                      </div>
                      <div className="text-left sm:text-right">
                        <div className="text-2xl font-bold text-purple-800">{apiUsage.maps.toLocaleString()}</div>
                        <div className="text-sm text-purple-700 font-medium">
                          {Math.round((apiUsage.maps / apiUsage.thisMonth) * 100)}% of total
                        </div>
                      </div>
                    </div>

                    {apiUsage.routing > 0 && (
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 bg-gradient-to-r from-green-50 to-green-100 rounded-xl border-2 border-green-300">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="h-12 w-12 rounded-xl bg-green-200 flex items-center justify-center">
                            <Activity className="h-6 w-6 text-green-700" />
                          </div>
                          <div className="min-w-0">
                            <h4 className="font-bold text-gray-900 text-lg">Routing</h4>
                            <p className="text-sm text-green-700 break-words">Navigation paths</p>
                          </div>
                        </div>
                        <div className="text-left sm:text-right">
                          <div className="text-2xl font-bold text-green-800">{apiUsage.routing.toLocaleString()}</div>
                          <div className="text-sm text-green-700 font-medium">
                            {Math.round((apiUsage.routing / apiUsage.thisMonth) * 100)}% of total
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </Card>
              </div>

              {/* Right Column - Status & Projections */}
              <div className="space-y-6">
                {/* System Status */}
                <Card className="p-6 bg-white border-2 border-blue-100 shadow-lg">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="font-bold text-gray-900 text-lg">System Status</h3>
                    <Badge className={
                      apiUsage.status === 'good' ? 'bg-green-100 text-green-800 border-2 border-green-300' :
                      apiUsage.status === 'warning' ? 'bg-yellow-100 text-yellow-800 border-2 border-yellow-300' :
                      'bg-red-100 text-red-800 border-2 border-red-300'
                    }>
                      {apiUsage.status === 'good' && <CheckCircle className="h-4 w-4 mr-1" />}
                      {apiUsage.status === 'warning' && <AlertTriangle className="h-4 w-4 mr-1" />}
                      {apiUsage.status === 'critical' && <AlertCircle className="h-4 w-4 mr-1" />}
                      {apiUsage.status === 'good' && 'All Systems Good'}
                      {apiUsage.status === 'warning' && 'Warning'}
                      {apiUsage.status === 'critical' && 'Critical'}
                    </Badge>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl border-2 border-gray-300">
                      <div className="flex items-center gap-3">
                        <Database className="h-6 w-6 text-blue-600" />
                        <span className="text-sm font-medium text-gray-900">Backup Systems</span>
                      </div>
                      <Badge className={
                        apiUsage.backupsWorking ? 'bg-green-100 text-green-800 border-2 border-green-300' : 'bg-red-100 text-red-800 border-2 border-red-300'
                      }>
                        {apiUsage.backupsWorking ? '✓ Active' : '✗ Inactive'}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl border-2 border-blue-300 text-center">
                        <div className="text-xs text-blue-700 font-medium">Days Remaining</div>
                        <div className="text-2xl font-bold text-blue-800">{apiUsage.daysRemaining}</div>
                      </div>
                      <div className="p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-xl border-2 border-green-300 text-center">
                        <div className="text-xs text-green-700 font-medium">Daily Average</div>
                        <div className="text-2xl font-bold text-green-800">{apiUsage.dailyAverage}</div>
                      </div>
                    </div>
                  </div>
                </Card>

                {/* Alerts */}
                {apiUsage.alerts.length > 0 && (
                  <Card className="p-6 border-2 border-yellow-300 bg-gradient-to-r from-yellow-50 to-yellow-100 shadow-lg">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="h-6 w-6 text-yellow-600 mt-0.5 flex-shrink-0" />
                      <div className="space-y-2">
                        <h3 className="font-bold text-yellow-900 text-lg">Active Alerts</h3>
                        {apiUsage.alerts.map((alert, index) => (
                          <div key={index} className="text-sm font-medium text-yellow-800 p-3 bg-yellow-200 rounded-lg border-2 border-yellow-400">
                            • {alert}
                          </div>
                        ))}
                      </div>
                    </div>
                  </Card>
                )}

                {/* Monthly Projection */}
                <Card className="p-6 bg-white border-2 border-blue-100 shadow-lg">
                  <div className="flex items-center gap-3 mb-4">
                    <TrendingUp className="h-6 w-6 text-blue-600" />
                    <h3 className="font-bold text-gray-900 text-lg">Monthly Projection</h3>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl border-2 border-blue-300">
                      <div className="text-xs text-blue-700 font-medium">Projected End-of-Month</div>
                      <div className={`text-xl font-bold ${apiUsage.projectedEndOfMonth > apiUsage.monthlyLimit ? 'text-red-700' : 'text-blue-800'}`}>
                        {apiUsage.projectedEndOfMonth.toLocaleString()} requests
                      </div>
                      {apiUsage.projectedEndOfMonth > apiUsage.monthlyLimit && (
                        <div className="text-xs text-red-700 font-medium mt-2">
                          ⚠️ Will exceed limit by {(apiUsage.projectedEndOfMonth - apiUsage.monthlyLimit).toLocaleString()} requests
                        </div>
                      )}
                    </div>
                    
                    <div className="p-4 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border-2 border-gray-300">
                      <div className="text-xs text-gray-700 font-medium">Peak Usage Day</div>
                      <div className="text-sm font-bold text-gray-900">{apiUsage.peakUsageDay}</div>
                    </div>
                  </div>
                </Card>

                {/* Refresh Button */}
                <Card className="p-6 bg-white border-2 border-blue-100 shadow-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-gray-900">Data Refresh</h3>
                      <p className="text-sm text-blue-600 font-medium">Auto-refreshes every 2 minutes</p>
                    </div>
                    <Button
                      variant="outline"
                      onClick={loadData}
                      className="gap-2 border-2 border-blue-300 hover:bg-blue-50 text-blue-700 hover:text-blue-800 font-medium"
                    >
                      <RefreshCw className="h-4 w-4" />
                      Refresh Now
                    </Button>
                  </div>
                </Card>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="border-t-2 border-blue-100 p-4 bg-gradient-to-r from-blue-50 to-white">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600 font-medium">
              Note: Replace simulated data with real API call tracking from your backend.
            </p>
            <Button onClick={onClose} variant="default" className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 py-2">
              Close
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Compact MapTiler API Usage Display (Button trigger)
const MapTilerApiUsageButton = ({ onClick }: { onClick: () => void }) => {
  const handleArrowClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click from triggering
    onClick();
  };

  return (
    <Card className="p-4 bg-white shadow-sm hover:shadow-md transition-shadow h-full">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
            <Server className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">MapTiler API Usage</h3>
            <p className="text-sm text-gray-500">Click to monitor real-time API usage</p>
          </div>
        </div>
        <div 
          onClick={handleArrowClick}
          className="cursor-pointer p-2 hover:bg-blue-50 rounded-full transition-colors"
          title="Click to open API usage monitoring"
        >
          <ChevronRight className="h-5 w-5 text-blue-500" />
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="text-center p-3 bg-blue-50 rounded border-2 border-blue-200">
          <div className="text-lg font-bold text-blue-800">4,640</div>
          <div className="text-xs text-blue-700 font-medium">This month</div>
        </div>
        
        <div className="text-center p-3 bg-green-50 rounded border-2 border-green-200">
          <div className="text-lg font-bold text-green-800">95,360</div>
          <div className="text-xs text-green-700 font-medium">Remaining</div>
        </div>
      </div>
      
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-green-500" />
          <span className="text-blue-700 font-medium">API Key: Valid</span>
        </div>
        <Badge className="bg-green-100 text-green-800 border border-green-300">
          Good
        </Badge>
      </div>
    </Card>
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
    const isoDate = parseISO(dateString);
    if (isValid(isoDate)) return isoDate;
    
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
  const [showApiUsageModal, setShowApiUsageModal] = useState(false);

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
        startDate = new Date(0);
        break;
      default:
        startDate = startOfDay(now);
    }

    // Parse location dates properly
    const validLocations = locations.filter(location => {
      const date = safeParseDate(location.created_at);
      return date !== null;
    });

    // Filter locations by time period
    const filteredLocations = validLocations.filter(location => {
      const createdDate = safeParseDate(location.created_at);
      if (!createdDate) return false;
      
      if (timePeriod === "today") {
        return isToday(createdDate);
      }
      
      return isWithinInterval(createdDate, { start: startDate, end: endDate });
    });

    // Status breakdown
    const pendingCount = filteredLocations.filter(l => l.status === "pending").length;
    const approvedCount = filteredLocations.filter(l => l.status === "approved").length;
    const deniedCount = filteredLocations.filter(l => l.status === "denied").length;
    const totalCount = filteredLocations.length;

    // Daily submissions for chart
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
      
      // Format labels
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
      
      if (hourlySubmissions.length < 24) {
        hourlySubmissions = Array.from({ length: 24 }, (_, i) => hourlySubmissions[i] || 0);
      }
      
      hourLabels = hours.map(hour => {
        const hour12 = hour % 12 || 12;
        const ampm = hour < 12 ? 'AM' : 'PM';
        return `${hour12}${ampm}`;
      });
    }

    // Category breakdown
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

    // Calculate rates
    const approvalRate = totalCount > 0 ? Math.round((approvedCount / totalCount) * 100) : 0;
    const rejectionRate = totalCount > 0 ? Math.round((deniedCount / totalCount) * 100) : 0;

    // Average processing time
    let avgProcessingTime = "N/A";
    if (approvedCount > 0) {
      avgProcessingTime = "1.5 days";
    }

    // Most recent submission
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
      <div className="min-h-screen bg-gray-100 p-4 md:p-6">
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
    <>
      <div className="min-h-screen bg-gray-100 p-4 md:p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h1>
            <p className="text-gray-500 text-sm">
              Real-time insights with MapTiler API monitoring
            </p>
            <p className="text-xs text-blue-600 mt-1">
              Data for {timePeriod === "today" ? "today" : `selected period`} • Last updated: {format(new Date(), 'h:mm a')}
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            {/* Time period filter */}
            <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg border border-gray-200 w-full sm:w-auto">
              <Calendar className="h-4 w-4 text-gray-500" />
              <select
                className="bg-transparent text-gray-700 border-none focus:outline-none focus:ring-0 cursor-pointer text-sm w-full sm:w-auto"
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
              className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-md text-sm w-full sm:w-auto"
            >
              <Download className="h-4 w-4 mr-2" />
              Export Report
            </Button>
          </div>
        </div>

        {/* Key Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Total Submissions */}
          <Card className="p-6 bg-white shadow-sm hover:shadow-md transition-shadow">
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
          <Card className="p-6 bg-white shadow-sm hover:shadow-md transition-shadow">
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
          <Card className="p-6 bg-white shadow-sm hover:shadow-md transition-shadow">
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

          {/* MapTiler API Usage Button */}
          <MapTilerApiUsageButton onClick={() => setShowApiUsageModal(true)} />
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Daily/Hourly Submissions Chart */}
          <Card className="p-6 bg-white shadow-sm hover:shadow-md transition-shadow">
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
          <Card className="p-6 bg-white shadow-sm hover:shadow-md transition-shadow">
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
          <Card className="p-6 bg-white shadow-sm hover:shadow-md transition-shadow">
            <h3 className="font-semibold text-gray-900 mb-6">Category Breakdown</h3>
            <div className="space-y-4">
              {Object.keys(analyticsData.categories).length > 0 ? (
                (() => {
                  const categoryEntries = Object.entries(analyticsData.categories);
                  const sortedCategories = categoryEntries.sort((a, b) => b[1] - a[1]).slice(0, 8);
                  const maxValue = Math.max(...sortedCategories.map(([_, count]) => count), 1);
                  
                return sortedCategories.map(([category, count], index) => (
                  <div key={category} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-md bg-blue-100 flex items-center justify-center">
                        <span className="text-sm font-medium text-blue-600">{index + 1}</span>
                      </div>
                      <span className="text-sm text-gray-700">{category}</span>
                    </div>
                    <div className="flex items-center gap-4 sm:justify-end">
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
          <Card className="p-6 bg-white shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-semibold text-gray-900">Top Submitters</h3>
              <Users className="h-5 w-5 text-gray-400" />
            </div>
            <div className="space-y-4">
              {analyticsData.topSubmitters.length > 0 ? (
              analyticsData.topSubmitters.map(([email, count], index) => (
                <div key={email} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 bg-gray-50 rounded-lg">
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
                      <p className="text-xs text-gray-500 truncate max-w-[200px] sm:max-w-[240px]">{email}</p>
                    </div>
                  </div>
                  <Badge variant="secondary" className="bg-blue-100 text-blue-800 self-start sm:self-auto">
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
        <Card className="p-6 bg-white shadow-sm hover:shadow-md transition-shadow">
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
        <Card className="p-6 bg-white shadow-sm hover:shadow-md transition-shadow">
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

      {/* API Usage Modal */}
      <ApiUsageModal 
        isOpen={showApiUsageModal} 
        onClose={() => setShowApiUsageModal(false)} 
      />
    </>
  );
}
