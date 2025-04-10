from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, date, time
from app.database import get_db
from app.models.models import (
    Horario, 
    AsignacionHorario, 
    Trabajador,
    DiaFestivo,
    CentroTrabajo
)
from app.schemas.schemas import (
    HorarioCreate,
    HorarioUpdate,
    HorarioOut,
    AsignacionHorarioCreate,
    AsignacionHorarioUpdate,
    AsignacionHorarioOut,
    DiaFestivoCreate,
    DiaFestivoUpdate,
    DiaFestivoOut,
    CentroTrabajoCreate,
    CentroTrabajoUpdate,
    CentroTrabajoOut
)
from app.services.auth_service import get_current_trabajador, check_admin_permissions
import base64

router = APIRouter()

# Rutas para Horarios
@router.post("/horarios", response_model=HorarioOut, status_code=status.HTTP_201_CREATED)
def create_horario(
    horario: HorarioCreate, 
    db: Session = Depends(get_db),
    current_user: Trabajador = Depends(check_admin_permissions)
):
    db_horario = Horario(**horario.dict())
    db.add(db_horario)
    db.commit()
    db.refresh(db_horario)
    return db_horario

@router.get("/horarios", response_model=List[HorarioOut])
def get_horarios(
    skip: int = 0, 
    limit: int = 100, 
    db: Session = Depends(get_db),
    current_user: Trabajador = Depends(get_current_trabajador)
):
    return db.query(Horario).offset(skip).limit(limit).all()

@router.get("/horarios/{horario_id}", response_model=HorarioOut)
def get_horario_by_id(
    horario_id: int, 
    db: Session = Depends(get_db),
    current_user: Trabajador = Depends(get_current_trabajador)
):
    horario = db.query(Horario).filter(Horario.id == horario_id).first()
    if not horario:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Horario con ID {horario_id} no encontrado"
        )
    return horario

@router.put("/horarios/{horario_id}", response_model=HorarioOut)
def update_horario(
    horario_id: int, 
    horario_update: HorarioUpdate, 
    db: Session = Depends(get_db),
    current_user: Trabajador = Depends(check_admin_permissions)
):
    db_horario = db.query(Horario).filter(Horario.id == horario_id).first()
    if not db_horario:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Horario con ID {horario_id} no encontrado"
        )
    
    # Actualizar campos si están presentes en la solicitud
    update_data = horario_update.dict(exclude_unset=True)
    
    for key, value in update_data.items():
        setattr(db_horario, key, value)
    
    db.commit()
    db.refresh(db_horario)
    return db_horario

@router.delete("/horarios/{horario_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_horario(
    horario_id: int, 
    db: Session = Depends(get_db),
    current_user: Trabajador = Depends(check_admin_permissions)
):
    db_horario = db.query(Horario).filter(Horario.id == horario_id).first()
    if not db_horario:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Horario con ID {horario_id} no encontrado"
        )
    
    # Verificar si hay trabajadores que usan este horario
    trabajadores = db.query(Trabajador).filter(Trabajador.id_horario == horario_id).first()
    if trabajadores:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"No se puede eliminar el horario porque está asignado a uno o más trabajadores"
        )
    
    # Verificar si hay asignaciones de horario
    asignaciones = db.query(AsignacionHorario).filter(AsignacionHorario.id_horario == horario_id).first()
    if asignaciones:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"No se puede eliminar el horario porque tiene asignaciones históricas"
        )
    
    db.delete(db_horario)
    db.commit()
    return None

# Rutas para Asignación de Horarios
@router.post("/asignacion-horarios", response_model=AsignacionHorarioOut, status_code=status.HTTP_201_CREATED)
def create_asignacion_horario(
    asignacion: AsignacionHorarioCreate, 
    db: Session = Depends(get_db),
    current_user: Trabajador = Depends(check_admin_permissions)
):
    # Verificar que exista el trabajador
    trabajador = db.query(Trabajador).filter(Trabajador.id == asignacion.id_trabajador).first()
    if not trabajador:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Trabajador con ID {asignacion.id_trabajador} no existe"
        )
    
    # Verificar que exista el horario
    horario = db.query(Horario).filter(Horario.id == asignacion.id_horario).first()
    if not horario:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Horario con ID {asignacion.id_horario} no existe"
        )
    
    # Crear la asignación
    db_asignacion = AsignacionHorario(**asignacion.dict())
    db.add(db_asignacion)
    
    # Actualizar el horario del trabajador
    trabajador.id_horario = asignacion.id_horario
    
    db.commit()
    db.refresh(db_asignacion)
    return db_asignacion

@router.get("/asignacion-horarios", response_model=List[AsignacionHorarioOut])
def get_asignacion_horarios(
    skip: int = 0, 
    limit: int = 100,
    id_trabajador: Optional[int] = None,
    id_horario: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: Trabajador = Depends(get_current_trabajador)
):
    query = db.query(AsignacionHorario)
    
    # Aplicar filtros si se proporcionan
    if id_trabajador:
        query = query.filter(AsignacionHorario.id_trabajador == id_trabajador)
    
    if id_horario:
        query = query.filter(AsignacionHorario.id_horario == id_horario)
    
    return query.offset(skip).limit(limit).all()

