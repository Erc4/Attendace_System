from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, date, time
from app.database import get_db
from app.models.models import DiaFestivo, RegistroAsistencia
from app.schemas.schemas import (
    DiaFestivoCreate,
    DiaFestivoUpdate,
    DiaFestivoOut
)
from app.services.auth_service import get_current_trabajador, check_admin_permissions
from pydantic import BaseModel, validator
from typing import Union

router = APIRouter()

# Schema mejorado para crear días festivos con validación de fecha
class DiaFestivoCreateValidated(BaseModel):
    fecha: Union[str, date, datetime]
    descripcion: str
    
    @validator('fecha', pre=True)
    def parse_fecha(cls, v):
        """Convierte string o date a datetime"""
        if isinstance(v, str):
            try:
                # Si es string formato YYYY-MM-DD
                if len(v) == 10 and v.count('-') == 2:
                    return datetime.strptime(v, '%Y-%m-%d')
                else:
                    return datetime.fromisoformat(v.replace('Z', '+00:00'))
            except ValueError as e:
                raise ValueError(f"Formato de fecha inválido: {v}. Use YYYY-MM-DD")
        elif isinstance(v, date) and not isinstance(v, datetime):
            return datetime.combine(v, time.min)
        elif isinstance(v, datetime):
            return v
        else:
            raise ValueError(f"Tipo de fecha no soportado: {type(v)}")

# ====== RUTAS CRUD PARA DÍAS FESTIVOS ======

@router.post("/dias-festivos", response_model=DiaFestivoOut, status_code=status.HTTP_201_CREATED)
def create_dia_festivo(
    dia_festivo: DiaFestivoCreateValidated, 
    db: Session = Depends(get_db),
    current_user = Depends(check_admin_permissions)
):
    """Crear un nuevo día festivo"""
    # Verificar si ya existe un día festivo en esa fecha
    fecha_inicio = datetime.combine(dia_festivo.fecha.date(), time.min)
    fecha_fin = datetime.combine(dia_festivo.fecha.date(), time.max)
    
    existing = db.query(DiaFestivo).filter(
        DiaFestivo.fecha >= fecha_inicio,
        DiaFestivo.fecha <= fecha_fin
    ).first()
    
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Ya existe un día festivo registrado para esa fecha: {existing.descripcion}"
        )
    
    # Crear el nuevo día festivo
    db_dia_festivo = DiaFestivo(
        fecha=dia_festivo.fecha,
        descripcion=dia_festivo.descripcion
    )
    db.add(db_dia_festivo)
    db.commit()
    db.refresh(db_dia_festivo)
    
    return db_dia_festivo

@router.get("/dias-festivos", response_model=List[DiaFestivoOut])
def get_dias_festivos(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    anio: Optional[int] = Query(None, description="Filtrar por año"),
    mes: Optional[int] = Query(None, ge=1, le=12, description="Filtrar por mes"),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_trabajador)
):
    """Obtener lista de días festivos con filtros opcionales"""
    query = db.query(DiaFestivo)
    
    # Filtrar por año si se proporciona
    if anio:
        fecha_inicio = datetime(anio, 1, 1)
        fecha_fin = datetime(anio, 12, 31, 23, 59, 59)
        query = query.filter(
            DiaFestivo.fecha >= fecha_inicio,
            DiaFestivo.fecha <= fecha_fin
        )
    
    # Filtrar por mes si se proporciona
    if mes and anio:
        # Obtener el último día del mes
        import calendar
        ultimo_dia = calendar.monthrange(anio, mes)[1]
        fecha_inicio = datetime(anio, mes, 1)
        fecha_fin = datetime(anio, mes, ultimo_dia, 23, 59, 59)
        query = query.filter(
            DiaFestivo.fecha >= fecha_inicio,
            DiaFestivo.fecha <= fecha_fin
        )
    elif mes and not anio:
        # Si solo se proporciona mes, usar el año actual
        anio_actual = datetime.now().year
        import calendar
        ultimo_dia = calendar.monthrange(anio_actual, mes)[1]
        fecha_inicio = datetime(anio_actual, mes, 1)
        fecha_fin = datetime(anio_actual, mes, ultimo_dia, 23, 59, 59)
        query = query.filter(
            DiaFestivo.fecha >= fecha_inicio,
            DiaFestivo.fecha <= fecha_fin
        )
    
    # Ordenar por fecha
    query = query.order_by(DiaFestivo.fecha)
    
    return query.offset(skip).limit(limit).all()

@router.get("/dias-festivos/proximos")
def get_proximos_dias_festivos(
    cantidad: int = Query(5, ge=1, le=20, description="Cantidad de días festivos a mostrar"),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_trabajador)
):
    """Obtener los próximos días festivos"""
    fecha_actual = datetime.now()
    
    proximos = db.query(DiaFestivo).filter(
        DiaFestivo.fecha >= fecha_actual
    ).order_by(DiaFestivo.fecha).limit(cantidad).all()
    
    return [
        {
            "id": d.id,
            "fecha": d.fecha.date(),
            "descripcion": d.descripcion,
            "dias_restantes": (d.fecha.date() - fecha_actual.date()).days
        }
        for d in proximos
    ]

