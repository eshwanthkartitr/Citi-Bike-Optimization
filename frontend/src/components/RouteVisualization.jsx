import { MapContainer, TileLayer, Polyline, CircleMarker, Popup } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'

export default function RouteVisualization({ moves }) {
  const center = [40.7589, -73.9851]
  
  // Station coordinates from backend
  const stationCoords = {
    '1': [40.7661, -73.9764],
    '2': [40.7527, -73.9772],
    // Add more as needed
  }

  const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']

  return (
    <div className="card">
      <h3 className="text-lg font-semibold mb-4">Route Visualization</h3>
      <div className="h-[400px] rounded-lg overflow-hidden">
        <MapContainer
          center={center}
          zoom={12}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          
          {moves.map((move, index) => {
            const fromCoords = stationCoords[move.from_station_id] || center
            const toCoords = stationCoords[move.to_station_id] || center
            const color = colors[index % colors.length]
            
            return (
              <div key={move.sequence}>
                {/* Route line */}
                <Polyline
                  positions={[fromCoords, toCoords]}
                  pathOptions={{
                    color: color,
                    weight: 3,
                    opacity: 0.7,
                  }}
                />
                
                {/* Start marker */}
                <CircleMarker
                  center={fromCoords}
                  radius={8}
                  pathOptions={{
                    fillColor: color,
                    fillOpacity: 0.8,
                    color: 'white',
                    weight: 2,
                  }}
                >
                  <Popup>
                    <div className="text-sm">
                      <p className="font-semibold">Move #{move.sequence} Start</p>
                      <p>Station: {move.from_station_id}</p>
                    </div>
                  </Popup>
                </CircleMarker>
                
                {/* End marker */}
                <CircleMarker
                  center={toCoords}
                  radius={8}
                  pathOptions={{
                    fillColor: color,
                    fillOpacity: 0.8,
                    color: 'white',
                    weight: 2,
                  }}
                >
                  <Popup>
                    <div className="text-sm">
                      <p className="font-semibold">Move #{move.sequence} End</p>
                      <p>Station: {move.to_station_id}</p>
                      <p>Bikes: {move.bikes_moved}</p>
                    </div>
                  </Popup>
                </CircleMarker>
              </div>
            )
          })}
        </MapContainer>
      </div>
      
      {/* Legend */}
      <div className="mt-4 flex flex-wrap gap-3">
        {moves.slice(0, 5).map((move, index) => (
          <div key={move.sequence} className="flex items-center">
            <div
              className="w-4 h-4 rounded-full mr-2"
              style={{ backgroundColor: colors[index % colors.length] }}
            />
            <span className="text-sm">Move #{move.sequence}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
