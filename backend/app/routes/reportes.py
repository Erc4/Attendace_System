from fastapi import APIRouter, Depends, HTTPException, status, Query, Response
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_, cast, Date
from typing import List, Optional
from datetime import datetime, date, time, timedelta
import calendar
from app.database import get_db
from app.models.models import (
    RegistroAsistencia, 
    Trabajador,
    Departamento,
    Justificacion,
    ReglaRetardo,
    ReglaJustificacion,
    DiaFestivo
)
from app.schemas.schemas import ReporteFiltros
from app.services.auth_service import get_current_trabajador, check_admin_permissions
import csv
import io

router = APIRouter()

@router.get("/reportes/asistencias-diarias")
def get_reporte_asistencias_diarias(
    fecha: Optional[date] = None,
    departamento_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: Trabajador = Depends(get_current_trabajador)
):
    # Si no se proporciona fecha, usar la fecha actual
    if not fecha:
        fecha = date.today()
    
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
    
    # Construir el diccionario de resultados
    resultados = []
    
    for trabajador in trabajadores:
        # Buscar registro de asistencia para este trabajador en la fecha indicada
        asistencia = db.query(RegistroAsistencia).filter(
            RegistroAsistencia.id_trabajador == trabajador.id,
            RegistroAsistencia.fecha >= fecha_inicio,
            RegistroAsistencia.fecha <= fecha_fin
        ).first()
        
        # Buscar justificación para este trabajador en la fecha indicada
        justificacion = db.query(Justificacion).filter(
            Justificacion.id_trabajador == trabajador.id,
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

@router.get("/reportes/asistencias-mensuales")
def get_reporte_asistencias_mensuales(
    anio: int = datetime.now().year,
    mes: int = datetime.now().month,
    departamento_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: Trabajador = Depends(get_current_trabajador)
):
    # Validar mes y año
    if mes < 1 or mes > 12:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El mes debe estar entre 1 y 12"
        )
    
    if anio < 2000 or anio > 2100:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El año debe estar entre 2000 y 2100"
        )
    
    # Obtener el primer y último día del mes
    _, ultimo_dia = calendar.monthrange(anio, mes)
    fecha_inicio = date(anio, mes, 1)
    fecha_fin = date(anio, mes, ultimo_dia)
    
    # Consulta base para obtener trabajadores
    query_trabajadores = db.query(Trabajador)
    
    # Filtrar por departamento si se proporciona
    if departamento_id:
        query_trabajadores = query_trabajadores.filter(Trabajador.departamento == departamento_id)
    
    # Filtrar solo trabajadores activos
    query_trabajadores = query_trabajadores.filter(Trabajador.estado == True)
    
    # Obtener todos los trabajadores que cumplen con los criterios
    trabajadores = query_trabajadores.all()
    
    # Obtener todos los días festivos del mes
    dias_festivos = db.query(DiaFestivo).filter(
        func.extract('year', DiaFestivo.fecha) == anio,
        func.extract('month', DiaFestivo.fecha) == mes
    ).all()
    
    dias_festivos_set = {festivo.fecha.date() for festivo in dias_festivos}
    
    # Construir el diccionario de resultados
    resultados = []
    
    for trabajador in trabajadores:
        # Obtener todas las asistencias del trabajador para el mes
        asistencias = db.query(RegistroAsistencia).filter(
            RegistroAsistencia.id_trabajador == trabajador.id,
            func.extract('year', RegistroAsistencia.fecha) == anio,
            func.extract('month', RegistroAsistencia.fecha) == mes
        ).all()
        
        # Obtener todas las justificaciones del trabajador para el mes
        justificaciones = db.query(Justificacion).filter(
            Justificacion.id_trabajador == trabajador.id,
            func.extract('year', Justificacion.fecha) == anio,
            func.extract('month', Justificacion.fecha) == mes
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
        
        # Iterar por cada día del mes
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
                "porcentaje_asistencia": (asistencias_count / dias_laborables) * 100 if dias_laborables > 0 else 0
            },
            "registros_diarios": registros_diarios
        })
    
    return {
        "anio": anio,
        "mes": mes,
        "departamento": departamento_id,
        "dias_festivos": [{"fecha": festivo.fecha, "descripcion": festivo.descripcion} for festivo in dias_festivos],
        "trabajadores": resultados
    }