@router.get("/asignacion-horarios/{asignacion_id}", response_model=AsignacionHorarioOut)
def get_asignacion_horario_by_id(
    asignacion_id: int, 
    db: Session = Depends(get_db),
    current_user: Trabajador = Depends(get_current_trabajador)
):
    asignacion = db.query(AsignacionHorario).filter(AsignacionHorario.id == asignacion_id).first()
    if not asignacion:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Asignación de horario con ID {asignacion_id} no encontrada"
        )
    return asignacion

@router.delete("/asignacion-horarios/{asignacion_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_asignacion_horario(
    asignacion_id: int, 
    db: Session = Depends(get_db),
    current_user: Trabajador = Depends(check_admin_permissions)
):
    db_asignacion = db.query(AsignacionHorario).filter(AsignacionHorario.id == asignacion_id).first()
    if not db_asignacion:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Asignación de horario con ID {asignacion_id} no encontrada"
        )
    
    db.delete(db_asignacion)
    db.commit()
    return None

# Rutas para Días Festivos
@router.post("/dias-festivos", response_model=DiaFestivoOut, status_code=status.HTTP_201_CREATED)
def create_dia_festivo(
    dia_festivo: DiaFestivoCreate, 
    db: Session = Depends(get_db),
    current_user: Trabajador = Depends(check_admin_permissions)
):
    # Verificar si ya existe un día festivo en esa fecha
    fecha_inicio = datetime.combine(dia_festivo.fecha.date(), time.min)
    fecha_fin = datetime.combine(dia_festivo.fecha.date(), time.max)
    
    existente = db.query(DiaFestivo).filter(
        DiaFestivo.fecha >= fecha_inicio,
        DiaFestivo.fecha <= fecha_fin
    ).first()
    
    if existente:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Ya existe un día festivo registrado para la fecha {dia_festivo.fecha.date()}"
        )
    
    db_dia_festivo = DiaFestivo(**dia_festivo.dict())
    db.add(db_dia_festivo)
    db.commit()
    db.refresh(db_dia_festivo)
    return db_dia_festivo

@router.get("/dias-festivos", response_model=List[DiaFestivoOut])
def get_dias_festivos(
    skip: int = 0, 
    limit: int = 100,
    fecha_inicio: Optional[date] = None,
    fecha_fin: Optional[date] = None,
    db: Session = Depends(get_db),
    current_user: Trabajador = Depends(get_current_trabajador)
):
    query = db.query(DiaFestivo)
    
    # Aplicar filtros si se proporcionan
    if fecha_inicio:
        query = query.filter(DiaFestivo.fecha >= datetime.combine(fecha_inicio, time.min))
    
    if fecha_fin:
        query = query.filter(DiaFestivo.fecha <= datetime.combine(fecha_fin, time.max))
    
    return query.offset(skip).limit(limit).all()

@router.get("/dias-festivos/{dia_festivo_id}", response_model=DiaFestivoOut)
def get_dia_festivo_by_id(
    dia_festivo_id: int, 
    db: Session = Depends(get_db),
    current_user: Trabajador = Depends(get_current_trabajador)
):
    dia_festivo = db.query(DiaFestivo).filter(DiaFestivo.id == dia_festivo_id).first()
    if not dia_festivo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Día festivo con ID {dia_festivo_id} no encontrado"
        )
    return dia_festivo

@router.put("/dias-festivos/{dia_festivo_id}", response_model=DiaFestivoOut)
def update_dia_festivo(
    dia_festivo_id: int, 
    dia_festivo_update: DiaFestivoUpdate, 
    db: Session = Depends(get_db),
    current_user: Trabajador = Depends(check_admin_permissions)
):
    db_dia_festivo = db.query(DiaFestivo).filter(DiaFestivo.id == dia_festivo_id).first()
    if not db_dia_festivo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Día festivo con ID {dia_festivo_id} no encontrado"
        )
    
    # Actualizar campos si están presentes en la solicitud
    update_data = dia_festivo_update.dict(exclude_unset=True)
    
    # Si se actualiza la fecha, verificar que no exista otro día festivo en esa fecha
    if "fecha" in update_data and update_data["fecha"] != db_dia_festivo.fecha:
        fecha_inicio = datetime.combine(update_data["fecha"].date(), time.min)
        fecha_fin = datetime.combine(update_data["fecha"].date(), time.max)
        
        existente = db.query(DiaFestivo).filter(
            DiaFestivo.fecha >= fecha_inicio,
            DiaFestivo.fecha <= fecha_fin,
            DiaFestivo.id != dia_festivo_id
        ).first()
        
        if existente:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Ya existe un día festivo registrado para la fecha {update_data['fecha'].date()}"
            )
    
    for key, value in update_data.items():
        setattr(db_dia_festivo, key, value)
    
    db.commit()
    db.refresh(db_dia_festivo)
    return db_dia_festivo

