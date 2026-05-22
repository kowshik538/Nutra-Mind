"""Agent 4 — Recipe Agent"""
from config import MEDICAL_DISCLAIMER

def run_recipe_agent(meal_name: str, user: dict) -> dict:
    allergies = user.get("allergies") or []
    warnings = [f"Contains {a}" for a in allergies if a.lower() in meal_name.lower()]

    return {
        "food_name": meal_name,
        "ingredients": [
            {"name": "Main ingredient", "quantity": "1 cup", "notes": "Adjust per serving"},
            {"name": "Spices", "quantity": "1 tsp each", "notes": "Turmeric, cumin, mustard seeds"},
        ],
        "steps": [
            "Prep all ingredients and wash vegetables.",
            "Heat oil in a pan, add tempering spices.",
            "Cook main ingredients until done, garnish and serve.",
        ],
        "prep_time_min": 15,
        "cook_time_min": 25,
        "difficulty": "easy",
        "macros": {"calories": 320, "protein_g": 14, "carbs_g": 35, "fat_g": 12},
        "micros": {"iron_mg": 2.5, "calcium_mg": 80, "vit_b12_ug": 0.5},
        "tips": [
            "Add lemon juice at the end to preserve vitamin C.",
            "Use ragi flour instead of maida for more fiber and calcium.",
        ],
        "healthy_alternatives": ["Use jaggery instead of refined sugar", "Steam instead of fry"],
        "allergen_warnings": warnings,
        "image_url": f"https://source.unsplash.com/800x600/?{meal_name.replace(' ', ',')},food",
        "diet_tags": [user.get("diet_type", "vegetarian")],
        "disclaimer": MEDICAL_DISCLAIMER,
    }
