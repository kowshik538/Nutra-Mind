"""Agent 6 — Monitoring & Analytics Agent"""

def run_monitoring_agent(user_id: str, period: str, logs: list) -> dict:
    if not logs:
        return {"gaps": ["No food logs yet — start logging to see insights"], "trends": {}, "completion_rate": 0}

    avg_cal = sum(float(l.get("calories", 0)) for l in logs) / len(logs)
    avg_protein = sum(float(l.get("protein", 0)) for l in logs) / len(logs)

    gaps = []
    if avg_protein < 50:
        gaps.append("You've been low on protein — consider adding dal, paneer, or eggs")
    if avg_cal < 1200:
        gaps.append("Calorie intake appears low — ensure adequate nutrition")

    return {
        "daily_summary": {"avg_calories": round(avg_cal), "avg_protein_g": round(avg_protein, 1)},
        "gaps": gaps,
        "trends": {"calories": "stable", "protein": "needs_attention" if avg_protein < 60 else "on_track"},
        "completion_rate": min(100, len(logs) * 15),
        "weekly_insights": [
            f"Logged {len(logs)} days in the {period} period",
            "Keep logging for personalized adjustments",
        ],
    }
