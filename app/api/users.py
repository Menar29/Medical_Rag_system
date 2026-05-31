"""
User management routes — register, login, profile.

Endpoints:
  POST /auth/register  — create account
  POST /auth/login     — get JWT
  GET  /auth/me        — current user profile
  PUT  /auth/me        — update profile
  DELETE /auth/me      — delete account
"""

import os
from datetime import datetime, timedelta
from typing import List, Optional
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, field_validator
from sqlalchemy.orm import Session

from ..db.pg_database import get_db
from ..db.models import User, QueryLog
from .jwt_auth import hash_password, verify_password, create_access_token, get_current_user

ADMIN_SECRET = os.getenv("ADMIN_SECRET", "")

router = APIRouter(prefix="/auth", tags=["Authentification"])


# ── Pydantic schemas ───────────────────────────────────────────────────────────

class RegisterRequest(BaseModel):
    email: str
    password: str
    role: str          # "patient" | "professional" | "admin"
    language: str = "fr"

    # Champs communs
    nom: Optional[str] = None
    prenom: Optional[str] = None

    # Patiente seulement
    age: Optional[int] = None
    region: Optional[str] = None

    # Professionnel seulement
    specialite: Optional[str] = None
    etablissement: Optional[str] = None

    # Admin seulement
    admin_secret: Optional[str] = None

    @field_validator("role")
    @classmethod
    def validate_role(cls, v: str) -> str:
        if v not in ("patient", "professional", "admin"):
            raise ValueError("role must be 'patient', 'professional' or 'admin'")
        return v

    @field_validator("password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        if len(v) < 6:
            raise ValueError("Le mot de passe doit contenir au moins 6 caractères")
        return v

    @field_validator("age")
    @classmethod
    def validate_age(cls, v: Optional[int]) -> Optional[int]:
        if v is not None and not (1 <= v <= 120):
            raise ValueError("L'âge doit être compris entre 1 et 120")
        return v


class LoginRequest(BaseModel):
    email: str
    password: str


class UpdateProfileRequest(BaseModel):
    language: Optional[str] = None
    nom: Optional[str] = None
    prenom: Optional[str] = None
    # Patiente
    age: Optional[int] = None
    region: Optional[str] = None
    # Professionnel
    specialite: Optional[str] = None
    etablissement: Optional[str] = None

    @field_validator("age")
    @classmethod
    def validate_age(cls, v: Optional[int]) -> Optional[int]:
        if v is not None and not (1 <= v <= 120):
            raise ValueError("Âge invalide")
        return v


class UserResponse(BaseModel):
    id: str
    email: str
    role: str
    language: str
    nom: Optional[str] = None
    prenom: Optional[str] = None
    # Patiente
    age: Optional[int] = None
    region: Optional[str] = None
    # Professionnel
    specialite: Optional[str] = None
    etablissement: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


# ── Helpers ────────────────────────────────────────────────────────────────────

def _to_response(user: User) -> UserResponse:
    return UserResponse.model_validate(user)


# ── Routes ─────────────────────────────────────────────────────────────────────

@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register(req: RegisterRequest, db: Session = Depends(get_db)):
    """Créer un compte patiente ou professionnel."""
    email = req.email.lower().strip()

    # Validate admin secret
    if req.role == "admin":
        if not ADMIN_SECRET:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="La création de comptes administrateurs est désactivée sur ce serveur.",
            )
        if req.admin_secret != ADMIN_SECRET:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Code administrateur incorrect.",
            )

    if db.query(User).filter(User.email == email).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Un compte existe déjà avec cet email",
        )

    user = User(
        id=str(uuid4()),
        email=email,
        password_hash=hash_password(req.password),
        role=req.role,
        language=req.language,
        nom=req.nom,
        prenom=req.prenom,
        # Patient fields
        age=req.age if req.role == "patient" else None,
        region=req.region if req.role == "patient" else None,
        # Professional fields
        specialite=req.specialite if req.role == "professional" else None,
        etablissement=req.etablissement if req.role == "professional" else None,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    return TokenResponse(
        access_token=create_access_token(user.id, user.role),
        user=_to_response(user),
    )


@router.post("/login", response_model=TokenResponse)
def login(req: LoginRequest, db: Session = Depends(get_db)):
    """Connexion — retourne un JWT valide 30 jours."""
    email = req.email.lower().strip()
    user = db.query(User).filter(User.email == email).first()

    if not user or not verify_password(req.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email ou mot de passe incorrect",
        )

    user.last_login = datetime.utcnow()
    db.commit()

    return TokenResponse(
        access_token=create_access_token(user.id, user.role),
        user=_to_response(user),
    )


@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    """Retourner le profil de l'utilisateur connecté."""
    return _to_response(current_user)


@router.put("/me", response_model=UserResponse)
def update_me(
    req: UpdateProfileRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Mettre à jour le profil (champs autorisés selon le rôle)."""
    updates = req.model_dump(exclude_none=True)

    # Prevent patients from setting professional fields and vice-versa
    if current_user.role == "patient":
        updates.pop("specialite", None)
        updates.pop("etablissement", None)
    else:
        updates.pop("age", None)
        updates.pop("region", None)

    for field, value in updates.items():
        setattr(current_user, field, value)

    db.commit()
    db.refresh(current_user)
    return _to_response(current_user)


@router.delete("/me", status_code=status.HTTP_204_NO_CONTENT)
def delete_me(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Supprimer son compte."""
    db.delete(current_user)
    db.commit()


# ── Admin routes ───────────────────────────────────────────────────────────────

def _require_admin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Accès réservé aux administrateurs.",
        )
    return current_user


class RoleUpdateRequest(BaseModel):
    role: str

    @field_validator("role")
    @classmethod
    def validate_role(cls, v: str) -> str:
        if v not in ("patient", "professional", "admin"):
            raise ValueError("role invalide")
        return v


@router.get("/admin/users", response_model=List[UserResponse])
def admin_list_users(
    db: Session = Depends(get_db),
    _: User = Depends(_require_admin),
):
    """Liste tous les utilisateurs (admin uniquement)."""
    return [_to_response(u) for u in db.query(User).order_by(User.created_at.desc()).all()]


@router.put("/admin/users/{user_id}/role", response_model=UserResponse)
def admin_change_role(
    user_id: str,
    req: RoleUpdateRequest,
    db: Session = Depends(get_db),
    admin: User = Depends(_require_admin),
):
    """Modifier le rôle d'un utilisateur (admin uniquement)."""
    if user_id == admin.id:
        raise HTTPException(status_code=400, detail="Impossible de modifier son propre rôle.")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable.")
    user.role = req.role
    db.commit()
    db.refresh(user)
    return _to_response(user)


@router.delete("/admin/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def admin_delete_user(
    user_id: str,
    db: Session = Depends(get_db),
    admin: User = Depends(_require_admin),
):
    """Supprimer un utilisateur (admin uniquement)."""
    if user_id == admin.id:
        raise HTTPException(status_code=400, detail="Impossible de supprimer son propre compte.")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable.")
    db.delete(user)
    db.commit()


@router.get("/admin/analytics")
def admin_analytics(
    db: Session = Depends(get_db),
    _: User = Depends(_require_admin),
):
    """Statistiques réelles de la plateforme (admin uniquement)."""
    from sqlalchemy import func

    # ── Utilisateurs ──────────────────────────────────────────────────────────
    all_users = db.query(User).all()
    users_by_role = {"patient": 0, "professional": 0, "admin": 0}
    users_by_lang = {"fr": 0, "en": 0, "ha": 0}
    for u in all_users:
        users_by_role[u.role] = users_by_role.get(u.role, 0) + 1
        lang = u.language if u.language in ("fr", "en", "ha") else "fr"
        users_by_lang[lang] += 1

    # Inscriptions par jour — 7 derniers jours
    today = datetime.utcnow().date()
    registrations_by_day = []
    for i in range(6, -1, -1):
        day = today - timedelta(days=i)
        count = sum(1 for u in all_users if u.created_at and u.created_at.date() == day)
        registrations_by_day.append({"day": day.strftime("%a"), "date": day.isoformat(), "count": count})

    # ── Requêtes ──────────────────────────────────────────────────────────────
    all_logs = db.query(QueryLog).all()
    queries_total = len(all_logs)
    avg_latency = round(sum(q.latency_ms for q in all_logs) / queries_total, 1) if queries_total else 0.0

    queries_by_lang = {"fr": 0, "en": 0, "ha": 0}
    for q in all_logs:
        lang = q.language if q.language in ("fr", "en", "ha") else "fr"
        queries_by_lang[lang] += 1

    queries_by_day = []
    latency_by_day = []
    for i in range(6, -1, -1):
        day = today - timedelta(days=i)
        day_logs = [q for q in all_logs if q.created_at and q.created_at.date() == day]
        avg_day = round(sum(q.latency_ms for q in day_logs) / len(day_logs), 1) if day_logs else 0.0
        queries_by_day.append({"day": day.strftime("%a"), "date": day.isoformat(), "count": len(day_logs)})
        latency_by_day.append({"day": day.strftime("%a"), "date": day.isoformat(), "ms": avg_day})

    return {
        "users": {
            "total": len(all_users),
            "by_role": users_by_role,
            "by_language": users_by_lang,
            "registrations_by_day": registrations_by_day,
        },
        "queries": {
            "total": queries_total,
            "avg_latency_ms": avg_latency,
            "by_language": queries_by_lang,
            "by_day": queries_by_day,
            "latency_by_day": latency_by_day,
        },
    }
