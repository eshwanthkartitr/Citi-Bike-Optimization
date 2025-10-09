import { CheckCircle, DollarSign, Bike, MapPin, Scale, Clock } from 'lucide-react'

export default function OptimizationResults({ result }) {
  return (
    <div className="space-y-6">
      {/* Status Banner */}
      <div className="card bg-success/10 border-success/20">
        <div className="flex items-center">
          <CheckCircle className="h-6 w-6 text-success mr-3" />
          <div>
            <h3 className="font-semibold text-success">Optimization Complete</h3>
            <p className="text-sm text-gray-700">
              Status: {result.solver_status} | Execution Time: {result.execution_time.toFixed(2)}s
            </p>
          </div>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="card">
          <div className="flex items-center mb-2">
            <DollarSign className="h-5 w-5 text-primary-600 mr-2" />
            <span className="text-sm text-gray-600">Total Cost</span>
          </div>
          <p className="text-2xl font-bold">${result.total_cost.toFixed(2)}</p>
        </div>

        <div className="card">
          <div className="flex items-center mb-2">
            <DollarSign className="h-5 w-5 text-warning mr-2" />
            <span className="text-sm text-gray-600">Penalty</span>
          </div>
          <p className="text-2xl font-bold">${result.total_penalty.toFixed(2)}</p>
        </div>

        <div className="card">
          <div className="flex items-center mb-2">
            <Bike className="h-5 w-5 text-success mr-2" />
            <span className="text-sm text-gray-600">Bikes Moved</span>
          </div>
          <p className="text-2xl font-bold">{result.total_bikes_moved}</p>
        </div>

        <div className="card">
          <div className="flex items-center mb-2">
            <MapPin className="h-5 w-5 text-primary-600 mr-2" />
            <span className="text-sm text-gray-600">Stations Served</span>
          </div>
          <p className="text-2xl font-bold">{result.stations_served}</p>
        </div>

        <div className="card">
          <div className="flex items-center mb-2">
            <MapPin className="h-5 w-5 text-warning mr-2" />
            <span className="text-sm text-gray-600">Total Distance</span>
          </div>
          <p className="text-2xl font-bold">{result.total_distance.toFixed(1)} mi</p>
        </div>

        <div className="card">
          <div className="flex items-center mb-2">
            <Scale className="h-5 w-5 text-purple-600 mr-2" />
            <span className="text-sm text-gray-600">Fairness Score</span>
          </div>
          <p className="text-2xl font-bold">{result.fairness_score.toFixed(2)}</p>
        </div>
      </div>

      {/* Moves Table */}
      <div className="card">
        <h3 className="text-lg font-semibold mb-4">Rebalancing Moves ({result.moves.length})</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 px-3 text-sm font-medium text-gray-700">#</th>
                <th className="text-left py-2 px-3 text-sm font-medium text-gray-700">Vehicle</th>
                <th className="text-left py-2 px-3 text-sm font-medium text-gray-700">From</th>
                <th className="text-left py-2 px-3 text-sm font-medium text-gray-700">To</th>
                <th className="text-left py-2 px-3 text-sm font-medium text-gray-700">Bikes</th>
                <th className="text-left py-2 px-3 text-sm font-medium text-gray-700">Distance</th>
                <th className="text-left py-2 px-3 text-sm font-medium text-gray-700">Cost</th>
              </tr>
            </thead>
            <tbody>
              {result.moves.map((move) => (
                <tr key={move.sequence} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-3 text-sm">{move.sequence}</td>
                  <td className="py-3 px-3 text-sm capitalize">{move.vehicle_type}</td>
                  <td className="py-3 px-3 text-sm">{move.from_station_id}</td>
                  <td className="py-3 px-3 text-sm">{move.to_station_id}</td>
                  <td className="py-3 px-3 text-sm font-medium">{move.bikes_moved}</td>
                  <td className="py-3 px-3 text-sm">{move.distance.toFixed(1)} mi</td>
                  <td className="py-3 px-3 text-sm">${move.cost.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
