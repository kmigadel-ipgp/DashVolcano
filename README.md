# DashVolcano v3.0

Modern web application for exploring volcanic geochemical data with interactive mapping and visualization. Built with FastAPI, React, TypeScript, and Deck.gl for high-performance data rendering.

## 🚀 Quick Start

### Prerequisites

**Backend:**
- Python 3.11+
- MongoDB access (Atlas or local)
- `uv` package manager (recommended) or `pip`

**Frontend:**
- Node.js 20.19+ (or 22.12+)
- npm 10+

**System:**
- Modern browser (Chrome 90+, Firefox 88+, Safari 14+, Edge 90+)

---

## 📦 Installation

### Step 1: Install `uv` (Optional but Recommended)

`uv` is a fast Python package manager. For detailed installation guide, visit: https://docs.astral.sh/uv/getting-started/installation/

**macOS and Linux:**
```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
```

Or with wget:
```bash
wget -qO- https://astral.sh/uv/install.sh | sh
```

**Windows:**
```bash
powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"
```

### Step 2: Clone Repository

```bash
git clone https://github.com/kmigadel-ipgp/DashVolcano.git
cd DashVolcano
```

---

## 🔧 Backend Setup

### 1. Navigate to Backend Directory

```bash
cd backend
```

### 2. Install Dependencies

**Using uv (recommended):**
```bash
uv sync
```

**Using pip:**
```bash
pip install -e .
```

### 3. Configure Environment

Copy the example environment file and configure your MongoDB credentials:

```bash
cp .env.example .env
```

Edit `.env` with your MongoDB credentials:

```bash
# MongoDB Configuration
MONGO_USER=your_mongodb_username
MONGO_PASSWORD=your_mongodb_password
MONGO_CLUSTER=your_cluster.mongodb.net
MONGO_DB=dashvolcano

# FastAPI Configuration
API_HOST=0.0.0.0
API_PORT=8000
API_WORKERS=4
DEBUG=true

# CORS Configuration
CORS_ORIGINS=["http://localhost:5173","http://localhost:3000"]
```

**⚠️ Security Note:** Access to the MongoDB database is required for the application to function. Please request authorized credentials if you need access.

### 4. Run Backend Server

```bash
# From the backend directory
uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000
```

Or using Python directly:
```bash
python -m backend.main
```

### 5. Verify Backend is Running

- **Health Check:** http://localhost:8000/health
- **API Documentation (Swagger):** http://localhost:8000/docs
- **API Documentation (ReDoc):** http://localhost:8000/redoc

You should see:
```json
{
  "status": "healthy",
  "version": "3.0.0",
  "service": "DashVolcano API"
}
```

---

## 🎨 Frontend Setup

### 1. Navigate to Frontend Directory

```bash
cd ../frontend
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment (Optional)

If your backend is running on a different host/port, create a `.env` file:

```bash
cp .env.example .env
```

Edit `.env` if needed:
```bash
# API Configuration
VITE_API_BASE_URL=http://localhost:8000/api

# Mapbox Token (optional)
# VITE_MAPBOX_TOKEN=pk.your_mapbox_token_here
```

**Note:** The default backend URL is `http://localhost:8000/api`, so this file is optional for local development.

### 4. Run Frontend Development Server

```bash
npm run dev
```

The application will be available at **http://localhost:5173** with hot module replacement enabled.

### 5. Build for Production (Optional)

```bash
# Production build
NODE_OPTIONS="--max-old-space-size=4096" VITE_API_BASE_URL=/api npx vite build
```

Built files will be in the `dist/` folder.

**Configuration Note**: DashVolcano uses a unified configuration approach:
- Single `ecosystem.config.js` for PM2 (works in both modes)
- Buffer polyfill in `frontend/src/polyfills/buffer.js` is transparent in both modes

---

## 🚀 Running DashVolcano

### Full Application (Both Backend and Frontend)

