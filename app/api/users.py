"""
User management routes — register, login, profile.

Endpoints:
  POST /auth/register  — create account
  POST /auth/login     — get JWT
  GET  /auth/me        — current user profile
  PUT  /auth/me        — update profile
  DELETE /auth/me      — delete account
"""

from datetime import datetime
from typing import Optional
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, field_validator
from sqlalchemy.orm import Session

from ..db.pg_database import get_db
from ..db.models import User
from .jwt_auth import hash_password, verify_password, create_access_token, get_current_user

router = APIRouter(prefix="/auth", tags=["Authentification"])


# ── Pydantic schemas ───────────────────────────────────────────────────────────

class RegisterRequest(BaseModel):
    email: str
    password: str
    role: str          # "patient" | "professional"
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

    @field_validator("role")
    @classmethod
    def validate_role(cls, v: str) -> str:
        if v not in ("patient", "professional"):
            raise ValueError("role must be 'patient' or 'professional'")
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
