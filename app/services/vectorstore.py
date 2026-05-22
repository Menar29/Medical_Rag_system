from typing import List, Optional, Dict, Any
import os
import uuid
from datetime import datetime
from langchain_chroma import Chroma
from langchain_core.documents import Document
from .embeddings import EmbeddingService


class VectorStoreService:
    """Service for managing vector database operations."""
    
    def __init__(self, 
                 persist_directory: str = "app/db/chroma",
                 embedding_service: Optional[EmbeddingService] = None,
                 collection_name: str = "rag_collection"):
        
        self.persist_directory = persist_directory
        self.collection_name = collection_name
        
        # Initialize embedding service if not provided
        if embedding_service is None:
            self.embedding_service = EmbeddingService()
        else:
            self.embedding_service = embedding_service
        
        # Ensure persist directory exists
        os.makedirs(persist_directory, exist_ok=True)
        
        # Initialize Chroma vector store
        self.db = Chroma(
            persist_directory=persist_directory,
            embedding_function=self.embedding_service.embeddings,
            collection_name=collection_name
        )
    
    def add_documents(self, documents: List[Document], ids: Optional[List[str]] = None) -> List[str]:
        """Add documents to the vector store."""
        if ids is None:
            ids = [str(uuid.uuid4()) for _ in documents]
        
        # Add metadata to documents
        for i, doc in enumerate(documents):
            if doc.metadata is None:
                doc.metadata = {}
            doc.metadata.update({
                'added_at': datetime.now().isoformat(),
                'document_id': ids[i]
            })
        
        self.db.add_documents(documents, ids=ids)
        return ids
    
    def similarity_search(self, 
                         query: str, 
                         k: int = 4,
                         filter_dict: Optional[Dict[str, Any]] = None) -> List[Document]:
        """Search for similar documents."""
        return self.db.similarity_search(
            query=query, 
            k=k,
            filter=filter_dict
        )
    
    def similarity_search_with_score(self, 
                                   query: str, 
                                   k: int = 4,
                                   filter_dict: Optional[Dict[str, Any]] = None) -> List[tuple]:
        """Search for similar documents with similarity scores."""
        return self.db.similarity_search_with_score(
            query=query, 
            k=k,
            filter=filter_dict
        )
    
    def max_marginal_relevance_search(self, 
                                    query: str, 
                                    k: int = 4,
                                    fetch_k: int = 20,
                                    lambda_mult: float = 0.5,
                                    filter_dict: Optional[Dict[str, Any]] = None) -> List[Document]:
        """Search using Max Marginal Relevance for diverse results."""
        return self.db.max_marginal_relevance_search(
            query=query,
            k=k,
            fetch_k=fetch_k,
            lambda_mult=lambda_mult,
            filter=filter_dict
        )
    
    def get_document_by_id(self, doc_id: str) -> Optional[Document]:
        """Retrieve a specific document by its ID."""
        try:
            results = self.db.get(ids=[doc_id])
            if results['documents']:
                return Document(
                    page_content=results['documents'][0],
                    metadata=results['metadatas'][0] if results['metadatas'] else {}
                )
        except Exception:
            pass
        return None
    
    def delete_documents(self, ids: List[str]) -> bool:
        """Delete documents by their IDs."""
        try:
            self.db.delete(ids=ids)
            return True
        except Exception as e:
            print(f"Error deleting documents: {e}")
            return False
    
    def update_document(self, doc_id: str, new_document: Document) -> bool:
        """Update an existing document."""
        try:
            # Delete old document
            self.delete_documents([doc_id])
            
            # Add new document with same ID
            new_document.metadata = new_document.metadata or {}
            new_document.metadata.update({
                'updated_at': datetime.now().isoformat(),
                'document_id': doc_id
            })
            
            self.db.add_documents([new_document], ids=[doc_id])
            return True
        except Exception as e:
            print(f"Error updating document: {e}")
            return False
    
    def get_collection_stats(self) -> Dict[str, Any]:
        """Get statistics about the collection."""
        try:
            collection = self.db._collection
            count = collection.count()
            
            return {
                'collection_name': self.collection_name,
                'document_count': count,
                'persist_directory': self.persist_directory,
                'embedding_model': self.embedding_service.model_name
            }
        except Exception as e:
            return {'error': str(e)}
    
    def clear_collection(self) -> bool:
        """Clear all documents from the collection."""
        try:
            # Delete the entire collection
            self.db.delete_collection()
            
            # Reinitialize
            self.db = Chroma(
                persist_directory=self.persist_directory,
                embedding_function=self.embedding_service.embeddings,
                collection_name=self.collection_name
            )
            return True
        except Exception as e:
            print(f"Error clearing collection: {e}")
            return False
    
    def persist(self) -> None:
        """Persist the vector store to disk."""
        self.db.persist()
