import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, Link } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  ChefHat, Clock, Plus, Menu, X,
  CalendarClock, Flame, Moon, Sun, UtensilsCrossed, Info,
  ShoppingCart, ExternalLink, Users, Link as LinkIcon, Zap
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

interface ScheduleEntry {
  recipeId: number;
  recipeName: string;
  startTime: string;
  endTime: string;
  equipment: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const EQUIPMENT_LABELS: Record<EquipmentKey, string> = {
  oven: "Oven",
  stove: "Stove",
  airFryer: "Air Fryer",
  counter: "Counter / No Heat",
  instantPot: "Instant Pot",
  microwave: "Microwave",
};

const EQUIPMENT_ICONS: Record<EquipmentKey, string> = {
  oven: "🔥",
  stove: "🍳",
  airFryer: "💨",
  counter: "🧴",
  instantPot: "⚡",
  microwave: "📡",
};

const TIME_OPTIONS = Array.from({ length: 30 }, (_, i) => {
  const totalMins = (6 * 60) + i * 30;
  const h = Math.floor(totalMins / 60) % 24;
  const m = totalMins % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
});

const SERVING_MULTIPLIERS = [
  { label: "Half (0.5x)", value: 0.5 },
  { label: "Regular (1x)", value: 1 },
  { label: "Double (2x)", value: 2 },
  { label: "Triple (3x)", value: 3 },
];

// Amazon affiliate tag — replace with your own
const AMAZON_AFFILIATE_TAG = "meancuisines-20";

function getAmazonSearchUrl(ingredient: string) {
  const query = encodeURIComponent(ingredient.trim());
  return `https://www.amazon.com/s?k=${query}&tag=${AMAZON_AFFILIATE_TAG}`;
}

// ─── Ad Slot Component ─────────────────────────────────────────────────────────
// Swap placeholder divs with real AdSense <ins> tags once approved.
// To activate: uncomment the <ins> block and delete the placeholder div.

function AdSlot({ slot, className = "", label = "Advertisement" }: { slot: string; className?: string; label?: string }) {
  return (
    <div className={`ad-slot ${className}`} data-ad-slot={slot} aria-label={label}>
      {/* ── ADSENSE (uncomment after approval) ──────────────────────────
      <ins
        className="adsbygoogle"
        style={{ display: "block" }}
        data-ad-client="ca-pub-XXXXXXXXXXXXXXXX"
        data-ad-slot={slot}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
      <script>(adsbygoogle = window.adsbygoogle || []).push({});</script>
      ──────────────────────────────────────────────────────────────── */}

      {/* Placeholder shown until AdSense is active */}
      <div className="flex items-center justify-center bg-muted/40 border border-dashed border-border rounded-lg text-xs text-muted-foreground/50 select-none" style={{ minHeight: 90 }}>
        Ad
      </div>
    </div>
  );
}

// ─── Logo ─────────────────────────────────────────────────────────────────────

function Logo({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-label="Mean Cuisines logo">
      <circle cx="16" cy="16" r="15" fill="hsl(20 90% 42%)" />
      <path d="M10 22 C10 16, 14 10, 16 10 C18 10, 22 16, 22 22" stroke="white" strokeWidth="2" strokeLinecap="round" />
      <path d="M8 22 H24" stroke="white" strokeWidth="2" strokeLinecap="round" />
      <circle cx="16" cy="8" r="2" fill="white" />
    </svg>
  );
}

// ─── Schedule Timeline ─────────────────────────────────────────────────────────

function ScheduleTimeline({ schedule, recipes }: { schedule: ScheduleEntry[]; recipes: Recipe[] }) {
  if (schedule.length === 0) return null;
  const recipeMap = Object.fromEntries(recipes.map(r => [r.id, r]));
  const allTimes = schedule.flatMap(s => [s.startTime, s.endTime]).sort();
  const minTime = allTimes[0];
  const maxTime = allTimes[allTimes.length - 1];
  const toMinutes = (t: string) => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };
  const startMin = toMinutes(minTime);
  const totalDuration = Math.max(toMinutes(maxTime) - startMin, 1);
  const colors = ["bg-orange-500", "bg-amber-500", "bg-green-600", "bg-blue-500", "bg-purple-500", "bg-rose-500"];

