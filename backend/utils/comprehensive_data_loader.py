"""
Comprehensive data loader for all Citi-Bike trip data (Jan-July 2025)
Handles nested folder structure: data/raw/JC-202501-citibike-tripdata.csv/JC-202501-citibike-tripdata.csv
"""
import csv
from pathlib import Path
from collections import defaultdict, Counter
from datetime import datetime
from typing import Dict, List, Tuple
import sys
from geopy.distance import geodesic

# Add parent directory to path
sys.path.append(str(Path(__file__).parent.parent))

from config.settings import settings
from utils.logger import setup_logger

logger = setup_logger(__name__)


class ComprehensiveDataLoader:
    """Load and aggregate all monthly trip data"""
    
    def __init__(self):
        # Get absolute path relative to backend directory
        backend_dir = Path(__file__).parent.parent
        self.raw_data_path = backend_dir.parent / "data" / "raw"
        self.all_trips = []
        self.station_stats = defaultdict(lambda: {
            'arrivals': 0,
            'departures': 0,
            'net_flow': 0,
            'member_trips': 0,
            'casual_trips': 0,
            'lat': None,
            'lng': None,
            'name': None,
            'hourly_arrivals': Counter(),
            'hourly_departures': Counter(),
            'daily_patterns': defaultdict(int)
        })
    
    def load_all_months(self) -> Dict:
        """
        Load all CSV files from nested folder structure
        Structure: data/raw/JC-YYYYMM-citibike-tripdata.csv/JC-YYYYMM-citibike-tripdata.csv
        """
        logger.info("🚲 Loading comprehensive Citi-Bike data from all months...")
        
        
        
        # Find all CSV files in nested folders
        csv_files = []
        for folder in self.raw_data_path.iterdir():
            # Skip hidden files like .gitkeep
            if folder.name.startswith('.'):
                continue
                
            if folder.is_dir():
                # Folder name is like: JC-202501-citibike-tripdata.csv
                # File inside is also: JC-202501-citibike-tripdata.csv
                # So we need to remove .csv from folder name to get the file name
                folder_base = folder.name.rstrip('.csv')
                csv_file = folder / f"{folder_base}.csv"
                
                if csv_file.exists():
                    csv_files.append(csv_file)
                    logger.info(f"  📁 Found: {folder.name}")
                else:
                    logger.warning(f"  ⚠️  Folder '{folder.name}' exists but CSV not found at: {csv_file}")
        
        if not csv_files:
            logger.error("❌ No CSV files found in nested folder structure!")
            return self._empty_result()
        
        logger.info(f"📊 Found {len(csv_files)} monthly data files")
        
        # Load each month
        total_trips = 0
        for csv_file in sorted(csv_files):
            month_trips = self._load_single_month(csv_file)
            total_trips += month_trips
            logger.info(f"  ✅ Loaded {csv_file.name}: {month_trips:,} trips")
        
        logger.info(f"✅ Total trips loaded: {total_trips:,}")
        
        # Calculate aggregated statistics
        return self._calculate_comprehensive_stats()
    
    def _load_single_month(self, csv_path: Path) -> int:
        """Load a single monthly CSV file"""
        trip_count = 0
        
        try:
            with open(csv_path, 'r', encoding='utf-8') as f:
                reader = csv.DictReader(f)
                
                for row in reader:
                    try:
                        # Extract trip data
                        trip = {
                            'ride_id': row.get('ride_id'),
                            'rideable_type': row.get('rideable_type'),
                            'started_at': row.get('started_at'),
                            'ended_at': row.get('ended_at'),
                            'start_station_id': row.get('start_station_id'),
                            'start_station_name': row.get('start_station_name'),
                            'end_station_id': row.get('end_station_id'),
                            'end_station_name': row.get('end_station_name'),
                            'start_lat': float(row.get('start_lat', 0)),
                            'start_lng': float(row.get('start_lng', 0)),
                            'end_lat': float(row.get('end_lat', 0)),
                            'end_lng': float(row.get('end_lng', 0)),
                            'member_casual': row.get('member_casual')
                        }
                        
                        # Update station statistics
                        self._update_station_stats(trip)
                        self.all_trips.append(trip)
                        trip_count += 1
                        
                    except (ValueError, KeyError) as e:
                        continue  # Skip malformed rows
                        
        except Exception as e:
            logger.error(f"❌ Error loading {csv_path.name}: {e}")
            return 0
        
        return trip_count
    
    def _update_station_stats(self, trip: Dict):
        """Update statistics for stations involved in trip"""
        start_id = trip['start_station_id']
        end_id = trip['end_station_id']
        member_type = trip['member_casual']
        
        # Parse hour from timestamp
        try:
            start_time = datetime.fromisoformat(trip['started_at'].replace('Z', '+00:00'))
            hour = start_time.hour
            day_of_week = start_time.strftime('%A')
        except:
            hour = 0
            day_of_week = 'Unknown'
        
        # Update departure station
        if start_id:
            self.station_stats[start_id]['departures'] += 1
            self.station_stats[start_id]['net_flow'] -= 1
            self.station_stats[start_id]['hourly_departures'][hour] += 1
            self.station_stats[start_id]['daily_patterns'][day_of_week] += 1
            
            if member_type == 'member':
                self.station_stats[start_id]['member_trips'] += 1
            else:
                self.station_stats[start_id]['casual_trips'] += 1
            
            if not self.station_stats[start_id]['lat']:
                self.station_stats[start_id]['lat'] = trip['start_lat']
                self.station_stats[start_id]['lng'] = trip['start_lng']
                self.station_stats[start_id]['name'] = trip['start_station_name']
        
        # Update arrival station
        if end_id:
            self.station_stats[end_id]['arrivals'] += 1
            self.station_stats[end_id]['net_flow'] += 1
            self.station_stats[end_id]['hourly_arrivals'][hour] += 1
            self.station_stats[end_id]['daily_patterns'][day_of_week] += 1
            
            if member_type == 'member':
                self.station_stats[end_id]['member_trips'] += 1
            else:
                self.station_stats[end_id]['casual_trips'] += 1
            
            if not self.station_stats[end_id]['lat']:
                self.station_stats[end_id]['lat'] = trip['end_lat']
                self.station_stats[end_id]['lng'] = trip['end_lng']
                self.station_stats[end_id]['name'] = trip['end_station_name']
    
    def _calculate_comprehensive_stats(self) -> Dict:
        """Calculate comprehensive statistics from all loaded data"""
        
        stations = []
        for station_id, stats in self.station_stats.items():
            if stats['name']:  # Valid station
                stations.append({
                    'station_id': station_id,
                    'station_name': stats['name'],
                    'latitude': stats['lat'],
                    'longitude': stats['lng'],
                    'total_arrivals': stats['arrivals'],
                    'total_departures': stats['departures'],
                    'net_flow': stats['net_flow'],
                    'member_trips': stats['member_trips'],
                    'casual_trips': stats['casual_trips'],
                    'total_trips': stats['arrivals'] + stats['departures'],
                    'hourly_arrivals': dict(stats['hourly_arrivals']),
                    'hourly_departures': dict(stats['hourly_departures']),
                    'daily_patterns': dict(stats['daily_patterns'])
                })
        
        # Sort by total activity
        stations.sort(key=lambda x: x['total_trips'], reverse=True)
        
        # Calculate priorities based on sparsity and deficit
        stations = self._calculate_station_priorities(stations)
        
        # Identify surplus and deficit stations
        surplus_stations = [s for s in stations if s['net_flow'] > 0]
        deficit_stations = [s for s in stations if s['net_flow'] < 0]
        
        # Find peak hours
        all_hourly_departures = Counter()
        for stats in self.station_stats.values():
            all_hourly_departures.update(stats['hourly_departures'])
        
        peak_hours = all_hourly_departures.most_common(3)
        
        return {
            'total_trips': len(self.all_trips),
            'total_stations': len(stations),
            'stations': stations,
            'surplus_stations': surplus_stations,
            'deficit_stations': deficit_stations,
            'top_10_busiest': stations[:10],
            'top_10_surplus': sorted(surplus_stations, key=lambda x: x['net_flow'], reverse=True)[:10],
            'top_10_deficit': sorted(deficit_stations, key=lambda x: x['net_flow'])[:10],
            'peak_hours': [{'hour': h, 'trips': c} for h, c in peak_hours],
            'summary': {
                'total_trips': len(self.all_trips),
                'total_stations': len(stations),
                'stations_with_surplus': len(surplus_stations),
                'stations_with_deficit': len(deficit_stations),
                'total_surplus_bikes': sum(s['net_flow'] for s in surplus_stations),
                'total_deficit_bikes': abs(sum(s['net_flow'] for s in deficit_stations))
            }
        }
    
    def _calculate_station_priorities(self, stations: List[Dict]) -> List[Dict]:
        """
        Calculate priority for each deficit station based on:
        1. Geographic sparsity (distance to nearest neighbors)
        2. Deficit severity (how many bikes needed)
        
        Priority Categories:
        - CRITICAL: Sparse stations (>1.5km from neighbors) with high deficit (>400 bikes)
        - HIGH: Sparse stations or high deficit stations
        - MEDIUM: Moderate deficit in dense areas
        - LOW: Small deficit in dense areas
        """
        logger.info("🎯 Calculating station priorities based on sparsity...")
        
        deficit_stations = [s for s in stations if s['net_flow'] < 0]
        
        if not deficit_stations:
            return stations
        
        # Calculate distance to nearest neighbor for each deficit station
        for station in deficit_stations:
            coord = (station['latitude'], station['longitude'])
            
            # Find distances to all other stations
            distances = []
            for other in stations:
                if other['station_id'] != station['station_id']:
                    other_coord = (other['latitude'], other['longitude'])
                    dist = geodesic(coord, other_coord).kilometers
                    distances.append(dist)
            
            # Get distance to 3 nearest neighbors (for sparsity score)
            if distances:
                distances.sort()
                nearest_3 = distances[:3] if len(distances) >= 3 else distances
                avg_distance_to_neighbors = sum(nearest_3) / len(nearest_3)
                station['avg_distance_to_neighbors'] = avg_distance_to_neighbors
                station['nearest_neighbor_distance'] = distances[0]
            else:
                station['avg_distance_to_neighbors'] = 0
                station['nearest_neighbor_distance'] = 0
            
            # Calculate deficit severity
            deficit_severity = abs(station['net_flow'])
            
            # Assign priority based on sparsity + deficit
            # For Jersey City urban area, adjusted thresholds:
            # CRITICAL: Relatively sparse (>0.6km avg) + Very high deficit (>600 bikes)
            if avg_distance_to_neighbors > 0.6 and deficit_severity > 600:
                station['priority'] = 'CRITICAL'
                station['priority_score'] = 10.0
            # CRITICAL: Very sparse for urban area (>0.8km) + High deficit (>400)
            elif avg_distance_to_neighbors > 0.8 and deficit_severity > 400:
                station['priority'] = 'CRITICAL'
                station['priority_score'] = 10.0
            # CRITICAL: Extremely sparse (>1.0km) regardless of deficit
            elif avg_distance_to_neighbors > 1.0:
                station['priority'] = 'CRITICAL'
                station['priority_score'] = 10.0
            # HIGH: Moderately sparse (>0.45km) + high deficit (>400)
            elif avg_distance_to_neighbors > 0.45 and deficit_severity > 400:
                station['priority'] = 'HIGH'
                station['priority_score'] = 5.0
            # HIGH: Very high deficit in any location (>600 bikes)
            elif deficit_severity > 600:
                station['priority'] = 'HIGH'
                station['priority_score'] = 5.0
            # MEDIUM: Some sparsity (>0.35km) + moderate deficit (>250)
            elif avg_distance_to_neighbors > 0.35 and deficit_severity > 250:
                station['priority'] = 'MEDIUM'
                station['priority_score'] = 2.0
            # MEDIUM: High deficit in dense area (>350 bikes)
            elif deficit_severity > 350:
                station['priority'] = 'MEDIUM'
                station['priority_score'] = 2.0
            # LOW: Dense area with small deficit
            else:
                station['priority'] = 'LOW'
                station['priority_score'] = 1.0
        
        # Also add default priority to surplus stations (low priority)
        for station in stations:
            if 'priority' not in station:
                station['priority'] = 'LOW'
                station['priority_score'] = 1.0
                station['avg_distance_to_neighbors'] = 0
                station['nearest_neighbor_distance'] = 0
        
        # Log priority distribution
        priority_counts = Counter([s['priority'] for s in deficit_stations])
        logger.info(f"   CRITICAL priority stations: {priority_counts.get('CRITICAL', 0)}")
        logger.info(f"   HIGH priority stations: {priority_counts.get('HIGH', 0)}")
        logger.info(f"   MEDIUM priority stations: {priority_counts.get('MEDIUM', 0)}")
        logger.info(f"   LOW priority stations: {priority_counts.get('LOW', 0)}")
        
        return stations
    
    def _empty_result(self) -> Dict:
        """Return empty result structure"""
        return {
            'total_trips': 0,
            'total_stations': 0,
            'stations': [],
            'surplus_stations': [],
            'deficit_stations': [],
            'top_10_busiest': [],
            'top_10_surplus': [],
            'top_10_deficit': [],
            'peak_hours': [],
            'summary': {
                'total_trips': 0,
                'total_stations': 0,
                'stations_with_surplus': 0,
                'stations_with_deficit': 0,
                'total_surplus_bikes': 0,
                'total_deficit_bikes': 0
            }
        }


