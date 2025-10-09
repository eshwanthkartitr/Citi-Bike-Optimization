import { AlertTriangle, AlertCircle, Info } from 'lucide-react'

export default function AlertPanel({ stations }) {
  const getAlerts = () => {
    const alerts = []
    
    stations.forEach(station => {
      if (station.surplus_deficit < -10) {
        alerts.push({
          type: 'critical',
          station: station.name,
          message: `Critical shortage: ${Math.abs(station.surplus_deficit)} bikes needed`,
        })
      } else if (station.surplus_deficit < -5) {
        alerts.push({
          type: 'warning',
          station: station.name,
          message: `Low inventory: ${Math.abs(station.surplus_deficit)} bikes deficit`,
        })
      } else if (station.surplus_deficit > 10) {
        alerts.push({
          type: 'info',
          station: station.name,
          message: `Excess bikes: ${station.surplus_deficit} available for redistribution`,
        })
      }
    })
    
    return alerts.sort((a, b) => {
      const order = { critical: 0, warning: 1, info: 2 }
      return order[a.type] - order[b.type]
    })
  }

  const alerts = getAlerts()

  const getAlertIcon = (type) => {
    switch (type) {
      case 'critical':
        return <AlertCircle className="h-5 w-5 text-danger" />
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-warning" />
      case 'info':
        return <Info className="h-5 w-5 text-primary-600" />
      default:
        return null
    }
  }

  const getAlertColor = (type) => {
    switch (type) {
      case 'critical':
        return 'bg-red-50 border-red-200'
      case 'warning':
        return 'bg-yellow-50 border-yellow-200'
      case 'info':
        return 'bg-blue-50 border-blue-200'
      default:
        return 'bg-gray-50 border-gray-200'
    }
  }

  return (
    <div className="card h-[600px] overflow-y-auto">
      <h3 className="text-lg font-semibold mb-4">Alerts & Notifications</h3>
      
      {alerts.length === 0 ? (
        <div className="text-center text-gray-500 mt-8">
          <Info className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p>No active alerts</p>
        </div>
      ) : (
        <div className="space-y-3">
          {alerts.map((alert, index) => (
            <div
              key={index}
              className={`p-4 rounded-lg border ${getAlertColor(alert.type)}`}
            >
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  {getAlertIcon(alert.type)}
                </div>
                <div className="ml-3 flex-1">
                  <p className="font-semibold text-sm">{alert.station}</p>
                  <p className="text-sm mt-1 text-gray-700">{alert.message}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
