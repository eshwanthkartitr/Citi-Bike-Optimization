import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, Popup, useMap } from 'react-leaflet';
import { Play, Pause, RotateCcw, FastForward, Settings } from 'lucide-react';
import { useOptimization } from '../store/OptimizationContext';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Custom vehicle icons
const createVehicleIcon = (icon, color) => {
  return L.divIcon({
    html: `<div style="font-size: 24px; filter: drop-shadow(2px 2px 4px rgba(0,0,0,0.5));">${icon}</div>`,
    className: 'vehicle-icon',
    iconSize: [30, 30],
    iconAnchor: [15, 15]
  });
};

const vehicleIcons = {
  mini_van: createVehicleIcon('🚐', '#10B981'),
  light_truck: createVehicleIcon('🚚', '#3B82F6'),
  box_truck: createVehicleIcon('📦', '#EF4444')
};

// Animate vehicle component with loading/unloading states
function AnimatedVehicle({ move, progress, loadingState }) {
  const map = useMap();
  
  // Calculate current position based on progress
  const lat = move.from_lat + (move.to_lat - move.from_lat) * (progress / 100);
  const lng = move.from_lng + (move.to_lng - move.from_lng) * (progress / 100);
  
  // Pan map to follow vehicle every 20% progress
  useEffect(() => {
    if (progress % 20 < 2 && progress > 0 && progress < 100) {
      map.setView([lat, lng], 14, { animate: true, duration: 0.5 });
    }
  }, [progress, lat, lng, map]);
  
  // Determine vehicle position and icon based on state
  let currentLat = lat;
  let currentLng = lng;
  let statusEmoji = '🚗';
  let statusText = 'Traveling';
  
  if (loadingState === 'loading') {
    // At source station
    currentLat = move.from_lat;
    currentLng = move.from_lng;
    statusEmoji = '📦';
    statusText = 'Loading bikes';
  } else if (loadingState === 'unloading') {
    // At destination station
    currentLat = move.to_lat;
    currentLng = move.to_lng;
    statusEmoji = '📤';
    statusText = 'Unloading bikes';
  }
  
  return (
    <>
      {/* Route line */}
      <Polyline
        positions={[
          [move.from_lat, move.from_lng],
          [move.to_lat, move.to_lng]
        ]}
        color={move.vehicle_type === 'box_truck' ? '#EF4444' : move.vehicle_type === 'light_truck' ? '#3B82F6' : '#10B981'}
        weight={4}
        opacity={progress >= 100 ? 0.3 : 0.8}
        dashArray={progress >= 100 ? "5, 10" : null}
      />
      
      {/* Moving vehicle marker */}
      {progress < 100 && (
        <Marker
          position={[currentLat, currentLng]}
          icon={vehicleIcons[move.vehicle_type || 'mini_van']}
          zIndexOffset={1000}
        >
          <Popup>
            <div className="text-sm font-medium">
              <div className="text-lg mb-1">{statusEmoji} {statusText}</div>
              <div className="text-xs text-gray-600">
                Vehicle: {move.vehicle_type?.replace('_', ' ') || 'Mini Van'}<br/>
                Bikes: <span className="font-bold text-blue-600">{move.bikes_moved}</span><br/>
                Progress: <span className="font-bold text-green-600">{progress.toFixed(0)}%</span><br/>
                From: <span className="text-gray-800">{move.from_station_name}</span><br/>
                To: <span className="text-gray-800">{move.to_station_name}</span>
              </div>
            </div>
          </Popup>
        </Marker>
      )}
      
      {/* Pulsing circles at source/destination during loading/unloading */}
      {(loadingState === 'loading' || loadingState === 'unloading') && (
        <Marker
          position={loadingState === 'loading' ? [move.from_lat, move.from_lng] : [move.to_lat, move.to_lng]}
          icon={L.divIcon({
            html: `<div style="
              width: 40px; 
              height: 40px; 
              background: ${loadingState === 'loading' ? 'rgba(59, 130, 246, 0.3)' : 'rgba(16, 185, 129, 0.3)'}; 
              border-radius: 50%; 
              animation: pulse 1s infinite;
              border: 3px solid ${loadingState === 'loading' ? '#3B82F6' : '#10B981'};
            "></div>`,
            className: '',
            iconSize: [40, 40],
            iconAnchor: [20, 20]
          })}
        />
      )}
    </>
  );
}

