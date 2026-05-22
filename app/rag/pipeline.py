from typing import List, Dict, Any, Optional
from langchain_core.documents import Document
from .retriever import RAGRetriever
from .generator import RAGGenerator
from .ingest import PDFIngestionService
from ..services.vectorstore import VectorStoreService
from ..services.llm import MistralLLM
from ..services.embeddings import EmbeddingService


class RAGPipeline:
    """Complete RAG pipeline orchestrating all components."""
    
    def __init__(self, 
                 persist_directory: str = "app/db/chroma",
                 embedding_model: str = "sentence-transformers/paraphrase-multilingual-mpnet-base-v2",
                 llm_model: str = "mistral-small-latest"):
        
        # Initialize core services
        self.embedding_service = EmbeddingService(model_name=embedding_model)
        self.vector_store = VectorStoreService(
            persist_directory=persist_directory,
            embedding_service=self.embedding_service
        )
        self.llm_service = MistralLLM(model=llm_model)
        
        # Initialize RAG components
        self.retriever = RAGRetriever(self.vector_store)
        self.generator = RAGGenerator(llm_service=self.llm_service)
        self.ingestion_service = PDFIngestionService(vector_store=self.vector_store)
    
    def ask(self, 
            query: str, 
            k: int = 4) -> Dict[str, Any]:
        """Ask a question and get an answer from the RAG system."""
        
        try:
            # Retrieve relevant documents
            retrieved_docs = self.retriever.similarity_search(query, k=k)
            
            # Generate response
            generation_result = self.generator.generate_response(
                query=query,
                retrieved_docs=retrieved_docs
            )
            
            # Add metadata
            generation_result.update({
                'query': query,
                'retrieved_count': len(retrieved_docs),
                'retrieved_docs': [
                    {
                        'content': doc.page_content[:200] + '...' if len(doc.page_content) > 200 else doc.page_content,
                        'metadata': doc.metadata
                    } for doc in retrieved_docs
                ]
            })
            
            return generation_result
            
        except Exception as e:
            return {
                'error': f"Error in RAG pipeline: {str(e)}",
                'query': query,
                'retrieved_count': 0
            }
    
    def ask_streaming(self, 
                     query: str, 
                     k: int = 4):
        """Ask a question and get a streaming response."""
        
        try:
            # Retrieve relevant documents
            retrieved_docs = self.retriever.similarity_search(query, k=k)
            
            # Generate streaming response
            for chunk_result in self.generator.generate_streaming_response(
                query=query,
                retrieved_docs=retrieved_docs
            ):
                # Add metadata to each chunk
                chunk_result.update({
                    'query': query,
                    'retrieved_count': len(retrieved_docs)
                })
                
                yield chunk_result
                
        except Exception as e:
            yield {
                'error': f"Error in streaming RAG pipeline: {str(e)}",
                'query': query,
                'retrieved_count': 0
            }
    
    def ingest_document(self, 
                       file_path: str, 
                       metadata: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Ingest a document into the RAG system."""
        
        try:
            if file_path.endswith('.pdf'):
                return self.ingestion_service.ingest_pdf(file_path, metadata)
            else:
                return {
                    'error': f"Unsupported file type: {file_path}. Only PDF files are supported."
                }
                
        except Exception as e:
            return {'error': f"Error ingesting document: {str(e)}"}
    
    def ingest_directory(self, 
                        directory_path: str,
                        recursive: bool = True,
                        metadata: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Ingest all documents from a directory."""
        
        try:
            return self.ingestion_service.ingest_pdf_directory(
                directory_path, 
                recursive, 
                metadata
            )
        except Exception as e:
            return {'error': f"Error ingesting directory: {str(e)}"}
    
    def search_documents(self, 
                        query: str, 
                        k: int = 10,
                        filter_dict: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
        """Search for documents without generating a response."""
        
        try:
            docs = self.vector_store.similarity_search(query, k=k, filter_dict=filter_dict)
            
            return [
                {
                    'content': doc.page_content,
                    'metadata': doc.metadata,
                    'score': None  # Similarity score not available in basic search
                }
                for doc in docs
            ]
            
        except Exception as e:
            return [{'error': f"Error searching documents: {str(e)}"}]
    
    def search_documents_with_scores(self, 
                                   query: str, 
                                   k: int = 10,
                                   filter_dict: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
        """Search for documents with similarity scores."""
        
        try:
            docs_with_scores = self.vector_store.similarity_search_with_score(
                query, k=k, filter_dict=filter_dict
            )
            
            return [
                {
                    'content': doc.page_content,
                    'metadata': doc.metadata,
                    'score': score
                }
                for doc, score in docs_with_scores
            ]
            
        except Exception as e:
            return [{'error': f"Error searching documents with scores: {str(e)}"}]
    
    def get_pipeline_stats(self) -> Dict[str, Any]:
        """Get comprehensive statistics about the RAG pipeline."""
        
        try:
            # Get vector store stats
            vector_stats = self.vector_store.get_collection_stats()
            
            # Get ingestion stats
            ingestion_stats = self.ingestion_service.get_ingestion_stats()
            
            # Get supported languages
            supported_languages = self.language_detector.get_supported_languages()
            translation_pairs = self.translator.get_translation_pairs()
            
            return {
                'vector_store': vector_stats,
                'ingestion': ingestion_stats,
                'language_support': {
                    'detection': supported_languages,
                    'translation_pairs': translation_pairs
                },
                'models': {
                    'embedding': self.embedding_service.model_name,
                    'llm': self.llm_service.model
                }
            }
            
        except Exception as e:
            return {'error': f"Error getting pipeline stats: {str(e)}"}
    
    def delete_documents(self, source_path: str) -> Dict[str, Any]:
        """Delete documents from a specific source."""
        
        try:
            return self.ingestion_service.delete_by_source(source_path)
        except Exception as e:
            return {'error': f"Error deleting documents: {str(e)}"}
    
    def clear_all_data(self) -> Dict[str, Any]:
        """Clear all data from the RAG system."""
        
        try:
            success = self.vector_store.clear_collection()
            
            return {
                'success': success,
                'message': 'All data cleared from RAG system' if success else 'Failed to clear data'
            }
            
        except Exception as e:
            return {'error': f"Error clearing data: {str(e)}"}
    
    def translate_text(self, 
                      text: str, 
                      from_lang: str, 
                      to_lang: str,
                      medical_context: bool = False) -> Dict[str, Any]:
        """Translate text using the translation service."""
        
        try:
            if medical_context:
                return self.translator.translate_medical_query(text, from_lang, to_lang)
            else:
                return self.translator.translate(text, from_lang, to_lang)
                
        except Exception as e:
            return {'error': f"Error translating text: {str(e)}"}
    
    def detect_language(self, text: str) -> Dict[str, Any]:
        """Detect the language of the given text."""
        
        try:
            return self.language_detector.detect_language(text)
        except Exception as e:
            return {'error': f"Error detecting language: {str(e)}"}
