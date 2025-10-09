"""
Analytics router - Historical analysis and KPIs
"""
from fastapi import APIRouter, HTTPException, Query
from typing import Optional, Dict, Any

from models.schemas import ForecastRequest, ForecastResult
from utils.comprehensive_data_loader import ComprehensiveDataLoader
from utils.logger import setup_logger

logger = setup_logger(__name__)
router = APIRouter()

# Global data loader
_data_loader = None

def get_data_loader():
    """Get or initialize data loader"""
    global _data_loader
    if _data_loader is None:
        _data_loader = ComprehensiveDataLoader()
    return _data_loader


@router.get("/summary")
async def get_summary() -> Dict[str, Any]:
    """
    Get comprehensive summary of all 7 months of data
    
    Returns: Total trips, stations, imbalance stats, peak hours, etc.
    """
    try:
        logger.info("Fetching comprehensive data summary...")
        loader = get_data_loader()
        data = loader.load_all_months()
        
        return {
            "total_trips": data['summary']['total_trips'],
            "total_stations": data['summary']['total_stations'],
            "stations_with_surplus": data['summary']['stations_with_surplus'],
            "stations_with_deficit": data['summary']['stations_with_deficit'],
            "total_surplus_bikes": data['summary']['total_surplus_bikes'],
            "total_deficit_bikes": data['summary']['total_deficit_bikes'],
            "peak_hours": data['peak_hours'],
            "top_10_deficit": data['top_10_deficit'],
            "top_10_surplus": data['top_10_surplus'],
            "months_analyzed": "January - July 2025",
            "data_source": "Real Citi-Bike trip data"
        }
    except Exception as e:
        logger.error(f"Failed to get summary: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/patterns")
async def get_patterns(
    pattern_type: Optional[str] = None,
    station_id: Optional[str] = None
):
    """
    Get historical demand/supply patterns from 7 months of data
    
    Analyze commute patterns, peak hours, daily trends
    """
    try:
        loader = get_data_loader()
        data = loader.load_all_months()
        
        patterns = {
            "peak_hours": data['peak_hours'],
            "total_months": 7,
            "data_period": "Jan-July 2025"
        }
        
        if station_id:
            # Find specific station patterns
            station = next((s for s in data['stations'] if s['station_id'] == station_id), None)
            if station:
                patterns['station_patterns'] = {
                    "hourly_departures": station.get('hourly_departures', {}),
                    "daily_patterns": station.get('daily_patterns', {})
                }
        
        return patterns
    except Exception as e:
        logger.error(f"Pattern analysis failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/kpis")
async def get_kpis():
    """
    Get operational KPIs from 7 months of real data
    
    Returns metrics calculated from Jan-July 2025 dataset
    """
    try:
        loader = get_data_loader()
        data = loader.load_all_months()
        summary = data['summary']
        
        return {
            "total_trips": summary['total_trips'],
            "total_stations": summary['total_stations'],
            "imbalance": {
                "surplus_stations": summary['stations_with_surplus'],
                "deficit_stations": summary['stations_with_deficit'],
                "total_surplus": summary['total_surplus_bikes'],
                "total_deficit": summary['total_deficit_bikes']
            },
            "priority_distribution": {
                "critical": len([s for s in data['stations'] if s.get('priority') == 'CRITICAL']),
                "high": len([s for s in data['stations'] if s.get('priority') == 'HIGH']),
                "medium": len([s for s in data['stations'] if s.get('priority') == 'MEDIUM']),
                "low": len([s for s in data['stations'] if s.get('priority') == 'LOW'])
            },
            "peak_activity": data['peak_hours']
        }
    except Exception as e:
        logger.error(f"KPI calculation failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/forecast", response_model=ForecastResult)
async def forecast_demand(request: ForecastRequest):
    """
    Forecast future demand/surplus for stations
    
    Uses time-series models to predict bike availability needs
    """
    try:
        logger.info(f"Forecasting for station: {request.station_id}")
        # TODO: Implement forecasting
        return {}
    except Exception as e:
        logger.error(f"Forecasting failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
