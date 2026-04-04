/**
 * Mean Cuisines — Phase-Based Parallel Cooking Engine
 *
 * Takes 2-5 recipes and produces a list of smart-named cooking PHASES.
 * Each phase contains multiple steps from one or more recipes that should
 * be executed simultaneously or in close sequence.
 *
 * Kitchen rules:
 * - Mise en Place steps (pure prep: chop, measure, marinate) form Phase 1
 * - Passive tasks (oven, simmer, boil) that block equipment are started early
 * - Active stovetop steps can be parallelized if burner count allows
 * - Steps that share equipment are staggered
 * - Final phase: rest, plate, serve
 */

export interface RecipeInput {
  id: number;
  name: string;
  cookTimeMinutes: number;
  equipment: string[];
  ingredients: { name: string; qty: number; unit: string }[];
  steps: string[];
  burners?: number; // available stove burners
}

export interface PhaseStep {
  recipeId: number;
  recipeName: string;
  stepIndex: number;
  instruction: string;
  equipment: string | null;
  isPassive: boolean;  // hands-off (baking, simmering)
  isMise: boolean;     // pure prep (no heat)
  durationMinutes: number;
}

export interface CookingPhase {
  phaseNumber: number;
  name: string;           // Smart generated name
  emoji: string;
  description: string;    // One-line summary
  steps: PhaseStep[];
  estimatedMinutes: number;
  isParallel: boolean;    // Multiple recipes active simultaneously
}

// ─── Step Classification ───────────────────────────────────────────────────────

const MISE_PATTERNS = /\b(chop|dice|mince|slice|peel|grate|shred|trim|cut|measure|crush|squeeze|mash|marinate|coat|season and set|toss.*before|prep|prepare|gather|pat dry|rinse|drain.*and set|mix.*together.*and set|whisk.*together.*and set|combine.*and set)\b/i;

const PASSIVE_PATTERNS = /\b(bake|roast|simmer|boil|broil|rest|let stand|let sit|set aside|refrigerate|chill|reduce|pressure cook|slow cook|caramelize|steep|proof|rise)\b/i;

const PREHEAT_PATTERN = /preheat|heat.*oven|turn.*oven/i;

const SERVE_PATTERNS = /\b(serve|plate|garnish|enjoy|transfer.*plate|bring.*table|slice.*serve)\b/i;

const WATER_ON_PATTERN = /bring.*water.*boil|pot.*water.*high|salted.*water.*boil|water.*boil/i;

function classifyStep(step: string): { isMise: boolean; isPassive: boolean; isServe: boolean; isPreheat: boolean; isWaterOn: boolean } {
  return {
    isMise: MISE_PATTERNS.test(step) && !PASSIVE_PATTERNS.test(step),
    isPassive: PASSIVE_PATTERNS.test(step),
    isServe: SERVE_PATTERNS.test(step),
    isPreheat: PREHEAT_PATTERN.test(step),
    isWaterOn: WATER_ON_PATTERN.test(step),
  };
}

function estimateDuration(step: string, isPassive: boolean): number {
  const hoursMatch = step.match(/(\d+(?:\.\d+)?)\s*hour/i);
  const minutesMatch = step.match(/(\d+)[\s-]*(?:to[\s-]*(\d+))?\s*min/i);
  const secondsMatch = step.match(/(\d+)\s*second/i);

  if (hoursMatch) return Math.round(parseFloat(hoursMatch[1]) * 60);
  if (minutesMatch) {
    const lo = parseInt(minutesMatch[1]);
    const hi = minutesMatch[2] ? parseInt(minutesMatch[2]) : lo;
    return Math.round((lo + hi) / 2);
  }
  if (secondsMatch) return 1;
  return isPassive ? 20 : 4;
}

function detectEquipment(step: string, recipeEquipment: string[]): string | null {
  if (/oven|bake|roast|broil/i.test(step)) return "oven";
  if (/air fry/i.test(step)) return "airFryer";
  if (/instant pot|pressure cook/i.test(step)) return "instantPot";
  if (/microwave/i.test(step)) return "microwave";
  if (/stove|skillet|pan|pot|sauté|simmer|boil|wok|griddle|sear|fry/i.test(step)) return "stove";
  return recipeEquipment[0] ?? null;
}

