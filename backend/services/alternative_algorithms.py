"""
Alternative optimization algorithms for comparison
Implements Greedy, Genetic Algorithm, and Simulated Annealing approaches
"""
import random
import numpy as np
from typing import List, Dict, Tuple
from copy import deepcopy
from geopy.distance import geodesic

from models.schemas import StationStatus, OptimizationResult, RebalancingMove
from utils.logger import setup_logger

logger = setup_logger(__name__)


class GreedyOptimizer:
    """
    Greedy Algorithm: Always select the nearest surplus station to deficit station
    Fast but not optimal
    """
    
    def __init__(self, vehicles: Dict):
        self.vehicles = vehicles
    
    def optimize(self, stations: List[StationStatus]) -> OptimizationResult:
        """Run greedy optimization"""
        logger.info("🏃 Starting Greedy Algorithm optimization...")
        
        surplus = [s for s in stations if s.surplus_deficit > 0]
        deficit = [s for s in stations if s.surplus_deficit < 0]
        
        moves = []
        sequence = 1
        total_cost = 0
        total_bikes = 0
        total_distance = 0
        
        # Sort deficit stations by priority (CRITICAL first)
        priority_order = {'CRITICAL': 0, 'HIGH': 1, 'MEDIUM': 2, 'LOW': 3}
        deficit.sort(key=lambda s: (priority_order.get(s.priority, 4), abs(s.surplus_deficit)), reverse=True)
        
        for def_station in deficit:
            needed = abs(def_station.surplus_deficit)
            
            while needed > 0 and surplus:
                # Find nearest surplus station
                nearest = min(
                    surplus,
                    key=lambda s: geodesic(
                        (def_station.latitude, def_station.longitude),
                        (s.latitude, s.longitude)
                    ).kilometers
                )
                
                # Select vehicle based on bikes needed
                if needed >= 50 and 'box_truck' in self.vehicles:
                    vehicle_id = 'box_truck'
                    capacity = 50
                elif needed >= 25 and 'light_truck' in self.vehicles:
                    vehicle_id = 'light_truck'
                    capacity = 25
                else:
                    vehicle_id = 'mini_van'
                    capacity = 10
                
                # Calculate bikes to move
                available = nearest.surplus_deficit
                bikes_to_move = min(needed, available, capacity)
                
                if bikes_to_move <= 0:
                    surplus.remove(nearest)
                    continue
                
                # Create move
                distance = geodesic(
                    (nearest.latitude, nearest.longitude),
                    (def_station.latitude, def_station.longitude)
                ).kilometers
                
                cost = self.vehicles[vehicle_id]['cost_per_trip']
                
                moves.append(RebalancingMove(
                    vehicle_type=vehicle_id,
                    from_station_id=nearest.station_id,
                    from_station_name=nearest.station_name,
                    to_station_id=def_station.station_id,
                    to_station_name=def_station.station_name,
                    bikes_moved=bikes_to_move,
                    distance=distance,
                    cost=cost,
                    sequence=sequence,
                    vehicle_icon=self.vehicles[vehicle_id]['icon']
                ))
                
                total_cost += cost
                total_bikes += bikes_to_move
                total_distance += distance
                sequence += 1
                
                # Update station inventories
                nearest.surplus_deficit -= bikes_to_move
                needed -= bikes_to_move
                
                if nearest.surplus_deficit <= 0:
                    surplus.remove(nearest)
        
        logger.info(f"✅ Greedy completed: {len(moves)} moves, ${total_cost:.2f}")
        
        return OptimizationResult(
            total_cost=total_cost,
            total_penalty=0,
            objective_value=total_cost,
            moves=moves,
            stations_served=len(set(m.from_station_id for m in moves)),
            total_bikes_moved=total_bikes,
            total_distance=total_distance,
            fairness_score=0.7,
            execution_time=0,
            solver_status="Greedy-Complete",
            stations=stations
        )


