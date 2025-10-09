import { useState, useEffect } from 'react'
import { Truck, DollarSign, Package, Plus, Edit, Trash2, Save, X } from 'lucide-react'

export default function VehicleManagement() {
  const [vehicles, setVehicles] = useState([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(null)
  const [showAddForm, setShowAddForm] = useState(false)

  useEffect(() => {
    fetchVehicles()
  }, [])

  const fetchVehicles = async () => {
    try {
      setLoading(true)
      const response = await fetch('http://localhost:8000/api/vehicles/')
      const data = await response.json()
      setVehicles(data)
    } catch (error) {
      console.error('Failed to fetch vehicles:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleUpdate = async (vehicleId, updates) => {
    try {
      const response = await fetch(`http://localhost:8000/api/vehicles/${vehicleId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      })
      
      if (response.ok) {
        await fetchVehicles()
        setEditing(null)
      }
    } catch (error) {
      console.error('Failed to update vehicle:', error)
    }
  }

  const handleDelete = async (vehicleId) => {
    if (!confirm('Are you sure you want to delete this vehicle?')) return
    
    try {
      await fetch(`http://localhost:8000/api/vehicles/${vehicleId}`, {
        method: 'DELETE'
      })
      await fetchVehicles()
    } catch (error) {
      console.error('Failed to delete vehicle:', error)
    }
  }

  const handleAdd = async (newVehicle) => {
    try {
      const response = await fetch('http://localhost:8000/api/vehicles/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newVehicle)
      })
      
      if (response.ok) {
        await fetchVehicles()
        setShowAddForm(false)
      }
    } catch (error) {
      console.error('Failed to add vehicle:', error)
    }
  }

  if (loading) {
    return <div className="flex justify-center p-8">Loading...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Vehicle Management</h2>
          <p className="text-gray-600">Manage vehicle types and costs for optimization</p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="btn btn-primary flex items-center gap-2"
        >
          <Plus className="h-5 w-5" />
          Add Vehicle Type
        </button>
      </div>

      {/* Add Vehicle Form */}
      {showAddForm && (
        <AddVehicleForm
          onSubmit={handleAdd}
          onCancel={() => setShowAddForm(false)}
        />
      )}

      {/* Vehicle List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {vehicles.map((vehicle) => (
          <VehicleCard
            key={vehicle.id}
            vehicle={vehicle}
            isEditing={editing === vehicle.id}
            onEdit={() => setEditing(vehicle.id)}
            onCancelEdit={() => setEditing(null)}
            onSave={(updates) => handleUpdate(vehicle.id, updates)}
            onDelete={() => handleDelete(vehicle.id)}
          />
        ))}
      </div>

      {/* Summary */}
      <div className="card">
        <h3 className="text-lg font-semibold mb-4">Fleet Summary</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-sm text-gray-600">Total Vehicle Types</p>
            <p className="text-2xl font-bold">{vehicles.length}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Total Vehicles</p>
            <p className="text-2xl font-bold">
              {vehicles.reduce((sum, v) => sum + v.available_count, 0)}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Total Capacity</p>
            <p className="text-2xl font-bold">
              {vehicles.reduce((sum, v) => sum + (v.capacity * v.available_count), 0)} bikes
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Avg Cost/Trip</p>
            <p className="text-2xl font-bold">
              ${(vehicles.reduce((sum, v) => sum + v.cost_per_trip, 0) / vehicles.length).toFixed(0)}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

function VehicleCard({ vehicle, isEditing, onEdit, onCancelEdit, onSave, onDelete }) {
  const [formData, setFormData] = useState(vehicle)

  const handleSave = () => {
    onSave({
      name: formData.name,
      capacity: parseInt(formData.capacity),
      cost_per_trip: parseFloat(formData.cost_per_trip),
      available_count: parseInt(formData.available_count)
    })
  }

  if (isEditing) {
    return (
      <div className="card">
        <div className="space-y-4">
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-3 py-2 border rounded-md"
            placeholder="Vehicle Name"
          />
          <input
            type="number"
            value={formData.capacity}
            onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
            className="w-full px-3 py-2 border rounded-md"
            placeholder="Capacity (bikes)"
          />
          <input
            type="number"
            step="0.01"
            value={formData.cost_per_trip}
            onChange={(e) => setFormData({ ...formData, cost_per_trip: e.target.value })}
            className="w-full px-3 py-2 border rounded-md"
            placeholder="Cost per Trip ($)"
          />
          <input
            type="number"
            value={formData.available_count}
            onChange={(e) => setFormData({ ...formData, available_count: e.target.value })}
            className="w-full px-3 py-2 border rounded-md"
            placeholder="Available Count"
          />
          <div className="flex gap-2">
            <button onClick={handleSave} className="btn btn-primary flex-1">
              <Save className="h-4 w-4 mr-2" />
              Save
            </button>
            <button onClick={onCancelEdit} className="btn btn-secondary flex-1">
              <X className="h-4 w-4 mr-2" />
              Cancel
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="card hover:shadow-lg transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="text-4xl">{vehicle.icon}</div>
          <div>
            <h3 className="font-bold text-lg">{vehicle.name}</h3>
            <p className="text-sm text-gray-600">ID: {vehicle.id}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onEdit}
            className="p-2 hover:bg-gray-100 rounded-md transition-colors"
            title="Edit"
          >
            <Edit className="h-4 w-4 text-gray-600" />
          </button>
          <button
            onClick={onDelete}
            className="p-2 hover:bg-red-50 rounded-md transition-colors"
            title="Delete"
          >
            <Trash2 className="h-4 w-4 text-red-600" />
          </button>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600 flex items-center gap-2">
            <Package className="h-4 w-4" />
            Capacity
          </span>
          <span className="font-semibold">{vehicle.capacity} bikes</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600 flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Cost/Trip
          </span>
          <span className="font-semibold">${vehicle.cost_per_trip}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600 flex items-center gap-2">
            <Truck className="h-4 w-4" />
            Available
          </span>
          <span className="font-semibold">{vehicle.available_count}</span>
        </div>
        <div className="pt-3 border-t">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Cost per Bike</span>
            <span className="font-semibold text-primary-600">
              ${(vehicle.cost_per_trip / vehicle.capacity).toFixed(2)}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

function AddVehicleForm({ onSubmit, onCancel }) {
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    capacity: 10,
    cost_per_trip: 100,
    icon: '🚗',
    available_count: 1
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    onSubmit({
      ...formData,
      capacity: parseInt(formData.capacity),
      cost_per_trip: parseFloat(formData.cost_per_trip),
      available_count: parseInt(formData.available_count)
    })
  }

  return (
    <div className="card">
      <h3 className="text-lg font-semibold mb-4">Add New Vehicle Type</h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <input
            type="text"
            value={formData.id}
            onChange={(e) => setFormData({ ...formData, id: e.target.value })}
            className="px-3 py-2 border rounded-md"
            placeholder="Vehicle ID (e.g., cargo_bike)"
            required
          />
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="px-3 py-2 border rounded-md"
            placeholder="Vehicle Name"
            required
          />
          <input
            type="number"
            value={formData.capacity}
            onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
            className="px-3 py-2 border rounded-md"
            placeholder="Capacity (bikes)"
            required
          />
          <input
            type="number"
            step="0.01"
            value={formData.cost_per_trip}
            onChange={(e) => setFormData({ ...formData, cost_per_trip: e.target.value })}
            className="px-3 py-2 border rounded-md"
            placeholder="Cost per Trip ($)"
            required
          />
          <input
            type="text"
            value={formData.icon}
            onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
            className="px-3 py-2 border rounded-md"
            placeholder="Icon (emoji)"
            required
          />
          <input
            type="number"
            value={formData.available_count}
            onChange={(e) => setFormData({ ...formData, available_count: e.target.value })}
            className="px-3 py-2 border rounded-md"
            placeholder="Available Count"
            required
          />
        </div>
        <div className="flex gap-2">
          <button type="submit" className="btn btn-primary flex-1">
            Add Vehicle
          </button>
          <button type="button" onClick={onCancel} className="btn btn-secondary flex-1">
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}
