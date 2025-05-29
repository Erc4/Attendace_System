from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models.models import (
    TipoTrabajador, 
    Departamento, 
    GradoEstudio, 
    RolUsuario,
    Horario,
    CentroTrabajo
)
from app.schemas.schemas import (
    TipoTrabajadorCreate,
    TipoTrabajadorOut,
    DepartamentoCreate,
    DepartamentoOut,
    GradoEstudioCreate,
    GradoEstudioOut,
    RolUsuarioCreate,
    RolUsuarioOut,
    HorarioOut,
    CentroTrabajoOut
)
from app.services.auth_service import get_current_trabajador

router = APIRouter()

# Rutas para Tipos de Trabajador
@router.get("/tipos-trabajador", response_model=List[TipoTrabajadorOut])
def get_tipos_trabajador(db: Session = Depends(get_db)):
    return db.query(TipoTrabajador).all()

@router.post("/tipos-trabajador", response_model=TipoTrabajadorOut, status_code=status.HTTP_201_CREATED)
def create_tipo_trabajador(
    tipo: TipoTrabajadorCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_trabajador)
):
    db_tipo = TipoTrabajador(**tipo.dict())
    db.add(db_tipo)
    db.commit()
    db.refresh(db_tipo)
    return db_tipo

# Rutas para Departamentos
@router.get("/departamentos", response_model=List[DepartamentoOut])
def get_departamentos(db: Session = Depends(get_db)):
    return db.query(Departamento).all()

@router.post("/departamentos", response_model=DepartamentoOut, status_code=status.HTTP_201_CREATED)
def create_departamento(
    departamento: DepartamentoCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_trabajador)
):
    db_departamento = Departamento(**departamento.dict())
    db.add(db_departamento)
    db.commit()
    db.refresh(db_departamento)
    return db_departamento

# Rutas para Grados de Estudio
@router.get("/grados-estudio", response_model=List[GradoEstudioOut])
def get_grados_estudio(db: Session = Depends(get_db)):
    return db.query(GradoEstudio).all()

@router.post("/grados-estudio", response_model=GradoEstudioOut, status_code=status.HTTP_201_CREATED)
def create_grado_estudio(
    grado: GradoEstudioCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_trabajador)
):
    db_grado = GradoEstudio(**grado.dict())
    db.add(db_grado)
    db.commit()
    db.refresh(db_grado)
    return db_grado

# Rutas para Roles de Usuario
@router.get("/roles-usuario", response_model=List[RolUsuarioOut])
def get_roles_usuario(db: Session = Depends(get_db)):
    return db.query(RolUsuario).all()

@router.post("/roles-usuario", response_model=RolUsuarioOut, status_code=status.HTTP_201_CREATED)
def create_rol_usuario(
    rol: RolUsuarioCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_trabajador)
):
    db_rol = RolUsuario(**rol.dict())
    db.add(db_rol)
    db.commit()
    db.refresh(db_rol)
    return db_rol

# Rutas para Centros de Trabajo
@router.get("/centros-trabajo", response_model=List[CentroTrabajoOut])
def get_centros_trabajo(db: Session = Depends(get_db)):
    return db.query(CentroTrabajo).all()