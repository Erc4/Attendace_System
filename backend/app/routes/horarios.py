from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, time
from app.database import get_db
from app.models.models import (
    Horario, 
    AsignacionHorario, 
    Trabajador,
    Departamento
)
from app.schemas.schemas import (
    HorarioCreate,
    HorarioUpdate,
    HorarioOut,
    AsignacionHorarioCreate,
    AsignacionHorarioOut,
    HorarioDetalladoOut
)
from app.services.auth_service import get_current_trabajador, check_admin_permissions

router = APIRouter()

# ====== RUTAS PARA HORARIOS ======

@router.post("/horarios", response_model=HorarioOut, status_code=status.HTTP_201_CREATED)
def create_horario(
    horario: HorarioCreate, 
    db: Session = Depends(get_db),
    current_user: Trabajador = Depends(check_admin_permissions)
):
    """Crear un nuevo horario"""
    try:
        # Verificar si ya existe un horario con la misma descripción
        existing_horario = db.query(Horario).filter(
            Horario.descripcion == horario.descripcion
        ).first()
        
        if existing_horario:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Ya existe un horario con la descripción: {horario.descripcion}"
            )
        
        # Crear el nuevo horario
        db_horario = Horario(**horario.dict())
        db.add(db_horario)
        db.commit()
        db.refresh(db_horario)
        
        return db_horario
        
    except HTTPException as he:
        raise he
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al crear horario: {str(e)}"
        )

@router.get("/horarios", response_model=List[HorarioOut])
def get_horarios(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    descripcion: Optional[str] = Query(None, description="Filtrar por descripción"),
    db: Session = Depends(get_db),
    current_user: Trabajador = Depends(get_current_trabajador)
):
    """Obtener lista de horarios con filtros opcionales"""
    try:
        query = db.query(Horario)
        
        # Aplicar filtros si se proporcionan
        if descripcion:
            query = query.filter(Horario.descripcion.ilike(f"%{descripcion}%"))
        
        # Aplicar paginación
        horarios = query.offset(skip).limit(limit).all()
        
        return horarios
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al obtener horarios: {str(e)}"
        )

@router.get("/horarios/{horario_id}", response_model=HorarioDetalladoOut)
def get_horario_by_id(
    horario_id: int, 
    db: Session = Depends(get_db),
    current_user: Trabajador = Depends(get_current_trabajador)
):
    """Obtener un horario específico con información detallada"""
    horario = db.query(Horario).filter(Horario.id == horario_id).first()
    if not horario:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Horario con ID {horario_id} no encontrado"
        )
    
    # Obtener trabajadores asignados a este horario
    trabajadores_asignados = db.query(Trabajador).filter(
        Trabajador.id_horario == horario_id,
        Trabajador.estado == True
    ).all()
    
    # Obtener asignaciones históricas
    asignaciones = db.query(AsignacionHorario, Trabajador).join(
        Trabajador, AsignacionHorario.id_trabajador == Trabajador.id
    ).filter(AsignacionHorario.id_horario == horario_id).all()
    
    return {
        "horario": horario,
        "trabajadores_asignados": trabajadores_asignados,
        "total_trabajadores": len(trabajadores_asignados),
        "asignaciones_historicas": [
            {
                "id": asignacion.id,
                "trabajador": {
                    "id": trabajador.id,
                    "nombre": f"{trabajador.nombre} {trabajador.apellidoPaterno} {trabajador.apellidoMaterno}",
                    "rfc": trabajador.rfc,
                    "puesto": trabajador.puesto
                },
                "fecha_inicio": asignacion.fehcaInicio
            }
            for asignacion, trabajador in asignaciones
        ]
    }

@router.put("/horarios/{horario_id}", response_model=HorarioOut)
def update_horario(
    horario_id: int, 
    horario_update: HorarioUpdate, 
    db: Session = Depends(get_db),
    current_user: Trabajador = Depends(check_admin_permissions)
):
    """Actualizar un horario existente"""
    try:
        db_horario = db.query(Horario).filter(Horario.id == horario_id).first()
        if not db_horario:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Horario con ID {horario_id} no encontrado"
            )
        
        # Verificar si la nueva descripción ya existe en otro horario
        update_data = horario_update.dict(exclude_unset=True)
        if "descripcion" in update_data:
            existing_horario = db.query(Horario).filter(
                Horario.descripcion == update_data["descripcion"],
                Horario.id != horario_id
            ).first()
            
            if existing_horario:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Ya existe otro horario con la descripción: {update_data['descripcion']}"
                )
        
        # Actualizar campos
        for key, value in update_data.items():
            setattr(db_horario, key, value)
        
        db.commit()
        db.refresh(db_horario)
        
        return db_horario
        
    except HTTPException as he:
        db.rollback()
        raise he
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al actualizar horario: {str(e)}"
        )

