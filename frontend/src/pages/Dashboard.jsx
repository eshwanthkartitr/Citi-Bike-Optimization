import { useState, useEffect } from 'react'
import StationMap from '../components/StationMap'
import KPICards from '../components/KPICards'
import AlertPanel from '../components/AlertPanel'
import ClusteringOverlay from '../components/ClusteringOverlay'
import ParameterTuning from '../components/ParameterTuning'
import { OptimizationResultSkeleton } from '../components/LoadingSkeletons'
import { useOptimizationStore } from '../store/optimizationStore'
import { Play, Loader, SlidersHorizontal, Layers } from 'lucide-react'

const algorithmOptions = [
  {
    value: 'greedy',
    label: 'Greedy (fast < 1s)',
    description: 'Quick heuristic for instant feedback'
  },
  {
    value: 'genetic',
    label: 'Genetic (1-2s)',
    description: 'Evolutionary search exploring many routes'
  },
  {
    value: 'simulated_annealing',
    label: 'Simulated Annealing (2-3s)',
    description: 'Probabilistic search that escapes local minima'
  },
  {
    value: 'milp',
    label: 'MILP (precise, slower)',
    description: 'Full optimization with vehicle-level constraints'
  }
]

const mapBackendStations = (rawStations) => {
  if (!rawStations || rawStations.length === 0) return []
  return rawStations.map((station) => ({
    id: station.station_id ?? station.id,
    name: station.station_name ?? station.name,
    lat: station.latitude ?? station.lat,
    lng: station.longitude ?? station.lng,
    current_bikes: station.current_bikes,
    capacity: station.capacity,
    surplus_deficit: station.surplus_deficit,
    priority: station.priority || 'LOW',
    total_arrivals: station.total_arrivals ?? 0,
    total_departures: station.total_departures ?? 0,
    before_optimization_bikes: station.before_optimization_bikes ?? station.current_bikes,
    after_optimization_bikes: station.after_optimization_bikes ?? station.current_bikes
  }))
}

const applyMovesToStations = (currentStations, moves) => {
  if (!moves || moves.length === 0) return currentStations

  const lookup = new Map()
  currentStations.forEach((station) => {
    lookup.set(station.id, {
      ...station,
      before_optimization_bikes: station.before_optimization_bikes ?? station.current_bikes,
      after_optimization_bikes: station.after_optimization_bikes ?? station.current_bikes
    })
  })

  moves.forEach((move) => {
    const fromStation = lookup.get(move.from_station_id)
    const toStation = lookup.get(move.to_station_id)

    if (fromStation) {
      if (fromStation.before_optimization_bikes === undefined) {
        fromStation.before_optimization_bikes = fromStation.current_bikes
      }
      const bikesAfter = Math.max(0, fromStation.current_bikes - move.bikes_moved)
      fromStation.current_bikes = bikesAfter
      fromStation.surplus_deficit = fromStation.surplus_deficit - move.bikes_moved
      fromStation.after_optimization_bikes = bikesAfter
    }

    if (toStation) {
      if (toStation.before_optimization_bikes === undefined) {
        toStation.before_optimization_bikes = toStation.current_bikes
      }
      const bikesAfter = Math.min(toStation.capacity, toStation.current_bikes + move.bikes_moved)
      toStation.current_bikes = bikesAfter
      toStation.surplus_deficit = toStation.surplus_deficit + move.bikes_moved
      toStation.after_optimization_bikes = bikesAfter
    }
  })

  return Array.from(lookup.values())
}

