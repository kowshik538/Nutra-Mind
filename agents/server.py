"""FastAPI server for NutriMind AI agents"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Any, Optional

from orchestrator import orchestrate_full
from profile_agent import run_profile_agent
from nutrition_agent import run_nutrition_agent
from meal_planner_agent import run_meal_planner_agent, run_meal_swap
from recipe_agent import run_recipe_agent
from grocery_agent import run_grocery_agent
from monitoring_agent import run_monitoring_agent
from adjustment_agent import run_adjustment_agent
from coach_agent import run_coach_agent, run_coach_chat

app = FastAPI(title="NutriMind AI Agents", version="1.0.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])


class OrchestrateRequest(BaseModel):
    user_id: str
    onboarding: dict


class AgentRequest(BaseModel):
    user: Optional[dict] = None
    onboarding: Optional[dict] = None
    meal_plan: Optional[dict] = None
    user_id: Optional[str] = None
    message: Optional[str] = None
    history: Optional[list] = None
    logs: Optional[list] = None
    progress: Optional[list] = None
    period: Optional[str] = "weekly"
    meal_name: Optional[str] = None
    day: Optional[str] = None
    meal_type: Optional[str] = None
    meal_index: Optional[int] = 0
    bmr: Optional[float] = None
    risk_flags: Optional[list] = None


@app.get("/health")
def health():
    return {"status": "ok", "service": "nutrimind-agents"}


@app.post("/api/v1/orchestrate")
def orchestrate(req: OrchestrateRequest):
    return orchestrate_full(req.user_id, req.onboarding)


@app.post("/api/v1/orchestrate/meal-plan")
def orchestrate_meal_plan(req: AgentRequest):
    user = req.user or {}
    return run_meal_planner_agent(user)


@app.post("/api/v1/agents/profile")
def profile_agent(req: AgentRequest):
    computed = {"risk_flags": req.risk_flags or []}
    return {"profile": run_profile_agent(req.onboarding or {}, computed)}


@app.post("/api/v1/agents/meal-planner")
def meal_planner(req: AgentRequest):
    return run_meal_planner_agent(req.user or {})


@app.post("/api/v1/agents/meal-planner/swap")
def meal_swap(req: AgentRequest):
    return run_meal_swap(req.user or {}, req.day or "monday", req.meal_type or "lunch", req.meal_index or 0)


@app.post("/api/v1/agents/recipe")
def recipe(req: AgentRequest):
    return run_recipe_agent(req.meal_name or "Healthy meal", req.user or {})


@app.post("/api/v1/agents/grocery")
def grocery(req: AgentRequest):
    return run_grocery_agent(req.meal_plan or {}, req.user or {})


@app.post("/api/v1/agents/monitoring")
def monitoring(req: AgentRequest):
    return run_monitoring_agent(req.user_id or "", req.period or "weekly", req.logs or [])


@app.post("/api/v1/agents/adjustment")
def adjustment(req: AgentRequest):
    return run_adjustment_agent(req.user or {}, req.logs or [], req.progress or [], {})


@app.post("/api/v1/agents/coach")
def coach(req: AgentRequest):
    return run_coach_agent(req.user or {}, req.logs or [], req.progress or [])


@app.post("/api/v1/agents/coach/chat")
def coach_chat(req: AgentRequest):
    return run_coach_chat(req.user or {}, req.message or "", req.history or [])


@app.post("/api/v1/agents/food-parse")
def food_parse(req: AgentRequest):
    transcript = req.message or ""
    items = []
    if "pesarattu" in transcript.lower():
        items.append({"name": "Pesarattu", "quantity_g": 150, "meal_type": "breakfast"})
    if "chai" in transcript.lower() or "tea" in transcript.lower():
        items.append({"name": "Tea with milk", "quantity_g": 200, "meal_type": "breakfast"})
    if not items:
        items.append({"name": "Mixed meal", "quantity_g": 200, "meal_type": "lunch"})
    return {"items": items}


@app.post("/api/v1/agents/food-vision")
def food_vision(req: AgentRequest):
    return {
        "food_name": "Mixed Indian thali",
        "quantity_g": 350,
        "calories": 520,
        "protein_g": 18,
        "carbs_g": 65,
        "fat_g": 18,
        "confidence_score": 72.5,
    }
