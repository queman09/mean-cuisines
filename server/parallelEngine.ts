/**
 * Parallel Process Cooking Engine
 * Treats the kitchen like a job-shop scheduler:
 *  - Long passive tasks (bake, simmer) start first
 *  - Active prep tasks for recipe B fill the idle time of recipe A
 *  - Redundant steps (e.g. "preheat oven") are consolidated
 *  - Equipment conflicts are detected and tasks are staggered
 */

export interface RecipeInput {
  id: number;
  name: string;
  cookTimeMinutes: number;
  equipment: string[];
  ingredients: { name: string; qty: number; unit: string }[];
  steps: string[];
}

export interface MasterTask {
  /** Minute offset from time 0 when this task starts */
  startMinute: number;
  /** Estimated duration in minutes */
  durationMinutes: number;
  /** Which recipe this belongs to */
  recipeId: number;
  recipeName: string;
  /** 0-based index into the recipe's original steps array */
  stepIndex: number;
  /** The instruction text */
  instruction: string;
  /** Equipment required, if any */
  equipment: string | null;
  /** Category to help the UI display context */
  type: "passive" | "active" | "consolidated";
  /** If consolidated, which recipe names were merged */
  consolidatedFrom?: string[];
}

// ─── Heuristics ───────────────────────────────────────────────────────────────

/**
 * Passive keywords: steps where you walk away and the stove/oven does the work.
 * The cook is free to do other things during these.
 */
const PASSIVE_KEYWORDS = [
  "bake", "roast", "simmer", "boil", "broil", "rest", "marinate",
  "soak", "chill", "refrigerate", "cool", "reduce", "pressure cook",
  "slow cook", "caramelize", "let stand", "let sit", "set aside",
];

/**
 * Active keywords: steps that require constant attention.
 */
const ACTIVE_KEYWORDS = [
  "chop", "dice", "mince", "slice", "peel", "grate", "shred", "mix",
  "whisk", "stir", "fold", "beat", "knead", "season", "combine",
  "prep", "prepare", "measure", "crush", "squeeze", "mash",
];

/**
 * Consolidation patterns: if multiple recipes have similar early steps,
 * we merge them into one.
 */
const CONSOLIDATION_PATTERNS = [
  { pattern: /preheat.*oven/i, label: "Preheat oven" },
  { pattern: /bring.*water.*boil/i, label: "Bring a pot of salted water to a boil" },
  { pattern: /boil.*salted.*water/i, label: "Bring a pot of salted water to a boil" },
  { pattern: /season.*salt.*pepper/i, label: "Season with salt & pepper (applies to all recipes)" },
];

function classifyStep(step: string): "passive" | "active" | "neutral" {
  const lower = step.toLowerCase();
  const passiveScore = PASSIVE_KEYWORDS.filter(k => lower.includes(k)).length;
  const activeScore = ACTIVE_KEYWORDS.filter(k => lower.includes(k)).length;
  if (passiveScore > activeScore) return "passive";
  if (activeScore > passiveScore) return "active";
  return "neutral";
}

/**
 * Rough estimate of how long a step takes, in minutes.
 * Parsed from phrases like "30 minutes", "2 hours", "1-2 min".
 * Falls back to heuristics based on passive/active classification.
 */
function estimateStepDuration(step: string, classification: string): number {
  // Try to extract an explicit time mention
  const hoursMatch = step.match(/(\d+(?:\.\d+)?)\s*hour/i);
  const minutesMatch = step.match(/(\d+)[\s-]*(?:to[\s-]*(\d+))?\s*min/i);

  if (hoursMatch) {
    return Math.round(parseFloat(hoursMatch[1]) * 60);
  }
  if (minutesMatch) {
    const lo = parseInt(minutesMatch[1]);
    const hi = minutesMatch[2] ? parseInt(minutesMatch[2]) : lo;
    return Math.round((lo + hi) / 2);
  }

  // Heuristic fallback
  if (classification === "passive") return 20;
  if (classification === "active") return 5;
  return 3;
}

/**
 * Determine what equipment a step primarily uses.
 */
function detectStepEquipment(step: string, recipeEquipment: string[]): string | null {
  const lower = step.toLowerCase();
  if (/oven|bake|roast|broil/i.test(lower)) return "oven";
  if (/stove|skillet|pan|pot|sauté|simmer|boil/i.test(lower)) return "stove";
  if (/air fry/i.test(lower)) return "airFryer";
  if (/instant pot|pressure cook/i.test(lower)) return "instantPot";
  if (/microwave/i.test(lower)) return "microwave";
  return recipeEquipment[0] ?? null;
}

// ─── Main Engine ──────────────────────────────────────────────────────────────