@router.get("/reportes/asistencias-mensuales-csv")
def get_reporte_asistencias_mensuales_csv(
    anio: int = datetime.now().year,
    mes: int = datetime.now().month,
    departamento_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: Trabajador = Depends(get_current_trabajador)
):
    # Validar mes y año
    if mes < 1 or mes > 12:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El mes debe estar entre 1 y 12"
        )
    
    if anio < 2000 or anio > 2100:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El año debe estar entre 2000 y 2100"
        )
    
    # Obtener el primer y último día del mes
    _, ultimo_dia = calendar.monthrange(anio, mes)
    fecha_inicio = date(anio, mes, 1)
    fecha_fin = date(anio, mes, ultimo_dia)
    
    # Obtener datos del reporte
    reporte = get_reporte_asistencias_mensuales(
        anio=anio,
        mes=mes,
        departamento_id=departamento_id,
        db=db,
        current_user=current_user
    )
    
    # Crear buffer para el CSV
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Escribir encabezados
    headers = ["ID", "Nombre", "RFC", "Departamento", "Puesto", "Días Laborables", 
               "Asistencias", "Retardos", "Faltas", "Justificados", "% Asistencia"]
    
    # Agregar un encabezado para cada día del mes
    for dia in range(1, ultimo_dia + 1):
        fecha = date(anio, mes, dia)
        headers.append(f"{dia}/{mes}/{anio}")
    
    writer.writerow(headers)
    
    # Escribir datos de cada trabajador
    for trabajador in reporte["trabajadores"]:
        # Crear un diccionario para mapear fechas a estatus
        estatus_por_fecha = {r["fecha"]: r["estatus"] for r in trabajador["registros_diarios"]}
        
        # Datos básicos del trabajador
        row = [
            trabajador["id"],
            trabajador["nombre"],
            trabajador["rfc"],
            trabajador["departamento"],
            trabajador["puesto"],
            trabajador["estadisticas"]["dias_laborables"],
            trabajador["estadisticas"]["asistencias"],
            trabajador["estadisticas"]["retardos"],
            trabajador["estadisticas"]["faltas"],
            trabajador["estadisticas"]["justificados"],
            f"{trabajador['estadisticas']['porcentaje_asistencia']:.2f}%"
        ]
        
        # Agregar estatus para cada día del mes
        for dia in range(1, ultimo_dia + 1):
            fecha = date(anio, mes, dia)
            estatus = estatus_por_fecha.get(fecha, "")
            row.append(estatus)
        
        writer.writerow(row)
    
    # Preparar la respuesta CSV
    output.seek(0)
    content = output.getvalue()
    
    # Crear la respuesta con el archivo CSV
    response = Response(content=content)
    response.headers["Content-Disposition"] = f"attachment; filename=asistencias_{anio}_{mes}.csv"
    response.headers["Content-Type"] = "text/csv"
    
    return response