@router.delete("/dias-festivos/{dia_festivo_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_dia_festivo(
    dia_festivo_id: int, 
    db: Session = Depends(get_db),
    current_user: Trabajador = Depends(check_admin_permissions)
):
    db_dia_festivo = db.query(DiaFestivo).filter(DiaFestivo.id == dia_festivo_id).first()
    if not db_dia_festivo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Día festivo con ID {dia_festivo_id} no encontrado"
        )
    
    db.delete(db_dia_festivo)
    db.commit()
    return None

# Rutas para Centros de Trabajo
@router.post("/centros-trabajo", response_model=CentroTrabajoOut, status_code=status.HTTP_201_CREATED)
def create_centro_trabajo(
    centro_trabajo: CentroTrabajoCreate, 
    db: Session = Depends(get_db),
    current_user: Trabajador = Depends(check_admin_permissions)
):
    # Verificar si ya existe un centro de trabajo con la misma clave
    existente = db.query(CentroTrabajo).filter(CentroTrabajo.claveCT == centro_trabajo.claveCT).first()
    if existente:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Ya existe un centro de trabajo con la clave {centro_trabajo.claveCT}"
        )
    
    # Convertir el logo de base64 a bytes
    logo_bytes = base64.b64decode(centro_trabajo.logo)
    
    # Crear un nuevo objeto CentroTrabajo
    db_centro_trabajo = CentroTrabajo(
        claveCT=centro_trabajo.claveCT,
        entidadFederativa=centro_trabajo.entidadFederativa,
        ubicacion=centro_trabajo.ubicacion,
        nivel=centro_trabajo.nivel,
        plantel=centro_trabajo.plantel,
        logo=logo_bytes
    )
    
    db.add(db_centro_trabajo)
    db.commit()
    db.refresh(db_centro_trabajo)
    return db_centro_trabajo

@router.get("/centros-trabajo", response_model=List[CentroTrabajoOut])
def get_centros_trabajo(
    skip: int = 0, 
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: Trabajador = Depends(get_current_trabajador)
):
    return db.query(CentroTrabajo).offset(skip).limit(limit).all()

@router.get("/centros-trabajo/{centro_trabajo_id}", response_model=CentroTrabajoOut)
def get_centro_trabajo_by_id(
    centro_trabajo_id: int, 
    db: Session = Depends(get_db),
    current_user: Trabajador = Depends(get_current_trabajador)
):
    centro_trabajo = db.query(CentroTrabajo).filter(CentroTrabajo.id == centro_trabajo_id).first()
    if not centro_trabajo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Centro de trabajo con ID {centro_trabajo_id} no encontrado"
        )
    return centro_trabajo

@router.put("/centros-trabajo/{centro_trabajo_id}", response_model=CentroTrabajoOut)
def update_centro_trabajo(
    centro_trabajo_id: int, 
    centro_trabajo_update: CentroTrabajoUpdate, 
    db: Session = Depends(get_db),
    current_user: Trabajador = Depends(check_admin_permissions)
):
    db_centro_trabajo = db.query(CentroTrabajo).filter(CentroTrabajo.id == centro_trabajo_id).first()
    if not db_centro_trabajo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Centro de trabajo con ID {centro_trabajo_id} no encontrado"
        )
    
    # Actualizar campos si están presentes en la solicitud
    update_data = centro_trabajo_update.dict(exclude_unset=True)
    
    # Si se actualiza la clave, verificar que no exista otro centro con esa clave
    if "claveCT" in update_data and update_data["claveCT"] != db_centro_trabajo.claveCT:
        existente = db.query(CentroTrabajo).filter(
            CentroTrabajo.claveCT == update_data["claveCT"],
            CentroTrabajo.id != centro_trabajo_id
        ).first()
        
        if existente:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Ya existe un centro de trabajo con la clave {update_data['claveCT']}"
            )
    
    # Manejar el logo si está presente
    if "logo" in update_data and update_data["logo"]:
        update_data["logo"] = base64.b64decode(update_data["logo"])
    
    for key, value in update_data.items():
        setattr(db_centro_trabajo, key, value)
    
    db.commit()
    db.refresh(db_centro_trabajo)
    return db_centro_trabajo

@router.delete("/centros-trabajo/{centro_trabajo_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_centro_trabajo(
    centro_trabajo_id: int, 
    db: Session = Depends(get_db),
    current_user: Trabajador = Depends(check_admin_permissions)
):
    db_centro_trabajo = db.query(CentroTrabajo).filter(CentroTrabajo.id == centro_trabajo_id).first()
    if not db_centro_trabajo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Centro de trabajo con ID {centro_trabajo_id} no encontrado"
        )
    
    # Verificar si hay trabajadores asignados a este centro
    trabajadores = db.query(Trabajador).filter(Trabajador.id_centroTrabajo == centro_trabajo_id).first()
    if trabajadores:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"No se puede eliminar el centro de trabajo porque tiene trabajadores asignados"
        )
    
    db.delete(db_centro_trabajo)
    db.commit()
    return None