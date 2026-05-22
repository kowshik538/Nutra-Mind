"""LangGraph-style orchestrator for NutriMind AI agents"""
from profile_agent import run_profile_agent
from nutrition_agent import run_nutrition_agent
from meal_planner_agent import run_meal_planner_agent, run_meal_swap
from recipe_agent import run_recipe_agent
from grocery_agent import run_grocery_agent
from monitoring_agent import run_monitoring_agent
from adjustment_agent import run_adjustment_agent
from coach_agent import run_coach_agent, run_coach_chat


def orchestrate_full(user_id: str, onboarding: dict) -> dict:
    """Full pipeline: Profile → Nutrition → Meal Plan → Grocery"""
    computed = {
        "risk_flags": [],
    }
    profile = run_profile_agent(onboarding, computed)

    user_data = {**onboarding, **profile.get("structured_profile", {})}
    nutrition = run_nutrition_agent(onboarding)
    user_data.update(nutrition)

    meal_plan = run_meal_planner_agent(user_data)
    grocery = run_grocery_agent(meal_plan["plan_json"], user_data)

    return {
        "user_id": user_id,
        "profile": profile,
        "nutrition": nutrition,
        "meal_plan": meal_plan,
        "grocery": grocery,
    }


if __name__ == "__main__":
    sample = {
        "age": 28, "gender": "female", "weight_kg": 65, "height_cm": 165,
        "goal_type": "lose", "activity_level": "moderately_active",
        "diet_type": "vegetarian", "allergies": [], "cuisine_preference": "Andhra",
        "location_country": "India", "budget_per_day": 200,
    }
    result = orchestrate_full("test-user", sample)
    print("Pipeline complete:", list(result.keys()))
