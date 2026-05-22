# RAG Project - Retrieval-Augmented Generation

Un projet RAG (Retrieval-Augmented Generation) utilisant LangChain et ChromaDB pour la recherche sémantique de documents.

## Structure du projet

```
Rag_project/
├── app/
│   ├── api/           # Endpoints API FastAPI
│   │   └── routes.py  # Routes de l'API
│   ├── data/          # Gestion des documents
│   │   └── documents.py
│   ├── rag/           # Logique RAG
│   │   └── retriever.py
│   └── main.py        # Point d'entrée principal
├── db/                # Base de données vectorielle ChromaDB
├── tests/             # Tests unitaires
│   └── test_rag.py
├── main.py            # Script de démonstration original
├── requirements.txt   # Dépendances Python
└── README.md         # Ce fichier
```

## Installation

1. Créer et activer l'environnement virtuel :
```bash
python -m venv venv
source venv/bin/activate  # Linux/Mac
# ou
venv\Scripts\activate     # Windows
```

2. Installer les dépendances :
```bash
pip install -r requirements.txt
```

## Utilisation

### Interface en ligne de commande

```bash
python app/main.py
```

Cette commande lance une interface interactive pour tester la recherche RAG.

### API REST

```bash
python -m uvicorn app.api.routes:app --reload
```

L'API sera disponible sur `http://localhost:8000`

#### Endpoints disponibles

- `GET /` - Message de bienvenue
- `POST /search` - Recherche de documents similaires
  ```json
  {
    "query": "votre recherche",
    "k": 3
  }
  ```
- `GET /health` - Vérification de santé

### Script de démonstration original

```bash
python main.py
```

## Fonctionnalités

- **Recherche sémantique** : Utilise des embeddings pour trouver des documents similaires
- **Base vectorielle persistante** : ChromaDB pour stocker et récupérer efficacement les documents
- **API REST** : Interface FastAPI pour l'intégration dans d'autres applications
- **Tests unitaires** : Validation du fonctionnement du système
- **Structure modulaire** : Code organisé et maintenable

## Configuration

Le système utilise par défaut :
- Modèle d'embeddings : `all-MiniLM-L6-v2`
- Base de données : ChromaDB dans le dossier `db/`
- Nombre de résultats par défaut : 3

## Tests

```bash
python -m pytest tests/
# ou
python tests/test_rag.py
```

## Développement

Pour ajouter de nouveaux documents :
1. Modifiez `app/data/documents.py`
2. Ajoutez vos documents dans la fonction `get_medical_documents()`
3. Relancez l'application

## Technologies utilisées

- **LangChain** : Framework pour les applications RAG
- **ChromaDB** : Base de données vectorielle
- **FastAPI** : Framework API REST
- **HuggingFace Transformers** : Modèles d'embeddings
- **Python 3.12+** : Langage principal
