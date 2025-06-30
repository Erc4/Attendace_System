from pydantic import BaseModel, EmailStr
from datetime import datetime, date, time
from typing import Optional, List

# Schemas base para las tablas relacionadas
class TipoTrabajadorBase(BaseModel):
    id: int
    descripcion: str

class DepartamentoBase(BaseModel):
    id: int
    descripcion: str

class HorarioBase(BaseModel):
    id: int
    descripcion: str

class CentroTrabajoBase(BaseModel):
    id: int
    plantel: str
    ubicacion: str

class GradoEstudioBase(BaseModel):
    id: int
    descripcion: str

class RolUsuarioBase(BaseModel):
    id: int
    descripcion: str

# Schemas para Trabajador
class TrabajadorBase(BaseModel):
    nombre: str
    apellidoPaterno: str
    apellidoMaterno: str
    rfc: str
    curp: str
    correo: EmailStr
    id_tipo: int
    departamento: int
    puesto: str
    id_horario: int
    estado: bool = True
    id_centroTrabajo: int
    id_gradoEstudios: int
    titulo: str
    cedula: str
    escuelaEgreso: str
    turno: str
    fechaIngresoSep: datetime
    fechaIngresoRama: datetime
    fechaIngresoGobFed: datetime
    id_rol: int

class TrabajadorCreate(TrabajadorBase):
    huellaDigital: str
    password: Optional[str] = None

class TrabajadorUpdate(BaseModel):
    nombre: Optional[str] = None
    apellidoPaterno: Optional[str] = None
    apellidoMaterno: Optional[str] = None
    rfc: Optional[str] = None
    curp: Optional[str] = None
    correo: Optional[EmailStr] = None
    id_tipo: Optional[int] = None
    departamento: Optional[int] = None
    puesto: Optional[str] = None
    id_horario: Optional[int] = None
    estado: Optional[bool] = None
    id_centroTrabajo: Optional[int] = None
    id_gradoEstudios: Optional[int] = None
    titulo: Optional[str] = None
    cedula: Optional[str] = None
    escuelaEgreso: Optional[str] = None
    turno: Optional[str] = None
    fechaIngresoSep: Optional[datetime] = None
    fechaIngresoRama: Optional[datetime] = None
    fechaIngresoGobFed: Optional[datetime] = None
    id_rol: Optional[int] = None
    huellaDigital: Optional[str] = None
    password: Optional[str] = None

class TrabajadorOut(BaseModel):
    id: int
    nombre: str
    apellidoPaterno: str
    apellidoMaterno: str
    rfc: str
    curp: str
    correo: str
    id_tipo: int
    departamento: int
    puesto: str
    id_horario: int
    estado: bool
    id_centroTrabajo: int
    id_gradoEstudios: int
    titulo: str
    cedula: str
    escuelaEgreso: str
    turno: str
    fechaIngresoSep: datetime
    fechaIngresoRama: datetime
    fechaIngresoGobFed: datetime
    id_rol: int
    
    # Incluir las relaciones con sus datos completos
    tipo_trabajador: Optional[TipoTrabajadorBase] = None
    departamento_rel: Optional[DepartamentoBase] = None
    horario_rel: Optional[HorarioBase] = None
    centro_trabajo_rel: Optional[CentroTrabajoBase] = None
    grado_estudios_rel: Optional[GradoEstudioBase] = None
    rol_rel: Optional[RolUsuarioBase] = None
    
    class Config:
        from_attributes = True

# Schemas para las otras entidades
class TipoTrabajadorCreate(BaseModel):
    descripcion: str

class TipoTrabajadorOut(TipoTrabajadorBase):
    class Config:
        from_attributes = True

class DepartamentoCreate(BaseModel):
    descripcion: str

class DepartamentoOut(DepartamentoBase):
    class Config:
        from_attributes = True

class HorarioCreate(BaseModel):
    descripcion: str
    lunesEntrada: time
    lunesSalida: time
    martesEntrada: time
    martesSalida: time
    miercolesEntrada: time
    miercolesSalida: time
    juevesEntrada: time
    juevesSalida: time
    viernesEntrada: time
    viernesSalida: time

class HorarioUpdate(BaseModel):
    descripcion: Optional[str] = None
    lunesEntrada: Optional[time] = None
    lunesSalida: Optional[time] = None
    martesEntrada: Optional[time] = None
    martesSalida: Optional[time] = None
    miercolesEntrada: Optional[time] = None
    miercolesSalida: Optional[time] = None
    juevesEntrada: Optional[time] = None
    juevesSalida: Optional[time] = None
    viernesEntrada: Optional[time] = None
    viernesSalida: Optional[time] = None

class HorarioOut(BaseModel):
    id: int
    descripcion: str
    lunesEntrada: time
    lunesSalida: time
    martesEntrada: time
    martesSalida: time
    miercolesEntrada: time
    miercolesSalida: time
    juevesEntrada: time
    juevesSalida: time
    viernesEntrada: time
    viernesSalida: time
    
    class Config:
        from_attributes = True

class GradoEstudioCreate(BaseModel):
    descripcion: str

class GradoEstudioOut(GradoEstudioBase):
    class Config:
        from_attributes = True

class RolUsuarioCreate(BaseModel):
    descripcion: str

class RolUsuarioOut(RolUsuarioBase):
    class Config:
        from_attributes = True

class CentroTrabajoCreate(BaseModel):
    claveCT: str
    entidadFederativa: str
    ubicacion: str
    nivel: str
    plantel: str
    logo: str