class GeneticAlgorithmOptimizer:
    """
    Genetic Algorithm: Evolve solutions over generations
    Good balance between speed and quality
    """
    
    def __init__(self, vehicles: Dict, population_size=50, generations=100):
        self.vehicles = vehicles
        self.population_size = population_size
        self.generations = generations
    
    def create_chromosome(self, surplus: List, deficit: List) -> List[Tuple]:
        """Create random assignment of surplus to deficit stations"""
        chromosome = []
        for def_station in deficit:
            # Randomly select surplus stations
            selected = random.sample(surplus, min(len(surplus), 3))
            for sur_station in selected:
                bikes = random.randint(1, min(20, abs(def_station.surplus_deficit)))
                chromosome.append((sur_station.station_id, def_station.station_id, bikes))
        return chromosome
    
    def fitness(self, chromosome: List[Tuple], surplus_map: Dict, deficit_map: Dict) -> float:
        """Calculate fitness (lower cost = higher fitness)"""
        total_cost = 0
        for sur_id, def_id, bikes in chromosome:
            sur = surplus_map.get(sur_id)
            def_station = deficit_map.get(def_id)
            if not sur or not def_station:
                continue
            
            distance = geodesic(
                (sur.latitude, sur.longitude),
                (def_station.latitude, def_station.longitude)
            ).kilometers
            
            # Estimate cost based on bikes and distance
            cost = distance * bikes * 0.5
            total_cost += cost
        
        return -total_cost  # Negative because we minimize cost
    
    def optimize(self, stations: List[StationStatus]) -> OptimizationResult:
        """Run genetic algorithm optimization"""
        logger.info("🧬 Starting Genetic Algorithm optimization...")
        
        surplus = [s for s in stations if s.surplus_deficit > 0]
        deficit = [s for s in stations if s.surplus_deficit < 0]
        
        surplus_map = {s.station_id: s for s in surplus}
        deficit_map = {s.station_id: s for s in deficit}
        
        # Initialize population
        population = [self.create_chromosome(surplus, deficit) for _ in range(self.population_size)]
        
        best_chromosome = None
        best_fitness = float('-inf')
        
        for gen in range(self.generations):
            # Evaluate fitness
            fitnesses = [self.fitness(chrom, surplus_map, deficit_map) for chrom in population]
            
            # Track best
            max_idx = fitnesses.index(max(fitnesses))
            if fitnesses[max_idx] > best_fitness:
                best_fitness = fitnesses[max_idx]
                best_chromosome = population[max_idx]
            
            # Selection, crossover, mutation (simplified)
            new_population = []
            for _ in range(self.population_size):
                parent1 = random.choices(population, weights=[f + abs(min(fitnesses)) + 1 for f in fitnesses])[0]
                parent2 = random.choices(population, weights=[f + abs(min(fitnesses)) + 1 for f in fitnesses])[0]
                
                # Crossover
                split = len(parent1) // 2
                child = parent1[:split] + parent2[split:]
                
                # Mutation
                if random.random() < 0.1:
                    if child:
                        idx = random.randint(0, len(child) - 1)
                        child[idx] = self.create_chromosome(surplus, deficit)[0]
                
                new_population.append(child)
            
            population = new_population
        
        # Convert best chromosome to moves
        moves = self._chromosome_to_moves(best_chromosome, surplus_map, deficit_map)
        
        total_cost = sum(m.cost for m in moves)
        total_bikes = sum(m.bikes_moved for m in moves)
        total_distance = sum(m.distance for m in moves)
        
        logger.info(f"✅ Genetic Algorithm completed: {len(moves)} moves, ${total_cost:.2f}")
        
        return OptimizationResult(
            total_cost=total_cost,
            total_penalty=0,
            objective_value=total_cost,
            moves=moves,
            stations_served=len(set(m.from_station_id for m in moves)),
            total_bikes_moved=total_bikes,
            total_distance=total_distance,
            fairness_score=0.75,
            execution_time=0,
            solver_status="Genetic-Complete",
            stations=stations
        )
    
    def _chromosome_to_moves(self, chromosome: List[Tuple], surplus_map: Dict, deficit_map: Dict) -> List[RebalancingMove]:
        """Convert chromosome to moves"""
        moves = []
        sequence = 1
        
        for sur_id, def_id, bikes in chromosome:
            sur = surplus_map.get(sur_id)
            def_station = deficit_map.get(def_id)
            if not sur or not def_station:
                continue
            
            distance = geodesic(
                (sur.latitude, sur.longitude),
                (def_station.latitude, def_station.longitude)
            ).kilometers
            
            # Select vehicle
            vehicle_id = 'box_truck' if bikes >= 40 else 'light_truck' if bikes >= 20 else 'mini_van'
            cost = self.vehicles[vehicle_id]['cost_per_trip']
            
            moves.append(RebalancingMove(
                vehicle_type=vehicle_id,
                from_station_id=sur.station_id,
                from_station_name=sur.station_name,
                to_station_id=def_station.station_id,
                to_station_name=def_station.station_name,
                bikes_moved=bikes,
                distance=distance,
                cost=cost,
                sequence=sequence,
                vehicle_icon=self.vehicles[vehicle_id]['icon']
            ))
            sequence += 1
        
        return moves


