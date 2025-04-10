from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
import base64
from app.database import get_db
from app.models.models import Trabajador, TipoTrabajador, Departamento, GradoEstudio, RolUsuario
from app.schemas.schemas import (
    TrabajadorCreate, 
    TrabajadorUpdate, 
    TrabajadorOut,
    TipoTrabajadorCreate,
    TipoTrabajadorOut,
    DepartamentoCreate,
    DepartamentoOut,
    GradoEstudioCreate,
    GradoEstudioOut,
    RolUsuarioCreate,
    RolUsuarioOut
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
    huella_digital = base64.b64decode(trabajador.huellaDigital)
    hashed_password = get_password_hash(trabajador.password)
    
    # Crear un nuevo objeto Trabajador
    db_trabajador = Trabajador(
        apellidoPaterno=trabajador.apellidoPaterno,
        apellidoMaterno=trabajador.apellidoMaterno,
        nombre=trabajador.nombre,
        id_tipo=trabajador.id_tipo,
        departamento=trabajador.departamento,
        rfc=trabajador.rfc,
        curp=trabajador.curp,
        fechaIngresoSep=trabajador.fechaIngresoSep,
        fechaIngresoRama=trabajador.fechaIngresoRama,
        fechaIngresoGobFed=trabajador.fechaIngresoGobFed,
        puesto=trabajador.puesto,
        id_horario=trabajador.id_horario,
        estado=trabajador.estado,
        id_centroTrabajo=trabajador.id_centroTrabajo,
        id_gradoEstudios=trabajador.id_gradoEstudios,
        titulo=trabajador.titulo,
        cedula=trabajador.cedula,
        escuelaEgreso=trabajador.escuelaEgreso,
        turno=trabajador.turno,
        correo=trabajador.correo,
        huellaDigital=huella_digital,
        id_rol=trabajador.id_rol,
        hashed_password=hashed_password
    )
    
    db.add(db_trabajador)
    db.commit()
    db.refresh(db_trabajador)
    return db_trabajador

@router.get("/trabajadores", response_model=List[TrabajadorOut])
def get_trabajadores(
    skip: int = 0, 
    limit: int = 100, 
    nombre: Optional[str] = None,
    departamento: Optional[int] = None,
    rfc: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: Trabajador = Depends(get_current_trabajador)
):
    query = db.query(Trabajador)
    
    # Aplicar filtros si se proporcionan
    if nombre:
        query = query.filter(
            (Trabajador.nombre.ilike(f"%{nombre}%")) | 
            (Trabajador.apellidoPaterno.ilike(f"%{nombre}%")) | 
            (Trabajador.apellidoMaterno.ilike(f"%{nombre}%"))
        )
    
    if departamento:
        query = query.filter(Trabajador.departamento == departamento)
    
    if rfc:
        query = query.filter(Trabajador.rfc.ilike(f"%{rfc}%"))
    
    return query.offset(skip).limit(limit).all()

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
        update_data["huellaDigital"] = base64.b64decode(update_data["huellaDigital"])
    
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

# Rutas para Tipos de Trabajador
@router.post("/tipos-trabajador", response_model=TipoTrabajadorOut, status_code=status.HTTP_201_CREATED)
def create_tipo_trabajador(
    tipo: TipoTrabajadorCreate, 
    db: Session = Depends(get_db),
    current_user: Trabajador = Depends(check_admin_permissions)
):
    db_tipo = TipoTrabajador(**tipo.dict())
    db.add(db_tipo)
    db.commit()
    db.refresh(db_tipo)
    return db_tipo

@router.get("/tipos-trabajador", response_model=List[TipoTrabajadorOut])
def get_tipos_trabajador(
    skip: int = 0, 
    limit: int = 100, 
    db: Session = Depends(get_db),
    current_user: Trabajador = Depends(get_current_trabajador)
):
    return db.query(TipoTrabajador).offset(skip).limit(limit).all()

# Rutas para Departamentos
@router.post("/departamentos", response_model=DepartamentoOut, status_code=status.HTTP_201_CREATED)
def create_departamento(
    departamento: DepartamentoCreate, 
    db: Session = Depends(get_db),
    current_user: Trabajador = Depends(check_admin_permissions)
):
    db_departamento = Departamento(**departamento.dict())
    db.add(db_departamento)
    db.commit()
    db.refresh(db_departamento)
    return db_departamento

@router.get("/departamentos", response_model=List[DepartamentoOut])
def get_departamentos(
    skip: int = 0, 
    limit: int = 100, 
    db: Session = Depends(get_db),
    current_user: Trabajador = Depends(get_current_trabajador)
):
    return db.query(Departamento).offset(skip).limit(limit).all()

# Rutas para Grados de Estudio
@router.post("/grados-estudio", response_model=GradoEstudioOut, status_code=status.HTTP_201_CREATED)
def create_grado_estudio(
    grado: GradoEstudioCreate, 
    db: Session = Depends(get_db),
    current_user: Trabajador = Depends(check_admin_permissions)
):
    db_grado = GradoEstudio(**grado.dict())
    db.add(db_grado)
    db.commit()
    db.refresh(db_grado)
    return db_grado

@router.get("/grados-estudio", response_model=List[GradoEstudioOut])
def get_grados_estudio(
    skip: int = 0, 
    limit: int = 100, 
    db: Session = Depends(get_db),
    current_user: Trabajador = Depends(get_current_trabajador)
):
    return db.query(GradoEstudio).offset(skip).limit(limit).all()

# Rutas para Roles de Usuario
@router.post("/roles-usuario", response_model=RolUsuarioOut, status_code=status.HTTP_201_CREATED)
def create_rol_usuario(
    rol: RolUsuarioCreate, 
    db: Session = Depends(get_db),
    current_user: Trabajador = Depends(check_admin_permissions)
):
    db_rol = RolUsuario(**rol.dict())
    db.add(db_rol)
    db.commit()
    db.refresh(db_rol)
    return db_rol

@router.get("/roles-usuario", response_model=List[RolUsuarioOut])
def get_roles_usuario(
    skip: int = 0, 
    limit: int = 100, 
    db: Session = Depends(get_db),
    current_user: Trabajador = Depends(get_current_trabajador)
):
    return db.query(RolUsuario).offset(skip).limit(limit).all()