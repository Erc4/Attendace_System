from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import cast, Date, and_, or_
from typing import List, Optional, Literal
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

def determinar_tipo_registro(trabajador: Trabajador, fecha_hora_registro: datetime, db: Session) -> Literal["ENTRADA", "SALIDA"]:
    """
    Determina si el registro es de entrada o salida basándose en:
    1. Si ya existe un registro de entrada para ese día
    2. La cercanía a la hora de entrada o salida programada
    """
    print(f"=== DETERMINANDO TIPO DE REGISTRO ===")
    
    # Obtener registros existentes del día
    fecha_inicio = datetime.combine(fecha_hora_registro.date(), time.min)
    fecha_fin = datetime.combine(fecha_hora_registro.date(), time.max)
    
    registros_del_dia = db.query(RegistroAsistencia).filter(
        RegistroAsistencia.id_trabajador == trabajador.id,
        RegistroAsistencia.fecha >= fecha_inicio,
        RegistroAsistencia.fecha <= fecha_fin
    ).order_by(RegistroAsistencia.fecha).all()
    
    print(f"Registros existentes del día: {len(registros_del_dia)}")
    
    # Si no hay registros, es ENTRADA
    if not registros_del_dia:
        print("No hay registros previos, es ENTRADA")
        return "ENTRADA"
    
    # Contar registros de entrada
    registros_entrada = [r for r in registros_del_dia if r.estatus in ["ASISTENCIA", "RETARDO_MENOR", "RETARDO_MAYOR", "FALTA"]]
    registros_salida = [r for r in registros_del_dia if r.estatus == "SALIDA"]
    
    print(f"Registros de entrada: {len(registros_entrada)}")
    print(f"Registros de salida: {len(registros_salida)}")
    
    # Si hay igual o más salidas que entradas, el siguiente es ENTRADA
    if len(registros_salida) >= len(registros_entrada):
        print("Ya hay salida registrada, siguiente es ENTRADA")
        return "ENTRADA"
    
    # Si hay más entradas que salidas, el siguiente es SALIDA
    print("Ya hay entrada registrada, siguiente es SALIDA")
    return "SALIDA"

def determinar_estatus_asistencia(trabajador: Trabajador, fecha_hora_registro: datetime, tipo_registro: str, db: Session) -> str:
    """
    Determina el estatus de asistencia basado en:
    - El tipo de registro (ENTRADA o SALIDA)
    - El horario del trabajador
    - Las reglas de retardo (solo para ENTRADA)
    """
    print(f"=== DETERMINANDO ESTATUS PARA {tipo_registro} ===")
    print(f"Trabajador: {trabajador.nombre} {trabajador.apellidoPaterno}")
    print(f"Fecha/hora registro: {fecha_hora_registro}")
    
    # Para registros de SALIDA, siempre es "SALIDA"
    if tipo_registro == "SALIDA":
        print("Es registro de SALIDA")
        return "SALIDA"
    
    # Para registros de ENTRADA, calcular si hay retardo
    # Normalizar datetime para trabajar en zona horaria local
    if fecha_hora_registro.tzinfo is not None:
        fecha_hora_local = fecha_hora_registro.astimezone(TIMEZONE_MEXICO)
    else:
        fecha_hora_local = TIMEZONE_MEXICO.localize(fecha_hora_registro)
    
    fecha_hora_naive = fecha_hora_local.replace(tzinfo=None)
    
    # Obtener el horario del trabajador
    horario = db.query(Horario).filter(Horario.id == trabajador.id_horario).first()
    if not horario:
        print("⚠️ Trabajador sin horario asignado, asignando ASISTENCIA por defecto")
        return "ASISTENCIA"
    
    # Determinar qué día de la semana es
    dia_semana = fecha_hora_naive.weekday()
    hora_entrada = None
    
    if dia_semana == 0:  # Lunes
        hora_entrada = horario.lunesEntrada
    elif dia_semana == 1:  # Martes
        hora_entrada = horario.martesEntrada
    elif dia_semana == 2:  # Miércoles
        hora_entrada = horario.miercolesEntrada
    elif dia_semana == 3:  # Jueves
        hora_entrada = horario.juevesEntrada
    elif dia_semana == 4:  # Viernes
        hora_entrada = horario.viernesEntrada
    else:  # Fin de semana
        print("📅 Es fin de semana, asignando ASISTENCIA")
        return "ASISTENCIA"
    
    if not hora_entrada:
        print("⚠️ No hay hora de entrada para este día, asignando ASISTENCIA")
        return "ASISTENCIA"
    
    # Crear datetime de la hora de entrada programada
    try:
        fecha_entrada_programada = datetime.combine(
            fecha_hora_naive.date(), 
            hora_entrada
        )
        
        # Calcular la diferencia en minutos
        diferencia = fecha_hora_naive - fecha_entrada_programada
        minutos_diferencia = int(diferencia.total_seconds() / 60)
        
        print(f"Hora de registro: {fecha_hora_naive.strftime('%H:%M:%S')}")
        print(f"Hora programada: {fecha_entrada_programada.strftime('%H:%M:%S')}")
        print(f"Diferencia en minutos: {minutos_diferencia}")
        
    except Exception as e:
        print(f"❌ Error al calcular diferencia: {e}")
        return "ASISTENCIA"
    
    # Aplicar las reglas de tolerancia
    if minutos_diferencia <= 10:
        print(f"✅ ASISTENCIA (llegó {minutos_diferencia} minutos después)")
        return "ASISTENCIA"
    elif minutos_diferencia <= 20:
        print(f"⚠️ RETARDO_MENOR (llegó {minutos_diferencia} minutos después)")
        return "RETARDO_MENOR"
    elif minutos_diferencia <= 30:
        print(f"⚠️ RETARDO_MAYOR (llegó {minutos_diferencia} minutos después)")
        return "RETARDO_MAYOR"
    else:
        print(f"❌ FALTA (llegó {minutos_diferencia} minutos después)")
        return "FALTA"

