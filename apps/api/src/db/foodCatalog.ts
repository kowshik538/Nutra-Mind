/** Per 100g unless noted — USDA / IFCT approximations */
export type FoodSeed = {
  name: string;
  name_local?: string;
  category: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g?: number;
  iron_mg?: number;
  calcium_mg?: number;
  potassium_mg?: number;
  region?: string;
  source?: string;
  is_vegetarian?: boolean;
  is_vegan?: boolean;
  is_gluten_free?: boolean;
};

export const FOOD_CATALOG: FoodSeed[] = [
  // Existing staples
  { name: 'Paneer', name_local: 'पनीर', category: 'dairy', calories: 265, protein_g: 18, carbs_g: 1.2, fat_g: 20.8, calcium_mg: 480, region: 'India', source: 'IFCT', is_vegetarian: true },
  { name: 'Pesarattu', name_local: 'పెసరట్టు', category: 'breakfast', calories: 180, protein_g: 8, carbs_g: 22, fat_g: 6, region: 'Andhra Pradesh', source: 'IFCT', is_vegetarian: true, is_vegan: true },
  { name: 'Idli', name_local: 'ఇడ్లీ', category: 'breakfast', calories: 39, protein_g: 1.7, carbs_g: 7.8, fat_g: 0.2, region: 'South India', source: 'IFCT', is_vegetarian: true, is_vegan: true },
  { name: 'Upma with vegetables', name_local: 'ఉప్మా', category: 'breakfast', calories: 290, protein_g: 8, carbs_g: 42, fat_g: 10, region: 'South India', source: 'IFCT', is_vegetarian: true, is_vegan: true },
  { name: 'Masala Dosa', category: 'breakfast', calories: 350, protein_g: 10, carbs_g: 48, fat_g: 12, region: 'South India', source: 'IFCT', is_vegetarian: true },
  { name: 'Poha', name_local: 'పోహా', category: 'breakfast', calories: 130, protein_g: 3, carbs_g: 28, fat_g: 2, region: 'India', source: 'IFCT', is_vegetarian: true, is_vegan: true },
  { name: 'Paratha, plain', category: 'breakfast', calories: 320, protein_g: 8, carbs_g: 42, fat_g: 14, region: 'North India', source: 'IFCT', is_vegetarian: true },
  { name: 'Tea with milk', name_local: 'chai', category: 'beverage', calories: 45, protein_g: 2, carbs_g: 6, fat_g: 2, region: 'India', source: 'IFCT', is_vegetarian: true },
  { name: 'Coffee with milk', category: 'beverage', calories: 40, protein_g: 2, carbs_g: 5, fat_g: 2, region: 'Global', source: 'USDA', is_vegetarian: true },

  // Grains & staples
  { name: 'Rice, white cooked', name_local: 'అన్నం', category: 'grains', calories: 130, protein_g: 2.7, carbs_g: 28, fat_g: 0.3, region: 'Global', source: 'USDA', is_vegetarian: true, is_vegan: true },
  { name: 'Brown Rice, cooked', category: 'grains', calories: 112, protein_g: 2.6, carbs_g: 24, fat_g: 0.9, fiber_g: 1.8, region: 'Global', source: 'USDA', is_vegetarian: true, is_vegan: true },
  { name: 'Roti, whole wheat', name_local: 'రొట్టె', category: 'grains', calories: 71, protein_g: 3.1, carbs_g: 12, fat_g: 1.7, region: 'India', source: 'IFCT', is_vegetarian: true, is_vegan: true },
  { name: 'Chapati', name_local: 'చపాతీ', category: 'grains', calories: 120, protein_g: 4, carbs_g: 20, fat_g: 3, region: 'India', source: 'IFCT', is_vegetarian: true, is_vegan: true },
  { name: 'Oats, rolled dry', category: 'grains', calories: 389, protein_g: 17, carbs_g: 66, fat_g: 7, fiber_g: 10.6, region: 'Global', source: 'USDA', is_vegetarian: true, is_vegan: true },

  // Pulses & protein
  { name: 'Toor Dal, cooked', name_local: 'కంది పప్పు', category: 'pulses', calories: 104, protein_g: 7, carbs_g: 17, fat_g: 0.4, iron_mg: 1.5, region: 'India', source: 'IFCT', is_vegetarian: true, is_vegan: true },
  { name: 'Moong Dal, cooked', category: 'pulses', calories: 105, protein_g: 7, carbs_g: 16, fat_g: 0.4, region: 'India', source: 'IFCT', is_vegetarian: true, is_vegan: true },
  { name: 'Chana Dal, cooked', category: 'pulses', calories: 110, protein_g: 8, carbs_g: 17, fat_g: 1, region: 'India', source: 'IFCT', is_vegetarian: true, is_vegan: true },
  { name: 'Rajma, cooked', category: 'pulses', calories: 127, protein_g: 8.7, carbs_g: 22.8, fat_g: 0.5, region: 'India', source: 'IFCT', is_vegetarian: true, is_vegan: true },
  { name: 'Soy chunks, cooked', category: 'pulses', calories: 120, protein_g: 15, carbs_g: 8, fat_g: 2, region: 'India', source: 'IFCT', is_vegetarian: true, is_vegan: true },
  { name: 'Sprouts, moong', category: 'pulses', calories: 105, protein_g: 7, carbs_g: 14, fat_g: 0.4, region: 'India', source: 'IFCT', is_vegetarian: true, is_vegan: true },

  // Vegetables (raw unless noted)
  { name: 'Carrot, raw', name_local: 'క్యారట్', category: 'vegetables', calories: 41, protein_g: 0.9, carbs_g: 10, fat_g: 0.2, fiber_g: 2.8, region: 'Global', source: 'USDA', is_vegetarian: true, is_vegan: true },
  { name: 'Potato, boiled', name_local: 'బంగాళాదుంప', category: 'vegetables', calories: 87, protein_g: 1.9, carbs_g: 20, fat_g: 0.1, region: 'Global', source: 'USDA', is_vegetarian: true, is_vegan: true },
  { name: 'Tomato, raw', name_local: 'టమాట', category: 'vegetables', calories: 18, protein_g: 0.9, carbs_g: 3.9, fat_g: 0.2, region: 'Global', source: 'USDA', is_vegetarian: true, is_vegan: true },
  { name: 'Onion, raw', name_local: 'ఉల్లి', category: 'vegetables', calories: 40, protein_g: 1.1, carbs_g: 9.3, fat_g: 0.1, region: 'Global', source: 'USDA', is_vegetarian: true, is_vegan: true },
  { name: 'Cucumber, raw', category: 'vegetables', calories: 15, protein_g: 0.7, carbs_g: 3.6, fat_g: 0.1, region: 'Global', source: 'USDA', is_vegetarian: true, is_vegan: true },
  { name: 'Spinach, cooked', name_local: 'పాలకూర', category: 'vegetables', calories: 23, protein_g: 2.9, carbs_g: 3.6, fat_g: 0.4, iron_mg: 3.6, region: 'Global', source: 'USDA', is_vegetarian: true, is_vegan: true },
  { name: 'Cabbage, raw', category: 'vegetables', calories: 25, protein_g: 1.3, carbs_g: 6, fat_g: 0.1, region: 'Global', source: 'USDA', is_vegetarian: true, is_vegan: true },
  { name: 'Cauliflower, raw', name_local: 'ఫ్లవర్', category: 'vegetables', calories: 25, protein_g: 1.9, carbs_g: 5, fat_g: 0.3, region: 'Global', source: 'USDA', is_vegetarian: true, is_vegan: true },
  { name: 'Broccoli, raw', category: 'vegetables', calories: 34, protein_g: 2.8, carbs_g: 7, fat_g: 0.4, region: 'Global', source: 'USDA', is_vegetarian: true, is_vegan: true },
  { name: 'Bell pepper, raw', category: 'vegetables', calories: 31, protein_g: 1, carbs_g: 6, fat_g: 0.3, region: 'Global', source: 'USDA', is_vegetarian: true, is_vegan: true },
  { name: 'Beetroot, boiled', category: 'vegetables', calories: 44, protein_g: 1.7, carbs_g: 10, fat_g: 0.2, region: 'Global', source: 'USDA', is_vegetarian: true, is_vegan: true },
  { name: 'Pumpkin, cooked', category: 'vegetables', calories: 26, protein_g: 1, carbs_g: 6.5, fat_g: 0.1, region: 'Global', source: 'USDA', is_vegetarian: true, is_vegan: true },
  { name: 'Okra, cooked', name_local: 'బెండకాయ', category: 'vegetables', calories: 33, protein_g: 1.9, carbs_g: 7, fat_g: 0.2, region: 'India', source: 'IFCT', is_vegetarian: true, is_vegan: true },
  { name: 'Brinjal, cooked', name_local: 'వంకాయ', category: 'vegetables', calories: 35, protein_g: 1, carbs_g: 8, fat_g: 0.2, region: 'India', source: 'IFCT', is_vegetarian: true, is_vegan: true },
  { name: 'Green beans, cooked', category: 'vegetables', calories: 35, protein_g: 1.9, carbs_g: 8, fat_g: 0.1, region: 'Global', source: 'USDA', is_vegetarian: true, is_vegan: true },
  { name: 'Mixed vegetables, cooked', category: 'vegetables', calories: 45, protein_g: 2, carbs_g: 8, fat_g: 0.5, region: 'Global', source: 'USDA', is_vegetarian: true, is_vegan: true },
  { name: 'Sweet corn, boiled', category: 'vegetables', calories: 96, protein_g: 3.4, carbs_g: 21, fat_g: 1.5, region: 'Global', source: 'USDA', is_vegetarian: true, is_vegan: true },
  { name: 'Lettuce, raw', category: 'vegetables', calories: 15, protein_g: 1.4, carbs_g: 2.9, fat_g: 0.2, region: 'Global', source: 'USDA', is_vegetarian: true, is_vegan: true },
  { name: 'Mushroom, cooked', category: 'vegetables', calories: 35, protein_g: 3.6, carbs_g: 4, fat_g: 0.5, region: 'Global', source: 'USDA', is_vegetarian: true, is_vegan: true },

  // Fruits
  { name: 'Banana', name_local: 'అరటి', category: 'fruits', calories: 89, protein_g: 1.1, carbs_g: 23, fat_g: 0.3, potassium_mg: 358, region: 'Global', source: 'USDA', is_vegetarian: true, is_vegan: true },
  { name: 'Apple, raw', category: 'fruits', calories: 52, protein_g: 0.3, carbs_g: 14, fat_g: 0.2, fiber_g: 2.4, region: 'Global', source: 'USDA', is_vegetarian: true, is_vegan: true },
  { name: 'Orange, raw', category: 'fruits', calories: 47, protein_g: 0.9, carbs_g: 12, fat_g: 0.1, region: 'Global', source: 'USDA', is_vegetarian: true, is_vegan: true },
  { name: 'Mango, raw', name_local: 'మామిడి', category: 'fruits', calories: 60, protein_g: 0.8, carbs_g: 15, fat_g: 0.4, region: 'India', source: 'IFCT', is_vegetarian: true, is_vegan: true },
  { name: 'Papaya, raw', category: 'fruits', calories: 43, protein_g: 0.5, carbs_g: 11, fat_g: 0.3, region: 'Global', source: 'USDA', is_vegetarian: true, is_vegan: true },
  { name: 'Grapes, raw', category: 'fruits', calories: 69, protein_g: 0.7, carbs_g: 18, fat_g: 0.2, region: 'Global', source: 'USDA', is_vegetarian: true, is_vegan: true },
  { name: 'Watermelon, raw', category: 'fruits', calories: 30, protein_g: 0.6, carbs_g: 8, fat_g: 0.2, region: 'Global', source: 'USDA', is_vegetarian: true, is_vegan: true },
  { name: 'Pomegranate, raw', name_local: 'దానిమ్మ', category: 'fruits', calories: 83, protein_g: 1.7, carbs_g: 19, fat_g: 1.2, region: 'India', source: 'IFCT', is_vegetarian: true, is_vegan: true },
  { name: 'Guava, raw', name_local: 'జామ', category: 'fruits', calories: 68, protein_g: 2.6, carbs_g: 14, fat_g: 1, region: 'India', source: 'IFCT', is_vegetarian: true, is_vegan: true },
  { name: 'Dates, dried', category: 'fruits', calories: 282, protein_g: 2.5, carbs_g: 75, fat_g: 0.4, region: 'Global', source: 'USDA', is_vegetarian: true, is_vegan: true },
  { name: 'Pineapple, raw', category: 'fruits', calories: 50, protein_g: 0.5, carbs_g: 13, fat_g: 0.1, region: 'Global', source: 'USDA', is_vegetarian: true, is_vegan: true },
  { name: 'Strawberry, raw', category: 'fruits', calories: 32, protein_g: 0.7, carbs_g: 7.7, fat_g: 0.3, region: 'Global', source: 'USDA', is_vegetarian: true, is_vegan: true },
  { name: 'Mixed fruit bowl', category: 'fruits', calories: 55, protein_g: 0.8, carbs_g: 14, fat_g: 0.2, region: 'Global', source: 'USDA', is_vegetarian: true, is_vegan: true },

  // Lunch / dinner dishes
  { name: 'Sambar', category: 'lunch', calories: 85, protein_g: 4, carbs_g: 12, fat_g: 2.5, region: 'South India', source: 'IFCT', is_vegetarian: true, is_vegan: true },
  { name: 'Rasam', category: 'lunch', calories: 40, protein_g: 1.5, carbs_g: 7, fat_g: 1, region: 'South India', source: 'IFCT', is_vegetarian: true, is_vegan: true },
  { name: 'Tomato Pappu', name_local: 'టమాటా పప్పు', category: 'lunch', calories: 95, protein_g: 5, carbs_g: 10, fat_g: 3, region: 'Andhra Pradesh', source: 'IFCT', is_vegetarian: true },
  { name: 'Dal fry', category: 'lunch', calories: 120, protein_g: 6, carbs_g: 15, fat_g: 4, region: 'India', source: 'IFCT', is_vegetarian: true, is_vegan: true },
  { name: 'Paneer curry', category: 'dinner', calories: 280, protein_g: 14, carbs_g: 12, fat_g: 20, region: 'India', source: 'IFCT', is_vegetarian: true },
  { name: 'Palak paneer', category: 'dinner', calories: 240, protein_g: 12, carbs_g: 8, fat_g: 18, region: 'North India', source: 'IFCT', is_vegetarian: true },
  { name: 'Aloo gobi', category: 'dinner', calories: 110, protein_g: 3, carbs_g: 14, fat_g: 5, region: 'India', source: 'IFCT', is_vegetarian: true, is_vegan: true },
  { name: 'Vegetable Pulao', category: 'lunch', calories: 180, protein_g: 4, carbs_g: 30, fat_g: 5, region: 'India', source: 'IFCT', is_vegetarian: true },
  { name: 'Biryani, vegetable', category: 'lunch', calories: 280, protein_g: 8, carbs_g: 45, fat_g: 8, region: 'India', source: 'IFCT', is_vegetarian: true },
  { name: 'Curd rice', name_local: 'పెరుగన్నం', category: 'lunch', calories: 220, protein_g: 8, carbs_g: 35, fat_g: 5, region: 'South India', source: 'IFCT', is_vegetarian: true },
  { name: 'Rice + sambar + vegetable curry', category: 'lunch', calories: 420, protein_g: 12, carbs_g: 72, fat_g: 8, region: 'South India', source: 'IFCT', is_vegetarian: true },
  { name: 'Roti + dal + sabzi', category: 'dinner', calories: 380, protein_g: 14, carbs_g: 55, fat_g: 10, region: 'India', source: 'IFCT', is_vegetarian: true },
  { name: 'Khichdi', category: 'dinner', calories: 150, protein_g: 5, carbs_g: 25, fat_g: 3, region: 'India', source: 'IFCT', is_vegetarian: true },
  { name: 'Salad, mixed raw', category: 'lunch', calories: 25, protein_g: 1.5, carbs_g: 5, fat_g: 0.2, region: 'Global', source: 'USDA', is_vegetarian: true, is_vegan: true },
  { name: 'Coconut Chutney', category: 'condiment', calories: 120, protein_g: 2, carbs_g: 5, fat_g: 10, region: 'South India', source: 'IFCT', is_vegetarian: true, is_vegan: true },

  // Snacks & dairy
  { name: 'Curd, plain', name_local: 'పెరుగు', category: 'dairy', calories: 61, protein_g: 3.5, carbs_g: 4.7, fat_g: 3.3, calcium_mg: 121, region: 'India', source: 'IFCT', is_vegetarian: true },
  { name: 'Greek Yogurt, plain', category: 'dairy', calories: 97, protein_g: 9, carbs_g: 3.6, fat_g: 5, region: 'Global', source: 'USDA', is_vegetarian: true },
  { name: 'Milk, whole', category: 'dairy', calories: 61, protein_g: 3.2, carbs_g: 4.8, fat_g: 3.3, calcium_mg: 113, region: 'Global', source: 'USDA', is_vegetarian: true },
  { name: 'Roasted Peanuts', category: 'snacks', calories: 567, protein_g: 26, carbs_g: 16, fat_g: 49, region: 'Global', source: 'USDA', is_vegetarian: true, is_vegan: true },
  { name: 'Almonds', category: 'snacks', calories: 579, protein_g: 21, carbs_g: 22, fat_g: 50, region: 'Global', source: 'USDA', is_vegetarian: true, is_vegan: true },
  { name: 'Buttermilk', name_local: 'మజ్జిగ', category: 'beverage', calories: 40, protein_g: 2, carbs_g: 5, fat_g: 1, region: 'India', source: 'IFCT', is_vegetarian: true },
  { name: 'Fruit bowl with nuts', category: 'snacks', calories: 120, protein_g: 3, carbs_g: 22, fat_g: 4, region: 'Global', source: 'USDA', is_vegetarian: true },

  // Non-veg (optional)
  { name: 'Egg, whole boiled', category: 'protein', calories: 155, protein_g: 13, carbs_g: 1.1, fat_g: 11, region: 'Global', source: 'USDA', is_vegetarian: true },
  { name: 'Chicken breast, grilled', category: 'protein', calories: 165, protein_g: 31, carbs_g: 0, fat_g: 3.6, region: 'Global', source: 'USDA', is_vegetarian: false },
];
