"""
Pydantic schemas for API request/response models
"""
from pydantic import BaseModel, Field
from typing import List, Optional, Dict
from datetime import datetime
from enum import Enum


class VehicleType(str, Enum):
    """Vehicle types for rebalancing"""
    MINI_VAN = "mini_van"
    LIGHT_TRUCK = "light_truck"
    BOX_TRUCK = "box_truck"


class StationStatus(BaseModel):
    """Station inventory status"""
    station_id: str
    station_name: str
    latitude: float
    longitude: float
    current_bikes: int
    capacity: int
    surplus_deficit: int
    priority: str = Field(description="LOW, MEDIUM, HIGH, CRITICAL")
    total_arrivals: int = 0
    total_departures: int = 0
    demand: Optional[int] = None


class VehicleConfig(BaseModel):
    """Vehicle configuration"""
    vehicle_type: VehicleType
    capacity: int
    cost_per_mile: float
    available_count: int = 1


class OptimizationConstraints(BaseModel):
    """Constraints for optimization"""
    time_window_start: int = Field(1, ge=0, le=23, description="Start hour (0-23)")
    time_window_end: int = Field(5, ge=0, le=23, description="End hour (0-23)")
    shortage_penalty: float = Field(10.0, ge=0, description="Penalty per bike shortage")
    fairness_weight: float = Field(0.3, ge=0, le=1, description="Weight for fairness (0-1)")
    max_distance: float = Field(10.0, ge=0, description="Max distance per route (miles)")
    min_station_bikes: int = Field(2, ge=0, description="Minimum bikes per station")
    vehicles: List[VehicleConfig] = []


class RebalancingMove(BaseModel):
    """Single rebalancing move"""
    vehicle_type: VehicleType
    from_station_id: str
    from_station_name: str
    to_station_id: str
    to_station_name: str
    bikes_moved: int
    distance: float
    cost: float
    sequence: int
    vehicle_icon: str


class OptimizationRequest(BaseModel):
    """Request for optimization"""
    target_date: Optional[str] = None
    constraints: OptimizationConstraints
    include_forecast: bool = False


class OptimizationResult(BaseModel):
    """Optimization result"""
    total_cost: float
    total_penalty: float
    objective_value: float
    moves: List[RebalancingMove]
    stations_served: int
    total_bikes_moved: int
    total_distance: float
    fairness_score: float
    execution_time: float
    solver_status: str
    stations: List[StationStatus] = Field(default_factory=list)


class AgentQuery(BaseModel):
    """Query for AI operations agent"""
    query: str
    context: Optional[Dict] = None
    include_visualization: bool = True


class AgentResponse(BaseModel):
    """Response from AI agent"""
    response: str
    suggestions: List[str] = []
    confidence: float = Field(ge=0, le=1)
    visualization_data: Optional[Dict] = None


class StationPattern(BaseModel):
    """Historical pattern for a station"""
    station_id: str
    hour_of_day: int
    day_of_week: int
    avg_demand: float
    avg_supply: float
    pattern_type: str = Field(description="commute, leisure, mixed, etc.")


class ForecastRequest(BaseModel):
    """Request for demand forecast"""
    station_id: Optional[str] = None
    forecast_hours: int = Field(24, ge=1, le=168)
    include_confidence: bool = True


class ForecastResult(BaseModel):
    """Forecast result"""
    station_id: str
    forecasted_values: List[float]
    timestamps: List[str]
    confidence_lower: Optional[List[float]] = None
    confidence_upper: Optional[List[float]] = None
