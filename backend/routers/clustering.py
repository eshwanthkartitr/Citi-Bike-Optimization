"""
Router for station clustering and geographic analysis
"""
from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional

from services.clustering import StationClusteringService
from utils.comprehensive_data_loader import ComprehensiveDataLoader

router = APIRouter(prefix="/clustering", tags=["Clustering"])

clustering_service = StationClusteringService()
data_loader = ComprehensiveDataLoader()


@router.get("/kmeans")
async def get_kmeans_clusters(
    n_clusters: int = Query(default=5, ge=2, le=20, description="Number of clusters")
):
    """
    Perform K-means clustering on station locations
    
    Returns cluster assignments and statistics
    """
    try:
        # Load current station data
        data = data_loader.load_all_months()
        
        if not data or not data.get('stations'):
            raise HTTPException(status_code=404, detail="No station data available")
        
        # Convert dict data to StationStatus objects
        from models.schemas import StationStatus
        stations = []
        for station_data in data['stations']:
            estimated_capacity = max(30, abs(station_data['net_flow']) + 20)
            current_bikes = max(0, estimated_capacity // 2 + station_data['net_flow'] // 10)
            
            station = StationStatus(
                station_id=station_data['station_id'],
                station_name=station_data['station_name'],
                latitude=station_data['latitude'],
                longitude=station_data['longitude'],
                capacity=estimated_capacity,
                current_bikes=current_bikes,
                surplus_deficit=station_data['net_flow'],
                priority=station_data['priority'],
                total_arrivals=station_data['total_arrivals'],
                total_departures=station_data['total_departures']
            )
            stations.append(station)
        
        result = clustering_service.perform_kmeans_clustering(stations, n_clusters)
        
        return {
            "status": "success",
            "data": result
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Clustering failed: {str(e)}")


@router.get("/heatmap")
async def get_priority_heatmap():
    """
    Generate priority heatmap data for visualization
    
    Returns heatmap points with intensity values
    """
    try:
        # Load current station data
        data = data_loader.load_all_months()
        
        if not data or not data.get('stations'):
            raise HTTPException(status_code=404, detail="No station data available")
        
        # Convert dict data to StationStatus objects
        from models.schemas import StationStatus
        stations = []
        for station_data in data['stations']:
            estimated_capacity = max(30, abs(station_data['net_flow']) + 20)
            current_bikes = max(0, estimated_capacity // 2 + station_data['net_flow'] // 10)
            
            station = StationStatus(
                station_id=station_data['station_id'],
                station_name=station_data['station_name'],
                latitude=station_data['latitude'],
                longitude=station_data['longitude'],
                capacity=estimated_capacity,
                current_bikes=current_bikes,
                surplus_deficit=station_data['net_flow'],
                priority=station_data['priority'],
                total_arrivals=station_data['total_arrivals'],
                total_departures=station_data['total_departures']
            )
            stations.append(station)
        
        result = clustering_service.generate_priority_heatmap(stations)
        
        return {
            "status": "success",
            "data": result
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Heatmap generation failed: {str(e)}")


@router.get("/coverage")
async def analyze_coverage(
    radius_km: float = Query(default=0.5, ge=0.1, le=5.0, description="Service radius in km")
):
    """
    Analyze service coverage and identify gaps
    
    Returns coverage statistics and underserved areas
    """
    try:
        # Load current station data
        data = data_loader.load_all_months()
        
        if not data or not data.get('stations'):
            raise HTTPException(status_code=404, detail="No station data available")
        
        # Convert dict data to StationStatus objects
        from models.schemas import StationStatus
        stations = []
        for station_data in data['stations']:
            estimated_capacity = max(30, abs(station_data['net_flow']) + 20)
            current_bikes = max(0, estimated_capacity // 2 + station_data['net_flow'] // 10)
            
            station = StationStatus(
                station_id=station_data['station_id'],
                station_name=station_data['station_name'],
                latitude=station_data['latitude'],
                longitude=station_data['longitude'],
                capacity=estimated_capacity,
                current_bikes=current_bikes,
                surplus_deficit=station_data['net_flow'],
                priority=station_data['priority'],
                total_arrivals=station_data['total_arrivals'],
                total_departures=station_data['total_departures']
            )
            stations.append(station)
        
        result = clustering_service.analyze_service_coverage(stations, radius_km)
        
        return {
            "status": "success",
            "data": result
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Coverage analysis failed: {str(e)}")