  return (
    <div className="mt-2">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs text-muted-foreground">{minTime}</span>
        <span className="text-xs text-muted-foreground">{maxTime}</span>
      </div>
      <div className="relative h-10 bg-accent rounded-lg overflow-hidden mb-3">
        {schedule.map((entry, idx) => {
          const left = ((toMinutes(entry.startTime) - startMin) / totalDuration) * 100;
          const width = ((toMinutes(entry.endTime) - toMinutes(entry.startTime)) / totalDuration) * 100;
          return (
            <div
              key={entry.recipeId}
              className={`absolute top-1 bottom-1 ${colors[idx % colors.length]} rounded flex items-center px-2 overflow-hidden`}
              style={{ left: `${left}%`, width: `${Math.max(width, 6)}%` }}
              title={`${entry.recipeName}: ${entry.startTime}–${entry.endTime}`}
            >
              <span className="text-white text-xs font-medium truncate">{entry.recipeName}</span>
            </div>
          );
        })}
      </div>
      <div className="space-y-2">
        {schedule.map((entry, idx) => {
          const recipe = recipeMap[entry.recipeId];
          return (
            <div key={entry.recipeId} className="flex items-center gap-3 bg-background border border-border rounded-lg p-3">
              <div className={`w-2 h-8 rounded-full flex-shrink-0 ${colors[idx % colors.length]}`} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{entry.recipeName}</p>
                <p className="text-xs text-muted-foreground">{EQUIPMENT_ICONS[entry.equipment as EquipmentKey] || "🍽️"} {entry.startTime} → {entry.endTime}</p>
              </div>
              {recipe?.contributor && (
                <Avatar className="w-6 h-6 flex-shrink-0">
                  <AvatarImage src={recipe.contributor.photoUrl} alt={recipe.contributor.name} />
                  <AvatarFallback className="text-xs">{recipe.contributor.name[0]}</AvatarFallback>
                </Avatar>
              )}
            </div>
          );
        })}
      </div>
      <p className="text-xs text-muted-foreground mt-2 text-center">~{totalDuration} min total session</p>
    </div>
  );
}

// ─── Recipe Card ───────────────────────────────────────────────────────────────

