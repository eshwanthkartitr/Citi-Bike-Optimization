"""
Optimization router - Advanced MILP-based rebalancing optimization with real vehicle constraints
"""
from fastapi import APIRouter, HTTPException, BackgroundTasks
from typing import List
import time
from pathlib import Path

from models.schemas import (
    OptimizationRequest,
    OptimizationResult,
    StationStatus
)
from services.advanced_optimizer import AdvancedRebalancingOptimizer
from utils.comprehensive_data_loader import ComprehensiveDataLoader
from utils.logger import setup_logger
from config.settings import settings

logger = setup_logger(__name__)
router = APIRouter()

# Global data loader
_data_loader = None

def get_data_loader() -> ComprehensiveDataLoader:
    """Get or initialize data loader"""
    global _data_loader
    if _data_loader is None:
        _data_loader = ComprehensiveDataLoader()
        logger.info("📂 Data loader initialized")
    return _data_loader


@router.post("/run", response_model=OptimizationResult)
async def run_optimization(request: OptimizationRequest):
    """
    Run rebalancing optimization with advanced MILP solver
    
    Core Problem: Determine optimal number of bikes to transport from station j to station i
    such that the demand at station i is fully satisfied, while selecting appropriate vehicles
    to minimize total transportation cost.
    
    Features:
    - Real vehicle constraints (Mini Van: $400/10 bikes, Light Truck: $900/25 bikes, Box Truck: $1700/50 bikes)
    - Priority-based optimization (sparse/remote stations get higher priority)
    - MILP solver with PuLP
    """
    try:
        logger.info(f"🚀 Starting optimization for date: {request.target_date}")
        start_time = time.time()
        
        # Load comprehensive data from all 7 months
        loader = get_data_loader()
        logger.info("📊 Loading station data from 7 months with priorities...")
        
        data = loader.load_all_months()
        logger.info(f"✅ Loaded data for {len(data['stations'])} stations ({data['summary']['total_trips']:,} trips)")
        
        # Convert to StationStatus objects
        stations = []
        for station_data in data['stations']:
            # Estimate current bikes based on capacity and net flow
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
        
        # Get current vehicle configurations
        from routers.vehicles import get_vehicles_for_optimization
        vehicle_configs = get_vehicles_for_optimization()
        logger.info(f"🚚 Using {len(vehicle_configs)} vehicle types for optimization")
        
        # Initialize optimizer with constraints and vehicle configs
        optimizer = AdvancedRebalancingOptimizer(request.constraints, vehicle_configs)
        
        # Run optimization
        logger.info("🔧 Running MILP optimization...")
        result = await optimizer.optimize(stations)
        
        execution_time = time.time() - start_time
        result.execution_time = execution_time
        
        logger.info(f"✅ Optimization completed in {execution_time:.2f}s")
        logger.info(f"   💰 Total cost: ${result.total_cost:.2f}")
        logger.info(f"   🚲 Bikes moved: {result.total_bikes_moved}")
        logger.info(f"   📦 Moves: {len(result.moves)}")
        logger.info(f"   📍 Stations served: {result.stations_served}")
        
        # Store result globally for export
        global _last_result
        _last_result = result
        
        # Add to history
        from services.history import optimization_history
        constraints_dict = request.constraints.model_dump()
        optimization_history.add_run(result, constraints_dict)
        
        return result
        
    except Exception as e:
        logger.error(f"❌ Optimization failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/stations/status", response_model=List[StationStatus])
async def get_station_status(date: str = None):
    """
    Get current station inventory status with priorities
    
    Returns surplus/deficit for each station with priority classification based on:
    - Sparsity (distance to nearest neighbors)
    - Demand severity
    - Activity level
    """
    try:
        logger.info("📊 Loading station status...")
        
        loader = get_data_loader()
        df_stations = loader.load_all_data()
        df_stations = loader.calculate_station_priorities(df_stations)
        
        stations = []
        for _, row in df_stations.iterrows():
            station = StationStatus(
                station_id=row['station_id'],
                station_name=row['station_name'],
                latitude=row['latitude'],
                longitude=row['longitude'],
                current_bikes=int(row['current_bikes']),
                capacity=int(row['capacity']),
                surplus_deficit=int(row['surplus_deficit']),
                priority=row.get('priority_category', 'MEDIUM'),
                priority_score=float(row.get('priority_score', 50.0)),
                sparsity_score=float(row.get('sparsity_score', 0.0)),
                activity_level=float(row.get('activity_level', 0.0))
            )
            stations.append(station)
        
        logger.info(f"✅ Loaded {len(stations)} stations")
        return stations
        
    except Exception as e:
        logger.error(f"❌ Failed to get station status: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/validate")
async def validate_constraints(request: OptimizationRequest):
    """
    Validate optimization constraints
    
    Check if constraints are feasible before running full optimization
    """
    try:
        # Basic validation
        warnings = []
        errors = []
        
        c = request.constraints
        
        if c.shortage_penalty <= 0:
            errors.append("Shortage penalty must be positive")
        
        if c.min_station_bikes < 0:
            errors.append("Minimum station bikes cannot be negative")
        
        if c.max_station_bikes > 100:
            warnings.append("Max station bikes seems unusually high")
        
        # Check vehicle constraints
        loader = get_data_loader()
        df_stations = loader.load_all_data()
        
        total_deficit = df_stations[df_stations['surplus_deficit'] < 0]['surplus_deficit'].sum()
        total_surplus = df_stations[df_stations['surplus_deficit'] > 0]['surplus_deficit'].sum()
        
        if abs(total_deficit) > total_surplus:
            warnings.append(f"Total deficit ({abs(total_deficit)}) exceeds total surplus ({total_surplus})")
        
        return {
            "valid": len(errors) == 0,
            "warnings": warnings,
            "errors": errors,
            "stats": {
                "total_stations": len(df_stations),
                "deficit_stations": len(df_stations[df_stations['surplus_deficit'] < 0]),
                "surplus_stations": len(df_stations[df_stations['surplus_deficit'] > 0]),
                "total_deficit": int(abs(total_deficit)),
                "total_surplus": int(total_surplus)
            }
        }
        
    except Exception as e:
        logger.error(f"❌ Validation failed: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/routes/{optimization_id}")
async def get_routes(optimization_id: str):
    """
    Get detailed routes for a completed optimization
    
    Returns vehicle routes with turn-by-turn navigation
    """
    try:
        # TODO: Implement route retrieval from cache/database
        return {"message": "Route details", "optimization_id": optimization_id}
        
    except Exception as e:
        logger.error(f"❌ Failed to get routes: {str(e)}")
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/priority-map")
async def get_priority_map():
    """
    Get priority map data for visualization
    
    Returns stations with priority scores for heatmap visualization
    """
    try:
        loader = get_data_loader()
        df_stations = loader.load_all_data()
        df_stations = loader.calculate_station_priorities(df_stations)
        
        priority_data = []
        for _, row in df_stations.iterrows():
            priority_data.append({
                "station_id": row['station_id'],
                "station_name": row['station_name'],
                "latitude": row['latitude'],
                "longitude": row['longitude'],
                "priority_score": float(row.get('priority_score', 50.0)),
                "priority_category": row.get('priority_category', 'MEDIUM'),
                "sparsity_score": float(row.get('sparsity_score', 0.0)),
                "surplus_deficit": int(row['surplus_deficit'])
            })
        
        return priority_data
        
    except Exception as e:
        logger.error(f"❌ Failed to get priority map: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
