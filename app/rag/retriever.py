from langchain_core.documents import Document
from typing import List, Tuple


class RAGRetriever:

    def __init__(self, vector_store):
        self.vector_store = vector_store
        self.db = vector_store.db

    def add_documents(self, documents: List[Document]) -> None:
        self.db.add_documents(documents)

    def similarity_search(self, query: str, k: int = 3) -> List[Document]:
        """Basic similarity search — returns top-k docs."""
        return self.db.similarity_search(query, k=k)

    def similarity_search_with_score(self, query: str, k: int = 4) -> List[Tuple[Document, float]]:
        """Similarity search with L2 distance scores (lower = better)."""
        return self.db.similarity_search_with_score(query, k=k)

    def reranked_search(
        self,
        query: str,
        k: int = 4,
        fetch_k: int = 12,
        score_threshold: float = 2.2,
    ) -> List[Tuple[Document, float]]:
        """
        Fetch fetch_k candidates, filter by score_threshold, return top-k.

        Strategy:
          1. Retrieve fetch_k candidates from Chroma (L2 distances).
          2. Discard chunks above score_threshold (too far from query).
          3. Score remaining chunks: reward keyword overlap + penalise short chunks.
          4. Return top-k after reranking, sorted best-first.

        Note : le modele d'embeddings multilingue (mpnet) produit des distances L2
        non normalisees, typiquement ~1.6-2.4 pour des passages pertinents — d'ou un
        seuil a 2.2 (et non 1.5, qui filtrait absolument tout). Le fallback ci-dessous
        garantit qu'on ne renvoie jamais un contexte vide alors que des candidats existent.
        """
        candidates = self.db.similarity_search_with_score(query, k=fetch_k)

        query_tokens = set(query.lower().split())

        reranked = []
        for doc, dist in candidates:
            if dist > score_threshold:
                continue

            # Keyword overlap bonus (normalised)
            doc_tokens = set(doc.page_content.lower().split())
            overlap = len(query_tokens & doc_tokens) / max(len(query_tokens), 1)

            # Length penalty: very short chunks add less value
            length_factor = min(1.0, len(doc.page_content) / 200)

            # Combined score: lower is better (distance), so subtract bonuses
            rerank_score = dist - 0.3 * overlap - 0.1 * length_factor
            reranked.append((doc, rerank_score))

        reranked.sort(key=lambda x: x[1])

        # Fallback : si le seuil a tout filtre mais que Chroma a des candidats,
        # garder les top-k par distance brute (le LLM dira "non trouve" si hors-sujet).
        if not reranked and candidates:
            candidates.sort(key=lambda x: x[1])
            return candidates[:k]

        return reranked[:k]

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