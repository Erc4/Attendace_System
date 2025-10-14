from sqlalchemy import BLOB, Column, Integer, String, DateTime, ForeignKey, Time, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy import LargeBinary
from sqlalchemy.ext.declarative import declarative_base

Base = declarative_base()

class Trabajador(Base):
    __tablename__ = "trabajadores"

    id = Column(Integer, primary_key=True, index=True)
    apellidoPaterno = Column(String(100), nullable=False)
    apellidoMaterno = Column(String(100), nullable=False)
    nombre = Column(String(100), nullable=False)
    id_tipo = Column(Integer, ForeignKey("tipoTrabajador.id"))
    departamento = Column(Integer, ForeignKey("departamentos.id"))
    rfc = Column(String(13), nullable=False)
    curp = Column(String(18), nullable=False)
    fechaIngresoSep = Column(DateTime, nullable=False)
    fechaIngresoRama = Column(DateTime, nullable=False)
    fechaIngresoGobFed = Column(DateTime, nullable=False)
    puesto = Column(String(100), nullable=False)
    id_horario = Column(Integer, ForeignKey("horarios.id"))
    estado = Column(Boolean, nullable=False)
    id_centroTrabajo = Column(Integer, ForeignKey("centroTrabajo.id"))
    id_gradoEstudios = Column(Integer, ForeignKey("gradosEstudio.id"))
    titulo = Column(String(100), nullable=False)
    cedula = Column(String(100), nullable=False)
    escuelaEgreso = Column(String(100), nullable=False)
    turno = Column(String(100), nullable=False)
    correo = Column(String(100), nullable=False)
    huellaDigital = Column(BLOB, nullable=False)
    id_rol = Column(Integer, ForeignKey("rolesUsuarios.id"))
    hashed_password = Column(String(255), nullable=True)  # Campo para la contraseña hasheada
    
    # Definir las relaciones
    tipo_trabajador = relationship("TipoTrabajador", back_populates="trabajadores")
    departamento_rel = relationship("Departamento", back_populates="trabajadores")
    horario_rel = relationship("Horario", back_populates="trabajadores")
    centro_trabajo_rel = relationship("CentroTrabajo", back_populates="trabajadores")
    grado_estudios_rel = relationship("GradoEstudio", back_populates="trabajadores")
    rol_rel = relationship("RolUsuario", back_populates="trabajadores")

class TipoTrabajador(Base):
    __tablename__ = "tipoTrabajador"

    id = Column(Integer, primary_key=True, index=True)
    descripcion = Column(String(100), nullable=False)
    
    # Relación inversa
    trabajadores = relationship("Trabajador", back_populates="tipo_trabajador")

class Departamento(Base):
    __tablename__ = "departamentos"

    id = Column(Integer, primary_key=True, index=True)
    descripcion = Column(String(100), nullable=False)
    
    # Relación inversa
    trabajadores = relationship("Trabajador", back_populates="departamento_rel")

class Horario(Base):
    __tablename__ = "horarios"

    id = Column(Integer, primary_key=True, index=True)
    descripcion = Column(String(100), nullable=False)
    lunesEntrada = Column(Time, nullable=False)
    lunesSalida = Column(Time, nullable=False)
    martesEntrada = Column(Time, nullable=False)
    martesSalida = Column(Time, nullable=False)
    miercolesEntrada = Column(Time, nullable=False)
    miercolesSalida = Column(Time, nullable=False)
    juevesEntrada = Column(Time, nullable=False)
    juevesSalida = Column(Time, nullable=False)
    viernesEntrada = Column(Time, nullable=False)
    viernesSalida = Column(Time, nullable=False)
    
    # Relación inversa
    trabajadores = relationship("Trabajador", back_populates="horario_rel")

class CentroTrabajo(Base):
    __tablename__ = "centroTrabajo"

    id = Column(Integer, primary_key=True, index=True)
    claveCT = Column(String(100), nullable=False)
    entidadFederativa = Column(String(100), nullable=False)
    ubicacion = Column(String(100), nullable=False)
    nivel = Column(String(100), nullable=False)
    plantel = Column(String(100), nullable=False)
    logo = Column(LargeBinary, nullable=False)
    
    # Relación inversa
    trabajadores = relationship("Trabajador", back_populates="centro_trabajo_rel")

class AsignacionHorario(Base):
    __tablename__ = "asignacionHorarios"
    
    id = Column(Integer, primary_key=True, index=True)
    id_trabajador = Column(Integer, ForeignKey("trabajadores.id"))
    id_horario = Column(Integer, ForeignKey("horarios.id"))
    fehcaInicio = Column(DateTime, nullable=False)  

# MODELO CORREGIDO PARA REGISTRO DE ASISTENCIA - USANDO id_trabajador
class RegistroAsistencia(Base):
    __tablename__ = "registroasistencia"

    id = Column(Integer, primary_key=True, index=True)
    # CORREGIDO: Usar id_trabajador que es como está en la base de datos
    id_trabajador = Column(Integer, ForeignKey("trabajadores.id"), nullable=False)
    fecha = Column(DateTime, nullable=False)
    estatus = Column(String(50), nullable=False)
    
    # Relación con trabajador (opcional, para facilitar consultas)
    trabajador = relationship("Trabajador", backref="asistencias")

class GradoEstudio(Base):
    __tablename__ = "gradosEstudio"

    id = Column(Integer, primary_key=True, index=True)
    descripcion = Column(String(100), nullable=False)
    
    # Relación inversa
    trabajadores = relationship("Trabajador", back_populates="grado_estudios_rel")

class Justificacion(Base):
    __tablename__ = "justificaciones"

    id = Column(Integer, primary_key=True, index=True)
    # CORREGIDO: Usar id_trabajador consistentemente
    id_trabajador = Column(Integer, ForeignKey("trabajadores.id"))
    fecha = Column(DateTime, nullable=False)
    id_descripcion = Column(Integer, ForeignKey("reglasJustificaciones.id"))

class ReglaJustificacion(Base):
    __tablename__ = "reglasJustificaciones"

    id = Column(Integer, primary_key=True, index=True)
    descripcion = Column(String(100), nullable=False)

class ReglaRetardo(Base):
    __tablename__ = "reglasRetardos"

    id = Column(Integer, primary_key=True, index=True)
    descripcion = Column(String(100), nullable=False)
    minutosMin = Column(Integer, nullable=False)
    minutosMax = Column(Integer, nullable=False)

class DiaFestivo(Base):
    __tablename__ = "diasFestivos"

    id = Column(Integer, primary_key=True, index=True)
    fecha = Column(DateTime, nullable=False)
    descripcion = Column(String(100), nullable=False)

class RolUsuario(Base):
    __tablename__ = "rolesUsuarios"

    id = Column(Integer, primary_key=True, index=True)
    descripcion = Column(String(100), nullable=False)
    
    # Relación inversa
    trabajadores = relationship("Trabajador", back_populates="rol_rel")