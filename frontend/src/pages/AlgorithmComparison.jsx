import React, { useState, useEffect } from 'react';
import { TrendingUp, Zap, Brain, Flame, Award, Clock, DollarSign } from 'lucide-react';

export default function AlgorithmComparison() {
  const [algorithms, setAlgorithms] = useState([]);
  const [selectedAlgos, setSelectedAlgos] = useState(['milp', 'greedy', 'genetic']);
  const [comparison, setComparison] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState({});

  useEffect(() => {
    fetchAlgorithms();
  }, []);

  const fetchAlgorithms = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/compare/algorithms');
      const data = await response.json();
      setAlgorithms(data.algorithms);
    } catch (error) {
      console.error('Failed to fetch algorithms:', error);
    }
  };

  const runComparison = async () => {
    setIsLoading(true);
    setComparison(null);
    setProgress({});

    try {
      // Simulate progress for each algorithm
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          const newProgress = { ...prev };
          selectedAlgos.forEach(algo => {
            if (!newProgress[algo]) newProgress[algo] = 0;
            if (newProgress[algo] < 95) {
              newProgress[algo] += Math.random() * 10;
            }
          });
          return newProgress;
        });
      }, 500);

      const response = await fetch('http://localhost:8000/api/compare/compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          algorithms: selectedAlgos,
          constraints: {}
        })
      });

      clearInterval(progressInterval);
      const data = await response.json();
      setComparison(data);
      
      // Set all to 100%
      const finalProgress = {};
      selectedAlgos.forEach(algo => finalProgress[algo] = 100);
      setProgress(finalProgress);
    } catch (error) {
      console.error('Comparison failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getAlgoIcon = (algoId) => {
    switch(algoId) {
      case 'milp': return <TrendingUp className="text-purple-600" />;
      case 'greedy': return <Zap className="text-green-600" />;
      case 'genetic': return <Brain className="text-blue-600" />;
      case 'simulated_annealing': return <Flame className="text-orange-600" />;
      default: return <Award />;
    }
  };

  const getAlgoColor = (algoId) => {
    switch(algoId) {
      case 'milp': return 'bg-purple-100 border-purple-300';
      case 'greedy': return 'bg-green-100 border-green-300';
      case 'genetic': return 'bg-blue-100 border-blue-300';
      case 'simulated_annealing': return 'bg-orange-100 border-orange-300';
      default: return 'bg-gray-100 border-gray-300';
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-6 flex items-center gap-2">
        <TrendingUp size={32} />
        Algorithm Comparison
      </h1>

      {/* Algorithm Selection */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Select Algorithms to Compare</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {algorithms.map(algo => (
            <div
              key={algo.id}
              onClick={() => {
                if (selectedAlgos.includes(algo.id)) {
                  setSelectedAlgos(selectedAlgos.filter(a => a !== algo.id));
                } else {
                  setSelectedAlgos([...selectedAlgos, algo.id]);
                }
              }}
              className={`p-4 border-2 rounded-lg cursor-pointer transition ${
                selectedAlgos.includes(algo.id)
                  ? getAlgoColor(algo.id)
                  : 'bg-white border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                {getAlgoIcon(algo.id)}
                <h3 className="font-semibold">{algo.name}</h3>
              </div>
              <p className="text-sm text-gray-600 mb-2">{algo.description}</p>
              <div className="flex gap-2 text-xs">
                <span className="px-2 py-1 bg-gray-100 rounded">{algo.speed}</span>
                <span className="px-2 py-1 bg-gray-100 rounded">{algo.quality}</span>
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={runComparison}
          disabled={isLoading || selectedAlgos.length < 2}
          className="mt-6 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
        >
          <TrendingUp size={20} />
          {isLoading ? 'Running Comparison...' : `Compare ${selectedAlgos.length} Algorithms`}
        </button>
      </div>

      {/* Progress Bars */}
      {isLoading && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Running Optimization...</h2>
          {selectedAlgos.map(algo => (
            <div key={algo} className="mb-4">
              <div className="flex justify-between mb-1">
                <span className="font-medium capitalize">{algo.replace('_', ' ')}</span>
                <span>{Math.round(progress[algo] || 0)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="bg-blue-600 h-3 rounded-full transition-all duration-500"
                  style={{ width: `${progress[algo] || 0}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Comparison Results */}
      {comparison && (
        <>
          {/* Winners */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-gradient-to-br from-yellow-100 to-yellow-200 rounded-lg shadow p-4">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="text-yellow-700" size={24} />
                <h3 className="font-semibold">Lowest Cost</h3>
              </div>
              <p className="text-2xl font-bold text-yellow-800 capitalize">
                {comparison.winner.lowest_cost.replace('_', ' ')}
              </p>
              <p className="text-sm text-yellow-700">
                ${comparison.results[comparison.winner.lowest_cost].total_cost.toFixed(2)}
              </p>
            </div>

            <div className="bg-gradient-to-br from-green-100 to-green-200 rounded-lg shadow p-4">
              <div className="flex items-center gap-2 mb-2">
                <Award className="text-green-700" size={24} />
                <h3 className="font-semibold">Best Fairness</h3>
              </div>
              <p className="text-2xl font-bold text-green-800 capitalize">
                {comparison.winner.highest_fairness.replace('_', ' ')}
              </p>
              <p className="text-sm text-green-700">
                {comparison.results[comparison.winner.highest_fairness].fairness_score.toFixed(3)}
              </p>
            </div>

            <div className="bg-gradient-to-br from-blue-100 to-blue-200 rounded-lg shadow p-4">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="text-blue-700" size={24} />
                <h3 className="font-semibold">Fastest</h3>
              </div>
              <p className="text-2xl font-bold text-blue-800 capitalize">
                {comparison.winner.fastest.replace('_', ' ')}
              </p>
              <p className="text-sm text-blue-700">
                {comparison.results[comparison.winner.fastest].execution_time.toFixed(2)}s
              </p>
            </div>

            <div className="bg-gradient-to-br from-purple-100 to-purple-200 rounded-lg shadow p-4">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="text-purple-700" size={24} />
                <h3 className="font-semibold">Overall Best</h3>
              </div>
              <p className="text-2xl font-bold text-purple-800 capitalize">
                {comparison.winner.overall_best.replace('_', ' ')}
              </p>
              <p className="text-sm text-purple-700">Best cost/quality ratio</p>
            </div>
          </div>

          {/* Detailed Comparison Table */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold">Algorithm</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold">Total Cost</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold">Bikes Moved</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold">Stations</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold">Fairness</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold">Time (s)</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold">Moves</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(comparison.results).map(([algo, result]) => (
                  <tr key={algo} className="border-t hover:bg-gray-50">
                    <td className="px-6 py-4 flex items-center gap-2">
                      {getAlgoIcon(algo)}
                      <span className="font-medium capitalize">{algo.replace('_', ' ')}</span>
                    </td>
                    <td className="px-6 py-4">${result.total_cost.toFixed(2)}</td>
                    <td className="px-6 py-4">{result.total_bikes_moved}</td>
                    <td className="px-6 py-4">{result.stations_served}</td>
                    <td className="px-6 py-4">{result.fairness_score.toFixed(3)}</td>
                    <td className="px-6 py-4">{result.execution_time.toFixed(2)}</td>
                    <td className="px-6 py-4">{result.moves.length}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Charts would go here */}
          <div className="mt-6 bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Performance Metrics</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Cost Comparison */}
              <div>
                <h3 className="font-medium mb-2">Cost Comparison</h3>
                {Object.entries(comparison.comparison.total_cost).map(([algo, cost]) => {
                  const maxCost = Math.max(...Object.values(comparison.comparison.total_cost));
                  const percentage = (cost / maxCost) * 100;
                  return (
                    <div key={algo} className="mb-2">
                      <div className="flex justify-between text-sm mb-1">
                        <span className="capitalize">{algo.replace('_', ' ')}</span>
                        <span>${cost.toFixed(0)}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Execution Time */}
              <div>
                <h3 className="font-medium mb-2">Execution Time</h3>
                {Object.entries(comparison.comparison.execution_time).map(([algo, time]) => {
                  const maxTime = Math.max(...Object.values(comparison.comparison.execution_time));
                  const percentage = (time / maxTime) * 100;
                  return (
                    <div key={algo} className="mb-2">
                      <div className="flex justify-between text-sm mb-1">
                        <span className="capitalize">{algo.replace('_', ' ')}</span>
                        <span>{time.toFixed(2)}s</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-green-600 h-2 rounded-full"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Fairness Score */}
              <div>
                <h3 className="font-medium mb-2">Fairness Score</h3>
                {Object.entries(comparison.comparison.fairness_score).map(([algo, score]) => {
                  const percentage = score * 100;
                  return (
                    <div key={algo} className="mb-2">
                      <div className="flex justify-between text-sm mb-1">
                        <span className="capitalize">{algo.replace('_', ' ')}</span>
                        <span>{score.toFixed(3)}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-purple-600 h-2 rounded-full"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
