import os
from pathlib import Path
from pydantic_settings import BaseSettings
from pydantic import ConfigDict

BASE_DIR = Path(__file__).resolve().parent.parent.parent

class Settings(BaseSettings):
    model_config = ConfigDict(env_file=".env", extra="ignore")

    PROJECT_NAME: str = "Transformer-Based CTI Extraction & Attack-Chain Reconstruction"
    API_V1_STR: str = "/api"
    
    # Storage & DB
    DATABASE_URL: str = os.getenv("DATABASE_URL", f"sqlite:///{BASE_DIR / 'cti_platform.db'}")
    UPLOAD_DIR: str = os.getenv("UPLOAD_DIR", str(BASE_DIR / "uploads"))
    MAX_UPLOAD_SIZE: int = 25 * 1024 * 1024  # 25MB
    ALLOWED_EXTENSIONS: set = {".pdf", ".docx", ".txt", ".md"}
    
    # Transformer & ML
    MODEL_CHECKPOINT: str = os.getenv("MODEL_CHECKPOINT", "dslim/bert-base-NER")
    MODEL_LOCAL_DIR: str = os.getenv("MODEL_LOCAL_DIR", str(BASE_DIR / "models" / "cti_transformer"))
    USE_GPU: bool = os.getenv("USE_GPU", "false").lower() == "true"
    CONFIDENCE_THRESHOLD: float = 0.50
    
    # Data Paths
    DATA_DIR: str = str(BASE_DIR / "data")
    BUILTIN_REPORTS_DIR: str = str(BASE_DIR / "data" / "cti_reports")
    MITRE_DATA_PATH: str = str(BASE_DIR / "data" / "mitre" / "enterprise_attack.json")
    GROUND_TRUTH_PATH: str = str(BASE_DIR / "data" / "evaluation" / "ground_truth.json")

settings = Settings()

# Ensure directories exist
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
os.makedirs(settings.MODEL_LOCAL_DIR, exist_ok=True)
os.makedirs(settings.BUILTIN_REPORTS_DIR, exist_ok=True)
