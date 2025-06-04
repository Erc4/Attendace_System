from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
import base64
import traceback
import re
from app.database import get_db
from app.models.models import (
    Trabajador, TipoTrabajador, Departamento, GradoEstudio, 
    RolUsuario, Horario, CentroTrabajo
)
from app.schemas.schemas import (
    TrabajadorCreate, 
    TrabajadorUpdate, 
    TrabajadorOut
)
from app.services.auth_service import get_current_trabajador, check_admin_permissions, get_password_hash

router = APIRouter()

def process_fingerprint_base64(fingerprint_data):
    """
    Procesa y valida la huella digital en formato base64
    """
    try:
        print(f"🖐️ Procesando huella digital...")
        print(f"📏 Longitud original: {len(fingerprint_data)}")
        print(f"🔤 Primeros 50 chars: {fingerprint_data[:50]}...")
        
        # Limpiar la cadena base64
        cleaned_data = fingerprint_data
        
        # Remover prefijo data:image si existe
        if 'data:' in cleaned_data and ',' in cleaned_data:
            cleaned_data = cleaned_data.split(',')[1]
            print(f"✂️ Removido prefijo data:, nueva longitud: {len(cleaned_data)}")
        
        # Remover espacios en blanco y saltos de línea
        cleaned_data = re.sub(r'\s+', '', cleaned_data)
        print(f"🧹 Después de limpiar espacios: {len(cleaned_data)}")
        
        # Verificar que solo contiene caracteres base64 válidos
        if not re.match(r'^[A-Za-z0-9+/]*={0,2}$', cleaned_data):
            print(f"❌ Caracteres inválidos en base64")
            raise ValueError("La cadena contiene caracteres no válidos para base64")
        
        # Agregar padding si es necesario
        missing_padding = len(cleaned_data) % 4
        if missing_padding:
            padding_needed = 4 - missing_padding
            cleaned_data += '=' * padding_needed
            print(f"➕ Agregado padding: {padding_needed} caracteres '='")
            print(f"📏 Longitud final: {len(cleaned_data)}")
        
        # Intentar decodificar
        decoded_data = base64.b64decode(cleaned_data)
        print(f"✅ Decodificación exitosa, tamaño: {len(decoded_data)} bytes")
        
        return decoded_data
        
    except Exception as e:
        print(f"❌ Error al procesar huella: {e}")
        print(f"🔍 Datos problemáticos: {fingerprint_data[:100]}...")
        raise ValueError(f"Error al procesar la huella digital: {str(e)}")

@router.post("/trabajadores", response_model=TrabajadorOut, status_code=status.HTTP_201_CREATED)
def create_trabajador(
    trabajador: TrabajadorCreate, 
    db: Session = Depends(get_db),
    current_user: Trabajador = Depends(check_admin_permissions)
):
    print("=== INICIANDO CREACIÓN DE TRABAJADOR ===")
    print(f"Datos recibidos: {trabajador.dict()}")
    
    try:
        # Verificar si ya existe un trabajador con el mismo RFC
        db_trabajador_existente = db.query(Trabajador).filter(Trabajador.rfc == trabajador.rfc).first()
        if db_trabajador_existente:
            print(f"RFC ya existe: {trabajador.rfc}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Ya existe un trabajador con el RFC {trabajador.rfc}"
            )
        
        # Crear el nuevo trabajador
        trabajador_data = trabajador.dict()
        print(f"Datos del trabajador después de dict(): {trabajador_data}")
        
        # Manejar la huella digital con procesamiento mejorado
        if trabajador_data.get('huellaDigital'):
            try:
                huella_digital = process_fingerprint_base64(trabajador_data['huellaDigital'])
                trabajador_data['huellaDigital'] = huella_digital
                
            except ValueError as ve:
                print(f"Error de validación en huella: {ve}")
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=str(ve)
                )
            except Exception as e:
                print(f"Error inesperado procesando huella: {e}")
                print(f"Traceback: {traceback.format_exc()}")
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Error al procesar la huella digital: {str(e)}"
                )
        else:
            print("ERROR: No se recibió huella digital")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="La huella digital es requerida"
            )
        
        # Manejar la contraseña
        password_value = trabajador_data.get('password')
        if password_value is not None and password_value.strip():
            print("Procesando contraseña para usuario con acceso al sistema...")
            trabajador_data['hashed_password'] = get_password_hash(password_value)
        else:
            print("Trabajador sin acceso al sistema - no se asigna contraseña")
            trabajador_data['hashed_password'] = None
        
        # Eliminar el campo password del dict para evitar conflictos
        if 'password' in trabajador_data:
            del trabajador_data['password']
        
        print(f"Datos finales para crear trabajador: {list(trabajador_data.keys())}")
        
        # Crear el trabajador
        print("Creando instancia de Trabajador...")
        db_trabajador = Trabajador(**trabajador_data)
        print(f"Instancia creada: {db_trabajador}")
        
        print("Agregando a la sesión...")
        db.add(db_trabajador)
        
        print("Haciendo commit...")
        db.commit()
        
        print("Refrescando datos...")
        db.refresh(db_trabajador)
        
        print(f"¡TRABAJADOR CREADO EXITOSAMENTE! ID: {db_trabajador.id}")
        
        # Cargar el trabajador con todas las relaciones para la respuesta
        try:
            trabajador_completo = db.query(Trabajador).options(
                joinedload(Trabajador.tipo_trabajador),
                joinedload(Trabajador.departamento_rel),
                joinedload(Trabajador.horario_rel),
                joinedload(Trabajador.centro_trabajo_rel),
                joinedload(Trabajador.grado_estudios_rel),
                joinedload(Trabajador.rol_rel)
            ).filter(Trabajador.id == db_trabajador.id).first()
            
            return trabajador_completo
        except Exception as e:
            print(f"⚠️ Error cargando relaciones, devolviendo trabajador básico: {e}")
            return db_trabajador
        
    except HTTPException as he:
        print(f"HTTPException: {he.detail}")
        db.rollback()
        raise he
    except Exception as e:
        print(f"ERROR INESPERADO: {e}")
        print(f"Traceback completo: {traceback.format_exc()}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error interno del servidor: {str(e)}"
        )

