"""
Pont OCR-NLP -> RAG.

Le systeme Medical_OCR-NLP_System extrait des bilans biologiques en JSON structure
(lab_results, summary, alerts...). Ce module :
  1. appelle son API (/process) pour analyser un fichier (image/PDF),
  2. transforme le JSON labo en un `patient_context` plat et lisible, directement
     injectable dans le prompt du RAG (_build_prompt fait "- cle: valeur").

Aucune dependance lourde : juste `requests` (deja present).
"""

import os
from typing import Any, Dict, List, Optional

import requests

OCR_API_URL = os.getenv("OCR_API_URL", "http://ocr:8001/process")
OCR_TIMEOUT = int(os.getenv("OCR_TIMEOUT", "300"))  # OCR + Flan-T5 peuvent etre longs

# Nombre max de resultats "normaux" listes dans le contexte (anti-prompt-geant)
_MAX_NORMAL = 15


def _fmt_range(ref: Optional[Dict[str, Any]]) -> str:
    """Formate un intervalle de reference en texte court."""
    if not isinstance(ref, dict):
        return ""
    rtype = ref.get("type")
    if rtype == "interval" and ref.get("low") is not None and ref.get("high") is not None:
        return f"(ref {ref['low']}-{ref['high']})"
    if rtype == "threshold" and ref.get("value") is not None:
        op = ref.get("operator", "")
        return f"(ref {op}{ref['value']})"
    return ""


def _fmt_result(r: Dict[str, Any]) -> str:
    """Une ligne lisible pour un resultat de labo."""
    name = r.get("test_name", "?")
    value = r.get("value", "?")
    unit = r.get("unit", "") or ""
    ref = _fmt_range(r.get("reference_range"))
    status = r.get("status", "")
    status_fr = {"normal": "normal", "high": "eleve", "low": "bas",
                 "abnormal": "anormal"}.get(status, status)
    parts = [f"{name}: {value} {unit}".strip()]
    if ref:
        parts.append(ref)
    if status_fr:
        parts.append(f"[{status_fr}]")
    return " ".join(parts)


def ocr_data_to_patient_context(data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Convertit le JSON d'un bilan (champ `data` renvoye par l'OCR) en patient_context
    plat. Met en avant les resultats anormaux ; plafonne les normaux.
    """
    if not isinstance(data, dict):
        return {}

    results: List[Dict[str, Any]] = data.get("lab_results") or []
    abnormal = [r for r in results if r.get("status") not in (None, "", "normal")]
    normal = [r for r in results if r.get("status") == "normal"]

    ctx: Dict[str, Any] = {"Type de document": "Bilan biologique (extrait par OCR)"}

    meta = data.get("metadata") or {}
    if meta.get("doctor"):
        ctx["Source/Laboratoire"] = meta["doctor"]
    if meta.get("patient_id"):
        ctx["ID patient"] = meta["patient_id"]
    dates = meta.get("dates") or []
    if dates:
        ctx["Date(s)"] = ", ".join(str(d) for d in dates)

    ctx["Resultats anormaux"] = (
        " ; ".join(_fmt_result(r) for r in abnormal) if abnormal else "aucun"
    )

    if normal:
        shown = normal[:_MAX_NORMAL]
        suffix = "" if len(normal) <= _MAX_NORMAL else f" (+{len(normal) - _MAX_NORMAL} autres)"
        ctx["Resultats normaux"] = " ; ".join(_fmt_result(r) for r in shown) + suffix

    summary = data.get("summary_fr") or data.get("summary")
    if summary:
        ctx["Resume clinique"] = summary

    alerts = data.get("alerts") or []
    if alerts:
        ctx["Alertes"] = " ; ".join(str(a) for a in alerts)

    if data.get("clinical_priority"):
        ctx["Priorite clinique"] = data["clinical_priority"]
    if data.get("severity_score") is not None:
        ctx["Score de severite"] = data["severity_score"]

    return ctx


def analyze_report(file_bytes: bytes, filename: str,
                   ocr_url: Optional[str] = None) -> Dict[str, Any]:
    """
    Envoie un fichier (image/PDF) a l'API OCR et renvoie le JSON structure du
    premier resultat. Leve une exception explicite en cas d'echec.
    """
    url = ocr_url or OCR_API_URL
    resp = requests.post(
        url,
        files={"files": (filename, file_bytes)},
        timeout=OCR_TIMEOUT,
    )
    resp.raise_for_status()
    payload = resp.json()

    results = payload.get("results") or []
    if not results:
        raise RuntimeError("L'OCR n'a renvoye aucun resultat.")

    first = results[0]
    if first.get("status") != "success":
        raise RuntimeError(f"Echec OCR : {first.get('message', 'erreur inconnue')}")

    return first.get("data") or {}
