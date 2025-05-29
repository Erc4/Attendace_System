from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
import base64
from app.database import get_db
from app.models.models import Trabajador, TipoTrabajador, Departamento, GradoEstudio, RolUsuario
from app.schemas.schemas import (
    TrabajadorCreate, 
    TrabajadorUpdate, 
    TrabajadorOut
)
from app.services.auth_service import get_current_trabajador, check_admin_permissions, get_password_hash

router = APIRouter()

# Rutas para Trabajadores
@router.post("/trabajadores", response_model=TrabajadorOut, status_code=status.HTTP_201_CREATED)
def create_trabajador(
    trabajador: TrabajadorCreate, 
    db: Session = Depends(get_db),
    current_user: Trabajador = Depends(check_admin_permissions)
):
    # Verificar si ya existe un trabajador con el mismo RFC
    db_trabajador = db.query(Trabajador).filter(Trabajador.rfc == trabajador.rfc).first()
    if db_trabajador:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Ya existe un trabajador con el RFC {trabajador.rfc}"
        )
    
    # Crear el nuevo trabajador
    trabajador_data = trabajador.dict()
    
    # Manejar la huella digital
    if trabajador_data.get('huellaDigital'):
        try:
            huella_digital = base64.b64decode(trabajador_data['huellaDigital'].split(',')[1] if ',' in trabajador_data['huellaDigital'] else trabajador_data['huellaDigital'])
            trabajador_data['huellaDigital'] = huella_digital
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Error al procesar la huella digital"
            )
    
    # Manejar la contraseña si existe
    if trabajador_data.get('password'):
        trabajador_data['hashed_password'] = get_password_hash(trabajador_data['password'])
        del trabajador_data['password']
    else:
        trabajador_data['hashed_password'] = None
    
    # Crear el trabajador
    db_trabajador = Trabajador(**trabajador_data)
    db.add(db_trabajador)
    db.commit()
    db.refresh(db_trabajador)
    
    return db_trabajador

@router.get("/trabajadores", response_model=List[TrabajadorOut])
def get_trabajadores(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    nombre: Optional[str] = Query(None, description="Filtrar por nombre, apellido paterno o materno"),
    departamento: Optional[int] = Query(None, description="Filtrar por ID de departamento"),
    rfc: Optional[str] = Query(None, description="Filtrar por RFC"),
    estado: Optional[bool] = Query(None, description="Filtrar por estado activo/inactivo"),
    db: Session = Depends(get_db),
    current_user: Trabajador = Depends(get_current_trabajador)
):
    query = db.query(Trabajador)
    
    # Aplicar filtros si se proporcionan
    if nombre:
        search_term = f"%{nombre}%"
        query = query.filter(
            (Trabajador.nombre.ilike(search_term)) | 
            (Trabajador.apellidoPaterno.ilike(search_term)) | 
            (Trabajador.apellidoMaterno.ilike(search_term))
        )
    
    if departamento:
        query = query.filter(Trabajador.departamento == departamento)
    
    if rfc:
        query = query.filter(Trabajador.rfc.ilike(f"%{rfc}%"))
    
    if estado is not None:
        query = query.filter(Trabajador.estado == estado)
    
    # Obtener el total para paginación
    total = query.count()
    
    # Aplicar paginación
    trabajadores = query.offset(skip).limit(limit).all()
    
    return trabajadores

@router.get("/trabajadores/{trabajador_id}", response_model=TrabajadorOut)
def get_trabajador_by_id(
    trabajador_id: int, 
    db: Session = Depends(get_db),
    current_user: Trabajador = Depends(get_current_trabajador)
):
    trabajador = db.query(Trabajador).filter(Trabajador.id == trabajador_id).first()
    if not trabajador:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Trabajador con ID {trabajador_id} no encontrado"
        )
    return trabajador

@router.put("/trabajadores/{trabajador_id}", response_model=TrabajadorOut)
def update_trabajador(
    trabajador_id: int, 
    trabajador_update: TrabajadorUpdate, 
    db: Session = Depends(get_db),
    current_user: Trabajador = Depends(check_admin_permissions)
):
    db_trabajador = db.query(Trabajador).filter(Trabajador.id == trabajador_id).first()
    if not db_trabajador:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Trabajador con ID {trabajador_id} no encontrado"
        )
    
    # Actualizar campos si están presentes en la solicitud
    update_data = trabajador_update.dict(exclude_unset=True)
    
    # Manejar el campo de huella digital si está presente
    if "huellaDigital" in update_data and update_data["huellaDigital"]:
        try:
            huella_data = update_data["huellaDigital"]
            if isinstance(huella_data, str) and huella_data.startswith('data:'):
                huella_data = huella_data.split(',')[1]
            update_data["huellaDigital"] = base64.b64decode(huella_data)
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Error al procesar la huella digital"
            )
    
    # Manejar contraseña si está presente
    if "password" in update_data and update_data["password"]:
        update_data["hashed_password"] = get_password_hash(update_data["password"])
        del update_data["password"]
    
    for key, value in update_data.items():
        setattr(db_trabajador, key, value)
    
    db.commit()
    db.refresh(db_trabajador)
    return db_trabajador

@router.delete("/trabajadores/{trabajador_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_trabajador(
    trabajador_id: int, 
    db: Session = Depends(get_db),
    current_user: Trabajador = Depends(check_admin_permissions)
):
    db_trabajador = db.query(Trabajador).filter(Trabajador.id == trabajador_id).first()
    if not db_trabajador:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Trabajador con ID {trabajador_id} no encontrado"
        )
    
    # En lugar de eliminar físicamente, marcar como inactivo
    db_trabajador.estado = False
    db.commit()
    return None

# Endpoint para obtener trabajadores con información adicional (para listas)
@router.get("/trabajadores-lista")
def get_trabajadores_lista(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    search: Optional[str] = Query(None, description="Búsqueda general"),
    db: Session = Depends(get_db),
    current_user: Trabajador = Depends(get_current_trabajador)
):
    """
    Endpoint optimizado para obtener lista de trabajadores con información mínima necesaria
    """
    query = db.query(
        Trabajador.id,
        Trabajador.nombre,
        Trabajador.apellidoPaterno,
        Trabajador.apellidoMaterno,
        Trabajador.rfc,
        Trabajador.puesto,
        Trabajador.estado,
        Trabajador.correo,
        Departamento.descripcion.label('departamento_nombre')
    ).join(
        Departamento, Trabajador.departamento == Departamento.id, isouter=True
    )
    
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            (Trabajador.nombre.ilike(search_term)) |
            (Trabajador.apellidoPaterno.ilike(search_term)) |
            (Trabajador.apellidoMaterno.ilike(search_term)) |
            (Trabajador.rfc.ilike(search_term)) |
            (Trabajador.puesto.ilike(search_term))
        )
    
    total = query.count()
    trabajadores = query.offset(skip).limit(limit).all()
    
    # Formatear la respuesta
    result = []
    for trabajador in trabajadores:
        result.append({
            "id": trabajador.id,
            "nombre": trabajador.nombre,
            "apellidoPaterno": trabajador.apellidoPaterno,
            "apellidoMaterno": trabajador.apellidoMaterno,
            "nombreCompleto": f"{trabajador.nombre} {trabajador.apellidoPaterno} {trabajador.apellidoMaterno}",
            "rfc": trabajador.rfc,
            "puesto": trabajador.puesto,
            "estado": trabajador.estado,
            "correo": trabajador.correo,
            "departamento": trabajador.departamento_nombre or "Sin asignar"
        })
    
    return {
        "trabajadores": result,
        "total": total,
        "skip": skip,
        "limit": limit
    }