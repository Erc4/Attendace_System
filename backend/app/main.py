from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.routes import trabajadores, asistencia, justificaciones, horarios, reportes, auth, catalogos, dias_festivos
from app.database import engine
from app.models import models

# Crear todas las tablas en la base de datos
#models.Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.PROJECT_VERSION,
    description="API para el sistema de control de asistencias con biometría",
)

# Configuración de CORS para permitir solicitudes desde el frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://attendace-system-rouge.vercel.app",
        "http://localhost:3000",
        "http://localhost:8000",
        "*"  # Permitir todos los orígenes temporalmente
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["*"],
    expose_headers=["*"],
    max_age=3600,
)

# Incluir los routers
app.include_router(auth.router, prefix="/api", tags=["Autenticación"])
app.include_router(trabajadores.router, prefix="/api", tags=["Trabajadores"])
app.include_router(asistencia.router, prefix="/api", tags=["Asistencias"])
app.include_router(justificaciones.router, prefix="/api", tags=["Justificaciones"])
app.include_router(horarios.router, prefix="/api", tags=["Horarios"])
app.include_router(reportes.router, prefix="/api/reportes", tags=["reportes"])
app.include_router(catalogos.router, prefix="/api", tags=["Catálogos"])
app.include_router(dias_festivos.router, prefix="/api", tags=["Días Festivos"])

@app.get("/")
async def root():
    return {"message": "Bienvenido al Sistema de Control de Asistencias"}

# Para ejecutar con uvicorn
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=True
    )