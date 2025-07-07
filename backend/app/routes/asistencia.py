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

# CONFIGURACIÓN DE ZONA HORARIA - Los Mochis, Sinaloa
# Los Mochis está en la zona horaria de Montaña (MST/MDT)
TIMEZONE_MEXICO = pytz.timezone('America/Mazatlan')

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
                "rfc": trabajador.rfc,
                "departamento": departamento.descripcion,
                "hora_registro": asistencia.fecha,
                "estatus": asistencia.estatus
            })
        else:
            # Trabajador sin asistencia registrada
            resultado.append({
                "id": trabajador.id,
                "nombre": f"{trabajador.nombre} {trabajador.apellidoPaterno} {trabajador.apellidoMaterno}",
                "rfc": trabajador.rfc,
                "departamento": departamento.descripcion,
                "hora_registro": None,
                "estatus": "NO_REGISTRADO"
            })
    
    # Calcular estadísticas
    estadisticas = {
        "total_trabajadores": len(trabajadores),
        "asistencias": sum(1 for r in resultado if r["estatus"] == "ASISTENCIA"),
        "retardos": sum(1 for r in resultado if "RETARDO" in r["estatus"]),
        "faltas": sum(1 for r in resultado if r["estatus"] == "FALTA"),
        "no_registrados": sum(1 for r in resultado if r["estatus"] == "NO_REGISTRADO")
    }
    
    print(f"Estadísticas calculadas: {estadisticas}")
    
    return {
        "fecha": ahora_mexico.date(),
        "registros": resultado,
        "estadisticas": estadisticas
    }

# ===== RUTAS CRUD BÁSICAS =====

@router.post("/asistencias", response_model=RegistroAsistenciaOut)
def create_asistencia(
    asistencia: RegistroAsistenciaCreate,
    db: Session = Depends(get_db),
    current_user: Trabajador = Depends(get_current_trabajador)
):
    """Crear un nuevo registro de asistencia manual"""
    print(f"=== CREANDO REGISTRO DE ASISTENCIA MANUAL ===")
    print(f"Datos recibidos: {asistencia.dict()}")
    
    # Verificar que el trabajador existe
    trabajador = db.query(Trabajador).filter(
        Trabajador.id == asistencia.id_trabajador
    ).first()
    
    if not trabajador:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Trabajador con ID {asistencia.id_trabajador} no encontrado"
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
            elif '+' in fecha_recibida or '-' in fecha_recibida[-6:]:
                # Timezone aware format con offset (e.g., 2025-01-07T10:30:00-07:00)
                fecha_dt = datetime.fromisoformat(fecha_recibida)
                fecha_local = fecha_dt.astimezone(TIMEZONE_MEXICO)
            else:
                # Naive format - asumir que está en hora local de México
                fecha_dt = datetime.fromisoformat(fecha_recibida)
                fecha_local = TIMEZONE_MEXICO.localize(fecha_dt)
        else:
            # Ya es datetime
            if fecha_recibida.tzinfo is not None:
                fecha_local = fecha_recibida.astimezone(TIMEZONE_MEXICO)
            else:
                fecha_local = TIMEZONE_MEXICO.localize(fecha_recibida)
        
        print(f"Fecha procesada (México): {fecha_local}")
        
        # Para guardar en BD, usar naive datetime en hora local
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
    
    # Crear el registro de asistencia con el estatus calculado
    db_asistencia = RegistroAsistencia(
        id_trabajador=asistencia.id_trabajador,
        fecha=fecha_para_bd,  # Usar fecha procesada
        estatus=estatus_calculado  # Usar estatus calculado
    )
    
    db.add(db_asistencia)
    db.commit()
    db.refresh(db_asistencia)
    
    print(f"✅ Asistencia registrada con ID: {db_asistencia.id}")
    print(f"   Fecha guardada: {db_asistencia.fecha}")
    print(f"   Estatus: {db_asistencia.estatus}")
    
    return db_asistencia

@router.get("/asistencias", response_model=List[RegistroAsistenciaOut])
def list_asistencias(
    skip: int = 0,
    limit: int = 100,
    fecha_inicio: Optional[date] = None,
    fecha_fin: Optional[date] = None,
    trabajador_id: Optional[int] = None,
    departamento_id: Optional[int] = None,
    estatus: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: Trabajador = Depends(get_current_trabajador)
):
    query = db.query(RegistroAsistencia)
    
    # Aplicar filtros
    if fecha_inicio and fecha_fin:
        fecha_inicio_dt = datetime.combine(fecha_inicio, time.min)
        fecha_fin_dt = datetime.combine(fecha_fin, time.max)
        query = query.filter(
            RegistroAsistencia.fecha >= fecha_inicio_dt,
            RegistroAsistencia.fecha <= fecha_fin_dt
        )
    
    if trabajador_id:
        query = query.filter(RegistroAsistencia.id_trabajador == trabajador_id)
    
    if departamento_id:
        query = query.join(Trabajador).filter(Trabajador.departamento == departamento_id)
    
    if estatus:
        query = query.filter(RegistroAsistencia.estatus == estatus)
    
    return query.offset(skip).limit(limit).all()

@router.get("/asistencias/{asistencia_id}", response_model=RegistroAsistenciaOut)
def get_asistencia(
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

@router.get("/reglas-retardo", response_model=List[ReglaRetardoOut])
def list_reglas_retardo(
    db: Session = Depends(get_db),
    current_user: Trabajador = Depends(get_current_trabajador)
):
    return db.query(ReglaRetardo).order_by(ReglaRetardo.minutosMin).all()

@router.post("/reglas-retardo", response_model=ReglaRetardoOut)
def create_regla_retardo(
    regla: ReglaRetardoCreate,
    db: Session = Depends(get_db),
    current_user: Trabajador = Depends(check_admin_permissions)
):
    # Verificar que no haya conflicto con otras reglas
    conflicto = db.query(ReglaRetardo).filter(
        ((ReglaRetardo.minutosMin <= regla.minutosMin) & (ReglaRetardo.minutosMax >= regla.minutosMin)) |
        ((ReglaRetardo.minutosMin <= regla.minutosMax) & (ReglaRetardo.minutosMax >= regla.minutosMax))
    ).first()
    
    if conflicto:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La regla se traslapa con una regla existente"
        )
    
    db_regla = ReglaRetardo(**regla.dict())
    db.add(db_regla)
    db.commit()
    db.refresh(db_regla)
    return db_regla

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