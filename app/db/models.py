from datetime import datetime
from uuid import uuid4
from sqlalchemy import Column, DateTime, Integer, String
from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    pass


class User(Base):
    __tablename__ = "users"

    id           = Column(String, primary_key=True, default=lambda: str(uuid4()))
    email        = Column(String, unique=True, nullable=False, index=True)
    password_hash = Column(String, nullable=False)
    role         = Column(String, nullable=False)   # "patient" | "professional"
    language     = Column(String, nullable=False, default="fr")

    # ── Champs communs ────────────────────────────────────────────────────────
    nom          = Column(String)
    prenom       = Column(String)

    # ── Patiente ──────────────────────────────────────────────────────────────
    age          = Column(Integer)
    region       = Column(String)

    # ── Professionnel ─────────────────────────────────────────────────────────
    specialite   = Column(String)
    etablissement = Column(String)

    # ── Méta ──────────────────────────────────────────────────────────────────
    created_at   = Column(DateTime, default=datetime.utcnow, nullable=False)
    last_login   = Column(DateTime)