@router.get("/trabajadores", response_model=List[TrabajadorOut])
def get_trabajadores(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    nombre: Optional[str] = Query(None, description="Filtrar por nombre, apellido paterno o materno"),
    departamento: Optional[int] = Query(None, description="Filtrar por ID de departamento"),
    rfc: Optional[str] = Query(None, description="Filtrar por RFC"),
    estado: Optional[bool] = Query(None, description="Filtrar por estado activo/inactivo"),
    db: Session = Depends(get_db),
    current_user: Trabajador = Depends(get_current_trabajador)
):
    try:
        print(f"Obteniendo trabajadores con parámetros: skip={skip}, limit={limit}")
        
        # Query con JOIN a todas las tablas relacionadas
        query = db.query(Trabajador).options(
            joinedload(Trabajador.tipo_trabajador),
            joinedload(Trabajador.departamento_rel),
            joinedload(Trabajador.horario_rel),
            joinedload(Trabajador.centro_trabajo_rel),
            joinedload(Trabajador.grado_estudios_rel),
            joinedload(Trabajador.rol_rel)
        )
        
        # Aplicar filtros si se proporcionan
        if nombre:
            search_term = f"%{nombre}%"
            query = query.filter(
                (Trabajador.nombre.ilike(search_term)) | 
                (Trabajador.apellidoPaterno.ilike(search_term)) | 
                (Trabajador.apellidoMaterno.ilike(search_term))
            )
        
        if departamento:
            query = query.filter(Trabajador.departamento == departamento)
        
        if rfc:
            query = query.filter(Trabajador.rfc.ilike(f"%{rfc}%"))
        
        if estado is not None:
            query = query.filter(Trabajador.estado == estado)
        
        # Obtener el total para paginación
        total = query.count()
        print(f"Total de trabajadores encontrados: {total}")
        
        # Aplicar paginación
        trabajadores = query.offset(skip).limit(limit).all()
        print(f"Trabajadores obtenidos: {len(trabajadores)}")
        
        return trabajadores
        
    except Exception as e:
        print(f"Error al obtener trabajadores: {e}")
        print(f"Traceback: {traceback.format_exc()}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al obtener trabajadores: {str(e)}"
        )

@router.get("/trabajadores/{trabajador_id}", response_model=TrabajadorOut)
def get_trabajador_by_id(
    trabajador_id: int, 
    db: Session = Depends(get_db),
    current_user: Trabajador = Depends(get_current_trabajador)
):
    print(f"🔍 Buscando trabajador con ID: {trabajador_id}")
    
    # Query con todas las relaciones cargadas
    trabajador = db.query(Trabajador).options(
        joinedload(Trabajador.tipo_trabajador),
        joinedload(Trabajador.departamento_rel),
        joinedload(Trabajador.horario_rel),
        joinedload(Trabajador.centro_trabajo_rel),
        joinedload(Trabajador.grado_estudios_rel),
        joinedload(Trabajador.rol_rel)
    ).filter(Trabajador.id == trabajador_id).first()
    
    if not trabajador:
        print(f"❌ Trabajador con ID {trabajador_id} no encontrado")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Trabajador con ID {trabajador_id} no encontrado"
        )
    
    print(f"✅ Trabajador encontrado: {trabajador.nombre} {trabajador.apellidoPaterno}")
    print(f"🏢 Departamento: {trabajador.departamento_rel.descripcion if trabajador.departamento_rel else 'N/A'}")
    print(f"👤 Tipo: {trabajador.tipo_trabajador.descripcion if trabajador.tipo_trabajador else 'N/A'}")
    print(f"🎓 Grado: {trabajador.grado_estudios_rel.descripcion if trabajador.grado_estudios_rel else 'N/A'}")
    
    return trabajador

