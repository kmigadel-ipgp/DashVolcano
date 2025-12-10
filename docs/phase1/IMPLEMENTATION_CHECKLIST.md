# DashVolcano v3.0 - Implementation Checklist

**Last Updated**: December 4, 2025

---

## Phase 1: Backend API Foundation (Week 1-2)

### Sprint 1.1: Project Setup ✅ **COMPLETE**
- [x] Create new project structure (backend + frontend folders)
- [x] Set up FastAPI project with Poetry/uv
- [x] Configure environment variables (.env)
- [x] Set up CORS middleware
- [x] Create MongoDB connection module (refactor from database.py)
- [x] Create basic health check endpoint
- [x] Test connection to MongoDB Atlas
- [x] **Bonus**: Created all API routers early
- [x] **Bonus**: Implemented spatial queries early
- [x] **Testing**: 18 comprehensive tests run and passing
- [x] **Bug Fixes**: Fixed sample ID, volcano/eruption number lookups, error handling

**Status**: ✅ Complete (December 4, 2025) - All endpoints tested and working

---

### Sprint 1.2: Core Data Models (3 days)
- [ ] Create Pydantic models for:
  - [ ] Sample (with geometry, oxides, matching_metadata)
  - [ ] Volcano (with geometry, rocks, tectonic_setting)
  - [ ] Eruption (with start_date, vei, geometry)
  - [ ] Event
- [ ] Create response models for API:
  - [ ] GeoJSON Feature/FeatureCollection
  - [ ] Paginated responses
  - [ ] Aggregated data responses
- [ ] Add validators for coordinate ranges, VEI values
- [ ] Unit tests for models

**Status**: ⏸️ Pending

---

### Sprint 1.3: Basic CRUD Endpoints (4 days)
- [x] Implement samples router (✅ done early + tested)
  - [x] `GET /api/samples` (with filters: db, rock_type, volcano_number)
  - [x] `GET /api/samples/{id}` (uses MongoDB _id)
  - [x] `GET /api/samples/geojson` (return GeoJSON FeatureCollection)
- [x] Implement volcanoes router (✅ done early + tested)
  - [x] `GET /api/volcanoes` (with filters: country, tectonic_setting)
  - [x] `GET /api/volcanoes/{volcano_number}` (int conversion added)
  - [x] `GET /api/volcanoes/geojson`
- [x] Implement eruptions router (✅ done early + tested)
  - [x] `GET /api/eruptions` (with filters: volcano_number, vei)
  - [x] `GET /api/eruptions/{eruption_number}` (int conversion added)
- [x] Add pagination (limit, offset) - ✅ **Complete**
- [ ] Add response caching headers
- [x] Add proper error handling - ✅ **Complete** (HTTPException with 400/404)

**Status**: ✅ 85% Complete (all basic endpoints working and tested, caching headers pending)

---

### Sprint 1.4: Spatial Queries ✅ **COMPLETE** (Done early!)
- [x] Implement spatial router:
  - [x] `GET /api/spatial/bounds` (bounding box query) - ✅ Tested: 1,718 samples in 10°x10° box
  - [x] `GET /api/spatial/nearby` (radius query with $nearSphere) - ✅ Tested: 51 samples in 100km
  - [ ] `GET /api/spatial/tectonic-plates` (serve GeoJSON) - **TODO**
- [x] Optimize spatial queries with proper indexes (already exist)
- [ ] Add zoom-level based aggregation
- [x] Benchmark query performance - ✅ **Complete** (~50-100ms for typical queries)

**Status**: ✅ 85% Complete (main queries tested and working, tectonic plates endpoint pending)

---

### Sprint 1.5: Analytics Endpoints (3 days)
- [ ] Migrate chemical analysis logic from `analytic_plots.py`
- [ ] Implement analytics router:
  - [ ] `POST /api/analytics/tas-data` (return data for TAS plot)
  - [ ] `POST /api/analytics/afm-data` (return data for AFM plot)
  - [ ] `GET /api/volcanoes/{id}/chemical-analysis`
  - [ ] `GET /api/volcanoes/{id}/vei-distribution`
