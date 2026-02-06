export default function AnalyticsPage() {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
        <p className="text-gray-500 mt-1">Coming Soon</p>
      </div>
      
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <div className="text-center py-12">
          <div className="text-4xl mb-4">📊</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Analytics Dashboard</h3>
          <p className="text-gray-500">
            This section will display charts, graphs, and insights about location submissions, 
            user activity, and platform usage.
          </p>
          <p className="text-sm text-gray-400 mt-4">
            Backend support for analytics is currently being implemented.
          </p>
        </div>
      </div>
    </div>
  );
}