from typing import List, Optional, Dict, Any
from langchain_core.documents import Document
from ..services.llm import MistralLLM


class RAGGenerator:
    """Service for generating responses using LLM with retrieved context."""

    def __init__(self, llm_service: Optional[MistralLLM] = None):
        self.llm_service = llm_service or MistralLLM()

    def generate_response(
        self,
        query: str,
        retrieved_docs: List[Document],
        language: str = "fr",
        temperature: float = 0.3,
        max_tokens: int = 800
    ) -> Dict[str, Any]:
        """Generate a response based on query and retrieved documents."""

        # 🚨 Cas critique : aucun document trouvé
        if not retrieved_docs:
            return {
                "response": "Je ne trouve pas cette information dans les documents fournis.",
                "sources": [],
                "language": language,
                "context_used": False
            }

        # Format context
        context = self._format_context(retrieved_docs)

        # Build strict prompt
        prompt = self._build_prompt(query, context, language)

        try:
            response = self.llm_service.generate_response(
                prompt=prompt,
                temperature=temperature,
                max_tokens=max_tokens
            )

            return {
                "response": response,
                "sources": self._format_sources(retrieved_docs),
                "language": language,
                "context_used": True
            }

        except Exception as e:
            return {
                "error": f"Error generating response: {str(e)}",
                "response": None,
                "sources": [],
                "language": language,
                "context_used": False
            }

    def generate_streaming_response(
        self,
        query: str,
        retrieved_docs: List[Document],
        language: str = "fr",
        temperature: float = 0.3,
        max_tokens: int = 800
    ):
        """Generate a streaming response."""

        if not retrieved_docs:
            yield {
                "chunk": "Je ne trouve pas cette information dans les documents fournis.",
                "sources": [],
                "language": language,
                "context_used": False
            }
            return

        context = self._format_context(retrieved_docs)
        prompt = self._build_prompt(query, context, language)

        try:
            for chunk in self.llm_service.generate_streaming_response(
                prompt=prompt,
                temperature=temperature,
                max_tokens=max_tokens
            ):
                yield {
                    "chunk": chunk,
                    "sources": self._format_sources(retrieved_docs),
                    "language": language,
                    "context_used": True
                }

        except Exception as e:
            yield {
                "error": f"Error generating streaming response: {str(e)}",
                "chunk": None,
                "sources": [],
                "language": language,
                "context_used": False
            }

    def _format_context(self, documents: List[Document]) -> str:
        """Format documents with source IDs."""

        context_parts = []

        for i, doc in enumerate(documents, 1):
            context_parts.append(f"[SOURCE {i}]\n{doc.page_content}")

        return "\n\n".join(context_parts)

    def _format_sources(self, documents: List[Document]) -> List[Dict[str, Any]]:
        """Format sources for API response."""

        return [
            {
                "source_id": i + 1,
                "content": doc.page_content,
                "metadata": doc.metadata
            }
            for i, doc in enumerate(documents)
        ]

    def _build_prompt(self, query: str, context: str, language: str) -> str:
        """Strict anti-hallucination prompt."""

        return f"""
Tu es un assistant médical spécialisé dans le cancer du col de l'utérus.

Tu dois STRICTEMENT répondre en utilisant uniquement les informations présentes dans le contexte.

=====================
CONTEXTE :
{context}
=====================

QUESTION :
{query}

=====================
RÈGLES OBLIGATOIRES :
1. Utilise UNIQUEMENT les informations du contexte
2. Si l'information n'existe pas, réponds EXACTEMENT :
   "Je ne trouve pas cette information dans les documents fournis."
3. Ne JAMAIS inventer ou compléter avec tes connaissances
4. Si possible, cite EXACTEMENT une phrase du contexte
5. Indique la source utilisée (ex: SOURCE 1)
6. Réponds en {language}
7. Sois clair, précis et professionnel
=====================

RÉPONSE :
"""

    def generate_summary(self, documents: List[Document], language: str = "fr") -> str:
        """Generate a summary of documents."""

        if not documents:
            return "Aucun document à résumer."

        context = self._format_context(documents)

        prompt = f"""
Résume les informations principales suivantes :

{context}

Instructions :
- Résumé clair et structuré
- Points clés uniquement
- Réponds en {language}

Résumé :
"""

        try:
            return self.llm_service.generate_response(
                prompt=prompt,
                temperature=0.3,
                max_tokens=500
            )
        except Exception as e:
            return f"Error generating summary: {str(e)}"