import { ResponsiveContainer, PieChart, Pie, Tooltip, Cell, Legend } from 'recharts'

const data = [
  { name: 'Annual Members', value: 68 },
  { name: 'Casual Riders', value: 22 },
  { name: 'Tourists / Day Pass', value: 10 }
]

const COLORS = ['#0ea5e9', '#f97316', '#facc15']

export default function RiderMixChart() {
  return (
    <ResponsiveContainer width="100%" height={320}>
      <PieChart>
        <Pie
          dataKey="value"
          data={data}
          cx="50%"
          cy="50%"
          outerRadius={100}
          innerRadius={55}
          paddingAngle={4}
          label={({ name, value }) => `${name} (${value}%)`}
        >
          {data.map((entry, index) => (
            <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip formatter={(value) => `${value}%`} />
        <Legend verticalAlign="bottom" height={36} />
      </PieChart>
    </ResponsiveContainer>
  )
}
