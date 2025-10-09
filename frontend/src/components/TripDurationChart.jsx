import { ResponsiveContainer, AreaChart, Area, CartesianGrid, XAxis, YAxis, Tooltip, Legend } from 'recharts'

const data = [
  { duration: '0-5', casual: 18, member: 12 },
  { duration: '5-10', casual: 26, member: 32 },
  { duration: '10-15', casual: 21, member: 28 },
  { duration: '15-20', casual: 14, member: 16 },
  { duration: '20-25', casual: 9, member: 8 },
  { duration: '25+', casual: 12, member: 4 }
]

export default function TripDurationChart() {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={data} margin={{ top: 16, right: 24, bottom: 8, left: 0 }}>
        <defs>
          <linearGradient id="colorCasual" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#f97316" stopOpacity={0.8} />
            <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="colorMember" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="duration" label={{ value: 'Trip duration (minutes)', position: 'insideBottom', offset: -5 }} />
        <YAxis label={{ value: 'Share of trips (%)', angle: -90, position: 'insideLeft' }} />
        <Tooltip formatter={(value) => `${value}%`} />
        <Legend />
        <Area type="monotone" dataKey="casual" stroke="#f97316" fill="url(#colorCasual)" name="Casual" />
        <Area type="monotone" dataKey="member" stroke="#3b82f6" fill="url(#colorMember)" name="Members" />
      </AreaChart>
    </ResponsiveContainer>
  )
}
