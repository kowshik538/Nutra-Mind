"""Agent 1 — User Profile Agent"""
from typing import Any
from config import MEDICAL_DISCLAIMER

SYSTEM_PROMPT = """You are the NutriMind User Profile Agent. Parse onboarding data into a structured health profile.
RULES:
- NEVER ignore stated allergies or restrictions
- Flag contradictions (e.g. keto + diabetes, PCOS + dairy allergy)
- Do not provide medication advice
- Flag medical conditions to consult healthcare provider
- Output valid JSON only"""


def run_profile_agent(onboarding: dict, computed: dict) -> dict:
    allergies = onboarding.get("allergies", [])
    health = onboarding.get("health_conditions", onboarding.get("healthConditions", []))
    diet = onboarding.get("diet_type", "")

    restrictions = list(allergies)
    if onboarding.get("religious_restrictions"):
        restrictions.extend(onboarding["religious_restrictions"])
    if diet == "jain":
        restrictions.extend(["onion", "garlic", "root vegetables"])
    if diet == "vegan":
        restrictions.append("all animal products")

    risk_flags = list(computed.get("risk_flags", []))
    if "diabetes" in health and diet == "keto":
        risk_flags.append("keto_with_diabetes_consult_doctor")
    if health:
        risk_flags.append("consult_healthcare_provider")

    goal_map = {
        "lose": "weight_loss",
        "gain": "muscle_gain",
        "maintain": "maintenance",
        "recomposition": "body_recomposition",
    }
    goal_type = onboarding.get("goal_type", onboarding.get("goalType", "maintain"))

    profile = {
        "structured_profile": {
            "personal": {
                "name": onboarding.get("full_name") or onboarding.get("name"),
                "age": onboarding.get("age"),
                "gender": onboarding.get("gender"),
            },
            "anthropometrics": {
                "height_cm": onboarding.get("height_cm"),
                "weight_kg": onboarding.get("weight_kg"),
                "target_weight_kg": onboarding.get("target_weight_kg"),
            },
            "health": {
                "conditions": health,
                "medications": onboarding.get("medications"),
                "pregnancy_breastfeeding": onboarding.get("pregnancy_breastfeeding", False),
            },
            "diet": {
                "type": diet,
                "allergies": allergies,
                "dislikes": onboarding.get("food_dislikes", []),
                "spice_tolerance": onboarding.get("spice_tolerance"),
            },
            "cultural": {
                "city": onboarding.get("location_city"),
                "country": onboarding.get("location_country"),
                "cuisine": onboarding.get("cuisine_preference"),
                "festival_calendar": onboarding.get("festival_calendar"),
            },
            "lifestyle": {
                "occupation": onboarding.get("occupation"),
                "activity_level": onboarding.get("activity_level"),
                "budget_per_day": onboarding.get("budget_per_day"),
            },
        },
        "restrictions": restrictions,
        "goal_classification": goal_map.get(goal_type, goal_type),
        "risk_flags": list(set(risk_flags)),
        "validated": True,
        "disclaimer": MEDICAL_DISCLAIMER,
    }
    return profile