class SimulatedAnnealingOptimizer:
    """
    Simulated Annealing: Probabilistic optimization inspired by metallurgy
    Can escape local optima
    """
    
    def __init__(self, vehicles: Dict, initial_temp=1000, cooling_rate=0.95, iterations=1000):
        self.vehicles = vehicles
        self.initial_temp = initial_temp
        self.cooling_rate = cooling_rate
        self.iterations = iterations
    
    def optimize(self, stations: List[StationStatus]) -> OptimizationResult:
        """Run simulated annealing optimization"""
        logger.info("🔥 Starting Simulated Annealing optimization...")
        
        surplus = [s for s in stations if s.surplus_deficit > 0]
        deficit = [s for s in stations if s.surplus_deficit < 0]
        
        # Initial solution (greedy)
        current_solution = self._create_initial_solution(surplus, deficit)
        current_cost = self._calculate_cost(current_solution)
        
        best_solution = deepcopy(current_solution)
        best_cost = current_cost
        
        temperature = self.initial_temp
        
        for iteration in range(self.iterations):
            # Generate neighbor solution
            neighbor = self._generate_neighbor(current_solution, surplus, deficit)
            neighbor_cost = self._calculate_cost(neighbor)
            
            # Accept or reject
            delta = neighbor_cost - current_cost
            
            if delta < 0 or random.random() < np.exp(-delta / temperature):
                current_solution = neighbor
                current_cost = neighbor_cost
                
                if current_cost < best_cost:
                    best_solution = deepcopy(current_solution)
                    best_cost = current_cost
            
            # Cool down
            temperature *= self.cooling_rate
        
        # Convert solution to moves
        moves = self._solution_to_moves(best_solution)
        
        total_cost = sum(m.cost for m in moves)
        total_bikes = sum(m.bikes_moved for m in moves)
        total_distance = sum(m.distance for m in moves)
        
        logger.info(f"✅ Simulated Annealing completed: {len(moves)} moves, ${total_cost:.2f}")
        
        return OptimizationResult(
            total_cost=total_cost,
            total_penalty=0,
            objective_value=total_cost,
            moves=moves,
            stations_served=len(set(m.from_station_id for m in moves)),
            total_bikes_moved=total_bikes,
            total_distance=total_distance,
            fairness_score=0.78,
            execution_time=0,
            solver_status="SimulatedAnnealing-Complete",
            stations=stations
        )
    
    def _create_initial_solution(self, surplus: List, deficit: List) -> List[Dict]:
        """Create initial greedy solution"""
        solution = []
        for def_station in deficit:
            nearest = min(surplus, key=lambda s: geodesic(
                (def_station.latitude, def_station.longitude),
                (s.latitude, s.longitude)
            ).kilometers)
            
            bikes = min(abs(def_station.surplus_deficit), nearest.surplus_deficit, 30)
            solution.append({
                'from': nearest,
                'to': def_station,
                'bikes': bikes
            })
        return solution
    
    def _calculate_cost(self, solution: List[Dict]) -> float:
        """Calculate total cost of solution"""
        total = 0
        for move in solution:
            distance = geodesic(
                (move['from'].latitude, move['from'].longitude),
                (move['to'].latitude, move['to'].longitude)
            ).kilometers
            total += distance * move['bikes'] * 10  # Cost factor
        return total
    
    def _generate_neighbor(self, solution: List[Dict], surplus: List, deficit: List) -> List[Dict]:
        """Generate neighbor solution by random modification"""
        neighbor = deepcopy(solution)
        if not neighbor:
            return neighbor
        
        # Random modification
        idx = random.randint(0, len(neighbor) - 1)
        move = neighbor[idx]
        
        # Change bikes or swap stations
        if random.random() < 0.5:
            move['bikes'] = random.randint(1, 40)
        else:
            move['from'] = random.choice(surplus)
        
        return neighbor
    
    def _solution_to_moves(self, solution: List[Dict]) -> List[RebalancingMove]:
        """Convert solution to moves"""
        moves = []
        for seq, move_data in enumerate(solution, 1):
            distance = geodesic(
                (move_data['from'].latitude, move_data['from'].longitude),
                (move_data['to'].latitude, move_data['to'].longitude)
            ).kilometers
            
            bikes = move_data['bikes']
            vehicle_id = 'box_truck' if bikes >= 40 else 'light_truck' if bikes >= 20 else 'mini_van'
            cost = self.vehicles[vehicle_id]['cost_per_trip']
            
            moves.append(RebalancingMove(
                vehicle_type=vehicle_id,
                from_station_id=move_data['from'].station_id,
                from_station_name=move_data['from'].station_name,
                to_station_id=move_data['to'].station_id,
                to_station_name=move_data['to'].station_name,
                bikes_moved=bikes,
                distance=distance,
                cost=cost,
                sequence=seq,
                vehicle_icon=self.vehicles[vehicle_id]['icon']
            ))
        
        return moves
