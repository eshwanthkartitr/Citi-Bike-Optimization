# Citi-Bike Rebalancing Optimization System

## Overview
An intelligent Operations Research solution for optimizing Citi-Bike rebalancing operations using Mixed Integer Linear Programming (MILP), real-time simulation, and AI-powered decision support.

## Dataset
- **Source**: Citi-Bike trip data (January 2025 - July 2025)
- **Features**: ride_id, rideable_type, started_at, ended_at, start/end station info, coordinates, member type

## Core Problem
Optimize bike redistribution across stations by:
- Minimizing operational costs (vehicle routing, fuel, labor)
- Maximizing service fairness (especially to remote stations)
- Meeting time window constraints (1am-5am rebalancing window)
- Respecting vehicle capacity and station limits
- Handling multiple vehicle types (trucks, vans, bikes)

## Key Features

### MVP Features
- **Interactive Station Map**: Real-time visualization with surplus/deficit clustering
- **Dynamic Rebalancing Simulation**: Time-window based optimization with configurable parameters
- **Constraint-Driven Planning**: User-defined capacity, penalties, and operational constraints
- **Multi-Vehicle Type Support**: Flexible vehicle allocation per move
- **Route Optimization**: MILP-based routing with cost analysis
- **Demand Forecasting**: Predict surplus/deficit patterns for proactive planning

### Unique Features
- **AI Operations Agent**: Conversational agent for scenario planning and optimization guidance
- **Smart Alert System**: Predictive alerts for potential station failures
- **Fairness Visualization**: Highlight critical stations with penalty analysis
- **Historical Pattern Explorer**: EDA tools for commute patterns and event impacts
- **What-If Analysis**: Interactive constraint modification with instant re-optimization
- **Scenario Replay**: Test alternate strategies on historical critical windows
- **Explainability Engine**: Detailed reasoning for each optimization decision

## Tech Stack

### Frontend
- React 18+ with Vite
- Leaflet/Mapbox for interactive maps
- Recharts/D3.js for data visualization
- TailwindCSS for styling
- Zustand for state management

### Backend
- Python FastAPI for API services
- PuLP/OR-Tools for MILP optimization
- Pandas/NumPy for data processing
- Scikit-learn for demand forecasting
- Redis for caching optimization results

### ML/AI
- Time-series forecasting (Prophet/LSTM)
- Clustering algorithms for demand zones
- LLM-powered agent (OpenAI/Anthropic API)

## Project Structure

```
Citi-Bike/
├── frontend/          # React application
├── backend/           # FastAPI services
├── models/            # MILP and ML models
├── data/              # Raw and processed datasets
├── notebooks/         # Jupyter notebooks for EDA
├── scripts/           # Data processing utilities
└── docs/              # Documentation
```

## Installation

### Prerequisites
- Node.js 18+
- Python 3.10+
- pip and npm

### Setup
```bash
# Clone repository
git clone <repo-url>
cd Citi-Bike

# Frontend setup
cd frontend
npm install

# Backend setup
cd ../backend
pip install -r requirements.txt

# Run development servers
npm run dev              # Frontend (port 5173)
python main.py          # Backend (port 8000)
```

## Development Roadmap

### Phase 1: Foundation (Weeks 1-2)
- [ ] Data ingestion and cleaning pipeline
- [ ] EDA notebooks for pattern discovery
- [ ] Basic station map visualization
- [ ] Database schema design

### Phase 2: Core Optimization (Weeks 3-4)
- [ ] MILP model implementation
- [ ] Surplus/deficit calculation engine
- [ ] Vehicle routing algorithm
- [ ] Basic API endpoints

### Phase 3: Interactive Features (Weeks 5-6)
- [ ] Dynamic simulation interface
- [ ] Constraint configuration UI
- [ ] Real-time optimization results
- [ ] Cost/penalty analytics dashboard

### Phase 4: Advanced Features (Weeks 7-8)
- [ ] AI operations agent integration
- [ ] Demand forecasting models
- [ ] What-if analysis tools
- [ ] Scenario replay functionality

### Phase 5: Polish & Testing (Weeks 9-10)
- [ ] Performance optimization
- [ ] Comprehensive testing
- [ ] Documentation completion
- [ ] Demo preparation

## API Endpoints

### Core Operations
- `POST /api/optimize` - Run rebalancing optimization
- `GET /api/stations` - Get station inventory data
- `POST /api/simulate` - Run what-if simulation
- `GET /api/routes` - Get optimal vehicle routes
- `POST /api/forecast` - Generate demand predictions

### AI Agent
- `POST /api/agent/query` - Query AI operations agent
- `POST /api/agent/explain` - Get explanation for decision

### Analytics
- `GET /api/analytics/patterns` - Historical pattern analysis
- `GET /api/analytics/kpis` - Operational KPIs
- `POST /api/analytics/compare` - Compare scenarios

## Configuration Parameters

Users can configure:
- **Time Windows**: Custom rebalancing hours
- **Vehicle Fleet**: Types, capacities, costs per mile
- **Station Constraints**: Min/max inventory levels
- **Penalty Weights**: Shortage penalties, fairness factors
- **Optimization Goals**: Cost minimization vs. fairness maximization
- **Demand Events**: Special events (marathons, holidays)

## Performance Metrics

- Total operational cost
- Average shortage penalty
- Station utilization rate
- Vehicle efficiency (load factor)
- Fairness score (Gini coefficient)
- Service coverage (% stations served)

## Contributing
See CONTRIBUTING.md for development guidelines.

## License
MIT License

## Contact
For questions or feedback, reach out to the development team.
