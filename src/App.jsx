import React, { useState } from 'react';
import { Routes, Route, useParams } from 'react-router-dom';
import Dashboard, { Orders, OrderDetails, ThemeProvider, Sidebar, Navbar } from './pages/Dashboard';

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <ThemeProvider>
      <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
        {/* Sidebar */}
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Navbar */}
          <Navbar onMenuClick={() => setSidebarOpen(true)} />

          {/* Page Content */}
          <main className="flex-1 overflow-y-auto">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/orders" element={<Orders />} />
              <Route path="/orders/:orderId" element={<OrderDetailsWrapper />} />
              <Route path="/analytics" element={<Dashboard />} />
            </Routes>
          </main>
        </div>
      </div>
    </ThemeProvider>
  );
}

// Wrapper to extract route params and pass to OrderDetails
function OrderDetailsWrapper() {
  const { orderId } = useParams();
  return <OrderDetails orderId={orderId} />;
}
}

export default App;