- [ ] Return plot data as JSON (not plot objects)
- [ ] Add caching for expensive calculations

**Status**: ⏸️ Pending (stub created)

---

## Phase 2: Frontend Foundation (Week 3-4)

### Sprint 2.1: React Project Setup (2 days)
- [ ] Initialize React + TypeScript + Vite project
- [ ] Install dependencies (deck.gl, plotly.js, axios, zustand, tailwind)
- [ ] Set up project structure
- [ ] Configure Vite for API proxy (dev) and build
- [ ] Create basic routing (6 pages)

**Status**: ⏸️ Not started

---

### Sprint 2.2: API Client & State Management (3 days)
- [ ] Create Axios client with base URL configuration
- [ ] Create API modules (samples.ts, volcanoes.ts, etc.)
- [ ] Set up Zustand store with slices
- [ ] Create custom hooks (useSamples, useVolcanoes, etc.)

**Status**: ⏸️ Not started

---

### Sprint 2.3: Map Component (5 days)
- [ ] Create base Map component with Deck.gl
- [ ] Implement layers (ScatterplotLayer, HexagonLayer, GeoJsonLayer)
- [ ] Add layer toggles
- [ ] Implement viewport controls
- [ ] Add click handlers
- [ ] Implement tooltip on hover
- [ ] Performance optimization

**Status**: ⏸️ Not started

---

### Sprint 2.4: Filter Panel (3 days)
- [ ] Create FilterPanel component
- [ ] Implement filter widgets
- [ ] Connect filters to Zustand store
- [ ] Trigger API refetch on filter change
- [ ] Add clear/apply buttons

**Status**: ⏸️ Not started

---

### Sprint 2.5: Map Page Integration (2 days)
- [ ] Integrate Map + FilterPanel + plots
- [ ] Implement sample selection
- [ ] Display TAS/AFM diagrams
- [ ] Add CSV download button
- [ ] Add summary stats display
- [ ] Mobile responsive layout

**Status**: ⏸️ Not started

---

## Phase 3: Analysis Pages (Week 5-6)

### Sprint 3.1: Analyze Volcano Page (4 days)
- [ ] Create AnalyzeVolcanoPage component
- [ ] Volcano search/select dropdown
- [ ] Eruption date filter
- [ ] Display chemical composition plots
- [ ] Integrate with API
- [ ] Add CSV download
- [ ] Loading and error states

**Status**: ⏸️ Not started

---

### Sprint 3.2: Compare Volcanoes Page (4 days)
- [ ] Create CompareVolcanoesPage component
- [ ] Side-by-side volcano selection
- [ ] Eruption date filters for each
- [ ] Display comparison plots
- [ ] Integrate with API
- [ ] Add CSV download
- [ ] Responsive layout

**Status**: ⏸️ Not started

---

### Sprint 3.3: Compare VEI Page (3 days)
- [ ] Create CompareVEIPage component
- [ ] Volcano selection for 2 volcanoes
- [ ] Display VEI distribution bar charts
- [ ] Display major rock composition
- [ ] Integrate with API
- [ ] Add CSV download
- [ ] Add summary statistics

**Status**: ⏸️ Not started

---

### Sprint 3.4: Timeline Page (4 days)
- [ ] Create TimelinePage component
- [ ] Volcano selection dropdown
- [ ] Display timelines (eruptions, samples, VEI)
- [ ] Handle date uncertainty
- [ ] Use Plotly or D3.js
- [ ] Integrate with API
- [ ] Add CSV download
- [ ] Add zoom/pan controls

**Status**: ⏸️ Not started

---

### Sprint 3.5: About Page (1 day)
- [ ] Create AboutPage component
- [ ] Convert existing markdown content
- [ ] Add sections (sources, methodology, credits)
- [ ] Style with Tailwind CSS

