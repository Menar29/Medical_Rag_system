import os
from typing import List, Optional, Dict, Any
from datetime import datetime
from pathlib import Path
import pypdf
from langchain_core.documents import Document
from langchain_text_splitters import RecursiveCharacterTextSplitter
from ..services.vectorstore import VectorStoreService


class PDFIngestionService:
    """Service for ingesting PDF documents into the RAG system."""

    def __init__(
        self,
        vector_store: Optional[VectorStoreService] = None,
        chunk_size: int = 500,
        chunk_overlap: int = 100
    ):
        self.vector_store = vector_store or VectorStoreService()

        #  CHUNKING OPTIMISÉ
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=chunk_size,
            chunk_overlap=chunk_overlap,
            separators=[
                "\n\n",
                "\n",
                ". ",
                " ",
                ""
            ]
        )

    def ingest_pdf(
        self,
        pdf_path: str,
        metadata: Optional[Dict[str, Any]] = None,
        process_text: bool = True
    ) -> Dict[str, Any]:

        try:
            if not os.path.exists(pdf_path):
                return {"error": f"PDF file not found: {pdf_path}"}

            #  Extraction
            text_content = self._extract_text_from_pdf(pdf_path)

            #  Nettoyage
            text_content = self._clean_text(text_content)

            if not text_content.strip():
                return {"error": "No text content found in PDF"}

            #  Chunking
            chunks = (
                self.text_splitter.split_text(text_content)
                if process_text else [text_content]
            )

            documents = []

            for i, chunk in enumerate(chunks):

                #  filtrage bruit
                if len(chunk.strip()) < 50:
                    continue

                doc_metadata = {
                    "source": pdf_path,
                    "filename": os.path.basename(pdf_path),
                    "chunk_index": i,
                    "total_chunks": len(chunks),
                    "chunk_size": len(chunk),
                    "preview": chunk[:100],
                    "ingested_at": datetime.now().isoformat(),
                    "file_type": "pdf"
                }

                if metadata:
                    doc_metadata.update(metadata)

                documents.append(Document(
                    page_content=chunk,
                    metadata=doc_metadata
                ))

            #  sécurité
            if not documents:
                return {"error": "No valid chunks after processing"}

            #  stockage
            doc_ids = self.vector_store.add_documents(documents)

            return {
                "success": True,
                "message": f"PDF ingéré : {os.path.basename(pdf_path)}",
                "documents_added": len(documents),
                "chunks_created": len(chunks),
                "document_ids": doc_ids,
                "file_path": pdf_path
            }

        except Exception as e:
            return {"error": f"Error ingesting PDF: {str(e)}"}

    def ingest_pdf_directory(
        self,
        directory_path: str,
        recursive: bool = True,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:

        try:
            pdf_files = self._find_pdf_files(directory_path, recursive)

            if not pdf_files:
                return {"error": f"No PDF files found in directory: {directory_path}"}

            results = {
                "success": True,
                "total_files": len(pdf_files),
                "successful_ingestions": 0,
                "failed_ingestions": 0,
                "total_documents": 0,
                "results": []
            }

            for pdf_file in pdf_files:
                file_metadata = metadata.copy() if metadata else {}
                file_metadata["directory"] = directory_path

                result = self.ingest_pdf(pdf_file, file_metadata)
                results["results"].append(result)

                if result.get("success"):
                    results["successful_ingestions"] += 1
                    results["total_documents"] += result.get("documents_added", 0)
                else:
                    results["failed_ingestions"] += 1

            return results

        except Exception as e:
            return {"error": f"Error ingesting directory: {str(e)}"}

    def _extract_text_from_pdf(self, pdf_path: str) -> str:
        text_content = ""

        try:
            with open(pdf_path, 'rb') as file:
                reader = pypdf.PdfReader(file)

                for page in reader.pages:
                    text_content += page.extract_text() + "\n"

        except Exception as e:
            raise Exception(f"PDF extraction error: {str(e)}")

        return text_content

    def _clean_text(self, text: str) -> str:
        """ Nettoyage critique pour embeddings"""

        text = text.replace("\n", " ")
        text = " ".join(text.split())

        return text

    def _find_pdf_files(self, directory_path: str, recursive: bool = True) -> List[str]:

        pdf_files = []
        directory = Path(directory_path)

        if not directory.exists():
            return pdf_files

        pattern = "**/*.pdf" if recursive else "*.pdf"

        for pdf_file in directory.glob(pattern):
            if pdf_file.is_file():
                pdf_files.append(str(pdf_file))

        return pdf_files

    def get_ingestion_stats(self) -> Dict[str, Any]:
        try:
            all_docs = self.vector_store.db.get()
            filenames = {
                meta.get("filename")
                for meta in (all_docs.get("metadatas") or [])
                if meta and meta.get("filename")
            }
            return {
                "total_chunks": len(all_docs.get("ids") or []),
                "total_documents": len(filenames),
                "document_names": sorted(filenames),
            }
        except Exception as e:
            return {"error": str(e), "total_chunks": 0, "total_documents": 0}

    def delete_by_source(self, source_path: str) -> Dict[str, Any]:

        try:
            all_docs = self.vector_store.db.get()

            docs_to_delete = [
                all_docs["ids"][i]
                for i, meta in enumerate(all_docs.get("metadatas", []))
                if meta.get("source") == source_path
            ]

            if not docs_to_delete:
                return {"message": "No documents found for this source"}

            success = self.vector_store.delete_documents(docs_to_delete)

            return {
                "success": success,
                "deleted_count": len(docs_to_delete),
                "source": source_path
            }

        except Exception as e:
            return {"error": f"Error deleting documents: {str(e)}"}

    def reprocess_pdf(
        self,
        pdf_path: str,
        new_chunk_size: Optional[int] = None,
        new_chunk_overlap: Optional[int] = None
    ) -> Dict[str, Any]:

        try:
            self.delete_by_source(pdf_path)

            if new_chunk_size:
                self.text_splitter.chunk_size = new_chunk_size
            if new_chunk_overlap:
                self.text_splitter.chunk_overlap = new_chunk_overlap

            return self.ingest_pdf(pdf_path)

        except Exception as e:
            return {"error": f"Error reprocessing PDF: {str(e)}"}