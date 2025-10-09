"""
AI Operations Agent - Conversational assistant for optimization guidance
"""
from typing import Dict, Optional
import json

from models.schemas import AgentQuery, AgentResponse
from config.settings import settings
from utils.logger import setup_logger

logger = setup_logger(__name__)


class OperationsAgent:
    """AI-powered operations assistant"""
    
    def __init__(self):
        self.system_prompt = """
You are an Operations Research agent tasked with optimizing Citi-Bike rebalancing.
Given trip and station inventory data, constraints (station capacity, vehicle types, 
operational hours, fairness to remote stations), generate cost-effective routing plans 
and explain your decisions step-by-step. Visualize results on an interactive map and 
provide actionable insights and what-if simulations for any changes in constraints or 
demand spikes.

You should:
- Explain optimization decisions in simple terms
- Suggest improvements to operational parameters
- Highlight trade-offs between cost and fairness
- Warn about potential issues or constraint violations
- Provide data-driven recommendations
"""
    
    async def process_query(self, query: AgentQuery) -> AgentResponse:
        """Process user query and generate response"""
        logger.info(f"Processing agent query: {query.query}")
        
        try:
            # TODO: Integrate with actual LLM (OpenAI/Anthropic)
            # For now, return template response
            
            response_text = self._generate_mock_response(query.query)
            suggestions = self._generate_suggestions(query.query)
            
            response = AgentResponse(
                response=response_text,
                suggestions=suggestions,
                confidence=0.85,
                visualization_data=None
            )
            
            return response
            
        except Exception as e:
            logger.error(f"Agent query processing failed: {str(e)}")
            return AgentResponse(
                response="I encountered an error processing your query. Please try again.",
                suggestions=[],
                confidence=0.0
            )
    
    async def explain_decision(self, move_id: str, context: Optional[Dict] = None) -> Dict:
        """Explain why a specific rebalancing move was chosen"""
        logger.info(f"Explaining decision for move: {move_id}")
        
        # TODO: Implement actual explanation logic
        explanation = {
            "move_id": move_id,
            "reasoning": [
                "This move addresses a critical shortage at the destination station",
                "The source station has excess capacity",
                "The distance is within the optimal range for cost efficiency",
                "This route serves a high-priority area with fairness weighting"
            ],
            "metrics": {
                "cost_contribution": 45.50,
                "shortage_reduction": 8,
                "fairness_impact": 0.15
            },
            "alternatives_considered": [
                {
                    "description": "Alternative route via Station B",
                    "why_not_chosen": "Higher cost with minimal additional benefit"
                }
            ]
        }
        
        return explanation
    
    def _generate_mock_response(self, query: str) -> str:
        """Generate mock response for testing"""
        query_lower = query.lower()
        
        if "cost" in query_lower:
            return ("To reduce operational costs, consider: 1) Adjusting the time window "
                   "to off-peak hours, 2) Using smaller vehicles for short distances, "
                   "3) Batching moves to minimize trips.")
        
        elif "fairness" in query_lower or "remote" in query_lower:
            return ("Fairness optimization ensures remote stations receive adequate service. "
                   "Increase the fairness_weight parameter to prioritize underserved areas. "
                   "Current settings may favor cost over equity.")
        
        elif "shortage" in query_lower or "penalty" in query_lower:
            return ("Shortage penalties drive the optimizer to prevent stock-outs. "
                   "Higher penalties ensure better service but may increase costs. "
                   "Balance this based on your operational priorities.")
        
        else:
            return ("I can help you optimize your rebalancing operations. Ask me about "
                   "cost reduction strategies, fairness improvements, constraint adjustments, "
                   "or scenario comparisons.")
    
    def _generate_suggestions(self, query: str) -> list:
        """Generate contextual suggestions"""
        return [
            "Try adjusting the shortage penalty to see impact on service quality",
            "Compare scenarios with different vehicle configurations",
            "Review stations with highest deficits for targeted action",
            "Consider time-of-day patterns for better planning"
        ]
