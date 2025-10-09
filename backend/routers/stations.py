"""
Stations router - Station data and inventory management
"""
from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional

from models.schemas import StationStatus
from utils.comprehensive_data_loader import ComprehensiveDataLoader
from utils.logger import setup_logger

logger = setup_logger(__name__)
router = APIRouter()

# Global data loader instance
_data_loader = None

def get_data_loader():
    """Get or initialize the comprehensive data loader"""
    global _data_loader
    if _data_loader is None:
        _data_loader = ComprehensiveDataLoader()
        logger.info("Initialized ComprehensiveDataLoader")
    return _data_loader


@router.get("/", response_model=List[StationStatus])
async def get_all_stations(
    date: Optional[str] = None,
    include_forecast: bool = False
):
    """Get all station data from 7 months of real data (Jan-July 2025)"""
    try:
        logger.info("Loading all stations from comprehensive dataset...")
        loader = get_data_loader()
        
        # Load all 7 months of data
        data = loader.load_all_months()
        
        # Convert to StationStatus objects
        stations = []
        for station_data in data['stations']:
            # Calculate current bikes (assume 50% of capacity for now)
            # In production, this would come from real-time API
            estimated_capacity = max(30, abs(station_data['net_flow']) + 20)
            current_bikes = max(0, estimated_capacity // 2 + station_data['net_flow'] // 10)
            
            station = StationStatus(
                station_id=station_data['station_id'],
                station_name=station_data['station_name'],
                latitude=station_data['latitude'],
                longitude=station_data['longitude'],
                current_bikes=current_bikes,
                capacity=estimated_capacity,
                surplus_deficit=station_data['net_flow'],
                priority=station_data.get('priority', 'LOW'),
                total_arrivals=station_data['total_arrivals'],
                total_departures=station_data['total_departures']
            )
            stations.append(station)
        
        logger.info(f"Loaded {len(stations)} stations from real dataset")
        return stations
        
    except Exception as e:
        logger.error(f"Failed to get stations: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{station_id}", response_model=StationStatus)
async def get_station(station_id: str, date: Optional[str] = None):
    """Get specific station details"""
    try:
        # TODO: Implement single station retrieval
        return {}
    except Exception as e:
        logger.error(f"Failed to get station {station_id}: {str(e)}")
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/{station_id}/history")
async def get_station_history(
    station_id: str,
    days: int = Query(7, ge=1, le=90)
):
    """Get historical demand/supply patterns for a station"""
    try:
        # TODO: Implement historical data retrieval
        return {"station_id": station_id, "history": []}
    except Exception as e:
        logger.error(f"Failed to get station history: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