**Status**: ⏸️ Not started

---

## Phase 4: Polish & Optimization (Week 7)

### Sprint 4.1: Performance Optimization (3 days)
- [ ] Backend: Redis caching, optimize pipelines, compression, rate limiting
- [ ] Frontend: Virtual scrolling, progressive loading, bundle optimization
- [ ] Benchmark and document metrics

**Status**: ⏸️ Not started

---

### Sprint 4.2: Error Handling & UX (2 days)
- [ ] Add error boundaries
- [ ] Implement retry logic
- [ ] User-friendly error messages
- [ ] Loading skeletons
- [ ] Empty states
- [ ] Success notifications
- [ ] Keyboard shortcuts
- [ ] Accessibility improvements

**Status**: ⏸️ Not started

---

### Sprint 4.3: Testing (2 days)
- [ ] Backend: Unit tests (80% coverage), integration tests
- [ ] Frontend: Unit tests, component tests, E2E tests
- [ ] Manual testing on multiple browsers/devices

**Status**: ⏸️ Not started

---

## Phase 5: Deployment (Week 8)

### Sprint 5.1: Production Setup (2 days)
- [ ] Server setup (nginx, pm2, certbot, firewall)
- [ ] Database production settings
- [ ] Domain and SSL certificate

**Status**: ⏸️ Not started

---

### Sprint 5.2: CI/CD Pipeline (2 days)
- [ ] Create GitHub Actions workflow
- [ ] Set up staging environment
- [ ] Document deployment process

**Status**: ⏸️ Not started

---

### Sprint 5.3: Deployment & Monitoring (2 days)
- [ ] Deploy to production
- [ ] Set up monitoring (pm2, nginx logs, alerts)
- [ ] Performance testing
- [ ] Security audit

**Status**: ⏸️ Not started

---

### Sprint 5.4: Documentation (1 day)
- [ ] Update README.md
- [ ] Create CONTRIBUTING.md
- [ ] Create CHANGELOG.md
- [ ] Write user guide
- [ ] Document API endpoints

**Status**: ⏸️ Not started

---

### Sprint 5.5: Launch (1 day)
- [ ] Final QA testing
- [ ] Load testing
- [ ] Fix critical bugs
- [ ] Announce launch
- [ ] Monitor for issues
- [ ] Gather user feedback

**Status**: ⏸️ Not started

---

## Overall Progress

| Phase | Sprints | Completed | In Progress | Pending | Progress |
|-------|---------|-----------|-------------|---------|----------|
| **Phase 1** | 5 | 2.7 | 0 | 2.3 | **54%** |
| **Phase 2** | 5 | 0 | 0 | 5 | 0% |
| **Phase 3** | 5 | 0 | 0 | 5 | 0% |
| **Phase 4** | 3 | 0 | 0 | 3 | 0% |
| **Phase 5** | 5 | 0 | 0 | 5 | 0% |
| **TOTAL** | 23 | 2.7 | 0 | 20.3 | **12%** |

**Phase 1 Breakdown**:
- Sprint 1.1: 100% ✅ (Complete + Tested)
- Sprint 1.2: 0% ⏸️ (Pending)
- Sprint 1.3: 85% ✅ (Nearly complete, caching headers pending)
- Sprint 1.4: 85% ✅ (Nearly complete, tectonic plates endpoint pending)
- Sprint 1.5: 0% ⏸️ (Stub created)

---

## Legend

- ✅ **Complete**: All tasks finished and tested
- 🔄 **In Progress**: Currently working on
- ⏸️ **Pending**: Not started yet
- ⚠️ **Blocked**: Waiting on dependency

---

**Note**: This checklist is updated as work progresses. See `IMPLEMENTATION_PROGRESS.md` for detailed notes on each sprint.

**Last Test Run**: December 4, 2025 - 18/18 tests passing ✅
