"""
Advanced MILP optimization for bike rebalancing with real vehicle constraints
Solves: Determine optimal bikes to transport from station j to i to satisfy demand
        while minimizing transportation cost with appropriate vehicle selection
"""
import pulp
from typing import List, Dict, Tuple
import numpy as np
from geopy.distance import geodesic
from collections import defaultdict

from models.schemas import (
    OptimizationConstraints,
    StationStatus,
    OptimizationResult,
    RebalancingMove,
    VehicleType
)
from config.settings import settings
from utils.logger import setup_logger

logger = setup_logger(__name__)


class AdvancedRebalancingOptimizer:
    """
    Advanced MILP optimizer for bike rebalancing
    
    Objective: Minimize total transportation cost
    Decision Variables:
        - x[i,j,v]: number of bikes moved from station j to i using vehicle v
        - y[i]: shortage at station i (penalty)
        - z[j,i,v]: binary - whether vehicle v is used for route j->i
    """
    
    def __init__(self, constraints: OptimizationConstraints = None, vehicle_configs: Dict = None):
        self.constraints = constraints or OptimizationConstraints()
        self.stations: List[StationStatus] = []
        self.distance_matrix: Dict = {}
        self.penalty_weights: Dict = {}  # Store penalty weights for later use
        
        # Use provided vehicle configs or fall back to settings
        if vehicle_configs:
            self.vehicles = self._normalize_vehicle_configs(vehicle_configs)
        else:
            # Default vehicle configurations
            self.vehicles = self._normalize_vehicle_configs({
                'mini_bike': {
                    'name': 'Mini Bike',
                    'capacity': 5,
                    'cost_per_trip': 120.0,
                    'icon': '🏍️',
                    'available_count': 6
                },
                'mini_van': {
                    'name': 'Mini Van',
                    'capacity': settings.MINI_VAN_CAPACITY,
                    'cost_per_trip': settings.MINI_VAN_COST_PER_TRIP,
                    'icon': '🚐',
                    'available_count': 5
                },
                'light_truck': {
                    'name': 'Light Truck',
                    'capacity': settings.LIGHT_TRUCK_CAPACITY,
                    'cost_per_trip': settings.LIGHT_TRUCK_COST_PER_TRIP,
                    'icon': '🚚',
                    'available_count': 3
                },
                'box_truck': {
                    'name': 'Box Truck / Bulk Van',
                    'capacity': settings.BOX_TRUCK_CAPACITY,
                    'cost_per_trip': settings.BOX_TRUCK_COST_PER_TRIP,
                    'icon': '📦',
                    'available_count': 2
                }
            })

    def _normalize_vehicle_configs(self, vehicle_configs: Dict) -> Dict[str, Dict]:
        """Ensure vehicle configurations include required fields and consistent types"""
        normalized = {}
        for vehicle_id, config in vehicle_configs.items():
            if not config:
                continue
            name = config.get('name', vehicle_id.replace('_', ' ').title())
            capacity = int(config.get('capacity', 0))
            if capacity <= 0:
                # Skip unusable vehicle definitions
                continue
            cost = float(config.get('cost_per_trip', config.get('cost_per_mile', 0.0)))
            icon = config.get('icon', '🚚')
            available = max(0, int(config.get('available_count', 1)))
            normalized[vehicle_id] = {
                'name': name,
                'capacity': capacity,
                'cost_per_trip': cost,
                'icon': icon,
                'available_count': available
            }
        return normalized
    
    def calculate_distance_matrix(self, stations: List[StationStatus]):
        """Calculate distances between all station pairs with caching"""
        from utils.cache import cache_manager
        
        # Generate cache key from station IDs
        station_ids = sorted([s.station_id for s in stations])
        cache_key = f"distance_matrix_{'_'.join(station_ids[:10])}"  # Use first 10 IDs for key
        
        # Try to load from cache
        cached_matrix = cache_manager.get(cache_key)
        if cached_matrix is not None:
            logger.info("✅ Loaded distance matrix from cache")
            self.distance_matrix = cached_matrix
            return
        
        logger.info("📏 Calculating distance matrix...")
        n = len(stations)
        self.distance_matrix = {}
        
        for i in range(n):
            for j in range(n):
                if i != j:
                    coord1 = (stations[i].latitude, stations[i].longitude)
                    coord2 = (stations[j].latitude, stations[j].longitude)
                    distance = geodesic(coord1, coord2).kilometers
                    self.distance_matrix[(stations[i].station_id, stations[j].station_id)] = distance
        
        # Cache the result
        cache_manager.set(cache_key, self.distance_matrix)
        logger.info(f"✅ Distance matrix calculated and cached ({len(self.distance_matrix)} pairs)")
    
    async def optimize(self, stations: List[StationStatus]) -> OptimizationResult:
        """
        Run MILP optimization to find optimal rebalancing plan
        
        Core Problem: Determine optimal number of bikes to transport from station j 
        to station i such that demand at station i is fully satisfied, while selecting 
        appropriate vehicles to minimize total transportation cost.
        
        Priority: Sparse/remote stations get higher priority (lower shortage penalty tolerance)
        """
        logger.info(f"🚀 Starting advanced MILP optimization for {len(stations)} stations")
        
        self.stations = stations
        self.calculate_distance_matrix(stations)
        
        # Separate surplus and deficit stations
        surplus_stations = [s for s in stations if s.surplus_deficit > 0]
        deficit_stations = [s for s in stations if s.surplus_deficit < 0]
        
        logger.info(f"  📊 Surplus stations: {len(surplus_stations)}")
        logger.info(f"  📊 Deficit stations: {len(deficit_stations)}")
        
        if not deficit_stations:
            logger.info("✅ No deficit stations - system balanced!")
            return OptimizationResult(
                total_cost=0.0,
                total_penalty=0.0,
                objective_value=0.0,
                moves=[],
                stations_served=0,
                total_bikes_moved=0,
                total_distance=0.0,
                fairness_score=1.0,
                execution_time=0.0,
                solver_status="Optimal - No Rebalancing Needed",
                stations=self.stations
            )
        
        # Create MILP problem
        problem = pulp.LpProblem("Citi_Bike_Rebalancing_Optimization", pulp.LpMinimize)
        
        # Decision variables
        station_ids = [s.station_id for s in stations]
        vehicle_types = [
            vehicle_id
            for vehicle_id, config in self.vehicles.items()
            if config.get('available_count', 0) > 0
        ]

        if not vehicle_types:
            logger.warning("⚠️ No vehicles available based on current configuration. Returning no-move solution.")
            return OptimizationResult(
                total_cost=0.0,
                total_penalty=0.0,
                objective_value=0.0,
                moves=[],
                stations_served=0,
                total_bikes_moved=0,
                total_distance=0.0,
                fairness_score=0.0,
                execution_time=0.0,
                solver_status="No Vehicles Available",
                stations=self.stations
            )
        
        # x[j,i,v] = number of bikes moved from surplus station j to deficit station i using vehicle v
        x = pulp.LpVariable.dicts(
            "bikes_moved",
            [(j.station_id, i.station_id, v) 
             for j in surplus_stations 
             for i in deficit_stations 
             for v in vehicle_types],
            lowBound=0,
            cat='Integer'
        )
        
        # y[i] = unmet shortage at deficit station i (penalty)
        y = pulp.LpVariable.dicts(
            "shortage",
            [i.station_id for i in deficit_stations],
            lowBound=0,
            cat='Integer'
        )
        
        # z[j,i,v] = binary variable indicating if vehicle v is used for route j->i
        z = pulp.LpVariable.dicts(
            "vehicle_used",
            [(j.station_id, i.station_id, v) 
             for j in surplus_stations 
             for i in deficit_stations 
             for v in vehicle_types],
            cat='Binary'
        )
        
        # OBJECTIVE FUNCTION: Minimize (Total Transportation Cost + Penalty for Unmet Demand)
        
        # Transportation cost = sum of (trips * cost_per_trip)
        transport_cost = pulp.lpSum([
            z[(j.station_id, i.station_id, v)] * self.vehicles[v]['cost_per_trip']
            for j in surplus_stations
            for i in deficit_stations
            for v in vehicle_types
        ])
        
        # Penalty cost with KNN-based sparsity priority weighting
        # Sparse/remote stations get MUCH higher penalties to prioritize them
        self.penalty_weights = self._calculate_sparsity_priority(deficit_stations)
        penalty_cost = pulp.lpSum([
            y[i.station_id] * self.penalty_weights[i.station_id]
            for i in deficit_stations
        ])
        
        problem += transport_cost + penalty_cost, "Total_Cost"
        
        # CONSTRAINTS
        
        # 1. Demand Satisfaction: For each deficit station, bikes received + shortage = total deficit
        for i in deficit_stations:
            bikes_received = pulp.lpSum([
                x[(j.station_id, i.station_id, v)]
                for j in surplus_stations
                for v in vehicle_types
            ])
            problem += (
                bikes_received + y[i.station_id] >= abs(i.surplus_deficit),
                f"Demand_Satisfaction_{i.station_id}"
            )
        
        # 2. Supply Constraint: Each surplus station can't give more than it has
        for j in surplus_stations:
            bikes_sent = pulp.lpSum([
                x[(j.station_id, i.station_id, v)]
                for i in deficit_stations
                for v in vehicle_types
            ])
            problem += (
                bikes_sent <= j.surplus_deficit,
                f"Supply_Limit_{j.station_id}"
            )
        
        # 3. Vehicle Capacity Constraints
        for j in surplus_stations:
            for i in deficit_stations:
                for v in vehicle_types:
                    capacity = self.vehicles[v]['capacity']
                    # If bikes moved, must be within vehicle capacity
                    problem += (
                        x[(j.station_id, i.station_id, v)] <= capacity * z[(j.station_id, i.station_id, v)],
                        f"Capacity_{j.station_id}_{i.station_id}_{v}"
                    )
        
        # 4. Station Capacity Constraints
        for i in deficit_stations:
            bikes_received = pulp.lpSum([
                x[(j.station_id, i.station_id, v)]
                for j in surplus_stations
                for v in vehicle_types
            ])
            final_bikes = i.current_bikes + bikes_received
            problem += (
                final_bikes <= i.capacity,
                f"Station_Capacity_{i.station_id}"
            )
        
        # 5. Minimum bikes per station
        for i in deficit_stations:
            bikes_received = pulp.lpSum([
                x[(j.station_id, i.station_id, v)]
                for j in surplus_stations
                for v in vehicle_types
            ])
            final_bikes = i.current_bikes + bikes_received - y[i.station_id]
            problem += (
                final_bikes >= self.constraints.min_station_bikes,
                f"Min_Bikes_{i.station_id}"
            )
        
        # 6. Single vehicle per route (optional, for efficiency)
        for j in surplus_stations:
            for i in deficit_stations:
                problem += (
                    pulp.lpSum([z[(j.station_id, i.station_id, v)] for v in vehicle_types]) <= 1,
                    f"Single_Vehicle_{j.station_id}_{i.station_id}"
                )

        # 7. Vehicle availability constraints
        for v in vehicle_types:
            available_trips = max(0, int(self.vehicles[v].get('available_count', 0)))
            problem += (
                pulp.lpSum([
                    z[(j.station_id, i.station_id, v)]
                    for j in surplus_stations
                    for i in deficit_stations
                ]) <= available_trips,
                f"Vehicle_Count_{v}"
            )
        
        # Solve
        logger.info("🔧 Solving MILP problem...")
        solver = pulp.PULP_CBC_CMD(msg=1, timeLimit=300)
        status = problem.solve(solver)
        
        # Extract solution
        result = self._extract_solution(problem, x, y, z, stations, surplus_stations, deficit_stations)
        result.solver_status = pulp.LpStatus[status]
        
        logger.info(f"✅ Optimization complete: {result.solver_status}")
        logger.info(f"   💰 Total Cost: ${result.total_cost:.2f}")
        logger.info(f"   🚲 Bikes Moved: {result.total_bikes_moved}")
        logger.info(f"   📍 Stations Served: {result.stations_served}")
        
        return result
    
    def _calculate_sparsity_priority(self, deficit_stations: List[StationStatus]) -> Dict[str, float]:
        """
        Calculate sparsity-based priority using KNN clustering approach
        
        Sparse stations (far from neighbors) get MUCH higher penalties:
        - Calculates average distance to K nearest neighbors
        - Combines with deficit severity
        - Returns penalty weights where sparse stations have 5-10x higher penalties
        
        This ensures sparse/remote stations get served FIRST in optimization
        """
        k = min(5, len(deficit_stations) - 1)  # Use 5 nearest neighbors or less
        if k <= 0:
            # Only one station, return default
            return {s.station_id: self.constraints.shortage_penalty for s in deficit_stations}
        
        penalty_weights = {}
        base_penalty = self.constraints.shortage_penalty
        
        # Calculate sparsity score for each station
        sparsity_scores = {}
        for station in deficit_stations:
            # Get distances to all other deficit stations
            distances = []
            for other in deficit_stations:
                if station.station_id != other.station_id:
                    coord1 = (station.latitude, station.longitude)
                    coord2 = (other.latitude, other.longitude)
                    dist = geodesic(coord1, coord2).kilometers
                    distances.append(dist)
            
            # Sort and get K nearest neighbors
            distances.sort()
            knn_distances = distances[:k]
            
            # Sparsity = average distance to K nearest neighbors
            avg_knn_distance = np.mean(knn_distances) if knn_distances else 0.0
            
            # Deficit severity factor (more deficit = higher priority)
            deficit_factor = abs(station.surplus_deficit) / 10.0  # Normalize
            
            # Combined sparsity score (higher = more sparse/critical)
            sparsity_scores[station.station_id] = avg_knn_distance * (1 + deficit_factor)
        
        # Normalize sparsity scores to get priority multipliers
        if sparsity_scores:
            max_sparsity = max(sparsity_scores.values())
            min_sparsity = min(sparsity_scores.values())
            sparsity_range = max_sparsity - min_sparsity
            
            for station in deficit_stations:
                if sparsity_range > 0:
                    # Normalize to 0-1 range
                    normalized_score = (sparsity_scores[station.station_id] - min_sparsity) / sparsity_range
                    
                    # Map to penalty multiplier: 1x to 10x
                    # Most sparse stations get 10x penalty, dense stations get 1x
                    multiplier = 1.0 + (normalized_score * 9.0)
                    
                    penalty_weights[station.station_id] = base_penalty * multiplier
                    
                    # Update station priority label for display
                    if normalized_score > 0.75:
                        station.priority = "CRITICAL"
                    elif normalized_score > 0.5:
                        station.priority = "HIGH"
                    elif normalized_score > 0.25:
                        station.priority = "MEDIUM"
                    else:
                        station.priority = "LOW"
                else:
                    penalty_weights[station.station_id] = base_penalty
                    station.priority = "MEDIUM"
        
        logger.info("📊 KNN-based sparsity priorities calculated:")
        for station in sorted(deficit_stations, key=lambda s: penalty_weights[s.station_id], reverse=True)[:5]:
            logger.info(f"   {station.priority:8} - {station.station_name[:30]:30} - Penalty: {penalty_weights[station.station_id]:.1f}x")
        
        return penalty_weights
    
    def _extract_solution(
        self,
        problem,
        x,
        y,
        z,
        all_stations: List[StationStatus],
        surplus_stations: List[StationStatus],
        deficit_stations: List[StationStatus]
    ) -> OptimizationResult:
        """Extract solution from solved MILP problem"""
        
        moves = []
        total_cost = 0.0
        total_penalty = 0.0
        total_bikes_moved = 0
        total_distance = 0.0
        sequence = 1
        
        # Extract moves from solution
        for j in surplus_stations:
            for i in deficit_stations:
                for v in self.vehicles.keys():
                    key = (j.station_id, i.station_id, v)
                    
                    if key in x and x[key].varValue and x[key].varValue > 0.5:
                        bikes = int(x[key].varValue)
                        distance = self.distance_matrix.get((j.station_id, i.station_id), 0)
                        cost = self.vehicles[v]['cost_per_trip']
                        
                        moves.append(RebalancingMove(
                            vehicle_type=v,
                            from_station_id=j.station_id,
                            from_station_name=j.station_name,
                            to_station_id=i.station_id,
                            to_station_name=i.station_name,
                            bikes_moved=bikes,
                            distance=distance,
                            cost=cost,
                            sequence=sequence,
                            vehicle_icon=self.vehicles[v].get('icon', '🚚')
                        ))
                        
                        total_bikes_moved += bikes
                        total_distance += distance
                        total_cost += cost
                        sequence += 1
        
        # Calculate penalties for unmet demand
        for i in deficit_stations:
            if i.station_id in y and y[i.station_id].varValue and y[i.station_id].varValue > 0.1:
                shortage = y[i.station_id].varValue
                # Use the penalty weights calculated during optimization
                penalty_weight = self.penalty_weights.get(i.station_id, self.constraints.shortage_penalty)
                penalty = shortage * penalty_weight
                total_penalty += penalty
        
        # Calculate metrics
        stations_served = len(set([m.from_station_id for m in moves] + [m.to_station_id for m in moves]))
        fairness_score = self._calculate_fairness_score(deficit_stations, y)
        
        return OptimizationResult(
            total_cost=total_cost,
            total_penalty=total_penalty,
            objective_value=total_cost + total_penalty,
            moves=moves,
            stations_served=stations_served,
            total_bikes_moved=total_bikes_moved,
            total_distance=total_distance,
            fairness_score=fairness_score,
            execution_time=0.0,
            solver_status="Unknown",
            stations=self.stations
        )
    
    def _calculate_fairness_score(self, deficit_stations, shortage_vars) -> float:
        """Calculate Gini coefficient for service fairness"""
        if not deficit_stations:
            return 1.0
        
        # Calculate service level for each station
        service_levels = []
        for station in deficit_stations:
            demand = abs(station.surplus_deficit)
            shortage = shortage_vars[station.station_id].varValue if station.station_id in shortage_vars else 0
            if shortage is None:
                shortage = 0
            served = demand - shortage
            service_level = served / demand if demand > 0 else 1.0
            service_levels.append(max(0, min(1, service_level)))
        
        if not service_levels:
            return 1.0
        
        # Calculate Gini coefficient
        n = len(service_levels)
        service_levels_sorted = sorted(service_levels)
        cumsum = sum((i + 1) * val for i, val in enumerate(service_levels_sorted))
        total_sum = sum(service_levels)
        
        if total_sum == 0:
            return 0.0
        
        gini = (2 * cumsum) / (n * total_sum) - (n + 1) / n
        fairness = 1 - gini  # Convert Gini to fairness score
        
        return max(0, min(1, fairness))
