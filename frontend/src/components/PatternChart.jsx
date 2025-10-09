import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

export default function PatternChart({ pattern }) {
  // Mock data - replace with actual API data
  const data = Array.from({ length: 24 }, (_, i) => ({
    hour: i,
    demand: Math.sin(i / 3.8) * 50 + 100 + Math.random() * 20,
    supply: Math.cos(i / 4) * 45 + 95 + Math.random() * 15,
  }))

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis
          dataKey="hour"
          label={{ value: 'Hour of Day', position: 'insideBottom', offset: -5 }}
        />
        <YAxis label={{ value: 'Number of Bikes', angle: -90, position: 'insideLeft' }} />
        <Tooltip />
        <Legend />
        <Line
          type="monotone"
          dataKey="demand"
          stroke="#ef4444"
          name="Demand"
          strokeWidth={2}
        />
        <Line
          type="monotone"
          dataKey="supply"
          stroke="#10b981"
          name="Supply"
          strokeWidth={2}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
