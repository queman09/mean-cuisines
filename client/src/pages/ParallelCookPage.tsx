/**
 * Parallel Process Cooking — full page feature
 * Phase 1: Recipe selection → Game Plan (master workflow overview)
 * Phase 2: Execution Mode (one step at a time, focus view)
 */

import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  ChefHat, Clock, Zap, PlayCircle, ChevronRight,
  CheckCircle2, ArrowLeft, Layers, Flame, Utensils,
  ShoppingCart, ExternalLink,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Ingredient { name: string; qty: number; unit: string; }
interface Contributor { id: number; name: string; photoUrl: string; role: string; }
interface Recipe {
  id: number;
  name: string;
  description: string;
  cookTimeMinutes: number;
  servings: number;
  equipment: string[];
  ingredients: Ingredient[];
  steps: string[];
  tags: string[];
  imageUrl?: string;
  contributor: Contributor | null;
}

interface MasterTask {
  startMinute: number;
  durationMinutes: number;
  recipeId: number;
  recipeName: string;
  stepIndex: number;
  instruction: string;
  equipment: string | null;
  type: "passive" | "active" | "consolidated";
  consolidatedFrom?: string[];
}

interface ParallelPlan {
  plan: MasterTask[];
  totalMinutes: number;
  recipeCount: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const AMAZON_AFFILIATE_TAG = "meancuisines-20";

const RECIPE_COLORS = [
  { bg: "bg-orange-500", light: "bg-orange-100 dark:bg-orange-900/30", text: "text-orange-700 dark:text-orange-300", border: "border-orange-200 dark:border-orange-800", dot: "bg-orange-500" },
  { bg: "bg-blue-500",   light: "bg-blue-100 dark:bg-blue-900/30",   text: "text-blue-700 dark:text-blue-300",   border: "border-blue-200 dark:border-blue-800",   dot: "bg-blue-500" },
  { bg: "bg-emerald-500",light: "bg-emerald-100 dark:bg-emerald-900/30",text: "text-emerald-700 dark:text-emerald-300",border: "border-emerald-200 dark:border-emerald-800",dot: "bg-emerald-500" },
  { bg: "bg-purple-500", light: "bg-purple-100 dark:bg-purple-900/30", text: "text-purple-700 dark:text-purple-300", border: "border-purple-200 dark:border-purple-800", dot: "bg-purple-500" },
  { bg: "bg-rose-500",   light: "bg-rose-100 dark:bg-rose-900/30",   text: "text-rose-700 dark:text-rose-300",   border: "border-rose-200 dark:border-rose-800",   dot: "bg-rose-500" },
];

const TYPE_CONFIG = {
  passive:      { icon: "🔥", label: "Hands-off",  badgeClass: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300" },
  active:       { icon: "✋", label: "Active prep", badgeClass: "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300" },
  consolidated: { icon: "⚡", label: "Shared step", badgeClass: "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300" },
};

function fmtMinutes(mins: number) {
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

function getAmazonUrl(ingredient: string) {
  return `https://www.amazon.com/s?k=${encodeURIComponent(ingredient.trim())}&tag=${AMAZON_AFFILIATE_TAG}`;
}

// ─── Phase: Recipe Selection ──────────────────────────────────────────────────

function RecipeSelectionPhase({
  recipes,
  selected,
  onToggle,
  onBuild,
  isBuilding,
}: {
  recipes: Recipe[];
  selected: number[];
  onToggle: (id: number) => void;
  onBuild: () => void;
  isBuilding: boolean;
}) {
  const canBuild = selected.length >= 2 && selected.length <= 5;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8 text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 mb-4">
          <Zap size={28} className="text-primary" />
        </div>
        <h1 className="text-2xl font-display font-bold mb-2">Parallel Process Cooking</h1>
        <p className="text-muted-foreground max-w-lg mx-auto text-sm leading-relaxed">
          Select 2–5 recipes and we'll build a single, optimized workflow — starting long passive tasks first
          and filling idle time with active prep for other dishes.
        </p>
        <div className="flex items-center justify-center gap-4 mt-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">🔥 <span>Passive = hands-off (bake, simmer)</span></span>
          <span className="flex items-center gap-1">✋ <span>Active = you're needed</span></span>
          <span className="flex items-center gap-1">⚡ <span>Shared = done once for all</span></span>
        </div>
      </div>

      {/* Selection counter */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm font-medium">
          {selected.length === 0
            ? "Pick your recipes below"
            : `${selected.length} of 5 selected${selected.length >= 2 ? " — ready to go!" : " — need at least 2"}`}
        </p>
        <Button
          onClick={onBuild}
          disabled={!canBuild || isBuilding}
          className="gap-2 bg-primary text-primary-foreground"
          data-testid="button-build-plan"
        >
          <PlayCircle size={16} />
          {isBuilding ? "Building plan…" : "Build Game Plan"}
        </Button>
      </div>

      {/* Selection progress bar */}
      <div className="mb-6">
        <Progress value={(selected.length / 5) * 100} className="h-1.5" />
      </div>

      {/* Recipe grid */}
      <div className="grid gap-3 sm:grid-cols-2">
        {recipes.map((recipe, idx) => {
          const isSelected = selected.includes(recipe.id);
          const colorIdx = selected.indexOf(recipe.id);
          const color = isSelected && colorIdx >= 0 ? RECIPE_COLORS[colorIdx % RECIPE_COLORS.length] : null;
          const isDisabled = !isSelected && selected.length >= 5;

          return (
            <button
              key={recipe.id}
              onClick={() => !isDisabled && onToggle(recipe.id)}
              disabled={isDisabled}
              data-testid={`recipe-select-${recipe.id}`}
              className={[
                "relative text-left rounded-xl border-2 p-4 transition-all duration-150",
                isDisabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer hover:shadow-md",
                isSelected
                  ? `${color?.border ?? "border-primary"} ${color?.light ?? "bg-primary/5"} shadow-sm`
                  : "border-border bg-card hover:border-muted-foreground/30",
              ].join(" ")}
            >
              {/* Color indicator when selected */}
              {isSelected && color && (
                <span className={`absolute top-3 right-3 w-2.5 h-2.5 rounded-full ${color.dot}`} />
              )}

              <div className="flex items-start gap-3">
                {recipe.imageUrl && (
                  <img
                    src={recipe.imageUrl}
                    alt={recipe.name}
                    className="w-14 h-14 rounded-lg object-cover flex-shrink-0"
                  />
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-sm leading-tight">{recipe.name}</h3>
                    {isSelected && (
                      <Badge variant="secondary" className={`text-[10px] px-1.5 py-0 ${color?.text ?? ""}`}>
                        #{colorIdx + 1}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                    <Clock size={11} />
                    <span>{fmtMinutes(recipe.cookTimeMinutes)}</span>
                    <span>·</span>
                    <span>{recipe.equipment.join(", ") || "No heat"}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                    {recipe.description}
                  </p>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {recipes.length === 0 && (
        <div className="text-center py-16 text-muted-foreground text-sm">
          No recipes found. Add some recipes first.
        </div>
      )}
    </div>
  );
}

// ─── Phase: Game Plan (Overview) ─────────────────────────────────────────────

function GamePlanPhase({
  plan,
  totalMinutes,
  selectedRecipes,
  onStart,
  onBack,
}: {
  plan: MasterTask[];
  totalMinutes: number;
  selectedRecipes: Recipe[];
  onStart: () => void;
  onBack: () => void;
}) {
  const recipeColorMap = useMemo(() => {
    const map: Record<number, typeof RECIPE_COLORS[0]> = {};
    selectedRecipes.forEach((r, i) => {
      map[r.id] = RECIPE_COLORS[i % RECIPE_COLORS.length];
    });
    return map;
  }, [selectedRecipes]);

  // Count time saved vs cooking sequentially
  const sequentialTotal = selectedRecipes.reduce((s, r) => s + r.cookTimeMinutes, 0);
  const timeSaved = Math.max(0, sequentialTotal - totalMinutes);

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onBack} className="p-2 rounded-lg hover:bg-accent transition-colors text-muted-foreground" aria-label="Back">
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-xl font-display font-bold">Your Game Plan</h1>
          <p className="text-xs text-muted-foreground">Review the optimized workflow before you start cooking</p>
        </div>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="rounded-xl bg-card border border-border p-4 text-center">
          <div className="text-2xl font-bold font-display">{selectedRecipes.length}</div>
          <div className="text-xs text-muted-foreground mt-0.5">Recipes</div>
        </div>
        <div className="rounded-xl bg-card border border-border p-4 text-center">
          <div className="text-2xl font-bold font-display">{fmtMinutes(totalMinutes)}</div>
          <div className="text-xs text-muted-foreground mt-0.5">Total time</div>
        </div>
        <div className="rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 p-4 text-center">
          <div className="text-2xl font-bold font-display text-emerald-600 dark:text-emerald-400">
            {timeSaved > 0 ? `−${fmtMinutes(timeSaved)}` : "Optimized"}
          </div>
          <div className="text-xs text-emerald-600/70 dark:text-emerald-400/70 mt-0.5">
            {timeSaved > 0 ? "vs. cooking in sequence" : "parallel workflow"}
          </div>
        </div>
      </div>

      {/* Recipe legend */}
      <div className="flex flex-wrap gap-2 mb-5">
        {selectedRecipes.map(r => {
          const color = recipeColorMap[r.id];
          return (
            <span key={r.id} className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border ${color.light} ${color.text} ${color.border}`}>
              <span className={`w-2 h-2 rounded-full ${color.dot}`} />
              {r.name}
            </span>
          );
        })}
        <span className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 border border-violet-200 dark:border-violet-800">
          <span className="w-2 h-2 rounded-full bg-violet-500" />
          Shared steps
        </span>
      </div>

      {/* Master task list */}
      <div className="space-y-2 mb-8">
        {plan.map((task, i) => {
          const color = task.type === "consolidated"
            ? null
            : recipeColorMap[task.recipeId];
          const cfg = TYPE_CONFIG[task.type];

          return (
            <div
              key={i}
              className={[
                "flex gap-3 rounded-xl border p-3.5 transition-colors",
                task.type === "consolidated"
                  ? "bg-violet-50 dark:bg-violet-900/20 border-violet-200 dark:border-violet-800"
                  : `${color?.light ?? "bg-card"} ${color?.border ?? "border-border"}`,
              ].join(" ")}
              data-testid={`plan-task-${i}`}
            >
              {/* Step number */}
              <div className="flex-shrink-0 flex items-center justify-center w-7 h-7 rounded-full bg-background border border-border text-xs font-bold text-muted-foreground mt-0.5">
                {i + 1}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <p className="text-sm font-medium leading-snug">{task.instruction}</p>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md ${cfg.badgeClass}`}>
                      {cfg.icon} {cfg.label}
                    </span>
                    <span className="text-[10px] text-muted-foreground font-mono">
                      {fmtMinutes(task.durationMinutes)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 mt-1">
                  {task.type !== "consolidated" && (
                    <span className={`text-[10px] font-semibold ${color?.text ?? "text-muted-foreground"}`}>
                      {task.recipeName}
                    </span>
                  )}
                  {task.equipment && (
                    <span className="text-[10px] text-muted-foreground">
                      · {task.equipment}
                    </span>
                  )}
                  <span className="text-[10px] text-muted-foreground ml-auto">
                    @{task.startMinute}min
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Shopping list teaser — consolidate all ingredients */}
      <ShoppingListSummary recipes={selectedRecipes} />

      {/* Start Cooking CTA */}
      <div className="sticky bottom-4 mt-6">
        <Button
          size="lg"
          onClick={onStart}
          className="w-full gap-3 bg-primary text-primary-foreground text-base font-bold py-6 rounded-2xl shadow-lg hover:shadow-xl transition-shadow"
          data-testid="button-start-cooking"
        >
          <PlayCircle size={22} />
          Start Cooking — {plan.length} Steps
        </Button>
      </div>
    </div>
  );
}

// ─── Shopping List Summary ─────────────────────────────────────────────────────

function ShoppingListSummary({ recipes }: { recipes: Recipe[] }) {
  const [open, setOpen] = useState(false);
  const allIngredients = recipes.flatMap(r =>
    r.ingredients.map(ing => ({ ...ing, recipeName: r.name }))
  );

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden mb-2">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-accent/50 transition-colors"
        data-testid="button-shopping-list"
      >
        <div className="flex items-center gap-2 text-sm font-semibold">
          <ShoppingCart size={15} className="text-primary" />
          Full Shopping List ({allIngredients.length} items)
        </div>
        <ChevronRight size={14} className={`text-muted-foreground transition-transform ${open ? "rotate-90" : ""}`} />
      </button>
      {open && (
        <div className="border-t border-border divide-y divide-border">
          {allIngredients.map((ing, i) => (
            <div key={i} className="flex items-center justify-between px-4 py-2.5 hover:bg-accent/30 transition-colors">
              <div>
                <span className="text-sm">{ing.qty > 0 ? `${ing.qty} ${ing.unit} ` : ""}{ing.name}</span>
                <span className="text-xs text-muted-foreground ml-2">({ing.recipeName})</span>
              </div>
              <a
                href={getAmazonUrl(ing.name)}
                target="_blank"
                rel="noopener noreferrer"
                onClick={e => e.stopPropagation()}
                className="flex items-center gap-1 text-[10px] text-primary hover:underline font-medium flex-shrink-0 ml-3"
                aria-label={`Buy ${ing.name} on Amazon`}
              >
                <ShoppingCart size={10} />
                Amazon
                <ExternalLink size={9} />
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Phase: Execution Mode ───────────────────────────────────────────────────

function ExecutionPhase({
  plan,
  selectedRecipes,
  onFinish,
}: {
  plan: MasterTask[];
  selectedRecipes: Recipe[];
  onFinish: () => void;
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const total = plan.length;
  const current = plan[currentIndex];
  const next = plan[currentIndex + 1] ?? null;
  const isLast = currentIndex === total - 1;
  const progress = Math.round(((currentIndex) / total) * 100);

  const recipeColorMap = useMemo(() => {
    const map: Record<number, typeof RECIPE_COLORS[0]> = {};
    selectedRecipes.forEach((r, i) => {
      map[r.id] = RECIPE_COLORS[i % RECIPE_COLORS.length];
    });
    return map;
  }, [selectedRecipes]);

  const color = current.type === "consolidated"
    ? RECIPE_COLORS[0]
    : recipeColorMap[current.recipeId] ?? RECIPE_COLORS[0];

  const cfg = TYPE_CONFIG[current.type];

  return (
    <div className="min-h-screen flex flex-col bg-background" data-testid="execution-mode">
      {/* Top progress bar */}
      <div className="h-1 bg-muted">
        <div
          className="h-full bg-primary transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <ChefHat size={18} className="text-primary" />
          <span className="font-display font-bold text-sm">Mean Cuisines</span>
        </div>
        <span className="text-xs text-muted-foreground font-mono">
          Step {currentIndex + 1} of {total}
        </span>
      </div>

      {/* Main content — vertically centered */}
      <div className="flex-1 flex flex-col justify-center px-4 py-8 max-w-2xl mx-auto w-full">

        {/* Step type badge */}
        <div className="flex items-center justify-center gap-2 mb-6">
          <span className={`text-sm font-semibold px-3 py-1 rounded-full ${cfg.badgeClass}`}>
            {cfg.icon} {cfg.label}
          </span>
          {current.type !== "consolidated" && (
            <span className={`text-sm font-semibold ${color.text}`}>
              {current.recipeName}
            </span>
          )}
        </div>

        {/* ── ACTIVE STEP ── */}
        <div
          className={`rounded-3xl border-2 ${color.border} ${color.light} p-8 mb-6 text-center`}
          data-testid="active-step"
        >
          {/* Duration */}
          <div className={`flex items-center justify-center gap-1.5 text-sm font-medium mb-4 ${color.text}`}>
            <Clock size={15} />
            <span>{fmtMinutes(current.durationMinutes)}</span>
            {current.equipment && (
              <>
                <span className="opacity-50">·</span>
                <span>{current.equipment}</span>
              </>
            )}
          </div>

          {/* The instruction — large, legible */}
          <p className="text-2xl sm:text-3xl font-display font-semibold leading-snug text-foreground">
            {current.instruction}
          </p>
        </div>

        {/* ── NEXT UP PREVIEW ── */}
        {next && (
          <div className="rounded-2xl border border-dashed border-border bg-muted/30 px-5 py-4 mb-8" data-testid="next-step-preview">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/60 mb-1.5">
              Next up
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {next.instruction}
            </p>
            <div className="flex items-center gap-2 mt-1.5">
              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md ${TYPE_CONFIG[next.type].badgeClass}`}>
                {TYPE_CONFIG[next.type].icon} {next.recipeName !== "All Recipes" ? next.recipeName : "Shared"}
              </span>
              <span className="text-[10px] text-muted-foreground">
                {fmtMinutes(next.durationMinutes)}
              </span>
            </div>
          </div>
        )}

        {/* Step dots */}
        <div className="flex items-center justify-center gap-1 mb-8 flex-wrap">
          {plan.map((_, i) => (
            <div
              key={i}
              className={[
                "rounded-full transition-all duration-300",
                i < currentIndex
                  ? "w-2 h-2 bg-primary/40"
                  : i === currentIndex
                  ? "w-3 h-3 bg-primary"
                  : "w-2 h-2 bg-muted-foreground/20",
              ].join(" ")}
            />
          ))}
        </div>

        {/* Next / Finish button */}
        {isLast ? (
          <Button
            size="lg"
            onClick={onFinish}
            className="w-full gap-3 bg-emerald-600 hover:bg-emerald-700 text-white text-base font-bold py-6 rounded-2xl"
            data-testid="button-finish"
          >
            <CheckCircle2 size={22} />
            All Done — Enjoy Your Meal!
          </Button>
        ) : (
          <Button
            size="lg"
            onClick={() => setCurrentIndex(i => i + 1)}
            className="w-full gap-3 bg-primary text-primary-foreground text-base font-bold py-6 rounded-2xl"
            data-testid="button-next-step"
          >
            Next Step
            <ChevronRight size={22} />
          </Button>
        )}
      </div>
    </div>
  );
}

// ─── Completion Screen ─────────────────────────────────────────────────────────

function CompletionScreen({ recipes, onReset }: { recipes: Recipe[]; onReset: () => void }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center px-6">
      <div className="text-6xl mb-6">🍽️</div>
      <h1 className="text-3xl font-display font-bold mb-3">Meal Prep Complete!</h1>
      <p className="text-muted-foreground mb-2 max-w-sm">
        You just cooked {recipes.length} recipes in parallel. Time to eat.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-2 mb-8 mt-4">
        {recipes.map(r => (
          <Badge key={r.id} variant="secondary" className="text-sm px-3 py-1">
            ✓ {r.name}
          </Badge>
        ))}
      </div>
      <Button onClick={onReset} size="lg" className="gap-2 bg-primary text-primary-foreground" data-testid="button-cook-again">
        <Layers size={18} />
        Cook Another Batch
      </Button>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

type Phase = "select" | "gameplan" | "execution" | "done";

export default function ParallelCookPage() {
  const { toast } = useToast();
  const [phase, setPhase] = useState<Phase>("select");
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [parallelPlan, setParallelPlan] = useState<ParallelPlan | null>(null);

  const { data: recipes = [], isLoading } = useQuery<Recipe[]>({ queryKey: ["/api/recipes"] });

  const buildMutation = useMutation({
    mutationFn: async (recipeIds: number[]) => {
      const res = await apiRequest("POST", "/api/schedule/parallel", { recipeIds });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Failed to build plan");
      }
      return res.json() as Promise<ParallelPlan>;
    },
    onSuccess: (data) => {
      setParallelPlan(data);
      setPhase("gameplan");
    },
    onError: (err: Error) => {
      toast({ title: err.message, variant: "destructive" });
    },
  });

  const selectedRecipes = recipes.filter(r => selectedIds.includes(r.id));

  const handleToggle = (id: number) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleReset = () => {
    setPhase("select");
    setSelectedIds([]);
    setParallelPlan(null);
  };

  // Execution mode takes over the full screen
  if (phase === "execution" && parallelPlan) {
    return (
      <ExecutionPhase
        plan={parallelPlan.plan}
        selectedRecipes={selectedRecipes}
        onFinish={() => setPhase("done")}
      />
    );
  }

  if (phase === "done") {
    return <CompletionScreen recipes={selectedRecipes} onReset={handleReset} />;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Minimal nav header */}
      <header className="sticky top-0 z-10 bg-background/90 backdrop-blur border-b border-border px-4 py-3 flex items-center gap-3">
        <div className="flex items-center gap-2">
          <ChefHat size={18} className="text-primary" />
          <span className="font-display font-bold text-sm">Mean Cuisines</span>
        </div>
        <div className="flex items-center gap-1 ml-2 text-muted-foreground">
          <ChevronRight size={14} />
          <span className="text-sm font-medium">Parallel Cooking</span>
        </div>
        {phase === "gameplan" && (
          <button
            onClick={handleReset}
            className="ml-auto text-xs text-muted-foreground hover:text-foreground transition-colors"
            data-testid="button-reset"
          >
            Start over
          </button>
        )}
      </header>

      {/* Page phases */}
      {(phase === "select" || phase === "gameplan") && (
        <>
          {phase === "select" && (
            <RecipeSelectionPhase
              recipes={recipes}
              selected={selectedIds}
              onToggle={handleToggle}
              onBuild={() => buildMutation.mutate(selectedIds)}
              isBuilding={buildMutation.isPending}
            />
          )}
          {phase === "gameplan" && parallelPlan && (
            <GamePlanPhase
              plan={parallelPlan.plan}
              totalMinutes={parallelPlan.totalMinutes}
              selectedRecipes={selectedRecipes}
              onStart={() => setPhase("execution")}
              onBack={() => setPhase("select")}
            />
          )}
        </>
      )}
    </div>
  );
}
