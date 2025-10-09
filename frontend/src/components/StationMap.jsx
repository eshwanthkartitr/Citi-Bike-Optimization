import { useEffect, useMemo, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Create custom icons using DivIcon for better control
const createStationIcon = (station, options = {}) => {
  const priority = station.priority.toUpperCase()
  const surplus = station.surplus_deficit
  const { isLoading = false, isUnloading = false } = options
  
  // Priority icons and colors
  let icon = '🏠' // Home icon for stations
  let bgColor = '#3b82f6' // Blue default
  
  if (priority === 'CRITICAL') {
    icon = '🚨'
    bgColor = '#dc2626' // Red
  } else if (priority === 'HIGH') {
    icon = '⚠️'
    bgColor = '#f59e0b' // Orange
  } else if (priority === 'MEDIUM') {
    icon = '📍'
    bgColor = '#10b981' // Green
  } else if (surplus > 100) {
    icon = '🔵' // Surplus station
    bgColor = '#10b981'
  } else if (surplus < -100) {
    icon = '🔴' // Deficit station
    bgColor = '#ef4444'
  }
  
  const size = isLoading || isUnloading ? 40 : 32
  const animation = isLoading || isUnloading ? 'pulse 1s infinite' : 'none'
  const highlightBorder = isLoading ? '#f59e0b' : isUnloading ? '#10b981' : 'white'

  return L.divIcon({
    html: `<div style="
      background-color: ${bgColor};
      width: ${size}px;
      height: ${size}px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 18px;
      border: 3px solid ${highlightBorder};
      box-shadow: 0 2px 4px rgba(0,0,0,0.3);
      animation: ${animation};
    ">${icon}</div>`,
    className: 'custom-marker',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2]
  })
}

const vehicleIcons = {
  mini_van: L.divIcon({
    html: '<div style="font-size: 26px">🚐</div>',
    className: 'vehicle-marker',
    iconSize: [26, 26],
    iconAnchor: [13, 13]
  }),
  light_truck: L.divIcon({
    html: '<div style="font-size: 26px">🚚</div>',
    className: 'vehicle-marker',
    iconSize: [26, 26],
    iconAnchor: [13, 13]
  }),
  box_truck: L.divIcon({
    html: '<div style="font-size: 26px">📦</div>',
    className: 'vehicle-marker',
    iconSize: [26, 26],
    iconAnchor: [13, 13]
  })
}

