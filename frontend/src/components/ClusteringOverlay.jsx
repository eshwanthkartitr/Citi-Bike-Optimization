import React, { useState, useEffect } from 'react';
import { Circle, Polygon, Popup, useMap } from 'react-leaflet';
import { Layers, AlertCircle, MapPin, TrendingUp } from 'lucide-react';

const CLUSTER_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8',
  '#F7DC6F', '#BB8FCE', '#85C1E2', '#F8B195', '#C06C84'
];

export default function ClusteringOverlay({ stations, enabled }) {
  const [clusterData, setClusterData] = useState(null);
  const [heatmapData, setHeatmapData] = useState(null);
  const [coverageData, setCoverageData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState('clusters'); // 'clusters', 'heatmap', 'coverage'
  const map = useMap();

  useEffect(() => {
    if (enabled && stations.length > 0) {
      fetchClusteringData();
    }
  }, [enabled, stations]);

  const fetchClusteringData = async () => {
    setLoading(true);
    try {
      const [clustersRes, heatmapRes, coverageRes] = await Promise.all([
        fetch('http://localhost:8000/api/clustering/kmeans?n_clusters=5'),
        fetch('http://localhost:8000/api/clustering/heatmap'),
        fetch('http://localhost:8000/api/clustering/coverage?radius_km=0.5')
      ]);

      const clustersData = await clustersRes.json();
      const heatmapDataRes = await heatmapRes.json();
      const coverageDataRes = await coverageRes.json();

      setClusterData(clustersData.data);
      setHeatmapData(heatmapDataRes.data);
      setCoverageData(coverageDataRes.data);
    } catch (error) {
      console.error('Failed to fetch clustering data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!enabled || !clusterData) return null;

  const renderClusters = () => {
    if (view !== 'clusters' || !clusterData) return null;

    return Object.entries(clusterData.clusters).map(([clusterId, clusterStations]) => {
      const color = CLUSTER_COLORS[parseInt(clusterId) % CLUSTER_COLORS.length];
      const stats = clusterData.cluster_stats[clusterId];
      
      // Create convex hull points for cluster boundary
      const points = clusterStations.map(s => [s.latitude, s.longitude]);
      
      // Calculate approximate boundary (simplified - just using bounding box)
      if (points.length < 3) return null;

      const lats = points.map(p => p[0]);
      const lngs = points.map(p => p[1]);
      const minLat = Math.min(...lats);
      const maxLat = Math.max(...lats);
      const minLng = Math.min(...lngs);
      const maxLng = Math.max(...lngs);
      
      const padding = 0.002;
      const boundary = [
        [minLat - padding, minLng - padding],
        [minLat - padding, maxLng + padding],
        [maxLat + padding, maxLng + padding],
        [maxLat + padding, minLng - padding]
      ];

      return (
        <React.Fragment key={clusterId}>
          {/* Cluster boundary */}
          <Polygon
            positions={boundary}
            pathOptions={{
              color: color,
              fillColor: color,
              fillOpacity: 0.1,
              weight: 2,
              dashArray: '5, 5'
            }}
          >
            <Popup>
              <div className="text-sm">
                <h3 className="font-bold text-gray-900 mb-2">Cluster {parseInt(clusterId) + 1}</h3>
                <div className="space-y-1">
                  <p><span className="font-semibold">Stations:</span> {stats.station_count}</p>
                  <p><span className="font-semibold">Total Deficit:</span> {stats.total_deficit} bikes</p>
                  <p><span className="font-semibold">Total Surplus:</span> {stats.total_surplus} bikes</p>
                  <p><span className="font-semibold">Net Balance:</span> {stats.net_balance} bikes</p>
                  <p><span className="font-semibold">High Priority:</span> {stats.high_priority_count} stations</p>
                  <p>
                    <span className="font-semibold">Priority Level:</span>
                    <span className={`ml-1 px-2 py-0.5 rounded text-xs ${
                      stats.priority_level === 'CRITICAL' ? 'bg-red-100 text-red-800' :
                      stats.priority_level === 'HIGH' ? 'bg-orange-100 text-orange-800' :
                      stats.priority_level === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {stats.priority_level}
                    </span>
                  </p>
                </div>
              </div>
            </Popup>
          </Polygon>

          {/* Cluster center marker */}
          <Circle
            center={[stats.center.lat, stats.center.lng]}
            radius={50}
            pathOptions={{
              color: color,
              fillColor: color,
              fillOpacity: 0.6,
              weight: 3
            }}
          >
            <Popup>
              <div className="text-sm">
                <h3 className="font-bold">Cluster {parseInt(clusterId) + 1} Center</h3>
                <p className="text-gray-600">Geographic centroid</p>
              </div>
            </Popup>
          </Circle>
        </React.Fragment>
      );
    });
  };

  const renderHeatmap = () => {
    if (view !== 'heatmap' || !heatmapData) return null;

    return heatmapData.heatmap_points.map((point, idx) => {
      const intensity = point.intensity;
      const radius = 100 + (intensity * 200); // Scale radius by intensity
      const opacity = 0.3 + (intensity * 0.4); // Scale opacity

      return (
        <Circle
          key={`heatmap-${idx}`}
          center={[point.lat, point.lng]}
          radius={radius}
          pathOptions={{
            color: intensity > 0.7 ? '#DC2626' : intensity > 0.4 ? '#F59E0B' : '#10B981',
            fillColor: intensity > 0.7 ? '#DC2626' : intensity > 0.4 ? '#F59E0B' : '#10B981',
            fillOpacity: opacity,
            weight: 0
          }}
        >
          <Popup>
            <div className="text-sm">
              <h3 className="font-bold">{point.station_name}</h3>
              <p><span className="font-semibold">Priority:</span> {point.priority}</p>
              <p><span className="font-semibold">Deficit:</span> {point.deficit} bikes</p>
              <p><span className="font-semibold">Intensity:</span> {(intensity * 100).toFixed(0)}%</p>
            </div>
          </Popup>
        </Circle>
      );
    });
  };

  const renderCoverage = () => {
    if (view !== 'coverage' || !coverageData) return null;

    return coverageData.service_gaps.map((gap, idx) => (
      <Circle
        key={`gap-${idx}`}
        center={[gap.latitude, gap.longitude]}
        radius={300}
        pathOptions={{
          color: gap.severity === 'HIGH' ? '#DC2626' : '#F59E0B',
          fillColor: gap.severity === 'HIGH' ? '#DC2626' : '#F59E0B',
          fillOpacity: 0.2,
          weight: 2,
          dashArray: '10, 5'
        }}
      >
        <Popup>
          <div className="text-sm">
            <h3 className="font-bold text-red-600">⚠️ Service Gap</h3>
            <p className="font-semibold mt-1">{gap.station_name}</p>
            <p><span className="font-semibold">Nearby Stations:</span> {gap.nearby_stations}</p>
            <p><span className="font-semibold">Severity:</span> {gap.severity}</p>
            <p className="text-gray-600 mt-1">This station is isolated and may have limited service</p>
          </div>
        </Popup>
      </Circle>
    ));
  };

  return (
    <>
      {/* Control Panel */}
      <div className="leaflet-top leaflet-right" style={{ marginTop: '80px', marginRight: '10px', maxWidth: '180px' }}>
        <div className="leaflet-control bg-white rounded-lg shadow-lg p-2 space-y-1.5">
          <h3 className="font-bold text-xs flex items-center gap-1.5 mb-1.5">
            <Layers className="w-3.5 h-3.5" />
            Analysis Layers
          </h3>
          
          <button
            onClick={() => setView('clusters')}
            className={`w-full px-2 py-1.5 rounded text-xs font-medium transition-all ${
              view === 'clusters'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            K-means Clusters
          </button>

          <button
            onClick={() => setView('heatmap')}
            className={`w-full px-2 py-1.5 rounded text-xs font-medium transition-all ${
              view === 'heatmap'
                ? 'bg-orange-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Priority Heatmap
          </button>

          <button
            onClick={() => setView('coverage')}
            className={`w-full px-2 py-1.5 rounded text-xs font-medium transition-all ${
              view === 'coverage'
                ? 'bg-red-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Coverage Gaps
          </button>

          {/* Stats Panel */}
          {view === 'clusters' && clusterData && (
            <div className="mt-2 pt-2 border-t border-gray-200 text-[10px] space-y-0.5">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Total Clusters:</span>
                <span className="font-semibold">{clusterData.n_clusters}</span>
              </div>
            </div>
          )}

          {view === 'coverage' && coverageData && (
            <div className="mt-2 pt-2 border-t border-gray-200 text-[10px] space-y-0.5">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Area:</span>
                <span className="font-semibold">{coverageData.coverage_area_km2} km²</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Density:</span>
                <span className="font-semibold">{coverageData.station_density}/km²</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Gaps:</span>
                <span className="font-semibold text-red-600">{coverageData.gap_count}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Quality:</span>
                <span className={`font-semibold text-[10px] ${
                  coverageData.coverage_quality === 'EXCELLENT' ? 'text-green-600' :
                  coverageData.coverage_quality === 'GOOD' ? 'text-blue-600' :
                  coverageData.coverage_quality === 'FAIR' ? 'text-yellow-600' :
                  'text-red-600'
                }`}>
                  {coverageData.coverage_quality}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Render selected view */}
      {renderClusters()}
      {renderHeatmap()}
      {renderCoverage()}

      {loading && (
        <div className="leaflet-top leaflet-right" style={{ marginTop: '280px', marginRight: '10px', maxWidth: '180px' }}>
          <div className="leaflet-control bg-white rounded-lg shadow-lg p-2 flex items-center justify-center">
            <div className="animate-spin w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full" />
          </div>
        </div>
      )}
    </>
  );
}
