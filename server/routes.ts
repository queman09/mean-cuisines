import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { insertRecipeSchema, insertContributorSchema } from "@shared/schema";
import { z } from "zod";
import { buildParallelPlan } from "./parallelEngine";

// Seed default data if empty
function seedIfEmpty() {
  const existingContributors = storage.getContributors();
  const existingRecipes = storage.getRecipes();
  // Re-seed if we have fewer than 30 recipes (handles Railway's stale DB)
  if (existingContributors.length === 0 || existingRecipes.length < 30) {
    // Clear existing data first so we don't get duplicates
    // Delete all existing recipes and contributors so we can re-seed clean
    existingRecipes.forEach(r => storage.deleteRecipe(r.id));
    existingContributors.forEach(c => storage.deleteContributor(c.id));
    // Seed contributors
    const admin = storage.createContributor({
      name: "Mean Cuisines",
      photoUrl: "https://ui-avatars.com/api/?name=Mean+Cuisines&background=c2410c&color=fff&size=128&bold=true",
      role: "admin",
    });

    const chef1 = storage.createContributor({
      name: "Maria Santos",
      photoUrl: "https://randomuser.me/api/portraits/women/44.jpg",
      role: "contributor",
    });

    const chef2 = storage.createContributor({
      name: "James Okafor",
      photoUrl: "https://randomuser.me/api/portraits/men/32.jpg",
      role: "contributor",
    });

    const chef3 = storage.createContributor({
      name: "Priya Nair",
      photoUrl: "https://randomuser.me/api/portraits/women/68.jpg",
      role: "contributor",
    });

    const chef4 = storage.createContributor({
      name: "Carlos Rivera",
      photoUrl: "https://randomuser.me/api/portraits/men/75.jpg",
      role: "contributor",
    });

    // Seed recipes
    storage.createRecipe({
      name: "Roast Chicken",
      description: "Classic roasted whole chicken with herb butter, crispy golden skin, and juicy meat. A Sunday dinner staple.",
      cookTimeMinutes: 90,
      servings: 4,
      equipment: JSON.stringify(["oven"]),
      ingredients: JSON.stringify([
        { name: "Whole chicken", qty: 1, unit: "4-5 lb" },
        { name: "Butter, softened", qty: 4, unit: "tbsp" },
        { name: "Garlic cloves", qty: 4, unit: "" },
        { name: "Fresh rosemary", qty: 2, unit: "sprigs" },
        { name: "Fresh thyme", qty: 3, unit: "sprigs" },
        { name: "Lemon", qty: 1, unit: "" },
        { name: "Olive oil", qty: 2, unit: "tbsp" },
        { name: "Salt & pepper", qty: 0, unit: "to taste" },
      ]),
      steps: JSON.stringify([
        "Preheat oven to 425°F. Pat chicken dry with paper towels.",
        "Mix butter with minced garlic, chopped rosemary and thyme. Season generously.",
        "Loosen skin and rub herb butter under and over the chicken skin.",
        "Stuff cavity with lemon halves and remaining herb sprigs.",
        "Roast for 20 min per pound + 20 extra minutes until internal temp hits 165°F.",
        "Rest for 10 minutes before carving.",
      ]),
      tags: JSON.stringify(["protein", "oven"]),
      imageUrl: "https://images.unsplash.com/photo-1598103442097-8b74394b95c7?w=600&q=80",
      contributorId: admin.id,
      sourceUrl: null,
    });

    storage.createRecipe({
      name: "Mushroom Risotto",
      description: "Creamy Arborio rice with sautéed mushrooms, parmesan, and white wine. Stove-top comfort food at its finest.",
      cookTimeMinutes: 45,
      servings: 4,
      equipment: JSON.stringify(["stove"]),
      ingredients: JSON.stringify([
        { name: "Arborio rice", qty: 1.5, unit: "cups" },
        { name: "Mixed mushrooms", qty: 8, unit: "oz" },
        { name: "Chicken or vegetable broth", qty: 5, unit: "cups, warm" },
        { name: "White wine", qty: 0.5, unit: "cup" },
        { name: "Shallot, diced", qty: 1, unit: "" },
        { name: "Garlic cloves, minced", qty: 3, unit: "" },
        { name: "Parmesan, grated", qty: 0.5, unit: "cup" },
        { name: "Butter", qty: 3, unit: "tbsp" },
        { name: "Fresh thyme", qty: 2, unit: "sprigs" },
      ]),
      steps: JSON.stringify([
        "Sauté mushrooms in 1 tbsp butter over high heat until golden. Set aside.",
        "In same pan, melt remaining butter. Soften shallot and garlic (3 min).",
        "Add rice, toast for 2 minutes stirring constantly.",
        "Pour in wine, stir until absorbed.",
        "Add warm broth one ladle at a time, stirring until each is absorbed (~20 min).",
        "Fold in mushrooms and parmesan. Season and serve immediately.",
      ]),
      tags: JSON.stringify(["vegetarian", "stove"]),
      imageUrl: "https://images.unsplash.com/photo-1476124369491-e7addf5db371?w=600&q=80",
      contributorId: chef1.id,
      sourceUrl: null,
    });

    storage.createRecipe({
      name: "Honey Glazed Carrots",
      description: "Tender roasted carrots with a sweet honey-butter glaze. A simple side dish that pairs with almost anything.",
      cookTimeMinutes: 40,
      servings: 4,
      equipment: JSON.stringify(["oven"]),
      ingredients: JSON.stringify([
        { name: "Carrots", qty: 1, unit: "lb" },
        { name: "Honey", qty: 3, unit: "tbsp" },
        { name: "Butter, melted", qty: 2, unit: "tbsp" },
        { name: "Fresh thyme", qty: 1, unit: "tsp" },
        { name: "Salt & pepper", qty: 0, unit: "to taste" },
      ]),
      steps: JSON.stringify([
        "Preheat oven to 400°F. Peel and halve carrots lengthwise.",
        "Toss with melted butter, honey, thyme, salt and pepper.",
        "Spread on a baking sheet in a single layer.",
        "Roast 30-35 minutes, flipping halfway, until caramelized and tender.",
        "Drizzle with any extra pan juices and serve warm.",
      ]),
      tags: JSON.stringify(["vegetarian", "side", "oven"]),
      imageUrl: "https://images.unsplash.com/photo-1598170845058-32b9d6a5da37?w=600&q=80",
      contributorId: chef2.id,
      sourceUrl: null,
    });

    // ── 17 additional recipes ──────────────────────────────────────────────

    storage.createRecipe({
      name: "Beef Tacos",
      description: "Seasoned ground beef in crispy or soft shells with all the fixings. A crowd-pleasing weeknight staple.",
      cookTimeMinutes: 25,
      servings: 4,
      equipment: JSON.stringify(["stove"]),
      ingredients: JSON.stringify([
        { name: "Ground beef", qty: 1, unit: "lb" },
        { name: "Taco seasoning", qty: 1, unit: "packet" },
        { name: "Taco shells or tortillas", qty: 8, unit: "" },
        { name: "Shredded cheddar", qty: 1, unit: "cup" },
        { name: "Sour cream", qty: 0.5, unit: "cup" },
        { name: "Salsa", qty: 0.5, unit: "cup" },
        { name: "Shredded lettuce", qty: 1, unit: "cup" },
        { name: "Lime", qty: 1, unit: "" },
      ]),
      steps: JSON.stringify([
        "Brown ground beef in a skillet over medium-high heat, breaking it apart as it cooks.",
        "Drain excess fat. Add taco seasoning and 2/3 cup water.",
        "Simmer 3-4 minutes until sauce thickens.",
        "Warm taco shells per package directions.",
        "Fill shells with beef and top with cheese, lettuce, sour cream, and salsa.",
        "Squeeze fresh lime over everything before serving.",
      ]),
      tags: JSON.stringify(["quick", "family"]),
      imageUrl: "https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=600&q=80",
      contributorId: chef4.id,
      sourceUrl: null,
    });

    storage.createRecipe({
      name: "Garlic Butter Shrimp Pasta",
      description: "Juicy shrimp in a rich garlic butter sauce tossed with linguine. Ready in under 30 minutes.",
      cookTimeMinutes: 25,
      servings: 4,
      equipment: JSON.stringify(["stove"]),
      ingredients: JSON.stringify([
        { name: "Linguine or spaghetti", qty: 12, unit: "oz" },
        { name: "Large shrimp, peeled & deveined", qty: 1, unit: "lb" },
        { name: "Butter", qty: 4, unit: "tbsp" },
        { name: "Garlic cloves, minced", qty: 5, unit: "" },
        { name: "White wine or chicken broth", qty: 0.25, unit: "cup" },
        { name: "Red pepper flakes", qty: 0.25, unit: "tsp" },
        { name: "Lemon juice", qty: 2, unit: "tbsp" },
        { name: "Fresh parsley, chopped", qty: 0.25, unit: "cup" },
      ]),
      steps: JSON.stringify([
        "Cook pasta in salted boiling water until al dente. Reserve 1/2 cup pasta water before draining.",
        "Season shrimp with salt and pepper. Cook in 1 tbsp butter over high heat, 1-2 min per side. Remove.",
        "In same pan, melt remaining butter. Sauté garlic and red pepper 30 seconds.",
        "Add wine/broth, simmer 2 minutes.",
        "Toss in pasta, shrimp, lemon juice, and parsley. Add pasta water to loosen if needed.",
        "Serve immediately.",
      ]),
      tags: JSON.stringify(["seafood", "quick"]),
      imageUrl: "https://images.unsplash.com/photo-1563379926898-05f4575a45d8?w=600&q=80",
      contributorId: chef1.id,
      sourceUrl: null,
    });

    storage.createRecipe({
      name: "Baked Salmon with Lemon Dill",
      description: "Flaky, tender salmon fillets baked with lemon, dill, and butter. Healthy and done in 20 minutes.",
      cookTimeMinutes: 20,
      servings: 4,
      equipment: JSON.stringify(["oven"]),
      ingredients: JSON.stringify([
        { name: "Salmon fillets", qty: 4, unit: "6-oz" },
        { name: "Butter, melted", qty: 3, unit: "tbsp" },
        { name: "Lemon, sliced", qty: 1, unit: "" },
        { name: "Fresh dill", qty: 2, unit: "tbsp" },
        { name: "Garlic cloves, minced", qty: 2, unit: "" },
        { name: "Salt & pepper", qty: 0, unit: "to taste" },
      ]),
      steps: JSON.stringify([
        "Preheat oven to 400°F. Line a baking sheet with foil.",
        "Mix melted butter with garlic and dill.",
        "Place salmon skin-side down on the baking sheet. Season with salt and pepper.",
        "Brush generously with the butter mixture and top with lemon slices.",
        "Bake 12-15 minutes until salmon flakes easily with a fork.",
      ]),
      tags: JSON.stringify(["seafood", "healthy", "quick"]),
      imageUrl: "https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=600&q=80",
      contributorId: admin.id,
      sourceUrl: null,
    });

    storage.createRecipe({
      name: "Mac & Cheese",
      description: "Creamy, cheesy stovetop mac and cheese made from scratch. Better than the box — every time.",
      cookTimeMinutes: 30,
      servings: 6,
      equipment: JSON.stringify(["stove"]),
      ingredients: JSON.stringify([
        { name: "Elbow macaroni", qty: 1, unit: "lb" },
        { name: "Butter", qty: 4, unit: "tbsp" },
        { name: "All-purpose flour", qty: 3, unit: "tbsp" },
        { name: "Whole milk", qty: 2, unit: "cups" },
        { name: "Sharp cheddar, shredded", qty: 2, unit: "cups" },
        { name: "Gruyère or Parmesan, shredded", qty: 0.5, unit: "cup" },
        { name: "Dijon mustard", qty: 0.5, unit: "tsp" },
        { name: "Salt, pepper, pinch of cayenne", qty: 0, unit: "to taste" },
      ]),
      steps: JSON.stringify([
        "Cook macaroni in salted water until al dente. Drain and set aside.",
        "Melt butter over medium heat. Whisk in flour and cook 1-2 minutes.",
        "Slowly whisk in milk. Cook, stirring, until thick and bubbly (5 min).",
        "Remove from heat. Stir in cheeses, mustard, and seasonings until smooth.",
        "Add pasta to the sauce. Stir to combine and serve hot.",
      ]),
      tags: JSON.stringify(["vegetarian", "comfort", "family"]),
      imageUrl: "https://images.unsplash.com/photo-1612152328957-bfc11c5cebf8?w=600&q=80",
      contributorId: chef2.id,
      sourceUrl: null,
    });

    storage.createRecipe({
      name: "Air Fryer Chicken Wings",
      description: "Ultra-crispy chicken wings with no oil mess. Toss them in your favorite sauce right out of the fryer.",
      cookTimeMinutes: 30,
      servings: 4,
      equipment: JSON.stringify(["airFryer"]),
      ingredients: JSON.stringify([
        { name: "Chicken wings", qty: 2, unit: "lbs" },
        { name: "Baking powder", qty: 1, unit: "tbsp" },
        { name: "Salt", qty: 1, unit: "tsp" },
        { name: "Garlic powder", qty: 0.5, unit: "tsp" },
        { name: "Black pepper", qty: 0.5, unit: "tsp" },
        { name: "Hot sauce or buffalo sauce", qty: 0.5, unit: "cup" },
        { name: "Butter, melted", qty: 2, unit: "tbsp" },
      ]),
      steps: JSON.stringify([
        "Pat wings dry. Toss with baking powder, salt, garlic powder, and pepper.",
        "Arrange in a single layer in the air fryer basket.",
        "Air fry at 380°F for 20 minutes, flipping halfway through.",
        "Increase to 400°F for 5-10 more minutes until golden and crispy.",
        "Mix hot sauce and butter. Toss wings in sauce and serve immediately.",
      ]),
      tags: JSON.stringify(["snack", "game-day", "crispy"]),
      imageUrl: "https://images.unsplash.com/photo-1608039829572-78524f79c4c7?w=600&q=80",
      contributorId: chef4.id,
      sourceUrl: null,
    });

    storage.createRecipe({
      name: "Chicken Tikka Masala",
      description: "Tender chicken in a rich, spiced tomato-cream sauce. This Indian classic is surprisingly easy to make at home.",
      cookTimeMinutes: 50,
      servings: 4,
      equipment: JSON.stringify(["stove"]),
      ingredients: JSON.stringify([
        { name: "Boneless chicken thighs, cubed", qty: 1.5, unit: "lbs" },
        { name: "Plain yogurt", qty: 0.5, unit: "cup" },
        { name: "Garam masala", qty: 2, unit: "tsp" },
        { name: "Cumin", qty: 1, unit: "tsp" },
        { name: "Turmeric", qty: 0.5, unit: "tsp" },
        { name: "Crushed tomatoes", qty: 1, unit: "14-oz can" },
        { name: "Heavy cream", qty: 0.5, unit: "cup" },
        { name: "Onion, diced", qty: 1, unit: "" },
        { name: "Garlic cloves, minced", qty: 4, unit: "" },
        { name: "Ginger, grated", qty: 1, unit: "tbsp" },
        { name: "Butter", qty: 2, unit: "tbsp" },
      ]),
      steps: JSON.stringify([
        "Marinate chicken in yogurt, half the spices, salt, and pepper for at least 30 min (or overnight).",
        "Sear chicken in butter over high heat until charred in spots. Remove and set aside.",
        "In same pan, sauté onion until golden (8 min). Add garlic, ginger, remaining spices. Cook 2 min.",
        "Add crushed tomatoes. Simmer 15 minutes.",
        "Stir in cream and chicken. Simmer 10 more minutes.",
        "Serve over basmati rice with naan bread.",
      ]),
      tags: JSON.stringify(["indian", "spicy", "dinner"]),
      imageUrl: "https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=600&q=80",
      contributorId: chef3.id,
      sourceUrl: null,
    });

    storage.createRecipe({
      name: "Sheet Pan Sausage & Veggies",
      description: "Everything on one pan — smoked sausage, bell peppers, zucchini, and potatoes roasted to perfection. Easy cleanup.",
      cookTimeMinutes: 40,
      servings: 4,
      equipment: JSON.stringify(["oven"]),
      ingredients: JSON.stringify([
        { name: "Smoked sausage, sliced", qty: 14, unit: "oz" },
        { name: "Baby potatoes, halved", qty: 1, unit: "lb" },
        { name: "Bell peppers, sliced", qty: 2, unit: "" },
        { name: "Zucchini, sliced", qty: 1, unit: "" },
        { name: "Red onion, wedged", qty: 1, unit: "" },
        { name: "Olive oil", qty: 3, unit: "tbsp" },
        { name: "Italian seasoning", qty: 1, unit: "tsp" },
        { name: "Garlic powder", qty: 0.5, unit: "tsp" },
        { name: "Salt & pepper", qty: 0, unit: "to taste" },
      ]),
      steps: JSON.stringify([
        "Preheat oven to 425°F. Line a large baking sheet with foil.",
        "Toss potatoes with olive oil and seasonings. Spread on one side of the pan.",
        "Roast potatoes alone for 15 minutes.",
        "Add sausage, peppers, zucchini, and onion. Toss everything together.",
        "Roast 20-25 more minutes until potatoes are tender and sausage is caramelized.",
      ]),
      tags: JSON.stringify(["one-pan", "easy", "meal-prep"]),
      imageUrl: "https://images.unsplash.com/photo-1544025162-d76694265947?w=600&q=80",
      contributorId: admin.id,
      sourceUrl: null,
    });

    storage.createRecipe({
      name: "French Onion Soup",
      description: "Deeply caramelized onions in rich beef broth, topped with toasted bread and melted Gruyère. A French bistro classic.",
      cookTimeMinutes: 75,
      servings: 4,
      equipment: JSON.stringify(["stove", "oven"]),
      ingredients: JSON.stringify([
        { name: "Yellow onions, thinly sliced", qty: 4, unit: "large" },
        { name: "Butter", qty: 3, unit: "tbsp" },
        { name: "Beef broth", qty: 6, unit: "cups" },
        { name: "Dry white wine", qty: 0.5, unit: "cup" },
        { name: "Fresh thyme", qty: 3, unit: "sprigs" },
        { name: "Bay leaf", qty: 1, unit: "" },
        { name: "Baguette slices", qty: 8, unit: "" },
        { name: "Gruyère cheese, shredded", qty: 2, unit: "cups" },
      ]),
      steps: JSON.stringify([
        "Melt butter in a heavy pot over medium. Add onions and cook, stirring occasionally, until deep golden brown — about 45-50 minutes.",
        "Add wine, scrape up any brown bits. Cook until wine evaporates.",
        "Add broth, thyme, bay leaf. Simmer 20 minutes. Season with salt and pepper.",
        "Toast baguette slices under broiler until golden.",
        "Ladle soup into oven-safe bowls. Top with baguette slices and a thick layer of Gruyère.",
        "Broil until cheese is bubbly and golden, 2-3 minutes. Serve immediately.",
      ]),
      tags: JSON.stringify(["soup", "french", "comfort"]),
      imageUrl: "https://images.unsplash.com/photo-1584811644165-33db2bfcdfb4?w=600&q=80",
      contributorId: chef1.id,
      sourceUrl: null,
    });

    storage.createRecipe({
      name: "Instant Pot Beef Stew",
      description: "Hearty beef stew with tender chunks of meat and vegetables in a savory broth. The Instant Pot cuts the time in half.",
      cookTimeMinutes: 60,
      servings: 6,
      equipment: JSON.stringify(["instantPot"]),
      ingredients: JSON.stringify([
        { name: "Beef chuck, cubed", qty: 2, unit: "lbs" },
        { name: "Baby potatoes, halved", qty: 1, unit: "lb" },
        { name: "Carrots, sliced", qty: 3, unit: "" },
        { name: "Celery stalks, sliced", qty: 2, unit: "" },
        { name: "Onion, diced", qty: 1, unit: "" },
        { name: "Garlic cloves, minced", qty: 3, unit: "" },
        { name: "Beef broth", qty: 2, unit: "cups" },
        { name: "Tomato paste", qty: 2, unit: "tbsp" },
        { name: "Worcestershire sauce", qty: 1, unit: "tbsp" },
        { name: "Cornstarch", qty: 2, unit: "tbsp" },
      ]),
      steps: JSON.stringify([
        "Season beef with salt and pepper. Use Sauté mode to brown in batches. Remove beef.",
        "Sauté onion and garlic 2 minutes. Add tomato paste and cook 1 minute.",
        "Add beef back in with broth, Worcestershire, and all vegetables.",
        "Lock lid. Set to Pressure Cook (High) for 35 minutes.",
        "Quick release pressure. Mix cornstarch with 2 tbsp cold water, stir into stew.",
        "Use Sauté mode 2-3 minutes to thicken. Taste and adjust seasoning.",
      ]),
      tags: JSON.stringify(["comfort", "meal-prep", "hearty"]),
      imageUrl: "https://images.unsplash.com/photo-1547592166-23ac45744acd?w=600&q=80",
      contributorId: chef2.id,
      sourceUrl: null,
    });

    storage.createRecipe({
      name: "Oven-Baked BBQ Ribs",
      description: "Fall-off-the-bone pork ribs slow-roasted in the oven, then slathered in BBQ sauce and broiled for that sticky caramelized finish.",
      cookTimeMinutes: 180,
      servings: 4,
      equipment: JSON.stringify(["oven"]),
      ingredients: JSON.stringify([
        { name: "Pork baby back ribs", qty: 2, unit: "racks" },
        { name: "Brown sugar", qty: 2, unit: "tbsp" },
        { name: "Paprika", qty: 1, unit: "tbsp" },
        { name: "Garlic powder", qty: 1, unit: "tsp" },
        { name: "Onion powder", qty: 1, unit: "tsp" },
        { name: "Cayenne pepper", qty: 0.25, unit: "tsp" },
        { name: "Salt & black pepper", qty: 0, unit: "to taste" },
        { name: "BBQ sauce", qty: 1, unit: "cup" },
      ]),
      steps: JSON.stringify([
        "Preheat oven to 275°F. Remove membrane from the back of ribs.",
        "Mix dry rub: brown sugar, paprika, garlic powder, onion powder, cayenne, salt, pepper.",
        "Coat ribs generously on all sides with the dry rub.",
        "Wrap tightly in foil and place on a baking sheet. Bake 2.5 hours.",
        "Carefully unwrap. Brush with BBQ sauce. Turn oven to broil.",
        "Broil 4-5 minutes until sauce caramelizes and starts to char lightly. Rest 5 min before cutting.",
      ]),
      tags: JSON.stringify(["bbq", "weekend", "pork"]),
      imageUrl: "https://images.unsplash.com/photo-1544025162-d76694265947?w=600&q=80",
      contributorId: admin.id,
      sourceUrl: null,
    });

    storage.createRecipe({
      name: "Stir-Fried Rice",
      description: "Better than takeout fried rice made with day-old rice, eggs, vegetables, and soy sauce. On the table in 15 minutes.",
      cookTimeMinutes: 15,
      servings: 4,
      equipment: JSON.stringify(["stove"]),
      ingredients: JSON.stringify([
        { name: "Cooked rice (day-old)", qty: 4, unit: "cups" },
        { name: "Eggs", qty: 3, unit: "" },
        { name: "Frozen peas and carrots", qty: 1, unit: "cup" },
        { name: "Green onions, sliced", qty: 3, unit: "" },
        { name: "Garlic cloves, minced", qty: 3, unit: "" },
        { name: "Soy sauce", qty: 3, unit: "tbsp" },
        { name: "Sesame oil", qty: 1, unit: "tbsp" },
        { name: "Vegetable oil", qty: 2, unit: "tbsp" },
      ]),
      steps: JSON.stringify([
        "Heat oil in a wok or large skillet over high heat until smoking.",
        "Add garlic, stir 30 seconds. Add peas and carrots, cook 2 minutes.",
        "Push everything to the side. Scramble eggs in the empty space until just set.",
        "Add rice, breaking up any clumps. Stir-fry everything together 3-4 minutes.",
        "Drizzle soy sauce and sesame oil. Toss well. Top with green onions and serve.",
      ]),
      tags: JSON.stringify(["quick", "asian", "budget"]),
      imageUrl: "https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=600&q=80",
      contributorId: chef3.id,
      sourceUrl: null,
    });

    storage.createRecipe({
      name: "Banana Bread",
      description: "Moist, tender banana bread with a golden crust. The riper the bananas, the better it gets.",
      cookTimeMinutes: 70,
      servings: 8,
      equipment: JSON.stringify(["oven"]),
      ingredients: JSON.stringify([
        { name: "Very ripe bananas", qty: 3, unit: "large" },
        { name: "All-purpose flour", qty: 1.5, unit: "cups" },
        { name: "Sugar", qty: 0.75, unit: "cup" },
        { name: "Butter, melted", qty: 0.33, unit: "cup" },
        { name: "Egg", qty: 1, unit: "" },
        { name: "Baking soda", qty: 1, unit: "tsp" },
        { name: "Salt", qty: 0.25, unit: "tsp" },
        { name: "Vanilla extract", qty: 1, unit: "tsp" },
        { name: "Optional: chocolate chips or walnuts", qty: 0.5, unit: "cup" },
      ]),
      steps: JSON.stringify([
        "Preheat oven to 350°F. Grease a 9x5-inch loaf pan.",
        "Mash bananas in a large bowl until smooth.",
        "Mix in melted butter, egg, sugar, and vanilla.",
        "Stir in baking soda and salt. Add flour and mix until just combined — don't overmix.",
        "Fold in chocolate chips or walnuts if using.",
        "Pour into loaf pan. Bake 55-65 minutes until a toothpick comes out clean. Cool before slicing.",
      ]),
      tags: JSON.stringify(["baking", "sweet", "breakfast"]),
      imageUrl: "https://images.unsplash.com/photo-1586444248902-2f64eddc13df?w=600&q=80",
      contributorId: chef1.id,
      sourceUrl: null,
    });

    storage.createRecipe({
      name: "Classic Chili",
      description: "Bold, hearty beef chili with beans and a deep spice blend. Makes great leftovers and freezes beautifully.",
      cookTimeMinutes: 60,
      servings: 6,
      equipment: JSON.stringify(["stove"]),
      ingredients: JSON.stringify([
        { name: "Ground beef", qty: 1.5, unit: "lbs" },
        { name: "Kidney beans, drained", qty: 2, unit: "15-oz cans" },
        { name: "Crushed tomatoes", qty: 1, unit: "28-oz can" },
        { name: "Onion, diced", qty: 1, unit: "" },
        { name: "Bell pepper, diced", qty: 1, unit: "" },
        { name: "Garlic cloves, minced", qty: 4, unit: "" },
        { name: "Chili powder", qty: 2, unit: "tbsp" },
        { name: "Cumin", qty: 1, unit: "tsp" },
        { name: "Smoked paprika", qty: 1, unit: "tsp" },
        { name: "Cayenne pepper", qty: 0.25, unit: "tsp" },
      ]),
      steps: JSON.stringify([
        "Brown ground beef in a large pot over medium-high. Drain fat.",
        "Add onion, bell pepper, and garlic. Cook 5 minutes until softened.",
        "Stir in all spices and cook 1 minute.",
        "Add crushed tomatoes and beans. Stir to combine.",
        "Bring to a boil, reduce heat and simmer uncovered 30-40 minutes, stirring occasionally.",
        "Serve topped with cheese, sour cream, and green onions.",
      ]),
      tags: JSON.stringify(["comfort", "meal-prep", "spicy"]),
      imageUrl: "https://images.unsplash.com/photo-1455619452474-d2be8b1e70cd?w=600&q=80",
      contributorId: chef4.id,
      sourceUrl: null,
    });

    storage.createRecipe({
      name: "Microwave Mug Cake",
      description: "A single-serving chocolate cake made in a mug in 90 seconds flat. Perfect when you need something sweet fast.",
      cookTimeMinutes: 5,
      servings: 1,
      equipment: JSON.stringify(["microwave"]),
      ingredients: JSON.stringify([
        { name: "All-purpose flour", qty: 4, unit: "tbsp" },
        { name: "Cocoa powder", qty: 2, unit: "tbsp" },
        { name: "Sugar", qty: 3, unit: "tbsp" },
        { name: "Baking powder", qty: 0.25, unit: "tsp" },
        { name: "Egg", qty: 1, unit: "" },
        { name: "Milk", qty: 3, unit: "tbsp" },
        { name: "Vegetable oil", qty: 2, unit: "tbsp" },
        { name: "Chocolate chips (optional)", qty: 1, unit: "tbsp" },
      ]),
      steps: JSON.stringify([
        "Add flour, cocoa powder, sugar, and baking powder to a large mug. Mix dry ingredients.",
        "Add egg, milk, and oil. Mix until smooth — no dry streaks.",
        "Stir in chocolate chips if using.",
        "Microwave on high for 60-90 seconds. Check at 60 sec — it should be just set in the middle.",
        "Let stand 1 minute (it will be hot!). Eat straight from the mug.",
      ]),
      tags: JSON.stringify(["dessert", "quick", "single-serve"]),
      imageUrl: "https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=600&q=80",
      contributorId: chef3.id,
      sourceUrl: null,
    });

    storage.createRecipe({
      name: "Smash Burgers",
      description: "Thin patties smashed on a screaming-hot pan for crispy, lacy edges and a juicy center. The best burgers you'll make at home.",
      cookTimeMinutes: 20,
      servings: 4,
      equipment: JSON.stringify(["stove"]),
      ingredients: JSON.stringify([
        { name: "Ground beef (80/20)", qty: 1, unit: "lb" },
        { name: "American or cheddar cheese slices", qty: 4, unit: "" },
        { name: "Burger buns, toasted", qty: 4, unit: "" },
        { name: "Salt & pepper", qty: 0, unit: "to taste" },
        { name: "Butter", qty: 1, unit: "tbsp" },
        { name: "Pickles, onions, lettuce, tomato", qty: 0, unit: "for topping" },
        { name: "Burger sauce or mayo + ketchup", qty: 0, unit: "to taste" },
      ]),
      steps: JSON.stringify([
        "Divide beef into 4 equal balls. Don't pack them — keep them loose.",
        "Heat a cast iron skillet or griddle over high heat until smoking hot. Add butter.",
        "Place beef ball in pan. Immediately smash flat with a spatula (use firm, even pressure).",
        "Season generously with salt and pepper. Cook 90 seconds — edges should be crispy.",
        "Flip. Immediately add cheese slice. Cook 30-60 more seconds.",
        "Stack two patties per bun if desired. Add your toppings and sauce.",
      ]),
      tags: JSON.stringify(["burgers", "quick", "comfort"]),
      imageUrl: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&q=80",
      contributorId: admin.id,
      sourceUrl: null,
    });

    storage.createRecipe({
      name: "Lentil Dal",
      description: "Warming red lentil dal with coconut milk and aromatic spices. Vegan, filling, and incredibly cheap to make.",
      cookTimeMinutes: 35,
      servings: 4,
      equipment: JSON.stringify(["stove"]),
      ingredients: JSON.stringify([
        { name: "Red lentils, rinsed", qty: 1.5, unit: "cups" },
        { name: "Coconut milk", qty: 1, unit: "14-oz can" },
        { name: "Vegetable broth", qty: 2, unit: "cups" },
        { name: "Onion, diced", qty: 1, unit: "" },
        { name: "Garlic cloves, minced", qty: 4, unit: "" },
        { name: "Ginger, grated", qty: 1, unit: "tbsp" },
        { name: "Curry powder", qty: 2, unit: "tsp" },
        { name: "Turmeric", qty: 0.5, unit: "tsp" },
        { name: "Cumin seeds", qty: 1, unit: "tsp" },
        { name: "Spinach or kale", qty: 2, unit: "cups" },
        { name: "Lime juice", qty: 1, unit: "tbsp" },
      ]),
      steps: JSON.stringify([
        "Heat oil in a large pot. Toast cumin seeds 30 seconds until fragrant.",
        "Add onion, cook until golden (8 min). Add garlic, ginger, curry powder, turmeric — cook 2 min.",
        "Add lentils, coconut milk, and broth. Bring to a boil.",
        "Reduce heat and simmer 20 minutes, stirring occasionally, until lentils are soft.",
        "Stir in spinach until wilted. Add lime juice and season with salt.",
        "Serve over rice or with naan bread.",
      ]),
      tags: JSON.stringify(["vegan", "vegetarian", "indian", "budget"]),
      imageUrl: "https://images.unsplash.com/photo-1546833998-877b37c2e5c6?w=600&q=80",
      contributorId: chef3.id,
      sourceUrl: null,
    });

    storage.createRecipe({
      name: "Crispy Roasted Potatoes",
      description: "Golden, crunchy on the outside and fluffy inside. The secret is parboiling first and roughing up the edges before roasting.",
      cookTimeMinutes: 60,
      servings: 4,
      equipment: JSON.stringify(["oven", "stove"]),
      ingredients: JSON.stringify([
        { name: "Yukon Gold or Russet potatoes", qty: 2, unit: "lbs" },
        { name: "Olive oil", qty: 3, unit: "tbsp" },
        { name: "Garlic powder", qty: 1, unit: "tsp" },
        { name: "Dried rosemary", qty: 0.5, unit: "tsp" },
        { name: "Salt & pepper", qty: 0, unit: "to taste" },
        { name: "Fresh parsley for garnish", qty: 0, unit: "optional" },
      ]),
      steps: JSON.stringify([
        "Preheat oven to 425°F. Cut potatoes into 2-inch chunks.",
        "Boil potatoes in salted water for 8 minutes — just until barely tender. Drain.",
        "Shake potatoes vigorously in the pot to rough up the edges (this is what makes them crispy).",
        "Toss with olive oil, garlic powder, rosemary, salt, and pepper.",
        "Spread on a baking sheet in a single layer. Roast 35-40 minutes, flipping once halfway.",
        "Garnish with fresh parsley and serve hot.",
      ]),
      tags: JSON.stringify(["vegetarian", "side", "crispy"]),
      imageUrl: "https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=600&q=80",
      contributorId: chef2.id,
      sourceUrl: null,
    });

    storage.createRecipe({
      name: "Chicken Quesadillas",
      description: "Crispy flour tortillas packed with seasoned chicken, melted cheese, and peppers. Quick, filling, and impossible to mess up.",
      cookTimeMinutes: 20,
      servings: 4,
      equipment: JSON.stringify(["stove"]),
      ingredients: JSON.stringify([
        { name: "Large flour tortillas", qty: 4, unit: "" },
        { name: "Cooked chicken, shredded", qty: 2, unit: "cups" },
        { name: "Mexican blend cheese, shredded", qty: 2, unit: "cups" },
        { name: "Bell pepper, diced", qty: 1, unit: "" },
        { name: "Red onion, diced", qty: 0.5, unit: "" },
        { name: "Cumin", qty: 0.5, unit: "tsp" },
        { name: "Chili powder", qty: 0.5, unit: "tsp" },
        { name: "Butter or oil for pan", qty: 1, unit: "tbsp" },
      ]),
      steps: JSON.stringify([
        "Mix shredded chicken with cumin, chili powder, salt, and pepper.",
        "Heat a skillet over medium. Lightly butter the pan.",
        "Place tortilla in pan. On one half, layer chicken, peppers, onion, and cheese.",
        "Fold the other half over to close. Cook 2-3 minutes per side until golden and crispy.",
        "Cut into wedges. Serve with salsa, guacamole, and sour cream.",
      ]),
      tags: JSON.stringify(["quick", "mexican", "family"]),
      imageUrl: "https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=600&q=80",
      contributorId: chef4.id,
      sourceUrl: null,
    });

    // ── 16 more recipes ────────────────────────────────────────────────────────

    storage.createRecipe({
      name: "Spaghetti Carbonara",
      description: "Classic Roman pasta with eggs, guanciale, and Pecorino — no cream needed. Rich, silky, and done in 20 minutes.",
      cookTimeMinutes: 20,
      servings: 4,
      equipment: JSON.stringify(["stove"]),
      ingredients: JSON.stringify([
        { name: "Spaghetti", qty: 12, unit: "oz" },
        { name: "Pancetta or bacon, diced", qty: 6, unit: "oz" },
        { name: "Eggs", qty: 3, unit: "" },
        { name: "Egg yolks", qty: 2, unit: "" },
        { name: "Pecorino Romano or Parmesan, grated", qty: 1, unit: "cup" },
        { name: "Black pepper", qty: 1, unit: "tsp, coarsely ground" },
        { name: "Salt", qty: 0, unit: "to taste" },
      ]),
      steps: JSON.stringify([
        "Cook spaghetti in heavily salted boiling water until al dente. Reserve 1 cup pasta water.",
        "Cook pancetta in a skillet over medium heat until crispy. Remove from heat.",
        "Whisk eggs, yolks, and cheese together in a bowl. Season with lots of black pepper.",
        "Add hot pasta to the pan with pancetta (off heat). Toss to coat.",
        "Pour egg mixture over pasta, tossing rapidly, adding pasta water a splash at a time until creamy.",
        "Serve immediately with extra cheese and black pepper.",
      ]),
      tags: JSON.stringify(["italian", "quick", "pasta"]),
      imageUrl: "https://images.unsplash.com/photo-1612874742237-6526221588e3?w=600&q=80",
      contributorId: chef1.id,
      sourceUrl: null,
    });

    storage.createRecipe({
      name: "Teriyaki Chicken",
      description: "Tender pan-seared chicken thighs glazed in a sweet-savory homemade teriyaki sauce. Better than takeout.",
      cookTimeMinutes: 25,
      servings: 4,
      equipment: JSON.stringify(["stove"]),
      ingredients: JSON.stringify([
        { name: "Boneless chicken thighs", qty: 1.5, unit: "lbs" },
        { name: "Soy sauce", qty: 0.25, unit: "cup" },
        { name: "Mirin or rice wine", qty: 3, unit: "tbsp" },
        { name: "Honey or sugar", qty: 2, unit: "tbsp" },
        { name: "Garlic cloves, minced", qty: 2, unit: "" },
        { name: "Ginger, grated", qty: 1, unit: "tsp" },
        { name: "Sesame oil", qty: 1, unit: "tsp" },
        { name: "Cornstarch", qty: 1, unit: "tsp" },
        { name: "Sesame seeds & green onion", qty: 0, unit: "for garnish" },
      ]),
      steps: JSON.stringify([
        "Mix soy sauce, mirin, honey, garlic, ginger, sesame oil, and cornstarch in a bowl.",
        "Season chicken with pepper. Sear in oil over medium-high heat, 4-5 minutes per side until cooked through.",
        "Pour sauce over chicken. Simmer 2-3 minutes, flipping, until sauce thickens and coats.",
        "Slice and serve over rice. Garnish with sesame seeds and sliced green onion.",
      ]),
      tags: JSON.stringify(["asian", "quick", "chicken"]),
      imageUrl: "https://images.unsplash.com/photo-1569050467447-ce54b3bbc37d?w=600&q=80",
      contributorId: chef3.id,
      sourceUrl: null,
    });

    storage.createRecipe({
      name: "Shakshuka",
      description: "Eggs poached in a spiced tomato and pepper sauce. A Middle Eastern breakfast favorite that works any time of day.",
      cookTimeMinutes: 30,
      servings: 4,
      equipment: JSON.stringify(["stove"]),
      ingredients: JSON.stringify([
        { name: "Eggs", qty: 6, unit: "" },
        { name: "Crushed tomatoes", qty: 1, unit: "28-oz can" },
        { name: "Red bell pepper, diced", qty: 1, unit: "" },
        { name: "Onion, diced", qty: 1, unit: "" },
        { name: "Garlic cloves, minced", qty: 4, unit: "" },
        { name: "Cumin", qty: 1, unit: "tsp" },
        { name: "Smoked paprika", qty: 1, unit: "tsp" },
        { name: "Cayenne", qty: 0.25, unit: "tsp" },
        { name: "Olive oil", qty: 2, unit: "tbsp" },
        { name: "Feta cheese, crumbled", qty: 0.5, unit: "cup" },
        { name: "Fresh parsley", qty: 0, unit: "to garnish" },
      ]),
      steps: JSON.stringify([
        "Sauté onion and bell pepper in olive oil over medium heat until soft, 7 minutes.",
        "Add garlic, cumin, paprika, and cayenne. Cook 1 minute.",
        "Add crushed tomatoes. Simmer 10 minutes. Season with salt and pepper.",
        "Make 6 wells in the sauce. Crack an egg into each well.",
        "Cover and cook 5-8 minutes until whites are set but yolks are still runny.",
        "Top with crumbled feta and fresh parsley. Serve with crusty bread.",
      ]),
      tags: JSON.stringify(["vegetarian", "breakfast", "middle-eastern"]),
      imageUrl: "https://images.unsplash.com/photo-1590412200988-a436970781fa?w=600&q=80",
      contributorId: chef3.id,
      sourceUrl: null,
    });

    storage.createRecipe({
      name: "Beef Stir Fry",
      description: "Tender beef strips and crisp vegetables in a savory sauce. Fast, satisfying, and endlessly customizable.",
      cookTimeMinutes: 20,
      servings: 4,
      equipment: JSON.stringify(["stove"]),
      ingredients: JSON.stringify([
        { name: "Flank steak, thinly sliced", qty: 1, unit: "lb" },
        { name: "Broccoli florets", qty: 2, unit: "cups" },
        { name: "Bell peppers, sliced", qty: 2, unit: "" },
        { name: "Garlic cloves, minced", qty: 3, unit: "" },
        { name: "Ginger, grated", qty: 1, unit: "tbsp" },
        { name: "Soy sauce", qty: 3, unit: "tbsp" },
        { name: "Oyster sauce", qty: 2, unit: "tbsp" },
        { name: "Sesame oil", qty: 1, unit: "tbsp" },
        { name: "Cornstarch", qty: 1, unit: "tbsp" },
        { name: "Vegetable oil", qty: 2, unit: "tbsp" },
      ]),
      steps: JSON.stringify([
        "Toss beef with soy sauce and cornstarch. Marinate 10 minutes.",
        "Mix oyster sauce, sesame oil, and 2 tbsp water into a sauce. Set aside.",
        "Sear beef over screaming-hot wok in batches, 1 min each side. Remove.",
        "Stir fry broccoli and peppers 3-4 minutes until tender-crisp.",
        "Add garlic and ginger, 30 seconds. Return beef and pour sauce over.",
        "Toss everything together 1 minute. Serve over rice.",
      ]),
      tags: JSON.stringify(["asian", "quick", "beef"]),
      imageUrl: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&q=80",
      contributorId: chef4.id,
      sourceUrl: null,
    });

    storage.createRecipe({
      name: "Creamy Tomato Soup",
      description: "Velvety roasted tomato soup with fresh basil and a swirl of cream. Pairs perfectly with grilled cheese.",
      cookTimeMinutes: 45,
      servings: 4,
      equipment: JSON.stringify(["oven", "stove"]),
      ingredients: JSON.stringify([
        { name: "Roma tomatoes, halved", qty: 2, unit: "lbs" },
        { name: "Onion, quartered", qty: 1, unit: "" },
        { name: "Garlic cloves", qty: 6, unit: "" },
        { name: "Olive oil", qty: 3, unit: "tbsp" },
        { name: "Chicken or vegetable broth", qty: 2, unit: "cups" },
        { name: "Heavy cream", qty: 0.5, unit: "cup" },
        { name: "Fresh basil", qty: 0.25, unit: "cup" },
        { name: "Salt & pepper", qty: 0, unit: "to taste" },
      ]),
      steps: JSON.stringify([
        "Preheat oven to 425°F. Place tomatoes, onion, and garlic on a baking sheet.",
        "Drizzle with olive oil, season with salt. Roast 25-30 minutes until caramelized.",
        "Transfer roasted vegetables to a pot with broth. Simmer 5 minutes.",
        "Add basil, then blend smooth with an immersion blender.",
        "Stir in cream. Taste and season. Serve with crusty bread.",
      ]),
      tags: JSON.stringify(["soup", "vegetarian", "comfort"]),
      imageUrl: "https://images.unsplash.com/photo-1547592166-23ac45744acd?w=600&q=80",
      contributorId: chef1.id,
      sourceUrl: null,
    });

    storage.createRecipe({
      name: "Air Fryer Salmon",
      description: "Perfectly cooked salmon fillets with a crisp exterior and flaky interior — in just 10 minutes.",
      cookTimeMinutes: 12,
      servings: 2,
      equipment: JSON.stringify(["airFryer"]),
      ingredients: JSON.stringify([
        { name: "Salmon fillets", qty: 2, unit: "6-oz" },
        { name: "Olive oil", qty: 1, unit: "tbsp" },
        { name: "Garlic powder", qty: 0.5, unit: "tsp" },
        { name: "Paprika", qty: 0.5, unit: "tsp" },
        { name: "Salt & pepper", qty: 0, unit: "to taste" },
        { name: "Lemon wedges", qty: 0, unit: "to serve" },
      ]),
      steps: JSON.stringify([
        "Pat salmon dry. Brush with olive oil.",
        "Mix garlic powder, paprika, salt, and pepper. Rub over salmon.",
        "Preheat air fryer to 400°F for 2 minutes.",
        "Place salmon skin-side down in air fryer basket.",
        "Cook 8-10 minutes until salmon flakes easily. Serve with lemon.",
      ]),
      tags: JSON.stringify(["seafood", "quick", "healthy"]),
      imageUrl: "https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=600&q=80",
      contributorId: admin.id,
      sourceUrl: null,
    });

    storage.createRecipe({
      name: "Overnight Oats",
      description: "No-cook breakfast prep. Layer oats, milk, and toppings the night before — grab and go in the morning.",
      cookTimeMinutes: 5,
      servings: 2,
      equipment: JSON.stringify(["counter"]),
      ingredients: JSON.stringify([
        { name: "Rolled oats", qty: 1, unit: "cup" },
        { name: "Milk or almond milk", qty: 1, unit: "cup" },
        { name: "Greek yogurt", qty: 0.5, unit: "cup" },
        { name: "Chia seeds", qty: 1, unit: "tbsp" },
        { name: "Honey or maple syrup", qty: 1, unit: "tbsp" },
        { name: "Vanilla extract", qty: 0.5, unit: "tsp" },
        { name: "Fresh berries or banana", qty: 0, unit: "to top" },
      ]),
      steps: JSON.stringify([
        "Combine oats, milk, yogurt, chia seeds, honey, and vanilla in a jar.",
        "Stir well to combine.",
        "Cover and refrigerate overnight or at least 4 hours.",
        "In the morning, top with fresh fruit and enjoy cold.",
      ]),
      tags: JSON.stringify(["breakfast", "meal-prep", "healthy", "no-cook"]),
      imageUrl: "https://images.unsplash.com/photo-1586511925558-a4c6376fe65f?w=600&q=80",
      contributorId: chef1.id,
      sourceUrl: null,
    });

    storage.createRecipe({
      name: "Butter Chicken",
      description: "Creamy, mildly spiced tomato-butter sauce with tender chicken. India's most beloved comfort dish.",
      cookTimeMinutes: 45,
      servings: 4,
      equipment: JSON.stringify(["stove"]),
      ingredients: JSON.stringify([
        { name: "Boneless chicken breast, cubed", qty: 1.5, unit: "lbs" },
        { name: "Butter", qty: 4, unit: "tbsp" },
        { name: "Onion, diced", qty: 1, unit: "" },
        { name: "Garlic cloves, minced", qty: 4, unit: "" },
        { name: "Ginger, grated", qty: 1, unit: "tbsp" },
        { name: "Garam masala", qty: 2, unit: "tsp" },
        { name: "Turmeric", qty: 0.5, unit: "tsp" },
        { name: "Crushed tomatoes", qty: 1, unit: "14-oz can" },
        { name: "Heavy cream", qty: 0.75, unit: "cup" },
        { name: "Fenugreek leaves (kasuri methi)", qty: 1, unit: "tsp" },
      ]),
      steps: JSON.stringify([
        "Sear chicken in 2 tbsp butter over high heat until golden. Set aside.",
        "In same pan, melt remaining butter. Sauté onion until golden (8 min).",
        "Add garlic, ginger, and spices. Cook 2 minutes until fragrant.",
        "Add crushed tomatoes. Simmer 15 minutes.",
        "Blend sauce smooth if desired. Add cream and fenugreek.",
        "Return chicken to sauce. Simmer 10 minutes. Serve with naan or rice.",
      ]),
      tags: JSON.stringify(["indian", "comfort", "chicken"]),
      imageUrl: "https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=600&q=80",
      contributorId: chef3.id,
      sourceUrl: null,
    });

    storage.createRecipe({
      name: "Greek Salad",
      description: "Crisp vegetables, olives, and feta in a bright lemon-herb dressing. Classic, fresh, and ready in 10 minutes.",
      cookTimeMinutes: 10,
      servings: 4,
      equipment: JSON.stringify(["counter"]),
      ingredients: JSON.stringify([
        { name: "English cucumber, chunked", qty: 1, unit: "" },
        { name: "Cherry tomatoes, halved", qty: 2, unit: "cups" },
        { name: "Red onion, thinly sliced", qty: 0.5, unit: "" },
        { name: "Kalamata olives", qty: 0.5, unit: "cup" },
        { name: "Feta cheese, chunked", qty: 6, unit: "oz" },
        { name: "Olive oil", qty: 3, unit: "tbsp" },
        { name: "Lemon juice", qty: 2, unit: "tbsp" },
        { name: "Dried oregano", qty: 1, unit: "tsp" },
        { name: "Salt & pepper", qty: 0, unit: "to taste" },
      ]),
      steps: JSON.stringify([
        "Combine cucumber, tomatoes, red onion, and olives in a large bowl.",
        "Whisk olive oil, lemon juice, oregano, salt, and pepper.",
        "Pour dressing over salad and toss gently.",
        "Top with feta chunks. Serve immediately.",
      ]),
      tags: JSON.stringify(["vegetarian", "healthy", "no-cook", "salad"]),
      imageUrl: "https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=600&q=80",
      contributorId: chef2.id,
      sourceUrl: null,
    });

    storage.createRecipe({
      name: "Pulled Pork",
      description: "Low-and-slow oven-braised pork shoulder with a smoky dry rub — shreddable, tender, and made for sandwiches.",
      cookTimeMinutes: 270,
      servings: 8,
      equipment: JSON.stringify(["oven"]),
      ingredients: JSON.stringify([
        { name: "Pork shoulder (bone-in)", qty: 4, unit: "lbs" },
        { name: "Brown sugar", qty: 2, unit: "tbsp" },
        { name: "Smoked paprika", qty: 2, unit: "tbsp" },
        { name: "Garlic powder", qty: 1, unit: "tbsp" },
        { name: "Onion powder", qty: 1, unit: "tbsp" },
        { name: "Cumin", qty: 1, unit: "tsp" },
        { name: "Cayenne", qty: 0.5, unit: "tsp" },
        { name: "Apple cider vinegar", qty: 0.25, unit: "cup" },
        { name: "BBQ sauce", qty: 1, unit: "cup" },
      ]),
      steps: JSON.stringify([
        "Mix all dry rub ingredients together. Score pork and rub all over generously.",
        "Place in a roasting pan. Add ¼ cup water to the bottom.",
        "Cover tightly with foil. Roast at 300°F for 4-4.5 hours.",
        "Uncover for the last 30 minutes to brown the bark.",
        "Rest 20 minutes. Shred with two forks, discarding fat.",
        "Toss with BBQ sauce and apple cider vinegar. Serve on buns.",
      ]),
      tags: JSON.stringify(["bbq", "meal-prep", "weekend", "pork"]),
      imageUrl: "https://images.unsplash.com/photo-1544025162-d76694265947?w=600&q=80",
      contributorId: admin.id,
      sourceUrl: null,
    });

    storage.createRecipe({
      name: "Vegetable Curry",
      description: "A hearty, fragrant vegetable curry loaded with chickpeas, potatoes, and spinach in a coconut-tomato base.",
      cookTimeMinutes: 40,
      servings: 4,
      equipment: JSON.stringify(["stove"]),
      ingredients: JSON.stringify([
        { name: "Chickpeas, drained", qty: 1, unit: "15-oz can" },
        { name: "Potatoes, cubed", qty: 2, unit: "medium" },
        { name: "Spinach", qty: 3, unit: "cups" },
        { name: "Coconut milk", qty: 1, unit: "14-oz can" },
        { name: "Diced tomatoes", qty: 1, unit: "14-oz can" },
        { name: "Onion, diced", qty: 1, unit: "" },
        { name: "Garlic cloves, minced", qty: 3, unit: "" },
        { name: "Ginger, grated", qty: 1, unit: "tsp" },
        { name: "Curry powder", qty: 2, unit: "tbsp" },
        { name: "Garam masala", qty: 1, unit: "tsp" },
      ]),
      steps: JSON.stringify([
        "Sauté onion in oil until softened (5 min). Add garlic, ginger, curry powder, garam masala.",
        "Cook spices 1 minute, then add diced tomatoes. Simmer 5 minutes.",
        "Add potatoes and coconut milk. Simmer 15-20 minutes until potatoes are tender.",
        "Stir in chickpeas and spinach. Cook 3 more minutes until spinach wilts.",
        "Season with salt and serve over rice with naan.",
      ]),
      tags: JSON.stringify(["vegan", "vegetarian", "indian", "healthy"]),
      imageUrl: "https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=600&q=80",
      contributorId: chef3.id,
      sourceUrl: null,
    });

    storage.createRecipe({
      name: "Grilled Cheese & Tomato",
      description: "The ultimate comfort sandwich — buttery, golden bread with stretchy melted cheese and ripe tomato slices.",
      cookTimeMinutes: 10,
      servings: 2,
      equipment: JSON.stringify(["stove"]),
      ingredients: JSON.stringify([
        { name: "Bread slices", qty: 4, unit: "" },
        { name: "Butter, softened", qty: 3, unit: "tbsp" },
        { name: "American or cheddar cheese", qty: 4, unit: "slices" },
        { name: "Tomato, sliced", qty: 1, unit: "large" },
        { name: "Garlic powder", qty: 0, unit: "pinch (optional)" },
      ]),
      steps: JSON.stringify([
        "Butter one side of each bread slice. Add a pinch of garlic powder to the butter if using.",
        "Heat skillet over medium-low. Place bread butter-side down.",
        "Layer cheese and tomato slices on one slice. Top with second slice, butter-side up.",
        "Cook 3-4 minutes per side, pressing gently, until golden and cheese is melted.",
        "Slice diagonally and serve hot.",
      ]),
      tags: JSON.stringify(["vegetarian", "quick", "comfort", "sandwich"]),
      imageUrl: "https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=600&q=80",
      contributorId: chef2.id,
      sourceUrl: null,
    });

    storage.createRecipe({
      name: "Instant Pot Chicken & Rice",
      description: "One-pot chicken thighs and rice cooked perfectly together in the Instant Pot. Easy weeknight dinner.",
      cookTimeMinutes: 35,
      servings: 4,
      equipment: JSON.stringify(["instantPot"]),
      ingredients: JSON.stringify([
        { name: "Bone-in chicken thighs", qty: 4, unit: "" },
        { name: "Long grain white rice", qty: 1.5, unit: "cups" },
        { name: "Chicken broth", qty: 1.5, unit: "cups" },
        { name: "Onion, diced", qty: 1, unit: "" },
        { name: "Garlic cloves, minced", qty: 3, unit: "" },
        { name: "Paprika", qty: 1, unit: "tsp" },
        { name: "Italian seasoning", qty: 1, unit: "tsp" },
        { name: "Salt & pepper", qty: 0, unit: "to taste" },
      ]),
      steps: JSON.stringify([
        "Season chicken with paprika, Italian seasoning, salt, and pepper.",
        "Use Sauté mode to brown chicken 3 min per side. Remove.",
        "Sauté onion and garlic 2 minutes. Add rice and stir to toast slightly.",
        "Add broth. Place chicken on top. Lock lid.",
        "Pressure cook on High for 10 minutes. Natural release 10 minutes, then quick release.",
        "Fluff rice and serve.",
      ]),
      tags: JSON.stringify(["chicken", "one-pot", "meal-prep"]),
      imageUrl: "https://images.unsplash.com/photo-1563379926898-05f4575a45d8?w=600&q=80",
      contributorId: chef2.id,
      sourceUrl: null,
    });

    storage.createRecipe({
      name: "Air Fryer French Fries",
      description: "Crispy, golden homemade fries with barely any oil. Season any way you like — classic salt, cajun, or garlic parmesan.",
      cookTimeMinutes: 30,
      servings: 3,
      equipment: JSON.stringify(["airFryer"]),
      ingredients: JSON.stringify([
        { name: "Russet potatoes", qty: 3, unit: "large" },
        { name: "Olive oil", qty: 1, unit: "tbsp" },
        { name: "Salt", qty: 1, unit: "tsp" },
        { name: "Garlic powder", qty: 0.5, unit: "tsp" },
        { name: "Paprika", qty: 0.5, unit: "tsp" },
      ]),
      steps: JSON.stringify([
        "Cut potatoes into ¼-inch sticks. Soak in cold water 20 minutes. Drain and pat very dry.",
        "Toss with olive oil, salt, garlic powder, and paprika.",
        "Arrange in a single layer in air fryer basket (cook in batches).",
        "Air fry at 380°F for 15 minutes. Shake basket, then cook 5 more minutes until crispy.",
        "Season immediately and serve hot.",
      ]),
      tags: JSON.stringify(["vegetarian", "side", "crispy", "snack"]),
      imageUrl: "https://images.unsplash.com/photo-1576107232684-1279f390859f?w=600&q=80",
      contributorId: chef4.id,
      sourceUrl: null,
    });

    storage.createRecipe({
      name: "Avocado Toast",
      description: "Creamy smashed avocado on thick toast with everything bagel seasoning and a soft-boiled egg. Café-quality at home.",
      cookTimeMinutes: 10,
      servings: 2,
      equipment: JSON.stringify(["stove", "counter"]),
      ingredients: JSON.stringify([
        { name: "Thick bread slices (sourdough)", qty: 2, unit: "" },
        { name: "Ripe avocados", qty: 2, unit: "" },
        { name: "Eggs", qty: 2, unit: "" },
        { name: "Lemon juice", qty: 1, unit: "tbsp" },
        { name: "Red pepper flakes", qty: 0, unit: "pinch" },
        { name: "Everything bagel seasoning", qty: 0, unit: "to taste" },
        { name: "Salt & pepper", qty: 0, unit: "to taste" },
      ]),
      steps: JSON.stringify([
        "Soft boil eggs: bring water to boil, lower eggs in, cook exactly 6.5 minutes, transfer to ice water.",
        "Toast bread to your liking.",
        "Smash avocado with lemon juice, salt, and pepper.",
        "Spread avocado on toast. Peel and halve eggs.",
        "Top with eggs, red pepper flakes, and everything bagel seasoning.",
      ]),
      tags: JSON.stringify(["vegetarian", "breakfast", "healthy", "quick"]),
      imageUrl: "https://images.unsplash.com/photo-1541519227354-08fa5d50c820?w=600&q=80",
      contributorId: chef1.id,
      sourceUrl: null,
    });

    storage.createRecipe({
      name: "Pork Fried Rice",
      description: "Restaurant-style fried rice with tender char siu-style pork, eggs, and vegetables. Made in one wok in minutes.",
      cookTimeMinutes: 20,
      servings: 4,
      equipment: JSON.stringify(["stove"]),
      ingredients: JSON.stringify([
        { name: "Cooked rice (day-old)", qty: 4, unit: "cups" },
        { name: "Pork tenderloin or leftover pork, diced", qty: 0.75, unit: "lb" },
        { name: "Eggs", qty: 3, unit: "" },
        { name: "Frozen peas and carrots", qty: 1, unit: "cup" },
        { name: "Green onions", qty: 3, unit: "" },
        { name: "Soy sauce", qty: 3, unit: "tbsp" },
        { name: "Oyster sauce", qty: 1, unit: "tbsp" },
        { name: "Sesame oil", qty: 1, unit: "tsp" },
        { name: "Garlic cloves, minced", qty: 2, unit: "" },
        { name: "Vegetable oil", qty: 2, unit: "tbsp" },
      ]),
      steps: JSON.stringify([
        "Heat wok over highest heat. Add oil, sear pork until caramelized. Remove.",
        "Add garlic and peas/carrots, stir fry 2 min.",
        "Push to side, scramble eggs in the space until just set.",
        "Add rice, breaking up clumps. Toss everything together 3-4 minutes.",
        "Add soy sauce, oyster sauce, and sesame oil. Toss. Return pork.",
        "Top with green onions. Serve immediately.",
      ]),
      tags: JSON.stringify(["asian", "quick", "pork", "meal-prep"]),
      imageUrl: "https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=600&q=80",
      contributorId: chef3.id,
      sourceUrl: null,
    });
  }
}

