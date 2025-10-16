from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session, joinedload
from datetime import timedelta
from app.database import get_db
from app.schemas.schemas import Token, LoginRequest
from app.services.auth_service import (
    authenticate_trabajador, 
    create_access_token, 
    get_password_hash,
    get_current_trabajador
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

@router.get("/me")
async def get_current_user_info(
    current_user: Trabajador = Depends(get_current_trabajador),
    db: Session = Depends(get_db)
):
    """
    Obtener información completa del usuario actual autenticado
    """
    # Cargar el trabajador con todas las relaciones
    trabajador_completo = db.query(Trabajador).options(
        joinedload(Trabajador.tipo_trabajador),
        joinedload(Trabajador.departamento_rel),
        joinedload(Trabajador.horario_rel),
        joinedload(Trabajador.centro_trabajo_rel),
        joinedload(Trabajador.grado_estudios_rel),
        joinedload(Trabajador.rol_rel)
    ).filter(Trabajador.id == current_user.id).first()
    
    if not trabajador_completo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuario no encontrado"
        )
    
    return {
        "id": trabajador_completo.id,
        "nombre": trabajador_completo.nombre,
        "apellidoPaterno": trabajador_completo.apellidoPaterno,
        "apellidoMaterno": trabajador_completo.apellidoMaterno,
        "rfc": trabajador_completo.rfc,
        "correo": trabajador_completo.correo,
        "puesto": trabajador_completo.puesto,
        "departamento": trabajador_completo.departamento_rel.descripcion if trabajador_completo.departamento_rel else None,
        "rol": trabajador_completo.rol_rel.descripcion if trabajador_completo.rol_rel else None
    }

@router.put("/me")
async def update_current_user_profile(
    update_data: dict,
    current_user: Trabajador = Depends(get_current_trabajador),
    db: Session = Depends(get_db)
):
    """
    Actualizar información del perfil del usuario actual
    Solo permite actualizar campos específicos de información personal
    """
    # Campos permitidos para actualizar
    allowed_fields = {
        'nombre', 'apellidoPaterno', 'apellidoMaterno', 
        'correo', 'titulo', 'cedula', 'escuelaEgreso'
    }
    
    # Filtrar solo campos permitidos
    filtered_data = {k: v for k, v in update_data.items() if k in allowed_fields}
    
    if not filtered_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No hay campos válidos para actualizar"
        )
    
    # Actualizar el trabajador
    for key, value in filtered_data.items():
        setattr(current_user, key, value)
    
    try:
        db.commit()
        db.refresh(current_user)
        
        # Retornar datos actualizados
        return {
            "message": "Perfil actualizado correctamente",
            "id": current_user.id,
            "nombre": current_user.nombre,
            "apellidoPaterno": current_user.apellidoPaterno,
            "apellidoMaterno": current_user.apellidoMaterno,
            "correo": current_user.correo,
            "titulo": current_user.titulo,
            "cedula": current_user.cedula,
            "escuelaEgreso": current_user.escuelaEgreso
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al actualizar el perfil: {str(e)}"
        )


@router.put("/me/password")
async def change_password(
    password_data: dict,
    current_user: Trabajador = Depends(get_current_trabajador),
    db: Session = Depends(get_db)
):
    """
    Cambiar la contraseña del usuario actual
    Requiere: current_password, new_password
    """
    from app.services.auth_service import verify_password, get_password_hash
    
    current_password = password_data.get('current_password')
    new_password = password_data.get('new_password')
    
    if not current_password or not new_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Se requieren current_password y new_password"
        )
    
    # Verificar que la contraseña actual sea correcta
    if not verify_password(current_password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La contraseña actual es incorrecta"
        )
    
    # Validar longitud de nueva contraseña
    if len(new_password) < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La nueva contraseña debe tener al menos 6 caracteres"
        )
    
    # Actualizar contraseña
    current_user.hashed_password = get_password_hash(new_password)
    
    try:
        db.commit()
        return {"message": "Contraseña actualizada correctamente"}
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al cambiar la contraseña: {str(e)}"
        )