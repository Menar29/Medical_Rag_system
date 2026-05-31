from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import uvicorn
from contextlib import asynccontextmanager

import os
from .api.routes import router
from .api.users import router as users_router
from .rag.pipeline import RAGPipeline


# Global pipeline instance
pipeline = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage application lifecycle."""
    global pipeline
    
    # Startup
    try:
        from .db.database import init_db
        init_db()
        print(" SQLite tables initialized")

        from .db.pg_database import init_pg_db
        init_pg_db()
        print(" User database initialized")

        pipeline = RAGPipeline(llm_model="gemma4")
        print(" RAG Pipeline initialized successfully")
        yield
    except Exception as e:
        print(f" Failed to initialize RAG Pipeline: {e}")
        raise
    
    # Shutdown
    print(" Shutting down RAG application")


# Create FastAPI app
_cors_origins = [o.strip() for o in os.getenv("CORS_ORIGINS", "*").split(",")]

app = FastAPI(
    title="CerviScan AI — API",
    description="Retrieval-Augmented Generation API — cancer du col de l'utérus · FR / Hausa",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(router,       prefix="/api/v1",   tags=["RAG"])
app.include_router(users_router, prefix="/api/v1",   tags=["Authentification"])


@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "message": "RAG API is running",
        "version": "1.0.0",
        "docs": "/docs",
        "health": "/api/v1/health"
    }


@app.get("/health")
async def health_check():
    """Simple health check endpoint."""
    try:
        global pipeline
        if pipeline is None:
            raise HTTPException(status_code=503, detail="Pipeline not initialized")
        
        # Test pipeline functionality
        test_result = pipeline.detect_language("test")
        
        return {
            "status": "healthy",
            "pipeline_ready": True,
            "timestamp": "operational"
        }
        
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Service unavailable: {str(e)}")


# Global exception handlers
@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc):
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": exc.detail,
            "status_code": exc.status_code,
            "path": str(request.url)
        }
    )


@app.exception_handler(Exception)
async def general_exception_handler(request, exc):
    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal server error",
            "status_code": 500,
            "path": str(request.url),
            "detail": str(exc)
        }
    )


if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )
