from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import health, analytics, ml

app = FastAPI(
    title="SOLAR DAP — Solar Irradiance Analytics API",
    description=(
        "Backend REST API for SOLAR DAP: historical solar resource analytics, "
        "irradiance decomposition (GHI, DNI, DHI, GTI), 1-hour ML forecasting evaluation, "
        "and residual anomaly monitoring for Delhi, Raipur, and Jaisalmer."
    ),
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# Configure CORS for local Vite frontend development server
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:4173",
        "http://127.0.0.1:4173",
        "http://localhost:3000",
        "*",  # Allow all origins for dev flexibility
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API routers
app.include_router(health.router, prefix="/api")
app.include_router(analytics.router, prefix="/api")
app.include_router(ml.router, prefix="/api")

@app.get("/", tags=["Root"])
def root():
    return {
        "service": "SOLAR DAP Analytics API",
        "version": "0.1.0",
        "documentation": "/docs",
        "health_check": "/api/health",
        "status": "online"
    }
