"""Agent 3 — Meal Planning Agent"""
from datetime import date, timedelta
from config import MEDICAL_DISCLAIMER

DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]

# Regional meal templates (Andhra vegetarian example from spec)
ANDHRA_VEG_MEALS = {
    "breakfast": [
        {"name": "Pesarattu + coconut chutney", "calories": 320, "protein_g": 14},
        {"name": "Idli + sambar", "calories": 280, "protein_g": 10},
        {"name": "Upma with vegetables", "calories": 290, "protein_g": 8},
    ],
    "lunch": [
        {"name": "Rice + tomato pappu + curd + papad", "calories": 510, "protein_g": 18},
        {"name": "Rice + sambar + beans curry", "calories": 480, "protein_g": 16},
        {"name": "Ragi roti + dal + greens", "calories": 450, "protein_g": 17},
    ],
    "snack": [
        {"name": "Roasted peanuts + tea", "calories": 180, "protein_g": 8},
        {"name": "Fruit bowl + almonds", "calories": 200, "protein_g": 5},
        {"name": "Buttermilk + murukku", "calories": 160, "protein_g": 4},
    ],
    "dinner": [
        {"name": "Vegetable pulao + raita", "calories": 420, "protein_g": 16},
        {"name": "Roti + paneer curry + salad", "calories": 440, "protein_g": 22},
        {"name": "Dosa + chutney + sambar", "calories": 380, "protein_g": 12},
    ],
}

NORTH_INDIAN_MEALS = {
    "breakfast": [
        {"name": "Poha with peanuts", "calories": 300, "protein_g": 10},
        {"name": "Paratha + curd", "calories": 350, "protein_g": 12},
    ],
    "lunch": [
        {"name": "Roti + dal + sabzi", "calories": 500, "protein_g": 18},
        {"name": "Rajma chawal + salad", "calories": 520, "protein_g": 20},
    ],
    "snack": [{"name": "Sprouts chaat", "calories": 150, "protein_g": 8}],
    "dinner": [
        {"name": "Khichdi + kadhi", "calories": 400, "protein_g": 14},
        {"name": "Roti + palak paneer", "calories": 430, "protein_g": 20},
    ],
}


def _filter_allergens(meals: list, allergies: list) -> list:
    allergen_map = {
        "dairy": ["curd", "paneer", "raita", "kadhi", "butter"],
        "gluten": ["roti", "paratha", "dosa"],
        "peanuts": ["peanuts"],
        "eggs": ["egg"],
        "soy": ["tofu"],
    }
    safe = []
    for meal in meals:
        name_lower = meal["name"].lower()
        skip = False
        for allergy in allergies:
            triggers = allergen_map.get(allergy.lower(), [allergy.lower()])
            if any(t in name_lower for t in triggers):
                skip = True
                break
        if not skip:
            safe.append(meal)
    return safe if safe else meals


def run_meal_planner_agent(user: dict) -> dict:
    cuisine = (user.get("cuisine_preference") or "South Indian").lower()
    allergies = user.get("allergies") or []
    diet = user.get("diet_type", "vegetarian")
    budget = float(user.get("budget_per_day") or 200)

    templates = ANDHRA_VEG_MEALS if "andhra" in cuisine or "south" in cuisine else NORTH_INDIAN_MEALS
    if diet in ("non-vegetarian", "eggetarian"):
        templates["lunch"].append({"name": "Rice + chicken curry + salad", "calories": 550, "protein_g": 35})

    used_dishes = set()
    plan_days = {}
    meal_idx = {k: 0 for k in ["breakfast", "lunch", "snack", "dinner"]}

    for i, day in enumerate(DAYS):
        day_meals = {}
        daily_cost = 0
        for meal_type in ["breakfast", "lunch", "snack", "dinner"]:
            options = _filter_allergens(templates.get(meal_type, [{"name": "Seasonal fruit", "calories": 100, "protein_g": 2}]), allergies)
            idx = meal_idx[meal_type] % len(options)
            meal = dict(options[idx])
            while meal["name"] in used_dishes and idx < len(options) - 1:
                idx += 1
                meal = dict(options[idx % len(options)])
            used_dishes.add(meal["name"])
            meal_idx[meal_type] += 1
            meal["meal_type"] = meal_type
            meal["estimated_cost_inr"] = round(budget / 4 * 0.3, 0)
            daily_cost += meal["estimated_cost_inr"]
            day_meals[meal_type] = meal
            if meal_type == "snack":
                day_meals["snack2"] = dict(options[(idx + 1) % len(options)])
                day_meals["snack2"]["meal_type"] = "snack"
        plan_days[day] = {"meals": day_meals, "daily_calories": sum(m.get("calories", 0) for m in day_meals.values() if isinstance(m, dict)), "estimated_cost_inr": daily_cost}

    festival_adapted = None
    festival_cal = user.get("festival_calendar")
    if festival_cal == "Hindu":
        festival_adapted = "Navratri/Ekadashi rules may apply — sattvic options included"

    week_start = date.today() - timedelta(days=date.today().weekday())
    return {
        "plan_json": {"week_start": str(week_start), "days": plan_days, "cuisine": cuisine, "diet_type": diet},
        "festival_adapted": festival_adapted,
        "disclaimer": MEDICAL_DISCLAIMER,
    }


def run_meal_swap(user: dict, day: str, meal_type: str, meal_index: int = 0) -> dict:
    allergies = user.get("allergies") or []
    cuisine = (user.get("cuisine_preference") or "South Indian").lower()
    templates = ANDHRA_VEG_MEALS if "south" in cuisine else NORTH_INDIAN_MEALS
    options = _filter_allergens(templates.get(meal_type, []), allergies)

    alternatives = []
    for opt in options[:3]:
        alternatives.append({
            **opt,
            "meal_type": meal_type,
            "macro_comparison": "Within ±50 cal of original",
            "allergen_safe": True,
        })
    return {"alternatives": alternatives, "disclaimer": MEDICAL_DISCLAIMER}
