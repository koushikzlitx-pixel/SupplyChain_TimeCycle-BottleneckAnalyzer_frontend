import React from 'react';
import Navbar from './components/Navbar';
import Dashboard from './pages/Dashboard';

function App() {
  return (
    <div>
      <Navbar />
      <main>
        <Dashboard />
      </main>
    </div>
  );
}

export default App;