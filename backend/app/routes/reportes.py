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


@router.get("/retardos-faltas")
def get_reporte_retardos_faltas(
    fecha_inicio: date = Query(..., description="Fecha de inicio"),
    fecha_fin: date = Query(..., description="Fecha de fin"),
    departamento_id: Optional[int] = Query(None, description="ID del departamento"),
    trabajador_id: Optional[int] = Query(None, description="ID del trabajador"),
    db: Session = Depends(get_db)
):
    """
    Genera reporte de retardos y faltas - CORREGIDO PARA TUS MODELOS
    """
    print(f"🔍 DEBUG: Iniciando reporte de {fecha_inicio} a {fecha_fin}")
    
    try:
        # Query base de trabajadores activos
        query_trabajadores = db.query(Trabajador).filter(Trabajador.estado == True)
        
        if departamento_id:
            query_trabajadores = query_trabajadores.filter(
                Trabajador.departamento == departamento_id  # Nota: es 'departamento', no 'id_departamento'
            )
        
        if trabajador_id:
            query_trabajadores = query_trabajadores.filter(
                Trabajador.id == trabajador_id
            )
        
        trabajadores = query_trabajadores.all()
        print(f"🔍 DEBUG: Encontrados {len(trabajadores)} trabajadores activos")
        
        trabajadores_data = []
        
        for trabajador in trabajadores:
            # Obtener registros de la tabla registroAsistencia
            registros = db.query(RegistroAsistencia).filter(
                RegistroAsistencia.id_trabajador == trabajador.id,
                func.date(RegistroAsistencia.fecha) >= fecha_inicio,
                func.date(RegistroAsistencia.fecha) <= fecha_fin
            ).order_by(RegistroAsistencia.fecha).all()
            
            print(f"🔍 DEBUG: Trabajador {trabajador.nombre} tiene {len(registros)} registros")
            
            # Inicializar contadores
            dias_laborables = 0
            asistencias = 0
            retardos = 0
            retardos_menores = 0
            retardos_mayores = 0
            faltas = 0
            total_minutos_retardo = 0
            registros_diarios = []
            
            # Obtener horario del trabajador si existe
            hora_entrada_esperada = time(8, 0, 0)  # Por defecto 8:00 AM
            if trabajador.id_horario and trabajador.horario_rel:
                # Aquí podrías obtener el horario específico del día
                # Por ahora usamos lunes como referencia
                hora_entrada_esperada = trabajador.horario_rel.lunesEntrada
            
            # Iterar por cada día del período
            fecha_actual = fecha_inicio
            while fecha_actual <= fecha_fin:
                dia_semana = fecha_actual.weekday()
                
                # Solo días laborables (Lunes=0 a Viernes=4)
                if dia_semana < 5:
                    dias_laborables += 1
                    
                    # Buscar registro para este día
                    registro_dia = None
                    for reg in registros:
                        # Comparar solo la fecha (sin hora)
                        if reg.fecha.date() == fecha_actual:
                            registro_dia = reg
                            break
                    
                    hora_entrada_str = None
                    hora_salida_str = None
                    estatus_dia = "FALTA"
                    minutos_retardo_dia = 0
                    justificacion = None
                    
                    if registro_dia:
                        # Usar el estatus que ya viene de la base de datos
                        estatus_dia = registro_dia.estatus
                        
                        # Extraer hora de entrada si existe
                        if registro_dia.fecha:
                            hora_entrada_str = registro_dia.fecha.strftime("%H:%M:%S")
                            
                            # Calcular si es retardo basándose en la hora
                            hora_entrada_real = registro_dia.fecha.time()
                            hora_tolerancia = time(8, 15, 0)  # 15 minutos de tolerancia
                            
                            if hora_entrada_real <= hora_entrada_esperada:
                                estatus_dia = "ASISTENCIA"
                                asistencias += 1
                            elif hora_entrada_real <= hora_tolerancia:
                                estatus_dia = "RETARDO MENOR"
                                retardos += 1
                                retardos_menores += 1
                                # Calcular minutos de retardo
                                entrada_dt = datetime.combine(fecha_actual, hora_entrada_real)
                                esperada_dt = datetime.combine(fecha_actual, hora_entrada_esperada)
                                diff = entrada_dt - esperada_dt
                                minutos_retardo_dia = int(diff.total_seconds() / 60)
                                total_minutos_retardo += minutos_retardo_dia
                            else:
                                estatus_dia = "RETARDO MAYOR"
                                retardos += 1
                                retardos_mayores += 1
                                entrada_dt = datetime.combine(fecha_actual, hora_entrada_real)
                                esperada_dt = datetime.combine(fecha_actual, hora_entrada_esperada)
                                diff = entrada_dt - esperada_dt
                                minutos_retardo_dia = int(diff.total_seconds() / 60)
                                total_minutos_retardo += minutos_retardo_dia
                        
                        # Si el estatus indica falta
                        if "FALTA" in estatus_dia.upper():
                            faltas += 1
                    else:
                        # No hay registro = falta
                        faltas += 1
                        estatus_dia = "FALTA"
                    
                    # Buscar justificación
                    justificacion_obj = db.query(Justificacion).filter(
                        Justificacion.id_trabajador == trabajador.id,
                        func.date(Justificacion.fecha) == fecha_actual
                    ).first()
                    
                    if justificacion_obj:
                        # Obtener la descripción de la regla
                        regla = db.query(ReglaJustificacion).filter(
                            ReglaJustificacion.id == justificacion_obj.id_descripcion
                        ).first()
                        
                        if regla:
                            justificacion = regla.descripcion
                            # Actualizar estatus si está justificado
                            if "FALTA" in estatus_dia:
                                estatus_dia = "FALTA JUSTIFICADA"
                                faltas -= 1  # No contar como falta
                            elif "RETARDO" in estatus_dia:
                                estatus_dia = f"{estatus_dia} JUSTIF."
                                retardos -= 1  # No contar como retardo
                                if "MENOR" in estatus_dia:
                                    retardos_menores -= 1
                                else:
                                    retardos_mayores -= 1
                    
                    # Agregar registro diario
                    registros_diarios.append({
                        "fecha": fecha_actual.isoformat(),
                        "dia_semana": ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"][dia_semana],
                        "hora_entrada": hora_entrada_str,
                        "hora_salida": hora_salida_str,  # Por ahora null, ajustar si tienes hora de salida
                        "estatus": estatus_dia,
                        "minutos_retardo": minutos_retardo_dia,
                        "observaciones": None,
                        "justificacion": justificacion
                    })
                
                fecha_actual += timedelta(days=1)
            
            # Calcular porcentaje de asistencia
            porcentaje_asistencia = 0
            if dias_laborables > 0:
                porcentaje_asistencia = (asistencias / dias_laborables) * 100
            
            # Obtener información del departamento
            departamento_nombre = "Sin departamento"
            if trabajador.departamento and trabajador.departamento_rel:
                departamento_nombre = trabajador.departamento_rel.descripcion
            
            # Construir nombre completo
            nombre_completo = f"{trabajador.nombre} {trabajador.apellidoPaterno} {trabajador.apellidoMaterno}".strip()
            
            # Agregar datos del trabajador
            trabajadores_data.append({
                "id": trabajador.id,
                "nombre": nombre_completo,
                "rfc": trabajador.rfc,
                "departamento": departamento_nombre,
                "puesto": trabajador.puesto,
                "telefono": "",  # No veo campo telefono en tu modelo
                "email": trabajador.correo,  # Usas 'correo' no 'email'
                "estadisticas": {
                    "dias_laborables": dias_laborables,
                    "asistencias": asistencias,
                    "retardos": retardos,
                    "retardos_menores": retardos_menores,
                    "retardos_mayores": retardos_mayores,
                    "faltas": faltas,
                    "porcentaje_asistencia": round(porcentaje_asistencia, 2),
                    "total_minutos_retardo": total_minutos_retardo
                },
                "registros_diarios": registros_diarios
            })
        
        # Ordenar por faltas y retardos (los peores primero)
        trabajadores_data.sort(
            key=lambda x: (x["estadisticas"]["faltas"], x["estadisticas"]["retardos"]), 
            reverse=True
        )
        
        print(f"✅ DEBUG: Generando reporte con {len(trabajadores_data)} trabajadores")
        
        # Calcular resumen
        total_trabajadores = len(trabajadores_data)
        total_retardos = sum(t["estadisticas"]["retardos"] for t in trabajadores_data)
        total_faltas = sum(t["estadisticas"]["faltas"] for t in trabajadores_data)
        promedio_asistencia = 0
        
        if total_trabajadores > 0:
            promedio_asistencia = sum(t["estadisticas"]["porcentaje_asistencia"] for t in trabajadores_data) / total_trabajadores
        
        return {
            "fecha_inicio": fecha_inicio.isoformat(),
            "fecha_fin": fecha_fin.isoformat(),
            "trabajadores": trabajadores_data,
            "resumen": {
                "total_trabajadores": total_trabajadores,
                "total_retardos": total_retardos,
                "total_retardos_menores": sum(t["estadisticas"]["retardos_menores"] for t in trabajadores_data),
                "total_retardos_mayores": sum(t["estadisticas"]["retardos_mayores"] for t in trabajadores_data),
                "total_faltas": total_faltas,
                "promedio_asistencia": round(promedio_asistencia, 2),
                "total_minutos_retardo": sum(t["estadisticas"]["total_minutos_retardo"] for t in trabajadores_data),
                "periodo_dias": (fecha_fin - fecha_inicio).days + 1
            }
        }
        
    except Exception as e:
        print(f"❌ ERROR en endpoint: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

# ENDPOINT ADICIONAL PARA OBTENER LAS REGLAS DE JUSTIFICACIÓN
@router.get("/reglas-justificacion")
def get_reglas_justificacion(
    db: Session = Depends(get_db)
):
    """
    Obtiene todas las reglas de justificación disponibles
    """
    reglas = db.query(ReglaJustificacion).all()
    
    return [
        {
            "id": regla.id,
            "descripcion": regla.descripcion
        }
        for regla in reglas
    ]

# ENDPOINT PARA CREAR UNA JUSTIFICACIÓN
@router.post("/justificaciones")
def crear_justificacion(
    id_trabajador: int = Query(..., description="ID del trabajador"),
    fecha: date = Query(..., description="Fecha a justificar"),
    id_descripcion: int = Query(..., description="ID de la regla de justificación"),
    db: Session = Depends(get_db)
):
    """
    Crea una nueva justificación para un trabajador
    """
    # Verificar que no exista ya una justificación para esa fecha
    justificacion_existente = db.query(Justificacion).filter(
        Justificacion.id_trabajador == id_trabajador,
        func.date(Justificacion.fecha) == fecha
    ).first()
    
    if justificacion_existente:
        raise HTTPException(
            status_code=400,
            detail="Ya existe una justificación para esta fecha"
        )
    
    # Verificar que la regla de justificación exista
    regla = db.query(ReglaJustificacion).filter(
        ReglaJustificacion.id == id_descripcion
    ).first()
    
    if not regla:
        raise HTTPException(
            status_code=404,
            detail="La regla de justificación no existe"
        )
    
    # Crear la justificación
    nueva_justificacion = Justificacion(
        id_trabajador=id_trabajador,
        fecha=datetime.combine(fecha, datetime.min.time()),
        id_descripcion=id_descripcion
    )
    
    db.add(nueva_justificacion)
    db.commit()
    db.refresh(nueva_justificacion)
    
    return {
        "id": nueva_justificacion.id,
        "id_trabajador": nueva_justificacion.id_trabajador,
        "fecha": nueva_justificacion.fecha.date().isoformat(),
        "id_descripcion": nueva_justificacion.id_descripcion,
        "descripcion": regla.descripcion
    }

# ENDPOINT PARA OBTENER JUSTIFICACIONES DE UN TRABAJADOR
@router.get("/trabajadores/{id_trabajador}/justificaciones")
def get_justificaciones_trabajador(
    id_trabajador: int,
    fecha_inicio: Optional[date] = Query(None),
    fecha_fin: Optional[date] = Query(None),
    db: Session = Depends(get_db)
):
    """
    Obtiene las justificaciones de un trabajador en un período
    """
    query = db.query(Justificacion).filter(
        Justificacion.id_trabajador == id_trabajador
    )
    
    if fecha_inicio:
        query = query.filter(Justificacion.fecha >= fecha_inicio)
    
    if fecha_fin:
        query = query.filter(Justificacion.fecha <= fecha_fin)
    
    justificaciones = query.all()
    
    resultado = []
    for just in justificaciones:
        regla = db.query(ReglaJustificacion).filter(
            ReglaJustificacion.id == just.id_descripcion
        ).first()
        
        resultado.append({
            "id": just.id,
            "fecha": just.fecha.date().isoformat(),
            "id_descripcion": just.id_descripcion,
            "descripcion": regla.descripcion if regla else "Sin descripción"
        })
    
    return resultado