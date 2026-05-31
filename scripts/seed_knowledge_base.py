"""
Seed the CerviScan AI knowledge base with medical documents.

Usage:
    python scripts/seed_knowledge_base.py [--dir data/docs] [--clear]

Place PDF files in data/docs/ then run this script.
Suggested sources:
  - WHO guidelines: https://www.who.int/publications/i/item/9789240030824
  - MSP Niger protocols (contact Likita Care)
  - INCa guides: https://www.e-cancer.fr
"""

import argparse
import sys
import os

# Make sure we can import from the app package
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.rag.pipeline import RAGPipeline


def seed(docs_dir: str, clear: bool = False) -> None:
    print("Initialisation du pipeline RAG…")
    pipeline = RAGPipeline(llm_model="gemma4")

    if clear:
        print("Suppression de la base existante…")
        result = pipeline.clear_all_data()
        print(f"  → {result.get('message', result)}")

    if not os.path.isdir(docs_dir):
        print(f"Répertoire introuvable : {docs_dir}")
        print("Créez le dossier et placez-y des PDF médicaux, puis relancez.")
        sys.exit(1)

    pdf_files = [
        f for f in os.listdir(docs_dir)
        if f.lower().endswith(".pdf")
    ]

    if not pdf_files:
        print(f"Aucun PDF trouvé dans {docs_dir}")
        print()
        print("Placez-y les fichiers suivants (exemples) :")
        print("  • WHO_guideline_cervical_cancer_screening_2021.pdf")
        print("  • Protocole_national_cancer_col_Niger.pdf")
        print("  • Guide_vaccination_HPV_OMS.pdf")
        print("  • Prise_en_charge_CIN_MSP.pdf")
        sys.exit(1)

    print(f"Ingestion de {len(pdf_files)} fichier(s) depuis {docs_dir}…\n")
    total_chunks = 0

    for fname in sorted(pdf_files):
        path = os.path.join(docs_dir, fname)
        print(f"  ▶ {fname}")
        result = pipeline.ingest_document(path)
        if "error" in result:
            print(f"    ✗ Erreur : {result['error']}")
        else:
            n = result.get("documents_added", 0)
            total_chunks += n
            print(f"    ✓ {n} chunks indexés")

    stats = pipeline.get_pipeline_stats()
    total = stats.get("ingestion", {}).get("total_chunks", total_chunks)
    docs  = stats.get("ingestion", {}).get("total_documents", len(pdf_files))
    print(f"\nBase de connaissances : {docs} document(s) · {total} chunks vectorisés")
    print("Seed terminé.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Seed the CerviScan AI knowledge base")
    parser.add_argument("--dir",   default="data/docs", help="Dossier des PDFs (défaut : data/docs)")
    parser.add_argument("--clear", action="store_true",  help="Vider la base avant l'indexation")
    args = parser.parse_args()
    seed(args.dir, args.clear)
