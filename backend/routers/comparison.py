"""
Multi-algorithm comparison router
Run and compare different optimization algorithms
"""
from fastapi import APIRouter, HTTPException
from typing import List, Dict, Any
import time
import asyncio

from models.schemas import OptimizationRequest, OptimizationResult, StationStatus
from services.advanced_optimizer import AdvancedRebalancingOptimizer
from services.alternative_algorithms import (
    GreedyOptimizer,
    GeneticAlgorithmOptimizer,
    SimulatedAnnealingOptimizer
)
from utils.comprehensive_data_loader import ComprehensiveDataLoader
from utils.logger import setup_logger
from routers.vehicles import get_vehicles_for_optimization
from pydantic import BaseModel

logger = setup_logger(__name__)
router = APIRouter()

_data_loader = None

def get_data_loader() -> ComprehensiveDataLoader:
    """Get or initialize data loader"""
    global _data_loader
    if _data_loader is None:
        _data_loader = ComprehensiveDataLoader()
    return _data_loader


class AlgorithmComparison(BaseModel):
    """Comparison result between algorithms"""
    algorithms: List[str]
    results: Dict[str, OptimizationResult]
    comparison: Dict[str, Any]
    winner: Dict[str, str]


class ComparisonRequest(BaseModel):
    """Request for algorithm comparison"""
    algorithms: List[str] = ["milp", "greedy", "genetic", "simulated_annealing"]
    constraints: Dict[str, Any] = {}


@router.post("/compare", response_model=AlgorithmComparison)
async def compare_algorithms(request: ComparisonRequest):
    """
    Run multiple optimization algorithms and compare results
    
    Available algorithms:
    - milp: Mixed Integer Linear Programming (most accurate, slowest)
    - greedy: Greedy nearest-neighbor (fast, decent quality)
    - genetic: Genetic Algorithm (good balance)
    - simulated_annealing: Simulated Annealing (can escape local optima)
    """
    try:
        logger.info(f"🏁 Starting multi-algorithm comparison: {request.algorithms}")
        
        # Load data once
        loader = get_data_loader()
        data = loader.load_all_months()
        
        # Convert to StationStatus
        stations = []
        for station_data in data['stations']:
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
        
        # Get vehicle configs
        vehicle_configs = get_vehicles_for_optimization()
        
        results = {}
        
        # Run each algorithm
        for algo in request.algorithms:
            logger.info(f"🚀 Running {algo.upper()} algorithm...")
            start_time = time.time()
            
            if algo == "milp":
                optimizer = AdvancedRebalancingOptimizer(request.constraints, vehicle_configs)
                result = await optimizer.optimize(stations)
                result.solver_status = "MILP-Optimal"
            
            elif algo == "greedy":
                optimizer = GreedyOptimizer(vehicle_configs)
                result = optimizer.optimize(stations)
            
            elif algo == "genetic":
                optimizer = GeneticAlgorithmOptimizer(vehicle_configs, population_size=30, generations=50)
                result = optimizer.optimize(stations)
            
            elif algo == "simulated_annealing":
                optimizer = SimulatedAnnealingOptimizer(vehicle_configs, iterations=500)
                result = optimizer.optimize(stations)
            
            else:
                logger.warning(f"Unknown algorithm: {algo}")
                continue
            
            result.execution_time = time.time() - start_time
            results[algo] = result
            
            logger.info(f"✅ {algo.upper()} completed in {result.execution_time:.2f}s")
            logger.info(f"   Cost: ${result.total_cost:.2f}, Bikes: {result.total_bikes_moved}")
        
        # Compare results
        comparison = {
            "total_cost": {algo: r.total_cost for algo, r in results.items()},
            "bikes_moved": {algo: r.total_bikes_moved for algo, r in results.items()},
            "stations_served": {algo: r.stations_served for algo, r in results.items()},
            "fairness_score": {algo: r.fairness_score for algo, r in results.items()},
            "execution_time": {algo: r.execution_time for algo, r in results.items()},
            "moves_count": {algo: len(r.moves) for algo, r in results.items()}
        }
        
        # Determine winners
        winner = {
            "lowest_cost": min(results.keys(), key=lambda k: results[k].total_cost),
            "highest_fairness": max(results.keys(), key=lambda k: results[k].fairness_score),
            "fastest": min(results.keys(), key=lambda k: results[k].execution_time),
            "most_bikes": max(results.keys(), key=lambda k: results[k].total_bikes_moved)
        }
        
        # Add winner details
        winner["overall_best"] = winner["lowest_cost"]  # Cost is primary metric
        
        logger.info("🏆 Comparison complete!")
        logger.info(f"   Best Cost: {winner['lowest_cost']} (${results[winner['lowest_cost']].total_cost:.2f})")
        logger.info(f"   Best Fairness: {winner['highest_fairness']} ({results[winner['highest_fairness']].fairness_score:.3f})")
        logger.info(f"   Fastest: {winner['fastest']} ({results[winner['fastest']].execution_time:.2f}s)")
        
        return AlgorithmComparison(
            algorithms=list(results.keys()),
            results=results,
            comparison=comparison,
            winner=winner
        )
    
    except Exception as e:
        logger.error(f"❌ Algorithm comparison failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/algorithms")
async def list_algorithms():
    """List available optimization algorithms"""
    return {
        "algorithms": [
            {
                "id": "milp",
                "name": "Mixed Integer Linear Programming",
                "description": "Most accurate optimization using PuLP solver. Finds optimal solution but slowest.",
                "complexity": "High",
                "speed": "Slow (5-10 min)",
                "quality": "Optimal (100%)",
                "best_for": "Production deployment, critical optimizations"
            },
            {
                "id": "greedy",
                "name": "Greedy Nearest-Neighbor",
                "description": "Fast heuristic that always picks nearest surplus station.",
                "complexity": "Low",
                "speed": "Very Fast (<1 sec)",
                "quality": "Good (70-80%)",
                "best_for": "Quick estimates, real-time dashboards"
            },
            {
                "id": "genetic",
                "name": "Genetic Algorithm",
                "description": "Evolutionary optimization that evolves solutions over generations.",
                "complexity": "Medium",
                "speed": "Fast (5-10 sec)",
                "quality": "Very Good (85-95%)",
                "best_for": "Balance between speed and quality"
            },
            {
                "id": "simulated_annealing",
                "name": "Simulated Annealing",
                "description": "Probabilistic optimization that can escape local optima.",
                "complexity": "Medium",
                "speed": "Fast (5-15 sec)",
                "quality": "Very Good (85-92%)",
                "best_for": "Complex scenarios, avoiding local optima"
            }
        ]
    }
