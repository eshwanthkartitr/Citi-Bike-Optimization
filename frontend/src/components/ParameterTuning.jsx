import React, { useState, useEffect } from 'react';
import { Settings, Save, Download, Upload, Info, AlertCircle, Check } from 'lucide-react';

export default function ParameterTuning({ algorithm, onParametersChange, className = '' }) {
  const [parameters, setParameters] = useState(null);
  const [presets, setPresets] = useState([]);
  const [selectedPreset, setSelectedPreset] = useState('');
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [presetName, setPresetName] = useState('');
  const [presetDescription, setPresetDescription] = useState('');
  const [warnings, setWarnings] = useState([]);
  const [saveStatus, setSaveStatus] = useState('');

  useEffect(() => {
    loadDefaults();
    loadPresets();
  }, []);

  useEffect(() => {
    if (parameters) {
      validateParameters();
    }
  }, [parameters]);

  const loadDefaults = async () => {
    try {
      const res = await fetch('http://localhost:8000/api/parameters/defaults');
      const data = await res.json();
      setParameters({
        milp: data.data.milp,
        genetic: data.data.genetic,
        simulated_annealing: data.data.simulated_annealing,
        penalty_weights: data.data.penalty_weights
      });
    } catch (error) {
      console.error('Failed to load defaults:', error);
    }
  };

  const loadPresets = async () => {
    try {
      const res = await fetch('http://localhost:8000/api/parameters/presets');
      const data = await res.json();
      setPresets(data.data.presets);
    } catch (error) {
      console.error('Failed to load presets:', error);
    }
  };

  const validateParameters = async () => {
    try {
      const config = buildConfig();
      const res = await fetch('http://localhost:8000/api/parameters/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
      const data = await res.json();
      setWarnings(data.warnings || []);
    } catch (error) {
      console.error('Validation failed:', error);
    }
  };

  const buildConfig = () => {
    return {
      algorithm: algorithm,
      milp_params: algorithm === 'milp' ? parameters.milp : null,
      genetic_params: algorithm === 'genetic' ? parameters.genetic : null,
      sa_params: algorithm === 'simulated_annealing' ? parameters.simulated_annealing : null,
      penalty_weights: parameters.penalty_weights
    };
  };

  const handleParameterChange = (category, key, value) => {
    setParameters(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [key]: parseFloat(value) || 0
      }
    }));
  };

  const handlePresetSelect = async (presetId) => {
    if (!presetId) return;
    
    try {
      const res = await fetch(`http://localhost:8000/api/parameters/presets/${presetId}`);
      const data = await res.json();
      
      const preset = data.data;
      setParameters({
        milp: preset.config.milp_params || parameters.milp,
        genetic: preset.config.genetic_params || parameters.genetic,
        simulated_annealing: preset.config.sa_params || parameters.simulated_annealing,
        penalty_weights: preset.config.penalty_weights
      });
      
      setSelectedPreset(presetId);
    } catch (error) {
      console.error('Failed to load preset:', error);
    }
  };

  const handleSavePreset = async () => {
    if (!presetName.trim()) return;

    try {
      const config = buildConfig();
      const res = await fetch('http://localhost:8000/api/parameters/presets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          preset_name: presetName,
          description: presetDescription,
          config: config
        })
      });

      if (res.ok) {
        setSaveStatus('success');
        setTimeout(() => {
          setShowSaveDialog(false);
          setSaveStatus('');
          setPresetName('');
          setPresetDescription('');
          loadPresets();
        }, 1500);
      }
    } catch (error) {
      console.error('Failed to save preset:', error);
      setSaveStatus('error');
    }
  };

  const handleApply = () => {
    const config = buildConfig();
    onParametersChange(config);
  };

  if (!parameters) {
    return (
      <div className={`bg-white rounded-lg shadow-md p-6 ${className}`}>
        <div className="flex items-center justify-center">
          <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" />
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow-md ${className}`}>
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Algorithm Parameters
          </h2>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSaveDialog(true)}
              className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 text-sm"
            >
              <Save className="w-4 h-4" />
              Save Preset
            </button>
          </div>
        </div>

        {/* Preset Selector */}
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700">Load Preset:</label>
          <select
            value={selectedPreset}
            onChange={(e) => handlePresetSelect(e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Default Settings</option>
            {presets.map(preset => (
              <option key={preset.preset_id} value={preset.preset_id}>
                {preset.preset_name} - {preset.algorithm}
              </option>
            ))}
          </select>
        </div>

        {/* Warnings */}
        {warnings.length > 0 && (
          <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-yellow-800 mb-1">Parameter Warnings</h3>
                <ul className="text-xs text-yellow-700 space-y-1">
                  {warnings.map((warning, idx) => (
                    <li key={idx}>• {warning}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="p-6 space-y-6 max-h-96 overflow-y-auto">
        {/* MILP Parameters */}
        {algorithm === 'milp' && (
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              MILP Solver Settings
              <Info className="w-4 h-4 text-gray-400" title="Mixed Integer Linear Programming parameters" />
            </h3>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Timeout (seconds): {parameters.milp.timeout_seconds}
              </label>
              <input
                type="range"
                min="10"
                max="600"
                step="10"
                value={parameters.milp.timeout_seconds}
                onChange={(e) => handleParameterChange('milp', 'timeout_seconds', e.target.value)}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>10s (Fast)</span>
                <span>600s (Thorough)</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Gap Tolerance: {parameters.milp.gap_tolerance.toFixed(3)}
              </label>
              <input
                type="range"
                min="0.001"
                max="0.5"
                step="0.01"
                value={parameters.milp.gap_tolerance}
                onChange={(e) => handleParameterChange('milp', 'gap_tolerance', e.target.value)}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>0.001 (Optimal)</span>
                <span>0.5 (Relaxed)</span>
              </div>
            </div>
          </div>
        )}

        {/* Genetic Algorithm Parameters */}
        {algorithm === 'genetic' && (
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900">Genetic Algorithm Settings</h3>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Population Size: {parameters.genetic.population_size}
              </label>
              <input
                type="range"
                min="10"
                max="200"
                step="10"
                value={parameters.genetic.population_size}
                onChange={(e) => handleParameterChange('genetic', 'population_size', e.target.value)}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Generations: {parameters.genetic.generations}
              </label>
              <input
                type="range"
                min="10"
                max="500"
                step="10"
                value={parameters.genetic.generations}
                onChange={(e) => handleParameterChange('genetic', 'generations', e.target.value)}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Mutation Rate: {parameters.genetic.mutation_rate.toFixed(2)}
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={parameters.genetic.mutation_rate}
                onChange={(e) => handleParameterChange('genetic', 'mutation_rate', e.target.value)}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Crossover Rate: {parameters.genetic.crossover_rate.toFixed(2)}
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={parameters.genetic.crossover_rate}
                onChange={(e) => handleParameterChange('genetic', 'crossover_rate', e.target.value)}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
            </div>
          </div>
        )}

        {/* Simulated Annealing Parameters */}
        {algorithm === 'simulated_annealing' && (
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900">Simulated Annealing Settings</h3>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Initial Temperature: {parameters.simulated_annealing.initial_temperature}
              </label>
              <input
                type="range"
                min="100"
                max="5000"
                step="100"
                value={parameters.simulated_annealing.initial_temperature}
                onChange={(e) => handleParameterChange('simulated_annealing', 'initial_temperature', e.target.value)}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Cooling Rate: {parameters.simulated_annealing.cooling_rate.toFixed(3)}
              </label>
              <input
                type="range"
                min="0.8"
                max="0.99"
                step="0.01"
                value={parameters.simulated_annealing.cooling_rate}
                onChange={(e) => handleParameterChange('simulated_annealing', 'cooling_rate', e.target.value)}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Iterations: {parameters.simulated_annealing.iterations}
              </label>
              <input
                type="range"
                min="100"
                max="5000"
                step="100"
                value={parameters.simulated_annealing.iterations}
                onChange={(e) => handleParameterChange('simulated_annealing', 'iterations', e.target.value)}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
            </div>
          </div>
        )}

        {/* Penalty Weights - Always visible */}
        <div className="space-y-4 pt-4 border-t border-gray-200">
          <h3 className="font-semibold text-gray-900">Penalty Weights</h3>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Distance Weight: {parameters.penalty_weights.distance_weight.toFixed(2)}
            </label>
            <input
              type="range"
              min="0"
              max="10"
              step="0.1"
              value={parameters.penalty_weights.distance_weight}
              onChange={(e) => handleParameterChange('penalty_weights', 'distance_weight', e.target.value)}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Vehicle Cost Weight: {parameters.penalty_weights.vehicle_cost_weight.toFixed(2)}
            </label>
            <input
              type="range"
              min="0"
              max="10"
              step="0.1"
              value={parameters.penalty_weights.vehicle_cost_weight}
              onChange={(e) => handleParameterChange('penalty_weights', 'vehicle_cost_weight', e.target.value)}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Fairness Weight: {parameters.penalty_weights.fairness_weight.toFixed(2)}
            </label>
            <input
              type="range"
              min="0"
              max="10"
              step="0.1"
              value={parameters.penalty_weights.fairness_weight}
              onChange={(e) => handleParameterChange('penalty_weights', 'fairness_weight', e.target.value)}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            />
          </div>
        </div>
      </div>

      <div className="p-6 border-t border-gray-200 bg-gray-50">
        <button
          onClick={handleApply}
          className="w-full px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-semibold"
        >
          Apply Parameters & Optimize
        </button>
      </div>

      {/* Save Preset Dialog */}
      {showSaveDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-bold mb-4">Save Parameter Preset</h3>
            
            {saveStatus === 'success' && (
              <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-green-800">
                <Check className="w-5 h-5" />
                <span className="font-medium">Preset saved successfully!</span>
              </div>
            )}

            {saveStatus !== 'success' && (
              <>
                <div className="space-y-4 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Preset Name *
                    </label>
                    <input
                      type="text"
                      value={presetName}
                      onChange={(e) => setPresetName(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="e.g., Fast Optimization"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description
                    </label>
                    <textarea
                      value={presetDescription}
                      onChange={(e) => setPresetDescription(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      rows="3"
                      placeholder="Optional description..."
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => {
                      setShowSaveDialog(false);
                      setSaveStatus('');
                      setPresetName('');
                      setPresetDescription('');
                    }}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSavePreset}
                    disabled={!presetName.trim()}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Save
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
