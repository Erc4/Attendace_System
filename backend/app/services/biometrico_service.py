import base64
from sqlalchemy.orm import Session
from app.models.models import Trabajador
from datetime import datetime, time
import io

def verify_fingerprint(db: Session, fingerprint_base64: str):
    """
    Verifica la huella digital proporcionada contra la base de datos de trabajadores.
    
    Args:
        db (Session): Sesión de la base de datos
        fingerprint_base64 (str): Huella digital codificada en base64
    
    Returns:
        Trabajador or None: Devuelve el trabajador si la huella coincide, None en caso contrario
    """
    # Decodificar la huella digital de base64 a bytes
    try:
        fingerprint_bytes = base64.b64decode(fingerprint_base64)
    except Exception as e:
        print(f"Error decodificando huella: {e}")
        return None
    
    # Buscar en todos los trabajadores
    trabajadores = db.query(Trabajador).all()
    
    # Simular la comparación de huellas
    # En un entorno real, se usaría una biblioteca de comparación de huellas biométricas
    for trabajador in trabajadores:
        # Aquí implementarías la lógica de comparación real
        # Por ahora, simplemente simularemos una coincidencia
        
        # Si la huella coincide, devolver el trabajador
        # Esta es una simulación simplificada, en un sistema real
        # se usaría un algoritmo de comparación de huellas real
        if compare_fingerprints(fingerprint_bytes, trabajador.huellaDigital):
            return trabajador
    
    # Si no se encuentra ninguna coincidencia
    return None

def compare_fingerprints(fingerprint1: bytes, fingerprint2: bytes) -> bool:
    """
    Compara dos huellas digitales.
    
    En un sistema real, esto utilizaría una biblioteca especializada 
    para la comparación de huellas dactilares.
    
    Esta es una implementación simulada para fines de demostración.
    
    Args:
        fingerprint1 (bytes): Primera huella digital
        fingerprint2 (bytes): Segunda huella digital
    
    Returns:
        bool: True si las huellas coinciden, False en caso contrario
    """
    # En un sistema real, esto sería reemplazado por un algoritmo real de comparación de huellas
    # Por ahora, simplemente compararemos los bytes directamente (lo cual no es realista)
    
    # Simulamos una coincidencia si los primeros bytes son similares
    # Esto es solo para demostración y debe ser reemplazado por un algoritmo real
    similarity_threshold = 0.8  # 80% de similitud
    
    # Obtener la longitud mínima para comparar
    min_length = min(len(fingerprint1), len(fingerprint2))
    
    if min_length == 0:
        return False
    
    # Contar bytes similares
    similar_bytes = 0
    for i in range(min_length):
        if fingerprint1[i] == fingerprint2[i]:
            similar_bytes += 1
    
    # Calcular similitud
    similarity = similar_bytes / min_length
    
    return similarity >= similarity_threshold

def register_attendance(db: Session, trabajador_id: int, estatus: str):
    """
    Registra la asistencia de un trabajador.
    
    Args:
        db (Session): Sesión de la base de datos
        trabajador_id (int): ID del trabajador
        estatus (str): Estatus de la asistencia (ASISTENCIA, RETARDO, etc.)
    
    Returns:
        RegistroAsistencia: El registro de asistencia creado
    """
    from app.models.models import RegistroAsistencia
    
    # Crear un nuevo registro de asistencia
    nuevo_registro = RegistroAsistencia(
        id_empleado=trabajador_id,
        fecha=datetime.now(),
        estatus=estatus
    )
    
    # Agregar a la base de datos
    db.add(nuevo_registro)
    db.commit()
    db.refresh(nuevo_registro)
    
    return nuevo_registro

def determine_attendance_status(db: Session, trabajador_id: int, current_time=None):
    """
    Determina el estado de asistencia según la hora actual y el horario del trabajador.
    
    Args:
        db (Session): Sesión de la base de datos
        trabajador_id (int): ID del trabajador
        current_time (datetime, opcional): Hora actual (para pruebas)
    
    Returns:
        str: Estado de la asistencia (ASISTENCIA, RETARDO, FALTA)
    """
    from app.models.models import Trabajador, Horario, ReglaRetardo, DiaFestivo
    
    # Obtener el trabajador y su horario
    trabajador = db.query(Trabajador).filter(Trabajador.id == trabajador_id).first()
    if not trabajador:
        return "ERROR"
    
    horario = db.query(Horario).filter(Horario.id == trabajador.id_horario).first()
    if not horario:
        return "ERROR"
    
    # Obtener la fecha y hora actual si no se proporciona
    if current_time is None:
        current_time = datetime.now()
    
    # Verificar si es un día festivo
    es_festivo = db.query(DiaFestivo).filter(
        DiaFestivo.fecha == current_time.date()
    ).first()
    
    if es_festivo:
        return "DIA_FESTIVO"
    
    # Determinar el día de la semana (0 = lunes, 1 = martes, etc.)
    dia_semana = current_time.weekday()
    
    # Verificar si está dentro del horario laboral
    entrada_hora = None
    salida_hora = None
    
    # Asignar hora de entrada y salida según el día
    if dia_semana == 0:  # Lunes
        entrada_hora = horario.lunesEntrada
        salida_hora = horario.lunesSalida
    elif dia_semana == 1:  # Martes
        entrada_hora = horario.martesEntrada
        salida_hora = horario.martesSalida
    elif dia_semana == 2:  # Miércoles
        entrada_hora = horario.miercolesEntrada
        salida_hora = horario.miercolesSalida
    elif dia_semana == 3:  # Jueves
        entrada_hora = horario.juevesEntrada
        salida_hora = horario.juevesSalida
    elif dia_semana == 4:  # Viernes
        entrada_hora = horario.viernesEntrada
        salida_hora = horario.viernesSalida
    else:  # Fin de semana
        return "FIN_SEMANA"
    
    # Obtener la hora actual como objeto time
    hora_actual = current_time.time()
    
    # Verificar si es una entrada o salida (consideramos que es salida si está más cerca de la hora de salida)
    diferencia_entrada = abs((hora_actual.hour * 60 + hora_actual.minute) - 
                             (entrada_hora.hour * 60 + entrada_hora.minute))
    diferencia_salida = abs((hora_actual.hour * 60 + hora_actual.minute) - 
                            (salida_hora.hour * 60 + salida_hora.minute))
    
    # Si está más cerca de la salida, registramos salida
    if diferencia_salida < diferencia_entrada:
        return "SALIDA"
    
    # Verificar si hay retardo según las reglas
    minutos_diferencia = (hora_actual.hour * 60 + hora_actual.minute) - \
                         (entrada_hora.hour * 60 + entrada_hora.minute)
    
    # Obtener las reglas de retardo
    reglas_retardo = db.query(ReglaRetardo).all()
    
    # Determinar el estado según las reglas
    if minutos_diferencia <= 0:
        return "ASISTENCIA"
    
    for regla in reglas_retardo:
        if regla.minutosMin <= minutos_diferencia <= regla.minutosMax:
            return regla.descripcion
    
    # Si excede todas las reglas de retardo, se considera falta
    return "FALTA"