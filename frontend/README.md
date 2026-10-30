# DashVolcano v3.0 - Frontend

Modern web application for exploring volcanic geochemical data with interactive mapping and visualization. Built with React, TypeScript, and cutting-edge WebGL technologies for high-performance data rendering.

## 🚀 Quick Start

### Prerequisites

- **Node.js** 20.19+ (or 22.12+) - Required for development
- **npm** 10+ - Package manager
- **DashVolcano Backend API** - Must be running on `http://localhost:8000`
- **Modern Browser** - Chrome 90+, Firefox 88+, Safari 14+, or Edge 90+

### Installation

```bash
# Clone the repository (if not already done)
cd DashVolcano/frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

The application will be available at **http://localhost:5173** with hot module replacement enabled.

### Environment Configuration

The frontend connects to the backend API via environment variables. If the backend is running on a different host/port, create a `.env` file:

```bash
# .env (optional - defaults to localhost:8000)
VITE_API_BASE_URL=http://localhost:8000
```

## 📁 Project Structure

```
frontend/
├── public/              # Static assets
├── src/
│   ├── api/            # API client and endpoint modules
│   │   ├── client.ts   # Axios instance with base config
│   │   ├── samples.ts  # Sample data endpoints
│   │   ├── volcanoes.ts    # Volcano endpoints
│   │   ├── eruptions.ts    # Eruption endpoints
│   │   ├── analytics.ts    # Chemical plot data
│   │   ├── spatial.ts      # Tectonic plates, spatial queries
│   │   └── metadata.ts     # Filters and metadata
│   ├── components/     # React components (organized by feature)
│   │   ├── Charts/     # Plotly-based chemical plots
│   │   ├── Layout/     # App shell, navbar, loading states
│   │   ├── Map/        # Deck.gl map, overlays, selection tools
│   │   └── UI/         # Reusable UI components
│   ├── pages/          # Page components (one per route)
│   │   ├── MapPage.tsx           # Main map with filters
│   │   ├── AnalyzeVolcanoPage.tsx    # Single volcano analysis
│   │   ├── CompareVolcanoesPage.tsx  # Compare 2 volcanoes
│   │   ├── CompareVEIPage.tsx        # Compare VEI distributions
│   │   └── TimelinePage.tsx          # Eruption timeline
│   ├── hooks/          # Custom React hooks
│   │   ├── useKeyboardShortcut.ts    # Keyboard event handler
│   │   └── useDebounce.ts            # Debounced values
│   ├── store/          # Zustand state management
│   │   └── useStore.ts # Global app state (filters, selection)
│   ├── types/          # TypeScript type definitions
│   │   └── api.ts      # API response types
│   ├── utils/          # Utility functions
│   │   ├── classNames.ts   # Tailwind class merging
│   │   ├── export.ts       # CSV export utilities
│   │   └── colors.ts       # Color schemes
│   ├── App.tsx         # Main app component with routing
│   ├── main.tsx        # React entry point
│   └── index.css       # Global styles and Tailwind imports
├── index.html          # HTML entry point
├── vite.config.ts      # Vite configuration
├── tailwind.config.js  # Tailwind CSS configuration
├── tsconfig.json       # TypeScript configuration
└── package.json        # Dependencies and scripts
```

## 🛠️ Technology Stack

### Core Framework
- **React 19.2** - Modern UI library with concurrent features
- **TypeScript 5.9** - Type-safe development
- **Vite 7.2** - Lightning-fast build tool with HMR

### Visualization & Mapping
- **Deck.gl 9.2** - WebGL-powered geospatial visualization
  - ScatterplotLayer for sample points
  - GeoJsonLayer for tectonic plates
  - H3HexagonLayer for spatial aggregation
- **Plotly.js 3.3** - Interactive scientific charts
  - TAS diagram (Total Alkali vs Silica)
  - AFM diagram (Alkali-Iron-Magnesium)
  - VEI bar charts and timelines
- **Mapbox GL 1.13** - Base map rendering

### State Management & Routing
- **Zustand 5.0** - Lightweight state management
- **React Router 7.10** - Client-side routing

### UI & Styling
- **Tailwind CSS 3.4** - Utility-first CSS framework
- **Lucide React 0.556** - Icon library
- **React Hot Toast 2.6** - Toast notifications
- **React Select 5.10** - Enhanced select components

### Data Handling
- **Axios 1.13** - HTTP client with interceptors
- **Turf.js 7.3** - Geospatial analysis (bounding boxes, point-in-polygon)

## 🎯 Key Features

### 1. Interactive Map (MapPage)
- **Sample Visualization**: 60,000+ volcanic rock samples rendered with Deck.gl
- **Real-time Filtering**: Filter by rock type, tectonic setting, country, volcano
- **Tectonic Plates Overlay**: Display plate boundaries, ridges, trenches, transforms
- **Selection Tools**: 
  - Click to select individual volcanoes
  - Lasso tool for freehand selection
  - Box tool for rectangular selection
- **Chemical Plots Overlay**: View TAS and AFM diagrams for selected samples
- **Data Export**: Export filtered samples to CSV

### 2. Volcano Analysis (AnalyzeVolcanoPage)
- Single volcano deep dive with geochemical plots
- TAS and AFM diagrams for volcano-specific samples
- Sample statistics and metadata
- CSV export of volcano samples

### 3. Volcano Comparison (CompareVolcanoesPage)
- Side-by-side comparison of 2 volcanoes
- Synchronized TAS and AFM plots
- Highlight geochemical differences
- Export comparison data

### 4. VEI Comparison (CompareVEIPage)
- Compare eruption magnitudes (Volcanic Explosivity Index)
- Bar charts showing VEI distribution
- Filter by eruption type
- Statistical summaries

### 5. Eruption Timeline (TimelinePage)
- Historical eruption timeline visualization
- Frequency analysis by time period
- Filter by date range and VEI
- Temporal patterns analysis

### 6. UX Enhancements
- **Toast Notifications**: Success/error feedback for all operations
- **Loading Skeletons**: Smooth loading states (7 variants)
- **Empty States**: Helpful messages when no data is available
- **Error Boundaries**: Graceful error handling with fallback UI
- **Keyboard Shortcuts**: `Ctrl+D` to download data on all pages
- **Mobile Responsive**: Hamburger menu, collapsible panels, touch-friendly
- **Accessibility**: ARIA labels, semantic HTML, keyboard navigation
- **Animations**: Smooth 200ms transitions throughout

## 🔧 Development

### Available Scripts

```bash
# Start development server with HMR
npm run dev

