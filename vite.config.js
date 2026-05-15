import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  
  // Build optimizations
  build: {
    // Output directory
    outDir: 'dist',
    
    // Enable CSS code splitting
    cssCodeSplit: true,
    
    // Generate sourcemaps for production debugging (disable for smaller builds)
    sourcemap: false,
    
    // Chunk size warnings
    chunkSizeWarningLimit: 1000,
    
    // Rollup options for optimization
    rollupOptions: {
      output: {
        // Manual chunk splitting for better caching
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'chart-vendor': ['recharts'],
          'utils-vendor': ['axios'],
        },
        
        // Asset file names
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name.split('.');
          let extType = info[info.length - 1];
          if (/\.(png|jpe?g|svg|gif|tiff|bmp|ico)$/i.test(assetInfo.name)) {
            extType = 'img';
          } else if (/\.(woff|woff2|ttf|otf|eot)$/i.test(assetInfo.name)) {
            extType = 'fonts';
          }
          return `assets/${extType}/[name]-[hash][extname]`;
        },
        
        // Chunk file names
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
      },
    },
    
    // Minification options
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // Remove console.logs in production
        drop_debugger: true,
      },
    },
  },
  
  // Development server configuration
  server: {
    port: 5173,
    host: true,
    open: true,
    
    // API proxy configuration (if needed)
    proxy: {
      '/api': {
        target: process.env.VITE_API_BASE_URL || 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  
  // Preview server configuration
  preview: {
    port: 4173,
    host: true,
  },
  
  // Dependency optimization
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom', 'axios', 'recharts'],
  },
})