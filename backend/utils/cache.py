"""
Cache manager for optimization data to improve performance
"""
import pickle
import hashlib
import json
from pathlib import Path
from typing import Dict, Any, Optional
from datetime import datetime, timedelta

from utils.logger import setup_logger

logger = setup_logger(__name__)


class CacheManager:
    """Manages caching of expensive computations"""
    
    def __init__(self, cache_dir: str = "data/cache"):
        self.cache_dir = Path(cache_dir)
        self.cache_dir.mkdir(parents=True, exist_ok=True)
        self.memory_cache: Dict[str, tuple[Any, datetime]] = {}
        self.cache_ttl = timedelta(hours=24)  # Cache for 24 hours
    
    def _generate_key(self, data: Any) -> str:
        """Generate cache key from data"""
        if isinstance(data, dict):
            data_str = json.dumps(data, sort_keys=True)
        else:
            data_str = str(data)
        return hashlib.md5(data_str.encode()).hexdigest()
    
    def get(self, key: str) -> Optional[Any]:
        """Get cached value"""
        # Check memory cache first
        if key in self.memory_cache:
            value, timestamp = self.memory_cache[key]
            if datetime.now() - timestamp < self.cache_ttl:
                logger.debug(f"Cache HIT (memory): {key}")
                return value
            else:
                del self.memory_cache[key]
        
        # Check disk cache
        cache_file = self.cache_dir / f"{key}.pkl"
        if cache_file.exists():
            try:
                with open(cache_file, 'rb') as f:
                    cached_data = pickle.load(f)
                    value, timestamp = cached_data
                    
                if datetime.now() - timestamp < self.cache_ttl:
                    logger.debug(f"Cache HIT (disk): {key}")
                    # Load into memory cache
                    self.memory_cache[key] = (value, timestamp)
                    return value
                else:
                    cache_file.unlink()
            except Exception as e:
                logger.warning(f"Cache read error: {e}")
        
        logger.debug(f"Cache MISS: {key}")
        return None
    
    def set(self, key: str, value: Any):
        """Set cached value"""
        timestamp = datetime.now()
        
        # Store in memory cache
        self.memory_cache[key] = (value, timestamp)
        
        # Store in disk cache
        cache_file = self.cache_dir / f"{key}.pkl"
        try:
            with open(cache_file, 'wb') as f:
                pickle.dump((value, timestamp), f)
            logger.debug(f"Cache SET: {key}")
        except Exception as e:
            logger.warning(f"Cache write error: {e}")
    
    def invalidate(self, key: str):
        """Invalidate cache entry"""
        if key in self.memory_cache:
            del self.memory_cache[key]
        
        cache_file = self.cache_dir / f"{key}.pkl"
        if cache_file.exists():
            cache_file.unlink()
        
        logger.debug(f"Cache INVALIDATED: {key}")
    
    def clear_all(self):
        """Clear all caches"""
        self.memory_cache.clear()
        
        for cache_file in self.cache_dir.glob("*.pkl"):
            cache_file.unlink()
        
        logger.info("All caches cleared")
    
    def get_cache_stats(self) -> Dict[str, Any]:
        """Get cache statistics"""
        disk_files = list(self.cache_dir.glob("*.pkl"))
        total_size = sum(f.stat().st_size for f in disk_files)
        
        return {
            "memory_entries": len(self.memory_cache),
            "disk_entries": len(disk_files),
            "total_size_mb": total_size / (1024 * 1024),
            "cache_dir": str(self.cache_dir),
            "ttl_hours": self.cache_ttl.total_seconds() / 3600
        }


# Global cache instance
cache_manager = CacheManager()
