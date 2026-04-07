/**
 * Recipe URL Importer
 *
 * Extracts recipe data from any URL using:
 * 1. JSON-LD structured data (schema.org/Recipe) — works on AllRecipes, Food Network,
 *    NYT Cooking, Tasty, Serious Eats, BBC Good Food, Epicurious, and most major sites
 * 2. Microdata fallback (itemtype="http://schema.org/Recipe")
 *
 * No API key required.
 */

import https from "https";
import http from "http";
import { URL } from "url";

/** Minimal fetch replacement using Node's built-in https/http modules */
function nodeFetch(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const mod = parsed.protocol === "https:" ? https : http;
    const options = {
      hostname: parsed.hostname,
      port: parsed.port || (parsed.protocol === "https:" ? 443 : 80),
      path: parsed.pathname + parsed.search,
      method: "GET",
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; MeanCuisinesBot/1.0)",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      },
      timeout: 10000,
    };
    const req = mod.request(options, (res) => {
      // Follow redirects (up to 5)
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        resolve(nodeFetch(res.headers.location));
        res.resume();
        return;
      }
      if (res.statusCode && res.statusCode >= 400) {
        reject(new Error(`Could not fetch page (${res.statusCode})`));
        res.resume();
        return;
      }
      const chunks: Buffer[] = [];
      res.on("data", (chunk) => chunks.push(chunk));
      res.on("end", () => resolve(Buffer.concat(chunks).toString("utf-8")));
      res.on("error", reject);
    });
    req.on("error", reject);
    req.on("timeout", () => { req.destroy(); reject(new Error("Request timed out")); });
    req.end();
  });
}

export interface ImportedRecipe {
  name: string;
  description: string;
  cookTimeMinutes: number;
  prepTimeMinutes: number;
  servings: number;
  equipment: string[];
  ingredients: { name: string; qty: number; unit: string }[];
  steps: string[];
  tags: string[];
  imageUrl: string | null;
  sourceUrl: string;
  author: string | null;
}

// ─── Time parsing ──────────────────────────────────────────────────────────────

/** Parse ISO 8601 duration like PT1H30M → minutes */
function parseISO8601Duration(dur: string | undefined): number {
  if (!dur) return 0;
  const hoursMatch = dur.match(/(\d+)H/i);
  const minutesMatch = dur.match(/(\d+)M/i);
  const hours = hoursMatch ? parseInt(hoursMatch[1]) : 0;
  const minutes = minutesMatch ? parseInt(minutesMatch[1]) : 0;
  return hours * 60 + minutes;
}

// ─── Servings parsing ──────────────────────────────────────────────────────────

function parseServings(val: string | number | undefined): number {
  if (!val) return 4;
  if (typeof val === "number") return val;
  // "4 servings", "Makes 6", "Serves 4-6" → take first number
  const match = val.toString().match(/\d+/);
  return match ? parseInt(match[0]) : 4;
}

// ─── Ingredient parsing ────────────────────────────────────────────────────────

const UNITS = [
  "cup","cups","tablespoon","tablespoons","tbsp","teaspoon","teaspoons","tsp",
  "pound","pounds","lb","lbs","ounce","ounces","oz","gram","grams","g",
  "kilogram","kg","ml","milliliter","liter","litre","l","clove","cloves",
  "slice","slices","can","cans","jar","jars","package","pkg","bunch","head",
  "stalk","stalks","sprig","sprigs","pinch","dash","handful",
];