@router.get("/reportes/retardos")
def get_reporte_retardos(
    fecha_inicio: Optional[date] = None,
    fecha_fin: Optional[date] = None,
    departamento_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: Trabajador = Depends(get_current_trabajador)
):
    # Si no se proporciona fecha_inicio, usar el primer día del mes actual
    if not fecha_inicio:
        hoy = date.today()
        fecha_inicio = date(hoy.year, hoy.month, 1)
    
    # Si no se proporciona fecha_fin, usar la fecha actual
    if not fecha_fin:
        fecha_fin = date.today()
    
    # Convertir fechas a datetime para la consulta
    fecha_inicio_dt = datetime.combine(fecha_inicio, time.min)
    fecha_fin_dt = datetime.combine(fecha_fin, time.max)
    
    # Consulta base para obtener registros de asistencia con retardos
    query = db.query(RegistroAsistencia, Trabajador, Departamento).join(
        Trabajador, RegistroAsistencia.id_trabajador == Trabajador.id
    ).join(
        Departamento, Trabajador.departamento == Departamento.id
    ).filter(
        RegistroAsistencia.fecha.between(fecha_inicio_dt, fecha_fin_dt),
        RegistroAsistencia.estatus.like("%RETARDO%")
    )
    
    # Filtrar por departamento si se proporciona
    if departamento_id:
        query = query.filter(Trabajador.departamento == departamento_id)
    
    # Ejecutar la consulta
    resultados = query.all()
    
    # Procesar los resultados
    retardos = []
    trabajadores_con_retardos = set()
    
    for registro, trabajador, departamento in resultados:
        retardos.append({
            "id_registro": registro.id,
            "fecha": registro.fecha,
            "estatus": registro.estatus,
            "trabajador": {
                "id": trabajador.id,
                "nombre": f"{trabajador.nombre} {trabajador.apellidoPaterno} {trabajador.apellidoMaterno}",
                "rfc": trabajador.rfc,
                "departamento": departamento.descripcion,
                "puesto": trabajador.puesto
            }
        })
        trabajadores_con_retardos.add(trabajador.id)
    
    # Contar retardos por trabajador
    retardos_por_trabajador = {}
    for retardo in retardos:
        trabajador_id = retardo["trabajador"]["id"]
        if trabajador_id not in retardos_por_trabajador:
            retardos_por_trabajador[trabajador_id] = {
                "trabajador": retardo["trabajador"],
                "total_retardos": 0,
                "detalle_retardos": []
            }
        
        retardos_por_trabajador[trabajador_id]["total_retardos"] += 1
        retardos_por_trabajador[trabajador_id]["detalle_retardos"].append({
            "id_registro": retardo["id_registro"],
            "fecha": retardo["fecha"],
            "estatus": retardo["estatus"]
        })
    
    # Ordenar por número de retardos (descendente)
    trabajadores_ordenados = sorted(
        retardos_por_trabajador.values(),
        key=lambda x: x["total_retardos"],
        reverse=True
    )
    
    return {
        "periodo": {
            "fecha_inicio": fecha_inicio,
            "fecha_fin": fecha_fin
        },
        "departamento": departamento_id,
        "estadisticas": {
            "total_retardos": len(retardos),
            "trabajadores_con_retardos": len(trabajadores_con_retardos)
        },
        "retardos_por_trabajador": trabajadores_ordenados
    }

