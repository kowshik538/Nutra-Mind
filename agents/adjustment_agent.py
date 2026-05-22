"""Agent 7 — Adjustment Agent"""

def run_adjustment_agent(user: dict, logs: list, progress: list, original_plan: dict) -> dict:
    recommendations = []
    swaps = []

    if len(logs) >= 7:
        proteins = [float(l.get("protein", 0)) for l in logs]
        target = (user.get("macro_targets") or {}).get("protein_g", 100)
        avg_protein = sum(proteins) / len(proteins) if proteins else 0
        if avg_protein < target * 0.7:
            recommendations.append({
                "type": "protein_low",
                "message": "Protein consistently below 70% of target — restructuring protein sources recommended",
                "action": "Add paneer, dal, or Greek yogurt to lunch and dinner",
            })

    weights = [float(p.get("weight_kg", 0)) for p in progress if p.get("weight_kg")]
    if len(weights) >= 10:
        if max(weights[-10:]) - min(weights[-10:]) < 0.5:
            recommendations.append({
                "type": "plateau",
                "message": "Weight plateau detected over 10 days",
                "action": "Consider 100-150 kcal deficit increase or a refeed day",
            })

    low_energy_days = [p for p in progress if p.get("energy_level", 5) <= 2]
    if len(low_energy_days) >= 3:
        recommendations.append({
            "type": "energy",
            "message": "Low energy reported — check iron, B12, magnesium intake",
            "action": "Include spinach, ragi, and vitamin C rich foods",
        })

    return {
        "recommendations": recommendations,
        "meal_swaps": swaps,
        "calorie_recalibration": None,
    }
