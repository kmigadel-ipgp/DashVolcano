# DashVolcano v3.0

Modern web application for exploring volcanic geochemical data with interactive mapping and visualization. Built with FastAPI, React, TypeScript, and Deck.gl for high-performance data rendering.

## 🚀 Quick Start

### Prerequisites

**Backend:**
- Python 3.10+
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

### 1. Install Dependencies

```bash
cd backend
uv sync          # or: pip install -e .
cd ..
```

This creates `backend/.venv`.

### 2. Configure Environment

The API reads the `.env` file of the directory it is started from, which is the **repository root** (the code is imported as `backend.main`):

```bash
cp backend/.env.example .env
```

Edit `.env` with your MongoDB credentials:

```bash
MONGO_USER=your_mongodb_username
MONGO_PASSWORD=your_mongodb_password
MONGO_CLUSTER=your_cluster.mongodb.net
MONGO_DB=dashvolcano
```

The other variables of `.env.example` are optional (see `backend/config.py` for their defaults).

**⚠️ Security Note:** Access to the MongoDB database is required for the application to function. Please request authorized credentials if you need access.

### 3. Run the Backend

From the repository root:

```bash
backend/.venv/bin/uvicorn backend.main:app --reload --reload-dir backend --port 8000
```

### 4. Verify

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

### 1. Install Dependencies

```bash
cd frontend
npm install
```

### 2. Configure Environment (Optional)

The default backend URL is `http://localhost:8000/api`. To change it, or to set a Mapbox token:

```bash
cp .env.example .env
```

```bash
VITE_API_BASE_URL=http://localhost:8000/api
# VITE_MAPBOX_TOKEN=pk.your_mapbox_token_here
```

### 3. Run the Development Server

```bash
npm run dev
```

The application is available at **http://localhost:5173** with hot module replacement.

---

## 💻 Running Locally

### Two terminals

```bash
# Terminal 1 - API (from the repository root)
backend/.venv/bin/uvicorn backend.main:app --reload --reload-dir backend --port 8000

# Terminal 2 - Frontend
cd frontend && npm run dev
```

### Or with PM2

`ecosystem.development.config.js` starts both (API with auto-reload, Vite dev server). Its paths are relative to the file, so it works from any clone.

```bash
npm install -g pm2                              # once
pm2 start ecosystem.development.config.js
pm2 logs                                        # follow both logs
pm2 delete ecosystem.development.config.js      # stop and remove both
```

**Access:**
- Frontend: http://localhost:5173
- Backend API: http://localhost:8000
- API Documentation: http://localhost:8000/docs

⚠️ The development API uses the MongoDB database configured in `.env`. If it is the production database, the development site reads (and could write) production data.

---

## 🚀 Production Deployment

### Architecture

```
browser ──https──> nginx ──┬── /                      → frontend/dist (static build)
                           └── /api, /health, /docs,  → 127.0.0.1:8000 (uvicorn, 4 workers,
                               /redoc, /openapi.json     run by PM2: dashvolcano-api)
```

- **nginx** serves the frontend build and proxies the API. It is the only entry point: the API listens on `127.0.0.1` only.
- **PM2** runs the API (`ecosystem.production.config.js`) and restarts it if it stops. PM2 itself is started at boot by systemd (`pm2-root` service) and restores the list saved by `pm2 save`.
- **Python**: the production config uses `/usr/bin/python3` (Python 3.10), where the backend dependencies are installed. No virtual environment.
- **Monitoring**: PM2 restarts the API if it stops (up to 10 failed restarts in a row, then it marks it `errored`). Check with `pm2 ls`.
- **Configuration**: `/root/DashVolcano/.env` (repository root).

### Routine Deployment

On the server, as root:

```bash
cd /root/DashVolcano
./deploy.sh
```