@router.get("/reportes/faltas")
def get_reporte_faltas(
    fecha_inicio: Optional[date] = None,
    fecha_fin: Optional[date] = None,
    departamento_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: Trabajador = Depends(get_current_trabajador)
):
    # Si no se proporciona fecha_inicio, usar el primer día del mes actual
    if not fecha_inicio:
        hoy = date.today()
        fecha_inicio = date(hoy.year, hoy.month, 1)
    
    # Si no se proporciona fecha_fin, usar la fecha actual
    if not fecha_fin:
        fecha_fin = date.today()
    
    # Convertir fechas a datetime para la consulta
    fecha_inicio_dt = datetime.combine(fecha_inicio, time.min)
    fecha_fin_dt = datetime.combine(fecha_fin, time.max)
    
    # Consulta base para obtener registros de asistencia con faltas
    query = db.query(RegistroAsistencia, Trabajador, Departamento).join(
        Trabajador, RegistroAsistencia.id_trabajador == Trabajador.id
    ).join(
        Departamento, Trabajador.departamento == Departamento.id
    ).filter(
        RegistroAsistencia.fecha.between(fecha_inicio_dt, fecha_fin_dt),
        RegistroAsistencia.estatus == "FALTA"
    )
    
    # Filtrar por departamento si se proporciona
    if departamento_id:
        query = query.filter(Trabajador.departamento == departamento_id)
    
    # Ejecutar la consulta
    resultados = query.all()
    
    # Procesar los resultados
    faltas = []
    trabajadores_con_faltas = set()
    
    for registro, trabajador, departamento in resultados:
        faltas.append({
            "id_registro": registro.id,
            "fecha": registro.fecha,
            "trabajador": {
                "id": trabajador.id,
                "nombre": f"{trabajador.nombre} {trabajador.apellidoPaterno} {trabajador.apellidoMaterno}",
                "rfc": trabajador.rfc,
                "departamento": departamento.descripcion,
                "puesto": trabajador.puesto
            }
        })
        trabajadores_con_faltas.add(trabajador.id)
    
    # Contar faltas por trabajador
    faltas_por_trabajador = {}
    for falta in faltas:
        trabajador_id = falta["trabajador"]["id"]
        if trabajador_id not in faltas_por_trabajador:
            faltas_por_trabajador[trabajador_id] = {
                "trabajador": falta["trabajador"],
                "total_faltas": 0,
                "detalle_faltas": []
            }
        
        faltas_por_trabajador[trabajador_id]["total_faltas"] += 1
        faltas_por_trabajador[trabajador_id]["detalle_faltas"].append({
            "id_registro": falta["id_registro"],
            "fecha": falta["fecha"]
        })
    
    # Ordenar por número de faltas (descendente)
    trabajadores_ordenados = sorted(
        faltas_por_trabajador.values(),
        key=lambda x: x["total_faltas"],
        reverse=True
    )
    
    return {
        "periodo": {
            "fecha_inicio": fecha_inicio,
            "fecha_fin": fecha_fin
        },
        "departamento": departamento_id,
        "estadisticas": {
            "total_faltas": len(faltas),
            "trabajadores_con_faltas": len(trabajadores_con_faltas)
        },
        "faltas_por_trabajador": trabajadores_ordenados
    }