**Terminal 1 - Backend:**
```bash
cd backend
uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

**Access the Application:**
- Frontend: http://localhost:5173
- Backend API: http://localhost:8000
- API Documentation: http://localhost:8000/docs

---

## � Production Deployment with PM2

PM2 is a production-ready process manager for Node.js and Python applications. It handles automatic restarts, monitoring, and log management.

### Prerequisites

**Install PM2 globally:**
```bash
npm install -g pm2
```

### Setup Steps

**1. Ensure Backend Virtual Environment is Set Up:**
```bash
cd backend
uv sync  # or pip install -e .
cd ..
```

**2. Configure Environment Variables:**

Make sure your backend `.env` file is configured for production:
```bash
cd backend
cp .env.example .env
# Edit .env with production MongoDB credentials and settings
```

**3. Build Frontend for Production:**

```bash
cd frontend
NODE_OPTIONS="--max-old-space-size=4096" VITE_API_BASE_URL=/api npx vite build
cd ..
```

**Note:** Use `npx vite build` directly instead of `npm run build` to avoid TypeScript type-checking delays.

**4. PM2 Configuration:**

Two PM2 configuration files are available:
- `ecosystem.development.config.js` - Development mode (API with --reload + Frontend with npm run dev)
- `ecosystem.production.config.js` - Production mode (API with workers, no frontend)

Production config runs **API only** (frontend is served as static files by nginx):
```javascript
{
  name: 'dashvolcano-api',
  script: '/usr/local/bin/uvicorn',
  interpreter: 'python3',
  args: 'backend.main:app --host 0.0.0.0 --port 8000 --workers 4',
  // No --reload flag for production stability
}
```

**5. Start Application with PM2:**
```bash
# Development (starts both API and Frontend)
pm2 start ecosystem.development.config.js

