"""
Citi-Bike Rebalancing Optimization API
Main FastAPI application entry point
"""
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import uvicorn

from routers import optimization, stations, analytics, vehicles, comparison, clustering, parameters, stats
from config.settings import settings
from utils.logger import setup_logger

logger = setup_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager"""
    logger.info("Starting Citi-Bike Optimization API")
    # Initialize resources (database, cache, models)
    yield
    logger.info("Shutting down Citi-Bike Optimization API")


app = FastAPI(
    title="Citi-Bike Rebalancing Optimization API",
    description="Operations Research API for optimal bike rebalancing",
    version="1.0.0",
    lifespan=lifespan
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(optimization.router, prefix="/api/optimize", tags=["optimization"])
app.include_router(comparison.router, prefix="/api/compare", tags=["comparison"])
app.include_router(stations.router, prefix="/api/stations", tags=["stations"])
app.include_router(analytics.router, prefix="/api/analytics", tags=["analytics"])
app.include_router(vehicles.router, prefix="/api/vehicles", tags=["vehicles"])
app.include_router(clustering.router, prefix="/api", tags=["clustering"])
app.include_router(parameters.router, prefix="/api", tags=["parameters"])
app.include_router(stats.router, prefix="/api", tags=["stats"])


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "Citi-Bike Rebalancing Optimization API",
        "version": "1.0.0",
        "docs": "/docs"
    }


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "citi-bike-optimization"
    }


if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG,
        log_level="info"
    )
