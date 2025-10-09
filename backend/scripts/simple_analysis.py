#!/usr/bin/env python3
"""
Simple CSV analyzer without pandas - for quick data overview
"""
import csv
from collections import Counter, defaultdict
from datetime import datetime

def analyze_citibike_data(filepath):
    """Analyze Citi-Bike CSV data"""
    
    print("\n" + "="*80)
    print("🚴 CITI-BIKE DATA ANALYSIS")
    print("="*80 + "\n")
    
    # Read CSV
    with open(filepath, 'r') as f:
        reader = csv.DictReader(f)
        rows = list(reader)
    
    print(f"✅ Loaded {len(rows):,} trips\n")
    
    # Basic stats
    print("📊 COLUMN NAMES:")
    if rows:
        for i, col in enumerate(rows[0].keys(), 1):
            print(f"  {i}. {col}")
    
    print(f"\n🔍 SAMPLE ROWS (first 3):")
    for i, row in enumerate(rows[:3], 1):
        print(f"\n  Row {i}:")
        for key, value in row.items():
            print(f"    {key}: {value[:50] if len(value) > 50 else value}")
    
    # Bike types
    bike_types = Counter(row['rideable_type'] for row in rows)
    print("\n🚲 BIKE TYPES:")
    for bike_type, count in bike_types.most_common():
        pct = (count / len(rows)) * 100
        print(f"  {bike_type}: {count:,} ({pct:.1f}%)")
    
    # Member types
    member_types = Counter(row['member_casual'] for row in rows)
    print("\n👥 USER TYPES:")
    for member_type, count in member_types.most_common():
        pct = (count / len(rows)) * 100
        print(f"  {member_type}: {count:,} ({pct:.1f}%)")
    
    # Station stats
    start_stations = [row['start_station_name'] for row in rows if row['start_station_name']]
    end_stations = [row['end_station_name'] for row in rows if row['end_station_name']]
    
    print(f"\n🏢 STATION STATS:")
    print(f"  Unique start stations: {len(set(start_stations))}")
    print(f"  Unique end stations: {len(set(end_stations))}")
    
    print("\n🔥 TOP 10 START STATIONS:")
    start_counter = Counter(start_stations)
    for i, (station, count) in enumerate(start_counter.most_common(10), 1):
        print(f"  {i}. {station}: {count:,} trips")
    
    print("\n🔥 TOP 10 END STATIONS:")
    end_counter = Counter(end_stations)
    for i, (station, count) in enumerate(end_counter.most_common(10), 1):
        print(f"  {i}. {station}: {count:,} trips")
    
    # Date analysis
    dates = []
    for row in rows[:1000]:  # Sample first 1000 for speed
        try:
            dt = datetime.fromisoformat(row['started_at'].replace('Z', '+00:00'))
            dates.append(dt)
        except:
            pass
    
    if dates:
        print("\n📅 DATE RANGE (from sample):")
        print(f"  Earliest: {min(dates)}")
        print(f"  Latest: {max(dates)}")
        
        # Hour analysis
        hours = Counter(dt.hour for dt in dates)
        print("\n🕐 BUSIEST HOURS (from sample):")
        for hour in sorted(hours.keys()):
            count = hours[hour]
            bar = "█" * (count // 5)
            print(f"  {hour:02d}:00 - {count:3d} trips {bar}")
    
    # Calculate surplus/deficit hints
    print("\n💡 REBALANCING INSIGHTS:")
    
    # Stations with more departures (need bikes)
    departures = Counter(row['start_station_name'] for row in rows if row['start_station_name'])
    arrivals = Counter(row['end_station_name'] for row in rows if row['end_station_name'])
    
    all_stations = set(list(departures.keys()) + list(arrivals.keys()))
    net_demand = {}
    for station in all_stations:
        net = departures.get(station, 0) - arrivals.get(station, 0)
        net_demand[station] = net
    
    print("\n  🔴 STATIONS NEEDING BIKES (High Departure):")
    shortage_stations = sorted(net_demand.items(), key=lambda x: x[1], reverse=True)[:5]
    for station, net in shortage_stations:
        if net > 0:
            print(f"    {station}: +{net} net departures")
    
    print("\n  🔵 STATIONS WITH EXCESS (High Arrival):")
    surplus_stations = sorted(net_demand.items(), key=lambda x: x[1])[:5]
    for station, net in surplus_stations:
        if net < 0:
            print(f"    {station}: {net} net arrivals (surplus)")
    
    print("\n" + "="*80)
    print("✅ Analysis Complete!")
    print("="*80 + "\n")
    
    return {
        'total_trips': len(rows),
        'unique_start_stations': len(set(start_stations)),
        'unique_end_stations': len(set(end_stations)),
        'bike_types': dict(bike_types),
        'member_types': dict(member_types),
        'net_demand': net_demand
    }

if __name__ == "__main__":
    import sys
    from pathlib import Path
    
    # Default path
    data_file = Path(__file__).parent.parent.parent / "data" / "raw" / "JC-202501-citibike-tripdata.csv" / "JC-202501-citibike-tripdata.csv"
    
    if not data_file.exists():
        print(f"❌ Error: Data file not found at {data_file}")
        sys.exit(1)
    
    results = analyze_citibike_data(data_file)
