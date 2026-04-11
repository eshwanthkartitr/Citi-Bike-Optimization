"""
Router for system statistics and KPIs
"""
from fastapi import APIRouter, HTTPException
from utils.comprehensive_data_loader import ComprehensiveDataLoader
from utils.logger import setup_logger

router = APIRouter(prefix="/stats", tags=["Statistics"])
logger = setup_logger(__name__)


@router.get("/kpis")
async def get_initial_kpis():
    """
    Get consistent initial KPIs before optimization
    This ensures the same values are shown across all page loads
    """
    try:
        loader = ComprehensiveDataLoader()
        data = loader.load_all_months()
        
        if not data or not data.get('stations'):
            raise HTTPException(status_code=404, detail="No station data available")
        
        # Calculate consistent KPIs from station data
        total_deficit = 0
        total_surplus = 0
        
        for station_data in data['stations']:
            net_flow = station_data['net_flow']
            if net_flow < 0:
                total_deficit += abs(net_flow)
            elif net_flow > 0:
                total_surplus += net_flow
        
        # Potential bikes that could be rebalanced
        potential_rebalance = min(total_deficit, total_surplus)
        
        return {
            "status": "success",
            "data": {
                "total_cost": 0,
                "stations_served": len(data['stations']),
                "bikes_rebalanced": potential_rebalance,
                "fairness_score": 0,
                "total_deficit": total_deficit,
                "total_surplus": total_surplus
            }
        }
    
    except Exception as e:
        logger.error(f"Failed to calculate KPIs: {str(e)}")
        raise HTTPException(status_code=500, detail=f"KPI calculation failed: {str(e)}")
