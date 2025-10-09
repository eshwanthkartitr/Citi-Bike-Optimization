import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Play, Settings, TrendingUp } from 'lucide-react'
import { useOptimization } from '../store/OptimizationContext'
import ConstraintForm from '../components/ConstraintForm'
import LiveAnimationView from '../components/LiveAnimationView'

export default function Optimization() {
  const navigate = useNavigate()
  const { setOptimizationResult } = useOptimization()
  const [selectedAlgorithm, setSelectedAlgorithm] = useState('greedy')
  const [constraints, setConstraints] = useState({
    timeWindowStart: 1,
    timeWindowEnd: 5,
    shortagePenalty: 10.0,
    fairnessWeight: 0.3,
    maxDistance: 10.0,
    minStationBikes: 2,
    vehicles: []
  })
  
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  
  const algorithms = [
    { id: 'greedy', name: '⚡ Greedy (Fast - <1s)', description: 'Quick heuristic' },
    { id: 'genetic', name: '🧬 Genetic Algorithm (5-10s)', description: 'Balanced quality' },
    { id: 'simulated_annealing', name: '🔥 Simulated Annealing (5-15s)', description: 'Exploration' },
    { id: 'milp', name: '🎯 MILP (Optimal - 5min)', description: 'Best solution' }
  ]

  const handleRunOptimization = async () => {
    try {
      setLoading(true)
      
      // Use selected algorithm
      const response = await fetch('http://localhost:8000/api/compare/compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          algorithms: [selectedAlgorithm],
          constraints: {}
        })
      })
      
      if (!response.ok) {
        throw new Error('Optimization failed')
      }
      
      const comparisonData = await response.json()
      const data = comparisonData.results[selectedAlgorithm] // Get selected algorithm results
      
      setResult(data)
      setOptimizationResult(data) // Save to context for animation
      setLoading(false)
      
    } catch (error) {
      console.error('Optimization failed:', error)
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Optimization</h2>
          <p className="mt-2 text-gray-600">
            Choose algorithm and run bike rebalancing optimization
          </p>
        </div>
        <div className="flex gap-3 items-center">
          {/* Algorithm Selector */}
          <div className="flex flex-col">
            <label className="text-xs text-gray-600 mb-1">Algorithm</label>
            <select
              value={selectedAlgorithm}
              onChange={(e) => setSelectedAlgorithm(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {algorithms.map(algo => (
                <option key={algo.id} value={algo.id}>
                  {algo.name}
                </option>
              ))}
            </select>
          </div>
          
          <button
            onClick={handleRunOptimization}
            disabled={loading}
            className="btn-primary flex items-center mt-5"
          >
            <Play className="h-5 w-5 mr-2" />
            {loading ? 'Running...' : 'Run Optimization'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Constraints Form */}
        <div className="lg:col-span-1">
          <ConstraintForm 
            constraints={constraints}
            onChange={setConstraints}
          />
        </div>

        {/* Results */}
        <div className="lg:col-span-2 space-y-6">
          {loading && (
            <div className="card flex items-center justify-center h-96">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4" />
                <p className="text-gray-600">Running optimization...</p>
              </div>
            </div>
          )}
          
          {result && !loading && (
            <>
              {/* Live Animation */}
              <div className="card p-0 overflow-hidden" style={{ height: '600px' }}>
                <LiveAnimationView />
              </div>
              
              {/* Quick Stats */}
              <div className="grid grid-cols-4 gap-4">
                <div className="card">
                  <div className="text-sm text-gray-600">Total Cost</div>
                  <div className="text-2xl font-bold text-blue-600">${result.total_cost?.toFixed(2)}</div>
                </div>
                <div className="card">
                  <div className="text-sm text-gray-600">Bikes Moved</div>
                  <div className="text-2xl font-bold text-green-600">{result.total_bikes_moved}</div>
                </div>
                <div className="card">
                  <div className="text-sm text-gray-600">Stations Served</div>
                  <div className="text-2xl font-bold text-purple-600">{result.stations_served}</div>
                </div>
                <div className="card">
                  <div className="text-sm text-gray-600">Fairness Score</div>
                  <div className="text-2xl font-bold text-orange-600">{result.fairness_score?.toFixed(3)}</div>
                </div>
              </div>
              
              {/* Action Button */}
              <div className="card">
                <button
                  onClick={() => navigate('/compare')}
                  className="w-full px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center justify-center gap-2"
                >
                  <TrendingUp size={20} />
                  Compare with Other Algorithms
                </button>
              </div>
            </>
          )}
          
          {!result && !loading && (
            <div className="card flex items-center justify-center h-96">
              <div className="text-center text-gray-500">
                <Settings className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <p>Configure constraints and run optimization to see results</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