@router.get("/reportes/justificaciones")
def get_reporte_justificaciones(
    fecha_inicio: Optional[date] = None,
    fecha_fin: Optional[date] = None,
    departamento_id: Optional[int] = None,
    id_regla_justificacion: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: Trabajador = Depends(get_current_trabajador)
):
    # Si no se proporciona fecha_inicio, usar el primer día del mes actual
    if not fecha_inicio:
        hoy = date.today()
        fecha_inicio = date(hoy.year, hoy.month, 1)
    
    # Si no se proporciona fecha_fin, usar la fecha actual
    if not fecha_fin:
        fecha_fin = date.today()
    
    # Convertir fechas a datetime para la consulta
    fecha_inicio_dt = datetime.combine(fecha_inicio, time.min)
    fecha_fin_dt = datetime.combine(fecha_fin, time.max)
    
    # Consulta base para obtener justificaciones
    query = db.query(Justificacion, Trabajador, Departamento, ReglaJustificacion).join(
        Trabajador, Justificacion.id_trabajador == Trabajador.id
    ).join(
        Departamento, Trabajador.departamento == Departamento.id
    ).join(
        ReglaJustificacion, Justificacion.id_descripcion == ReglaJustificacion.id
    ).filter(
        Justificacion.fecha.between(fecha_inicio_dt, fecha_fin_dt)
    )
    
    # Filtrar por departamento si se proporciona
    if departamento_id:
        query = query.filter(Trabajador.departamento == departamento_id)
    
    # Filtrar por tipo de justificación si se proporciona
    if id_regla_justificacion:
        query = query.filter(Justificacion.id_descripcion == id_regla_justificacion)
    
    # Ejecutar la consulta
    resultados = query.all()
    
    # Procesar los resultados
    justificaciones = []
    trabajadores_con_justificaciones = set()
    tipos_justificacion = {}
    
    for justificacion, trabajador, departamento, regla in resultados:
        justificaciones.append({
            "id": justificacion.id,
            "fecha": justificacion.fecha,
            "tipo": {
                "id": regla.id,
                "descripcion": regla.descripcion
            },
            "trabajador": {
                "id": trabajador.id,
                "nombre": f"{trabajador.nombre} {trabajador.apellidoPaterno} {trabajador.apellidoMaterno}",
                "rfc": trabajador.rfc,
                "departamento": departamento.descripcion,
                "puesto": trabajador.puesto
            }
        })
        trabajadores_con_justificaciones.add(trabajador.id)
        
        # Contabilizar por tipo de justificación
        if regla.id not in tipos_justificacion:
            tipos_justificacion[regla.id] = {
                "id": regla.id,
                "descripcion": regla.descripcion,
                "total": 0
            }
        tipos_justificacion[regla.id]["total"] += 1
    
    # Contar justificaciones por trabajador
    justificaciones_por_trabajador = {}
    for justificacion in justificaciones:
        trabajador_id = justificacion["trabajador"]["id"]
        if trabajador_id not in justificaciones_por_trabajador:
            justificaciones_por_trabajador[trabajador_id] = {
                "trabajador": justificacion["trabajador"],
                "total_justificaciones": 0,
                "detalle_justificaciones": []
            }
        
        justificaciones_por_trabajador[trabajador_id]["total_justificaciones"] += 1
        justificaciones_por_trabajador[trabajador_id]["detalle_justificaciones"].append({
            "id": justificacion["id"],
            "fecha": justificacion["fecha"],
            "tipo": justificacion["tipo"]
        })
    
    # Ordenar por número de justificaciones (descendente)
    trabajadores_ordenados = sorted(
        justificaciones_por_trabajador.values(),
        key=lambda x: x["total_justificaciones"],
        reverse=True
    )
    
    # Ordenar tipos de justificación por total (descendente)
    tipos_ordenados = sorted(
        tipos_justificacion.values(),
        key=lambda x: x["total"],
        reverse=True
    )
    
    return {
        "periodo": {
            "fecha_inicio": fecha_inicio,
            "fecha_fin": fecha_fin
        },
        "departamento": departamento_id,
        "estadisticas": {
            "total_justificaciones": len(justificaciones),
            "trabajadores_con_justificaciones": len(trabajadores_con_justificaciones)
        },
        "justificaciones_por_tipo": tipos_ordenados,
        "justificaciones_por_trabajador": trabajadores_ordenados
    }

# Agrega este código AL FINAL de tu archivo backend/app/routes/reportes.py

