from pydantic_settings import BaseSettings
from typing import Optional
import os
from dotenv import load_dotenv

load_dotenv()

class Settings(BaseSettings):
    PROJECT_NAME: str = "Sistema de Control de Asistencias"
    PROJECT_VERSION: str = "1.0.0"
    
    # Configuración de la Base de Datos
    DATABASE_USER: str = os.getenv("DATABASE_USER", "root")
    DATABASE_PASSWORD: str = os.getenv("DATABASE_PASSWORD", "")
    DATABASE_HOST: str = os.getenv("DATABASE_HOST", "localhost")
    DATABASE_PORT: str = os.getenv("DATABASE_PORT", "3306")
    DATABASE_NAME: str = os.getenv("DATABASE_NAME", "attendancesystem")
    
    # Configuración de JWT
    SECRET_KEY: str = os.getenv("SECRET_KEY", "ClaveSecretaParaJWT123")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 horas
    
    # Configuración del servidor
    HOST: str = os.getenv("HOST", "0.0.0.0")
    PORT: int = int(os.getenv("PORT", "8000"))

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"

settings = Settings()