export function registerRoutes(httpServer: Server, app: Express) {
  // Seed default data
  seedIfEmpty();

  // --- Contributors ---
  app.get("/api/contributors", (_req, res) => {
    res.json(storage.getContributors());
  });

  app.post("/api/contributors", (req, res) => {
    const parsed = insertContributorSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const contributor = storage.createContributor(parsed.data);
    res.status(201).json(contributor);
  });

  // --- Recipes ---
  app.get("/api/recipes", (_req, res) => {
    const allRecipes = storage.getRecipes();
    const allContributors = storage.getContributors();
    const contributorMap = Object.fromEntries(allContributors.map(c => [c.id, c]));
    // Parse JSON fields and attach contributor
    const enriched = allRecipes.map(r => ({
      ...r,
      equipment: JSON.parse(r.equipment || "[]"),
      ingredients: JSON.parse(r.ingredients || "[]"),
      steps: JSON.parse(r.steps || "[]"),
      tags: JSON.parse(r.tags || "[]"),
      contributor: r.contributorId ? contributorMap[r.contributorId] : null,
    }));
    res.json(enriched);
  });

  app.get("/api/recipes/:id", (req, res) => {
    const id = parseInt(req.params.id);
    const recipe = storage.getRecipe(id);
    if (!recipe) return res.status(404).json({ error: "Recipe not found" });
    const contributor = recipe.contributorId ? storage.getContributor(recipe.contributorId) : null;
    res.json({
      ...recipe,
      equipment: JSON.parse(recipe.equipment || "[]"),
      ingredients: JSON.parse(recipe.ingredients || "[]"),
      steps: JSON.parse(recipe.steps || "[]"),
      tags: JSON.parse(recipe.tags || "[]"),
      contributor,
    });
  });

  app.post("/api/recipes", (req, res) => {
    const body = {
      ...req.body,
      equipment: typeof req.body.equipment === "object" ? JSON.stringify(req.body.equipment) : req.body.equipment,
      ingredients: typeof req.body.ingredients === "object" ? JSON.stringify(req.body.ingredients) : req.body.ingredients,
      steps: typeof req.body.steps === "object" ? JSON.stringify(req.body.steps) : req.body.steps,
      tags: typeof req.body.tags === "object" ? JSON.stringify(req.body.tags) : req.body.tags,
    };
    const parsed = insertRecipeSchema.safeParse(body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const recipe = storage.createRecipe(parsed.data);
    res.status(201).json({
      ...recipe,
      equipment: JSON.parse(recipe.equipment || "[]"),
      ingredients: JSON.parse(recipe.ingredients || "[]"),
      steps: JSON.parse(recipe.steps || "[]"),
      tags: JSON.parse(recipe.tags || "[]"),
    });
  });

  app.delete("/api/recipes/:id", (req, res) => {
    const id = parseInt(req.params.id);
    const ok = storage.deleteRecipe(id);
    if (!ok) return res.status(404).json({ error: "Recipe not found" });
    res.status(204).end();
  });

  // --- Schedule generation ---
  const scheduleInputSchema = z.object({
    selectedRecipeIds: z.array(z.number()),
    startTime: z.string(), // "HH:MM"
    maxMinutes: z.number(),
    equipment: z.object({
      oven: z.boolean(),
      stove: z.boolean(),
      airFryer: z.boolean(),
      counter: z.boolean(),
      instantPot: z.boolean().optional(),
      microwave: z.boolean().optional(),
    }),
    burners: z.number(),
  });

  app.post("/api/schedule/generate", (req, res) => {
    const parsed = scheduleInputSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const { selectedRecipeIds, startTime, maxMinutes, equipment, burners } = parsed.data;

    const allRecipes = storage.getRecipes();
    const selected = allRecipes.filter(r => selectedRecipeIds.includes(r.id));

    // Simple scheduling: sort by cook time descending, assign start times greedily
    const recipesWithEquipment = selected.map(r => ({
      ...r,
      equipment: JSON.parse(r.equipment || "[]") as string[],
    }));

    // Parse start time
    const [startHour, startMin] = startTime.split(":").map(Number);
    const startMinutes = startHour * 60 + startMin;

    const schedule: Array<{
      recipeId: number;
      recipeName: string;
      startTime: string;
      endTime: string;
      equipment: string;
    }> = [];

    // Track equipment availability (simplified: per equipment type, track next available minute)
    const equipmentNextAvail: Record<string, number> = {
      oven: startMinutes,
      stove: startMinutes,
      airFryer: startMinutes,
      counter: startMinutes,
      instantPot: startMinutes,
      microwave: startMinutes,
    };

    // Stove burner tracking
    const burnerSlots = Array(burners).fill(startMinutes);

    const minutesToTime = (minutes: number) => {
      const h = Math.floor(minutes / 60) % 24;
      const m = minutes % 60;
      return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
    };

    // Sort by cook time desc (longest first — start these first)
    recipesWithEquipment.sort((a, b) => b.cookTimeMinutes - a.cookTimeMinutes);

    for (const recipe of recipesWithEquipment) {
      let earliest = startMinutes;
      const requiredEquipment = recipe.equipment;
      const primaryEquip = requiredEquipment[0] || "counter";

      if (primaryEquip === "stove") {
        // Find the earliest available burner
        const earliestBurner = Math.min(...burnerSlots);
        const burnerIdx = burnerSlots.indexOf(earliestBurner);
        earliest = earliestBurner;
        burnerSlots[burnerIdx] = earliest + recipe.cookTimeMinutes;
      } else {
        earliest = equipmentNextAvail[primaryEquip] ?? startMinutes;
        equipmentNextAvail[primaryEquip] = earliest + recipe.cookTimeMinutes;
      }

      schedule.push({
        recipeId: recipe.id,
        recipeName: recipe.name,
        startTime: minutesToTime(earliest),
        endTime: minutesToTime(earliest + recipe.cookTimeMinutes),
        equipment: primaryEquip,
      });
    }

    // Sort schedule by start time
    schedule.sort((a, b) => a.startTime.localeCompare(b.startTime));

    res.json({ schedule });
  });

  // ── Parallel Process Cooking ──────────────────────────────────────────────
  app.post("/api/schedule/parallel", (req, res) => {
    const parsed = z.object({
      recipeIds: z.array(z.number()).min(2).max(5),
      burners: z.number().min(1).max(6).optional().default(2),
    }).safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({ error: "Provide 2–5 recipe IDs", details: parsed.error.flatten() });
    }

    const { recipeIds, burners } = parsed.data;
    const allRecipes = storage.getRecipes();
    const selected = allRecipes.filter(r => recipeIds.includes(r.id));

    if (selected.length < 2) {
      return res.status(400).json({ error: "Could not find enough matching recipes" });
    }

    const enriched = selected.map(r => ({
      id: r.id,
      name: r.name,
      cookTimeMinutes: r.cookTimeMinutes,
      equipment: JSON.parse(r.equipment || "[]") as string[],
      ingredients: JSON.parse(r.ingredients || "[]") as { name: string; qty: number; unit: string }[],
      steps: JSON.parse(r.steps || "[]") as string[],
    }));

    const phases = buildParallelPlan(enriched, burners);
    const totalMinutes = enriched.reduce((max, r) => Math.max(max, r.cookTimeMinutes), 0);
    const sequentialMinutes = enriched.reduce((sum, r) => sum + r.cookTimeMinutes, 0);

    res.json({ phases, totalMinutes, sequentialMinutes, recipeCount: selected.length });
  });
}