export default function LiveAnimationView() {
  const { optimizationResult } = useOptimization();
  const [isPlaying, setIsPlaying] = useState(true); // AUTO-START
  const [currentMoveIndex, setCurrentMoveIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [speed, setSpeed] = useState(2); // 2x speed by default
  const [showSettings, setShowSettings] = useState(false);
  const [loadingState, setLoadingState] = useState('loading'); // loading, traveling, unloading
  const animationRef = useRef(null);
  
  // Add coordinates to moves
  const movesWithCoords = optimizationResult?.moves?.map(move => {
    const fromStation = optimizationResult.stations?.find(s => s.station_id === move.from_station_id);
    const toStation = optimizationResult.stations?.find(s => s.station_id === move.to_station_id);
    
    return {
      ...move,
      from_lat: fromStation?.latitude || 40.7282,
      from_lng: fromStation?.longitude || -74.0776,
      to_lat: toStation?.latitude || 40.7282,
      to_lng: toStation?.longitude || -74.0776
    };
  }) || [];
  
  const currentMove = movesWithCoords[currentMoveIndex];
  
  // Animation loop with loading/unloading phases
  useEffect(() => {
    if (!isPlaying || !currentMove) return;
    
    animationRef.current = setInterval(() => {
      setProgress(prev => {
        // Loading phase (0-10%)
        if (prev < 10) {
          setLoadingState('loading');
          return prev + (0.3 * speed);
        }
        // Traveling phase (10-90%)
        else if (prev < 90) {
          setLoadingState('traveling');
          return prev + (0.8 * speed);
        }
        // Unloading phase (90-100%)
        else if (prev < 100) {
          setLoadingState('unloading');
          return prev + (0.3 * speed);
        }
        // Complete - move to next
        else {
          if (currentMoveIndex < movesWithCoords.length - 1) {
            setCurrentMoveIndex(currentMoveIndex + 1);
            setLoadingState('loading');
            return 0;
          } else {
            setIsPlaying(false);
            return 100;
          }
        }
      });
    }, 50);
    
    return () => clearInterval(animationRef.current);
  }, [isPlaying, currentMoveIndex, currentMove, speed, movesWithCoords.length]);
  
  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };
  
  const handleReset = () => {
    setIsPlaying(false);
    setCurrentMoveIndex(0);
    setProgress(0);
  };
  
  const handleSpeedChange = (newSpeed) => {
    setSpeed(newSpeed);
  };
  
  if (!optimizationResult || !movesWithCoords.length) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <p className="text-gray-600 mb-4">No optimization result available</p>
          <p className="text-sm text-gray-500">Run an optimization first to see live animation</p>
        </div>
      </div>
    );
  }
  
  // Calculate center
  const centerLat = movesWithCoords.reduce((sum, m) => sum + m.from_lat, 0) / movesWithCoords.length;
  const centerLng = movesWithCoords.reduce((sum, m) => sum + m.from_lng, 0) / movesWithCoords.length;
  
  return (
    <div className="relative h-full">
      {/* Map */}
      <MapContainer
        center={[centerLat, centerLng]}
        zoom={13}
        className="h-full w-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {/* Station markers with loading/unloading indicators */}
        {optimizationResult.stations?.map(station => {
          const isCurrentFrom = currentMove && currentMove.from_station_id === station.station_id && loadingState === 'loading';
          const isCurrentTo = currentMove && currentMove.to_station_id === station.station_id && loadingState === 'unloading';
          
          return (
            <Marker
              key={station.station_id}
              position={[station.latitude, station.longitude]}
              icon={L.divIcon({
                html: `<div style="
                  background: ${isCurrentFrom ? '#FCD34D' : isCurrentTo ? '#34D399' : 'white'};
                  border: 3px solid ${isCurrentFrom || isCurrentTo ? '#EF4444' : '#3B82F6'};
                  border-radius: 50%;
                  width: ${isCurrentFrom || isCurrentTo ? '16px' : '10px'};
                  height: ${isCurrentFrom || isCurrentTo ? '16px' : '10px'};
                  animation: ${isCurrentFrom || isCurrentTo ? 'pulse 1s infinite' : 'none'};
                "></div>`,
                className: '',
                iconSize: [16, 16]
              })}
            >
              <Popup>
                <div className="text-sm">
                  <strong>{station.station_name}</strong><br/>
                  {isCurrentFrom && <span className="text-yellow-600 font-bold">📦 Loading {currentMove.bikes_moved} bikes...</span>}
                  {isCurrentTo && <span className="text-green-600 font-bold">📤 Unloading {currentMove.bikes_moved} bikes...</span>}<br/>
                  Surplus/Deficit: {station.surplus_deficit}<br/>
                  Priority: {station.priority}
                </div>
              </Popup>
            </Marker>
          );
        })}
        
        {/* Current animated route */}
        {currentMove && (
          <AnimatedVehicle
            move={currentMove}
            progress={progress}
            loadingState={loadingState}
          />
        )}
        
        {/* Completed routes (faded) */}
        {movesWithCoords.slice(0, currentMoveIndex).map((move, idx) => (
          <Polyline
            key={idx}
            positions={[
              [move.from_lat, move.from_lng],
              [move.to_lat, move.to_lng]
            ]}
            color="#9CA3AF"
            weight={2}
            opacity={0.3}
          />
        ))}
      </MapContainer>
      
      {/* Control Panel */}
      <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 bg-white rounded-lg shadow-lg p-4 flex items-center gap-4 z-1000">
        {/* Play/Pause */}
        <button
          onClick={handlePlayPause}
          className="p-3 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition"
        >
          {isPlaying ? <Pause size={20} /> : <Play size={20} />}
        </button>
        
        {/* Reset */}
        <button
          onClick={handleReset}
          className="p-3 bg-gray-600 text-white rounded-full hover:bg-gray-700 transition"
        >
          <RotateCcw size={20} />
        </button>
        
        {/* Progress Info */}
        <div className="flex flex-col">
          <span className="text-xs text-gray-500">Move {currentMoveIndex + 1} / {movesWithCoords.length}</span>
          <span className="text-sm font-semibold">{currentMove?.vehicle_icon} {currentMove?.vehicle_type?.replace('_', ' ')}</span>
          <div className="w-48 bg-gray-200 rounded-full h-2 mt-1">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
        
        {/* Speed Control */}
        <div className="relative">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-3 bg-gray-200 rounded-full hover:bg-gray-300 transition"
          >
            <Settings size={20} />
          </button>
          
          {showSettings && (
            <div className="absolute bottom-full mb-2 right-0 bg-white rounded-lg shadow-lg p-3 min-w-[150px]">
              <p className="text-xs text-gray-600 mb-2">Animation Speed</p>
              {[0.5, 1, 2, 5].map(s => (
                <button
                  key={s}
                  onClick={() => handleSpeedChange(s)}
                  className={`block w-full text-left px-3 py-1 rounded ${
                    speed === s ? 'bg-blue-600 text-white' : 'hover:bg-gray-100'
                  }`}
                >
                  {s}x
                </button>
              ))}
            </div>
          )}
        </div>
        
        {/* Current Info with State */}
        <div className="text-sm border-l pl-4 min-w-[180px]">
          <div className="mb-2">
            <strong className="text-lg">
              {loadingState === 'loading' && '📦 Loading...'}
              {loadingState === 'traveling' && '🚗 In Transit'}
              {loadingState === 'unloading' && '📤 Unloading...'}
            </strong>
          </div>
          <div><strong>Bikes:</strong> {currentMove?.bikes_moved}</div>
          <div><strong>Distance:</strong> {currentMove?.distance?.toFixed(2)} km</div>
          <div><strong>Cost:</strong> ${currentMove?.cost}</div>
        </div>
      </div>
      
      {/* Stats Panel */}
      <div className="absolute top-6 right-6 bg-white rounded-lg shadow-lg p-4 min-w-[200px] z-1000">
        <h3 className="font-semibold mb-2">Live Stats</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span>Total Cost:</span>
            <span className="font-semibold">${optimizationResult.total_cost?.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span>Bikes Moved:</span>
            <span className="font-semibold">{optimizationResult.total_bikes_moved}</span>
          </div>
          <div className="flex justify-between">
            <span>Fairness:</span>
            <span className="font-semibold">{optimizationResult.fairness_score?.toFixed(3)}</span>
          </div>
          <div className="flex justify-between">
            <span>Progress:</span>
            <span className="font-semibold">{((currentMoveIndex / movesWithCoords.length) * 100).toFixed(0)}%</span>
          </div>
        </div>
      </div>
    </div>
  );
}
