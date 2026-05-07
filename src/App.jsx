import React from 'react';
import { Routes, Route, useParams } from 'react-router-dom';
import Navbar from './components/Navbar';
import Dashboard, { Orders, OrderDetails } from './pages/Dashboard';

function App() {
  return (
    <div>
      <Navbar />
      <main>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/orders" element={<Orders />} />
          <Route path="/orders/:orderId" element={<OrderDetailsWrapper />} />
          {/* Future routes can be added here:
          <Route path="/time-cycle" element={<TimeCyclePage />} />
          <Route path="/bottlenecks" element={<BottlenecksPage />} />
          <Route path="/reports" element={<ReportsPage />} />
          */}
        </Routes>
      </main>
    </div>
  );
}

// Wrapper to extract route params and pass to OrderDetails
function OrderDetailsWrapper() {
  const { orderId } = useParams();
  return <OrderDetails orderId={orderId} />;
}

export default App;