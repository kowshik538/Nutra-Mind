import os
from dotenv import load_dotenv

load_dotenv()

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
MEDICAL_DISCLAIMER = (
    "NutriMind AI provides guidance and is not a replacement for "
    "licensed medical or nutritional professionals."
)
MIN_CALORIES_FEMALE = 1200
MIN_CALORIES_MALE = 1500
