import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { insertRecipeSchema, insertContributorSchema } from "@shared/schema";
import { z } from "zod";

// Seed default data if empty
function seedIfEmpty() {
  const existingContributors = storage.getContributors();
  if (existingContributors.length === 0) {
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
}
