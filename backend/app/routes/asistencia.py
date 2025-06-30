from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, date, time, timedelta
import pytz
from app.database import get_db
from app.models.models import (
    RegistroAsistencia, 
    Trabajador, 
    ReglaRetardo,
    Departamento,
    Horario
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

router = APIRouter()

# CONFIGURACIÓN DE ZONA HORARIA
TIMEZONE_MEXICO = pytz.timezone('America/Mexico_City')

def determinar_estatus_asistencia(trabajador: Trabajador, fecha_hora_registro: datetime, db: Session) -> str:
    """
    Determina el estatus de asistencia basado en el horario del trabajador.
    
    CORREGIDO: Manejo adecuado de zonas horarias y comparación de horas.
    """
    print(f"=== DETERMINANDO ESTATUS PARA TRABAJADOR {trabajador.id} ===")
    print(f"Trabajador: {trabajador.nombre} {trabajador.apellidoPaterno}")
    print(f"Fecha/hora registro recibida: {fecha_hora_registro}")
    print(f"Tipo de fecha_hora_registro: {type(fecha_hora_registro)}")
    
    # PASO 1: Normalizar datetime para trabajar en zona horaria local
    if fecha_hora_registro.tzinfo is not None:
        # Si tiene timezone, convertir a México
        fecha_hora_local = fecha_hora_registro.astimezone(TIMEZONE_MEXICO)
        print(f"Convertido a zona horaria México: {fecha_hora_local}")
    else:
        # Si es naive, asumir que ya está en hora local de México
        fecha_hora_local = TIMEZONE_MEXICO.localize(fecha_hora_registro)
        print(f"Localizado a zona horaria México: {fecha_hora_local}")
    
    # PASO 2: Crear versión naive para comparaciones (sin timezone info)
    fecha_hora_naive = fecha_hora_local.replace(tzinfo=None)
    print(f"Fecha/hora naive para comparación: {fecha_hora_naive}")
    
    # PASO 3: Obtener el horario del trabajador
    horario = db.query(Horario).filter(Horario.id == trabajador.id_horario).first()
    if not horario:
        print(f"⚠️ Trabajador sin horario asignado, asignando ASISTENCIA por defecto")
        return "ASISTENCIA"
    
    print(f"Horario encontrado: {horario.descripcion}")
    
    # PASO 4: Determinar qué día de la semana es (0 = lunes, 6 = domingo)
    dia_semana = fecha_hora_naive.weekday()
    print(f"Día de la semana: {dia_semana} (0=lunes, 6=domingo)")
    
    # PASO 5: Obtener la hora de entrada según el día
    hora_entrada = None
    
    if dia_semana == 0:  # Lunes
        hora_entrada = horario.lunesEntrada
        print(f"Es lunes, hora de entrada: {hora_entrada}")
    elif dia_semana == 1:  # Martes
        hora_entrada = horario.martesEntrada
        print(f"Es martes, hora de entrada: {hora_entrada}")
    elif dia_semana == 2:  # Miércoles
        hora_entrada = horario.miercolesEntrada
        print(f"Es miércoles, hora de entrada: {hora_entrada}")
    elif dia_semana == 3:  # Jueves
        hora_entrada = horario.juevesEntrada
        print(f"Es jueves, hora de entrada: {hora_entrada}")
    elif dia_semana == 4:  # Viernes
        hora_entrada = horario.viernesEntrada
        print(f"Es viernes, hora de entrada: {hora_entrada}")
    else:  # Fin de semana (sábado=5, domingo=6)
        print(f"📅 Es fin de semana, asignando ASISTENCIA")
        return "ASISTENCIA"
    
    if not hora_entrada:
        print(f"⚠️ No hay hora de entrada para este día, asignando ASISTENCIA")
        return "ASISTENCIA"
    
    print(f"Hora de entrada programada: {hora_entrada}")
    print(f"Tipo de hora_entrada: {type(hora_entrada)}")
    
    # PASO 6: CORREGIDO - Crear datetime de la hora de entrada para el mismo día
    try:
        # Combinar la fecha del registro con la hora de entrada programada
        fecha_entrada_programada = datetime.combine(
            fecha_hora_naive.date(), 
            hora_entrada
        )
        print(f"Fecha/hora entrada programada: {fecha_entrada_programada}")
        print(f"Tipo de fecha_entrada_programada: {type(fecha_entrada_programada)}")
        
    except Exception as e:
        print(f"❌ Error al combinar fecha y hora: {e}")
        print(f"fecha_hora_naive.date(): {fecha_hora_naive.date()}")
        print(f"hora_entrada: {hora_entrada}")
        return "ASISTENCIA"
    
    # PASO 7: CORREGIDO - Calcular la diferencia en minutos
    try:
        diferencia = fecha_hora_naive - fecha_entrada_programada
        minutos_diferencia = int(diferencia.total_seconds() / 60)
        
        print(f"=== CÁLCULO DE DIFERENCIA ===")
        print(f"Hora de registro: {fecha_hora_naive.strftime('%H:%M:%S')}")
        print(f"Hora programada: {fecha_entrada_programada.strftime('%H:%M:%S')}")
        print(f"Diferencia en segundos: {diferencia.total_seconds()}")
        print(f"Diferencia en minutos: {minutos_diferencia}")
        
    except Exception as e:
        print(f"❌ Error al calcular diferencia: {e}")
        return "ASISTENCIA"
    
    # PASO 8: Aplicar las reglas de tolerancia CORREGIDAS
    if minutos_diferencia <= 10:
        print(f"✅ ASISTENCIA (llegó {minutos_diferencia} minutos después del horario)")
        return "ASISTENCIA"
    elif minutos_diferencia <= 20:
        print(f"⚠️ RETARDO_MENOR (llegó {minutos_diferencia} minutos después del horario)")
        return "RETARDO_MENOR"
    elif minutos_diferencia <= 30:
        print(f"⚠️ RETARDO_MAYOR (llegó {minutos_diferencia} minutos después del horario)")
        return "RETARDO_MAYOR"
    else:
        print(f"❌ FALTA (llegó {minutos_diferencia} minutos después del horario)")
        return "FALTA"

# IMPORTANTE: Las rutas más específicas DEBEN ir ANTES que las rutas con parámetros

# ===== RUTAS ESPECIALES (DEBEN IR PRIMERO) =====

@router.get("/asistencias/hoy")
def get_asistencias_hoy(
    db: Session = Depends(get_db),
    current_user: Trabajador = Depends(get_current_trabajador)
):
    """
    IMPORTANTE: Esta ruta DEBE ir ANTES que /asistencias/{asistencia_id}
    para evitar que FastAPI confunda 'hoy' con un ID
    """
    print("=== OBTENIENDO ASISTENCIAS DE HOY ===")
    
    # Obtener la fecha de hoy en zona horaria de México
    ahora_mexico = datetime.now(TIMEZONE_MEXICO)
    hoy_inicio = ahora_mexico.replace(hour=0, minute=0, second=0, microsecond=0)
    hoy_fin = ahora_mexico.replace(hour=23, minute=59, second=59, microsecond=999999)
    
    # Convertir a naive datetime para la consulta en base de datos
    hoy_inicio_naive = hoy_inicio.replace(tzinfo=None)
    hoy_fin_naive = hoy_fin.replace(tzinfo=None)
    
    print(f"Rango de fechas (México): {hoy_inicio} - {hoy_fin}")
    print(f"Rango naive para BD: {hoy_inicio_naive} - {hoy_fin_naive}")
    
    # Consultar asistencias de hoy con JOIN para obtener datos del trabajador
    asistencias_query = db.query(
        RegistroAsistencia, 
        Trabajador, 
        Departamento
    ).join(
        Trabajador, RegistroAsistencia.id_trabajador == Trabajador.id
    ).join(
        Departamento, Trabajador.departamento == Departamento.id
    ).filter(
        RegistroAsistencia.fecha >= hoy_inicio_naive,
        RegistroAsistencia.fecha <= hoy_fin_naive
    ).all()
    
    print(f"Asistencias encontradas: {len(asistencias_query)}")
    
    # Obtener todos los trabajadores activos
    trabajadores = db.query(Trabajador, Departamento).join(
        Departamento, Trabajador.departamento == Departamento.id
    ).filter(Trabajador.estado == True).all()
    
    print(f"Total trabajadores activos: {len(trabajadores)}")
    
    # Crear diccionario de asistencias por trabajador
    asistencias_por_trabajador = {}
    for asistencia, trabajador, departamento in asistencias_query:
        asistencias_por_trabajador[trabajador.id] = {
            'asistencia': asistencia,
            'trabajador': trabajador,
            'departamento': departamento
        }
    
    # Preparar la respuesta con la estructura correcta
    resultado = []
    for trabajador, departamento in trabajadores:
        if trabajador.id in asistencias_por_trabajador:
            # Trabajador con asistencia registrada
            data = asistencias_por_trabajador[trabajador.id]
            asistencia = data['asistencia']
            resultado.append({
                "id": trabajador.id,
                "nombre": f"{trabajador.nombre} {trabajador.apellidoPaterno} {trabajador.apellidoMaterno}",
                "departamento": departamento.descripcion,
                "puesto": trabajador.puesto,
                "estatus": asistencia.estatus,
                "hora_registro": asistencia.fecha
            })
        else:
            # Trabajador sin asistencia registrada
            resultado.append({
                "id": trabajador.id,
                "nombre": f"{trabajador.nombre} {trabajador.apellidoPaterno} {trabajador.apellidoMaterno}",
                "departamento": departamento.descripcion,
                "puesto": trabajador.puesto,
                "estatus": "NO_REGISTRADO",
                "hora_registro": None
            })
    
    # Calcular estadísticas generales
    total_trabajadores = len(trabajadores)
    asistencias_count = sum(1 for r in resultado if r["estatus"] == "ASISTENCIA")
    retardos_count = sum(1 for r in resultado if "RETARDO" in r["estatus"])
    faltas_count = sum(1 for r in resultado if r["estatus"] == "FALTA")
    no_registrados = sum(1 for r in resultado if r["estatus"] == "NO_REGISTRADO")
    
    print(f"Estadísticas calculadas:")
    print(f"  - Total trabajadores: {total_trabajadores}")
    print(f"  - Asistencias: {asistencias_count}")
    print(f"  - Retardos: {retardos_count}")
    print(f"  - Faltas: {faltas_count}")
    print(f"  - No registrados: {no_registrados}")
    
    return {
        "fecha": ahora_mexico.date(),
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

@router.get("/asistencias/trabajador/{trabajador_id}")
def get_asistencias_by_trabajador(
    trabajador_id: int,
    fecha_inicio: Optional[date] = None,
    fecha_fin: Optional[date] = None,
    db: Session = Depends(get_db),
    current_user: Trabajador = Depends(get_current_trabajador)
):
    """
    Esta ruta también es específica y debe ir antes de /asistencias/{asistencia_id}
    """
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
        RegistroAsistencia.id_trabajador == trabajador_id,
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

# ===== RUTAS CRUD BÁSICAS (VAN DESPUÉS DE LAS ESPECÍFICAS) =====

@router.post("/asistencias", response_model=RegistroAsistenciaOut, status_code=status.HTTP_201_CREATED)
def create_asistencia(
    asistencia: RegistroAsistenciaCreate, 
    db: Session = Depends(get_db),
    current_user: Trabajador = Depends(check_admin_permissions)
):
    print(f"=== CREANDO REGISTRO DE ASISTENCIA CORREGIDO ===")
    print(f"Datos recibidos: {asistencia.dict()}")
    
    # Verificar si el trabajador existe
    trabajador = db.query(Trabajador).filter(Trabajador.id == asistencia.id_trabajador).first()
    if not trabajador:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Trabajador con ID {asistencia.id_trabajador} no existe"
        )
    
    print(f"Trabajador encontrado: {trabajador.nombre} {trabajador.apellidoPaterno}")
    
    # CORREGIDO: Procesar la fecha recibida del frontend
    try:
        fecha_recibida = asistencia.fecha
        print(f"Fecha recibida del frontend: {fecha_recibida}")
        print(f"Tipo de fecha recibida: {type(fecha_recibida)}")
        
        # Si la fecha viene como string ISO, convertirla a datetime
        if isinstance(fecha_recibida, str):
            # Parsear la fecha ISO
            if fecha_recibida.endswith('Z'):
                # UTC format
                fecha_dt = datetime.fromisoformat(fecha_recibida.replace('Z', '+00:00'))
                fecha_local = fecha_dt.astimezone(TIMEZONE_MEXICO)
            elif '+' in fecha_recibida or fecha_recibida.endswith('00'):
                # Timezone aware format
                fecha_dt = datetime.fromisoformat(fecha_recibida)
                fecha_local = fecha_dt.astimezone(TIMEZONE_MEXICO)
            else:
                # Naive format - asumir que está en hora local
                fecha_dt = datetime.fromisoformat(fecha_recibida)
                fecha_local = TIMEZONE_MEXICO.localize(fecha_dt)
        else:
            # Ya es datetime
            if fecha_recibida.tzinfo is not None:
                fecha_local = fecha_recibida.astimezone(TIMEZONE_MEXICO)
            else:
                fecha_local = TIMEZONE_MEXICO.localize(fecha_recibida)
        
        print(f"Fecha procesada (México): {fecha_local}")
        
        # Para guardar en BD, usar naive datetime
        fecha_para_bd = fecha_local.replace(tzinfo=None)
        print(f"Fecha para base de datos: {fecha_para_bd}")
        
    except Exception as e:
        print(f"❌ Error al procesar fecha: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Error al procesar la fecha: {str(e)}"
        )
    
    # CORREGIDO: Determinar automáticamente el estatus basado en el horario
    try:
        estatus_calculado = determinar_estatus_asistencia(trabajador, fecha_para_bd, db)
        print(f"Estatus calculado: {estatus_calculado}")
    except Exception as e:
        print(f"❌ Error al calcular estatus: {e}")
        # En caso de error, usar ASISTENCIA como valor por defecto
        estatus_calculado = "ASISTENCIA"
        print(f"Usando estatus por defecto: {estatus_calculado}")
    
    # Crear el registro de asistencia con el estatus calculado y fecha corregida
    try:
        db_asistencia = RegistroAsistencia(
            id_trabajador=asistencia.id_trabajador,
            fecha=fecha_para_bd,  # Usar la fecha procesada correctamente
            estatus=estatus_calculado  # Usar el estatus calculado
        )
        
        db.add(db_asistencia)
        db.commit()
        db.refresh(db_asistencia)
        
        print(f"✅ Asistencia creada con ID: {db_asistencia.id}")
        print(f"✅ Fecha guardada: {db_asistencia.fecha}")
        print(f"✅ Estatus asignado: {db_asistencia.estatus}")
        
        return db_asistencia
        
    except Exception as e:
        print(f"❌ Error al guardar en base de datos: {e}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al guardar la asistencia: {str(e)}"
        )

@router.get("/asistencias", response_model=List[RegistroAsistenciaOut])
def get_asistencias(
    skip: int = 0, 
    limit: int = 100,
    fecha_inicio: Optional[date] = None,
    fecha_fin: Optional[date] = None,
    id_trabajador: Optional[int] = None,
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
    
    if id_trabajador:
        query = query.filter(RegistroAsistencia.id_trabajador == id_trabajador)
    
    if estatus:
        query = query.filter(RegistroAsistencia.estatus == estatus)
    
    return query.offset(skip).limit(limit).all()

@router.get("/asistencias/{asistencia_id}", response_model=RegistroAsistenciaOut)
def get_asistencia_by_id(
    asistencia_id: int, 
    db: Session = Depends(get_db),
    current_user: Trabajador = Depends(get_current_trabajador)
):
    """
    IMPORTANTE: Esta ruta va DESPUÉS de las rutas específicas
    para evitar conflictos de parseo
    """
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
    
    # Si se actualiza la fecha, recalcular el estatus
    if 'fecha' in update_data:
        trabajador = db.query(Trabajador).filter(Trabajador.id == db_asistencia.id_trabajador).first()
        if trabajador:
            try:
                # Procesar la nueva fecha igual que en create
                nueva_fecha = update_data['fecha']
                if isinstance(nueva_fecha, str):
                    nueva_fecha = datetime.fromisoformat(nueva_fecha.replace('Z', '+00:00'))
                
                if nueva_fecha.tzinfo is not None:
                    nueva_fecha = nueva_fecha.astimezone(TIMEZONE_MEXICO).replace(tzinfo=None)
                
                nuevo_estatus = determinar_estatus_asistencia(trabajador, nueva_fecha, db)
                update_data['estatus'] = nuevo_estatus
                update_data['fecha'] = nueva_fecha
                print(f"Recalculando estatus por cambio de fecha: {nuevo_estatus}")
            except Exception as e:
                print(f"Error al recalcular estatus: {e}")
    
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

# ===== RUTAS PARA REGLAS DE RETARDO =====

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
    
    db.delete(db_regla)
    db.commit()
    return Nonefirst()
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