#!/bin/bash
# Quick test script for new API endpoints

echo "🧪 Testing New API Endpoints"
echo "=============================="
echo ""

BASE_URL="http://localhost:8000"

echo "1️⃣  Testing Parameter Defaults..."
curl -s "${BASE_URL}/api/parameters/defaults" | python3 -m json.tool | head -20
echo ""

echo "2️⃣  Testing K-means Clustering (n=3)..."
curl -s "${BASE_URL}/api/clustering/kmeans?n_clusters=3" | python3 -m json.tool | head -30
echo ""

echo "3️⃣  Testing Priority Heatmap..."
curl -s "${BASE_URL}/api/clustering/heatmap" | python3 -m json.tool | head -30
echo ""

echo "4️⃣  Testing Coverage Analysis..."
curl -s "${BASE_URL}/api/clustering/coverage?radius_km=0.5" | python3 -m json.tool | head -20
echo ""

echo "5️⃣  Testing Parameter Validation..."
curl -s -X POST "${BASE_URL}/api/parameters/validate" \
  -H "Content-Type: application/json" \
  -d '{
    "algorithm": "milp",
    "milp_params": {
      "timeout_seconds": 30,
      "gap_tolerance": 0.15
    },
    "penalty_weights": {
      "distance_weight": 1.0,
      "vehicle_cost_weight": 0.5,
      "fairness_weight": 0.3,
      "time_penalty_weight": 0.2
    }
  }' | python3 -m json.tool
echo ""

echo "6️⃣  Testing Preset List..."
curl -s "${BASE_URL}/api/parameters/presets" | python3 -m json.tool
echo ""

echo "✅ All tests complete!"
echo ""
echo "📝 Start frontend to test UI components:"
echo "   cd frontend && npm run dev"
