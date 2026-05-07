import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from 'recharts';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

// ---------------------------------------------------------------------------
// Analytics service — centralised API functions
// ---------------------------------------------------------------------------

const apiClient = axios.create({
  baseURL: API_BASE,
  headers: { Accept: 'application/json' },
  timeout: 15000,
});

// Normalise axios errors to plain Error objects with a readable message
function normaliseError(err) {
  if (err.response) {
    // Server responded with a non-2xx status
    const status = err.response.status;
    const detail =
      err.response.data?.detail ||
      err.response.data?.message ||
      err.response.statusText;
    throw new Error(`Request failed with status ${status}: ${detail}`);
  }
  if (err.request) {
    // Request was made but no response received (network issue / timeout)
    throw new Error('No response from server. Check your network connection.');
  }
  // Anything else (setup errors, etc.)
  throw new Error(err.message || 'An unexpected error occurred.');
}

/**
 * Fetch high-level summary analytics.
 * Returns: { totalOrders, avgTotalTime, slaBreaches, slaOnTime,
 *            mostCommonBottleneck, bottleneckCount, recentOrders }
 */
export async function getSummaryAnalytics() {
  try {
    const { data } = await apiClient.get('/api/analytics/summary');
    return data;
  } catch (err) {
    normaliseError(err);
  }
}

/**
 * Fetch bottleneck stage breakdown.
 * Returns: [{ stage: string, count: number }]  (array always)
 */
export async function getBottleneckAnalytics() {
  try {
    const { data } = await apiClient.get('/api/analytics/bottlenecks');
    // Accept both a plain array and { bottlenecks: [...] } envelope
    return Array.isArray(data) ? data : (data.bottlenecks ?? []);
  } catch (err) {
    normaliseError(err);
  }
}

/**
 * Fetch SLA breach analytics.
 * Returns: { onTime: number, breached: number, complianceRate: number,
 *            breachedOrders: [{ id, stage, totalTime, slaThreshold }] }
 */
export async function getSLABreachAnalytics() {
  try {
    const { data } = await apiClient.get('/api/analytics/sla-breaches');
    return data;
  } catch (err) {
    normaliseError(err);
  }
}

/**
 * Export analytics data as CSV.
 * Returns the export response from the backend.
 */
export async function exportAnalyticsCSV() {
  try {
    const response = await apiClient.get('/api/analytics/export', {
      responseType: 'blob', // Handle CSV file download
    });
    return response;
  } catch (err) {
    normaliseError(err);
  }
}

/**
 * Generate dummy data for testing and development.
 * Returns the response from the backend.
 */
export async function generateDummyData() {
  try {
    const { data } = await apiClient.post('/api/analytics/generate-dummy-data');
    return data;
  } catch (err) {
    normaliseError(err);
  }
}

// ---------------------------------------------------------------------------
// KPIBox — reusable analytics card
// ---------------------------------------------------------------------------