`deploy.sh`:
1. updates `main` (`git pull --ff-only`; it stops if tracked files have local changes);
2. checks that the backend imports with `/usr/bin/python3` (catches a missing dependency **before** restarting);
3. builds the frontend in `frontend/dist.new` (running `npm ci` first if `package-lock.json` changed), then swaps it with `frontend/dist`; the previous build is kept in `frontend/dist.prev`;
4. restarts the API from `ecosystem.production.config.js` (changes to that file are applied);
5. checks `/health` and a database query; **if a check fails, the previous frontend build is restored** and the command to go back to the previous commit is printed;
6. runs `pm2 save`.

`./deploy.sh --no-pull` deploys the code already checked out (after installing a dependency, or after going back to a previous commit).

⚠️ `git pull` alone does not update the site: `frontend/dist` is not versioned and must be rebuilt. Always deploy with `deploy.sh`.

**New backend dependency:** when `backend/pyproject.toml` changes, `deploy.sh` prints the change. Install it for the production Python, then deploy again:

```bash
/usr/bin/python3 -m pip install "certifi>=2024.2.2"   # example
./deploy.sh --no-pull
```

### Rollback

- Frontend only: `cd frontend && mv dist dist.bad && mv dist.prev dist` (no restart needed).
- Code and frontend: `git reset --keep <previous commit> && ./deploy.sh --no-pull` (`deploy.sh` prints the previous commit at the start).

### First Installation (or Migration to This Setup)

```bash
cd /root/DashVolcano
npm install -g pm2
pm2 update                              # if `pm2 ls` reports that the in-memory PM2 is out of date
git pull --ff-only                      # brings deploy.sh and the PM2 configuration
./deploy.sh --no-pull
pm2 startup systemd                     # once: start PM2 at boot
```

Run `pm2 startup` from a plain SSH shell: it records the current `PATH` in the systemd service, and a VS Code terminal adds its own paths.

nginx proxies to the API with `proxy_pass http://127.0.0.1:8000;` (use `127.0.0.1` rather than `localhost`, which may resolve to the IPv6 address `::1` first, where the API does not listen). Test and reload nginx after a change: `nginx -t && systemctl reload nginx`.

### PM2 Commands

```bash
pm2 ls                                   # status
pm2 logs dashvolcano-api --lines 100     # logs
pm2 restart dashvolcano-api              # restart (same configuration)
pm2 describe dashvolcano-api             # interpreter, arguments, paths
pm2 monit                                # CPU and memory
```

After changing `ecosystem.production.config.js` by hand, apply it with `pm2 restart ecosystem.production.config.js --update-env && pm2 save`.

### Log Files

Logs are stored in the `logs/` directory:
- `logs/api-error.log`, `logs/api-out.log`, `logs/api-combined.log` - API
- `logs/frontend-*.log` - development frontend (PM2 development config only)

They are not rotated automatically. To rotate them: `pm2 install pm2-logrotate`.

### Troubleshooting

**The API does not start** (`pm2 logs dashvolcano-api`):
- Missing module: install it for the interpreter shown by `pm2 describe dashvolcano-api`.
- MongoDB errors: check `.env` at the repository root.
- Port in use: `ss -ltnp | grep :8000`.

**The site shows an old version:** the frontend was not rebuilt. Run `./deploy.sh --no-pull`.

**Frontend build issues:**
- Install dependencies: `cd frontend && npm ci`
- Verify Node.js version: `node --version` (should be 20.19+)

---

## 📚 Documentation

- **[Frontend README](./frontend/README.md)** - Complete frontend setup and development guide
- **[Backend README](./backend/README.md)** - Backend API setup and development guide
- **API reference** - interactive documentation at `/docs` (Swagger) and `/redoc` once the API runs

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
├── ecosystem.development.config.js  # PM2: API + Vite dev server
├── ecosystem.production.config.js   # PM2: production API
├── deploy.sh            # Production deployment
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

For deployment instructions, see [Production Deployment](#-production-deployment).