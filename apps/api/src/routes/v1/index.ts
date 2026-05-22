import { Router } from 'express';
import { authenticate, requireAdmin } from '../../middleware/auth';
import { asyncHandler } from '../../middleware/asyncHandler';
import * as auth from '../../controllers/authController';
import * as onboarding from '../../controllers/onboardingController';
import * as dashboard from '../../controllers/dashboardController';
import * as mealPlan from '../../controllers/mealPlanController';
import * as foodLog from '../../controllers/foodLogController';
import * as analytics from '../../controllers/analyticsController';
import * as chat from '../../controllers/chatController';
import * as grocery from '../../controllers/groceryController';
import * as recipe from '../../controllers/recipeController';
import * as coach from '../../controllers/coachController';
import * as admin from '../../controllers/adminController';

const router = Router();
const h = asyncHandler;

// Auth
router.post('/auth/signup', h(auth.signup));
router.post('/auth/login', h(auth.login));
router.post('/auth/refresh', h(auth.refresh));
router.post('/auth/forgot-password', h(auth.forgotPassword));
router.post('/auth/reset-password', h(auth.resetPassword));
router.post('/auth/oauth', h(auth.oauthCallback));
router.post('/auth/google', h(auth.googleLogin));
router.get('/auth/me', authenticate, h(auth.me));

// Onboarding
router.post('/onboarding/complete', authenticate, h(onboarding.completeOnboarding));

// Dashboard
router.get('/dashboard', authenticate, h(dashboard.getDashboard));

// Meal plans
router.get('/meal-plans/current', authenticate, h(mealPlan.getCurrentMealPlan));
router.post('/meal-plans/generate', authenticate, h(mealPlan.generateMealPlan));
router.get('/meal-plans/day/:day', authenticate, h(mealPlan.getDayMeals));
router.post('/meal-plans/swap', authenticate, h(mealPlan.swapMeal));

// Food logging
router.get('/foods/search', authenticate, h(foodLog.searchFoods));
router.post('/logs/food', authenticate, h(foodLog.logFood));
router.post('/logs/voice', authenticate, h(foodLog.voiceLog));
router.post('/logs/image', authenticate, h(foodLog.imageLog));
router.get('/logs/daily', authenticate, h(foodLog.getDailyLogs));

// Progress
router.post('/progress', authenticate, h(coach.logProgress));

// Analytics
router.get('/analytics', authenticate, h(analytics.getAnalytics));

// Chat
router.get('/chat/history', authenticate, h(chat.getChatHistory));
router.post('/chat/message', authenticate, h(chat.sendMessage));

// Grocery
router.get('/grocery', authenticate, h(grocery.getGroceryList));
router.post('/grocery/generate', authenticate, h(grocery.generateGroceryList));
router.patch('/grocery/toggle', authenticate, h(grocery.toggleGroceryItem));

// Recipes
router.get('/recipes', authenticate, h(recipe.listRecipes));
router.get('/recipes/:id', authenticate, h(recipe.getRecipe));
router.post('/recipes/generate', authenticate, h(recipe.generateRecipe));
router.post('/recipes/:id/save', authenticate, h(recipe.saveRecipe));

// Coach
router.get('/coach/messages', authenticate, h(coach.getCoachMessages));
router.post('/coach/nudges', authenticate, h(coach.generateNudges));

// Admin
router.get('/admin/users', authenticate, requireAdmin, h(admin.listUsers));
router.post('/admin/users/:id/ban', authenticate, requireAdmin, h(admin.banUser));
router.get('/admin/stats', authenticate, requireAdmin, h(admin.platformStats));
router.post('/admin/foods', authenticate, requireAdmin, h(admin.manageFood));

export default router;
