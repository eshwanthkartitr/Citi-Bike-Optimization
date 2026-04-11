"""
Station clustering and geographic analysis service
"""
from typing import List, Dict, Tuple
import numpy as np
from sklearn.cluster import KMeans
from scipy.spatial import ConvexHull
from collections import defaultdict

from models.schemas import StationStatus


class StationClusteringService:
    """Service for geographic clustering and priority zone analysis"""
    
    def __init__(self):
        self.clusters = None
        self.cluster_centers = None
    
    def perform_kmeans_clustering(
        self, 
        stations: List[StationStatus], 
        n_clusters: int = 5
    ) -> Dict:
        """
        Perform K-means clustering on station locations
        
        Args:
            stations: List of station objects
            n_clusters: Number of clusters to create
            
        Returns:
            Dictionary with cluster assignments and metadata
        """
        if len(stations) < n_clusters:
            n_clusters = max(1, len(stations) // 2)
        
        # Extract coordinates
        coordinates = np.array([[s.latitude, s.longitude] for s in stations])
        
        # Perform K-means clustering
        kmeans = KMeans(n_clusters=n_clusters, random_state=42, n_init=10)
        cluster_labels = kmeans.fit_predict(coordinates)
        
        # Store results
        self.clusters = cluster_labels
        self.cluster_centers = kmeans.cluster_centers_
        
        # Build cluster metadata
        clusters_dict = defaultdict(list)
        cluster_stats = {}
        
        for idx, (station, label) in enumerate(zip(stations, cluster_labels)):
            clusters_dict[int(label)].append({
                'station_id': station.station_id,
                'station_name': station.station_name,
                'latitude': station.latitude,
                'longitude': station.longitude,
                'surplus_deficit': station.surplus_deficit,
                'priority': station.priority
            })
        
        # Calculate cluster statistics
        for cluster_id, cluster_stations in clusters_dict.items():
            total_deficit = sum(s['surplus_deficit'] for s in cluster_stations if s['surplus_deficit'] < 0)
            total_surplus = sum(s['surplus_deficit'] for s in cluster_stations if s['surplus_deficit'] > 0)
            
            high_priority_count = sum(1 for s in cluster_stations if s['priority'] in ['CRITICAL', 'HIGH'])
            
            cluster_stats[cluster_id] = {
                'center': {
                    'lat': float(self.cluster_centers[cluster_id][0]),
                    'lng': float(self.cluster_centers[cluster_id][1])
                },
                'station_count': len(cluster_stations),
                'total_deficit': abs(total_deficit),
                'total_surplus': total_surplus,
                'net_balance': total_surplus + total_deficit,
                'high_priority_count': high_priority_count,
                'priority_level': self._calculate_cluster_priority(cluster_stations)
            }
        
        return {
            'clusters': dict(clusters_dict),
            'cluster_stats': cluster_stats,
            'n_clusters': n_clusters
        }
    
    def generate_priority_heatmap(self, stations: List[StationStatus]) -> Dict:
        """
        Generate heatmap data for station priorities
        
        Returns:
            Heatmap intensity data for visualization
        """
        heatmap_points = []
        
        priority_weights = {
            'CRITICAL': 1.0,
            'HIGH': 0.7,
            'MEDIUM': 0.4,
            'LOW': 0.1
        }
        
        for station in stations:
            weight = priority_weights.get(station.priority, 0.1)
            
            # Adjust weight by deficit magnitude
            if station.surplus_deficit < 0:
                deficit_factor = min(abs(station.surplus_deficit) / 100, 2.0)
                weight *= (1 + deficit_factor)
            
            heatmap_points.append({
                'lat': station.latitude,
                'lng': station.longitude,
                'intensity': weight,
                'station_id': station.station_id,
                'station_name': station.station_name,
                'priority': station.priority,
                'deficit': station.surplus_deficit
            })
        
        return {
            'heatmap_points': heatmap_points,
            'max_intensity': max(p['intensity'] for p in heatmap_points) if heatmap_points else 1.0
        }
    
    def analyze_service_coverage(self, stations: List[StationStatus], radius_km: float = 0.5) -> Dict:
        """
        Analyze service coverage and identify gaps
        
        Args:
            stations: List of station objects
            radius_km: Service radius in kilometers
            
        Returns:
            Coverage analysis with gap identification
        """
        coordinates = np.array([[s.latitude, s.longitude] for s in stations])
        
        # Calculate coverage areas (simplified using convex hull)
        if len(coordinates) >= 3:
            try:
                hull = ConvexHull(coordinates)
                coverage_area = hull.volume  # Area in degree-squared
                
                # Convert to approximate km² (rough approximation for mid-latitudes)
                coverage_area_km2 = coverage_area * 111 * 85  # degrees to km
            except:
                coverage_area_km2 = 0
        else:
            coverage_area_km2 = 0
        
        # Identify underserved areas (stations with low density neighbors)
        gaps = []
        for station in stations:
            nearby_count = sum(
                1 for other in stations
                if other.station_id != station.station_id
                and self._haversine_distance(
                    station.latitude, station.longitude,
                    other.latitude, other.longitude
                ) <= radius_km
            )
            
            if nearby_count < 2:  # Isolated station
                gaps.append({
                    'station_id': station.station_id,
                    'station_name': station.station_name,
                    'latitude': station.latitude,
                    'longitude': station.longitude,
                    'nearby_stations': nearby_count,
                    'severity': 'HIGH' if nearby_count == 0 else 'MEDIUM'
                })
        
        # Calculate density metrics
        if coverage_area_km2 > 0:
            station_density = len(stations) / coverage_area_km2
        else:
            station_density = 0
        
        return {
            'total_stations': len(stations),
            'coverage_area_km2': round(coverage_area_km2, 2),
            'station_density': round(station_density, 2),
            'service_gaps': gaps,
            'gap_count': len(gaps),
            'coverage_quality': self._assess_coverage_quality(len(gaps), len(stations))
        }
    
    def _calculate_cluster_priority(self, cluster_stations: List[Dict]) -> str:
        """Calculate overall priority level for a cluster"""
        critical_count = sum(1 for s in cluster_stations if s['priority'] == 'CRITICAL')
        high_count = sum(1 for s in cluster_stations if s['priority'] == 'HIGH')
        
        total = len(cluster_stations)
        
        if critical_count / total >= 0.3:
            return 'CRITICAL'
        elif (critical_count + high_count) / total >= 0.5:
            return 'HIGH'
        elif high_count / total >= 0.3:
            return 'MEDIUM'
        else:
            return 'LOW'
    
    def _haversine_distance(self, lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        """Calculate distance between two points in kilometers"""
        from math import radians, sin, cos, sqrt, atan2
        
        R = 6371  # Earth radius in kilometers
        
        lat1, lon1, lat2, lon2 = map(radians, [lat1, lon1, lat2, lon2])
        dlat = lat2 - lat1
        dlon = lon2 - lon1
        
        a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
        c = 2 * atan2(sqrt(a), sqrt(1-a))
        
        return R * c
    
    def _assess_coverage_quality(self, gap_count: int, total_stations: int) -> str:
        """Assess overall coverage quality"""
        if total_stations == 0:
            return 'UNKNOWN'
        
        gap_ratio = gap_count / total_stations
        
        if gap_ratio <= 0.05:
            return 'EXCELLENT'
        elif gap_ratio <= 0.15:
            return 'GOOD'
        elif gap_ratio <= 0.30:
            return 'FAIR'
        else:
            return 'POOR'