// ─── Smart Phase Naming ────────────────────────────────────────────────────────

interface PhaseCharacter {
  hasPreheat: boolean;
  hasChop: boolean;
  hasBoilWater: boolean;
  hasOven: boolean;
  hasActiveStove: boolean;
  hasPassive: boolean;
  hasServe: boolean;
  hasMarinate: boolean;
  isMixedRecipes: boolean;
  recipeNames: string[];
  phaseIndex: number;
  totalPhases: number;
}

function generatePhaseName(char: PhaseCharacter): { name: string; emoji: string; description: string } {
  const { phaseIndex, totalPhases, hasChop, hasPreheat, hasBoilWater, hasOven, hasActiveStove, hasPassive, hasServe, hasMarinate, isMixedRecipes } = char;

  // First phase — always setup
  if (phaseIndex === 0) {
    if (hasChop && hasPreheat && hasBoilWater) return { name: "The Setup", emoji: "🔪", description: "Preheat, prep, and get everything ready before the heat starts" };
    if (hasChop && hasPreheat) return { name: "Prep & Preheat", emoji: "🔪", description: "Get your ingredients ready while the oven comes up to temp" };
    if (hasChop && hasMarinate) return { name: "Prep & Marinate", emoji: "🔪", description: "Chop, measure, and let flavors start developing" };
    if (hasChop) return { name: "Mise en Place", emoji: "🔪", description: "Chop, measure, and organize everything before cooking starts" };
    if (hasPreheat) return { name: "The Warm-Up", emoji: "🔥", description: "Get the heat going before the real work begins" };
    return { name: "The Setup", emoji: "⚙️", description: "Lay the groundwork before cooking begins" };
  }

  // Last phase — always the finish
  if (phaseIndex === totalPhases - 1) {
    if (hasServe) return { name: "Plate & Serve", emoji: "🍽️", description: "Rest, finish, and bring it all to the table" };
    return { name: "The Finish Line", emoji: "🏁", description: "Final touches — you're almost there" };
  }

  // Middle phases — smart naming
  if (hasOven && hasActiveStove && isMixedRecipes) return { name: "The Oven Sprint", emoji: "🔥", description: "Oven locked in, stovetop firing — both running at the same time" };
  if (hasOven && !hasActiveStove) return { name: "The Waiting Game", emoji: "⏱️", description: "Things are in the oven — use this time wisely" };
  if (hasBoilWater && hasPassive) return { name: "Start the Carbs", emoji: "🍝", description: "Get water boiling and long-cook items started" };
  if (hasActiveStove && isMixedRecipes) return { name: "Active Cooking", emoji: "🍳", description: "Multiple pans going — stay focused and keep moving" };
  if (hasActiveStove && !isMixedRecipes) return { name: "On the Heat", emoji: "🍳", description: "Stovetop time — watch the heat and keep stirring" };
  if (hasPassive && isMixedRecipes) return { name: "The Simmer", emoji: "💧", description: "Let things cook while you prep the next recipe" };
  if (hasPassive) return { name: "Let It Cook", emoji: "⏳", description: "Hands off — set a timer and step back" };
  if (isMixedRecipes) return { name: "The Merge", emoji: "🔀", description: "Bring the recipes together for the home stretch" };

  return { name: `Phase ${phaseIndex + 1}`, emoji: "🍴", description: "Next set of steps" };
}

// ─── Main Engine ──────────────────────────────────────────────────────────────

