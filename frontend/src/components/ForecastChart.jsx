import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart } from 'recharts'

export default function ForecastChart() {
  // Mock forecast data
  const data = Array.from({ length: 48 }, (_, i) => ({
    hour: i,
    forecast: Math.sin(i / 6) * 30 + 80 + Math.random() * 10,
    lower: Math.sin(i / 6) * 30 + 60,
    upper: Math.sin(i / 6) * 30 + 100,
  }))

  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis
          dataKey="hour"
          label={{ value: 'Hours Ahead', position: 'insideBottom', offset: -5 }}
        />
        <YAxis label={{ value: 'Predicted Demand', angle: -90, position: 'insideLeft' }} />
        <Tooltip />
        <Legend />
        <Area
          type="monotone"
          dataKey="upper"
          stroke="none"
          fill="#dbeafe"
          name="Upper Bound"
        />
        <Area
          type="monotone"
          dataKey="lower"
          stroke="none"
          fill="#ffffff"
          name="Lower Bound"
        />
        <Line
          type="monotone"
          dataKey="forecast"
          stroke="#3b82f6"
          strokeWidth={2}
          name="Forecast"
          dot={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
