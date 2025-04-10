from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, date, time, timedelta
from app.database import get_db
from app.models.models import (
    RegistroAsistencia, 
    Trabajador, 
    ReglaRetardo
)
from app.schemas.schemas import (
    RegistroAsistenciaCreate,
    RegistroAsistenciaUpdate,
    RegistroAsistenciaOut,
    ReglaRetardoCreate,
    ReglaRetardoUpdate,
    ReglaRetardoOut
)
from app.services.auth_service import get_current_trabajador, check_admin_permissions
from app.services.biometrico_service import determine_attendance_status

router = APIRouter()

# Rutas para Registro de Asistencia
@router.post("/asistencias", response_model=RegistroAsistenciaOut, status_code=status.HTTP_201_CREATED)
def create_asistencia(
    asistencia: RegistroAsistenciaCreate, 
    db: Session = Depends(get_db),
    current_user: Trabajador = Depends(check_admin_permissions)
):
    # Verificar si el trabajador existe
    trabajador = db.query(Trabajador).filter(Trabajador.id == asistencia.id_empleado).first()
    if not trabajador:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Trabajador con ID {asistencia.id_empleado} no existe"
        )
    
    # Crear el registro de asistencia
    db_asistencia = RegistroAsistencia(**asistencia.dict())
    db.add(db_asistencia)
    db.commit()
    db.refresh(db_asistencia)
    return db_asistencia

@router.get("/asistencias", response_model=List[RegistroAsistenciaOut])
def get_asistencias(
    skip: int = 0, 
    limit: int = 100,
    fecha_inicio: Optional[date] = None,
    fecha_fin: Optional[date] = None,
    id_empleado: Optional[int] = None,
    estatus: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: Trabajador = Depends(get_current_trabajador)
):
    query = db.query(RegistroAsistencia)
    
    # Aplicar filtros si se proporcionan
    if fecha_inicio:
        query = query.filter(RegistroAsistencia.fecha >= datetime.combine(fecha_inicio, time.min))
    
    if fecha_fin:
        query = query.filter(RegistroAsistencia.fecha <= datetime.combine(fecha_fin, time.max))
    
    if id_empleado:
        query = query.filter(RegistroAsistencia.id_empleado == id_empleado)
    
    if estatus:
        query = query.filter(RegistroAsistencia.estatus == estatus)
    
    return query.offset(skip).limit(limit).all()

@router.get("/asistencias/{asistencia_id}", response_model=RegistroAsistenciaOut)
def get_asistencia_by_id(
    asistencia_id: int, 
    db: Session = Depends(get_db),
    current_user: Trabajador = Depends(get_current_trabajador)
):
    asistencia = db.query(RegistroAsistencia).filter(RegistroAsistencia.id == asistencia_id).first()
    if not asistencia:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Registro de asistencia con ID {asistencia_id} no encontrado"
        )
    return asistencia

@router.put("/asistencias/{asistencia_id}", response_model=RegistroAsistenciaOut)
def update_asistencia(
    asistencia_id: int, 
    asistencia_update: RegistroAsistenciaUpdate, 
    db: Session = Depends(get_db),
    current_user: Trabajador = Depends(check_admin_permissions)
):
    db_asistencia = db.query(RegistroAsistencia).filter(RegistroAsistencia.id == asistencia_id).first()
    if not db_asistencia:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Registro de asistencia con ID {asistencia_id} no encontrado"
        )
    
    # Actualizar campos si están presentes en la solicitud
    update_data = asistencia_update.dict(exclude_unset=True)
    
    for key, value in update_data.items():
        setattr(db_asistencia, key, value)
    
    db.commit()
    db.refresh(db_asistencia)
    return db_asistencia

@router.delete("/asistencias/{asistencia_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_asistencia(
    asistencia_id: int, 
    db: Session = Depends(get_db),
    current_user: Trabajador = Depends(check_admin_permissions)
):
    db_asistencia = db.query(RegistroAsistencia).filter(RegistroAsistencia.id == asistencia_id).first()
    if not db_asistencia:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Registro de asistencia con ID {asistencia_id} no encontrado"
        )
    
    db.delete(db_asistencia)
    db.commit()
    return None

# Rutas para consulta de asistencias especiales
@router.get("/asistencias/trabajador/{trabajador_id}")
def get_asistencias_by_trabajador(
    trabajador_id: int,
    fecha_inicio: Optional[date] = None,
    fecha_fin: Optional[date] = None,
    db: Session = Depends(get_db),
    current_user: Trabajador = Depends(get_current_trabajador)
):
    # Verificar si el trabajador existe
    trabajador = db.query(Trabajador).filter(Trabajador.id == trabajador_id).first()
    if not trabajador:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Trabajador con ID {trabajador_id} no encontrado"
        )
    
    # Configurar fechas por defecto si no se proporcionan
    if not fecha_inicio:
        fecha_inicio = date.today() - timedelta(days=30)  # Últimos 30 días por defecto
    
    if not fecha_fin:
        fecha_fin = date.today()
    
    # Consultar asistencias
    asistencias = db.query(RegistroAsistencia).filter(
        RegistroAsistencia.id_empleado == trabajador_id,
        RegistroAsistencia.fecha >= datetime.combine(fecha_inicio, time.min),
        RegistroAsistencia.fecha <= datetime.combine(fecha_fin, time.max)
    ).all()
    
    # Calcular estadísticas
    total_dias = (fecha_fin - fecha_inicio).days + 1
    asistencias_count = sum(1 for a in asistencias if a.estatus == "ASISTENCIA")
    retardos_count = sum(1 for a in asistencias if "RETARDO" in a.estatus)
    faltas_count = sum(1 for a in asistencias if a.estatus == "FALTA")
    
    return {
        "trabajador": {
            "id": trabajador.id,
            "nombre": f"{trabajador.nombre} {trabajador.apellidoPaterno} {trabajador.apellidoMaterno}",
            "rfc": trabajador.rfc
        },
        "periodo": {
            "fecha_inicio": fecha_inicio,
            "fecha_fin": fecha_fin,
            "total_dias": total_dias
        },
        "estadisticas": {
            "asistencias": asistencias_count,
            "retardos": retardos_count,
            "faltas": faltas_count,
            "porcentaje_asistencia": (asistencias_count / total_dias) * 100 if total_dias > 0 else 0
        },
        "registros": asistencias
    }

