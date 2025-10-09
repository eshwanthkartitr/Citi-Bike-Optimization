import { Routes, Route } from 'react-router-dom'
import { OptimizationProvider } from './store/OptimizationContext'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Optimization from './pages/Optimization'
import Analytics from './pages/Analytics'
import VehicleManagement from './pages/VehicleManagement'
import NotFound from './pages/NotFound'
import AlgorithmComparison from './pages/AlgorithmComparison'

function App() {
  return (
    <OptimizationProvider>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="optimization" element={<Optimization />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="vehicles" element={<VehicleManagement />} />
          <Route path="compare" element={<AlgorithmComparison />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </OptimizationProvider>
  )
}

export default App
