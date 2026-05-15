import React, { useState, useEffect } from 'react';
import { Routes, Route, useParams } from 'react-router-dom';
import Dashboard, { Orders, OrderDetails, ThemeProvider, Sidebar, Navbar, ScrollToTop, NotificationProvider, ErrorBoundary } from './pages/Dashboard';

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Keyboard navigation support
  useEffect(() => {
    const handleKeyDown = (e) => {
      // ESC to close sidebar
      if (e.key === 'Escape' && sidebarOpen) {
        setSidebarOpen(false);
      }
      
      // Ctrl/Cmd + K to open search (future feature)
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        // Trigger search functionality
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [sidebarOpen]);

  return (
    <ErrorBoundary>
      <ThemeProvider>
        <NotificationProvider>
          <div className="flex h-screen bg-gray-50 dark:bg-gray-900 overflow-hidden">
            {/* Skip to main content link for accessibility */}
            <a
              href="#main-content"
              className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-blue-600 focus:text-white focus:rounded-lg focus:shadow-lg"
            >
              Skip to main content
            </a>

            {/* Sidebar */}
            <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

            {/* Main Content */}
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Navbar */}
              <Navbar onMenuClick={() => setSidebarOpen(true)} />

              {/* Page Content */}
              <main
                id="main-content"
                className="flex-1 overflow-y-auto custom-scrollbar"
                role="main"
                aria-label="Main content"
                tabIndex={-1}
              >
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/orders" element={<Orders />} />
                  <Route path="/orders/:orderId" element={<OrderDetailsWrapper />} />
                  <Route path="/analytics" element={<Dashboard />} />
                </Routes>
              </main>

              {/* Scroll to Top Button */}
              <ScrollToTop />
            </div>
          </div>
        </NotificationProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

// Wrapper to extract route params and pass to OrderDetails
function OrderDetailsWrapper() {
  const { orderId } = useParams();
  return <OrderDetails orderId={orderId} />;
}
}

export default App;