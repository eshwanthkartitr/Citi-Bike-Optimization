import { Outlet, Link, useLocation } from 'react-router-dom'
import { MapPin, BarChart3, Zap, Truck, TrendingUp } from 'lucide-react'
import { clsx } from 'clsx'

const navigation = [
  { name: 'Dashboard', href: '/', icon: MapPin },
  { name: 'Optimization', href: '/optimization', icon: Zap },
  { name: 'Compare', href: '/compare', icon: TrendingUp },
  { name: 'Vehicles', href: '/vehicles', icon: Truck },
  { name: 'Analytics', href: '/analytics', icon: BarChart3 },
]

export default function Layout() {
  const location = useLocation()

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <MapPin className="h-8 w-8 text-primary-600" />
              <h1 className="ml-3 text-xl font-bold text-gray-900">
                Citi-Bike Optimization
              </h1>
            </div>
            <nav className="flex space-x-8">
              {navigation.map((item) => {
                const Icon = item.icon
                const isActive = location.pathname === item.href
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={clsx(
                      'flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors',
                      isActive
                        ? 'text-primary-600 bg-primary-50'
                        : 'text-gray-700 hover:text-primary-600 hover:bg-gray-50'
                    )}
                  >
                    <Icon className="h-5 w-5 mr-2" />
                    {item.name}
                  </Link>
                )
              })}
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Outlet />
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <p className="text-center text-sm text-gray-500">
            Citi-Bike Rebalancing Optimization System | Operations Research Project
          </p>
        </div>
      </footer>
    </div>
  )
}