# Build for production
npx vite build

# Preview production build
npm run preview

# Run ESLint
npm run lint

# Type-check without building
npx tsc --noEmit
```

### Development Workflow

1. **Start Backend**: Ensure the backend API is running on `http://localhost:8000`
   ```bash
   cd ../backend
   uv run uvicorn backend.main:app --reload
   ```

2. **Start Frontend**: Run the dev server
   ```bash
   npm run dev
   ```

3. **Hot Module Replacement**: Changes to `.tsx`, `.ts`, `.css` files will auto-reload

4. **Type Checking**: TypeScript checks run automatically. Fix any errors shown in the terminal.

5. **Linting**: Run `npm run lint` to check code style

### Common Development Tasks

**Add a New Page:**
1. Create component in `src/pages/NewPage.tsx`
2. Add route in `src/App.tsx`
3. Add navigation link in `src/components/Layout/Navbar.tsx`

**Add a New API Endpoint:**
1. Add function to appropriate file in `src/api/` (e.g., `samples.ts`)
2. Define types in `src/types/api.ts`
3. Use in component with `useEffect` or event handler

**Add a New Chart:**
1. Create component in `src/components/Charts/NewChart.tsx`
2. Use Plotly's `react-plotly.js` wrapper
3. Set `layout: { autosize: true }` for responsive sizing
4. Wrap in height-constrained div (e.g., `<div className="h-[500px]">`)

