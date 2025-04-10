from sqlalchemy.orm import Session
from sqlalchemy import func, cast, Date
from datetime import datetime, date, time, timedelta
import calendar
from typing import Optional, Dict, List, Any
from app.models.models import (
    RegistroAsistencia, 
    Trabajador, 
    Departamento,
    Justificacion,
    DiaFestivo
)

def generar_reporte_asistencias_por_periodo(
    db: Session,
    fecha_inicio: date,
    fecha_fin: date,
    departamento_id: Optional[int] = None,
    trabajador_id: Optional[int] = None
) -> Dict[str, Any]:
    """
    Genera un reporte de asistencias para un período determinado.
    
    Args:
        db (Session): Sesión de la base de datos
        fecha_inicio (date): Fecha de inicio del período
        fecha_fin (date): Fecha de fin del período
        departamento_id (Optional[int]): ID del departamento (opcional)
        trabajador_id (Optional[int]): ID del trabajador (opcional)
    
    Returns:
        Dict[str, Any]: Diccionario con los resultados del reporte
    """
    # Convertir fechas a datetime para la consulta
    fecha_inicio_dt = datetime.combine(fecha_inicio, time.min)
    fecha_fin_dt = datetime.combine(fecha_fin, time.max)
    
    # Consulta base para obtener trabajadores
    query_trabajadores = db.query(Trabajador)
    
    # Filtrar por departamento si se proporciona
    if departamento_id:
        query_trabajadores = query_trabajadores.filter(Trabajador.departamento == departamento_id)
    
    # Filtrar por trabajador si se proporciona
    if trabajador_id:
        query_trabajadores = query_trabajadores.filter(Trabajador.id == trabajador_id)
    
    # Filtrar solo trabajadores activos
    query_trabajadores = query_trabajadores.filter(Trabajador.estado == True)
    
    # Obtener todos los trabajadores que cumplen con los criterios
    trabajadores = query_trabajadores.all()
    
    # Obtener todos los días festivos del período
    dias_festivos = db.query(DiaFestivo).filter(
        DiaFestivo.fecha.between(fecha_inicio_dt, fecha_fin_dt)
    ).all()
    
    dias_festivos_set = {festivo.fecha.date() for festivo in dias_festivos}
    
    # Construir el diccionario de resultados
    resultados = []
    
    for trabajador in trabajadores:
        # Obtener todas las asistencias del trabajador para el período
        asistencias = db.query(RegistroAsistencia).filter(
            RegistroAsistencia.id_empleado == trabajador.id,
            RegistroAsistencia.fecha.between(fecha_inicio_dt, fecha_fin_dt)
        ).all()
        
        # Obtener todas las justificaciones del trabajador para el período
        justificaciones = db.query(Justificacion).filter(
            Justificacion.id_empleado == trabajador.id,
            Justificacion.fecha.between(fecha_inicio_dt, fecha_fin_dt)
        ).all()
        
        # Crear diccionarios para mapear fechas a asistencias y justificaciones
        asistencias_por_fecha = {a.fecha.date(): a for a in asistencias}
        justificaciones_por_fecha = {j.fecha.date(): j for j in justificaciones}
        
        # Obtener el nombre del departamento
        departamento = db.query(Departamento).filter(Departamento.id == trabajador.departamento).first()
        departamento_nombre = departamento.descripcion if departamento else "Sin departamento"
        
        # Calcular estadísticas
        dias_laborables = 0
        asistencias_count = 0
        retardos_count = 0
        faltas_count = 0
        justificados_count = 0
        
        # Registros diarios
        registros_diarios = []
        
        # Iterar por cada día del período
        fecha_actual = fecha_inicio
        while fecha_actual <= fecha_fin:
            # Verificar si es fin de semana (5 = sábado, 6 = domingo)
            es_fin_semana = fecha_actual.weekday() >= 5
            
            # Verificar si es día festivo
            es_festivo = fecha_actual in dias_festivos_set
            
            # Si no es fin de semana ni día festivo, es día laborable
            if not es_fin_semana and not es_festivo:
                dias_laborables += 1
                
                # Determinar el estatus para este día
                estatus = "NO_REGISTRADO"
                hora_registro = None
                
                if fecha_actual in asistencias_por_fecha:
                    estatus = asistencias_por_fecha[fecha_actual].estatus
                    hora_registro = asistencias_por_fecha[fecha_actual].fecha
                    
                    if estatus == "ASISTENCIA":
                        asistencias_count += 1
                    elif "RETARDO" in estatus:
                        retardos_count += 1
                    elif estatus == "FALTA":
                        faltas_count += 1
                
                elif fecha_actual in justificaciones_por_fecha:
                    estatus = "JUSTIFICADO"
                    hora_registro = justificaciones_por_fecha[fecha_actual].fecha
                    justificados_count += 1
                
                # Agregar registro diario
                registros_diarios.append({
                    "fecha": fecha_actual,
                    "estatus": estatus,
                    "hora_registro": hora_registro
                })
            
            fecha_actual += timedelta(days=1)
        
        resultados.append({
            "id": trabajador.id,
            "nombre": f"{trabajador.nombre} {trabajador.apellidoPaterno} {trabajador.apellidoMaterno}",
            "rfc": trabajador.rfc,
            "departamento": departamento_nombre,
            "puesto": trabajador.puesto,
            "estadisticas": {
                "dias_laborables": dias_laborables,
                "asistencias": asistencias_count,
                "retardos": retardos_count,
                "faltas": faltas_count,
                "justificados": justificados_count,
                "no_registrados": dias_laborables - (asistencias_count + retardos_count + faltas_count + justificados_count),
                "porcentaje_asistencia": (asistencias_count / dias_laborables) * 100 if dias_laborables > 0 else 0
            },
            "registros_diarios": registros_diarios
        })
    
    return {
        "periodo": {
            "fecha_inicio": fecha_inicio,
            "fecha_fin": fecha_fin
        },
        "departamento": departamento_id,
        "trabajador": trabajador_id,
        "dias_festivos": [{"fecha": festivo.fecha, "descripcion": festivo.descripcion} for festivo in dias_festivos],
        "trabajadores": resultados
    }

