from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import timedelta
from app.database import get_db
from app.schemas.schemas import Token, LoginRequest
from app.services.auth_service import (
    authenticate_trabajador, 
    create_access_token, 
    get_password_hash
)
from app.models.models import Trabajador
from app.config import settings

router = APIRouter()

@router.post("/login", response_model=Token)
async def login_for_access_token(login_data: LoginRequest, db: Session = Depends(get_db)):
    trabajador = authenticate_trabajador(db, login_data.rfc, login_data.password)
    if not trabajador:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="RFC o contraseña incorrectos",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": str(trabajador.id)}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@router.post("/oauth/token", response_model=Token)
async def login_oauth(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    """
    Endpoint para compatibilidad con el flujo OAuth2PasswordBearer
    """
    trabajador = authenticate_trabajador(db, form_data.username, form_data.password)
    if not trabajador:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales incorrectas",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": str(trabajador.id)}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@router.post("/biometrico/autenticar")
async def autenticar_huella(huella_base64: str, db: Session = Depends(get_db)):
    """
    Endpoint para autenticar mediante huella digital
    """
    from app.services.biometrico_service import verify_fingerprint
    
    trabajador = verify_fingerprint(db, huella_base64)
    if not trabajador:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Huella no reconocida",
        )
    
    # Si se reconoce la huella, devolver información del trabajador
    return {
        "id": trabajador.id,
        "nombre": f"{trabajador.nombre} {trabajador.apellidoPaterno} {trabajador.apellidoMaterno}",
        "rfc": trabajador.rfc
    }

@router.post("/biometrico/registrar-asistencia")
async def registrar_asistencia_huella(huella_base64: str, db: Session = Depends(get_db)):
    """
    Endpoint para registrar asistencia mediante huella digital
    """
    from app.services.biometrico_service import verify_fingerprint, determine_attendance_status, register_attendance
    
    trabajador = verify_fingerprint(db, huella_base64)
    if not trabajador:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Huella no reconocida",
        )
    
    # Determinar el estatus de la asistencia
    estatus = determine_attendance_status(db, trabajador.id)
    
    # Registrar la asistencia
    registro = register_attendance(db, trabajador.id, estatus)
    
    # Devolver información del registro
    return {
        "id": registro.id,
        "trabajador": f"{trabajador.nombre} {trabajador.apellidoPaterno} {trabajador.apellidoMaterno}",
        "fecha": registro.fecha,
        "estatus": registro.estatus
    }