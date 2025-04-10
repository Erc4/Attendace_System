from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, date, time
from app.database import get_db
from app.models.models import (
    Justificacion, 
    ReglaJustificacion, 
    Trabajador,
    RegistroAsistencia
)
from app.schemas.schemas import (
    JustificacionCreate,
    JustificacionUpdate,
    JustificacionOut,
    ReglaJustificacionCreate,
    ReglaJustificacionUpdate,
    ReglaJustificacionOut
)
from app.services.auth_service import get_current_trabajador, check_admin_permissions

router = APIRouter()

# Rutas para Justificaciones
@router.post("/justificaciones", response_model=JustificacionOut, status_code=status.HTTP_201_CREATED)
def create_justificacion(
    justificacion: JustificacionCreate, 
    db: Session = Depends(get_db),
    current_user: Trabajador = Depends(check_admin_permissions)
):
    # Verificar si el trabajador existe
    trabajador = db.query(Trabajador).filter(Trabajador.id == justificacion.id_empleado).first()
    if not trabajador:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Trabajador con ID {justificacion.id_empleado} no existe"
        )
    
    # Verificar si la regla de justificación existe
    regla = db.query(ReglaJustificacion).filter(ReglaJustificacion.id == justificacion.id_descripcion).first()
    if not regla:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Regla de justificación con ID {justificacion.id_descripcion} no existe"
        )
    
    # Crear la justificación
    db_justificacion = Justificacion(**justificacion.dict())
    db.add(db_justificacion)
    
    # Actualizar el registro de asistencia si existe
    fecha_inicio = datetime.combine(justificacion.fecha.date(), time.min)
    fecha_fin = datetime.combine(justificacion.fecha.date(), time.max)
    
    registro_asistencia = db.query(RegistroAsistencia).filter(
        RegistroAsistencia.id_empleado == justificacion.id_empleado,
        RegistroAsistencia.fecha >= fecha_inicio,
        RegistroAsistencia.fecha <= fecha_fin
    ).first()
    
    if registro_asistencia:
        # Si el registro ya existe, actualizarlo a JUSTIFICADO
        registro_asistencia.estatus = "JUSTIFICADO"
    else:
        # Si no existe, crear un nuevo registro
        nuevo_registro = RegistroAsistencia(
            id_empleado=justificacion.id_empleado,
            fecha=justificacion.fecha,
            estatus="JUSTIFICADO"
        )
        db.add(nuevo_registro)
    
    db.commit()
    db.refresh(db_justificacion)
    return db_justificacion

@router.get("/justificaciones", response_model=List[JustificacionOut])
def get_justificaciones(
    skip: int = 0, 
    limit: int = 100,
    fecha_inicio: Optional[date] = None,
    fecha_fin: Optional[date] = None,
    id_empleado: Optional[int] = None,
    id_descripcion: Optional[int] = None, 
    db: Session = Depends(get_db),
    current_user: Trabajador = Depends(get_current_trabajador)
):
    query = db.query(Justificacion)
    
    # Aplicar filtros si se proporcionan
    if fecha_inicio:
        query = query.filter(Justificacion.fecha >= datetime.combine(fecha_inicio, time.min))
    
    if fecha_fin:
        query = query.filter(Justificacion.fecha <= datetime.combine(fecha_fin, time.max))
    
    if id_empleado:
        query = query.filter(Justificacion.id_empleado == id_empleado)
    
    if id_descripcion:
        query = query.filter(Justificacion.id_descripcion == id_descripcion)
    
    return query.offset(skip).limit(limit).all()

@router.get("/justificaciones/{justificacion_id}", response_model=JustificacionOut)
def get_justificacion_by_id(
    justificacion_id: int, 
    db: Session = Depends(get_db),
    current_user: Trabajador = Depends(get_current_trabajador)
):
    justificacion = db.query(Justificacion).filter(Justificacion.id == justificacion_id).first()
    if not justificacion:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Justificación con ID {justificacion_id} no encontrada"
        )
    return justificacion