# Production (API only - frontend served by nginx)
pm2 start ecosystem.production.config.js
```

**6. Verify API is Running:**
```bash
pm2 status
```

You should see `dashvolcano-api` online.

**7. Configure Web Server (Production Only):**

For production deployment, use nginx to serve frontend static files and proxy API requests:
- Serve `frontend/dist/` as document root
- Proxy `/api/*` requests to `http://localhost:8000`
- See [DEPLOYMENT_GUIDE.md](./docs/DEPLOYMENT_GUIDE.md) for complete nginx configuration

### PM2 Management Commands

**View Logs:**
```bash
# All logs
pm2 logs

# Specific service logs
pm2 logs dashvolcano-api
pm2 logs dashvolcano-frontend

# Last N lines
pm2 logs --lines 100
```

**Restart Services:**
```bash
# Restart all
pm2 restart all

# Restart specific service
pm2 restart dashvolcano-api
pm2 restart dashvolcano-frontend
```

**Stop Services:**
```bash
# Stop all
pm2 stop all

# Stop specific service
pm2 stop dashvolcano-api
```

**Delete Services:**
```bash
# Remove all services from PM2
pm2 delete all

# Remove specific service
pm2 delete dashvolcano-api
```

**Monitor Resources:**
```bash
pm2 monit
```

**Save Configuration (Auto-start on Reboot):**
```bash
# Save current PM2 process list
pm2 save

# Generate startup script
pm2 startup

# Follow the command output to enable auto-start
```

### Log Files

Logs are stored in the `logs/` directory:
- `logs/api-error.log` - Backend error logs
- `logs/api-out.log` - Backend output logs
- `logs/api-combined.log` - Combined backend logs
- `logs/frontend-error.log` - Frontend error logs
- `logs/frontend-out.log` - Frontend output logs
- `logs/frontend-combined.log` - Combined frontend logs

### Troubleshooting PM2 Issues

**"No module named uvicorn" error:**
- Ensure the virtual environment is properly set up: `cd backend && uv sync`
- Verify uvicorn is installed: `./backend/.venv/bin/uvicorn --version`
- Check the `script` path in `ecosystem.config.js` points to `./backend/.venv/bin/uvicorn`

**Services keep restarting:**
- Check logs: `pm2 logs`
- Verify MongoDB connection in `backend/.env`
- Ensure ports 8000 and 5173 are available

**Frontend build issues:**
- Install dependencies: `cd frontend && npm install`
- Verify Node.js version: `node --version` (should be 20.19+)

### Production Best Practices

For full production deployment with Nginx reverse proxy and SSL, refer to:
**[DEPLOYMENT_GUIDE.md](./docs/DEPLOYMENT_GUIDE.md)** - Complete production setup guide

---

## �📚 Documentation

- **[Frontend README](./frontend/README.md)** - Complete frontend setup and development guide
- **[Backend README](./backend/README.md)** - Backend API setup and development guide
- **[API Examples](./docs/API_EXAMPLES.md)** - Complete API reference with 40+ endpoint examples
- **[User Guide](./docs/USER_GUIDE.md)** - Complete user workflows and feature documentation
- **[Deployment Guide](./docs/DEPLOYMENT_GUIDE.md)** - Production deployment guide (nginx + pm2 + SSL)
- **[Implementation Plan](./docs/DASHVOLCANO_V3_IMPLEMENTATION_PLAN.md)** - Complete development documentation

---

## 🎯 Key Features

- **Interactive Map** - 60,000+ volcanic rock samples with Deck.gl WebGL rendering
- **Chemical Classification** - TAS and AFM diagrams for geochemical analysis
- **Volcano Comparison** - Side-by-side comparison of multiple volcanoes
- **VEI Analysis** - Volcanic Explosivity Index distribution comparison
- **Eruption Timeline** - Historical eruption patterns and frequency
- **Advanced Filtering** - Filter by rock type, tectonic setting, country, volcano
- **Selection Tools** - Click, lasso, and box selection for detailed analysis
- **Data Export** - Download filtered samples as CSV
- **Mobile Responsive** - Touch-friendly design for tablets and mobile devices
- **Keyboard Shortcuts** - Ctrl+D for quick data downloads

---

## 🛠️ Technology Stack

**Backend:**
- FastAPI 0.109+ (Python web framework)
- MongoDB 4.4+ (Database)
- pymongo 4.6+ (Database driver)
- uvicorn (ASGI server)

**Frontend:**
- React 19.2 (UI library)
- TypeScript 5.9 (Type-safe JavaScript)
- Vite 7.2 (Build tool)
- Deck.gl 9.2 (WebGL mapping)
- Plotly.js 3.3 (Interactive charts)
- Zustand 5.0 (State management)
- Tailwind CSS 3.4 (Styling)

**Data Sources:**
- GEOROC - Geochemistry of Rocks of the Oceans and Continents
- PetDB - Petrological Database
- GVP - Global Volcanism Program

---

## 🔍 Development

### Backend Development

**Run Tests:**
```bash
cd backend
pytest
```

**Code Formatting:**
```bash
black .
ruff check .
```

### Frontend Development

**Run Linter:**
```bash
cd frontend
npm run lint
```

**Type Check:**
```bash
npx tsc --noEmit
```

**Build:**
```bash
npm run build
```

---

## 📊 Project Structure

```
DashVolcano/
├── backend/              # FastAPI backend
│   ├── routers/         # API route handlers
│   ├── models/          # Pydantic models
│   ├── middleware/      # CORS, caching
│   ├── tests/           # Backend tests
│   └── main.py          # FastAPI app entry point
├── frontend/            # React frontend
│   ├── src/
│   │   ├── pages/       # Page components
│   │   ├── components/  # Reusable components
│   │   ├── api/         # API client
│   │   ├── store/       # State management
│   │   └── utils/       # Utility functions
│   └── dist/            # Built frontend (after npm run build)
├── data/                # Static data (tectonic plates)
├── docs/                # Documentation
│   ├── API_EXAMPLES.md
│   ├── USER_GUIDE.md
│   ├── DEPLOYMENT_GUIDE.md
│   └── phase*/          # Development phase reports
└── README.md            # This file
```

---

## 🐛 Troubleshooting

### Backend Issues

**Backend won't start:**
- Check MongoDB credentials in `.env`
- Verify MongoDB connection: `mongo "your-connection-string" --eval "db.runCommand({ping:1})"`
- Check port 8000 is not in use: `lsof -i :8000`

**API requests fail:**
- Verify backend is running: http://localhost:8000/health
- Check CORS configuration in `.env`

### Frontend Issues

**Frontend won't start:**
- Clear node_modules: `rm -rf node_modules package-lock.json && npm install`
- Check Node.js version: `node --version` (should be 20.19+)

**Map not rendering:**
- Check backend API is accessible
- Verify browser supports WebGL: https://get.webgl.org/

**API requests fail:**
- Ensure backend is running on http://localhost:8000
- Check `.env` file if backend is on different host

---

## 📄 License

Same as parent project.

---

## 🤝 Contributing

DashVolcano v3.0 is an internal IPGP project. For questions or contributions, contact the development team.

---

## 🎉 Status

**Version:** 3.0.0  
**Status:** ✅ Production Ready  
**Last Updated:** December 10, 2025

All development phases complete. Application is ready for production deployment.

For deployment instructions, see [DEPLOYMENT_GUIDE.md](./docs/DEPLOYMENT_GUIDE.md).