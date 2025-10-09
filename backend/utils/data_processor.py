"""
Data preprocessing utilities
"""
import pandas as pd
import numpy as np
from pathlib import Path
from typing import Dict, List, Tuple
from datetime import datetime, timedelta
import sys
sys.path.append(str(Path(__file__).parent.parent))
from config.settings import settings


class DataProcessor:
    """Process raw Citi-Bike trip data"""
    
    def __init__(self, data_path: str = None):
        self.data_path = data_path or settings.RAW_DATA_DIR
        self.processed_path = settings.PROCESSED_DATA_DIR
        
    def load_trip_data(self, start_date: str = None, end_date: str = None) -> pd.DataFrame:
        """Load trip data from CSV files"""
        csv_files = list(Path(self.data_path).glob("*.csv"))
        
        if not csv_files:
            raise FileNotFoundError(f"No CSV files found in {self.data_path}")
        
        dfs = []
        for file in csv_files:
            df = pd.read_csv(file)
            dfs.append(df)
        
        data = pd.concat(dfs, ignore_index=True)
        
        # Convert timestamps
        data['started_at'] = pd.to_datetime(data['started_at'])
        data['ended_at'] = pd.to_datetime(data['ended_at'])
        
        # Filter by date range if provided
        if start_date:
            data = data[data['started_at'] >= start_date]
        if end_date:
            data = data[data['ended_at'] <= end_date]
        
        return data
    
    def calculate_station_metrics(
        self,
        data: pd.DataFrame,
        time_window: Tuple[int, int] = (1, 5)
    ) -> pd.DataFrame:
        """
        Calculate surplus/deficit for each station
        
        Args:
            data: Trip data
            time_window: (start_hour, end_hour) for rebalancing window
        """
        # Filter data for time window
        data = data.copy()
        data['hour'] = data['started_at'].dt.hour
        window_data = data[
            (data['hour'] >= time_window[0]) & 
            (data['hour'] < time_window[1])
        ]
        
        # Calculate departures (outgoing trips)
        departures = window_data.groupby('start_station_id').size().reset_index(name='departures')
        
        # Calculate arrivals (incoming trips)
        arrivals = window_data.groupby('end_station_id').size().reset_index(name='arrivals')
        
        # Merge and calculate net demand
        stations = pd.merge(
            departures,
            arrivals,
            left_on='start_station_id',
            right_on='end_station_id',
            how='outer'
        ).fillna(0)
        
        # Net demand = departures - arrivals (positive means need more bikes)
        stations['net_demand'] = stations['departures'] - stations['arrivals']
        
        # Get station names and coordinates
        start_info = data.groupby('start_station_id').agg({
            'start_station_name': 'first',
            'start_lat': 'first',
            'start_lng': 'first'
        }).reset_index()
        
        stations = pd.merge(
            stations,
            start_info,
            left_on='start_station_id',
            right_on='start_station_id',
            how='left'
        )
        
        return stations
    
    def classify_station_priority(self, surplus_deficit: int, distance_from_center: float) -> str:
        """
        Classify station priority based on shortage and location
        
        Args:
            surplus_deficit: Negative for shortage, positive for surplus
            distance_from_center: Distance from city center (miles)
        """
        # Critical: Large shortage, especially in remote areas
        if surplus_deficit < -10:
            return 'critical'
        
        # High: Moderate shortage or remote location with shortage
        if surplus_deficit < -5 or (surplus_deficit < 0 and distance_from_center > 5):
            return 'high'
        
        # Medium: Small shortage or moderate surplus
        if -5 <= surplus_deficit <= 5:
            return 'medium'
        
        # Low: Large surplus
        return 'low'
    
    def detect_patterns(self, data: pd.DataFrame) -> Dict:
        """Detect usage patterns in trip data"""
        patterns = {}
        
        # Hourly patterns
        data['hour'] = data['started_at'].dt.hour
        patterns['hourly'] = data.groupby('hour').size().to_dict()
        
        # Day of week patterns
        data['day_of_week'] = data['started_at'].dt.dayofweek
        patterns['daily'] = data.groupby('day_of_week').size().to_dict()
        
        # Member vs casual
        patterns['user_type'] = data['member_casual'].value_counts().to_dict()
        
        # Popular routes
        routes = data.groupby(['start_station_name', 'end_station_name']).size()
        patterns['top_routes'] = routes.nlargest(10).to_dict()
        
        return patterns
    
    def save_processed_data(self, data: pd.DataFrame, filename: str):
        """Save processed data"""
        output_path = Path(self.processed_path) / filename
        data.to_csv(output_path, index=False)
        print(f"Saved processed data to {output_path}")


if __name__ == "__main__":
    # Example usage
    processor = DataProcessor()
    
    try:
        # Load data
        print("Loading trip data...")
        trips = processor.load_trip_data()
        print(f"Loaded {len(trips)} trips")
        
        # Calculate station metrics
        print("\nCalculating station metrics...")
        stations = processor.calculate_station_metrics(trips)
        print(f"Processed {len(stations)} stations")
        
        # Detect patterns
        print("\nDetecting patterns...")
        patterns = processor.detect_patterns(trips)
        print(f"Found patterns: {list(patterns.keys())}")
        
        # Save
        processor.save_processed_data(stations, 'station_metrics.csv')
        
    except FileNotFoundError as e:
        print(f"\nError: {e}")
        print("\nPlease place your Citi-Bike CSV data in the data/raw/ directory")