function KPIBox({ title, value, subtitle }) {
  return (
    <div
      className="
        group
        bg-white
        rounded-2xl
        border border-gray-100
        shadow-sm
        hover:shadow-md hover:-translate-y-0.5
        transition-all duration-200 ease-in-out
        p-6
        flex flex-col gap-1.5
        w-full
      "
    >
      {/* Title */}
      <span className="text-xs font-semibold text-gray-400 uppercase tracking-widest leading-none">
        {title}
      </span>

      {/* Value */}
      <p className="text-3xl font-bold text-gray-900 leading-tight mt-1 group-hover:text-blue-600 transition-colors duration-200">
        {value != null && value !== '' ? value : <span className="text-gray-200">—</span>}
      </p>

      {/* Subtitle */}
      {subtitle && (
        <p className="text-xs text-gray-400 leading-relaxed mt-0.5">{subtitle}</p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components (kept in this file per requirements)
// ---------------------------------------------------------------------------

function StatCard({ title, value, subtitle, icon, accentClass, loading }) {
  return (
    <div className={`bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col gap-2 border-l-4 ${accentClass}`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-widest">
          {title}
        </span>
        <span className="text-xl opacity-70">{icon}</span>
      </div>
      {loading ? (
        <div className="h-9 w-28 bg-gray-100 rounded-lg animate-pulse mt-1" />
      ) : (
        <p className="text-3xl font-bold text-gray-800 leading-tight">
          {value ?? <span className="text-gray-300">—</span>}
        </p>
      )}
      {subtitle && !loading && (
        <p className="text-xs text-gray-400 leading-relaxed">{subtitle}</p>
      )}
    </div>
  );
}

function LoadingSpinner() {
  return (
    <div className="flex flex-col items-center justify-center py-32 gap-4">
      <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      <p className="text-gray-400 text-sm tracking-wide">Loading analytics data…</p>
    </div>
  );
}

function ErrorBanner({ message, onRetry }) {
  return (
    <div className="bg-red-50 border border-red-200 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-6">
      <div className="flex items-start gap-3 flex-1">
        <span className="text-red-500 text-lg mt-0.5">⚠</span>
        <div>
          <p className="text-red-700 font-semibold text-sm">Failed to load dashboard data</p>
          <p className="text-red-500 text-xs mt-0.5">{message}</p>
        </div>
      </div>
      <button
        onClick={onRetry}
        className="shrink-0 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
      >
        Retry
      </button>
    </div>
  );
}

function SearchBar({ value, onChange, placeholder = 'Search...' }) {
  return (
    <div className="relative flex-1 max-w-md">
      <svg 
        className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" 
        fill="none" 
        viewBox="0 0 24 24" 
        stroke="currentColor"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        className="w-full pl-10 pr-10 py-2.5 text-sm border border-gray-200 rounded-lg 
                   focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent 
                   transition-all duration-200 bg-white
                   placeholder:text-gray-400"
      />
      {value && (
        <button
          onClick={() => onChange({ target: { value: '' } })}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="Clear search"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
}

function FilterDropdown({ selectedValue, onChange }) {
  const options = [
    { value: 'all', label: 'All Orders' },
    { value: 'breached', label: 'SLA Breached' },
    { value: 'non-breached', label: 'Non-Breached' },
  ];

  return (
    <div className="relative">
      <select
        value={selectedValue}
        onChange={onChange}
        className="appearance-none px-4 py-2.5 pr-10 text-sm font-medium border border-gray-200 rounded-lg 
                   focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent 
                   bg-white cursor-pointer transition-all duration-200
                   hover:border-gray-300 hover:shadow-sm
                   text-gray-700"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      
      {/* Custom dropdown arrow */}
      <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
        <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </div>
  );
}

function OrderTimeline({ stages = [] }) {
  /**
   * Expected stages array format:
   * [
   *   { name: 'Order Created', timestamp: '2024-01-01', isDelayed: false },
   *   { name: 'Procurement', timestamp: '2024-01-02', isDelayed: false },
   *   { name: 'Processing', timestamp: '2024-01-05', isDelayed: true },
   *   { name: 'Dispatch', timestamp: '2024-01-08', isDelayed: false },
   *   { name: 'Delivery', timestamp: '2024-01-10', isDelayed: false },
   * ]
   */

  if (!stages || stages.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400 text-sm">
        No timeline data available
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Timeline container */}
      <div className="space-y-0">
        {stages.map((stage, idx) => {
          const isLast = idx === stages.length - 1;
          const isDelayed = stage.isDelayed || false;

          return (
            <div key={`${stage.name}-${idx}`} className="relative flex items-start gap-4 pb-8 last:pb-0">
              
              {/* Timeline line connector */}
              {!isLast && (
                <div className={`absolute left-5 top-11 w-0.5 h-full ${
                  isDelayed ? 'bg-red-300' : 'bg-gray-200'
                }`} />
              )}

              {/* Timeline dot */}
              <div className="relative z-10 flex-shrink-0">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center border-4 transition-all ${
                  isDelayed
                    ? 'bg-red-500 border-red-100 ring-4 ring-red-50'
                    : stage.timestamp
                    ? 'bg-blue-500 border-blue-100'
                    : 'bg-gray-300 border-gray-100'
                }`}>
                  {isDelayed ? (
                    <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  ) : stage.timestamp ? (
                    <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  )}
                </div>
              </div>

              {/* Stage content */}
              <div className="flex-1 pt-1.5">
                <div className={`rounded-lg border-2 p-4 transition-all ${
                  isDelayed
                    ? 'bg-red-50 border-red-200'
                    : stage.timestamp
                    ? 'bg-blue-50 border-blue-200'
                    : 'bg-gray-50 border-gray-200'
                }`}>
                  
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <h4 className={`font-semibold text-sm ${
                        isDelayed ? 'text-red-900' : 'text-gray-900'
                      }`}>
                        {stage.name}
                      </h4>
                      
                      {stage.timestamp ? (
                        <div className="flex items-center gap-2 mt-1.5">
                          <svg className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span className={`text-xs font-medium tabular-nums ${
                            isDelayed ? 'text-red-700' : 'text-gray-600'
                          }`}>
                            {stage.timestamp}
                          </span>
                        </div>
                      ) : (
                        <p className="text-xs text-gray-400 mt-1.5">Pending</p>
                      )}

                      {stage.duration && (
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-gray-500">
                            Duration: <span className="font-semibold text-gray-700 tabular-nums">{stage.duration}</span>
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Delayed badge */}
                    {isDelayed && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-red-500 text-white flex-shrink-0">
                        <span>⚠</span>
                        Delayed
                      </span>
                    )}
                  </div>

                </div>
              </div>

            </div>
          );
        })}
      </div>
    </div>
  );
}

function ExportButton() {
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState({ type: null, message: '' });

  const handleExport = async () => {
    try {
      setLoading(true);
      setFeedback({ type: null, message: '' });

      const response = await exportAnalyticsCSV();
      
      // Create download link for CSV file
      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `analytics-export-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      setFeedback({ type: 'success', message: 'Export successful!' });
      setTimeout(() => setFeedback({ type: null, message: '' }), 3000);
    } catch (err) {
      setFeedback({ 
        type: 'error', 
        message: err.message || 'Failed to export analytics data.' 
      });
      setTimeout(() => setFeedback({ type: null, message: '' }), 5000);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
      <button
        onClick={handleExport}
        disabled={loading}
        className={`
          group relative flex items-center justify-center gap-2.5 
          px-5 py-2.5 rounded-xl font-semibold text-sm
          transition-all duration-200 ease-in-out
          ${loading 
            ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
            : 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-sm hover:shadow-md active:scale-95'
          }
        `}
      >
        {loading ? (
          <>
            <div className="w-4 h-4 border-2 border-gray-300 border-t-transparent rounded-full animate-spin" />
            <span>Exporting...</span>
          </>
        ) : (
          <>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span>Export CSV</span>
          </>
        )}
      </button>

      {/* Feedback message */}
      {feedback.type && (
        <div 
          className={`
            flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium
            animate-in fade-in slide-in-from-right-2 duration-200
            ${feedback.type === 'success' 
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
              : 'bg-red-50 text-red-700 border border-red-200'
            }
          `}
        >
          <span className="text-sm">
            {feedback.type === 'success' ? '✓' : '✕'}
          </span>
          <span>{feedback.message}</span>
        </div>
      )}
    </div>
  );
}

function GenerateDataButton() {
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState({ type: null, message: '' });

  const handleGenerate = async () => {
    try {
      setLoading(true);
      setFeedback({ type: null, message: '' });

      const result = await generateDummyData();

      setFeedback({ 
        type: 'success', 
        message: `Generated ${result.generated || 'dummy'} data successfully!` 
      });
      setTimeout(() => {
        setFeedback({ type: null, message: '' });
        // Reload page to show new data
        window.location.reload();
      }, 2000);
    } catch (err) {
      setFeedback({ 
        type: 'error', 
        message: err.message || 'Failed to generate dummy data.' 
      });
      setTimeout(() => setFeedback({ type: null, message: '' }), 5000);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
      <button
        onClick={handleGenerate}
        disabled={loading}
        className={`
          group relative flex items-center justify-center gap-2.5 
          px-5 py-2.5 rounded-xl font-semibold text-sm
          transition-all duration-200 ease-in-out
          ${loading 
            ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
            : 'bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white shadow-sm hover:shadow-md active:scale-95'
          }
        `}
      >
        {loading ? (
          <>
            <div className="w-4 h-4 border-2 border-gray-300 border-t-transparent rounded-full animate-spin" />
            <span>Generating...</span>
          </>
        ) : (
          <>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <span>Generate Dummy Data</span>
          </>
        )}
      </button>

      {/* Feedback message */}
      {feedback.type && (
        <div 
          className={`
            flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium
            animate-in fade-in slide-in-from-right-2 duration-200
            ${feedback.type === 'success' 
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
              : 'bg-red-50 text-red-700 border border-red-200'
            }
          `}
        >
          <span className="text-sm">
            {feedback.type === 'success' ? '✓' : '✕'}
          </span>
          <span>{feedback.message}</span>
        </div>
      )}
    </div>
  );
}

function BottleneckBar({ stage, count, max }) {
  const pct = max > 0 ? Math.round((count / max) * 100) : 0;
  return (
    <div>
      <div className="flex justify-between text-sm mb-1.5">
        <span className="text-gray-700 font-medium">{stage}</span>
        <span className="text-gray-400 tabular-nums">{count.toLocaleString()} orders</span>
      </div>
      <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
        <div
          className="bg-blue-500 h-2 rounded-full transition-all duration-700"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// BottleneckChart — bar chart for bottleneck stage analytics
// ---------------------------------------------------------------------------

const CHART_COLORS = [
  '#3b82f6', // blue-500
  '#6366f1', // indigo-500
  '#8b5cf6', // violet-500
  '#a855f7', // purple-500
  '#ec4899', // pink-500
  '#f43f5e', // rose-500
  '#f97316', // orange-500
  '#eab308', // yellow-500
];

function ChartTooltipContent({ active, payload }) {
  if (!active || !payload?.length) return null;
  const { stage, count } = payload[0].payload;
  return (
    <div className="bg-white border border-gray-100 shadow-lg rounded-xl px-4 py-3 text-sm">
      <p className="font-semibold text-gray-800 mb-1">{stage}</p>
      <p className="text-gray-500">
        <span className="font-bold text-blue-600">{count.toLocaleString()}</span> orders affected
      </p>
    </div>
  );
}

function BottleneckChart() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    getBottleneckAnalytics()
      .then((list) => {
        if (!cancelled) {
          setData(list);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.message || 'Failed to load bottleneck data.');
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [retryKey]);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-base font-semibold text-gray-800">Bottleneck Analysis</h2>
          <p className="text-xs text-gray-400 mt-0.5">Orders delayed per stage</p>
        </div>
        {!loading && !error && data.length > 0 && (
          <span className="text-xs text-gray-400 bg-gray-50 px-2 py-1 rounded-lg">
            {data.length} stages
          </span>
        )}
      </div>

      {/* Loading skeleton */}
      {loading && (
        <div className="space-y-3 animate-pulse">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="h-3 rounded-full bg-gray-100" style={{ width: `${40 + i * 10}%` }} />
            </div>
          ))}
          <div className="h-48 bg-gray-50 rounded-xl mt-4" />
        </div>
      )}

      {/* Error state */}
      {!loading && error && (
        <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
          <span className="text-3xl">⚠️</span>
          <p className="text-sm text-red-500 font-medium">Failed to load chart</p>
          <p className="text-xs text-gray-400 max-w-xs">{error}</p>
          <button
            onClick={() => setRetryKey((k) => k + 1)}
            className="mt-1 text-xs font-medium text-blue-600 hover:text-blue-800 underline underline-offset-2 transition-colors"
          >
            Try again
          </button>
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && data.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 gap-2 text-center">
          <span className="text-3xl opacity-30">📊</span>
          <p className="text-sm text-gray-300 font-medium">No bottleneck data available</p>
          <p className="text-xs text-gray-300">Data will appear once orders are processed.</p>
        </div>
      )}

      {/* Bar chart */}
      {!loading && !error && data.length > 0 && (
        <ResponsiveContainer width="100%" height={280}>
          <BarChart
            data={data}
            margin={{ top: 4, right: 8, left: 0, bottom: 60 }}
            barCategoryGap="30%"
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis
              dataKey="stage"
              tick={{ fontSize: 11, fill: '#94a3b8' }}
              tickLine={false}
              axisLine={false}
              angle={-35}
              textAnchor="end"
              interval={0}
            />
            <YAxis
              allowDecimals={false}
              tick={{ fontSize: 11, fill: '#94a3b8' }}
              tickLine={false}
              axisLine={false}
              width={40}
            />
            <Tooltip
              content={<ChartTooltipContent />}
              cursor={{ fill: '#f8fafc' }}
            />
            <Bar dataKey="count" radius={[6, 6, 0, 0]} maxBarSize={56}>
              {data.map((_, idx) => (
                <Cell
                  key={idx}
                  fill={CHART_COLORS[idx % CHART_COLORS.length]}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

function SlaStatusBadge({ breached }) {
  return breached ? (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700">
      <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block" />
      Breached
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
      On Time
    </span>
  );
}

// ---------------------------------------------------------------------------
// SLABreachTable — table showing breached orders
// ---------------------------------------------------------------------------

function SLABreachTable() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    getSLABreachAnalytics()
      .then((result) => {
        if (!cancelled) {
          setData(result);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.message || 'Failed to load SLA breach data.');
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [retryKey]);

  const breachedOrders = data?.breachedOrders ?? [];

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-base font-semibold text-gray-800">SLA Breach Analysis</h2>
          <p className="text-xs text-gray-400 mt-0.5">Orders exceeding SLA thresholds</p>
        </div>
        {!loading && !error && breachedOrders.length > 0 && (
          <span className="text-xs font-medium text-red-600 bg-red-50 px-3 py-1.5 rounded-full">
            {breachedOrders.length} {breachedOrders.length === 1 ? 'breach' : 'breaches'}
          </span>
        )}
      </div>

      {/* Loading skeleton */}
      {loading && (
        <div className="space-y-4 animate-pulse">
          <div className="flex items-center gap-4 pb-3 border-b border-gray-100">
            <div className="h-3 rounded-full bg-gray-100 w-24" />
            <div className="h-3 rounded-full bg-gray-100 w-32" />
            <div className="h-3 rounded-full bg-gray-100 w-20" />
          </div>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4">
              <div className="h-4 rounded-full bg-gray-50 w-24" />
              <div className="h-4 rounded-full bg-gray-50 w-32" />
              <div className="h-4 rounded-full bg-gray-50 w-20" />
            </div>
          ))}
        </div>
      )}

      {/* Error state */}
      {!loading && error && (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
          <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center">
            <span className="text-2xl">⚠️</span>
          </div>
          <div>
            <p className="text-sm text-red-600 font-semibold">Failed to load SLA breach data</p>
            <p className="text-xs text-gray-400 mt-1 max-w-xs">{error}</p>
          </div>
          <button
            onClick={() => setRetryKey((k) => k + 1)}
            className="mt-2 text-xs font-medium text-white bg-red-600 hover:bg-red-700 active:bg-red-800 px-4 py-2 rounded-lg transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && breachedOrders.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
          <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center">
            <span className="text-3xl">✅</span>
          </div>
          <div>
            <p className="text-sm text-gray-700 font-semibold">No SLA breaches</p>
            <p className="text-xs text-gray-400 mt-1">All orders are within SLA compliance!</p>
          </div>
        </div>
      )}

      {/* Table */}
      {!loading && !error && breachedOrders.length > 0 && (
        <div className="overflow-x-auto -mx-6 px-6">
          <table className="w-full text-sm min-w-[480px]">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="pb-3 pr-6 text-left text-xs font-semibold text-gray-400 uppercase tracking-widest">
                  Order ID
                </th>
                <th className="pb-3 pr-6 text-left text-xs font-semibold text-gray-400 uppercase tracking-widest">
                  Breached Stage
                </th>
                <th className="pb-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-widest">
                  Total Time
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {breachedOrders.map((order) => (
                <tr
                  key={order.id}
                  className="hover:bg-red-50/40 transition-colors"
                >
                  <td className="py-4 pr-6 font-semibold text-gray-900">
                    {order.id}
                  </td>
                  <td className="py-4 pr-6 text-gray-600">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-red-50 text-red-700 text-xs font-medium">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                      {order.stage}
                    </span>
                  </td>
                  <td className="py-4 text-gray-900 font-medium tabular-nums">
                    {order.totalTime} days
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Dashboard
// ---------------------------------------------------------------------------

export default function Dashboard() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [retryKey, setRetryKey] = useState(0);

  const handleRetry = useCallback(() => setRetryKey((k) => k + 1), []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    getSummaryAnalytics()
      .then((data) => {
        if (!cancelled) {
          setSummary(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.message || 'An unexpected error occurred.');
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [retryKey]);

  // Calculate SLA breach percentage
  const slaTotal = (summary?.slaOnTime ?? 0) + (summary?.slaBreaches ?? 0);
  const slaBreachPct = slaTotal > 0 
    ? ((summary?.slaBreaches ?? 0) / slaTotal * 100).toFixed(1)
    : '0.0';

  // Summary cards configuration
  const cards = [
    {
      title: 'Total Orders',
      value: summary?.totalOrders != null ? summary.totalOrders.toLocaleString() : null,
      subtitle: 'All-time processed orders',
      icon: '📦',
      accentClass: 'border-blue-500',
    },
    {
      title: 'Avg Total Delivery Time',
      value:
        summary?.avgTotalTime != null
          ? `${Number(summary.avgTotalTime).toFixed(1)} days`
          : null,
      subtitle: 'End-to-end cycle time',
      icon: '🚚',
      accentClass: 'border-emerald-500',
    },
    {
      title: 'SLA Breach Percentage',
      value: summary ? `${slaBreachPct}%` : null,
      subtitle: `${summary?.slaBreaches ?? 0} of ${slaTotal} orders`,
      icon: '⚠️',
      accentClass: 'border-red-500',
    },
    {
      title: 'Avg Procurement Time',
      value:
        summary?.avgProcurementTime != null
          ? `${Number(summary.avgProcurementTime).toFixed(1)} days`
          : null,
      subtitle: 'Time from order to sourcing',
      icon: '📋',
      accentClass: 'border-purple-500',
    },
    {
      title: 'Avg Processing Time',
      value:
        summary?.avgProcessingTime != null
          ? `${Number(summary.avgProcessingTime).toFixed(1)} days`
          : null,
      subtitle: 'Internal processing duration',
      icon: '⚙️',
      accentClass: 'border-amber-500',
    },
  ];

  const lastUpdated = new Date().toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* ── Page Header ── */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
              Analytics Dashboard
            </h1>
            <p className="mt-1 text-sm text-gray-400">
              Supply chain performance overview · Last updated: {lastUpdated}
            </p>
          </div>
          <div className="flex-shrink-0 flex flex-col sm:flex-row gap-3">
            <GenerateDataButton />
            <ExportButton />
          </div>
        </div>

        {/* ── Error Banner ── */}
        {error && !loading && (
          <ErrorBanner message={error} onRetry={handleRetry} />
        )}

        {/* ── Summary Cards (KPIBox) ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-5 mb-8">
          {loading
            ? Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col gap-3 animate-pulse"
                >
                  <div className="h-3 w-24 bg-gray-100 rounded-full" />
                  <div className="h-9 w-32 bg-gray-100 rounded-lg" />
                  <div className="h-3 w-20 bg-gray-100 rounded-full" />
                </div>
              ))
            : cards.map((card) => (
                <KPIBox
                  key={card.title}
                  title={card.title}
                  value={card.value}
                  subtitle={card.subtitle}
                />
              ))}
        </div>

        {/* ── Main Content ── */}
        {loading ? (
          <LoadingSpinner />
        ) : !error ? (
          <div className="space-y-6">

            {/* Bottleneck Chart */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="lg:col-span-2">
                <BottleneckChart />
              </div>
            </div>

            {/* SLA Breach Table */}
            <div className="grid grid-cols-1">
              <SLABreachTable />
            </div>

          </div>
        ) : null}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Orders page
// ---------------------------------------------------------------------------

const ORDER_COLUMNS = [
  { key: 'order_id',         label: 'Order ID',         width: 'w-32' },
  { key: 'procurement_time', label: 'Procurement',      width: 'w-28' },
  { key: 'processing_time',  label: 'Processing',       width: 'w-28' },
  { key: 'total_time',       label: 'Total Time',       width: 'w-28' },
  { key: 'sla_breach',       label: 'SLA Status',       width: 'w-32' },
  { key: 'bottleneck_stage', label: 'Bottleneck Stage', width: 'w-40' },
];

const ITEMS_PER_PAGE = 20;

function OrdersTableSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="h-10 bg-gray-50 rounded-xl mb-4" />
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex gap-4 py-3 border-b border-gray-50">
          <div className="h-4 bg-gray-100 rounded-full w-24" />
          <div className="h-4 bg-gray-100 rounded-full w-20" />
          <div className="h-4 bg-gray-100 rounded-full w-20" />
          <div className="h-4 bg-gray-100 rounded-full w-20" />
          <div className="h-4 bg-gray-100 rounded-full w-16" />
          <div className="h-4 bg-gray-100 rounded-full w-32" />
        </div>
      ))}
    </div>
  );
}

export function Orders() {
  const [orders, setOrders]         = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState(null);
  const [retryKey, setRetryKey]     = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter]         = useState('all');
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    apiClient
      .get('/api/orders')
      .then(({ data }) => {
        if (!cancelled) {
          // Accept both a plain array and { orders: [...] } envelope
          const list = Array.isArray(data) ? data : (data.orders ?? []);
          setOrders(list);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          try { normaliseError(err); }
          catch (e) {
            setError(e.message);
          }
          setLoading(false);
        }
      });

    return () => { cancelled = true; };
  }, [retryKey]);

  // Filter and search logic
  const filteredOrders = orders.filter((order) => {
    // Search filter
    const matchesSearch = searchTerm.trim() === '' || 
      (order.order_id || '').toLowerCase().includes(searchTerm.toLowerCase());

    // SLA filter
    const matchesFilter = 
      filter === 'all' ||
      (filter === 'breached' && order.sla_breach) ||
      (filter === 'non-breached' && !order.sla_breach);

    return matchesSearch && matchesFilter;
  });

  // Pagination logic
  const totalPages = Math.ceil(filteredOrders.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedOrders = filteredOrders.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filter]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Orders</h1>
          <p className="mt-1 text-sm text-gray-400">
            Professional analytics table with search, filter, and pagination
          </p>
        </div>

        {/* Error */}
        {!loading && error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-6">
            <div className="flex items-start gap-3 flex-1">
              <span className="text-red-500 text-lg mt-0.5">⚠</span>
              <div>
                <p className="text-red-700 font-semibold text-sm">Failed to load orders</p>
                <p className="text-red-500 text-xs mt-0.5">{error}</p>
              </div>
            </div>
            <button
              onClick={() => setRetryKey((k) => k + 1)}
              className="shrink-0 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            >
              Retry
            </button>
          </div>
        )}

        {/* Table card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">

          {/* Controls bar */}
          {!loading && !error && orders.length > 0 && (
            <div className="p-6 border-b border-gray-100 flex flex-col lg:flex-row gap-4 lg:items-center lg:justify-between">
              
              {/* Search */}
              <div className="relative flex-1 max-w-md">
                <svg 
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="Search by Order ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>

              {/* Filter and count */}
              <div className="flex items-center gap-4">
                <select
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  className="px-4 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white cursor-pointer transition-all"
                >
                  <option value="all">All Orders</option>
                  <option value="breached">SLA Breached</option>
                  <option value="non-breached">Non-Breached</option>
                </select>

                <span className="text-xs font-medium text-gray-500 bg-gray-50 px-3 py-2 rounded-lg whitespace-nowrap">
                  {filteredOrders.length.toLocaleString()} {filteredOrders.length === 1 ? 'order' : 'orders'}
                </span>
              </div>

            </div>
          )}

          <div className="p-6">
            {loading && <OrdersTableSkeleton />}

            {/* Empty state */}
            {!loading && !error && orders.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
                <span className="text-5xl opacity-20">📋</span>
                <p className="text-gray-400 font-medium text-sm">No orders found</p>
                <p className="text-gray-300 text-xs">
                  Orders will appear here once data is available.
                </p>
              </div>
            )}

            {/* No results from filter/search */}
            {!loading && !error && orders.length > 0 && filteredOrders.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
                <span className="text-4xl opacity-20">🔍</span>
                <p className="text-gray-400 font-medium text-sm">No matching orders</p>
                <p className="text-gray-300 text-xs">
                  Try adjusting your search or filter criteria.
                </p>
                <button
                  onClick={() => { setSearchTerm(''); setFilter('all'); }}
                  className="mt-2 text-xs font-medium text-blue-600 hover:text-blue-800 underline underline-offset-2"
                >
                  Clear filters
                </button>
              </div>
            )}

            {/* Orders table */}
            {!loading && !error && paginatedOrders.length > 0 && (
              <>
                <div className="overflow-x-auto -mx-6 px-6">
                  <div className="inline-block min-w-full align-middle">
                    <div className="overflow-hidden">
                      <table className="min-w-full text-sm">
                        <thead className="bg-gray-50 sticky top-0 z-10">
                          <tr>
                            {ORDER_COLUMNS.map(({ key, label }) => (
                              <th
                                key={key}
                                className="px-4 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap first:pl-6 last:pr-6"
                              >
                                {label}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-100">
                          {paginatedOrders.map((order, idx) => (
                            <tr
                              key={order.order_id ?? idx}
                              className="hover:bg-blue-50/30 transition-colors"
                            >
                              {/* Order ID */}
                              <td className="px-4 py-4 font-semibold text-gray-900 tabular-nums first:pl-6">
                                {order.order_id ?? '—'}
                              </td>

                              {/* Procurement Time */}
                              <td className="px-4 py-4 text-gray-600 tabular-nums">
                                {order.procurement_time != null
                                  ? `${Number(order.procurement_time).toFixed(1)}d`
                                  : '—'}
                              </td>

                              {/* Processing Time */}
                              <td className="px-4 py-4 text-gray-600 tabular-nums">
                                {order.processing_time != null
                                  ? `${Number(order.processing_time).toFixed(1)}d`
                                  : '—'}
                              </td>

                              {/* Total Time */}
                              <td className="px-4 py-4 font-medium text-gray-900 tabular-nums">
                                {order.total_time != null
                                  ? `${Number(order.total_time).toFixed(1)}d`
                                  : '—'}
                              </td>

                              {/* SLA Breach */}
                              <td className="px-4 py-4">
                                <SlaStatusBadge breached={Boolean(order.sla_breach)} />
                              </td>

                              {/* Bottleneck Stage */}
                              <td className="px-4 py-4 last:pr-6">
                                {order.bottleneck_stage ? (
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-purple-50 text-purple-700 border border-purple-100">
                                    <span className="w-1.5 h-1.5 rounded-full bg-purple-500 inline-block" />
                                    {order.bottleneck_stage}
                                  </span>
                                ) : (
                                  <span className="text-gray-300 text-xs">—</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-6 pt-6 border-t border-gray-100">
                    <p className="text-xs text-gray-500">
                      Showing {startIndex + 1} to {Math.min(endIndex, filteredOrders.length)} of {filteredOrders.length} orders
                    </p>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        Previous
                      </button>

                      <div className="flex items-center gap-1">
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                          let pageNum;
                          if (totalPages <= 5) {
                            pageNum = i + 1;
                          } else if (currentPage <= 3) {
                            pageNum = i + 1;
                          } else if (currentPage >= totalPages - 2) {
                            pageNum = totalPages - 4 + i;
                          } else {
                            pageNum = currentPage - 2 + i;
                          }
                          
                          return (
                            <button
                              key={pageNum}
                              onClick={() => setCurrentPage(pageNum)}
                              className={`w-8 h-8 text-xs font-medium rounded-lg transition-colors ${
                                currentPage === pageNum
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
                              }`}
                            >
                              {pageNum}
                            </button>
                          );
                        })}
                      </div>

                      <button
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

        </div>

      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Order Details page
// ---------------------------------------------------------------------------

export function OrderDetails({ orderId: propOrderId }) {
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [retryKey, setRetryKey] = useState(0);

  // Get orderId from props or you can use route params with react-router
  // For now, using props
  const orderId = propOrderId;

  useEffect(() => {
    if (!orderId) {
      setError('No order ID provided');
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    apiClient
      .get(`/api/orders/${orderId}`)
      .then(({ data }) => {
        if (!cancelled) {
          setOrder(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          try { normaliseError(err); }
          catch (e) {
            setError(e.message);
          }
          setLoading(false);
        }
      });

    return () => { cancelled = true; };
  }, [orderId, retryKey]);

  // Stage timeline data
  const stages = order ? [
    {
      name: 'Procurement',
      duration: order.procurement_time,
      startTime: order.procurement_start,
      endTime: order.procurement_end,
      isBreached: order.breached_stage === 'Procurement',
      isBottleneck: order.bottleneck_stage === 'Procurement',
    },
    {
      name: 'Processing',
      duration: order.processing_time,
      startTime: order.processing_start,
      endTime: order.processing_end,
      isBreached: order.breached_stage === 'Processing',
      isBottleneck: order.bottleneck_stage === 'Processing',
    },
    {
      name: 'Dispatch',
      duration: order.dispatch_time_duration,
      startTime: order.dispatch_start,
      endTime: order.dispatch_end,
      isBreached: order.breached_stage === 'Dispatch',
      isBottleneck: order.bottleneck_stage === 'Dispatch',
    },
    {
      name: 'Delivery',
      duration: order.delivery_time_duration,
      startTime: order.delivery_start,
      endTime: order.delivery_end,
      isBreached: order.breached_stage === 'Delivery',
      isBottleneck: order.bottleneck_stage === 'Delivery',
    },
  ] : [];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <button
              onClick={() => window.history.back()}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
              Order Details
            </h1>
          </div>
          <p className="text-sm text-gray-400">
            Comprehensive analytics and timeline for order {orderId}
          </p>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-32 gap-4">
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-gray-400 text-sm">Loading order details...</p>
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-8 flex flex-col items-center gap-4 text-center">
            <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
              <span className="text-3xl">⚠️</span>
            </div>
            <div>
              <p className="text-red-700 font-semibold text-base">Failed to load order</p>
              <p className="text-red-500 text-sm mt-1">{error}</p>
            </div>
            <button
              onClick={() => setRetryKey((k) => k + 1)}
              className="bg-red-600 hover:bg-red-700 text-white text-sm font-medium px-6 py-2.5 rounded-lg transition-colors"
            >
              Retry
            </button>
          </div>
        )}

        {/* Content */}
        {!loading && !error && order && (
          <div className="space-y-6">

            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              
              {/* Order ID Card */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">
                  Order ID
                </p>
                <p className="text-2xl font-bold text-gray-900">{order.order_id}</p>
              </div>

              {/* Total Time Card */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 border-l-4 border-l-blue-500">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">
                  Total Time
                </p>
                <p className="text-2xl font-bold text-gray-900 tabular-nums">
                  {order.total_time != null ? `${Number(order.total_time).toFixed(1)}` : '—'}
                  <span className="text-base font-normal text-gray-500 ml-1">days</span>
                </p>
              </div>

              {/* SLA Status Card */}
              <div className={`bg-white rounded-2xl shadow-sm border border-gray-100 p-6 border-l-4 ${
                order.sla_breach ? 'border-l-red-500' : 'border-l-emerald-500'
              }`}>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">
                  SLA Status
                </p>
                <div className="mt-2">
                  <SlaStatusBadge breached={Boolean(order.sla_breach)} />
                </div>
              </div>

              {/* Bottleneck Card */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 border-l-4 border-l-purple-500">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">
                  Bottleneck Stage
                </p>
                <p className="text-lg font-semibold text-gray-900 mt-2">
                  {order.bottleneck_stage || 'None'}
                </p>
              </div>

            </div>

            {/* Stage Durations */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-base font-semibold text-gray-800 mb-6">Stage Durations</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                
                <div className="p-4 rounded-xl bg-blue-50 border border-blue-100">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-blue-700 uppercase">Procurement</span>
                    {order.bottleneck_stage === 'Procurement' && (
                      <span className="text-xs bg-purple-500 text-white px-2 py-0.5 rounded-full">Bottleneck</span>
                    )}
                  </div>
                  <p className="text-2xl font-bold text-blue-900 tabular-nums">
                    {order.procurement_time != null ? `${Number(order.procurement_time).toFixed(1)}d` : '—'}
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-indigo-50 border border-indigo-100">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-indigo-700 uppercase">Processing</span>
                    {order.bottleneck_stage === 'Processing' && (
                      <span className="text-xs bg-purple-500 text-white px-2 py-0.5 rounded-full">Bottleneck</span>
                    )}
                  </div>
                  <p className="text-2xl font-bold text-indigo-900 tabular-nums">
                    {order.processing_time != null ? `${Number(order.processing_time).toFixed(1)}d` : '—'}
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-violet-50 border border-violet-100">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-violet-700 uppercase">Dispatch</span>
                    {order.bottleneck_stage === 'Dispatch' && (
                      <span className="text-xs bg-purple-500 text-white px-2 py-0.5 rounded-full">Bottleneck</span>
                    )}
                  </div>
                  <p className="text-2xl font-bold text-violet-900 tabular-nums">
                    {order.dispatch_time_duration != null ? `${Number(order.dispatch_time_duration).toFixed(1)}d` : '—'}
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-purple-50 border border-purple-100">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-purple-700 uppercase">Delivery</span>
                    {order.bottleneck_stage === 'Delivery' && (
                      <span className="text-xs bg-purple-500 text-white px-2 py-0.5 rounded-full">Bottleneck</span>
                    )}
                  </div>
                  <p className="text-2xl font-bold text-purple-900 tabular-nums">
                    {order.delivery_time_duration != null ? `${Number(order.delivery_time_duration).toFixed(1)}d` : '—'}
                  </p>
                </div>

              </div>
            </div>

            {/* Timeline */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-base font-semibold text-gray-800 mb-6">Stage Timeline</h2>
              
              <div className="space-y-6">
                {stages.map((stage, idx) => (
                  <div key={stage.name} className="relative">
                    {/* Timeline connector */}
                    {idx < stages.length - 1 && (
                      <div className="absolute left-6 top-14 w-0.5 h-full bg-gray-200" />
                    )}

                    <div className="flex gap-4">
                      {/* Timeline dot */}
                      <div className="relative z-10 flex-shrink-0">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-sm ${
                          stage.isBreached
                            ? 'bg-red-500 text-white ring-4 ring-red-100'
                            : stage.isBottleneck
                            ? 'bg-purple-500 text-white ring-4 ring-purple-100'
                            : 'bg-blue-500 text-white'
                        }`}>
                          {idx + 1}
                        </div>
                      </div>

                      {/* Stage content */}
                      <div className="flex-1 pb-8">
                        <div className={`rounded-xl border-2 p-5 ${
                          stage.isBreached
                            ? 'bg-red-50 border-red-200'
                            : stage.isBottleneck
                            ? 'bg-purple-50 border-purple-200'
                            : 'bg-gray-50 border-gray-200'
                        }`}>
                          
                          {/* Stage header */}
                          <div className="flex items-start justify-between mb-4">
                            <div>
                              <h3 className="text-lg font-bold text-gray-900">{stage.name}</h3>
                              <p className="text-sm text-gray-500 mt-0.5">
                                Duration: <span className="font-semibold text-gray-900 tabular-nums">
                                  {stage.duration != null ? `${Number(stage.duration).toFixed(1)} days` : 'N/A'}
                                </span>
                              </p>
                            </div>
                            
                            <div className="flex gap-2">
                              {stage.isBreached && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-500 text-white">
                                  <span>⚠</span>
                                  Breached
                                </span>
                              )}
                              {stage.isBottleneck && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-500 text-white">
                                  <span>🔍</span>
                                  Bottleneck
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Timestamps */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="flex items-center gap-2 text-sm">
                              <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              <span className="text-gray-500">Start:</span>
                              <span className="font-medium text-gray-900 tabular-nums">
                                {stage.startTime || 'N/A'}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                              <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              <span className="text-gray-500">End:</span>
                              <span className="font-medium text-gray-900 tabular-nums">
                                {stage.endTime || 'N/A'}
                              </span>
                            </div>
                          </div>

                        </div>
                      </div>
                    </div>

                  </div>
                ))}
              </div>
            </div>

            {/* All Timestamps Card */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-base font-semibold text-gray-800 mb-6">Complete Timestamp Record</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: 'Procurement Start', value: order.procurement_start },
                  { label: 'Procurement End', value: order.procurement_end },
                  { label: 'Processing Start', value: order.processing_start },
                  { label: 'Processing End', value: order.processing_end },
                  { label: 'Dispatch Start', value: order.dispatch_start },
                  { label: 'Dispatch End', value: order.dispatch_end },
                  { label: 'Delivery Start', value: order.delivery_start },
                  { label: 'Delivery End', value: order.delivery_end },
                ].map((item) => (
                  <div key={item.label} className="p-3 rounded-lg bg-gray-50 border border-gray-100">
                    <p className="text-xs font-medium text-gray-500 mb-1">{item.label}</p>
                    <p className="text-sm font-semibold text-gray-900 tabular-nums">
                      {item.value || '—'}
                    </p>
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