# Test function
def test_loader():
    """Test the comprehensive data loader"""
    loader = ComprehensiveDataLoader()
    data = loader.load_all_months()
    
    print("\n" + "="*80)
    print("📊 COMPREHENSIVE DATA ANALYSIS (January - July 2025)")
    print("="*80)
    
    summary = data['summary']
    print(f"\n✅ Total Trips: {summary['total_trips']:,}")
    print(f"✅ Total Stations: {summary['total_stations']}")
    print(f"✅ Stations with Surplus: {summary['stations_with_surplus']}")
    print(f"✅ Stations with Deficit: {summary['stations_with_deficit']}")
    print(f"✅ Total Surplus Bikes: {summary['total_surplus_bikes']}")
    print(f"✅ Total Deficit Bikes: {summary['total_deficit_bikes']}")
    
    print(f"\n🔥 TOP 10 BUSIEST STATIONS:")
    for i, station in enumerate(data['top_10_busiest'], 1):
        print(f"  {i}. {station['station_name']:<40} - {station['total_trips']:,} trips")
    
    print(f"\n🔵 TOP 10 SURPLUS STATIONS (Need to Send Bikes):")
    for i, station in enumerate(data['top_10_surplus'], 1):
        print(f"  {i}. {station['station_name']:<40} - Surplus: {station['net_flow']:+,} bikes")
    
    print(f"\n🔴 TOP 10 DEFICIT STATIONS (Need to Receive Bikes):")
    for i, station in enumerate(data['top_10_deficit'], 1):
        priority_emoji = {'CRITICAL': '🚨', 'HIGH': '⚠️', 'MEDIUM': '📊', 'LOW': '✅'}
        emoji = priority_emoji.get(station.get('priority', 'LOW'), '📍')
        dist = station.get('avg_distance_to_neighbors', 0)
        print(f"  {i}. {emoji} {station['station_name']:<35} - Deficit: {station['net_flow']:+5,} bikes | Priority: {station.get('priority', 'N/A'):<8} | Avg Dist: {dist:.2f}km")
    
    print(f"\n⏰ PEAK HOURS:")
    for peak in data['peak_hours']:
        hour = peak['hour']
        trips = peak['trips']
        time_str = f"{hour:02d}:00-{(hour+1)%24:02d}:00"
        print(f"  {time_str}: {trips:,} trips")
    
    print("\n" + "="*80)
    return data


if __name__ == "__main__":
    test_loader()
