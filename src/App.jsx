import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Dashboard, { Orders } from './pages/Dashboard';

function App() {
  return (
    <div>
      <Navbar />
      <main>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/orders" element={<Orders />} />
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

export default App;