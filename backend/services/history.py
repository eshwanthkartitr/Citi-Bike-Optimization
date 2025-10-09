"""
Optimization history tracker - stores and compares optimization runs
"""
import json
from datetime import datetime
from pathlib import Path
from typing import List, Dict, Any, Optional
from pydantic import BaseModel

from models.schemas import OptimizationResult
from utils.logger import setup_logger

logger = setup_logger(__name__)


class OptimizationRun(BaseModel):
    """Single optimization run record"""
    id: str
    timestamp: datetime
    result: OptimizationResult
    constraints: Dict[str, Any]
    notes: Optional[str] = None


class OptimizationHistory:
    """Manages optimization history"""
    
    def __init__(self, history_file: str = "data/processed/optimization_history.json"):
        self.history_file = Path(history_file)
        self.history_file.parent.mkdir(parents=True, exist_ok=True)
        self.runs: List[OptimizationRun] = []
        self.load()
    
    def load(self):
        """Load history from file"""
        if self.history_file.exists():
            try:
                with open(self.history_file, 'r') as f:
                    data = json.load(f)
                    self.runs = [OptimizationRun(**run) for run in data]
                logger.info(f"📜 Loaded {len(self.runs)} optimization runs from history")
            except Exception as e:
                logger.error(f"Failed to load history: {e}")
                self.runs = []
    
    def save(self):
        """Save history to file"""
        try:
            with open(self.history_file, 'w') as f:
                data = [run.model_dump(mode='json') for run in self.runs]
                json.dump(data, f, indent=2, default=str)
            logger.info(f"💾 Saved {len(self.runs)} optimization runs to history")
        except Exception as e:
            logger.error(f"Failed to save history: {e}")
    
    def add_run(self, result: OptimizationResult, constraints: Dict[str, Any], notes: Optional[str] = None):
        """Add new optimization run to history"""
        run_id = datetime.now().strftime("%Y%m%d_%H%M%S")
        run = OptimizationRun(
            id=run_id,
            timestamp=datetime.now(),
            result=result,
            constraints=constraints,
            notes=notes
        )
        self.runs.append(run)
        self.save()
        logger.info(f"✅ Added run {run_id} to history")
        return run_id
    
    def get_run(self, run_id: str) -> Optional[OptimizationRun]:
        """Get specific run by ID"""
        for run in self.runs:
            if run.id == run_id:
                return run
        return None
    
    def get_recent(self, limit: int = 10) -> List[OptimizationRun]:
        """Get recent optimization runs"""
        return sorted(self.runs, key=lambda r: r.timestamp, reverse=True)[:limit]
    
    def compare_runs(self, run_ids: List[str]) -> Dict[str, Any]:
        """Compare multiple optimization runs"""
        runs = [self.get_run(rid) for rid in run_ids if self.get_run(rid)]
        
        if len(runs) < 2:
            return {"error": "Need at least 2 runs to compare"}
        
        comparison = {
            "runs": [],
            "metrics": {
                "total_cost": [],
                "bikes_moved": [],
                "stations_served": [],
                "fairness_score": [],
                "execution_time": []
            }
        }
        
        for run in runs:
            comparison["runs"].append({
                "id": run.id,
                "timestamp": run.timestamp.isoformat(),
                "total_cost": run.result.total_cost,
                "bikes_moved": run.result.total_bikes_moved,
                "stations_served": run.result.stations_served,
                "fairness_score": run.result.fairness_score,
                "execution_time": run.result.execution_time,
                "moves_count": len(run.result.moves)
            })
            
            comparison["metrics"]["total_cost"].append(run.result.total_cost)
            comparison["metrics"]["bikes_moved"].append(run.result.total_bikes_moved)
            comparison["metrics"]["stations_served"].append(run.result.stations_served)
            comparison["metrics"]["fairness_score"].append(run.result.fairness_score)
            comparison["metrics"]["execution_time"].append(run.result.execution_time)
        
        # Add summary statistics
        comparison["summary"] = {
            "best_cost": {
                "run_id": runs[comparison["metrics"]["total_cost"].index(min(comparison["metrics"]["total_cost"]))].id,
                "value": min(comparison["metrics"]["total_cost"])
            },
            "best_fairness": {
                "run_id": runs[comparison["metrics"]["fairness_score"].index(max(comparison["metrics"]["fairness_score"]))].id,
                "value": max(comparison["metrics"]["fairness_score"])
            },
            "fastest": {
                "run_id": runs[comparison["metrics"]["execution_time"].index(min(comparison["metrics"]["execution_time"]))].id,
                "value": min(comparison["metrics"]["execution_time"])
            }
        }
        
        return comparison
    
    def get_statistics(self) -> Dict[str, Any]:
        """Get overall statistics from history"""
        if not self.runs:
            return {"message": "No optimization runs in history"}
        
        costs = [r.result.total_cost for r in self.runs]
        bikes = [r.result.total_bikes_moved for r in self.runs]
        fairness = [r.result.fairness_score for r in self.runs]
        
        return {
            "total_runs": len(self.runs),
            "date_range": {
                "first": min(r.timestamp for r in self.runs).isoformat(),
                "last": max(r.timestamp for r in self.runs).isoformat()
            },
            "cost_stats": {
                "min": min(costs),
                "max": max(costs),
                "avg": sum(costs) / len(costs),
                "total": sum(costs)
            },
            "bikes_stats": {
                "min": min(bikes),
                "max": max(bikes),
                "avg": sum(bikes) / len(bikes),
                "total": sum(bikes)
            },
            "fairness_stats": {
                "min": min(fairness),
                "max": max(fairness),
                "avg": sum(fairness) / len(fairness)
            }
        }
    
    def clear(self):
        """Clear all history"""
        self.runs = []
        self.save()
        logger.info("🗑️  Cleared optimization history")


# Global history instance
optimization_history = OptimizationHistory()