export default function Dashboard() {
  const [stations, setStations] = useState([])
  const [loading, setLoading] = useState(true)
  const [optimizing, setOptimizing] = useState(false)
  const [optimizationResult, setOptimizationResult] = useState(null)
  const [mapMoves, setMapMoves] = useState([])
  const [selectedAlgorithm, setSelectedAlgorithm] = useState('greedy')
  const [showParameterTuning, setShowParameterTuning] = useState(false)
  const [showClustering, setShowClustering] = useState(false)
  const [customParameters, setCustomParameters] = useState(null)
  const [initialKpisCalculated, setInitialKpisCalculated] = useState(false)
  const { kpis } = useOptimizationStore()
  const selectedAlgorithmMeta = algorithmOptions.find((option) => option.value === selectedAlgorithm)

  useEffect(() => {
    // Fetch initial data
    const loadData = async () => {
      try {
        setLoading(true)
        await fetchStations()
        await fetchInitialKPIs()
      } catch (error) {
        console.error('Failed to load dashboard data:', error)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])
  
  // Update KPIs from optimization results
  useEffect(() => {
    if (optimizationResult) {
      // Update KPIs from optimization results
      useOptimizationStore.setState({
        kpis: {
          totalCost: optimizationResult.total_cost,
          stationsServed: optimizationResult.stations_served,
          bikesRebalanced: optimizationResult.total_bikes_moved,
          fairnessScore: optimizationResult.fairness_score
        }
      })
    }
  }, [optimizationResult])

  const runOptimization = async () => {
    try {
      setOptimizing(true)
      setMapMoves([])
      console.log(`🚀 Starting optimization using ${selectedAlgorithm} algorithm...`)
      
      // Build request body with custom parameters if available
      const requestBody = {
        algorithms: [selectedAlgorithm],
        constraints: {}
      }

      // Add custom parameters if tuning was used
      if (customParameters) {
        requestBody.custom_parameters = customParameters
      }
      
      // Use selected algorithm; comparison endpoint returns consistent shape
      const response = await fetch('http://localhost:8000/api/compare/compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      })
      
      if (!response.ok) {
        throw new Error(`Optimization failed: ${response.status}`)
      }
      
      const comparisonData = await response.json()
      const result = comparisonData.results?.[selectedAlgorithm]

      if (!result) {
        throw new Error('Selected algorithm did not return a result')
      }

  const executionSeconds = typeof result.execution_time === 'number' ? result.execution_time : 0
  console.log('✅ Optimization complete in', executionSeconds.toFixed(2), 'seconds!')

      const mappedStations = mapBackendStations(result.stations?.length ? result.stations : stations)
      const updatedStations = applyMovesToStations(mappedStations, result.moves || [])

  setStations(updatedStations)
      setMapMoves(result.moves || [])
      setOptimizationResult({ ...result, algorithm: selectedAlgorithm })
      
    } catch (error) {
      console.error('Failed to run optimization:', error)
      alert(`Optimization Failed: ${error.message}`)
    } finally {
      setOptimizing(false)
    }
  }

  const mapBackendStations = (rawStations) => {
    if (!rawStations || rawStations.length === 0) return []
    return rawStations.map((station) => ({
      id: station.station_id ?? station.id,
      name: station.station_name ?? station.name,
      lat: station.latitude ?? station.lat,
      lng: station.longitude ?? station.lng,
      current_bikes: station.current_bikes,
      capacity: station.capacity,
      surplus_deficit: station.surplus_deficit,
      priority: station.priority || 'LOW',
      total_arrivals: station.total_arrivals ?? 0,
      total_departures: station.total_departures ?? 0,
      before_optimization_bikes: station.before_optimization_bikes ?? station.current_bikes,
      after_optimization_bikes: station.after_optimization_bikes ?? station.current_bikes
    }))
  }

  const applyMovesToStations = (currentStations, moves) => {
    if (!moves || moves.length === 0) return currentStations

    const lookup = new Map()
    currentStations.forEach((station) => {
      lookup.set(station.id, {
        ...station,
        before_optimization_bikes: station.before_optimization_bikes ?? station.current_bikes,
        after_optimization_bikes: station.after_optimization_bikes ?? station.current_bikes
      })
    })

    moves.forEach((move) => {
      const fromStation = lookup.get(move.from_station_id)
      const toStation = lookup.get(move.to_station_id)

      if (fromStation) {
        if (fromStation.before_optimization_bikes === undefined) {
          fromStation.before_optimization_bikes = fromStation.current_bikes
        }
        const bikesAfter = Math.max(0, fromStation.current_bikes - move.bikes_moved)
        fromStation.current_bikes = bikesAfter
        fromStation.surplus_deficit = Math.max(-fromStation.capacity, fromStation.surplus_deficit - move.bikes_moved)
        fromStation.after_optimization_bikes = bikesAfter
      }

      if (toStation) {
        if (toStation.before_optimization_bikes === undefined) {
          toStation.before_optimization_bikes = toStation.current_bikes
        }
        const bikesAfter = Math.min(toStation.capacity, toStation.current_bikes + move.bikes_moved)
        toStation.current_bikes = bikesAfter
        toStation.surplus_deficit = Math.min(toStation.capacity, toStation.surplus_deficit + move.bikes_moved)
        toStation.after_optimization_bikes = bikesAfter
      }
    })

    return Array.from(lookup.values())
  }

  const fetchStations = async () => {
    try {
      console.log('Fetching real station data from API...')
      const response = await fetch('http://localhost:8000/api/stations/')
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      console.log(`✅ Loaded ${data.length} stations from 7 months of real data`)
      
      // Map to frontend format
      const mappedStations = data.map(station => ({
        id: station.station_id,
        name: station.station_name,
        lat: station.latitude,
        lng: station.longitude,
        current_bikes: station.current_bikes,
        capacity: station.capacity,
        surplus_deficit: station.surplus_deficit,
        priority: station.priority,
        total_arrivals: station.total_arrivals,
        total_departures: station.total_departures,
        before_optimization_bikes: station.current_bikes,
        after_optimization_bikes: station.current_bikes
      }))
      
      setStations(mappedStations)
      setMapMoves([])
      setOptimizationResult(null)
    } catch (error) {
      console.error('Failed to fetch stations:', error)
      // Show error to user
      setStations([])
    }
  }

  const fetchInitialKPIs = async () => {
    try {
      console.log('Fetching consistent initial KPIs from API...')
      const response = await fetch('http://localhost:8000/api/stats/kpis')
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const result = await response.json()
      console.log(`✅ Loaded consistent KPIs:`, result.data)
      
      // Set initial KPIs from backend (consistent across all page loads)
      useOptimizationStore.setState({
        kpis: {
          totalCost: result.data.total_cost,
          stationsServed: result.data.stations_served,
          bikesRebalanced: result.data.bikes_rebalanced,
          fairnessScore: result.data.fairness_score
        }
      })
      
      setInitialKpisCalculated(true)
    } catch (error) {
      console.error('Failed to fetch initial KPIs:', error)
      // Fallback to 0 values
      useOptimizationStore.setState({
        kpis: {
          totalCost: 0,
          stationsServed: 0,
          bikesRebalanced: 0,
          fairnessScore: 0
        }
      })
    }
  }

  if (loading) {
    return <OptimizationResultSkeleton />
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Dashboard</h2>
          <p className="mt-2 text-gray-600">
            {stations.length > 0 
              ? `Real-time overview of ${stations.length} stations from 547,979 trips (7 months)`
              : 'Loading station data...'
            }
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
          <div className="flex items-center gap-2 bg-gray-100 rounded-lg px-3 py-2">
            <SlidersHorizontal className="h-4 w-4 text-gray-500" />
            <div>
              <label htmlFor="algorithm" className="text-xs uppercase tracking-wide text-gray-500">
                Algorithm
              </label>
              <select
                id="algorithm"
                value={selectedAlgorithm}
                onChange={(event) => setSelectedAlgorithm(event.target.value)}
                className="bg-transparent text-sm font-semibold text-gray-800 focus:outline-none"
                disabled={optimizing}
              >
                {algorithmOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              {selectedAlgorithmMeta?.description && (
                <p className="text-[11px] text-gray-500 leading-tight">
                  {selectedAlgorithmMeta.description}
                </p>
              )}
            </div>
          </div>

          <button
            onClick={() => setShowParameterTuning(!showParameterTuning)}
            className={`btn flex items-center gap-2 px-4 py-3 ${
              showParameterTuning ? 'bg-blue-600 text-white' : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            <SlidersHorizontal className="h-5 w-5" />
            Tune Parameters
          </button>

          <button
            onClick={() => setShowClustering(!showClustering)}
            className={`btn flex items-center gap-2 px-4 py-3 ${
              showClustering ? 'bg-purple-600 text-white' : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Layers className="h-5 w-5" />
            Analysis
          </button>

          <button
            onClick={runOptimization}
            disabled={optimizing || stations.length === 0}
            className="btn btn-primary flex items-center gap-2 px-6 py-3"
          >
            {optimizing ? (
              <>
                <Loader className="h-5 w-5 animate-spin" />
                Optimizing...
              </>
            ) : (
              <>
                <Play className="h-5 w-5" />
                Run Optimization
              </>
            )}
          </button>
        </div>
      </div>

      {/* Parameter Tuning Panel */}
      {showParameterTuning && (
        <ParameterTuning
          algorithm={selectedAlgorithm}
          onParametersChange={(params) => {
            setCustomParameters(params)
            setShowParameterTuning(false)
            // Automatically trigger optimization with new parameters
            setTimeout(() => runOptimization(), 100)
          }}
        />
      )}

      {/* Optimization Results Banner */}
      {optimizationResult && (
        <div className="card bg-green-50 border-green-200">
          <div className="flex items-start gap-4">
            <div className="text-3xl">✅</div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-green-900 mb-2">
                Optimization Complete! 
              </h3>
              <p className="text-sm text-green-700 mb-4">
                Algorithm:{' '}
                <span className="font-semibold">
                  {algorithmOptions.find((option) => option.value === optimizationResult.algorithm)?.label ?? optimizationResult.algorithm}
                </span>
              </p>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                <div>
                  <p className="text-green-700">Total Cost</p>
                  <p className="text-xl font-bold text-green-900">${optimizationResult.total_cost.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-green-700">Bikes Moved</p>
                  <p className="text-xl font-bold text-green-900">{optimizationResult.total_bikes_moved}</p>
                </div>
                <div>
                  <p className="text-green-700">Moves</p>
                  <p className="text-xl font-bold text-green-900">{optimizationResult.moves.length}</p>
                </div>
                <div>
                  <p className="text-green-700">Fairness Score</p>
                  <p className="text-xl font-bold text-green-900">{(optimizationResult.fairness_score * 100).toFixed(0)}%</p>
                </div>
                <div>
                  <p className="text-green-700">Execution Time</p>
                  <p className="text-xl font-bold text-green-900">{optimizationResult.execution_time.toFixed(1)}s</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* KPI Cards */}
      <KPICards kpis={kpis} />

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Map - Takes 2 columns */}
        <div className="lg:col-span-2">
          <div className="card h-[675px]">
            <h3 className="text-lg font-semibold mb-4">Station Map</h3>
            <div className="h-[600px]">
              <StationMap style="height:90%" stations={stations} moves={mapMoves}>
                <ClusteringOverlay style="width:10px"stations={stations} enabled={showClustering} />
              </StationMap>
            </div>
            
          </div>
        </div>

        {/* Alerts - Takes 1 column */}
        <div className="lg:col-span-1">
          <AlertPanel stations={stations} />
        </div>
      </div>

      {/* Optimization Moves Table */}
      {optimizationResult && optimizationResult.moves && optimizationResult.moves.length > 0 && (
        <div className="card">
          <h3 className="text-lg font-semibold mb-4">
            Optimal Rebalancing Moves ({optimizationResult.moves.length} moves)
          </h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">#</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vehicle</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">From</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">To</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Bikes</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Distance</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cost</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {optimizationResult.moves.map((move, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm">{move.sequence}</td>
                    <td className="px-4 py-3 text-sm">
                      <span className="text-xl">{move.vehicle_icon || '🚚'}</span>
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {move.from_station_name}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {move.to_station_name}
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-primary-600">
                      {move.bikes_moved} 🚲
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {move.distance.toFixed(2)} km
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-green-600">
                      ${move.cost.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-50">
                <tr>
                  <td colSpan="4" className="px-4 py-3 text-sm font-semibold text-right">
                    TOTAL:
                  </td>
                  <td className="px-4 py-3 text-sm font-bold text-primary-600">
                    {optimizationResult.total_bikes_moved} 🚲
                  </td>
                  <td className="px-4 py-3 text-sm font-semibold">
                    {optimizationResult.total_distance.toFixed(2)} km
                  </td>
                  <td className="px-4 py-3 text-sm font-bold text-green-600">
                    ${optimizationResult.total_cost.toFixed(2)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
