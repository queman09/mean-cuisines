/**
 * Mean Cuisines — AllRecipes-style redesign
 * Wizard flow: Equipment → Pantry → Recipes → Parallel Cook → Shopping List
 */

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  ChefHat, Clock, Plus, Search, ShoppingCart, ExternalLink,
  CheckCircle2, ChevronRight, ChevronLeft, Star,
  Flame, Zap, Play, SkipForward, UtensilsCrossed,
  Moon, Sun, Users, Link as LinkIcon, X, Timer,
  ShoppingBag, Package, Minus,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type EquipmentKey = "oven" | "stove" | "airFryer" | "counter" | "instantPot" | "microwave";

interface Ingredient { name: string; qty: number; unit: string; }
interface Contributor { id: number; name: string; photoUrl: string; role: string; }
interface Recipe {
  id: number;
  name: string;
  description: string;
  cookTimeMinutes: number;
  servings: number;
  equipment: EquipmentKey[];
  ingredients: Ingredient[];
  steps: string[];
  tags: string[];
  imageUrl?: string;
  sourceUrl?: string;
  contributor: Contributor | null;
  createdAt: string;
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

const EQUIPMENT_INFO: Record<EquipmentKey, { label: string; icon: string; searchQuery: string; description: string }> = {
  oven:       { label: "Oven",             icon: "🔥", searchQuery: "countertop+toaster+oven",       description: "Baking, roasting, broiling" },
  stove:      { label: "Stove / Cooktop",  icon: "🍳", searchQuery: "electric+induction+cooktop",    description: "Sautéing, boiling, frying" },
  airFryer:   { label: "Air Fryer",        icon: "💨", searchQuery: "air+fryer",                     description: "Crispy results, no oil needed" },
  counter:    { label: "No Heat / Counter",icon: "🧴", searchQuery: "food+processor+blender",        description: "Mixing, chopping, assembling" },
  instantPot: { label: "Instant Pot",      icon: "⚡", searchQuery: "instant+pot+pressure+cooker",   description: "Pressure cooking & slow cooking" },
  microwave:  { label: "Microwave",        icon: "📡", searchQuery: "countertop+microwave",           description: "Quick heating & cooking" },
};

const RECIPE_PALETTE = [
  { ring: "ring-orange-400", dot: "bg-orange-500", light: "bg-orange-50 dark:bg-orange-950/40", text: "text-orange-600 dark:text-orange-400", border: "border-orange-200 dark:border-orange-800", badge: "bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300" },
  { ring: "ring-blue-400",   dot: "bg-blue-500",   light: "bg-blue-50 dark:bg-blue-950/40",     text: "text-blue-600 dark:text-blue-400",   border: "border-blue-200 dark:border-blue-800",   badge: "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300" },
  { ring: "ring-green-400",  dot: "bg-green-500",  light: "bg-green-50 dark:bg-green-950/40",   text: "text-green-600 dark:text-green-400",  border: "border-green-200 dark:border-green-800",  badge: "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300" },
  { ring: "ring-purple-400", dot: "bg-purple-500", light: "bg-purple-50 dark:bg-purple-950/40", text: "text-purple-600 dark:text-purple-400", border: "border-purple-200 dark:border-purple-800", badge: "bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300" },
  { ring: "ring-rose-400",   dot: "bg-rose-500",   light: "bg-rose-50 dark:bg-rose-950/40",     text: "text-rose-600 dark:text-rose-400",   border: "border-rose-200 dark:border-rose-800",   badge: "bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300" },
];

const STEP_TYPE = {
  passive:      { icon: "🔥", label: "Hands-off",  cls: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300" },
  active:       { icon: "✋", label: "Active prep", cls: "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300" },
  consolidated: { icon: "⚡", label: "Shared",      cls: "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300" },
};

function fmtMins(m: number) {
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60), r = m % 60;
  return r === 0 ? `${h}h` : `${h}h ${r}m`;
}
function fmtElapsed(s: number) {
  const m = Math.floor(s / 60), sec = s % 60;
  return `${m}:${sec.toString().padStart(2, "0")}`;
}
function getAmazonUrl(q: string) {
  return `https://www.amazon.com/s?k=${encodeURIComponent(q.trim())}&tag=${AMAZON_AFFILIATE_TAG}`;
}
function pantryMatch(recipe: Recipe, pantry: string[]): number {
  if (recipe.ingredients.length === 0) return 0;
  const lowerPantry = pantry.map(p => p.toLowerCase());
  const matched = recipe.ingredients.filter(ing =>
    lowerPantry.some(p => ing.name.toLowerCase().includes(p) || p.includes(ing.name.toLowerCase().split(" ")[0]))
  );
  return Math.round((matched.length / recipe.ingredients.length) * 100);
}

// ─── Step Indicator ────────────────────────────────────────────────────────────

function StepBar({ step, total }: { step: number; total: number }) {
  const labels = ["Equipment", "Pantry", "Recipes", "Cook", "Shopping"];
  return (
    <div className="flex items-center justify-center gap-0 w-full max-w-lg mx-auto px-4 py-3">
      {labels.slice(0, total).map((label, i) => {
        const idx = i + 1;
        const active = idx === step;
        const done = idx < step;
        return (
          <div key={idx} className="flex items-center gap-0 flex-1 min-w-0">
            <div className="flex flex-col items-center flex-shrink-0">
              <div className={[
                "w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all",
                done ? "bg-primary text-primary-foreground" :
                active ? "bg-primary text-primary-foreground ring-4 ring-primary/20" :
                "bg-muted text-muted-foreground"
              ].join(" ")}>
                {done ? <CheckCircle2 size={14} /> : idx}
              </div>
              <span className={`text-[10px] mt-1 font-medium whitespace-nowrap hidden sm:block ${active ? "text-primary" : "text-muted-foreground"}`}>
                {label}
              </span>
            </div>
            {i < total - 1 && (
              <div className={`h-0.5 flex-1 mx-1 mb-4 transition-all ${done ? "bg-primary" : "bg-border"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── STEP 1: Equipment ─────────────────────────────────────────────────────────

function StepEquipment({
  equipment, onToggle, onNext,
}: {
  equipment: Record<EquipmentKey, boolean>;
  onToggle: (k: EquipmentKey) => void;
  onNext: () => void;
}) {
  const hasAny = Object.values(equipment).some(Boolean);
  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-display font-bold mb-1">What's in your kitchen?</h2>
        <p className="text-muted-foreground text-sm">Select the equipment you have available. We'll only show recipes you can actually make.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
        {(Object.entries(EQUIPMENT_INFO) as [EquipmentKey, typeof EQUIPMENT_INFO[EquipmentKey]][]).map(([key, info]) => {
          const on = equipment[key];
          return (
            <div
              key={key}
              className={[
                "relative rounded-xl border-2 p-4 cursor-pointer transition-all select-none",
                on
                  ? "border-primary bg-primary/5 shadow-sm"
                  : "border-border bg-card hover:border-muted-foreground/40 hover:shadow-sm",
              ].join(" ")}
              onClick={() => onToggle(key)}
              data-testid={`equipment-${key}`}
            >
              {on && (
                <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                  <CheckCircle2 size={12} className="text-primary-foreground" />
                </div>
              )}
              <div className="flex items-center gap-3">
                <span className="text-2xl">{info.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm">{info.label}</p>
                  <p className="text-xs text-muted-foreground">{info.description}</p>
                </div>
              </div>
              {!on && (
                <a
                  href={getAmazonUrl(info.searchQuery)}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={e => e.stopPropagation()}
                  className="flex items-center gap-1 mt-2 text-[11px] text-primary font-medium hover:underline w-fit"
                >
                  <ShoppingCart size={10} /> Buy on Amazon <ExternalLink size={9} />
                </a>
              )}
            </div>
          );
        })}
      </div>

      <Button
        size="lg"
        className="w-full gap-2 bg-primary text-primary-foreground font-bold"
        disabled={!hasAny}
        onClick={onNext}
        data-testid="btn-equipment-next"
      >
        Continue with {Object.values(equipment).filter(Boolean).length} appliance{Object.values(equipment).filter(Boolean).length !== 1 ? "s" : ""}
        <ChevronRight size={18} />
      </Button>
    </div>
  );
}

// ─── STEP 2: Pantry (Ingredients I Have) ─────────────────────────────────────

// Flat list of common ingredients to search through
const ALL_INGREDIENTS = [
  "chicken breast","chicken thighs","ground beef","ground turkey","salmon","shrimp","pork chops",
  "bacon","sausage","eggs","butter","olive oil","vegetable oil","milk","heavy cream","sour cream",
  "cheddar cheese","parmesan","mozzarella","cream cheese","garlic","onion","red onion","green onion",
  "tomatoes","bell pepper","zucchini","mushrooms","spinach","broccoli","carrots","celery","potatoes",
  "sweet potato","corn","peas","green beans","asparagus","lemon","lime","ginger","jalapeño",
  "flour","sugar","brown sugar","baking soda","baking powder","salt","black pepper","cumin","paprika",
  "chili powder","cayenne","oregano","thyme","rosemary","basil","bay leaves","cinnamon","turmeric",
  "soy sauce","Worcestershire sauce","hot sauce","honey","maple syrup","vinegar","tomato paste",
  "chicken broth","beef broth","vegetable broth","coconut milk","canned tomatoes","kidney beans",
  "black beans","rice","pasta","bread crumbs","tortillas","panko","arborio rice","lentils",
];

function StepPantry({
  pantry, onPantryChange, onNext, onBack,
}: {
  pantry: string[];
  onPantryChange: (items: string[]) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const [query, setQuery] = useState("");
  const suggestions = useMemo(() => {
    if (query.length < 2) return [];
    const q = query.toLowerCase();
    return ALL_INGREDIENTS.filter(i => i.includes(q) && !pantry.includes(i)).slice(0, 8);
  }, [query, pantry]);

  const toggle = (item: string) => {
    onPantryChange(
      pantry.includes(item) ? pantry.filter(p => p !== item) : [...pantry, item]
    );
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-display font-bold mb-1">What's in your pantry?</h2>
        <p className="text-muted-foreground text-sm">Tell us what you already have. We'll score each recipe and remove owned items from your shopping list.</p>
      </div>

      {/* Search box */}
      <div className="relative mb-4">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search ingredients (e.g. chicken, garlic, butter…)"
          value={query}
          onChange={e => setQuery(e.target.value)}
          className="pl-9"
          data-testid="pantry-search"
        />
        {/* Dropdown suggestions */}
        {suggestions.length > 0 && (
          <div className="absolute z-20 top-full left-0 right-0 mt-1 rounded-lg border border-border bg-popover shadow-lg overflow-hidden">
            {suggestions.map(s => (
              <button
                key={s}
                className="w-full text-left px-4 py-2.5 text-sm hover:bg-accent transition-colors capitalize"
                onClick={() => { toggle(s); setQuery(""); }}
              >
                + {s}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Selected pantry items */}
      {pantry.length > 0 && (
        <div className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
            Your pantry ({pantry.length} items)
          </p>
          <div className="flex flex-wrap gap-2">
            {pantry.map(item => (
              <button
                key={item}
                onClick={() => toggle(item)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-medium hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/30 dark:hover:text-red-400 transition-colors"
                data-testid={`pantry-item-${item}`}
              >
                <CheckCircle2 size={11} />
                <span className="capitalize">{item}</span>
                <X size={11} className="ml-0.5" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Common quick-adds */}
      {pantry.length < 5 && (
        <div className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Quick add commons</p>
          <div className="flex flex-wrap gap-2">
            {["eggs","butter","garlic","onion","olive oil","salt","black pepper","chicken broth","flour","sugar"].filter(i => !pantry.includes(i)).map(item => (
              <button
                key={item}
                onClick={() => toggle(item)}
                className="px-3 py-1.5 rounded-full border border-dashed border-border bg-card text-xs text-muted-foreground hover:border-primary hover:text-primary transition-colors capitalize"
              >
                + {item}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-3">
        <Button variant="outline" onClick={onBack} className="gap-1"><ChevronLeft size={16} /> Back</Button>
        <Button size="lg" className="flex-1 gap-2 bg-primary text-primary-foreground font-bold" onClick={onNext} data-testid="btn-pantry-next">
          {pantry.length === 0 ? "Skip — I'll buy everything" : `Continue with ${pantry.length} pantry items`}
          <ChevronRight size={18} />
        </Button>
      </div>
    </div>
  );
}

// ─── STEP 3: Recipe Selection ─────────────────────────────────────────────────

function MatchBar({ pct }: { pct: number }) {
  const color = pct >= 75 ? "bg-green-500" : pct >= 40 ? "bg-amber-500" : "bg-rose-400";
  return (
    <div className="flex items-center gap-2 mt-1.5">
      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className={`text-[11px] font-bold tabular-nums ${pct >= 75 ? "text-green-600 dark:text-green-400" : pct >= 40 ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground"}`}>
        {pct}%
      </span>
    </div>
  );
}

function StepRecipes({
  recipes, equipment, pantry, selectedIds, servings,
  onToggle, onServing, onNext, onBack, isLoading,
  onShowAdd, contributors,
}: {
  recipes: Recipe[];
  equipment: Record<EquipmentKey, boolean>;
  pantry: string[];
  selectedIds: number[];
  servings: Record<number, number>;
  onToggle: (id: number) => void;
  onServing: (id: number, s: number) => void;
  onNext: () => void;
  onBack: () => void;
  isLoading: boolean;
  onShowAdd: () => void;
  contributors: Contributor[];
}) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "compatible" | "pantry">("compatible");

  const compatible = useMemo(() =>
    recipes.filter(r => r.equipment.length === 0 || r.equipment.every(eq => equipment[eq])),
    [recipes, equipment]
  );

  const scored = useMemo(() =>
    compatible.map(r => ({ ...r, match: pantryMatch(r, pantry) }))
      .sort((a, b) => b.match - a.match),
    [compatible, pantry]
  );

  const displayed = useMemo(() => {
    let list = scored;
    if (filter === "compatible") list = scored;
    if (filter === "pantry") list = scored.filter(r => r.match > 0);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(r => r.name.toLowerCase().includes(q) || r.tags.some(t => t.toLowerCase().includes(q)));
    }
    return list;
  }, [scored, filter, search]);

  const canCook = selectedIds.length >= 2;

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <div className="flex items-start justify-between gap-3 mb-5 flex-wrap">
        <div>
          <h2 className="text-2xl font-display font-bold">Pick your recipes</h2>
          <p className="text-muted-foreground text-sm mt-0.5">
            {compatible.length} compatible · select 2–5 to parallel cook
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={onShowAdd} className="gap-1.5 text-xs shrink-0">
          <Plus size={13} /> Add Recipe
        </Button>
      </div>

      {/* Search + filter */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-[180px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search recipes…" className="pl-8 h-9 text-sm" />
        </div>
        <div className="flex gap-1">
          {(["compatible","pantry","all"] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${filter === f ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}
            >{f === "compatible" ? "✓ Compatible" : f === "pantry" ? "🥬 Pantry match" : "All"}</button>
          ))}
        </div>
      </div>

      {/* Selected strip */}
      {selectedIds.length > 0 && (
        <div className="flex items-center gap-2 mb-4 p-3 rounded-xl bg-primary/5 border border-primary/20 flex-wrap">
          <Zap size={14} className="text-primary shrink-0" />
          <span className="text-xs font-medium text-primary">{selectedIds.length} selected</span>
          {selectedIds.map((id, idx) => {
            const r = recipes.find(r => r.id === id);
            if (!r) return null;
            const pal = RECIPE_PALETTE[idx % RECIPE_PALETTE.length];
            return (
              <span key={id} className={`flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-full ${pal.badge}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${pal.dot}`} />
                {r.name}
                <button onClick={() => onToggle(id)} className="ml-0.5 hover:opacity-70"><X size={10} /></button>
              </span>
            );
          })}
        </div>
      )}

      {/* Recipe grid */}
      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="rounded-xl bg-muted animate-pulse h-64" />
          ))}
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {displayed.map(recipe => {
            const selIdx = selectedIds.indexOf(recipe.id);
            const isSelected = selIdx !== -1;
            const pal = isSelected ? RECIPE_PALETTE[selIdx % RECIPE_PALETTE.length] : null;
            const isDisabled = !isSelected && selectedIds.length >= 5;
            const sv = servings[recipe.id] ?? recipe.servings;

            return (
              <div
                key={recipe.id}
                className={[
                  "rounded-xl border-2 overflow-hidden bg-card transition-all duration-150 flex flex-col",
                  isDisabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:shadow-md",
                  isSelected ? `${pal!.border} shadow-sm ring-2 ${pal!.ring}` : "border-border",
                ].join(" ")}
                onClick={() => !isDisabled && onToggle(recipe.id)}
                data-testid={`recipe-card-${recipe.id}`}
              >
                {/* Image */}
                <div className="relative h-44 bg-muted overflow-hidden">
                  {recipe.imageUrl ? (
                    <img src={recipe.imageUrl} alt={recipe.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <UtensilsCrossed size={32} className="text-muted-foreground/30" />
                    </div>
                  )}
                  {/* Selected overlay */}
                  {isSelected && (
                    <div className={`absolute inset-0 ${pal!.light} opacity-30`} />
                  )}
                  {/* Selected badge */}
                  {isSelected && (
                    <div className={`absolute top-2 right-2 w-7 h-7 rounded-full ${pal!.dot} flex items-center justify-center shadow-md`}>
                      <CheckCircle2 size={14} className="text-white" />
                    </div>
                  )}
                  {/* Contributor avatar */}
                  {recipe.contributor && (
                    <div className="absolute bottom-2 left-2 flex items-center gap-1.5 bg-black/50 backdrop-blur-sm rounded-full px-2 py-1">
                      <img src={recipe.contributor.photoUrl} alt={recipe.contributor.name} className="w-4 h-4 rounded-full object-cover" />
                      <span className="text-white text-[10px] font-medium">{recipe.contributor.name}</span>
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="p-3 flex flex-col flex-1">
                  <h3 className="font-display font-bold text-sm leading-tight mb-1">{recipe.name}</h3>

                  {/* Pantry match */}
                  <MatchBar pct={recipe.match} />

                  <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground flex-wrap">
                    <span className="flex items-center gap-1"><Clock size={11} />{fmtMins(recipe.cookTimeMinutes)}</span>
                    <span>·</span>
                    <span>{recipe.equipment.map(e => EQUIPMENT_INFO[e]?.icon ?? e).join(" ")}</span>
                    {recipe.tags.slice(0, 2).map(t => (
                      <span key={t} className="px-1.5 py-0.5 rounded bg-muted text-muted-foreground capitalize">{t}</span>
                    ))}
                  </div>

                  {/* Per-recipe servings — only when selected */}
                  {isSelected && (
                    <div
                      className="mt-3 pt-3 border-t border-border flex items-center justify-between"
                      onClick={e => e.stopPropagation()}
                    >
                      <span className="text-xs font-medium text-muted-foreground flex items-center gap-1"><Users size={11} /> Servings</span>
                      <div className="flex items-center gap-2">
                        <button onClick={() => onServing(recipe.id, Math.max(1, sv - 1))} className="w-6 h-6 rounded-full border border-border flex items-center justify-center hover:bg-accent"><Minus size={10} /></button>
                        <span className="text-sm font-bold w-5 text-center">{sv}</span>
                        <button onClick={() => onServing(recipe.id, Math.min(20, sv + 1))} className="w-6 h-6 rounded-full border border-border flex items-center justify-center hover:bg-accent"><Plus size={10} /></button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {displayed.length === 0 && (
            <div className="col-span-3 text-center py-16 text-muted-foreground">
              <UtensilsCrossed size={32} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">No matching recipes. Try changing your filters.</p>
            </div>
          )}
        </div>
      )}

      <div className="flex gap-3 sticky bottom-4">
        <Button variant="outline" onClick={onBack} className="gap-1 shrink-0"><ChevronLeft size={16} /> Back</Button>
        <Button
          size="lg"
          className="flex-1 gap-2 bg-primary text-primary-foreground font-bold"
          disabled={!canCook}
          onClick={onNext}
          data-testid="btn-recipes-next"
        >
          <Zap size={16} />
          {canCook
            ? `Start Parallel Cook (${selectedIds.length} recipes)`
            : `Select at least ${2 - selectedIds.length} more recipe${2 - selectedIds.length !== 1 ? "s" : ""}`}
          <ChevronRight size={18} />
        </Button>
      </div>
    </div>
  );
}

// ─── STEP 4: Parallel Cook ─────────────────────────────────────────────────────

type CookPhase = "gameplan" | "execution" | "done";

function StepCook({
  plan, totalMinutes, selectedRecipes, pantry, servings,
  onFinish, onBack,
}: {
  plan: MasterTask[];
  totalMinutes: number;
  selectedRecipes: Recipe[];
  pantry: string[];
  servings: Record<number, number>;
  onFinish: () => void;
  onBack: () => void;
}) {
  const [phase, setPhase] = useState<CookPhase>("gameplan");
  const [stepIdx, setStepIdx] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const recipeColorMap = useMemo(() => {
    const m: Record<number, typeof RECIPE_PALETTE[0]> = {};
    selectedRecipes.forEach((r, i) => { m[r.id] = RECIPE_PALETTE[i % RECIPE_PALETTE.length]; });
    return m;
  }, [selectedRecipes]);

  // Start timer when execution begins
  useEffect(() => {
    if (phase === "execution" && running) {
      timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [phase, running]);

  const startCooking = () => {
    setPhase("execution");
    setStepIdx(0);
    setElapsed(0);
    setRunning(true);
  };

  const sequentialTotal = selectedRecipes.reduce((s, r) => s + r.cookTimeMinutes, 0);
  const timeSaved = Math.max(0, sequentialTotal - totalMinutes);

  // ── Game Plan view ──
  if (phase === "gameplan") {
    return (
      <div className="max-w-3xl mx-auto px-4 py-6">
        <div className="flex items-center gap-3 mb-5">
          <button onClick={onBack} className="p-2 rounded-lg hover:bg-accent text-muted-foreground"><ChevronLeft size={18} /></button>
          <div>
            <h2 className="text-xl font-display font-bold">Your Game Plan</h2>
            <p className="text-xs text-muted-foreground">Review before you start cooking</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          <div className="rounded-xl bg-card border border-border p-3 text-center">
            <div className="text-xl font-bold font-display">{selectedRecipes.length}</div>
            <div className="text-xs text-muted-foreground">Recipes</div>
          </div>
          <div className="rounded-xl bg-card border border-border p-3 text-center">
            <div className="text-xl font-bold font-display">{fmtMins(totalMinutes)}</div>
            <div className="text-xs text-muted-foreground">Total time</div>
          </div>
          <div className="rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 p-3 text-center">
            <div className="text-xl font-bold font-display text-emerald-600 dark:text-emerald-400">
              {timeSaved > 0 ? `-${fmtMins(timeSaved)}` : "Optimized"}
            </div>
            <div className="text-xs text-emerald-600/70 dark:text-emerald-400/70">vs sequential</div>
          </div>
        </div>

        {/* Recipe legend */}
        <div className="flex flex-wrap gap-2 mb-4">
          {selectedRecipes.map((r, i) => {
            const pal = RECIPE_PALETTE[i % RECIPE_PALETTE.length];
            return (
              <span key={r.id} className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border ${pal.badge} ${pal.border}`}>
                <span className={`w-2 h-2 rounded-full ${pal.dot}`} />{r.name}
                {servings[r.id] && servings[r.id] !== r.servings && (
                  <span className="opacity-60">×{servings[r.id]}</span>
                )}
              </span>
            );
          })}
        </div>

        {/* Task list */}
        <div className="space-y-2 mb-6">
          {plan.map((task, i) => {
            const pal = task.type === "consolidated" ? null : recipeColorMap[task.recipeId];
            const cfg = STEP_TYPE[task.type];
            return (
              <div key={i} className={[
                "flex gap-3 rounded-xl border p-3 transition-colors",
                task.type === "consolidated"
                  ? "bg-violet-50 dark:bg-violet-900/20 border-violet-200 dark:border-violet-800"
                  : `${pal?.light ?? "bg-card"} ${pal?.border ?? "border-border"}`,
              ].join(" ")} data-testid={`plan-task-${i}`}>
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-background border border-border flex items-center justify-center text-xs font-bold text-muted-foreground mt-0.5">{i + 1}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <p className="text-sm font-medium leading-snug">{task.instruction}</p>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md ${cfg.cls}`}>{cfg.icon} {cfg.label}</span>
                      <span className="text-[10px] text-muted-foreground font-mono">{fmtMins(task.durationMinutes)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    {task.type !== "consolidated" && <span className={`text-[10px] font-semibold ${pal?.text ?? ""}`}>{task.recipeName}</span>}
                    {task.equipment && <span className="text-[10px] text-muted-foreground">· {task.equipment}</span>}
                    <span className="text-[10px] text-muted-foreground ml-auto">@{task.startMinute}m</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <Button size="lg" onClick={startCooking} className="w-full gap-3 bg-primary text-primary-foreground font-bold py-6 rounded-2xl text-base" data-testid="btn-start-cooking">
          <Play size={20} /> Start Cooking — {plan.length} Steps
        </Button>
      </div>
    );
  }

  // ── Execution view ──
  if (phase === "execution") {
    const current = plan[stepIdx];
    const next = plan[stepIdx + 1] ?? null;
    const isLast = stepIdx === plan.length - 1;
    const progress = Math.round((stepIdx / plan.length) * 100);
    const pal = current.type === "consolidated" ? RECIPE_PALETTE[0] : recipeColorMap[current.recipeId] ?? RECIPE_PALETTE[0];
    const cfg = STEP_TYPE[current.type];

    // Per-step estimated duration countdown
    const stepSeconds = current.durationMinutes * 60;

    return (
      <div className="min-h-[calc(100vh-120px)] flex flex-col" data-testid="execution-mode">
        {/* Progress bar */}
        <div className="h-1 bg-muted"><div className="h-full bg-primary transition-all duration-500" style={{ width: `${progress}%` }} /></div>

        {/* Timer bar */}
        <div className="flex items-center justify-between px-4 py-2 bg-muted/40 border-b border-border">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Timer size={13} />
            <span className="font-mono font-semibold">{fmtElapsed(elapsed)}</span>
            <span>elapsed</span>
          </div>
          <span className="text-xs text-muted-foreground font-mono">Step {stepIdx + 1} / {plan.length}</span>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>target</span>
            <span className="font-mono font-semibold">{fmtMins(totalMinutes)}</span>
          </div>
        </div>

        <div className="flex-1 flex flex-col justify-center px-4 py-6 max-w-2xl mx-auto w-full">
          {/* Type badge + recipe */}
          <div className="flex items-center justify-center gap-2 mb-5 flex-wrap">
            <span className={`text-sm font-semibold px-3 py-1 rounded-full ${cfg.cls}`}>{cfg.icon} {cfg.label}</span>
            {current.type !== "consolidated" && (
              <span className={`text-sm font-semibold ${pal.text}`}>{current.recipeName}</span>
            )}
          </div>

          {/* ACTIVE STEP */}
          <div className={`rounded-3xl border-2 ${pal.border} ${pal.light} p-8 mb-5 text-center`} data-testid="active-step">
            <div className={`flex items-center justify-center gap-1.5 text-sm font-medium mb-4 ${pal.text}`}>
              <Clock size={14} />
              <span>{fmtMins(current.durationMinutes)}</span>
              {current.equipment && <><span className="opacity-50">·</span><span>{current.equipment}</span></>}
            </div>
            <p className="text-2xl sm:text-3xl font-display font-semibold leading-snug" data-testid="step-instruction">
              {current.instruction}
            </p>
          </div>

          {/* NEXT UP */}
          {next && (
            <div className="rounded-2xl border border-dashed border-border bg-muted/30 px-5 py-4 mb-6" data-testid="next-step-preview">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/50 mb-1.5">Next up</p>
              <p className="text-sm text-muted-foreground leading-relaxed">{next.instruction}</p>
              <div className="flex items-center gap-2 mt-1.5">
                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md ${STEP_TYPE[next.type].cls}`}>
                  {STEP_TYPE[next.type].icon} {next.recipeName !== "All Recipes" ? next.recipeName : "Shared"}
                </span>
                <span className="text-[10px] text-muted-foreground">{fmtMins(next.durationMinutes)}</span>
              </div>
            </div>
          )}

          {/* Dot indicators */}
          <div className="flex items-center justify-center gap-1 mb-6 flex-wrap">
            {plan.map((_, i) => (
              <div key={i} className={`rounded-full transition-all ${i < stepIdx ? "w-2 h-2 bg-primary/40" : i === stepIdx ? "w-3 h-3 bg-primary" : "w-2 h-2 bg-muted-foreground/20"}`} />
            ))}
          </div>

          {/* Button */}
          {isLast ? (
            <Button size="lg" onClick={() => { setRunning(false); setPhase("done"); }}
              className="w-full gap-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-6 rounded-2xl text-base" data-testid="btn-finish">
              <CheckCircle2 size={22} /> Done — Let's eat!
            </Button>
          ) : (
            <Button size="lg" onClick={() => setStepIdx(i => i + 1)}
              className="w-full gap-3 bg-primary text-primary-foreground font-bold py-6 rounded-2xl text-base" data-testid="btn-next-step">
              Next Step <ChevronRight size={22} />
            </Button>
          )}
        </div>
      </div>
    );
  }

  // ── Done ──
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] text-center px-6 py-12">
      <div className="text-6xl mb-4">🍽️</div>
      <h2 className="text-3xl font-display font-bold mb-2">Meal prep complete!</h2>
      <p className="text-muted-foreground mb-1">You cooked {selectedRecipes.length} recipes in <strong>{fmtElapsed(elapsed)}</strong></p>
      <p className="text-sm text-muted-foreground mb-6">Target was {fmtMins(totalMinutes)}</p>
      <div className="flex flex-wrap gap-2 justify-center mb-8">
        {selectedRecipes.map(r => <Badge key={r.id} variant="secondary" className="text-sm px-3 py-1">✓ {r.name}</Badge>)}
      </div>
      <Button size="lg" onClick={onFinish} className="gap-2 bg-primary text-primary-foreground"><ShoppingBag size={18} /> View Shopping List</Button>
    </div>
  );
}

// ─── STEP 5: Shopping List ────────────────────────────────────────────────────

function StepShopping({
  selectedRecipes, pantry, servings, onBack, onReset,
}: {
  selectedRecipes: Recipe[];
  pantry: string[];
  servings: Record<number, number>;
  onBack: () => void;
  onReset: () => void;
}) {
  const lowerPantry = pantry.map(p => p.toLowerCase());

  const allItems = selectedRecipes.flatMap(r => {
    const multiplier = (servings[r.id] ?? r.servings) / (r.servings || 1);
    return r.ingredients.map(ing => {
      const owned = lowerPantry.some(p => ing.name.toLowerCase().includes(p) || p.includes(ing.name.toLowerCase().split(" ")[0]));
      const qty = multiplier !== 1 && ing.qty > 0 ? +(ing.qty * multiplier).toFixed(1) : ing.qty;
      return { ...ing, qty, recipeName: r.name, owned };
    });
  });

  const toBuy = allItems.filter(i => !i.owned);
  const have = allItems.filter(i => i.owned);

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="flex items-center gap-3 mb-5">
        <button onClick={onBack} className="p-2 rounded-lg hover:bg-accent text-muted-foreground"><ChevronLeft size={18} /></button>
        <div>
          <h2 className="text-xl font-display font-bold">Shopping List</h2>
          <p className="text-xs text-muted-foreground">{toBuy.length} to buy · {have.length} already in pantry</p>
        </div>
      </div>

      {/* Buy section */}
      {toBuy.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <ShoppingCart size={15} className="text-primary" />
            <h3 className="font-semibold text-sm">Need to buy ({toBuy.length})</h3>
          </div>
          <div className="rounded-xl border border-border overflow-hidden bg-card divide-y divide-border">
            {toBuy.map((ing, i) => (
              <div key={i} className="flex items-center justify-between px-4 py-3 hover:bg-accent/30 transition-colors">
                <div>
                  <span className="text-sm font-medium">{ing.qty > 0 ? `${ing.qty} ${ing.unit} ` : ""}{ing.name}</span>
                  <span className="text-xs text-muted-foreground ml-2">({ing.recipeName})</span>
                </div>
                <a
                  href={getAmazonUrl(ing.name)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-[11px] text-primary hover:underline font-medium shrink-0 ml-3"
                >
                  <ShoppingCart size={11} /> Buy <ExternalLink size={9} />
                </a>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Already have section */}
      {have.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Package size={15} className="text-muted-foreground" />
            <h3 className="font-semibold text-sm text-muted-foreground">Already in your pantry ({have.length})</h3>
          </div>
          <div className="rounded-xl border border-border overflow-hidden bg-muted/30 divide-y divide-border">
            {have.map((ing, i) => (
              <div key={i} className="flex items-center justify-between px-4 py-2.5 opacity-50">
                <span className="text-sm line-through">{ing.qty > 0 ? `${ing.qty} ${ing.unit} ` : ""}{ing.name}</span>
                <span className="text-xs text-muted-foreground">({ing.recipeName})</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <Button size="lg" onClick={onReset} className="w-full gap-2 bg-primary text-primary-foreground font-bold">
        <ChefHat size={18} /> Cook Another Batch
      </Button>
    </div>
  );
}

// ─── Add Recipe Modal (kept from before) ──────────────────────────────────────

function AddRecipeModal({ open, onClose, contributors }: { open: boolean; onClose: () => void; contributors: Contributor[] }) {
  const { toast } = useToast();
  const [form, setForm] = useState({
    name: "", description: "", cookTimeMinutes: 30, servings: 4,
    equipment: [] as EquipmentKey[], ingredients: "", steps: "",
    tags: "", imageUrl: "", sourceUrl: "", contributorId: "",
  });

  const mutation = useMutation({
    mutationFn: async (data: typeof form) => {
      const ingArr = data.ingredients.split("\n").filter(Boolean).map(line => {
        const parts = line.trim().split(" ");
        const qty = parseFloat(parts[0]) || 0;
        const unit = !isNaN(parseFloat(parts[0])) ? (parts[1] || "") : "";
        const name = !isNaN(parseFloat(parts[0])) ? parts.slice(2).join(" ") : line.trim();
        return { qty, unit, name };
      });
      return apiRequest("POST", "/api/recipes", {
        name: data.name, description: data.description,
        cookTimeMinutes: Number(data.cookTimeMinutes), servings: Number(data.servings),
        equipment: data.equipment,
        ingredients: ingArr,
        steps: data.steps.split("\n").filter(Boolean).map(s => s.trim()),
        tags: data.tags.split(",").map(t => t.trim()).filter(Boolean),
        imageUrl: data.imageUrl || null, sourceUrl: data.sourceUrl || null,
        contributorId: data.contributorId ? Number(data.contributorId) : null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/recipes"] });
      toast({ title: "Recipe added!" });
      onClose();
      setForm({ name: "", description: "", cookTimeMinutes: 30, servings: 4, equipment: [], ingredients: "", steps: "", tags: "", imageUrl: "", sourceUrl: "", contributorId: "" });
    },
    onError: () => toast({ title: "Failed to add recipe", variant: "destructive" }),
  });

  const toggleEquip = (eq: EquipmentKey) =>
    setForm(f => ({ ...f, equipment: f.equipment.includes(eq) ? f.equipment.filter(e => e !== eq) : [...f.equipment, eq] }));

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-lg flex items-center gap-2">
            <ChefHat size={20} className="text-primary" /> Add a Recipe
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5 block">Recipe Name *</Label>
            <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Lemon Herb Salmon" data-testid="input-recipe-name" />
          </div>
          <div>
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5 block">Description</Label>
            <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="A short description..." rows={2} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5 block">Cook Time (min)</Label>
              <Input type="number" min={5} max={300} value={form.cookTimeMinutes} onChange={e => setForm(f => ({ ...f, cookTimeMinutes: parseInt(e.target.value) || 30 }))} />
            </div>
            <div>
              <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5 block">Servings</Label>
              <Input type="number" min={1} max={20} value={form.servings} onChange={e => setForm(f => ({ ...f, servings: parseInt(e.target.value) || 4 }))} />
            </div>
          </div>
          <div>
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2 block">Equipment Needed *</Label>
            <div className="grid grid-cols-2 gap-2">
              {(Object.entries(EQUIPMENT_INFO) as [EquipmentKey, typeof EQUIPMENT_INFO[EquipmentKey]][]).map(([eq, info]) => (
                <label key={eq} className="flex items-center gap-2 cursor-pointer hover:bg-accent p-2 rounded-lg transition-colors">
                  <input type="checkbox" checked={form.equipment.includes(eq)} onChange={() => toggleEquip(eq)} className="accent-primary" />
                  <span className="text-sm">{info.icon} {info.label}</span>
                </label>
              ))}
            </div>
          </div>
          <div>
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5 block">Ingredients <span className="normal-case font-normal">(one per line: qty unit name)</span></Label>
            <Textarea value={form.ingredients} onChange={e => setForm(f => ({ ...f, ingredients: e.target.value }))} placeholder={"2 tbsp olive oil\n1 lemon\n4 salmon fillets"} rows={5} className="font-mono text-xs" />
          </div>
          <div>
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5 block">Steps <span className="normal-case font-normal">(one per line)</span></Label>
            <Textarea value={form.steps} onChange={e => setForm(f => ({ ...f, steps: e.target.value }))} placeholder={"Preheat oven to 400°F.\nSeason salmon.\nBake 12–15 minutes."} rows={5} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5 block">Tags</Label>
              <Input value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))} placeholder="healthy, quick" />
            </div>
            <div>
              <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5 block">Image URL</Label>
              <Input value={form.imageUrl} onChange={e => setForm(f => ({ ...f, imageUrl: e.target.value }))} placeholder="https://..." />
            </div>
          </div>
          <div>
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5 block">Added By</Label>
            <Select value={form.contributorId} onValueChange={v => setForm(f => ({ ...f, contributorId: v }))}>
              <SelectTrigger><SelectValue placeholder="Select contributor…" /></SelectTrigger>
              <SelectContent>
                {contributors.map(c => (
                  <SelectItem key={c.id} value={String(c.id)}>
                    <div className="flex items-center gap-2">
                      <img src={c.photoUrl} alt={c.name} className="w-5 h-5 rounded-full object-cover" />
                      <span>{c.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        {(!form.name || form.equipment.length === 0) && (
          <div className="text-xs text-destructive px-1 -mt-2 space-y-0.5">
            {!form.name && <p>⚠ Recipe name is required</p>}
            {form.equipment.length === 0 && <p>⚠ Select at least one piece of equipment</p>}
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => mutation.mutate(form)} disabled={!form.name || form.equipment.length === 0 || mutation.isPending} className="bg-primary text-primary-foreground">
            {mutation.isPending ? "Adding…" : "Add Recipe"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main App ──────────────────────────────────────────────────────────────────

type AppStep = 1 | 2 | 3 | 4 | 5;

export default function HomePage() {
  const { toast } = useToast();
  const [darkMode, setDarkMode] = useState(window.matchMedia("(prefers-color-scheme: dark)").matches);
  useEffect(() => { document.documentElement.classList.toggle("dark", darkMode); }, [darkMode]);

  // Wizard state
  const [step, setStep] = useState<AppStep>(1);
  const [equipment, setEquipment] = useState<Record<EquipmentKey, boolean>>({
    oven: true, stove: true, airFryer: false, counter: true, instantPot: false, microwave: false,
  });
  const [pantry, setPantry] = useState<string[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [servings, setServings] = useState<Record<number, number>>({});
  const [parallelPlan, setParallelPlan] = useState<ParallelPlan | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  const { data: recipes = [], isLoading } = useQuery<Recipe[]>({ queryKey: ["/api/recipes"] });
  const { data: contributors = [] } = useQuery<Contributor[]>({ queryKey: ["/api/contributors"] });

  const selectedRecipes = recipes.filter(r => selectedIds.includes(r.id));

  const buildMutation = useMutation({
    mutationFn: async (ids: number[]) => {
      const res = await apiRequest("POST", "/api/schedule/parallel", { recipeIds: ids });
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error ?? "Failed"); }
      return res.json() as Promise<ParallelPlan>;
    },
    onSuccess: (data) => { setParallelPlan(data); setStep(4); },
    onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
  });

  const toggleEquipment = (k: EquipmentKey) => {
    setEquipment(prev => ({ ...prev, [k]: !prev[k] }));
    setSelectedIds([]);
  };

  const toggleRecipe = (id: number) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleReset = () => {
    setStep(1);
    setSelectedIds([]);
    setParallelPlan(null);
    setServings({});
  };

  return (
    <div className="min-h-screen bg-background" data-testid="homepage">
      {/* ── Global nav ── */}
      <header className="sticky top-0 z-30 bg-background/95 backdrop-blur border-b border-border">
        <div className="max-w-5xl mx-auto px-4 flex items-center justify-between h-14 gap-3">
          <div className="flex items-center gap-2.5">
            {/* Logo mark */}
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <ChefHat size={18} className="text-primary-foreground" />
            </div>
            <span className="font-display font-bold text-base hidden sm:block">Mean Cuisines</span>
          </div>

          {/* Step bar in header on md+ */}
          <div className="flex-1 hidden md:block">
            <StepBar step={step} total={5} />
          </div>

          <div className="flex items-center gap-2">
            <button onClick={() => setDarkMode(d => !d)} className="p-2 rounded-lg hover:bg-accent transition-colors text-muted-foreground" aria-label="Toggle dark mode">
              {darkMode ? <Sun size={16} /> : <Moon size={16} />}
            </button>
          </div>
        </div>

        {/* Mobile step bar */}
        <div className="md:hidden border-t border-border">
          <StepBar step={step} total={5} />
        </div>
      </header>

      {/* ── Step content ── */}
      <main className="pb-16">
        {step === 1 && (
          <StepEquipment
            equipment={equipment}
            onToggle={toggleEquipment}
            onNext={() => setStep(2)}
          />
        )}
        {step === 2 && (
          <StepPantry
            pantry={pantry}
            onPantryChange={setPantry}
            onNext={() => setStep(3)}
            onBack={() => setStep(1)}
          />
        )}
        {step === 3 && (
          <StepRecipes
            recipes={recipes}
            equipment={equipment}
            pantry={pantry}
            selectedIds={selectedIds}
            servings={servings}
            onToggle={toggleRecipe}
            onServing={(id, s) => setServings(prev => ({ ...prev, [id]: s }))}
            onNext={() => buildMutation.mutate(selectedIds)}
            onBack={() => setStep(2)}
            isLoading={isLoading || buildMutation.isPending}
            onShowAdd={() => setShowAddModal(true)}
            contributors={contributors}
          />
        )}
        {step === 4 && parallelPlan && (
          <StepCook
            plan={parallelPlan.plan}
            totalMinutes={parallelPlan.totalMinutes}
            selectedRecipes={selectedRecipes}
            pantry={pantry}
            servings={servings}
            onFinish={() => setStep(5)}
            onBack={() => setStep(3)}
          />
        )}
        {step === 5 && (
          <StepShopping
            selectedRecipes={selectedRecipes}
            pantry={pantry}
            servings={servings}
            onBack={() => setStep(4)}
            onReset={handleReset}
          />
        )}
      </main>

      <AddRecipeModal open={showAddModal} onClose={() => setShowAddModal(false)} contributors={contributors} />
    </div>
  );
}