@router.put("/trabajadores/{trabajador_id}", response_model=TrabajadorOut)
def update_trabajador(
    trabajador_id: int, 
    trabajador_update: TrabajadorUpdate, 
    db: Session = Depends(get_db),
    current_user: Trabajador = Depends(check_admin_permissions)
):
    print(f"=== ACTUALIZANDO TRABAJADOR ID: {trabajador_id} ===")
    print(f"Datos recibidos: {trabajador_update.dict()}")
    
    try:
        db_trabajador = db.query(Trabajador).filter(Trabajador.id == trabajador_id).first()
        if not db_trabajador:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Trabajador con ID {trabajador_id} no encontrado"
            )
        
        # Actualizar campos si están presentes en la solicitud
        update_data = trabajador_update.dict(exclude_unset=True)
        print(f"Datos a actualizar: {update_data}")
        
        # Manejar el campo de huella digital si está presente
        if "huellaDigital" in update_data and update_data["huellaDigital"]:
            try:
                huella_digital = process_fingerprint_base64(update_data["huellaDigital"])
                update_data["huellaDigital"] = huella_digital
                print("Huella digital actualizada correctamente")
            except ValueError as ve:
                print(f"Error de validación en huella: {ve}")
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=str(ve)
                )
            except Exception as e:
                print(f"Error procesando huella: {e}")
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Error al procesar la huella digital"
                )
        
        # Manejar contraseña si está presente
        if "password" in update_data:
            password_value = update_data["password"]
            if password_value is not None and password_value.strip():
                print("Actualizando contraseña...")
                update_data["hashed_password"] = get_password_hash(password_value)
            else:
                print("Removiendo contraseña (trabajador sin acceso)")
                update_data["hashed_password"] = None
            # Eliminar el campo password del update_data
            del update_data["password"]
        
        print(f"Datos finales para actualizar: {update_data}")
        
        # Aplicar todas las actualizaciones
        for key, value in update_data.items():
            if hasattr(db_trabajador, key):
                setattr(db_trabajador, key, value)
                print(f"Actualizado {key}: {value}")
            else:
                print(f"Campo {key} no existe en el modelo")
        
        db.commit()
        
        # Cargar el trabajador actualizado con todas las relaciones
        try:
            trabajador_actualizado = db.query(Trabajador).options(
                joinedload(Trabajador.tipo_trabajador),
                joinedload(Trabajador.departamento_rel),
                joinedload(Trabajador.horario_rel),
                joinedload(Trabajador.centro_trabajo_rel),
                joinedload(Trabajador.grado_estudios_rel),
                joinedload(Trabajador.rol_rel)
            ).filter(Trabajador.id == trabajador_id).first()
            
            print(f"¡TRABAJADOR ACTUALIZADO EXITOSAMENTE! ID: {trabajador_actualizado.id}")
            return trabajador_actualizado
        except Exception as e:
            print(f"⚠️ Error cargando relaciones, devolviendo trabajador básico: {e}")
            db.refresh(db_trabajador)
            return db_trabajador
        
    except HTTPException as he:
        print(f"HTTPException: {he.detail}")
        db.rollback()
        raise he
    except Exception as e:
        print(f"ERROR INESPERADO AL ACTUALIZAR: {e}")
        print(f"Tipo de error: {type(e)}")
        print(f"Args del error: {e.args}")
        print(f"Traceback completo: {traceback.format_exc()}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error interno al actualizar trabajador: {str(e)}. Tipo: {type(e).__name__}"
        )

@router.delete("/trabajadores/{trabajador_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_trabajador(
    trabajador_id: int, 
    db: Session = Depends(get_db),
    current_user: Trabajador = Depends(check_admin_permissions)
):
    db_trabajador = db.query(Trabajador).filter(Trabajador.id == trabajador_id).first()
    if not db_trabajador:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Trabajador con ID {trabajador_id} no encontrado"
        )
    
    try:
        # En lugar de eliminar físicamente, marcar como inactivo
        db_trabajador.estado = False
        db.commit()
        return None
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al eliminar trabajador: {str(e)}"
        )