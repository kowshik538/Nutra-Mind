"""Agent 5 — Grocery Planning Agent"""

CATEGORIES = ["Vegetables", "Fruits", "Dairy", "Proteins", "Grains & Pulses", "Spices", "Condiments", "Beverages"]


def run_grocery_agent(meal_plan: dict, user: dict) -> dict:
    country = user.get("location_country", "India")
    currency = "INR" if country == "India" else "USD"
    items_by_cat = {cat: [] for cat in CATEGORIES}

    days = meal_plan.get("days", meal_plan)
    ingredients_needed = {}

    for day, data in (days.items() if isinstance(days, dict) else []):
        meals = data.get("meals", data) if isinstance(data, dict) else {}
        for meal in meals.values():
            if not isinstance(meal, dict):
                continue
            name = meal.get("name", "")
            for word in name.replace("+", ",").split(","):
                word = word.strip().split()[0] if word.strip() else ""
                if word and len(word) > 2:
                    key = word.lower()
                    ingredients_needed[key] = ingredients_needed.get(key, 0) + 1

    # Map to categories
    veg_keywords = ["rice", "tomato", "spinach", "vegetable", "onion", "potato", "beans"]
    for ing, count in ingredients_needed.items():
        qty = f"{count * 200}g"
        cost = count * 25 if currency == "INR" else count * 2.5
        cat = "Vegetables"
        if ing in ("paneer", "curd", "raita", "milk"):
            cat = "Dairy"
        elif ing in ("dal", "pesarattu", "oats", "ragi", "roti"):
            cat = "Grains & Pulses"
        elif ing in ("peanuts", "chicken", "egg"):
            cat = "Proteins"
        elif ing in ("chutney", "sambar"):
            cat = "Condiments"
        items_by_cat[cat].append({
            "id": ing,
            "name": ing.title(),
            "quantity": qty,
            "estimated_cost": cost,
            "currency": currency,
            "checked": False,
        })

    flat = []
    total = 0
    for cat, items in items_by_cat.items():
        if items:
            flat.append({"category": cat, "items": items})
            total += sum(i["estimated_cost"] for i in items)

    return {
        "items_json": {"categories": flat, "currency": currency},
        "total_cost_inr": round(total, 2),
    }
