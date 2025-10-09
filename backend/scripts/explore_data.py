"""
Quick data exploration script for Citi-Bike data
"""
import pandas as pd
import sys
from pathlib import Path

# Add parent directory to path
sys.path.append(str(Path(__file__).parent.parent))

def explore_data():
    """Quick exploration of the Citi-Bike data"""
    
    # Load the data
    data_file = Path(__file__).parent.parent / "data" / "raw" / "JC-202501-citibike-tripdata.csv" / "JC-202501-citibike-tripdata.csv"
    
    print(f"Loading data from: {data_file}")
    
    if not data_file.exists():
        print(f"Error: File not found at {data_file}")
        return
    
    df = pd.read_csv(data_file)
    
    print("\n" + "="*80)
    print("CITI-BIKE DATA EXPLORATION")
    print("="*80)
    
    print(f"\n📊 Dataset Shape: {df.shape[0]:,} rows × {df.shape[1]} columns")
    
    print("\n📋 Column Names:")
    for col in df.columns:
        print(f"  - {col}")
    
    print("\n🔍 First Few Rows:")
    print(df.head())
    
    print("\n📈 Data Types:")
    print(df.dtypes)
    
    print("\n🔢 Basic Statistics:")
    print(df.describe())
    
    print("\n❓ Missing Values:")
    missing = df.isnull().sum()
    print(missing[missing > 0] if missing.sum() > 0 else "  No missing values!")
    
    # Convert timestamps
    df['started_at'] = pd.to_datetime(df['started_at'])
    df['ended_at'] = pd.to_datetime(df['ended_at'])
    
    print("\n📅 Date Range:")
    print(f"  Start: {df['started_at'].min()}")
    print(f"  End: {df['ended_at'].max()}")
    print(f"  Duration: {(df['ended_at'].max() - df['started_at'].min()).days} days")
    
    print("\n🚲 Rideable Types:")
    print(df['rideable_type'].value_counts())
    
    print("\n👥 Member Types:")
    print(df['member_casual'].value_counts())
    
    print("\n🏢 Unique Stations:")
    print(f"  Start Stations: {df['start_station_name'].nunique()}")
    print(f"  End Stations: {df['end_station_name'].nunique()}")
    
    print("\n🔥 Top 10 Most Popular Start Stations:")
    print(df['start_station_name'].value_counts().head(10))
    
    print("\n🔥 Top 10 Most Popular End Stations:")
    print(df['end_station_name'].value_counts().head(10))
    
    # Calculate trip durations
    df['trip_duration'] = (df['ended_at'] - df['started_at']).dt.total_seconds() / 60
    
    print("\n⏱️  Trip Duration Statistics (minutes):")
    print(f"  Mean: {df['trip_duration'].mean():.2f}")
    print(f"  Median: {df['trip_duration'].median():.2f}")
    print(f"  Min: {df['trip_duration'].min():.2f}")
    print(f"  Max: {df['trip_duration'].max():.2f}")
    
    # Hourly patterns
    df['hour'] = df['started_at'].dt.hour
    print("\n🕐 Busiest Hours:")
    print(df['hour'].value_counts().sort_index().head(24))
    
    print("\n" + "="*80)
    print("✅ Data exploration complete!")
    print("="*80)
    
    return df

if __name__ == "__main__":
    df = explore_data()