@router.get("/asistencias/hoy")
def get_asistencias_hoy(
    db: Session = Depends(get_db),
    current_user: Trabajador = Depends(get_current_trabajador)
):
    # Obtener la fecha de hoy
    hoy_inicio = datetime.combine(date.today(), time.min)
    hoy_fin = datetime.combine(date.today(), time.max)
    
    # Consultar asistencias de hoy
    asistencias = db.query(RegistroAsistencia).filter(
        RegistroAsistencia.fecha >= hoy_inicio,
        RegistroAsistencia.fecha <= hoy_fin
    ).all()
    
    # Obtener todos los trabajadores
    trabajadores = db.query(Trabajador).filter(Trabajador.estado == True).all()
    
    # Preparar la respuesta
    asistencias_por_trabajador = {}
    for asistencia in asistencias:
        asistencias_por_trabajador[asistencia.id_empleado] = asistencia.estatus
    
    resultado = []
    for trabajador in trabajadores:
        estatus = asistencias_por_trabajador.get(trabajador.id, "NO_REGISTRADO")
        resultado.append({
            "id": trabajador.id,
            "nombre": f"{trabajador.nombre} {trabajador.apellidoPaterno} {trabajador.apellidoMaterno}",
            "departamento": trabajador.departamento,
            "puesto": trabajador.puesto,
            "estatus": estatus,
            "hora_registro": next((a.fecha for a in asistencias if a.id_empleado == trabajador.id), None)
        })
    
    # Estadísticas generales
    total_trabajadores = len(trabajadores)
    asistencias_count = sum(1 for r in resultado if r["estatus"] == "ASISTENCIA")
    retardos_count = sum(1 for r in resultado if "RETARDO" in r["estatus"])
    faltas_count = sum(1 for r in resultado if r["estatus"] == "FALTA")
    no_registrados = sum(1 for r in resultado if r["estatus"] == "NO_REGISTRADO")
    
    return {
        "fecha": date.today(),
        "estadisticas": {
            "total_trabajadores": total_trabajadores,
            "asistencias": asistencias_count,
            "retardos": retardos_count,
            "faltas": faltas_count,
            "no_registrados": no_registrados,
            "porcentaje_asistencia": (asistencias_count / total_trabajadores) * 100 if total_trabajadores > 0 else 0
        },
        "registros": resultado
    }

# Rutas para Reglas de Retardo
@router.post("/reglas-retardo", response_model=ReglaRetardoOut, status_code=status.HTTP_201_CREATED)
def create_regla_retardo(
    regla: ReglaRetardoCreate, 
    db: Session = Depends(get_db),
    current_user: Trabajador = Depends(check_admin_permissions)
):
    db_regla = ReglaRetardo(**regla.dict())
    db.add(db_regla)
    db.commit()
    db.refresh(db_regla)
    return db_regla

@router.get("/reglas-retardo", response_model=List[ReglaRetardoOut])
def get_reglas_retardo(
    skip: int = 0, 
    limit: int = 100, 
    db: Session = Depends(get_db),
    current_user: Trabajador = Depends(get_current_trabajador)
):
    return db.query(ReglaRetardo).offset(skip).limit(limit).all()

@router.put("/reglas-retardo/{regla_id}", response_model=ReglaRetardoOut)
def update_regla_retardo(
    regla_id: int, 
    regla_update: ReglaRetardoUpdate, 
    db: Session = Depends(get_db),
    current_user: Trabajador = Depends(check_admin_permissions)
):
    db_regla = db.query(ReglaRetardo).filter(ReglaRetardo.id == regla_id).first()
    if not db_regla:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Regla de retardo con ID {regla_id} no encontrada"
        )
    
    # Actualizar campos si están presentes en la solicitud
    update_data = regla_update.dict(exclude_unset=True)
    
    for key, value in update_data.items():
        setattr(db_regla, key, value)
    
    db.commit()
    db.refresh(db_regla)
    return db_regla

@router.delete("/reglas-retardo/{regla_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_regla_retardo(
    regla_id: int, 
    db: Session = Depends(get_db),
    current_user: Trabajador = Depends(check_admin_permissions)
):
    db_regla = db.query(ReglaRetardo).filter(ReglaRetardo.id == regla_id).first()
    if not db_regla:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Regla de retardo con ID {regla_id} no encontrada"
        )
    
    db.delete(db_regla)
    db.commit()
    return None