export function buildParallelPlan(recipes: RecipeInput[]): MasterTask[] {
  if (recipes.length === 0) return [];

  // Step 1: Expand all recipes into raw tasks with classifications
  interface RawTask {
    recipeId: number;
    recipeName: string;
    stepIndex: number;
    instruction: string;
    classification: "passive" | "active" | "neutral";
    duration: number;
    equipment: string | null;
    recipeEquipment: string[];
    cookTimeMinutes: number;
  }

  const allRawTasks: RawTask[] = [];

  for (const recipe of recipes) {
    for (let i = 0; i < recipe.steps.length; i++) {
      const step = recipe.steps[i];
      const classification = classifyStep(step);
      const duration = estimateStepDuration(step, classification);
      const equipment = detectStepEquipment(step, recipe.equipment);
      allRawTasks.push({
        recipeId: recipe.id,
        recipeName: recipe.name,
        stepIndex: i,
        instruction: step,
        classification,
        duration,
        equipment,
        recipeEquipment: recipe.equipment,
        cookTimeMinutes: recipe.cookTimeMinutes,
      });
    }
  }

  // Step 2: Consolidation pass — find duplicate preheat/boil steps across recipes
  const consolidationGroups: Map<string, RawTask[]> = new Map();
  const consolidatedTaskIndices = new Set<number>();

  for (let i = 0; i < allRawTasks.length; i++) {
    const task = allRawTasks[i];
    for (const { pattern, label } of CONSOLIDATION_PATTERNS) {
      if (pattern.test(task.instruction)) {
        if (!consolidationGroups.has(label)) {
          consolidationGroups.set(label, []);
        }
        consolidationGroups.get(label)!.push(task);
        consolidatedTaskIndices.add(i);
        break;
      }
    }
  }

  // Step 3: Build consolidated tasks (one per group)
  const consolidatedTasks: MasterTask[] = [];
  consolidationGroups.forEach((tasks, label) => {
    if (tasks.length > 1) {
      // Only consolidate when multiple recipes share the same step
      consolidatedTasks.push({
        startMinute: 0,
        durationMinutes: tasks[0].duration,
        recipeId: tasks[0].recipeId,
        recipeName: "All Recipes",
        stepIndex: -1,
        instruction: `${label} (shared across: ${tasks.map(t => t.recipeName).join(", ")})`,
        equipment: tasks[0].equipment,
        type: "consolidated",
        consolidatedFrom: tasks.map(t => t.recipeName),
      });
    } else {
      // Only one recipe has this step — keep it but remove from consolidated set
      consolidatedTaskIndices.delete(allRawTasks.indexOf(tasks[0]));
    }
  });

  // Step 4: Separate remaining tasks into passive and active buckets per recipe
  const passiveTasks: RawTask[] = [];
  const activeTasks: RawTask[] = [];

  for (let i = 0; i < allRawTasks.length; i++) {
    if (consolidatedTaskIndices.has(i)) continue;
    const t = allRawTasks[i];
    if (t.classification === "passive") {
      passiveTasks.push(t);
    } else {
      activeTasks.push(t);
    }
  }

  // Sort passive tasks by recipe total cook time desc (longest recipe goes first)
  passiveTasks.sort((a, b) => b.cookTimeMinutes - a.cookTimeMinutes);

  // Step 5: Schedule — greedy timeline placement
  // We track a cursor per equipment type and a global cursor for active tasks
  const equipmentCursor: Record<string, number> = {};
  const recipeCursor: Record<number, number> = {}; // last minute used per recipe

  const getRecipeCursor = (id: number) => recipeCursor[id] ?? 0;
  const getEquipCursor = (eq: string | null) => eq ? (equipmentCursor[eq] ?? 0) : 0;

  const advanceRecipeCursor = (id: number, until: number) => {
    recipeCursor[id] = Math.max(getRecipeCursor(id), until);
  };
  const advanceEquipCursor = (eq: string | null, until: number) => {
    if (eq) equipmentCursor[eq] = Math.max(getEquipCursor(eq), until);
  };

  const scheduled: MasterTask[] = [];

  // Place consolidated tasks at minute 0
  let consolidatedOffset = 0;
  for (const ct of consolidatedTasks) {
    const start = consolidatedOffset;
    ct.startMinute = start;
    consolidatedOffset += ct.durationMinutes;
    advanceEquipCursor(ct.equipment, consolidatedOffset);
    // All participating recipes inherit this cursor
    ct.consolidatedFrom?.forEach(name => {
      const r = recipes.find(r => r.name === name);
      if (r) advanceRecipeCursor(r.id, consolidatedOffset);
    });
    scheduled.push(ct);
  }

  // Place passive tasks — they define the skeleton of the schedule
  for (const task of passiveTasks) {
    const earliest = Math.max(
      getRecipeCursor(task.recipeId),
      getEquipCursor(task.equipment)
    );
    const start = earliest;
    const end = start + task.duration;

    scheduled.push({
      startMinute: start,
      durationMinutes: task.duration,
      recipeId: task.recipeId,
      recipeName: task.recipeName,
      stepIndex: task.stepIndex,
      instruction: task.instruction,
      equipment: task.equipment,
      type: "passive",
    });

    advanceRecipeCursor(task.recipeId, end);
    advanceEquipCursor(task.equipment, end);
  }

  // Place active tasks — fill idle windows
  // Sort active tasks to maximize utilization: try to fill gaps in passive schedules
  activeTasks.sort((a, b) => getRecipeCursor(a.recipeId) - getRecipeCursor(b.recipeId));

  for (const task of activeTasks) {
    const earliest = Math.max(
      getRecipeCursor(task.recipeId),
      getEquipCursor(task.equipment)
    );
    const start = earliest;
    const end = start + task.duration;

    scheduled.push({
      startMinute: start,
      durationMinutes: task.duration,
      recipeId: task.recipeId,
      recipeName: task.recipeName,
      stepIndex: task.stepIndex,
      instruction: task.instruction,
      equipment: task.equipment,
      type: "active",
    });

    advanceRecipeCursor(task.recipeId, end);
    advanceEquipCursor(task.equipment, end);
  }

  // Step 6: Sort the final plan chronologically
  // Ties broken by: consolidated first → passive → active → by recipe name
  const typeOrder = { consolidated: 0, passive: 1, active: 2 };
  scheduled.sort((a, b) => {
    if (a.startMinute !== b.startMinute) return a.startMinute - b.startMinute;
    const typeA = typeOrder[a.type] ?? 2;
    const typeB = typeOrder[b.type] ?? 2;
    if (typeA !== typeB) return typeA - typeB;
    return a.recipeName.localeCompare(b.recipeName);
  });

  return scheduled;
}