export function buildParallelPlan(recipes: RecipeInput[], burnerCount = 2): CookingPhase[] {
  if (recipes.length === 0) return [];

  // ── Step 1: Expand all steps with metadata ──
  interface RawStep {
    recipeId: number;
    recipeName: string;
    stepIndex: number;
    instruction: string;
    isMise: boolean;
    isPassive: boolean;
    isServe: boolean;
    isPreheat: boolean;
    isWaterOn: boolean;
    equipment: string | null;
    duration: number;
  }

  const allSteps: RawStep[] = [];
  for (const recipe of recipes) {
    for (let i = 0; i < recipe.steps.length; i++) {
      const step = recipe.steps[i];
      const cls = classifyStep(step);
      const eq = detectEquipment(step, recipe.equipment);
      allSteps.push({
        recipeId: recipe.id,
        recipeName: recipe.name,
        stepIndex: i,
        instruction: step,
        ...cls,
        equipment: eq,
        duration: estimateDuration(step, cls.isPassive),
      });
    }
  }

  // ── Step 2: Bucket steps into logical groups ──
  // Priority order for phase assignment:
  // 1. Preheat + boil water → Phase 1 (setup)
  // 2. Pure mise en place (chop/measure/marinate, no heat) → Phase 1
  // 3. Passive/long-cook starters (get things in the oven or pressure cooker) → Phase 2
  // 4. Active parallel cooking phases (stove steps, grouped by recipe pairs)
  // 5. Serve/rest/plate → Final phase

  // Maintain per-recipe step ordering (we can't reorder within a recipe)
  // Track which recipe's steps we've assigned so far
  const recipeStepCursor: Record<number, number> = {};
  recipes.forEach(r => { recipeStepCursor[r.id] = 0; });

  // Helper: get the next unassigned step for a recipe that matches a predicate
  const assigned = new Set<string>(); // "recipeId-stepIndex"
  const key = (s: RawStep) => `${s.recipeId}-${s.stepIndex}`;
  const isAssigned = (s: RawStep) => assigned.has(key(s));
  const assign = (s: RawStep) => assigned.add(key(s));

  // We also need to track equipment usage to prevent conflicts
  // (simplified: oven can only do one recipe at a time unless explicitly compatible)

  const phases: PhaseStep[][] = [];

  // Phase 0: Setup — preheat + boil water + all mise en place from all recipes
  const setupSteps: RawStep[] = [];

  // First: preheat and water-on steps (from any recipe, not yet assigned)
  allSteps.filter(s => (s.isPreheat || s.isWaterOn) && !isAssigned(s)).forEach(s => {
    setupSteps.push(s);
    assign(s);
  });

  // Then: all pure mise en place steps (no heat) from all recipes in order
  // We process each recipe's steps in order, collecting mise until we hit a non-mise step
  for (const recipe of recipes) {
    const recipeSteps = allSteps.filter(s => s.recipeId === recipe.id);
    for (const s of recipeSteps) {
      if (isAssigned(s)) continue;
      if (s.isMise) {
        setupSteps.push(s);
        assign(s);
      } else {
        break; // stop at first non-mise step — preserve ordering
      }
    }
  }

  if (setupSteps.length > 0) phases.push(setupSteps);

  // Remaining unassigned steps: build phases greedily
  // Strategy: for each iteration, collect the "next available" step from each recipe
  // that doesn't conflict with already-running equipment. Group them into a phase.
  // Repeat until all steps are assigned.

  const equipmentBusy: Record<string, number> = {}; // equipment → minutes it's busy
  let iteration = 0;

  while (assigned.size < allSteps.length && iteration < 50) {
    iteration++;
    const phaseSteps: RawStep[] = [];
    const equipmentUsedThisPhase = new Set<string>();
    const stoveSlotsUsed = { count: 0 };

    for (const recipe of recipes) {
      const remaining = allSteps.filter(s => s.recipeId === recipe.id && !isAssigned(s));
      if (remaining.length === 0) continue;

      // Get the next step for this recipe
      const next = remaining[0];

      // Check equipment availability
      const eq = next.equipment;
      let canAdd = true;

      if (eq === "stove") {
        // Can add stove step if we have burner slots
        if (stoveSlotsUsed.count >= burnerCount) {
          // Check if any of the current phase's stove steps is from a different recipe
          const stoveStepsInPhase = phaseSteps.filter(s => s.equipment === "stove");
          if (stoveStepsInPhase.length >= burnerCount) canAdd = false;
        }
        if (canAdd) stoveSlotsUsed.count++;
      } else if (eq && equipmentUsedThisPhase.has(eq)) {
        // Non-stove equipment is exclusive per phase (only one recipe can use oven at a time)
        canAdd = false;
      }

      if (canAdd) {
        phaseSteps.push(next);
        assign(next);
        if (eq && eq !== "stove") equipmentUsedThisPhase.add(eq);
      }
    }

    // If we couldn't add anything in this pass, force-add the next unassigned step
    // to prevent infinite loops
    if (phaseSteps.length === 0) {
      const firstUnassigned = allSteps.find(s => !isAssigned(s));
      if (firstUnassigned) {
        phaseSteps.push(firstUnassigned);
        assign(firstUnassigned);
      }
    }

    // Collect consecutive follow-up steps that naturally belong with this phase
    // (serve/plate steps that immediately follow the recipe's last active step)
    const serveSteps: RawStep[] = [];
    for (const recipe of recipes) {
      const remaining = allSteps.filter(s => s.recipeId === recipe.id && !isAssigned(s));
      if (remaining.length > 0 && remaining[0].isServe) {
        serveSteps.push(remaining[0]);
        assign(remaining[0]);
      }
    }

    if (phaseSteps.length > 0 || serveSteps.length > 0) {
      phases.push([...phaseSteps, ...serveSteps]);
    }
  }

  // Catch any remaining serve/finish steps
  const remaining = allSteps.filter(s => !isAssigned(s));
  if (remaining.length > 0) {
    phases.push(remaining);
    remaining.forEach(s => assign(s));
  }

  // ── Step 3: Merge small phases if total > 6 ──
  // If we ended up with too many tiny phases, merge adjacent ones
  const mergeThreshold = 6;
  let mergedPhases = phases;
  if (phases.length > mergeThreshold) {
    // Merge phases 1 and 2 if both small
    mergedPhases = [];
    let i = 0;
    while (i < phases.length) {
      if (i === 0 && phases.length > mergeThreshold) {
        // Keep phase 0 (setup) intact
        mergedPhases.push(phases[i]);
        i++;
      } else if (i < phases.length - 1 && phases[i].length <= 2 && phases[i + 1].length <= 2) {
        mergedPhases.push([...phases[i], ...phases[i + 1]]);
        i += 2;
      } else {
        mergedPhases.push(phases[i]);
        i++;
      }
    }
  }

  // ── Step 4: Convert to CookingPhase objects with smart names ──
  return mergedPhases
    .filter(steps => steps.length > 0)
    .map((steps, idx, arr) => {
      const recipeIds = new Set(steps.map(s => s.recipeId));
      const equipments = new Set(steps.map(s => s.equipment).filter(Boolean));
      const char: PhaseCharacter = {
        phaseIndex: idx,
        totalPhases: arr.length,
        hasPreheat: steps.some(s => s.isPreheat),
        hasChop: steps.some(s => s.isMise && !s.isPreheat && !s.isWaterOn),
        hasBoilWater: steps.some(s => s.isWaterOn),
        hasOven: equipments.has("oven"),
        hasActiveStove: steps.some(s => s.equipment === "stove" && !s.isPassive),
        hasPassive: steps.some(s => s.isPassive),
        hasServe: steps.some(s => s.isServe),
        hasMarinate: steps.some(s => /marinate|coat|season/i.test(s.instruction)),
        isMixedRecipes: recipeIds.size > 1,
        recipeNames: [...recipeIds].map(id => recipes.find(r => r.id === id)?.name ?? ""),
      };

      const { name, emoji, description } = generatePhaseName(char);
      const isParallel = recipeIds.size > 1 && steps.some(s => steps.some(
        t => t.recipeId !== s.recipeId && Math.abs(s.stepIndex - t.stepIndex) < 3
      ));

      const phaseSteps: PhaseStep[] = steps.map(s => ({
        recipeId: s.recipeId,
        recipeName: s.recipeName,
        stepIndex: s.stepIndex,
        instruction: s.instruction,
        equipment: s.equipment,
        isPassive: s.isPassive,
        isMise: s.isMise,
        durationMinutes: s.duration,
      }));

      const estimatedMinutes = Math.max(...steps.map(s => s.duration));

      return {
        phaseNumber: idx + 1,
        name,
        emoji,
        description,
        steps: phaseSteps,
        estimatedMinutes,
        isParallel,
      };
    });
}
