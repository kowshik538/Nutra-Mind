"""Agent 8 — AI Health Coach Agent"""
from datetime import datetime
from config import MEDICAL_DISCLAIMER

def run_coach_agent(user: dict, logs: list, progress: list) -> dict:
    notifications = []
    goal = user.get("goal_type", "maintain")
    motivation = user.get("motivation_style", "gentle")

    today_cals = sum(float(l.get("calories", 0)) for l in logs if str(l.get("date", "")) == str(datetime.now().date()))
    target = user.get("daily_calorie_target", 2000)
    water = next((p.get("water_ml", 0) for p in progress if p.get("date")), 0)
    water_goal = user.get("water_goal_ml", 2500)

    if today_cals < target * 0.7:
        deficit = int(target - today_cals)
        if motivation == "tough_coach":
            msg = f"You're {deficit} cal under target. No excuses — grab a protein snack now."
        else:
            msg = f"You are {deficit} cal under target today. Consider a banana and peanut butter snack."
        notifications.append({"type": "calorie_nudge", "message": msg})

    if water < water_goal * 0.6:
        glasses_left = max(1, int((water_goal - water) / 250))
        notifications.append({
            "type": "hydration",
            "message": f"Drink {glasses_left} more glasses of water before 9 PM.",
        })

    if goal == "gain":
        notifications.append({
            "type": "motivation",
            "message": "You've been consistent — your muscle gain journey is on track. Keep protein high!",
        })

    festival = user.get("festival_calendar")
    if festival == "Hindu":
        notifications.append({
            "type": "festival",
            "message": "Festival season may affect your plan — fasting-friendly meals are ready if needed.",
        })

    if not notifications:
        notifications.append({
            "type": "general",
            "message": "Great job staying on track today! Log your meals to keep your coach informed.",
        })

    return {"notifications": notifications, "disclaimer": MEDICAL_DISCLAIMER}


def run_coach_chat(user: dict, message: str, history: list) -> dict:
    msg_lower = message.lower()
    reply = "I'm your NutriMind nutrition coach. How can I help you today?"
    actions = []

    if ("meal plan" in msg_lower or "fix my" in msg_lower) and (
        "kcal" in msg_lower or "calorie" in msg_lower or "protein" in msg_lower or "target" in msg_lower
    ):
        target = user.get("daily_calorie_target", 2800)
        macros = user.get("macro_targets") or {}
        if isinstance(macros, str):
            import json
            macros = json.loads(macros)
        reply = (
            f"I'll align your meal plan to ~{target} kcal/day "
            f"and protein ~{macros.get('protein_g', 130)}g. "
            "The app will regenerate your week — open Meal Plan to review."
        )
        actions = [{"type": "navigate", "path": "/meal-plan"}]
    elif "macro" in msg_lower or ("calorie" in msg_lower and "target" in msg_lower):
        target = user.get("daily_calorie_target", 2000)
        macros = user.get("macro_targets") or {}
        if isinstance(macros, str):
            import json
            macros = json.loads(macros)
        reply = (
            f"Your targets: {target} kcal/day · "
            f"P {macros.get('protein_g', '—')}g · C {macros.get('carbs_g', '—')}g · F {macros.get('fat_g', '—')}g. "
            "Ask me to fix your meal plan to apply them."
        )
    elif "protein" in msg_lower and "paneer" in msg_lower:
        reply = "100g of paneer contains approximately 18g protein, 265 kcal, and is rich in calcium (IFCT data)."
    elif "swap" in msg_lower or "don't like" in msg_lower:
        reply = "I can suggest 3 alternatives for that meal — same calories (±50), matching macros, and allergen-safe. Which meal would you like to swap?"
        actions = [{"type": "open_meal_swap"}]
    elif "week" in msg_lower or "progress" in msg_lower:
        reply = "Check your Analytics page for weekly trends. Based on your logs, keep focusing on consistent protein intake."
        actions = [{"type": "navigate", "path": "/analytics"}]
    elif "burger" in msg_lower or "cheat" in msg_lower:
        reply = "No worries! I'll adjust your dinner to balance today's macros. Consider a lighter dinner: dal + salad (~350 cal, 15g protein)."
        actions = [{"type": "suggest_meal", "meal": "Dal + mixed salad"}]
    elif "bloated" in msg_lower:
        reply = "For bloating, try ginger tea, light khichdi, or moong dal soup. Avoid heavy dairy and fried foods today."
    elif "dinner" in msg_lower and ("₹" in message or "rs" in msg_lower or "under" in msg_lower):
        reply = "High-protein budget dinner: 2 egg bhurji with roti (~₹40, 22g protein) or sprout chaat (~₹30, 12g protein)."

    return {"reply": reply + f"\n\n_{MEDICAL_DISCLAIMER}_", "actions": actions}
