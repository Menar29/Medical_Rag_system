from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import uvicorn
from contextlib import asynccontextmanager

from .api.routes import router
from .rag.pipeline import RAGPipeline


# Global pipeline instance
pipeline = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage application lifecycle."""
    global pipeline
    
    # Startup
    try:
        pipeline = RAGPipeline(llm_model="mistral")
        print(" RAG Pipeline initialized successfully")
        yield
    except Exception as e:
        print(f" Failed to initialize RAG Pipeline: {e}")
        raise
    
    # Shutdown
    print(" Shutting down RAG application")


# Create FastAPI app
app = FastAPI(
    title="RAG API",
    description="Retrieval-Augmented Generation API with multi-language support (French, Hausa, Zarma)",
    version="1.0.0",
    lifespan=lifespan
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routes
app.include_router(router, prefix="/api/v1", tags=["RAG"])


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
