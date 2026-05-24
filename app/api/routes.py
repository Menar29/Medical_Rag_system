from fastapi import APIRouter, HTTPException, UploadFile, File
from pydantic import BaseModel
from typing import List, Optional, Dict, Any

router = APIRouter()


class QueryRequest(BaseModel):
    query: str
    language: Optional[str] = None


class QueryResponse(BaseModel):
    answer: str
    language: str
    confidence: float


class DocumentResponse(BaseModel):
    id: str
    filename: str
    size: int
    pages: int
    uploaded_at: int
    status: str


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


# Document management endpoints for frontend integration
@router.get("/documents")
async def list_documents():
    """List all ingested documents."""
    try:
        from ..main import pipeline
        
        if pipeline is None:
            raise HTTPException(status_code=503, detail="RAG Pipeline not initialized")
        
        # Get documents from vector store
        # This is a placeholder - implement based on your vector store
        return {
            "documents": []
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list documents: {str(e)}")


@router.delete("/documents/{doc_id}")
async def delete_document(doc_id: str):
    """Delete a specific document."""
    try:
        from ..main import pipeline
        
        if pipeline is None:
            raise HTTPException(status_code=503, detail="RAG Pipeline not initialized")
        
        # Delete document from vector store
        # This is a placeholder - implement based on your vector store
        return {"message": f"Document {doc_id} deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete document: {str(e)}")


@router.post("/upload")
async def upload_document(file: UploadFile = File(...)):
    """Upload and ingest a new document."""
    try:
        from ..main import pipeline
        import hashlib
        import time
        
        if pipeline is None:
            raise HTTPException(status_code=503, detail="RAG Pipeline not initialized")
        
        # Read file content
        content = await file.read()
        file_size = len(content)
        
        # Generate document ID
        doc_id = hashlib.md5(f"{file.filename}{time.time()}".encode()).hexdigest()[:10]
        
        # Ingest document using pipeline
        # This is a placeholder - implement based on your ingest method
        # You'll need to save the file and call pipeline.ingest() or similar
        
        return {
            "id": doc_id,
            "filename": file.filename,
            "size": file_size,
            "pages": 1,  # Placeholder
            "uploaded_at": int(time.time() * 1000),
            "status": "processing"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to upload document: {str(e)}")
