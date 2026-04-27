// filepath: src/pages/Dashboard.jsx
import React from 'react';

function Dashboard() {
  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Dashboard</h1>
      <div style={styles.grid}>
        <div style={styles.card}>
          <h3>Total Orders</h3>
          <p style={styles.value}>1,234</p>
        </div>
        <div style={styles.card}>
          <h3>Active Bottlenecks</h3>
          <p style={styles.value}>5</p>
        </div>
        <div style={styles.card}>
          <h3>Avg. Cycle Time</h3>
          <p style={styles.value}>12.5 days</p>
        </div>
        <div style={styles.card}>
          <h3>Efficiency Rate</h3>
          <p style={styles.value}>87%</p>
        </div>
      </div>
      <div style={styles.section}>
        <h2>Recent Activity</h2>
        <p>No recent activity to display.</p>
      </div>
    </div>
  );
}

const styles = {
  container: {
    padding: '2rem',
  },
  title: {
    marginBottom: '1.5rem',
    color: '#2c3e50',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '1.5rem',
    marginBottom: '2rem',
  },
  card: {
    backgroundColor: '#f8f9fa',
    padding: '1.5rem',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  },
  value: {
    fontSize: '2rem',
    fontWeight: 'bold',
    color: '#3498db',
    margin: '0.5rem 0 0 0',
  },
  section: {
    backgroundColor: '#f8f9fa',
    padding: '1.5rem',
    borderRadius: '8px',
  },
};

export default Dashboard;