# ===== RUTAS ESPECIALES (DEBEN IR PRIMERO) =====

@router.get("/asistencias/hoy")
def get_asistencias_hoy(
    db: Session = Depends(get_db),
    current_user: Trabajador = Depends(get_current_trabajador)
):
    """
    Obtiene las asistencias del día actual con información consolidada
    """
    print("=== OBTENIENDO ASISTENCIAS DE HOY ===")
    
    # Obtener la fecha de hoy en zona horaria de México
    ahora_mexico = datetime.now(TIMEZONE_MEXICO)
    hoy_inicio = ahora_mexico.replace(hour=0, minute=0, second=0, microsecond=0)
    hoy_fin = ahora_mexico.replace(hour=23, minute=59, second=59, microsecond=999999)
    
    # Convertir a naive datetime para la consulta
    hoy_inicio_naive = hoy_inicio.replace(tzinfo=None)
    hoy_fin_naive = hoy_fin.replace(tzinfo=None)
    
    # Obtener todos los trabajadores activos
    trabajadores = db.query(Trabajador, Departamento).join(
        Departamento, Trabajador.departamento == Departamento.id
    ).filter(Trabajador.estado == True).all()
    
    print(f"Total trabajadores activos: {len(trabajadores)}")
    
    # Obtener todos los registros del día
    registros_del_dia = db.query(RegistroAsistencia).filter(
        RegistroAsistencia.fecha >= hoy_inicio_naive,
        RegistroAsistencia.fecha <= hoy_fin_naive
    ).order_by(RegistroAsistencia.id_trabajador, RegistroAsistencia.fecha).all()
    
    # Agrupar registros por trabajador
    registros_por_trabajador = {}
    for registro in registros_del_dia:
        if registro.id_trabajador not in registros_por_trabajador:
            registros_por_trabajador[registro.id_trabajador] = []
        registros_por_trabajador[registro.id_trabajador].append(registro)
    
    # Preparar la respuesta consolidada
    resultado = []
    for trabajador, departamento in trabajadores:
        registros = registros_por_trabajador.get(trabajador.id, [])
        
        # Buscar registro de entrada (primer registro que no sea SALIDA)
        entrada = None
        salida = None
        
        for registro in registros:
            if registro.estatus != "SALIDA" and not entrada:
                entrada = registro
            elif registro.estatus == "SALIDA":
                salida = registro
        
        # Determinar estatus consolidado
        if entrada:
            estatus = entrada.estatus
            hora_entrada = entrada.fecha
        else:
            estatus = "NO_REGISTRADO"
            hora_entrada = None
            
        hora_salida = salida.fecha if salida else None
        
        resultado.append({
            "id": trabajador.id,
            "nombre": f"{trabajador.nombre} {trabajador.apellidoPaterno} {trabajador.apellidoMaterno}",
            "rfc": trabajador.rfc,
            "departamento": departamento.descripcion,
            "hora_entrada": hora_entrada,
            "hora_salida": hora_salida,
            "estatus": estatus,
            "registros_totales": len(registros)
        })
    
    # Calcular estadísticas
    estadisticas = {
        "total_trabajadores": len(trabajadores),
        "asistencias": sum(1 for r in resultado if r["estatus"] == "ASISTENCIA"),
        "retardos": sum(1 for r in resultado if "RETARDO" in r["estatus"]),
        "faltas": sum(1 for r in resultado if r["estatus"] == "FALTA"),
        "no_registrados": sum(1 for r in resultado if r["estatus"] == "NO_REGISTRADO")
    }
    
    return {
        "fecha": ahora_mexico.date(),
        "estadisticas": estadisticas,
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
    Obtiene las asistencias de un trabajador con registros de entrada y salida
    """
    trabajador = db.query(Trabajador).filter(Trabajador.id == trabajador_id).first()
    if not trabajador:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Trabajador con ID {trabajador_id} no encontrado"
        )
    
    if not fecha_inicio:
        fecha_inicio = date.today() - timedelta(days=30)
    
    if not fecha_fin:
        fecha_fin = date.today()
    
    # Obtener todos los registros del período
    registros = db.query(RegistroAsistencia).filter(
        RegistroAsistencia.id_trabajador == trabajador_id,
        RegistroAsistencia.fecha >= datetime.combine(fecha_inicio, time.min),
        RegistroAsistencia.fecha <= datetime.combine(fecha_fin, time.max)
    ).order_by(RegistroAsistencia.fecha).all()
    
    # Agrupar por día
    registros_por_dia = {}
    for registro in registros:
        fecha_key = registro.fecha.date()
        if fecha_key not in registros_por_dia:
            registros_por_dia[fecha_key] = []
        registros_por_dia[fecha_key].append(registro)
    
    # Preparar respuesta con días consolidados
    dias_consolidados = []
    fecha_actual = fecha_inicio
    
    while fecha_actual <= fecha_fin:
        registros_del_dia = registros_por_dia.get(fecha_actual, [])
        
        entrada = None
        salida = None
        
        for registro in registros_del_dia:
            if registro.estatus != "SALIDA" and not entrada:
                entrada = registro
            elif registro.estatus == "SALIDA":
                salida = registro
        
        dias_consolidados.append({
            "fecha": fecha_actual,
            "entrada": {
                "hora": entrada.fecha if entrada else None,
                "estatus": entrada.estatus if entrada else "NO_REGISTRADO"
            },
            "salida": {
                "hora": salida.fecha if salida else None,
                "estatus": "SALIDA" if salida else "NO_REGISTRADO"
            }
        })
        
        fecha_actual += timedelta(days=1)
    
    return {
        "trabajador": {
            "id": trabajador.id,
            "nombre": f"{trabajador.nombre} {trabajador.apellidoPaterno} {trabajador.apellidoMaterno}",
            "rfc": trabajador.rfc
        },
        "periodo": {
            "fecha_inicio": fecha_inicio,
            "fecha_fin": fecha_fin
        },
        "registros": dias_consolidados
    }

# ===== RUTAS CRUD BÁSICAS =====

@router.post("/asistencias", response_model=RegistroAsistenciaOut)
def create_asistencia(
    asistencia: RegistroAsistenciaCreate,
    db: Session = Depends(get_db),
    current_user: Trabajador = Depends(get_current_trabajador)
):
    """
    Crear un nuevo registro de asistencia (entrada o salida)
    """
    print(f"=== CREANDO REGISTRO DE ASISTENCIA ===")
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
    
    # Procesar la fecha recibida
    try:
        fecha_recibida = asistencia.fecha
        
        if isinstance(fecha_recibida, str):
            if fecha_recibida.endswith('Z'):
                fecha_dt = datetime.fromisoformat(fecha_recibida.replace('Z', '+00:00'))
                fecha_local = fecha_dt.astimezone(TIMEZONE_MEXICO)
            elif '+' in fecha_recibida or '-' in fecha_recibida[-6:]:
                fecha_dt = datetime.fromisoformat(fecha_recibida)
                fecha_local = fecha_dt.astimezone(TIMEZONE_MEXICO)
            else:
                fecha_dt = datetime.fromisoformat(fecha_recibida)
                fecha_local = TIMEZONE_MEXICO.localize(fecha_dt)
        else:
            if fecha_recibida.tzinfo is not None:
                fecha_local = fecha_recibida.astimezone(TIMEZONE_MEXICO)
            else:
                fecha_local = TIMEZONE_MEXICO.localize(fecha_recibida)
        
        fecha_para_bd = fecha_local.replace(tzinfo=None)
        
    except Exception as e:
        print(f"❌ Error al procesar fecha: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Error al procesar la fecha: {str(e)}"
        )
    
    # Determinar tipo de registro (ENTRADA o SALIDA)
    tipo_registro = determinar_tipo_registro(trabajador, fecha_para_bd, db)
    print(f"Tipo de registro determinado: {tipo_registro}")
    
    # Determinar estatus basado en el tipo de registro
    estatus_calculado = determinar_estatus_asistencia(
        trabajador, fecha_para_bd, tipo_registro, db
    )
    print(f"Estatus calculado: {estatus_calculado}")
    
    # Crear el registro
    db_asistencia = RegistroAsistencia(
        id_trabajador=asistencia.id_trabajador,
        fecha=fecha_para_bd,
        estatus=estatus_calculado
    )
    
    db.add(db_asistencia)
    db.commit()
    db.refresh(db_asistencia)
    
    print(f"✅ Registro creado - ID: {db_asistencia.id}, Tipo: {tipo_registro}, Estatus: {estatus_calculado}")
    
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
    
    return query.order_by(RegistroAsistencia.fecha.desc()).offset(skip).limit(limit).all()

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