export default function StationMap({ stations, moves = [] }) {
  // Center on Jersey City/Hoboken (where the real data is)
  const center = [40.7281, -74.0776] // Jersey City center

  const [activeMoveIndex, setActiveMoveIndex] = useState(0)
  const [progress, setProgress] = useState(0)
  const [phase, setPhase] = useState('idle')
  const [isAnimating, setIsAnimating] = useState(false)

  // Lookup map for station data
  const stationLookup = useMemo(() => {
    const lookup = new Map()
    stations.forEach((station) => {
      lookup.set(station.id, station)
    })
    return lookup
  }, [stations])

  useEffect(() => {
    if (!moves || moves.length === 0) {
      setIsAnimating(false)
      setActiveMoveIndex(0)
      setProgress(0)
      setPhase('idle')
      return
    }

    setIsAnimating(true)
    setActiveMoveIndex(0)
    setProgress(0)
    setPhase('loading')
  }, [moves])

  useEffect(() => {
    if (!isAnimating || !moves || moves.length === 0) return

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev < 10) {
          setPhase('loading')
          return prev + 1.5
        }
        if (prev < 90) {
          setPhase('traveling')
          return prev + 2.5
        }
        if (prev < 100) {
          setPhase('unloading')
          return prev + 1.5
        }

        if (activeMoveIndex < moves.length - 1) {
          setActiveMoveIndex((idx) => idx + 1)
          setPhase('loading')
          return 0
        }

        setIsAnimating(false)
        setPhase('complete')
        return 100
      })
    }, 120)

    return () => clearInterval(interval)
  }, [isAnimating, moves, activeMoveIndex])

  const currentMove = moves && moves.length > 0 ? moves[Math.min(activeMoveIndex, moves.length - 1)] : null

  const fromStation = currentMove ? (stationLookup.get(currentMove.from_station_id) || {
    lat: currentMove.from_lat,
    lng: currentMove.from_lng,
    name: currentMove.from_station_name
  }) : null

  const toStation = currentMove ? (stationLookup.get(currentMove.to_station_id) || {
    lat: currentMove.to_lat,
    lng: currentMove.to_lng,
    name: currentMove.to_station_name
  }) : null

  const vehiclePosition = useMemo(() => {
    if (!currentMove || !fromStation || !toStation) return null
    const ratio = Math.min(1, Math.max(0, progress / 100))
    const lat = fromStation.lat + (toStation.lat - fromStation.lat) * ratio
    const lng = fromStation.lng + (toStation.lng - fromStation.lng) * ratio
    return [lat, lng]
  }, [currentMove, fromStation, toStation, progress])

  return (
    <MapContainer
      center={center}
      zoom={13}
      style={{ height: '100%', width: '100%' }}
      className="rounded-lg"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      
      {/* Draw routes */}
      {moves.map((move, idx) => {
        const from = stationLookup.get(move.from_station_id)
        const to = stationLookup.get(move.to_station_id)
        if (!from || !to) return null
        const isCompleted = idx < activeMoveIndex
        const isActive = idx === activeMoveIndex && isAnimating
        const color = move.vehicle_type === 'box_truck' ? '#EF4444' : move.vehicle_type === 'light_truck' ? '#3B82F6' : '#10B981'

        return (
          <Polyline
            key={`${move.from_station_id}-${move.to_station_id}-${idx}`}
            positions={[
              [from.lat, from.lng],
              [to.lat, to.lng]
            ]}
            color={color}
            weight={isActive ? 4 : 2}
            opacity={isCompleted ? 0.25 : isActive ? 0.8 : 0.4}
            dashArray={isCompleted ? '6, 12' : null}
          />
        )
      })}

      {/* Animated vehicle marker */}
      {vehiclePosition && currentMove && (
        <Marker
          position={vehiclePosition}
          icon={vehicleIcons[currentMove.vehicle_type] || vehicleIcons.mini_van}
          zIndexOffset={1500}
        >
          <Popup>
            <div className="text-sm">
              <p className="font-semibold mb-1">{currentMove.vehicle_icon || '🚚'} {currentMove.vehicle_type?.replace('_', ' ')}</p>
              <p>Move {activeMoveIndex + 1} of {moves.length}</p>
              <p>Bikes: <span className="font-bold text-blue-600">{currentMove.bikes_moved}</span></p>
              <p>Status: {
                phase === 'loading' ? 'Loading bikes' :
                phase === 'traveling' ? 'In transit' :
                phase === 'unloading' ? 'Unloading bikes' : 'Complete'
              }</p>
            </div>
          </Popup>
        </Marker>
      )}

      {stations.map((station) => {
        const isLoadingStation = currentMove && station.id === currentMove.from_station_id && phase === 'loading'
        const isUnloadingStation = currentMove && station.id === currentMove.to_station_id && phase === 'unloading'

        return (
          <Marker
            key={station.id}
            position={[station.lat, station.lng]}
            icon={createStationIcon(station, { isLoading: isLoadingStation, isUnloading: isUnloadingStation })}
          >
            <Popup>
              <div className="p-3 min-w-[250px]">
                <h4 className="font-bold text-lg mb-2">{station.name}</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">🚲 Current Bikes:</span>
                    <span className="font-semibold">{station.current_bikes}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">📊 Capacity:</span>
                    <span className="font-semibold">{station.capacity}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">⚖️ Net Flow:</span>
                    <span className={`font-bold ${station.surplus_deficit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {station.surplus_deficit > 0 ? '+' : ''}{station.surplus_deficit}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">🎯 Priority:</span>
                    <span className={`font-bold ${
                      station.priority === 'CRITICAL' ? 'text-red-600' :
                      station.priority === 'HIGH' ? 'text-orange-500' :
                      station.priority === 'MEDIUM' ? 'text-yellow-500' : 'text-green-600'
                    }`}>
                      {station.priority}
                    </span>
                  </div>
                  {phase !== 'idle' && (
                    <div className="flex justify-between border-t pt-1 mt-2">
                      <span className="text-gray-600">After Optimization:</span>
                      <span className="font-semibold">{station.current_bikes} bikes</span>
                    </div>
                  )}
                </div>
              </div>
            </Popup>
          </Marker>
        )
      })}
    </MapContainer>
  )
}
