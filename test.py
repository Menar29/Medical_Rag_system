from langchain_huggingface import HuggingFaceEmbeddings
from langchain_community.vectorstores import Chroma
from langchain_core.documents import Document

# 1. Embeddings
embeddings = HuggingFaceEmbeddings(
    model_name="all-MiniLM-L6-v2"
)

# 2. Base vectorielle
db = Chroma(
    persist_directory="db",
    embedding_function=embeddings
)

# 3. Données
docs = [
    Document(page_content="Le cancer du col est causé par le HPV"),
    Document(page_content="Les symptômes incluent des saignements anormaux"),
    Document(page_content="Le dépistage permet une détection précoce"),
]

# 4. Ajouter dans la base
db.add_documents(docs)

# 5. Recherche
results = db.similarity_search("symptômes du cancer")

# 6. Affichage
for r in results:
    print("👉", r.page_content)