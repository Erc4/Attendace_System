from pydantic import BaseModel, Field, EmailStr
from typing import Optional, List
from datetime import datetime, time
import base64

# Esquemas para Autenticación
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    id: Optional[int] = None

# Esquemas para Trabajadores
class TrabajadorBase(BaseModel):
    apellidoPaterno: str
    apellidoMaterno: str
    nombre: str
    id_tipo: int
    departamento: int
    rfc: str
    curp: str
    fechaIngresoSep: datetime
    fechaIngresoRama: datetime
    fechaIngresoGobFed: datetime
    puesto: str
    id_horario: int
    estado: bool
    id_centroTrabajo: int
    id_gradoEstudios: int
    titulo: str
    cedula: str
    escuelaEgreso: str
    turno: str
    correo: str
    id_rol: int

class TrabajadorCreate(TrabajadorBase):
    huellaDigital: str  # Base64 encoded string
    password: str  # Solo para crear usuario

class TrabajadorUpdate(BaseModel):
    apellidoPaterno: Optional[str] = None
    apellidoMaterno: Optional[str] = None
    nombre: Optional[str] = None
    id_tipo: Optional[int] = None
    departamento: Optional[int] = None
    rfc: Optional[str] = None
    curp: Optional[str] = None
    fechaIngresoSep: Optional[datetime] = None
    fechaIngresoRama: Optional[datetime] = None
    fechaIngresoGobFed: Optional[datetime] = None
    puesto: Optional[str] = None
    id_horario: Optional[int] = None
    estado: Optional[bool] = None
    id_centroTrabajo: Optional[int] = None
    id_gradoEstudios: Optional[int] = None
    titulo: Optional[str] = None
    cedula: Optional[str] = None
    escuelaEgreso: Optional[str] = None
    turno: Optional[str] = None
    correo: Optional[str] = None
    huellaDigital: Optional[str] = None
    id_rol: Optional[int] = None

class TrabajadorOut(TrabajadorBase):
    id: int
    
    class Config:
        orm_mode = True

# Esquemas para TipoTrabajador
class TipoTrabajadorBase(BaseModel):
    descripcion: str

class TipoTrabajadorCreate(TipoTrabajadorBase):
    pass

class TipoTrabajadorUpdate(TipoTrabajadorBase):
    pass

class TipoTrabajadorOut(TipoTrabajadorBase):
    id: int
    
    class Config:
        orm_mode = True

# Esquemas para Departamento
class DepartamentoBase(BaseModel):
    descripcion: str

class DepartamentoCreate(DepartamentoBase):
    pass

class DepartamentoUpdate(DepartamentoBase):
    pass

class DepartamentoOut(DepartamentoBase):
    id: int
    
    class Config:
        orm_mode = True

# Esquemas para Horario
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
        orm_mode = True

# Esquemas para Centro de Trabajo
class CentroTrabajoBase(BaseModel):
    claveCT: str
    entidadFederativa: str
    ubicacion: str
    nivel: str
    plantel: str

class CentroTrabajoCreate(CentroTrabajoBase):
    logo: str  # Base64 encoded string

class CentroTrabajoUpdate(BaseModel):
    claveCT: Optional[str] = None
    entidadFederativa: Optional[str] = None
    ubicacion: Optional[str] = None
    nivel: Optional[str] = None
    plantel: Optional[str] = None
    logo: Optional[str] = None

class CentroTrabajoOut(CentroTrabajoBase):
    id: int
    
    class Config:
        orm_mode = True

# Esquemas para AsignacionHorario
class AsignacionHorarioBase(BaseModel):
    id_trabajador: int
    id_horario: int
    fehcaInicio: datetime

class AsignacionHorarioCreate(AsignacionHorarioBase):
    pass

class AsignacionHorarioUpdate(BaseModel):
    id_trabajador: Optional[int] = None
    id_horario: Optional[int] = None
    fehcaInicio: Optional[datetime] = None

class AsignacionHorarioOut(AsignacionHorarioBase):
    id: int
    
    class Config:
        orm_mode = True

# Esquemas para RegistroAsistencia
class RegistroAsistenciaBase(BaseModel):
    id_empleado: int
    fecha: datetime
    estatus: str

class RegistroAsistenciaCreate(RegistroAsistenciaBase):
    pass

class RegistroAsistenciaUpdate(BaseModel):
    estatus: Optional[str] = None

class RegistroAsistenciaOut(RegistroAsistenciaBase):
    id: int
    
    class Config:
        orm_mode = True

# Esquemas para GradoEstudio
class GradoEstudioBase(BaseModel):
    descripcion: str

class GradoEstudioCreate(GradoEstudioBase):
    pass

class GradoEstudioUpdate(GradoEstudioBase):
    pass

class GradoEstudioOut(GradoEstudioBase):
    id: int
    
    class Config:
        orm_mode = True

# Esquemas para Justificacion
class JustificacionBase(BaseModel):
    id_empleado: int
    fecha: datetime
    id_descripcion: int

class JustificacionCreate(JustificacionBase):
    pass

class JustificacionUpdate(BaseModel):
    id_descripcion: Optional[int] = None

class JustificacionOut(JustificacionBase):
    id: int
    
    class Config:
        orm_mode = True

# Esquemas para ReglaJustificacion
class ReglaJustificacionBase(BaseModel):
    descripcion: str

class ReglaJustificacionCreate(ReglaJustificacionBase):
    pass

class ReglaJustificacionUpdate(ReglaJustificacionBase):
    pass

class ReglaJustificacionOut(ReglaJustificacionBase):
    id: int
    
    class Config:
        orm_mode = True

# Esquemas para ReglaRetardo
class ReglaRetardoBase(BaseModel):
    descripcion: str
    minutosMin: int
    minutosMax: int

class ReglaRetardoCreate(ReglaRetardoBase):
    pass

class ReglaRetardoUpdate(BaseModel):
    descripcion: Optional[str] = None
    minutosMin: Optional[int] = None
    minutosMax: Optional[int] = None

class ReglaRetardoOut(ReglaRetardoBase):
    id: int
    
    class Config:
        orm_mode = True

# Esquemas para DiaFestivo
class DiaFestivoBase(BaseModel):
    fecha: datetime
    descripcion: str

class DiaFestivoCreate(DiaFestivoBase):
    pass

class DiaFestivoUpdate(BaseModel):
    fecha: Optional[datetime] = None
    descripcion: Optional[str] = None

class DiaFestivoOut(DiaFestivoBase):
    id: int
    
    class Config:
        orm_mode = True

# Esquemas para RolUsuario
class RolUsuarioBase(BaseModel):
    descripcion: str

class RolUsuarioCreate(RolUsuarioBase):
    pass

class RolUsuarioUpdate(RolUsuarioBase):
    pass

class RolUsuarioOut(RolUsuarioBase):
    id: int
    
    class Config:
        orm_mode = True

# Esquemas para Login
class LoginRequest(BaseModel):
    rfc: str
    password: str

# Esquema para registro biométrico
class BiometricoRequest(BaseModel):
    huella: str  # Base64 encoded string

# Esquema para reportes
class ReporteFiltros(BaseModel):
    fecha_inicio: Optional[datetime] = None
    fecha_fin: Optional[datetime] = None
    id_empleado: Optional[int] = None
    id_departamento: Optional[int] = None
    estatus: Optional[str] = None