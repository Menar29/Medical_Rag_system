from langchain_huggingface import HuggingFaceEmbeddings
from langchain_community.vectorstores import Chroma
from langchain_core.documents import Document
from typing import List, Tuple


class RAGRetriever:
    
    def __init__(self, vector_store):
        self.vector_store = vector_store
        self.db = vector_store.db

    def add_documents(self, documents: List[Document]) -> None:
        self.db.add_documents(documents)

    def similarity_search(self, query: str, k: int = 3):
        return self.db.similarity_search(query, k=k)

    def similarity_search_with_score(self, query: str, k: int = 4) -> List[Tuple[Document, float]]:
        """Recherche avec score"""
        return self.db.similarity_search_with_score(query, k=k)

    def similarity_search_with_threshold(
        self,
        query: str,
        k: int = 5,
        score_threshold: float = 0.5
    ) -> List[Document]:
        """
        Recherche avec filtrage par pertinence
        """

        results = self.db.similarity_search_with_score(query, k=k)

        filtered_docs = []

        for doc, score in results:
            # ⚠️ plus le score est bas, plus c’est pertinent (Chroma)
            if score < score_threshold:
                filtered_docs.append(doc)

        return filtered_docs

    def debug_search(self, query: str, k: int = 4):
        """
        Debug complet pour voir ce que le retriever retourne
        """

        results = self.db.similarity_search_with_score(query, k=k)

        print("\n🔍 DEBUG RETRIEVER")
        print("Query :", query)
        print(f"Résultats trouvés : {len(results)}\n")

        for i, (doc, score) in enumerate(results):
            print(f"[{i+1}] Score: {score}")
            print(doc.page_content[:300])
            print("-" * 50)

        return results

    def as_retriever(self):
        return self.db.as_retriever()