"""
Vehicle Management Router - Add, edit, and manage vehicle configurations
"""
from fastapi import APIRouter, HTTPException
from typing import List, Dict, Optional
from pydantic import BaseModel

from utils.logger import setup_logger
from config.settings import settings

logger = setup_logger(__name__)
router = APIRouter()

# In-memory vehicle storage (in production, use a database)
_vehicles_db = {
    "mini_van": {
        "id": "mini_van",
        "name": "Mini Van",
        "capacity": 10,
        "cost_per_trip": 400.0,
        "icon": "🚐",
        "available_count": 5
    },
    "light_truck": {
        "id": "light_truck",
        "name": "Light Truck",
        "capacity": 25,
        "cost_per_trip": 900.0,
        "icon": "🚚",
        "available_count": 3
    },
    "box_truck": {
        "id": "box_truck",
        "name": "Box Truck",
        "capacity": 50,
        "cost_per_trip": 1700.0,
        "icon": "📦",
        "available_count": 2
    },
    "mini_bike": {
        "id": "mini_bike",
        "name": "Mini Bike",
        "capacity": 5,
        "cost_per_trip": 120.0,
        "icon": "🏍️",
        "available_count": 6
    }
}


class VehicleConfig(BaseModel):
    """Vehicle configuration"""
    id: str
    name: str
    capacity: int
    cost_per_trip: float
    icon: str
    available_count: int = 1


class VehicleUpdate(BaseModel):
    """Update vehicle configuration"""
    name: Optional[str] = None
    capacity: Optional[int] = None
    cost_per_trip: Optional[float] = None
    icon: Optional[str] = None
    available_count: Optional[int] = None


@router.get("/", response_model=List[VehicleConfig])
async def get_all_vehicles():
    """Get all vehicle configurations"""
    try:
        logger.info("📋 Fetching all vehicles...")
        vehicles = list(_vehicles_db.values())
        logger.info(f"✅ Found {len(vehicles)} vehicle types")
        return vehicles
    except Exception as e:
        logger.error(f"❌ Failed to get vehicles: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{vehicle_id}", response_model=VehicleConfig)
async def get_vehicle(vehicle_id: str):
    """Get specific vehicle configuration"""
    if vehicle_id not in _vehicles_db:
        raise HTTPException(status_code=404, detail=f"Vehicle {vehicle_id} not found")
    return _vehicles_db[vehicle_id]


@router.post("/", response_model=VehicleConfig)
async def create_vehicle(vehicle: VehicleConfig):
    """Add new vehicle type"""
    try:
        if vehicle.id in _vehicles_db:
            raise HTTPException(status_code=400, detail=f"Vehicle {vehicle.id} already exists")
        
        _vehicles_db[vehicle.id] = vehicle.dict()
        logger.info(f"✅ Created vehicle: {vehicle.name}")
        return vehicle
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Failed to create vehicle: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{vehicle_id}", response_model=VehicleConfig)
async def update_vehicle(vehicle_id: str, updates: VehicleUpdate):
    """Update vehicle configuration"""
    try:
        if vehicle_id not in _vehicles_db:
            raise HTTPException(status_code=404, detail=f"Vehicle {vehicle_id} not found")
        
        vehicle = _vehicles_db[vehicle_id]
        
        # Update only provided fields
        update_data = updates.dict(exclude_unset=True)
        for field, value in update_data.items():
            vehicle[field] = value
        
        _vehicles_db[vehicle_id] = vehicle
        logger.info(f"✅ Updated vehicle: {vehicle_id}")
        return VehicleConfig(**vehicle)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Failed to update vehicle: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{vehicle_id}")
async def delete_vehicle(vehicle_id: str):
    """Delete vehicle type"""
    try:
        if vehicle_id not in _vehicles_db:
            raise HTTPException(status_code=404, detail=f"Vehicle {vehicle_id} not found")
        
        deleted = _vehicles_db.pop(vehicle_id)
        logger.info(f"🗑️ Deleted vehicle: {vehicle_id}")
        return {"message": f"Vehicle {vehicle_id} deleted", "vehicle": deleted}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Failed to delete vehicle: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/config/active", response_model=Dict)
async def get_active_config():
    """
    Get current active vehicle configuration for optimization
    
    Returns the vehicles that will be used in the next optimization run
    """
    try:
        return {
            "vehicles": list(_vehicles_db.values()),
            "total_types": len(_vehicles_db),
            "total_vehicles": sum(v["available_count"] for v in _vehicles_db.values())
        }
    except Exception as e:
        logger.error(f"❌ Failed to get active config: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


def get_vehicles_for_optimization():
    """Helper function to get vehicles for optimization"""
    return _vehicles_db
