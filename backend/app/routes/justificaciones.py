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
    # Logging para debug
    print(f"📝 Datos recibidos para justificación:")
    print(f"   - id_trabajador: {justificacion.id_trabajador}")
    print(f"   - fecha: {justificacion.fecha}")
    print(f"   - id_descripcion: {justificacion.id_descripcion}")
    
    # Verificar si el trabajador existe - CORREGIDO: usar id_trabajador
    trabajador = db.query(Trabajador).filter(Trabajador.id == justificacion.id_trabajador).first()
    if not trabajador:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Trabajador con ID {justificacion.id_trabajador} no existe"
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
    
    # Actualizar el registro de asistencia si existe - CORREGIDO: usar id_trabajador
    fecha_inicio = datetime.combine(justificacion.fecha.date(), time.min)
    fecha_fin = datetime.combine(justificacion.fecha.date(), time.max)
    
    registro_asistencia = db.query(RegistroAsistencia).filter(
        RegistroAsistencia.id_trabajador == justificacion.id_trabajador,  # CORREGIDO
        RegistroAsistencia.fecha >= fecha_inicio,
        RegistroAsistencia.fecha <= fecha_fin
    ).first()
    
    if registro_asistencia:
        # Si el registro ya existe, actualizarlo a JUSTIFICADO
        registro_asistencia.estatus = "JUSTIFICADO"
    else:
        # Si no existe, crear un nuevo registro con status JUSTIFICADO
        nuevo_registro = RegistroAsistencia(
            id_trabajador=justificacion.id_trabajador,  # CORREGIDO
            fecha=justificacion.fecha,
            estatus="JUSTIFICADO"
        )
        db.add(nuevo_registro)
    
    db.commit()
    db.refresh(db_justificacion)
    return db_justificacion

@router.get("/justificaciones")
def get_justificaciones(
    skip: int = 0, 
    limit: int = 100,
    fecha_inicio: Optional[date] = None,
    fecha_fin: Optional[date] = None,
    id_trabajador: Optional[int] = None,  # CORREGIDO: cambio de id_empleado a id_trabajador
    id_descripcion: Optional[int] = None, 
    db: Session = Depends(get_db),
    current_user: Trabajador = Depends(get_current_trabajador)
):
    """
    Obtiene las justificaciones con información completa del trabajador y la regla
    """
    # Hacer JOIN con las tablas relacionadas para obtener información completa
    query = db.query(
        Justificacion,
        Trabajador,
        ReglaJustificacion
    ).join(
        Trabajador, Justificacion.id_trabajador == Trabajador.id
    ).join(
        ReglaJustificacion, Justificacion.id_descripcion == ReglaJustificacion.id
    )
    
    # Aplicar filtros si se proporcionan
    if fecha_inicio:
        query = query.filter(Justificacion.fecha >= datetime.combine(fecha_inicio, time.min))
    
    if fecha_fin:
        query = query.filter(Justificacion.fecha <= datetime.combine(fecha_fin, time.max))
    
    if id_trabajador:
        query = query.filter(Justificacion.id_trabajador == id_trabajador)
    
    if id_descripcion:
        query = query.filter(Justificacion.id_descripcion == id_descripcion)
    
    # Ejecutar la consulta
    resultados = query.offset(skip).limit(limit).all()
    
    # Formatear la respuesta con toda la información necesaria
    justificaciones_completas = []
    for justificacion, trabajador, regla in resultados:
        justificaciones_completas.append({
            "id": justificacion.id,
            "id_trabajador": justificacion.id_trabajador,
            "fecha": justificacion.fecha,
            "id_descripcion": justificacion.id_descripcion,
            "trabajador": {
                "id": trabajador.id,
                "nombre": f"{trabajador.nombre} {trabajador.apellidoPaterno} {trabajador.apellidoMaterno}",
                "rfc": trabajador.rfc,
                "puesto": trabajador.puesto
            },
            "regla_justificacion": {
                "id": regla.id,
                "descripcion": regla.descripcion
            }
        })
    
    return justificaciones_completas

@router.get("/justificaciones/{justificacion_id}")
def get_justificacion(
    justificacion_id: int, 
    db: Session = Depends(get_db),
    current_user: Trabajador = Depends(get_current_trabajador)
):
    """
    Obtiene una justificación específica con información completa
    """
    # Hacer JOIN con las tablas relacionadas
    resultado = db.query(
        Justificacion,
        Trabajador,
        ReglaJustificacion
    ).join(
        Trabajador, Justificacion.id_trabajador == Trabajador.id
    ).join(
        ReglaJustificacion, Justificacion.id_descripcion == ReglaJustificacion.id
    ).filter(
        Justificacion.id == justificacion_id
    ).first()
    
    if not resultado:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Justificación con ID {justificacion_id} no encontrada"
        )
    
    justificacion, trabajador, regla = resultado
    
    return {
        "id": justificacion.id,
        "id_trabajador": justificacion.id_trabajador,
        "fecha": justificacion.fecha,
        "id_descripcion": justificacion.id_descripcion,
        "trabajador": {
            "id": trabajador.id,
            "nombre": f"{trabajador.nombre} {trabajador.apellidoPaterno} {trabajador.apellidoMaterno}",
            "rfc": trabajador.rfc,
            "puesto": trabajador.puesto
        },
        "regla_justificacion": {
            "id": regla.id,
            "descripcion": regla.descripcion
        }
    }

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
    
    # Si se está actualizando el trabajador, verificar que exista
    if 'id_trabajador' in update_data:
        trabajador = db.query(Trabajador).filter(Trabajador.id == update_data['id_trabajador']).first()
        if not trabajador:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Trabajador con ID {update_data['id_trabajador']} no existe"
            )
    
    # Si se está actualizando la regla de justificación, verificar que exista
    if 'id_descripcion' in update_data:
        regla = db.query(ReglaJustificacion).filter(ReglaJustificacion.id == update_data['id_descripcion']).first()
        if not regla:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Regla de justificación con ID {update_data['id_descripcion']} no existe"
            )
    
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
    
    # Obtener y actualizar el registro de asistencia correspondiente si existe - CORREGIDO
    fecha_inicio = datetime.combine(db_justificacion.fecha.date(), time.min)
    fecha_fin = datetime.combine(db_justificacion.fecha.date(), time.max)
    
    registro_asistencia = db.query(RegistroAsistencia).filter(
        RegistroAsistencia.id_trabajador == db_justificacion.id_trabajador,  # CORREGIDO
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

@router.get("/reglas-justificacion/{regla_id}", response_model=ReglaJustificacionOut)
def get_regla_justificacion(
    regla_id: int, 
    db: Session = Depends(get_db),
    current_user: Trabajador = Depends(get_current_trabajador)
):
    db_regla = db.query(ReglaJustificacion).filter(ReglaJustificacion.id == regla_id).first()
    if not db_regla:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Regla de justificación con ID {regla_id} no encontrada"
        )
    return db_regla

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