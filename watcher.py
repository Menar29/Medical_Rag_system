import time
import os
import shutil
import json
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler
from app.rag.pipeline import RAGPipeline


class PDFHandler(FileSystemEventHandler):
    def __init__(self, pipeline, processed_dir="processed", failed_dir="failed"):
        self.pipeline = pipeline
        self.processed_dir = processed_dir
        self.failed_dir = failed_dir
        self.state_file = "processed_files.json"

        os.makedirs(self.processed_dir, exist_ok=True)
        os.makedirs(self.failed_dir, exist_ok=True)

        # Charger historique
        self.processed_files = self._load_processed_files()

    def on_created(self, event):
        if event.is_directory:
            return

        file_path = event.src_path

        if not file_path.lower().endswith(".pdf"):
            return

        if file_path in self.processed_files:
            print(f" Déjà traité : {file_path}")
            return

        print(f"\n📄 Nouveau fichier détecté : {file_path}")

        if not self._wait_for_file_ready(file_path):
            print(" Fichier instable, ignoré.")
            return

        try:
            print(" Ingestion en cours...")
            result = self.pipeline.ingest_document(file_path)

            if "error" in result:
                print(f" Erreur ingestion : {result['error']}")
                self._move_to_failed(file_path)
                return

            print(" Ingestion réussie")

            self.processed_files.add(file_path)
            self._save_processed_files()

            self._move_to_processed(file_path)

        except Exception as e:
            print(f" Exception : {str(e)}")
            self._move_to_failed(file_path)

    # ========================
    # UTILS
    # ========================

    def _wait_for_file_ready(self, file_path, timeout=15):
        start_time = time.time()
        last_size = -1

        while time.time() - start_time < timeout:
            try:
                size = os.path.getsize(file_path)

                if size == last_size and size > 0:
                    return True

                last_size = size
                time.sleep(1)

            except Exception:
                time.sleep(1)

        return False

    def _move_to_processed(self, file_path):
        try:
            filename = os.path.basename(file_path)
            dest = os.path.join(self.processed_dir, filename)

            shutil.move(file_path, dest)
            print(f" Fichier déplacé → {dest}")

        except Exception as e:
            print(f" Erreur déplacement : {str(e)}")

    def _move_to_failed(self, file_path):
        try:
            filename = os.path.basename(file_path)
            dest = os.path.join(self.failed_dir, filename)

            shutil.move(file_path, dest)
            print(f" Fichier déplacé (failed) → {dest}")

        except Exception as e:
            print(f" Erreur déplacement failed : {str(e)}")

    def _load_processed_files(self):
        if not os.path.exists(self.state_file):
            return set()

        try:
            with open(self.state_file, "r") as f:
                return set(json.load(f))
        except:
            return set()

    def _save_processed_files(self):
        with open(self.state_file, "w") as f:
            json.dump(list(self.processed_files), f)


# ========================
# LANCEMENT
# ========================

def start_watcher(data_dir="data"):
    os.makedirs(data_dir, exist_ok=True)

    print(" Initialisation du pipeline...")
    pipeline = RAGPipeline(
        persist_directory="app/db/chroma",
        llm_model="mistral"
    )

    handler = PDFHandler(pipeline)
    observer = Observer()
    observer.schedule(handler, path=data_dir, recursive=False)

    print(f"👀 Surveillance du dossier : {data_dir}")
    print(" Dépose un PDF pour ingestion automatique\n")

    observer.start()

    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\n🛑 Arrêt...")
        observer.stop()

    observer.join()


if __name__ == "__main__":
    start_watcher()