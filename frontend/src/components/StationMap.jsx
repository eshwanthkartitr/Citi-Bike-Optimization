import { useEffect, useMemo, useRef, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import 'leaflet-routing-machine'
import 'leaflet-routing-machine/dist/leaflet-routing-machine.css'

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

const getMoveKey = (move, idx) => `${move.from_station_id}-${move.to_station_id}-${idx}`

const getVehicleColor = (move) => {
  if (!move) return '#3B82F6'
  if (move.vehicle_type === 'box_truck') return '#EF4444'
  if (move.vehicle_type === 'light_truck') return '#3B82F6'
  if (move.vehicle_type === 'mini_van') return '#10B981'
  return '#6366F1'
}

export default function StationMap({ stations, moves = [], children }) {
  // Center on Jersey City/Hoboken (where the real data is)
  const center = [40.7281, -74.0776] // Jersey City center

  const [activeMoveIndex, setActiveMoveIndex] = useState(0)
  const [progress, setProgress] = useState(0)
  const [phase, setPhase] = useState('idle')
  const [isAnimating, setIsAnimating] = useState(false)
  const [routeCache, setRouteCache] = useState({})
  const routeCacheRef = useRef(routeCache)

  // Lookup map for station data
  const stationLookup = useMemo(() => {
    const lookup = new Map()
    stations.forEach((station) => {
      lookup.set(station.id, station)
    })
    return lookup
  }, [stations])

  useEffect(() => {
    routeCacheRef.current = routeCache
  }, [routeCache])

  useEffect(() => {
    if (!moves || moves.length === 0) {
      setRouteCache({})
      return
    }

    setRouteCache((prev) => {
      const validKeys = new Set(moves.map((move, idx) => getMoveKey(move, idx)))
      const next = {}
      validKeys.forEach((key) => {
        if (prev[key]) {
          next[key] = prev[key]
        }
      })
      return next
    })
  }, [moves])

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

  useEffect(() => {
    if (!moves || moves.length === 0) return

    let isCancelled = false
    const timeouts = []

    const fetchRouteWithRetry = async (move, idx, key, from, to, retryCount = 0) => {
      if (isCancelled) return

      try {
        // OpenRouteService API - more reliable than public OSRM
        const apiKey = 'eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6ImIwYWIxN2RlZTEzZjRhODliZjk1NzlmZjcwOTcxYTEzIiwiaCI6Im11cm11cjY0In0='
        
        const url = `https://api.openrouteservice.org/v2/directions/driving-car?api_key=${apiKey}&start=${from.lng},${from.lat}&end=${to.lng},${to.lat}`
        
        const response = await fetch(url, {
          headers: {
            'Accept': 'application/json, application/geo+json, application/gpx+xml, img/png; charset=utf-8'
          }
        })
        
        if (!response.ok) {
          const errorText = await response.text()
          throw new Error(`HTTP ${response.status}: ${errorText}`)
        }

        const data = await response.json()
        
        if (!data.features || data.features.length === 0) {
          throw new Error('No routes found')
        }

        const coords = data.features[0].geometry.coordinates
        if (!coords || coords.length === 0) {
          throw new Error('No coordinates in route')
        }

        // Convert [lng, lat] to [lat, lng] for Leaflet
        const latLngs = coords.map(([lng, lat]) => [lat, lng])

        setRouteCache((prev) => {
          if (prev[key]) return prev
          const next = { ...prev, [key]: latLngs }
          routeCacheRef.current = next
          return next
        })

        console.log(`✅ Route ${idx + 1} loaded successfully (${latLngs.length} points)`)

      } catch (error) {
        // Retry with exponential backoff
        if (retryCount < 2) {
          const retryDelay = Math.pow(2, retryCount) * 1000 // 1s, 2s, 4s
          console.log(`⚠️ Route ${idx + 1} failed (${error.message}), retrying in ${retryDelay}ms (attempt ${retryCount + 2}/3)`)
          
          const retryTimeoutId = setTimeout(() => {
            fetchRouteWithRetry(move, idx, key, from, to, retryCount + 1)
          }, retryDelay)
          
          timeouts.push(retryTimeoutId)
          return
        }
        
        console.warn(`❌ Route ${idx + 1} failed after 3 attempts, using straight line fallback`)
      }
    }

    moves.forEach((move, idx) => {
      const key = getMoveKey(move, idx)
      if (routeCacheRef.current[key]) return

      const from = stationLookup.get(move.from_station_id) || (move.from_lat && move.from_lng ? { lat: move.from_lat, lng: move.from_lng } : null)
      const to = stationLookup.get(move.to_station_id) || (move.to_lat && move.to_lng ? { lat: move.to_lat, lng: move.to_lng } : null)

      if (!from || !to) return

      // Stagger requests with 500ms delay (OpenRouteService has better rate limits)
      const timeoutId = setTimeout(() => {
        fetchRouteWithRetry(move, idx, key, from, to, 0)
      }, idx * 500)

      timeouts.push(timeoutId)
    })

    return () => {
      isCancelled = true
      timeouts.forEach((id) => clearTimeout(id))
    }
  }, [moves, stationLookup])

  const vehiclePosition = useMemo(() => {
    if (!currentMove || (!fromStation && !toStation)) return null
    const key = currentMove ? getMoveKey(currentMove, activeMoveIndex) : null
    const routePoints = key ? routeCache[key] : null

    if (routePoints && routePoints.length > 0) {
      const ratio = Math.min(1, Math.max(0, progress / 100))
      if (routePoints.length === 1) {
        return routePoints[0]
      }

      const totalSegments = routePoints.length - 1
      const scaled = ratio * totalSegments
      const segmentIndex = Math.min(totalSegments - 1, Math.floor(scaled))
      const segmentRatio = scaled - segmentIndex

      const start = routePoints[segmentIndex]
      const end = routePoints[segmentIndex + 1] || start

      return [
        start[0] + (end[0] - start[0]) * segmentRatio,
        start[1] + (end[1] - start[1]) * segmentRatio
      ]
    }

    if (fromStation && toStation) {
      const ratio = Math.min(1, Math.max(0, progress / 100))
      const lat = fromStation.lat + (toStation.lat - fromStation.lat) * ratio
      const lng = fromStation.lng + (toStation.lng - fromStation.lng) * ratio
      return [lat, lng]
    }

    return null
  }, [currentMove, fromStation, toStation, progress, routeCache, activeMoveIndex])

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
      
      {/* Active route polyline */}
      {currentMove && (() => {
        const key = getMoveKey(currentMove, activeMoveIndex)
        const routePoints = routeCache[key]
        if (!routePoints || routePoints.length < 2) return null
        const color = getVehicleColor(currentMove)
        const isCompleted = progress >= 100
        return (
          <Polyline
            key={`active-route-${key}`}
            positions={routePoints}
            color={color}
            weight={5}
            opacity={isCompleted ? 0.4 : 0.85}
          />
        )
      })()}

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

        const before = station.before_optimization_bikes ?? station.current_bikes
        const after = station.current_bikes
        const delta = after - before

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
                    <span className="text-gray-600">🚲 Bikes Before:</span>
                    <span className="font-semibold">{before}</span>
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
                      <span className="font-semibold">
                        {after} bikes
                        {delta !== 0 && (
                          <span className={`ml-2 font-bold ${delta > 0 ? 'text-green-600' : 'text-red-500'}`}>
                            ({delta > 0 ? '+' : ''}{delta})
                          </span>
                        )}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </Popup>
          </Marker>
        )
      })}
      
      {/* Render children (for overlays like clustering) */}
      {children}
    </MapContainer>
  )
}
