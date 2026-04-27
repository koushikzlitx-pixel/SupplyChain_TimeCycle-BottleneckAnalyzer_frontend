// filepath: src/components/Navbar.jsx
import React from 'react';

function Navbar() {
  return (
    <nav style={styles.navbar}>
      <div style={styles.logo}>
        <h2>Supply Chain Analyzer</h2>
      </div>
      <ul style={styles.navLinks}>
        <li><a href="#" style={styles.link}>Dashboard</a></li>
        <li><a href="#" style={styles.link}>Time Cycle</a></li>
        <li><a href="#" style={styles.link}>Bottlenecks</a></li>
        <li><a href="#" style={styles.link}>Reports</a></li>
      </ul>
    </nav>
  );
}

const styles = {
  navbar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '1rem 2rem',
    backgroundColor: '#2c3e50',
    color: 'white',
  },
  logo: {
    fontSize: '1.2rem',
  },
  navLinks: {
    display: 'flex',
    listStyle: 'none',
    gap: '2rem',
    margin: 0,
    padding: 0,
  },
  link: {
    color: 'white',
    textDecoration: 'none',
    fontSize: '1rem',
  },
};

export default Navbar;