@router.get("/dias-festivos/{dia_festivo_id}", response_model=DiaFestivoOut)
def get_dia_festivo(
    dia_festivo_id: int, 
    db: Session = Depends(get_db),
    current_user = Depends(get_current_trabajador)
):
    """Obtener un día festivo específico"""
    db_dia_festivo = db.query(DiaFestivo).filter(DiaFestivo.id == dia_festivo_id).first()
    if not db_dia_festivo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Día festivo con ID {dia_festivo_id} no encontrado"
        )
    return db_dia_festivo

@router.put("/dias-festivos/{dia_festivo_id}", response_model=DiaFestivoOut)
def update_dia_festivo(
    dia_festivo_id: int,
    dia_festivo_update: DiaFestivoUpdate,
    db: Session = Depends(get_db),
    current_user = Depends(check_admin_permissions)
):
    """Actualizar un día festivo"""
    db_dia_festivo = db.query(DiaFestivo).filter(DiaFestivo.id == dia_festivo_id).first()
    if not db_dia_festivo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Día festivo con ID {dia_festivo_id} no encontrado"
        )
    
    # Actualizar campos si están presentes
    update_data = dia_festivo_update.dict(exclude_unset=True)
    
    # Si se está actualizando la fecha, verificar que no exista otro día festivo en esa fecha
    if 'fecha' in update_data:
        nueva_fecha = update_data['fecha']
        fecha_inicio = datetime.combine(nueva_fecha.date(), time.min)
        fecha_fin = datetime.combine(nueva_fecha.date(), time.max)
        
        existing = db.query(DiaFestivo).filter(
            DiaFestivo.fecha >= fecha_inicio,
            DiaFestivo.fecha <= fecha_fin,
            DiaFestivo.id != dia_festivo_id
        ).first()
        
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Ya existe otro día festivo en esa fecha: {existing.descripcion}"
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
    current_user = Depends(check_admin_permissions)
):
    """Eliminar un día festivo"""
    db_dia_festivo = db.query(DiaFestivo).filter(DiaFestivo.id == dia_festivo_id).first()
    if not db_dia_festivo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Día festivo con ID {dia_festivo_id} no encontrado"
        )
    
    db.delete(db_dia_festivo)
    db.commit()
    return None

@router.post("/dias-festivos/cargar-predeterminados")
def cargar_dias_festivos_mexico(
    anio: int = Query(..., ge=2024, le=2030, description="Año para cargar los días festivos"),
    db: Session = Depends(get_db),
    current_user = Depends(check_admin_permissions)
):
    """Cargar días festivos oficiales de México para un año específico"""
    
    # Días festivos oficiales de México (fijos cada año)
    dias_festivos_mexico = [
        {"mes": 1, "dia": 1, "descripcion": "Año Nuevo"},
        {"mes": 2, "dia": 5, "descripcion": "Día de la Constitución Mexicana"},
        {"mes": 3, "dia": 21, "descripcion": "Natalicio de Benito Juárez"},
        {"mes": 5, "dia": 1, "descripcion": "Día del Trabajo"},
        {"mes": 9, "dia": 16, "descripcion": "Día de la Independencia"},
        {"mes": 11, "dia": 20, "descripcion": "Revolución Mexicana"},
        {"mes": 12, "dia": 25, "descripcion": "Navidad"},
    ]
    
    dias_agregados = []
    dias_omitidos = []
    
    for dia in dias_festivos_mexico:
        fecha = datetime(anio, dia["mes"], dia["dia"])
        
        # Verificar si ya existe
        fecha_inicio = datetime.combine(fecha.date(), time.min)
        fecha_fin = datetime.combine(fecha.date(), time.max)
        
        existing = db.query(DiaFestivo).filter(
            DiaFestivo.fecha >= fecha_inicio,
            DiaFestivo.fecha <= fecha_fin
        ).first()
        
        if not existing:
            nuevo_dia = DiaFestivo(
                fecha=fecha,
                descripcion=dia["descripcion"]
            )
            db.add(nuevo_dia)
            dias_agregados.append(f"{dia['descripcion']} - {fecha.date()}")
        else:
            dias_omitidos.append(f"{dia['descripcion']} - {fecha.date()} (ya existe)")
    
    db.commit()
    
    return {
        "mensaje": f"Días festivos cargados para el año {anio}",
        "dias_agregados": dias_agregados,
        "dias_omitidos": dias_omitidos,
        "total_agregados": len(dias_agregados),
        "total_omitidos": len(dias_omitidos)
    }

@router.get("/dias-festivos/verificar/{fecha}")
def verificar_dia_festivo(
    fecha: date,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_trabajador)
):
    """Verificar si una fecha específica es día festivo"""
    fecha_inicio = datetime.combine(fecha, time.min)
    fecha_fin = datetime.combine(fecha, time.max)
    
    dia_festivo = db.query(DiaFestivo).filter(
        DiaFestivo.fecha >= fecha_inicio,
        DiaFestivo.fecha <= fecha_fin
    ).first()
    
    if dia_festivo:
        return {
            "es_festivo": True,
            "descripcion": dia_festivo.descripcion,
            "fecha": dia_festivo.fecha.date()
        }
    else:
        return {
            "es_festivo": False,
            "descripcion": None,
            "fecha": fecha
        }