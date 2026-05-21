import React, { useState, useEffect, useCallback, createContext, useContext, useMemo, memo, lazy, Suspense } from 'react';
import axios from 'axios';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  Legend,
} from 'recharts';

// ===========================================================================
// Configuration Constants & Global Settings
// ===========================================================================

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
const API_TIMEOUT = 15000;
const AUTO_REFRESH_INTERVAL = 300000; // 5 minutes
const CACHE_DURATION = 60000; // 1 minute

// Tableau Configuration
const TABLEAU_CONFIG = {
  serverUrl: import.meta.env.VITE_TABLEAU_SERVER_URL || 'https://public.tableau.com',
  viewUrl: import.meta.env.VITE_TABLEAU_VIEW_URL || 'https://public.tableau.com/views/SupplyChainAnalytics/Dashboard1',
  enabled: import.meta.env.VITE_TABLEAU_ENABLED === 'true' || false,
};

const CHART_COLORS = {
  primary: ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981'],
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  info: '#3b82f6',
  neutral: '#6b7280',
};

const ANIMATION_DURATIONS = {
  fast: 200,
  medium: 300,
  slow: 500,
};

const BREAKPOINTS = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
};

// ---------------------------------------------------------------------------
// Theme Context — Dark Mode Support
// ---------------------------------------------------------------------------

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('theme');
    return saved || 'light';
  });

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const newTheme = prev === 'light' ? 'dark' : 'light';
      localStorage.setItem('theme', newTheme);
      return newTheme;
    });
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

// ---------------------------------------------------------------------------
// Error Boundary — Centralized Error Handling
// ---------------------------------------------------------------------------

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
    this.setState({ error, errorInfo });
    
    // Log to error tracking service in production
    if (import.meta.env.PROD) {
      // Example: Send to error tracking service
      // errorTrackingService.logError(error, errorInfo);
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-red-50 dark:from-gray-900 dark:via-gray-900 dark:to-red-900/20 flex items-center justify-center p-4">
          <div className="max-w-2xl w-full bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-red-200 dark:border-red-800 p-8 animate-fade-in">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <span className="text-4xl">⚠️</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Something went wrong</h1>
                <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">
                  The application encountered an unexpected error
                </p>
              </div>
            </div>

            {import.meta.env.DEV && this.state.error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
                <p className="font-mono text-xs text-red-800 dark:text-red-300 break-all">
                  {this.state.error.toString()}
                </p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={this.handleReset}
                className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Reload Application
              </button>
              <button
                onClick={() => window.history.back()}
                className="px-6 py-3 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 font-semibold rounded-lg transition-colors"
              >
                Go Back
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export { ErrorBoundary };

// Enhanced Error Fallback UI Component
export const ErrorFallback = memo(function ErrorFallback({ error, resetError, title = 'Error Loading Data' }) {
  return (
    <div className="bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800 rounded-xl p-8 flex flex-col items-center gap-4 text-center animate-fade-in">
      <div className="w-20 h-20 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center animate-scale-in">
        <span className="text-4xl">⚠️</span>
      </div>
      <div>
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">{title}</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 max-w-md">
          {error?.message || 'An unexpected error occurred. Please try again.'}
        </p>
      </div>
      {resetError && (
        <button
          onClick={resetError}
          className="mt-2 px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition-all hover:scale-105 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
        >
          Try Again
        </button>
      )}
    </div>
  );
});

// Network Error Handler Component
export const NetworkError = memo(function NetworkError({ onRetry }) {
  return (
    <div className="bg-amber-50 dark:bg-amber-900/20 border-2 border-amber-200 dark:border-amber-800 rounded-xl p-8 flex flex-col items-center gap-4 text-center animate-fade-in">
      <div className="w-20 h-20 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
        <span className="text-4xl">📡</span>
      </div>
      <div>
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Network Connection Error</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 max-w-md">
          Unable to connect to the server. Please check your internet connection and try again.
        </p>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-2 px-6 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-lg transition-all hover:scale-105 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2"
        >
          Retry Connection
        </button>
      )}
    </div>
  );
});

// ---------------------------------------------------------------------------
// Sidebar Component — Navigation Sidebar (Optimized with memo)
// ---------------------------------------------------------------------------

export const Sidebar = memo(function Sidebar({ isOpen, onClose }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { theme } = useTheme();

  const navItems = useMemo(() => [
    { path: '/dashboard', label: 'Dashboard', icon: '📊' },
    { path: '/orders', label: 'Orders', icon: '📦' },
    { path: '/analytics', label: 'Analytics', icon: '📈' },
    { path: '/tableau', label: 'Tableau Insights', icon: '📉', badge: 'NEW' },
  ], []);

  const isActive = useCallback((path) => location.pathname === path, [location.pathname]);

  const handleNavigation = useCallback((path) => {
    navigate(path);
    onClose();
  }, [navigate, onClose]);

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden animate-fade-in"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed lg:sticky top-0 left-0 h-screen z-50
          w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800
          shadow-lg lg:shadow-none
          transform transition-all duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          flex flex-col custom-scrollbar overflow-y-auto
        `}
      >
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-6 border-b border-gray-200 dark:border-gray-800 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-gray-800 dark:to-gray-900">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🔗</span>
            <h2 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Supply Chain
            </h2>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto custom-scrollbar">
          {navItems.map((item, index) => (
            <button
              key={item.path}
              onClick={() => handleNavigation(item.path)}
              style={{ animationDelay: `${index * 50}ms` }}
              className={`
                w-full flex items-center gap-3 px-4 py-3 rounded-xl
                text-sm font-medium transition-all duration-200 group
                animate-slide-down relative
                ${
                  isActive(item.path)
                    ? 'bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 text-blue-700 dark:text-blue-300 shadow-md border-l-4 border-blue-600'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:translate-x-1'
                }
              `}
              aria-label={`Navigate to ${item.label}`}
              aria-current={isActive(item.path) ? 'page' : undefined}
            >
              <span className={`text-xl transition-transform group-hover:scale-110 ${isActive(item.path) ? 'animate-bounce' : ''}`}>
                {item.icon}
              </span>
              <span className="font-semibold">{item.label}</span>
              {item.badge && (
                <span className="ml-auto px-2 py-0.5 text-xs font-bold bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-full animate-pulse-slow">
                  {item.badge}
                </span>
              )}
              {isActive(item.path) && !item.badge && (
                <span className="ml-auto">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </span>
              )}
            </button>
          ))}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50">
          <div className="text-xs text-gray-500 dark:text-gray-400 text-center space-y-1">
            <div className="font-semibold">Supply Chain Analytics</div>
            <div>Version 1.0.0</div>
            <div className="pt-2 flex items-center justify-center gap-1 text-blue-600 dark:text-blue-400">
              <span>⚡</span>
              <span className="font-medium">Enterprise Dashboard</span>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
});

// ---------------------------------------------------------------------------
// Navbar Component — Top Navigation Bar (Optimized with memo)
// ---------------------------------------------------------------------------

export const Navbar = memo(function Navbar({ onMenuClick }) {
  const { theme, toggleTheme } = useTheme();
  const [searchTerm, setSearchTerm] = useState('');

  const handleSearchChange = useCallback((e) => {
    setSearchTerm(e.target.value);
  }, []);

  return (
    <header className="sticky top-0 z-30 h-16 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 shadow-sm backdrop-blur-lg bg-opacity-90 dark:bg-opacity-90">
      <div className="h-full flex items-center justify-between px-4 lg:px-6">
        {/* Left: Menu + Title */}
        <div className="flex items-center gap-4">
          <button
            onClick={onMenuClick}
            className="lg:hidden p-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-all duration-200"
            aria-label="Toggle menu"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Analytics Dashboard
            </h1>
            <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300">
              Live
            </span>
          </div>
        </div>

        {/* Center: Search (hidden on mobile) */}
        <div className="hidden md:flex flex-1 max-w-md mx-8">
          <div className="relative w-full group">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-blue-500 transition-colors"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search orders, analytics..."
              value={searchTerm}
              onChange={handleSearchChange}
              className="w-full pl-10 pr-4 py-2 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:text-white transition-all duration-200"
              aria-label="Search orders and analytics"
            />
          </div>
        </div>

        {/* Right: Dark Mode Toggle */}
        <div className="flex items-center gap-3">
          <button
            onClick={toggleTheme}
            className="p-2.5 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-all duration-200 hover:scale-110 active:scale-95"
            title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
            aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
          >
            {theme === 'light' ? (
              <svg className="w-5 h-5 animate-fade-in" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </header>
  );
});

// ---------------------------------------------------------------------------
// Reusable Components (Optimized with memo)
// ---------------------------------------------------------------------------

// SortDropdown — Dropdown for sorting options
export const SortDropdown = memo(function SortDropdown({ value, onChange, options }) {
  const handleChange = useCallback((e) => onChange(e.target.value), [onChange]);

  return (
    <select
      value={value}
      onChange={handleChange}
      className="px-4 py-2.5 text-sm border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 dark:text-white cursor-pointer transition-all hover:border-blue-400 dark:hover:border-blue-600"
      aria-label="Sort options"
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
});

// Pagination — Reusable pagination component (Optimized with memo)
export const Pagination = memo(function Pagination({ currentPage, totalPages, onPageChange, totalItems, startIndex, endIndex }) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mt-6 pt-6 border-t border-gray-100 dark:border-gray-800">
      <p className="text-xs text-gray-500 dark:text-gray-400">
        Showing <span className="font-semibold text-gray-700 dark:text-gray-300">{startIndex + 1}</span> to{' '}
        <span className="font-semibold text-gray-700 dark:text-gray-300">{Math.min(endIndex, totalItems)}</span> of{' '}
        <span className="font-semibold text-gray-700 dark:text-gray-300">{totalItems}</span> items
      </p>

      <div className="flex items-center gap-2">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white dark:disabled:hover:bg-gray-800 transition-colors"
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
                onClick={() => onPageChange(pageNum)}
                className={`min-w-[2rem] h-8 px-2 text-xs font-medium rounded-lg transition-colors ${
                  currentPage === pageNum
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                {pageNum}
              </button>
            );
          })}
        </div>

        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white dark:disabled:hover:bg-gray-800 transition-colors"
        >
          Next
        </button>
      </div>
    </div>
  );
});