function RecipeCard({
  recipe, selected, onToggle, servingMultiplier, isLast,
}: {
  recipe: Recipe; selected: boolean; onToggle: () => void; servingMultiplier: number; isLast: boolean;
}) {
  return (
    <>
      <AccordionItem
        value={String(recipe.id)}
        className={`border rounded-xl overflow-hidden transition-all duration-200 ${selected ? "border-primary shadow-md" : "border-border"}`}
        data-testid={`recipe-card-${recipe.id}`}
      >
        <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-accent/40 transition-colors">
          <div className="flex items-center gap-3 w-full text-left">
            {recipe.imageUrl && (
              <img src={recipe.imageUrl} alt={recipe.name} className="w-12 h-12 rounded-lg object-cover flex-shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-display font-bold text-sm">{recipe.name}</span>
                {recipe.equipment.map(eq => (
                  <span key={eq} className="text-xs">{EQUIPMENT_ICONS[eq]}</span>
                ))}
              </div>
              <div className="flex items-center gap-3 mt-0.5">
                <span className="text-xs text-muted-foreground flex items-center gap-1"><Clock size={11} /> {recipe.cookTimeMinutes} min</span>
                <span className="text-xs text-muted-foreground flex items-center gap-1"><Users size={11} /> {Math.round(recipe.servings * servingMultiplier)} servings</span>
              </div>
            </div>
            <Button
              size="sm"
              variant={selected ? "default" : "outline"}
              className={`flex-shrink-0 text-xs h-7 px-3 ${selected ? "bg-primary text-primary-foreground" : ""}`}
              onClick={(e) => { e.stopPropagation(); onToggle(); }}
              data-testid={`select-recipe-${recipe.id}`}
            >
              {selected ? "✓ Added" : "Select"}
            </Button>
          </div>
        </AccordionTrigger>
        <AccordionContent className="px-4 pb-4">
          <p className="text-sm text-muted-foreground mb-3">{recipe.description}</p>

          {/* Contributor */}
          {recipe.contributor && (
            <div className="flex items-center gap-2 mb-3 pb-3 border-b border-border">
              <Avatar className="w-7 h-7">
                <AvatarImage src={recipe.contributor.photoUrl} alt={recipe.contributor.name} />
                <AvatarFallback className="text-xs">{recipe.contributor.name[0]}</AvatarFallback>
              </Avatar>
              <div>
                <p className="text-xs font-medium">{recipe.contributor.name}</p>
                <p className="text-xs text-muted-foreground capitalize">{recipe.contributor.role}</p>
              </div>
              {recipe.sourceUrl && (
                <a href={recipe.sourceUrl} target="_blank" rel="noopener noreferrer" className="ml-auto text-muted-foreground hover:text-primary transition-colors">
                  <LinkIcon size={13} />
                </a>
              )}
            </div>
          )}

          {/* Ingredients with affiliate links */}
          <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">Ingredients</h4>
          <ul className="text-sm space-y-1.5 mb-4">
            {recipe.ingredients.map((ing, i) => (
              <li key={i} className="flex items-center justify-between gap-2 group">
                <div className="flex items-baseline gap-2 min-w-0">
                  <span className="text-primary font-medium shrink-0">
                    {ing.qty > 0
                      ? `${+(ing.qty * servingMultiplier).toFixed(1)} ${ing.unit}`.trim()
                      : ing.unit || ""}
                  </span>
                  <span className="text-foreground truncate">{ing.name}</span>
                </div>
                {/* Amazon affiliate link */}
                <a
                  href={getAmazonSearchUrl(ing.name)}
                  target="_blank"
                  rel="noopener noreferrer sponsored"
                  className="opacity-0 group-hover:opacity-100 flex-shrink-0 flex items-center gap-1 text-xs text-amber-600 hover:text-amber-700 transition-all"
                  title={`Shop ${ing.name} on Amazon`}
                  aria-label={`Buy ${ing.name} on Amazon`}
                >
                  <ShoppingCart size={11} />
                  <span className="hidden sm:inline">Amazon</span>
                </a>
              </li>
            ))}
          </ul>

          {/* Affiliate banner */}
          <div className="flex items-center gap-2 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg px-3 py-2 mb-3 text-xs text-amber-700 dark:text-amber-400">
            <ShoppingCart size={12} className="flex-shrink-0" />
            <span>Hover ingredients to shop on Amazon. As an affiliate, we earn from qualifying purchases.</span>
          </div>

          {/* Steps */}
          <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">Steps</h4>
          <ol className="text-sm space-y-1.5">
            {recipe.steps.map((step, i) => (
              <li key={i} className="flex gap-2.5">
                <span className="text-primary font-bold min-w-[1.25rem] text-xs mt-0.5 shrink-0">{i + 1}.</span>
                <span className="text-muted-foreground leading-relaxed">{step}</span>
              </li>
            ))}
          </ol>

          {/* Equipment / tag badges */}
          <div className="flex flex-wrap gap-1.5 mt-3">
            {recipe.equipment.map(eq => (
              <Badge key={eq} variant="secondary" className="text-xs">{EQUIPMENT_ICONS[eq as keyof typeof EQUIPMENT_ICONS] ?? ""} {EQUIPMENT_LABELS[eq as keyof typeof EQUIPMENT_LABELS] ?? eq}</Badge>
            ))}
            {recipe.tags.filter(tag => !recipe.equipment.includes(tag)).map(tag => (
              <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>
            ))}
          </div>
        </AccordionContent>
      </AccordionItem>

      {/* Ad slot injected after every 3rd recipe */}
      {isLast && (
        <AdSlot slot="1234567890" className="my-2" label="Recipe list advertisement" />
      )}
    </>
  );
}

// ─── Add Recipe Modal ──────────────────────────────────────────────────────────

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
              <Input type="number" min={5} max={300} value={form.cookTimeMinutes} onChange={e => setForm(f => ({ ...f, cookTimeMinutes: parseInt(e.target.value) || 30 }))} data-testid="input-cook-time" />
            </div>
            <div>
              <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5 block">Servings</Label>
              <Input type="number" min={1} max={20} value={form.servings} onChange={e => setForm(f => ({ ...f, servings: parseInt(e.target.value) || 4 }))} />
            </div>
          </div>
          <div>
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2 block">Equipment Needed *</Label>
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(EQUIPMENT_LABELS) as EquipmentKey[]).map(eq => (
                <label key={eq} className="flex items-center gap-2 cursor-pointer hover:bg-accent p-2 rounded-lg transition-colors">
                  <Checkbox checked={form.equipment.includes(eq)} onCheckedChange={() => toggleEquip(eq)} />
                  <span className="text-sm">{EQUIPMENT_ICONS[eq]} {EQUIPMENT_LABELS[eq]}</span>
                </label>
              ))}
            </div>
          </div>
          <div>
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5 block">Ingredients <span className="normal-case font-normal">(one per line: qty unit name)</span></Label>
            <Textarea value={form.ingredients} onChange={e => setForm(f => ({ ...f, ingredients: e.target.value }))} placeholder={"2 tbsp olive oil\n1 lemon\n4 salmon fillets"} rows={5} className="font-mono text-xs" data-testid="input-ingredients" />
          </div>
          <div>
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5 block">Steps <span className="normal-case font-normal">(one per line)</span></Label>
            <Textarea value={form.steps} onChange={e => setForm(f => ({ ...f, steps: e.target.value }))} placeholder={"Preheat oven to 400°F.\nSeason salmon.\nBake 12–15 minutes."} rows={5} data-testid="input-steps" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5 block">Tags <span className="normal-case font-normal">(comma-sep)</span></Label>
              <Input value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))} placeholder="healthy, quick" />
            </div>
            <div>
              <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5 block">Image URL</Label>
              <Input value={form.imageUrl} onChange={e => setForm(f => ({ ...f, imageUrl: e.target.value }))} placeholder="https://..." />
            </div>
          </div>
          <div>
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5 block">Source Link</Label>
            <Input value={form.sourceUrl} onChange={e => setForm(f => ({ ...f, sourceUrl: e.target.value }))} placeholder="https://recipe-site.com/..." />
          </div>
          <div>
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5 block">Added By</Label>
            <Select value={form.contributorId} onValueChange={v => setForm(f => ({ ...f, contributorId: v }))}>
              <SelectTrigger data-testid="select-contributor"><SelectValue placeholder="Select contributor…" /></SelectTrigger>
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
          <Button onClick={() => mutation.mutate(form)} disabled={!form.name || form.equipment.length === 0 || mutation.isPending} className="bg-primary text-primary-foreground" data-testid="button-submit-recipe">
            {mutation.isPending ? "Adding…" : "Add Recipe"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Sidebar Content (shared between desktop and mobile sheet) ────────────────

function SidebarContent({
  equipmentOn, toggleEquipment, burners, setBurners,
  maxMinutes, setMaxMinutes, startTime, setStartTime,
  servingMultiplier, setServingMultiplier, selectedCount,
}: {
  equipmentOn: Record<EquipmentKey, boolean>;
  toggleEquipment: (k: EquipmentKey) => void;
  burners: number; setBurners: (n: number) => void;
  maxMinutes: number; setMaxMinutes: (n: number) => void;
  startTime: string; setStartTime: (s: string) => void;
  servingMultiplier: number; setServingMultiplier: (n: number) => void;
  selectedCount: number;
}) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
        {/* Equipment */}
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">Kitchen Equipment</h2>
          <div className="space-y-2">
            {(Object.entries(EQUIPMENT_LABELS) as [EquipmentKey, string][]).map(([key, label]) => (
              <label key={key} className="flex items-center gap-2.5 cursor-pointer" data-testid={`equipment-${key}`}>
                <Checkbox checked={equipmentOn[key]} onCheckedChange={() => toggleEquipment(key)} className="data-[state=checked]:bg-primary data-[state=checked]:border-primary" />
                <span className="text-sm">{EQUIPMENT_ICONS[key]} {label}</span>
              </label>
            ))}
          </div>
          {equipmentOn.stove && (
            <div className="mt-3 flex items-center gap-3">
              <Label className="text-xs text-muted-foreground whitespace-nowrap">Burners:</Label>
              <div className="flex items-center gap-2">
                <button onClick={() => setBurners(Math.max(1, burners - 1))} disabled={burners <= 1} className="w-6 h-6 rounded border border-border flex items-center justify-center text-sm hover:bg-accent transition-colors disabled:opacity-40" data-testid="button-burners-minus">−</button>
                <span className="text-sm font-semibold w-4 text-center">{burners}</span>
                <button onClick={() => setBurners(Math.min(6, burners + 1))} disabled={burners >= 6} className="w-6 h-6 rounded border border-border flex items-center justify-center text-sm hover:bg-accent transition-colors disabled:opacity-40" data-testid="button-burners-plus">+</button>
              </div>
            </div>
          )}
        </section>

        {/* Ad slot in sidebar */}
        <AdSlot slot="9876543210" label="Sidebar advertisement" />

        {/* Timing */}
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">Timing</h2>
          <div className="space-y-3">
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm">Max cook time</span>
                <span className="text-sm font-semibold text-primary">{maxMinutes} min</span>
              </div>
              <Slider min={30} max={240} step={15} value={[maxMinutes]} onValueChange={([v]) => setMaxMinutes(v)} className="[&_[role=slider]]:bg-primary [&_[role=slider]]:border-primary" data-testid="slider-max-time" />
              <div className="flex justify-between mt-1">
                <span className="text-xs text-muted-foreground">30m</span>
                <span className="text-xs text-muted-foreground">4h</span>
              </div>
            </div>
            <div>
              <Label className="text-sm mb-1.5 block">Start cooking at</Label>
              <Select value={startTime} onValueChange={setStartTime}>
                <SelectTrigger className="h-8 text-sm" data-testid="select-start-time"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TIME_OPTIONS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </section>

        {/* Serving Size */}
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">Serving Size</h2>
          <Select value={String(servingMultiplier)} onValueChange={v => setServingMultiplier(parseFloat(v))}>
            <SelectTrigger className="h-8 text-sm" data-testid="select-servings"><SelectValue /></SelectTrigger>
            <SelectContent>
              {SERVING_MULTIPLIERS.map(m => <SelectItem key={m.value} value={String(m.value)}>{m.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </section>
      </div>

      <div className="px-5 py-3 border-t border-border text-xs text-muted-foreground text-center">
        {selectedCount === 0 ? "No recipes selected" : `${selectedCount} recipe${selectedCount > 1 ? "s" : ""} selected`}
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function HomePage() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [darkMode, setDarkMode] = useState(window.matchMedia("(prefers-color-scheme: dark)").matches);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
  }, [darkMode]);

  const [equipmentOn, setEquipmentOn] = useState<Record<EquipmentKey, boolean>>({
    oven: true, stove: true, airFryer: false, counter: true, instantPot: false, microwave: false,
  });
  const [burners, setBurners] = useState(2);
  const [maxMinutes, setMaxMinutes] = useState(90);
  const [startTime, setStartTime] = useState("17:00");
  const [servingMultiplier, setServingMultiplier] = useState(1);
  const [selectedRecipeIds, setSelectedRecipeIds] = useState<number[]>([]);
  const [schedule, setSchedule] = useState<ScheduleEntry[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const { data: recipes = [], isLoading: recipesLoading } = useQuery<Recipe[]>({ queryKey: ["/api/recipes"] });
  const { data: contributors = [] } = useQuery<Contributor[]>({ queryKey: ["/api/contributors"] });

  const compatibleRecipes = useMemo(() =>
    recipes.filter(r => r.equipment.length === 0 || r.equipment.every(eq => equipmentOn[eq])),
    [recipes, equipmentOn]
  );

  const generateSchedule = async () => {
    if (selectedRecipeIds.length === 0) { toast({ title: "Select at least one recipe first" }); return; }
    setIsGenerating(true);
    try {
      const res = await apiRequest("POST", "/api/schedule/generate", { selectedRecipeIds, startTime, maxMinutes, equipment: equipmentOn, burners });
      const data = await res.json();
      setSchedule(data.schedule);
    } catch { toast({ title: "Failed to generate schedule", variant: "destructive" }); }
    finally { setIsGenerating(false); }
  };

  const toggleRecipe = (id: number) => {
    setSelectedRecipeIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    setSchedule([]);
  };

  const toggleEquipment = (key: EquipmentKey) => {
    setEquipmentOn(prev => ({ ...prev, [key]: !prev[key] }));
    setSelectedRecipeIds([]);
    setSchedule([]);
  };

  const sidebarProps = {
    equipmentOn, toggleEquipment, burners, setBurners,
    maxMinutes, setMaxMinutes, startTime, setStartTime,
    servingMultiplier, setServingMultiplier, selectedCount: selectedRecipeIds.length,
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background" data-testid="homepage">

      {/* ── Desktop Sidebar ── */}
      <aside className="hidden md:flex w-72 flex-shrink-0 flex-col bg-sidebar border-r border-sidebar-border overflow-hidden">
        {/* Sidebar header */}
        <div className="px-5 py-4 border-b border-sidebar-border">
          <div className="flex items-center gap-3">
            <Logo size={32} />
            <div>
              <h1 className="font-display font-bold text-base leading-tight">Mean Cuisines</h1>
              <p className="text-xs text-muted-foreground">Cook Like a Machine.</p>
            </div>
            <button onClick={() => setDarkMode(d => !d)} className="ml-auto p-1.5 rounded-lg hover:bg-sidebar-accent transition-colors text-muted-foreground" aria-label="Toggle dark mode" data-testid="button-dark-mode">
              {darkMode ? <Sun size={16} /> : <Moon size={16} />}
            </button>
          </div>
        </div>
        <SidebarContent {...sidebarProps} />
      </aside>

      {/* ── Main Content ── */}
      <main className="flex-1 overflow-y-auto min-w-0">

        {/* Top bar */}
        <header className="sticky top-0 z-10 bg-background/90 backdrop-blur border-b border-border px-4 md:px-6 py-3 flex items-center gap-3">
          {/* Mobile: hamburger + logo */}
          <div className="flex items-center gap-2 md:hidden">
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <button className="p-1.5 rounded-lg hover:bg-accent transition-colors" aria-label="Open menu" data-testid="button-mobile-menu">
                  <Menu size={20} />
                </button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72 p-0 flex flex-col">
                <div className="px-5 py-4 border-b border-border flex items-center gap-3">
                  <Logo size={28} />
                  <div>
                    <h1 className="font-display font-bold text-sm">Mean Cuisines</h1>
                    <p className="text-xs text-muted-foreground">Cook Like a Machine.</p>
                  </div>
                  <button onClick={() => setMobileMenuOpen(false)} className="ml-auto p-1 text-muted-foreground" aria-label="Close menu">
                    <X size={16} />
                  </button>
                </div>
                <div className="flex-1 overflow-hidden">
                  <SidebarContent {...sidebarProps} />
                </div>
              </SheetContent>
            </Sheet>
            <Logo size={24} />
            <span className="font-display font-bold text-sm">Mean Cuisines</span>
          </div>

          <div className="hidden md:flex items-center gap-2">
            <UtensilsCrossed size={18} className="text-primary" />
            <h2 className="font-display font-bold text-base">
              Compatible Recipes
              <span className="ml-2 text-sm font-normal text-muted-foreground">({compatibleRecipes.length})</span>
            </h2>
          </div>

          <div className="ml-auto flex items-center gap-2">
            {/* Mobile dark mode */}
            <button onClick={() => setDarkMode(d => !d)} className="md:hidden p-1.5 rounded-lg hover:bg-accent transition-colors text-muted-foreground" aria-label="Toggle dark mode">
              {darkMode ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            {/* Parallel Cooking entry point */}
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 text-xs border-primary text-primary hover:bg-primary hover:text-primary-foreground"
              onClick={() => navigate("/parallel")}
              data-testid="button-parallel-cook"
            >
              <Zap size={13} />
              <span className="hidden sm:inline">Parallel Cook</span>
              <span className="sm:hidden">Cook</span>
            </Button>
            <Button size="sm" className="bg-primary text-primary-foreground gap-1.5 text-xs" onClick={() => setShowAddModal(true)} data-testid="button-add-recipe">
              <Plus size={14} /> <span className="hidden sm:inline">Add Recipe</span><span className="sm:hidden">Add</span>
            </Button>
          </div>
        </header>

        {/* Mobile heading */}
        <div className="md:hidden px-4 pt-4 pb-0 flex items-center gap-2">
          <UtensilsCrossed size={15} className="text-primary" />
          <h2 className="font-display font-bold text-sm">
            Compatible Recipes <span className="text-muted-foreground font-normal">({compatibleRecipes.length})</span>
          </h2>
        </div>

        {/* Top ad banner */}
        <div className="px-4 md:px-6 pt-4">
          <AdSlot slot="1111111111" className="w-full" label="Top banner advertisement" />
        </div>

        <div className="p-4 md:p-6 grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Recipe List */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Flame size={15} className="text-primary" />
              <h3 className="font-display font-semibold text-sm">Recipes</h3>
            </div>

            {recipesLoading ? (
              <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-20 bg-accent animate-pulse rounded-xl" />)}</div>
            ) : compatibleRecipes.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
                <ChefHat size={40} className="mb-3 opacity-30" />
                <p className="text-sm font-medium">No compatible recipes</p>
                <p className="text-xs mt-1">Enable more equipment or add new recipes</p>
              </div>
            ) : (
              <Accordion type="multiple" className="space-y-2">
                {compatibleRecipes.map((recipe, idx) => (
                  <RecipeCard
                    key={recipe.id}
                    recipe={recipe}
                    selected={selectedRecipeIds.includes(recipe.id)}
                    onToggle={() => toggleRecipe(recipe.id)}
                    servingMultiplier={servingMultiplier}
                    isLast={(idx + 1) % 3 === 0}
                  />
                ))}
              </Accordion>
            )}
          </div>

          {/* Schedule Panel */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <CalendarClock size={15} className="text-primary" />
                <h3 className="font-display font-semibold text-sm">Cook Schedule</h3>
              </div>
              {selectedRecipeIds.length > 0 && (
                <Button size="sm" variant="outline" className="text-xs h-7 gap-1 border-primary text-primary hover:bg-primary hover:text-primary-foreground" onClick={generateSchedule} disabled={isGenerating} data-testid="button-generate-schedule">
                  {isGenerating ? "Generating…" : "Generate"}
                </Button>
              )}
            </div>

            {schedule.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border bg-card/50 p-8 text-center">
                <CalendarClock size={36} className="mx-auto mb-3 text-muted-foreground/40" />
                <p className="text-sm font-medium text-muted-foreground">No schedule yet</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {selectedRecipeIds.length === 0 ? "Select recipes to get started" : "Click Generate to plan your cook session"}
                </p>
                {selectedRecipeIds.length > 0 && (
                  <Button size="sm" className="mt-4 bg-primary text-primary-foreground text-xs" onClick={generateSchedule} disabled={isGenerating} data-testid="button-generate-schedule-empty">
                    {isGenerating ? "Generating…" : "Generate Schedule"}
                  </Button>
                )}
              </div>
            ) : (
              <div className="bg-card border border-border rounded-xl p-4">
                <ScheduleTimeline schedule={schedule} recipes={recipes} />
              </div>
            )}

            <div className="flex gap-2 bg-accent/60 rounded-xl p-3 text-xs text-muted-foreground mt-3">
              <Info size={13} className="flex-shrink-0 mt-0.5 text-primary" />
              <p>Recipes are sorted longest-first so everything finishes together. Equipment conflicts are avoided automatically.</p>
            </div>

            {/* Schedule ad */}
            <AdSlot slot="2222222222" className="mt-4" label="Schedule panel advertisement" />
          </div>
        </div>

        {/* Footer */}
        <footer className="border-t border-border px-4 md:px-6 py-5 mt-2">
          <div className="text-center text-xs text-muted-foreground space-y-2">
            <p className="font-display font-semibold text-sm text-foreground">Mean Cuisines</p>
            <p>Cook Like a Machine. Eat Like a King.</p>
            <p>
              <Link href="/privacy" className="text-primary hover:underline">Privacy</Link>
              <span className="mx-2">·</span>
              <Link href="/terms" className="text-primary hover:underline">Terms</Link>
            </p>
            <p className="text-muted-foreground/60">
              Mean Cuisines is a participant in the Amazon Services LLC Associates Program, an
              affiliate advertising program designed to provide a means for sites to earn advertising
              fees by advertising and linking to Amazon.com and affiliated sites. As an Amazon
              Associate, we earn from qualifying purchases.
            </p>
          </div>
        </footer>
      </main>

      <AddRecipeModal open={showAddModal} onClose={() => setShowAddModal(false)} contributors={contributors} />
    </div>
  );
}
