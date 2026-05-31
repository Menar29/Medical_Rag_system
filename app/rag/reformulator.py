"""
Medical query reformulator.

Enriches user queries with medical synonyms and standardised terminology
before sending to the vector retriever. Works fully offline (no LLM call).
"""

from typing import List
import re

# ── Medical synonym dictionary (FR/EN/HA) ─────────────────────────────────────
_SYNONYMS: dict[str, List[str]] = {
    # Cancer du col
    "cancer du col": ["cancer du col de l'utérus", "carcinome cervical", "néoplasie cervicale"],
    "col de l'utérus": ["col utérin", "cervix", "exocol", "endocol"],
    "col": ["col utérin", "cervix"],
    "cancer col": ["cancer du col de l'utérus", "carcinome cervical"],

    # CIN / dysplasie
    "cin": ["néoplasie intra-épithéliale cervicale", "dysplasie cervicale", "lésion précancéreuse"],
    "cin1": ["CIN de bas grade", "lésion malpighienne intra-épithéliale de bas grade", "LSIL"],
    "cin2": ["CIN de grade 2", "dysplasie modérée", "lésion précancéreuse intermédiaire"],
    "cin3": ["CIN de grade 3", "dysplasie sévère", "carcinome in situ"],
    "dysplasie": ["néoplasie intra-épithéliale cervicale", "lésion précancéreuse"],
    "lésion précancéreuse": ["CIN", "dysplasie cervicale", "néoplasie intra-épithéliale"],

    # HPV
    "hpv": ["papillomavirus humain", "human papillomavirus", "virus du papillome humain"],
    "papillomavirus": ["HPV", "human papillomavirus"],
    "vaccin hpv": ["vaccination anti-HPV", "Gardasil", "Cervarix", "vaccin anti-papillomavirus"],
    "vaccination": ["vaccin", "immunisation", "prévention vaccinale"],

    # Dépistage
    "dépistage": ["détection précoce", "diagnostic précoce", "screening", "examen de dépistage"],
    "frottis": ["frottis cervico-vaginal", "cytologie cervicale", "Pap smear", "PAP test"],
    "pap": ["frottis cervico-vaginal", "Pap smear", "cytologie cervicale"],
    "colposcopie": ["examen colposcopique", "colposcope", "examen du col"],
    "biopsie": ["prélèvement tissulaire", "exérèse tissulaire", "biopsie cervicale"],

    # Traitement
    "traitement": ["prise en charge", "thérapie", "protocole de traitement"],
    "conisation": ["exérèse par conisation", "LEEP", "traitement chirurgical du col"],
    "leep": ["large loop excision", "conisation à l'anse diathermique", "traitement électrochirurgical"],
    "cryothérapie": ["congélation", "traitement par le froid", "cryoablation"],
    "radiothérapie": ["radiation", "irradiation", "traitement par rayons"],
    "chimiothérapie": ["chimio", "traitement médicamenteux anticancéreux"],

    # Symptômes
    "saignement": ["métrorragie", "spotting", "saignement inter-menstruel", "saignement post-coïtal"],
    "douleur": ["douleur pelvienne", "douleur abdominale basse", "crampe"],
    "pertes": ["leucorrhées", "écoulements vaginaux", "sécrétions vaginales"],

    # Hausa terms
    "ciwon mahaifa": ["cancer du col de l'utérus", "carcinome cervical"],
    "allura hpv": ["vaccination anti-HPV", "vaccin HPV"],
    "gwaji": ["dépistage", "examen de dépistage", "screening"],
}

# ── Abbreviations to expand ────────────────────────────────────────────────────
_ABBREVIATIONS: dict[str, str] = {
    r"\boms\b": "Organisation Mondiale de la Santé (OMS)",
    r"\bmsp\b": "Ministère de la Santé Publique (MSP)",
    r"\bcin\s*1\b": "CIN1",
    r"\bcin\s*2\b": "CIN2",
    r"\bcin\s*3\b": "CIN3",
    r"\blsil\b": "lésion malpighienne intra-épithéliale de bas grade (LSIL)",
    r"\bhsil\b": "lésion malpighienne intra-épithéliale de haut grade (HSIL)",
    r"\bvhp\b": "papillomavirus humain (HPV)",
    r"\bitv\b": "interruption thérapeutique volontaire",
}


def reformulate(query: str, max_expansions: int = 3) -> str:
    """
    Return an enriched version of the query for better vector retrieval.

    Steps:
      1. Expand known abbreviations.
      2. Append synonyms for matched medical terms.
      3. Normalise whitespace.
    """
    q_lower = query.lower()
    expanded = query

    # Step 1 — expand abbreviations
    for pattern, replacement in _ABBREVIATIONS.items():
        expanded = re.sub(pattern, replacement, expanded, flags=re.IGNORECASE)

    # Step 2 — add synonyms
    added: List[str] = []
    for term, synonyms in _SYNONYMS.items():
        if term in q_lower and len(added) < max_expansions:
            # Pick synonyms not already present in the query
            for syn in synonyms:
                if syn.lower() not in expanded.lower() and len(added) < max_expansions:
                    added.append(syn)

    if added:
        expanded = expanded.rstrip() + " " + " ".join(added)

    # Step 3 — normalise whitespace
    return re.sub(r"\s+", " ", expanded).strip()
