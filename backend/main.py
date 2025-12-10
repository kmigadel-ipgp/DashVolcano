"""
DashVolcano v3.0 - FastAPI Backend
Main application entry point
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from backend.config import settings
from backend.routers import samples, volcanoes, eruptions, spatial, analytics, metadata
from backend.middleware import CacheControlMiddleware

# Create FastAPI app
app = FastAPI(
    title="DashVolcano API",
    description="RESTful API for volcanic rock samples and eruption data",
    version="3.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Add caching middleware
app.add_middleware(CacheControlMiddleware)


# Health check endpoint
@app.get("/health", tags=["Health"])
async def health_check():
    """Health check endpoint for monitoring"""
    return JSONResponse(
        content={
            "status": "healthy",
            "version": "3.0.0",
            "service": "DashVolcano API"
        }
    )


@app.get("/", tags=["Root"])
async def root():
    """Root endpoint with API information"""
    return {
        "message": "DashVolcano API v3.0",
        "docs": "/docs",
        "health": "/health",
        "api_base": "/api"
    }


# Include routers
app.include_router(samples.router, prefix="/api/samples", tags=["Samples"])
app.include_router(volcanoes.router, prefix="/api/volcanoes", tags=["Volcanoes"])
app.include_router(eruptions.router, prefix="/api/eruptions", tags=["Eruptions"])
app.include_router(spatial.router, prefix="/api/spatial", tags=["Spatial"])
app.include_router(analytics.router, prefix="/api/analytics", tags=["Analytics"])
app.include_router(metadata.router, prefix="/api/metadata", tags=["Metadata"])


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "backend.main:app",
        host=settings.API_HOST,
        port=settings.API_PORT,
        reload=settings.DEBUG
    )
