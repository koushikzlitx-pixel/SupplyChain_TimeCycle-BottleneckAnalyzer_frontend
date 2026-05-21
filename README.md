# Supply Chain Analytics Dashboard - Frontend

> Enterprise-grade analytics platform for supply chain time cycle and bottleneck analysis

[![React](https://img.shields.io/badge/React-18.2.0-blue.svg)](https://reactjs.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4.0-38bdf8.svg)](https://tailwindcss.com/)
[![Vite](https://img.shields.io/badge/Vite-5.0.8-646cff.svg)](https://vitejs.dev/)

## 🚀 Features

### Executive Dashboard Experience
- **Real-time Analytics**: Live dashboard with auto-refresh capability (5-minute intervals)
- **Business Insights Panel**: Executive insights with key metrics and performance indicators
- **Analytics Overview Widget**: Comprehensive analytics summary with trend indicators
- **Performance Overview Cards**: Executive performance summary cards with status badges
- **Presentation Mode**: Fullscreen, distraction-free analytics view for demos
- **Executive Landing**: Hero section with key performance metrics
- **Interactive KPI Cards**: Clickable cards with drill-down functionality and hover effects
- **Drill-Down Modals**: Detailed analytics views for comprehensive data exploration

### Advanced Analytics & Visualizations
- **Multiple Chart Types**: Line, Bar, Pie charts with interactive tooltips
- **Enhanced Custom Tooltips**: Professional chart tooltips with formatted data
- **Fullscreen Charts**: Modal view for detailed chart analysis
- **Responsive Visualizations**: All charts adapt to screen sizes
- **Synchronized Filters**: Global filter management with persistent state
- **Analytics Action Toolbar**: Quick actions for refresh, fullscreen, share, settings
- **Chart Animations**: Smooth transitions and stagger animations

### Data Export & Reporting
- **Export Progress Modal**: Animated progress tracking for CSV/PDF exports
- **CSV Export**: Complete analytics data export
- **PDF Export**: Formatted report generation (coming soon)
- **Export History**: Track export operations
- **Progress Indicators**: Real-time export status with animations

### Order Management & Lifecycle
- **Orders Table**: Searchable, sortable table with pagination
- **Order Lifecycle**: Visual timeline with stage-by-stage breakdown
- **Interactive Stage Cards**: Clickable stage breakdown with detailed metrics
- **SLA Tracking**: Real-time SLA breach indicators
- **Bottleneck Detection**: Highlighted bottleneck stages with impact analysis
- **Order Details**: Comprehensive order view with timeline visualization

### User Experience & Interactions
- **Dark/Light Mode**: Persistent theme with smooth transitions
- **Mobile Responsive**: Fully optimized for mobile and tablet devices
- **Advanced Filtering**: Global filter panel with 6+ filter options and persistence
- **Filter Presets**: Save and load filter configurations
- **Dashboard Customization**: Show/hide widgets with localStorage persistence
- **Loading Overlay**: Full-screen loading states for better UX
- **Smart Notifications**: Success, error, warning, info notifications with auto-dismiss
- **Accessibility**: WCAG 2.1 compliant with keyboard navigation and ARIA labels

### Enterprise Layout & Navigation
- **Enhanced Sidebar**: Animated navigation with active state indicators
- **Professional Navbar**: Search, theme toggle, user profile sections
- **Responsive Dashboard Layout**: Flexible grid system for different screen sizes
- **Enhanced Filter Toolbar**: Active filter count, quick clear, preset management
- **Breadcrumb Navigation**: Clear path indication across routes

### Technical Features & Performance
- **Performance Optimized**: React.memo, useMemo, useCallback throughout
- **Error Boundaries**: Comprehensive error handling system
- **Lazy Loading**: Code splitting for optimized initial load
- **State Persistence**: localStorage integration for filters, widgets, theme
- **Auto-refresh System**: Configurable interval-based data refresh
- **TypeScript Ready**: Clean architecture for easy TypeScript migration
- **Production Build**: Optimized bundle with code splitting and minification

### Advanced Reusable Components
- **BusinessInsightsPanel**: Executive insights display
- **AnalyticsOverviewWidget**: Comprehensive analytics summary
- **PerformanceOverviewCards**: Executive performance cards
- **InteractiveKPICard**: Clickable KPI with drill-down
- **DrillDownModal**: Detailed analytics exploration
- **ExportProgressModal**: Animated export progress
- **LoadingOverlay**: Full-screen loading states
- **ResponsiveDashboardLayout**: Responsive grid wrapper
- **EnhancedFilterToolbar**: Advanced filtering controls
- **AnalyticsActionToolbar**: Quick action buttons
- **TableauContainer**: Tableau dashboard embedding
- **DashboardSectionHeader**: Section headers with actions
- **AnalyticsInsightCard**: Individual insight cards
- **AnalyticsSummaryPanel**: Comprehensive analytics panel
- **DashboardInfoCard**: Statistics cards
- **FullscreenDashboardModal**: Fullscreen dashboard view

### Tableau Integration
- **Embedded Dashboards**: Native Tableau dashboard integration
- **Responsive Containers**: Adaptive Tableau visualization sizing
- **Fullscreen Support**: Dedicated fullscreen analytics experience
- **Loading States**: Intelligent loading and error handling
- **Environment Config**: Flexible Tableau URL configuration
- **Analytics Storytelling**: Rich insights around visualizations

## 📋 Prerequisites

- **Node.js**: >= 18.0.0
- **npm**: >= 9.0.0

## 🛠️ Installation

```bash
# Clone the repository
git clone https://github.com/koushikzlitx-pixel/SupplyChain_TimeCycle-BottleneckAnalyzer_frontend.git

# Navigate to project directory
cd SupplyChain_TimeCycle-BottleneckAnalyzer_frontend

# Install dependencies
npm install
```

## ⚙️ Configuration

Create a `.env` file in the root directory (use `.env.example` as template):

```env
# API Configuration
VITE_API_BASE_URL=http://localhost:8000

# Tableau Configuration (Optional)
# Set VITE_TABLEAU_ENABLED=true to enable Tableau dashboard integration
VITE_TABLEAU_ENABLED=false
VITE_TABLEAU_SERVER_URL=https://public.tableau.com
VITE_TABLEAU_VIEW_URL=https://public.tableau.com/views/SupplyChainAnalytics/Dashboard1

# Optional: Other environment variables
# VITE_API_TIMEOUT=15000
# VITE_AUTO_REFRESH_INTERVAL=300000
```

### Tableau Integration Setup

To enable Tableau dashboards:

1. Set `VITE_TABLEAU_ENABLED=true` in your `.env` file
2. Configure `VITE_TABLEAU_SERVER_URL` with your Tableau server URL
3. Set `VITE_TABLEAU_VIEW_URL` to your specific dashboard view URL
4. Restart the development server

**Note**: Tableau Public dashboards work out of the box. For Tableau Server, ensure proper CORS configuration.

## 🚀 Development

```bash
# Start development server
npm run dev

# Development server will run at http://localhost:5173
```

### Available Scripts

```bash
# Development
npm run dev              # Start dev server
npm run build            # Build for production
npm run build:prod       # Build with production mode
npm run preview          # Preview production build
npm run serve            # Serve production build

# Code Quality
npm run lint             # Run ESLint
npm run lint:fix         # Fix ESLint errors

# Cleanup
npm run clean            # Remove dist and node_modules
```

## 📦 Production Build

```bash
# Create optimized production build
npm run build

# Preview production build locally
npm run preview
```

### Build Optimizations

The production build includes:
- **Code Splitting**: Vendor chunks for better caching
- **Minification**: Terser minification with console.log removal
- **Tree Shaking**: Dead code elimination
- **Asset Optimization**: Images and fonts organized by type
- **CSS Optimization**: PurgeCSS and minification

## 🚢 Deployment

### Deploy to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

### Deploy to Netlify

```bash
# Install Netlify CLI
npm i -g netlify-cli

# Build and deploy
npm run build
netlify deploy --prod --dir=dist
```

### Deploy to AWS S3 + CloudFront

```bash
# Build
npm run build

# Upload to S3 bucket
aws s3 sync dist/ s3://your-bucket-name --delete

# Invalidate CloudFront cache
aws cloudfront create-invalidation --distribution-id YOUR_DIST_ID --paths "/*"
```

## 🏗️ Project Structure

```
src/
├── App.jsx                 # Root component with routing
├── main.jsx               # Application entry point
├── index.css              # Global styles and animations
├── pages/
│   └── Dashboard.jsx      # Main dashboard (all components)
└── components/            # (Future: Component organization)
    └── Navbar.jsx         # Navigation component
```

### Key Components

- **Dashboard**: Main analytics dashboard with KPIs and charts
- **Orders**: Orders table with search and filtering
- **OrderDetails**: Detailed order lifecycle visualization
- **PresentationHeader**: Executive-style dashboard header
- **ExecutiveLandingSection**: Hero metrics display
- **AnalyticsToolbar**: Refresh controls and auto-refresh toggle
- **ChartContainer**: Reusable chart wrapper with fullscreen support
- **GlobalFilterPanel**: Advanced filtering system

## 🎨 Theming

The application supports dark and light modes with automatic system preference detection. Theme preference is persisted in localStorage.

### Customizing Colors

Edit `src/pages/Dashboard.jsx`:

```javascript
const CHART_COLORS = {
  primary: ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981'],
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  info: '#3b82f6',
};
```

## 📱 Responsive Breakpoints

```javascript
const BREAKPOINTS = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
};
```

## 🔌 API Integration

The frontend connects to the backend API:

- **Base URL**: Configured via `VITE_API_BASE_URL`
- **Timeout**: 15 seconds
- **Auto-refresh**: 5 minutes (configurable)

### API Endpoints Used

```
GET /api/analytics/summary         # Dashboard summary statistics
GET /api/analytics/bottlenecks     # Bottleneck analysis
GET /api/analytics/sla-breaches    # SLA breach data
GET /api/orders                    # Orders list
GET /api/orders/:id                # Order details
POST /api/analytics/export         # Export analytics data
POST /api/orders/generate          # Generate dummy data
```

## 🧪 Testing

```bash
# Run tests (when implemented)
npm run test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage
```

## 🛡️ Security

- **Environment Variables**: Sensitive data stored in `.env`
- **CORS**: Configured on backend
- **Input Validation**: All user inputs validated
- **XSS Protection**: React's built-in XSS protection
- **HTTPS**: Required for production deployment

## 📊 Performance

### Optimization Techniques

- React.memo for expensive components
- useMemo for expensive calculations
- useCallback for event handlers
- Code splitting with dynamic imports
- Lazy loading for routes
- Image optimization
- CSS minification

### Performance Metrics

- **First Contentful Paint**: < 1.5s
- **Time to Interactive**: < 3s
- **Lighthouse Score**: 90+

## 🐛 Troubleshooting

### Common Issues

**API Connection Errors**
```bash
# Check API URL in .env
VITE_API_BASE_URL=http://localhost:8000

# Verify backend is running
curl http://localhost:8000/api/health
```

**Build Errors**
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
npm run build
```

**Dark Mode Not Working**
```bash
# Clear localStorage
localStorage.clear()
```

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open Pull Request

## 📝 License

This project is licensed under the MIT License.

## 👨‍💻 Author

**Koushik**
- GitHub: [@koushikzlitx-pixel](https://github.com/koushikzlitx-pixel)
- Email: koushikzlitx@gmail.com

## 🙏 Acknowledgments

- React team for the amazing framework
- Tailwind CSS for the utility-first CSS framework
- Recharts for beautiful chart components
- Vite for blazing fast build tool

## 📈 Roadmap

- [ ] TypeScript migration
- [ ] Unit tests with Jest/Vitest
- [ ] E2E tests with Playwright
- [ ] Component library documentation
- [ ] Advanced analytics features
- [ ] Multi-language support
- [ ] PWA capabilities
- [ ] Real-time WebSocket updates

---

**Built with ❤️ for Supply Chain Analytics**
