import asyncio
import json
import os
import time
import hashlib
import uuid
from typing import AsyncGenerator, List, Optional, Dict, Any

import pypdf
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from .auth import require_api_key
from .jwt_auth import get_current_user_optional
from ..services.ocr_client import analyze_report, ocr_data_to_patient_context
from ..db.pg_database import SessionLocal
from ..db.models import QueryLog

router = APIRouter()

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)


# ── Pydantic models ────────────────────────────────────────────────────────────

class HistoryMessage(BaseModel):
    role: str   # "user" | "assistant"
    content: str


class QueryRequest(BaseModel):
    query: str
    language: Optional[str] = None
    history: Optional[List[HistoryMessage]] = []
    patient_context: Optional[Dict[str, Any]] = None


class RetrievedDoc(BaseModel):
    content: str
    metadata: Dict[str, Any] = {}


class QueryResponse(BaseModel):
    answer: str
    language: str
    confidence: float
    retrieved_count: int = 0
    retrieved_docs: List[RetrievedDoc] = []
    query: str = ""


class DocumentResponse(BaseModel):
    id: str
    filename: str
    size: int
    pages: int
    uploaded_at: int
    status: str


# ── Helper ─────────────────────────────────────────────────────────────────────

def _get_pipeline():
    from ..main import pipeline
    if pipeline is None:
        raise HTTPException(status_code=503, detail="RAG Pipeline not initialized")
    return pipeline


def _count_pdf_pages(path: str) -> int:
    try:
        with open(path, "rb") as f:
            return len(pypdf.PdfReader(f).pages)
    except Exception:
        return 1


# ── Endpoints ──────────────────────────────────────────────────────────────────

@router.get("/health")
async def health_check():
    return {"status": "healthy", "message": "RAG API is operational"}