@router.delete("/horarios/{horario_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_horario(
    horario_id: int, 
    db: Session = Depends(get_db),
    current_user: Trabajador = Depends(check_admin_permissions)
):
    """Eliminar un horario (solo si no tiene trabajadores asignados)"""
    try:
        db_horario = db.query(Horario).filter(Horario.id == horario_id).first()
        if not db_horario:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Horario con ID {horario_id} no encontrado"
            )
        
        # Verificar si hay trabajadores asignados a este horario
        trabajadores_asignados = db.query(Trabajador).filter(
            Trabajador.id_horario == horario_id
        ).first()
        
        if trabajadores_asignados:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No se puede eliminar el horario porque tiene trabajadores asignados"
            )
        
        # Eliminar asignaciones históricas primero
        db.query(AsignacionHorario).filter(AsignacionHorario.id_horario == horario_id).delete()
        
        # Eliminar el horario
        db.delete(db_horario)
        db.commit()
        
        return None
        
    except HTTPException as he:
        db.rollback()
        raise he
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al eliminar horario: {str(e)}"
        )

# ====== RUTAS PARA ASIGNACIÓN DE HORARIOS ======

@router.post("/horarios/{horario_id}/asignar", response_model=AsignacionHorarioOut, status_code=status.HTTP_201_CREATED)
def asignar_horario_a_trabajador(
    horario_id: int,
    asignacion: AsignacionHorarioCreate,
    db: Session = Depends(get_db),
    current_user: Trabajador = Depends(check_admin_permissions)
):
    """Asignar un horario a un trabajador"""
    try:
        # Verificar que el horario existe
        horario = db.query(Horario).filter(Horario.id == horario_id).first()
        if not horario:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Horario con ID {horario_id} no encontrado"
            )
        
        # Verificar que el trabajador existe
        trabajador = db.query(Trabajador).filter(Trabajador.id == asignacion.id_trabajador).first()
        if not trabajador:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Trabajador con ID {asignacion.id_trabajador} no encontrado"
            )
        
        # Crear la asignación histórica
        db_asignacion = AsignacionHorario(
            id_trabajador=asignacion.id_trabajador,
            id_horario=horario_id,
            fehcaInicio=asignacion.fehcaInicio or datetime.now()
        )
        db.add(db_asignacion)
        
        # Actualizar el horario actual del trabajador
        trabajador.id_horario = horario_id
        
        db.commit()
        db.refresh(db_asignacion)
        
        return db_asignacion
        
    except HTTPException as he:
        db.rollback()
        raise he
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al asignar horario: {str(e)}"
        )

@router.get("/trabajadores/{trabajador_id}/horarios", response_model=List[AsignacionHorarioOut])
def get_historial_horarios_trabajador(
    trabajador_id: int,
    db: Session = Depends(get_db),
    current_user: Trabajador = Depends(get_current_trabajador)
):
    """Obtener el historial de horarios de un trabajador"""
    try:
        # Verificar que el trabajador existe
        trabajador = db.query(Trabajador).filter(Trabajador.id == trabajador_id).first()
        if not trabajador:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Trabajador con ID {trabajador_id} no encontrado"
            )
        
        # Obtener historial de asignaciones
        asignaciones = db.query(AsignacionHorario).filter(
            AsignacionHorario.id_trabajador == trabajador_id
        ).order_by(AsignacionHorario.fehcaInicio.desc()).all()
        
        return asignaciones
        
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al obtener historial de horarios: {str(e)}"
        )

