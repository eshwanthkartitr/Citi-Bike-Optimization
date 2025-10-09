"""
Configuration settings for the Citi-Bike Optimization API
"""
from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    """Application settings"""
    
    # API Settings
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    DEBUG: bool = True
    
    # CORS
    CORS_ORIGINS: List[str] = ["http://localhost:5173", "http://localhost:3000"]
    
    # Database
    DATABASE_URL: str = "sqlite:///./citibike.db"
    
    # Redis Cache
    REDIS_URL: str = "redis://localhost:6379"
    CACHE_TTL: int = 3600  # 1 hour
    
    # Optimization Parameters
    DEFAULT_TIME_WINDOW_START: int = 1  # 1 AM
    DEFAULT_TIME_WINDOW_END: int = 5    # 5 AM
    DEFAULT_SHORTAGE_PENALTY: float = 10.0
    DEFAULT_FAIRNESS_WEIGHT: float = 0.3
    
    # Vehicle Types
    TRUCK_CAPACITY: int = 30
    VAN_CAPACITY: int = 15
    BIKE_TRAILER_CAPACITY: int = 8
    
    TRUCK_COST_PER_MILE: float = 2.5
    VAN_COST_PER_MILE: float = 1.5
    BIKE_TRAILER_COST_PER_MILE: float = 0.8
    
    # Vehicle Types (Based on provided constraints)
    MINI_VAN_CAPACITY: int = 10
    MINI_VAN_COST_PER_TRIP: float = 400.0
    
    LIGHT_TRUCK_CAPACITY: int = 25
    LIGHT_TRUCK_COST_PER_TRIP: float = 900.0
    
    BOX_TRUCK_CAPACITY: int = 50
    BOX_TRUCK_COST_PER_TRIP: float = 1700.0
    
    # Data Paths
    DATA_DIR: str = "./data"
    RAW_DATA_DIR: str = "./data/raw"
    PROCESSED_DATA_DIR: str = "./data/processed"
    MODELS_DIR: str = "./models/saved"
    
    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
