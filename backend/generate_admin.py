import sys
import os
from datetime import datetime
from passlib.context import CryptContext

# Agregar el directorio de la aplicación al path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import SessionLocal
from app.models.models import (
    Trabajador, TipoTrabajador, Departamento, GradoEstudio, 
    RolUsuario, CentroTrabajo, Horario
)

# Configuración para el hash de contraseñas
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def get_password_hash(password):
    return pwd_context.hash(password)

def create_basic_catalogs(db):
    """Crear catálogos básicos si no existen"""
    
    # Crear rol administrador
    if not db.query(RolUsuario).filter(RolUsuario.id == 1).first():
        rol_admin = RolUsuario(id=1, descripcion="Administrador")
        db.add(rol_admin)
    
    # Crear departamento
    if not db.query(Departamento).filter(Departamento.id == 1).first():
        dept_admin = Departamento(id=1, descripcion="Administración")
        db.add(dept_admin)
    
    # Crear tipo de trabajador
    if not db.query(TipoTrabajador).filter(TipoTrabajador.id == 1).first():
        tipo_admin = TipoTrabajador(id=1, descripcion="Administrativo")
        db.add(tipo_admin)
    
    # Crear grado de estudios
    if not db.query(GradoEstudio).filter(GradoEstudio.id == 1).first():
        grado = GradoEstudio(id=1, descripcion="Licenciatura")
        db.add(grado)
    
    # Crear centro de trabajo
    if not db.query(CentroTrabajo).filter(CentroTrabajo.id == 1).first():
        centro = CentroTrabajo(
            id=1,
            claveCT="CT001",
            entidadFederativa="Estado de México",
            ubicacion="Toluca",
            nivel="Superior",
            plantel="Campus Principal",
            logo=b''
        )
        db.add(centro)
    
    # Crear horario
    if not db.query(Horario).filter(Horario.id == 1).first():
        from datetime import time
        horario = Horario(
            id=1,
            descripcion="Administrativo 8:00-16:00",
            lunesEntrada=time(8, 0),
            lunesSalida=time(16, 0),
            martesEntrada=time(8, 0),
            martesSalida=time(16, 0),
            miercolesEntrada=time(8, 0),
            miercolesSalida=time(16, 0),
            juevesEntrada=time(8, 0),
            juevesSalida=time(16, 0),
            viernesEntrada=time(8, 0),
            viernesSalida=time(16, 0)
        )
        db.add(horario)
    
    db.commit()
    print("✅ Catálogos básicos creados/verificados")

def create_admin_user():
    """Crear usuario administrador"""
    db = SessionLocal()
    
    try:
        # Crear catálogos básicos primero
        create_basic_catalogs(db)
        
        # Verificar si ya existe un administrador
        existing_admin = db.query(Trabajador).filter(Trabajador.rfc == "ADSI800101ABC").first()
        if existing_admin:
            print("❌ Ya existe un usuario administrador con RFC: ADSI800101ABC")
            
            # Preguntar si quiere actualizar la contraseña
            response = input("¿Desea actualizar la contraseña? (s/n): ")
            if response.lower() == 's':
                new_password = input("Ingrese la nueva contraseña: ")
                existing_admin.hashed_password = get_password_hash(new_password)
                db.commit()
                print("✅ Contraseña actualizada exitosamente")
                print(f"RFC: {existing_admin.rfc}")
                print(f"Nueva contraseña: {new_password}")
            return
        
        # Solicitar datos del administrador
        print("\n=== Crear Usuario Administrador ===")
        nombre = input("Nombre (por defecto: Administrador): ") or "Administrador"
        apellido_paterno = input("Apellido Paterno (por defecto: Admin): ") or "Admin"
        apellido_materno = input("Apellido Materno (por defecto: Sistema): ") or "Sistema"
        rfc = input("RFC (por defecto: ADSI800101ABC): ") or "ADSI800101ABC"
        correo = input("Correo (por defecto: admin@sistema.com): ") or "admin@sistema.com"
        password = input("Contraseña (por defecto: admin123): ") or "admin123"
        
        # Crear el hash de la contraseña
        hashed_password = get_password_hash(password)
        
        # Crear el usuario administrador
        admin_user = Trabajador(
            apellidoPaterno=apellido_paterno,
            apellidoMaterno=apellido_materno,
            nombre=nombre,
            id_tipo=1,
            departamento=1,
            rfc=rfc,
            curp="ADSI800101HMCXXX01",  # CURP ficticio
            fechaIngresoSep=datetime(2024, 1, 1),
            fechaIngresoRama=datetime(2024, 1, 1),
            fechaIngresoGobFed=datetime(2024, 1, 1),
            puesto="Administrador del Sistema",
            id_horario=1,
            estado=True,
            id_centroTrabajo=1,
            id_gradoEstudios=1,
            titulo="Licenciado en Sistemas",
            cedula="00000000",
            escuelaEgreso="Sistema",
            turno="MATUTINO",
            correo=correo,
            huellaDigital=b'huella_administrativa',  # Huella ficticia
            id_rol=1,
            hashed_password=hashed_password
        )
        
        db.add(admin_user)
        db.commit()
        db.refresh(admin_user)
        
        print("\n✅ Usuario administrador creado exitosamente!")
        print("=" * 50)
        print(f"ID: {admin_user.id}")
        print(f"Nombre: {admin_user.nombre} {admin_user.apellidoPaterno} {admin_user.apellidoMaterno}")
        print(f"RFC: {admin_user.rfc}")
        print(f"Correo: {admin_user.correo}")
        print(f"Contraseña: {password}")
        print(f"Rol: Administrador")
        print("=" * 50)
        print("\n🔐 Credenciales de acceso:")
        print(f"RFC: {admin_user.rfc}")
        print(f"Contraseña: {password}")
        
    except Exception as e:
        print(f"❌ Error al crear usuario: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    create_admin_user()