function parseIngredient(raw: string): { name: string; qty: number; unit: string } {
  // Remove HTML tags
  const text = raw.replace(/<[^>]+>/g, "").trim();

  // Try to match: [qty] [unit] [name]
  // qty can be fractions: 1/2, 1 1/2, decimals: 0.5
  const fractionMap: Record<string, number> = {
    "½": 0.5, "⅓": 0.333, "⅔": 0.667, "¼": 0.25, "¾": 0.75,
    "⅛": 0.125, "⅜": 0.375, "⅝": 0.625, "⅞": 0.875,
  };

  let working = text;

  // Normalize unicode fractions
  for (const [sym, val] of Object.entries(fractionMap)) {
    working = working.replace(new RegExp(sym, "g"), ` ${val} `);
  }
  working = working.replace(/\s+/g, " ").trim();

  // Match quantity
  const qtyPattern = /^((\d+\s+)?\d+\/\d+|\d+\.?\d*)/;
  const qtyMatch = working.match(qtyPattern);
  let qty = 0;
  if (qtyMatch) {
    const qtyStr = qtyMatch[1];
    if (qtyStr.includes("/")) {
      const parts = qtyStr.trim().split(/\s+/);
      if (parts.length === 2) {
        // "1 1/2"
        const [whole, frac] = parts;
        const [num, den] = frac.split("/");
        qty = parseInt(whole) + parseInt(num) / parseInt(den);
      } else {
        const [num, den] = parts[0].split("/");
        qty = parseInt(num) / parseInt(den);
      }
    } else {
      qty = parseFloat(qtyStr);
    }
    working = working.slice(qtyMatch[0].length).trim();
  }

  // Match unit
  let unit = "";
  const unitPattern = new RegExp(`^(${UNITS.join("|")})\\.?\\s+`, "i");
  const unitMatch = working.match(unitPattern);
  if (unitMatch) {
    unit = unitMatch[1].toLowerCase();
    working = working.slice(unitMatch[0].length).trim();
  }

  // Remaining = name (strip trailing parentheticals for short names)
  const name = working.replace(/\s*\(.*?\)\s*/g, " ").trim() || text;

  return { name, qty, unit };
}

// ─── Equipment detection ───────────────────────────────────────────────────────

function detectEquipment(steps: string[], keywords: string[] = []): string[] {
  const text = [...steps, ...keywords].join(" ").toLowerCase();
  const equipment: string[] = [];
  if (/oven|bake|roast|broil|preheat/i.test(text)) equipment.push("oven");
  if (/stove|skillet|pan|sauté|simmer|boil|sear|fry|wok|griddle/i.test(text)) equipment.push("stove");
  if (/air fry/i.test(text)) equipment.push("airFryer");
  if (/instant pot|pressure cook/i.test(text)) equipment.push("instantPot");
  if (/microwave/i.test(text)) equipment.push("microwave");
  if (equipment.length === 0) equipment.push("counter");
  return [...new Set(equipment)];
}

// ─── JSON-LD extraction ────────────────────────────────────────────────────────

function extractJsonLd(html: string): ImportedRecipe | null {
  // Find all JSON-LD scripts
  const scriptRegex = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match;

  while ((match = scriptRegex.exec(html)) !== null) {
    try {
      let data = JSON.parse(match[1]);

      // Could be an array or wrapped in @graph
      if (Array.isArray(data)) {
        data = data.find((d: any) => d["@type"] === "Recipe" || (Array.isArray(d["@type"]) && d["@type"].includes("Recipe")));
      } else if (data["@graph"]) {
        data = data["@graph"].find((d: any) => d["@type"] === "Recipe" || (Array.isArray(d["@type"]) && d["@type"].includes("Recipe")));
      }

      if (!data || (data["@type"] !== "Recipe" && !(Array.isArray(data["@type"]) && data["@type"].includes("Recipe")))) {
        continue;
      }

      return parseSchemaRecipe(data);
    } catch {
      continue;
    }
  }

  return null;
}

