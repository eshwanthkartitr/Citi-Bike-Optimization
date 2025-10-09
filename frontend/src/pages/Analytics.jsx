import { useState } from 'react'
import { Calendar, TrendingUp, Users, Clock } from 'lucide-react'
import PatternChart from '../components/PatternChart'
import ForecastChart from '../components/ForecastChart'
import TopStationsChart from '../components/TopStationsChart'
import RiderMixChart from '../components/RiderMixChart'
import TripDurationChart from '../components/TripDurationChart'

export default function Analytics() {
  const [dateRange, setDateRange] = useState({
    start: '2025-01-01',
    end: '2025-07-31'
  })
  
  const [selectedPattern, setSelectedPattern] = useState('commute')

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-gray-900">Analytics</h2>
        <p className="mt-2 text-gray-600">
          Historical patterns, trends, and demand forecasting
        </p>
      </div>

      {/* Date Range Selector */}
      <div className="card">
        <div className="flex items-center gap-4">
          <Calendar className="h-5 w-5 text-gray-500" />
          <input
            type="date"
            value={dateRange.start}
            onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
            className="input"
          />
          <span className="text-gray-500">to</span>
          <input
            type="date"
            value={dateRange.end}
            onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
            className="input"
          />
          <button className="btn-primary ml-auto">Apply</button>
        </div>
      </div>

      {/* Pattern Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Demand Patterns</h3>
            <select
              value={selectedPattern}
              onChange={(e) => setSelectedPattern(e.target.value)}
              className="input"
            >
              <option value="commute">Commute</option>
              <option value="leisure">Leisure</option>
              <option value="weekend">Weekend</option>
              <option value="event">Special Events</option>
            </select>
          </div>
          <PatternChart pattern={selectedPattern} />
        </div>

        <div className="card">
          <h3 className="text-lg font-semibold mb-4">Demand Forecast</h3>
          <ForecastChart />
        </div>
      </div>

      {/* Additional Insights */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="card xl:col-span-2">
          <h3 className="text-lg font-semibold mb-4">Top Stations Activity</h3>
          <p className="text-sm text-gray-500 mb-3">
            Comparing departures and arrivals per station helps spot imbalances before they escalate.
          </p>
          <TopStationsChart />
        </div>
        <div className="card">
          <h3 className="text-lg font-semibold mb-4">Rider Mix (%)</h3>
          <p className="text-sm text-gray-500 mb-3">
            Understand who is driving demand to tailor promotions and fleet placement.
          </p>
          <RiderMixChart />
        </div>
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Trip Duration Distribution</h3>
          <span className="text-xs uppercase tracking-wide text-gray-500">Share of Trips</span>
        </div>
        <TripDurationChart />
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card">
          <div className="flex items-center">
            <TrendingUp className="h-8 w-8 text-primary-600 mr-3" />
            <div>
              <p className="text-sm text-gray-600">Peak Demand Hour</p>
              <p className="text-2xl font-bold">8:00 AM</p>
            </div>
          </div>
        </div>
        
        <div className="card">
          <div className="flex items-center">
            <Users className="h-8 w-8 text-success mr-3" />
            <div>
              <p className="text-sm text-gray-600">Most Active Station</p>
              <p className="text-2xl font-bold">Grand Central</p>
            </div>
          </div>
        </div>
        
        <div className="card">
          <div className="flex items-center">
            <Clock className="h-8 w-8 text-warning mr-3" />
            <div>
              <p className="text-sm text-gray-600">Avg Trip Duration</p>
              <p className="text-2xl font-bold">15 min</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