@router.post("/query", response_model=QueryResponse, dependencies=[Depends(require_api_key)])
async def query_rag(request: QueryRequest, current_user=Depends(get_current_user_optional)):
    pipeline = _get_pipeline()
    t0 = time.time()
    try:
        result = pipeline.ask(
            query=request.query,
            k=4,
            language=request.language or "auto",
            history=[h.model_dump() for h in (request.history or [])],
            patient_context=request.patient_context,
        )

        if "error" in result:
            raise HTTPException(status_code=500, detail=result["error"])

        raw_docs = result.get("retrieved_docs", [])
        retrieved_docs = [
            RetrievedDoc(
                content=d.get("content", ""),
                metadata=d.get("metadata", {}),
            )
            for d in raw_docs
        ]

        latency = (time.time() - t0) * 1000
        lang = result.get("language", request.language or "fr")

        # Log query asynchronously — best effort
        try:
            with SessionLocal() as db:
                db.add(QueryLog(
                    user_id=getattr(current_user, "id", None),
                    language=lang,
                    latency_ms=round(latency, 1),
                ))
                db.commit()
        except Exception:
            pass

        return QueryResponse(
            answer=result.get("response", "Aucune réponse générée."),
            language=lang,
            confidence=result.get("confidence", 0.0),
            retrieved_count=result.get("retrieved_count", 0),
            retrieved_docs=retrieved_docs,
            query=result.get("query", request.query),
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Query failed: {str(e)}")


@router.get("/languages")
async def get_supported_languages():
    return {"languages": ["fr", "ha", "en"], "default": "auto-detect"}


@router.get("/documents")
async def list_documents():
    pipeline = _get_pipeline()
    try:
        all_data = pipeline.vector_store.db.get()
        metadatas = all_data.get("metadatas") or []

        # Aggregate unique files from chunk metadata
        seen: Dict[str, Dict] = {}
        for meta in metadatas:
            if not meta:
                continue
            fname = meta.get("filename")
            if not fname or fname in seen:
                continue
            seen[fname] = {
                "id": fname,
                "filename": fname,
                "size": 0,
                "pages": 1,
                "uploaded_at": int(time.time() * 1000),
                "status": "ready",
            }

        # Enrich with file stats if the file still exists on disk
        for fname, info in seen.items():
            candidate = os.path.join(UPLOAD_DIR, fname)
            if os.path.exists(candidate):
                info["size"] = os.path.getsize(candidate)
                info["pages"] = _count_pdf_pages(candidate)
                info["uploaded_at"] = int(os.path.getmtime(candidate) * 1000)

        return {"documents": list(seen.values())}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list documents: {str(e)}")


@router.delete("/documents/{doc_id}", dependencies=[Depends(require_api_key)])
async def delete_document(doc_id: str):
    pipeline = _get_pipeline()
    try:
        all_data = pipeline.vector_store.db.get()
        ids_to_delete = [
            all_data["ids"][i]
            for i, meta in enumerate(all_data.get("metadatas") or [])
            if meta and meta.get("filename") == doc_id
        ]

        if not ids_to_delete:
            raise HTTPException(status_code=404, detail=f"Document '{doc_id}' not found")

        pipeline.vector_store.delete_documents(ids_to_delete)

        # Remove physical file if present
        candidate = os.path.join(UPLOAD_DIR, doc_id)
        if os.path.exists(candidate):
            os.remove(candidate)

        return {"message": f"Document '{doc_id}' deleted ({len(ids_to_delete)} chunks removed)"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete document: {str(e)}")


@router.post("/upload", dependencies=[Depends(require_api_key)])
async def upload_document(file: UploadFile = File(...)):
    pipeline = _get_pipeline()
    try:
        content = await file.read()
        if not content:
            raise HTTPException(status_code=400, detail="Empty file")

        # Save to uploads/
        safe_name = os.path.basename(file.filename or "upload.pdf")
        dest_path = os.path.join(UPLOAD_DIR, safe_name)

        with open(dest_path, "wb") as f:
            f.write(content)

        pages = _count_pdf_pages(dest_path)

        # Ingest into RAG pipeline
        result = pipeline.ingest_document(dest_path)
        if "error" in result:
            os.remove(dest_path)
            raise HTTPException(status_code=500, detail=result["error"])

        doc_id = hashlib.md5(f"{safe_name}{time.time()}".encode()).hexdigest()[:10]

        return {
            "id": safe_name,
            "filename": safe_name,
            "size": len(content),
            "pages": pages,
            "uploaded_at": int(time.time() * 1000),
            "status": "ready",
            "chunks_created": result.get("documents_added", 0),
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")


# ── Pont OCR-NLP -> RAG ────────────────────────────────────────────────────────

@router.post("/analyze-report", dependencies=[Depends(require_api_key)])
async def analyze_report_endpoint(
    file: UploadFile = File(...),
    query: Optional[str] = None,
    language: Optional[str] = None,
):
    """
    Analyse un bilan biologique (image/PDF) via le systeme OCR-NLP, et renvoie un
    `patient_context` pret a etre passe a /query.

    Si `query` est fourni, lance directement la question sur le RAG en injectant ce
    contexte patiente, et renvoie la reponse (pratique pour un appel unique).
    """
    try:
        content = await file.read()
        if not content:
            raise HTTPException(status_code=400, detail="Fichier vide")

        # 1) OCR-NLP : extraction structuree
        try:
            structured = analyze_report(content, file.filename or "report.png")
        except Exception as e:
            raise HTTPException(status_code=502, detail=f"Service OCR indisponible ou en echec : {e}")

        # 2) JSON labo -> contexte patiente lisible
        patient_context = ocr_data_to_patient_context(structured)

        response: Dict[str, Any] = {
            "filename": file.filename,
            "patient_context": patient_context,
            "lab_results": structured.get("lab_results", []),
            "summary": structured.get("summary_fr") or structured.get("summary"),
            "alerts": structured.get("alerts", []),
        }

        # 3) Optionnel : repondre tout de suite via le RAG avec ce contexte
        if query:
            pipeline = _get_pipeline()
            result = pipeline.ask(
                query=query,
                k=4,
                language=language or "auto",
                history=[],
                patient_context=patient_context,
            )
            response["answer"] = result.get("response")
            response["confidence"] = result.get("confidence", 0.0)
            response["retrieved_count"] = result.get("retrieved_count", 0)

        return response

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analyse echouee : {str(e)}")


# ── Fix 10 : Feedback ──────────────────────────────────────────────────────────

class FeedbackRequest(BaseModel):
    rating: str                        # "up" | "down"
    query: Optional[str] = ""
    response: Optional[str] = ""
    message_id: Optional[str] = None
    conversation_id: Optional[str] = None
    comment: Optional[str] = None


@router.post("/feedback")
async def submit_feedback(req: FeedbackRequest):
    if req.rating not in ("up", "down"):
        raise HTTPException(status_code=400, detail="rating must be 'up' or 'down'")
    try:
        from ..db.database import save_feedback
        feedback_id = str(uuid.uuid4())
        result = save_feedback(
            feedback_id=feedback_id,
            rating=req.rating,
            query=req.query or "",
            response=req.response or "",
            message_id=req.message_id,
            conversation_id=req.conversation_id,
            comment=req.comment,
        )
        return {"success": True, **result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save feedback: {str(e)}")


@router.get("/feedback/stats")
async def feedback_stats():
    try:
        from ..db.database import get_feedback_stats
        return get_feedback_stats()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Fix 11 : SSE Streaming ─────────────────────────────────────────────────────

@router.post("/query/stream", dependencies=[Depends(require_api_key)])
async def stream_query(request: QueryRequest):
    """Server-Sent Events streaming endpoint."""
    pipeline = _get_pipeline()

    async def event_generator() -> AsyncGenerator[str, None]:
        try:
            history = [h.model_dump() for h in (request.history or [])]
            for chunk_result in pipeline.ask_streaming(
                query=request.query,
                k=4,
                language=request.language or "auto",
                history=history,
                patient_context=request.patient_context,
            ):
                if "error" in chunk_result:
                    yield f"event: error\ndata: {json.dumps({'error': chunk_result['error']})}\n\n"
                    return
                chunk = chunk_result.get("chunk", "")
                if chunk:
                    yield f"data: {json.dumps({'type': 'chunk', 'text': chunk})}\n\n"
                await asyncio.sleep(0)   # yield control to event loop

            # Final metadata event
            yield f"event: done\ndata: {json.dumps({'type': 'done'})}\n\n"

        except Exception as e:
            yield f"event: error\ndata: {json.dumps({'error': str(e)})}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


# ── Fix 12 : Conversation persistence ─────────────────────────────────────────

class ConversationCreateRequest(BaseModel):
    id: str
    role: str = "patient"
    language: str = "fr"


@router.post("/conversations")
async def create_conversation(
    req: ConversationCreateRequest,
    current_user=Depends(get_current_user_optional),
):
    try:
        from ..db.database import create_conversation
        user_id = current_user.id if current_user else None
        return create_conversation(req.id, req.role, req.language, user_id=user_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/conversations")
async def list_conversations(
    current_user=Depends(get_current_user_optional),
):
    """Returns conversations for the authenticated user, or all if anonymous."""
    try:
        from ..db.database import list_conversations, list_conversations_by_user
        if current_user:
            return {"conversations": list_conversations_by_user(current_user.id)}
        return {"conversations": list_conversations()}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/conversations/{conv_id}/messages")
async def get_messages(conv_id: str):
    try:
        from ..db.database import get_messages
        return {"messages": get_messages(conv_id)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
