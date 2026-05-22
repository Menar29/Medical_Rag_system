"""
RAG (Retrieval-Augmented Generation) Module

This module provides the core RAG functionality including:
- Document retrieval
- Response generation
- PDF ingestion
- Language detection
- Pipeline orchestration
"""

from .pipeline import RAGPipeline
from .retriever import RAGRetriever
from .generator import RAGGenerator
from .ingest import PDFIngestionService
from .language_detector import LanguageDetector

__all__ = [
    "RAGPipeline",
    "RAGRetriever", 
    "RAGGenerator",
    "PDFIngestionService",
    "LanguageDetector"
]