@router.get("/horarios/trabajadores-sin-horario")
def get_trabajadores_sin_horario(
    db: Session = Depends(get_db),
    current_user: Trabajador = Depends(get_current_trabajador)
):
    """Obtener trabajadores que no tienen horario asignado"""
    try:
        trabajadores_sin_horario = db.query(Trabajador).filter(
            Trabajador.id_horario.is_(None),
            Trabajador.estado == True
        ).all()
        
        # Obtener departamentos para agrupar
        result = []
        for trabajador in trabajadores_sin_horario:
            departamento = db.query(Departamento).filter(
                Departamento.id == trabajador.departamento
            ).first()
            
            result.append({
                "id": trabajador.id,
                "nombre": f"{trabajador.nombre} {trabajador.apellidoPaterno} {trabajador.apellidoMaterno}",
                "rfc": trabajador.rfc,
                "puesto": trabajador.puesto,
                "departamento": departamento.descripcion if departamento else "Sin departamento"
            })
        
        return {
            "trabajadores": result,
            "total": len(result)
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al obtener trabajadores sin horario: {str(e)}"
        )

@router.get("/horarios/resumen")
def get_resumen_horarios(
    db: Session = Depends(get_db),
    current_user: Trabajador = Depends(get_current_trabajador)
):
    """Obtener resumen estadístico de horarios"""
    try:
        # Total de horarios
        total_horarios = db.query(Horario).count()
        
        # Total de trabajadores con horario asignado
        trabajadores_con_horario = db.query(Trabajador).filter(
            Trabajador.id_horario.isnot(None),
            Trabajador.estado == True
        ).count()
        
        # Total de trabajadores sin horario
        trabajadores_sin_horario = db.query(Trabajador).filter(
            Trabajador.id_horario.is_(None),
            Trabajador.estado == True
        ).count()
        
        # Horarios más utilizados
        horarios_populares = db.query(
            Horario.id,
            Horario.descripcion,
            db.func.count(Trabajador.id).label('total_trabajadores')
        ).outerjoin(
            Trabajador, Horario.id == Trabajador.id_horario
        ).filter(
            Trabajador.estado == True
        ).group_by(
            Horario.id, Horario.descripcion
        ).order_by(
            db.func.count(Trabajador.id).desc()
        ).limit(5).all()
        
        return {
            "total_horarios": total_horarios,
            "trabajadores_con_horario": trabajadores_con_horario,
            "trabajadores_sin_horario": trabajadores_sin_horario,
            "horarios_mas_utilizados": [
                {
                    "id": horario.id,
                    "descripcion": horario.descripcion,
                    "total_trabajadores": horario.total_trabajadores
                }
                for horario in horarios_populares
            ]
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al obtener resumen de horarios: {str(e)}"
        )

# ====== RUTAS PARA VALIDACIÓN Y UTILIDADES ======

@router.get("/horarios/validar-tiempo")
def validar_horario_tiempo(
    hora_entrada: str = Query(..., description="Hora de entrada en formato HH:MM"),
    hora_salida: str = Query(..., description="Hora de salida en formato HH:MM"),
    db: Session = Depends(get_db),
    current_user: Trabajador = Depends(get_current_trabajador)
):
    """Validar que un horario tenga tiempos lógicos"""
    try:
        from datetime import datetime
        
        # Convertir strings a objetos time
        entrada = datetime.strptime(hora_entrada, "%H:%M").time()
        salida = datetime.strptime(hora_salida, "%H:%M").time()
        
        # Validaciones
        es_valido = True
        errores = []
        
        # Verificar que la hora de salida sea después de la entrada
        if salida <= entrada:
            es_valido = False
            errores.append("La hora de salida debe ser posterior a la hora de entrada")
        
        # Calcular duración de la jornada
        entrada_minutes = entrada.hour * 60 + entrada.minute
        salida_minutes = salida.hour * 60 + salida.minute
        duracion_minutes = salida_minutes - entrada_minutes
        
        # Verificar duración mínima y máxima
        if duracion_minutes < 240:  # 4 horas mínimo
            es_valido = False
            errores.append("La jornada laboral debe ser de al menos 4 horas")
        
        if duracion_minutes > 480:  # 8 horas máximo
            errores.append("Advertencia: Jornada laboral mayor a 8 horas")
        
        return {
            "es_valido": es_valido,
            "errores": errores,
            "duracion_horas": round(duracion_minutes / 60, 2),
            "duracion_minutos": duracion_minutes
        }
        
    except ValueError as ve:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Formato de hora inválido. Use HH:MM: {str(ve)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al validar horario: {str(e)}"
        )