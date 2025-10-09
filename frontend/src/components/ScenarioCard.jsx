import { Trash2, Edit2 } from 'lucide-react'

export default function ScenarioCard({ scenario, onUpdate, onRemove }) {
  return (
    <div className="card">
      <div className="flex justify-between items-start mb-4">
        <input
          type="text"
          value={scenario.name}
          onChange={(e) => onUpdate({ name: e.target.value })}
          className="input font-semibold"
        />
        <button
          onClick={onRemove}
          className="text-danger hover:text-red-700 ml-2"
        >
          <Trash2 className="h-5 w-5" />
        </button>
      </div>

      <div className="space-y-4">
        <div>
          <label className="label">Demand Multiplier</label>
          <input
            type="number"
            min="0.1"
            max="3"
            step="0.1"
            value={scenario.demandMultiplier}
            onChange={(e) => onUpdate({ demandMultiplier: parseFloat(e.target.value) })}
            className="input w-full"
          />
          <p className="text-xs text-gray-500 mt-1">
            {scenario.demandMultiplier}x normal demand
          </p>
        </div>

        <div>
          <label className="label">Event Type</label>
          <select
            value={scenario.eventType || ''}
            onChange={(e) => onUpdate({ eventType: e.target.value || null })}
            className="input w-full"
          >
            <option value="">None</option>
            <option value="marathon">Marathon</option>
            <option value="concert">Concert</option>
            <option value="holiday">Holiday</option>
            <option value="rush_hour">Rush Hour</option>
          </select>
        </div>

        <div>
          <label className="label">Time Window</label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min="0"
              max="23"
              value={scenario.constraints.timeWindowStart}
              onChange={(e) => onUpdate({
                constraints: {
                  ...scenario.constraints,
                  timeWindowStart: parseInt(e.target.value)
                }
              })}
              className="input flex-1"
            />
            <span className="text-gray-500">-</span>
            <input
              type="number"
              min="0"
              max="23"
              value={scenario.constraints.timeWindowEnd}
              onChange={(e) => onUpdate({
                constraints: {
                  ...scenario.constraints,
                  timeWindowEnd: parseInt(e.target.value)
                }
              })}
              className="input flex-1"
            />
          </div>
        </div>

        <div>
          <label className="label">
            Shortage Penalty: ${scenario.constraints.shortagePenalty}
          </label>
          <input
            type="range"
            min="0"
            max="50"
            step="0.5"
            value={scenario.constraints.shortagePenalty}
            onChange={(e) => onUpdate({
              constraints: {
                ...scenario.constraints,
                shortagePenalty: parseFloat(e.target.value)
              }
            })}
            className="w-full"
          />
        </div>

        <div>
          <label className="label">
            Fairness Weight: {scenario.constraints.fairnessWeight.toFixed(2)}
          </label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={scenario.constraints.fairnessWeight}
            onChange={(e) => onUpdate({
              constraints: {
                ...scenario.constraints,
                fairnessWeight: parseFloat(e.target.value)
              }
            })}
            className="w-full"
          />
        </div>
      </div>
    </div>
  )
}
