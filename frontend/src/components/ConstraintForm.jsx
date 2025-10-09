export default function ConstraintForm({ constraints, onChange }) {
  const handleChange = (key, value) => {
    onChange({ ...constraints, [key]: value })
  }

  const addVehicle = () => {
    const newVehicle = {
      vehicle_type: 'truck',
      capacity: 30,
      cost_per_mile: 2.5,
      available_count: 1
    }
    onChange({
      ...constraints,
      vehicles: [...constraints.vehicles, newVehicle]
    })
  }

  const removeVehicle = (index) => {
    const newVehicles = constraints.vehicles.filter((_, i) => i !== index)
    onChange({ ...constraints, vehicles: newVehicles })
  }

  return (
    <div className="card space-y-6">
      <h3 className="text-lg font-semibold">Optimization Constraints</h3>

      {/* Time Window */}
      <div>
        <label className="label">Rebalancing Time Window</label>
        <div className="flex items-center gap-3">
          <input
            type="number"
            min="0"
            max="23"
            value={constraints.timeWindowStart}
            onChange={(e) => handleChange('timeWindowStart', parseInt(e.target.value))}
            className="input flex-1"
          />
          <span className="text-gray-500">to</span>
          <input
            type="number"
            min="0"
            max="23"
            value={constraints.timeWindowEnd}
            onChange={(e) => handleChange('timeWindowEnd', parseInt(e.target.value))}
            className="input flex-1"
          />
        </div>
        <p className="text-xs text-gray-500 mt-1">Hours in 24-hour format</p>
      </div>

      {/* Shortage Penalty */}
      <div>
        <label className="label">
          Shortage Penalty ($)
          <span className="ml-2 text-gray-500 font-normal">
            {constraints.shortagePenalty}
          </span>
        </label>
        <input
          type="range"
          min="0"
          max="50"
          step="0.5"
          value={constraints.shortagePenalty}
          onChange={(e) => handleChange('shortagePenalty', parseFloat(e.target.value))}
          className="w-full"
        />
        <p className="text-xs text-gray-500 mt-1">
          Cost per bike shortage at any station
        </p>
      </div>

      {/* Fairness Weight */}
      <div>
        <label className="label">
          Fairness Weight
          <span className="ml-2 text-gray-500 font-normal">
            {constraints.fairnessWeight.toFixed(2)}
          </span>
        </label>
        <input
          type="range"
          min="0"
          max="1"
          step="0.05"
          value={constraints.fairnessWeight}
          onChange={(e) => handleChange('fairnessWeight', parseFloat(e.target.value))}
          className="w-full"
        />
        <p className="text-xs text-gray-500 mt-1">
          Higher values prioritize remote/critical stations
        </p>
      </div>

      {/* Max Distance */}
      <div>
        <label className="label">Max Distance per Route (miles)</label>
        <input
          type="number"
          min="1"
          max="50"
          step="0.5"
          value={constraints.maxDistance}
          onChange={(e) => handleChange('maxDistance', parseFloat(e.target.value))}
          className="input w-full"
        />
      </div>

      {/* Min Station Bikes */}
      <div>
        <label className="label">Minimum Bikes per Station</label>
        <input
          type="number"
          min="0"
          max="10"
          value={constraints.minStationBikes}
          onChange={(e) => handleChange('minStationBikes', parseInt(e.target.value))}
          className="input w-full"
        />
      </div>

      {/* Vehicles */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <label className="label mb-0">Vehicle Fleet</label>
          <button onClick={addVehicle} className="text-sm text-primary-600 hover:text-primary-700">
            + Add Vehicle
          </button>
        </div>
        
        {constraints.vehicles.length === 0 ? (
          <p className="text-sm text-gray-500">No vehicles configured</p>
        ) : (
          <div className="space-y-2">
            {constraints.vehicles.map((vehicle, index) => (
              <div key={index} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                <select
                  value={vehicle.vehicle_type}
                  className="input flex-1 text-sm"
                  disabled
                >
                  <option value="truck">Truck</option>
                  <option value="van">Van</option>
                  <option value="bike_trailer">Bike Trailer</option>
                </select>
                <button
                  onClick={() => removeVehicle(index)}
                  className="text-danger hover:text-red-700"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
