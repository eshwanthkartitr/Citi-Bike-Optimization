"""
Router for algorithm parameter configuration
"""
from fastapi import APIRouter, HTTPException, Body
from typing import List, Dict, Any
import json
from datetime import datetime
from pathlib import Path

from models.parameter_schemas import (
    AlgorithmConfig,
    ParameterPreset,
    MILPParameters,
    GeneticParameters,
    SimulatedAnnealingParameters,
    PenaltyWeights
)

router = APIRouter(prefix="/parameters", tags=["Parameters"])

# File-based preset storage
PRESETS_FILE = Path(__file__).parent.parent / "data" / "parameter_presets.json"
PRESETS_FILE.parent.mkdir(exist_ok=True)


def load_presets() -> Dict[str, ParameterPreset]:
    """Load parameter presets from file"""
    if not PRESETS_FILE.exists():
        return {}
    
    try:
        with open(PRESETS_FILE, 'r') as f:
            data = json.load(f)
            return {k: ParameterPreset(**v) for k, v in data.items()}
    except Exception:
        return {}


def save_presets(presets: Dict[str, ParameterPreset]):
    """Save parameter presets to file"""
    with open(PRESETS_FILE, 'w') as f:
        json.dump({k: v.dict() for k, v in presets.items()}, f, indent=2)


@router.get("/defaults")
async def get_default_parameters():
    """
    Get default parameter values for all algorithms
    """
    return {
        "status": "success",
        "data": {
            "milp": MILPParameters().dict(),
            "genetic": GeneticParameters().dict(),
            "simulated_annealing": SimulatedAnnealingParameters().dict(),
            "penalty_weights": PenaltyWeights().dict()
        }
    }


@router.post("/validate")
async def validate_parameters(config: AlgorithmConfig):
    """
    Validate parameter configuration
    
    Returns validation status and any warnings
    """
    warnings = []
    
    # Check MILP parameters
    if config.milp_params:
        if config.milp_params.timeout_seconds < 60:
            warnings.append("MILP timeout < 60s may not find optimal solution")
        if config.milp_params.gap_tolerance > 0.1:
            warnings.append("Gap tolerance > 0.1 may result in suboptimal solutions")
    
    # Check Genetic parameters
    if config.genetic_params:
        if config.genetic_params.population_size < 30:
            warnings.append("Small population size may reduce solution quality")
        if config.genetic_params.mutation_rate > 0.3:
            warnings.append("High mutation rate may slow convergence")
        if config.genetic_params.elite_size > config.genetic_params.population_size * 0.2:
            warnings.append("Elite size > 20% of population may reduce diversity")
    
    # Check penalty weights
    if config.penalty_weights:
        total_weight = (
            config.penalty_weights.distance_weight +
            config.penalty_weights.vehicle_cost_weight +
            config.penalty_weights.fairness_weight
        )
        if total_weight < 1.0:
            warnings.append("Total penalty weight < 1.0 may lead to weak optimization")
    
    return {
        "status": "success",
        "valid": True,
        "warnings": warnings
    }


@router.get("/presets")
async def list_presets():
    """
    List all saved parameter presets
    """
    presets = load_presets()
    
    return {
        "status": "success",
        "data": {
            "presets": [
                {
                    "preset_id": p.preset_id,
                    "preset_name": p.preset_name,
                    "description": p.description,
                    "algorithm": p.config.algorithm,
                    "created_at": p.created_at
                }
                for p in presets.values()
            ],
            "count": len(presets)
        }
    }


@router.get("/presets/{preset_id}")
async def get_preset(preset_id: str):
    """
    Get a specific parameter preset
    """
    presets = load_presets()
    
    if preset_id not in presets:
        raise HTTPException(status_code=404, detail="Preset not found")
    
    return {
        "status": "success",
        "data": presets[preset_id].dict()
    }


@router.post("/presets")
async def save_preset(
    preset_name: str = Body(...),
    description: str = Body(None),
    config: AlgorithmConfig = Body(...)
):
    """
    Save a new parameter preset
    """
    presets = load_presets()
    
    # Generate preset ID
    preset_id = preset_name.lower().replace(' ', '_').replace('-', '_')
    
    # Check for duplicates
    if preset_id in presets:
        raise HTTPException(status_code=400, detail="Preset with this name already exists")
    
    # Create preset
    preset = ParameterPreset(
        preset_id=preset_id,
        preset_name=preset_name,
        description=description,
        config=config,
        created_at=datetime.utcnow().isoformat() + "Z"
    )
    
    presets[preset_id] = preset
    save_presets(presets)
    
    return {
        "status": "success",
        "data": preset.dict(),
        "message": f"Preset '{preset_name}' saved successfully"
    }


@router.put("/presets/{preset_id}")
async def update_preset(
    preset_id: str,
    preset_name: str = Body(None),
    description: str = Body(None),
    config: AlgorithmConfig = Body(None)
):
    """
    Update an existing parameter preset
    """
    presets = load_presets()
    
    if preset_id not in presets:
        raise HTTPException(status_code=404, detail="Preset not found")
    
    preset = presets[preset_id]
    
    if preset_name:
        preset.preset_name = preset_name
    if description is not None:
        preset.description = description
    if config:
        preset.config = config
    
    save_presets(presets)
    
    return {
        "status": "success",
        "data": preset.dict(),
        "message": f"Preset '{preset_id}' updated successfully"
    }


@router.delete("/presets/{preset_id}")
async def delete_preset(preset_id: str):
    """
    Delete a parameter preset
    """
    presets = load_presets()
    
    if preset_id not in presets:
        raise HTTPException(status_code=404, detail="Preset not found")
    
    deleted_preset = presets.pop(preset_id)
    save_presets(presets)
    
    return {
        "status": "success",
        "message": f"Preset '{deleted_preset.preset_name}' deleted successfully"
    }
