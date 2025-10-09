"""
Export optimization results to various formats (CSV, Excel, JSON)
"""
import csv
import json
from typing import List
from io import StringIO
from datetime import datetime

from models.schemas import OptimizationResult, RebalancingMove
from fastapi.responses import StreamingResponse


class OptimizationExporter:
    """Export optimization results to different formats"""
    
    @staticmethod
    def to_csv(result: OptimizationResult) -> str:
        """Export optimization result to CSV format"""
        output = StringIO()
        
        # Summary section
        output.write("# OPTIMIZATION SUMMARY\n")
        output.write(f"Timestamp,{datetime.now().isoformat()}\n")
        output.write(f"Total Cost,{result.total_cost}\n")
        output.write(f"Total Penalty,{result.total_penalty}\n")
        output.write(f"Objective Value,{result.objective_value}\n")
        output.write(f"Total Bikes Moved,{result.total_bikes_moved}\n")
        output.write(f"Total Distance,{result.total_distance}\n")
        output.write(f"Stations Served,{result.stations_served}\n")
        output.write(f"Fairness Score,{result.fairness_score}\n")
        output.write(f"Solver Status,{result.solver_status}\n")
        output.write(f"Execution Time,{result.execution_time}\n")
        output.write("\n")
        
        # Moves section
        output.write("# REBALANCING MOVES\n")
        writer = csv.writer(output)
        writer.writerow([
            "Sequence",
            "Vehicle Type",
            "Vehicle Icon",
            "From Station ID",
            "From Station Name",
            "To Station ID",
            "To Station Name",
            "Bikes Moved",
            "Distance (km)",
            "Cost"
        ])
        
        for move in result.moves:
            writer.writerow([
                move.sequence,
                move.vehicle_type,
                move.vehicle_icon,
                move.from_station_id,
                move.from_station_name,
                move.to_station_id,
                move.to_station_name,
                move.bikes_moved,
                round(move.distance, 2),
                move.cost
            ])
        
        return output.getvalue()
    
    @staticmethod
    def to_json(result: OptimizationResult) -> str:
        """Export optimization result to JSON format"""
        return result.model_dump_json(indent=2)
    
    @staticmethod
    def to_detailed_report(result: OptimizationResult) -> str:
        """Generate detailed text report"""
        report = []
        report.append("=" * 80)
        report.append("CITI-BIKE OPTIMIZATION REPORT")
        report.append("=" * 80)
        report.append(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        report.append("")
        
        report.append("SUMMARY")
        report.append("-" * 80)
        report.append(f"  Total Cost:              ${result.total_cost:,.2f}")
        report.append(f"  Total Penalty:           ${result.total_penalty:,.2f}")
        report.append(f"  Objective Value:         ${result.objective_value:,.2f}")
        report.append(f"  Total Bikes Moved:       {result.total_bikes_moved}")
        report.append(f"  Total Distance:          {result.total_distance:.2f} km")
        report.append(f"  Stations Served:         {result.stations_served}")
        report.append(f"  Number of Moves:         {len(result.moves)}")
        report.append(f"  Fairness Score:          {result.fairness_score:.3f}")
        report.append(f"  Solver Status:           {result.solver_status}")
        report.append(f"  Execution Time:          {result.execution_time:.2f} seconds")
        report.append("")
        
        # Group moves by vehicle type
        vehicle_stats = {}
        for move in result.moves:
            vtype = move.vehicle_type
            if vtype not in vehicle_stats:
                vehicle_stats[vtype] = {
                    'count': 0,
                    'bikes': 0,
                    'distance': 0,
                    'cost': 0,
                    'icon': move.vehicle_icon
                }
            vehicle_stats[vtype]['count'] += 1
            vehicle_stats[vtype]['bikes'] += move.bikes_moved
            vehicle_stats[vtype]['distance'] += move.distance
            vehicle_stats[vtype]['cost'] += move.cost
        
        report.append("VEHICLE USAGE STATISTICS")
        report.append("-" * 80)
        for vtype, stats in vehicle_stats.items():
            report.append(f"  {stats['icon']} {vtype.replace('_', ' ').title()}")
            report.append(f"    Trips:           {stats['count']}")
            report.append(f"    Bikes Moved:     {stats['bikes']}")
            report.append(f"    Total Distance:  {stats['distance']:.2f} km")
            report.append(f"    Total Cost:      ${stats['cost']:,.2f}")
            report.append(f"    Avg per Trip:    ${stats['cost']/stats['count']:,.2f}")
            report.append("")
        
        report.append("DETAILED MOVES")
        report.append("-" * 80)
        report.append(f"{'Seq':<5} {'Vehicle':<12} {'From':<30} {'To':<30} {'Bikes':<7} {'Dist':<8} {'Cost':<10}")
        report.append("-" * 80)
        
        for move in result.moves:
            report.append(
                f"{move.sequence:<5} "
                f"{move.vehicle_icon + ' ' + move.vehicle_type[:10]:<12} "
                f"{move.from_station_name[:28]:<30} "
                f"{move.to_station_name[:28]:<30} "
                f"{move.bikes_moved:<7} "
                f"{move.distance:<8.2f} "
                f"${move.cost:<9,.2f}"
            )
        
        report.append("=" * 80)
        return "\n".join(report)
    
    @staticmethod
    def create_csv_response(result: OptimizationResult) -> StreamingResponse:
        """Create FastAPI streaming response for CSV download"""
        csv_content = OptimizationExporter.to_csv(result)
        
        return StreamingResponse(
            iter([csv_content]),
            media_type="text/csv",
            headers={
                "Content-Disposition": f"attachment; filename=optimization_result_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
            }
        )
    
    @staticmethod
    def create_report_response(result: OptimizationResult) -> StreamingResponse:
        """Create FastAPI streaming response for text report download"""
        report_content = OptimizationExporter.to_detailed_report(result)
        
        return StreamingResponse(
            iter([report_content]),
            media_type="text/plain",
            headers={
                "Content-Disposition": f"attachment; filename=optimization_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.txt"
            }
        )
