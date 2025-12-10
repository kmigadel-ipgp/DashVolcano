"""
Configuration management for DashVolcano API
Loads settings from environment variables
"""
from typing import List
from pydantic_settings import BaseSettings
from pydantic import Field


class Settings(BaseSettings):
    """Application settings loaded from environment variables"""
    
    # MongoDB Configuration
    MONGO_USER: str = Field(..., description="MongoDB username")
    MONGO_PASSWORD: str = Field(..., description="MongoDB password")
    MONGO_CLUSTER: str = Field(..., description="MongoDB cluster address")
    MONGO_DB: str = Field(default="newdatabase", description="MongoDB database name")
    
    # FastAPI Configuration
    API_HOST: str = Field(default="0.0.0.0", description="API host")
    API_PORT: int = Field(default=8000, description="API port")
    API_WORKERS: int = Field(default=4, description="Number of worker processes")
    DEBUG: bool = Field(default=False, description="Debug mode")
    
    # CORS Configuration
    CORS_ORIGINS: List[str] = Field(
        default=["http://localhost:5173", "http://localhost:3000"],
        description="Allowed CORS origins"
    )
    
    # Redis Configuration (optional)
    REDIS_URL: str = Field(default="redis://localhost:6379/0", description="Redis URL")
    
    # Security
    SECRET_KEY: str = Field(default="your-secret-key-change-in-production", description="Secret key for JWT")
    
    @property
    def mongodb_uri(self) -> str:
        """Generate MongoDB connection URI"""
        return f"mongodb+srv://{self.MONGO_USER}:{self.MONGO_PASSWORD}@{self.MONGO_CLUSTER}/?retryWrites=true&w=majority"
    
    class Config:
        env_file = ".env"
        case_sensitive = True


# Create global settings instance
settings = Settings()
