from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.routes import trabajadores, asistencia, justificaciones, horarios, reportes, auth, catalogos, dias_festivos
from app.database import engine
from app.models import models

# Crear todas las tablas en la base de datos
models.Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.PROJECT_VERSION,
    description="API para el sistema de control de asistencias con biometría",
)

# Configuración de CORS para permitir solicitudes desde el frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def cors_handler(request, call_next):
    response = await call_next(request)
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"
    response.headers["Access-Control-Allow-Headers"] = "*"
    return response

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