// DashboardStatsGrid — Grid container for KPI cards (Optimized with memo)
export const DashboardStatsGrid = memo(function DashboardStatsGrid({ children, loading, skeletonCount = 5 }) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-5 mb-8">
        {Array.from({ length: skeletonCount }).map((_, i) => (
          <div
            key={i}
            className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-6 flex flex-col gap-3 animate-pulse"
          >
            <div className="h-3 w-24 bg-gray-100 dark:bg-gray-700 rounded-full" />
            <div className="h-9 w-32 bg-gray-100 dark:bg-gray-700 rounded-lg" />
            <div className="h-3 w-20 bg-gray-100 dark:bg-gray-700 rounded-full" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-5 mb-8">
      {children}
    </div>
  );
}

// AnalyticsCard — Enhanced card for analytics metrics
export function AnalyticsCard({ title, value, subtitle, icon, trend, trendValue, loading, accentColor = 'blue' }) {
  const accentClasses = {
    blue: 'border-l-blue-500 dark:border-l-blue-400',
    green: 'border-l-green-500 dark:border-l-green-400',
    red: 'border-l-red-500 dark:border-l-red-400',
    yellow: 'border-l-yellow-500 dark:border-l-yellow-400',
    purple: 'border-l-purple-500 dark:border-l-purple-400',
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm p-5 animate-pulse">
        <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded mb-3" />
        <div className="h-8 w-24 bg-gray-200 dark:bg-gray-700 rounded mb-2" />
        <div className="h-3 w-40 bg-gray-200 dark:bg-gray-700 rounded" />
      </div>
    );
  }

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-xl border-l-4 ${accentClasses[accentColor]} border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md transition-all duration-200 p-5`}>
      <div className="flex items-start justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">
          {title}
        </h3>
        {icon && <span className="text-2xl">{icon}</span>}
      </div>
      <div className="flex items-baseline gap-3">
        <p className="text-3xl font-bold text-gray-900 dark:text-white">
          {value}
        </p>
        {trend && trendValue && (
          <span className={`flex items-center text-xs font-medium ${
            trend === 'up' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
          }`}>
            {trend === 'up' ? '↑' : '↓'} {trendValue}
          </span>
        )}
      </div>
      {subtitle && (
        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
          {subtitle}
        </p>
      )}
    </div>
  );
}

// ChartContainer — Wrapper for chart components with consistent styling
// ChartContainer — Wrapper for chart components with loading/error states and fullscreen support
export const ChartContainer = memo(function ChartContainer({ 
  title, 
  subtitle, 
  children, 
  loading, 
  error, 
  isEmpty, 
  height = '400px', 
  actions,
  onFullscreen 
}) {
  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm p-6 animate-fade-in">
        <div className="h-6 w-48 bg-gray-200 dark:bg-gray-700 rounded mb-2 animate-pulse skeleton-shimmer" />
        <div className="h-4 w-64 bg-gray-200 dark:bg-gray-700 rounded mb-6 animate-pulse skeleton-shimmer" />
        <div className={`bg-gray-100 dark:bg-gray-900 rounded-lg animate-pulse skeleton-shimmer`} style={{ height }} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-red-200 dark:border-red-800 shadow-sm p-6 animate-fade-in">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{title}</h3>
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-3">
            <span className="text-4xl">⚠️</span>
          </div>
          <p className="text-sm font-medium text-red-600 dark:text-red-400">Error loading chart</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-sm">{error}</p>
        </div>
      </div>
    );
  }

  if (isEmpty) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm p-6 animate-fade-in">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{title}</h3>
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-3">
            <span className="text-4xl opacity-30">📊</span>
          </div>
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">No data available</p>
          <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">Data will appear here once available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5 p-6 animate-fade-in group">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white tracking-tight group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
            {title}
          </h3>
          {subtitle && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {subtitle}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {onFullscreen && (
            <button
              onClick={onFullscreen}
              className="p-2 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-all opacity-0 group-hover:opacity-100"
              aria-label="View fullscreen"
              title="View fullscreen"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
              </svg>
            </button>
          )}
          {actions && (
            <div className="flex items-center gap-2">
              {actions}
            </div>
          )}
        </div>
      </div>
      <div style={{ height }} className="transition-all duration-300">
        {children}
      </div>
    </div>
  );
});

// FilterPanel — Dashboard filter controls
export function FilterPanel({ filters, onFilterChange, onReset }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm p-4 mb-6">
      <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center">
        <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 w-full">
          {/* Date Range Filter */}
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
              Date Range
            </label>
            <select
              value={filters.dateRange || 'all'}
              onChange={(e) => onFilterChange('dateRange', e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 dark:text-white"
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="week">Last 7 Days</option>
              <option value="month">Last 30 Days</option>
              <option value="quarter">Last 90 Days</option>
            </select>
          </div>

          {/* Bottleneck Stage Filter */}
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
              Bottleneck Stage
            </label>
            <select
              value={filters.bottleneckStage || 'all'}
              onChange={(e) => onFilterChange('bottleneckStage', e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 dark:text-white"
            >
              <option value="all">All Stages</option>
              <option value="procurement">Procurement</option>
              <option value="processing">Processing</option>
              <option value="dispatch">Dispatch</option>
              <option value="delivery">Delivery</option>
            </select>
          </div>

          {/* SLA Status Filter */}
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
              SLA Status
            </label>
            <select
              value={filters.slaStatus || 'all'}
              onChange={(e) => onFilterChange('slaStatus', e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 dark:text-white"
            >
              <option value="all">All Orders</option>
              <option value="ontime">On Time</option>
              <option value="breached">Breached</option>
            </select>
          </div>

          {/* Order Status Filter */}
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
              Order Status
            </label>
            <select
              value={filters.orderStatus || 'all'}
              onChange={(e) => onFilterChange('orderStatus', e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 dark:text-white"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="delayed">Delayed</option>
            </select>
          </div>
        </div>

        {/* Reset Button */}
        <button
          onClick={onReset}
          className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors whitespace-nowrap"
        >
          Reset Filters
        </button>
      </div>
    </div>
  );
}

// SkeletonLoader — Loading state for various components
export function SkeletonLoader({ type = 'card', count = 1 }) {
  if (type === 'card') {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm p-5 animate-pulse">
            <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded mb-3" />
            <div className="h-8 w-24 bg-gray-200 dark:bg-gray-700 rounded mb-2" />
            <div className="h-3 w-40 bg-gray-200 dark:bg-gray-700 rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (type === 'chart') {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm p-6 animate-pulse">
        <div className="h-6 w-48 bg-gray-200 dark:bg-gray-700 rounded mb-2" />
        <div className="h-4 w-64 bg-gray-200 dark:bg-gray-700 rounded mb-6" />
        <div className="h-80 bg-gray-100 dark:bg-gray-900 rounded-lg" />
      </div>
    );
  }

  return null;
}

// EmptyState — Reusable empty state component
export function EmptyState({ icon = '📊', title = 'No data available', description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <span className="text-6xl mb-4 opacity-20">{icon}</span>
      <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">
        {title}
      </h3>
      {description && (
        <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md mb-4">
          {description}
        </p>
      )}
      {action}
    </div>
  );
}

// ScrollToTop — Floating button to scroll to top
export function ScrollToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const toggleVisible = () => {
      const scrolled = document.documentElement.scrollTop;
      setVisible(scrolled > 300);
    };

    window.addEventListener('scroll', toggleVisible);
    return () => window.removeEventListener('scroll', toggleVisible);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  if (!visible) return null;

  return (
    <button
      onClick={scrollToTop}
      className="fixed bottom-6 right-6 z-50 p-3 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white rounded-full shadow-lg hover:shadow-xl transform hover:scale-110 transition-all duration-200 animate-fade-in"
      aria-label="Scroll to top"
    >
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
      </svg>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Notification System
// ---------------------------------------------------------------------------

export function Notification({ type = 'info', message, onClose, autoClose = true, duration = 5000 }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (autoClose && visible) {
      const timer = setTimeout(() => {
        setVisible(false);
        setTimeout(() => onClose?.(), 300);
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [autoClose, duration, visible, onClose]);

  if (!visible) return null;

  const styles = {
    success: {
      bg: 'bg-green-50 dark:bg-green-900/20',
      border: 'border-green-200 dark:border-green-800',
      text: 'text-green-800 dark:text-green-300',
      icon: '✓',
      iconBg: 'bg-green-500',
    },
    error: {
      bg: 'bg-red-50 dark:bg-red-900/20',
      border: 'border-red-200 dark:border-red-800',
      text: 'text-red-800 dark:text-red-300',
      icon: '✕',
      iconBg: 'bg-red-500',
    },
    warning: {
      bg: 'bg-yellow-50 dark:bg-yellow-900/20',
      border: 'border-yellow-200 dark:border-yellow-800',
      text: 'text-yellow-800 dark:text-yellow-300',
      icon: '⚠',
      iconBg: 'bg-yellow-500',
    },
    info: {
      bg: 'bg-blue-50 dark:bg-blue-900/20',
      border: 'border-blue-200 dark:border-blue-800',
      text: 'text-blue-800 dark:text-blue-300',
      icon: 'ℹ',
      iconBg: 'bg-blue-500',
    },
  };

  const style = styles[type] || styles.info;

  return (
    <div className={`fixed top-20 right-6 z-50 max-w-md animate-slide-down`}>
      <div className={`${style.bg} ${style.border} border-l-4 rounded-lg shadow-lg p-4 flex items-start gap-3`}>
        <div className={`${style.iconBg} rounded-full w-6 h-6 flex items-center justify-center text-white text-sm font-bold flex-shrink-0`}>
          {style.icon}
        </div>
        <p className={`${style.text} text-sm font-medium flex-1`}>{message}</p>
        <button
          onClick={() => {
            setVisible(false);
            setTimeout(() => onClose?.(), 300);
          }}
          className={`${style.text} hover:opacity-70 transition-opacity`}
          aria-label="Close notification"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}

// NotificationProvider — Context for managing notifications
const NotificationContext = React.createContext();

export function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState([]);

  const addNotification = useCallback((type, message, duration = 5000) => {
    const id = Date.now();
    setNotifications(prev => [...prev, { id, type, message, duration }]);
  }, []);

  const removeNotification = useCallback((id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  return (
    <NotificationContext.Provider value={{ addNotification }}>
      {children}
      {notifications.map(notif => (
        <Notification
          key={notif.id}
          type={notif.type}
          message={notif.message}
          duration={notif.duration}
          onClose={() => removeNotification(notif.id)}
        />
      ))}
    </NotificationContext.Provider>
  );
}

export function useNotification() {
  const context = React.useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within NotificationProvider');
  }
  return context;
}

// ---------------------------------------------------------------------------
// Report Export Components
// ---------------------------------------------------------------------------

export function ReportExportButton({ onExport, type = 'csv', loading = false, label }) {
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    try {
      await onExport?.();
    } finally {
      setExporting(false);
    }
  };

  const icons = {
    csv: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
    pdf: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
      </svg>
    ),
    excel: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
      </svg>
    ),
  };

  return (
    <button
      onClick={handleExport}
      disabled={exporting || loading}
      className="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-sm hover:shadow-md"
      aria-label={`Export as ${type.toUpperCase()}`}
    >
      {exporting ? (
        <>
          <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span>Exporting...</span>
        </>
      ) : (
        <>
          {icons[type]}
          <span>{label || `Export ${type.toUpperCase()}`}</span>
        </>
      )}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Dashboard Widget Component
// ---------------------------------------------------------------------------

export function DashboardWidget({ id, title, children, onRemove, onToggle, visible = true, customizable = true }) {
  const [isVisible, setIsVisible] = useState(visible);

  useEffect(() => {
    setIsVisible(visible);
  }, [visible]);

  if (!isVisible && customizable) return null;

  return (
    <div className="relative group">
      {customizable && (
        <div className="absolute -top-2 -right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex gap-1">
          <button
            onClick={() => {
              setIsVisible(false);
              onToggle?.(id, false);
            }}
            className="p-1 bg-gray-800 dark:bg-gray-700 text-white rounded-full shadow-lg hover:bg-gray-700 dark:hover:bg-gray-600 transition-colors"
            title="Hide widget"
            aria-label="Hide widget"
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
            </svg>
          </button>
          {onRemove && (
            <button
              onClick={() => onRemove?.(id)}
              className="p-1 bg-red-600 text-white rounded-full shadow-lg hover:bg-red-700 transition-colors"
              title="Remove widget"
              aria-label="Remove widget"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      )}
      <div className="h-full">
        {children}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Activity Panel Component
// ---------------------------------------------------------------------------

export function ActivityPanel() {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate loading activities (replace with actual API call)
    setTimeout(() => {
      setActivities([
        {
          id: 1,
          type: 'order',
          icon: '📦',
          title: 'New order created',
          description: 'Order #1024 - Procurement stage',
          timestamp: '2 minutes ago',
          color: 'blue',
        },
        {
          id: 2,
          type: 'breach',
          icon: '⚠️',
          title: 'SLA breach detected',
          description: 'Order #987 exceeded delivery SLA',
          timestamp: '15 minutes ago',
          color: 'red',
        },
        {
          id: 3,
          type: 'export',
          icon: '📊',
          title: 'Report exported',
          description: 'Analytics dashboard CSV export',
          timestamp: '1 hour ago',
          color: 'green',
        },
        {
          id: 4,
          type: 'order',
          icon: '✓',
          title: 'Order completed',
          description: 'Order #956 delivered successfully',
          timestamp: '2 hours ago',
          color: 'green',
        },
      ]);
      setLoading(false);
    }, 500);
  }, []);

  const colorClasses = {
    blue: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
    red: 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400',
    green: 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400',
    yellow: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400',
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Recent Activity
      </h3>

      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-start gap-3 animate-pulse">
              <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-full" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : activities.length === 0 ? (
        <EmptyState
          icon="📭"
          title="No recent activity"
          description="Activity will appear here as events occur"
        />
      ) : (
        <div className="space-y-4">
          {activities.map((activity) => (
            <div
              key={activity.id}
              className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer group"
            >
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg flex-shrink-0 ${colorClasses[activity.color]}`}>
                {activity.icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                  {activity.title}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  {activity.description}
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                  {activity.timestamp}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Global Filter Panel (Advanced)
// ---------------------------------------------------------------------------

export function GlobalFilterPanel({ filters, onFilterChange, onReset, onApply }) {
  const [localFilters, setLocalFilters] = useState(filters);
  const [expanded, setExpanded] = useState(false);

  const handleLocalChange = (key, value) => {
    setLocalFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleApply = () => {
    onApply?.(localFilters);
    Object.keys(localFilters).forEach(key => {
      onFilterChange(key, localFilters[key]);
    });
  };

  const handleReset = () => {
    const resetFilters = {
      dateRange: 'all',
      bottleneckStage: 'all',
      slaStatus: 'all',
      orderStatus: 'all',
      processingDuration: 'all',
      deliveryDuration: 'all',
    };
    setLocalFilters(resetFilters);
    onReset?.();
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm mb-6">
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            Advanced Filters
          </h3>
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium"
          >
            {expanded ? 'Show Less' : 'Show More'}
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {/* Date Range */}
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
              Date Range
            </label>
            <select
              value={localFilters.dateRange || 'all'}
              onChange={(e) => handleLocalChange('dateRange', e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 dark:text-white"
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="week">Last 7 Days</option>
              <option value="month">Last 30 Days</option>
              <option value="quarter">Last 90 Days</option>
            </select>
          </div>

          {/* Bottleneck Stage */}
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
              Bottleneck Stage
            </label>
            <select
              value={localFilters.bottleneckStage || 'all'}
              onChange={(e) => handleLocalChange('bottleneckStage', e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 dark:text-white"
            >
              <option value="all">All Stages</option>
              <option value="procurement">Procurement</option>
              <option value="processing">Processing</option>
              <option value="dispatch">Dispatch</option>
              <option value="delivery">Delivery</option>
            </select>
          </div>

          {/* SLA Status */}
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
              SLA Status
            </label>
            <select
              value={localFilters.slaStatus || 'all'}
              onChange={(e) => handleLocalChange('slaStatus', e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 dark:text-white"
            >
              <option value="all">All Orders</option>
              <option value="ontime">On Time</option>
              <option value="breached">Breached</option>
            </select>
          </div>

          {expanded && (
            <>
              {/* Order Status */}
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
                  Order Status
                </label>
                <select
                  value={localFilters.orderStatus || 'all'}
                  onChange={(e) => handleLocalChange('orderStatus', e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 dark:text-white"
                >
                  <option value="all">All Statuses</option>
                  <option value="active">Active</option>
                  <option value="completed">Completed</option>
                  <option value="delayed">Delayed</option>
                </select>
              </div>

              {/* Processing Duration */}
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
                  Processing Duration
                </label>
                <select
                  value={localFilters.processingDuration || 'all'}
                  onChange={(e) => handleLocalChange('processingDuration', e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 dark:text-white"
                >
                  <option value="all">Any Duration</option>
                  <option value="fast">&lt; 5 days</option>
                  <option value="medium">5-10 days</option>
                  <option value="slow">&gt; 10 days</option>
                </select>
              </div>

              {/* Delivery Duration */}
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
                  Delivery Duration
                </label>
                <select
                  value={localFilters.deliveryDuration || 'all'}
                  onChange={(e) => handleLocalChange('deliveryDuration', e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 dark:text-white"
                >
                  <option value="all">Any Duration</option>
                  <option value="fast">&lt; 3 days</option>
                  <option value="medium">3-7 days</option>
                  <option value="slow">&gt; 7 days</option>
                </select>
              </div>
            </>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={handleApply}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white text-sm font-medium rounded-lg transition-colors shadow-sm"
          >
            Apply Filters
          </button>
          <button
            onClick={handleReset}
            className="px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg transition-colors"
          >
            Reset All
          </button>
          <span className="text-xs text-gray-500 dark:text-gray-400 ml-auto">
            {Object.values(localFilters).filter(v => v !== 'all').length} filters active
          </span>
        </div>
      </div>
    </div>
  );
}

// ===========================================================================
// Presentation & Showcase Components
// ===========================================================================

// PresentationHeader — Executive-style dashboard header
export const PresentationHeader = memo(function PresentationHeader({ title, subtitle, actions, stats }) {
  return (
    <div className="bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-700 rounded-2xl shadow-2xl p-8 mb-8 text-white animate-fade-in">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
              <span className="text-2xl">📊</span>
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight">{title || 'Supply Chain Analytics'}</h1>
              <p className="text-blue-100 text-sm mt-1">{subtitle || 'Enterprise Intelligence Dashboard'}</p>
            </div>
          </div>
          
          {stats && (
            <div className="flex flex-wrap gap-6 mt-6">
              {stats.map((stat, idx) => (
                <div key={idx} className="flex items-center gap-3 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-lg">
                  <span className="text-2xl">{stat.icon}</span>
                  <div>
                    <div className="text-2xl font-bold">{stat.value}</div>
                    <div className="text-xs text-blue-100">{stat.label}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        {actions && (
          <div className="flex flex-col sm:flex-row gap-3">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
});

// ExecutiveLandingSection — Hero section for dashboard
export const ExecutiveLandingSection = memo(function ExecutiveLandingSection({ summary, loading }) {
  const metrics = useMemo(() => {
    if (!summary) return [];
    
    const slaTotal = (summary?.slaOnTime ?? 0) + (summary?.slaBreaches ?? 0);
    const slaBreachPct = slaTotal > 0 
      ? ((summary?.slaBreaches ?? 0) / slaTotal * 100).toFixed(1)
      : '0.0';
    
    return [
      {
        icon: '📦',
        value: summary.totalOrders?.toLocaleString() || '0',
        label: 'Total Orders',
        color: 'blue',
      },
      {
        icon: '⚡',
        value: summary.avgTotalTime ? `${Number(summary.avgTotalTime).toFixed(1)}d` : 'N/A',
        label: 'Avg Cycle Time',
        color: 'purple',
      },
      {
        icon: '⚠️',
        value: `${slaBreachPct}%`,
        label: 'SLA Breach Rate',
        color: 'red',
      },
      {
        icon: '✅',
        value: summary.slaOnTime?.toLocaleString() || '0',
        label: 'On-Time Orders',
        color: 'green',
      },
    ];
  }, [summary]);

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 rounded-2xl p-8 mb-8 animate-pulse">
        <div className="h-32" />
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-blue-50 via-purple-50 to-indigo-50 dark:from-gray-800 dark:via-gray-850 dark:to-gray-900 rounded-2xl border border-blue-200 dark:border-gray-700 shadow-lg p-8 mb-8 animate-fade-in">
      <div className="text-center mb-8">
        <h2 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
          Supply Chain Performance Overview
        </h2>
        <p className="text-gray-600 dark:text-gray-400 text-lg">
          Real-time operational intelligence and analytics
        </p>
      </div>
      
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {metrics.map((metric, idx) => (
          <div
            key={idx}
            className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border border-gray-200 dark:border-gray-700"
            style={{ animationDelay: `${idx * 100}ms` }}
          >
            <div className="flex flex-col items-center text-center gap-3">
              <div className={`w-14 h-14 rounded-full flex items-center justify-center text-3xl bg-${metric.color}-100 dark:bg-${metric.color}-900/30`}>
                {metric.icon}
              </div>
              <div>
                <div className="text-3xl font-bold text-gray-900 dark:text-white tabular-nums">{metric.value}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">{metric.label}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
});

// AnalyticsSummaryCard — Compact summary card with trend
export const AnalyticsSummaryCard = memo(function AnalyticsSummaryCard({ 
  title, 
  value, 
  subtitle, 
  icon, 
  trend, 
  trendValue, 
  color = 'blue' 
}) {
  const colorClasses = {
    blue: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400',
    green: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-600 dark:text-green-400',
    red: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-600 dark:text-red-400',
    purple: 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800 text-purple-600 dark:text-purple-400',
    amber: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 text-amber-600 dark:text-amber-400',
  };

  return (
    <div className={`rounded-xl border-2 p-5 ${colorClasses[color]} hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5 animate-fade-in`}>
      <div className="flex items-start justify-between mb-3">
        <div className="text-3xl">{icon}</div>
        {trend && (
          <div className={`flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full ${
            trend === 'up' ? 'bg-green-500/20 text-green-700 dark:text-green-400' : 'bg-red-500/20 text-red-700 dark:text-red-400'
          }`}>
            {trend === 'up' ? '↑' : '↓'} {trendValue}
          </div>
        )}
      </div>
      <div className="text-3xl font-bold text-gray-900 dark:text-white mb-1 tabular-nums">{value}</div>
      <div className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">{title}</div>
      {subtitle && <div className="text-xs text-gray-600 dark:text-gray-400">{subtitle}</div>}
    </div>
  );
});

// ResponsiveAnalyticsGrid — Responsive grid for analytics cards
export const ResponsiveAnalyticsGrid = memo(function ResponsiveAnalyticsGrid({ children, columns = 4 }) {
  const gridClasses = {
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
    5: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5',
  };

  return (
    <div className={`grid ${gridClasses[columns]} gap-4 md:gap-6`}>
      {children}
    </div>
  );
});

// FullscreenChartModal — Modal for fullscreen chart view
export const FullscreenChartModal = memo(function FullscreenChartModal({ isOpen, onClose, title, children }) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-7xl h-[90vh] bg-white dark:bg-gray-900 rounded-2xl shadow-2xl flex flex-col animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-800">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{title}</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            aria-label="Close fullscreen view"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        {/* Content */}
        <div className="flex-1 p-6 overflow-y-auto custom-scrollbar">
          {children}
        </div>
      </div>
    </div>
  );
});

// DashboardSection — Reusable section wrapper
export const DashboardSection = memo(function DashboardSection({ title, subtitle, actions, children, className = '' }) {
  return (
    <section className={`animate-fade-in ${className}`}>
      {(title || actions) && (
        <div className="flex items-center justify-between mb-4">
          <div>
            {title && <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{title}</h2>}
            {subtitle && <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{subtitle}</p>}
          </div>
          {actions && <div className="flex items-center gap-3">{actions}</div>}
        </div>
      )}
      {children}
    </section>
  );
});

// AnalyticsToolbar — Dashboard toolbar with refresh and controls
export const AnalyticsToolbar = memo(function AnalyticsToolbar({ 
  onRefresh, 
  isRefreshing, 
  lastUpdated, 
  autoRefresh, 
  onToggleAutoRefresh,
  className = '' 
}) {
  const [timeAgo, setTimeAgo] = useState('');

  useEffect(() => {
    const updateTimeAgo = () => {
      if (!lastUpdated) {
        setTimeAgo('Never');
        return;
      }
      
      const seconds = Math.floor((new Date() - new Date(lastUpdated)) / 1000);
      
      if (seconds < 60) setTimeAgo('Just now');
      else if (seconds < 3600) setTimeAgo(`${Math.floor(seconds / 60)}m ago`);
      else if (seconds < 86400) setTimeAgo(`${Math.floor(seconds / 3600)}h ago`);
      else setTimeAgo(`${Math.floor(seconds / 86400)}d ago`);
    };

    updateTimeAgo();
    const interval = setInterval(updateTimeAgo, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, [lastUpdated]);

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-4 animate-fade-in ${className}`}>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        {/* Left: Status */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            {isRefreshing ? (
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
            ) : (
              <div className="w-2 h-2 bg-green-500 rounded-full" />
            )}
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {isRefreshing ? 'Refreshing...' : 'Live'}
            </span>
          </div>
          <div className="h-4 w-px bg-gray-300 dark:bg-gray-600" />
          <span className="text-xs text-gray-500 dark:text-gray-400">
            Updated {timeAgo}
          </span>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-3">
          {/* Auto-refresh toggle */}
          <label className="flex items-center gap-2 cursor-pointer group">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => onToggleAutoRefresh?.(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 focus:ring-offset-0 cursor-pointer"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
              Auto-refresh
            </span>
          </label>

          {/* Refresh button */}
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white text-sm font-medium rounded-lg transition-all hover:scale-105 disabled:hover:scale-100 disabled:cursor-not-allowed shadow-sm"
            aria-label="Refresh analytics data"
          >
            <svg 
              className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>{isRefreshing ? 'Refreshing' : 'Refresh'}</span>
          </button>
        </div>
      </div>
    </div>
  );
});

// DataRefreshIndicator — Global loading indicator for data refresh
export const DataRefreshIndicator = memo(function DataRefreshIndicator({ isVisible }) {
  if (!isVisible) return null;

  return (
    <div className="fixed top-20 right-6 z-40 animate-slide-down">
      <div className="bg-blue-600 text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 backdrop-blur-sm">
        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
        <span className="text-sm font-medium">Refreshing analytics...</span>
      </div>
    </div>
  );
});

// AnalyticsWidget — Enhanced dashboard widget with more controls
export const AnalyticsWidget = memo(function AnalyticsWidget({ 
  id, 
  title, 
  children, 
  onRemove, 
  onToggle, 
  visible = true,
  collapsible = false,
  icon
}) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  if (!visible) return null;

  return (
    <div className="animate-fade-in">
      {collapsible && (
        <div className="flex items-center justify-between mb-3 px-1">
          <div className="flex items-center gap-2">
            {icon && <span className="text-lg">{icon}</span>}
            {title && <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">{title}</h3>}
          </div>
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            aria-label={isCollapsed ? 'Expand' : 'Collapse'}
          >
            <svg 
              className={`w-4 h-4 transition-transform ${isCollapsed ? 'rotate-180' : ''}`} 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
      )}
      {!isCollapsed && children}
    </div>
  );
});

// BusinessInsightsPanel — Executive insights with key metrics and trends
export const BusinessInsightsPanel = memo(function BusinessInsightsPanel({ summary, loading }) {
  const insights = useMemo(() => {
    if (!summary) return [];
    
    const totalOrders = summary.totalOrders || 0;
    const slaBreaches = summary.slaBreaches || 0;
    const avgTime = summary.avgTotalTime || 0;
    const breachRate = totalOrders > 0 ? ((slaBreaches / totalOrders) * 100).toFixed(1) : 0;
    
    return [
      {
        id: 'performance',
        title: 'Performance Status',
        value: breachRate < 15 ? 'Excellent' : breachRate < 30 ? 'Good' : 'Needs Attention',
        description: `${breachRate}% SLA breach rate`,
        icon: '🎯',
        color: breachRate < 15 ? 'green' : breachRate < 30 ? 'blue' : 'red',
        trend: breachRate < 20 ? 'positive' : 'negative'
      },
      {
        id: 'efficiency',
        title: 'Processing Efficiency',
        value: avgTime < 5 ? 'High' : avgTime < 8 ? 'Moderate' : 'Low',
        description: `Average cycle time: ${avgTime.toFixed(1)} days`,
        icon: '⚡',
        color: avgTime < 5 ? 'green' : avgTime < 8 ? 'blue' : 'amber',
        trend: avgTime < 6 ? 'positive' : 'neutral'
      },
      {
        id: 'bottleneck',
        title: 'Bottleneck Impact',
        value: summary.mostCommonBottleneck || 'N/A',
        description: `${summary.bottleneckCount || 0} orders affected`,
        icon: '🔍',
        color: 'purple',
        trend: 'neutral'
      },
      {
        id: 'volume',
        title: 'Order Volume',
        value: totalOrders.toLocaleString(),
        description: 'Total orders processed',
        icon: '📦',
        color: 'indigo',
        trend: 'positive'
      }
    ];
  }, [summary]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white dark:bg-gray-800 rounded-xl p-6 skeleton-shimmer h-40" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8 animate-fade-in">
      {insights.map((insight, index) => (
        <div
          key={insight.id}
          className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 border border-gray-200 dark:border-gray-700"
          style={{ animationDelay: `${index * 100}ms` }}
        >
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <span className="text-3xl">{insight.icon}</span>
              <div>
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  {insight.title}
                </h3>
                <p className={`text-2xl font-bold mt-1 text-${insight.color}-600 dark:text-${insight.color}-400`}>
                  {insight.value}
                </p>
              </div>
            </div>
            {insight.trend && (
              <span className={`text-xs px-2 py-1 rounded-full ${
                insight.trend === 'positive' 
                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' 
                  : insight.trend === 'negative'
                  ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                  : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
              }`}>
                {insight.trend === 'positive' ? '↑' : insight.trend === 'negative' ? '↓' : '—'}
              </span>
            )}
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {insight.description}
          </p>
        </div>
      ))}
    </div>
  );
});

// AnalyticsOverviewWidget — Comprehensive analytics summary
export const AnalyticsOverviewWidget = memo(function AnalyticsOverviewWidget({ 
  title = 'Analytics Overview', 
  data, 
  loading,
  onViewDetails 
}) {
  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg mb-6">
        <div className="h-8 w-48 bg-gray-200 dark:bg-gray-700 rounded skeleton-shimmer mb-4" />
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-16 bg-gray-100 dark:bg-gray-700 rounded skeleton-shimmer" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg mb-6 animate-fade-in border border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">{title}</h2>
        {onViewDetails && (
          <button
            onClick={onViewDetails}
            className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium flex items-center gap-1 transition-colors"
          >
            View Details
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        )}
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {data?.map((item, index) => (
          <div
            key={item.id || index}
            className="p-4 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-750 rounded-lg hover:shadow-md transition-all duration-300"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                {item.label}
              </span>
              {item.icon && <span className="text-xl">{item.icon}</span>}
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
              {item.value}
            </p>
            {item.change && (
              <div className={`flex items-center gap-1 text-xs font-medium ${
                item.changeType === 'positive' 
                  ? 'text-green-600 dark:text-green-400' 
                  : item.changeType === 'negative'
                  ? 'text-red-600 dark:text-red-400'
                  : 'text-gray-500 dark:text-gray-400'
              }`}>
                {item.changeType === 'positive' && '↑'}
                {item.changeType === 'negative' && '↓'}
                <span>{item.change}</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
});

// PerformanceOverviewCards — Executive performance summary
export const PerformanceOverviewCards = memo(function PerformanceOverviewCards({ metrics, loading }) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-32 bg-white dark:bg-gray-800 rounded-xl skeleton-shimmer" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8 animate-fade-in">
      {metrics?.map((metric, index) => (
        <div
          key={metric.id}
          className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-850 rounded-xl p-6 shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:scale-105 border border-gray-200 dark:border-gray-700"
          style={{ animationDelay: `${index * 150}ms` }}
        >
          <div className="flex items-center justify-between mb-4">
            <div className={`p-3 rounded-lg bg-${metric.color}-100 dark:bg-${metric.color}-900/30`}>
              <span className="text-2xl">{metric.icon}</span>
            </div>
            <div className={`text-xs font-semibold px-3 py-1 rounded-full ${
              metric.status === 'excellent' 
                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                : metric.status === 'good'
                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
            }`}>
              {metric.status?.toUpperCase()}
            </div>
          </div>
          <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
            {metric.title}
          </h3>
          <p className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            {metric.value}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {metric.subtitle}
          </p>
        </div>
      ))}
    </div>
  );
});

// EnhancedCustomTooltip — Professional chart tooltip
export const EnhancedCustomTooltip = memo(function EnhancedCustomTooltip({ active, payload, label, formatter }) {
  if (!active || !payload || !payload.length) return null;

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl p-4 animate-fade-in">
      <p className="text-sm font-semibold text-gray-900 dark:text-white mb-3 border-b border-gray-200 dark:border-gray-700 pb-2">
        {label}
      </p>
      <div className="space-y-2">
        {payload.map((entry, index) => (
          <div key={index} className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {entry.name}
              </span>
            </div>
            <span className="text-sm font-bold text-gray-900 dark:text-white">
              {formatter ? formatter(entry.value) : entry.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
});

// InteractiveKPICard — Clickable KPI with drill-down support
export const InteractiveKPICard = memo(function InteractiveKPICard({ 
  title, 
  value, 
  subtitle, 
  icon, 
  trend,
  trendValue,
  onClick,
  loading,
  accentColor = 'blue'
}) {
  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg skeleton-shimmer h-40" />
    );
  }

  const colorClasses = {
    blue: 'from-blue-500 to-blue-600',
    green: 'from-green-500 to-green-600',
    purple: 'from-purple-500 to-purple-600',
    amber: 'from-amber-500 to-amber-600',
    red: 'from-red-500 to-red-600',
    indigo: 'from-indigo-500 to-indigo-600',
  };

  return (
    <div
      onClick={onClick}
      className={`bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:scale-105 border border-gray-200 dark:border-gray-700 ${
        onClick ? 'cursor-pointer' : ''
      } animate-fade-in group`}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => e.key === 'Enter' && onClick() : undefined}
    >
      <div className="flex items-start justify-between mb-4">
        <div className={`p-4 rounded-xl bg-gradient-to-br ${colorClasses[accentColor]} text-white shadow-lg group-hover:scale-110 transition-transform duration-300`}>
          <span className="text-3xl">{icon}</span>
        </div>
        {trend && (
          <div className={`flex items-center gap-1 px-3 py-1 rounded-full text-sm font-semibold ${
            trend === 'up' 
              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
              : trend === 'down'
              ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
              : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
          }`}>
            {trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→'}
            {trendValue && <span>{trendValue}</span>}
          </div>
        )}
      </div>
      <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
        {title}
      </h3>
      <p className="text-3xl font-bold text-gray-900 dark:text-white mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
        {value}
      </p>
      {subtitle && (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {subtitle}
        </p>
      )}
      {onClick && (
        <div className="mt-4 flex items-center text-blue-600 dark:text-blue-400 text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">
          View Details
          <svg className="w-4 h-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      )}
    </div>
  );
});

// DrillDownModal — Modal for detailed analytics drill-down
export const DrillDownModal = memo(function DrillDownModal({ isOpen, onClose, title, children }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[85vh] overflow-auto animate-scale-in">
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between z-10">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{title}</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            aria-label="Close"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-6">
          {children}
        </div>
      </div>
    </div>
  );
});

// ExportProgressModal — Shows export progress with animation
export const ExportProgressModal = memo(function ExportProgressModal({ 
  isOpen, 
  onClose, 
  exportType = 'CSV',
  progress = 0,
  status = 'preparing' // preparing, exporting, complete, error
}) {
  if (!isOpen) return null;

  const statusConfig = {
    preparing: {
      icon: '📋',
      title: 'Preparing Export',
      description: 'Gathering analytics data...',
      color: 'blue'
    },
    exporting: {
      icon: '⬇️',
      title: 'Exporting Data',
      description: `Creating ${exportType} file...`,
      color: 'blue'
    },
    complete: {
      icon: '✅',
      title: 'Export Complete',
      description: `${exportType} file ready for download`,
      color: 'green'
    },
    error: {
      icon: '❌',
      title: 'Export Failed',
      description: 'An error occurred during export',
      color: 'red'
    }
  };

  const config = statusConfig[status] || statusConfig.preparing;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={status === 'complete' || status === 'error' ? onClose : undefined}
      />
      <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-8 animate-scale-in">
        <div className="text-center">
          <div className="text-6xl mb-4 animate-bounce">{config.icon}</div>
          <h3 className={`text-2xl font-bold mb-2 text-${config.color}-600 dark:text-${config.color}-400`}>
            {config.title}
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">{config.description}</p>
          
          {(status === 'preparing' || status === 'exporting') && (
            <div className="space-y-3">
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-blue-500 to-purple-600 h-3 rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {progress}% complete
              </p>
            </div>
          )}

          {(status === 'complete' || status === 'error') && (
            <button
              onClick={onClose}
              className={`mt-4 px-6 py-3 rounded-lg font-semibold text-white transition-all ${
                status === 'complete'
                  ? 'bg-green-600 hover:bg-green-700'
                  : 'bg-red-600 hover:bg-red-700'
              }`}
            >
              {status === 'complete' ? 'Done' : 'Close'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
});

// LoadingOverlay — Full-screen loading overlay
export const LoadingOverlay = memo(function LoadingOverlay({ isVisible, message = 'Loading...' }) {
  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-2xl flex flex-col items-center gap-4">
        <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-lg font-semibold text-gray-900 dark:text-white">{message}</p>
      </div>
    </div>
  );
});

// ResponsiveDashboardLayout — Responsive grid wrapper
export const ResponsiveDashboardLayout = memo(function ResponsiveDashboardLayout({ children, columns = 3 }) {
  const gridClasses = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 lg:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
  };

  return (
    <div className={`grid ${gridClasses[columns] || gridClasses[3]} gap-6 animate-fade-in`}>
      {children}
    </div>
  );
});

// EnhancedFilterToolbar — Advanced filter toolbar with quick actions
export const EnhancedFilterToolbar = memo(function EnhancedFilterToolbar({ 
  activeFilters = 0,
  onClearFilters,
  onSavePreset,
  onExport,
  showExport = true
}) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-lg mb-6 border border-gray-200 dark:border-gray-700">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            <span className="font-medium">
              {activeFilters > 0 ? `${activeFilters} Active Filters` : 'No Active Filters'}
            </span>
          </div>
          {activeFilters > 0 && (
            <button
              onClick={onClearFilters}
              className="text-sm text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 font-medium flex items-center gap-1 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Clear All
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          {onSavePreset && (
            <button
              onClick={onSavePreset}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
              </svg>
              Save Preset
            </button>
          )}
          {showExport && onExport && (
            <button
              onClick={onExport}
              className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 rounded-lg transition-all shadow-md hover:shadow-lg flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Export
            </button>
          )}
        </div>
      </div>
    </div>
  );
});

// AnalyticsActionToolbar — Quick action buttons for analytics
export const AnalyticsActionToolbar = memo(function AnalyticsActionToolbar({ 
  onRefresh,
  onFullscreen,
  onShare,
  onSettings,
  isRefreshing = false
}) {
  return (
    <div className="flex items-center gap-2 bg-white dark:bg-gray-800 rounded-lg p-2 shadow-sm border border-gray-200 dark:border-gray-700">
      {onRefresh && (
        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          className="p-2 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          title="Refresh"
        >
          <svg className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      )}
      {onFullscreen && (
        <button
          onClick={onFullscreen}
          className="p-2 text-gray-600 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg transition-all"
          title="Fullscreen"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
          </svg>
        </button>
      )}
      {onShare && (
        <button
          onClick={onShare}
          className="p-2 text-gray-600 dark:text-gray-400 hover:text-green-600 dark:hover:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-all"
          title="Share"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
          </svg>
        </button>
      )}
      {onSettings && (
        <button
          onClick={onSettings}
          className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-all"
          title="Settings"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>
      )}
    </div>
  );
});

// TableauContainer — Responsive Tableau dashboard embedding
export const TableauContainer = memo(function TableauContainer({ 
  viewUrl = TABLEAU_CONFIG.viewUrl,
  title = 'Tableau Analytics Dashboard',
  loading: externalLoading = false,
  onLoad,
  onError,
  height = '800px',
  allowFullscreen = true
}) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { theme } = useTheme();

  const handleLoad = useCallback(() => {
    setLoading(false);
    onLoad?.();
  }, [onLoad]);

  const handleError = useCallback((err) => {
    setError('Failed to load Tableau dashboard');
    setLoading(false);
    onError?.(err);
  }, [onError]);

  if (!TABLEAU_CONFIG.enabled) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl p-8 shadow-lg border border-gray-200 dark:border-gray-700 text-center">
        <div className="text-6xl mb-4">📊</div>
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
          Tableau Integration Disabled
        </h3>
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          Set VITE_TABLEAU_ENABLED=true in your environment to enable Tableau dashboards
        </p>
        <div className="text-sm text-gray-500 dark:text-gray-500 bg-gray-100 dark:bg-gray-700 rounded-lg p-4 font-mono">
          VITE_TABLEAU_SERVER_URL=https://public.tableau.com<br />
          VITE_TABLEAU_VIEW_URL=https://public.tableau.com/views/...<br />
          VITE_TABLEAU_ENABLED=true
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden animate-fade-in">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-gray-800 dark:to-gray-850">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">📊</span>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">{title}</h3>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 text-xs font-semibold bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-full">
              Live Dashboard
            </span>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {(loading || externalLoading) && (
        <div className="absolute inset-0 bg-white dark:bg-gray-800 flex items-center justify-center z-10">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400 font-medium">Loading Tableau Dashboard...</p>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="p-8 text-center">
          <div className="text-6xl mb-4">⚠️</div>
          <h3 className="text-xl font-bold text-red-600 dark:text-red-400 mb-2">Dashboard Load Error</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
          <button
            onClick={() => { setError(null); setLoading(true); }}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {/* Tableau Iframe */}
      {!error && (
        <div className="relative" style={{ height }}>
          <iframe
            src={viewUrl}
            className="w-full h-full border-0"
            onLoad={handleLoad}
            onError={handleError}
            allow="fullscreen"
            allowFullScreen={allowFullscreen}
            title={title}
          />
        </div>
      )}
    </div>
  );
});

// DashboardSectionHeader — Reusable section header with description
export const DashboardSectionHeader = memo(function DashboardSectionHeader({ 
  title, 
  subtitle, 
  icon, 
  actions,
  className = '' 
}) {
  return (
    <div className={`mb-6 ${className}`}>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-start gap-3">
          {icon && <span className="text-3xl">{icon}</span>}
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
              {title}
            </h2>
            {subtitle && (
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                {subtitle}
              </p>
            )}
          </div>
        </div>
        {actions && (
          <div className="flex items-center gap-2">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
});

// AnalyticsInsightCard — Individual insight card with icon and description
export const AnalyticsInsightCard = memo(function AnalyticsInsightCard({ 
  title, 
  description, 
  value,
  icon, 
  color = 'blue',
  trend,
  onClick 
}) {
  const colorClasses = {
    blue: 'from-blue-500 to-blue-600',
    green: 'from-green-500 to-green-600',
    red: 'from-red-500 to-red-600',
    purple: 'from-purple-500 to-purple-600',
    amber: 'from-amber-500 to-amber-600',
    indigo: 'from-indigo-500 to-indigo-600',
  };

  return (
    <div
      onClick={onClick}
      className={`bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg hover:shadow-2xl transition-all duration-300 border border-gray-200 dark:border-gray-700 ${
        onClick ? 'cursor-pointer transform hover:scale-105' : ''
      } animate-fade-in`}
    >
      <div className="flex items-start gap-4">
        <div className={`p-4 rounded-xl bg-gradient-to-br ${colorClasses[color]} text-white shadow-lg`}>
          <span className="text-3xl">{icon}</span>
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
            {title}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
            {description}
          </p>
          {value && (
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-gray-900 dark:text-white">
                {value}
              </span>
              {trend && (
                <span className={`text-sm font-semibold ${
                  trend.type === 'up' ? 'text-green-600' : trend.type === 'down' ? 'text-red-600' : 'text-gray-600'
                }`}>
                  {trend.type === 'up' ? '↑' : trend.type === 'down' ? '↓' : '→'} {trend.value}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

// AnalyticsSummaryPanel — Comprehensive analytics summary with multiple metrics
export const AnalyticsSummaryPanel = memo(function AnalyticsSummaryPanel({ 
  title = 'Analytics Summary',
  metrics = [],
  insights = [],
  loading = false
}) {
  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg mb-6">
        <div className="h-8 w-48 bg-gray-200 dark:bg-gray-700 rounded skeleton-shimmer mb-4" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-32 bg-gray-100 dark:bg-gray-700 rounded-lg skeleton-shimmer" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-850 rounded-xl p-6 shadow-lg mb-6 border border-gray-200 dark:border-gray-700 animate-fade-in">
      <DashboardSectionHeader
        title={title}
        icon="📊"
        subtitle="Comprehensive analytics overview and key insights"
      />

      {/* Metrics Grid */}
      {metrics.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {metrics.map((metric, index) => (
            <div
              key={index}
              className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-md hover:shadow-lg transition-all duration-300 border border-gray-100 dark:border-gray-700"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="flex items-center gap-3 mb-2">
                <span className="text-2xl">{metric.icon}</span>
                <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  {metric.label}
                </h4>
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                {metric.value}
              </p>
              {metric.description && (
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {metric.description}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Insights Section */}
      {insights.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3">
            Key Insights
          </h3>
          {insights.map((insight, index) => (
            <div
              key={index}
              className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800"
            >
              <span className="text-xl">{insight.icon || '💡'}</span>
              <div className="flex-1">
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">
                  {insight.title}
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {insight.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
});

// DashboardInfoCard — Information card with statistics
export const DashboardInfoCard = memo(function DashboardInfoCard({ 
  title, 
  stats = [],
  description,
  color = 'blue'
}) {
  const colorClasses = {
    blue: 'from-blue-500 to-blue-600',
    green: 'from-green-500 to-green-600',
    purple: 'from-purple-500 to-purple-600',
    amber: 'from-amber-500 to-amber-600',
  };

  return (
    <div className={`bg-gradient-to-br ${colorClasses[color]} rounded-xl p-6 text-white shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105 animate-fade-in`}>
      <h3 className="text-xl font-bold mb-4">{title}</h3>
      {description && (
        <p className="text-white/90 text-sm mb-4">{description}</p>
      )}
      <div className="grid grid-cols-2 gap-4">
        {stats.map((stat, index) => (
          <div key={index} className="bg-white/10 backdrop-blur-sm rounded-lg p-3">
            <p className="text-white/80 text-xs mb-1">{stat.label}</p>
            <p className="text-2xl font-bold">{stat.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
});

// FullscreenDashboardModal — Fullscreen modal for dashboards
export const FullscreenDashboardModal = memo(function FullscreenDashboardModal({ 
  isOpen, 
  onClose, 
  title,
  children 
}) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-gray-900 animate-fade-in">
      {/* Header */}
      <div className="sticky top-0 bg-gray-900 border-b border-gray-700 px-6 py-4 flex items-center justify-between z-10">
        <h2 className="text-xl font-bold text-white">{title}</h2>
        <button
          onClick={onClose}
          className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
          aria-label="Exit fullscreen"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      {/* Content */}
      <div className="h-[calc(100vh-73px)] overflow-auto p-6">
        {children}
      </div>
    </div>
  );
});

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
// KPIBox — reusable analytics card (Optimized with memo and animations)
// ---------------------------------------------------------------------------

const KPIBox = memo(function KPIBox({ title, value, subtitle }) {
  const displayValue = useMemo(() => {
    return value != null && value !== '' ? value : <span className="text-gray-200 dark:text-gray-600">—</span>;
  }, [value]);

  return (
    <div
      className="
        group
        bg-white dark:bg-gray-800
        rounded-2xl
        border border-gray-100 dark:border-gray-700
        shadow-sm
        hover:shadow-xl hover:-translate-y-1
        transition-all duration-300 ease-out
        p-6
        flex flex-col gap-1.5
        w-full
        animate-fade-in
        hover:border-blue-200 dark:hover:border-blue-800
      "
    >
      {/* Title */}
      <span className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest leading-none">
        {title}
      </span>

      {/* Value */}
      <p className="text-3xl font-bold text-gray-900 dark:text-white leading-tight mt-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-300 tabular-nums">
        {displayValue}
      </p>

      {/* Subtitle */}
      {subtitle && (
        <p className="text-xs text-gray-400 dark:text-gray-500 leading-relaxed mt-0.5">{subtitle}</p>
      )}
    </div>
  );
});

// ---------------------------------------------------------------------------
// ChartCard — reusable container for dashboard charts
// ---------------------------------------------------------------------------

function ChartCard({ title, children }) {
  return (
    <div
      className="
        bg-white dark:bg-gray-800
        rounded-2xl
        border border-gray-100 dark:border-gray-700
        shadow-sm
        hover:shadow-md
        transition-shadow duration-200 ease-in-out
        p-6
        flex flex-col
        w-full
        h-full
      "
    >
      {/* Chart Title */}
      {title && (
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 tracking-tight">
          {title}
        </h3>
      )}

      {/* Chart Content */}
      <div className="flex-1 min-h-0">
        {children}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// DashboardHeader — reusable header with title and action buttons
// ---------------------------------------------------------------------------

function DashboardHeader({ title, subtitle }) {
  const defaultTitle = 'Analytics Dashboard';
  const defaultSubtitle = `Supply chain performance overview · Last updated: ${new Date().toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })}`;

  return (
    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-8">
      {/* Title Section */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
          {title || defaultTitle}
        </h1>
        <p className="mt-1 text-sm text-gray-400">
          {subtitle || defaultSubtitle}
        </p>
      </div>

      {/* Action Buttons */}
      <div className="flex-shrink-0 flex flex-col sm:flex-row gap-3">
        <GenerateDataButton />
        <ExportButton />
      </div>
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

function StageDelayChart() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    // Fetch stage delay analytics from backend
    apiClient
      .get('/api/analytics/stage-delays')
      .then(({ data: responseData }) => {
        if (!cancelled) {
          // Transform data to format expected by Recharts
          const chartData = [
            { stage: 'Procurement', avgDelay: responseData.procurement_avg_delay || 0 },
            { stage: 'Processing', avgDelay: responseData.processing_avg_delay || 0 },
            { stage: 'Dispatch', avgDelay: responseData.dispatch_avg_delay || 0 },
            { stage: 'Delivery', avgDelay: responseData.delivery_avg_delay || 0 },
          ];
          setData(chartData);
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
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-base font-semibold text-gray-800">Stage Delay Analysis</h2>
          <p className="text-xs text-gray-400 mt-0.5">Average delay times across stages</p>
        </div>
        {!loading && !error && data.length > 0 && (
          <span className="text-xs text-gray-400 bg-gray-50 px-2 py-1 rounded-lg">
            4 stages
          </span>
        )}
      </div>

      {/* Loading skeleton */}
      {loading && (
        <div className="space-y-4 animate-pulse">
          <div className="h-64 bg-gray-50 rounded-xl" />
          <div className="flex justify-center gap-4">
            <div className="h-3 w-24 bg-gray-100 rounded-full" />
          </div>
        </div>
      )}

      {/* Error state */}
      {!loading && error && (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
          <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center">
            <span className="text-2xl">⚠️</span>
          </div>
          <div>
            <p className="text-sm text-red-600 font-semibold">Failed to load delay data</p>
            <p className="text-xs text-gray-400 mt-1">{error}</p>
          </div>
          <button
            onClick={() => setRetryKey((k) => k + 1)}
            className="mt-2 text-xs font-medium text-white bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && data.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
          <span className="text-4xl opacity-20">📊</span>
          <p className="text-sm text-gray-300 font-medium">No delay data available</p>
          <p className="text-xs text-gray-300">Data will appear once delays are recorded.</p>
        </div>
      )}

      {/* Bar chart */}
      {!loading && !error && data.length > 0 && (
        <>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart
              data={data}
              margin={{ top: 10, right: 20, left: 0, bottom: 70 }}
              barCategoryGap="25%"
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis
                dataKey="stage"
                tick={{ fontSize: 12, fill: '#64748b' }}
                tickLine={false}
                axisLine={false}
                angle={-35}
                textAnchor="end"
                height={80}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fontSize: 12, fill: '#64748b' }}
                tickLine={false}
                axisLine={false}
                width={50}
                label={{ 
                  value: 'Avg Delay (days)', 
                  angle: -90, 
                  position: 'insideLeft',
                  style: { fontSize: 12, fill: '#64748b' }
                }}
              />
              <Tooltip
                cursor={{ fill: '#f8fafc' }}
                contentStyle={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  padding: '12px',
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                }}
                labelStyle={{ 
                  fontWeight: 600, 
                  color: '#1e293b',
                  marginBottom: '4px',
                }}
                itemStyle={{ 
                  color: '#3b82f6',
                  fontSize: '13px',
                  fontWeight: 600,
                }}
                formatter={(value) => [`${Number(value).toFixed(2)} days`, 'Avg Delay']}
              />
              <Bar 
                dataKey="avgDelay" 
                fill="#3b82f6"
                radius={[8, 8, 0, 0]}
                maxBarSize={80}
              >
                {data.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={['#3b82f6', '#6366f1', '#8b5cf6', '#a855f7'][index % 4]}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>

          {/* Legend */}
          <div className="flex items-center justify-center gap-6 mt-6 pt-4 border-t border-gray-100">
            {data.map((item, idx) => (
              <div key={item.stage} className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-sm"
                  style={{ backgroundColor: ['#3b82f6', '#6366f1', '#8b5cf6', '#a855f7'][idx % 4] }}
                />
                <span className="text-xs text-gray-600 font-medium">{item.stage}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function SLABreachPieChart() {
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

    return () => { cancelled = true; };
  }, [retryKey]);

  // Transform data for pie chart
  const chartData = data ? [
    { name: 'On Time', value: data.onTime || 0, color: '#10b981' },
    { name: 'Breached', value: data.breached || 0, color: '#ef4444' },
  ] : [];

  const total = (data?.onTime || 0) + (data?.breached || 0);
  const complianceRate = data?.complianceRate || 0;

  // Custom label renderer with percentage
  const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * Math.PI / 180);
    const y = cy + radius * Math.sin(-midAngle * Math.PI / 180);

    if (percent < 0.05) return null; // Don't show label if less than 5%

    return (
      <text
        x={x}
        y={y}
        fill="white"
        textAnchor={x > cx ? 'start' : 'end'}
        dominantBaseline="central"
        className="font-bold text-sm"
      >
        {`${(percent * 100).toFixed(1)}%`}
      </text>
    );
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-base font-semibold text-gray-800">SLA Compliance Overview</h2>
          <p className="text-xs text-gray-400 mt-0.5">Breached vs Non-Breached Orders</p>
        </div>
        {!loading && !error && total > 0 && (
          <div className="text-right">
            <div className="text-2xl font-bold text-emerald-600">
              {complianceRate.toFixed(1)}%
            </div>
            <p className="text-xs text-gray-400">Compliance</p>
          </div>
        )}
      </div>

      {/* Loading skeleton */}
      {loading && (
        <div className="space-y-4 animate-pulse">
          <div className="h-64 bg-gray-50 rounded-xl flex items-center justify-center">
            <div className="w-48 h-48 rounded-full bg-gray-100" />
          </div>
          <div className="flex justify-center gap-4">
            <div className="h-3 w-24 bg-gray-100 rounded-full" />
            <div className="h-3 w-24 bg-gray-100 rounded-full" />
          </div>
        </div>
      )}

      {/* Error state */}
      {!loading && error && (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
          <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center">
            <span className="text-2xl">⚠️</span>
          </div>
          <div>
            <p className="text-sm text-red-600 font-semibold">Failed to load SLA data</p>
            <p className="text-xs text-gray-400 mt-1">{error}</p>
          </div>
          <button
            onClick={() => setRetryKey((k) => k + 1)}
            className="mt-2 text-xs font-medium text-white bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && total === 0 && (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
          <span className="text-4xl opacity-20">📊</span>
          <p className="text-sm text-gray-300 font-medium">No SLA data available</p>
          <p className="text-xs text-gray-300">Data will appear once orders are evaluated.</p>
        </div>
      )}

      {/* Pie chart */}
      {!loading && !error && total > 0 && (
        <>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={renderCustomLabel}
                outerRadius={100}
                innerRadius={60}
                paddingAngle={2}
                dataKey="value"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  padding: '12px',
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                }}
                itemStyle={{ 
                  fontSize: '13px',
                  fontWeight: 600,
                }}
                formatter={(value, name) => [
                  `${value.toLocaleString()} orders (${((value / total) * 100).toFixed(1)}%)`,
                  name
                ]}
              />
            </PieChart>
          </ResponsiveContainer>

          {/* Stats cards */}
          <div className="grid grid-cols-2 gap-4 mt-6 pt-4 border-t border-gray-100">
            <div className="text-center p-4 rounded-xl bg-emerald-50 border border-emerald-100">
              <div className="flex items-center justify-center gap-2 mb-2">
                <div className="w-3 h-3 rounded-full bg-emerald-500" />
                <span className="text-xs font-semibold text-emerald-700 uppercase">On Time</span>
              </div>
              <p className="text-2xl font-bold text-emerald-900 tabular-nums">
                {(data.onTime || 0).toLocaleString()}
              </p>
              <p className="text-xs text-emerald-600 mt-1">
                {total > 0 ? `${((data.onTime / total) * 100).toFixed(1)}%` : '0%'} of total
              </p>
            </div>

            <div className="text-center p-4 rounded-xl bg-red-50 border border-red-100">
              <div className="flex items-center justify-center gap-2 mb-2">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <span className="text-xs font-semibold text-red-700 uppercase">Breached</span>
              </div>
              <p className="text-2xl font-bold text-red-900 tabular-nums">
                {(data.breached || 0).toLocaleString()}
              </p>
              <p className="text-xs text-red-600 mt-1">
                {total > 0 ? `${((data.breached / total) * 100).toFixed(1)}%` : '0%'} of total
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function OrderTrendChart() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    // Fetch order trend data from backend
    apiClient
      .get('/api/analytics/order-trends')
      .then(({ data: responseData }) => {
        if (!cancelled) {
          // Expected format: [{ date: '2024-01-01', orders: 10 }, ...]
          const chartData = Array.isArray(responseData) ? responseData : (responseData.trends || []);
          setData(chartData);
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
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-base font-semibold text-gray-800">Order Trends Over Time</h2>
          <p className="text-xs text-gray-400 mt-0.5">Daily order creation trends</p>
        </div>
        {!loading && !error && data.length > 0 && (
          <span className="text-xs text-gray-400 bg-gray-50 px-2 py-1 rounded-lg">
            {data.length} data points
          </span>
        )}
      </div>

      {/* Loading skeleton */}
      {loading && (
        <div className="space-y-4 animate-pulse">
          <div className="h-64 bg-gray-50 rounded-xl" />
          <div className="flex justify-center gap-4">
            <div className="h-3 w-32 bg-gray-100 rounded-full" />
          </div>
        </div>
      )}

      {/* Error state */}
      {!loading && error && (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
          <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center">
            <span className="text-2xl">⚠️</span>
          </div>
          <div>
            <p className="text-sm text-red-600 font-semibold">Failed to load trend data</p>
            <p className="text-xs text-gray-400 mt-1">{error}</p>
          </div>
          <button
            onClick={() => setRetryKey((k) => k + 1)}
            className="mt-2 text-xs font-medium text-white bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && data.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
          <span className="text-4xl opacity-20">📈</span>
          <p className="text-sm text-gray-300 font-medium">No trend data available</p>
          <p className="text-xs text-gray-300">Data will appear once orders are created over time.</p>
        </div>
      )}

      {/* Line chart */}
      {!loading && !error && data.length > 0 && (
        <>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart
              data={data}
              margin={{ top: 10, right: 20, left: 0, bottom: 30 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fill: '#64748b' }}
                tickLine={false}
                axisLine={false}
                angle={-35}
                textAnchor="end"
                height={60}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fontSize: 11, fill: '#64748b' }}
                tickLine={false}
                axisLine={false}
                width={45}
                label={{ 
                  value: 'Orders', 
                  angle: -90, 
                  position: 'insideLeft',
                  style: { fontSize: 11, fill: '#64748b' }
                }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  padding: '12px',
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                }}
                labelStyle={{ 
                  fontWeight: 600, 
                  color: '#1e293b',
                  marginBottom: '4px',
                  fontSize: '12px',
                }}
                itemStyle={{ 
                  color: '#3b82f6',
                  fontSize: '13px',
                  fontWeight: 600,
                }}
                formatter={(value) => [`${value} orders`, 'Created']}
              />
              <Legend
                wrapperStyle={{ 
                  paddingTop: '20px',
                  fontSize: '12px',
                }}
                iconType="line"
              />
              <Line
                type="monotone"
                dataKey="orders"
                stroke="#3b82f6"
                strokeWidth={3}
                dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, fill: '#2563eb' }}
                name="Orders Created"
              />
            </LineChart>
          </ResponsiveContainer>

          {/* Summary stats */}
          <div className="grid grid-cols-3 gap-4 mt-6 pt-4 border-t border-gray-100">
            <div className="text-center">
              <p className="text-xs text-gray-500 mb-1">Total Orders</p>
              <p className="text-lg font-bold text-gray-900 tabular-nums">
                {data.reduce((sum, item) => sum + (item.orders || 0), 0).toLocaleString()}
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-500 mb-1">Avg per Day</p>
              <p className="text-lg font-bold text-gray-900 tabular-nums">
                {(data.reduce((sum, item) => sum + (item.orders || 0), 0) / data.length).toFixed(1)}
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-500 mb-1">Peak Day</p>
              <p className="text-lg font-bold text-gray-900 tabular-nums">
                {Math.max(...data.map(item => item.orders || 0))}
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function BottleneckDistributionChart() {
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
          // Transform data for pie chart with colors
          const chartData = list.map((item, idx) => ({
            name: item.stage,
            value: item.count,
            color: ['#3b82f6', '#6366f1', '#8b5cf6', '#a855f7'][idx % 4],
          }));
          setData(chartData);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.message || 'Failed to load bottleneck data.');
          setLoading(false);
        }
      });

    return () => { cancelled = true; };
  }, [retryKey]);

  const total = data.reduce((sum, item) => sum + item.value, 0);

  // Custom label renderer with percentage
  const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * Math.PI / 180);
    const y = cy + radius * Math.sin(-midAngle * Math.PI / 180);

    if (percent < 0.05) return null; // Don't show label if less than 5%

    return (
      <text
        x={x}
        y={y}
        fill="white"
        textAnchor={x > cx ? 'start' : 'end'}
        dominantBaseline="central"
        className="font-bold text-xs"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-base font-semibold text-gray-800">Bottleneck Distribution</h2>
          <p className="text-xs text-gray-400 mt-0.5">Stage-wise bottleneck breakdown</p>
        </div>
        {!loading && !error && total > 0 && (
          <span className="text-xs font-medium text-purple-700 bg-purple-50 px-3 py-1.5 rounded-full">
            {total.toLocaleString()} total
          </span>
        )}
      </div>

      {/* Loading skeleton */}
      {loading && (
        <div className="space-y-4 animate-pulse">
          <div className="h-64 bg-gray-50 rounded-xl flex items-center justify-center">
            <div className="w-48 h-48 rounded-full bg-gray-100" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="h-16 bg-gray-50 rounded-xl" />
            <div className="h-16 bg-gray-50 rounded-xl" />
            <div className="h-16 bg-gray-50 rounded-xl" />
            <div className="h-16 bg-gray-50 rounded-xl" />
          </div>
        </div>
      )}

      {/* Error state */}
      {!loading && error && (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
          <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center">
            <span className="text-2xl">⚠️</span>
          </div>
          <div>
            <p className="text-sm text-red-600 font-semibold">Failed to load bottleneck data</p>
            <p className="text-xs text-gray-400 mt-1">{error}</p>
          </div>
          <button
            onClick={() => setRetryKey((k) => k + 1)}
            className="mt-2 text-xs font-medium text-white bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && data.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
          <span className="text-4xl opacity-20">📊</span>
          <p className="text-sm text-gray-300 font-medium">No bottleneck data available</p>
          <p className="text-xs text-gray-300">Data will appear once bottlenecks are detected.</p>
        </div>
      )}

      {/* Doughnut chart */}
      {!loading && !error && data.length > 0 && (
        <>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={renderCustomLabel}
                outerRadius={100}
                innerRadius={65}
                paddingAngle={3}
                dataKey="value"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  padding: '12px',
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                }}
                itemStyle={{ 
                  fontSize: '13px',
                  fontWeight: 600,
                }}
                formatter={(value, name) => [
                  `${value.toLocaleString()} orders (${((value / total) * 100).toFixed(1)}%)`,
                  name
                ]}
              />
            </PieChart>
          </ResponsiveContainer>

          {/* Stage cards */}
          <div className="grid grid-cols-2 gap-3 mt-6 pt-4 border-t border-gray-100">
            {data.map((item, idx) => (
              <div 
                key={item.name}
                className="p-3 rounded-xl border-2 transition-all hover:shadow-md"
                style={{ 
                  backgroundColor: `${item.color}10`,
                  borderColor: `${item.color}40`,
                }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <div 
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-xs font-semibold text-gray-700 uppercase">
                    {item.name}
                  </span>
                </div>
                <div className="flex items-baseline gap-2">
                  <p className="text-2xl font-bold text-gray-900 tabular-nums">
                    {item.value.toLocaleString()}
                  </p>
                  <p className="text-xs font-medium" style={{ color: item.color }}>
                    {total > 0 ? `${((item.value / total) * 100).toFixed(1)}%` : '0%'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
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
// Advanced Chart Components
// ---------------------------------------------------------------------------

// SLA Breach Trend Chart — Shows SLA breaches over time
function SLABreachTrendChart() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Simulate trend data (replace with actual API call)
    const generateTrendData = () => {
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
      return months.map((month) => ({
        month,
        onTime: Math.floor(Math.random() * 80) + 20,
        breached: Math.floor(Math.random() * 30) + 10,
      }));
    };

    setTimeout(() => {
      setData(generateTrendData());
      setLoading(false);
    }, 500);
  }, []);

  return (
    <ChartContainer
      title="SLA Performance Trend"
      subtitle="Monthly on-time vs breached orders"
      loading={loading}
      error={error}
      isEmpty={data.length === 0}
      height="350px"
    >
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="month"
            tick={{ fill: '#6b7280', fontSize: 12 }}
            tickLine={false}
          />
          <YAxis tick={{ fill: '#6b7280', fontSize: 12 }} tickLine={false} />
          <Tooltip
            contentStyle={{
              backgroundColor: '#fff',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            }}
          />
          <Legend
            wrapperStyle={{ paddingTop: '20px' }}
            iconType="circle"
          />
          <Line
            type="monotone"
            dataKey="onTime"
            name="On Time"
            stroke="#10b981"
            strokeWidth={2}
            dot={{ fill: '#10b981', r: 4 }}
            activeDot={{ r: 6 }}
          />
          <Line
            type="monotone"
            dataKey="breached"
            name="Breached"
            stroke="#ef4444"
            strokeWidth={2}
            dot={{ fill: '#ef4444', r: 4 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
}

// Monthly Order Analytics Chart — Bar chart showing order volumes
function MonthlyOrderAnalyticsChart() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Simulate monthly data (replace with actual API call)
    const generateMonthlyData = () => {
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
      return months.map((month) => ({
        month,
        orders: Math.floor(Math.random() * 150) + 50,
        avgTime: (Math.random() * 5 + 10).toFixed(1),
      }));
    };

    setTimeout(() => {
      setData(generateMonthlyData());
      setLoading(false);
    }, 500);
  }, []);

  return (
    <ChartContainer
      title="Monthly Order Volume"
      subtitle="Total orders processed per month"
      loading={loading}
      error={error}
      isEmpty={data.length === 0}
      height="350px"
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="month"
            tick={{ fill: '#6b7280', fontSize: 12 }}
            tickLine={false}
          />
          <YAxis tick={{ fill: '#6b7280', fontSize: 12 }} tickLine={false} />
          <Tooltip
            contentStyle={{
              backgroundColor: '#fff',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            }}
            formatter={(value, name) => [
              name === 'avgTime' ? `${value} days` : value,
              name === 'orders' ? 'Orders' : 'Avg Time',
            ]}
          />
          <Legend
            wrapperStyle={{ paddingTop: '20px' }}
            iconType="rect"
          />
          <Bar
            dataKey="orders"
            name="Orders"
            fill="#3b82f6"
            radius={[8, 8, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
}

// Order Lifecycle Trend Chart — Area chart showing order progression stages
function OrderLifecycleTrendChart() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Simulate lifecycle data (replace with actual API call)
    const generateLifecycleData = () => {
      const weeks = ['Week 1', 'Week 2', 'Week 3', 'Week 4'];
      return weeks.map((week) => ({
        week,
        procurement: Math.floor(Math.random() * 40) + 60,
        processing: Math.floor(Math.random() * 35) + 45,
        dispatch: Math.floor(Math.random() * 30) + 30,
        delivery: Math.floor(Math.random() * 25) + 15,
      }));
    };

    setTimeout(() => {
      setData(generateLifecycleData());
      setLoading(false);
    }, 500);
  }, []);

  const AreaChart = ({ children, ...props }) => {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <LineChart {...props}>
          {children}
        </LineChart>
      </ResponsiveContainer>
    );
  };

  return (
    <ChartContainer
      title="Order Lifecycle Progression"
      subtitle="Orders by stage over time"
      loading={loading}
      error={error}
      isEmpty={data.length === 0}
      height="350px"
    >
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="week"
            tick={{ fill: '#6b7280', fontSize: 12 }}
            tickLine={false}
          />
          <YAxis tick={{ fill: '#6b7280', fontSize: 12 }} tickLine={false} />
          <Tooltip
            contentStyle={{
              backgroundColor: '#fff',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            }}
          />
          <Legend
            wrapperStyle={{ paddingTop: '20px' }}
            iconType="circle"
          />
          <Line
            type="monotone"
            dataKey="procurement"
            name="Procurement"
            stroke="#8b5cf6"
            strokeWidth={2}
            fill="#8b5cf6"
            fillOpacity={0.1}
          />
          <Line
            type="monotone"
            dataKey="processing"
            name="Processing"
            stroke="#3b82f6"
            strokeWidth={2}
            fill="#3b82f6"
            fillOpacity={0.1}
          />
          <Line
            type="monotone"
            dataKey="dispatch"
            name="Dispatch"
            stroke="#f59e0b"
            strokeWidth={2}
            fill="#f59e0b"
            fillOpacity={0.1}
          />
          <Line
            type="monotone"
            dataKey="delivery"
            name="Delivery"
            stroke="#10b981"
            strokeWidth={2}
            fill="#10b981"
            fillOpacity={0.1}
          />
        </LineChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
}

// Analytics Insights Panel — Key metrics and insights
function AnalyticsInsightsPanel() {
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate insights data (replace with actual API call)
    setTimeout(() => {
      setInsights({
        mostDelayedStage: 'Procurement',
        highestBreachPct: 18.5,
        fastestStage: 'Dispatch',
        avgDeliveryTime: 12.3,
        activeOrders: 1247,
      });
      setLoading(false);
    }, 500);
  }, []);

  const insightCards = [
    {
      title: 'Most Delayed Stage',
      value: insights?.mostDelayedStage || '—',
      icon: '⏱️',
      accentColor: 'red',
      subtitle: 'Requires attention',
    },
    {
      title: 'SLA Breach Rate',
      value: insights?.highestBreachPct ? `${insights.highestBreachPct}%` : '—',
      icon: '⚠️',
      accentColor: 'yellow',
      subtitle: 'Last 30 days',
    },
    {
      title: 'Fastest Stage',
      value: insights?.fastestStage || '—',
      icon: '⚡',
      accentColor: 'green',
      subtitle: 'Most efficient',
    },
    {
      title: 'Avg Delivery Time',
      value: insights?.avgDeliveryTime ? `${insights.avgDeliveryTime}d` : '—',
      icon: '🚚',
      accentColor: 'blue',
      subtitle: 'End-to-end',
    },
    {
      title: 'Active Orders',
      value: insights?.activeOrders ? insights.activeOrders.toLocaleString() : '—',
      icon: '📦',
      accentColor: 'purple',
      subtitle: 'In progress',
    },
  ];

  return (
    <div className="mb-6">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 tracking-tight">
        📊 Key Insights
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {insightCards.map((card) => (
          <AnalyticsCard
            key={card.title}
            {...card}
            loading={loading}
          />
        ))}
      </div>
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
  
  // Filters with localStorage persistence
  const [filters, setFilters] = useState(() => {
    try {
      const saved = localStorage.getItem('dashboardFilters');
      return saved ? JSON.parse(saved) : {
        dateRange: 'all',
        bottleneckStage: 'all',
        slaStatus: 'all',
        orderStatus: 'all',
        processingDuration: 'all',
        deliveryDuration: 'all',
      };
    } catch {
      return {
        dateRange: 'all',
        bottleneckStage: 'all',
        slaStatus: 'all',
        orderStatus: 'all',
        processingDuration: 'all',
        deliveryDuration: 'all',
      };
    }
  });

  // Persist filters to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('dashboardFilters', JSON.stringify(filters));
    } catch (err) {
      console.error('Failed to save filters:', err);
    }
  }, [filters]);

  // Dashboard customization state with localStorage persistence
  const [widgetVisibility, setWidgetVisibility] = useState(() => {
    try {
      const saved = localStorage.getItem('dashboardWidgets');
      return saved ? JSON.parse(saved) : {
        kpiCards: true,
        insights: true,
        trendCharts: true,
        monthlyCharts: true,
        slaCharts: true,
        bottleneckCharts: true,
        breachTable: true,
        activityPanel: true,
      };
    } catch {
      return {
        kpiCards: true,
        insights: true,
        trendCharts: true,
        monthlyCharts: true,
        slaCharts: true,
        bottleneckCharts: true,
        breachTable: true,
        activityPanel: true,
      };
    }
  });

  const [notification, setNotification] = useState(null);
  const [presentationMode, setPresentationMode] = useState(false);
  const [fullscreenChart, setFullscreenChart] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [drillDownModal, setDrillDownModal] = useState({ isOpen: false, title: '', content: null });
  const [selectedKPI, setSelectedKPI] = useState(null);
  const [exportProgress, setExportProgress] = useState({
    isOpen: false,
    type: 'CSV',
    progress: 0,
    status: 'preparing' // preparing, exporting, complete, error
  });

  const handleRetry = useCallback(() => setRetryKey((k) => k + 1), []);

  // Open drill-down modal
  const openDrillDown = useCallback((title, content) => {
    setDrillDownModal({ isOpen: true, title, content });
  }, []);

  const closeDrillDown = useCallback(() => {
    setDrillDownModal({ isOpen: false, title: '', content: null });
  }, []);

  // Handle KPI click for drill-down
  const handleKPIClick = useCallback((kpiType, data) => {
    setSelectedKPI({ type: kpiType, data });
    
    let content = null;
    let title = '';

    switch (kpiType) {
      case 'totalOrders':
        title = 'Total Orders Breakdown';
        content = (
          <div className="space-y-4">
            <p className="text-gray-600 dark:text-gray-400">
              Complete breakdown of all orders in the system
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                <p className="text-sm text-gray-600 dark:text-gray-400">Completed</p>
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {data?.completed || 0}
                </p>
              </div>
              <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                <p className="text-sm text-gray-600 dark:text-gray-400">In Progress</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {data?.inProgress || 0}
                </p>
              </div>
            </div>
          </div>
        );
        break;
      case 'slaBreaches':
        title = 'SLA Breach Analysis';
        content = (
          <div className="space-y-4">
            <p className="text-gray-600 dark:text-gray-400">
              Detailed analysis of SLA breaches and their impact
            </p>
            <div className="bg-red-50 dark:bg-red-900/20 p-6 rounded-lg">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Breach Rate</p>
              <p className="text-3xl font-bold text-red-600 dark:text-red-400">
                {data?.breachRate || 0}%
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                {data?.totalBreaches || 0} out of {data?.total || 0} orders
              </p>
            </div>
          </div>
        );
        break;
      case 'avgCycleTime':
        title = 'Cycle Time Details';
        content = (
          <div className="space-y-4">
            <p className="text-gray-600 dark:text-gray-400">
              Average time for order completion across all stages
            </p>
            <div className="bg-purple-50 dark:bg-purple-900/20 p-6 rounded-lg">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Average Cycle Time</p>
              <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">
                {data?.avgTime || 0} days
              </p>
            </div>
          </div>
        );
        break;
      default:
        title = 'Details';
        content = <p className="text-gray-600 dark:text-gray-400">No detailed data available</p>;
    }

    openDrillDown(title, content);
  }, [openDrillDown]);

  // Toggle presentation mode
  const togglePresentationMode = useCallback(() => {
    setPresentationMode(prev => !prev);
  }, []);

  // Handle fullscreen chart view
  const openFullscreenChart = useCallback((chartTitle, chartComponent) => {
    setFullscreenChart({ title: chartTitle, component: chartComponent });
  }, []);

  const closeFullscreenChart = useCallback(() => {
    setFullscreenChart(null);
  }, []);

  // Save widget visibility to localStorage with error handling
  useEffect(() => {
    try {
      localStorage.setItem('dashboardWidgets', JSON.stringify(widgetVisibility));
    } catch (err) {
      console.error('Failed to save widget visibility:', err);
    }
  }, [widgetVisibility]);

  const toggleWidget = useCallback((widgetId, visible) => {
    setWidgetVisibility(prev => ({ ...prev, [widgetId]: visible }));
  }, []);

  // Fetch summary analytics with cleanup
  useEffect(() => {
    let cancelled = false;
    const initialLoad = !summary; // Track if it's initial load or refresh
    
    if (initialLoad) {
      setLoading(true);
    } else {
      setIsRefreshing(true);
    }
    setError(null);

    getSummaryAnalytics()
      .then((data) => {
        if (!cancelled) {
          setSummary(data);
          setLastUpdated(new Date());
          if (initialLoad) {
            setLoading(false);
          } else {
            setIsRefreshing(false);
          }
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.message || 'An unexpected error occurred.');
          if (initialLoad) {
            setLoading(false);
          } else {
            setIsRefreshing(false);
          }
        }
      });

    return () => {
      cancelled = true;
    };
  }, [retryKey, summary]);

  // Auto-refresh effect
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      setRetryKey((k) => k + 1);
    }, AUTO_REFRESH_INTERVAL);

    return () => clearInterval(interval);
  }, [autoRefresh]);

  // Handle manual refresh
  const handleRefresh = useCallback(() => {
    setRetryKey((k) => k + 1);
  }, []);

  // Toggle auto-refresh
  const handleToggleAutoRefresh = useCallback((enabled) => {
    setAutoRefresh(enabled);
    if (enabled) {
      setNotification({
        type: 'success',
        message: 'Auto-refresh enabled (every 5 minutes)',
      });
    } else {
      setNotification({
        type: 'info',
        message: 'Auto-refresh disabled',
      });
    }
    setTimeout(() => setNotification(null), 3000);
  }, []);

  // Memoized SLA calculations
  const slaMetrics = useMemo(() => {
    const slaTotal = (summary?.slaOnTime ?? 0) + (summary?.slaBreaches ?? 0);
    const slaBreachPct = slaTotal > 0 
      ? ((summary?.slaBreaches ?? 0) / slaTotal * 100).toFixed(1)
      : '0.0';
    return { slaTotal, slaBreachPct };
  }, [summary]);

  // Memoized summary cards configuration
  const cards = useMemo(() => [
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
      value: summary ? `${slaMetrics.slaBreachPct}%` : null,
      subtitle: `${summary?.slaBreaches ?? 0} of ${slaMetrics.slaTotal} orders`,
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
  ], [summary, slaMetrics]);

  // Memoized last updated date
  const lastUpdated = useMemo(() => {
    return new Date().toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  }, []);

  // Filter handlers with useCallback for optimization
  const handleFilterChange = useCallback((filterKey, value) => {
    setFilters(prev => ({ ...prev, [filterKey]: value }));
  }, []);

  const handleFilterApply = useCallback((appliedFilters) => {
    setFilters(appliedFilters);
    setNotification({
      type: 'success',
      message: 'Filters applied successfully',
    });
    setTimeout(() => setNotification(null), 3000);
  }, []);

  const handleResetFilters = useCallback(() => {
    const resetFilters = {
      dateRange: 'all',
      bottleneckStage: 'all',
      slaStatus: 'all',
      orderStatus: 'all',
      processingDuration: 'all',
      deliveryDuration: 'all',
    };
    setFilters(resetFilters);
    setNotification({
      type: 'info',
      message: 'All filters reset',
    });
    setTimeout(() => setNotification(null), 3000);
  }, []);

  // Export handlers
  const handleExportCSV = useCallback(async () => {
    try {
      // Show export progress modal
      setExportProgress({ isOpen: true, type: 'CSV', progress: 0, status: 'preparing' });
      
      // Simulate progress
      setTimeout(() => setExportProgress(prev => ({ ...prev, progress: 30, status: 'exporting' })), 500);
      setTimeout(() => setExportProgress(prev => ({ ...prev, progress: 60 })), 1000);
      setTimeout(() => setExportProgress(prev => ({ ...prev, progress: 90 })), 1500);
      
      await exportAnalyticsCSV();
      
      setExportProgress({ isOpen: true, type: 'CSV', progress: 100, status: 'complete' });
      setTimeout(() => setExportProgress(prev => ({ ...prev, isOpen: false })), 2000);
      
      setNotification({
        type: 'success',
        message: 'Dashboard data exported to CSV successfully',
      });
    } catch (err) {
      setExportProgress({ isOpen: true, type: 'CSV', progress: 0, status: 'error' });
      setTimeout(() => setExportProgress(prev => ({ ...prev, isOpen: false })), 3000);
      
      setNotification({
        type: 'error',
        message: 'Failed to export CSV: ' + err.message,
      });
    }
    setTimeout(() => setNotification(null), 5000);
  }, []);

  const handleExportPDF = useCallback(async () => {
    // Show export progress modal
    setExportProgress({ isOpen: true, type: 'PDF', progress: 0, status: 'preparing' });
    
    // Simulate progress
    setTimeout(() => setExportProgress(prev => ({ ...prev, progress: 40, status: 'exporting' })), 500);
    setTimeout(() => setExportProgress(prev => ({ ...prev, progress: 80 })), 1000);
    setTimeout(() => setExportProgress(prev => ({ ...prev, progress: 100, status: 'complete' })), 1500);
    setTimeout(() => setExportProgress(prev => ({ ...prev, isOpen: false })), 3500);
    
    setNotification({
      type: 'info',
      message: 'PDF export feature coming soon',
    });
    setTimeout(() => setNotification(null), 3000);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Data Refresh Indicator */}
      <DataRefreshIndicator isVisible={isRefreshing} />

      {/* Export Progress Modal */}
      <ExportProgressModal
        isOpen={exportProgress.isOpen}
        onClose={() => setExportProgress(prev => ({ ...prev, isOpen: false }))}
        exportType={exportProgress.type}
        progress={exportProgress.progress}
        status={exportProgress.status}
      />

      {/* Drill-Down Modal */}
      <DrillDownModal
        isOpen={drillDownModal.isOpen}
        onClose={closeDrillDown}
        title={drillDownModal.title}
      >
        {drillDownModal.content}
      </DrillDownModal>

      {/* Fullscreen Chart Modal */}
      {fullscreenChart && (
        <FullscreenChartModal
          isOpen={!!fullscreenChart}
          onClose={closeFullscreenChart}
          title={fullscreenChart.title}
        >
          {fullscreenChart.component}
        </FullscreenChartModal>
      )}

      {/* Notifications */}
      {notification && (
        <Notification
          type={notification.type}
          message={notification.message}
          onClose={() => setNotification(null)}
        />
      )}

      <div className={`${presentationMode ? 'max-w-full px-8' : 'max-w-7xl'} mx-auto px-4 sm:px-6 lg:px-8 py-8 transition-all duration-300`}>

        {/* ── Presentation Header or Standard Header ── */}
        {presentationMode ? (
          <PresentationHeader
            title="Supply Chain Analytics"
            subtitle="Executive Intelligence Dashboard"
            stats={summary ? [
              { icon: '📦', value: summary.totalOrders?.toLocaleString() || '0', label: 'Total Orders' },
              { icon: '⚡', value: summary.avgTotalTime ? `${Number(summary.avgTotalTime).toFixed(1)}d` : 'N/A', label: 'Avg Cycle' },
              { icon: '✅', value: summary.slaOnTime?.toLocaleString() || '0', label: 'On-Time' },
            ] : []}
            actions={
              <>
                <button
                  onClick={togglePresentationMode}
                  className="px-4 py-2 bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white text-sm font-medium rounded-lg transition-all"
                  aria-label="Exit presentation mode"
                >
                  Exit Presentation
                </button>
                <ReportExportButton type="csv" onExport={handleExportCSV} label="Export" />
              </>
            }
          />
        ) : (
          <>
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 mb-6">
              <DashboardHeader />
              <button
                onClick={togglePresentationMode}
                className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white text-sm font-semibold rounded-lg shadow-md hover:shadow-lg transition-all hover:scale-105"
                aria-label="Enter presentation mode"
              >
                📊 Presentation Mode
              </button>
            </div>

            {/* ── Analytics Toolbar ── */}
            <AnalyticsToolbar
              onRefresh={handleRefresh}
              isRefreshing={isRefreshing}
              lastUpdated={lastUpdated}
              autoRefresh={autoRefresh}
              onToggleAutoRefresh={handleToggleAutoRefresh}
              className="mb-6"
            />

            {/* ── Executive Landing Section ── */}
            <ExecutiveLandingSection summary={summary} loading={loading} />

            {/* ── Business Insights Panel ── */}
            <BusinessInsightsPanel summary={summary} loading={loading} />
          </>
        )}

        {/* ── Export Banner (only in standard mode) ── */}
        {!presentationMode && (
          <div className="mb-6 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl shadow-lg p-6 text-white">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold mb-2">Quick Actions</h2>
                <p className="text-blue-100 text-sm">
                  Export data and reports • Last updated: {lastUpdated}
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <ReportExportButton
                  type="csv"
                  onExport={handleExportCSV}
                  label="Export CSV"
                />
                <ReportExportButton
                  type="pdf"
                  onExport={handleExportPDF}
                  label="Export PDF"
                />
              </div>
            </div>
          </div>
        )}

        {/* ── Global Filter Panel ── */}
        <GlobalFilterPanel
          filters={filters}
          onFilterChange={handleFilterChange}
          onReset={handleResetFilters}
          onApply={handleFilterApply}
        />

        {/* ── Error Banner ── */}
        {error && !loading && (
          <ErrorBanner message={error} onRetry={handleRetry} />
        )}

        {/* ── KPI Cards ── */}
        {widgetVisibility.kpiCards && (
          <DashboardWidget
            id="kpiCards"
            onToggle={toggleWidget}
            visible={widgetVisibility.kpiCards}
          >
            <DashboardStatsGrid loading={loading}>
              <InteractiveKPICard
                title="Total Orders"
                value={summary?.totalOrders?.toLocaleString() || '—'}
                subtitle="All-time processed"
                icon="📦"
                trend="up"
                trendValue="12%"
                accentColor="blue"
                loading={loading}
                onClick={() => handleKPIClick('totalOrders', { 
                  completed: Math.floor((summary?.totalOrders || 0) * 0.85),
                  inProgress: Math.floor((summary?.totalOrders || 0) * 0.15)
                })}
              />
              <InteractiveKPICard
                title="SLA Breaches"
                value={summary?.slaBreaches?.toLocaleString() || '—'}
                subtitle={`${slaMetrics.slaBreachPct}% breach rate`}
                icon="⚠️"
                trend="down"
                trendValue="5%"
                accentColor="red"
                loading={loading}
                onClick={() => handleKPIClick('slaBreaches', {
                  breachRate: slaMetrics.slaBreachPct,
                  totalBreaches: summary?.slaBreaches || 0,
                  total: slaMetrics.slaTotal
                })}
              />
              <InteractiveKPICard
                title="Avg Cycle Time"
                value={summary?.avgTotalTime ? `${Number(summary.avgTotalTime).toFixed(1)}d` : '—'}
                subtitle="End-to-end delivery"
                icon="⚡"
                trend="neutral"
                accentColor="purple"
                loading={loading}
                onClick={() => handleKPIClick('avgCycleTime', {
                  avgTime: Number(summary?.avgTotalTime).toFixed(1)
                })}
              />
              <InteractiveKPICard
                title="On-Time Orders"
                value={summary?.slaOnTime?.toLocaleString() || '—'}
                subtitle={`${(100 - slaMetrics.slaBreachPct).toFixed(1)}% success`}
                icon="✅"
                trend="up"
                trendValue="8%"
                accentColor="green"
                loading={loading}
              />
              <InteractiveKPICard
                title="Bottleneck Orders"
                value={summary?.bottleneckCount?.toLocaleString() || '—'}
                subtitle={`Stage: ${summary?.mostCommonBottleneck || 'N/A'}`}
                icon="🔍"
                trend="neutral"
                accentColor="amber"
                loading={loading}
              />
            </DashboardStatsGrid>
          </DashboardWidget>
        )}

        {/* ── Main Content ── */}
        {loading ? (
          <div className="space-y-6">
            <SkeletonLoader type="card" count={5} />
            <SkeletonLoader type="chart" count={1} />
            <SkeletonLoader type="chart" count={1} />
          </div>
        ) : !error ? (
          <div className="space-y-6">

            {/* Analytics Insights Panel */}
            {widgetVisibility.insights && (
              <DashboardWidget
                id="insights"
                onToggle={toggleWidget}
                visible={widgetVisibility.insights}
              >
                <AnalyticsInsightsPanel />
              </DashboardWidget>
            )}

            {/* First Row - Trend Charts and Activity Panel */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {widgetVisibility.trendCharts && (
                <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
                  <DashboardWidget
                    id="trendCharts"
                    onToggle={toggleWidget}
                    visible={widgetVisibility.trendCharts}
                  >
                    <OrderTrendChart />
                  </DashboardWidget>
                  <DashboardWidget
                    id="slaBreachTrendChart"
                    onToggle={toggleWidget}
                    visible={widgetVisibility.trendCharts}
                  >
                    <SLABreachTrendChart />
                  </DashboardWidget>
                </div>
              )}
              {widgetVisibility.activityPanel && (
                <div className="lg:col-span-1">
                  <DashboardWidget
                    id="activityPanel"
                    onToggle={toggleWidget}
                    visible={widgetVisibility.activityPanel}
                  >
                    <ActivityPanel />
                  </DashboardWidget>
                </div>
              )}
            </div>

            {/* Second Row - Monthly Analytics and Lifecycle */}
            {widgetVisibility.monthlyCharts && (
              <DashboardWidget
                id="monthlyCharts"
                onToggle={toggleWidget}
                visible={widgetVisibility.monthlyCharts}
              >
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <MonthlyOrderAnalyticsChart />
                  <OrderLifecycleTrendChart />
                </div>
              </DashboardWidget>
            )}

            {/* Third Row - SLA Overview and Stage Delays */}
            {widgetVisibility.slaCharts && (
              <DashboardWidget
                id="slaCharts"
                onToggle={toggleWidget}
                visible={widgetVisibility.slaCharts}
              >
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-1">
                    <SLABreachPieChart />
                  </div>
                  <div className="lg:col-span-2">
                    <StageDelayChart />
                  </div>
                </div>
              </DashboardWidget>
            )}

            {/* Fourth Row - Bottleneck Analysis */}
            {widgetVisibility.bottleneckCharts && (
              <DashboardWidget
                id="bottleneckCharts"
                onToggle={toggleWidget}
                visible={widgetVisibility.bottleneckCharts}
              >
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <BottleneckChart />
                  <BottleneckDistributionChart />
                </div>
              </DashboardWidget>
            )}

            {/* Bottom Row - SLA Breach Table */}
            {widgetVisibility.breachTable && (
              <DashboardWidget
                id="breachTable"
                onToggle={toggleWidget}
                visible={widgetVisibility.breachTable}
              >
                <SLABreachTable />
              </DashboardWidget>
            )}

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
  { key: 'order_id',         label: 'Order ID',         width: 'w-32',  sortable: false },
  { key: 'procurement_time', label: 'Procurement',      width: 'w-28',  sortable: true },
  { key: 'processing_time',  label: 'Processing',       width: 'w-28',  sortable: true },
  { key: 'total_time',       label: 'Total Time',       width: 'w-28',  sortable: true },
  { key: 'sla_breach',       label: 'SLA Status',       width: 'w-32',  sortable: false },
  { key: 'bottleneck_stage', label: 'Bottleneck Stage', width: 'w-40',  sortable: false },
];

const ROWS_PER_PAGE_OPTIONS = [10, 20, 50, 100];

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

// ---------------------------------------------------------------------------
// Tableau Dashboard Page
// ---------------------------------------------------------------------------

export function TableauDashboard() {
  const [fullscreen, setFullscreen] = useState(false);
  const [dashboardLoading, setDashboardLoading] = useState(false);
  const { theme } = useTheme();

  // Sample analytics insights
  const insights = [
    {
      icon: '🎯',
      title: 'Performance Optimization',
      description: 'Current SLA breach rate is 18%, down 5% from last month. Focus on procurement stage for further improvement.',
    },
    {
      icon: '⚡',
      title: 'Processing Efficiency',
      description: 'Average cycle time reduced to 6.2 days. Manufacturing stage shows consistent performance improvement.',
    },
    {
      icon: '🔍',
      title: 'Bottleneck Analysis',
      description: 'Procurement remains the primary bottleneck affecting 42% of orders. Consider increasing supplier capacity.',
    },
    {
      icon: '📈',
      title: 'Volume Trends',
      description: 'Order volume increased 15% this quarter. Capacity planning recommended for Q3.',
    },
  ];

  const summaryMetrics = [
    { icon: '📦', label: 'Total Orders', value: '1,247', description: 'Last 30 days' },
    { icon: '⚡', label: 'Avg Cycle Time', value: '6.2d', description: 'End-to-end' },
    { icon: '✅', label: 'On-Time Rate', value: '82%', description: 'SLA compliance' },
    { icon: '🔥', label: 'Active Orders', value: '328', description: 'In progress' },
    { icon: '📊', label: 'Bottlenecks', value: '156', description: 'Require attention' },
    { icon: '🎯', label: 'Efficiency', value: '89%', description: 'Overall score' },
  ];

  const kpiExplanations = [
    {
      title: 'SLA Breach Analysis',
      description: 'Orders exceeding defined service level agreements based on stage-specific time thresholds.',
      value: '18%',
      icon: '⚠️',
      color: 'red',
      trend: { type: 'down', value: '5%' },
    },
    {
      title: 'Cycle Time Performance',
      description: 'Average time from order creation to delivery completion across all stages.',
      value: '6.2 days',
      icon: '⏱️',
      color: 'blue',
      trend: { type: 'down', value: '0.8d' },
    },
    {
      title: 'Bottleneck Impact',
      description: 'Orders experiencing delays at critical stages requiring intervention.',
      value: '42%',
      icon: '🔍',
      color: 'amber',
      trend: { type: 'neutral', value: '2%' },
    },
    {
      title: 'Order Throughput',
      description: 'Daily order processing capacity and completion rate.',
      value: '41.5/day',
      icon: '📦',
      color: 'green',
      trend: { type: 'up', value: '12%' },
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Page Header */}
        <DashboardSectionHeader
          title="Tableau Analytics Insights"
          subtitle="Interactive dashboards powered by Tableau for comprehensive supply chain analysis"
          icon="📊"
          actions={
            <button
              onClick={() => setFullscreen(true)}
              className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white text-sm font-semibold rounded-lg shadow-md hover:shadow-lg transition-all flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
              </svg>
              Fullscreen
            </button>
          }
        />

        {/* Analytics Summary Panel */}
        <AnalyticsSummaryPanel
          title="Analytics Overview"
          metrics={summaryMetrics}
          insights={insights}
        />

        {/* KPI Explanation Cards */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
            <span>📈</span>
            <span>Key Performance Indicators</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {kpiExplanations.map((kpi, index) => (
              <AnalyticsInsightCard
                key={index}
                title={kpi.title}
                description={kpi.description}
                value={kpi.value}
                icon={kpi.icon}
                color={kpi.color}
                trend={kpi.trend}
              />
            ))}
          </div>
        </div>

        {/* Workflow Efficiency Summary */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <DashboardInfoCard
            title="Workflow Efficiency"
            color="blue"
            description="Real-time workflow performance metrics"
            stats={[
              { label: 'Processing Rate', value: '94%' },
              { label: 'Queue Time', value: '1.2h' },
              { label: 'Stage Success', value: '89%' },
              { label: 'Utilization', value: '76%' },
            ]}
          />
          <DashboardInfoCard
            title="Bottleneck Intelligence"
            color="purple"
            description="Critical bottleneck analysis and impact"
            stats={[
              { label: 'Critical Stages', value: '3' },
              { label: 'Affected Orders', value: '156' },
              { label: 'Avg Delay', value: '2.3d' },
              { label: 'Resolution', value: '68%' },
            ]}
          />
        </div>

        {/* Tableau Dashboard Container */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
            <span>📉</span>
            <span>Interactive Tableau Dashboard</span>
          </h2>
          <TableauContainer
            title="Supply Chain Analytics Dashboard"
            viewUrl={TABLEAU_CONFIG.viewUrl}
            height="900px"
            loading={dashboardLoading}
            onLoad={() => setDashboardLoading(false)}
            onError={(err) => console.error('Tableau load error:', err)}
          />
        </div>

        {/* Additional Insights */}
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl p-8 text-white shadow-xl">
          <h3 className="text-2xl font-bold mb-4 flex items-center gap-2">
            <span>💡</span>
            <span>Executive Insights</span>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
              <h4 className="font-semibold mb-2">Strategic Recommendation</h4>
              <p className="text-white/90 text-sm">
                Increase procurement capacity by 20% to reduce bottleneck impact and improve overall cycle time by estimated 15%.
              </p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
              <h4 className="font-semibold mb-2">Operational Focus</h4>
              <p className="text-white/90 text-sm">
                Prioritize manufacturing and quality control stages which show consistent performance and can handle increased volume.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Fullscreen Modal */}
      <FullscreenDashboardModal
        isOpen={fullscreen}
        onClose={() => setFullscreen(false)}
        title="Tableau Analytics Dashboard - Fullscreen"
      >
        <TableauContainer
          title="Supply Chain Analytics Dashboard"
          viewUrl={TABLEAU_CONFIG.viewUrl}
          height="calc(100vh - 140px)"
        />
      </FullscreenDashboardModal>
    </div>
  );
}

export function Orders() {
  const navigate = useNavigate();
  const [orders, setOrders]         = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState(null);
  const [retryKey, setRetryKey]     = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter]         = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [sortBy, setSortBy]         = useState(null);
  const [sortOrder, setSortOrder]   = useState('asc'); // 'asc' or 'desc'

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

  // Handle column sort
  const handleSort = (columnKey) => {
    if (sortBy === columnKey) {
      // Toggle sort order
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      // New column - default to ascending
      setSortBy(columnKey);
      setSortOrder('asc');
    }
  };

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

  // Apply sorting
  const sortedOrders = [...filteredOrders];
  if (sortBy) {
    sortedOrders.sort((a, b) => {
      const aVal = Number(a[sortBy]) || 0;
      const bVal = Number(b[sortBy]) || 0;
      return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
    });
  }

  // Pagination logic
  const totalPages = Math.ceil(sortedOrders.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const paginatedOrders = sortedOrders.slice(startIndex, endIndex);

  // Reset to page 1 when filters, sorting, or rows per page change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filter, sortBy, sortOrder, rowsPerPage]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">Orders</h1>
          <p className="mt-1 text-sm text-gray-400 dark:text-gray-500">
            Professional analytics table with search, filter, and pagination
          </p>
        </div>

        {/* Error */}
        {!loading && error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-6">
            <div className="flex items-start gap-3 flex-1">
              <span className="text-red-500 dark:text-red-400 text-lg mt-0.5">⚠</span>
              <div>
                <p className="text-red-700 dark:text-red-300 font-semibold text-sm">Failed to load orders</p>
                <p className="text-red-500 dark:text-red-400 text-xs mt-0.5">{error}</p>
              </div>
            </div>
            <button
              onClick={() => setRetryKey((k) => k + 1)}
              className="shrink-0 bg-red-600 hover:bg-red-700 active:bg-red-800 dark:bg-red-700 dark:hover:bg-red-600 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            >
              Retry
            </button>
          </div>
        )}

        {/* Table card */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">

          {/* Controls bar */}
          {!loading && !error && orders.length > 0 && (
            <div className="p-6 border-b border-gray-100 dark:border-gray-700 space-y-4">
              
              {/* Top Row - Search and Filter */}
              <div className="flex flex-col lg:flex-row gap-4 lg:items-center lg:justify-between">
                {/* Search */}
                <div className="relative flex-1 max-w-md">
                  <svg 
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" 
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
                    className="w-full pl-10 pr-10 py-2.5 text-sm border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 dark:text-white transition-all"
                  />
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>

                {/* Filter */}
                <div className="flex items-center gap-3">
                  <select
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    className="px-4 py-2.5 text-sm border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 dark:text-white cursor-pointer transition-all"
                  >
                    <option value="all">All Orders</option>
                    <option value="breached">SLA Breached</option>
                    <option value="non-breached">Non-Breached</option>
                  </select>

                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900 px-3 py-2 rounded-lg whitespace-nowrap">
                    {sortedOrders.length.toLocaleString()} {sortedOrders.length === 1 ? 'order' : 'orders'}
                  </span>
                </div>
              </div>

              {/* Bottom Row - Rows per page and active filters */}
              <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
                {/* Rows per page */}
                <div className="flex items-center gap-2">
                  <label htmlFor="rowsPerPage" className="text-xs font-medium text-gray-500 dark:text-gray-400">
                    Rows per page:
                  </label>
                  <select
                    id="rowsPerPage"
                    value={rowsPerPage}
                    onChange={(e) => setRowsPerPage(Number(e.target.value))}
                    className="px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 dark:text-white cursor-pointer transition-all"
                  >
                    {ROWS_PER_PAGE_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Active sorting indicator */}
                {sortBy && (
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-gray-500 dark:text-gray-400">Sorted by:</span>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-medium bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-100 dark:border-blue-800">
                      {ORDER_COLUMNS.find(col => col.key === sortBy)?.label}
                      <span className="text-blue-400 dark:text-blue-500">
                        {sortOrder === 'asc' ? '↑' : '↓'}
                      </span>
                    </span>
                    <button
                      onClick={() => setSortBy(null)}
                      className="text-gray-400 hover:text-gray-600 transition-colors"
                      title="Clear sorting"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>

            </div>
          )}

          <div className="p-6">
            {loading && <OrdersTableSkeleton />}

            {/* Empty state */}
            {!loading && !error && orders.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
                <span className="text-5xl opacity-20">📋</span>
                <p className="text-gray-400 dark:text-gray-500 font-medium text-sm">No orders found</p>
                <p className="text-gray-300 dark:text-gray-600 text-xs">
                  Orders will appear here once data is available.
                </p>
              </div>
            )}

            {/* No results from filter/search */}
            {!loading && !error && orders.length > 0 && sortedOrders.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
                <span className="text-5xl opacity-20">🔍</span>
                <p className="text-gray-700 dark:text-gray-300 font-semibold text-sm">No matching orders</p>
                <p className="text-gray-400 dark:text-gray-500 text-xs max-w-xs">
                  Try adjusting your search or filter criteria to find what you're looking for.
                </p>
                <button
                  onClick={() => { setSearchTerm(''); setFilter('all'); setSortBy(null); }}
                  className="mt-3 px-4 py-2 text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-white bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-600 dark:hover:bg-blue-600 border border-blue-200 dark:border-blue-800 rounded-lg transition-colors"
                >
                  Clear all filters
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
                        <thead className="bg-gray-50 dark:bg-gray-900 border-b-2 border-gray-200 dark:border-gray-700">
                          <tr>
                            {ORDER_COLUMNS.map(({ key, label, sortable }) => (
                              <th
                                key={key}
                                className={`px-4 py-3.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap first:pl-6 last:pr-6 ${
                                  sortable ? 'cursor-pointer select-none hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors' : ''
                                }`}
                                onClick={() => sortable && handleSort(key)}
                              >
                                <div className="flex items-center gap-1.5">
                                  <span>{label}</span>
                                  {sortable && (
                                    <span className="inline-flex flex-col text-[10px] leading-none">
                                      {sortBy === key ? (
                                        <span className="text-blue-600 dark:text-blue-400 font-bold">
                                          {sortOrder === 'asc' ? '↑' : '↓'}
                                        </span>
                                      ) : (
                                        <span className="text-gray-300 dark:text-gray-600">↕</span>
                                      )}
                                    </span>
                                  )}
                                </div>
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-100 dark:divide-gray-700">
                          {paginatedOrders.map((order, idx) => (
                            <tr
                              key={order.order_id ?? idx}
                              onClick={() => order.order_id && navigate(`/orders/${order.order_id}`)}
                              className="hover:bg-blue-50/30 dark:hover:bg-blue-900/20 transition-all duration-200 cursor-pointer group"
                            >
                              {/* Order ID */}
                              <td className="px-4 py-4 font-semibold text-gray-900 dark:text-white tabular-nums first:pl-6 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                {order.order_id ?? '—'}
                              </td>

                              {/* Procurement Time */}
                              <td className="px-4 py-4 text-gray-600 dark:text-gray-400 tabular-nums">
                                {order.procurement_time != null
                                  ? `${Number(order.procurement_time).toFixed(1)}d`
                                  : '—'}
                              </td>

                              {/* Processing Time */}
                              <td className="px-4 py-4 text-gray-600 dark:text-gray-400 tabular-nums">
                                {order.processing_time != null
                                  ? `${Number(order.processing_time).toFixed(1)}d`
                                  : '—'}
                              </td>

                              {/* Total Time */}
                              <td className="px-4 py-4 font-medium text-gray-900 dark:text-white tabular-nums">
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
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border border-purple-100 dark:border-purple-800">
                                    <span className="w-1.5 h-1.5 rounded-full bg-purple-500 inline-block" />
                                    {order.bottleneck_stage}
                                  </span>
                                ) : (
                                  <span className="text-gray-300 dark:text-gray-600 text-xs">—</span>
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
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                  totalItems={sortedOrders.length}
                  startIndex={startIndex}
                  endIndex={endIndex}
                />
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900" role="main" aria-label="Order Details Page">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Header */}
        <header className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <button
              onClick={() => window.history.back()}
              className="p-2 text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label="Go back to orders list"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">
              Order Details
            </h1>
          </div>
          <p className="text-sm text-gray-400 dark:text-gray-500">
            Comprehensive analytics and timeline for order <span className="font-semibold text-gray-600 dark:text-gray-400">{orderId}</span>
          </p>
        </header>

        {/* Loading */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-32 gap-4" role="status" aria-live="polite">
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" aria-hidden="true" />
            <p className="text-gray-400 dark:text-gray-500 text-sm">Loading order details...</p>
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-8 flex flex-col items-center gap-4 text-center" role="alert" aria-live="assertive">
            <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
              <span className="text-3xl" aria-hidden="true">⚠️</span>
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
