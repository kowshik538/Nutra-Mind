-- NutriMind AI - Initial Database Schema
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS vector;

-- Users
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255),
  password_hash VARCHAR(255),
  auth_provider VARCHAR(50) DEFAULT 'email',
  avatar_url TEXT,
  role VARCHAR(20) DEFAULT 'user',
  onboarding_completed BOOLEAN DEFAULT FALSE,
  age INTEGER,
  gender VARCHAR(20),
  height_cm DECIMAL(6,2),
  weight_kg DECIMAL(6,2),
  target_weight_kg DECIMAL(6,2),
  goal_type VARCHAR(50),
  activity_level VARCHAR(50),
  occupation VARCHAR(50),
  diet_type VARCHAR(50),
  religious_restrictions TEXT[],
  food_dislikes TEXT[],
  allergies TEXT[],
  spice_tolerance VARCHAR(20),
  location_city VARCHAR(100),
  location_state VARCHAR(100),
  location_country VARCHAR(100),
  cuisine_preference VARCHAR(100),
  festival_calendar VARCHAR(50),
  budget_per_day DECIMAL(10,2),
  budget_currency VARCHAR(10) DEFAULT 'INR',
  wake_time TIME,
  sleep_time TIME,
  meal_timings JSONB,
  water_goal_ml INTEGER DEFAULT 2500,
  health_conditions TEXT[],
  medications TEXT,
  pregnancy_breastfeeding BOOLEAN DEFAULT FALSE,
  motivation_style VARCHAR(50),
  target_date DATE,
  bmr DECIMAL(8,2),
  tdee DECIMAL(8,2),
  daily_calorie_target INTEGER,
  macro_targets JSONB,
  micro_targets JSONB,
  profile_json JSONB,
  risk_flags TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS refresh_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  token_hash VARCHAR(255) NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Foods nutrition database
CREATE TABLE IF NOT EXISTS foods (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  name_local VARCHAR(255),
  category VARCHAR(100),
  serving_size_g DECIMAL(8,2) DEFAULT 100,
  calories DECIMAL(8,2),
  protein_g DECIMAL(8,2),
  carbs_g DECIMAL(8,2),
  fat_g DECIMAL(8,2),
  fiber_g DECIMAL(8,2),
  iron_mg DECIMAL(8,4),
  calcium_mg DECIMAL(8,4),
  zinc_mg DECIMAL(8,4),
  vit_d_ug DECIMAL(8,4),
  vit_b12_ug DECIMAL(8,4),
  magnesium_mg DECIMAL(8,4),
  potassium_mg DECIMAL(8,4),
  sodium_mg DECIMAL(8,4),
  omega3_g DECIMAL(8,4),
  is_vegetarian BOOLEAN DEFAULT TRUE,
  is_vegan BOOLEAN DEFAULT FALSE,
  is_jain BOOLEAN DEFAULT FALSE,
  is_gluten_free BOOLEAN DEFAULT FALSE,
  is_dairy_free BOOLEAN DEFAULT FALSE,
  region VARCHAR(100),
  season VARCHAR(50),
  cost_per_100g_inr DECIMAL(8,2),
  source VARCHAR(20) DEFAULT 'USDA',
  barcode VARCHAR(50),
  embedding vector(1536),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_foods_name ON foods USING gin(to_tsvector('english', name));
CREATE INDEX IF NOT EXISTS idx_foods_region ON foods(region);

-- Meal plans
CREATE TABLE IF NOT EXISTS meal_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  week_start_date DATE NOT NULL,
  generated_by_agent VARCHAR(100) DEFAULT 'meal_planner_agent',
  plan_json JSONB NOT NULL,
  status VARCHAR(20) DEFAULT 'active',
  festival_adapted VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Daily food logs
CREATE TABLE IF NOT EXISTS daily_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  meal_type VARCHAR(20) NOT NULL,
  food_id UUID REFERENCES foods(id),
  food_name VARCHAR(255),
  quantity_g DECIMAL(8,2),
  calories DECIMAL(8,2),
  protein_g DECIMAL(8,2),
  carbs_g DECIMAL(8,2),
  fat_g DECIMAL(8,2),
  log_method VARCHAR(20) DEFAULT 'manual',
  image_url TEXT,
  confidence_score DECIMAL(5,2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_daily_logs_user_date ON daily_logs(user_id, date);

-- Recipes
CREATE TABLE IF NOT EXISTS recipes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  food_name VARCHAR(255) NOT NULL,
  ingredients_json JSONB NOT NULL,
  steps_json JSONB NOT NULL,
  prep_time_min INTEGER,
  cook_time_min INTEGER,
  difficulty VARCHAR(20),
  macros_json JSONB,
  micros_json JSONB,
  tips TEXT[],
  image_url TEXT,
  diet_tags TEXT[],
  allergen_warnings TEXT[],
  cuisine VARCHAR(100),
  created_by_agent BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS saved_recipes (
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  recipe_id UUID REFERENCES recipes(id) ON DELETE CASCADE,
  saved_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, recipe_id)
);

-- Progress logs
CREATE TABLE IF NOT EXISTS progress_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  weight_kg DECIMAL(6,2),
  water_ml INTEGER DEFAULT 0,
  sleep_hours DECIMAL(4,2),
  steps_count INTEGER,
  mood INTEGER CHECK (mood BETWEEN 1 AND 5),
  energy_level INTEGER CHECK (energy_level BETWEEN 1 AND 5),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, date)
);

-- Grocery lists
CREATE TABLE IF NOT EXISTS grocery_lists (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  week_start_date DATE NOT NULL,
  items_json JSONB NOT NULL,
  total_cost_inr DECIMAL(10,2),
  checked_items TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  message TEXT NOT NULL,
  scheduled_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Chat conversations
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL,
  content TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Festival calendar
CREATE TABLE IF NOT EXISTS festivals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  religion VARCHAR(50),
  start_date DATE,
  end_date DATE,
  duration_days INTEGER,
  fasting_rules JSONB,
  traditional_foods TEXT[],
  regions TEXT[],
  year INTEGER
);

-- Achievements & gamification
CREATE TABLE IF NOT EXISTS achievements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  badge_type VARCHAR(100) NOT NULL,
  earned_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB
);

CREATE TABLE IF NOT EXISTS challenges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  duration_days INTEGER,
  criteria JSONB,
  badge_reward VARCHAR(100)
);

CREATE TABLE IF NOT EXISTS user_challenges (
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  challenge_id UUID REFERENCES challenges(id) ON DELETE CASCADE,
  progress INTEGER DEFAULT 0,
  completed BOOLEAN DEFAULT FALSE,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  PRIMARY KEY (user_id, challenge_id)
);

-- Community posts
CREATE TABLE IF NOT EXISTS community_posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  content TEXT,
  image_url TEXT,
  likes_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Custom foods
CREATE TABLE IF NOT EXISTS custom_foods (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  nutrition_json JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User memory for RAG
CREATE TABLE IF NOT EXISTS user_memory (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  memory_type VARCHAR(50),
  content TEXT NOT NULL,
  embedding vector(1536),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Agent run logs
CREATE TABLE IF NOT EXISTS agent_runs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  agent_name VARCHAR(100),
  input_json JSONB,
  output_json JSONB,
  status VARCHAR(20),
  error_message TEXT,
  duration_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