@router.get("/retardos-faltas")
def get_reporte_retardos_faltas(
    fecha_inicio: date = Query(..., description="Fecha de inicio del reporte"),
    fecha_fin: date = Query(..., description="Fecha de fin del reporte"),
    departamento_id: Optional[int] = Query(None, description="ID del departamento"),
    trabajador_id: Optional[int] = Query(None, description="ID del trabajador"),
    db: Session = Depends(get_db)
):
    """
    Genera un reporte específico de retardos y faltas
    """
    from datetime import timedelta
    
    # Query base de trabajadores
    query_trabajadores = db.query(Trabajador).filter(Trabajador.estado == True)
    
    if departamento_id:
        query_trabajadores = query_trabajadores.filter(
            Trabajador.id_departamento == departamento_id
        )
    
    if trabajador_id:
        query_trabajadores = query_trabajadores.filter(
            Trabajador.id == trabajador_id
        )
    
    trabajadores = query_trabajadores.all()
    
    # Preparar respuesta
    trabajadores_data = []
    
    for trabajador in trabajadores:
        # Obtener registros del período para este trabajador
        registros = db.query(RegistroAsistencia).filter(
            RegistroAsistencia.id_trabajador == trabajador.id,  # USAR id_trabajador, NO id_trabajador
            RegistroAsistencia.fecha.between(fecha_inicio, fecha_fin)
        ).order_by(RegistroAsistencia.fecha).all()
        
        # Calcular estadísticas
        dias_laborables = 0
        asistencias = 0
        retardos = 0
        faltas = 0
        registros_diarios = []
        
        # Iterar por cada día del período
        fecha_actual = fecha_inicio
        while fecha_actual <= fecha_fin:
            # Saltar fines de semana (sábado=5, domingo=6)
            if fecha_actual.weekday() < 5:  # Lunes a Viernes
                dias_laborables += 1
                
                # Buscar registro para este día
                registro_dia = next(
                    (r for r in registros if r.fecha == fecha_actual), 
                    None
                )
                
                if registro_dia:
                    # Determinar estatus
                    estatus = "FALTA"
                    hora_entrada = None
                    hora_salida = None
                    
                    if registro_dia.hora_entrada:
                        hora_entrada = registro_dia.hora_entrada.strftime("%H:%M")
                        
                        # Obtener horario del trabajador (asumiendo 8:00 AM por defecto)
                        hora_limite = registro_dia.hora_entrada.replace(hour=8, minute=0, second=0)
                        hora_tolerancia = hora_limite.replace(minute=15)
                        
                        if registro_dia.hora_entrada <= hora_limite:
                            estatus = "ASISTENCIA"
                            asistencias += 1
                        elif registro_dia.hora_entrada <= hora_tolerancia:
                            estatus = "RETARDO"
                            retardos += 1
                        else:
                            estatus = "RETARDO MAYOR"
                            retardos += 1
                    else:
                        faltas += 1
                    
                    if registro_dia.hora_salida:
                        hora_salida = registro_dia.hora_salida.strftime("%H:%M")
                    
                    registros_diarios.append({
                        "fecha": fecha_actual.isoformat(),
                        "hora_entrada": hora_entrada,
                        "hora_salida": hora_salida,
                        "estatus": estatus
                    })
                else:
                    # No hay registro, es falta
                    faltas += 1
                    registros_diarios.append({
                        "fecha": fecha_actual.isoformat(),
                        "hora_entrada": None,
                        "hora_salida": None,
                        "estatus": "FALTA"
                    })
            
            fecha_actual += timedelta(days=1)
        
        # Calcular porcentaje de asistencia
        porcentaje_asistencia = (asistencias / dias_laborables * 100) if dias_laborables > 0 else 0
        
        # Obtener información del departamento
        departamento_nombre = trabajador.departamento.descripcion if trabajador.departamento else "Sin departamento"
        puesto = trabajador.puesto if trabajador.puesto else "Sin puesto"
        
        trabajadores_data.append({
            "id": trabajador.id,
            "nombre": f"{trabajador.nombre} {trabajador.apellido_paterno} {trabajador.apellido_materno}",
            "rfc": trabajador.rfc,
            "departamento": departamento_nombre,
            "puesto": puesto,
            "estadisticas": {
                "dias_laborables": dias_laborables,
                "asistencias": asistencias,
                "retardos": retardos,
                "faltas": faltas,
                "porcentaje_asistencia": round(porcentaje_asistencia, 2)
            },
            "registros_diarios": registros_diarios
        })
    
    return {
        "fecha_inicio": fecha_inicio.isoformat(),
        "fecha_fin": fecha_fin.isoformat(),
        "trabajadores": trabajadores_data,
        "resumen": {
            "total_trabajadores": len(trabajadores_data),
            "total_retardos": sum(t["estadisticas"]["retardos"] for t in trabajadores_data),
            "total_faltas": sum(t["estadisticas"]["faltas"] for t in trabajadores_data)
        }
    }