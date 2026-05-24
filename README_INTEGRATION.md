# MediMind AI - Intégration Frontend/Backend

Ce document explique comment le frontend (React/TanStack) et le backend (FastAPI) communiquent entre eux.

## Architecture

- **Frontend**: `/workspace/medimind-ai-main/` - Application React avec TanStack Router
- **Backend**: `/workspace/app/` - API FastAPI avec RAG Pipeline

## Configuration

### 1. Backend (FastAPI)

Le backend expose les endpoints suivants sur `http://localhost:8000/api/v1`:

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| `GET` | `/health` | Vérification de santé |
| `POST` | `/query` | Envoyer une question au RAG |
| `GET` | `/languages` | Liste des langues supportées |
| `GET` | `/documents` | Lister les documents indexés |
| `DELETE` | `/documents/{id}` | Supprimer un document |
| `POST` | `/upload` | Uploader un nouveau document |

**Démarrer le backend:**
```bash
cd /workspace
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### 2. Frontend (React)

Le frontend est configuré pour appeler le backend via la variable d'environnement `VITE_API_BASE`.

**Fichier `.env` (à créer):**
```env
VITE_API_BASE=http://localhost:8000/api/v1
```

**Démarrer le frontend:**
```bash
cd /workspace/medimind-ai-main
bun install  # ou npm install
bun run dev  # ou npm run dev
```

## Points d'Intégration Clés

### Service RAG (`src/services/ragService.ts`)

Ce service fait le pont entre le frontend et le backend:

1. **`streamQuery()`**: Envoie les questions au endpoint `/api/v1/query`
   - Format de requête: `{ query: string, language?: string }`
   - Format de réponse: `{ answer: string, language: string, confidence: number, retrieved_docs: [] }`

2. **`listDocuments()`**: Récupère la liste des documents via `/api/v1/documents`

3. **`uploadDocument()`**: Upload un fichier via `/api/v1/upload`

4. **`deleteDocument()`**: Supprime un document via `/api/v1/documents/{id}`

### Fallback Mock

Chaque fonction inclut un fallback vers des données mock en cas d'erreur de connexion au backend, permettant le développement frontend sans le backend.

## CORS

Le backend est configuré avec CORS ouvert (`allow_origins=["*"]`) pour permettre les requêtes depuis le frontend en développement. Pour la production, configurez des origines spécifiques.

## Tests d'Intégration

1. **Vérifier que le backend tourne:**
```bash
curl http://localhost:8000/api/v1/health
```

2. **Tester une requête:**
```bash
curl -X POST http://localhost:8000/api/v1/query \
  -H "Content-Type: application/json" \
  -d '{"query": "Quelle est la posologie recommandée?", "language": "fr"}'
```

3. **Vérifier la connexion frontend:**
   - Ouvrir la console du navigateur
   - Les erreurs de connexion afficheront "Backend query failed, using mock"

## Structure des Réponses

### Query Response
```json
{
  "answer": "Réponse générée par le RAG",
  "language": "fr",
  "confidence": 0.85,
  "retrieved_docs": [
    {
      "page_content": "Contenu du document...",
      "metadata": {
        "filename": "document.pdf",
        "source": "path/to/file",
        "page": 1
      }
    }
  ]
}
```

### Document List Response
```json
{
  "documents": [
    {
      "id": "doc123",
      "filename": "guide.pdf",
      "size": 1024000,
      "pages": 42,
      "uploaded_at": 1234567890000,
      "status": "ready"
    }
  ]
}
```

## Prochaines Étapes

Pour compléter l'intégration:

1. **Implémenter l'ingestion de documents** dans `app/rag/ingest.py`
2. **Configurer le vector store** pour persister les documents
3. **Améliorer le streaming** des réponses avec Server-Sent Events (SSE)
4. **Ajouter l'authentification** pour sécuriser les endpoints
