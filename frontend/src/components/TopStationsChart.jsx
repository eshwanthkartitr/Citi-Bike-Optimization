import { ResponsiveContainer, BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip, Legend } from 'recharts'

const data = [
  { station: 'Grove St PATH', departures: 18450, arrivals: 17980 },
  { station: 'Newport Pkwy', departures: 15860, arrivals: 16120 },
  { station: 'Hamilton Park', departures: 13240, arrivals: 12890 },
  { station: 'Harsimus Cove', departures: 11890, arrivals: 12110 },
  { station: 'Exchange Place', departures: 14320, arrivals: 14670 },
  { station: 'Harborside', departures: 10980, arrivals: 10670 }
]

export default function TopStationsChart() {
  return (
    <ResponsiveContainer width="100%" height={320}>
      <BarChart data={data} margin={{ top: 16, right: 16, bottom: 8, left: 8 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="station" tick={{ fontSize: 12 }} interval={0} angle={-20} dy={10} />
        <YAxis tick={{ fontSize: 12 }} label={{ value: 'Trips', angle: -90, position: 'insideLeft' }} />
        <Tooltip formatter={(value) => value.toLocaleString()} />
        <Legend />
        <Bar dataKey="departures" name="Departures" fill="#6366f1" radius={[4, 4, 0, 0]} />
        <Bar dataKey="arrivals" name="Arrivals" fill="#22c55e" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
