from typing import List
from langchain_huggingface import HuggingFaceEmbeddings


class EmbeddingService:
    """Service for generating embeddings (single consistent system)."""

    def __init__(self, model_name: str = "sentence-transformers/paraphrase-multilingual-mpnet-base-v2",
                 device: str = "cpu"):

        self.model_name = model_name

        self.embeddings = HuggingFaceEmbeddings(
            model_name=model_name,
            model_kwargs={"device": device}
        )

    def embed_documents(self, texts: List[str]) -> List[List[float]]:
        return self.embeddings.embed_documents(texts)

    def embed_query(self, text: str) -> List[float]:
        return self.embeddings.embed_query(text)

    def get_embedding_dimension(self) -> int:
        return len(self.embed_query("test"))