def generar_reporte_asistencias_diarias(
    db: Session,
    fecha: date,
    departamento_id: Optional[int] = None
) -> Dict[str, Any]:
    """
    Genera un reporte de asistencias para un día específico.
    
    Args:
        db (Session): Sesión de la base de datos
        fecha (date): Fecha del reporte
        departamento_id (Optional[int]): ID del departamento (opcional)
    
    Returns:
        Dict[str, Any]: Diccionario con los resultados del reporte
    """
    # Definir el rango de fechas para el día
    fecha_inicio = datetime.combine(fecha, time.min)
    fecha_fin = datetime.combine(fecha, time.max)
    
    # Consulta base para obtener trabajadores
    query_trabajadores = db.query(Trabajador)
    
    # Filtrar por departamento si se proporciona
    if departamento_id:
        query_trabajadores = query_trabajadores.filter(Trabajador.departamento == departamento_id)
    
    # Filtrar solo trabajadores activos
    query_trabajadores = query_trabajadores.filter(Trabajador.estado == True)
    
    # Obtener todos los trabajadores que cumplen con los criterios
    trabajadores = query_trabajadores.all()
    
    # Verificar si es día festivo
    dia_festivo = db.query(DiaFestivo).filter(
        cast(DiaFestivo.fecha, Date) == fecha
    ).first()
    
    # Verificar si es fin de semana (5 = sábado, 6 = domingo)
    es_fin_semana = fecha.weekday() >= 5
    
    # Construir el diccionario de resultados
    resultados = []
    
    # Si es fin de semana o día festivo, devolver la información
    if es_fin_semana:
        return {
            "fecha": fecha,
            "es_dia_laborable": False,
            "motivo": "Fin de semana",
            "trabajadores": []
        }
    
    if dia_festivo:
        return {
            "fecha": fecha,
            "es_dia_laborable": False,
            "motivo": f"Día festivo: {dia_festivo.descripcion}",
            "trabajadores": []
        }
    
    for trabajador in trabajadores:
        # Buscar registro de asistencia para este trabajador en la fecha indicada
        asistencia = db.query(RegistroAsistencia).filter(
            RegistroAsistencia.id_empleado == trabajador.id,
            RegistroAsistencia.fecha >= fecha_inicio,
            RegistroAsistencia.fecha <= fecha_fin
        ).first()
        
        # Buscar justificación para este trabajador en la fecha indicada
        justificacion = db.query(Justificacion).filter(
            Justificacion.id_empleado == trabajador.id,
            Justificacion.fecha >= fecha_inicio,
            Justificacion.fecha <= fecha_fin
        ).first()
        
        # Determinar el estatus
        estatus = "NO_REGISTRADO"
        hora_registro = None
        
        if asistencia:
            estatus = asistencia.estatus
            hora_registro = asistencia.fecha
        elif justificacion:
            estatus = "JUSTIFICADO"
            hora_registro = justificacion.fecha
        
        # Obtener el nombre del departamento
        departamento = db.query(Departamento).filter(Departamento.id == trabajador.departamento).first()
        departamento_nombre = departamento.descripcion if departamento else "Sin departamento"
        
        resultados.append({
            "id": trabajador.id,
            "nombre": f"{trabajador.nombre} {trabajador.apellidoPaterno} {trabajador.apellidoMaterno}",
            "rfc": trabajador.rfc,
            "departamento": departamento_nombre,
            "puesto": trabajador.puesto,
            "estatus": estatus,
            "hora_registro": hora_registro
        })
    
    # Calcular estadísticas
    total_trabajadores = len(resultados)
    asistencias = sum(1 for r in resultados if r["estatus"] == "ASISTENCIA")
    retardos = sum(1 for r in resultados if "RETARDO" in r["estatus"])
    faltas = sum(1 for r in resultados if r["estatus"] == "FALTA")
    justificados = sum(1 for r in resultados if r["estatus"] == "JUSTIFICADO")
    no_registrados = sum(1 for r in resultados if r["estatus"] == "NO_REGISTRADO")
    
    return {
        "fecha": fecha,
        "es_dia_laborable": True,
        "departamento": departamento_id,
        "total_trabajadores": total_trabajadores,
        "estadisticas": {
            "asistencias": asistencias,
            "retardos": retardos,
            "faltas": faltas,
            "justificados": justificados,
            "no_registrados": no_registrados,
            "porcentaje_asistencia": (asistencias / total_trabajadores) * 100 if total_trabajadores > 0 else 0
        },
        "registros": resultados
    }