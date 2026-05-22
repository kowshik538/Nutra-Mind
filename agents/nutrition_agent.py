"""Agent 2 — Nutrition Planning Agent"""

def run_nutrition_agent(user: dict) -> dict:
    weight = float(user.get("weight_kg", 70))
    height = float(user.get("height_cm", 170))
    age = int(user.get("age", 30))
    gender = user.get("gender", "other")
    activity = user.get("activity_level", "moderately_active")
    goal = user.get("goal_type", "maintain")

    multipliers = {
        "sedentary": 1.2, "lightly_active": 1.375, "moderately_active": 1.55,
        "very_active": 1.725, "extremely_active": 1.9,
    }

    base = 10 * weight + 6.25 * height - 5 * age
    bmr = base + (5 if gender == "male" else -161 if gender == "female" else -78)
    tdee = round(bmr * multipliers.get(activity, 1.55))

    if goal == "lose":
        calories = max(1200 if gender == "female" else 1500, round(tdee * 0.8))
    elif goal == "gain":
        calories = round(tdee * 1.15)
    else:
        calories = tdee

    protein_per_kg = 2.0 if goal == "gain" else 1.4
    protein_g = round(weight * protein_per_kg)
    fat_g = round(calories * 0.25 / 9)
    carbs_g = round((calories - protein_g * 4 - fat_g * 9) / 4)

    bmi = round(weight / ((height / 100) ** 2), 1)
    health = user.get("health_conditions") or []

    micros = {
        "iron_mg": 18 if gender == "female" and age < 50 else 8,
        "zinc_mg": 8 if gender == "female" else 11,
        "calcium_mg": 1200 if age > 50 else 1000,
        "vit_d_ug": 15, "vit_b12_ug": 2.4,
        "magnesium_mg": 310 if gender == "female" else 400,
        "potassium_mg": 3500, "sodium_mg": 2300,
        "fiber_g": 25 if gender == "female" else 38,
        "omega3_g": 1.6,
    }
    if "diabetes" in health:
        micros["fiber_g"] = 35
        micros["sodium_mg"] = 2000
    if "hypertension" in health or "high_blood_pressure" in health:
        micros["sodium_mg"] = 1500

    return {
        "bmr": round(bmr), "bmi": bmi, "tdee": tdee,
        "daily_calorie_target": calories,
        "macro_targets": {"protein_g": protein_g, "carbs_g": carbs_g, "fat_g": fat_g},
        "micro_targets": micros,
    }
