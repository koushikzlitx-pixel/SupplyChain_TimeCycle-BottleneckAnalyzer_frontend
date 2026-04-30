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
      title: 'Average Total Time',
      value:
        summary?.avgTotalTime != null
          ? `${Number(summary.avgTotalTime).toFixed(1)} days`
          : null,
      subtitle: 'Mean end-to-end cycle time',
      icon: '⏱️',
      accentClass: 'border-emerald-500',
    },
    {
      title: 'SLA Breaches',
      value: summary?.slaBreaches != null ? summary.slaBreaches.toLocaleString() : null,
      subtitle:
        summary?.totalOrders > 0
          ? `${Math.round((summary.slaBreaches / summary.totalOrders) * 100)}% of total orders`
          : 'Orders exceeding SLA threshold',
      icon: '⚠️',
      accentClass: 'border-amber-500',
    },
    {
      title: 'Most Common Bottleneck',
      value: summary?.mostCommonBottleneck || null,
      subtitle:
        summary?.bottleneckCount != null
          ? `${summary.bottleneckCount.toLocaleString()} occurrences`
          : 'Highest-frequency delay stage',
      icon: '🔍',
      accentClass: 'border-rose-500',
    },
  ];

  const recentOrders = summary?.recentOrders ?? [];
  const slaTotal = (summary?.slaOnTime ?? 0) + (summary?.slaBreaches ?? 0);
  const slaCompliancePct =
    slaTotal > 0 ? Math.round(((summary?.slaOnTime ?? 0) / slaTotal) * 100) : 0;

  const lastUpdated = new Date().toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* ── Page Header ── */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
            Analytics Dashboard
          </h1>
          <p className="mt-1 text-sm text-gray-400">
            Supply chain performance overview · Last updated: {lastUpdated}
          </p>
        </div>

        {/* ── Error Banner ── */}
        {error && !loading && (
          <ErrorBanner message={error} onRetry={handleRetry} />
        )}

        {/* ── Summary Cards (KPIBox) ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
          {loading
            ? Array.from({ length: 4 }).map((_, i) => (
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
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Bottleneck Chart */}
            <div className="lg:col-span-2">
              <BottleneckChart />
            </div>

            {/* SLA Status Panel */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-base font-semibold text-gray-800 mb-5">SLA Status</h2>
              {summary ? (
                <div className="space-y-5">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">On Time</span>
                    <span className="text-sm font-bold text-emerald-600">
                      {(summary.slaOnTime ?? 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">Breached</span>
                    <span className="text-sm font-bold text-red-500">
                      {(summary.slaBreaches ?? 0).toLocaleString()}
                    </span>
                  </div>

                  {slaTotal > 0 && (
                    <>
                      <div className="w-full bg-red-100 rounded-full h-3 overflow-hidden">
                        <div
                          className="bg-emerald-500 h-3 rounded-full transition-all duration-700"
                          style={{ width: `${slaCompliancePct}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-xs text-gray-400">
                        <span>Compliance rate</span>
                        <span className="font-semibold text-gray-600">
                          {slaCompliancePct}%
                        </span>
                      </div>
                    </>
                  )}

                  <div className="pt-2 border-t border-gray-50">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500">Total evaluated</span>
                      <span className="text-sm font-semibold text-gray-700">
                        {slaTotal.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-gray-300 text-sm text-center py-10">
                  No SLA data available.
                </p>
              )}
            </div>

            {/* Recent Orders Table */}
            <div className="lg:col-span-3 bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-base font-semibold text-gray-800">Recent Orders</h2>
                {recentOrders.length > 0 && (
                  <span className="text-xs text-gray-400 bg-gray-50 px-2 py-1 rounded-lg">
                    {recentOrders.length} entries
                  </span>
                )}
              </div>
              {recentOrders.length > 0 ? (
                <div className="overflow-x-auto -mx-6 px-6">
                  <table className="w-full text-sm text-left min-w-[520px]">
                    <thead>
                      <tr className="border-b border-gray-100">
                        {['Order ID', 'Stage', 'Total Time', 'SLA Status'].map((h) => (
                          <th
                            key={h}
                            className="pb-3 pr-6 text-xs font-semibold text-gray-400 uppercase tracking-widest"
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {recentOrders.map((order) => (
                        <tr
                          key={order.id}
                          className="border-b border-gray-50 hover:bg-gray-50 transition-colors"
                        >
                          <td className="py-3.5 pr-6 font-medium text-gray-800">
                            {order.id}
                          </td>
                          <td className="py-3.5 pr-6 text-gray-500">{order.stage}</td>
                          <td className="py-3.5 pr-6 text-gray-500 tabular-nums">
                            {order.totalTime} days
                          </td>
                          <td className="py-3.5">
                            <SlaStatusBadge breached={order.slaBreached} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-gray-300 text-sm text-center py-10">
                  No recent orders to display.
                </p>
              )}
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
  { key: 'order_id',        label: 'Order ID' },
  { key: 'total_time',      label: 'Total Time' },
  { key: 'sla_breach',      label: 'SLA Status' },
  { key: 'bottleneck_stage', label: 'Bottleneck Stage' },
];

function OrdersTableSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="h-10 bg-gray-50 rounded-xl mb-4" />
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex gap-4 py-3 border-b border-gray-50">
          <div className="h-4 bg-gray-100 rounded-full w-24" />
          <div className="h-4 bg-gray-100 rounded-full w-20" />
          <div className="h-4 bg-gray-100 rounded-full w-16" />
          <div className="h-4 bg-gray-100 rounded-full w-32" />
        </div>
      ))}
    </div>
  );
}

export function Orders() {
  const [orders, setOrders]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const [retryKey, setRetryKey] = useState(0);

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

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Orders</h1>
          <p className="mt-1 text-sm text-gray-400">
            All supply-chain orders with cycle time and SLA status
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
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">

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

          {/* Orders table */}
          {!loading && !error && orders.length > 0 && (
            <>
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-base font-semibold text-gray-800">All Orders</h2>
                <span className="text-xs text-gray-400 bg-gray-50 px-2 py-1 rounded-lg">
                  {orders.length.toLocaleString()} records
                </span>
              </div>
              <div className="overflow-x-auto -mx-6 px-6">
                <table className="w-full text-sm text-left min-w-[560px]">
                  <thead>
                    <tr className="border-b border-gray-100">
                      {ORDER_COLUMNS.map(({ label }) => (
                        <th
                          key={label}
                          className="pb-3 pr-8 text-xs font-semibold text-gray-400 uppercase tracking-widest whitespace-nowrap"
                        >
                          {label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((order, idx) => (
                      <tr
                        key={order.order_id ?? idx}
                        className="border-b border-gray-50 hover:bg-gray-50 transition-colors"
                      >
                        {/* Order ID */}
                        <td className="py-3.5 pr-8 font-medium text-gray-800 tabular-nums">
                          {order.order_id ?? '—'}
                        </td>

                        {/* Total Time */}
                        <td className="py-3.5 pr-8 text-gray-500 tabular-nums">
                          {order.total_time != null
                            ? `${Number(order.total_time).toFixed(1)} days`
                            : '—'}
                        </td>

                        {/* SLA Breach */}
                        <td className="py-3.5 pr-8">
                          <SlaStatusBadge breached={Boolean(order.sla_breach)} />
                        </td>

                        {/* Bottleneck Stage */}
                        <td className="py-3.5 pr-8">
                          {order.bottleneck_stage ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-blue-50 text-blue-700">
                              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 inline-block" />
                              {order.bottleneck_stage}
                            </span>
                          ) : (
                            <span className="text-gray-300 text-xs">None</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

      </div>
    </div>
  );
}
