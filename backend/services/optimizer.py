"""
Core MILP optimization service for bike rebalancing
"""
import pulp
from typing import List, Dict
import numpy as np
from geopy.distance import geodesic

from models.schemas import (
    OptimizationConstraints,
    StationStatus,
    OptimizationResult,
    RebalancingMove,
    VehicleType
)
from utils.logger import setup_logger

logger = setup_logger(__name__)


class RebalancingOptimizer:
    """MILP-based optimizer for bike rebalancing"""
    
    def __init__(self, constraints: OptimizationConstraints = None):
        self.constraints = constraints or OptimizationConstraints()
        self.stations: List[StationStatus] = []
        self.distance_matrix: Dict = {}
        
    async def load_station_data(self, date: str = None) -> List[StationStatus]:
        """Load station inventory data"""
        # TODO: Implement actual data loading from database
        logger.info(f"Loading station data for date: {date}")
        return []
    
    async def get_station_status(self, date: str = None) -> List[StationStatus]:
        """Get current station status with surplus/deficit"""
        # TODO: Implement station status calculation
        return []
    
    def calculate_distance_matrix(self, stations: List[StationStatus]):
        """Calculate distances between all station pairs"""
        n = len(stations)
        self.distance_matrix = {}
        
        for i in range(n):
            for j in range(n):
                if i != j:
                    coord1 = (stations[i].latitude, stations[i].longitude)
                    coord2 = (stations[j].latitude, stations[j].longitude)
                    distance = geodesic(coord1, coord2).miles
                    self.distance_matrix[(stations[i].station_id, stations[j].station_id)] = distance
    
    async def optimize(self, stations: List[StationStatus]) -> OptimizationResult:
        """
        Run MILP optimization to find optimal rebalancing plan
        
        Objective: Minimize (transportation_cost + shortage_penalty)
        Subject to:
        - Vehicle capacity constraints
        - Station capacity constraints
        - Time window constraints
        - Fairness constraints
        """
        logger.info("Starting MILP optimization")
        
        self.stations = stations
        self.calculate_distance_matrix(stations)
        
        # Create MILP problem
        problem = pulp.LpProblem("Citi_Bike_Rebalancing", pulp.LpMinimize)
        
        # Decision variables
        # x[i,j,v] = number of bikes moved from station i to j using vehicle v
        station_ids = [s.station_id for s in stations]
        vehicles = [v.vehicle_type for v in self.constraints.vehicles] if self.constraints.vehicles else [VehicleType.TRUCK]
        
        x = pulp.LpVariable.dicts(
            "bikes_moved",
            [(i, j, v) for i in station_ids for j in station_ids for v in vehicles if i != j],
            lowBound=0,
            cat='Integer'
        )
        
        # y[i] = shortage at station i
        y = pulp.LpVariable.dicts(
            "shortage",
            station_ids,
            lowBound=0,
            cat='Integer'
        )
        
        # z[i,j,v] = binary variable indicating if route (i,j) is used by vehicle v
        z = pulp.LpVariable.dicts(
            "route_used",
            [(i, j, v) for i in station_ids for j in station_ids for v in vehicles if i != j],
            cat='Binary'
        )
        
        # Objective function
        transport_cost = pulp.lpSum([
            x[(i, j, v)] * self.distance_matrix.get((i, j), 0) * self._get_vehicle_cost(v)
            for i in station_ids for j in station_ids for v in vehicles if i != j
        ])
        
        shortage_cost = pulp.lpSum([
            y[i] * self.constraints.shortage_penalty * (1 + self._get_fairness_factor(stations, i))
            for i in station_ids
        ])
        
        problem += transport_cost + shortage_cost, "Total_Cost"
        
        # Constraints
        # 1. Flow conservation at each station
        for station in stations:
            i = station.station_id
            inflow = pulp.lpSum([x[(j, i, v)] for j in station_ids for v in vehicles if j != i])
            outflow = pulp.lpSum([x[(i, j, v)] for j in station_ids for v in vehicles if j != i])
            
            problem += (
                station.current_bikes + inflow - outflow + y[i] >= station.demand,
                f"Demand_Station_{i}"
            )
        
        # 2. Vehicle capacity constraints
        for v in vehicles:
            capacity = self._get_vehicle_capacity(v)
            for i in station_ids:
                for j in station_ids:
                    if i != j:
                        problem += x[(i, j, v)] <= capacity * z[(i, j, v)], f"Capacity_{i}_{j}_{v}"
        
        # 3. Station capacity constraints
        for station in stations:
            i = station.station_id
            final_inventory = (
                station.current_bikes +
                pulp.lpSum([x[(j, i, v)] for j in station_ids for v in vehicles if j != i]) -
                pulp.lpSum([x[(i, j, v)] for j in station_ids for v in vehicles if j != i])
            )
            problem += final_inventory <= station.capacity, f"Max_Capacity_{i}"
            problem += final_inventory >= self.constraints.min_station_bikes, f"Min_Bikes_{i}"
        
        # Solve
        logger.info("Solving MILP problem...")
        solver = pulp.PULP_CBC_CMD(msg=1, timeLimit=300)  # 5 minute timeout
        status = problem.solve(solver)
        
        # Extract solution
        result = self._extract_solution(problem, x, y, z, stations)
        result.solver_status = pulp.LpStatus[status]
        
        logger.info(f"Optimization complete. Status: {result.solver_status}")
        
        return result
    
    def _get_vehicle_capacity(self, vehicle_type: VehicleType) -> int:
        """Get capacity for vehicle type"""
        capacities = {
            VehicleType.TRUCK: 30,
            VehicleType.VAN: 15,
            VehicleType.BIKE_TRAILER: 8
        }
        return capacities.get(vehicle_type, 15)
    
    def _get_vehicle_cost(self, vehicle_type: VehicleType) -> float:
        """Get cost per mile for vehicle type"""
        costs = {
            VehicleType.TRUCK: 2.5,
            VehicleType.VAN: 1.5,
            VehicleType.BIKE_TRAILER: 0.8
        }
        return costs.get(vehicle_type, 1.5)
    
    def _get_fairness_factor(self, stations: List[StationStatus], station_id: str) -> float:
        """Calculate fairness factor for remote/critical stations"""
        station = next((s for s in stations if s.station_id == station_id), None)
        if not station:
            return 0.0
        
        # Higher penalty for high-priority stations
        priority_weights = {
            "critical": 1.0,
            "high": 0.5,
            "medium": 0.2,
            "low": 0.0
        }
        return priority_weights.get(station.priority, 0.0) * self.constraints.fairness_weight
    
    def _extract_solution(
        self,
        problem,
        x,
        y,
        z,
        stations: List[StationStatus]
    ) -> OptimizationResult:
        """Extract solution from solved MILP problem"""
        
        moves = []
        total_cost = 0.0
        total_penalty = 0.0
        total_bikes_moved = 0
        total_distance = 0.0
        sequence = 1
        
        # Extract moves
        for var_name, var_value in problem.variables():
            if var_name.startswith("bikes_moved") and var_value.value() > 0:
                # Parse variable name to extract i, j, v
                # Format: bikes_moved_('station1',_'station2',_'truck')
                parts = var_name.replace("bikes_moved_(", "").replace(")", "").replace("'", "").split(",_")
                if len(parts) == 3:
                    from_id, to_id, vehicle = parts[0], parts[1], parts[2]
                    bikes = int(var_value.value())
                    distance = self.distance_matrix.get((from_id, to_id), 0)
                    cost = distance * self._get_vehicle_cost(VehicleType(vehicle))
                    
                    moves.append(RebalancingMove(
                        vehicle_type=VehicleType(vehicle),
                        from_station_id=from_id,
                        to_station_id=to_id,
                        bikes_moved=bikes,
                        distance=distance,
                        cost=cost,
                        sequence=sequence
                    ))
                    
                    total_bikes_moved += bikes
                    total_distance += distance
                    total_cost += cost
                    sequence += 1
        
        # Calculate penalties
        for var_name, var_value in problem.variables():
            if var_name.startswith("shortage") and var_value.value() > 0:
                station_id = var_name.replace("shortage_", "")
                shortage = var_value.value()
                penalty = shortage * self.constraints.shortage_penalty
                total_penalty += penalty
        
        # Calculate metrics
        stations_served = len(set([m.from_station_id for m in moves] + [m.to_station_id for m in moves]))
        fairness_score = self._calculate_fairness_score(stations, moves)
        
        return OptimizationResult(
            total_cost=total_cost,
            total_penalty=total_penalty,
            objective_value=total_cost + total_penalty,
            moves=moves,
            stations_served=stations_served,
            total_bikes_moved=total_bikes_moved,
            total_distance=total_distance,
            fairness_score=fairness_score,
            execution_time=0.0,  # Set by caller
            solver_status="Unknown",
            stations=stations
        )
    
    def _calculate_fairness_score(
        self,
        stations: List[StationStatus],
        moves: List[RebalancingMove]
    ) -> float:
        """Calculate Gini coefficient for service fairness"""
        # TODO: Implement Gini coefficient calculation
        return 0.75  # Placeholder
    
    async def validate_constraints(self) -> Dict:
        """Validate if constraints are feasible"""
        warnings = []
        errors = []
        
        if self.constraints.time_window_start >= self.constraints.time_window_end:
            errors.append("Time window start must be before end")
        
        if self.constraints.shortage_penalty < 0:
            errors.append("Shortage penalty must be non-negative")
        
        if not (0 <= self.constraints.fairness_weight <= 1):
            warnings.append("Fairness weight should be between 0 and 1")
        
        return {
            "valid": len(errors) == 0,
            "warnings": warnings,
            "errors": errors
        }
