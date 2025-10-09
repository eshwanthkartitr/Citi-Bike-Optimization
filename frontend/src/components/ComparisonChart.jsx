import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

export default function ComparisonChart({ results }) {
  const data = results.map((result, index) => ({
    name: `Scenario ${index + 1}`,
    cost: result.total_cost,
    penalty: result.total_penalty,
    bikes_moved: result.total_bikes_moved,
    fairness: result.fairness_score * 100,
  }))

  return (
    <div className="space-y-6">
      {/* Cost Comparison */}
      <div>
        <h4 className="font-semibold mb-3">Cost & Penalty Comparison</h4>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="cost" fill="#3b82f6" name="Transport Cost ($)" />
            <Bar dataKey="penalty" fill="#f59e0b" name="Penalty ($)" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Performance Metrics */}
      <div>
        <h4 className="font-semibold mb-3">Performance Metrics</h4>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="bikes_moved" fill="#10b981" name="Bikes Moved" />
            <Bar dataKey="fairness" fill="#8b5cf6" name="Fairness Score (%)" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
