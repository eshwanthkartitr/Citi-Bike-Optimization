import { DollarSign, MapPin, Bike, Scale } from 'lucide-react'

export default function KPICards({ kpis }) {
  const cards = [
    {
      title: 'Total Cost',
      value: `$${kpis.totalCost.toFixed(2)}`,
      icon: DollarSign,
      color: 'text-primary-600',
      bgColor: 'bg-primary-50',
    },
    {
      title: 'Stations Served',
      value: kpis.stationsServed,
      icon: MapPin,
      color: 'text-success',
      bgColor: 'bg-green-50',
    },
    {
      title: 'Bikes Rebalanced',
      value: kpis.bikesRebalanced,
      icon: Bike,
      color: 'text-warning',
      bgColor: 'bg-yellow-50',
    },
    {
      title: 'Fairness Score',
      value: kpis.fairnessScore.toFixed(2),
      icon: Scale,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {cards.map((card) => {
        const Icon = card.icon
        return (
          <div key={card.title} className="card">
            <div className="flex items-center">
              <div className={`${card.bgColor} p-3 rounded-lg`}>
                <Icon className={`h-6 w-6 ${card.color}`} />
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-600">{card.title}</p>
                <p className="text-2xl font-bold">{card.value}</p>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
