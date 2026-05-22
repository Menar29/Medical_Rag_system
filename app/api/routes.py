from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional

router = APIRouter()


class QueryRequest(BaseModel):
    query: str
    language: Optional[str] = None


class QueryResponse(BaseModel):
    answer: str
    language: str
    confidence: float


@router.get("/health")
async def health_check():
    """Health check endpoint for the API."""
    return {
        "status": "healthy",
        "message": "RAG API is operational"
    }


@router.post("/query", response_model=QueryResponse)
async def query_rag(request: QueryRequest):
    """Query the RAG pipeline with a question."""
    try:
        # Import pipeline here to avoid circular imports
        from ..main import pipeline
        
        if pipeline is None:
            raise HTTPException(status_code=503, detail="RAG Pipeline not initialized")
        
        # Use the actual RAG pipeline
        result = pipeline.ask(query=request.query, k=4)
        
        if "error" in result:
            raise HTTPException(status_code=500, detail=result["error"])
        
        return {
            "answer": result.get("response", "No response generated"),
            "language": result.get("detected_language", request.language or "unknown"),
            "confidence": 0.85,  # Placeholder confidence
            "retrieved_count": result.get("retrieved_count", 0),
            "retrieved_docs": result.get("retrieved_docs", []),
            "query": result.get("query", request.query)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Query processing failed: {str(e)}")


@router.get("/languages")
async def get_supported_languages():
    """Get list of supported languages."""
    return {
        "languages": ["fr", "ha", "en"],
        "default": "auto-detect"
    }
