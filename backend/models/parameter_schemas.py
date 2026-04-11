"""
Parameter configuration schemas for optimization algorithms
"""
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any


class MILPParameters(BaseModel):
    """MILP solver parameters"""
    timeout_seconds: int = Field(default=300, ge=10, le=3600, description="Solver timeout in seconds")
    gap_tolerance: float = Field(default=0.01, ge=0.0, le=0.5, description="Optimality gap tolerance")
    threads: Optional[int] = Field(default=None, ge=1, le=16, description="Number of solver threads")


class GeneticParameters(BaseModel):
    """Genetic algorithm parameters"""
    population_size: int = Field(default=50, ge=10, le=500, description="Population size")
    generations: int = Field(default=100, ge=10, le=1000, description="Number of generations")
    mutation_rate: float = Field(default=0.1, ge=0.0, le=1.0, description="Mutation probability")
    crossover_rate: float = Field(default=0.8, ge=0.0, le=1.0, description="Crossover probability")
    elite_size: int = Field(default=5, ge=1, le=50, description="Elite individuals to preserve")


class SimulatedAnnealingParameters(BaseModel):
    """Simulated annealing parameters"""
    initial_temperature: float = Field(default=1000.0, ge=1.0, le=10000.0, description="Initial temperature")
    cooling_rate: float = Field(default=0.95, ge=0.8, le=0.99, description="Cooling rate per iteration")
    iterations: int = Field(default=1000, ge=100, le=10000, description="Number of iterations")


class GreedyParameters(BaseModel):
    """Greedy algorithm parameters"""
    sort_method: str = Field(default="deficit", description="Station sorting method")
    local_search: bool = Field(default=True, description="Enable local search improvement")


class PenaltyWeights(BaseModel):
    """Penalty weights for optimization objective"""
    distance_weight: float = Field(default=1.0, ge=0.0, le=10.0, description="Distance penalty weight")
    vehicle_cost_weight: float = Field(default=0.5, ge=0.0, le=10.0, description="Vehicle cost weight")
    fairness_weight: float = Field(default=0.3, ge=0.0, le=10.0, description="Fairness importance weight")
    time_penalty_weight: float = Field(default=0.2, ge=0.0, le=10.0, description="Time window penalty weight")


class AlgorithmConfig(BaseModel):
    """Complete algorithm configuration"""
    algorithm: str = Field(default="milp", description="Algorithm type")
    milp_params: Optional[MILPParameters] = None
    genetic_params: Optional[GeneticParameters] = None
    sa_params: Optional[SimulatedAnnealingParameters] = None
    greedy_params: Optional[GreedyParameters] = None
    penalty_weights: PenaltyWeights = Field(default_factory=PenaltyWeights)


class ParameterPreset(BaseModel):
    """Saved parameter preset"""
    preset_id: str
    preset_name: str
    description: Optional[str] = None
    config: AlgorithmConfig
    created_at: str
    
    class Config:
        json_schema_extra = {
            "example": {
                "preset_id": "fast_optimize",
                "preset_name": "Fast Optimization",
                "description": "Quick results with lower accuracy",
                "config": {
                    "algorithm": "milp",
                    "milp_params": {
                        "timeout_seconds": 60,
                        "gap_tolerance": 0.05
                    },
                    "penalty_weights": {
                        "distance_weight": 1.0,
                        "vehicle_cost_weight": 0.3,
                        "fairness_weight": 0.2
                    }
                },
                "created_at": "2025-10-10T12:00:00Z"
            }
        }