class CentroTrabajoUpdate(BaseModel):
    claveCT: Optional[str] = None
    entidadFederativa: Optional[str] = None
    ubicacion: Optional[str] = None
    nivel: Optional[str] = None
    plantel: Optional[str] = None
    logo: Optional[str] = None

class CentroTrabajoOut(BaseModel):
    id: int
    claveCT: str
    entidadFederativa: str
    ubicacion: str
    nivel: str
    plantel: str
    
    class Config:
        from_attributes = True

# Schemas para Asignación de Horario
class AsignacionHorarioCreate(BaseModel):
    id_trabajador: int
    id_horario: int
    fehcaInicio: datetime

class AsignacionHorarioUpdate(BaseModel):
    id_trabajador: Optional[int] = None
    id_horario: Optional[int] = None
    fehcaInicio: Optional[datetime] = None

class AsignacionHorarioOut(BaseModel):
    id: int
    id_trabajador: int
    id_horario: int
    fehcaInicio: datetime
    
    class Config:
        from_attributes = True

# Schemas para Registro de Asistencia
class RegistroAsistenciaCreate(BaseModel):
    id_trabajador: int
    fecha: datetime
    estatus: str

class RegistroAsistenciaUpdate(BaseModel):
    id_trabajador: Optional[int] = None
    fecha: Optional[datetime] = None
    estatus: Optional[str] = None

class RegistroAsistenciaOut(BaseModel):
    id: int
    id_trabajador: int
    fecha: datetime
    estatus: str
    
    class Config:
        from_attributes = True

# Schemas para Justificaciones
class JustificacionCreate(BaseModel):
    id_trabajador: int
    fecha: datetime
    id_descripcion: int

class JustificacionUpdate(BaseModel):
    id_trabajador: Optional[int] = None
    fecha: Optional[datetime] = None
    id_descripcion: Optional[int] = None

class JustificacionOut(BaseModel):
    id: int
    id_trabajador: int
    fecha: datetime
    id_descripcion: int
    
    class Config:
        from_attributes = True

# Schemas para Reglas de Justificación
class ReglaJustificacionCreate(BaseModel):
    descripcion: str

class ReglaJustificacionUpdate(BaseModel):
    descripcion: Optional[str] = None

class ReglaJustificacionOut(BaseModel):
    id: int
    descripcion: str
    
    class Config:
        from_attributes = True

# Schemas para Reglas de Retardo
class ReglaRetardoCreate(BaseModel):
    descripcion: str
    minutosMin: int
    minutosMax: int

class ReglaRetardoUpdate(BaseModel):
    descripcion: Optional[str] = None
    minutosMin: Optional[int] = None
    minutosMax: Optional[int] = None

class ReglaRetardoOut(BaseModel):
    id: int
    descripcion: str
    minutosMin: int
    minutosMax: int
    
    class Config:
        from_attributes = True

# Schemas para Días Festivos
class DiaFestivoCreate(BaseModel):
    fecha: datetime
    descripcion: str

class DiaFestivoUpdate(BaseModel):
    fecha: Optional[datetime] = None
    descripcion: Optional[str] = None

class DiaFestivoOut(BaseModel):
    id: int
    fecha: datetime
    descripcion: str
    
    class Config:
        from_attributes = True

# Schemas para Autenticación
class LoginRequest(BaseModel):
    rfc: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    id: Optional[int] = None

# Schemas para Reportes
class ReporteFiltros(BaseModel):
    fecha_inicio: Optional[date] = None
    fecha_fin: Optional[date] = None
    departamento_id: Optional[int] = None
    trabajador_id: Optional[int] = None

class HorarioBase(BaseModel):
    descripcion: str
    lunesEntrada: time
    lunesSalida: time
    martesEntrada: time
    martesSalida: time
    miercolesEntrada: time
    miercolesSalida: time
    juevesEntrada: time
    juevesSalida: time
    viernesEntrada: time
    viernesSalida: time

class HorarioCreate(HorarioBase):
    pass

class HorarioUpdate(BaseModel):
    descripcion: Optional[str] = None
    lunesEntrada: Optional[time] = None
    lunesSalida: Optional[time] = None
    martesEntrada: Optional[time] = None
    martesSalida: Optional[time] = None
    miercolesEntrada: Optional[time] = None
    miercolesSalida: Optional[time] = None
    juevesEntrada: Optional[time] = None
    juevesSalida: Optional[time] = None
    viernesEntrada: Optional[time] = None
    viernesSalida: Optional[time] = None

class HorarioOut(HorarioBase):
    id: int
    
    class Config:
        from_attributes = True

class TrabajadorSimple(BaseModel):
    id: int
    nombre: str
    rfc: str
    puesto: str
    
    class Config:
        from_attributes = True

class HorarioDetalladoOut(BaseModel):
    horario: HorarioOut
    trabajadores_asignados: List[TrabajadorSimple]
    total_trabajadores: int
    asignaciones_historicas: List[dict]

# ====== SCHEMAS PARA ASIGNACIÓN DE HORARIOS ======

class AsignacionHorarioBase(BaseModel):
    id_trabajador: int
    fehcaInicio: Optional[datetime] = None

class AsignacionHorarioCreate(AsignacionHorarioBase):
    pass

class AsignacionHorarioOut(AsignacionHorarioBase):
    id: int
    id_horario: int
    
    class Config:
        from_attributes = True

# ====== SCHEMAS PARA REPORTES Y VALIDACIONES ======

class ValidacionHorarioOut(BaseModel):
    es_valido: bool
    errores: List[str]
    duracion_horas: float
    duracion_minutos: int

class ResumenHorariosOut(BaseModel):
    total_horarios: int
    trabajadores_con_horario: int
    trabajadores_sin_horario: int
    horarios_mas_utilizados: List[dict]