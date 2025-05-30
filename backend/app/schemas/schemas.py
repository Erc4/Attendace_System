from pydantic import BaseModel
from datetime import datetime, date, time
from typing import Optional, List
import base64

# Esquemas base para Token
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    id: Optional[int] = None

class LoginRequest(BaseModel):
    rfc: str
    password: str

# Esquemas para Trabajador
class TrabajadorBase(BaseModel):
    nombre: str
    apellidoPaterno: str
    apellidoMaterno: str
    rfc: str
    curp: str
    correo: str  # Cambiado de EmailStr a str temporalmente
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

class TrabajadorCreate(BaseModel):
    # Copiar todos los campos de TrabajadorBase sin herencia para evitar problemas
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
    huellaDigital: str  # Base64 encoded
    password: Optional[str] = None  # COMPLETAMENTE OPCIONAL

class TrabajadorUpdate(BaseModel):
    nombre: Optional[str] = None
    apellidoPaterno: Optional[str] = None
    apellidoMaterno: Optional[str] = None
    rfc: Optional[str] = None
    curp: Optional[str] = None
    correo: Optional[str] = None  # Cambiado de EmailStr a str
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
    password: Optional[str] = None  # Completamente opcional, puede ser None

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
    # NO incluir huellaDigital ni hashed_password en la respuesta por seguridad
    
    class Config:
        from_attributes = True

# Esquemas para TipoTrabajador
class TipoTrabajadorBase(BaseModel):
    descripcion: str

class TipoTrabajadorCreate(TipoTrabajadorBase):
    pass

class TipoTrabajadorOut(TipoTrabajadorBase):
    id: int
    
    class Config:
        from_attributes = True

# Esquemas para Departamento
class DepartamentoBase(BaseModel):
    descripcion: str

class DepartamentoCreate(DepartamentoBase):
    pass

class DepartamentoOut(DepartamentoBase):
    id: int
    
    class Config:
        from_attributes = True

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
        from_attributes = True

# Esquemas para CentroTrabajo
class CentroTrabajoBase(BaseModel):
    claveCT: str
    entidadFederativa: str
    ubicacion: str
    nivel: str
    plantel: str

class CentroTrabajoCreate(CentroTrabajoBase):
    logo: str  # Base64 encoded

class CentroTrabajoUpdate(BaseModel):
    claveCT: Optional[str] = None
    entidadFederativa: Optional[str] = None
    ubicacion: Optional[str] = None
    nivel: Optional[str] = None
    plantel: Optional[str] = None
    logo: Optional[str] = None

class CentroTrabajoOut(CentroTrabajoBase):
    id: int
    logo: str  # Se convertirá a base64 en la respuesta
    
    class Config:
        from_attributes = True

# Esquemas para GradoEstudio
class GradoEstudioBase(BaseModel):
    descripcion: str

class GradoEstudioCreate(GradoEstudioBase):
    pass

class GradoEstudioOut(GradoEstudioBase):
    id: int
    
    class Config:
        from_attributes = True

# Esquemas para RolUsuario
class RolUsuarioBase(BaseModel):
    descripcion: str

class RolUsuarioCreate(RolUsuarioBase):
    pass

class RolUsuarioOut(RolUsuarioBase):
    id: int
    
    class Config:
        from_attributes = True

# Esquemas para RegistroAsistencia
class RegistroAsistenciaBase(BaseModel):
    id_empleado: int
    fecha: datetime
    estatus: str

class RegistroAsistenciaCreate(RegistroAsistenciaBase):
    pass

class RegistroAsistenciaUpdate(BaseModel):
    fecha: Optional[datetime] = None
    estatus: Optional[str] = None

class RegistroAsistenciaOut(RegistroAsistenciaBase):
    id: int
    
    class Config:
        from_attributes = True

# Esquemas para Justificacion
class JustificacionBase(BaseModel):
    id_empleado: int
    fecha: datetime
    id_descripcion: int

class JustificacionCreate(JustificacionBase):
    pass

class JustificacionUpdate(BaseModel):
    fecha: Optional[datetime] = None
    id_descripcion: Optional[int] = None

class JustificacionOut(JustificacionBase):
    id: int
    
    class Config:
        from_attributes = True

# Esquemas para ReglaJustificacion
class ReglaJustificacionBase(BaseModel):
    descripcion: str

class ReglaJustificacionCreate(ReglaJustificacionBase):
    pass

class ReglaJustificacionUpdate(BaseModel):
    descripcion: Optional[str] = None

class ReglaJustificacionOut(ReglaJustificacionBase):
    id: int
    
    class Config:
        from_attributes = True

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
        from_attributes = True

# Esquemas para AsignacionHorario
class AsignacionHorarioBase(BaseModel):
    id_trabajador: int
    id_horario: int
    fehcaInicio: datetime  # Mantener el typo hasta que se corrija en el modelo

class AsignacionHorarioCreate(AsignacionHorarioBase):
    pass

class AsignacionHorarioUpdate(BaseModel):
    id_horario: Optional[int] = None
    fehcaInicio: Optional[datetime] = None

class AsignacionHorarioOut(AsignacionHorarioBase):
    id: int
    
    class Config:
        from_attributes = True

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
        from_attributes = True

# Esquemas para reportes
class ReporteFiltros(BaseModel):
    fecha_inicio: Optional[date] = None
    fecha_fin: Optional[date] = None
    departamento_id: Optional[int] = None
    trabajador_id: Optional[int] = None