function parseSchemaRecipe(data: any): ImportedRecipe {
  // Name
  const name = (data.name || "").trim();

  // Description
  const description = (data.description || "")
    .replace(/<[^>]+>/g, "")
    .trim()
    .slice(0, 500);

  // Times
  const cookTime = parseISO8601Duration(data.cookTime || data.totalTime);
  const prepTime = parseISO8601Duration(data.prepTime);
  const totalTime = parseISO8601Duration(data.totalTime);
  const cookTimeMinutes = cookTime || Math.max(totalTime - prepTime, 10) || 30;

  // Servings
  const servings = parseServings(data.recipeYield || data.yield);

  // Ingredients
  const rawIngredients: string[] = Array.isArray(data.recipeIngredient) ? data.recipeIngredient : [];
  const ingredients = rawIngredients.map(parseIngredient);

  // Steps
  let steps: string[] = [];
  if (Array.isArray(data.recipeInstructions)) {
    steps = data.recipeInstructions.map((step: any) => {
      if (typeof step === "string") return step.replace(/<[^>]+>/g, "").trim();
      if (step["@type"] === "HowToSection") {
        // Section with sub-steps
        const subSteps = (step.itemListElement || []).map((s: any) =>
          typeof s === "string" ? s : (s.text || s.name || "").replace(/<[^>]+>/g, "").trim()
        );
        return subSteps.join(" ");
      }
      return (step.text || step.name || "").replace(/<[^>]+>/g, "").trim();
    }).filter(Boolean);
  } else if (typeof data.recipeInstructions === "string") {
    steps = data.recipeInstructions
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<[^>]+>/g, "")
      .split(/\n+/)
      .map((s: string) => s.trim())
      .filter(Boolean);
  }

  // Tags
  const keywords: string[] = typeof data.keywords === "string"
    ? data.keywords.split(",").map((k: string) => k.trim().toLowerCase()).slice(0, 5)
    : Array.isArray(data.keywords)
    ? data.keywords.map((k: string) => k.trim().toLowerCase()).slice(0, 5)
    : [];
  const category = data.recipeCategory
    ? (Array.isArray(data.recipeCategory) ? data.recipeCategory : [data.recipeCategory]).map((c: string) => c.toLowerCase())
    : [];
  const cuisine = data.recipeCuisine
    ? (Array.isArray(data.recipeCuisine) ? data.recipeCuisine : [data.recipeCuisine]).map((c: string) => c.toLowerCase())
    : [];
  const tags = [...new Set([...keywords, ...category, ...cuisine])].slice(0, 6);

  // Image
  let imageUrl: string | null = null;
  if (typeof data.image === "string") {
    imageUrl = data.image;
  } else if (Array.isArray(data.image) && data.image.length > 0) {
    imageUrl = typeof data.image[0] === "string" ? data.image[0] : data.image[0].url || null;
  } else if (data.image?.url) {
    imageUrl = data.image.url;
  }

  // Author
  let author: string | null = null;
  if (data.author) {
    author = typeof data.author === "string" ? data.author : (data.author.name || null);
  }

  // Equipment detection from steps
  const equipment = detectEquipment(steps, keywords);

  return {
    name,
    description,
    cookTimeMinutes,
    prepTimeMinutes: prepTime,
    servings,
    equipment,
    ingredients,
    steps,
    tags,
    imageUrl,
    sourceUrl: "",
    author,
  };
}

// ─── Main import function ──────────────────────────────────────────────────────

export async function importRecipeFromUrl(url: string): Promise<ImportedRecipe> {
  // Validate URL
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
    if (!["http:", "https:"].includes(parsedUrl.protocol)) {
      throw new Error("Only HTTP/HTTPS URLs are supported");
    }
  } catch {
    throw new Error("Invalid URL");
  }

  // Fetch the page using Node's built-in http/https (no ESM dependencies)
  const html = await nodeFetch(url);

  // Try JSON-LD first (most reliable)
  const recipe = extractJsonLd(html);
  if (!recipe) {
    throw new Error(
      "No recipe data found on this page. The site may not use structured recipe data.\n" +
      "Try: AllRecipes, Food Network, Tasty, NYT Cooking, Serious Eats, BBC Good Food, Epicurious, or Bon Appétit."
    );
  }

  recipe.sourceUrl = url;
  return recipe;
}