**Modify Global State:**
1. Update `src/store/useStore.ts` with new state/actions
2. Use in components via `const { state, action } = useStore()`

## 🏗️ Building for Production

### Build Process

```bash
# Production build
NODE_OPTIONS="--max-old-space-size=4096" VITE_API_BASE_URL=/api npx vite build

# Output will be in dist/
ls dist/
# assets/  index.html
```

The build process:
1. Uses `npx vite build` directly to build without TypeScript type checking
2. Bundles with code splitting, minification, and outputs optimized static files to `dist/`
3. `NODE_OPTIONS="--max-old-space-size=4096"` increases memory limit to prevent heap overflow

**Note**: `NODE_OPTIONS="--max-old-space-size=4096"` increases memory limit to prevent heap overflow during build.

**Build Metrics (as of Sprint 4.1):**
- Build time: ~27s
- Bundle size: ~380KB (gzipped)
- Chunks: Code-split by route for optimal loading

### Preview Production Build

```bash
npm run preview
# ➜  Local:   http://localhost:4173/
```

## 🚀 Deployment

See [Production Deployment](../README.md#-production-deployment) in the main README: the production build is made and deployed by `deploy.sh`.

**Quick Deployment Checklist:**
1. ✅ Backend API is running and accessible
2. ✅ Set `VITE_API_BASE_URL` if backend is on different host
3. ✅ Run `npx vite build` to build frontend
4. ✅ Serve `dist/` folder with nginx or other static file server
5. ✅ Configure reverse proxy for `/api/` routes to backend
6. ✅ Enable gzip compression for static assets
7. ✅ Set up SSL/TLS certificate
8. ✅ Use `pm2 start ecosystem.production.config.js` for process management

## 🐛 Troubleshooting

### Frontend won't start
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
npm run dev
```

### API requests fail
- **Check backend is running**: Visit `http://localhost:8000/docs`
- **Check CORS**: Backend must allow `http://localhost:5173` in CORS origins
- **Check network tab**: Look for 404/500 errors in browser DevTools
- **Check .env**: Verify `VITE_API_BASE_URL` is correct (if set)

### TypeScript errors
```bash
# Run type checker
npx tsc --noEmit

# Check for missing types
npm install --save-dev @types/package-name
```

### Build fails
- **Clear cache**: `rm -rf node_modules/.vite`
- **Update dependencies**: `npm update`
- **Check Node version**: `node --version` (should be 20.19+)

### Map not rendering
- **Check Mapbox token**: Not required for basic functionality, but may need for satellite layers
- **Check WebGL support**: Visit `https://get.webgl.org/` to verify browser support
- **Check console errors**: Look for Deck.gl initialization errors

### Charts not displaying
- **Check Plotly.js loaded**: Look for errors in browser console
- **Check data format**: Verify API response matches expected TypeScript types
- **Check container height**: Charts need explicit height constraint (`h-[500px]`)

### Performance issues
- **Reduce sample count**: Apply filters to load fewer samples
- **Disable tectonic plates**: Toggle off overlay if not needed
- **Use Chrome DevTools Performance**: Profile rendering bottlenecks
- **Check network**: Slow API responses will delay rendering

## 📚 Additional Documentation

- **[Main README](../README.md)** - Setup, development and production deployment
- **[Backend API Docs](http://localhost:8000/docs)** - Interactive Swagger UI (when backend running)

## 🤝 Contributing

DashVolcano v3.0 is an internal IPGP project. For questions or contributions, contact the development team.

---

**Status:** ✅ Phase 4 complete (v3.0 production-ready)  
**Version:** 3.0.0  
**Last Updated:** Sprint 4.2 (Documentation & Testing)