@router.put("/justificaciones/{justificacion_id}", response_model=JustificacionOut)
def update_justificacion(
    justificacion_id: int, 
    justificacion_update: JustificacionUpdate, 
    db: Session = Depends(get_db),
    current_user: Trabajador = Depends(check_admin_permissions)
):
    db_justificacion = db.query(Justificacion).filter(Justificacion.id == justificacion_id).first()
    if not db_justificacion:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Justificación con ID {justificacion_id} no encontrada"
        )
    
    # Actualizar campos si están presentes en la solicitud
    update_data = justificacion_update.dict(exclude_unset=True)
    
    for key, value in update_data.items():
        setattr(db_justificacion, key, value)
    
    db.commit()
    db.refresh(db_justificacion)
    return db_justificacion

@router.delete("/justificaciones/{justificacion_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_justificacion(
    justificacion_id: int, 
    db: Session = Depends(get_db),
    current_user: Trabajador = Depends(check_admin_permissions)
):
    db_justificacion = db.query(Justificacion).filter(Justificacion.id == justificacion_id).first()
    if not db_justificacion:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Justificación con ID {justificacion_id} no encontrada"
        )
    
    # Obtener y actualizar el registro de asistencia correspondiente si existe
    fecha_inicio = datetime.combine(db_justificacion.fecha.date(), time.min)
    fecha_fin = datetime.combine(db_justificacion.fecha.date(), time.max)
    
    registro_asistencia = db.query(RegistroAsistencia).filter(
        RegistroAsistencia.id_empleado == db_justificacion.id_empleado,
        RegistroAsistencia.fecha >= fecha_inicio,
        RegistroAsistencia.fecha <= fecha_fin
    ).first()
    
    if registro_asistencia and registro_asistencia.estatus == "JUSTIFICADO":
        # Si hay un registro de asistencia justificado, actualizarlo a FALTA
        registro_asistencia.estatus = "FALTA"
    
    db.delete(db_justificacion)
    db.commit()
    return None

# Rutas para Reglas de Justificación
@router.post("/reglas-justificacion", response_model=ReglaJustificacionOut, status_code=status.HTTP_201_CREATED)
def create_regla_justificacion(
    regla: ReglaJustificacionCreate, 
    db: Session = Depends(get_db),
    current_user: Trabajador = Depends(check_admin_permissions)
):
    db_regla = ReglaJustificacion(**regla.dict())
    db.add(db_regla)
    db.commit()
    db.refresh(db_regla)
    return db_regla

@router.get("/reglas-justificacion", response_model=List[ReglaJustificacionOut])
def get_reglas_justificacion(
    skip: int = 0, 
    limit: int = 100, 
    db: Session = Depends(get_db),
    current_user: Trabajador = Depends(get_current_trabajador)
):
    return db.query(ReglaJustificacion).offset(skip).limit(limit).all()

@router.put("/reglas-justificacion/{regla_id}", response_model=ReglaJustificacionOut)
def update_regla_justificacion(
    regla_id: int, 
    regla_update: ReglaJustificacionUpdate, 
    db: Session = Depends(get_db),
    current_user: Trabajador = Depends(check_admin_permissions)
):
    db_regla = db.query(ReglaJustificacion).filter(ReglaJustificacion.id == regla_id).first()
    if not db_regla:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Regla de justificación con ID {regla_id} no encontrada"
        )
    
    # Actualizar campos si están presentes en la solicitud
    update_data = regla_update.dict(exclude_unset=True)
    
    for key, value in update_data.items():
        setattr(db_regla, key, value)
    
    db.commit()
    db.refresh(db_regla)
    return db_regla

@router.delete("/reglas-justificacion/{regla_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_regla_justificacion(
    regla_id: int, 
    db: Session = Depends(get_db),
    current_user: Trabajador = Depends(check_admin_permissions)
):
    db_regla = db.query(ReglaJustificacion).filter(ReglaJustificacion.id == regla_id).first()
    if not db_regla:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Regla de justificación con ID {regla_id} no encontrada"
        )
    
    # Verificar si hay justificaciones que usan esta regla
    justificaciones = db.query(Justificacion).filter(Justificacion.id_descripcion == regla_id).first()
    if justificaciones:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"No se puede eliminar la regla de justificación porque está siendo utilizada"
        )
    
    db.delete(db_regla)
    db.commit()
    return None